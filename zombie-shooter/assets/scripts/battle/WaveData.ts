/**
 * 波次配置表。
 * 正式项目中该表由 Excel 导表工具生成 JSON，运行时加载；
 * 骨架阶段先手写验证手感，调数值直接改这里。
 */

/** 怪物行为 id：移动与威胁方式，Enemy 按此分派逻辑，新增怪型优先组合现有行为 */
export type MonsterBehavior = 'chaser' | 'swarm' | 'charger' | 'tanker' | 'diver';

export interface MonsterInfo {
    /** 唯一 id（GM 刷怪/调试用） */
    id: string;
    behavior: MonsterBehavior;
    hp: number;
    speed: number;
    /** 碰撞半径（占位阶段=圆形碰撞体半径，后续换 Spine 时改用包围盒） */
    radius: number;
    /** 突破防线时对载具造成的伤害 */
    touchDamage: number;
    /** 0=普通怪 1=精英怪（数值与体型放大，配色变精英红） */
    tier: 0 | 1;
    /** 一次刷出几只（狗群），缺省 1 */
    packSize?: number;
    /** charger：距车尾上沿多近开始蓄力（px） */
    dashRange?: number;
    /** charger：蓄力时长（秒），期间定住可被打 */
    windupTime?: number;
    /** charger：冲刺速度 */
    dashSpeed?: number;
}

export interface WaveInfo {
    /** 本波怪物总数（按只计，狗群一次消耗多只） */
    count: number;
    /** 刷怪间隔（秒），按次计（狗群一次算一次） */
    interval: number;
    /** 同时在场上限 */
    maxAlive: number;
    /** 普通怪升级为精英怪的概率 */
    eliteChance: number;
    /** 本波怪物池：每次刷怪随机取一种 */
    monsters: MonsterInfo[];
}

// ---- 基础怪型工厂：波次表按波次调 hp，行为参数集中在这里 ----

/** 爬行者：直线追车的基础怪 */
const crawler = (hp: number, speed: number): MonsterInfo => ({
    id: 'crawler', behavior: 'chaser', hp, speed, radius: 28, touchDamage: 8, tier: 0,
});

/** 疯狗：低血高速成群直线快跑，检验群体技能清场 */
const dog = (hp: number): MonsterInfo => ({
    id: 'dog', behavior: 'swarm', hp, speed: 165, radius: 20, touchDamage: 6, tier: 0,
    packSize: 4,
});

/** 獠牙野猪：贴近后蓄力定身（可集火），再高速冲刺车尾，单次伤害高 */
const boar = (hp: number): MonsterInfo => ({
    id: 'boar', behavior: 'charger', hp, speed: 80, radius: 30, touchDamage: 32, tier: 0,
    dashRange: 340, windupTime: 0.6, dashSpeed: 430,
});

/** 双足熊：高血极慢的肉盾，检验持续 DPS */
const bear = (hp: number): MonsterInfo => ({
    id: 'bear', behavior: 'tanker', hp, speed: 42, radius: 42, touchDamage: 26, tier: 0,
});

/** 疯鹰：从两侧入场的快速俯冲怪，无视车道斜线直扑车尾 */
const eagle = (hp: number): MonsterInfo => ({
    id: 'eagle', behavior: 'diver', hp, speed: 195, radius: 20, touchDamage: 8, tier: 0,
});

/** GM 刷怪基表（数值=首次出现波次的水准） */
export const MONSTERS: Record<string, MonsterInfo> = {
    crawler: crawler(100, 90),
    dog: dog(60),
    boar: boar(450),
    bear: bear(1200),
    eagle: eagle(90),
};

export const WAVES: WaveInfo[] = [
    { count: 8,  interval: 1.2,  maxAlive: 6,  eliteChance: 0,    monsters: [crawler(100, 90)] },
    { count: 10, interval: 1.05, maxAlive: 7,  eliteChance: 0,    monsters: [crawler(140, 100)] },
    { count: 18, interval: 1.0,  maxAlive: 9,  eliteChance: 0,    monsters: [crawler(160, 105), dog(60)] },
    { count: 16, interval: 0.95, maxAlive: 9,  eliteChance: 0.1,  monsters: [crawler(200, 105), boar(450)] },
    { count: 22, interval: 0.9,  maxAlive: 10, eliteChance: 0.1,  monsters: [crawler(220, 110), dog(75), eagle(90)] },
    { count: 20, interval: 0.85, maxAlive: 10, eliteChance: 0.15, monsters: [crawler(260, 110), bear(1200), eagle(100)] },
    { count: 26, interval: 0.8,  maxAlive: 12, eliteChance: 0.2,  monsters: [dog(90), eagle(110), boar(600)] },
    { count: 24, interval: 0.75, maxAlive: 12, eliteChance: 0.25, monsters: [crawler(320, 120), bear(1600), eagle(125)] },
    { count: 30, interval: 0.7,  maxAlive: 13, eliteChance: 0.3,  monsters: [dog(110), boar(800), bear(2000)] },
    { count: 36, interval: 0.65, maxAlive: 14, eliteChance: 0.4,  monsters: [crawler(400, 130), dog(130), eagle(150), boar(1000), bear(2400)] },
];
