import { sys } from 'cc';

/**
 * 公告系统（主城顶部公告条 + 公告列表弹窗）：
 * - 公告为随包静态数据（NOTICE_DEFS），id 递增即新公告；无后端时的运营通知通道。
 * - 已读口径：lastReadId 记录已读过的最大公告 id，存在 id > lastReadId 即有未读（驱动红点与自动弹出）。
 * - 持久化在独立 localStorage 键（与邮件/礼包/任务同口径），坏档回默认。
 */

export type NoticeKind = 'update' | 'activity' | 'notice';

export interface NoticeDef {
    /** 递增 id（新公告 id 必须更大） */
    id: number;
    kind: NoticeKind;
    title: string;
    /** 展示日期（YYYY-MM-DD，纯展示） */
    date: string;
    /** 正文（\n 换行） */
    body: string;
}

export const NOTICE_KIND_NAMES: Record<NoticeKind, string> = {
    update: '更新',
    activity: '活动',
    notice: '公告',
};

/** 公告池（新公告往顶部加；正文 \n 分段） */
export const NOTICE_DEFS: NoticeDef[] = [
    {
        id: 3,
        kind: 'update',
        title: '载具改装系统上线',
        date: '2026-09-12',
        body: '基地「🚛 载具工坊」新增「🔧 改装」入口，消耗改装图纸与金币强化四个部位：\n\n'
            + '🛡️ 装甲板：载具耐久上限 +4%/级\n🔺 撞角：怪物啃车时反伤 25+25/级\n'
            + '🧰 工具箱：每 5 秒回复耐久 0.4%/级\n🎯 弹药架：全队攻击 +3%/级\n\n'
            + '改装上限随工坊建筑等级提升；图纸来自关卡掉落与商店「图纸礼包」。',
    },
    {
        id: 2,
        kind: 'update',
        title: 'BOSS 降临 · 精英词缀来袭',
        date: '2026-09-10',
        body: '每个关卡末波将压轴登场 👑 BOSS：巨岩魔猿、风暴鹰王、獠牙猪皇、铁壁熊王……半血狂暴，注意保留爆发！\n\n'
            + '无尽模式每 10 波也会迎来 BOSS 轮换。\n\n'
            + '精英怪携带随机词缀：迅捷（加速）、坚甲（减伤 30%）、治疗（为同伴回血）、分裂（死后裂变）、狂暴（残血暴走）——遇到先集火！',
    },
    {
        id: 1,
        kind: 'notice',
        title: '《末日航线》正式启航',
        date: '2026-09-05',
        body: '指挥官，欢迎登上第 7 区的护送车队！\n\n'
            + '疫情期间请牢记：编队四位英雄可激活「🤝 羁绊」，升星凑齐星级门槛全队受益；\n'
            + '局内三选一强化卡决定这局的流派，穿透、分裂、爆炸各有玩法。\n\n'
            + '祝武运昌隆，让希望抵达下一站。',
    },
];

interface NoticeSave {
    /** 已读过的最大公告 id（0=尚未读过任何公告） */
    lastReadId: number;
}

export class NoticeSystem {
    private static _inst: NoticeSystem | null = null;
    static get instance(): NoticeSystem {
        if (!this._inst) {
            this._inst = new NoticeSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-notice';

    private _lastReadId = 0;

    private constructor() {
        this._load();
    }

    // ================= 查询 =================

    /** 最新一条公告（公告条跑马灯文案来源） */
    latest(): NoticeDef {
        return NOTICE_DEFS.reduce((a, b) => (b.id > a.id ? b : a), NOTICE_DEFS[0]);
    }

    /** 是否有未读公告（红点 + 进主城自动弹出） */
    hasUnread(): boolean {
        return this._lastReadId < this.latest().id;
    }

    /** 未读公告（新→旧）；走马灯只滚未读，已读公告不再占屏 */
    unreadList(): NoticeDef[] {
        return NOTICE_DEFS.filter(n => n.id > this._lastReadId).sort((a, b) => b.id - a.id);
    }

    // ================= 操作 =================

    /** 全部标记已读（打开公告弹窗时调用） */
    markAllRead(): void {
        const top = this.latest().id;
        if (top > this._lastReadId) {
            this._lastReadId = top;
            this._save();
        }
    }

    // ================= 内部 =================

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(NoticeSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object' && typeof d.lastReadId === 'number' && isFinite(d.lastReadId)) {
                    // 钳制到已知公告范围内，坏值回 0
                    this._lastReadId = Math.min(Math.max(0, Math.floor(d.lastReadId)), this.latest().id);
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
        sys.localStorage.setItem(NoticeSystem.SAVE_KEY, JSON.stringify({
            lastReadId: this._lastReadId,
        }));
    }
}
