import { sys } from 'cc';
import { GameManager } from './GameManager';

/**
 * 邮件系统（战斗页菜单入口）：
 * - 邮件类型：notice（纯通知）/ reward（带附件奖励，可领取）。
 * - 领取后标记已领（附件发到存档），已读/未读驱动红点。
 * - 初始邮件 + 保留上限（超出自动清除最旧的已读邮件）。
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
}

interface MailSave {
    /** 邮件 id 顺序即列表顺序（新邮件插最前） */
    ids: string[];
    read: Record<string, boolean>;
    claimed: Record<string, boolean>;
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

    private constructor() {
        this._load();
        this._ensureDefaults();
    }

    // ================= 查询 =================

    /** 全部邮件（新→旧） */
    mails(): MailState[] {
        const out: MailState[] = [];
        for (const id of this._ids) {
            const def = MAIL_DEFS.find(m => m.id === id);
            if (def) {
                out.push({ ...def, read: !!this._read[id], claimed: def.kind === 'notice' ? true : !!this._claimed[id] });
            }
        }
        return out;
    }

    mail(id: string): MailState | null {
        return this.mails().find(m => m.id === id) ?? null;
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

    /** 运行时注入新邮件（运营接口；重复 id 忽略），自动清理超限 */
    deliver(def: MailDef): void {
        if (MAIL_DEFS.some(m => m.id === def.id) || this._ids.indexOf(def.id) >= 0) {
            return;
        }
        MAIL_DEFS.push(def);
        this._ids.unshift(def.id);
        this._prune();
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
        }));
    }
}
