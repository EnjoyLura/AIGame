import { Color } from 'cc';

/**
 * 英雄定义表：每名英雄的普攻行为由 weapon 决定，数值独立配置。
 * 策划调数值只改这张表；超能力者（火球/冰锥/风刃/连锁雷电）在 M2 阶段扩充为新 WeaponType。
 */

export type WeaponType = 'rifle' | 'sniper' | 'laser' | 'radiation';

export interface HeroDef {
    id: string;
    name: string;
    /** 定位：单体爆发 / 持续输出 / 群体伤害 / 辅助增益 */
    role: string;
    weapon: WeaponType;
    /** 单发伤害；激光武器为每秒伤害（DPS） */
    atk: number;
    /** 攻击间隔（秒），激光无间隔恒定照射 */
    interval: number;
    /** 射程 */
    range: number;
    /** 弹速，激光无用 */
    bulletSpeed: number;
    /** 辐射枪：穿透多个敌人 */
    pierce?: boolean;
    /** 占位形象主色 / 弹体色 */
    color: Color;
    bulletColor: Color;
}

export const HERO_DEFS: HeroDef[] = [
    {
        id: 'rifle', name: '步枪手·凯', role: '持续输出', weapon: 'rifle',
        atk: 80, interval: 0.7, range: 850, bulletSpeed: 1500,
        color: new Color(79, 195, 247, 255), bulletColor: new Color(255, 238, 88, 255),
    },
    {
        id: 'sniper', name: '狙击手·苍鹭', role: '单体爆发', weapon: 'sniper',
        atk: 260, interval: 1.8, range: 1050, bulletSpeed: 2600,
        color: new Color(129, 199, 132, 255), bulletColor: new Color(255, 171, 64, 255),
    },
    {
        id: 'laser', name: '激光手·棱镜', role: '跟踪持续', weapon: 'laser',
        atk: 130, interval: 0, range: 700, bulletSpeed: 0,
        color: new Color(77, 208, 225, 255), bulletColor: new Color(77, 208, 225, 255),
    },
    {
        id: 'radiation', name: '辐射枪手·芮', role: '群体伤害', weapon: 'radiation',
        atk: 60, interval: 1.1, range: 800, bulletSpeed: 2000, pierce: true,
        color: new Color(184, 220, 129, 255), bulletColor: new Color(178, 255, 89, 255),
    },
];
