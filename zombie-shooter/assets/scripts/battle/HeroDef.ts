import { Color } from 'cc';

export type WeaponType = 'rifle' | 'sniper' | 'laser' | 'radiation';
export type AbilityKind = 'projectile' | 'beam' | 'multi' | 'area';

export interface AbilityDef {
    id: string;
    name: string;
    desc: string;
    kind: AbilityKind;
    cooldown: number;
    damageScale: number;
    range: number;
    projectileCount?: number;
    projectileSpeed?: number;
    projectileRadius?: number;
    pierce?: boolean;
    duration?: number;
    tick?: number;
    maxTargets?: number;
    areaRadius?: number;
}

export interface HeroDef {
    id: string;
    name: string;
    role: string;
    weapon: WeaponType;
    atk: number;
    interval: number;
    range: number;
    bulletSpeed: number;
    pierce?: boolean;
    color: Color;
    bulletColor: Color;
    skill: AbilityDef;
    ultimate: AbilityDef;
}

/** 技能/大招等级上限：升级卡解锁=1 级，重复抽到再升级 */
export const ABILITY_MAX_LEVEL = 3;
/** 每级伤害增幅（实际倍率 = damageScale × (1 + 每级增幅 × (level-1))） */
export const ABILITY_LEVEL_DMG_BONUS = 0.3;
/** 大招充能所需击杀数：击杀来源=英雄自身（普攻/技能/大招击杀都算） */
export const ULTIMATE_CHARGE_MAX = 10;

export const HERO_DEFS: HeroDef[] = [
    {
        id: 'rifle', name: '步枪手·凯', role: '持续输出', weapon: 'rifle',
        atk: 80, interval: 0.7, range: 1275, bulletSpeed: 2250,
        color: new Color(79, 195, 247, 255), bulletColor: new Color(255, 238, 88, 255),
        skill: { id: 'rifle-burst', name: '压制连射', desc: '自动发射 5 枚强化弹', kind: 'projectile', cooldown: 6, damageScale: 0.75, range: 1350, projectileCount: 5, projectileSpeed: 2550 },
        ultimate: { id: 'rifle-barrage', name: '火力覆盖', desc: '对最多 8 个目标造成伤害', kind: 'multi', cooldown: 16, damageScale: 2.2, range: 1650, maxTargets: 8 },
    },
    {
        id: 'sniper', name: '狙击手·苍鹭', role: '单体爆发', weapon: 'sniper',
        atk: 260, interval: 1.8, range: 1575, bulletSpeed: 3900,
        color: new Color(129, 199, 132, 255), bulletColor: new Color(255, 171, 64, 255),
        skill: { id: 'sniper-rail', name: '磁轨狙击', desc: '自动发射高伤穿透弹', kind: 'projectile', cooldown: 7, damageScale: 2.8, range: 1800, projectileSpeed: 4800, projectileRadius: 20, pierce: true },
        ultimate: { id: 'sniper-execute', name: '死亡标记', desc: '重创最多 4 个目标', kind: 'multi', cooldown: 18, damageScale: 4, range: 1950, maxTargets: 4 },
    },
    {
        id: 'laser', name: '激光手·棱镜', role: '跟踪持续', weapon: 'laser',
        atk: 130, interval: 0, range: 1050, bulletSpeed: 0,
        color: new Color(77, 208, 225, 255), bulletColor: new Color(77, 208, 225, 255),
        skill: { id: 'laser-focus', name: '聚焦光束', desc: '持续 3 秒的强化激光', kind: 'beam', cooldown: 8, damageScale: 1.8, range: 1275, duration: 3, tick: 0.25 },
        ultimate: { id: 'laser-nova', name: '棱镜新星', desc: '轰击目标周围大范围敌人', kind: 'area', cooldown: 17, damageScale: 3.2, range: 1350, areaRadius: 390 },
    },
    {
        id: 'radiation', name: '辐射枪手·芮', role: '群体伤害', weapon: 'radiation',
        atk: 60, interval: 1.1, range: 1200, bulletSpeed: 3000, pierce: true,
        color: new Color(184, 220, 129, 255), bulletColor: new Color(178, 255, 89, 255),
        skill: { id: 'radiation-volley', name: '裂变齐射', desc: '自动发射 3 枚穿透弹', kind: 'projectile', cooldown: 6.5, damageScale: 1.15, range: 1350, projectileCount: 3, projectileSpeed: 3300, pierce: true },
        ultimate: { id: 'radiation-zone', name: '辐射禁区', desc: '对目标周围敌人造成范围伤害', kind: 'area', cooldown: 15, damageScale: 5, range: 1425, areaRadius: 480 },
    },
];
