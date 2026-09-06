import { Color } from 'cc';

export type WeaponType = 'rifle' | 'sniper' | 'laser' | 'radiation';
export type AbilityKind = 'projectile' | 'beam' | 'multi' | 'area' | 'buff' | 'drone' | 'lock' | 'laserbeam';

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
    /** buff：强化普攻的射程倍率（kind='buff' 时用） */
    rangeMul?: number;
    maxTargets?: number;
    areaRadius?: number;
    /** projectile：true=齐射（全部同帧扇形射出），false/缺省=按 0.12s 间隔连发 */
    volley?: boolean;
    /** area：true=榴弹炮（起爆前飞一枚抛物线弹体到落点） */
    mortar?: boolean;
    /** area：蓄力时长秒（预警圈/榴弹飞行时间），默认 0.35 */
    castTime?: number;
    /** lock：准星锁定读秒秒数，默认 0.5 */
    lockTime?: number;
    /** 普攻合成定义用：目标选取模式 */
    targetMode?: string;
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
    /** 枪口在英雄节点上方的偏移（设计像素）；缺省 54（占位立绘的出膛高度） */
    muzzleY?: number;
    skill: AbilityDef;
    ultimate: AbilityDef;
}

/** 技能/大招等级上限：升级卡解锁=1 级，重复抽到再升级 */
export const ABILITY_MAX_LEVEL = 3;
/** 每级伤害增幅（实际倍率 = damageScale × (1 + 每级增幅 × (level-1))） */
export const ABILITY_LEVEL_DMG_BONUS = 0.3;
/** 大招充能所需击杀数：击杀来源=英雄自身（普攻/技能/大招击杀都算） */
/** 大招充能所需击杀数（击杀充能，较大提升：14 → 20） */
export const ULTIMATE_CHARGE_MAX = 20;

/** 普攻增益（连射/齐射）各自可叠层数上限 */
export const BASIC_ENHANCE_MAX = 3;
/** 普攻增益每层单发伤害系数（连射+齐射共享：每多一发光/束，单发伤害 ×0.8） */
export const BASIC_ENHANCE_DMG_STEP = 0.8;
/** 齐射偏移弹的角度间隔（弧度，约 5°） */
export const VOLLEY_ANGLE_STEP = 0.09;
/** 连射同向补弹的发射点错位间距（设计像素） */
export const MULTISHOT_SPACING = 150;

/** 穿透+1 可叠层数上限（每层子弹可多穿过 1 个敌人） */
export const PIERCE_PLUS_MAX = 3;
/** 范围爆炸可叠层数上限（每层提升爆炸伤害与范围） */
export const BOOM_MAX = 2;
/** 爆炸伤害占子弹伤害比例（随层数 +0.3：L1=40%、L2=70%） */
export const BOOM_DMG_RATIO = 0.4;
export const BOOM_DMG_RATIO_STEP = 0.3;
/** 爆炸半径（设计像素，随层数 +40） */
export const BOOM_RADIUS = 90;
export const BOOM_RADIUS_STEP = 40;
/** 子弹分裂可叠层数上限（1=每颗子弹命中后分裂 2 颗次级弹） */
export const SPLIT_MAX = 1;
/** 次级分裂弹伤害占母弹比例 */
export const SPLIT_DMG_RATIO = 0.4;
/** 次级弹自动索敌范围（设计像素） */
export const SPLIT_SEEK_RANGE = 500;
/** 无目标时次级弹的裂变扇形角度（弧度） */
export const SPLIT_FAN_ANGLE = 0.55;

/** 裂变数量卡可叠层数上限（每层裂变子弹 +1，次级弹伤害 ×0.8） */
export const SPLIT_MORE_MAX = 2;
export const SPLIT_MORE_DMG_STEP = 0.8;
/** 裂变强化卡可叠层数上限（每层次级弹伤害 ×1.5） */
export const SPLIT_DMG_UP_MAX = 2;
export const SPLIT_DMG_UP_STEP = 1.5;
/** 爆炸范围卡可叠层数上限（每层爆炸半径 ×1.5，爆炸伤害 ×0.8） */
export const BOOM_RANGE_MAX = 2;
export const BOOM_RANGE_STEP = 1.5;
export const BOOM_RANGE_DMG_STEP = 0.8;
/** 爆炸强化卡可叠层数上限（每层爆炸伤害 ×1.5） */
export const BOOM_DMG_UP_MAX = 2;
export const BOOM_DMG_UP_STEP = 1.5;

/** 次级爆炸卡可叠层数上限（次级子弹命中后小范围爆炸） */
export const SEC_BOOM_MAX = 2;
/** 次级爆炸伤害占次级弹伤害比例（随层数 +0.15：L1=30%、L2=45%） */
export const SEC_BOOM_DMG_RATIO = 0.3;
export const SEC_BOOM_DMG_RATIO_STEP = 0.15;
/** 次级爆炸半径（设计像素，随层数 +25） */
export const SEC_BOOM_RADIUS = 70;
export const SEC_BOOM_RADIUS_STEP = 25;

export const HERO_DEFS: HeroDef[] = [
    {
        id: 'rifle', name: '步枪手·凯', role: '持续输出', weapon: 'rifle',
        atk: 80, interval: 0.7, range: 1275, bulletSpeed: 2250, muzzleY: 84,
        color: new Color(79, 195, 247, 255), bulletColor: new Color(255, 238, 88, 255),
        skill: { id: 'rifle-burst', name: '穿透齐射', desc: '齐射 5 枚可穿透的子弹', kind: 'projectile', cooldown: 14, damageScale: 0.75, range: 1350, projectileCount: 5, projectileSpeed: 2550, pierce: true, volley: true },
        ultimate: { id: 'rifle-barrage', name: '榴弹炮击', desc: '发射榴弹炮，轰击落点范围敌人', kind: 'area', cooldown: 16, damageScale: 3.2, range: 1650, areaRadius: 270, castTime: 0.5, mortar: true },
    },
    {
        id: 'sniper', name: '狙击手·苍鹭', role: '单体爆发', weapon: 'sniper',
        atk: 260, interval: 1.8, range: 1575, bulletSpeed: 3900,
        color: new Color(129, 199, 132, 255), bulletColor: new Color(255, 171, 64, 255),
        skill: { id: 'sniper-drone', name: '护卫无人机', desc: '召唤无人机环绕自身射击 5 秒', kind: 'drone', cooldown: 15, damageScale: 0.4, range: 1950, duration: 5 },
        ultimate: { id: 'sniper-execute', name: '猎杀锁定', desc: '准星锁定 8 个血量最高的敌人，读秒后造成超高伤害，未死者挂上标记', kind: 'lock', cooldown: 18, damageScale: 7, range: 1950, maxTargets: 8, lockTime: 1.2 },
    },
    {
        id: 'laser', name: '激光手·棱镜', role: '跟踪持续', weapon: 'laser',
        atk: 130, interval: 0, range: 1050, bulletSpeed: 0,
        color: new Color(77, 208, 225, 255), bulletColor: new Color(77, 208, 225, 255),
        skill: { id: 'laser-overdrive', name: '过载光束', desc: '过载普攻 4.2 秒：每跳伤害 ×2.2', kind: 'buff', cooldown: 16, damageScale: 2.2, range: 1275, duration: 4.2 },
        ultimate: { id: 'laser-beam', name: '贯穿光束', desc: '穿透全屏的激光束，持续 5 秒', kind: 'laserbeam', cooldown: 17, damageScale: 1.2, range: 1350, duration: 5, tick: 0.25 },
    },
    {
        id: 'radiation', name: '辐射枪手·芮', role: '群体伤害', weapon: 'radiation',
        atk: 60, interval: 1.1, range: 1200, bulletSpeed: 3000, pierce: true,
        color: new Color(184, 220, 129, 255), bulletColor: new Color(178, 255, 89, 255),
        skill: { id: 'radiation-volley', name: '裂变齐射', desc: '自动连发 3 枚穿透弹', kind: 'projectile', cooldown: 15, damageScale: 1.15, range: 1350, projectileCount: 3, projectileSpeed: 3300, pierce: true },
        ultimate: { id: 'radiation-zone', name: '辐射禁区', desc: '对目标周围敌人造成范围伤害', kind: 'area', cooldown: 15, damageScale: 5, range: 1425, areaRadius: 480 },
    },
];
