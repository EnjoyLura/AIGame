import { sys } from 'cc';
import { eventCenter } from './EventCenter';
import { GameEvent } from '../config/GameConfig';
import { GameManager } from './GameManager';
import { BattleManager } from '../battle/BattleManager';

/**
 * 邮件系统（战斗页菜单入口 + 主城顶栏入口）：
 * - 邮件类型：notice（纯通知）/ reward（带附件奖励，可领取）。
 * - 领取后标记已领（附件发到存档），已读/未读驱动红点。
 * - 初始邮件 + 保留上限（超出自动清除最旧的已读邮件）。
 * - 「活起来」三件套：事件驱动投放（章节贺电/无尽战报）+ 每日轮换与回归邮件
 *   （feedDaily，主城显示时调用）+ 有效期（过期未领附件作废，惰性清理）。
 * - 新邮件到达广播 MAIL_NEW：主城 toast 提醒 + 红点实时刷新。
 * - 持久化在独立 localStorage 键（与广告/礼包/任务/签到同口径）。
 */

export type MailKind = 'notice' | 'reward';

export interface MailReward {
    diamond?: number;
    gold?: number;
    misc?: { id: string; n: number };
}

export interface MailDef {
    id: string;
    kind: MailKind;
    /** 发件人（展示用） */
    from: string;
    title: string;
    /** 正文（\n 换行） */
    body: string;
    /** 附件奖励（kind=reward 时生效） */
    reward?: MailReward;
    /** 投递时间戳（秒）；deliver 时自动补，初始邮件无 → 不显示时间且永不过期 */
    ts?: number;
    /** 有效期天数；缺省 0=永久。过期邮件（含未领附件）直接作废 */
    expireDays?: number;
}

/** 初始邮件池（新档自动注入；后续运营邮件可往这里加或走运行时接口） */
export const MAIL_DEFS: MailDef[] = [
    {
        id: 'm_welcome',
        kind: 'notice',
        from: '方舟指挥部',
        title: '欢迎来到末日航线',
        body: '指挥官，欢迎加入第 7 区幸存者车队！\n\n护送载具穿过丧尸潮，在基地重建人类的最后防线。\n点击「出发」开始你的第一次护送任务。',
    },
    {
        id: 'm_guide_signin',
        kind: 'notice',
        from: '后勤官·玛姬',
        title: '每日福利提醒',
        body: '基地页的「📅 签到」每天都能领一档奖励，七天一轮，错过不补但绝不惩罚。\n\n「📋 任务」里的每日任务和成就也记得随手领奖，钻石攒着买商城礼包很划算。',
    },
    {
        id: 'm_gift_first',
        kind: 'reward',
        from: '后勤官·玛姬',
        title: '新人补给包',
        body: '这是车队给你准备的第一份补给，请注意查收。\n\n祝武运昌隆，指挥官。',
        reward: { diamond: 30, gold: 800 },
    },
    {
        id: 'm_gift_stone',
        kind: 'reward',
        from: '军械库·老周',
        title: '强化材料支援',
        body: '最近怪物的甲越来越厚了，库房匀出一批强化石和英雄核心支援前线。\n\n记得在「⚒️ 工坊」强化装备，技能升级也要用英雄核心。',
        reward: { misc: { id: 'mat_stone', n: 30 } },
    },
    {
        id: 'm_gift_core',
        kind: 'reward',
        from: '研究所·艾娃',
        title: '英雄核心实验件',
        body: '实验台多出来了三枚英雄核心，放着也是浪费，一并寄给你。\n\n技能升级全靠它，别省着。',
        reward: { misc: { id: 'mat_core', n: 3 } },
    },
];

/** 运行时邮件（含已读/已领状态） */
export interface MailState extends MailDef {
    /** 是否已读（打开过详情） */
    read: boolean;
    /** 附件是否已领取（notice 恒 true） */
    claimed: boolean;
    /** 投递时间戳（秒；0=旧档无时间） */
    ts: number;
    /** 过期时间戳（秒；0=永久） */
    expireAt: number;
}

/** 邮件时间展示：今天/昨天/N 天前/月.日（旧档无时间戳返回空） */
export function mailTimeText(ts: number, now: number = Math.floor(Date.now() / 1000)): string {
    if (!ts) {
        return '';
    }
    const d = new Date(ts * 1000);
    const n = new Date(now * 1000);
    if (d.toDateString() === n.toDateString()) {
        return '今天';
    }
    if (d.toDateString() === new Date(now * 1000 - 86400000).toDateString()) {
        return '昨天';
    }
    const days = Math.round((n.getTime() - d.getTime()) / 86400000);
    if (days < 30) {
        return `${days} 天前`;
    }
    return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** 附件是否即将过期（剩余 <24h）——列表黄色提醒 */
export function mailExpiringSoon(m: MailState, now: number = Math.floor(Date.now() / 1000)): boolean {
    return m.expireAt > 0 && m.expireAt - now < 86400;
}

interface MailSave {
    /** 邮件 id 顺序即列表顺序（新邮件插最前） */
    ids: string[];
    read: Record<string, boolean>;
    claimed: Record<string, boolean>;
    /** 投放器状态：上次会话时间戳（秒） */
    lastSeenTs?: number;
    /** 投放器状态：上次每日邮件日期（YYYY-MM-DD） */
    lastDailyDay?: string;
}

export class MailSystem {
    private static _inst: MailSystem | null = null;
    static get instance(): MailSystem {
        if (!this._inst) {
            this._inst = new MailSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-mail';
    /** 保留上限：超出时从最旧的已读邮件开始清除 */
    private static readonly MAX_MAILS = 30;

    private _ids: string[] = [];
    private _read: Record<string, boolean> = {};
    private _claimed: Record<string, boolean> = {};
    /** 投放器状态：上次会话时间戳（秒；0=首访） */
    private _lastSeenTs = 0;
    /** 投放器状态：上次每日邮件日期（YYYY-MM-DD） */
    private _lastDailyDay = '';

    private constructor() {
        this._load();
        this._ensureDefaults();
        this._wireFeeders();
    }

    // ================= 查询 =================

    /** 全部邮件（新→旧；先惰性清理过期邮件） */
    mails(): MailState[] {
        this._purgeExpired();
        const out: MailState[] = [];
        for (const id of this._ids) {
            const def = MAIL_DEFS.find(m => m.id === id);
            if (def) {
                out.push({
                    ...def,
                    read: !!this._read[id],
                    claimed: def.kind === 'notice' ? true : !!this._claimed[id],
                    ts: def.ts ?? 0,
                    expireAt: def.ts && def.expireDays ? def.ts + def.expireDays * 86400 : 0,
                });
            }
        }
        return out;
    }

    mail(id: string): MailState | null {
        return this.mails().find(m => m.id === id) ?? null;
    }

    /** 未读数（红点角标用） */
    unreadCount(): number {
        return this.mails().filter(m => !m.read).length;
    }

    /** 是否有未读邮件（红点用） */
    hasUnread(): boolean {
        return this.mails().some(m => !m.read);
    }

    /** 是否有可领取的附件（红点/按钮态用） */
    hasClaimable(): boolean {
        return this.mails().some(m => m.kind === 'reward' && !m.claimed);
    }

    // ================= 操作 =================

    /** 打开邮件：标记已读 */
    markRead(id: string): void {
        if (!this._read[id]) {
            this._read[id] = true;
            this._save();
        }
    }

    /** 领取附件；返回 false 表示不可领（非奖励邮件/已领） */
    claim(id: string): boolean {
        const def = MAIL_DEFS.find(m => m.id === id);
        if (!def || def.kind !== 'reward' || this._claimed[id]) {
            return false;
        }
        const gm = GameManager.instance;
        const r = def.reward ?? {};
        if (r.gold) {
            gm.addGold(r.gold);
        }
        if (r.diamond) {
            gm.res.add('diamond', r.diamond);
        }
        if (r.misc) {
            gm.misc[r.misc.id] = (gm.misc[r.misc.id] ?? 0) + r.misc.n;
        }
        gm.save();
        this._claimed[id] = true;
        this._save();
        return true;
    }

    /** 删除单封邮件（用户手动清理） */
    remove(id: string): void {
        const i = this._ids.indexOf(id);
        if (i >= 0) {
            this._ids.splice(i, 1);
            this._save();
        }
    }

    /** 一键领取全部可领附件；返回领取的封数 */
    claimAll(): number {
        let n = 0;
        for (const m of this.mails()) {
            if (m.kind === 'reward' && !m.claimed && this.claim(m.id)) {
                n++;
            }
        }
        return n;
    }

    /** 运行时注入新邮件（运营接口；重复 id 忽略），自动补投递时间、清理超限并广播到达 */
    deliver(def: MailDef): void {
        if (MAIL_DEFS.some(m => m.id === def.id) || this._ids.indexOf(def.id) >= 0) {
            return;
        }
        if (!def.ts) {
            def.ts = Math.floor(Date.now() / 1000);
        }
        MAIL_DEFS.push(def);
        this._ids.unshift(def.id);
        this._prune();
        this._save();
        // 到达广播：主城 toast 提醒 + 顶栏红点实时刷新
        eventCenter.emit(GameEvent.MAIL_NEW, def);
    }

    // ================= 运营投放（邮件活起来） =================

    /**
     * 战斗事件 → 系统邮件（QuestSystem 同款监听模式）：
     * - 章节首通（每 5 关 1 章）：指挥部嘉奖邮件；
     * - 无尽模式破纪录（≥10 波）：前线战报。
     */
    private _wireFeeders(): void {
        eventCenter.on(GameEvent.STAGE_CLEAR, (stageId: number) => {
            if (stageId > 0 && stageId % 5 === 0) {
                this.deliver({
                    id: `m_chapter_${stageId}`,
                    kind: 'reward',
                    from: '方舟指挥部',
                    title: `第 ${Math.ceil(stageId / 5)} 章护送嘉奖`,
                    body: `第 ${stageId} 关防线已被你的车队牢牢守住，指挥部特批一批钻石以资鼓励。\n\n下一章的丧尸潮会更猛，记得回基地强化载具再出发。`,
                    reward: { diamond: 15 + stageId },
                    expireDays: 14,
                });
            }
        }, this);
        eventCenter.on(GameEvent.GAME_OVER, () => {
            const gm = GameManager.instance;
            const wave = gm.wave;
            // 破纪录判定：本次波数等于历史纪录（死亡链已把 bestWave 抬到本次值）
            if (BattleManager.instance?.isEndless && wave >= 10 && wave >= gm.bestWave) {
                this.deliver({
                    id: `m_wave_${wave}`,
                    kind: 'notice',
                    from: '前线侦察队',
                    title: `纪录战报：坚持到第 ${wave} 波`,
                    body: `你在无尽尸潮中撑到了第 ${wave} 波——这是车队目前的最好成绩。\n\n基地的伙伴们以此为傲。换套技能编排，下一场也许还能走得更远。`,
                    expireDays: 14,
                });
            }
        }, this);
    }

    /**
     * 每日投放（主城每次显示时调用）：
     * - 距上次会话 ≥48h：回归补给邮件；
     * - 每天首访：轮换一封运营邮件（3 天有效期，过期作废）。
     */
    feedDaily(now: number = Math.floor(Date.now() / 1000)): void {
        const dayKey = new Date(now * 1000).toISOString().slice(0, 10);
        const gm = GameManager.instance;
        if (this._lastSeenTs > 0 && now - this._lastSeenTs >= 48 * 3600) {
            this.deliver({
                id: `m_back_${dayKey}`,
                kind: 'reward',
                from: '后勤官·玛姬',
                title: '指挥官，回来啦',
                body: '车队这几天一直留着你的位置，防线还在，伙伴们也都在。\n\n这是全员凑的一点补给，回来先领了，正好赶上今天的新一轮丧尸潮。',
                reward: { gold: 600 + 200 * Math.min(gm.stageCleared, 10), diamond: 20 },
                expireDays: 7,
            });
        }
        if (this._lastDailyDay !== dayKey) {
            const prog = Math.min(gm.stageCleared, 10);
            const pool: MailDef[] = [
                {
                    id: `m_daily_${dayKey}`,
                    kind: 'reward',
                    from: '方舟指挥部',
                    title: '每日补给：应急钻石',
                    body: '今天的一份小补给，请在 3 天内领取。\n\n祝护送顺利，指挥官。',
                    reward: { diamond: 10 },
                },
                {
                    id: `m_daily_${dayKey}`,
                    kind: 'reward',
                    from: '后勤官·玛姬',
                    title: '每日补给：行军口粮',
                    body: '厨房今天做了新口粮，全队都有一份。\n\n金币拿去强化装备，别省着。',
                    reward: { gold: 300 + 100 * prog },
                },
                {
                    id: `m_daily_${dayKey}`,
                    kind: 'reward',
                    from: '军械库·老周',
                    title: '每日补给：强化材料',
                    body: '库房今日盘点，匀出一点强化石支援前线。\n\n记得去工坊看看，装备强化不能停。',
                    reward: { misc: { id: 'mat_stone', n: 10 } },
                },
            ];
            this.deliver({ ...pool[Math.floor(now / 86400) % pool.length], expireDays: 3 });
        }
        this._lastSeenTs = now;
        this._lastDailyDay = dayKey;
        this._save();
    }

    // ================= 内部 =================

    /** 新档注入初始邮件 */
    private _ensureDefaults(): void {
        let dirty = false;
        for (const def of MAIL_DEFS) {
            if (this._ids.indexOf(def.id) < 0) {
                this._ids.push(def.id);
                dirty = true;
            }
        }
        if (dirty) {
            this._prune();
            this._save();
        }
    }

    /** 超限清理：从最旧（列表尾）开始删已读邮件，全未读则不删 */
    private _prune(): void {
        while (this._ids.length > MailSystem.MAX_MAILS) {
            let removed = false;
            for (let i = this._ids.length - 1; i >= 0; i--) {
                if (this._read[this._ids[i]]) {
                    const id = this._ids.splice(i, 1)[0];
                    delete this._read[id];
                    delete this._claimed[id];
                    removed = true;
                    break;
                }
            }
            if (!removed) {
                break;
            }
        }
    }

    /** 过期清理（惰性，查询入口触发）：过期邮件连同未领附件作废删除 */
    private _purgeExpired(): void {
        const now = Math.floor(Date.now() / 1000);
        let dirty = false;
        for (let i = this._ids.length - 1; i >= 0; i--) {
            const def = MAIL_DEFS.find(m => m.id === this._ids[i]);
            const expireAt = def?.ts && def?.expireDays ? def.ts + def.expireDays * 86400 : 0;
            if (expireAt > 0 && now >= expireAt) {
                const id = this._ids.splice(i, 1)[0];
                delete this._read[id];
                delete this._claimed[id];
                dirty = true;
            }
        }
        if (dirty) {
            this._save();
        }
    }

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(MailSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    this._ids = Array.isArray(d.ids) ? d.ids.filter((x: unknown) => typeof x === 'string') : [];
                    this._read = d.read ?? {};
                    this._claimed = d.claimed ?? {};
                    this._lastSeenTs = typeof d.lastSeenTs === 'number' && d.lastSeenTs > 0 ? d.lastSeenTs : 0;
                    this._lastDailyDay = typeof d.lastDailyDay === 'string' ? d.lastDailyDay : '';
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
        sys.localStorage.setItem(MailSystem.SAVE_KEY, JSON.stringify({
            ids: this._ids,
            read: this._read,
            claimed: this._claimed,
            lastSeenTs: this._lastSeenTs,
            lastDailyDay: this._lastDailyDay,
        }));
    }
}
