import { Color, Graphics, Node, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { BattleConfig } from '../config/GameConfig';
import { createUINode } from '../core/createUINode';
import { BattleManager, DamageSlotKey, EnemyHandle } from './BattleManager';
import { ABILITY_LEVEL_DMG_BONUS, ABILITY_MAX_LEVEL, AbilityDef, BASIC_ENHANCE_DMG_STEP, BASIC_ENHANCE_MAX, BOOM_DMG_RATIO, BOOM_DMG_RATIO_STEP, BOOM_DMG_UP_MAX, BOOM_DMG_UP_STEP, BOOM_MAX, BOOM_RADIUS, BOOM_RADIUS_STEP, BOOM_RANGE_DMG_STEP, BOOM_RANGE_MAX, BOOM_RANGE_STEP, HeroDef, MULTISHOT_SPACING, PIERCE_PLUS_MAX, SEC_BOOM_DMG_RATIO, SEC_BOOM_DMG_RATIO_STEP, SEC_BOOM_MAX, SEC_BOOM_RADIUS, SEC_BOOM_RADIUS_STEP, SPLIT_DMG_RATIO, SPLIT_DMG_UP_MAX, SPLIT_DMG_UP_STEP, SPLIT_MAX, SPLIT_MORE_DMG_STEP, SPLIT_MORE_MAX, ULTIMATE_CHARGE_MAX, VOLLEY_ANGLE_STEP } from './HeroDef';
import { SoundFx } from '../core/SoundFx';

/** 自动施法最短重入间隔（战斗秒）；完整施法/召唤持续时间另行保护。 */
const AUTO_RECAST_FLOOR = 0.75;

/** 大招充满后自动释放的延迟（战斗秒）：给玩家留出手动点按立即释放的窗口 */
const ULT_AUTO_CAST_DELAY = 1;

/** 光束渲染的固定色与共享采样缓冲：每帧 new Color/new Array 是移动端 GC 抖动来源 */
const WHITE_HOT = new Color(255, 255, 255, 240);
const WHITE_CORE = new Color(255, 255, 255, 235);
const WHITE_HIT = new Color(255, 255, 255, 220);
const FLOW_BASIC = new Color(230, 255, 255, 145);
const FLOW_ULT = new Color(235, 255, 255, 150);
const SPARK_WHITE = new Color(255, 255, 255, 255);
const SPARK_LASER = new Color(142, 242, 255, 255);
const BEAM_PATH_X: number[] = [];
const BEAM_PATH_Y: number[] = [];
const SCRATCH_AIM = new Vec3();

export interface HeroCombatStats {
    atk: number;
    interval: number;
    range: number;
    /** 射击/施法瞄准回调（英雄身体朝向表现用）；snap=true 瞬间转向（激光） */
    notifyShot?(targetPos: Vec3, snap?: boolean): void;
}

/** 普攻强化状态（激光过载光束等 buff 类技能驱动） */
export interface BasicBuff {
    damageMul: number;
    rangeMul: number;
    left: number;
}

interface BasicAttack {
    update(dt: number): void;
    reset(): void;
    /** 挂起/恢复普攻（大招引导等高光时刻暂停普攻输出与光束绘制，避免双束分叉） */
    suspend?: (on: boolean) => void;
}

/** 普攻弹体特效规格（穿透/爆炸/分裂），仅普攻弹携带 */
export interface ProjectileExtras {
    /** 有限穿透次数 */
    pierceCount?: number;
    /** 范围爆炸等级 */
    boomLevel?: number;
    /** 命中后分裂数量 */
    splitCount?: number;
    /** 次级弹爆炸等级（仅次级弹携带） */
    secBoomLevel?: number;
    /** 裂变伤害总倍率（数量卡的 -20% 与强化卡的 +50% 合并） */
    splitDmgMul?: number;
    /** 爆炸半径总倍率 */
    boomRangeMul?: number;
    /** 爆炸伤害总倍率 */
    boomDmgMul?: number;
}

class ProjectileBasicAttack implements BasicAttack {
    private _timer = 0;

    constructor(private _owner: HeroCombatController) {}

    update(dt: number): void {
        this._timer -= dt;
        if (this._timer > 0) {
            return;
        }
        const target = this._owner.battle.findTarget(this._owner.position, this._owner.stats.range);
        if (!target) {
            this._timer = 0;
            return;
        }
        const m = this._owner.multishotStacks;
        const v = this._owner.volleyStacks;
        // 连射/齐射每层单发伤害 ×0.8（弹数换伤）
        const damage = Math.round(this._owner.stats.atk * Math.pow(BASIC_ENHANCE_DMG_STEP, m + v));
        const speed = this._owner.def.bulletSpeed;
        const radius = BattleConfig.BULLET_RADIUS * (this._owner.def.weapon === 'sniper' ? 1.4 : 1);
        const pierce = !!this._owner.def.pierce;
        // 弹体特效规格：穿透+1 / 范围爆炸 / 子弹分裂（仅普攻弹携带，技能弹不带）
        const o = this._owner;
        const extras: ProjectileExtras = {
            pierceCount: o.pierceStacks,
            boomLevel: o.boomStacks,
            splitCount: o.splitStacks > 0 ? 2 + o.splitMoreStacks : 0,
            secBoomLevel: o.secBoomStacks, // 次级弹爆炸（分裂弹命中后小范围爆炸）
            splitDmgMul: Math.pow(SPLIT_MORE_DMG_STEP, o.splitMoreStacks)
                * Math.pow(SPLIT_DMG_UP_STEP, o.splitDmgStacks),
            boomRangeMul: Math.pow(BOOM_RANGE_STEP, o.boomRangeStacks),
            boomDmgMul: Math.pow(BOOM_RANGE_DMG_STEP, o.boomRangeStacks)
                * Math.pow(BOOM_DMG_UP_STEP, o.boomDmgStacks),
        };
        this._owner.stats.notifyShot?.(target.enemy.node.position);
        SoundFx.play('shoot');
        // 步枪手：普攻也触发正式枪口火焰（朝主目标方向）；其余英雄保持 fireProjectile 内的粒子光斑
        if (this._owner.def.id === 'rifle') {
            const mz = this._owner.muzzleWorldPosition();
            const tp = target.enemy.node.position;
            this._owner.battle.muzzleFlashFx(mz, this._owner.def.bulletColor,
                Math.atan2(-(tp.x - mz.x), tp.y - mz.y) * 180 / Math.PI);
        }
        // 弹道 × 每道弹数模型：
        // 连射决定每条弹道的纵向弹数（主弹 + 每层 2 颗同向补弹），
        // 齐射决定弹道条数（每条偏移弹道复制完整的连射纵队）
        const lanes = 1 + v;
        const perLane = 1 + m * 2;
        for (let lane = 0; lane < lanes; lane++) {
            const laneAngle = lane === 0
                ? 0
                : (Math.floor((lane - 1) / 2) + 1) * VOLLEY_ANGLE_STEP * ((lane - 1) % 2 === 0 ? 1 : -1);
            for (let b = 0; b < perLane; b++) {
                this._owner.fireProjectile(target, damage, speed, radius, pierce, true, laneAngle, MULTISHOT_SPACING * b, extras);
            }
        }
        this._timer = this._owner.stats.interval;
    }

    reset(): void { this._timer = 0; }
}

/** 激光单束运行时：每束独立锁定一个目标并独立结算 */
interface LaserSlot {
    handle: EnemyHandle | null;
    damage: number;
    time: number;
    /** 音效节流剩余时间（仅主束用） */
    sfx?: number;
    /** 纯表现节流：不改变 0.1s 伤害跳数。 */
    sparksLeft?: number;
}

/** 环绕无人机：绕英雄公转、每 0.5s 向射程内最近敌人开火（狙击技能召唤物） */
class OrbitDrone {
    private _node: Node;
    private _angle = Math.random() * Math.PI * 2;
    private _fireLeft = 0.6;
    private _left: number;
    private _dead = false;

    constructor(private _owner: HeroCombatController, private _dmgScale: number, duration: number) {
        this._left = duration;
        this._node = createUINode('Drone');
        this._owner.battle.unitLayer.addChild(this._node);
        const s = this._owner.battle.uiScale;
        const g = this._node.addComponent(Graphics);
        const r = 16 * s;
        // 机身：光晕 + 圆体 + 十字旋翼 + 白芯
        g.fillColor = new Color(this._owner.def.bulletColor.r, this._owner.def.bulletColor.g, this._owner.def.bulletColor.b, 60);
        g.circle(0, 0, r * 1.5);
        g.fill();
        g.fillColor = this._owner.def.bulletColor;
        g.circle(0, 0, r * 0.75);
        g.fill();
        g.strokeColor = new Color(255, 255, 255, 200);
        g.lineWidth = 3 * s;
        // 十字旋翼
        for (let q = 0; q < 2; q++) {
            const a = q * Math.PI / 2;
            g.moveTo(-Math.cos(a) * r * 1.3, -Math.sin(a) * r * 1.3);
            g.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
            g.stroke();
        }
        g.fillColor = new Color(255, 255, 255, 230);
        g.circle(0, 0, r * 0.3);
        g.fill();
        this._node.angle = Math.random() * 360;
    }

    get dead(): boolean { return this._dead; }

    update(dt: number): void {
        const bm = this._owner.battle;
        this._left -= dt;
        if (this._left <= 0) {
            this._expire();
            return;
        }
        const s = bm.uiScale;
        // 公转 + 缓慢自旋
        this._angle += 2.6 * dt;
        this._node.angle += dt * 240;
        const hp = this._owner.position;
        const orbit = 140 * s;
        this._node.setPosition(hp.x + Math.cos(this._angle) * orbit, hp.y + 46 * s + Math.sin(this._angle) * orbit * 0.75);
        // 开火：每 0.5s 打射程内最近敌人
        this._fireLeft -= dt;
        if (this._fireLeft > 0) {
            return;
        }
        this._fireLeft = 0.5;
        // 整体入屏索敌：普通索敌的 radius 容差会让刚入场（中心还在屏幕顶端之上）的怪被选中，
        // 即时光束随之拉到屏幕顶端之外——表现为"攻击轨道从屏幕顶部出现"
        const target = bm.findTargetOnScreen(this._node.position, this._owner.stats.range);
        if (!target) {
            return;
        }
        // 参考步枪手：发射真实飞行的子弹（可暴击、命中火花/伤害数字全走统一弹道链路）
        const from = new Vec3(this._node.position.x, this._node.position.y);
        const to = new Vec3(target.enemy.node.position.x, target.enemy.node.position.y);
        const dir = new Vec3(to.x - from.x, to.y - from.y, 0);
        const dist = dir.length();
        if (dist < 1) {
            return;
        }
        dir.multiplyScalar(1 / dist);
        bm.spawnProjectile(from, dir, {
            damage: Math.max(1, Math.round(this._owner.stats.atk * this._dmgScale)),
            speed: 2550,
            radius: BattleConfig.BULLET_RADIUS * 0.8 * s,
            color: this._owner.def.bulletColor,
            pierce: false,
            canCrit: false,
            sourceId: this._owner.def.id,
            slot: 'skill',
        });
        bm.precisionFlash(this._node.worldPosition, 3, this._owner.def.bulletColor);
        SoundFx.play('shoot');
    }

    private _expire(): void {
        // Battle-clock expiration; no orphan fade tween after controller release.
        this.destroy();
    }

    /** 立即销毁（重开/换新无人机时用，无淡出） */
    destroy(): void {
        this._dead = true;
        Tween.stopAllByTarget(this._node);
        this._node.destroy();
    }
}

class LaserBasicAttack implements BasicAttack {
    private _slots: LaserSlot[] = [{ handle: null, damage: 0, time: 0 }];
    /** 大招引导期间挂起（不索敌/不结算/不画束） */
    private _suspended = false;

    constructor(private _owner: HeroCombatController) {}

    private _beamId(i: number): string { return 'basic_' + i; }

    /** 其它光束槽当前锁定的目标（换锁时排除，保证多束不打同一个） */
    private _lockedExcept(index: number): EnemyHandle[] {
        const out: EnemyHandle[] = [];
        for (let j = 0; j < this._slots.length; j++) {
            if (j !== index && this._slots[j].handle) {
                out.push(this._slots[j].handle!);
            }
        }
        return out;
    }

    /** 挂起普攻（大招引导期间调用）：清光束、暂停索敌与结算，恢复后自动重锁 */
    suspend(on: boolean): void {
        this._suspended = on;
        if (on) {
            for (let i = 0; i < this._slots.length; i++) {
                this._slots[i].handle = null;
                this._slots[i].damage = 0;
                this._slots[i].time = 0;
                this._owner.clearBeam(this._beamId(i));
            }
        }
    }

    update(dt: number): void {
        if (this._suspended) {
            return;
        }
        const buff = this._owner.basicBuff;
        const range = this._owner.stats.range * (buff ? buff.rangeMul : 1);

        // 光束槽数随连射层数变化：升级立即加束；重开/缩编时回收多余光束层
        const want = 1 + this._owner.multishotStacks;
        while (this._slots.length < want) {
            this._slots.push({ handle: null, damage: 0, time: 0 });
        }
        while (this._slots.length > want) {
            this._slots.pop();
            this._owner.clearBeam(this._beamId(this._slots.length));
        }

        // ===== 粘滞锁定（用户指定） =====
        // 锁定后直到目标被击杀/超程才换下一个（取当前推进最深的怪）；
        // 目标活着坚决不换——即使有别的怪离车更近、即使 0.25s 周期到
        for (let i = 0; i < this._slots.length; i++) {
            const slot = this._slots[i];
            if (!this._owner.battle.isEnemyHandleValid(slot.handle, this._owner.position, range)) {
                slot.handle = this._owner.battle.findFrontTarget(this._owner.position, range, this._lockedExcept(i));
                slot.damage = 0;
                slot.time = 0;
            }
        }

        // 单束秒伤 = 属性攻击 × 连射减伤（连射=多束，每束同伤害）
        const perBeamAtk = this._owner.stats.atk * (buff ? buff.damageMul : 1)
            * Math.pow(BASIC_ENHANCE_DMG_STEP, this._owner.multishotStacks);

        for (let i = 0; i < this._slots.length; i++) {
            const slot = this._slots[i];
            if (!slot.handle) {
                this._owner.clearBeam(this._beamId(i));
                continue;
            }
            // 每 0.1s 一跳伤害（tick 制），无暴击；整数部分结算、小数余量结转
            // （原 Math.round 每跳最多丢 0.5 点，低攻速期对秒伤影响可达一成）
            slot.damage += perBeamAtk * dt;
            slot.time += dt;
            slot.sparksLeft = Math.max(0, (slot.sparksLeft ?? 0) - dt);
            if (slot.time >= 0.1) {
                // 音效每 0.16s 一次（照抄 code(3).html h.sfxT=.16，仅主束触发）
                slot.sfx = (slot.sfx ?? 0) - 0.1;
                if (i === 0 && (slot.sfx ?? 0) <= 0) {
                    SoundFx.play('laser');
                    slot.sfx = 0.16;
                }
                const dmg = Math.floor(slot.damage);
                if (dmg >= 1) {
                    slot.damage -= dmg;
                    this._owner.battle.applyDamage(slot.handle, dmg, false, this._owner.def.id, 'basic');
                    // 命中火花：过载=白色（照抄 code(3).html burst color: overT>0?'#ffffff':'#8ef2ff'）
                    if (slot.sparksLeft <= 0) {
                        this._owner.battle.burstHitSparks(slot.handle.enemy.node.worldPosition,
                            buff ? SPARK_WHITE : SPARK_LASER);
                        slot.sparksLeft = 0.25;
                    }
                    // 击杀瞬间立即重锁，不产生"光束挂在尸体"的过渡帧
                    if (!this._owner.battle.isEnemyHandleValid(slot.handle, this._owner.position, range)) {
                        slot.handle = this._owner.battle.findFrontTarget(this._owner.position, range, this._lockedExcept(i));
                        slot.time = 0;
                    }
                }
                slot.time = 0;
            }
            if (slot.handle) {
                // 过载中：光束加粗 w=14（照抄 code(3).html const w=ov?14:6）
                this._owner.drawBeam(this._beamId(i), slot.handle, (buff ? 14 : 6) * this._owner.battle.uiScale);
            } else {
                this._owner.clearBeam(this._beamId(i));
            }
        }

        // aim 即时跟随当前目标（code(3).html：每帧 h.aim=atan2），身体秒转向
        const aim = this._slots[0].handle ?? this._slots.find(s => s.handle)?.handle ?? null;
        if (aim) {
            this._owner.stats.notifyShot?.(aim.enemy.node.position, true);
        }
    }

    reset(): void {
        for (let i = 0; i < this._slots.length; i++) {
            this._owner.clearBeam(this._beamId(i));
        }
        this._slots = [{ handle: null, damage: 0, time: 0 }];
    }
}

/** 技能/大招运行时：解锁=1 级（升级卡再升，满级 ABILITY_MAX_LEVEL），每级伤害 +30% */
class AbilityRuntime {
    level = 0;
    /** 大招击杀充能（仅 ultimate 使用，0~ULTIMATE_CHARGE_MAX） */
    private _charge = 0;
    private _cooldown = 0;
    private _recastLeft = 0;
    private _duration = 0;
    private _tickTimer = 0;
    private _target: EnemyHandle | null = null;
    /** laserbeam：施法瞬间锁定的光束方向（贯穿光束持续期间不转向） */
    private _beamDir: Vec3 | null = null;
    /** 施法前摇：>0 起手蓄力中（战斗秒），期间图标施法环推进、枪口蓄力环展开 */
    private _windup = 0;
    private _windupTotal = 0;
    private _pendingTarget: EnemyHandle | null = null;
    /** 大招充满后的自动释放延迟（战斗秒）；窗口内可手动点按立即释放 */
    private _autoDelay = 0;

    constructor(private _owner: HeroCombatController, private _def: AbilityDef, private _isUlt: boolean) {}

    /** 能力定义（图标 HUD/浮窗读取；注意运行时字段名是 _def，直接取 .def 会是 undefined） */
    get def(): AbilityDef { return this._def; }

    /** 贯穿光束是否引导中（控制器据此挂起普攻激光，避免同源双束分叉） */
    get isLaserBeamActive(): boolean { return this._beamDir !== null; }

    get unlocked(): boolean { return this.level > 0; }

    /** 大招充能是否已满 */
    get chargeFull(): boolean { return this._charge >= ULTIMATE_CHARGE_MAX; }
    get charge(): number { return this._charge; }
    /** 施法剩余时间（前摇/buff 过载/光束持续期间 >0，图标施法环用） */
    private _buffLeft = 0;
    get durationLeft(): number {
        if (this._windup > 0) {
            return this._windup;
        }
        return this._buffLeft > 0 ? this._buffLeft : this._duration;
    }
    get durationTotal(): number {
        if (this._windup > 0) {
            return this._windupTotal;
        }
        return this._def.duration ?? 0;
    }

    /** 击杀充能：未解锁不充，满后不再累加 */
    addCharge(n: number = 1): void {
        if (!this._isUlt || !this.unlocked) {
            return;
        }
        const was = this._charge;
        this._charge = Math.min(ULTIMATE_CHARGE_MAX, this._charge + n);
        // 刚充满：自动释放延迟 1 秒（窗口内玩家可点按图标立即手动释放）
        if (was < ULTIMATE_CHARGE_MAX && this._charge >= ULTIMATE_CHARGE_MAX) {
            this._autoDelay = ULT_AUTO_CAST_DELAY;
        }
    }

    /** 等级成长后的实际伤害倍率 */
    get damageScale(): number {
        return this._def.damageScale * (1 + ABILITY_LEVEL_DMG_BONUS * (this.level - 1));
    }

    update(dt: number): void {
        if (!this.unlocked) {
            return;
        }
        this._recastLeft = Math.max(0, this._recastLeft - dt);
        this._buffLeft = Math.max(0, this._buffLeft - dt);
        this._autoDelay = Math.max(0, this._autoDelay - dt);
        // 前摇（起手蓄力）阶段：图标施法环推进，结束瞬间才真正索敌与结算
        if (this._windup > 0) {
            this._windup = Math.max(0, this._windup - dt);
            if (this._windup <= 0) {
                this._executeCast();
            }
            return;
        }
        if (this._duration > 0) {
            if (this._def.kind === 'laserbeam') {
                this._updateLaserBeam(dt);
            } else {
                this._updateBeam(dt);
            }
            return;
        }
        // 大招：不走时间冷却，击杀充能（水满后延迟 1 秒才自动施放，无目标时保持满充能待机；
        // 延迟窗口内玩家点按图标可立即手动释放）
        if (this._isUlt) {
            // GM 无限大招：无视充能直接就绪，且施放不消耗水
            if (!this._owner.gmInfUltimate && this._charge < ULTIMATE_CHARGE_MAX) {
                return;
            }
            if (this._autoDelay > 0) {
                return;
            }
            const target = this._owner.battle.findTargetOnScreen(this._owner.position, this._def.range);
            if (!target || this._recastLeft > 0 || !this._owner.battle.tryBeginAutoCast()) {
                return;
            }
            this._beginWindup(target);
            return;
        }
        this._cooldown = Math.max(0, this._cooldown - dt);
        if (this._cooldown > 0) {
            return;
        }
        // 技能施法统一严格入屏索敌：射线/方向锁定类技能不能瞄刚入场的屏顶外怪
        const target = this._owner.battle.findTargetOnScreen(this._owner.position, this._def.range);
        if (!target) {
            this._cooldown = 0;
            return;
        }
        if (this._recastLeft > 0 || !this._owner.battle.tryBeginAutoCast()) return;
        this._beginWindup(target);
    }

    /** 施法前摇时长：给技能/大招"起手-蓄力-爆发"的节奏。
     *  area 已有落点预警（castTime）、lock 已有读秒（lockTime），不再叠加 */
    private _windupDuration(): number {
        const d = this._def;
        if (d.kind === 'area' || d.kind === 'lock') {
            return 0;
        }
        if (d.kind === 'laserbeam') {
            return 0.7;
        }
        if (d.kind === 'buff' || d.kind === 'drone') {
            return 0.5;
        }
        return 0.5; // projectile / multi / beam
    }

    /** 进入前摇：英雄立即抬枪瞄准，枪口出现蓄力环，图标施法环同步推进。
     *  零前摇能力（area 已有落点预警 / lock 已有读秒）直接结算，不经过前摇分支 */
    private _beginWindup(target: EnemyHandle): void {
        this._pendingTarget = target;
        this._owner.stats.notifyShot?.(target.enemy.node.position);
        this._windupTotal = this._windupDuration();
        this._windup = this._windupTotal;
        if (this._windup > 0) {
            this._owner.battle.castChargeFx(
                this._owner.muzzleWorldPosition(), this._owner.def.bulletColor, this._windup);
        } else {
            this._executeCast();
        }
    }

    /** 手动点按大招：充满即可立即起手（跳过 1 秒自动延迟），走同样的前摇/结算流程 */
    manualCast(): boolean {
        const bm = this._owner.battle;
        if (!this.unlocked || this._windup > 0 || this._recastLeft > 0
            || bm.isPaused || bm.isGameOver) {
            return false;
        }
        if (this._isUlt && !this._owner.gmInfUltimate && this._charge < ULTIMATE_CHARGE_MAX) {
            return false;
        }
        const target = bm.findTargetOnScreen(this._owner.position, this._def.range);
        if (!target || !bm.tryBeginAutoCast()) {
            return false;
        }
        this._autoDelay = 0;
        this._beginWindup(target);
        return true;
    }

    /** 前摇结束：执行瞬间重索敌（原目标死亡/超程则改打当前最近入屏目标），
     *  无可打目标则放弃本次施法（冷却/充能未扣，稍后自动重试）。
     *  冷却与充能消耗都在结算时点，前摇期间暂停/倍速由战斗时钟统一驱动 */
    private _executeCast(): void {
        const battle = this._owner.battle;
        let target = this._pendingTarget;
        this._pendingTarget = null;
        if (!battle.isEnemyHandleValid(target, this._owner.position, this._def.range)) {
            target = battle.findTargetOnScreen(this._owner.position, this._def.range);
        }
        if (!target) {
            return;
        }
        this._owner.stats.notifyShot?.(target.enemy.node.position);
        this._recastLeft = this._recastDuration();
        this._cast(target);
        if (this._isUlt) {
            if (!this._owner.gmInfUltimate) {
                this._charge = 0;
            }
            this._autoDelay = 0;
        } else {
            this._cooldown = this._cooldownAfterCast();
        }
    }

    /** 不改伤害/多段时序，只阻止同一能力在上次表现结束前重入。 */
    private _recastDuration(): number {
        const d = this._def;
        let active = 0;
        if (d.kind === 'area') active = d.castTime ?? 0.35;
        else if (d.kind === 'lock') active = d.lockTime ?? 0.5;
        else if (d.kind === 'projectile' && !d.volley) active = ((d.projectileCount ?? 1) - 1) * 0.12;
        else if (d.kind === 'multi') active = 0.15 + ((d.maxTargets ?? 1) - 1) * 0.16;
        else if (d.kind === 'drone') active = d.duration ?? 5;
        else if (d.kind === 'buff') active = d.duration ?? 4;
        else if (d.kind === 'laserbeam') active = d.duration ?? 5;
        else if (d.kind === 'beam') active = d.duration ?? 1;
        return Math.max(AUTO_RECAST_FLOOR, active + 0.25);
    }

    /** GM 跳过正常冷却，但仍遵守施法保护；普通技能原有冷却不变。 */
    private _cooldownAfterCast(): number {
        return this._owner.gmNoSkillCooldown ? AUTO_RECAST_FLOOR : this._def.cooldown;
    }

    levelUp(): void {
        if (this.level >= ABILITY_MAX_LEVEL) {
            return;
        }
        this.level += 1;
        this._cooldown = 0;
    }

    /** 当前剩余冷却（图标 HUD 用） */
    get cdLeft(): number { return this._cooldown; }

    /** GM：冷却立即就绪（不打断光束持续） */
    resetCooldown(): void {
        this._cooldown = 0;
    }

    reset(): void {
        this.level = 0;
        this._charge = 0;
        this._cooldown = 0;
        this._recastLeft = 0;
        this._buffLeft = 0;
        this._duration = 0;
        this._tickTimer = 0;
        this._target = null;
        this._beamDir = null;
        this._windup = 0;
        this._windupTotal = 0;
        this._pendingTarget = null;
        this._autoDelay = 0;
    }

    private _cast(target: EnemyHandle): void {
        const damage = Math.round(this._owner.stats.atk * this.damageScale);
        // 伤害统计槽位：大招/技能
        const slot: DamageSlotKey = this._isUlt ? 'ultimate' : 'skill';
        const s = this._owner.battle.uiScale;
        // 施法射线/枪口特效的出发点（英雄枪口高度，与普攻出膛点一致）
        const muzzle = this._owner.muzzleWorldPosition();
        const color = this._owner.def.bulletColor;
        if (this._def.kind === 'projectile') {
            const count = this._def.projectileCount ?? 1;
            if (this._def.volley) {
                // 齐射：全部同帧扇形射出（间距 0.13 弧度 ≈ 7.4°），一发枪口闪光
                if (this._isUlt) {
                    SoundFx.play('ult');
                } else {
                    SoundFx.play('shoot');
                }
                // 枪口火焰朝主目标方向（正式火焰贴图带方向；粒子光斑不分方向）
                this._owner.battle.muzzleFlashFx(muzzle, color,
                    Math.atan2(-(target.enemy.node.position.x - muzzle.x), target.enemy.node.position.y - muzzle.y) * 180 / Math.PI);
                for (let i = 0; i < count; i++) {
                    const angle = (i - (count - 1) / 2) * 0.13;
                    this._owner.fireProjectile(target, damage,
                        this._def.projectileSpeed ?? this._owner.def.bulletSpeed,
                        this._def.projectileRadius ?? BattleConfig.BULLET_RADIUS,
                        !!this._def.pierce, false, angle, 0, undefined, slot);
                }
            } else {
                // 连发音射：逐发按 0.12s 间隔打出（每发出膛时重新索敌），有"打完一梭子"的持续时间
                if (this._isUlt) {
                    SoundFx.play('ult');
                }
                for (let i = 0; i < count; i++) {
                    const angle = (i - (count - 1) / 2) * 0.06;
                    this._owner.battle.delayCall(i * 0.12, () => {
                        // 出膛瞬间重索敌：原目标死亡则改打当前射程内最近目标（严格入屏，射线不出屏顶）
                        const t = this._owner.battle.findTargetOnScreen(this._owner.position, this._def.range) ?? target;
                        const m = this._owner.muzzleWorldPosition();
                        if (this._owner.def.id === 'radiation') {
                            this._owner.battle.corrosionPulse(m, 16 * s, 0.2);
                            this._owner.battle.precisionTracer(m, t.enemy.node.worldPosition, color, 3 * s, 0.13);
                        } else {
                            this._owner.battle.muzzleFlashFx(m, color);
                            this._owner.battle.precisionTracer(m, t.enemy.node.worldPosition,
                                color, 3 * s, this._isUlt ? 0.2 : 0.13);
                        }
                        SoundFx.play('shoot');
                        this._owner.fireProjectile(t, damage,
                            this._def.projectileSpeed ?? this._owner.def.bulletSpeed,
                            this._def.projectileRadius ?? BattleConfig.BULLET_RADIUS,
                            !!this._def.pierce, false, angle, 0, undefined, slot);
                    });
                }
            }
        } else if (this._def.kind === 'multi') {
            // 逐目标打击：每 0.16s 一记（射线+冲击环+迸溅+结算），大招持续输出而非一帧全爆
            SoundFx.play('ult');
            // 严格入屏索敌：射线技能不能瞄刚入场（身体还在屏顶外）的怪，否则射线拉出屏幕顶端
            const targets = this._owner.battle.findTargetsOnScreen(this._owner.position, this._def.range, this._def.maxTargets ?? 1);
            targets.forEach((item, i) => {
                this._owner.battle.delayCall(0.15 + i * 0.16, () => {
                    if (!this._owner.battle.isEnemyHandleValid(item)) {
                        return; // 目标已死：跳过本记
                    }
                    const m = this._owner.muzzleWorldPosition();
                    const pos = item.enemy.node.worldPosition;
                    this._owner.battle.precisionTracer(m, pos, color, 3 * s, 0.18);
                    if (this._owner.def.id === 'radiation') this._owner.battle.corrosionPulse(pos, 58 * s);
                    else this._owner.battle.precisionFlash(pos, 7, color);
                    this._owner.battle.applyDamage(item, damage, false, this._owner.def.id, slot);
                });
            });
        } else if (this._def.kind === 'area') {
            // 蓄力→起爆：预警圈从中心扩到伤害半径，到点双层冲击环+结算；
            // mortar=true 时先抛一枚榴弹弹体沿弧线飞向落点（榴弹炮）
            const actualRadius = (this._def.areaRadius ?? 200) * s;
            const castTime = this._def.castTime ?? 0.35;
            const center = target.enemy.node.worldPosition;
            const rifleMortar = this._owner.def.id === 'rifle' && this._def.id === 'rifle-barrage' && this._def.mortar;
            // 榴弹大招也必须明确触发抬枪/后坐与枪口闪光；弹体随后挂在 FxLayer，避免被英雄和载具遮住。
            if (rifleMortar) {
                this._owner.stats.notifyShot?.(center);
                this._owner.battle.muzzleFlashFx(muzzle, color,
                    Math.atan2(-(center.x - muzzle.x), center.y - muzzle.y) * 180 / Math.PI);
            }
            const impactFx = rifleMortar
                ? this._owner.battle.beginRifleMortarFx(muzzle, center, actualRadius, castTime, color)
                : null;
            if (!rifleMortar) {
                if (this._owner.def.id === 'radiation') this._owner.battle.corrosionPulse(center, actualRadius, castTime);
                else this._owner.battle.spawnTelegraphFx(center, actualRadius, color, castTime);
            }
            SoundFx.play('ult');
            if (this._def.mortar && !rifleMortar) {
                this._owner.battle.spawnMortarFx(muzzle, center, color, castTime);
            }
            this._owner.battle.delayCall(castTime, () => {
                if (impactFx) impactFx();
                else if (this._owner.def.id === 'radiation') this._owner.battle.corrosionPulse(center, actualRadius, 0.65);
                else {
                    this._owner.battle.burstUltRingFx(center, actualRadius, color);
                    this._owner.battle.burstHitSparks(center, new Color(255, 255, 255, 255));
                }
                this._owner.battle.applyAreaDamage(center, actualRadius, damage, this._owner.def.id, undefined, slot);
            });
        } else if (this._def.kind === 'drone') {
            // 召唤环绕无人机：持续 duration 秒（重新施放则替换旧机）
            this._owner.launchDrone(this.damageScale, this._def.duration ?? 5);
            SoundFx.play('ult');
            this._owner.battle.burstCastRing(this._owner.position, color);
        } else if (this._def.kind === 'lock') {
            // 猎杀锁定：准星锁上血量最高的 8 个敌人，读秒后齐射造成超高伤害，未死者挂红色标记
            SoundFx.play('ult');
            const lockTime = this._def.lockTime ?? 0.5;
            // 严格入屏锁定：读秒后的齐射射线同样不能指向屏顶外的怪
            const targets = this._owner.battle.findTargetsByHp(this._owner.position, this._def.range, this._def.maxTargets ?? 8)
                .filter(item => this._owner.battle.isEnemyHandleValid(item)
                    && item.enemy.node.position.y + item.enemy.radius < this._owner.battle.screenTop);
            for (const item of targets) {
                item.enemy.showReticle(new Color(255, 224, 130, 255), lockTime);
            }
            this._owner.battle.delayCall(lockTime, () => {
                const m = this._owner.muzzleWorldPosition();
                // 开火瞬间一记闷响（午时已到的"枪响"）
                SoundFx.play('boom');
                this._owner.battle.precisionFlash(m, 8, color);
                for (const item of targets) {
                    if (!this._owner.battle.isEnemyHandleValid(item)) {
                        continue; // 读秒期间死亡：跳过
                    }
                    const pos = item.enemy.node.worldPosition;
                    this._owner.battle.precisionTracer(m, pos, color, 3 * s, 0.16);
                    if (this._owner.def.id === 'radiation') this._owner.battle.corrosionPulse(pos, 58 * s);
                    else this._owner.battle.precisionFlash(pos, 7, color);
                    this._owner.battle.applyDamage(item, damage, false, this._owner.def.id, slot);
                    // 未死：挂上红色存活标记（随目标移动，6 秒后消失）
                    if (this._owner.battle.isEnemyHandleValid(item)) {
                        item.enemy.showReticle(new Color(255, 82, 82, 255), 6, true);
                    }
                }
            });
        } else if (this._def.kind === 'laserbeam') {
            // 贯穿光束：施法瞬间锁定方向（指向目标并延伸穿透全屏），持续 duration 秒
            const s = this._owner.battle.uiScale;
            const muzzle = this._owner.muzzleWorldPosition();
            const to = target.enemy.node.position;
            this._beamDir = new Vec3(to.x - muzzle.x, to.y - muzzle.y, 0).normalize();
            this._duration = this._def.duration ?? 5;
            this._tickTimer = 0;
            SoundFx.play('ult');
            this._owner.battle.burstCastRing(muzzle, color);
        } else if (this._def.kind === 'buff') {
            // 过载类：强化普攻（伤害倍率，持续 duration 秒；照抄 code(3).html 过载=伤害 ×2.2，无射程加成）
            this._owner.applyBasicBuff(this.damageScale, this._def.rangeMul ?? 1, this._def.duration ?? 4);
            this._buffLeft = this._def.duration ?? 4;
            // 施法瞬间冲击环（照抄 code(3).html ring(h.x,h.y,'rgba(120,230,255,.7)',10,70,.4)）
            this._owner.battle.burstCastRing(this._owner.position,
                new Color(120, 230, 255, 255));
            SoundFx.play('ult');
        } else {
            this._target = target;
            this._duration = this._def.duration ?? 1;
            this._tickTimer = 0;
        }
    }

    private _updateBeam(dt: number): void {
        this._duration -= dt;
        this._tickTimer -= dt;
        if (!this._owner.battle.isEnemyHandleValid(this._target, this._owner.position, this._def.range)) {
            this._target = this._owner.battle.findTargetOnScreen(this._owner.position, this._def.range);
        }
        if (this._target) {
            this._owner.drawBeam(this._def.id, this._target, 13 * this._owner.battle.uiScale);
            if (this._tickTimer <= 0) {
                const tick = this._def.tick ?? 0.25;
                const damage = Math.round(this._owner.stats.atk * this.damageScale * tick);
                this._owner.battle.applyDamage(this._target, damage, false, this._owner.def.id,
                    this._isUlt ? 'ultimate' : 'skill');
                this._tickTimer = tick;
            }
        }
        if (this._duration <= 0) {
            this._target = null;
            this._owner.clearBeam(this._def.id);
        }
    }

    /** 贯穿光束（激光手大招）：方向锁定不转向，每 tick 对线上所有敌人结算，持续期间光束常驻 */
    private _updateLaserBeam(dt: number): void {
        const bm = this._owner.battle;
        this._duration -= dt;
        const s = bm.uiScale;
        const muzzle = this._owner.muzzleWorldPosition();
        if (!this._beamDir) {
            this._duration = 0;
            this._owner.clearBeam(this._def.id);
            return;
        }
        // 身体朝向光束方向（notifyShot 同步读取，可复用暂存向量）
        SCRATCH_AIM.set(muzzle.x + this._beamDir.x * 300, muzzle.y + this._beamDir.y * 300, 0);
        this._owner.stats.notifyShot?.(SCRATCH_AIM, true);
        // 贯穿全屏：屏幕对角线再放 15% 余量（从底部枪口出发也能穿出对角），伤害判定与视觉同长
        const length = bm.screenDiag * 1.15;
        const halfWidth = 26 * s;
        this._owner.drawPiercingBeam(this._def.id + '_ult', muzzle, this._beamDir, length, 11 * s);
        this._tickTimer -= dt;
        if (this._tickTimer <= 0) {
            const tick = this._def.tick ?? 0.25;
            const damage = Math.max(1, Math.round(this._owner.stats.atk * this.damageScale * tick));
            bm.applyBeamDamage(muzzle, this._beamDir, length, halfWidth, damage,
                this._owner.def.id, 'ultimate');
            // Energy highlights are drawn on the shared beam path, not independent world particles.
            this._tickTimer = tick;
        }
        if (this._duration <= 0) {
            this._beamDir = null;
            this._owner.clearBeam(this._def.id + '_ult');
        }
    }
}

export class HeroCombatController {
    readonly battle: BattleManager;
    /** GM：1 号开关——技能无冷却（由 GmPanel 经 BattleManager 设置） */
    gmNoSkillCooldown = false;
    /** GM：2 号开关——大招无冷却（无限大招） */
    gmInfUltimate = false;
    private _basic: BasicAttack;
    private _skill: AbilityRuntime;
    private _ultimate: AbilityRuntime;
    /** 每条光束独立图层：普攻/技能光束同帧共存，互不擦除 */
    private _beams = new Map<string, Graphics>();
    private _fxTime = 0;
    /** 主色暂存（alpha 可变）：Graphics 赋值即值拷贝，可安全复用同一 Color */
    private _tint = new Color();

    constructor(
        readonly def: HeroDef,
        readonly stats: HeroCombatStats,
        private _heroNode: Node,
    ) {
        this.battle = BattleManager.instance;
        this._basic = def.weapon === 'laser' ? new LaserBasicAttack(this) : new ProjectileBasicAttack(this);
        this._skill = new AbilityRuntime(this, def.skill, false);
        this._ultimate = new AbilityRuntime(this, def.ultimate, true);
    }

    get position(): Vec3 { return this._heroNode.position; }

    /** Shared muzzle used by basic fire and abilities; stays in UnitsLayer coordinates.
     *  枪口偏移随身体瞄准角旋转（立绘绕英雄原点倾斜时枪管尖端跟着转，正角度=逆时针） */
    muzzleWorldPosition(): Vec3 {
        const s = this.battle.uiScale;
        const p = this._heroNode.position;
        const d = (this.def.muzzleY ?? 54) * s;
        const rad = this._heroNode.angle * Math.PI / 180;
        return new Vec3(p.x - Math.sin(rad) * d, p.y + Math.cos(rad) * d, 0);
    }
    get skillUnlocked(): boolean { return this._skill.unlocked; }
    get ultimateUnlocked(): boolean { return this._ultimate.unlocked; }
    get skillLevel(): number { return this._skill.level; }
    get ultimateLevel(): number { return this._ultimate.level; }

    /** 手动点按大招：充满立即起手（跳过自动延迟）；返回是否成功进入前摇 */
    tryManualUltimate(): boolean {
        return this._ultimate.manualCast();
    }

    /** 普攻增益层数：连射（多发/多束）、齐射（偏移弹，激光手无此卡） */
    private _multishot = 0;
    private _volley = 0;
    get multishotStacks(): number { return this._multishot; }
    get volleyStacks(): number { return this._volley; }
    levelUpMultishot(): void {
        if (this._multishot < BASIC_ENHANCE_MAX) {
            this._multishot += 1;
        }
    }
    levelUpVolley(): void {
        if (this._volley < BASIC_ENHANCE_MAX) {
            this._volley += 1;
        }
    }

    /** 普攻增益层数：穿透+1 / 范围爆炸 / 子弹分裂（激光手无这三卡） */
    private _pierce = 0;
    private _boom = 0;
    private _split = 0;
    get pierceStacks(): number { return this._pierce; }
    get boomStacks(): number { return this._boom; }
    get splitStacks(): number { return this._split; }
    levelUpPierce(): void {
        if (this._pierce < PIERCE_PLUS_MAX) {
            this._pierce += 1;
        }
    }
    levelUpBoom(): void {
        if (this._boom < BOOM_MAX) {
            this._boom += 1;
        }
    }
    levelUpSplit(): void {
        if (this._split < SPLIT_MAX) {
            this._split += 1;
        }
    }

    /** 裂变/爆炸进阶增益层数（裂变+1/裂变强化/爆炸范围/爆炸强化） */
    private _splitMore = 0;
    private _splitDmgUp = 0;
    private _boomRange = 0;
    private _boomDmgUp = 0;
    /** 次级爆炸层数（次级子弹命中后小范围爆炸；需先解锁分裂） */
    private _secBoom = 0;
    get splitMoreStacks(): number { return this._splitMore; }
    get splitDmgStacks(): number { return this._splitDmgUp; }
    get boomRangeStacks(): number { return this._boomRange; }
    get boomDmgStacks(): number { return this._boomDmgUp; }
    get secBoomStacks(): number { return this._secBoom; }
    levelUpSplitMore(): void {
        if (this._splitMore < SPLIT_MORE_MAX) {
            this._splitMore += 1;
        }
    }
    levelUpSplitDmg(): void {
        if (this._splitDmgUp < SPLIT_DMG_UP_MAX) {
            this._splitDmgUp += 1;
        }
    }
    levelUpBoomRange(): void {
        if (this._boomRange < BOOM_RANGE_MAX) {
            this._boomRange += 1;
        }
    }
    levelUpBoomDmg(): void {
        if (this._boomDmgUp < BOOM_DMG_UP_MAX) {
            this._boomDmgUp += 1;
        }
    }
    levelUpSecBoom(): void {
        if (this._secBoom < SEC_BOOM_MAX) {
            this._secBoom += 1;
        }
    }

    /** 技能/大招/普攻运行时信息（技能图标 HUD 与数值浮窗用） */
    private _basicDef: AbilityDef | null = null;

    abilityInfo(id: 'skill' | 'ultimate' | 'basic') {
        if (id === 'basic') {
            // 普攻常驻：合成一个基础能力定义供图标/浮窗展示
            if (!this._basicDef) {
                this._basicDef = {
                    id: this.def.id + '_basic',
                    name: '普通攻击',
                    desc: '自动瞄准射程内最近敌人',
                    kind: this.def.weapon === 'laser' ? 'beam' : 'projectile',
                    cooldown: this.stats.interval,
                    damageScale: 1,
                    range: this.stats.range,
                    targetMode: 'nearest',
                    maxTargets: 1,
                };
            }
            // 浮窗实时反映连射/齐射/穿透/爆炸/分裂增益
            const m = this._multishot;
            const v = this._volley;
            const isLaser = this.def.weapon === 'laser';
            if (isLaser) {
                this._basicDef.desc = m > 0
                    ? `同时锁定 ${1 + m} 个目标，单束伤害 -${20 * m}%`
                    : '自动瞄准射程内最近敌人';
                this._basicDef.maxTargets = 1 + m;
            } else {
                // 弹道 × 每道弹数：齐射 +1 条弹道，连射每条弹道 +2 发
                this._basicDef.desc = (m || v)
                    ? `${1 + v} 条弹道 × 每道 ${1 + m * 2} 发，单发伤害 -${20 * (m + v)}%`
                    : '自动瞄准射程内最近敌人';
                this._basicDef.maxTargets = (1 + v) * (1 + m * 2);
            }
            // 普攻增益汇总（浮窗行渲染用；未激活项为 0）
            const boomDmgMul = Math.pow(BOOM_RANGE_DMG_STEP, this._boomRange)
                * Math.pow(BOOM_DMG_UP_STEP, this._boomDmgUp);
            const splitDmgMul = Math.pow(SPLIT_MORE_DMG_STEP, this._splitMore)
                * Math.pow(SPLIT_DMG_UP_STEP, this._splitDmgUp);
            const enhances = {
                /** 非激光：每次普攻的弹数（弹道数 × 每道弹数） */
                bulletCount: (1 + v) * (1 + m * 2),
                pierceBonus: this._pierce,
                boomDmgPct: this._boom > 0
                    ? Math.round((BOOM_DMG_RATIO + BOOM_DMG_RATIO_STEP * (this._boom - 1)) * boomDmgMul * 100)
                    : 0,
                boomRadius: this._boom > 0
                    ? Math.round((BOOM_RADIUS + BOOM_RADIUS_STEP * (this._boom - 1))
                        * Math.pow(BOOM_RANGE_STEP, this._boomRange))
                    : 0,
                splitCount: this._split > 0 ? 2 + this._splitMore : 0,
                splitDmgPct: this._split > 0
                    ? Math.round(SPLIT_DMG_RATIO * splitDmgMul * 100)
                    : 0,
                secBoomDmgPct: this._secBoom > 0
                    ? Math.round((SEC_BOOM_DMG_RATIO + SEC_BOOM_DMG_RATIO_STEP * (this._secBoom - 1)) * 100)
                    : 0,
                secBoomRadius: this._secBoom > 0
                    ? SEC_BOOM_RADIUS + SEC_BOOM_RADIUS_STEP * (this._secBoom - 1)
                    : 0,
            };
            // 单发伤害已含连射/齐射的减伤系数
            const perBullet = Math.round(this.stats.atk
                * (isLaser ? Math.pow(BASIC_ENHANCE_DMG_STEP, m) : Math.pow(BASIC_ENHANCE_DMG_STEP, m + v)));
            return {
                def: this._basicDef,
                level: 1,
                unlocked: true,
                cdLeft: 0,
                cdTotal: 0,
                damage: perBullet,
                enhances,
            };
        }
        const rt = id === 'skill' ? this._skill : this._ultimate;
        // 未解锁时按 1 级数值展示（level=0 的伤害公式会算出 70% 的错误值）
        const effLevel = Math.max(1, rt.level);
        return {
            def: rt.def,
            level: rt.level,
            unlocked: rt.unlocked,
            cdLeft: rt.cdLeft,
            cdTotal: rt.def.cooldown,
            damage: Math.round(this.stats.atk * rt.def.damageScale
                * (1 + ABILITY_LEVEL_DMG_BONUS * (effLevel - 1))),
            charge: this.gmInfUltimate ? ULTIMATE_CHARGE_MAX : rt.charge,
            chargeMax: id === 'ultimate' ? ULTIMATE_CHARGE_MAX : 0,
            durationLeft: rt.durationLeft,
            durationTotal: rt.durationTotal,
        };
    }

    /** 环绕无人机（狙击技能召唤物；暂停随主循环冻结） */
    private _drone: OrbitDrone | null = null;

    /** 召唤/替换环绕无人机（AbilityRuntime 施法入口） */
    launchDrone(dmgScale: number, duration: number): void {
        this._drone?.destroy();
        this._drone = new OrbitDrone(this, dmgScale, duration);
    }

    update(dt: number): void {
        this._fxTime += dt;
        this._tickBuff(dt);
        // 贯穿光束引导期间挂起普攻激光（同一英雄身上双束分叉视觉穿帮），结束后自动恢复重锁
        const suspending = this._ultimate.isLaserBeamActive;
        if (suspending !== this._basicSuspended) {
            this._basicSuspended = suspending;
            this._basic.suspend?.(suspending);
        }
        this._basic.update(dt);
        this._skill.update(dt);
        this._ultimate.update(dt);
        if (this._drone) {
            this._drone.update(dt);
            if (this._drone.dead) {
                this._drone = null;
            }
        }
    }

    /** 普攻挂起状态（跟随大招贯穿光束） */
    private _basicSuspended = false;

    levelUpSkill(): void { this._skill.levelUp(); }
    levelUpUltimate(): void { this._ultimate.levelUp(); }

    /** 普攻强化 buff（buff 类技能驱动；null=未强化） */
    private _buff: BasicBuff | null = null;
    get basicBuff(): BasicBuff | null { return this._buff; }

    /** 应用普攻强化：持续时间内普攻伤害/射程乘以倍率 */
    applyBasicBuff(damageMul: number, rangeMul: number, duration: number): void {
        this._buff = { damageMul, rangeMul, left: duration };
    }

    private _tickBuff(dt: number): void {
        if (this._buff && (this._buff.left -= dt) <= 0) {
            this._buff = null;
        }
    }

    /** 击杀充能：本英雄大招 +n（仅已解锁时生效） */
    gainCharge(n: number = 1): void { this._ultimate.addCharge(n); }

    /** GM：清空技能/大招冷却 */
    resetCooldowns(): void {
        this._skill.resetCooldown();
        this._ultimate.resetCooldown();
    }

    reset(): void {
        this._fxTime = 0;
        this._basic.reset();
        this._skill.reset();
        this._ultimate.reset();
        this._multishot = 0;
        this._volley = 0;
        this._pierce = 0;
        this._boom = 0;
        this._split = 0;
        this._splitMore = 0;
        this._splitDmgUp = 0;
        this._boomRange = 0;
        this._boomDmgUp = 0;
        this._secBoom = 0;
        this._drone?.destroy();
        this._drone = null;
        this.clearBeam();
    }

    fireProjectile(target: EnemyHandle, damage: number, speed: number, radius: number,
        pierce: boolean, canCrit: boolean, angle = 0, spawnBack = 0, extras?: ProjectileExtras,
        slot: DamageSlotKey = 'basic'): void {
        const from = this.muzzleWorldPosition();
        const dir = new Vec3();
        Vec3.subtract(dir, target.enemy.node.position, from);
        if (angle !== 0) {
            const x = dir.x * Math.cos(angle) - dir.y * Math.sin(angle);
            const y = dir.x * Math.sin(angle) + dir.y * Math.cos(angle);
            dir.set(x, y, 0);
        }
        if (spawnBack > 0) {
            // 连射补弹沿射向向后错开，视觉上成"连发"纵队
            const back = new Vec3(dir);
            back.normalize().multiplyScalar(spawnBack);
            from.subtract(back);
        }
        if (slot === 'basic' && angle === 0 && spawnBack === 0) {
            if (this.def.id === 'radiation') this.battle.corrosionPulse(from, 12 * this.battle.uiScale, 0.18);
            // 步枪手光斑加大作为枪焰保底层（正式火焰贴图由 ProjectileBasicAttack 叠加其上）
            else this.battle.precisionFlash(from, this.def.id === 'rifle' ? 9 : (this.def.id === 'sniper' ? 3 : 5), this.def.bulletColor);
        }
        this.battle.spawnProjectile(from, dir, {
            damage, speed, radius, color: this.def.bulletColor, pierce, canCrit,
            sourceId: this.def.id,
            slot,
            pierceCount: extras?.pierceCount,
            boomLevel: extras?.boomLevel,
            splitCount: extras?.splitCount,
            splitDmgMul: extras?.splitDmgMul,
            boomRangeMul: extras?.boomRangeMul,
            boomDmgMul: extras?.boomDmgMul,
            secBoomLevel: extras?.secBoomLevel,
            visualKey: this.def.id === 'rifle'
                ? 'weapons/rifle_bullet'
                : this.def.id === 'sniper'
                    ? 'weapons/sniper_bullet'
                    : this.def.id === 'radiation'
                        ? 'weapons/radiation_bullet'
                        : undefined,
            visualScale: this.def.id === 'rifle' ? 1.25 : 1,
        });
    }

    /** 画 ownerId 命名的光束层（先清后画，多光束各占一层 Graphics） */
    drawBeam(ownerId: string, target: EnemyHandle, width: number): void {
        if (!this.battle.isEnemyHandleValid(target)) {
            this.clearBeam(ownerId);
            return;
        }
        const beam = this._beamFor(ownerId);
        // 光束画在英雄子层会跟随身体瞄准旋转——反向补偿，保证光束始终指向目标
        beam.node.angle = -this._heroNode.angle;
        beam.clear();
        const from = this._heroNode.worldPosition;
        const to = target.enemy.node.worldPosition;
        // 枪口偏移（照抄 code(3).html sx=h.x+cos(aim)*32, sy=h.y-14+sin(aim)*32）：
        // 光束从枪口出发——身体坐标 +14px 高度 + 沿瞄准方向前伸 32px
        const aim = Math.atan2(to.y - from.y, to.x - from.x);
        const muzzle = 32 * this.battle.uiScale;
        const sx = Math.cos(aim) * muzzle;
        const sy = 14 * this.battle.uiScale + Math.sin(aim) * muzzle;
        const dx = to.x - from.x - sx;
        const dy = to.y - from.y - sy;
        // demo 式三层光束：宽柔光晕 → 主色束 → 白热芯（宽柔层 alpha .28）
        beam.strokeColor = this._beamTint(71);
        beam.lineWidth = width * 2.6;
        beam.moveTo(sx, sy);
        beam.lineTo(dx + sx, dy + sy);
        beam.stroke();
        beam.strokeColor = this.def.bulletColor;
        beam.lineWidth = width;
        beam.moveTo(sx, sy);
        beam.lineTo(dx + sx, dy + sy);
        beam.stroke();
        beam.strokeColor = WHITE_CORE;
        beam.lineWidth = Math.max(1.5, width * 0.35);
        beam.moveTo(sx, sy);
        beam.lineTo(dx + sx, dy + sy);
        beam.stroke();
        // Stable muzzle halo and a single travelling segment on this same straight path.
        beam.fillColor = this._beamTint(65);
        beam.circle(sx, sy, width * 1.8); beam.fill();
        const flow = (this._fxTime * 1.4) % 1;
        const end = Math.min(1, flow + 0.12);
        beam.strokeColor = FLOW_BASIC;
        beam.lineWidth = Math.max(1.5, width * 0.5);
        beam.moveTo(sx + dx * flow, sy + dy * flow);
        beam.lineTo(sx + dx * end, sy + dy * end); beam.stroke();
        // 命中点光斑：三层同心圆模拟径向渐变（Graphics 无渐变 API；固定 alpha 展开，免每帧建数组）
        const spotR = width * 3.2;
        beam.fillColor = this._beamTint(40);
        beam.circle(dx + sx, dy + sy, spotR); beam.fill();
        beam.fillColor = this._beamTint(90);
        beam.circle(dx + sx, dy + sy, spotR * 0.62); beam.fill();
        beam.fillColor = this._beamTint(200);
        beam.circle(dx + sx, dy + sy, spotR * 0.3); beam.fill();
        // 白热命中核心
        beam.fillColor = WHITE_HIT;
        beam.circle(dx + sx, dy + sy, spotR * 0.16);
        beam.fill();
    }

    /** 画贯穿全屏的长光束（激光手大招）：三层共用同一条确定性波动路径（流动波纹），
     *  视觉起点与伤害判定的枪口（英雄位置 +54s）严格同点，杜绝"第二条线"分叉观感 */
    drawPiercingBeam(ownerId: string, muzzleWorld: Vec3, dir: Vec3, length: number, width: number): void {
        const beam = this._beamFor(ownerId);
        // 光束画在英雄子层会跟随身体瞄准旋转——反向补偿，保证光束方向锁定不变
        beam.node.angle = -this._heroNode.angle;
        beam.clear();
        const s = this.battle.uiScale;
        const now = this._fxTime;
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
        const ux = dir.x / len, uy = dir.y / len;   // 单位方向
        const px = -uy, py = ux;                    // 垂直方向（波纹偏移用）
        // muzzleWorld 实际是 UnitsLayer 内坐标；不能与含 Canvas 偏移的 worldPosition 相减。
        const sx = muzzleWorld.x - this._heroNode.position.x;
        const sy = muzzleWorld.y - this._heroNode.position.y;
        const c = this.def.bulletColor;

        // 采样一条共享路径：平滑行波（两个波长叠加，相位随时间沿束推进），枪口处收敛、离枪口后自由摆动
        const seg = 26 * s;
        const n = Math.max(8, Math.ceil(length / seg));
        if (BEAM_PATH_X.length < n + 1) {
            BEAM_PATH_X.length = n + 1;
            BEAM_PATH_Y.length = n + 1;
        }
        const ramp = 150 * s;   // 枪口收敛距离
        const A = 4.5 * s;      // 波纹幅度（克制：一条有能量的束，不是乱麻）
        for (let i = 0; i <= n; i++) {
            const d = (i / n) * length;
            const envelope = Math.min(1, d / ramp);
            const off = A * envelope * (
                Math.sin(d / (240 * s) - now * 21)
                + 0.55 * Math.sin(d / (97 * s) + now * 13)
            );
            BEAM_PATH_X[i] = sx + ux * d + px * off;
            BEAM_PATH_Y[i] = sy + uy * d + py * off;
        }

        // 外层柔光晕（呼吸：宽度随时间轻微起伏）
        const pulse = 1 + Math.sin(now * 9) * 0.08;
        beam.strokeColor = this._beamTint(60);
        beam.lineWidth = width * 3.0 * pulse;
        this._strokeSampledPath(beam, n);
        // 主束
        beam.strokeColor = c;
        beam.lineWidth = width;
        this._strokeSampledPath(beam, n);
        // 白热内芯
        beam.strokeColor = WHITE_HOT;
        beam.lineWidth = Math.max(2, width * 0.38);
        this._strokeSampledPath(beam, n);

        // Flow highlights reuse exact sampled vertices of the main path: no floating straight chord.
        beam.lineWidth = Math.max(2, width * 0.5);
        beam.strokeColor = FLOW_ULT;
        for (let i = 1; i <= n; i++) {
            if (((i / n * length - now * 420 * s) % (300 * s) + 300 * s) % (300 * s) > 80 * s) continue;
            beam.moveTo(BEAM_PATH_X[i - 1], BEAM_PATH_Y[i - 1]);
            beam.lineTo(BEAM_PATH_X[i], BEAM_PATH_Y[i]); beam.stroke();
        }

        // 枪口光斑（呼吸缩放的等离子团，盖在束起点上；固定 alpha 展开，免每帧建数组/对象）
        const spotR = width * 2.4 * pulse;
        beam.fillColor = this._beamTint(60);
        beam.circle(sx, sy, spotR); beam.fill();
        beam.fillColor = this._beamTint(130);
        beam.circle(sx, sy, spotR * 0.6); beam.fill();
        beam.fillColor = this._beamTint(230);
        beam.circle(sx, sy, spotR * 0.28); beam.fill();
        beam.fillColor = WHITE_CORE;
        beam.circle(sx, sy, spotR * 0.14);
        beam.fill();
    }

    /** 贯穿光束共享路径复描（消除每帧 strokePath 闭包分配） */
    private _strokeSampledPath(beam: Graphics, n: number): void {
        beam.moveTo(BEAM_PATH_X[0], BEAM_PATH_Y[0]);
        for (let i = 1; i <= n; i++) {
            beam.lineTo(BEAM_PATH_X[i], BEAM_PATH_Y[i]);
        }
        beam.stroke();
    }

    /** 主色 + 指定 alpha 的暂存色：Graphics 的 stroke/fill 赋值即值拷贝（引擎 _strokeColor.set），可复用同一对象 */
    private _beamTint(alpha: number): Color {
        const c = this.def.bulletColor;
        this._tint.set(c.r, c.g, c.b, alpha);
        return this._tint;
    }

    /** 清空指定光束层；不传 ownerId 则清空全部（暂停/重置用） */
    clearBeam(ownerId?: string): void {
        if (ownerId) {
            this._beamFor(ownerId).clear();
            return;
        }
        for (const beam of this._beams.values()) {
            beam.clear();
        }
    }

    private _beamFor(ownerId: string): Graphics {
        let beam = this._beams.get(ownerId);
        if (!beam) {
            const beamNode = createUINode('Beam_' + ownerId);
            this._heroNode.addChild(beamNode);
            beam = beamNode.addComponent(Graphics);
            this._beams.set(ownerId, beam);
        }
        return beam;
    }
}
