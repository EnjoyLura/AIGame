import { ResourceId } from './PlayerResources';

/**
 * 商城商品表（骨架）：
 * - 纯数据定义，购买逻辑（扣费/发奖）在 HomeUi 商城页统一执行，走 PlayerResources 唯一入口。
 * - 新增商品只需在 ShopData.ITEMS 追加一项；后续英雄碎片/礼包等先扩 ResourceId 再上表。
 */

export interface ShopItem {
    id: string;
    name: string;
    desc: string;
    /** 价格货币与数量 */
    price: { res: ResourceId; amount: number };
    /** 发放数量与资源（购买成功后 add 到仓库） */
    grant: { res: ResourceId; amount: number };
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
}
