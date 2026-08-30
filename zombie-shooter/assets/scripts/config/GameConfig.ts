import { Color } from 'cc';

/**
 * 《末日航线》全局配置。
 * 英雄个体数值在 HeroDef.ts；怪物波次在 WaveData.ts；这里只放全局底层常量与占位色板。
 */

/** 设计分辨率（竖屏） */
export const Design = {
    WIDTH: 1080,
    HEIGHT: 1920,
} as const;

/** 战斗核心参数 */
export const BattleConfig = {
    /** 运输载具：车尾横贯屏幕底部的条高 */
    VEHICLE_STRIP_HEIGHT: 270,
    VEHICLE_MAX_HP: 3000,
    /** 路面滚动速度（px/s）：世界下移=载具前进 */
    ROAD_SCROLL_SPEED: 195,
    /** 路面半宽：怪物车道的横向范围 */
    ROAD_HALF_WIDTH: 420,
    /** 上阵英雄数与站位间距（横排分散在车尾） */
    DEPLOY_HERO_COUNT: 4,
    HERO_SLOT_SPACING: 255,
    /** 普攻子弹默认参数（英雄个体数值以 HeroDef 为准） */
    BULLET_RADIUS: 12,
    BULLET_SPEED: 2250,
    /** 暴击 */
    CRIT_CHANCE: 0.15,
    CRIT_MULTI: 2,
    /** 经验 */
    XP_GEM_VALUE: 1,
    XP_GEM_COLLECT_DELAY: 0.35,
    /** 波次 */
    WAVE_REST_TIME: 2.5,
    /** 超出波次表后进入无尽模式，每波怪物血量倍率 */
    ENDLESS_HP_SCALE: 1.25,
} as const;

/** 占位美术色板：全部替换为正式资源后可整体删除 */
export const Palette = {
    bg: new Color(31, 39, 51, 255),
    lane: new Color(255, 255, 255, 18),
    hero: new Color(79, 195, 247, 255),
    heroDark: new Color(69, 90, 100, 255),
    bullet: new Color(255, 238, 88, 255),
    monster: new Color(102, 187, 106, 255),
    elite: new Color(239, 83, 80, 255),
    hpBarBg: new Color(55, 71, 79, 220),
    hpBarFill: new Color(102, 187, 106, 255),
    vehicleBarFill: new Color(255, 167, 38, 255),
    xpBarFill: new Color(77, 208, 225, 255),
    text: new Color(236, 239, 241, 255),
    damage: new Color(255, 255, 255, 255),
    crit: new Color(255, 112, 67, 255),
    xpGem: new Color(105, 240, 174, 255),
    cardBg: new Color(38, 50, 56, 255),
    cardBorder: new Color(128, 222, 234, 255),
    overlay: new Color(0, 0, 0, 170),
} as const;

/** 全局事件名：跨系统通信只允许走事件中心（core/EventCenter） */
export enum GameEvent {
    WAVE_START = 'wave-start',
    VEHICLE_HP_CHANGED = 'vehicle-hp-changed',
    XP_CHANGED = 'xp-changed',
    ENEMY_DEAD = 'enemy-dead',
    GAME_OVER = 'game-over',
    GAME_RESTART = 'game-restart',
}
