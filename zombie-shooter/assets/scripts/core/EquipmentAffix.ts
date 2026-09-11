import { EquipTier } from './HeroSystem';

/**
 * 装备词缀系统（纯数据 + 纯函数，无存档）：
 * - 装备掉落/合成时按品质随机生成 0~3 条词缀，词缀**挂在具体那一件装备上**
 *   （同品质两件属性可以完全不同），这是与「品质 + 强化等级」正交的第二条养成线。
 * - 每条词缀给 2 条属性组合（流派向）：火力 / 速射 / 远程 / 暴击 / 均衡。
 * - 词缀数值只随**品质**插值，**不随强化等级放大**——否则高档强化会把词缀推到失控，
 *   而且会让「强化」与「刷词缀」两条线的收益互相污染。这是有意的设计选择。
 * - 本模块不落盘：词缀 id 列表存在 BagItem.affixes / EquipState.affixes 里，
 *   数值每次由 affixValue/affixSum 现算，因此不存在存档与数值漂移。
 */

export type AffixKey = 'atkPct' | 'ratePct' | 'rangePct' | 'critPct';

/** 词缀影响属性的展示名与格式（critPct 是绝对值，其余是千分位百分比） */
export const AFFIX_KEY_NAMES: Record<AffixKey, string> = {
    atkPct: '攻击',
    ratePct: '射速',
    rangePct: '射程',
    critPct: '暴击',
};

export interface AffixDef {
    id: string;
    name: string;
    ic: string;
    /** 两条属性（固定 2 条，保持"多属性组合"的流派感） */
    keys: [AffixKey, AffixKey];
    /** 两条属性在 [tier1 数值, tier6 数值] 区间内的取值；中间品质线性插值 */
    ranges: [[number, number], [number, number]];
    /** 展示配色 */
    color: string;
}

/** 词缀池：10 条，覆盖攻击/射速/射程/暴击的不同组合倾向 */
export const AFFIX_DEFS: AffixDef[] = [
    {
        id: 'af_rage', name: '狂暴', ic: '🔥', keys: ['atkPct', 'critPct'],
        ranges: [[0.06, 0.18], [0.02, 0.05]], color: '#ff7a5c',
    },
    {
        id: 'af_precise', name: '精准', ic: '🎯', keys: ['critPct', 'rangePct'],
        ranges: [[0.04, 0.09], [0.05, 0.12]], color: '#ffd76a',
    },
    {
        id: 'af_swift', name: '迅捷', ic: '⚡', keys: ['ratePct', 'atkPct'],
        ranges: [[0.05, 0.13], [0.03, 0.08]], color: '#8fe3ff',
    },
    {
        id: 'af_suppress', name: '压制', ic: '💢', keys: ['atkPct', 'ratePct'],
        ranges: [[0.05, 0.14], [0.03, 0.08]], color: '#ff9d45',
    },
    {
        id: 'af_eagle', name: '鹰眼', ic: '🦅', keys: ['rangePct', 'critPct'],
        ranges: [[0.08, 0.18], [0.02, 0.06]], color: '#7bd67b',
    },
    {
        id: 'af_pierce', name: '穿甲', ic: '🗡️', keys: ['atkPct', 'rangePct'],
        ranges: [[0.07, 0.16], [0.04, 0.10]], color: '#c07ef5',
    },
    {
        id: 'af_overload', name: '过载', ic: '💥', keys: ['ratePct', 'critPct'],
        ranges: [[0.08, 0.18], [0.01, 0.04]], color: '#ff9d45',
    },
    {
        id: 'af_bulwark', name: '铁壁', ic: '🛡️', keys: ['atkPct', 'rangePct'],
        ranges: [[0.04, 0.10], [0.06, 0.14]], color: '#5ab0f0',
    },
    {
        id: 'af_hunt', name: '猎杀', ic: '🐺', keys: ['critPct', 'ratePct'],
        ranges: [[0.03, 0.08], [0.04, 0.10]], color: '#ff5252',
    },
    {
        id: 'af_thunder', name: '雷霆', ic: '🌩️', keys: ['atkPct', 'ratePct'],
        ranges: [[0.06, 0.15], [0.04, 0.09]], color: '#8fe3ff',
    },
];

export function affixDef(id: string): AffixDef | undefined {
    return AFFIX_DEFS.find(a => a.id === id);
}

/** 词缀条数上限（读档钳制与生成共用） */
export const AFFIX_MAX = 3;

/**
 * 按品质决定词缀条数：低档少、高档多。
 * tier 1~2 → 1 条；tier 3~4 → 2 条；tier 5 → 3 条；tier 6 → 3 条（且数值取满档）。
 */
export function affixCount(tier: EquipTier): number {
    const t = Math.min(6, Math.max(1, Math.round(tier)));
    if (t >= 5) {
        return 3;
    }
    if (t >= 3) {
        return 2;
    }
    return 1;
}

/**
 * 掉落/合成时随机生成词缀 id 列表。
 * 同一件装备不重复词缀；低品质件有概率少给一条（保留"这件词缀不满"的遗憾感），
 * tier 6 恒定满条且数值取满档（见 affixValue 的 tier 参数）。
 */
export function rollAffixes(tier: EquipTier): string[] {
    const want = affixCount(tier);
    if (want <= 0) {
        return [];
    }
    // 低档件有 25% 概率少给一条（tier 5/6 不缩水，保证高档件手感）
    let n = want;
    if (tier <= 4 && Math.random() < 0.25) {
        n = Math.max(1, want - 1);
    }
    const pool: string[] = [];
    for (const a of AFFIX_DEFS) {
        pool.push(a.id);
    }
    const out: string[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return out;
}

/**
 * 词缀在指定品质下的数值（百分比小数）。
 * 品质 1 取区间下限、品质 6 取区间上限，中间线性插值。
 */
export function affixValue(affixId: string, tier: EquipTier, key: AffixKey): number {
    const def = affixDef(affixId);
    if (!def) {
        return 0;
    }
    for (let i = 0; i < def.keys.length; i++) {
        if (def.keys[i] !== key) {
            continue;
        }
        const lo = def.ranges[i][0];
        const hi = def.ranges[i][1];
        const t = (Math.min(6, Math.max(1, Math.round(tier))) - 1) / 5;
        return lo + (hi - lo) * t;
    }
    return 0;
}

/**
 * 一件装备的词缀合计（供 equipMulOf / _equipValue 使用）。
 * 传 undefined / 空数组返回全 0，因此老存档（无 affixes 字段）行为完全不变。
 */
export function affixSum(affixes: string[] | undefined, tier: EquipTier): Record<AffixKey, number> {
    const sum: Record<AffixKey, number> = { atkPct: 0, ratePct: 0, rangePct: 0, critPct: 0 };
    if (!affixes) {
        return sum;
    }
    for (const id of affixes) {
        const def = affixDef(id);
        if (!def) {
            continue;
        }
        for (let i = 0; i < def.keys.length; i++) {
            sum[def.keys[i]] += affixValue(id, tier, def.keys[i]);
        }
    }
    return sum;
}

/** 词缀数值文案：「攻击+12% 暴击+3%」 */
export function affixValueText(affixId: string, tier: EquipTier): string {
    const def = affixDef(affixId);
    if (!def) {
        return '';
    }
    const parts: string[] = [];
    for (const k of def.keys) {
        const v = Math.round(affixValue(affixId, tier, k) * 100);
        if (v > 0) {
            parts.push(`${AFFIX_KEY_NAMES[k]}+${v}%`);
        }
    }
    return parts.join(' ');
}

/** 单条词缀完整文案：「🔥 狂暴 · 攻击+12% 暴击+3%」 */
export function affixText(affixId: string, tier: EquipTier): string {
    const def = affixDef(affixId);
    if (!def) {
        return '';
    }
    return `${def.ic} ${def.name} · ${affixValueText(affixId, tier)}`;
}

/** 名称与配色（UI 分行渲染用） */
export function affixName(affixId: string): string {
    const def = affixDef(affixId);
    return def ? `${def.ic} ${def.name}` : '';
}

export function affixColor(affixId: string): string {
    return affixDef(affixId)?.color ?? '#8ba3c7';
}

/**
 * 读档净化：只保留合法词缀 id、去重、钳到上限。
 * 非数组/空 → undefined（保持老存档字段缺省的语义）。
 */
export function sanitizeAffixes(v: unknown): string[] | undefined {
    if (!Array.isArray(v)) {
        return undefined;
    }
    const out: string[] = [];
    for (const raw of v) {
        if (typeof raw !== 'string' || !affixDef(raw) || out.indexOf(raw) >= 0) {
            continue;
        }
        out.push(raw);
        if (out.length >= AFFIX_MAX) {
            break;
        }
    }
    return out.length > 0 ? out : undefined;
}
