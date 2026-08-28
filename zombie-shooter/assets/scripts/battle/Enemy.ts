import { _decorator, Color, Component, Graphics, tween, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Palette } from '../config/GameConfig';
import { MonsterBehavior, MonsterInfo } from './WaveData';
import { BattleManager } from './BattleManager';

/**
 * 变异怪物：按 WaveData 的 behavior 分派移动逻辑——
 * chaser 直线追车 / swarm 疯狗锯齿走位成群 / charger 野猪贴近蓄力再冲刺 /
 * tanker 双足熊高血肉盾 / diver 疯鹰侧翼斜线俯冲。
 * 追到车尾后啃咬一口耐久并消失；被击杀掉落经验晶体。
 * 占位形象由 Graphics 按 behavior 绘制（正式版替换为 sp.Skeleton）。
 */
@ccclass('Enemy')
export class Enemy extends Component {
    private static _nextSpawnId = 1;
    spawnId = 0;
    maxHp = 100;
    hp = 100;
    speed = 100;
    radius = 30;
    touchDamage = 10;
    /** 追击车道：怪物沿自己的车道追向车尾 */
    private _laneX = 0;
    private _behavior: MonsterBehavior = 'chaser';
    /** swarm：锯齿走位参数与相位 */
    private _weaveAmp = 0;
    private _weaveFreq = 0;
    private _weavePhase = 0;
    /** charger：蓄力-冲刺状态机（蓄力期间定身，是集火窗口） */
    private _chargeState: 'advance' | 'windup' | 'dash' = 'advance';
    private _windupLeft = 0;
    private _windupTime = 0.6;
    private _dashRange = 340;
    private _dashSpeed = 430;
    private _windupPos = new Vec3();

    private _graphics: Graphics = null!;

    onLoad(): void {
        this._graphics = this.node.addComponent(Graphics);
    }

    /** 从池中取出后调用：按波次配置与成长系数初始化；成群刷怪时由外部指定共享车道 */
    init(info: MonsterInfo, hpScale: number, laneX?: number): void {
        this.spawnId = Enemy._nextSpawnId++;
        this.maxHp = Math.round(info.hp * hpScale);
        this.hp = this.maxHp;
        this.speed = info.speed * (info.tier === 1 ? 1.15 : 1);
        this.radius = info.radius * (info.tier === 1 ? 1.35 : 1);
        this.touchDamage = info.touchDamage * (info.tier === 1 ? 2 : 1);
        this._behavior = info.behavior;
        this._weaveAmp = info.weaveAmp ?? 0;
        this._weaveFreq = info.weaveFreq ?? 0;
        this._weavePhase = Math.random() * Math.PI * 2;
        this._chargeState = 'advance';
        this._windupLeft = 0;
        this._windupTime = info.windupTime ?? 0.6;
        this._dashRange = info.dashRange ?? 340;
        this._dashSpeed = info.dashSpeed ?? 430;
        this._laneX = laneX ?? (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH;
        // 蓄力中途被回收的怪会带缩放入池，重置防串状态
        this.node.setScale(1, 1, 1);
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
        switch (this._behavior) {
            case 'swarm':
                this._weavePhase += dt * this._weaveFreq;
                this._chase(dt, bm, this._laneX + Math.sin(this._weavePhase) * this._weaveAmp);
                break;
            case 'charger':
                this._updateCharger(dt, bm);
                break;
            default:
                // chaser/tanker/diver：直线追向车道目标（diver 的斜线俯冲由侧翼入场点形成）
                this._chase(dt, bm, this._laneX);
                break;
        }
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

    // ================= 行为逻辑 =================

    private _chase(dt: number, bm: BattleManager, targetX: number): void {
        const p = this.node.position;
        const dx = targetX - p.x;
        const dy = bm.vehicleTopY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 0.001) {
            return;
        }
        this.node.setPosition(p.x + (dx / dist) * this.speed * dt, p.y + (dy / dist) * this.speed * dt);
    }

    private _updateCharger(dt: number, bm: BattleManager): void {
        const p = this.node.position;
        if (this._chargeState === 'advance') {
            const distToLine = p.y - this.radius - bm.vehicleTopY;
            if (distToLine <= this._dashRange) {
                // 进入冲刺发起距离：定身蓄力（telegraph），是集火击杀窗口
                this._chargeState = 'windup';
                this._windupLeft = this._windupTime;
                this._windupPos.set(p.x, p.y, 0);
                return;
            }
            this._chase(dt, bm, this._laneX);
            return;
        }
        if (this._chargeState === 'windup') {
            this._windupLeft -= dt;
            // 蓄力表现：定身 + 缩放脉冲 + 轻微颤抖
            const k = 1 - Math.max(0, this._windupLeft) / this._windupTime;
            const pulse = 1 + 0.18 * Math.sin(k * Math.PI * 6);
            this.node.setScale(pulse, pulse, 1);
            this.node.setPosition(this._windupPos.x + (Math.random() * 2 - 1) * 2.5, this._windupPos.y);
            if (this._windupLeft <= 0) {
                this._chargeState = 'dash';
                this.node.setScale(1, 1, 1);
            }
            return;
        }
        // dash：蓄力完毕，直线高速扑向车尾
        const step = Math.min(this._dashSpeed * dt, p.y - bm.vehicleTopY - this.radius);
        this.node.setPosition(p.x, p.y - Math.max(0, step));
    }

    // ================= 占位绘制 =================

    private _draw(info: MonsterInfo): void {
        const g = this._graphics;
        g.clear();
        g.lineWidth = 4;
        const r = this.radius;
        const elite = info.tier === 1;
        const main = elite ? Palette.elite : this._bodyColor(info.behavior);
        g.fillColor = main;
        g.strokeColor = main;
        switch (info.behavior) {
            case 'swarm':
                this._drawDog(g, r);
                break;
            case 'charger':
                this._drawBoar(g, r);
                break;
            case 'tanker':
                this._drawBear(g, r);
                break;
            case 'diver':
                this._drawEagle(g, r);
                break;
            default:
                this._drawCrawler(g, r, elite);
                break;
        }
    }

    private _bodyColor(behavior: MonsterBehavior): Color {
        switch (behavior) {
            case 'swarm': return new Color(255, 202, 40, 255);   // 疯狗：琥珀
            case 'charger': return new Color(178, 115, 80, 255); // 野猪：棕
            case 'tanker': return new Color(66, 56, 49, 255);    // 熊：深褐
            case 'diver': return new Color(149, 117, 205, 255);  // 疯鹰：紫
            default: return Palette.monster;                     // 爬行者：绿
        }
    }

    /** 爬行者：圆身+双眼（原有形态） */
    private _drawCrawler(g: Graphics, r: number, elite: boolean): void {
        g.circle(0, 0, r);
        g.fill();
        g.stroke();
        if (!elite) {
            g.fillColor = Palette.bg;
            g.circle(-r * 0.35, r * 0.2, 5);
            g.circle(r * 0.35, r * 0.2, 5);
            g.fill();
        }
    }

    /** 疯狗：横向椭圆身+前伸头+翘尾 */
    private _drawDog(g: Graphics, r: number): void {
        g.ellipse(0, r * 0.1, r * 1.2, r * 0.8);
        g.fill();
        g.circle(0, -r * 0.65, r * 0.45);
        g.fill();
        g.lineWidth = 3;
        g.moveTo(r * 0.9, r * 0.5);
        g.lineTo(r * 1.3, r * 0.9);
        g.stroke();
        g.fillColor = Palette.bg;
        g.circle(-r * 0.15, -r * 0.7, 2.5);
        g.circle(r * 0.15, -r * 0.7, 2.5);
        g.fill();
    }

    /** 野猪：圆角方身+獠牙+猪鼻（头朝下=车尾方向） */
    private _drawBoar(g: Graphics, r: number): void {
        g.roundRect(-r, -r * 0.7, r * 2, r * 1.4, r * 0.5);
        g.fill();
        g.fillColor = new Color(240, 230, 210, 255);
        g.moveTo(-r * 0.55, -r * 0.55);
        g.lineTo(-r * 0.35, -r * 1.05);
        g.lineTo(-r * 0.2, -r * 0.55);
        g.close();
        g.fill();
        g.moveTo(r * 0.55, -r * 0.55);
        g.lineTo(r * 0.35, -r * 1.05);
        g.lineTo(r * 0.2, -r * 0.55);
        g.close();
        g.fill();
        g.fillColor = Palette.bg;
        g.ellipse(0, -r * 0.55, r * 0.28, r * 0.18);
        g.fill();
    }

    /** 双足熊：大圆身+双耳+浅色口鼻 */
    private _drawBear(g: Graphics, r: number): void {
        g.circle(0, 0, r);
        g.fill();
        g.circle(-r * 0.55, -r * 0.75, r * 0.28);
        g.fill();
        g.circle(r * 0.55, -r * 0.75, r * 0.28);
        g.fill();
        g.fillColor = new Color(122, 104, 88, 255);
        g.ellipse(0, -r * 0.35, r * 0.42, r * 0.32);
        g.fill();
        g.fillColor = Palette.bg;
        g.circle(-r * 0.18, -r * 0.5, 3);
        g.circle(r * 0.18, -r * 0.5, 3);
        g.fill();
    }

    /** 疯鹰：菱形身+双展翅（俯冲姿态） */
    private _drawEagle(g: Graphics, r: number): void {
        g.moveTo(0, -r * 1.1);
        g.lineTo(r * 0.55, 0);
        g.lineTo(0, r);
        g.lineTo(-r * 0.55, 0);
        g.close();
        g.fill();
        g.moveTo(-r * 0.4, 0);
        g.lineTo(-r * 1.5, r * 0.35);
        g.lineTo(-r * 0.5, r * 0.45);
        g.close();
        g.fill();
        g.moveTo(r * 0.4, 0);
        g.lineTo(r * 1.5, r * 0.35);
        g.lineTo(r * 0.5, r * 0.45);
        g.close();
        g.fill();
    }
}
