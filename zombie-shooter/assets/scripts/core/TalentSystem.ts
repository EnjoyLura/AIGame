import { sys } from 'cc';
import { GameManager } from './GameManager';
import { TrialSystem } from './TrialSystem';
import { RecruitSystem } from './RecruitSystem';

/**
 * 天赋树系统（基地横幅入口）：
 * - 三条分支（火力/装甲/后勤），每分支 5 个节点，同分支内需前一节点满级才解锁下一个。
 * - 天赋点不靠金币购买（那是基地强化卡 META_UPGRADES 的职责），而是**按进度实时派生**：
 *   累计等级/5 + 通关关卡数 + 塔层/5 + 招募次数/10。因此本系统只存节点等级，
 *   点数永远由其他系统现有 getter 算出，不存在存档漂移。
 * - 免费无限洗点：清空节点等级即等价退还全部点数（因为点数不落盘）。
 * - 持久化在独立 localStorage 键（与招募/试炼/图鉴/邮件/签到同口径）。
 */

export type TalentBranch = 'firearm' | 'armor' | 'logistics';

export interface TalentNodeDef {
    id: string;
    branch: TalentBranch;
    /** 分支内序号 0~4（决定解锁顺序与 UI 位置） */
    idx: number;
    name: string;
    ic: string;
    /** 效果文案（参数为该节点当前等级，用于展示"当前/下级"） */
    desc: (level: number) => string;
    maxLevel: number;
    /** 每级消耗天赋点 */
    pointCost: number;
}

export const TALENT_BRANCH_NAMES: Record<TalentBranch, string> = {
    firearm: '⚔️ 火力',
    armor: '🛡️ 装甲',
    logistics: '🎯 后勤',
};

export const TALENT_BRANCHES: TalentBranch[] = ['firearm', 'armor', 'logistics'];

/** 天赋节点总表（3 分支 × 5 节点；同分支 idx 递增解锁） */
export const TALENT_NODES: TalentNodeDef[] = [
    // ===== 火力 =====
    {
        id: 'fire_1', branch: 'firearm', idx: 0, name: '弹头改良', ic: '💥', maxLevel: 3, pointCost: 1,
        desc: l => `全队攻击 +${l * 6}%（每级 +6%）`,
    },
    {
        id: 'fire_2', branch: 'firearm', idx: 1, name: '精准射击', ic: '🎯', maxLevel: 3, pointCost: 1,
        desc: l => `暴击率 +${l * 4}%（每级 +4%）`,
    },
    {
        id: 'fire_3', branch: 'firearm', idx: 2, name: '高燃火药', ic: '🔥', maxLevel: 3, pointCost: 2,
        desc: l => `全队攻击 +${l * 8}%（每级 +8%）`,
    },
    {
        id: 'fire_4', branch: 'firearm', idx: 3, name: '穿透弹芯', ic: '🗡️', maxLevel: 3, pointCost: 2,
        desc: l => `暴击伤害 +${l * 15}%（每级 +15%）`,
    },
    {
        id: 'fire_5', branch: 'firearm', idx: 4, name: '灭世火力', ic: '☄️', maxLevel: 1, pointCost: 4,
        desc: l => `全队攻击 +${l * 12}%`,
    },
    // ===== 装甲 =====
    {
        id: 'armor_1', branch: 'armor', idx: 0, name: '复合装甲', ic: '🛡️', maxLevel: 3, pointCost: 1,
        desc: l => `载具耐久 +${l * 8}%（每级 +8%）`,
    },
    {
        id: 'armor_2', branch: 'armor', idx: 1, name: '减震结构', ic: '🔧', maxLevel: 3, pointCost: 1,
        desc: l => `怪物啃咬伤害 −${l * 5}%（每级 −5%）`,
    },
    {
        id: 'armor_3', branch: 'armor', idx: 2, name: '自修复层', ic: '♻️', maxLevel: 3, pointCost: 2,
        desc: l => `载具每秒回复 ${(l * 0.4).toFixed(1)}% 耐久（每级 +0.4%）`,
    },
    {
        id: 'armor_4', branch: 'armor', idx: 3, name: '强化骨架', ic: '🦴', maxLevel: 3, pointCost: 2,
        desc: l => `载具耐久 +${l * 10}%（每级 +10%）`,
    },
    {
        id: 'armor_5', branch: 'armor', idx: 4, name: '方舟壁垒', ic: '🏰', maxLevel: 1, pointCost: 4,
        desc: l => `载具耐久 +${l * 15}% 且啃咬伤害 −${l * 10}%`,
    },
    // ===== 后勤 =====
    {
        id: 'logi_1', branch: 'logistics', idx: 0, name: '战地补给', ic: '📦', maxLevel: 3, pointCost: 1,
        desc: l => `金币获取 +${l * 6}%（每级 +6%）`,
    },
    {
        id: 'logi_2', branch: 'logistics', idx: 1, name: '情报网络', ic: '📡', maxLevel: 3, pointCost: 1,
        desc: l => `经验获取 +${l * 6}%（每级 +6%）`,
    },
    {
        id: 'logi_3', branch: 'logistics', idx: 2, name: '弹药回收', ic: '🔩', maxLevel: 3, pointCost: 2,
        desc: l => `金币获取 +${l * 8}%（每级 +8%）`,
    },
    {
        id: 'logi_4', branch: 'logistics', idx: 3, name: '极限训练', ic: '🎓', maxLevel: 3, pointCost: 2,
        desc: l => `经验获取 +${l * 8}%（每级 +8%）`,
    },
    {
        id: 'logi_5', branch: 'logistics', idx: 4, name: '末日经济', ic: '💰', maxLevel: 1, pointCost: 4,
        desc: l => `金币获取 +${l * 15}% 且经验获取 +${l * 15}%`,
    },
];

export function talentNode(id: string): TalentNodeDef | undefined {
    return TALENT_NODES.find(n => n.id === id);
}

/** 分支内全部节点（按 idx 升序） */
export function branchNodes(branch: TalentBranch): TalentNodeDef[] {
    return TALENT_NODES.filter(n => n.branch === branch).sort((a, b) => a.idx - b.idx);
}

/** 某分支全部点满所需点数（UI 进度口径：13 点/分支） */
export function branchPointTotal(branch: TalentBranch): number {
    let sum = 0;
    for (const n of branchNodes(branch)) {
        sum += n.maxLevel * n.pointCost;
    }
    return sum;
}

/**
 * 天赋点总数（纯函数，UI 与系统共用；全部由其他系统现有进度派生，不落盘）。
 * 累计等级/5 + 通关关卡数 + 塔层/5 + 招募次数/10。
 */
export function totalTalentPoints(): number {
    const gm = GameManager.instance;
    return Math.floor(gm.totalLevels / 5)
        + gm.stageCleared
        + Math.floor(TrialSystem.instance.maxFloor / 5)
        + Math.floor(RecruitSystem.instance.totalRecruits / 10);
}

// ================= 效果乘区（模块级导出，照 starAtkMul 的约定） =================

/** 某分支节点等级（内部：按 id 取） */
function lv(id: string): number {
    return TalentSystem.instance.level(id);
}

/**
 * 攻击乘区。
 * 弹头改良 +6%/级、高燃火药 +8%/级、灭世火力 +12%（满配 = ×1.42）。
 */
export function talentAtkMul(): number {
    return 1 + lv('fire_1') * 0.06 + lv('fire_3') * 0.08 + lv('fire_5') * 0.12;
}

/** 载具耐久乘区（复合装甲 +8%/级、强化骨架 +10%/级、方舟壁垒 +15%） */
export function talentVehHpMul(): number {
    return 1 + lv('armor_1') * 0.08 + lv('armor_4') * 0.10 + lv('armor_5') * 0.15;
}

/** 金币获取乘区（战地补给 +6%/级、弹药回收 +8%/级、末日经济 +15%） */
export function talentGoldMul(): number {
    return 1 + lv('logi_1') * 0.06 + lv('logi_3') * 0.08 + lv('logi_5') * 0.15;
}

/** 经验获取乘区（情报网络 +6%/级、极限训练 +8%/级、末日经济 +15%） */
export function talentXpMul(): number {
    return 1 + lv('logi_2') * 0.06 + lv('logi_4') * 0.08 + lv('logi_5') * 0.15;
}

/** 暴击率增量（精准射击 +4%/级，加到 BattleConfig.CRIT_CHANCE 上） */
export function talentCritChance(): number {
    return lv('fire_2') * 0.04;
}

/** 暴击伤害增量（穿透弹芯 +15%/级，加到 BattleConfig.CRIT_MULTI 上） */
export function talentCritMulti(): number {
    return lv('fire_4') * 0.15;
}

/** 啃咬减伤比例 0~1（减震结构 −5%/级、方舟壁垒 −10%；封顶 60%） */
export function talentBiteReduce(): number {
    return Math.min(0.6, lv('armor_2') * 0.05 + lv('armor_5') * 0.10);
}

/** 载具每秒耐久回复比例（自修复层 +0.4%/级） */
export function talentVehRegen(): number {
    return lv('armor_3') * 0.004;
}

interface TalentSave {
    /** 节点等级（nodeId → 0~maxLevel）；点数不落盘，由进度派生 */
    levels: Record<string, number>;
}

export class TalentSystem {
    private static _inst: TalentSystem | null = null;
    static get instance(): TalentSystem {
        if (!this._inst) {
            this._inst = new TalentSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-talent';

    private _data: TalentSave = { levels: {} };

    private constructor() {
        this._load();
    }

    // ================= 查询 =================

    /** 某节点当前等级 0~maxLevel */
    level(nodeId: string): number {
        const def = talentNode(nodeId);
        if (!def) {
            return 0;
        }
        return Math.min(def.maxLevel, Math.max(0, this._data.levels[nodeId] ?? 0));
    }

    isMaxed(nodeId: string): boolean {
        const def = talentNode(nodeId);
        return !!def && this.level(nodeId) >= def.maxLevel;
    }

    /** 前置节点（同分支 idx-1）是否已满级；分支首个节点恒解锁 */
    isUnlocked(nodeId: string): boolean {
        const def = talentNode(nodeId);
        if (!def) {
            return false;
        }
        if (def.idx <= 0) {
            return true;
        }
        const prev = branchNodes(def.branch).filter(n => n.idx === def.idx - 1)[0];
        return !!prev && this.isMaxed(prev.id);
    }

    /** 是否可加点：已解锁 且 未满级 且 可用点数够 */
    canUpgrade(nodeId: string): boolean {
        const def = talentNode(nodeId);
        if (!def || this.isMaxed(nodeId) || !this.isUnlocked(nodeId)) {
            return false;
        }
        return this.available >= def.pointCost;
    }

    /** 天赋点总数（派生：累计等级/通关/塔层/招募） */
    get total(): number {
        return totalTalentPoints();
    }

    /** 已花费点数 */
    get spent(): number {
        let sum = 0;
        for (const n of TALENT_NODES) {
            sum += this.level(n.id) * n.pointCost;
        }
        return sum;
    }

    /** 可用点数（总数 − 已花；不为负） */
    get available(): number {
        return Math.max(0, this.total - this.spent);
    }

    /** 某分支已投点数（UI 进度条） */
    spentIn(branch: TalentBranch): number {
        let sum = 0;
        for (const n of branchNodes(branch)) {
            sum += this.level(n.id) * n.pointCost;
        }
        return sum;
    }

    // ================= 操作 =================

    /** 加一点：点数由进度派生无需扣减，只记等级；返回新等级或 null */
    upgrade(nodeId: string): number | null {
        if (!this.canUpgrade(nodeId)) {
            return null;
        }
        const next = this.level(nodeId) + 1;
        this._data.levels[nodeId] = next;
        this._save();
        return next;
    }

    /** 洗点：清空全部节点等级（等价退还全部点数）；返回退还的点数 */
    reset(): number {
        const refund = this.spent;
        if (refund <= 0) {
            return 0;
        }
        this._data.levels = {};
        this._save();
        return refund;
    }

    // ================= 内部 =================

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(TalentSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object' && d.levels && typeof d.levels === 'object') {
                    const levels: Record<string, number> = {};
                    for (const def of TALENT_NODES) {
                        const v = Math.floor(d.levels[def.id] ?? 0);
                        if (v >= 1 && v <= def.maxLevel) {
                            levels[def.id] = v;
                        }
                    }
                    this._data = { levels };
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
        sys.localStorage.setItem(TalentSystem.SAVE_KEY, JSON.stringify(this._data));
    }
}
