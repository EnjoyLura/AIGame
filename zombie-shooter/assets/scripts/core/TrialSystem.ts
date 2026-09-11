import { sys } from 'cc';
import { MonsterInfo, WaveInfo, mob } from '../battle/WaveData';
import { LootDrop, EquipTier, EQUIPMENT_DEFS, miscDef } from './HeroSystem';

/**
 * 试炼之塔系统（基地建筑「试炼之塔」入口）：
 * - 无限层高塔，每层固定 3 波怪；层数越高怪越强（hpMul = 1.25^(floor-1)）。
 * - 层段解锁怪物池：每 5 层开放更硬的怪型，每 5 层为里程碑（奖励大幅提升）。
 * - 解锁链：只能挑战「已通关最高层 + 1」；层内失败不回退进度，可无限重挑（不消耗体力）。
 * - 每层首通给一次性奖励（已通层重复挑战只拿基础金币+掉落）。
 * - 持久化在独立 localStorage 键（与广告/礼包/任务/签到/邮件/图鉴同口径）。
 */

/** 塔层上限（防数值溢出；到顶后仍可重复刷已通层） */
export const TRIAL_MAX_FLOOR = 60;
/** 里程碑间隔：每 5 层为层段大奖 */
export const TRIAL_MILESTONE_EVERY = 5;
/** 每层波数 */
export const TRIAL_WAVES_PER_FLOOR = 3;

export interface TrialFloorDef {
    floor: number;
    /** 展示名 */
    name: string;
    /** 怪物强度倍率（hp ×N、啃咬伤害 ×√N） */
    hpMul: number;
    /** 基础精英概率 */
    eliteChance: number;
    /** 该层怪物池（每波从池中随机取一种） */
    monsters: MonsterInfo[];
    /** 该层是否里程碑层（每 5 层） */
    milestone: boolean;
    /** 层段名（如「碎石层段」） */
    sectName: string;
}

/** 层段主题（每 5 层一段，决定怪物池与命名） */
const SECT_THEMES: Array<{ from: number; name: string; pool: string[] }> = [
    { from: 1, name: '碎石层段', pool: ['stoneape'] },
    { from: 5, name: '疾走层段', pool: ['stoneape', 'dog'] },
    { from: 10, name: '风袭层段', pool: ['stoneape', 'dog', 'eagle'] },
    { from: 15, name: '獠牙层段', pool: ['stoneape', 'dog', 'boar', 'eagle'] },
    { from: 20, name: '重装层段', pool: ['stoneape', 'boar', 'bear', 'eagle'] },
    { from: 30, name: '尸潮层段', pool: ['stoneape', 'dog', 'boar', 'bear', 'eagle'] },
];

function _sectOf(floor: number): { name: string; pool: string[] } {
    let cur = SECT_THEMES[0];
    for (const t of SECT_THEMES) {
        if (floor >= t.from) {
            cur = t;
        }
    }
    return cur;
}

/** 层数强度倍率：第 1 层 ×1，每层 ×1.25（第 10 层 ≈ ×7.5，第 20 层 ≈ ×69） */
export function trialHpMul(floor: number): number {
    return Math.pow(1.25, Math.max(0, floor - 1));
}

/** 怪物工厂分派（按 id 造该层基准怪） */
function _makeMob(id: string, floor: number): MonsterInfo | null {
    // 基准强度随层数线性上浮（乘在 hpMul 之外的基准值上，避免全由指数承担）
    const base = 100 + floor * 22;
    switch (id) {
        case 'stoneape': return mob.stoneape(base, 135 + Math.min(70, floor * 2));
        case 'dog': return mob.dog(Math.round(base * 0.6));
        case 'boar': return mob.boar(Math.round(base * 3));
        case 'bear': return mob.bear(Math.round(base * 12));
        case 'eagle': return mob.eagle(Math.round(base * 0.9));
    }
    return null;
}

/** 该层定义（含怪物池，强度已按层数放大） */
export function trialFloorDef(floor: number): TrialFloorDef {
    const f = Math.min(TRIAL_MAX_FLOOR, Math.max(1, Math.floor(floor)));
    const hpMul = trialHpMul(f);
    const sect = _sectOf(f);
    const monsters: MonsterInfo[] = [];
    for (const id of sect.pool) {
        const m = _makeMob(id, f);
        if (m) {
            monsters.push({
                ...m,
                hp: Math.round(m.hp * hpMul),
                touchDamage: Math.round(m.touchDamage * Math.sqrt(hpMul)),
            });
        }
    }
    // 精英概率随层数爬升，里程碑层额外加成
    const milestone = f % TRIAL_MILESTONE_EVERY === 0;
    const eliteChance = Math.min(0.55, 0.02 + f * 0.012 + (milestone ? 0.1 : 0));
    return {
        floor: f,
        name: `第 ${f} 层`,
        hpMul,
        eliteChance,
        monsters,
        milestone,
        sectName: sect.name,
    };
}

/** 生成某层的波次表（3 波，节奏随层数收紧） */
export function trialWaves(floor: number): WaveInfo[] {
    const def = trialFloorDef(floor);
    const f = def.floor;
    // 基础节奏：3 波由松到紧；每 5 层整体密度 ×1.15
    const scale = Math.pow(1.15, Math.floor((f - 1) / TRIAL_MILESTONE_EVERY));
    const rhythm: [number, number, number][] = [
        [Math.round(8 * scale), Math.max(0.55, 1.1 - f * 0.012), Math.round(7 * Math.min(2, scale))],
        [Math.round(10 * scale), Math.max(0.5, 1.0 - f * 0.012), Math.round(9 * Math.min(2, scale))],
        [Math.round(14 * scale), Math.max(0.45, 0.9 - f * 0.012), Math.round(11 * Math.min(2, scale))],
    ];
    const waves: WaveInfo[] = [];
    for (let w = 0; w < TRIAL_WAVES_PER_FLOOR; w++) {
        const r = rhythm[w];
        waves.push({
            count: r[0],
            interval: r[1],
            maxAlive: r[2],
            eliteChance: def.eliteChance,
            monsters: def.monsters,
        });
    }
    return waves;
}

/** 层首通奖励预览：金币 + 钻石（里程碑翻倍）+ 掉落（里程碑保底装备） */
export interface TrialRewardPreview {
    gold: number;
    diamond: number;
    /** 掉落展示（装备/材料等） */
    drops: LootDrop[];
}

/** 掷该层首通掉落（里程碑层保底一件装备，普通层小概率材料） */
export function rollTrialDrops(floor: number): LootDrop[] {
    const def = trialFloorDef(floor);
    const drops: LootDrop[] = [];
    if (def.milestone) {
        // 里程碑：保底一件装备（品质随层数上浮）+ 一份英雄核心
        const tierRoll = Math.random() + Math.min(0.45, floor * 0.012);
        const tier: EquipTier = tierRoll < 0.18 ? 1 : tierRoll < 0.42 ? 2
            : tierRoll < 0.68 ? 3 : tierRoll < 0.88 ? 4 : tierRoll < 0.97 ? 5 : 6;
        const pool = EQUIPMENT_DEFS.filter(d => d.tier === tier);
        if (pool.length > 0) {
            const e = pool[Math.floor(Math.random() * pool.length)];
            drops.push({ kind: 'equip', slot: e.slot, tier: e.tier, name: e.name, ic: '🎁' });
        }
        const core = miscDef('mat_core');
        if (core) {
            drops.push({ kind: 'misc', tier: core.tier, id: core.id, name: core.name, ic: core.ic });
        }
    } else {
        // 普通层：三成概率掉一份材料（强化石/合金/宝石随机）
        if (Math.random() < 0.3 + Math.min(0.3, floor * 0.01)) {
            const ids = ['mat_stone', 'mat_alloy', 'gem_fire', 'gem_wind', 'gem_ice'];
            const d = miscDef(ids[Math.floor(Math.random() * ids.length)]);
            if (d) {
                drops.push({ kind: 'misc', tier: d.tier, id: d.id, name: d.name, ic: d.ic });
            }
        }
    }
    return drops;
}

/** 计算首通奖励数值（落盘发奖与 UI 预览共用同一口径） */
export function trialFloorReward(floor: number): TrialRewardPreview {
    const def = trialFloorDef(floor);
    const f = def.floor;
    const mileMul = def.milestone ? 2 : 1;
    const gold = Math.round(200 * f * 1.08 * mileMul);
    const diamond = def.milestone ? 20 + f : (f % 2 === 0 ? Math.round(f * 0.8) : 0);
    return { gold, diamond, drops: rollTrialDrops(f) };
}

interface TrialSave {
    /** 已通关的最高层（0 = 未通关任何层） */
    maxFloor: number;
    /** 已通关的层列表（精确判断首通；里程碑发奖幂等） */
    cleared: number[];
    /** 累计通关层次数（含重复刷，排行榜/成就口径） */
    totalClears: number;
}

export class TrialSystem {
    private static _inst: TrialSystem | null = null;
    static get instance(): TrialSystem {
        if (!this._inst) {
            this._inst = new TrialSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-trial';

    private _data: TrialSave = { maxFloor: 0, cleared: [], totalClears: 0 };

    private constructor() {
        this._load();
    }

    // ================= 查询 =================

    /** 已通关的最高层（0 = 尚未通关任何层） */
    get maxFloor(): number {
        return this._data.maxFloor;
    }

    /** 累计通关层次数（含重复刷） */
    get totalClears(): number {
        return this._data.totalClears;
    }

    /** 已通关层数（去重） */
    get clearedCount(): number {
        return this._data.cleared.length;
    }

    /** 是否已通关该层 */
    isFloorCleared(floor: number): boolean {
        return this._data.cleared.indexOf(Math.floor(floor)) >= 0;
    }

    /** 该层是否可挑战：只能打「已通过最高层 + 1」，且不超过塔上限 */
    isFloorUnlocked(floor: number): boolean {
        const f = Math.floor(floor);
        return f >= 1 && f <= TRIAL_MAX_FLOOR && f <= this._data.maxFloor + 1;
    }

    /** 当前可挑战层（= 已通过最高层 + 1，封顶塔上限） */
    get nextFloor(): number {
        return Math.min(TRIAL_MAX_FLOOR, this._data.maxFloor + 1);
    }

    /** 是否首通（该层未领过首通奖励） */
    isFirstClear(floor: number): boolean {
        return !this.isFloorCleared(floor);
    }

    // ================= 操作 =================

    /** 登记通关；返回 true 表示本次是首通（调用方据此发放首通奖励） */
    markFloorCleared(floor: number): boolean {
        const f = Math.min(TRIAL_MAX_FLOOR, Math.max(1, Math.floor(floor)));
        const first = !this.isFloorCleared(f);
        if (first) {
            this._data.cleared.push(f);
        }
        this._data.totalClears++;
        if (f > this._data.maxFloor) {
            this._data.maxFloor = f;
        }
        this._save();
        return first;
    }

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(TrialSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    const cleared: number[] = [];
                    if (Array.isArray(d.cleared)) {
                        for (const v of d.cleared) {
                            const n = Math.floor(v);
                            if (n >= 1 && n <= TRIAL_MAX_FLOOR && cleared.indexOf(n) < 0) {
                                cleared.push(n);
                            }
                        }
                    }
                    this._data = {
                        maxFloor: Math.min(TRIAL_MAX_FLOOR, Math.max(0, Math.floor(d.maxFloor ?? 0))),
                        cleared,
                        totalClears: Math.max(0, Math.floor(d.totalClears ?? 0)),
                    };
                }
            }
        } catch {
            // 坏档回默认
        }
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        sys.localStorage.setItem(TrialSystem.SAVE_KEY, JSON.stringify(this._data));
    }
}
