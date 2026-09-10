import { ResourceId } from './PlayerResources';
import { GameManager } from './GameManager';
import { sys } from 'cc';
import {
    EquipTier, EQUIPMENT_DEFS, LootDrop, miscDef,
} from './HeroSystem';

/**
 * 礼包系统（商城 banner 入口）：
 * - 礼包 = 定价钻石/免费的一次性内容包，每日限购次数，自然日重置。
 * - 发放复用 LootDrop 结构（equip 入装备背包、misc 入杂物库存、res 直加资源），
 *   购买结果可直接用结算掉落样式展示。
 * - 每日免费补给产出钻石，补上"钻石无获取途径"的经济闭环（钻石 → 付费礼包）。
 */

/** 礼包内容条目（展示与发放同源，避免两处维护） */
export interface GiftEntry {
    kind: 'res' | 'misc' | 'equip';
    /** res：发哪种资源 */
    res?: ResourceId;
    /** res/misc：数量 */
    amount?: number;
    /** misc：MISC_ITEM_DEFS id */
    miscId?: string;
    /** equip：品质（1-6） */
    equipTier?: EquipTier;
    /** equip：橙装基础上 30% 升红（豪华箱用） */
    luckyRed?: boolean;
    /** 展示文案（如"金币 ×300"） */
    label: string;
}

export interface GiftPackDef {
    id: string;
    name: string;
    desc: string;
    ic: string;
    /** 售价（amount 0 = 免费领取） */
    price: { res: ResourceId; amount: number };
    /** 划线原价（纯展示，0 不显示） */
    originalPrice?: number;
    /** 每日限购次数 */
    dailyLimit: number;
    /** 商品卡品质边框（1-6） */
    tier: EquipTier;
    entries: GiftEntry[];
}

export const GIFT_PACKS: GiftPackDef[] = [
    {
        id: 'gift_free',
        name: '每日免费补给',
        desc: '每日登录福利 · 含钻石',
        ic: '🎈',
        price: { res: 'diamond', amount: 0 },
        dailyLimit: 1,
        tier: 3,
        entries: [
            { kind: 'res', res: 'gold', amount: 300, label: '金币 ×300' },
            { kind: 'res', res: 'diamond', amount: 20, label: '钻石 ×20' },
            { kind: 'misc', miscId: 'item_stamina', amount: 1, label: '体力药水 ×1' },
        ],
    },
    {
        id: 'gift_starter',
        name: '末日启程超值礼包',
        desc: '随机紫装 + 大量强化材料',
        ic: '🎁',
        price: { res: 'diamond', amount: 280 },
        originalPrice: 680,
        dailyLimit: 1,
        tier: 4,
        entries: [
            { kind: 'equip', equipTier: 4, label: '随机史诗装备 ×1' },
            { kind: 'res', res: 'gold', amount: 1500, label: '金币 ×1500' },
            { kind: 'misc', miscId: 'mat_stone', amount: 80, label: '强化石 ×80' },
            { kind: 'misc', miscId: 'item_stamina', amount: 2, label: '体力药水 ×2' },
        ],
    },
    {
        id: 'gift_arsenal',
        name: '豪华军备箱',
        desc: '随机传说装备 · 30% 升级红装',
        ic: '🧰',
        price: { res: 'diamond', amount: 480 },
        originalPrice: 980,
        dailyLimit: 2,
        tier: 5,
        entries: [
            { kind: 'equip', equipTier: 5, luckyRed: true, label: '随机传说装备 ×1 (30%升神话)' },
            { kind: 'misc', miscId: 'mat_alloy', amount: 5, label: '精炼合金 ×5' },
            { kind: 'res', res: 'gold', amount: 2000, label: '金币 ×2000' },
        ],
    },
    {
        id: 'gift_core',
        name: '核心材料箱',
        desc: '英雄核心 + 稀有改造材料',
        ic: '📦',
        price: { res: 'diamond', amount: 150 },
        dailyLimit: 3,
        tier: 4,
        entries: [
            { kind: 'misc', miscId: 'mat_core', amount: 3, label: '英雄核心 ×3' },
            { kind: 'misc', miscId: 'mat_blueprint', amount: 2, label: '改装图纸 ×2' },
            { kind: 'misc', miscId: 'gem_thunder', amount: 1, label: '雷光石 ×1' },
        ],
    },
];

export function giftPackDef(id: string): GiftPackDef | undefined {
    return GIFT_PACKS.find(g => g.id === id);
}

/** 装备随机掷点：指定品质池内随机一件（豪华箱 luckyRed 30% 升红） */
function rollGiftEquip(entry: GiftEntry): LootDrop | null {
    let tier = entry.equipTier ?? 3;
    if (entry.luckyRed && Math.random() < 0.3) {
        tier = 6;
    }
    const pool = EQUIPMENT_DEFS.filter(d => d.tier === tier);
    if (pool.length === 0) {
        return null;
    }
    const def = pool[Math.floor(Math.random() * pool.length)];
    return { kind: 'equip', slot: def.slot, tier: def.tier, name: def.name, ic: '🎁' };
}

export interface GiftBuyResult {
    ok: boolean;
    /** 失败原因（弹 toast 用） */
    reason?: string;
    /** 购买成功获得的物品（展示用） */
    drops: LootDrop[];
}

interface GiftQuota {
    /** 自然日（本地时区 YYYY-MM-DD） */
    date: string;
    /** 礼包 id → 今日已购次数 */
    counts: Record<string, number>;
}

/** 礼包购买服务：每日限购持久化在 localStorage（独立存档键，防刷新白嫖） */
export class GiftService {
    private static readonly SAVE_KEY = 'zombie-shooter-gifts';
    private _quota: GiftQuota = { date: '', counts: {} };

    constructor() {
        this._load();
    }

    /** 某礼包今日剩余可购次数 */
    remaining(def: GiftPackDef): number {
        this._rollDay();
        return Math.max(0, def.dailyLimit - (this._quota.counts[def.id] ?? 0));
    }

    hasBoughtToday(def: GiftPackDef): boolean {
        return this.remaining(def) < def.dailyLimit;
    }

    /** 购买/领取礼包：校验限购与余额 → 扣费 → 发放 → 存档；内容物以 LootDrop 返回 */
    buy(def: GiftPackDef): GiftBuyResult {
        this._rollDay();
        const gm = GameManager.instance;
        const bought = this._quota.counts[def.id] ?? 0;
        if (bought >= def.dailyLimit) {
            return { ok: false, reason: '今日次数已用完，明天再来', drops: [] };
        }
        if (def.price.amount > 0 && !gm.res.canSpend(def.price.res, def.price.amount)) {
            return { ok: false, reason: '钻石不足，可用每日免费补给攒钻石', drops: [] };
        }
        // 发放（先掷点后扣费，全部成功才入账）
        const drops: LootDrop[] = [];
        for (const entry of def.entries) {
            if (entry.kind === 'res' && entry.res) {
                gm.res.add(entry.res, entry.amount ?? 0);
            } else if (entry.kind === 'misc' && entry.miscId && miscDef(entry.miscId)) {
                const n = entry.amount ?? 1;
                gm.misc[entry.miscId] = (gm.misc[entry.miscId] ?? 0) + n;
                const d = miscDef(entry.miscId)!;
                drops.push({ kind: 'misc', tier: d.tier, id: d.id, name: d.name, ic: d.ic });
            } else if (entry.kind === 'equip') {
                const drop = rollGiftEquip(entry);
                if (drop) {
                    const lv = 1 + Math.floor(Math.random() * 3);
                    gm.bag.push({ slot: drop.slot!, tier: drop.tier as EquipTier, lv });
                    drops.push(drop);
                }
            }
        }
        if (def.price.amount > 0) {
            gm.res.spend(def.price.res, def.price.amount);
        }
        this._quota.counts[def.id] = bought + 1;
        this._save();
        gm.save();
        return { ok: true, drops };
    }

    /** 跨自然日重置计数 */
    private _rollDay(): void {
        const today = GiftService._today();
        if (this._quota.date !== today) {
            this._quota = { date: today, counts: {} };
            this._save();
        }
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
            const raw = sys.localStorage.getItem(GiftService.SAVE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data && typeof data === 'object') {
                    this._quota = { date: String(data.date ?? ''), counts: data.counts ?? {} };
                }
            }
        } catch {
            this._quota = { date: '', counts: {} };
        }
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        sys.localStorage.setItem(GiftService.SAVE_KEY, JSON.stringify(this._quota));
    }
}
