import { GameManager } from './GameManager';
import { HeroSystem, HERO_PRICES } from './HeroSystem';
import { FINAL_STAGE_ID } from '../battle/StageData';
import { TrialSystem } from './TrialSystem';
import { RecruitSystem } from './RecruitSystem';
import { TalentSystem } from './TalentSystem';
import { DungeonSystem } from './DungeonSystem';

/**
 * 排行榜系统（基地页入口，本地模拟版）：
 * - 积分实时从存档计算：最高通关 ×1000 + 累计击杀 ×2 + 建筑等级总和 ×50 + 拥有英雄战力
 *   + 塔层 ×300 + 累计招募 ×5 + 英雄星级总和 ×120 + 已投天赋点 ×400 + 副本挑战 ×30。
 * - 对手为本地生成的水涨船高型机器人（围绕玩家积分分布），本地模拟；
 *   接微信小游戏时只需把 loadBoard 的数据源换成开放数据域 getFriendCloudStorage。
 */

export interface LbEntry {
    name: string;
    /** 玩家 = true（排行榜高亮"我"） */
    me: boolean;
    score: number;
    ic: string;
}

/** 玩家榜分：通关进度为主权重，击杀/建筑/英雄为辅 */
export function myScore(): number {
    const gm = GameManager.instance;
    const hs = HeroSystem.instance;
    const heroPower = gm.ownedHeroes.reduce((sum, id) => {
        const price = HERO_PRICES[id] ?? 0;
        const equipMul = hs.equipMulOf(id).atk;
        return sum + 100 + Math.round(price * 0.1 * equipMul);
    }, 0);
    let buildingSum = 0;
    for (const id in gm.buildingLevels) {
        buildingSum += gm.buildingLevels[id] ?? 0;
    }
    return gm.stageCleared * 1000 + gm.totalKills * 2 + buildingSum * 50 + heroPower
        + TrialSystem.instance.maxFloor * 300
        + RecruitSystem.instance.totalRecruits * 5
        + RecruitSystem.instance.starSum * 120
        + TalentSystem.instance.spent * 400
        // 副本是日日可刷的进度，权重刻意压低，不与通关/塔抢主权重
        + DungeonSystem.instance.totalRuns * 30;
}

/** 本地机器人名池（末日风格） */
const BOT_NAMES: Array<[string, string]> = [
    ['末日尖兵', '🎖️'], ['钢铁黎明', '🤖'], ['夜莺小队', '🌙'], ['破晓者', '🌅'],
    ['血狼营', '🐺'], ['拾荒王者', '🔧'], ['方舟守望', '🏰'], ['雷霆突袭', '⚡'],
    ['孤胆枪手', '🔫'], ['白鸽小队', '🕊️'], ['废土商人', '💼'], ['猎风者', '🌪️'],
];

/**
 * 生成榜单（每次调用重掷机器人分布，围绕玩家积分上下浮动）：
 * 玩家永远在榜内；机器人分数覆盖"略低于我 ~ 大幅高于我"的区间，营造追赶/领先目标。
 */
export function loadBoard(): LbEntry[] {
    const me = myScore();
    const bots: LbEntry[] = BOT_NAMES.map(([name, ic], i) => {
        // 分布：i 越大整体越强；每人围绕基准 ±22% 浮动
        const base = me * (0.35 + i * 0.14);
        const score = Math.max(1, Math.round(base * (0.78 + Math.random() * 0.44)));
        return { name, me: false, score, ic };
    });
    const all = [...bots, { name: '我（末日指挥官）', me: true, score: me, ic: '🎖️' }];
    all.sort((a, b) => b.score - a.score);
    return all;
}

/** 全通关展示文案（榜尾备注用） */
export function boardNote(): string {
    return GameManager.instance.stageCleared >= FINAL_STAGE_ID
        ? '全关卡已通关 · 静候新章节开放'
        : '通关更高关卡可大幅提升积分';
}
