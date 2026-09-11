import { Color } from 'cc';
import { BattleConfig } from '../config/GameConfig';

/**
 * 精英词缀系统（战斗侧，纯数据 + 行为开关）：
 * - 普通怪掷中精英时随机附带一条词缀，精英从"数值更大"升级为"打法不同"。
 * - 词缀只改行为不改身份：怪物 id/图鉴归属不变，头顶徽标提示词缀类型。
 * - 与装备词缀（core/EquipmentAffix）无关，只是共用"词缀"这个词。
 */

export type MonsterAffixId = 'swift' | 'armor' | 'heal' | 'split' | 'frenzy';

export interface MonsterAffixDef {
    id: MonsterAffixId;
    name: string;
    /** 头顶徽标 emoji */
    ic: string;
    /** 徽标圈色（与脚下精英红圈区分） */
    color: Color;
    /** 效果说明（GM 面板/调试提示用） */
    desc: string;
}

export const MONSTER_AFFIXES: MonsterAffixDef[] = [
    {
        id: 'swift', name: '迅捷', ic: '⚡', color: new Color(77, 208, 225, 255),
        desc: `移速 +${Math.round((BattleConfig.AFFIX_SWIFT_SPEED - 1) * 100)}%`,
    },
    {
        id: 'armor', name: '坚甲', ic: '🛡️', color: new Color(144, 164, 174, 255),
        desc: `受到伤害 −${Math.round((1 - BattleConfig.AFFIX_ARMOR_CUT) * 100)}%`,
    },
    {
        id: 'heal', name: '治疗', ic: '💚', color: new Color(102, 187, 106, 255),
        desc: `每 ${BattleConfig.AFFIX_HEAL_INTERVAL} 秒为周围同伴回复生命`,
    },
    {
        id: 'split', name: '分裂', ic: '💥', color: new Color(149, 117, 205, 255),
        desc: '死亡时分裂出两只小怪',
    },
    {
        id: 'frenzy', name: '狂暴', ic: '😡', color: new Color(239, 83, 80, 255),
        desc: `生命低于 50% 时移速 +${Math.round((BattleConfig.BOSS_ENRAGE_SPEED - 1) * 100)}%`,
    },
];

export function monsterAffix(id: string): MonsterAffixDef | undefined {
    return MONSTER_AFFIXES.find(a => a.id === id);
}

/** 精英入场掷词缀：等权随机取一条 */
export function rollEliteAffix(): MonsterAffixId {
    return MONSTER_AFFIXES[Math.floor(Math.random() * MONSTER_AFFIXES.length)].id;
}
