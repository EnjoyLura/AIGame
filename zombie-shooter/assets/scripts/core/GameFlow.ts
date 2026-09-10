import { GameEvent } from '../config/GameConfig';
import { eventCenter } from './EventCenter';
import { GameManager } from './GameManager';
import { BattleManager } from '../battle/BattleManager';
import { FINAL_STAGE_ID } from '../battle/StageData';

/**
 * 游戏流程状态机：主城/战斗/结算三大状态收口，转移的唯一发起者。
 * 业务代码不再自行 emit 流程事件（HOME_SHOW/GAME_RESTART/GAME_OVER/STAGE_CLEAR），
 * 一律调本状态机的方法；下游 UI/战斗只响应事件，不掌握状态真值。
 *
 * 合法转移（其余一律拒绝并告警）：
 *   home   → battle   startRun()   出战：校验体力/解锁 → 扣体力 → 清场重开 → 开波
 *   battle → settle   endRun(r)    结算：r='fail' 走 GAME_OVER，'clear' 走 STAGE_CLEAR
 *   settle → home     toHome()     返回主城
 *   settle → battle   retry()      重试：清场重开 → 开波（再扣体力）
 *
 * 战斗内细粒度状态（升级选卡暂停、x2 倍速）不上收，仍归 BattleManager；
 * 模拟是否滚动统一看 isSimActive()，BattleManager 的 _runActive/_gameOver 已委托于此。
 */
export type FlowState = 'home' | 'battle' | 'settle';
export type RunResult = 'fail' | 'clear';

export class GameFlow {
    private static _inst: GameFlow | null = null;
    static get instance(): GameFlow {
        if (!this._inst) {
            this._inst = new GameFlow();
        }
        return this._inst;
    }

    private _state: FlowState = 'home';
    /** 结算子态：state==='settle' 时决定弹失败还是通关面板 */
    private _lastResult: RunResult | null = null;

    get state(): FlowState { return this._state; }
    get lastResult(): RunResult | null { return this._lastResult; }

    /** 是否处于局内战斗（BattleManager._runActive 的真值来源） */
    inBattle(): boolean { return this._state === 'battle'; }

    /** 战斗是否已终局（BattleManager._gameOver 的真值来源；主城/结算恒为真=模拟冻结） */
    isOver(): boolean { return this._state !== 'battle'; }

    /** 模拟是否应该滚动（update 冻结门槛的唯一真值） */
    isSimActive(): boolean {
        return this._state === 'battle' && !(BattleManager.instance?.isPaused ?? false);
    }

    private _setState(s: FlowState): void {
        if (this._state === s) {
            return;
        }
        const from = this._state;
        this._state = s;
        if (s !== 'settle') {
            this._lastResult = null;
        }
        eventCenter.emit(GameEvent.FLOW_CHANGED, from, s);
    }

    /** home → battle：出战。守卫失败返回 false（UI 据此回滚显示） */
    startRun(endless = false): boolean {
        if (this._state !== 'home') {
            console.warn(`[GameFlow] endRun 非法转移：当前 ${this._state}`.replace('endRun', 'startRun'));
            return false;
        }
        const gm = GameManager.instance;
        if (!gm.canStartRun() || !gm.stageUnlocked(gm.currentStage)) {
            return false;
        }
        // 无尽模式解锁门槛：通关最后一关（防止跳过全部关卡内容）
        if (endless && gm.stageCleared < FINAL_STAGE_ID) {
            return false;
        }
        // 先清场重开（_restart 会把实体/统计/运行时数据归零），再扣体力开波；
        // 顺序保证扣体力失败时不会留下半初始化的战斗现场
        eventCenter.emit(GameEvent.GAME_RESTART);
        if (!BattleManager.instance?.beginRun(endless)) {
            return false;
        }
        this._setState('battle');
        return true;
    }

    /** battle → settle：终局结算。result 决定结算面板；结算私有逻辑由 BattleManager 完成 */
    endRun(result: RunResult): void {
        if (this._state !== 'battle') {
            console.warn(`[GameFlow] endRun 非法转移：当前 ${this._state}`);
            return;
        }
        this._lastResult = result;
        this._setState('settle');
        if (result === 'clear') {
            eventCenter.emit(GameEvent.STAGE_CLEAR, BattleManager.instance?.stageId ?? 1,
                BattleManager.instance?.takeClearBonus() ?? 0, BattleManager.instance?.takeClearDrops() ?? []);
        } else {
            eventCenter.emit(GameEvent.GAME_OVER);
        }
    }

    /** settle → home：返回主城（HOME_SHOW 驱动 HomeUi 显示） */
    toHome(): void {
        if (this._state !== 'settle') {
            console.warn(`[GameFlow] toHome 非法转移：当前 ${this._state}`);
            return;
        }
        this._setState('home');
        eventCenter.emit(GameEvent.HOME_SHOW);
    }

    /** settle → battle：失败/通关结算里直接重开一局（再扣体力） */
    retry(): boolean {
        if (this._state !== 'settle') {
            console.warn(`[GameFlow] retry 非法转移：当前 ${this._state}`);
            return false;
        }
        eventCenter.emit(GameEvent.GAME_RESTART);
        if (!BattleManager.instance?.beginRun()) {
            // 体力不足等失败：退回主城而不是停在黑屏
            this._setState('home');
            eventCenter.emit(GameEvent.HOME_SHOW);
            return false;
        }
        this._setState('battle');
        return true;
    }
}
