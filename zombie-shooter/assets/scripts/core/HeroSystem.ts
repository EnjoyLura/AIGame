import { GameManager } from './GameManager';
import { QuestSystem } from './QuestSystem';
import { RecruitSystem, STAR_ATK_STEP, STAR_RATE_STEP } from './RecruitSystem';
import { ABILITY_MAX_LEVEL } from '../battle/HeroDef';
// HERO_LEVEL_MAX/EQUIP_UPGRADE_MAX 为未解锁基地时的基础上限；实际运行时上限由基地建筑等级动态决定

/** 技能槽位（持久化升级用）：普攻/技能/大招 */
export type AbilitySlot = 'basic' | 'skill' | 'ultimate';
export const ABILITY_SLOTS: AbilitySlot[] = ['basic', 'skill', 'ultimate'];
export const ABILITY_SLOT_NAMES: Record<AbilitySlot, string> = {
    basic: '普攻', skill: '技能', ultimate: '大招',
};
/** 技能升级费用曲线（金币）：Lv.1→2 = ABILITY_UPGRADE_BASE_COST，每级翻倍 */
export const ABILITY_UPGRADE_BASE_COST = 300;

/**
 * 英雄成长系统：五槽装备 + 主武器强化 + 武器核心（英雄等级玩法已移除）。
 * - 装备：每名英雄五槽（头盔/护甲/护腿/手套/战靴），固定装备池分四档品质，
 *   金币购买即穿上（同槽替换、旧件不返还），可继续金币强化（每级 +8% 本件属性）。
 * - 主武器：每英雄独立强化等级，每级攻击 +6%，上限 WEAPON_LEVEL_MAX。
 * - 武器核心：每英雄一个核心槽，嵌入后提供特殊效果（暴击/攻速/攻击加成），可替换。
 * - 数据真值存 GameManager（equips / weaponLv / weaponCores），
 *   本类只提供查询、消费与乘区计算；战斗侧在 beginRun 用 atkMulOf 合并攻击乘区、
 *   在部署后用 applyEquipStats 追加射速/射程/暴击加成。
 */

/** 装备槽位（六部位） */
export type EquipSlot = 'head' | 'body' | 'legs' | 'gloves' | 'wrist' | 'shoes';
export const EQUIP_SLOTS: EquipSlot[] = ['head', 'body', 'legs', 'gloves', 'wrist', 'shoes'];
export const EQUIP_SLOT_NAMES: Record<EquipSlot, string> = {
    head: '头盔', body: '护甲', legs: '护腿', gloves: '手套', wrist: '腕甲', shoes: '战靴',
};

/** 装备品质（tier 1-6 白绿蓝紫橙红）；品质越高属性与价格越高 */
export const EQUIP_TIER_NAMES = ['普通', '优秀', '稀有', '史诗', '传说', '神话'];
export const EQUIP_TIER_COLORS = ['#c8d2d8', '#7bd67b', '#5ab0f0', '#c07ef5', '#ff9d45', '#ff5252'];

/** 品质合法性（六档） */
export type EquipTier = 1 | 2 | 3 | 4 | 5 | 6;
export function isEquipTier(t: number): t is EquipTier {
    return t >= 1 && t <= 6;
}

/** 品质 → 展示档（bcell/good/clDrop 的 r 类名；白绿蓝紫橙红 = 1-6，白档不发光用 r1） */
export function tierRank(tier: number): number {
    return Math.min(6, Math.max(1, Math.round(tier)));
}

export interface EquipmentDef {
    id: string;
    slot: EquipSlot;
    name: string;
    /** 品质 1-6 */
    tier: EquipTier;
    /** 属性加成（百分比小数，如 0.12 = +12%）；强化每级再乘 1.08 */
    atkPct?: number;
    /** 射速加成（interval 缩小） */
    ratePct?: number;
    /** 射程加成 */
    rangePct?: number;
    /** 购买价格（金币） */
    baseCost: number;
}

/** 英雄等级玩法已移除；常量保留占位防止外部引用断裂（无运行时消费） */
export const HERO_LEVEL_MAX = 20;
export const HERO_LEVEL_ATK_STEP = 0.05;
export const HERO_UPGRADE_BASE_COST = 80;
export const HERO_UPGRADE_COST_MUL = 1.25;

/** 装备强化：每级 +8% 本件属性 */
export const EQUIP_UPGRADE_STEP = 0.08;
export const EQUIP_UPGRADE_MAX = 10;

export interface EquipState {
    /** 装备定义 id */
    id: string;
    /** 强化等级（1 起） */
    lv: number;
    /** 已镶宝石（杂物 id 列表，按孔位顺序；空/缺省 = 无宝石） */
    gems?: string[];
}

// ---- 主武器强化 ----

export const WEAPON_LEVEL_MAX = 20;
/** 主武器每级攻击加成 */
export const WEAPON_ATK_STEP = 0.06;
export const WEAPON_UPGRADE_BASE_COST = 200;
export const WEAPON_UPGRADE_COST_MUL = 1.3;

// ---- 武器核心 ----

export interface WeaponCoreDef {
    id: string;
    name: string;
    /** 品质 1-2 */
    tier: 1 | 2;
    /** 暴击率加成（绝对值，如 0.05 = +5%） */
    critPct?: number;
    /** 攻击加成 */
    atkPct?: number;
    /** 射速加成 */
    ratePct?: number;
    baseCost: number;
    desc: string;
}

/** 武器核心池：嵌入主武器获得特殊效果，同槽替换不返还 */
export const WEAPON_CORE_DEFS: WeaponCoreDef[] = [
    { id: 'core_crit1', name: '猎杀核心·I', tier: 1, critPct: 0.05, baseCost: 600, desc: '暴击率 +5%' },
    { id: 'core_crit2', name: '猎杀核心·II', tier: 2, critPct: 0.10, baseCost: 1800, desc: '暴击率 +10%' },
    { id: 'core_atk1', name: '强袭核心·I', tier: 1, atkPct: 0.10, baseCost: 500, desc: '攻击 +10%' },
    { id: 'core_atk2', name: '强袭核心·II', tier: 2, atkPct: 0.20, baseCost: 1600, desc: '攻击 +20%' },
    { id: 'core_rate1', name: '狂热核心·I', tier: 1, ratePct: 0.08, baseCost: 550, desc: '射速 +8%' },
    { id: 'core_rate2', name: '狂热核心·II', tier: 2, ratePct: 0.16, baseCost: 1700, desc: '射速 +16%' },
];

/** 固定装备池：五槽各 4 件，覆盖四档品质；属性倾向按部位差异化（低档可当过渡装） */
export const EQUIPMENT_DEFS: EquipmentDef[] = [
    // 头盔：攻击向（火控/观瞄在头部）
    { id: 'head_std', slot: 'head', name: '战术头盔', tier: 1, atkPct: 0.08, baseCost: 150 },
    { id: 'head_tactic', slot: 'head', name: '火控头盔', tier: 2, atkPct: 0.16, baseCost: 400 },
    { id: 'head_radar', slot: 'head', name: '雷达头盔', tier: 3, atkPct: 0.26, baseCost: 1000 },
    { id: 'head_neural', slot: 'head', name: '神经link头盔', tier: 4, atkPct: 0.40, baseCost: 2400 },
    // 护甲：攻击+射速均衡
    { id: 'body_std', slot: 'body', name: '制式护甲', tier: 1, atkPct: 0.05, ratePct: 0.03, baseCost: 160 },
    { id: 'body_alloy', slot: 'body', name: '合金护甲', tier: 2, atkPct: 0.10, ratePct: 0.06, baseCost: 420 },
    { id: 'body_exo', slot: 'body', name: '外骨骼护甲', tier: 3, atkPct: 0.16, ratePct: 0.10, baseCost: 1050 },
    { id: 'body_nano', slot: 'body', name: '纳米护甲', tier: 4, atkPct: 0.24, ratePct: 0.16, baseCost: 2500 },
    // 护腿：射程向（机动走位拉长输出距离）
    { id: 'legs_std', slot: 'legs', name: '制式护腿', tier: 1, rangePct: 0.08, baseCost: 130 },
    { id: 'legs_servo', slot: 'legs', name: '伺服护腿', tier: 2, rangePct: 0.15, baseCost: 380 },
    { id: 'legs_thrust', slot: 'legs', name: '推进护腿', tier: 3, rangePct: 0.24, baseCost: 950 },
    { id: 'legs_phase', slot: 'legs', name: '相位护腿', tier: 4, rangePct: 0.36, baseCost: 2300 },
    // 手套：射速向
    { id: 'gloves_std', slot: 'gloves', name: '战术手套', tier: 1, ratePct: 0.05, baseCost: 140 },
    { id: 'gloves_rapid', slot: 'gloves', name: '速射手套', tier: 2, ratePct: 0.10, baseCost: 400 },
    { id: 'gloves_gyro', slot: 'gloves', name: '陀螺手套', tier: 3, ratePct: 0.17, baseCost: 1000 },
    { id: 'gloves_quantum', slot: 'gloves', name: '量子手套', tier: 4, ratePct: 0.28, baseCost: 2400 },
    // 战靴：射程+攻速均衡
    { id: 'shoes_std', slot: 'shoes', name: '制式战靴', tier: 1, rangePct: 0.05, ratePct: 0.03, baseCost: 130 },
    { id: 'shoes_sprint', slot: 'shoes', name: '疾行战靴', tier: 2, rangePct: 0.10, ratePct: 0.05, baseCost: 370 },
    { id: 'shoes_blink', slot: 'shoes', name: '闪现战靴', tier: 3, rangePct: 0.16, ratePct: 0.09, baseCost: 950 },
    { id: 'shoes_warp', slot: 'shoes', name: '跃迁战靴', tier: 4, rangePct: 0.26, ratePct: 0.14, baseCost: 2300 },
    // 腕甲：攻击+攻速均衡（稳枪系）
    { id: 'wrist_std', slot: 'wrist', name: '制式腕甲', tier: 1, atkPct: 0.04, ratePct: 0.03, baseCost: 140 },
    { id: 'wrist_stable', slot: 'wrist', name: '稳枪腕甲', tier: 2, atkPct: 0.08, ratePct: 0.06, baseCost: 390 },
    { id: 'wrist_assault', slot: 'wrist', name: '突袭腕甲', tier: 3, atkPct: 0.13, ratePct: 0.10, baseCost: 980 },
    { id: 'wrist_rage', slot: 'wrist', name: '狂怒腕甲', tier: 4, atkPct: 0.20, ratePct: 0.16, baseCost: 2350 },
    // ===== 传说（tier 5，橙）=====
    { id: 'head_apex', slot: 'head', name: '天穹王冠', tier: 5, atkPct: 0.52, baseCost: 6200 },
    { id: 'body_dragon', slot: 'body', name: '龙魂战甲', tier: 5, atkPct: 0.32, ratePct: 0.20, baseCost: 6400 },
    { id: 'legs_comet', slot: 'legs', name: '彗星护腿', tier: 5, rangePct: 0.46, baseCost: 5900 },
    { id: 'gloves_star', slot: 'gloves', name: '摘星手套', tier: 5, ratePct: 0.36, baseCost: 6100 },
    { id: 'shoes_void', slot: 'shoes', name: '虚空之履', tier: 5, rangePct: 0.34, ratePct: 0.18, baseCost: 6000 },
    { id: 'wrist_dawn', slot: 'wrist', name: '破晓腕甲', tier: 5, atkPct: 0.27, ratePct: 0.21, baseCost: 6300 },
    // ===== 神话（tier 6，红）=====
    { id: 'head_ragnarok', slot: 'head', name: '诸神黄昏', tier: 6, atkPct: 0.68, baseCost: 15800 },
    { id: 'body_abyss', slot: 'body', name: '深渊主宰', tier: 6, atkPct: 0.42, ratePct: 0.26, baseCost: 16200 },
    { id: 'legs_galaxy', slot: 'legs', name: '星河行军', tier: 6, rangePct: 0.60, baseCost: 15000 },
    { id: 'gloves_eclipse', slot: 'gloves', name: '日蚀之握', tier: 6, ratePct: 0.47, baseCost: 15600 },
    { id: 'shoes_photon', slot: 'shoes', name: '光子跃迁', tier: 6, rangePct: 0.44, ratePct: 0.23, baseCost: 15400 },
    { id: 'wrist_blood', slot: 'wrist', name: '血月之刃', tier: 6, atkPct: 0.35, ratePct: 0.28, baseCost: 16000 },
];

// ================= 背包系统 =================

/** 背包内装备件（购买入库；穿戴时绑定到英雄，卸下回背包） */
export interface BagItem {
    /** 部位槽位 */
    slot: EquipSlot;
    /** 品质 1-6 */
    tier: EquipTier;
    /** 强化等级（购买时 1） */
    lv: number;
}

/** 由装备定义 id 解析背包件（购买入库用） */
export function bagItemFromDef(def: EquipmentDef): BagItem {
    return { slot: def.slot, tier: def.tier, lv: 1 };
}

/** 背包件的属性值（品质定基础，强化等级放大；与 EQUIPMENT_DEFS 数值对齐：tier n 基础≈同槽 tier n 件的 60%） */
export function bagItemValue(item: BagItem, key: 'atkPct' | 'ratePct' | 'rangePct'): number {
    // 背包件基础值 = 同槽同品质标准曲线（六档品质阶梯放大）
    const curve = [0, 0.06, 0.13, 0.21, 0.30, 0.40, 0.52];
    const base = curve[Math.min(6, Math.max(1, Math.round(item.tier)))];
    if (!base) {
        return 0;
    }
    return base * Math.pow(1 + EQUIP_UPGRADE_STEP, item.lv - 1);
}

/** 背包件显示名（品质 + 部位） */
export function bagItemName(item: BagItem): string {
    return `${EQUIP_TIER_NAMES[item.tier - 1]}${EQUIP_SLOT_NAMES[item.slot]}`;
}

/** 背包件购买价格（品质定价曲线） */
export function bagItemCost(item: BagItem): number {
    return Math.round(120 * Math.pow(2.1, item.tier - 1));
}

// ================= 杂物背包（宝石/材料/道具） =================

export type MiscKind = 'gem' | 'mat' | 'item';

/** 道具使用效果（仅有 use 字段的道具可使用） */
export interface MiscUseEffect {
    type: 'stamina' | 'gold';
    amount: number;
}

/** 杂物定义：宝石/材料/道具共用一张表，数量存 gm.misc */
export interface MiscItemDef {
    id: string;
    kind: MiscKind;
    name: string;
    /** 展示 emoji（与 SLOT_EMOJI 同风格） */
    ic: string;
    /** 稀有度 1-6（决定格子边框色，白绿蓝紫橙红） */
    tier: EquipTier;
    desc: string;
    /** 使用效果（仅道具可有；无此字段 = 不可使用，详情不显示使用按钮） */
    use?: MiscUseEffect;
}

/** 杂物表（对齐原型图 bag 数据：材料 4 种、宝石 4 种；道具为可用消耗品；品质白绿蓝紫橙红六档） */
export const MISC_ITEM_DEFS: MiscItemDef[] = [
    { id: 'mat_core', kind: 'mat', name: '英雄核心', ic: '⚙️', tier: 5, desc: '大招升级材料（基地·研究所使用）' },
    { id: 'mat_alloy', kind: 'mat', name: '精炼合金', ic: '🔩', tier: 4, desc: '装备强化材料（穿戴面板强化消耗）' },
    { id: 'mat_stone', kind: 'mat', name: '强化石', ic: '🧱', tier: 2, desc: '武器强化材料（分解装备/关卡产出）' },
    { id: 'mat_blueprint', kind: 'mat', name: '改装图纸', ic: '🔧', tier: 4, desc: '载具改装图纸（基地·载具工坊使用）' },
    { id: 'gem_fire', kind: 'gem', name: '赤焰石', ic: '🔴', tier: 4, desc: '攻击宝石 · 镶嵌装备：攻击 +6%' },
    { id: 'gem_wind', kind: 'gem', name: '疾风羽', ic: '🟢', tier: 2, desc: '射速宝石 · 镶嵌装备：射速 +4%' },
    { id: 'gem_ice', kind: 'gem', name: '寒冰晶', ic: '🔵', tier: 3, desc: '射程宝石 · 镶嵌装备：射程 +5%' },
    { id: 'gem_thunder', kind: 'gem', name: '雷光石', ic: '🟡', tier: 5, desc: '暴击宝石 · 镶嵌装备：暴击率 +3%' },
    { id: 'item_stamina', kind: 'item', name: '体力药水', ic: '⚡', tier: 3, desc: '使用后恢复 10 点体力', use: { type: 'stamina', amount: 10 } },
    { id: 'item_goldbox', kind: 'item', name: '金币箱', ic: '🎁', tier: 3, desc: '使用后获得 100 金币', use: { type: 'gold', amount: 100 } },
];

export function miscDef(id: string): MiscItemDef | undefined {
    return MISC_ITEM_DEFS.find(m => m.id === id);
}

// ================= 宝石镶嵌 =================

/** 宝石镶嵌效果（镶嵌到已穿戴装备上生效；value 为百分比小数） */
export interface GemEffect {
    /** 镶嵌消耗的杂物 id（MISC_ITEM_DEFS 中 kind='gem'） */
    miscId: string;
    key: 'atkPct' | 'ratePct' | 'rangePct' | 'critPct';
    value: number;
}

/** 宝石效果表：赤焰=攻、疾风=速、寒冰=程、雷光=暴击 */
export const GEM_EFFECTS: GemEffect[] = [
    { miscId: 'gem_fire', key: 'atkPct', value: 0.06 },
    { miscId: 'gem_wind', key: 'ratePct', value: 0.04 },
    { miscId: 'gem_ice', key: 'rangePct', value: 0.05 },
    { miscId: 'gem_thunder', key: 'critPct', value: 0.03 },
];

export function gemEffect(miscId: string): GemEffect | undefined {
    return GEM_EFFECTS.find(g => g.miscId === miscId);
}

/** 装备孔数按品质：白绿 1 孔、蓝紫 2 孔、橙红 3 孔 */
export function gemSlots(tier: EquipTier): number {
    return tier >= 5 ? 3 : tier >= 3 ? 2 : 1;
}

/** 镶嵌费用（金币/次，随品质上浮） */
export function gemSocketCost(tier: EquipTier): number {
    return 200 * tier;
}

// ================= 装备合成与分解（背包工坊） =================

/** 合成消耗：同槽同品质 3 件 → 1 件更高品质（品质+1，最高 6） */
export const COMBINE_COST_N = 3;
/** 分解产出：件 → 强化石 ×N（按品质阶梯） */
export function salvageStoneYield(tier: EquipTier): number {
    return [0, 8, 16, 30, 50, 80, 120][Math.min(6, Math.max(1, tier))];
}
/** 分解产出：紫及以上额外返还精炼合金 ×N */
export function salvageAlloyYield(tier: EquipTier): number {
    return tier >= 4 ? tier - 3 : 0;
}

/**
 * 背包合成：同 slot 同 tier 的 3 件合 1 件 tier+1（lv 取三件中最高强化级）。
 * 成功返回新件；材料不足/已满品质返回 null（不改动背包）。
 */
function combineBagItems(slot: EquipSlot, tier: EquipTier): BagItem | null {
    const gm = GameManager.instance;
    if (tier >= 6) {
        return null;
    }
    const idxAll: number[] = [];
    gm.bag.forEach((it, i) => {
        if (it.slot === slot && it.tier === tier) {
            idxAll.push(i);
        }
    });
    if (idxAll.length < COMBINE_COST_N) {
        return null;
    }
    // 取强化等级最高的 3 件（索引降序删除防串位）
    idxAll.sort((a, b) => gm.bag[b].lv - gm.bag[a].lv);
    const used = idxAll.slice(0, COMBINE_COST_N);
    const maxLv = used.reduce((m, i) => Math.max(m, gm.bag[i].lv), 1);
    used.sort((a, b) => b - a);
    for (const i of used) {
        gm.bag.splice(i, 1);
    }
    const nextTier = (tier + 1) as EquipTier;
    const newItem: BagItem = { slot, tier: nextTier, lv: maxLv };
    gm.bag.push(newItem);
    return newItem;
}

/** 背包某槽某品质可合成组数 */
export function combineGroupCount(slot: EquipSlot, tier: EquipTier): number {
    const gm = GameManager.instance;
    let n = 0;
    for (const it of gm.bag) {
        if (it.slot === slot && it.tier === tier) {
            n++;
        }
    }
    return Math.floor(n / COMBINE_COST_N);
}

/**
 * 背包分解：移除一件，产出强化石（各品质均有）与精炼合金（紫+）入杂物库存。
 * index 非法返回 null；成功返回产出（用于展示）。
 */
export function salvageBagItem(index: number): { stone: number; alloy: number } | null {
    const gm = GameManager.instance;
    const item = gm.bag[index];
    if (!item) {
        return null;
    }
    gm.bag.splice(index, 1);
    const stone = salvageStoneYield(item.tier);
    const alloy = salvageAlloyYield(item.tier);
    gm.misc['mat_stone'] = (gm.misc['mat_stone'] ?? 0) + stone;
    if (alloy > 0) {
        gm.misc['mat_alloy'] = (gm.misc['mat_alloy'] ?? 0) + alloy;
    }
    return { stone, alloy };
}

/** 掉落物描述：结算面板展示 + 落袋凭据（kind 决定入哪个包） */
export interface LootDrop {
    kind: 'equip' | 'core' | 'misc';
    /** equip：品质；core/misc：MISC_ITEM_DEFS id */
    slot?: EquipSlot;
    tier: number;
    id?: string;
    name: string;
    ic: string;
}

/** 掉落稀有度着色（与装备品质色一致，misc tier 5 金色） */
export function lootDropColor(drop: LootDrop): string {
    const t = Math.min(6, Math.max(1, Math.round(drop.tier)));
    return EQUIP_TIER_COLORS[t - 1];
}

/** 背包内随机一件装备（掉落掷点用；背包为空返回 null） */
function randomBagDrop(): BagItem | null {
    const gm = GameManager.instance;
    if (gm.bag.length === 0) {
        return null;
    }
    return gm.bag[Math.floor(Math.random() * gm.bag.length)];
}

/**
 * 关卡通关掉落掷点（小概率珍贵物，总掉率约 24%）：
 * 1. 核心材料「英雄核心」6%；2. 稀有杂物（雷光石/改装图纸）5%；3. 装备 13%（品质阶梯内随机）。
 * 命中多档时全部发放（掉落物之间独立掷点）。
 */
export function rollStageClearDrops(stageId: number, diffMul = 1): LootDrop[] {
    const drops: LootDrop[] = [];
    const luck = lootLuck(stageId) * diffMul;
    // ① 武器核心材料（珍贵）
    if (Math.random() < LOOT_RATES.core * luck) {
        const d = miscDef('mat_core');
        if (d) {
            drops.push({ kind: 'misc', tier: d.tier, id: d.id, name: d.name, ic: d.ic });
        }
    }
    // ② 稀有杂物（雷光石 / 改装图纸二选一）
    if (Math.random() < LOOT_RATES.rare * luck) {
        const d = miscDef(Math.random() < 0.5 ? 'gem_thunder' : 'mat_blueprint');
        if (d) {
            drops.push({ kind: 'misc', tier: d.tier, id: d.id, name: d.name, ic: d.ic });
        }
    }
    // ③ 装备（品质阶梯：白 22% 绿 28% 蓝 25% 紫 15% 橙 7% 红 3%；部位从装备池随机）
    if (Math.random() < LOOT_RATES.equip * luck) {
        const r = Math.random();
        const tier: EquipTier = r < 0.22 ? 1 : r < 0.50 ? 2 : r < 0.75 ? 3 : r < 0.90 ? 4 : r < 0.97 ? 5 : 6;
        const pool = EQUIPMENT_DEFS.filter(d => d.tier === tier);
        const def = (pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null)
            ?? null;
        if (def) {
            drops.push({ kind: 'equip', slot: def.slot, tier: def.tier, name: def.name, ic: '🎁' });
        } else {
            const bagIt = randomBagDrop();
            if (bagIt) {
                drops.push({ kind: 'equip', slot: bagIt.slot, tier: bagIt.tier, name: bagItemName(bagIt), ic: '🎁' });
            }
        }
    }
    return drops;
}

/** 掉落物入包（装备进装备背包随机强化等级 1~3，核心/杂物进杂物库存；返回成功入包数） */
export function grantLootDrops(drops: LootDrop[]): number {
    const gm = GameManager.instance;
    let n = 0;
    for (const drop of drops) {
        if (drop.kind === 'equip' && drop.slot) {
            const lv = 1 + Math.floor(Math.random() * 3);
            gm.bag.push({ slot: drop.slot, tier: (Math.min(6, Math.max(1, drop.tier)) as EquipTier), lv });
            n++;
        } else if ((drop.kind === 'core' || drop.kind === 'misc') && drop.id && miscDef(drop.id)) {
            gm.misc[drop.id] = (gm.misc[drop.id] ?? 0) + 1;
            n++;
        }
    }
    if (n > 0) {
        gm.save();
    }
    return n;
}

/** 掉落基础概率（rollStageClearDrops 与战斗页预览共用，改掉率只改这里） */
export const LOOT_RATES = { core: 0.06, rare: 0.05, equip: 0.13 };
/** 掉率随关卡上浮上限（每关 +3%，封顶 +30%） */
export function lootLuck(stageId: number): number {
    return 1 + Math.min(0.3, (Math.max(1, stageId) - 1) * 0.03);
}

/** 掉落概率文案（战斗页预览用）：各档位显示概率百分数；diffMul=难度奖励倍率 */
export function lootRateText(stageId: number, diffMul = 1): { core: string; rare: string; equip: string } {
    const k = lootLuck(stageId) * diffMul;
    const pct = (v: number) => `${Math.round(v * k * 100)}%`;
    return { core: pct(LOOT_RATES.core), rare: pct(LOOT_RATES.rare), equip: pct(LOOT_RATES.equip) };
}

/** 杂物库存表：id → 数量（存档持久化，缺省给一组初始物资） */
export const MISC_STARTER: Record<string, number> = {
    mat_core: 12, mat_alloy: 48, mat_stone: 320, mat_blueprint: 6,
    gem_fire: 6, gem_ice: 4, gem_thunder: 2, gem_wind: 8,
    item_stamina: 3, item_goldbox: 2,
};

/** 英雄解锁价格表（商城一次性买断；未收录的英雄不可购买） */
export const HERO_PRICES: Record<string, number> = {
    rifle: 0,       // 初始拥有
    sniper: 1500,
    laser: 2500,
    radiation: 2000,
};

/**
 * 星级攻击乘区（每星 +8%，0 星 = ×1，6 星 = ×1.48）。
 * 独立成函数是因为装备工坊/排行榜等展示侧也需要单独口径。
 */
export function starAtkMul(heroId: string): number {
    return 1 + RecruitSystem.instance.stars(heroId) * STAR_ATK_STEP;
}

/** 星级射速乘区（每星 +3%，0 星 = ×1，6 星 = ×1.18） */
export function starRateMul(heroId: string): number {
    return 1 + RecruitSystem.instance.stars(heroId) * STAR_RATE_STEP;
}

export class HeroSystem {
    static readonly HERO_PRICES = HERO_PRICES;

    private static _inst: HeroSystem | null = null;
    static get instance(): HeroSystem {
        if (!this._inst) {
            this._inst = new HeroSystem();
        }
        return this._inst;
    }

    private constructor() { }

    private get _gm(): GameManager { return GameManager.instance; }

    // ================= 英雄等级（已移除等级玩法） =================
    // 等级玩法下线：英雄不再有等级/升级，仅保留恒定 1 级的兼容读取
    // （旧存档 heroLevels 字段留在存档中不读取不删除，防止回档）。

    heroLevel(_heroId: string): number {
        return 1;
    }

    /** 英雄等级攻击乘区：等级玩法移除后恒为 1.0 */
    heroAtkMul(_heroId: string): number {
        return 1;
    }

    // ================= 主武器强化 =================

    weaponLevel(heroId: string): number {
        return this._gm.weaponLv[heroId] ?? 1;
    }

    weaponUpgradeCost(heroId: string): number {
        return Math.round(WEAPON_UPGRADE_BASE_COST * Math.pow(WEAPON_UPGRADE_COST_MUL, this.weaponLevel(heroId) - 1));
    }

    /** 武器强化材料需求：强化石 ×N（随等级缓增） */
    weaponUpgradeStone(heroId: string): number {
        return 2 + Math.floor((this.weaponLevel(heroId) - 1) / 2);
    }

    isWeaponMaxLevel(heroId: string): boolean {
        return this.weaponLevel(heroId) >= WEAPON_LEVEL_MAX;
    }

    /** 主武器攻击乘区（Lv.1 = 1.0） */
    weaponAtkMul(heroId: string): number {
        return 1 + WEAPON_ATK_STEP * (this.weaponLevel(heroId) - 1);
    }

    /** 金币+强化石强化主武器；成功返回 true */
    upgradeWeapon(heroId: string): boolean {
        if (!this._gm.isHeroOwned(heroId) || this.isWeaponMaxLevel(heroId)) {
            return false;
        }
        if (!this._gm.res.spend('gold', this.weaponUpgradeCost(heroId))) {
            return false;
        }
        // 材料消耗口：强石化不足则退回金币
        if (this.miscCount('mat_stone') < this.weaponUpgradeStone(heroId)) {
            this._gm.res.add('gold', this.weaponUpgradeCost(heroId));
            return false;
        }
        this._gm.misc['mat_stone'] = this.miscCount('mat_stone') - this.weaponUpgradeStone(heroId);
        this._gm.weaponLv[heroId] = this.weaponLevel(heroId) + 1;
        this._gm.save();
        return true;
    }

    // ================= 武器核心 =================

    coreDef(coreId: string): WeaponCoreDef | null {
        return WEAPON_CORE_DEFS.find(c => c.id === coreId) ?? null;
    }

    /** 某英雄已嵌武器核心（无则 null） */
    weaponCore(heroId: string): WeaponCoreDef | null {
        const id = this._gm.weaponCores[heroId]?.id;
        return id ? this.coreDef(id) : null;
    }

    /** 金币购买核心并嵌入主武器（同槽替换不返还） */
    buyCore(heroId: string, coreId: string): boolean {
        const def = this.coreDef(coreId);
        if (!def || !this._gm.isHeroOwned(heroId)) {
            return false;
        }
        if (!this._gm.res.spend('gold', def.baseCost)) {
            return false;
        }
        this._gm.weaponCores[heroId] = { id: coreId };
        this._gm.save();
        return true;
    }

    /** 拆除核心（免费，核心销毁） */
    removeCore(heroId: string): boolean {
        if (!this._gm.weaponCores[heroId]) {
            return false;
        }
        delete this._gm.weaponCores[heroId];
        this._gm.save();
        return true;
    }

    // ================= 技能等级（持久化） =================

    private _abilityKey(heroId: string, slot: AbilitySlot): string {
        return `${heroId}:${slot}`;
    }

    /** 持久化技能等级（普攻缺省 1 恒可用；技能/大招缺省 0=未解锁，主城购买或局内升级卡解锁） */
    abilityLevel(heroId: string, slot: AbilitySlot): number {
        if (slot === 'basic') {
            return this._gm.skillLevels[this._abilityKey(heroId, slot)] ?? 1;
        }
        return this._gm.skillLevels[this._abilityKey(heroId, slot)] ?? 0;
    }

    isAbilityMaxLevel(heroId: string, slot: AbilitySlot): boolean {
        return this.abilityLevel(heroId, slot) >= this._gm.abilityLevelCap();
    }

    abilityUpgradeCost(heroId: string, slot: AbilitySlot): number {
        // 0 级（未解锁）也按 Lv.1→2 的价格购买（即解锁费），曲线不因 0 级打折
        const lv = Math.max(1, this.abilityLevel(heroId, slot));
        return Math.round(ABILITY_UPGRADE_BASE_COST * Math.pow(2, lv - 1));
    }

    /** 技能升级材料需求：英雄核心 ×N（等级越高耗越多；升级预览与扣料共用） */
    abilityUpgradeCore(heroId: string, slot: AbilitySlot): number {
        const lv = Math.max(1, this.abilityLevel(heroId, slot));
        return lv;
    }

    /** 金币+英雄核心升级技能；成功返回 true（未拥有英雄/已满级/未解锁拒绝） */
    upgradeAbility(heroId: string, slot: AbilitySlot): boolean {
        // 技能/大招只能通过局内升级三选一的解锁卡解锁（0 级不可在主城购买）
        if (!this._gm.isHeroOwned(heroId) || this.isAbilityMaxLevel(heroId, slot)) {
            return false;
        }
        if (slot !== 'basic' && this.abilityLevel(heroId, slot) <= 0) {
            return false;
        }
        if (!this._gm.res.spend('gold', this.abilityUpgradeCost(heroId, slot))) {
            return false;
        }
        // 材料消耗口：英雄核心不足则退回金币
        const coreNeed = this.abilityUpgradeCore(heroId, slot);
        if (this.miscCount('mat_core') < coreNeed) {
            this._gm.res.add('gold', this.abilityUpgradeCost(heroId, slot));
            return false;
        }
        this._gm.misc['mat_core'] = this.miscCount('mat_core') - coreNeed;
        this._gm.skillLevels[this._abilityKey(heroId, slot)] = this.abilityLevel(heroId, slot) + 1;
        this._gm.save();
        QuestSystem.instance.trackSkill();
        return true;
    }

    // ================= 装备与背包 =================

    equipDef(equipId: string): EquipmentDef | null {
        return EQUIPMENT_DEFS.find(e => e.id === equipId) ?? null;
    }

    /** 某英雄某槽当前装备（无则 null） */
    equipped(heroId: string, slot: EquipSlot): EquipState | null {
        return this._gm.equips[heroId]?.[slot] ?? null;
    }

    /** 已穿件强化费用（随品质与当前强化等级递增；背包件品质即 tier） */
    equipUpgradeCost(state: EquipState): number {
        const def = this.equipDef(state.id);
        const tier = def?.tier ?? 1;
        return Math.round(60 * tier * Math.pow(1.35, state.lv - 1));
    }

    /** 装备强化材料需求：精炼合金 ×N（品质越高、等级越高需求越大） */
    equipUpgradeAlloy(state: EquipState): number {
        const def = this.equipDef(state.id);
        const tier = def?.tier ?? (state.id.startsWith('bag:') ? Number(state.id.split(':')[2]) || 1 : 1);
        return 1 + Math.floor((tier - 1) / 2) + Math.floor((state.lv - 1) / 3);
    }

    isEquipMaxLevel(state: EquipState): boolean {
        return state.lv >= this._gm.equipUpgradeCap();
    }

    /** 商城购买装备：扣金币后入背包（不直接上身）；defId 必须在装备池内 */
    buyEquipToBag(defId: string): boolean {
        const def = this.equipDef(defId);
        if (!def) {
            return false;
        }
        if (!this._gm.res.spend('gold', def.baseCost)) {
            return false;
        }
        this._gm.bag.push(bagItemFromDef(def));
        this._gm.save();
        return true;
    }

    /** 背包中某槽的全部件（返回索引以便穿戴定位） */
    bagItemsOf(slot: EquipSlot): Array<{ index: number; item: BagItem }> {
        const out: Array<{ index: number; item: BagItem }> = [];
        this._gm.bag.forEach((item, index) => {
            if (item.slot === slot) {
                out.push({ index, item });
            }
        });
        return out;
    }

    /** 背包中是否有某槽的件（红点/置灰判断用） */
    hasBagItem(slot: EquipSlot): boolean {
        return this._gm.bag.some(item => item.slot === slot);
    }

    /**
     * 从背包穿戴：背包件复制到英雄对应槽（同槽旧件回背包），背包移除该件。
     * bagIndex 失效/槽位不符返回 false。
     */
    equipFromBag(heroId: string, bagIndex: number): boolean {
        const item = this._gm.bag[bagIndex];
        if (!item || !this._gm.isHeroOwned(heroId)) {
            return false;
        }
        if (!this._gm.equips[heroId]) {
            this._gm.equips[heroId] = {};
        }
        const slots = this._gm.equips[heroId];
        const cur = slots[item.slot];
        // 旧件回背包（保留强化等级）；新件上身
        if (cur) {
            const curDef = this.equipDef(cur.id);
            if (curDef) {
                this._gm.bag.push({ slot: curDef.slot, tier: curDef.tier, lv: cur.lv });
            }
        }
        // 新件以 BagItem 身份上身：equips 结构兼容（id 存 bag: 前缀虚拟 id，真实属性按 slot+tier 查）
        slots[item.slot] = { id: `bag:${item.slot}:${item.tier}`, lv: item.lv };
        this._gm.bag.splice(bagIndex, 1);
        this._gm.save();
        return true;
    }

    /** 卸下某槽装备回背包（不销毁） */
    unequipToBag(heroId: string, slot: EquipSlot): boolean {
        const cur = this.equipped(heroId, slot);
        if (!cur) {
            return false;
        }
        const def = this.equipDef(cur.id);
        if (def) {
            // 旧定义件（id 非 bag: 前缀）
            this._gm.bag.push({ slot: def.slot, tier: def.tier, lv: cur.lv });
        } else if (cur.id.startsWith('bag:')) {
            const [, s, t] = cur.id.split(':');
            const tier = Number(t);
            const slotOk = EQUIP_SLOTS.indexOf(s as EquipSlot) >= 0;
            if (slotOk && isEquipTier(tier)) {
                this._gm.bag.push({ slot: s as EquipSlot, tier, lv: cur.lv });
            }
        }
        delete this._gm.equips[heroId][slot];
        this._gm.save();
        return true;
    }

    /** 金币+精炼合金强化某槽当前装备（+8% 本件属性/级） */
    upgradeEquip(heroId: string, slot: EquipSlot): boolean {
        const state = this.equipped(heroId, slot);
        if (!state || this.isEquipMaxLevel(state) || !this._gm.isHeroOwned(heroId)) {
            return false;
        }
        if (!this._gm.res.spend('gold', this.equipUpgradeCost(state))) {
            return false;
        }
        // 材料消耗口：精炼合金不足则退回金币
        if (this.miscCount('mat_alloy') < this.equipUpgradeAlloy(state)) {
            this._gm.res.add('gold', this.equipUpgradeCost(state));
            return false;
        }
        this._gm.misc['mat_alloy'] = this.miscCount('mat_alloy') - this.equipUpgradeAlloy(state);
        state.lv++;
        this._gm.save();
        return true;
    }

    /** 单件装备的属性值（含强化等级；返回百分比小数）——UI 展示用 */
    equipSlotValue(state: EquipState, key: 'atkPct' | 'ratePct' | 'rangePct'): number {
        return this._equipValue(state, key) + this._gemValue(state, key);
    }

    /** 单件装备上宝石对某属性的加成合计（critPct 也可查） */
    private _gemValue(state: EquipState, key: 'atkPct' | 'ratePct' | 'rangePct' | 'critPct'): number {
        let sum = 0;
        for (const gid of state.gems ?? []) {
            const eff = gemEffect(gid);
            if (eff && eff.key === key) {
                sum += eff.value;
            }
        }
        return sum;
    }

    /** 某英雄某槽当前宝石列表（无装备返回空） */
    equippedGems(heroId: string, slot: EquipSlot): string[] {
        return this.equipped(heroId, slot)?.gems ?? [];
    }

    /** 某槽可镶孔数（按品质；无装备返回 0） */
    gemSlotCount(heroId: string, slot: EquipSlot): number {
        const state = this.equipped(heroId, slot);
        if (!state) {
            return 0;
        }
        const def = this.equipDef(state.id);
        const tier = def?.tier ?? (state.id.startsWith('bag:') ? Number(state.id.split(':')[2]) : 1);
        return gemSlots((isEquipTier(tier) ? tier : 1) as EquipTier);
    }

    /**
     * 镶嵌宝石：消耗杂物库存宝石 + 金币费用，填入第一个空孔。
     * 未拥有/无装备/孔满/库存或金币不足返回 false。
     */
    socketGem(heroId: string, slot: EquipSlot, miscId: string): boolean {
        const state = this.equipped(heroId, slot);
        const gm = this._gm;
        if (!state || !this._gm.isHeroOwned(heroId) || !gemEffect(miscId)) {
            return false;
        }
        const def = this.equipDef(state.id);
        const tierRaw = def?.tier ?? (state.id.startsWith('bag:') ? Number(state.id.split(':')[2]) : 1);
        const tier = (isEquipTier(tierRaw) ? tierRaw : 1) as EquipTier;
        const gems = state.gems ?? (state.gems = []);
        if (gems.length >= gemSlots(tier) || this.miscCount(miscId) < 1) {
            return false;
        }
        if (!gm.res.spend('gold', gemSocketCost(tier))) {
            return false;
        }
        gm.misc[miscId] = this.miscCount(miscId) - 1;
        gems.push(miscId);
        gm.save();
        QuestSystem.instance.trackGem();
        return true;
    }

    /** 拆卸某孔宝石（免费，宝石返还库存） */
    unsocketGem(heroId: string, slot: EquipSlot, index: number): boolean {
        const state = this.equipped(heroId, slot);
        const gm = this._gm;
        if (!state || !state.gems || index < 0 || index >= state.gems.length) {
            return false;
        }
        const id = state.gems.splice(index, 1)[0];
        gm.misc[id] = (gm.misc[id] ?? 0) + 1;
        gm.save();
        return true;
    }

    // ================= 背包合成与分解 =================

    /** 合成费用（金币/次，随目标品质上浮） */
    combineCost(targetTier: EquipTier): number {
        return 100 * targetTier;
    }

    /**
     * 合成一组：扣金币费用 + 三件同槽同品质 → 一件更高品质。
     * 成功返回新件；材料/金币不足或已满品质返回 null。
     */
    combine(heroId: string | null, slot: EquipSlot, tier: EquipTier): BagItem | null {
        const gm = this._gm;
        if (tier >= 6) {
            return null;
        }
        if (!gm.res.spend('gold', this.combineCost((tier + 1) as EquipTier))) {
            return null;
        }
        const item = combineBagItems(slot, tier);
        if (!item) {
            // 合成失败（材料被并发消耗）退还费用
            gm.res.add('gold', this.combineCost((tier + 1) as EquipTier));
            return null;
        }
        gm.save();
        QuestSystem.instance.trackCombine();
        return item;
    }

    /** 分解一件背包装备（产出强化石/精炼合金入杂物库存）；成功返回产出 */
    salvage(index: number): { stone: number; alloy: number } | null {
        const out = salvageBagItem(index);
        if (out) {
            this._gm.save();
            QuestSystem.instance.trackSalvage();
        }
        return out;
    }

    /** 单件装备的属性值（含强化等级；返回百分比小数）。bag: 前缀件按品质曲线取值 */
    private _equipValue(state: EquipState, key: 'atkPct' | 'ratePct' | 'rangePct'): number {
        if (state.id.startsWith('bag:')) {
            const [, , t] = state.id.split(':');
            const tier = Number(t);
            if (!isEquipTier(tier)) {
                return 0;
            }
            return bagItemValue({ slot: 'head', tier, lv: state.lv }, key);
        }
        const def = this.equipDef(state.id);
        const base = def?.[key] ?? 0;
        if (base <= 0) {
            return 0;
        }
        return base * Math.pow(1 + EQUIP_UPGRADE_STEP, state.lv - 1);
    }

    /**
     * 某英雄装备+核心+宝石汇总乘区：atk=攻击、rate=射速（interval 除数）、range=射程、crit=暴击加成。
     * rate 里含星级射速加成（星级乘区无独立调用点，挂在此处让 applyEquipStats 的既有通道自动生效）。
     */
    equipMulOf(heroId: string): { atk: number; rate: number; range: number; crit: number } {
        let atk = 0, rate = 0, range = 0, crit = 0;
        for (const slot of EQUIP_SLOTS) {
            const state = this.equipped(heroId, slot);
            if (!state) {
                continue;
            }
            atk += this._equipValue(state, 'atkPct') + this._gemValue(state, 'atkPct');
            rate += this._equipValue(state, 'ratePct') + this._gemValue(state, 'ratePct');
            range += this._equipValue(state, 'rangePct') + this._gemValue(state, 'rangePct');
            crit += this._gemValue(state, 'critPct');
        }
        const core = this.weaponCore(heroId);
        if (core) {
            atk += core.atkPct ?? 0;
            rate += core.ratePct ?? 0;
            crit += core.critPct ?? 0;
        }
        return { atk: 1 + atk, rate: starRateMul(heroId) + rate, range: 1 + range, crit };
    }

    /** 英雄总攻击乘区（等级 × 主武器 × 装备 × 星级；beginRun 与 metaAtkMul 相乘后进 applyMetaAtk） */
    atkMulOf(heroId: string): number {
        return this.heroAtkMul(heroId) * this.weaponAtkMul(heroId)
            * this.equipMulOf(heroId).atk * starAtkMul(heroId);
    }

    /** 部署后把装备/核心/宝石的射速/射程/暴击加成追加到英雄实例（interval 缩小、range 放大） */
    applyEquipStats(hero: { def: { id: string }; interval: number; range: number; critBonus?: number }): void {
        const mul = this.equipMulOf(hero.def.id);
        hero.interval = Math.max(0.12, hero.interval / mul.rate);
        hero.range = hero.range * mul.range;
        if (hero.critBonus !== undefined) {
            hero.critBonus = mul.crit;
        }
    }

    /** 某槽推荐装备（品质最高且比当前更强的下一件；供 UI 免做完整背包） */
    recommend(heroId: string, slot: EquipSlot): EquipmentDef | null {
        const cur = this.equipped(heroId, slot);
        const curDef = cur ? this.equipDef(cur.id) : null;
        let best: EquipmentDef | null = null;
        for (const def of EQUIPMENT_DEFS) {
            if (def.slot !== slot) {
                continue;
            }
            if (curDef && def.tier <= curDef.tier) {
                continue;
            }
            if (!best || def.tier > best.tier) {
                best = def;
            }
        }
        return best;
    }

    // ================= 杂物库存（宝石/材料/道具） =================

    /** 杂物数量（未持有为 0） */
    miscCount(id: string): number {
        return this._gm.misc[id] ?? 0;
    }

    /** 使用一件道具：扣库存并发效果；不可用返回 false */
    useMisc(id: string): boolean {
        const def = miscDef(id);
        if (!def || !def.use || this.miscCount(id) < 1) {
            return false;
        }
        const gm = this._gm;
        if (def.use.type === 'stamina') {
            gm.res.add('stamina', def.use.amount);
        } else if (def.use.type === 'gold') {
            gm.res.add('gold', def.use.amount);
        }
        gm.misc[id] = this.miscCount(id) - 1;
        if (gm.misc[id] <= 0) {
            delete gm.misc[id];
        }
        gm.save();
        return true;
    }
}
