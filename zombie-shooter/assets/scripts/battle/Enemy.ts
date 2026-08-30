import { _decorator, Color, Component, Graphics, Node, Sprite, tween, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Palette } from '../config/GameConfig';
import { createUINode } from '../core/createUINode';
import { AssetLib } from '../core/AssetLib';
import { MonsterBehavior, MonsterInfo } from './WaveData';
import { BattleManager } from './BattleManager';

/** 已有美术立绘的怪型（key 相对 textures/；缺图的回退 Graphics 占位） */
const MONSTER_ART: Partial<Record<MonsterBehavior, string>> = {
    charger: 'monsters/boar',
};

/**
 * 变异怪物：按 WaveData 的 behavior 分派移动逻辑——
 * chaser 直线追车 / swarm 疯狗成群直线快跑 / charger 野猪贴近蓄力再冲刺 /
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
    private _behavior: MonsterBehavior = 'chaser';
    /** 行走动效参数（按怪型在 init 配置） */
    private _walkPhase = 0;
    private _walkFreq = 9;
    private _bobAmp = 2;
    private _isFlyer = false;
    /** charger：蓄力-冲刺状态机（蓄力期间定身，是集火窗口） */
    private _chargeState: 'advance' | 'windup' | 'dash' = 'advance';
    private _windupLeft = 0;
    private _windupTime = 0.6;
    private _dashRange = 340;
    private _dashSpeed = 430;
    private _windupPos = new Vec3();

    private _graphics: Graphics = null!;
    /** 视觉子节点：占位 Graphics 画在它本体，行走动效作用于它（不影响逻辑坐标） */
    private _bodyNode: Node = null!;
    /** 美术立绘子节点：Sprite 必须与 Graphics 分节点（同节点先后挂两个渲染组件会导致 Sprite 不渲染） */
    private _artNode: Node | null = null;
    /** 脚下阴影/精英圈层（接地感，不跟随身体摆动） */
    private _shadowNode: Node | null = null;
    /** 行走动效参数（按怪型在 init 配置） */
    private _walkPhase = 0;
    private _walkFreq = 9;
    private _bobAmp = 2;
    private _isFlyer = false;

    onLoad(): void {
        // 根节点必须有 UITransform：2D 渲染靠它逐层计算子节点世界矩阵
        // （占位 Graphics 移到 Body 后根节点不再自动获得，缺失会导致子孙 Sprite 整体不渲染）
        this.node.addComponent(UITransform);
        this._bodyNode = createUINode('Body');
        this.node.addChild(this._bodyNode);
        this._graphics = this._bodyNode.addComponent(Graphics);
    }

    /** 从池中取出后调用：按波次配置与成长系数初始化 */
    init(info: MonsterInfo, hpScale: number): void {
        this.spawnId = Enemy._nextSpawnId++;
        this.maxHp = Math.round(info.hp * hpScale);
        this.hp = this.maxHp;
        this.speed = info.speed * (info.tier === 1 ? 1.15 : 1);
        this.radius = info.radius * (info.tier === 1 ? 1.35 : 1);
        this.touchDamage = info.touchDamage * (info.tier === 1 ? 2 : 1);
        this._behavior = info.behavior;
        this._chargeState = 'advance';
        this._windupLeft = 0;
        this._windupTime = info.windupTime ?? 0.6;
        this._dashRange = info.dashRange ?? 510;
        this._dashSpeed = info.dashSpeed ?? 645;
        // 蓄力中途被回收的怪会带缩放入池，重置防串状态
        this.node.setScale(1, 1, 1);
        // 行走动效节奏：疯狗高频碎步 / 野猪沉重小跑 / 熊缓慢沉稳 / 疯鹰悬浮
        this._walkPhase = Math.random() * Math.PI * 2;
        switch (info.behavior) {
            case 'swarm':
                this._walkFreq = 14; this._bobAmp = 2; this._isFlyer = false;
                break;
            case 'charger':
                this._walkFreq = 7; this._bobAmp = 2.5; this._isFlyer = false;
                break;
            case 'tanker':
                this._walkFreq = 4; this._bobAmp = 3; this._isFlyer = false;
                break;
            case 'diver':
                this._walkFreq = 6; this._bobAmp = 5; this._isFlyer = true;
                break;
            default:
                this._walkFreq = 9; this._bobAmp = 2; this._isFlyer = false;
                break;
        }
        this._bodyNode.setPosition(0, 0);
        this._bodyNode.angle = 0;
        this._bodyNode.setScale(1, 1, 1);
        this._ensureShadow(info);
        this._draw(info);
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        dt *= bm.timeScale;
        const p = this.node.position;
        // 追到车尾：底边触到车尾上沿即啃咬
        if (p.y - this.radius <= bm.vehicleTopY) {
            bm.onEnemyReachVehicle(this);
            return;
        }
        switch (this._behavior) {
            case 'charger':
                this._updateCharger(dt, bm);
                break;
            default:
                // 全部垂直下压（像雪一样直落）；疯鹰的"侧翼"只体现在入场位置
                this._descend(dt);
                break;
        }
        this._updateWalkAnim(dt);
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

    /** 垂直下压：保持出生横坐标直落车尾（车尾横贯全宽，直行必达） */
    private _descend(dt: number): void {
        const p = this.node.position;
        this.node.setPosition(p.x, p.y - this.speed * dt);
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
            this._descend(dt);
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
        // 优先用美术立绘；没出图的怪型回退 Graphics 占位
        // （_tryApplyArt 失败时已把立绘子节点隐藏，占位直接画在本体 Graphics 上）
        if (this._tryApplyArt(info)) {
            return;
        }
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

    /** 尝试挂美术立绘：成功返回 true（占位 Graphics 已清空）；缺图返回 false 走占位 */
    private _tryApplyArt(info: MonsterInfo): boolean {
        const key = MONSTER_ART[info.behavior];
        const frame = key ? AssetLib.frame(key) : null;
        if (!frame) {
            if (this._artNode) {
                this._artNode.active = false;
            }
            return false;
        }
        if (!this._artNode) {
            // Sprite 独立子节点：一节点只挂一种渲染组件（Graphics/Sprite 同节点会冲突）
            this._artNode = createUINode('Art');
            this._bodyNode.addChild(this._artNode);
        }
        this._artNode.active = true;
        const sprite = this._artNode.getComponent(Sprite) ?? this._artNode.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        // 显示高度按碰撞直径的约 1.3 倍取值；宽高比必须用 rect
        // （frame.width/height 在动态合图后返回整张图集尺寸，不是这张图的实际尺寸）
        const ut = this._artNode.getComponent(UITransform)!;
        const rect = frame.rect;
        const dispH = this.radius * 2.6;
        ut.setContentSize(dispH * rect.width / rect.height, dispH);
        return true;
    }

    /** 脚下阴影+精英圈：接地感的关键，不跟随身体摆动（画在不动的 Shadow 层） */
    private _ensureShadow(info: MonsterInfo): void {
        if (!this._shadowNode) {
            this._shadowNode = createUINode('Shadow');
            this.node.addChild(this._shadowNode);
            this._shadowNode.setSiblingIndex(0);
        }
        const g = this._shadowNode.getComponent(Graphics) ?? this._shadowNode.addComponent(Graphics);
        g.clear();
        g.fillColor = new Color(0, 0, 0, 70);
        g.ellipse(0, -this.radius * 0.15, this.radius * 0.95, this.radius * 0.4);
        g.fill();
        // 精英怪：立绘保留原色，用脚下精英红圈标识
        if (info.tier === 1) {
            g.strokeColor = Palette.elite;
            g.lineWidth = 5;
            g.circle(0, -this.radius * 0.15, this.radius * 1.15);
            g.stroke();
        }
    }

    /** 行走动效（直走版）：只上下迈步颠簸 + 轻微压扁拉伸的脚感，不做左右摇摆 */
    private _updateWalkAnim(dt: number): void {
        // 野猪蓄力/冲刺切换专属姿态
        if (this._behavior === 'charger' && this._chargeState !== 'advance') {
            this._bodyNode.angle = 0;
            if (this._chargeState === 'dash') {
                // 扑咬：压扁拉长贴地冲
                this._bodyNode.setScale(0.94, 1.08, 1);
            } else {
                this._bodyNode.setScale(1, 1, 1);
            }
            this._bodyNode.setPosition(0, 0);
            return;
        }
        this._walkPhase += dt * this._walkFreq;
        // 直走表现：只保留轻微上下颠簸（不做左右摇摆、不做横向形变）
        const bob = this._isFlyer ? Math.sin(this._walkPhase) : Math.abs(Math.cos(this._walkPhase));
        this._bodyNode.setPosition(0, bob * this._bobAmp);
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
