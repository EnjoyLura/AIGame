import { sys } from 'cc';
import { BattleConfig, GameEvent } from '../config/GameConfig';
import { eventCenter } from './EventCenter';
import { GameManager } from './GameManager';
import { miscDef } from './HeroSystem';
import { FINAL_STAGE_ID, stageInfo } from '../battle/StageData';

/**
 * 巡逻队（挂机收益 + 扫荡）——只服务「已经打通的关卡」：
 *
 * - 挂机：选定一个已通关关卡驻扎，按小时累积金币与材料，随时可领，累积 8 小时封顶。
 * - 扫荡：花体力瞬时清一遍已通关关卡，直接拿该关奖励，每日有次数上限。
 *
 * 两条线的产出都随「已通关关卡数」增长（stageCleared 越多越丰厚），
 * 且扫荡/挂机的关卡序号越高，档次越好——玩家推得越远，回头收菜越划算。
 */

/** 累积上限（小时）：离线收益封顶，超出部分不再增长 */
export const PATROL_MAX_HOURS = 8;

/** 金币速率：每通关一关每小时 400 金币（全通关 5 关 = 2000/小时）。
 *  远征 3 次约 4800~6000 金币/小时，但占用英雄且每日限 3 次；
 *  巡逻不占英雄、可离线累积，故单小时略低，以 8 小时上限封顶。 */
export const PATROL_GOLD_PER_STAGE_HOUR = 400;

/** 巡逻关卡加成：所选关卡序号每高 1 关，金币产出 +8%（往前巡逻更划算） */
export const PATROL_STAGE_BONUS = 0.08;

/** 每日扫荡次数：基础 2 次，每通关 2 关 +1 次 */
export const PATROL_SWEEP_BASE = 2;

export const PATROL_SWEEP_PER_CLEARED = 0.5;

/** 扫荡每关金币：关卡序号 × 200（与首通奖励 stageId×200 同口径），再按已通关数加码 */
export const PATROL_SWEEP_GOLD_PER_STAGE = 200;

export const PATROL_SWEEP_GOLD_PER_CLEARED = 50;

/** 挂机材料档次：按所选巡逻关卡分段，数量随已通关关数增长 */
export interface PatrolMiscTier {
    /** 该档覆盖的最大关卡序号 */
    maxStage: number;
    id: string;
    /** 每小时基础数量（再叠加已通关关数） */
    base: number;
    /** 每通关一关追加的每小时数量 */
    perCleared: number;
}

export const PATROL_MISC_TIERS: PatrolMiscTier[] = [
    { maxStage: 2, id: 'mat_stone', base: 4, perCleared: 2 },
    { maxStage: 4, id: 'mat_alloy', base: 2, perCleared: 1 },
    { maxStage: FINAL_STAGE_ID, id: 'mat_blueprint', base: 1, perCleared: 0.5 },
];

/** 巡逻产出（挂机领取 / 扫荡共用形状） */
export interface PatrolYield {
    gold: number;
    misc: Array<{ id: string; n: number }>;
}

export interface PatrolSweepResult extends PatrolYield {
    stageId: number;
    /** 本关名（结算提示用） */
    stageName: string;
}

/** 已通关关卡数（=存档 stageCleared），产出公式的唯一进度输入 */
function _cleared(): number {
    return Math.max(0, Math.min(FINAL_STAGE_ID, Math.floor(GameManager.instance.stageCleared)));
}

/** 巡逻关卡合法性：必须是已通关的关卡（1 ~ stageCleared） */
export function isPatrolStage(stageId: number): boolean {
    const id = Math.floor(stageId);
    return id >= 1 && id <= _cleared();
}

/** 巡逻关卡所在的材料档 */
export function patrolMiscTier(stageId: number): PatrolMiscTier {
    const id = Math.min(Math.max(1, Math.floor(stageId)), FINAL_STAGE_ID);
    for (const t of PATROL_MISC_TIERS) {
        if (id <= t.maxStage) {
            return t;
        }
    }
    return PATROL_MISC_TIERS[PATROL_MISC_TIERS.length - 1];
}

/** 每小时金币产出：已通关关数 × 400 ×（1 + 所选关卡 × 8%） */
export function patrolGoldPerHour(stageId: number): number {
    const cleared = _cleared();
    const id = Math.min(Math.max(1, Math.floor(stageId)), FINAL_STAGE_ID);
    return Math.round(cleared * PATROL_GOLD_PER_STAGE_HOUR * (1 + (id - 1) * PATROL_STAGE_BONUS));
}

/** 每小时材料产出（可为小数，领取时用 carry 兜住零头不丢） */
export function patrolMiscPerHour(stageId: number): { id: string; n: number } {
    const tier = patrolMiscTier(stageId);
    const n = tier.base + _cleared() * tier.perCleared;
    return { id: tier.id, n: Math.max(0, n) };
}

/** 每日扫荡次数上限：2 + ⌊已通关关数 / 2⌋ */
export function patrolSweepPerDay(): number {
    return PATROL_SWEEP_BASE + Math.floor(_cleared() * PATROL_SWEEP_PER_CLEARED);
}

/** 扫荡奖励预览（单次）：随关卡序号与已通关关数增长，金币带 ±15% 浮动 */
export function patrolSweepReward(stageId: number): PatrolYield {
    const id = Math.min(Math.max(1, Math.floor(stageId)), FINAL_STAGE_ID);
    const cleared = _cleared();
    const base = id * PATROL_SWEEP_GOLD_PER_STAGE + cleared * PATROL_SWEEP_GOLD_PER_CLEARED;
    const f = 0.85 + Math.random() * 0.3;
    const tier = patrolMiscTier(id);
    return {
        gold: Math.max(1, Math.round(base * f)),
        misc: [{ id: tier.id, n: Math.max(1, 2 + Math.floor(id / 2)) }],
    };
}

interface PatrolSave {
    /** 巡逻关卡（0 = 未驻扎） */
    stageId: number;
    /** 累积起点（秒级时间戳）：仅当正在巡逻时有效 */
    lastTs: number;
    /** 材料零头进位（避免每次领取都丢掉不足 1 个的部分） */
    carry: number;
    /** 累计收取次数（成就/统计口径） */
    total: number;
    /** 扫荡次数所属自然日（YYYY-MM-DD） */
    date: string;
    /** 今日已扫荡次数 */
    sweeps: number;
}

export class PatrolSystem {
    private static _inst: PatrolSystem | null = null;
    static get instance(): PatrolSystem {
        if (!this._inst) {
            this._inst = new PatrolSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-patrol';

    private _data: PatrolSave = { stageId: 0, lastTs: 0, carry: 0, total: 0, date: '', sweeps: 0 };

    private constructor() {
        this._load();
    }

    // ================= 解锁与驻扎 =================

    /** 巡逻解锁：通关第 1 关（它是「给已通关关卡」的玩法，没通关就无菜可收） */
    unlocked(): boolean {
        return _cleared() >= 1;
    }

    get stageId(): number {
        return this._data.stageId;
    }

    get isPatrolling(): boolean {
        return this._data.stageId >= 1 && isPatrolStage(this._data.stageId);
    }

    get totalClaims(): number {
        return this._data.total;
    }

    // ================= 挂机累积 =================

    /** 已累积秒数（封顶 8 小时；未驻扎为 0） */
    accruedSecs(): number {
        if (!this.isPatrolling) {
            return 0;
        }
        const elapsed = Math.max(0, PatrolSystem._now() - this._data.lastTs);
        return Math.min(PATROL_MAX_HOURS * 3600, elapsed);
    }

    /** 是否已顶到 8 小时上限（再等不再增长，UI 据此提示「请尽快收取」） */
    isCapped(): boolean {
        return this.accruedSecs() >= PATROL_MAX_HOURS * 3600;
    }

    /** 已累积时长文案（「3 小时 20 分」） */
    accruedText(): string {
        const s = this.accruedSecs();
        if (s <= 0) {
            return '0 分';
        }
        const h = Math.floor(s / 3600);
        const m = Math.floor(s % 3600 / 60);
        if (h <= 0) {
            return `${Math.max(1, m)} 分`;
        }
        return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`;
    }

    /** 待领取产出：金币按比例取整，材料用 carry 兜住零头 */
    pendingYield(): PatrolYield {
        const secs = this.accruedSecs();
        if (secs <= 0) {
            return { gold: 0, misc: [] };
        }
        const hours = secs / 3600;
        const stageId = this._data.stageId;
        const gold = Math.floor(patrolGoldPerHour(stageId) * hours);
        const per = patrolMiscPerHour(stageId);
        const n = Math.floor(per.n * hours + this._data.carry);
        return { gold, misc: n > 0 ? [{ id: per.id, n }] : [] };
    }

    /** 是否有可收取的产出（入口红点用）：至少攒够 1 分钟且产出不为零 */
    hasClaimable(): boolean {
        const p = this.pendingYield();
        return p.gold > 0 || p.misc.length > 0;
    }

    /**
     * 切换驻扎关卡。切换前先把当前累积结算掉（自动收取，不吞玩家收益），
     * 返回自动收取的产出供 UI 提示；未驻扎时直接开始计时。
     */
    setStage(stageId: number): PatrolYield | null {
        if (!isPatrolStage(stageId)) {
            return null;
        }
        const auto = this.isPatrolling ? this.claim() : null;
        this._data.stageId = Math.floor(stageId);
        this._data.lastTs = PatrolSystem._now();
        this._data.carry = 0;
        this._save();
        return auto;
    }

    /** 收取挂机产出：发奖并重置累积起点；无可收取返回 null */
    claim(): PatrolYield | null {
        const secs = this.accruedSecs();
        if (secs <= 0) {
            return null;
        }
        const per = patrolMiscPerHour(this._data.stageId);
        const hours = secs / 3600;
        const yieldOut = this.pendingYield();
        // carry 推进：本次用掉的整数部分之外的零头留到下一次，避免反复领取连续丢尾数
        const raw = per.n * hours + this._data.carry;
        this._data.carry = Math.max(0, raw - Math.floor(raw));
        this._data.lastTs = PatrolSystem._now();
        this._data.total++;
        this._save();
        if (yieldOut.gold > 0 || yieldOut.misc.length > 0) {
            PatrolSystem._grant(yieldOut);
        }
        eventCenter.emit(GameEvent.PATROL_CLAIM, yieldOut);
        return yieldOut;
    }

    // ================= 扫荡 =================

    /** 今日剩余扫荡次数（跨天惰性重置） */
    sweepLeft(): number {
        return Math.max(0, patrolSweepPerDay() - this._sweepUsedToday());
    }

    private _sweepUsedToday(): number {
        if (this._data.date !== PatrolSystem._today()) {
            return 0;
        }
        return Math.max(0, Math.floor(this._data.sweeps));
    }

    /** 扫荡闸门：返回原因供 UI 直接展示（不复用文案，逐条对齐真实阻塞点） */
    canSweep(stageId: number): { ok: boolean; reason?: string } {
        if (!this.unlocked()) {
            return { ok: false, reason: '通关第 1 关后解锁巡逻' };
        }
        if (!isPatrolStage(stageId)) {
            return { ok: false, reason: `第 ${Math.floor(stageId)} 关尚未通关，无法扫荡` };
        }
        if (this.sweepLeft() <= 0) {
            return { ok: false, reason: '今日扫荡次数已用完' };
        }
        if (GameManager.instance.stamina() < BattleConfig.RUN_STAMINA_COST) {
            return { ok: false, reason: `体力不足（需 ${BattleConfig.RUN_STAMINA_COST} 点）` };
        }
        return { ok: true };
    }

    /** 扫荡一次：扣体力、扣次数、发奖（校验失败不改任何状态） */
    sweep(stageId: number): PatrolSweepResult | null {
        if (!this.canSweep(stageId).ok) {
            return null;
        }
        const gm = GameManager.instance;
        if (!gm.spendRunStamina()) {
            return null;
        }
        const id = Math.floor(stageId);
        const reward = patrolSweepReward(id);
        const today = PatrolSystem._today();
        if (this._data.date !== today) {
            this._data.date = today;
            this._data.sweeps = 0;
        }
        this._data.sweeps++;
        PatrolSystem._grant(reward);
        this._save();
        const result: PatrolSweepResult = {
            stageId: id,
            stageName: stageInfo(id).name,
            gold: reward.gold,
            misc: reward.misc,
        };
        eventCenter.emit(GameEvent.PATROL_SWEEP, result);
        return result;
    }

    // ================= 发奖与持久化 =================

    /** 统一发奖：金币进资源池、材料进杂物袋，最后一次落盘 */
    private static _grant(y: PatrolYield): void {
        const gm = GameManager.instance;
        if (y.gold > 0) {
            gm.res.add('gold', y.gold);
            eventCenter.emit(GameEvent.GOLD_EARNED, y.gold);
        }
        for (const m of y.misc) {
            if (miscDef(m.id) && m.n > 0) {
                gm.misc[m.id] = (gm.misc[m.id] ?? 0) + m.n;
            }
        }
        gm.save();
    }

    private static _now(): number {
        return Math.floor(Date.now() / 1000);
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
            const raw = sys.localStorage.getItem(PatrolSystem.SAVE_KEY);
            if (!raw) {
                return;
            }
            const d = JSON.parse(raw);
            if (!d || typeof d !== 'object') {
                return;
            }
            const stageId = Math.floor(Number(d.stageId ?? 0));
            const lastTs = Math.floor(Number(d.lastTs ?? 0));
            const carry = Number(d.carry ?? 0);
            this._data = {
                // 存档里的关卡必须仍然合法（可能被回档/改档），否则退回未驻扎
                stageId: isPatrolStage(stageId) ? stageId : 0,
                lastTs: isFinite(lastTs) && lastTs > 0 ? lastTs : 0,
                carry: isFinite(carry) && carry >= 0 && carry < 1 ? carry : 0,
                total: Math.max(0, Math.floor(d.total ?? 0)),
                date: String(d.date ?? ''),
                sweeps: Math.max(0, Math.floor(d.sweeps ?? 0)),
            };
        } catch {
            // 坏档回默认
        }
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            sys.localStorage.setItem(PatrolSystem.SAVE_KEY, JSON.stringify(this._data));
        } catch {
            // 配额满/隐私模式：静默失败，不影响本局
        }
    }
}
