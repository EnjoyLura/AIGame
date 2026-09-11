import { GameManager } from './GameManager';
import { RecruitSystem } from './RecruitSystem';

/**
 * 英雄羁绊系统（纯派生，不落盘）：
 * - 激活条件 = 羁绊成员都在编队且星级达标（毕业羁绊看全员星级合计）。
 *   编队后期天然满员（4 槽 = 4 英雄），星级门槛给抽卡升星一个明确目的。
 * - 加成全队生效、数值较小；攻击/载具耐久走 beginRun 乘区链，
 *   射速/射程/暴击在部署时一次性叠加到英雄实例（与装备加成同口径）。
 * - 每次读取实时重算，无缓存无漂移；换队/升星立即生效，无存档键。
 */

export interface BondEffect {
    /** 全队攻击乘区增量（0.06 = ×1.06） */
    atk?: number;
    /** 全队射速乘区增量（0.06 = 攻击间隔 ×0.94） */
    rate?: number;
    /** 全队射程乘区增量 */
    range?: number;
    /** 全队暴击率绝对增量（叠加到基础暴击率） */
    crit?: number;
    /** 载具耐久乘区增量 */
    vehHp?: number;
}

export interface BondDef {
    id: string;
    name: string;
    /** 羁绊成员英雄 id（毕业羁绊为全队 4 人） */
    members: string[];
    /** 成员各自所需星级（双人羁绊用） */
    starNeed?: number;
    /** 毕业羁绊：编队满员 + 全员在编队 + 星级合计达标 */
    starSumNeed?: number;
    ic: string;
    /** 效果文案（UI 展示） */
    desc: string;
    effect: BondEffect;
}

export const BOND_DEFS: BondDef[] = [
    {
        id: 'bond_cockpit', name: '正副驾驶', members: ['rifle', 'sniper'], starNeed: 2, ic: '🤝',
        desc: '全队暴击率 +4%', effect: { crit: 0.04 },
    },
    {
        id: 'bond_spectrum', name: '光谱协议', members: ['laser', 'radiation'], starNeed: 2, ic: '🌈',
        desc: '全队攻击 +6%', effect: { atk: 0.06 },
    },
    {
        id: 'bond_overload', name: '过载串联', members: ['rifle', 'laser'], starNeed: 3, ic: '⚡',
        desc: '全队射速 +6%', effect: { rate: 0.06 },
    },
    {
        id: 'bond_crossfire', name: '交叉火力', members: ['sniper', 'radiation'], starNeed: 3, ic: '🎯',
        desc: '全队射程 +8%', effect: { range: 0.08 },
    },
    {
        id: 'bond_ark', name: '末日航班', members: ['rifle', 'sniper', 'laser', 'radiation'], starSumNeed: 16, ic: '🛸',
        desc: '载具耐久 +15% 且全队攻击 +8%', effect: { vehHp: 0.15, atk: 0.08 },
    },
];

export function bondDef(id: string): BondDef | undefined {
    return BOND_DEFS.find(b => b.id === id);
}

/** 当前激活的羁绊（编队 × 星级实时派生） */
export function activeBonds(): BondDef[] {
    const gm = GameManager.instance;
    const rs = RecruitSystem.instance;
    const out: BondDef[] = [];
    for (const b of BOND_DEFS) {
        if (b.starSumNeed !== undefined) {
            // 毕业羁绊：编队满员、全员在编队、星级合计达标
            if (gm.lineup.length < GameManager.LINEUP_MAX) {
                continue;
            }
            let inLineup = true;
            let sum = 0;
            for (const id of b.members) {
                if (gm.lineup.indexOf(id) < 0) {
                    inLineup = false;
                    break;
                }
                sum += rs.stars(id);
            }
            if (inLineup && sum >= b.starSumNeed) {
                out.push(b);
            }
            continue;
        }
        const need = b.starNeed ?? 0;
        let all = true;
        for (const id of b.members) {
            if (gm.lineup.indexOf(id) < 0 || rs.stars(id) < need) {
                all = false;
                break;
            }
        }
        if (all) {
            out.push(b);
        }
    }
    return out;
}

// ================= 战斗乘区（模块级导出，照 talentAtkMul 的约定） =================

/** 全队攻击乘区（光谱协议 +6%、末日航班 +8%） */
export function bondAtkMul(): number {
    let add = 0;
    for (const b of activeBonds()) {
        add += b.effect.atk ?? 0;
    }
    return 1 + add;
}

/** 全队射速乘区（攻击间隔缩小的方向：过载串联 6% → 间隔 ×0.94） */
export function bondRateMul(): number {
    let add = 0;
    for (const b of activeBonds()) {
        add += b.effect.rate ?? 0;
    }
    return 1 - Math.min(0.3, add);
}

/** 全队射程乘区（交叉火力 +8%） */
export function bondRangeMul(): number {
    let add = 0;
    for (const b of activeBonds()) {
        add += b.effect.range ?? 0;
    }
    return 1 + add;
}

/** 全队暴击率绝对增量（正副驾驶 +4%） */
export function bondCritAdd(): number {
    let add = 0;
    for (const b of activeBonds()) {
        add += b.effect.crit ?? 0;
    }
    return add;
}

/** 载具耐久乘区（末日航班 +15%） */
export function bondVehHpMul(): number {
    let add = 0;
    for (const b of activeBonds()) {
        add += b.effect.vehHp ?? 0;
    }
    return 1 + add;
}
