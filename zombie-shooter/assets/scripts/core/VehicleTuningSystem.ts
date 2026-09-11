import { sys } from 'cc';
import { GameManager } from './GameManager';
import { QuestSystem } from './QuestSystem';

/**
 * 载具改装系统（基地·载具工坊入口）：
 * - 四个改装槽各自独立升级：装甲板（耐久上限）/ 撞角（啃咬反伤）/ 工具箱（战斗回血）/ 弹药架（全队攻击）。
 * - 槽位等级上限 = 载具工坊建筑等级（最高 10）：先升工坊才能继续改装，形成基地成长链。
 * - 消耗改装图纸（mat_blueprint，通关掉落/礼包/商店）+ 金币；升到第 n 级需图纸 ×n + 金币 500×n。
 * - 持久化在独立 localStorage 键（与天赋/招募/副本同口径）。
 */

export type TuneSlotId = 'armor' | 'ram' | 'toolbox' | 'ammo';

export const TUNE_MAX_LEVEL = 10;
/** 改装图纸（与 HeroSystem MISC_ITEM_DEFS 的 mat_blueprint 对应） */
export const TUNE_MAT_ID = 'mat_blueprint';

export interface TuneSlotDef {
    id: TuneSlotId;
    name: string;
    ic: string;
    /** 效果文案（参数为该槽当前等级，用于展示"当前/下级"） */
    desc: (level: number) => string;
}

export const TUNE_SLOTS: TuneSlotDef[] = [
    {
        id: 'armor', name: '装甲板', ic: '🛡️',
        desc: l => `载具耐久上限 +${l * 4}%（每级 +4%）`,
    },
    {
        id: 'ram', name: '撞角', ic: '🔺',
        desc: l => `怪物啃咬载具时反伤 ${l > 0 ? 25 + 25 * l : 0}（每级 +25）`,
    },
    {
        id: 'toolbox', name: '工具箱', ic: '🧰',
        desc: l => `每 5 秒回复载具最大耐久 ${(l * 0.4).toFixed(1)}%（每级 +0.4%）`,
    },
    {
        id: 'ammo', name: '弹药架', ic: '🎯',
        desc: l => `全队攻击 +${l * 3}%（每级 +3%）`,
    },
];

export function tuneSlot(id: string): TuneSlotDef | undefined {
    return TUNE_SLOTS.find(s => s.id === id);
}

/** 升到第 n 级需要的图纸数（= n） */
export function tuneBlueprintCost(nextLevel: number): number {
    return Math.max(1, Math.floor(nextLevel));
}

/** 升到第 n 级需要的金币数（= 500 × n） */
export function tuneGoldCost(nextLevel: number): number {
    return 500 * Math.max(1, Math.floor(nextLevel));
}

// ================= 效果查询（模块级导出，照 talentVehHpMul 的约定） =================

/** 装甲板耐久乘区（+4%/级，满级 ×1.4） */
export function tuneVehHpMul(): number {
    return 1 + VehicleTuningSystem.instance.level('armor') * 0.04;
}

/** 撞角反伤固定值（未改装为 0；战斗侧 0 短路） */
export function tuneRamReflect(): number {
    const l = VehicleTuningSystem.instance.level('ram');
    return l > 0 ? 25 + 25 * l : 0;
}

/** 工具箱每秒回血比例（+0.08%/秒/级 = 每 5 秒 0.4%/级，与天赋自修复层同池累加） */
export function tuneVehRegen(): number {
    return VehicleTuningSystem.instance.level('toolbox') * 0.0008;
}

/** 弹药架攻击乘区（+3%/级，满级 ×1.3） */
export function tuneAtkMul(): number {
    return 1 + VehicleTuningSystem.instance.level('ammo') * 0.03;
}

interface TuneSave {
    /** 槽位等级（slotId → 0~10） */
    levels: Record<string, number>;
}

export class VehicleTuningSystem {
    private static _inst: VehicleTuningSystem | null = null;
    static get instance(): VehicleTuningSystem {
        if (!this._inst) {
            this._inst = new VehicleTuningSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-tuning';

    private _data: TuneSave = { levels: {} };

    private constructor() {
        this._load();
    }

    // ================= 查询 =================

    /** 某槽当前等级 0~10 */
    level(slotId: string): number {
        if (!tuneSlot(slotId)) {
            return 0;
        }
        return Math.min(TUNE_MAX_LEVEL, Math.max(0, this._data.levels[slotId] ?? 0));
    }

    /** 槽位等级上限 = 载具工坊建筑等级（建筑本身最高 10 级，再钳一层防意外） */
    capOf(): number {
        return Math.min(TUNE_MAX_LEVEL, GameManager.instance.buildingLevel('workshop'));
    }

    isMaxed(slotId: string): boolean {
        return this.level(slotId) >= TUNE_MAX_LEVEL;
    }

    /** 当前图纸存量 */
    get blueprintCount(): number {
        return Math.max(0, Math.floor(GameManager.instance.misc[TUNE_MAT_ID] ?? 0));
    }

    /** 升下一级的花费（供 UI 预览；maxed 时仍返回下一档数值但不可升） */
    nextCosts(slotId: string): { blueprint: number; gold: number } {
        const next = this.level(slotId) + 1;
        return { blueprint: tuneBlueprintCost(next), gold: tuneGoldCost(next) };
    }

    /** 是否可升级：未满级、未超工坊上限、图纸金币够；不满足时给中文原因供按钮置灰提示 */
    canUpgrade(slotId: string): { ok: boolean; reason: string } {
        const def = tuneSlot(slotId);
        if (!def) {
            return { ok: false, reason: '未知槽位' };
        }
        const lv = this.level(slotId);
        if (lv >= TUNE_MAX_LEVEL) {
            return { ok: false, reason: '已满级' };
        }
        const cap = this.capOf();
        if (lv >= cap) {
            return { ok: false, reason: `需载具工坊 LV.${Math.min(TUNE_MAX_LEVEL, cap + 1)}` };
        }
        const cost = this.nextCosts(slotId);
        if (this.blueprintCount < cost.blueprint) {
            return { ok: false, reason: '改装图纸不足' };
        }
        if (GameManager.instance.gold < cost.gold) {
            return { ok: false, reason: '金币不足' };
        }
        return { ok: true, reason: '' };
    }

    // ================= 操作 =================

    /** 升级一档：扣图纸+金币 → 等级+1 → 双存档 → 记任务计数；失败返回 false（零副作用） */
    upgrade(slotId: string): boolean {
        if (!this.canUpgrade(slotId).ok) {
            return false;
        }
        const gm = GameManager.instance;
        const cost = this.nextCosts(slotId);
        // 先扣材料（照 reforgeAffixes 的写法：归零即 delete，防存档里堆 0 值键）
        gm.misc[TUNE_MAT_ID] = this.blueprintCount - cost.blueprint;
        if (gm.misc[TUNE_MAT_ID] <= 0) {
            delete gm.misc[TUNE_MAT_ID];
        }
        gm.res.spend('gold', cost.gold);
        this._data.levels[slotId] = this.level(slotId) + 1;
        gm.save();
        this._save();
        QuestSystem.instance.trackTune();
        return true;
    }

    // ================= 内部 =================

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(VehicleTuningSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object' && d.levels && typeof d.levels === 'object') {
                    const levels: Record<string, number> = {};
                    // 白名单：只认已知槽位，等级钳到 0~10（坏档/改档安全）
                    for (const def of TUNE_SLOTS) {
                        const v = Math.floor(d.levels[def.id] ?? 0);
                        if (v >= 1 && v <= TUNE_MAX_LEVEL) {
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
        sys.localStorage.setItem(VehicleTuningSystem.SAVE_KEY, JSON.stringify(this._data));
    }
}
