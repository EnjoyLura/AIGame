import { sys } from 'cc';
import { GameManager } from './GameManager';
import { GameEvent } from '../config/GameConfig';
import { eventCenter } from './EventCenter';
import { HeroSystem } from './HeroSystem';
import { HERO_DEFS } from '../battle/HeroDef';
import { miscDef } from './HeroSystem';

/**
 * 远征派遣系统（基地页入口）：
 * - 派英雄执行限时任务，真实时间到点回来领奖；三个任务位可同时派遣。
 * - 每个任务认一个属性（火力/敏捷/破甲），队伍匹配度决定奖励倍率 0.6x~1.8x；
 *   不是硬门槛——谁都能派，只是对口队伍拿得多。
 * - 派遣中的英雄被占用（不能重复派，也不能上阵），这是唯一的取舍压力来源。
 * - 倒计时用秒级时间戳 endTs 现算，绝不做累加计数：切后台/刷新/跨天都不会错。
 * - 持久化在独立 localStorage 键（与副本/试炼/招募同口径），奖励发放才走 gm.save()。
 */

/** 远征任务 id */
export type ExpeditionId = 'scout' | 'escort' | 'purge';

/** 任务需求属性：火力（攻击）/ 敏捷（射速）/ 破甲（暴击） */
export type HeroAttr = 'fire' | 'agile' | 'pierce';

export const HERO_ATTR_NAMES: Record<HeroAttr, string> = {
    fire: '火力', agile: '敏捷', pierce: '破甲',
};

export const HERO_ATTR_IC: Record<HeroAttr, string> = {
    fire: '🔥', agile: '💨', pierce: '🎯',
};

/** 每日派遣次数 */
export const EXPEDITION_RUNS_PER_DAY = 3;

/** 匹配倍率上下限（不对口也有保底，对口最多 +80%） */
export const EXP_MULT_MIN = 0.6;
export const EXP_MULT_MAX = 1.8;

/** 加速费用：每剩余分钟消耗的钻石（向上取整，最低 1） */
export const EXP_SPEEDUP_GEM_PER_MIN = 3;

/** 奖励浮动（与副本同口径 ±15%） */
function _jitter(base: number): number {
    const f = 0.85 + Math.random() * 0.3;
    return Math.max(1, Math.round(base * f));
}

export interface ExpeditionDef {
    id: ExpeditionId;
    name: string;
    ic: string;
    desc: string;
    /** 任务时长（分钟）：5 / 15 / 30 */
    minutes: number;
    /** 需求属性 */
    attr: HeroAttr;
    /** 需要几名英雄 */
    slots: number;
    /** 基础奖励（最终 = 基础 × 匹配倍率 × 浮动） */
    gold: number;
    diamond: number;
    misc: Array<{ id: string; n: number }>;
    /** 解锁所需通关关卡数 */
    unlockStage: number;
}

export const EXPEDITION_DEFS: ExpeditionDef[] = [
    {
        id: 'scout', name: '短途侦察', ic: '🛰️',
        desc: '派出侦察小队清扫基地周边，轻装快返。',
        minutes: 5, attr: 'agile', slots: 1,
        gold: 400, diamond: 0,
        misc: [{ id: 'mat_stone', n: 3 }],
        unlockStage: 1,
    },
    {
        id: 'escort', name: '物资护送', ic: '🚚',
        desc: '护送补给车队穿越废土，路远且险。',
        minutes: 15, attr: 'fire', slots: 2,
        gold: 1200, diamond: 15,
        misc: [{ id: 'mat_alloy', n: 4 }],
        unlockStage: 3,
    },
    {
        id: 'purge', name: '深度清剿', ic: '⚔️',
        desc: '深入尸潮腹地清剿巢穴，唯有精锐可归。',
        minutes: 30, attr: 'pierce', slots: 3,
        gold: 3000, diamond: 40,
        misc: [{ id: 'mat_core', n: 2 }],
        unlockStage: 5,
    },
];

export function expeditionDef(id: string): ExpeditionDef | undefined {
    return EXPEDITION_DEFS.find(d => d.id === id);
}

/** 远征进行中的一次派遣 */
export interface ExpeditionRun {
    defId: ExpeditionId;
    /** 参与的英雄 id */
    heroes: string[];
    /** 到期的秒级时间戳 */
    endTs: number;
    /** 派遣时定格的匹配倍率（之后英雄变动不影响已派任务） */
    mult: number;
}

/** 奖励结构（与 DungeonReward 同形状，便于结算面板复用） */
export interface ExpeditionReward {
    gold: number;
    diamond: number;
    misc: Array<{ id: string; n: number }>;
    lines: Array<{ ic: string; name: string; n: number }>;
}

/** 任务位状态 */
export type ExpeditionState = 'idle' | 'running' | 'ready';

// ================= 属性强度 =================

/**
 * 英雄在某属性上的强度。全部从既有数据派生（基础攻击 / 射速 / 暴击乘区），
 * 不维护第二张配置表——新英雄、新词缀、新宝石自动参与远征强度。
 */
export function heroAttrValue(heroId: string, attr: HeroAttr): number {
    const def = HERO_DEFS.find(d => d.id === heroId);
    if (!def) {
        return 0;
    }
    const hs = HeroSystem.instance;
    const mul = hs.equipMulOf(heroId);
    if (attr === 'fire') {
        // 火力：基础攻击 × 攻击乘区
        return def.atk * mul.atk;
    }
    if (attr === 'agile') {
        // 敏捷：射速（interval 越小越快）；激光手 interval=0 是持续光束，按 20/s 折算
        const rate = def.interval > 0 ? 1 / def.interval : 20;
        return def.atk * rate * mul.rate;
    }
    // 破甲：暴击收益期望（基础暴击率 + 装备/词缀/宝石加成）
    const crit = 0.15 + mul.crit;
    return def.atk * (1 + crit);
}

/** 全英雄在某属性上的平均值（作为匹配度的分母基准） */
function _attrBaseline(attr: HeroAttr): number {
    let sum = 0;
    for (const def of HERO_DEFS) {
        sum += heroAttrValue(def.id, attr);
    }
    return HERO_DEFS.length > 0 ? sum / HERO_DEFS.length : 1;
}

/**
 * 队伍匹配倍率：Σ(队员在需求属性上的强度) 与「同人数平均水准」的比值，
 * 线性映射到 [0.6, 1.8]。对口队伍 ≈ 1.4~1.8x，随便派 ≈ 0.6~0.9x。
 */
export function matchMultiplier(baseAttr: HeroAttr, heroIds: string[]): number {
    if (heroIds.length === 0) {
        return EXP_MULT_MIN;
    }
    let sum = 0;
    for (const id of heroIds) {
        sum += heroAttrValue(id, baseAttr);
    }
    const baseline = _attrBaseline(baseAttr) * heroIds.length;
    if (baseline <= 0) {
        return EXP_MULT_MIN;
    }
    const ratio = sum / baseline;
    const mult = EXP_MULT_MIN + ratio * 0.5;
    return Math.min(EXP_MULT_MAX, Math.max(EXP_MULT_MIN, mult));
}

/** 算出某次派遣的最终奖励（含匹配倍率与浮动） */
export function rollExpeditionReward(run: ExpeditionRun): ExpeditionReward {
    const def = expeditionDef(run.defId);
    const out: ExpeditionReward = { gold: 0, diamond: 0, misc: [], lines: [] };
    if (!def) {
        return out;
    }
    const m = Math.min(EXP_MULT_MAX, Math.max(EXP_MULT_MIN, run.mult));
    if (def.gold > 0) {
        out.gold = _jitter(def.gold * m);
        out.lines.push({ ic: '🪙', name: '金币', n: out.gold });
    }
    if (def.diamond > 0) {
        out.diamond = Math.max(1, Math.round(def.diamond * m));
        out.lines.push({ ic: '💎', name: '钻石', n: out.diamond });
    }
    for (const item of def.misc) {
        const n = Math.max(1, Math.round(item.n * m));
        out.misc.push({ id: item.id, n });
        const md = miscDef(item.id);
        out.lines.push({ ic: md?.ic ?? '📦', name: md?.name ?? item.id, n });
    }
    return out;
}

/** 奖励预览区间（UI 用，与 rollExpeditionReward 同口径） */
export function expeditionYieldRange(defId: ExpeditionId, mult: number): { lo: number; hi: number } {
    const def = expeditionDef(defId);
    if (!def) {
        return { lo: 0, hi: 0 };
    }
    const m = Math.min(EXP_MULT_MAX, Math.max(EXP_MULT_MIN, mult));
    return {
        lo: Math.max(1, Math.round(def.gold * m * 0.85)),
        hi: Math.max(1, Math.round(def.gold * m * 1.15)),
    };
}

// ================= 存档 =================

interface ExpeditionSave {
    /** 次数统计所属自然日（YYYY-MM-DD）——只管次数，与 runs 无关 */
    date: string;
    /** 今日已派遣次数 */
    used: number;
    /** 进行中的派遣（跨天不清理，到点照常可领） */
    runs: ExpeditionRun[];
    /** 累计派遣次数（排行榜/成就口径） */
    total: number;
}

export class ExpeditionSystem {
    private static _inst: ExpeditionSystem | null = null;
    static get instance(): ExpeditionSystem {
        if (!this._inst) {
            this._inst = new ExpeditionSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-expedition';

    private _data: ExpeditionSave = { date: '', used: 0, runs: [], total: 0 };

    private constructor() {
        this._load();
    }

    // ================= 次数 =================

    /** 今日剩余派遣次数（跨天惰性重置） */
    remainingToday(): number {
        return Math.max(0, EXPEDITION_RUNS_PER_DAY - this._usedToday());
    }

    private _usedToday(): number {
        if (this._data.date !== ExpeditionSystem._today()) {
            return 0;
        }
        return Math.max(0, Math.floor(this._data.used));
    }

    get totalRuns(): number {
        return this._data.total;
    }

    // ================= 任务位查询 =================

    /** 当前进行中的派遣列表（无对应任务的记录会被过滤） */
    runs(): ExpeditionRun[] {
        const out: ExpeditionRun[] = [];
        for (const r of this._data.runs) {
            if (expeditionDef(r.defId)) {
                out.push(r);
            }
        }
        return out;
    }

    runOf(defId: ExpeditionId): ExpeditionRun | null {
        for (const r of this._data.runs) {
            if (r.defId === defId) {
                return r;
            }
        }
        return null;
    }

    stateOf(defId: ExpeditionId): ExpeditionState {
        const run = this.runOf(defId);
        if (!run) {
            return 'idle';
        }
        return this.remainSecs(defId) > 0 ? 'running' : 'ready';
    }

    /** 剩余秒数（无任务或已到期返回 0） */
    remainSecs(defId: ExpeditionId): number {
        const run = this.runOf(defId);
        if (!run) {
            return 0;
        }
        return Math.max(0, Math.ceil(run.endTs - ExpeditionSystem._now()));
    }

    /** 剩余时间文案（分:秒；超过 1 小时显示 时:分） */
    remainText(defId: ExpeditionId): string {
        const s = this.remainSecs(defId);
        if (s <= 0) {
            return '可领取';
        }
        const p = (n: number) => (n < 10 ? '0' : '') + n;
        if (s >= 3600) {
            return `${Math.floor(s / 3600)}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`;
        }
        return `${p(Math.floor(s / 60))}:${p(s % 60)}`;
    }

    /** 立即完成的钻石费用（按剩余分钟向上取整，最低 1；已到期为 0） */
    speedUpCost(defId: ExpeditionId): number {
        const s = this.remainSecs(defId);
        if (s <= 0) {
            return 0;
        }
        return Math.max(1, Math.ceil(s / 60) * EXP_SPEEDUP_GEM_PER_MIN);
    }

    // ================= 英雄占用 =================

    /** 某英雄是否正被远征占用（进行中的任务，可领的任务不再占用） */
    isHeroBusy(heroId: string): boolean {
        for (const r of this._data.runs) {
            if (r.heroes.indexOf(heroId) >= 0 && this.remainSecs(r.defId) > 0) {
                return true;
            }
        }
        return false;
    }

    /** 占用该英雄的任务名（UI 提示用） */
    busyTaskName(heroId: string): string {
        for (const r of this._data.runs) {
            if (r.heroes.indexOf(heroId) >= 0 && this.remainSecs(r.defId) > 0) {
                const def = expeditionDef(r.defId);
                return def ? def.name : '远征';
            }
        }
        return '';
    }

    // ================= 派遣 =================

    /** 是否可派遣（返回原因供 UI 提示） */
    canStart(defId: ExpeditionId, heroIds: string[]): { ok: boolean; reason?: string } {
        const def = expeditionDef(defId);
        if (!def) {
            return { ok: false, reason: '任务不存在' };
        }
        const gm = GameManager.instance;
        if (gm.stageCleared < def.unlockStage) {
            return { ok: false, reason: `需通关第 ${def.unlockStage} 关` };
        }
        if (this.stateOf(defId) !== 'idle') {
            return { ok: false, reason: '该任务已在执行' };
        }
        if (this.remainingToday() <= 0) {
            return { ok: false, reason: '今日派遣次数已用完' };
        }
        if (heroIds.length !== def.slots) {
            return { ok: false, reason: `需选择 ${def.slots} 名英雄` };
        }
        const seen: string[] = [];
        for (const id of heroIds) {
            if (!gm.isHeroOwned(id)) {
                return { ok: false, reason: '英雄未拥有' };
            }
            if (seen.indexOf(id) >= 0) {
                return { ok: false, reason: '不能重复派遣同一英雄' };
            }
            seen.push(id);
            if (gm.isInLineup(id)) {
                return { ok: false, reason: `${ExpeditionSystem._heroName(id)} 在上阵中` };
            }
            if (this.isHeroBusy(id)) {
                return { ok: false, reason: `${ExpeditionSystem._heroName(id)} 在远征中` };
            }
        }
        return { ok: true };
    }

    /** 派出队伍：扣次数 + 记录任务（原子：校验失败不改任何状态） */
    start(defId: ExpeditionId, heroIds: string[]): boolean {
        if (!this.canStart(defId, heroIds).ok) {
            return false;
        }
        const def = expeditionDef(defId);
        if (!def) {
            return false;
        }
        const today = ExpeditionSystem._today();
        if (this._data.date !== today) {
            // 跨天：只重置次数，不动 runs
            this._data.date = today;
            this._data.used = 0;
        }
        this._data.used++;
        this._data.total++;
        this._data.runs.push({
            defId,
            heroes: heroIds.slice(),
            endTs: ExpeditionSystem._now() + def.minutes * 60,
            mult: matchMultiplier(def.attr, heroIds),
        });
        this._save();
        eventCenter.emit(GameEvent.EXPEDITION_START, defId, heroIds.slice());
        return true;
    }

    /**
     * 立即完成（钻石或广告回调后调用）。只把 endTs 拉到当前时刻，奖励仍走 finish() 领取，
     * 这样「加速」与「到点」共用同一条发奖路径，不会出现两套发奖逻辑。
     */
    speedUp(defId: ExpeditionId): boolean {
        const run = this.runOf(defId);
        if (!run || this.remainSecs(defId) <= 0) {
            return false;
        }
        run.endTs = ExpeditionSystem._now();
        this._save();
        return true;
    }

    /** 领奖：发金币/钻石/材料并清除该任务；返回 null 表示不可领 */
    finish(defId: ExpeditionId): ExpeditionReward | null {
        if (this.stateOf(defId) !== 'ready') {
            return null;
        }
        const run = this.runOf(defId);
        if (!run) {
            return null;
        }
        const reward = rollExpeditionReward(run);
        const gm = GameManager.instance;
        if (reward.gold > 0) {
            gm.res.add('gold', reward.gold);
        }
        if (reward.diamond > 0) {
            gm.res.add('diamond', reward.diamond);
        }
        for (const m of reward.misc) {
            if (miscDef(m.id) && m.n > 0) {
                gm.misc[m.id] = (gm.misc[m.id] ?? 0) + m.n;
            }
        }
        gm.save();
        this._data.runs = this._data.runs.filter(r => r.defId !== defId);
        this._save();
        eventCenter.emit(GameEvent.EXPEDITION_DONE, defId, reward);
        return reward;
    }

    /** 是否有已完成待领取的任务（红点用） */
    hasClaimable(): boolean {
        for (const def of EXPEDITION_DEFS) {
            if (this.stateOf(def.id) === 'ready') {
                return true;
            }
        }
        return false;
    }

    // ================= 持久化 =================

    private static _now(): number {
        return Math.floor(Date.now() / 1000);
    }

    private static _heroName(heroId: string): string {
        const def = HERO_DEFS.find(d => d.id === heroId);
        return def ? def.name : heroId;
    }

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
            const raw = sys.localStorage.getItem(ExpeditionSystem.SAVE_KEY);
            if (!raw) {
                return;
            }
            const d = JSON.parse(raw);
            if (!d || typeof d !== 'object') {
                return;
            }
            const used = Math.max(0, Math.floor(d.used ?? 0));
            this._data = {
                date: String(d.date ?? ''),
                used: Math.min(EXPEDITION_RUNS_PER_DAY, used),
                runs: this._sanitizeRuns(d.runs),
                total: Math.max(0, Math.floor(d.total ?? 0)),
            };
        } catch {
            // 坏档回默认
        }
    }

    /** 逐字段白名单：非法 defId / 未拥有英雄 / 负数与超长数组全部剔除 */
    private _sanitizeRuns(raw: unknown): ExpeditionRun[] {
        if (!Array.isArray(raw)) {
            return [];
        }
        const out: ExpeditionRun[] = [];
        const takenDefs: string[] = [];
        for (const r of raw) {
            if (!r || typeof r !== 'object') {
                continue;
            }
            const def = expeditionDef(String(r.defId ?? ''));
            if (!def || takenDefs.indexOf(def.id) >= 0) {
                continue;
            }
            const endTs = Math.floor(Number(r.endTs));
            if (!isFinite(endTs) || endTs <= 0) {
                continue;
            }
            let mult = Number(r.mult);
            if (!isFinite(mult)) {
                mult = EXP_MULT_MIN;
            }
            mult = Math.min(EXP_MULT_MAX, Math.max(EXP_MULT_MIN, mult));
            const heroes: string[] = [];
            if (Array.isArray(r.heroes)) {
                for (const h of r.heroes) {
                    const id = String(h ?? '');
                    // 英雄可能已被回收/存档损坏：引用了不存在的英雄就丢弃该条
                    if (!GameManager.instance.isHeroOwned(id) || heroes.indexOf(id) >= 0) {
                        continue;
                    }
                    heroes.push(id);
                }
            }
            if (heroes.length === 0) {
                continue;
            }
            // 队伍人数上限按任务定义裁剪，避免坏档塞进超额英雄
            takenDefs.push(def.id);
            out.push({ defId: def.id, heroes: heroes.slice(0, def.slots), endTs, mult });
        }
        return out;
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            sys.localStorage.setItem(ExpeditionSystem.SAVE_KEY, JSON.stringify(this._data));
        } catch {
            // 配额满/隐私模式：静默失败，不影响本局
        }
    }
}
