import { _decorator, Color, Component, Graphics, Node, UIOpacity, Vec3, tween } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from './BattleManager';

/**
 * 打击粒子（对象池管理）：《末日航线》风格重设计——
 * spark 锐利火花（短线段拖尾）、blood 血雾团（慢速膨胀消散）、ring 冲击环（扩散圆环）、
 * shard 碎屑（旋转小方片）。全部走 BattleManager 统一池，避免频繁创建销毁。
 */
@ccclass('HitParticle')
export class HitParticle extends Component {
    private _g: Graphics = null!;
    private _opacity: UIOpacity = null!;
    private _life = 0.5;
    private _t = 0;
    private _type: 'spark' | 'blood' | 'ring' | 'shard' = 'spark';
    private _vx = 0;
    private _vy = 0;
    private _gravity = 0;
    private _size = 3;
    private _color: Color = new Color();
    private _rot = 0;
    private _vr = 0;
    private _r1 = 0;
    private _onDone: ((n: Node) => void) | null = null;
    private _paused = false;

    onLoad(): void {
        this._g = this.node.addComponent(Graphics);
        this._opacity = this.node.addComponent(UIOpacity);
    }

    /** 配置一次粒子（对象复用时全部字段重设） */
    init(cfg: {
        type: 'spark' | 'blood' | 'ring' | 'shard';
        pos: Vec3;
        vel: Vec3;
        life: number;
        size: number;
        color: Color;
        gravity?: number;
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
        this._paused = !bm || bm.isPaused || bm.isGameOver;
        if (this._paused) {
            return;
        }
        this._t += dt;
        if (this._t >= this._life) {
            this._onDone?.(this.node);
            this._onDone = null;
            return;
        }
        const k = this._t / this._life;          // 0→1 生命进度
        const fade = 1 - k;
        const p = this.node.position;
        this._vy += this._gravity * dt;
        this.node.setPosition(p.x + this._vx * dt, p.y + this._vy * dt);
        this._rot += this._vr * dt;
        this.node.angle = this._rot;

        const g = this._g;
        g.clear();
        switch (this._type) {
            case 'spark': {
                // 锐利火花：速度方向短线拖尾，随生命缩短
                const len = Math.max(2, Math.hypot(this._vx, this._vy) * 0.03) * fade;
                const n = Math.hypot(this._vx, this._vy) || 1;
                g.strokeColor = this._color;
                g.lineWidth = this._size * fade;
                g.moveTo(0, 0);
                g.lineTo(-this._vx / n * len, -this._vy / n * len);
                g.stroke();
                break;
            }
            case 'blood': {
                // 血雾团：膨胀 + 消散
                const rr = this._size * (0.6 + k * 1.6);
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(200 * fade));
                g.circle(0, 0, rr);
                g.fill();
                break;
            }
            case 'ring': {
                // 冲击环：半径扩张、线宽收窄
                const rr = this._size + this._r1 * k;
                g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(230 * fade));
                g.lineWidth = Math.max(1, 6 * fade);
                g.circle(0, 0, rr);
                g.stroke();
                break;
            }
            case 'shard': {
                // 碎屑：旋转小方片
                g.fillColor = new Color(this._color.r, this._color.g, this._color.b, Math.round(230 * fade));
                const s = this._size * (1 - k * 0.4);
                g.rect(-s, -s * 0.4, s * 2, s * 0.8);
                g.fill();
                break;
            }
        }
    }
}
