import { Graphics, Node, Vec3 } from 'cc';
import { BattleConfig } from '../config/GameConfig';
import { createUINode } from '../core/createUINode';
import { BattleManager, EnemyHandle } from './BattleManager';
import { ABILITY_LEVEL_DMG_BONUS, ABILITY_MAX_LEVEL, AbilityDef, HeroDef, ULTIMATE_CHARGE_MAX } from './HeroDef';

/** GM 无冷却/无限大招模式下的最小施放间隔（秒），避免逐帧刷弹刷伤害 */
const GM_NO_CD_FLOOR = 0.1;

export interface HeroCombatStats {
    atk: number;
    interval: number;
    range: number;
}

interface BasicAttack {
    update(dt: number): void;
    reset(): void;
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
        this._owner.fireProjectile(target, this._owner.stats.atk, this._owner.def.bulletSpeed,
            BattleConfig.BULLET_RADIUS * (this._owner.def.weapon === 'sniper' ? 1.4 : 1),
            !!this._owner.def.pierce, true);
        this._timer = this._owner.stats.interval;
    }

    reset(): void { this._timer = 0; }
}

class LaserBasicAttack implements BasicAttack {
    private _target: EnemyHandle | null = null;
    private _damage = 0;
    private _time = 0;

    constructor(private _owner: HeroCombatController) {}

    update(dt: number): void {
        if (!this._owner.battle.isEnemyHandleValid(this._target, this._owner.position, this._owner.stats.range)) {
            this._target = this._owner.battle.findTarget(this._owner.position, this._owner.stats.range);
            this._damage = 0;
            this._time = 0;
        }
        if (!this._target) {
            this._owner.clearBeam('basic');
            return;
        }
        this._owner.drawBeam('basic', this._target, 6 * this._owner.battle.uiScale);
        this._damage += this._owner.stats.atk * dt;
        this._time += dt;
        if (this._time >= 0.5) {
            this._owner.battle.applyDamage(this._target, Math.round(this._damage), false, this._owner.def.id);
            this._damage = 0;
            this._time = 0;
        }
    }

    reset(): void {
        this._target = null;
        this._damage = 0;
        this._time = 0;
        this._owner.clearBeam('basic');
    }
}

/** 技能/大招运行时：解锁=1 级（升级卡再升，满级 ABILITY_MAX_LEVEL），每级伤害 +30% */
class AbilityRuntime {
    level = 0;
    /** 大招击杀充能（仅 ultimate 使用，0~ULTIMATE_CHARGE_MAX） */
    private _charge = 0;
    private _cooldown = 0;
    private _duration = 0;
    private _tickTimer = 0;
    private _target: EnemyHandle | null = null;

    constructor(private _owner: HeroCombatController, private _def: AbilityDef, private _isUlt: boolean) {}

    /** 能力定义（图标 HUD/浮窗读取；注意运行时字段名是 _def，直接取 .def 会是 undefined） */
    get def(): AbilityDef { return this._def; }

    get unlocked(): boolean { return this.level > 0; }

    /** 大招充能是否已满 */
    get chargeFull(): boolean { return this._charge >= ULTIMATE_CHARGE_MAX; }
    get charge(): number { return this._charge; }

    /** 击杀充能：未解锁不充，满后不再累加 */
    addCharge(n: number = 1): void {
        if (!this._isUlt || !this.unlocked) {
            return;
        }
        this._charge = Math.min(ULTIMATE_CHARGE_MAX, this._charge + n);
    }

    /** 等级成长后的实际伤害倍率 */
    get damageScale(): number {
        return this._def.damageScale * (1 + ABILITY_LEVEL_DMG_BONUS * (this.level - 1));
    }

    update(dt: number): void {
        if (!this.unlocked) {
            return;
        }
        if (this._duration > 0) {
            this._updateBeam(dt);
            return;
        }
        // 大招：不走时间冷却，击杀充能（水满才自动施放，无目标时保持满充能待机）
        if (this._isUlt) {
            // GM 无限大招：无视充能直接就绪，且施放不消耗水
            if (!this._owner.gmInfUltimate && this._charge < ULTIMATE_CHARGE_MAX) {
                return;
            }
            const target = this._owner.battle.findTarget(this._owner.position, this._def.range * this._owner.battle.uiScale);
            if (!target) {
                return;
            }
            this._cast(target);
            if (!this._owner.gmInfUltimate) {
                this._charge = 0;
            }
            return;
        }
        this._cooldown -= dt;
        if (this._cooldown > 0) {
            return;
        }
        const target = this._owner.battle.findTarget(this._owner.position, this._def.range * this._owner.battle.uiScale);
        if (!target) {
            this._cooldown = 0;
            return;
        }
        this._cast(target);
        this._cooldown = this._cooldownAfterCast();
    }

    /** GM 开关生效点：对应槽位开着 GM 模式时，施放后只进 0.1s 地板间隔
     * （注意 AbilityDef 上没有 slot 字段，技能槽用 !this._isUlt 判断） */
    private _cooldownAfterCast(): number {
        if (!this._isUlt && this._owner.gmNoSkillCooldown) {
            return GM_NO_CD_FLOOR;
        }
        if (this._isUlt && this._owner.gmInfUltimate) {
            return GM_NO_CD_FLOOR;
        }
        return this._def.cooldown;
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
        this._duration = 0;
        this._tickTimer = 0;
        this._target = null;
    }

    private _cast(target: EnemyHandle): void {
        const damage = Math.round(this._owner.stats.atk * this.damageScale);
        if (this._def.kind === 'projectile') {
            const count = this._def.projectileCount ?? 1;
            for (let i = 0; i < count; i++) {
                const angle = (i - (count - 1) / 2) * 0.06;
                this._owner.fireProjectile(target, damage,
                    this._def.projectileSpeed ?? this._owner.def.bulletSpeed,
                    this._def.projectileRadius ?? BattleConfig.BULLET_RADIUS,
                    !!this._def.pierce, false, angle);
            }
        } else if (this._def.kind === 'multi') {
            const targets = this._owner.battle.findTargets(this._owner.position, this._def.range * this._owner.battle.uiScale, this._def.maxTargets ?? 1);
            for (const item of targets) {
                this._owner.battle.applyDamage(item, damage, false, this._owner.def.id);
            }
        } else if (this._def.kind === 'area') {
            this._owner.battle.applyAreaDamage(target.enemy.node.position, (this._def.areaRadius ?? 200) * this._owner.battle.uiScale, damage, this._owner.def.id);
        } else {
            this._target = target;
            this._duration = this._def.duration ?? 1;
            this._tickTimer = 0;
        }
    }

    private _updateBeam(dt: number): void {
        this._duration -= dt;
        this._tickTimer -= dt;
        const range = this._def.range * this._owner.battle.uiScale;
        if (!this._owner.battle.isEnemyHandleValid(this._target, this._owner.position, range)) {
            this._target = this._owner.battle.findTarget(this._owner.position, range);
        }
        if (this._target) {
            this._owner.drawBeam(this._def.id, this._target, 13 * this._owner.battle.uiScale);
            if (this._tickTimer <= 0) {
                const tick = this._def.tick ?? 0.25;
                const damage = Math.round(this._owner.stats.atk * this.damageScale * tick);
                this._owner.battle.applyDamage(this._target, damage, false, this._owner.def.id);
                this._tickTimer = tick;
            }
        }
        if (this._duration <= 0) {
            this._target = null;
            this._owner.clearBeam(this._def.id);
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
    get skillUnlocked(): boolean { return this._skill.unlocked; }
    get ultimateUnlocked(): boolean { return this._ultimate.unlocked; }
    get skillLevel(): number { return this._skill.level; }
    get ultimateLevel(): number { return this._ultimate.level; }

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
            return {
                def: this._basicDef,
                level: 1,
                unlocked: true,
                cdLeft: 0,
                cdTotal: 0,
                damage: Math.round(this.stats.atk),
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
        };
    }

    update(dt: number): void {
        this._basic.update(dt);
        this._skill.update(dt);
        this._ultimate.update(dt);
    }

    levelUpSkill(): void { this._skill.levelUp(); }
    levelUpUltimate(): void { this._ultimate.levelUp(); }

    /** 击杀充能：本英雄大招 +n（仅已解锁时生效） */
    gainCharge(n: number = 1): void { this._ultimate.addCharge(n); }

    /** GM：清空技能/大招冷却 */
    resetCooldowns(): void {
        this._skill.resetCooldown();
        this._ultimate.resetCooldown();
    }

    reset(): void {
        this._basic.reset();
        this._skill.reset();
        this._ultimate.reset();
        this.clearBeam();
    }

    fireProjectile(target: EnemyHandle, damage: number, speed: number, radius: number,
        pierce: boolean, canCrit: boolean, angle = 0): void {
        const from = new Vec3(this.position.x, this.position.y + 36 * this.battle.uiScale);
        const dir = new Vec3();
        Vec3.subtract(dir, target.enemy.node.position, from);
        if (angle !== 0) {
            const x = dir.x * Math.cos(angle) - dir.y * Math.sin(angle);
            const y = dir.x * Math.sin(angle) + dir.y * Math.cos(angle);
            dir.set(x, y, 0);
        }
        this.battle.spawnProjectile(from, dir, {
            damage, speed, radius, color: this.def.bulletColor, pierce, canCrit,
            sourceId: this.def.id,
        });
    }

    /** 画 ownerId 命名的光束层（先清后画，多光束各占一层 Graphics） */
    drawBeam(ownerId: string, target: EnemyHandle, width: number): void {
        if (!this.battle.isEnemyHandleValid(target)) {
            this.clearBeam(ownerId);
            return;
        }
        const beam = this._beamFor(ownerId);
        beam.clear();
        beam.strokeColor = this.def.bulletColor;
        beam.lineWidth = width;
        const from = this._heroNode.worldPosition;
        const to = target.enemy.node.worldPosition;
        beam.moveTo(0, 26);
        beam.lineTo(to.x - from.x, to.y - from.y);
        beam.stroke();
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
