import { sys } from 'cc';
import { GameManager } from './GameManager';

/**
 * 七日签到系统（基地页入口）：
 * - 七日奖励循环：每天可领当日档位，领满 7 天后进入下一轮（day 重置为 1，奖励档位不变）。
 * - 断签不惩罚：漏领的天跳过（不补领），第二天领的是"今天对应的档位"（day 计数 = 已连续签到天数 +1）。
 *   简化规则：只有"今天还没领"这一个状态，领了就 day+1，跨天不重置连续天数（拾荒者友好）。
 * - 持久化在独立 localStorage 键（与广告/礼包/任务同口径）。
 */

export interface SigninReward {
    day: number;
    label: string;
    ic: string;
    /** 奖励内容 */
    reward: { diamond?: number; gold?: number; misc?: { id: string; n: number } };
}

/** 七日奖励表（day 7 大奖） */
export const SIGNIN_REWARDS: SigninReward[] = [
    { day: 1, label: '金币袋', ic: '🪙', reward: { gold: 500 } },
    { day: 2, label: '钻石小袋', ic: '💎', reward: { diamond: 20 } },
    { day: 3, label: '体力药水', ic: '⚡', reward: { misc: { id: 'item_stamina', n: 2 } } },
    { day: 4, label: '强化石包', ic: '🧱', reward: { misc: { id: 'mat_stone', n: 40 } } },
    { day: 5, label: '钻石中袋', ic: '💎', reward: { diamond: 40 } },
    { day: 6, label: '英雄核心', ic: '⚙️', reward: { misc: { id: 'mat_core', n: 3 } } },
    { day: 7, label: '七日豪礼', ic: '🎁', reward: { diamond: 100, gold: 2000, misc: { id: 'mat_alloy', n: 5 } } },
];

interface SigninSave {
    /** 自然日（YYYY-MM-DD），用于判断今天是否已领 */
    date: string;
    /** 当前天数指针（1~7；领满 7 天回到 1 开新循环） */
    day: number;
    /** 历史累计签到天数（展示用） */
    total: number;
}

export class SigninSystem {
    private static _inst: SigninSystem | null = null;
    static get instance(): SigninSystem {
        if (!this._inst) {
            this._inst = new SigninSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-signin';

    private _data: SigninSave = { date: '', day: 1, total: 0 };

    private constructor() {
        this._load();
    }

    /** 今天是否已签到 */
    isTodayClaimed(): boolean {
        return this._data.date === SigninSystem._today();
    }

    /** 今天可领的档位（day 1~7 循环） */
    todayReward(): SigninReward {
        return SIGNIN_REWARDS[(this._data.day - 1) % SIGNIN_REWARDS.length];
    }

    /** 当前循环进度（第几天） */
    get day(): number {
        return this._data.day;
    }

    /** 历史累计签到天数 */
    get totalDays(): number {
        return this._data.total;
    }

    /** 是否今天可领（红点用） */
    canClaimToday(): boolean {
        return !this.isTodayClaimed();
    }

    /** 领取今日签到奖励；返回 null 表示今天已领，否则返回领到的档位 */
    claim(): SigninReward | null {
        if (this.isTodayClaimed()) {
            return null;
        }
        const gm = GameManager.instance;
        const r = this.todayReward();
        if (r.reward.gold) {
            gm.addGold(r.reward.gold);
        }
        if (r.reward.diamond) {
            gm.res.add('diamond', r.reward.diamond);
        }
        if (r.reward.misc) {
            gm.misc[r.reward.misc.id] = (gm.misc[r.reward.misc.id] ?? 0) + r.reward.misc.n;
        }
        gm.save();
        this._data.date = SigninSystem._today();
        this._data.day = this._data.day % SIGNIN_REWARDS.length + 1;
        this._data.total++;
        this._save();
        return r;
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
            const raw = sys.localStorage.getItem(SigninSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    this._data = {
                        date: String(d.date ?? ''),
                        day: Math.min(7, Math.max(1, Math.floor(d.day ?? 1))),
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
        sys.localStorage.setItem(SigninSystem.SAVE_KEY, JSON.stringify(this._data));
    }
}
