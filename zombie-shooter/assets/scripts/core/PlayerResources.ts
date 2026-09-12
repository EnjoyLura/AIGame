import { GameEvent } from '../config/GameConfig';
import { eventCenter } from './EventCenter';

/**
 * 玩家资源仓库（骨架）：统一持有各类资源数量，add/spend 走唯一入口并发变更事件，
 * UI 与经济系统只认资源 id，后续新增资源（皮肤碎片、抽卡券…）直接扩表。
 * 体力内置离线恢复（时间戳结算，回到上限后对齐当前时间）。
 *
 * 英雄碎片（shard_*）按英雄各占一个资源键：招募重复英雄时转入，升星时消耗。
 * 碎片不进顶栏资源格（顶栏只渲染 gold/diamond/stamina 三格），仅在招募弹窗与升星条展示。
 */

export type ResourceId = 'gold' | 'diamond' | 'stamina'
    | 'shard_rifle' | 'shard_sniper' | 'shard_laser' | 'shard_radiation';

export class PlayerResources {
    private _amounts: Record<ResourceId, number> = {
        gold: 0, diamond: 0, stamina: 0,
        shard_rifle: 0, shard_sniper: 0, shard_laser: 0, shard_radiation: 0,
    };
    /** 体力恢复结算时间戳（秒）；加载时由存档恢复，离线时长据此补体力 */
    private _staminaTs = 0;

    get(id: ResourceId): number {
        return this._amounts[id] ?? 0;
    }

    /** 体力当前值（先结算离线/挂机恢复） */
    stamina(now: number, max: number, regenSecs: number): number {
        this._tickStamina(now, max, regenSecs);
        return this._amounts.stamina;
    }

    /** 距下一次恢复 1 点体力的秒数（满体力返回 0；先结算再读） */
    staminaNextIn(now: number, max: number, regenSecs: number): number {
        this._tickStamina(now, max, regenSecs);
        if (this._amounts.stamina >= max) {
            return 0;
        }
        // _staminaTs 是恢复起点：下一次 +1 发生在起点后一个恢复周期
        return Math.max(0, this._staminaTs + regenSecs - now);
    }

    add(id: ResourceId, n: number): void {
        const v = Math.max(0, Math.round(this._amounts[id] + n));
        if (v === this._amounts[id]) {
            return;
        }
        this._amounts[id] = v;
        eventCenter.emit(GameEvent.RES_CHANGED, id, v);
    }

    canSpend(id: ResourceId, n: number): boolean {
        return (this._amounts[id] ?? 0) >= Math.max(0, Math.round(n));
    }

    /** 扣减；不足返回 false */
    spend(id: ResourceId, n: number): boolean {
        const cost = Math.max(0, Math.round(n));
        if (!this.canSpend(id, cost)) {
            return false;
        }
        this._amounts[id] -= cost;
        eventCenter.emit(GameEvent.RES_CHANGED, id, this._amounts[id]);
        return true;
    }

    /** 体力恢复结算：按时间戳差补体力，补满后时间戳对齐当前（溢出不累积） */
    _tickStamina(now: number, max: number, regenSecs: number): void {
        if (this._staminaTs <= 0) {
            this._staminaTs = now;
            return;
        }
        if (this._amounts.stamina >= max) {
            this._staminaTs = now;
            return;
        }
        const elapsed = Math.max(0, now - this._staminaTs);
        const gained = Math.floor(elapsed / regenSecs);
        if (gained <= 0) {
            return;
        }
        const next = Math.min(max, this._amounts.stamina + gained);
        this._amounts.stamina = next;
        if (next >= max) {
            this._staminaTs = now;
        } else {
            this._staminaTs += gained * regenSecs;
        }
        eventCenter.emit(GameEvent.RES_CHANGED, 'stamina', next);
    }

    /** 序列化（存档读写） */
    serialize(): { amounts: Record<ResourceId, number>; staminaTs: number } {
        return { amounts: { ...this._amounts }, staminaTs: this._staminaTs };
    }

    deserialize(data: { amounts?: Record<ResourceId, number>; staminaTs?: number } | null): void {
        if (!data) {
            return;
        }
        if (data.amounts) {
            for (const k of Object.keys(this._amounts) as ResourceId[]) {
                this._amounts[k] = data.amounts[k] ?? 0;
            }
        }
        this._staminaTs = data.staminaTs ?? 0;
    }
}
