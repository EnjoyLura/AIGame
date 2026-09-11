import { sys } from 'cc';
import { MonsterInfo, WaveInfo, mob } from '../battle/WaveData';
import { GameManager } from './GameManager';
import { miscDef } from './HeroSystem';
import { QuestSystem } from './QuestSystem';

/**
 * 资源副本系统（基地横幅入口）：
 * - 四个固定副本各产一类材料（金币/强化石/精炼合金/宝石），每个副本三档难度。
 * - 双重门槛：**次数**（每副本每日 3 次，本地日期惰性重置）+ **体力**（每次 8 点，
 *   由 GameFlow 在开战前扣减，本系统只负责次数，保持单一职责）。
 * - 档位解锁跟随关卡进度（初级通关 2 关 / 中级 4 关 / 高级 5 关），只影响敌人强度与
 *   产出量，不影响次数上限。
 * - 战斗侧复用试炼之塔的通道：GameFlow.startRun 的 trialFloor 参数传**负数**表示副本
 *   （详见 encodeDungeon/dungeonFromCode），这样 _lastRun 的 retry 原样重放无需改签名。
 * - 持久化在独立 localStorage 键（与试炼/招募/图鉴/邮件/签到同口径）。
 */

export type DungeonId = 'gold' | 'stone' | 'alloy' | 'gem';

export interface DungeonDef {
    id: DungeonId;
    name: string;
    ic: string;
    desc: string;
    /** 三档产出图标（UI 展示） */
    rewardIc: string[];
    /** 三档解锁所需通关关卡数（gm.stageCleared >= 该值时解锁） */
    unlockStage: number[];
    /** 三档敌人血量倍率 */
    hpMul: number[];
    /** 三档基础产出量（实际发放为该值 ±15% 浮动） */
    baseYield: number[];
    /** 三档产出对应材料 id（金库/钻石走资源，其余走 MISC_ITEM_DEFS） */
    rewardId?: string[];
    /** 怪物池（每波从池中随机取一种） */
    pool: string[];
}

export const DUNGEON_TIER_NAMES = ['初级', '中级', '高级'];
/** 每副本每日挑战次数 */
export const DUNGEON_RUNS_PER_DAY = 3;
/** 每次挑战消耗体力 */
export const DUNGEON_STAMINA_COST = 8;
/** 每次挑战波数 */
export const DUNGEON_WAVES = 3;

export const DUNGEON_DEFS: DungeonDef[] = [
    {
        id: 'gold', name: '金库废墟', ic: '💰', desc: '废弃银行的金库层，清理后搜刮残余物资。',
        rewardIc: ['🪙', '🪙', '🪙'], unlockStage: [2, 4, 5],
        hpMul: [0.9, 1.8, 3.2], baseYield: [600, 1320, 2400],
        pool: ['stoneape', 'dog'],
    },
    {
        id: 'stone', name: '军械库', ic: '🧱', desc: '坍塌的军械库，残骸中可拆出大量强化石。',
        rewardIc: ['🧱', '🧱', '🧱'], unlockStage: [2, 4, 5],
        hpMul: [1.0, 2.0, 3.6], baseYield: [8, 20, 45],
        rewardId: ['mat_stone', 'mat_stone', 'mat_stone'],
        pool: ['stoneape', 'boar'],
    },
    {
        id: 'alloy', name: '铸造厂', ic: '🔩', desc: '停摆的铸造车间，熔炉里还留着精炼合金。',
        rewardIc: ['🔩', '🔩', '🔩'], unlockStage: [2, 4, 5],
        hpMul: [1.1, 2.2, 4.0], baseYield: [3, 8, 18],
        rewardId: ['mat_alloy', 'mat_alloy', 'mat_alloy'],
        pool: ['stoneape', 'boar', 'bear'],
    },
    {
        id: 'gem', name: '晶体矿脉', ic: '💎', desc: '地下晶簇矿脉，产出用于镶嵌的各种宝石。',
        rewardIc: ['💠', '💠', '💠'], unlockStage: [2, 4, 5],
        hpMul: [1.2, 2.4, 4.4], baseYield: [1, 2, 4],
        pool: ['stoneape', 'dog', 'eagle', 'bear'],
    },
];

export function dungeonDef(id: string): DungeonDef | undefined {
    return DUNGEON_DEFS.find(d => d.id === id);
}

/** 副本序号（负数编码用）；非法 id 返回 -1 */
export function dungeonIndex(id: string): number {
    return DUNGEON_DEFS.findIndex(d => d.id === id);
}

/**
 * 副本编码：把 (副本, 档位) 压成一个负数，塞进 GameFlow.startRun 的 trialFloor 参数。
 * 试炼之塔用正数、副本用负数，两者在 BattleManager 里互不干扰。
 */
export function encodeDungeon(id: DungeonId, tier: number): number {
    const idx = dungeonIndex(id);
    if (idx < 0) {
        return 0;
    }
    const t = Math.min(2, Math.max(0, Math.floor(tier)));
    return -(idx * 10 + t + 1);
}

/** 解码副本编码；非副本（>=0）或越界返回 null */
export function dungeonFromCode(code: number): { id: DungeonId; tier: number } | null {
    if (!(code < 0)) {
        return null;
    }
    const n = -Math.floor(code) - 1;
    const idx = Math.floor(n / 10);
    const tier = n % 10;
    if (idx < 0 || idx >= DUNGEON_DEFS.length || tier < 0 || tier > 2) {
        return null;
    }
    return { id: DUNGEON_DEFS[idx].id, tier };
}

/** 副本产出（金币/钻石走资源，其余走杂物库存） */
export interface DungeonReward {
    gold: number;
    diamond: number;
    /** 杂物产出：id → 数量（金库副本为空） */
    misc: Array<{ id: string; n: number }>;
    /** UI 展示行 */
    lines: Array<{ ic: string; name: string; n: number }>;
}

/** 宝石池（晶体矿脉产出；档位越高越容易出高品质宝石） */
const GEM_POOL: Array<{ id: string; tier: number; weight: number[] }> = [
    { id: 'gem_wind', tier: 2, weight: [3, 2, 1] },
    { id: 'gem_ice', tier: 3, weight: [3, 3, 2] },
    { id: 'gem_fire', tier: 4, weight: [2, 3, 4] },
    { id: 'gem_thunder', tier: 5, weight: [1, 2, 4] },
];

function _pickGem(tier: number): string {
    const weights: number[] = [];
    let total = 0;
    for (const g of GEM_POOL) {
        const w = g.weight[tier] ?? 1;
        weights.push(w);
        total += w;
    }
    let roll = Math.random() * total;
    for (let i = 0; i < GEM_POOL.length; i++) {
        roll -= weights[i];
        if (roll <= 0) {
            return GEM_POOL[i].id;
        }
    }
    return GEM_POOL[GEM_POOL.length - 1].id;
}

/** 实际发放量 = 基础量 × (0.85 ~ 1.15) 浮动（倍率固定，保证三档严格递增） */
function _jitter(base: number): number {
    return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3)));
}

/** 产出预览区间（UI 展示用；数值与 rollDungeonReward 同一口径，只取上下限） */
export function dungeonYieldRange(id: DungeonId, tier: number): { lo: number; hi: number } {
    const def = dungeonDef(id);
    if (!def) {
        return { lo: 0, hi: 0 };
    }
    const t = Math.min(2, Math.max(0, Math.floor(tier)));
    const base = def.baseYield[t];
    return { lo: Math.max(1, Math.round(base * 0.85)), hi: Math.max(1, Math.round(base * 1.15)) };
}

/** 掷副本产出（通关结算调用；发奖与结算面板共用此函数） */
export function rollDungeonReward(id: DungeonId, tier: number): DungeonReward {
    const def = dungeonDef(id);
    const out: DungeonReward = { gold: 0, diamond: 0, misc: [], lines: [] };
    if (!def) {
        return out;
    }
    const t = Math.min(2, Math.max(0, Math.floor(tier)));
    if (id === 'gold') {
        out.gold = _jitter(def.baseYield[t]);
        // 高级金库额外给钻石（区别于普通关卡产出）
        if (t === 2) {
            out.diamond = 20 + Math.floor(Math.random() * 16);
        }
        out.lines.push({ ic: '🪙', name: '金币', n: out.gold });
        if (out.diamond > 0) {
            out.lines.push({ ic: '💎', name: '钻石', n: out.diamond });
        }
        return out;
    }
    if (id === 'gem') {
        const n = def.baseYield[t];
        const got: Record<string, number> = {};
        for (let i = 0; i < n; i++) {
            const gid = _pickGem(t);
            got[gid] = (got[gid] ?? 0) + 1;
        }
        for (const gid in got) {
            out.misc.push({ id: gid, n: got[gid] });
        }
    } else {
        const mid = def.rewardId?.[t];
        if (mid) {
            out.misc.push({ id: mid, n: _jitter(def.baseYield[t]) });
        }
    }
    // 杂物名称/图标从杂物表取
    for (const m of out.misc) {
        const md = miscDef(m.id);
        out.lines.push({ ic: md?.ic ?? '📦', name: md?.name ?? m.id, n: m.n });
    }
    return out;
}

/** 副本怪物池（按档位放大血量与啃咬伤害） */
function _dungeonMonsters(def: DungeonDef, tier: number): MonsterInfo[] {
    const hpMul = def.hpMul[tier];
    const out: MonsterInfo[] = [];
    for (const mid of def.pool) {
        let m: MonsterInfo | null = null;
        const base = 100 + tier * 90;
        switch (mid) {
            case 'stoneape': m = mob.stoneape(base, 135 + tier * 12); break;
            case 'dog': m = mob.dog(Math.round(base * 0.6)); break;
            case 'boar': m = mob.boar(Math.round(base * 3)); break;
            case 'bear': m = mob.bear(Math.round(base * 12)); break;
            case 'eagle': m = mob.eagle(Math.round(base * 0.9)); break;
        }
        if (m) {
            out.push({
                ...m,
                hp: Math.round(m.hp * hpMul),
                touchDamage: Math.round(m.touchDamage * (1 + tier * 0.35)),
            });
        }
    }
    return out;
}

/** 生成副本波次表（3 波，档位越高越密） */
export function dungeonWaves(id: DungeonId, tier: number): WaveInfo[] {
    const def = dungeonDef(id);
    if (!def) {
        return [];
    }
    const t = Math.min(2, Math.max(0, Math.floor(tier)));
    const monsters = _dungeonMonsters(def, t);
    const scale = 1 + t * 0.3;
    const rhythm: Array<[number, number, number]> = [
        [Math.round(8 * scale), Math.max(0.6, 1.1 - t * 0.15), Math.round(7 * scale)],
        [Math.round(10 * scale), Math.max(0.55, 1.0 - t * 0.15), Math.round(9 * scale)],
        [Math.round(14 * scale), Math.max(0.5, 0.9 - t * 0.15), Math.round(11 * scale)],
    ];
    const waves: WaveInfo[] = [];
    for (let w = 0; w < DUNGEON_WAVES; w++) {
        const r = rhythm[w];
        waves.push({
            count: r[0],
            interval: r[1],
            maxAlive: r[2],
            // 副本不设精英怪（纯资源收集，避免随机性让产出体验割裂）
            eliteChance: 0,
            monsters,
        });
    }
    return waves;
}

interface DungeonSave {
    /** 次数统计所属自然日（YYYY-MM-DD），与存档日不同则视为新的一天 */
    date: string;
    /** 各副本今日已用次数 */
    counts: Record<string, number>;
    /** 累计挑战次数（含重复刷，排行榜/成就口径） */
    total: number;
}

export class DungeonSystem {
    private static _inst: DungeonSystem | null = null;
    static get instance(): DungeonSystem {
        if (!this._inst) {
            this._inst = new DungeonSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-dungeon';

    private _data: DungeonSave = { date: '', counts: {}, total: 0 };

    private constructor() {
        this._load();
    }

    // ================= 每日次数 =================

    /** 今日剩余次数（跨天惰性重置：日期不符即视为满次数） */
    remaining(id: DungeonId): number {
        const used = this._usedToday(id);
        return Math.max(0, DUNGEON_RUNS_PER_DAY - used);
    }

    /** 今日已用次数 */
    private _usedToday(id: DungeonId): number {
        if (this._data.date !== DungeonSystem._today()) {
            return 0;
        }
        const n = this._data.counts[id];
        return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
    }

    /** 累计挑战次数（含重复刷） */
    get totalRuns(): number {
        return this._data.total;
    }

    // ================= 门槛校验 =================

    /** 该档位是否已按关卡进度解锁 */
    isTierUnlocked(id: DungeonId, tier: number): boolean {
        const def = dungeonDef(id);
        if (!def) {
            return false;
        }
        const t = Math.min(2, Math.max(0, Math.floor(tier)));
        return GameManager.instance.stageCleared >= def.unlockStage[t];
    }

    /** 该档位解锁所需通关数（UI 提示用） */
    unlockStageOf(id: DungeonId, tier: number): number {
        const def = dungeonDef(id);
        if (!def) {
            return 0;
        }
        return def.unlockStage[Math.min(2, Math.max(0, Math.floor(tier)))];
    }

    /**
     * 能否进入（只校验次数与档位；体力由调用方校验，因为体力属于 GameManager 的资源域）。
     * reason 为可直接展示的中文提示。
     */
    canEnter(id: DungeonId, tier: number): { ok: boolean; reason?: string } {
        const def = dungeonDef(id);
        if (!def) {
            return { ok: false, reason: '副本不存在' };
        }
        if (!this.isTierUnlocked(id, tier)) {
            return { ok: false, reason: `需通关第 ${this.unlockStageOf(id, tier)} 关` };
        }
        if (this.remaining(id) <= 0) {
            return { ok: false, reason: '今日次数已用完' };
        }
        return { ok: true };
    }

    /** 扣一次今日次数并累加总次数；次数不足返回 false。体力扣减由调用方负责 */
    consume(id: DungeonId): boolean {
        if (this.remaining(id) <= 0) {
            return false;
        }
        const today = DungeonSystem._today();
        if (this._data.date !== today) {
            // 跨天：清空计数再记这一次
            this._data.date = today;
            this._data.counts = {};
        }
        this._data.counts[id] = (this._data.counts[id] ?? 0) + 1;
        this._data.total++;
        this._save();
        // 每日任务「每日委托」按当日进本次数计数（refund 不回退任务进度：已打过的副本不算没打）
        QuestSystem.instance.trackDungeon();
        return true;
    }

    /** 已用次数（UI 展示「今日 x/3」） */
    usedToday(id: DungeonId): number {
        return this._usedToday(id);
    }

    /**
     * 退还一次次数（开战失败回滚用）。
     * 只退当日已记的次数，不低于 0；总次数同步回退，避免虚增成就进度。
     */
    refund(id: DungeonId): void {
        if (this._data.date !== DungeonSystem._today()) {
            return;
        }
        const cur = this._data.counts[id] ?? 0;
        if (cur <= 0) {
            return;
        }
        this._data.counts[id] = cur - 1;
        this._data.total = Math.max(0, this._data.total - 1);
        this._save();
    }

    // ================= 持久化 =================

    private static _today(): string {
        const d = new Date();
        const p = (n: number) => (n < 10 ? '0' : '') + n;
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(DungeonSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    // 逐字段白名单：只接受已知副本 id，次数钳制在 0~每日上限
                    const counts: Record<string, number> = {};
                    if (d.counts && typeof d.counts === 'object') {
                        for (const def of DUNGEON_DEFS) {
                            const v = d.counts[def.id];
                            if (typeof v === 'number' && v > 0) {
                                counts[def.id] = Math.min(DUNGEON_RUNS_PER_DAY, Math.floor(v));
                            }
                        }
                    }
                    this._data = {
                        date: typeof d.date === 'string' ? d.date : '',
                        counts,
                        total: Math.max(0, Math.floor(d.total ?? 0)),
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
        try {
            sys.localStorage.setItem(DungeonSystem.SAVE_KEY, JSON.stringify(this._data));
        } catch {
            // 配额满等写入失败：静默忽略（不影响本局）
        }
    }
}
