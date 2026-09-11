import { GameEvent, BattleConfig } from '../config/GameConfig';
import { eventCenter } from './EventCenter';
import { GameManager } from './GameManager';
import { BattleManager } from '../battle/BattleManager';
import { FINAL_STAGE_ID } from '../battle/StageData';
import { TrialSystem } from './TrialSystem';
import { DungeonSystem, dungeonFromCode, DUNGEON_STAMINA_COST } from './DungeonSystem';

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
    /** 本局出参（retry 原样重放：无尽/难度/试炼层） */
    private _lastRun = { endless: false, diff: 0, trialFloor: 0 };

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

    /**
     * 出战守卫 + 预扣费（startRun 与 retry 共用，堵住"结算页重试绕过扣费"的洞）。
     * 守卫全过返回本局预扣的资源（beginRun 失败时由调用方 _refundRun 回滚）；不过返回 null。
     * floor<0 资源副本（体力 + 每日次数）、floor>0 试炼之塔（免体力）、floor=0 普通关卡/无尽（体力）。
     */
    private _gateRun(endless: boolean, diff: number, floor: number): { spentDungeon: boolean; spentRun: boolean } | null {
        const gm = GameManager.instance;
        if (floor < 0) {
            // 资源副本：校验档位解锁与剩余次数，再扣体力 + 次数
            const dg = dungeonFromCode(floor);
            if (!dg) {
                return null;
            }
            const gate = DungeonSystem.instance.canEnter(dg.id, dg.tier);
            if (!gate.ok) {
                return null;
            }
            // 原子性：先扣体力，体力不足则次数不动；扣完次数后若开战失败再全部退回
            if (!gm.res.spend('stamina', DUNGEON_STAMINA_COST)) {
                return null;
            }
            if (!DungeonSystem.instance.consume(dg.id)) {
                gm.res.add('stamina', DUNGEON_STAMINA_COST);
                return null;
            }
            return { spentDungeon: true, spentRun: false };
        }
        if (floor > 0) {
            // 试炼之塔：不消耗体力、不看关卡门槛，只校验层数是否已达解锁链
            if (!TrialSystem.instance.isFloorUnlocked(floor)) {
                return null;
            }
            return { spentDungeon: false, spentRun: false };
        }
        if (!gm.canStartRun() || !gm.stageUnlocked(gm.currentStage)) {
            return null;
        }
        // 无尽模式解锁门槛：通关最后一关（防止跳过全部关卡内容）
        if (endless && gm.stageCleared < FINAL_STAGE_ID) {
            return null;
        }
        // 高难度门槛：精英需通关本关普通，噩梦需通关本关精英
        if (!endless && !gm.isDiffUnlocked(gm.currentStage, diff)) {
            return null;
        }
        // 守卫全过才真实扣体力（此前只查不扣，体力经济只对副本生效）
        if (!gm.spendRunStamina()) {
            return null;
        }
        return { spentDungeon: false, spentRun: true };
    }

    /** beginRun 失败时回滚 _gateRun 预扣的资源，避免白扣 */
    private _refundRun(floor: number, spent: { spentDungeon: boolean; spentRun: boolean }): void {
        const gm = GameManager.instance;
        if (spent.spentDungeon) {
            gm.res.add('stamina', DUNGEON_STAMINA_COST);
            const dg = dungeonFromCode(floor);
            if (dg) {
                DungeonSystem.instance.refund(dg.id);
            }
        }
        if (spent.spentRun) {
            gm.res.add('stamina', BattleConfig.RUN_STAMINA_COST);
        }
    }

    /**
     * home → battle：出战。守卫失败返回 false（UI 据此回滚显示）。
     * diff=关卡难度（0 普通/1 精英/2 噩梦）；trialFloor>0 进入试炼之塔该层（免体力）。
     * trialFloor<0 进入资源副本（编码见 DungeonSystem.encodeDungeon），消耗体力 + 每日次数。
     */
    startRun(endless = false, diff = 0, trialFloor = 0): boolean {
        if (this._state !== 'home') {
            console.warn(`[GameFlow] endRun 非法转移：当前 ${this._state}`.replace('endRun', 'startRun'));
            return false;
        }
        const floor = endless ? 0 : Math.floor(trialFloor);
        const spent = this._gateRun(endless, diff, floor);
        if (!spent) {
            return false;
        }
        // 先清场重开（_restart 会把实体/统计/运行时数据归零），再开波；
        // 顺序保证扣体力失败时不会留下半初始化的战斗现场
        eventCenter.emit(GameEvent.GAME_RESTART);
        if (!BattleManager.instance?.beginRun(endless, diff, floor)) {
            // 开战失败：把刚扣的体力与次数退回去，避免白扣
            this._refundRun(floor, spent);
            return false;
        }
        this._lastRun = { endless, diff, trialFloor: floor };
        this._setState('battle');
        // 扣费即落盘：防止开战后中途关页把这次扣费丢掉（体力倒回）
        GameManager.instance.save();
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
            // 副本/试炼各走独立事件：不污染关卡通关（QuestSystem 监听 STAGE_CLEAR 记通关数/成就）
            if (BattleManager.instance?.isDungeon) {
                eventCenter.emit(GameEvent.DUNGEON_CLEAR, BattleManager.instance.dungeonId,
                    BattleManager.instance.dungeonTier, BattleManager.instance.takeDungeonReward());
            } else if (BattleManager.instance?.isTrial) {
                eventCenter.emit(GameEvent.TRIAL_CLEAR, BattleManager.instance.trialFloor,
                    BattleManager.instance.takeTrialBonus(), BattleManager.instance.takeTrialDrops(),
                    BattleManager.instance.takeTrialDiamond() > 0);
            } else {
                eventCenter.emit(GameEvent.STAGE_CLEAR, BattleManager.instance?.stageId ?? 1,
                    BattleManager.instance?.takeClearBonus() ?? 0, BattleManager.instance?.takeClearDrops() ?? []);
            }
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

    /** settle → battle：失败/通关结算里直接重开一局（原样重放本局模式：无尽/难度/试炼层） */
    retry(): boolean {
        if (this._state !== 'settle') {
            console.warn(`[GameFlow] retry 非法转移：当前 ${this._state}`);
            return false;
        }
        const r = this._lastRun;
        // 与首战同一套守卫与扣费：普通/无尽再扣体力，副本再扣次数+体力，试炼免体力
        const spent = this._gateRun(r.endless, r.diff, r.trialFloor);
        if (!spent) {
            // 体力不足/次数用尽等失败：退回主城而不是停在黑屏
            this._setState('home');
            eventCenter.emit(GameEvent.HOME_SHOW);
            return false;
        }
        eventCenter.emit(GameEvent.GAME_RESTART);
        if (!BattleManager.instance?.beginRun(r.endless, r.diff, r.trialFloor)) {
            this._refundRun(r.trialFloor, spent);
            this._setState('home');
            eventCenter.emit(GameEvent.HOME_SHOW);
            return false;
        }
        this._setState('battle');
        GameManager.instance.save();
        return true;
    }
}
