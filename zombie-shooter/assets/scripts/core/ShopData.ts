import { sys } from 'cc';
import { ResourceId } from './PlayerResources';

/**
 * 商城商品表（骨架）：
 * - 纯数据定义，购买逻辑（扣费/发奖）在 HomeUi 商城页统一执行，走 PlayerResources 唯一入口。
 * - 新增商品只需在 ShopData.ITEMS / MATERIALS 追加一项。
 * - MATERIALS（材料货柜）带每日限量，走 ShopQuota（下方）惰性重置。
 */

export interface ShopItem {
    id: string;
    name: string;
    desc: string;
    /** 价格货币与数量 */
    price: { res: ResourceId; amount: number };
    /** 发放数量与资源（购买成功后 add 到仓库；材料货柜发 0 占位） */
    grant: { res: ResourceId; amount: number };
    /** 发放材料清单（材料货柜用；入 gm.misc，id 必须在 MISC_ITEM_DEFS 内否则读档被吞） */
    grantMisc?: Array<{ id: string; n: number }>;
    /** 每日限量（材料货柜用；0/缺省 = 不限量） */
    dailyLimit?: number;
    /** 随机发放：grantMisc 里多条时随机取一条（随机宝石卡用） */
    pickRandom?: boolean;
    /** 购买条件的额外校验；文案进 disabledTip */
    canBuy?: () => boolean;
    disabledTip?: string;
}

export class ShopData {
    /** 在售商品（新增商品追加即可） */
    static readonly ITEMS: ShopItem[] = [
        {
            id: 'stamina30',
            name: '补给燃油',
            desc: '体力 +30（出战一次耗 5 点）',
            price: { res: 'gold', amount: 200 },
            grant: { res: 'stamina', amount: 30 },
        },
        {
            id: 'goldPack100',
            name: '金币袋',
            desc: '金币 +100（钻石暂无获取途径）',
            price: { res: 'diamond', amount: 10 },
            grant: { res: 'gold', amount: 100 },
        },
    ];

    /**
     * 材料货柜（材料页签顶部）：副本/远征产出的材料多一条主动获取渠道。
     * 随机宝石卡按 pickRandom 在 grantMisc 里随机取一条发放。
     */
    static readonly MATERIALS: ShopItem[] = [
        {
            id: 'mat_stone20', name: '强化石礼包', desc: '🧱 强化石 ×20（武器强化）',
            price: { res: 'gold', amount: 600 }, grant: { res: 'gold', amount: 0 },
            grantMisc: [{ id: 'mat_stone', n: 20 }], dailyLimit: 3,
        },
        {
            id: 'mat_alloy5', name: '合金礼包', desc: '🔩 精炼合金 ×5（装备强化/重铸）',
            price: { res: 'diamond', amount: 15 }, grant: { res: 'gold', amount: 0 },
            grantMisc: [{ id: 'mat_alloy', n: 5 }], dailyLimit: 3,
        },
        {
            id: 'mat_bp3', name: '图纸礼包', desc: '🔧 改装图纸 ×3（载具改装）',
            price: { res: 'diamond', amount: 30 }, grant: { res: 'gold', amount: 0 },
            grantMisc: [{ id: 'mat_blueprint', n: 3 }], dailyLimit: 1,
        },
        {
            id: 'mat_core1', name: '英雄核心', desc: '⚙️ 英雄核心 ×1（技能升级）',
            price: { res: 'diamond', amount: 25 }, grant: { res: 'gold', amount: 0 },
            grantMisc: [{ id: 'mat_core', n: 1 }], dailyLimit: 2,
        },
        {
            id: 'gem_rand1', name: '随机宝石', desc: '💠 四系宝石随机 ×1（镶嵌装备）',
            price: { res: 'diamond', amount: 20 }, grant: { res: 'gold', amount: 0 },
            grantMisc: [
                { id: 'gem_fire', n: 1 }, { id: 'gem_wind', n: 1 },
                { id: 'gem_ice', n: 1 }, { id: 'gem_thunder', n: 1 },
            ],
            pickRandom: true, dailyLimit: 5,
        },
    ];
}

/**
 * 材料货柜每日限量（照 GiftService._quota 同款模式）：
 * {date, counts} 惰性重置，独立 localStorage 键；不放 AdService（那是广告位）。
 */
export class ShopQuota {
    private static readonly SAVE_KEY = 'zombie-shooter-shop';
    private static _quota: { date: string; counts: Record<string, number> } = { date: '', counts: {} };
    private static _loaded = false;

    /** 某商品今日剩余可购次数（不限量商品返回大数，UI 直接按"不限量"处理） */
    static remaining(item: ShopItem): number {
        if (!item.dailyLimit) {
            return Number.MAX_SAFE_INTEGER;
        }
        ShopQuota._rollDay();
        const used = ShopQuota._quota.counts[item.id] ?? 0;
        return Math.max(0, item.dailyLimit - used);
    }

    /** 购买成功后计一次 */
    static consume(item: ShopItem): void {
        if (!item.dailyLimit) {
            return;
        }
        ShopQuota._rollDay();
        ShopQuota._quota.counts[item.id] = (ShopQuota._quota.counts[item.id] ?? 0) + 1;
        ShopQuota._save();
    }

    private static _rollDay(): void {
        ShopQuota._ensureLoad();
        const today = ShopQuota._today();
        if (ShopQuota._quota.date !== today) {
            ShopQuota._quota = { date: today, counts: {} };
            ShopQuota._save();
        }
    }

    /** 静态类没有构造时机：首次访问时读档一次 */
    private static _ensureLoad(): void {
        if (ShopQuota._loaded) {
            return;
        }
        ShopQuota._loaded = true;
        ShopQuota._load();
    }

    private static _today(): string {
        const d = new Date();
        const p = (n: number) => (n < 10 ? '0' : '') + n;
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    private static _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(ShopQuota.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object' && typeof d.date === 'string') {
                    ShopQuota._quota = {
                        date: d.date,
                        counts: d.counts && typeof d.counts === 'object' ? d.counts : {},
                    };
                }
            }
        } catch {
            ShopQuota._quota = { date: '', counts: {} };
        }
    }

    private static _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            sys.localStorage.setItem(ShopQuota.SAVE_KEY, JSON.stringify(ShopQuota._quota));
        } catch {
            // 存储不可用静默跳过：限量只是防刷手段，不因存储失败卡购买
        }
    }
}
