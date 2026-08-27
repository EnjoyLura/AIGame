import { Hero } from './Hero';

/** 卡片强化类型：基础版强化普攻三维，M2 扩展技能/大招卡 */
export type BuffType = 'atk' | 'rate' | 'range';

/** 三选一卡片选项：每张卡绑定一名上阵英雄（强化单个英雄） */
export interface CardOption {
    hero: Hero;
    type: BuffType;
    /** 卡面文案，如「狙击手·苍鹭 射频强化」 */
    title: string;
    desc: string;
}

const CARD_META: Record<BuffType, { label: string; desc: string }> = {
    atk: { label: '攻击强化', desc: '攻击力 +25%' },
    rate: { label: '射频强化', desc: '攻速 +15%' },
    range: { label: '瞄准强化', desc: '射程 +20%' },
};

/** 组装一张绑定英雄的卡片选项 */
export function makeCardOption(hero: Hero, type: BuffType): CardOption {
    const meta = CARD_META[type];
    return {
        hero,
        type,
        title: `${hero.def.name}\n${meta.label}`,
        desc: hero.def.weapon === 'laser' && type === 'rate' ? '每秒伤害 +15%' : meta.desc,
    };
}
