import { _decorator, Component, Graphics, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { Palette } from '../config/GameConfig';
import { createUINode } from '../core/createUINode';
import { HeroDef } from './HeroDef';
import { Enemy } from './Enemy';
import { BattleManager } from './BattleManager';

/**
 * 上阵英雄：站在载具上自动战斗，普攻行为由 HeroDef.weapon 决定——
 * rifle/sniper/radiation 为带间隔的单发瞄准射击（辐射枪穿透），
 * laser 为锁定目标的持续光束伤害。无目标在射程内时停机待命。
 * 技能/大招在 M2 阶段扩展；正式版形象替换为 sp.Skeleton。
 */
@ccclass('Hero')
export class Hero extends Component {
    def: HeroDef = null!;
    atk = 0;
    interval = 1;
    range = 800;

    private _fireTimer = 0;
    /** 激光光束绘制层（独立子节点，避免清掉占位形象） */
    private _beamG: Graphics = null!;
    private _beamTarget: Enemy | null = null;
    private _beamAccum = 0;
    private _beamAccumTime = 0;

    onLoad(): void {
        const beamNode = createUINode('Beam');
        this.node.addChild(beamNode);
        this._beamG = beamNode.addComponent(Graphics);
    }

    /** 部署/重开时按定义初始化（重开会还原所有强化） */
    init(def: HeroDef): void {
        this.def = def;
        this.atk = def.atk;
        this.interval = def.interval || 1;
        this.range = def.range;
        this._fireTimer = 0;
        this._beamTarget = null;
        this._beamAccum = 0;
        this._beamAccumTime = 0;
        this._beamG.clear();
        this._drawPlaceholder();
    }

    /** 三选一卡片强化入口 */
    applyBuff(type: 'atk' | 'rate' | 'range'): void {
        if (type === 'atk') {
            this.atk = Math.round(this.atk * 1.25);
        } else if (type === 'rate') {
            // 激光没有射速概念，射频强化转为提升每秒伤害
            if (this.def.weapon === 'laser') {
                this.atk = Math.round(this.atk * 1.15);
            } else {
                this.interval = Math.max(0.15, this.interval * 0.85);
            }
        } else {
            this.range = Math.min(1400, Math.round(this.range * 1.2));
        }
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            this._stopBeam();
            return;
        }
        if (this.def.weapon === 'laser') {
            this._updateLaser(dt);
            return;
        }
        this._fireTimer -= dt;
        if (this._fireTimer > 0) {
            return;
        }
        const target = bm.findTarget(this.node.position, this.range);
        if (!target) {
            this._fireTimer = 0;
            return;
        }
        const p = this.node.position;
        const from = new Vec3(p.x, p.y + 36);
        const dir = new Vec3();
        Vec3.subtract(dir, target.node.position, from);
        bm.spawnBullet(from, dir, this.def);
        this._fireTimer = this.interval;
    }

    /** 激光：锁定目标持续伤害，每 0.5s 结算一次伤害飘字 */
    private _updateLaser(dt: number): void {
        const bm = BattleManager.instance;
        // 目标已不在场上（被击杀/抵达载具回池）时必须立刻切走，
        // 否则光束会追踪已被回收的残留节点，指向屏幕外
        if (this._beamTarget && !bm.isEnemyInBattle(this._beamTarget)) {
            this._beamTarget = null;
        }
        if (this._beamTarget && !this._inRange(this._beamTarget)) {
            this._beamTarget = null;
        }
        if (!this._beamTarget) {
            // 切换目标前清空伤害累积，避免把上一目标的伤害算到新目标头上
            this._beamAccum = 0;
            this._beamAccumTime = 0;
            this._beamTarget = bm.findTarget(this.node.position, this.range);
        }
        if (!this._beamTarget) {
            this._stopBeam();
            return;
        }
        const target = this._beamTarget;
        this._beamAccum += this.atk * dt;
        this._beamAccumTime += dt;
        this._drawBeam(target);

        if (this._beamAccumTime >= 0.5) {
            const dmg = Math.round(this._beamAccum);
            const died = target.takeDamage(dmg);
            bm.spawnDamageNumber(target.node.worldPosition, dmg, false);
            this._beamAccum = 0;
            this._beamAccumTime = 0;
            if (died) {
                bm.killEnemy(target);
                this._beamTarget = null;
                this._stopBeam();
            }
        }
    }

    private _inRange(target: Enemy): boolean {
        const p = this.node.position;
        const tp = target.node.position;
        const dx = tp.x - p.x;
        const dy = tp.y - p.y;
        return target.hp > 0 && dx * dx + dy * dy <= this.range * this.range;
    }

    private _drawBeam(target: Enemy): void {
        const g = this._beamG;
        g.clear();
        g.strokeColor = this.def.bulletColor;
        g.lineWidth = 4;
        // 光束节点挂在英雄身上，双方无旋转缩放，直接用世界坐标差换算本地坐标
        const from = this.node.worldPosition;
        const to = target.node.worldPosition;
        g.moveTo(0, 26);
        g.lineTo(to.x - from.x, to.y - from.y);
        g.stroke();
    }

    private _stopBeam(): void {
        this._beamG.clear();
        this._beamAccum = 0;
        this._beamAccumTime = 0;
    }

    /** 占位绘制：英雄主色圆 + 中央枪管（颜色区分英雄） */
    private _drawPlaceholder(): void {
        // 先清掉旧的占位形象再重画（init 换色时调用）
        const own = this.node.getComponents(Graphics);
        for (const g of own) {
            g.clear();
        }
        const g = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
        g.fillColor = Palette.heroDark;
        g.roundRect(-42, -46, 84, 12, 6);
        g.fill();
        g.fillColor = this.def.color;
        g.circle(0, 0, 30);
        g.fill();
        g.fillColor = Palette.heroDark;
        g.roundRect(-5, 20, 10, 46, 4);
        g.fill();
    }
}
