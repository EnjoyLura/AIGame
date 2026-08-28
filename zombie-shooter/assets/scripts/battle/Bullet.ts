import { _decorator, Color, Component, Graphics, Vec3, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design } from '../config/GameConfig';
import { EnemyHandle, BattleManager } from './BattleManager';

export interface ProjectileSpec {
    damage: number;
    speed: number;
    radius: number;
    color: Color;
    pierce: boolean;
    canCrit: boolean;
}

@ccclass('Bullet')
export class Bullet extends Component {
    damage = 0;
    radius = BattleConfig.BULLET_RADIUS;

    private _speed = BattleConfig.BULLET_SPEED;
    private _dir = new Vec3(0, 1, 0);
    private _pierce = false;
    private _canCrit = false;
    private _hitSet: Set<number> = new Set();

    onLoad(): void {
        this._draw(BattleConfig.BULLET_RADIUS, new Color(255, 238, 88, 255));
    }

    init(dir: Vec3, spec: ProjectileSpec): void {
        this.damage = spec.damage;
        this._dir = dir.clone().normalize();
        this._speed = spec.speed;
        this._pierce = spec.pierce;
        this._canCrit = spec.canCrit;
        this._hitSet.clear();
        this.radius = spec.radius;
        this._draw(spec.radius, spec.color);
        this.node.angle = Math.atan2(-this._dir.x, this._dir.y) * 180 / Math.PI;
    }

    markHit(handle: EnemyHandle): void { this._hitSet.add(handle.spawnId); }
    hasHit(handle: EnemyHandle): boolean { return this._hitSet.has(handle.spawnId); }
    get pierce(): boolean { return this._pierce; }
    get canCrit(): boolean { return this._canCrit; }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        const p = this.node.position;
        this.node.setPosition(p.x + this._dir.x * this._speed * dt, p.y + this._dir.y * this._speed * dt);
        const next = this.node.position;
        const halfW = Design.WIDTH / 2 + 60;
        const halfH = view.getVisibleSize().height / 2 + 60;
        if (next.x < -halfW || next.x > halfW || next.y < -halfH || next.y > halfH) {
            bm.recycleBullet(this);
        }
    }

    private _draw(r: number, color: Color): void {
        const g = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
        g.clear();
        g.fillColor = color;
        g.ellipse(0, 0, r * 0.7, r * 1.9);
        g.fill();
    }
}
