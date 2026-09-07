import { GameManager } from './GameManager';

/**
 * 英雄成长系统（骨架）：英雄等级 + 三槽装备。
 * - 等级：金币升级，每级攻击 +5%，上限 HERO_LEVEL_MAX。
 * - 装备：每名英雄固定三槽（枪口/弹匣/瞄具），固定装备池分四档品质，
 *   金币购买即穿上（同槽替换、旧件不返还），可继续金币强化（每级 +8% 本件属性）。
 * - 数据真值存 GameManager（heroLevels / equips），本类只提供查询、消费与乘区计算；
 *   战斗侧在 beginRun 用 atkMulOf 合并乘区、在部署后用 applyEquipStats 追加射速/射程。
 */

/** 装备槽位 */
export type EquipSlot = 'muzzle' | 'clip' | 'scope';
export const EQUIP_SLOTS: EquipSlot[] = ['muzzle', 'clip', 'scope'];
export const EQUIP_SLOT_NAMES: Record<EquipSlot, string> = {
    muzzle: '枪口', clip: '弹匣', scope: '瞄具',
};

/** 装备品质（tier 1-4）；品质越高属性与价格越高 */
export const EQUIP_TIER_NAMES = ['普通', '优秀', '稀有', '史诗'];
export const EQUIP_TIER_COLORS = ['#c8d2d8', '#7bd67b', '#5ab0f0', '#c07ef5'];

export interface EquipmentDef {
    id: string;
    slot: EquipSlot;
    name: string;
    /** 品质 1-4 */
    tier: 1 | 2 | 3 | 4;
    /** 属性加成（百分比小数，如 0.12 = +12%）；强化每级再乘 1.08 */
    atkPct?: number;
    /** 射速加成（interval 缩小） */
    ratePct?: number;
    /** 射程加成 */
    rangePct?: number;
    /** 购买价格（金币） */
    baseCost: number;
}

/** 英雄等级上限与成长 */
export const HERO_LEVEL_MAX = 20;
export const HERO_LEVEL_ATK_STEP = 0.05;
export const HERO_UPGRADE_BASE_COST = 80;
export const HERO_UPGRADE_COST_MUL = 1.25;

/** 装备强化：每级 +8% 本件属性 */
export const EQUIP_UPGRADE_STEP = 0.08;
export const EQUIP_UPGRADE_MAX = 10;

export interface EquipState {
    /** 装备定义 id */
    id: string;
    /** 强化等级（1 起） */
    lv: number;
}

/** 固定装备池：每槽 4 件，覆盖四档品质（低档可当过渡装） */
export const EQUIPMENT_DEFS: EquipmentDef[] = [
    // 枪口：攻击向
    { id: 'muzzle_std', slot: 'muzzle', name: '制式枪口', tier: 1, atkPct: 0.08, baseCost: 150 },
    { id: 'muzzle_heavy', slot: 'muzzle', name: '重型枪口', tier: 2, atkPct: 0.16, baseCost: 400 },
    { id: 'muzzle_boost', slot: 'muzzle', name: '增压器枪口', tier: 3, atkPct: 0.26, baseCost: 1000 },
    { id: 'muzzle_plasma', slot: 'muzzle', name: '等离子枪口', tier: 4, atkPct: 0.40, baseCost: 2400 },
    // 弹匣：射速向
    { id: 'clip_std', slot: 'clip', name: '标准弹匣', tier: 1, ratePct: 0.06, baseCost: 150 },
    { id: 'clip_rapid', slot: 'clip', name: '速射弹匣', tier: 2, ratePct: 0.12, baseCost: 400 },
    { id: 'clip_gyro', slot: 'clip', name: '陀螺弹匣', tier: 3, ratePct: 0.20, baseCost: 1000 },
    { id: 'clip_quantum', slot: 'clip', name: '量子弹匣', tier: 4, ratePct: 0.32, baseCost: 2400 },
    // 瞄具：射程向（附带少量攻击）
    { id: 'scope_std', slot: 'scope', name: '机械瞄具', tier: 1, rangePct: 0.10, baseCost: 120 },
    { id: 'scope_long', slot: 'scope', name: '加长瞄具', tier: 2, rangePct: 0.18, baseCost: 350 },
    { id: 'scope_thermal', slot: 'scope', name: '热成像瞄具', tier: 3, rangePct: 0.28, atkPct: 0.06, baseCost: 900 },
    { id: 'scope_quantum', slot: 'scope', name: '量子瞄具', tier: 4, rangePct: 0.42, atkPct: 0.10, baseCost: 2200 },
];

export class HeroSystem {
    private static _inst: HeroSystem | null = null;
    static get instance(): HeroSystem {
        if (!this._inst) {
            this._inst = new HeroSystem();
        }
        return this._inst;
    }

    private constructor() { }

    private get _gm(): GameManager { return GameManager.instance; }

    // ================= 英雄等级 =================

    heroLevel(heroId: string): number {
        return this._gm.heroLevels[heroId] ?? 1;
    }

    heroUpgradeCost(heroId: string): number {
        return Math.round(HERO_UPGRADE_BASE_COST * Math.pow(HERO_UPGRADE_COST_MUL, this.heroLevel(heroId) - 1));
    }

    isHeroMaxLevel(heroId: string): boolean {
        return this.heroLevel(heroId) >= HERO_LEVEL_MAX;
    }

    /** 英雄等级攻击乘区（Lv.1 = 1.0） */
    heroAtkMul(heroId: string): number {
        return 1 + HERO_LEVEL_ATK_STEP * (this.heroLevel(heroId) - 1);
    }

    /** 金币升级英雄；成功返回 true */
    upgradeHero(heroId: string): boolean {
        if (this.isHeroMaxLevel(heroId)) {
            return false;
        }
        const cost = this.heroUpgradeCost(heroId);
        if (!this._gm.res.spend('gold', cost)) {
            return false;
        }
        this._gm.heroLevels[heroId] = this.heroLevel(heroId) + 1;
        this._gm.save();
        return true;
    }

    // ================= 装备 =================

    equipDef(equipId: string): EquipmentDef | null {
        return EQUIPMENT_DEFS.find(e => e.id === equipId) ?? null;
    }

    /** 某英雄某槽当前装备（无则 null） */
    equipped(heroId: string, slot: EquipSlot): EquipState | null {
        return this._gm.equips[heroId]?.[slot] ?? null;
    }

    /** 装备强化费用（随品质与当前强化等级递增） */
    equipUpgradeCost(state: EquipState): number {
        const def = this.equipDef(state.id);
        const tier = def?.tier ?? 1;
        return Math.round(60 * tier * Math.pow(1.35, state.lv - 1));
    }

    isEquipMaxLevel(state: EquipState): boolean {
        return state.lv >= EQUIP_UPGRADE_MAX;
    }

    /**
     * 金币购买装备并穿上（同槽替换，旧件不返还）。
     * equipId 必须属于该槽位；成功返回 true。
     */
    buyEquip(heroId: string, equipId: string): boolean {
        const def = this.equipDef(equipId);
        if (!def) {
            return false;
        }
        if (!this._gm.res.spend('gold', def.baseCost)) {
            return false;
        }
        if (!this._gm.equips[heroId]) {
            this._gm.equips[heroId] = {};
        }
        this._gm.equips[heroId][def.slot] = { id: equipId, lv: 1 };
        this._gm.save();
        return true;
    }

    /** 金币强化某槽当前装备（+8% 本件属性/级） */
    upgradeEquip(heroId: string, slot: EquipSlot): boolean {
        const state = this.equipped(heroId, slot);
        if (!state || this.isEquipMaxLevel(state)) {
            return false;
        }
        if (!this._gm.res.spend('gold', this.equipUpgradeCost(state))) {
            return false;
        }
        state.lv++;
        this._gm.save();
        return true;
    }

    /** 单件装备的属性值（含强化等级；返回百分比小数） */
    private _equipValue(state: EquipState, key: 'atkPct' | 'ratePct' | 'rangePct'): number {
        const def = this.equipDef(state.id);
        const base = def?.[key] ?? 0;
        if (base <= 0) {
            return 0;
        }
        return base * Math.pow(1 + EQUIP_UPGRADE_STEP, state.lv - 1);
    }

    /** 某英雄装备汇总乘区：atk=攻击、rate=射速（interval 除数）、range=射程 */
    equipMulOf(heroId: string): { atk: number; rate: number; range: number } {
        let atk = 0, rate = 0, range = 0;
        for (const slot of EQUIP_SLOTS) {
            const state = this.equipped(heroId, slot);
            if (!state) {
                continue;
            }
            atk += this._equipValue(state, 'atkPct');
            rate += this._equipValue(state, 'ratePct');
            range += this._equipValue(state, 'rangePct');
        }
        return { atk: 1 + atk, rate: 1 + rate, range: 1 + range };
    }

    /** 英雄总攻击乘区（等级 × 装备；beginRun 与 metaAtkMul 相乘后进 applyMetaAtk） */
    atkMulOf(heroId: string): number {
        return this.heroAtkMul(heroId) * this.equipMulOf(heroId).atk;
    }

    /** 部署后把装备的射速/射程加成追加到英雄实例（interval 缩小、range 放大） */
    applyEquipStats(hero: { def: { id: string }; interval: number; range: number }): void {
        const mul = this.equipMulOf(hero.def.id);
        hero.interval = Math.max(0.12, hero.interval / mul.rate);
        hero.range = hero.range * mul.range;
    }

    /** 某槽推荐装备（品质最高且比当前更强的下一件；供 UI 免做完整背包） */
    recommend(heroId: string, slot: EquipSlot): EquipmentDef | null {
        const cur = this.equipped(heroId, slot);
        const curDef = cur ? this.equipDef(cur.id) : null;
        let best: EquipmentDef | null = null;
        for (const def of EQUIPMENT_DEFS) {
            if (def.slot !== slot) {
                continue;
            }
            if (curDef && def.tier <= curDef.tier) {
                continue;
            }
            if (!best || def.tier > best.tier) {
                best = def;
            }
        }
        return best;
    }
}
