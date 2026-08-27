import { _decorator, Color, Component, Graphics, Vec3, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design } from '../config/GameConfig';
import { HeroDef } from './HeroDef';
import { Enemy } from './Enemy';
import { BattleManager } from './BattleManager';

/**
 * 普攻子弹：沿 init 给定方向飞行，飞出屏幕任意边缘后回收；
 * 辐射枪子弹可穿透（已命中的敌人不重复结算，命中记录在回池时清空）。
 * 命中判定统一在 BattleManager 中做，且只结算已进入屏幕的怪物。
 */
@ccclass('Bullet')
export class Bullet extends Component {
    atk = 0;
    radius = BattleConfig.BULLET_RADIUS;

    private _speed = BattleConfig.BULLET_SPEED;
    private _dir = new Vec3(0, 1, 0);
    private _pierce = false;
    private _hitSet: Set<Enemy> = new Set();

    onLoad(): void {
        this._draw(BattleConfig.BULLET_RADIUS, new Color(255, 238, 88, 255));
    }

    /** 攻击力 + 飞行方向 + 英雄武器外观（弹色/弹径/穿透） */
    init(atk: number, dir: Vec3, def: HeroDef): void {
        this.atk = atk;
        this._dir = dir.clone().normalize();
        this._speed = def.bulletSpeed;
        this._pierce = !!def.pierce;
        this._hitSet.clear();
        const r = BattleConfig.BULLET_RADIUS * (def.weapon === 'sniper' ? 1.4 : 1);
        this.radius = r;
        this._draw(r, def.bulletColor);
        this.node.angle = Math.atan2(-this._dir.x, this._dir.y) * 180 / Math.PI;
    }

    /** 穿透结算记录 */
    markHit(enemy: Enemy): void {
        this._hitSet.add(enemy);
    }

    hasHit(enemy: Enemy): boolean {
        return this._hitSet.has(enemy);
    }

    get pierce(): boolean {
        return this._pierce;
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        const p = this.node.position;
        this.node.setPosition(p.x + this._dir.x * this._speed * dt, p.y + this._dir.y * this._speed * dt);
        const halfW = Design.WIDTH / 2 + 60;
        const halfH = view.getVisibleSize().height / 2 + 60;
        if (p.x < -halfW || p.x > halfW || p.y < -halfH || p.y > halfH) {
            bm.recycleBullet(this);
        }
    }

    /** 弹体按英雄配色重绘（回池复用时会再次 init） */
    private _draw(r: number, color: Color): void {
        let g = this.node.getComponent(Graphics);
        if (!g) {
            g = this.node.addComponent(Graphics);
        }
        g.clear();
        g.fillColor = color;
        g.ellipse(0, 0, r * 0.7, r * 1.9);
        g.fill();
    }
}
