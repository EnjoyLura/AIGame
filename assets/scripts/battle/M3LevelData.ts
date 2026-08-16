export type EnemyId = 'crawler' | 'runner' | 'shellback' | 'spitter' | 'flier' | 'charger' | 'broodmother' | 'titan';

export interface EnemyDefinition {
    id: EnemyId;
    name: string;
    hp: number;
    speed: number;
    damage: number;
    radius: number;
    xp: number;
    score: number;
    color: readonly [number, number, number];
    elite?: boolean;
    boss?: boolean;
}

export interface WaveDefinition {
    at: number;
    enemyId: EnemyId;
    count: number;
    interval: number;
}

export interface PhaseDefinition {
    at: number;
    name: string;
}

export interface SupportDefinition {
    id: 'fireRain' | 'droneStrike';
    name: string;
    cooldown: number;
    damage: number;
    targets: number;
}

export interface UpgradeDefinition {
    id: 'damage' | 'rapidFire' | 'splitShot' | 'skillForce' | 'skillCycle' | 'ultimateCharge' | 'ultimateForce' | 'repair';
    title: string;
    detail: string;
    color: readonly [number, number, number];
}

export interface LevelHeroConfig {
    normalDamage: number;
    normalInterval: number;
    projectileSpeed: number;
    projectiles: number;
    skillDamage: number;
    skillCooldown: number;
    skillTargets: number;
    ultimateDamage: number;
    ultimateMaxCharge: number;
    ultimateChargePerKill: number;
    ultimateChargePerSecond: number;
}

export interface LevelXpConfig {
    firstLevel: number;
    growth: number;
}

export interface LevelConfig {
    id: string;
    name: string;
    fixedSeed: number;
    duration: number;
    vehicleHp: number;
    hero: LevelHeroConfig;
    xp: LevelXpConfig;
    phases: readonly PhaseDefinition[];
    enemies: Record<EnemyId, EnemyDefinition>;
    waves: readonly WaveDefinition[];
    supports: readonly SupportDefinition[];
    upgrades: readonly UpgradeDefinition[];
}

export const M3_LEVEL_CONFIG = {
    id: 'polluted-plain-01',
    name: '污染平原',
    fixedSeed: 20260815,
    duration: 50,
    vehicleHp: 180,
    hero: {
        normalDamage: 28,
        normalInterval: 0.36,
        projectileSpeed: 590,
        projectiles: 1,
        skillDamage: 64,
        skillCooldown: 7,
        skillTargets: 4,
        ultimateDamage: 105,
        ultimateMaxCharge: 100,
        ultimateChargePerKill: 12,
        ultimateChargePerSecond: 2.5,
    },
    xp: {
        firstLevel: 72,
        growth: 1.28,
    },
    phases: [
        { at: 0, name: '开场侦察' },
        { at: 10, name: '成长阶段' },
        { at: 22, name: '压力阶段' },
        { at: 34, name: '爆发阶段' },
        { at: 42, name: '终局威胁' },
    ] satisfies readonly PhaseDefinition[],
    enemies: {
        crawler: { id: 'crawler', name: '腐甲爬兽', hp: 56, speed: 54, damage: 10, radius: 20, xp: 16, score: 10, color: [193, 71, 59] },
        runner: { id: 'runner', name: '裂齿奔袭者', hp: 42, speed: 84, damage: 11, radius: 17, xp: 14, score: 12, color: [214, 113, 47] },
        shellback: { id: 'shellback', name: '硬壳甲虫', hp: 112, speed: 38, damage: 16, radius: 27, xp: 26, score: 22, color: [133, 132, 77] },
        spitter: { id: 'spitter', name: '毒囊喷吐者', hp: 76, speed: 48, damage: 14, radius: 23, xp: 20, score: 18, color: [157, 92, 157] },
        flier: { id: 'flier', name: '雾翼飞蛾', hp: 48, speed: 68, damage: 12, radius: 18, xp: 17, score: 15, color: [84, 152, 164] },
        charger: { id: 'charger', name: '精英 · 裂地獠兽', hp: 310, speed: 64, damage: 30, radius: 34, xp: 68, score: 85, color: [232, 139, 55], elite: true },
        broodmother: { id: 'broodmother', name: '精英 · 寄巢母体', hp: 430, speed: 36, damage: 34, radius: 38, xp: 92, score: 120, color: [191, 74, 113], elite: true },
        titan: { id: 'titan', name: '首领 · 污蚀巨兽', hp: 980, speed: 28, damage: 55, radius: 58, xp: 220, score: 520, color: [123, 69, 55], boss: true },
    } satisfies Record<EnemyId, EnemyDefinition>,
    waves: [
        { at: 1, enemyId: 'crawler', count: 5, interval: 0.8 },
        { at: 5, enemyId: 'runner', count: 6, interval: 0.65 },
        { at: 10, enemyId: 'shellback', count: 4, interval: 1.05 },
        { at: 14, enemyId: 'spitter', count: 5, interval: 0.75 },
        { at: 18, enemyId: 'flier', count: 6, interval: 0.65 },
        { at: 23, enemyId: 'charger', count: 2, interval: 2.4 },
        { at: 27, enemyId: 'crawler', count: 8, interval: 0.48 },
        { at: 30, enemyId: 'runner', count: 8, interval: 0.5 },
        { at: 34, enemyId: 'broodmother', count: 2, interval: 2.8 },
        { at: 37, enemyId: 'flier', count: 9, interval: 0.42 },
        { at: 40, enemyId: 'shellback', count: 5, interval: 0.72 },
        { at: 42, enemyId: 'titan', count: 1, interval: 1 },
    ] satisfies readonly WaveDefinition[],
    supports: [
        { id: 'fireRain', name: '火雨', cooldown: 12, damage: 46, targets: 99 },
        { id: 'droneStrike', name: '无人机', cooldown: 9, damage: 72, targets: 5 },
    ] satisfies readonly SupportDefinition[],
    upgrades: [
        { id: 'damage', title: '穿甲弹芯', detail: '普攻伤害 +10', color: [218, 115, 44] },
        { id: 'rapidFire', title: '快速装填', detail: '普攻间隔 -12%', color: [57, 185, 190] },
        { id: 'splitShot', title: '双发校准', detail: '普攻额外发射 1 枚', color: [231, 195, 82] },
        { id: 'skillForce', title: '过载齐射', detail: '技能伤害 +25', color: [196, 92, 61] },
        { id: 'skillCycle', title: '短循环模块', detail: '技能冷却 -18%', color: [78, 160, 190] },
        { id: 'ultimateCharge', title: '动能回收', detail: '大招充能效率提升', color: [91, 179, 112] },
        { id: 'ultimateForce', title: '轨道增幅', detail: '大招伤害 +38', color: [186, 157, 73] },
        { id: 'repair', title: '应急焊接', detail: '载具完整度 +28%', color: [117, 189, 131] },
    ] satisfies readonly UpgradeDefinition[],
} satisfies LevelConfig;
