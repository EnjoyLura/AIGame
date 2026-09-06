import { sys } from 'cc';
import { PlayerResources } from './PlayerResources';
import { BattleConfig } from '../config/GameConfig';

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
    /** 玩家资源仓库（金币/钻石/体力统一走这里；gold 保留兼容访问器） */
    readonly res = new PlayerResources();
    /** 局外强化等级（id 见 META_UPGRADES） */
    private _upgrades: Record<string, number> = { atk: 0, vehHp: 0, goldGain: 0, xpGain: 0 };
    /** 局次号：resetRun 自增，战斗开始时按局次幂等应用局外加成 */
    runId = 0;

    /** 金币兼容访问器（真身在资源仓库） */
    get gold(): number { return this.res.get('gold'); }

    /** 体力当前值（结算离线恢复后返回） */
    stamina(): number {
        return this.res.stamina(Math.floor(Date.now() / 1000), BattleConfig.STAMINA_MAX,
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

    /** 升到下一级所需经验：L1→5，L2→9，L3→13……线性递增 */
    xpToNext(level: number): number {
        return 5 + (level - 1) * 4;
    }

    /** 累加经验（带局外经验加成）；返回是否发生了升级（可连升，调用方逐次处理） */
    addXp(value: number): boolean {
        this.xp += Math.max(1, Math.round(value * this.metaXpMul()));
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
            gold: this.gold,
            upgrades: this._upgrades,
            res: this.res.serialize(),
        };
        sys.localStorage.setItem(GameManager.SAVE_KEY, JSON.stringify(data));
    }

    load(): void {
        const raw = sys.localStorage.getItem(GameManager.SAVE_KEY);
        if (!raw) {
            return;
        }
        try {
            const data = JSON.parse(raw);
            this.bestWave = data.bestWave ?? 0;
            this.totalKills = data.totalKills ?? 0;
            if (data.gold !== undefined) {
                this.res.add('gold', data.gold);
            }
            this.res.deserialize(data.res ?? null);
            if (data.upgrades) {
                for (const k of Object.keys(this._upgrades)) {
                    this._upgrades[k] = data.upgrades[k] ?? 0;
                }
            }
        } catch {
            // 存档损坏时静默重置
        }
    }
}

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
