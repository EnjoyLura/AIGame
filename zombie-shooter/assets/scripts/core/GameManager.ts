import { sys } from 'cc';
import { PlayerResources } from './PlayerResources';
import { BattleConfig } from '../config/GameConfig';
import { HERO_DEFS, ABILITY_MAX_LEVEL } from '../battle/HeroDef';
import { EQUIP_SLOTS, EQUIPMENT_DEFS, WEAPON_CORE_DEFS, BagItem, HeroSystem, EQUIP_SLOT_NAMES, ABILITY_SLOTS } from './HeroSystem';

/**
 * 全局数据单例：一局战斗的运行时数据 + 账号持久化数据。
 * 纯数据类不挂节点；后续金币、装备、关卡解锁等持久化字段都加在这里。
 */
export class GameManager {
    private static _inst: GameManager | null = null;
    static get instance(): GameManager {
        if (!this._inst) {
            this._inst = new GameManager();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-save';

    // ---- 运行时数据（每局重置） ----
    wave = 0;
    kills = 0;
    /** 团队经验与等级（局内升级三选一驱动） */
    xp = 0;
    level = 1;

    // ---- 持久化数据 ----
    bestWave = 0;
    totalKills = 0;
    /** 已通关的最大关卡 id（0=未通关任何关；下一关=stageCleared+1，用于主城解锁） */
    stageCleared = 0;
    /** 当前选中的关卡 id（主城出战时带上；缺省=最新解锁关） */
    currentStage = 1;
    /** 玩家资源仓库（金币/钻石/体力统一走这里；gold 保留兼容访问器） */
    readonly res = new PlayerResources();
    /** 局外强化等级（id 见 META_UPGRADES） */
    private _upgrades: Record<string, number> = { atk: 0, vehHp: 0, goldGain: 0, xpGain: 0 };
    /** 局次号：resetRun 自增，战斗开始时按局次幂等应用局外加成 */
    runId = 0;
    /** 编队：上阵英雄 id 列表（最多 4 人、至少 1 人；战斗按此顺序部署与排号位） */
    lineup: string[] = ['rifle', 'sniper', 'laser', 'radiation'];
    /** 已拥有英雄（商城购买解锁；新存档仅步枪手，旧档无此字段视为全拥有） */
    ownedHeroes: string[] = ['rifle'];
    /** 英雄等级（heroId → Lv，缺省 1；读写走 HeroSystem） */
    heroLevels: Record<string, number> = {};
    /** 英雄装备（heroId → 槽位 → 装备状态；读写走 HeroSystem） */
    equips: Record<string, Record<string, { id: string; lv: number } | null>> = {};
    /** 主武器强化等级（heroId → Lv，缺省 1；读写走 HeroSystem） */
    weaponLv: Record<string, number> = {};
    /** 武器核心（heroId → 已嵌核心 id；读写走 HeroSystem） */
    weaponCores: Record<string, { id: string } | null> = {};
    /** 装备背包（账号级；购买入库，穿戴时绑定到英雄，卸下回背包） */
    bag: BagItem[] = [];
    /** 技能等级（key = `${heroId}:${slot}`，slot=basic|skill|ultimate；缺省 1；读写走 HeroSystem） */
    skillLevels: Record<string, number> = {};
    /** 基地建筑等级（key = BUILDINGS id；缺省 0；读写走 buildingLevel/buildingLevelCap） */
    buildingLevels: Record<string, number> = {};

    /** 金币兼容访问器（真身在资源仓库） */
    get gold(): number { return this.res.get('gold'); }

    /** 关卡已解锁（第 1 关始终开放；其余需通关前一关） */
    stageUnlocked(stageId: number): boolean {
        return stageId <= this.stageCleared + 1;
    }

    /** 通关登记：推进解锁进度并落盘 */
    markStageCleared(stageId: number): void {
        if (stageId > this.stageCleared) {
            this.stageCleared = stageId;
            this.save();
        }
    }

    /** 编队上限（与战斗 DEPLOY_HERO_COUNT 对齐） */
    static readonly LINEUP_MAX = 4;
    /** 是否已上阵 */
    isInLineup(heroId: string): boolean {
        return this.lineup.indexOf(heroId) >= 0;
    }

    /** 是否已拥有该英雄 */
    isHeroOwned(heroId: string): boolean {
        return this.ownedHeroes.indexOf(heroId) >= 0;
    }

    /**
     * 金币解锁英雄（商城购买，一次性买断）。
     * 价格表在 HeroSystem.HERO_PRICES；已拥有/未收录/余额不足返回 false。
     */
    unlockHero(heroId: string): boolean {
        if (this.isHeroOwned(heroId)) {
            return false;
        }
        const price = HeroSystem.HERO_PRICES[heroId];
        if (!price) {
            return false;
        }
        if (!this.res.spend('gold', price)) {
            return false;
        }
        this.ownedHeroes.push(heroId);
        this.save();
        return true;
    }

    /** 上阵/下阵切换：上阵需未拥有拦截+未满 4，下阵需至少留 1 人；成功返回 true */
    toggleLineupMember(heroId: string): boolean {
        const idx = this.lineup.indexOf(heroId);
        if (idx >= 0) {
            if (this.lineup.length <= 1) {
                return false;
            }
            this.lineup.splice(idx, 1);
        } else {
            if (this.lineup.length >= GameManager.LINEUP_MAX || !this.isHeroOwned(heroId)) {
                return false;
            }
            this.lineup.push(heroId);
        }
        this.save();
        return true;
    }

    /** 体力当前值（结算离线恢复后返回；上限含加油站加成） */
    stamina(): number {
        return this.res.stamina(Math.floor(Date.now() / 1000), this.staminaMax(),
            BattleConfig.STAMINA_REGEN_MINUTES * 60);
    }

    /** 体力是否够开一局 */
    canStartRun(): boolean {
        return this.stamina() >= BattleConfig.RUN_STAMINA_COST;
    }

    /** 扣体力开一局；不足返回 false */
    spendRunStamina(): boolean {
        return this.res.spend('stamina', BattleConfig.RUN_STAMINA_COST);
    }

    // ---- 局外强化定义（主城升级用；效果乘区在对应系统处应用） ----
    upgradeLevel(id: string): number {
        return this._upgrades[id] ?? 0;
    }

    upgradeCost(id: string): number {
        const def = META_UPGRADES.find(u => u.id === id);
        return def ? Math.round(def.baseCost * Math.pow(def.costMul, this.upgradeLevel(id))) : 0;
    }

    canUpgrade(id: string): boolean {
        const def = META_UPGRADES.find(u => u.id === id);
        return !!def && this.upgradeLevel(id) < def.maxLevel && this.gold >= this.upgradeCost(id);
    }

    /** 购买一级局外强化；成功返回 true（扣金币并落盘） */
    buyUpgrade(id: string): boolean {
        if (!this.canUpgrade(id)) {
            return false;
        }
        this.res.spend('gold', this.upgradeCost(id));
        this._upgrades[id] = this.upgradeLevel(id) + 1;
        this.save();
        return true;
    }

    addGold(n: number): void {
        this.res.add('gold', n);
        this.save();
    }

    /** 局外加成乘区 */
    metaAtkMul(): number { return 1 + 0.08 * this.upgradeLevel('atk'); }
    metaVehHpMul(): number { return 1 + 0.1 * this.upgradeLevel('vehHp'); }
    metaGoldMul(): number { return 1 + 0.1 * this.upgradeLevel('goldGain'); }
    metaXpMul(): number { return 1 + 0.08 * this.upgradeLevel('xpGain'); }

    // ---- 基地建筑（升级提升繁荣度并解锁各系统成长上限） ----

    /** 建筑当前等级（缺省 0） */
    buildingLevel(id: string): number {
        return this.buildingLevels[id] ?? 0;
    }

    /** 建筑升到下一级费用（等级线性 + 指数混合递增） */
    buildingCost(id: string): number {
        const def = BUILDINGS.find(b => b.id === id);
        if (!def) {
            return 0;
        }
        return Math.round(def.baseCost * Math.pow(def.costMul, this.buildingLevel(id)));
    }

    /** 建筑可否升级：已解锁（指挥中心或达解锁条件）+ 未达自身上限 + 未被指挥中心上限卡住 + 金币充足 */
    canUpgradeBuilding(id: string): boolean {
        const def = BUILDINGS.find(b => b.id === id);
        if (!def) {
            return false;
        }
        if (!this.isBuildingUnlocked(id)) {
            return false;
        }
        if (this.buildingLevel(id) >= def.maxLevel) {
            return false;
        }
        // 指挥中心约束：其余建筑等级上限 = 指挥中心等级 + 1
        if (id !== 'hq' && this.buildingLevel(id) + 1 > this.buildingLevel('hq') + 1) {
            return false;
        }
        return this.gold >= this.buildingCost(id);
    }

    /** 建筑是否已开放升级（雷达站需指挥中心 LV.6，其余默认开放） */
    isBuildingUnlocked(id: string): boolean {
        const def = BUILDINGS.find(b => b.id === id);
        if (!def) {
            return false;
        }
        return this.buildingLevel('hq') >= def.unlockHq;
    }

    /** 金币升级建筑；成功返回 true（扣金币并落盘） */
    upgradeBuilding(id: string): boolean {
        if (!this.canUpgradeBuilding(id)) {
            return false;
        }
        if (!this.res.spend('gold', this.buildingCost(id))) {
            return false;
        }
        this.buildingLevels[id] = this.buildingLevel(id) + 1;
        this.save();
        return true;
    }

    /** 繁荣度 = 全建筑等级总和（上限 = 各建筑 maxLevel 之和） */
    prosperity(): { cur: number; max: number } {
        let cur = 0;
        let max = 0;
        for (const b of BUILDINGS) {
            cur += this.buildingLevel(b.id);
            max += b.maxLevel;
        }
        return { cur, max };
    }

    /** 指挥中心等级（全局成长上限锚点） */
    hqLevel(): number { return this.buildingLevel('hq'); }

    /** 英雄等级上限（训练营：10 + 等级） */
    heroLevelCap(): number { return 10 + this.buildingLevel('camp'); }

    /** 装备强化等级上限（军械库：5 + 等级） */
    equipUpgradeCap(): number { return 5 + this.buildingLevel('armory'); }

    /** 技能/大招等级上限（研究所：2 + 等级，封顶 ABILITY_MAX_LEVEL=3） */
    abilityLevelCap(): number { return Math.min(ABILITY_MAX_LEVEL, 2 + this.buildingLevel('lab')); }

    /** 载具耐久乘区（载具工坊：每级 +8%） */
    workshopVehHpMul(): number { return 1 + 0.08 * this.buildingLevel('workshop'); }

    /** 金币获取乘区（补给仓库：每级 +6%，与赏金合同叠乘） */
    depotGoldMul(): number { return 1 + 0.06 * this.buildingLevel('depot'); }

    /** 体力上限（加油站：30 + 每级 4） */
    staminaMax(): number { return BattleConfig.STAMINA_MAX + 4 * this.buildingLevel('station'); }

    /** 经验获取乘区（雷达站：每级 +10%，与战术演练叠乘） */
    radarXpMul(): number { return 1 + 0.1 * this.buildingLevel('radar'); }

    /** 升到下一级所需经验：L1→5，L2→9，L3→13……线性递增 */
    xpToNext(level: number): number {
        return 5 + (level - 1) * 4;
    }

    /** 累加经验（带局外演练与基地雷达站加成）；返回是否发生了升级（可连升，调用方逐次处理） */
    addXp(value: number): boolean {
        this.xp += Math.max(1, Math.round(value * this.metaXpMul() * this.radarXpMul()));
        let leveled = false;
        while (this.xp >= this.xpToNext(this.level)) {
            this.xp -= this.xpToNext(this.level);
            this.level++;
            leveled = true;
        }
        return leveled;
    }

    resetRun(): void {
        this.wave = 0;
        this.kills = 0;
        this.xp = 0;
        this.level = 1;
        this.runId++;
    }

    save(): void {
        const data = {
            bestWave: this.bestWave,
            totalKills: this.totalKills,
            stageCleared: this.stageCleared,
            currentStage: this.currentStage,
            lineup: [...this.lineup],
            ownedHeroes: [...this.ownedHeroes],
            heroLevels: this.heroLevels,
            equips: this.equips,
            weaponLv: this.weaponLv,
            weaponCores: this.weaponCores,
            bag: this.bag,
            skillLevels: this.skillLevels,
            gold: this.gold,
            upgrades: this._upgrades,
            buildingLevels: this.buildingLevels,
            res: this.res.serialize(),
        };
        sys.localStorage.setItem(GameManager.SAVE_KEY, JSON.stringify(data));
    }

    load(): void {
        const raw = sys.localStorage.getItem(GameManager.SAVE_KEY);
        if (!raw) {
            // 新存档：首次赠送满体力，避免 0 体力无获取途径卡死出战
            this.res.add('stamina', this.staminaMax());
            return;
        }
        try {
            const data = JSON.parse(raw);
            this.bestWave = data.bestWave ?? 0;
            this.totalKills = data.totalKills ?? 0;
            this.stageCleared = data.stageCleared ?? 0;
            this.currentStage = data.currentStage ?? 1;
            // 已拥有英雄：无字段（旧档）或空/全非法一律回退仅步枪手，其余英雄商城金币解锁
            if (Array.isArray(data.ownedHeroes)) {
                const validOwned = data.ownedHeroes.filter((id: unknown) => typeof id === 'string' && HERO_DEFS.some(d => d.id === id));
                this.ownedHeroes = validOwned.length > 0 ? validOwned : ['rifle'];
            } else {
                this.ownedHeroes = ['rifle'];
            }
            // 编队：合法 id 且必须已拥有（旧档 lineup 可能含未拥有英雄），空则回退首个已拥有英雄
            if (Array.isArray(data.lineup)) {
                const valid = data.lineup.filter((id: unknown) =>
                    typeof id === 'string' && HERO_DEFS.some(d => d.id === id) && this.isHeroOwned(id));
                if (valid.length > 0) {
                    this.lineup = valid.slice(0, GameManager.LINEUP_MAX);
                } else {
                    this.lineup = [this.ownedHeroes[0]];
                }
            }
            // 英雄等级/装备：只接受合法英雄 id（装备结构逐项校验，防御坏档）
            if (data.heroLevels && typeof data.heroLevels === 'object') {
                for (const d of HERO_DEFS) {
                    const lv = data.heroLevels[d.id];
                    if (typeof lv === 'number' && lv >= 1) {
                        this.heroLevels[d.id] = Math.floor(lv);
                    }
                }
            }
            if (data.equips && typeof data.equips === 'object') {
                for (const d of HERO_DEFS) {
                    const slots = data.equips[d.id];
                    if (!slots || typeof slots !== 'object') {
                        continue;
                    }
                    for (const slot of EQUIP_SLOTS) {
                        const st = slots[slot];
                        if (st && typeof st.id === 'string' && typeof st.lv === 'number'
                            && EQUIPMENT_DEFS.some(e => e.id === st.id && e.slot === slot)) {
                            if (!this.equips[d.id]) {
                                this.equips[d.id] = {};
                            }
                            this.equips[d.id][slot] = { id: st.id, lv: Math.max(1, Math.floor(st.lv)) };
                        }
                    }
                }
            }
            // 主武器强化等级（缺省 1）
            if (data.weaponLv && typeof data.weaponLv === 'object') {
                for (const d of HERO_DEFS) {
                    const lv = data.weaponLv[d.id];
                    if (typeof lv === 'number' && lv >= 1) {
                        this.weaponLv[d.id] = Math.floor(lv);
                    }
                }
            }
            // 武器核心（只接受合法核心 id）
            if (data.weaponCores && typeof data.weaponCores === 'object') {
                for (const d of HERO_DEFS) {
                    const c = data.weaponCores[d.id];
                    if (c && typeof c.id === 'string' && WEAPON_CORE_DEFS.some(w => w.id === c.id)) {
                        this.weaponCores[d.id] = { id: c.id };
                    }
                }
            }
            // 装备背包（逐件校验槽位/品质/等级）
            if (Array.isArray(data.bag)) {
                this.bag = data.bag.filter((it: unknown) => {
                    const b = it as BagItem;
                    return !!b && typeof b === 'object'
                        && typeof b.slot === 'string' && b.slot in EQUIP_SLOT_NAMES
                        && typeof b.tier === 'number' && b.tier >= 1 && b.tier <= 4
                        && typeof b.lv === 'number' && b.lv >= 1;
                }).map((b: BagItem) => ({ slot: b.slot, tier: b.tier, lv: Math.max(1, Math.floor(b.lv)) }));
            }
            // 技能等级（key=`${heroId}:${slot}`，等级钳 1~3）
            if (data.skillLevels && typeof data.skillLevels === 'object') {
                for (const k of Object.keys(data.skillLevels)) {
                    const [heroId, slot] = k.split(':');
                    const lv = data.skillLevels[k];
                    if (!heroId || !slot || !HERO_DEFS.some(d => d.id === heroId)) {
                        continue;
                    }
                    if ((ABILITY_SLOTS as string[]).indexOf(slot) < 0) {
                        continue;
                    }
                    if (typeof lv === 'number' && lv >= 1 && lv <= 3) {
                        this.skillLevels[k] = Math.floor(lv);
                    }
                }
            }
            if (data.gold !== undefined) {
                this.res.add('gold', data.gold);
            }
            // 资源系统上线前的旧存档没有 res 字段：补送满体力防止 0 体力卡死
            if (!data.res || !data.res.amounts) {
                this.res.add('stamina', this.staminaMax());
            }
            this.res.deserialize(data.res ?? null);
            if (data.upgrades) {
                for (const k of Object.keys(this._upgrades)) {
                    this._upgrades[k] = data.upgrades[k] ?? 0;
                }
            }
            // 建筑等级：只接受合法建筑 id，等级钳 0~maxLevel；
            // 旧档无该字段（建筑系统上线前）补发起步基地，防新上限锁死已有成长
            if (data.buildingLevels && typeof data.buildingLevels === 'object') {
                for (const b of BUILDINGS) {
                    const lv = data.buildingLevels[b.id];
                    if (typeof lv === 'number' && lv >= 1 && lv <= b.maxLevel) {
                        this.buildingLevels[b.id] = Math.floor(lv);
                    }
                }
            } else if (!data.skillLevels) {
                this.buildingLevels = { hq: 3, camp: 2, armory: 1, lab: 1, workshop: 1, depot: 1, station: 1 };
            }
        } catch {
            // 存档损坏时静默重置
        }
    }
}

/** 基地建筑定义（基地页升级 UI 与全局成长上限） */
export interface BuildingDef {
    id: string;
    ic: string;
    name: string;
    /** 满级效果描述（按当前等级由调用方格式化） */
    desc: (level: number) => string;
    maxLevel: number;
    baseCost: number;
    costMul: number;
    /** 需要指挥中心达到该等级才可升级（其余建筑 0=默认开放） */
    unlockHq: number;
}

export const BUILDINGS: BuildingDef[] = [
    { id: 'hq', ic: '🏛️', name: '指挥中心', desc: l => `其他建筑等级上限 = 本级 +1（当前 Lv.${l + 1}）`, maxLevel: 10, baseCost: 800, costMul: 1.6, unlockHq: 0 },
    { id: 'camp', ic: '🏕️', name: '训练营', desc: l => `英雄等级上限提升至 ${10 + l}`, maxLevel: 10, baseCost: 500, costMul: 1.5, unlockHq: 0 },
    { id: 'armory', ic: '⚒️', name: '军械库', desc: l => `装备强化上限提升至 +${5 + l}`, maxLevel: 5, baseCost: 600, costMul: 1.55, unlockHq: 0 },
    { id: 'lab', ic: '🔬', name: '研究所', desc: l => `技能等级上限提升至 ${Math.min(ABILITY_MAX_LEVEL, 2 + l)}`, maxLevel: 1, baseCost: 1500, costMul: 1, unlockHq: 0 },
    { id: 'workshop', ic: '🚛', name: '载具工坊', desc: l => `载具耐久 +${l * 8}%`, maxLevel: 10, baseCost: 450, costMul: 1.45, unlockHq: 0 },
    { id: 'depot', ic: '📦', name: '补给仓库', desc: l => `金币获取 +${l * 6}%`, maxLevel: 10, baseCost: 400, costMul: 1.4, unlockHq: 0 },
    { id: 'station', ic: '⛽', name: '加油站', desc: l => `体力上限 +${l * 4}`, maxLevel: 10, baseCost: 500, costMul: 1.45, unlockHq: 0 },
    { id: 'radar', ic: '📡', name: '雷达站', desc: l => `经验获取 +${l * 10}%`, maxLevel: 5, baseCost: 1200, costMul: 1.5, unlockHq: 6 },
];

/** 局外强化定义（主城升级 UI 与成本曲线） */
export interface MetaUpgradeDef {
    id: string;
    name: string;
    desc: (level: number) => string;
    maxLevel: number;
    baseCost: number;
    costMul: number;
}

export const META_UPGRADES: MetaUpgradeDef[] = [
    { id: 'atk', name: '火力强化', desc: l => `全队攻击 +${l * 8}%`, maxLevel: 50, baseCost: 120, costMul: 1.32 },
    { id: 'vehHp', name: '装甲强化', desc: l => `载具耐久 +${l * 10}%`, maxLevel: 20, baseCost: 150, costMul: 1.38 },
    { id: 'goldGain', name: '赏金合同', desc: l => `金币获取 +${l * 10}%`, maxLevel: 25, baseCost: 100, costMul: 1.3 },
    { id: 'xpGain', name: '战术演练', desc: l => `经验获取 +${l * 8}%`, maxLevel: 25, baseCost: 100, costMul: 1.3 },
];
