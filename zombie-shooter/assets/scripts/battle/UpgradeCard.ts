import { HERO_DEFS } from './HeroDef';
import { HeroUpgradeId } from './Hero';

export interface CardOption {
    heroId: string;
    upgradeId: HeroUpgradeId;
    title: string;
    desc: string;
}

const CARD_META: Record<'atk' | 'rate' | 'range', { label: string; desc: string }> = {
    atk: { label: '攻击强化', desc: '攻击力 +25%' },
    rate: { label: '射频强化', desc: '攻速 +15%' },
    range: { label: '瞄准强化', desc: '射程 +20%' },
};

export function makeCardOption(heroId: string, upgradeId: HeroUpgradeId, level = 0): CardOption {
    const def = HERO_DEFS.find(item => item.id === heroId)!;
    if (upgradeId === 'skill' || upgradeId === 'ultimate') {
        const ability = upgradeId === 'skill' ? def.skill : def.ultimate;
        const kind = upgradeId === 'skill' ? '技能' : '大招';
        if (level === 0) {
            // 卡面标题保持 ≤7 字（190px 卡宽），能力说明放描述行
            return { heroId, upgradeId, title: `${def.name}\n解锁·${ability.name}`, desc: ability.desc };
        }
        return {
            heroId, upgradeId,
            title: `${def.name}\n${ability.name}·升级`,
            desc: `${kind}伤害 +30%`,
        };
    }
    const meta = CARD_META[upgradeId];
    return {
        heroId,
        upgradeId,
        title: `${def.name}\n${meta.label}`,
        desc: def.weapon === 'laser' && upgradeId === 'rate' ? '每秒伤害 +15%' : meta.desc,
    };
}
