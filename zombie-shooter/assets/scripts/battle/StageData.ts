import { WaveInfo, MonsterInfo, mob } from './WaveData';
import { BattleConfig } from '../config/GameConfig';

/**
 * 关卡设计骨架系统：
 * - 一个关卡（Stage）= 一段完整的护送旅程，由 N 波组成；打完末波即通关，回到主城解锁下一关。
 * - 每关声明「怪物池 + 数值倍率 + 波次节奏」，由 makeWaves 派生成 WaveInfo[]，
 *   复用波次表的手感参数，避免每关重抄一遍刷怪细节。
 * - 新增关卡只需在 STAGES 追加一项：名字/波数/怪物组合/倍率，战斗与主城 UI 自动跟随。
 * - 无尽模式：通关最后一关后，以末关波次表 + ENDLESS_HP_SCALE 继续滚波（原 WAVES 行为保留兜底）。
 */

/** 单个关卡定义（配置层，不参与战斗逻辑） */
export interface StageInfo {
    /** 关卡序号（1 起），主城展示与解锁判定用 */
    id: number;
    /** 关卡名（主城章节横幅） */
    name: string;
    /** 波数（打完即通关） */
    waveCount: number;
    /** 本关怪物池：每波从池中按条目顺序轮换+随机混合 */
    monsters: MonsterInfo[];
    /** 波次节奏：各波的 [count, interval, maxAlive]；缺省项循环末项 */
    rhythm: [number, number, number][];
    /** 精英概率曲线：按波序取 eliteChance（超长循环末值） */
    eliteChance: number[];
    /** 全关生命倍率（难度台阶，乘在怪物 hp 上） */
    hpMul: number;
}

/** 生成一关的波次表（hpmul 已乘入每只怪） */
export function makeWaves(stage: StageInfo): WaveInfo[] {
    const waves: WaveInfo[] = [];
    for (let w = 0; w < stage.waveCount; w++) {
        const rhythm = stage.rhythm[Math.min(w, stage.rhythm.length - 1)];
        waves.push({
            count: rhythm[0],
            interval: rhythm[1],
            maxAlive: rhythm[2],
            eliteChance: stage.eliteChance[Math.min(w, stage.eliteChance.length - 1)],
            // 波内怪物池：随波序在关内池中前移窗口，中后期怪更硬的组合占比更高
            monsters: stage.monsters.map(m => ({ ...m, hp: Math.round(m.hp * stage.hpMul) })),
        });
    }
    return waves;
}

// ---- 五层关卡（骨架数值：沿用现有五种怪的工厂，按关卡逐步解锁怪型） ----

const ape = (hp: number) => mob.stoneape(hp, 135);
const dog = (hp: number) => mob.dog(hp);
const boar = (hp: number) => mob.boar(hp);
const bear = (hp: number) => mob.bear(hp);
const eagle = (hp: number) => mob.eagle(hp);

/** 通用节奏模板：由松到紧，末波密度峰值 */
const RHYTHM_EASY: [number, number, number][] = [[8, 1.2, 6], [10, 1.05, 7], [18, 1.0, 9]];
const RHYTHM_NORMAL: [number, number, number][] = [[16, 0.95, 9], [22, 0.9, 10], [20, 0.85, 10]];
const RHYTHM_HARD: [number, number, number][] = [[26, 0.8, 12], [24, 0.75, 12], [30, 0.7, 13], [36, 0.65, 14]];

export const STAGES: StageInfo[] = [
    {
        id: 1, name: '1.末日公路', waveCount: 5, hpMul: 1,
        monsters: [ape(100), dog(60)],
        rhythm: [...RHYTHM_EASY, [16, 0.95, 9], [18, 0.9, 10]],
        eliteChance: [0, 0, 0, 0.1, 0.1],
    },
    {
        id: 2, name: '2.跨海大桥', waveCount: 5, hpMul: 1.35,
        monsters: [ape(130), dog(70), eagle(90)],
        rhythm: [...RHYTHM_EASY, [20, 0.9, 10], [22, 0.85, 10]],
        eliteChance: [0, 0, 0.1, 0.1, 0.15],
    },
    {
        id: 3, name: '3.雨夜废墟', waveCount: 5, hpMul: 1.8,
        monsters: [ape(160), dog(85), boar(300), eagle(100)],
        rhythm: [...RHYTHM_NORMAL, [24, 0.8, 11], [26, 0.78, 12]],
        eliteChance: [0, 0.1, 0.1, 0.15, 0.2],
    },
    {
        id: 4, name: '4.炼钢厂', waveCount: 5, hpMul: 2.4,
        monsters: [ape(200), boar(360), bear(700), eagle(115)],
        rhythm: [...RHYTHM_NORMAL, [26, 0.78, 12], [28, 0.72, 12]],
        eliteChance: [0, 0.1, 0.15, 0.2, 0.25],
    },
    {
        id: 5, name: '5.尸潮深谷', waveCount: 5, hpMul: 3.2,
        monsters: [ape(240), dog(110), boar(460), bear(950), eagle(130)],
        rhythm: [...RHYTHM_HARD],
        eliteChance: [0.1, 0.15, 0.2, 0.3, 0.4],
    },
];

/** 关卡波次表缓存（makeWaves 纯函数，启动后不变） */
const WAVE_CACHE: WaveInfo[][] = STAGES.map(makeWaves);

/** 取关卡波次表（id 越界时钳到最后一关） */
export function stageWaves(stageId: number): WaveInfo[] {
    const idx = Math.min(Math.max(1, stageId), STAGES.length) - 1;
    return WAVE_CACHE[idx];
}

export function stageInfo(stageId: number): StageInfo {
    const idx = Math.min(Math.max(1, stageId), STAGES.length) - 1;
    return STAGES[idx];
}

/** 通关的关卡序号=解锁进度（存档字段 stageCleared：已通关的最大关卡 id，0=未通关任何关） */
export const FINAL_STAGE_ID = STAGES.length;
