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

// ================= 难度系统 =================

/** 关卡难度：普通（默认）/ 精英（通关本关普通解锁）/ 噩梦（通关本关精英解锁） */
export type StageDifficulty = 0 | 1 | 2;

export interface StageDiffDef {
    id: StageDifficulty;
    name: string;
    ic: string;
    /** 怪物强度倍率（hp ×N、啃咬伤害 ×√N），乘在关卡 hpMul 之上 */
    hpMul: number;
    /** 通关奖励倍率（首通金币/结算掉落 luck） */
    rewardMul: number;
    /** 未解锁提示 */
    unlockNote: string;
}

/** 三档难度定义（精英≈1.5×、噩梦≈2.4× 普通怪强度，奖励同步倍化） */
export const STAGE_DIFFS: StageDiffDef[] = [
    { id: 0, name: '普通', ic: '▶', hpMul: 1, rewardMul: 1, unlockNote: '' },
    { id: 1, name: '精英', ic: '⭐', hpMul: 1.5, rewardMul: 1.6, unlockNote: '通关本关【普通】解锁' },
    { id: 2, name: '噩梦', ic: '💀', hpMul: 2.4, rewardMul: 2.4, unlockNote: '通关本关【精英】解锁' },
];

export function stageDiffDef(id: StageDifficulty): StageDiffDef {
    return STAGE_DIFFS[Math.min(2, Math.max(0, id))];
}

/** 取关卡波次表（id 越界时钳到最后一关；难度 >0 时怪物 hp/伤害/精英率现场放大） */
export function stageWaves(stageId: number, diff: StageDifficulty = 0): WaveInfo[] {
    const idx = Math.min(Math.max(1, stageId), STAGES.length) - 1;
    const base = WAVE_CACHE[idx];
    const d = stageDiffDef(diff);
    if (d.hpMul === 1) {
        return base;
    }
    return base.map(w => ({
        ...w,
        eliteChance: Math.min(1, w.eliteChance * (1 + (d.hpMul - 1) * 0.6)),
        monsters: w.monsters.map(m => ({
            ...m,
            hp: Math.round(m.hp * d.hpMul),
            touchDamage: Math.round(m.touchDamage * Math.sqrt(d.hpMul)),
        })),
    }));
}

export function stageInfo(stageId: number): StageInfo {
    const idx = Math.min(Math.max(1, stageId), STAGES.length) - 1;
    return STAGES[idx];
}

// ================= BOSS 战 =================

/** 关末 BOSS 定义：复用本关怪物池的既有怪型放大成 BOSS（无专属美术，金圈+体型标识） */
export interface StageBossDef {
    /** 基础怪型 id（必须在该关怪物池内） */
    base: string;
    name: string;
}

/** 每关压轴 BOSS（顺序=关卡 id-1；无尽模式按里程碑轮换） */
export const STAGE_BOSSES: StageBossDef[] = [
    { base: 'stoneape', name: '巨岩魔猿' },
    { base: 'eagle', name: '风暴鹰王' },
    { base: 'boar', name: '獠牙猪皇' },
    { base: 'bear', name: '铁壁熊王' },
    { base: 'bear', name: '尸潮熊皇' },
];

/** 取某关的 BOSS 出场信息：数值取本关怪物池同型怪的 hp，乘关卡倍率与难度倍率（血量再由 Enemy.init ×BOSS_HP_SCALE） */
export function bossSpawnInfo(stageId: number, diff: StageDifficulty = 0): { info: MonsterInfo; name: string } | null {
    const idx = Math.min(Math.max(1, stageId), STAGES.length) - 1;
    const stage = STAGES[idx];
    const def = STAGE_BOSSES[idx];
    const base = stage.monsters.find(m => m.id === def.base);
    if (!base) {
        return null;
    }
    const info: MonsterInfo = {
        ...base,
        tier: 2,
        hp: Math.round(base.hp * stage.hpMul * stageDiffDef(diff).hpMul),
    };
    return { info, name: def.name };
}

/** 通关的关卡序号=解锁进度（存档字段 stageCleared：已通关的最大关卡 id，0=未通关任何关） */
export const FINAL_STAGE_ID = STAGES.length;
