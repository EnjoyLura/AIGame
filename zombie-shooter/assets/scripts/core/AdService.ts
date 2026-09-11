import { sys } from 'cc';
import { GameEvent } from '../config/GameConfig';
import { eventCenter } from './EventCenter';

/**
 * 广告服务（盈利入口，当前为模拟实现）：
 * - 激励视频广告位的统一入口：每日限次、看完发奖。
 * - 现在 claimReward 走"模拟广告层"（UI 监听 AD_START 弹 3 秒倒计时层，倒计时结束发奖）；
 *   接微信小游戏激励视频 SDK 时只替换 _playAd 的内部实现，调用方与限次逻辑不动。
 * - 限次按自然日重置，持久化在 localStorage，防刷新白嫖。
 */

/** 广告位 id */
export type AdSlot = 'stamina' | 'doubleSettle' | 'recruit';

interface SlotQuota {
    /** 自然日（本地时区 YYYY-MM-DD） */
    date: string;
    count: number;
}

export class AdService {
    private static _inst: AdService | null = null;
    static get instance(): AdService {
        if (!this._inst) {
            this._inst = new AdService();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-ads';
    /** 每广告位每日可看次数 */
    private static readonly DAILY_LIMIT: Record<AdSlot, number> = {
        stamina: 3,
        doubleSettle: 3,
        recruit: 1,
    };

    private _quotas: Partial<Record<AdSlot, SlotQuota>> = {};

    private constructor() {
        this._load();
    }

    /** 某广告位今日剩余次数 */
    remaining(slot: AdSlot): number {
        const q = this._quota(slot);
        return Math.max(0, (AdService.DAILY_LIMIT[slot] ?? 0) - q.count);
    }

    canShow(slot: AdSlot): boolean {
        return this.remaining(slot) > 0;
    }

    /** 发起一次激励广告：AD_START → （倒计时/SDK 回调）→ 计次 + 发奖 + AD_END */
    claimReward(slot: AdSlot, reward: () => void): void {
        if (!this.canShow(slot)) {
            return;
        }
        eventCenter.emit(GameEvent.AD_START, slot);
        this._playAd(() => {
            const q = this._quota(slot);
            q.count++;
            this._save();
            reward();
            eventCenter.emit(GameEvent.AD_END, slot);
        });
    }

    /** 广告播放本体（模拟：3 秒后视为看完；接 SDK 时替换此函数） */
    private _playAd(onComplete: () => void): void {
        if (typeof setTimeout === 'undefined') {
            onComplete();
            return;
        }
        setTimeout(onComplete, 3000);
    }

    private _quota(slot: AdSlot): SlotQuota {
        const today = AdService._today();
        let q = this._quotas[slot];
        if (!q || q.date !== today) {
            q = { date: today, count: 0 };
            this._quotas[slot] = q;
        }
        return q;
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
            const raw = sys.localStorage.getItem(AdService.SAVE_KEY);
            if (raw) {
                this._quotas = JSON.parse(raw) ?? {};
            }
        } catch {
            this._quotas = {};
        }
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        sys.localStorage.setItem(AdService.SAVE_KEY, JSON.stringify(this._quotas));
    }
}
