import { _decorator, Component, Graphics, tween, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Palette } from '../config/GameConfig';
import { MonsterInfo } from './WaveData';
import { BattleManager } from './BattleManager';

/**
 * 变异怪物：主要从屏幕上方追着向前开的载具车尾跑，少部分从两侧抄近路；
 * 追到车尾后啃咬一口耐久并消失。被击杀则掉落经验晶体。
 * 占位形象由 Graphics 绘制（普通怪=圆形、精英怪=倒三角），正式版替换为 sp.Skeleton。
 */
@ccclass('Enemy')
export class Enemy extends Component {
    maxHp = 100;
    hp = 100;
    speed = 100;
    radius = 30;
    touchDamage = 10;
    /** 追击车道：怪物沿自己的车道追向车尾 */
    private _laneX = 0;

    private _graphics: Graphics = null!;

    onLoad(): void {
        this._graphics = this.node.addComponent(Graphics);
    }

    /** 从池中取出后调用：按波次配置与成长系数初始化 */
    init(info: MonsterInfo, hpScale: number): void {
        this.maxHp = Math.round(info.hp * hpScale);
        this.hp = this.maxHp;
        this.speed = info.speed * (info.tier === 1 ? 1.15 : 1);
        this.radius = info.radius * (info.tier === 1 ? 1.35 : 1);
        this.touchDamage = info.touchDamage * (info.tier === 1 ? 2 : 1);
        this._laneX = (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH;
        this._draw(info);
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        const p = this.node.position;
        // 追到车尾：底边触到车尾上沿即啃咬
        if (p.y - this.radius <= bm.vehicleTopY) {
            bm.onEnemyReachVehicle(this);
            return;
        }
        // 沿自己的车道追向车尾（侧面出现的怪斜线切入车道，少走一段距离）
        const dx = this._laneX - p.x;
        const dy = bm.vehicleTopY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.node.setPosition(p.x + (dx / dist) * this.speed * dt, p.y + (dy / dist) * this.speed * dt);
    }

    /** 受击；返回是否已死亡（死亡结算由 BattleManager 处理） */
    takeDamage(dmg: number): boolean {
        if (this.hp <= 0) {
            return false;
        }
        this.hp -= dmg;
        // 受击反馈：轻微放大回弹
        tween(this.node)
            .to(0.05, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
        return this.hp <= 0;
    }

    private _draw(info: MonsterInfo): void {
        const g = this._graphics;
        g.clear();
        g.lineWidth = 4;
        const r = this.radius;
        if (info.tier === 1) {
            // 精英怪：倒三角（占位）
            g.strokeColor = Palette.elite;
            g.fillColor = Palette.elite;
            g.moveTo(0, -r);
            g.lineTo(r, r * 0.8);
            g.lineTo(-r, r * 0.8);
            g.close();
            g.fill();
            g.stroke();
        } else {
            // 普通怪：圆（占位）
            g.strokeColor = Palette.monster;
            g.fillColor = Palette.monster;
            g.circle(0, 0, r);
            g.fill();
            g.stroke();
            g.fillColor = Palette.bg;
            g.circle(-r * 0.35, r * 0.2, 5);
            g.circle(r * 0.35, r * 0.2, 5);
            g.fill();
        }
    }
}
