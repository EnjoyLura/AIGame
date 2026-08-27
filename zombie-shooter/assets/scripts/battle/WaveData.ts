/**
 * 波次配置表。
 * 正式项目中该表由 Excel 导表工具生成 JSON，运行时加载；
 * 骨架阶段先手写 10 波验证手感，调数值直接改这里。
 */

export interface MonsterInfo {
    hp: number;
    speed: number;
    /** 碰撞半径（占位阶段=圆形碰撞体半径，后续换 Spine 时改用包围盒） */
    radius: number;
    /** 突破防线时对主角造成的伤害 */
    touchDamage: number;
    /** 0=普通怪 1=精英怪（数值与体型放大，占位绘制形态不同） */
    tier: 0 | 1;
}

export interface WaveInfo {
    /** 本波怪物总数 */
    count: number;
    /** 刷怪间隔（秒） */
    interval: number;
    /** 同时在场上限 */
    maxAlive: number;
    /** 普通怪升级为精英怪的概率 */
    eliteChance: number;
    monster: MonsterInfo;
}

export const WAVES: WaveInfo[] = [
    { count: 8,  interval: 1.2,  maxAlive: 6,  eliteChance: 0,    monster: { hp: 100,  speed: 90,  radius: 28, touchDamage: 8,  tier: 0 } },
    { count: 10, interval: 1.05, maxAlive: 7,  eliteChance: 0,    monster: { hp: 140,  speed: 100, radius: 28, touchDamage: 8,  tier: 0 } },
    { count: 12, interval: 0.95, maxAlive: 8,  eliteChance: 0,    monster: { hp: 190,  speed: 110, radius: 30, touchDamage: 10, tier: 0 } },
    { count: 12, interval: 0.9,  maxAlive: 9,  eliteChance: 0.1,  monster: { hp: 260,  speed: 105, radius: 30, touchDamage: 10, tier: 0 } },
    { count: 14, interval: 0.85, maxAlive: 10, eliteChance: 0.15, monster: { hp: 340,  speed: 115, radius: 30, touchDamage: 12, tier: 0 } },
    { count: 14, interval: 0.8,  maxAlive: 10, eliteChance: 0.2,  monster: { hp: 430,  speed: 120, radius: 32, touchDamage: 14, tier: 0 } },
    { count: 16, interval: 0.75, maxAlive: 11, eliteChance: 0.25, monster: { hp: 540,  speed: 125, radius: 32, touchDamage: 14, tier: 0 } },
    { count: 16, interval: 0.7,  maxAlive: 12, eliteChance: 0.3,  monster: { hp: 660,  speed: 130, radius: 34, touchDamage: 16, tier: 0 } },
    { count: 18, interval: 0.65, maxAlive: 12, eliteChance: 0.35, monster: { hp: 800,  speed: 135, radius: 34, touchDamage: 18, tier: 0 } },
    { count: 20, interval: 0.6,  maxAlive: 14, eliteChance: 0.4,  monster: { hp: 1000, speed: 140, radius: 36, touchDamage: 20, tier: 0 } },
];
