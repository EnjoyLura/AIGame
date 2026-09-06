import { _decorator, Color, Component, Graphics, Node, UIOpacity, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from './BattleManager';

/**
 * 打击粒子（对象池管理）· 商业化重设计——
 * 每种粒子都是多层合成体而非单线条/单圆：
 * spark  火花：亮白热芯 + 主色拖尾 + 尾端细化，减速滑行（摩擦）+ 微重力
 * blood  血雾：核心实心团 + 外圈柔光晕，按生命进度平方加速膨胀
 * ring   冲击环：双环（亮内环 + 半透明宽外环）+ 内环细白描边，outQuad 扩散
 * shard  碎屑：双层色片（主色 + 亮边）+ 旋转 + 重力抛物线
 * flash  爆闪：十字光斑 + 中心圆，极速缩小消失（命中瞬间的"打击感"帧）
 * glow   柔光：径向三层圆模拟渐变光晕，用于能量聚集/环境光点
 * 全部走 BattleManager 统一池，避免频繁创建销毁；暂停时冻结。
 */
@ccclass('HitParticle')
export class HitParticle extends Component {
    private _g: Graphics = null!;
    private _opacity: UIOpacity = null!;
    private _life = 0.5;
    private _t = 0;
    private _type: 'spark' | 'blood' | 'ring' | 'shard' | 'flash' | 'glow' | 'precision' | 'corrosion' | 'tracer' = 'spark';
    private _vx = 0;
    private _vy = 0;
    private _gravity = 0;
    /** 速度每秒保留比例（0=跳过摩擦，0~1 之间越小减速越快） */
    private _drag = 0;
    private _size = 3;
    private _color: Color = new Color();
    private _rot = 0;
    private _vr = 0;
    private _r1 = 0;
    private _onDone: ((n: Node) => void) | null = null;

    onLoad(): void {
        this._g = this.node.addComponent(Graphics);
        this._opacity = this.node.addComponent(UIOpacity);
    }

    /** 配置一次粒子（对象复用时全部字段重设） */
    init(cfg: {
        type: 'spark' | 'blood' | 'ring' | 'shard' | 'flash' | 'glow' | 'precision' | 'corrosion' | 'tracer';
        pos: Vec3;
        vel: Vec3;
        life: number;
        size: number;
        color: Color;
        gravity?: number;
        drag?: number;
        rot?: number;
        vr?: number;
        r1?: number;
        onDone: (n: Node) => void;
    }): void {
        this._type = cfg.type;
        this.node.setWorldPosition(cfg.pos);
        this._vx = cfg.vel.x;
        this._vy = cfg.vel.y;
        this._life = cfg.life;
        this._t = 0;
        this._size = cfg.size;
        this._color = cfg.color;
        this._gravity = cfg.gravity ?? 0;
        this._drag = cfg.drag ?? 0;
        this._rot = cfg.rot ?? 0;
        this._vr = cfg.vr ?? 0;
        this._r1 = cfg.r1 ?? 0;
        this._onDone = cfg.onDone;
        this.node.angle = 0;
        this.node.setScale(1, 1, 1);
        this._opacity.opacity = 255;
        this._g.clear();
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        dt *= bm.timeScale;
        this._t += dt;
        if (this._t >= this._life) {
            this._onDone?.(this.node);
            this._onDone = null;
            return;
        }
        const k = this._t / this._life;          // 0→1 生命进度
        const fade = 1 - k;
        // 摩擦减速：每帧速度按 drag^dt 比例衰减（帧率无关）
        if (this._drag > 0) {
            const damp = Math.pow(this._drag, dt);
            this._vx *= damp;
            this._vy *= damp;
        }
        this._vy += this._gravity * dt;
        const p = this.node.position;
        if (this._type !== 'tracer') this.node.setPosition(p.x + this._vx * dt, p.y + this._vy * dt);
        this._rot += this._vr * dt;
        this.node.angle = this._rot;

        const g = this._g;
        g.clear();
        switch (this._type) {
            case 'tracer': {
                // Local endpoint stored in velocity; tracer never moves.
                g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(150 * fade));
                g.lineWidth = this._size;
                g.moveTo(0, 0); g.lineTo(this._vx, this._vy); g.stroke();
                g.strokeColor = this._color.g > this._color.r && this._color.g > this._color.b * 1.3
                    ? new Color(183, 228, 103, Math.round(140 * fade))
                    : new Color(255, 242, 196, Math.round(190 * fade));
                g.lineWidth = Math.max(1, this._size * 0.28);
                g.moveTo(0, 0); g.lineTo(this._vx, this._vy); g.stroke();
                break;
            }
            case 'precision': {
                const r = this._size * (1 - k * 0.45);
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(45 * fade));
                g.circle(0, 0, r * 2); g.fill();
                g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(190 * fade));
                g.lineWidth = Math.max(1, r * 0.3);
                g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
                g.fillColor = new Color(255, 238, 180, Math.round(210 * fade));
                g.circle(0, 0, Math.max(0.6, r * 0.27)); g.fill();
                break;
            }
            case 'corrosion': {
                // Green-only soft mist and pulse, bounded by size + r1; no white core.
                const r = this._size + this._r1 * (1 - fade * fade);
                for (let layer = 3; layer >= 1; layer--) {
                    g.fillColor = new Color(92, 194, 48, Math.round((12 + (3-layer)*9) * fade));
                    g.circle(0, 0, r * layer / 3); g.fill();
                }
                g.strokeColor = new Color(164, 226, 72, Math.round(115 * fade));
                g.lineWidth = Math.max(1, 2 * fade);
                g.circle(0, 0, r); g.stroke();
                break;
            }
            case 'spark': {
                // 锐利火花：主色拖尾 + 白热芯双层，随生命缩短变细
                const n = Math.hypot(this._vx, this._vy) || 1;
                const len = Math.max(2, n * 0.035) * (0.35 + 0.65 * fade);
                const tx = -this._vx / n * len;
                const ty = -this._vy / n * len;
                g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(220 * fade));
                g.lineWidth = Math.max(1, this._size * fade);
                g.moveTo(0, 0);
                g.lineTo(tx, ty);
                g.stroke();
                // 白热芯（前 60% 生命可见，更短更亮）
                if (k < 0.6) {
                    const core = fade / 0.6;
                    g.strokeColor = new Color(255, 255, 255, Math.round(200 * core));
                    g.lineWidth = Math.max(0.8, this._size * 0.4 * core);
                    g.moveTo(0, 0);
                    g.lineTo(tx * 0.55, ty * 0.55);
                    g.stroke();
                }
                break;
            }
            case 'blood': {
                // 血雾团：柔光晕 + 实心核心双层，按 k² 加速膨胀
                const rr = this._size * (0.6 + k * k * 1.8);
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(70 * fade));
                g.circle(0, 0, rr * 1.5);
                g.fill();
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(200 * fade));
                g.circle(0, 0, rr);
                g.fill();
                break;
            }
            case 'ring': {
                // 冲击环：宽外环（主色半透明）+ 亮内环（白），outQuad 扩散、线宽收窄
                const rr = this._size + this._r1 * (1 - fade * fade);
                g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(120 * fade));
                g.lineWidth = Math.max(1.5, 9 * fade);
                g.circle(0, 0, rr);
                g.stroke();
                g.strokeColor = new Color(255, 255, 255, Math.round(210 * fade));
                g.lineWidth = Math.max(1, 3.5 * fade);
                g.circle(0, 0, rr * 0.92);
                g.stroke();
                break;
            }
            case 'shard': {
                // 碎屑：主色片 + 亮边描边，重力抛物线旋转
                const s = this._size * (1 - k * 0.4);
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(230 * fade));
                g.rect(-s, -s * 0.4, s * 2, s * 0.8);
                g.fill();
                g.strokeColor = new Color(255, 255, 255, Math.round(150 * fade));
                g.lineWidth = 1;
                g.rect(-s, -s * 0.4, s * 2, s * 0.8);
                g.stroke();
                break;
            }
            case 'flash': {
                // 爆闪：十字光斑 + 中心圆，极速缩小（前 40% 生命完成），打击感帧
                const fk = Math.min(1, k / 0.4);
                const scale = (1 - fk * fk);
                const a = Math.round(255 * (1 - fk));
                const arm = this._size * 3.2 * scale;
                g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, a);
                g.lineWidth = Math.max(1, this._size * 0.9 * scale);
                g.moveTo(-arm, 0); g.lineTo(arm, 0); g.stroke();
                g.moveTo(0, -arm); g.lineTo(0, arm); g.stroke();
                g.fillColor = new Color(255, 255, 255, a);
                g.circle(0, 0, Math.max(0.5, this._size * 1.1 * scale));
                g.fill();
                break;
            }
            case 'glow': {
                // 柔光：三层径向圆模拟渐变（外圈大而淡 → 内圈小而亮 → 白核）
                const rr = this._size * (1 - k * 0.25);
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(55 * fade));
                g.circle(0, 0, rr * 2);
                g.fill();
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(120 * fade));
                g.circle(0, 0, rr);
                g.fill();
                g.fillColor = new Color(255, 255, 255, Math.round(180 * fade));
                g.circle(0, 0, rr * 0.4);
                g.fill();
                break;
            }
        }
    }
}
