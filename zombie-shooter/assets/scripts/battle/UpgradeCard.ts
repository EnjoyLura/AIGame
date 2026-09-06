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

/** 普攻增益卡：连射/齐射/穿透/爆炸/分裂（可叠加项各有上限），文案按武器类型与当前层数生成 */
function makeBasicEnhanceCard(heroId: string, upgradeId: HeroUpgradeId, level: number): CardOption {
    const def = HERO_DEFS.find(item => item.id === heroId)!;
    const laser = def.weapon === 'laser';
    if (upgradeId === 'multishot') {
        const title = `${def.name}\n普攻·连射`;
        const desc = laser
            ? (level === 0
                ? '激光同时锁定 2 个目标，单束伤害 -20%'
                : `锁定目标 +1（共 ${level + 2} 束），单束伤害再 -20%`)
            : (level === 0
                ? '每条弹道额外发射 2 颗同向子弹，伤害 -20%'
                : `每条弹道同向子弹再 +2（每道 ${1 + (level + 1) * 2} 发），伤害再 -20%`);
        return { heroId, upgradeId, title, desc };
    }
    if (upgradeId === 'volley') {
        const title = `${def.name}\n普攻·齐射`;
        const desc = level === 0
            ? '增加 1 条小角度偏移弹道，弹数与主弹道相同，伤害 -20%'
            : `偏移弹道 +1（共 ${level + 2} 条），伤害再 -20%`;
        return { heroId, upgradeId, title, desc };
    }
    if (upgradeId === 'pierce') {
        const title = `${def.name}\n普攻·穿透+1`;
        const desc = level === 0
            ? '子弹命中后可继续飞行，多穿过 1 个敌人'
            : `穿透次数 +1（当前可多穿 ${level + 1} 个）`;
        return { heroId, upgradeId, title, desc };
    }
    if (upgradeId === 'boom') {
        const title = `${def.name}\n普攻·范围爆炸`;
        const desc = level === 0
            ? '子弹命中后小范围爆炸，波及周围敌人（40% 伤害）'
            : '爆炸伤害与范围提升（70% 伤害）';
        return { heroId, upgradeId, title, desc };
    }
    if (upgradeId === 'splitMore') {
        return {
            heroId, upgradeId,
            title: `${def.name}\n普攻·裂变+1`,
            desc: level === 0
                ? '裂变子弹 +1（共 3 颗），次级弹伤害 -20%'
                : `裂变子弹 +1（共 ${3 + level} 颗），次级弹伤害再 -20%`,
        };
    }
    if (upgradeId === 'splitDmg') {
        return {
            heroId, upgradeId,
            title: `${def.name}\n普攻·裂变强化`,
            desc: level === 0 ? '裂变子弹伤害 +50%' : '裂变子弹伤害再 +50%',
        };
    }
    if (upgradeId === 'boomRange') {
        return {
            heroId, upgradeId,
            title: `${def.name}\n普攻·爆炸范围`,
            desc: level === 0
                ? '爆炸范围 +50%，爆炸伤害 -20%'
                : '爆炸范围再 +50%，伤害再 -20%',
        };
    }
    if (upgradeId === 'secBoom') {
        return {
            heroId, upgradeId,
            title: `${def.name}\n普攻·次级爆炸`,
            desc: level === 0
                ? '次级子弹命中后小范围爆炸，波及周围敌人（30% 伤害）'
                : '次级爆炸伤害与范围提升（45% 伤害）',
        };
    }
    if (upgradeId === 'boomDmg') {
        return {
            heroId, upgradeId,
            title: `${def.name}\n普攻·爆炸强化`,
            desc: level === 0 ? '爆炸伤害 +50%' : '爆炸伤害再 +50%',
        };
    }
    // split
    return {
        heroId, upgradeId,
        title: `${def.name}\n普攻·子弹分裂`,
        desc: '子弹命中后分裂 2 颗次级弹，自动瞄准附近敌人（40% 伤害）',
    };
}

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
    // 普攻增益卡（连射/齐射/穿透/爆炸/分裂 + 四张进阶卡）统一走进阶卡面生成
    if (upgradeId !== 'atk' && upgradeId !== 'rate' && upgradeId !== 'range') {
        return makeBasicEnhanceCard(heroId, upgradeId, level);
    }
    const meta = CARD_META[upgradeId];
    return {
        heroId,
        upgradeId,
        title: `${def.name}\n${meta.label}`,
        desc: def.weapon === 'laser' && upgradeId === 'rate' ? '每秒伤害 +15%' : meta.desc,
    };
}
