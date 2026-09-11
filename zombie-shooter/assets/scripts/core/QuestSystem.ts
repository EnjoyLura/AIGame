import { sys } from 'cc';
import { GameManager } from './GameManager';
import { GameEvent } from '../config/GameConfig';
import { eventCenter } from './EventCenter';
import { TrialSystem } from './TrialSystem';
import { RecruitSystem } from './RecruitSystem';
import { TalentSystem } from './TalentSystem';
import { AFFIX_MAX } from './EquipmentAffix';

/**
 * 任务与成就系统（基地页入口）：
 * - 成就：累计型里程碑（总击杀/通关数/累计金币/解锁英雄/看广告），永久进度，一次性领奖。
 * - 每日任务：击杀/通关/赚金币，自然日重置进度与领奖资格。
 * - 进度计数监听全局事件（ENEMY_DEAD / STAGE_CLEAR / GOLD_EARNED / AD_END），战斗代码零侵入；
 *   读写走 GameManager 存档（quests 字段），旧档缺字段自动补默认值。
 * - 奖励发钻石为主（补经济闭环），部分发金币。
 */

/** 任务/成就目标类型（与计数钩子一一对应） */
export type QuestGoal = 'kills' | 'clears' | 'goldEarned' | 'heroes' | 'ads' | 'stage'
    | 'gems' | 'combines' | 'salvages' | 'endlessWave' | 'skills' | 'buildings' | 'trialFloor'
    | 'recruits' | 'heroStars' | 'talentPoints' | 'affix3';

export interface QuestDef {
    id: string;
    kind: 'achv' | 'daily';
    name: string;
    /** 目标类型 */
    goal: QuestGoal;
    /** 目标数值（goal=stage 时为"通关到第 N 关"；goal=endlessWave 时为"无尽到达第 N 波"） */
    target: number;
    /** 奖励：钻石/金币 */
    reward: { diamond?: number; gold?: number };
    ic: string;
}

export const QUEST_DEFS: QuestDef[] = [
    // ---- 每日任务（自然日重置） ----
    { id: 'd_kill80', kind: 'daily', name: '每日清剿', goal: 'kills', target: 80, reward: { diamond: 10 }, ic: '🔫' },
    { id: 'd_clear2', kind: 'daily', name: '每日巡逻', goal: 'clears', target: 2, reward: { diamond: 10, gold: 300 }, ic: '🚚' },
    { id: 'd_gold500', kind: 'daily', name: '每日筹款', goal: 'goldEarned', target: 500, reward: { diamond: 8 }, ic: '🪙' },
    // ---- 成就（累计型，一次性） ----
    { id: 'a_kill100', kind: 'achv', name: '初露锋芒', goal: 'kills', target: 100, reward: { diamond: 20 }, ic: '⚔️' },
    { id: 'a_kill1000', kind: 'achv', name: '杀戮机器', goal: 'kills', target: 1000, reward: { diamond: 60 }, ic: '💀' },
    { id: 'a_kill5000', kind: 'achv', name: '末日收割者', goal: 'kills', target: 5000, reward: { diamond: 150 }, ic: '☄️' },
    { id: 'a_stage3', kind: 'achv', name: '渐入佳境', goal: 'stage', target: 3, reward: { diamond: 30 }, ic: '🗺️' },
    { id: 'a_stage6', kind: 'achv', name: '全线突破', goal: 'stage', target: 6, reward: { diamond: 80 }, ic: '🏁' },
    { id: 'a_clear20', kind: 'achv', name: '巡逻老兵', goal: 'clears', target: 20, reward: { diamond: 40 }, ic: '🛡️' },
    { id: 'a_gold10k', kind: 'achv', name: '战地财主', goal: 'goldEarned', target: 10000, reward: { diamond: 50 }, ic: '💰' },
    { id: 'a_hero2', kind: 'achv', name: '招兵买马', goal: 'heroes', target: 2, reward: { diamond: 25 }, ic: '🎖️' },
    { id: 'a_hero4', kind: 'achv', name: '满编战队', goal: 'heroes', target: 4, reward: { diamond: 60 }, ic: '👑' },
    { id: 'a_ad10', kind: 'achv', name: '广告赞助商', goal: 'ads', target: 10, reward: { diamond: 30 }, ic: '📺' },
    // ---- 系统联动成就（扩展包：宝石/合成/分解/无尽/技能/建筑） ----
    { id: 'a_gem3', kind: 'achv', name: '初试锋芒·镶嵌', goal: 'gems', target: 3, reward: { diamond: 20 }, ic: '💎' },
    { id: 'a_gem15', kind: 'achv', name: '宝石大师', goal: 'gems', target: 15, reward: { diamond: 70 }, ic: '💠' },
    { id: 'a_combine5', kind: 'achv', name: '合成学徒', goal: 'combines', target: 5, reward: { diamond: 25 }, ic: '🔮' },
    { id: 'a_combine20', kind: 'achv', name: '合成宗师', goal: 'combines', target: 20, reward: { diamond: 80 }, ic: '⚗️' },
    { id: 'a_salvage10', kind: 'achv', name: '回收利用', goal: 'salvages', target: 10, reward: { diamond: 20 }, ic: '♻️' },
    { id: 'a_salvage50', kind: 'achv', name: '废土拾荒者', goal: 'salvages', target: 50, reward: { diamond: 50 }, ic: '🧹' },
    { id: 'a_wave15', kind: 'achv', name: '无尽行者', goal: 'endlessWave', target: 15, reward: { diamond: 60 }, ic: '♾️' },
    { id: 'a_wave30', kind: 'achv', name: '波次支配者', goal: 'endlessWave', target: 30, reward: { diamond: 120 }, ic: '🌊' },
    { id: 'a_skill6', kind: 'achv', name: '特训教官', goal: 'skills', target: 6, reward: { diamond: 30 }, ic: '🎯' },
    { id: 'a_building15', kind: 'achv', name: '基地建设者', goal: 'buildings', target: 15, reward: { diamond: 35 }, ic: '🏗️' },
    { id: 'a_trial5', kind: 'achv', name: '登塔者', goal: 'trialFloor', target: 5, reward: { diamond: 40 }, ic: '🗼' },
    { id: 'a_trial15', kind: 'achv', name: '高塔征服者', goal: 'trialFloor', target: 15, reward: { diamond: 90 }, ic: '🧗' },
    { id: 'a_trial30', kind: 'achv', name: '塔顶挑战者', goal: 'trialFloor', target: 30, reward: { diamond: 200 }, ic: '👑' },
    { id: 'a_recruit10', kind: 'achv', name: '招募新手', goal: 'recruits', target: 10, reward: { diamond: 30 }, ic: '🎖️' },
    { id: 'a_recruit50', kind: 'achv', name: '人事主管', goal: 'recruits', target: 50, reward: { diamond: 80 }, ic: '📋' },
    { id: 'a_star6', kind: 'achv', name: '一星闪耀', goal: 'heroStars', target: 6, reward: { diamond: 40 }, ic: '⭐' },
    { id: 'a_star18', kind: 'achv', name: '群星舰队', goal: 'heroStars', target: 18, reward: { diamond: 150 }, ic: '✨' },
    { id: 'a_talent5', kind: 'achv', name: '初窥门径', goal: 'talentPoints', target: 5, reward: { diamond: 30 }, ic: '🌟' },
    { id: 'a_talent12', kind: 'achv', name: '天赋异禀', goal: 'talentPoints', target: 12, reward: { diamond: 80 }, ic: '🌠' },
    { id: 'a_talent22', kind: 'achv', name: '流派大成', goal: 'talentPoints', target: 22, reward: { diamond: 150 }, ic: '🏅' },
    { id: 'a_affix3', kind: 'achv', name: '词缀猎人', goal: 'affix3', target: 1, reward: { diamond: 60 }, ic: '✦' },
];

export function questDef(id: string): QuestDef | undefined {
    return QUEST_DEFS.find(q => q.id === id);
}

/** 当前某目标的累计进度值（成就与每日任务共用；每日走当日增量） */
export type ProgressGetter = (goal: QuestGoal, target: number) => number;

interface QuestSave {
    /** 每日块：自然日 + 当日进度 + 已领任务 id */
    dailyDate: string;
    dailyProgress: Partial<Record<QuestGoal, number>>;
    dailyClaimed: string[];
    /** 成就已领 id（进度实时算，不存） */
    achvClaimed: string[];
    /** 累计计数器（成就进度来源；totalKills/stageCleared 读 GameManager，其余自存） */
    clears: number;
    goldEarned: number;
    ads: number;
    /** 扩展计数器：宝石镶嵌/合成/分解/技能升级（动作成功 +1） */
    gems: number;
    combines: number;
    salvages: number;
    skills: number;
}

export class QuestSystem {
    private static _inst: QuestSystem | null = null;
    static get instance(): QuestSystem {
        if (!this._inst) {
            this._inst = new QuestSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-quests';

    private _data: QuestSave = {
        dailyDate: '', dailyProgress: {}, dailyClaimed: [], achvClaimed: [],
        clears: 0, goldEarned: 0, ads: 0, gems: 0, combines: 0, salvages: 0, skills: 0,
    };

    private constructor() {
        this._load();
        this._rollDay();
        this._wireEvents();
    }

    // ================= 查询 =================

    /** 某任务当前进度值（成就=累计口径；每日=当日口径） */
    progress(def: QuestDef): number {
        const gm = GameManager.instance;
        if (def.kind === 'daily') {
            return Math.min(def.target, this._data.dailyProgress[def.goal] ?? 0);
        }
        switch (def.goal) {
            case 'kills': return Math.min(def.target, gm.totalKills);
            case 'stage': return Math.min(def.target, gm.stageCleared);
            case 'heroes': return Math.min(def.target, gm.ownedHeroes.length);
            case 'clears': return Math.min(def.target, this._data.clears);
            case 'goldEarned': return Math.min(def.target, this._data.goldEarned);
            case 'ads': return Math.min(def.target, this._data.ads);
            case 'gems': return Math.min(def.target, this._data.gems);
            case 'combines': return Math.min(def.target, this._data.combines);
            case 'salvages': return Math.min(def.target, this._data.salvages);
            case 'skills': return Math.min(def.target, this._data.skills);
            case 'buildings': return Math.min(def.target, this._buildingSum(gm));
            case 'endlessWave': return Math.min(def.target, gm.bestWave);
            case 'trialFloor': return Math.min(def.target, TrialSystem.instance.maxFloor);
            case 'recruits': return Math.min(def.target, RecruitSystem.instance.totalRecruits);
            case 'heroStars': return Math.min(def.target, RecruitSystem.instance.starSum);
            // 天赋用"已投入点数"而非派生总点数：洗点会让进度回落，符合"真的练过这棵树"的语义
            case 'talentPoints': return Math.min(def.target, TalentSystem.instance.spent);
            case 'affix3': return Math.min(def.target, this._affix3Count(gm));
        }
    }

    /** 满词缀装备件数（背包 + 已穿，词缀数达到上限 3 件数；用于「词缀猎人」成就） */
    private _affix3Count(gm: GameManager): number {
        let n = 0;
        for (const it of gm.bag) {
            if ((it.affixes?.length ?? 0) >= AFFIX_MAX) {
                n++;
            }
        }
        for (const hid in gm.equips) {
            const slots = gm.equips[hid];
            for (const s in slots) {
                if ((slots[s]?.affixes?.length ?? 0) >= AFFIX_MAX) {
                    n++;
                }
            }
        }
        return n;
    }

    /** 建筑等级总和（基地建设者成就进度） */
    private _buildingSum(gm: GameManager): number {
        let sum = 0;
        for (const id in gm.buildingLevels) {
            sum += gm.buildingLevels[id] ?? 0;
        }
        return sum;
    }

    isComplete(def: QuestDef): boolean {
        return this.progress(def) >= def.target;
    }

    isClaimed(def: QuestDef): boolean {
        return def.kind === 'daily'
            ? this._data.dailyClaimed.indexOf(def.id) >= 0
            : this._data.achvClaimed.indexOf(def.id) >= 0;
    }

    /** 是否可领奖（完成且未领） */
    canClaim(def: QuestDef): boolean {
        return this.isComplete(def) && !this.isClaimed(def);
    }

    /** 是否有可领奖任务（红点用） */
    hasClaimable(): boolean {
        return QUEST_DEFS.some(q => this.canClaim(q));
    }

    // ================= 操作 =================

    /** 领奖：发钻石/金币并落盘；返回 false 表示不可领 */
    claim(def: QuestDef): boolean {
        if (!this.canClaim(def)) {
            return false;
        }
        const gm = GameManager.instance;
        if (def.reward.diamond) {
            gm.res.add('diamond', def.reward.diamond);
        }
        if (def.reward.gold) {
            gm.res.add('gold', def.reward.gold);
        }
        gm.save();
        if (def.kind === 'daily') {
            this._data.dailyClaimed.push(def.id);
        } else {
            this._data.achvClaimed.push(def.id);
        }
        this._save();
        return true;
    }

    /** 每日任务文案（跨天刷新红点用） */
    get dailyDate(): string {
        return this._data.dailyDate;
    }

    // ================= 动作打点（扩展成就进度，动作成功后调用） =================

    /** 镶嵌一颗宝石 */
    trackGem(): void {
        this._data.gems++;
        this._save();
    }

    /** 合成一件装备 */
    trackCombine(): void {
        this._data.combines++;
        this._save();
    }

    /** 分解一件装备 */
    trackSalvage(): void {
        this._data.salvages++;
        this._save();
    }

    /** 升一级技能 */
    trackSkill(): void {
        this._data.skills++;
        this._save();
    }

    // ================= 内部 =================

    /** 跨自然日重置每日进度与领奖记录 */
    private _rollDay(): void {
        const today = QuestSystem._today();
        if (this._data.dailyDate !== today) {
            this._data.dailyDate = today;
            this._data.dailyProgress = {};
            this._data.dailyClaimed = [];
            this._save();
        }
    }

    private _bumpDaily(goal: QuestGoal, n: number): void {
        this._data.dailyProgress[goal] = (this._data.dailyProgress[goal] ?? 0) + n;
    }

    private _wireEvents(): void {
        // 每杀：总击杀 + 当日击杀
        eventCenter.on(GameEvent.ENEMY_DEAD, () => {
            this._bumpDaily('kills', 1);
            this._save();
        }, this);
        // 通关（含失败局不误计）：通关数 + 当日通关；stageCleared 由 markStageCleared 落盘
        eventCenter.on(GameEvent.STAGE_CLEAR, () => {
            this._data.clears++;
            this._bumpDaily('clears', 1);
            this._save();
        }, this);
        // 战斗内赚金币（BattleManager 广播）
        eventCenter.on(GameEvent.GOLD_EARNED, (amount: number) => {
            const n = Math.max(0, Math.floor(amount ?? 0));
            this._data.goldEarned += n;
            this._bumpDaily('goldEarned', n);
            this._save();
        }, this);
        // 每次看完广告
        eventCenter.on(GameEvent.AD_END, () => {
            this._data.ads++;
            this._save();
        }, this);
    }

    private static _today(): string {
        const d = new Date();
        const p = (n: number) => (n < 10 ? '0' : '') + n;
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(QuestSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    this._data = {
                        dailyDate: String(d.dailyDate ?? ''),
                        dailyProgress: d.dailyProgress ?? {},
                        dailyClaimed: Array.isArray(d.dailyClaimed) ? d.dailyClaimed : [],
                        achvClaimed: Array.isArray(d.achvClaimed) ? d.achvClaimed : [],
                        clears: Math.max(0, Math.floor(d.clears ?? 0)),
                        goldEarned: Math.max(0, Math.floor(d.goldEarned ?? 0)),
                        ads: Math.max(0, Math.floor(d.ads ?? 0)),
                        gems: Math.max(0, Math.floor(d.gems ?? 0)),
                        combines: Math.max(0, Math.floor(d.combines ?? 0)),
                        salvages: Math.max(0, Math.floor(d.salvages ?? 0)),
                        skills: Math.max(0, Math.floor(d.skills ?? 0)),
                    };
                }
            }
        } catch {
            // 坏档回默认
        }
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        sys.localStorage.setItem(QuestSystem.SAVE_KEY, JSON.stringify(this._data));
    }
}
