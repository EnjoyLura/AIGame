import { _decorator, Color, Component, Graphics, Sprite, SpriteFrame, UITransform, Vec3, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design } from '../config/GameConfig';
import { AssetLib } from '../core/AssetLib';
import { BattleManager, DamageSlotKey } from './BattleManager';

export interface ProjectileSpec {
    damage: number;
    speed: number;
    radius: number;
    color: Color;
    pierce: boolean;
    canCrit: boolean;
    /** 发射英雄 id（击杀充能归属） */
    sourceId?: string;
    /** 伤害归属槽位（伤害统计：普攻/技能/大招），默认普攻 */
    slot?: DamageSlotKey;
    /** 有限穿透次数（普攻穿透+1 卡）：命中后还可穿过多少敌人；pierce=true 时忽略 */
    pierceCount?: number;
    /** 范围爆炸等级（普攻爆炸卡）：>0 命中后产生小范围爆炸 */
    boomLevel?: number;
    /** 子弹分裂数量（普攻分裂卡）：>0 命中后分裂出次级自动索敌弹 */
    splitCount?: number;
    /** 裂变/爆炸进阶增益倍率（伤害与范围），默认 1 */
    splitDmgMul?: number;
    boomRangeMul?: number;
    boomDmgMul?: number;
    /** 次级弹爆炸等级（次级爆炸卡驱动，仅次级弹携带） */
    secBoomLevel?: number;
    /** 正式弹体资源；缺图时继续使用 Graphics 回退 */
    visualKey?: string;
    visualScale?: number;
    visualStretch?: number;
    visualRotationOffset?: number;
}

@ccclass('Bullet')
export class Bullet extends Component {
    damage = 0;
    radius = BattleConfig.BULLET_RADIUS;
    sourceId = '';
    /** 伤害归属槽位（伤害统计） */
    slot: DamageSlotKey = 'basic';
    /** 弹色（命中火花用） */
    specColor = new Color(255, 238, 88, 255);

    private _speed = BattleConfig.BULLET_SPEED;
    private _dir = new Vec3(0, 1, 0);
    private _pierce = false;
    private _canCrit = false;
    private _visualKey = '';
    private _visualScale = 1;
    private _visualStretch = 1;
    private _visualRotationOffset = 0;
    /** 正式贴图是否已就绪并挂上（就绪后 update 不再每帧查 AssetLib） */
    private _visualReady = false;
    private _sprite: Sprite | null = null;
    /** 已打过一次诊断日志的贴图键（避免刷屏） */
    private static _logged = new Set<string>();
    private _hitSet: Set<number> = new Set();
    /** 有限穿透余量（pierce=true 无限穿透时忽略） */
    private _pierceLeft = 0;
    /** 范围爆炸等级 / 分裂数量（次级弹不带，防止递归） */
    boomLevel = 0;
    splitCount = 0;
    /** 裂变/爆炸进阶倍率（进阶卡驱动，默认 1） */
    splitDmgMul = 1;
    boomRangeMul = 1;
    boomDmgMul = 1;
    /** 次级弹爆炸等级（仅次级弹 >0） */
    secBoomLevel = 0;

    onLoad(): void {
        this._draw(BattleConfig.BULLET_RADIUS, new Color(255, 238, 88, 255));
    }

    init(dir: Vec3, spec: ProjectileSpec): void {
        this.damage = spec.damage;
        this.sourceId = spec.sourceId ?? '';
        this.slot = spec.slot ?? 'basic';
        this._dir = dir.clone().normalize();
        this._speed = spec.speed;
        this._pierce = spec.pierce;
        this._pierceLeft = spec.pierceCount ?? 0;
        this._canCrit = spec.canCrit;
        this._hitSet.clear();
        this.boomLevel = spec.boomLevel ?? 0;
        this.splitCount = spec.splitCount ?? 0;
        this.splitDmgMul = spec.splitDmgMul ?? 1;
        this.boomRangeMul = spec.boomRangeMul ?? 1;
        this.boomDmgMul = spec.boomDmgMul ?? 1;
        this.secBoomLevel = spec.secBoomLevel ?? 0;
        this.radius = spec.radius;
        this.specColor = spec.color.clone();
        this._visualKey = spec.visualKey ?? '';
        this._visualScale = spec.visualScale ?? 1;
        this._visualStretch = spec.visualStretch ?? 1;
        this._visualRotationOffset = spec.visualRotationOffset ?? 0;
        // 无贴图键的弹体没有资产可等，直接视为就绪
        this._visualReady = this._visualKey === '';
        this._draw(spec.radius, spec.color);
        this._applyVisualAsset();
        this.node.angle = Math.atan2(-this._dir.x, this._dir.y) * 180 / Math.PI + this._visualRotationOffset;
    }

    markSpawnHit(spawnId: number): void { this._hitSet.add(spawnId); }
    hasSpawnHit(spawnId: number): boolean { return this._hitSet.has(spawnId); }
    get pierce(): boolean { return this._pierce; }
    get canCrit(): boolean { return this._canCrit; }
    get speed(): number { return this._speed; }
    /** 当前飞行方向（分裂裂变扇形的基准方向） */
    get dirVec(): Vec3 { return this._dir; }

    /** 是否还可继续穿透：无限穿透弹恒可；有限穿透弹每次命中扣 1 */
    canPierceMore(): boolean {
        return this._pierce || this._pierceLeft > 0;
    }

    /** 命中一次后消耗一次有限穿透 */
    consumePierce(): void {
        if (!this._pierce) {
            this._pierceLeft = Math.max(0, this._pierceLeft - 1);
        }
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        dt *= bm.timeScale;
        const p = this.node.position;
        this.node.setPosition(p.x + this._dir.x * this._speed * dt, p.y + this._dir.y * this._speed * dt);
        if (!this._visualReady) {
            // 资产异步加载完成前逐帧探测，挂上后停查
            this._applyVisualAsset();
        }
        this.node.angle = Math.atan2(-this._dir.x, this._dir.y) * 180 / Math.PI + this._visualRotationOffset;
        const next = this.node.position;
        const halfW = Design.WIDTH / 2 + 90;
        const halfH = view.getVisibleSize().height / 2 + 90;
        if (next.x < -halfW || next.x > halfW || next.y < -halfH || next.y > halfH) {
            bm.recycleBullet(this);
        }
    }

    private _applyVisualAsset(): void {
        if (!this._visualKey) {
            this._visualReady = true;
            if (this._sprite) this._sprite.enabled = false;
            return;
        }
        const frame = AssetLib.frame(this._visualKey);
        if (!frame) {
            if (this._sprite) this._sprite.enabled = false;
            return;
        }
        this._visualReady = true;
        if (!this._sprite) {
            this._sprite = this.node.getComponent(Sprite) ?? this.node.addComponent(Sprite);
            this._sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this._sprite.trim = false;
        }
        this._sprite.spriteFrame = frame;
        this._sprite.enabled = true;
        // contentSize 由碰撞半径与贴图纵横比驱动（Sprite.SizeMode.CUSTOM 不读贴图原始尺寸）：
        // 高度 ≈ 程序化弹体全长（2×1.8r），宽度按比例；窄长贴图（如 23×128 曳光弹）
        // 按纯比例会细到不可见，宽度钳制不低于高度的 0.42
        const transform = this._sprite.node.getComponent(UITransform) ?? this._sprite.node.addComponent(UITransform);
        const h = Math.max(24, this.radius * 3.6) * this._visualScale;
        const aspect = Math.max(0.42, frame.width / frame.height);
        transform.setContentSize(h * aspect, h * this._visualStretch);
        this._sprite.node.setScale(1, 1, 1);
        // 诊断：Sprite 路径首次激活时输出一次（devtools 可确认正式贴图是否生效）
        if (!Bullet._logged.has(this._visualKey)) {
            Bullet._logged.add(this._visualKey);
            console.log('[Art] 弹体正式贴图生效:', this._visualKey,
                `${frame.width}x${frame.height} -> ${(h * aspect).toFixed(0)}x${h.toFixed(0)}`);
        }
        // 关键保底：不清空 Graphics 弹体——正式贴图叠加其上；
        // 即便 Sprite 因任何环境原因不渲染，程序化弹体也保证可见
    }

    /** 弹体三层：收紧的柔光晕 + 主体色椭圆 + 白热弹芯（光晕收敛让画面更干净锐利） */
    private _draw(r: number, color: Color): void {
        const g = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
        g.clear();
        if (this.sourceId === 'sniper') {
            // Needle silhouette also applies to drones, without changing collision radius.
            g.strokeColor = new Color(color.r, color.g, color.b, 80);
            g.lineWidth = r * 0.8;
            g.moveTo(0, -r * 2.4); g.lineTo(0, r * 1.8); g.stroke();
            g.strokeColor = new Color(255, 230, 165, 220);
            g.lineWidth = Math.max(1, r * 0.3);
            g.moveTo(0, -r); g.lineTo(0, r * 1.8); g.stroke();
            return;
        }
        if (this.sourceId === 'radiation') {
            g.fillColor = new Color(105, 190, 45, 45);
            g.ellipse(0, 0, r * 1.25, r * 2.2); g.fill();
            g.fillColor = new Color(152, 220, 65, 200);
            g.ellipse(0, 0, r * 0.65, r * 1.4); g.fill();
            g.fillColor = new Color(210, 237, 130, 190);
            g.circle(0, r * 0.35, r * 0.3); g.fill();
            return;
        }
        // 外层光晕：同色低透明、约 1.25 倍大（收紧）
        const glow = new Color(color.r, color.g, color.b, 46);
        g.fillColor = glow;
        g.ellipse(0, 0, r * 1.25, r * 2.8);
        g.fill();
        // 主体
        g.fillColor = color;
        g.ellipse(0, 0, r * 0.7, r * 1.8);
        g.fill();
        // 白热弹芯
        g.fillColor = new Color(255, 255, 255, 235);
        g.ellipse(0, 0, r * 0.32, r * 0.85);
        g.fill();
    }
}
