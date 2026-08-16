import { M3_LEVEL_CONFIG, EnemyDefinition, EnemyId, LevelConfig } from './M3LevelData';

export type LevelId = 'polluted-plain-01' | 'withered-grassland-01';

export const M6_LEVEL_CATALOG = {
    'polluted-plain-01': M3_LEVEL_CONFIG,
    'withered-grassland-01': {
        ...M3_LEVEL_CONFIG,
        id: 'withered-grassland-01',
        name: '荒化草原',
        fixedSeed: 20260816,
        duration: 45,
        vehicleHp: 195,
        phases: [
            { at: 0, name: '草原侦察' },
            { at: 8, name: '风蚀逼近' },
            { at: 18, name: '群落迁徙' },
            { at: 30, name: '地表裂变' },
            { at: 38, name: '终局风暴' },
        ],
        enemies: {
            ...M3_LEVEL_CONFIG.enemies,
            runner: { ...M3_LEVEL_CONFIG.enemies.runner, speed: 92, color: [222, 143, 48] },
            flier: { ...M3_LEVEL_CONFIG.enemies.flier, speed: 76, color: [91, 170, 168] },
            charger: { ...M3_LEVEL_CONFIG.enemies.charger, hp: 350, damage: 32 },
            titan: { ...M3_LEVEL_CONFIG.enemies.titan, hp: 1080, damage: 58, color: [138, 79, 54] },
        } satisfies Record<EnemyId, EnemyDefinition>,
        waves: [
            { at: 1, enemyId: 'runner', count: 6, interval: 0.6 },
            { at: 5, enemyId: 'crawler', count: 7, interval: 0.62 },
            { at: 9, enemyId: 'flier', count: 7, interval: 0.58 },
            { at: 14, enemyId: 'shellback', count: 5, interval: 0.8 },
            { at: 19, enemyId: 'charger', count: 2, interval: 2.2 },
            { at: 23, enemyId: 'runner', count: 10, interval: 0.42 },
            { at: 27, enemyId: 'spitter', count: 7, interval: 0.55 },
            { at: 31, enemyId: 'broodmother', count: 2, interval: 2.4 },
            { at: 35, enemyId: 'flier', count: 11, interval: 0.36 },
            { at: 38, enemyId: 'titan', count: 1, interval: 1 },
        ],
    },
} satisfies Record<LevelId, LevelConfig>;

export function getLevelConfig(levelId: string): LevelConfig {
    return M6_LEVEL_CATALOG[levelId as LevelId] ?? M6_LEVEL_CATALOG['polluted-plain-01'];
}
