import { Color, Graphics, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3 } from 'cc';
import { AssetLib } from '../core/AssetLib';
import { createUINode } from '../core/createUINode';

/** Visual-only battle-clock composition. No damage, scheduler, Tween or engine update. */
export const MORTAR_FX = { tail: 0.9, flash: 0.09, fire: 0.32, smokeStart: 0.13, ring: 0.28, maxActive: 6, cells: 16 };
interface Part { node: Node; sprite: Sprite; opacity: UIOpacity; transform: UITransform; }

export class MortarFx {
    readonly node = createUINode('RifleMortarComposition');
    private parts: Part[] = [];
    private fallback: Graphics;
    private frames: SpriteFrame[] | null = null;
    /** 命名正式贴图（优先于 16 宫格图集）：榴弹弹体 / 爆炸火球 / 冲击环 */
    private shellFrame: SpriteFrame | null = null;
    private boomFrame: SpriteFrame | null = null;
    private ringFrame: SpriteFrame | null = null;
    private from = new Vec3();
    private to = new Vec3();
    private radius = 1;
    private flight = 0.5;
    private arc = 0;
    private age = 0;
    private impacted = false;
    private generation = 0;
    active = false;

    constructor(parent: Node) {
        parent.addChild(this.node);
        this.fallback = this.node.addComponent(Graphics);
        // Fixed budget: warning/ring, shell/flash, trail/fire, 3 smoke, 4 debris + named shell/boom/ring.
        for (let i = 0; i < 13; i++) {
            const node = createUINode('MortarPart');
            this.node.addChild(node);
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.parts.push({ node, sprite, opacity: node.addComponent(UIOpacity), transform: node.getComponent(UITransform)! });
        }
        this.reset();
    }

    begin(from: Vec3, to: Vec3, radius: number, flight: number, scale: number): number {
        this.reset();
        this.generation++;
        this.from.set(from); this.to.set(to);
        this.radius = radius; this.flight = Math.max(0.001, flight);
        this.arc = 300 * scale;
        this.frames = AssetLib.mortarFrames(); // Snapshot readiness; never switch halfway through a cast.
        this.shellFrame = AssetLib.frame('weapons/rifle_grenade');
        this.boomFrame = AssetLib.frame('fx/rifle_grenade_explosion');
        this.ringFrame = AssetLib.frame('fx/rifle_grenade_ring');
        this.active = true; this.node.active = true;
        this.drawFlight();
        return this.generation;
    }

    /** Called by the unchanged gameplay delay callback; stale pooled handles cannot affect a new cast. */
    impact(generation: number): boolean {
        if (!this.active || generation !== this.generation) return false;
        this.impacted = true; this.age = 0;
        this.hideParts(); this.fallback.clear();
        // Keep the composition alive even when the atlas is not ready; the Graphics
        // fallback must show the same impact at the same authoritative landing point.
        this.drawImpact();
        return true;
    }

    tick(dt: number): void {
        if (!this.active || dt <= 0) return;
        this.age += dt;
        if (this.impacted) {
            if (this.age + 1e-8 >= MORTAR_FX.tail) { this.reset(); return; }
            this.drawImpact();
        } else {
            this.drawFlight(); // Hold at arrival until the gameplay callback, never detonate independently.
        }
    }

    reset(): void {
        this.active = false; this.node.active = false;
        this.age = 0; this.impacted = false; this.frames = null;
        this.shellFrame = null; this.boomFrame = null; this.ringFrame = null;
        this.hideParts(); this.fallback.clear();
    }
    destroy(): void { this.reset(); this.node.destroy(); }
    private hideParts(): void { for (const p of this.parts) p.node.active = false; }

    private part(index: number, cell: number, x: number, y: number, size: number, alpha: number, angle = 0, stretch = 1): void {
        this.partFrame(index, this.frames![cell], x, y, size, alpha, angle, stretch);
    }

    private partFrame(index: number, frame: SpriteFrame, x: number, y: number, size: number, alpha: number, angle = 0, stretch = 1): void {
        const p = this.parts[index];
        p.node.active = alpha > 0;
        if (!p.node.active) return;
        p.sprite.spriteFrame = frame;
        p.node.setWorldPosition(x, y, 0);
        p.node.angle = angle;
        p.transform.setContentSize(size, size * stretch);
        p.opacity.opacity = Math.round(255 * Math.max(0, Math.min(1, alpha)));
    }

    private drawFlight(): void {
        const k = Math.min(1, this.age / this.flight);
        const x = this.from.x + (this.to.x - this.from.x) * k;
        const y = this.from.y + (this.to.y - this.from.y) * k + 4 * this.arc * k * (1-k);
        const angle = Math.atan2(this.to.y-this.from.y+4*this.arc*(1-2*k), this.to.x-this.from.x)*180/Math.PI-90;
        // Graphics 主体始终绘制，保证图集延迟时也能看见实体榴弹和飞行轨迹。
        const g = this.fallback;
        g.clear();
        const local = this.node.getComponent(UITransform)!;
        const end = local.convertToNodeSpaceAR(this.to);
        const shell = local.convertToNodeSpaceAR(new Vec3(x, y, 0));
        const prevK = Math.max(0, k - 0.12);
        const tx = this.from.x + (this.to.x - this.from.x) * prevK;
        const ty = this.from.y + (this.to.y - this.from.y) * prevK + 4 * this.arc * prevK * (1 - prevK);
        const prev = local.convertToNodeSpaceAR(new Vec3(tx, ty, 0));
        g.strokeColor = new Color(255, 150, 35, 170);
        g.lineWidth = Math.max(5, this.radius * 0.045);
        g.moveTo(prev.x, prev.y); g.lineTo(shell.x, shell.y); g.stroke();
        g.strokeColor = new Color(255, 235, 155, 235);
        g.lineWidth = Math.max(2, this.radius * 0.018);
        g.moveTo(prev.x, prev.y); g.lineTo(shell.x, shell.y); g.stroke();
        const shellR = Math.max(12, this.radius * 0.11);
        g.fillColor = new Color(255, 137, 25, 255);
        g.circle(shell.x, shell.y, shellR); g.fill();
        g.strokeColor = new Color(55, 25, 12, 255);
        g.lineWidth = Math.max(3, this.radius * 0.018);
        g.circle(shell.x, shell.y, shellR); g.stroke();
        g.fillColor = new Color(255, 246, 190, 255);
        g.circle(shell.x - shellR * 0.25, shell.y + shellR * 0.25, shellR * 0.36); g.fill();
        if (this.frames) {
            this.part(0, 1, this.to.x, this.to.y, this.radius * 128 / (58 * .88), .2 + .3 * k);
        }
        // 正式榴弹贴图优先；缺图回退图集弹体（Graphics 实体弹始终兜底）
        if (this.shellFrame) {
            this.partFrame(10, this.shellFrame, x, y, Math.max(40, this.radius * 0.17), 1, angle);
        } else if (this.frames) {
            this.part(2, 0, x, y, this.radius * .23, .36);
            this.part(1, 2, x, y, this.radius * .20, 1, angle);
        }
        g.strokeColor = new Color(255, 206, 112, 130);
        g.lineWidth = Math.max(2, this.radius * 0.012);
        g.circle(end.x, end.y, this.radius); g.stroke();
    }

    private drawImpact(): void {
        const t = this.age, r = this.radius, x = this.to.x, y = this.to.y;
        this.hideParts();
        this.fallback.clear();
        // 图集未就绪时 Graphics 兜底冲击环/白闪；命名贴图可用时跳过对应兜底层避免叠影
        if (!this.frames) {
            const local = this.node.getComponent(UITransform)!;
            const p = local.convertToNodeSpaceAR(new Vec3(x, y, 0));
            if (t < MORTAR_FX.ring && !this.ringFrame) {
                const k = t / MORTAR_FX.ring;
                this.fallback.strokeColor = new Color(255, 190, 64, Math.round(220 * (1-k)));
                this.fallback.lineWidth = Math.max(3, r * 0.035);
                this.fallback.circle(p.x, p.y, r * (.55 + .53 * (1-(1-k)*(1-k)))); this.fallback.stroke();
            }
            if (t < MORTAR_FX.flash && !this.boomFrame) {
                this.fallback.fillColor = new Color(255, 245, 190, Math.round(240 * (1-t/MORTAR_FX.flash)));
                this.fallback.circle(p.x, p.y, r * 1.15); this.fallback.fill();
            }
        }
        // 冲击环：命名贴图（外沿对齐伤害半径）→ 图集 cell
        if (t < MORTAR_FX.ring) {
            const k = t / MORTAR_FX.ring;
            const rr = r * (.55 + .53 * (1 - (1-k)*(1-k)));
            if (this.ringFrame) {
                this.partFrame(12, this.ringFrame, x, y, rr * 2.2, .95 * (1-k));
            } else if (this.frames) {
                this.part(0, 1, x, y, rr, .9 * (1-k));
            }
        }
        // 爆炸火球：命名贴图（略盖过伤害半径）→ 图集闪白 + 火焰序列
        if (this.boomFrame) {
            if (t < MORTAR_FX.fire) {
                const k = t / MORTAR_FX.fire;
                this.partFrame(11, this.boomFrame, x, y + r * .04, r * (2.15 + .75 * k), 1 - k * .8);
            }
        } else if (this.frames) {
            if (t < MORTAR_FX.flash) this.part(1, 0, x, y, r * 1.25, 1 - t/MORTAR_FX.flash);
            if (t < MORTAR_FX.fire) {
                const k=t/MORTAR_FX.fire;
                this.part(2,8+Math.min(7,Math.floor(k*8)),x,y+r*.06,r*(1.15+.75*k),1-k*.75);
            }
        }
        // 烟/碎屑仍走图集
        if (this.frames) {
            if (t >= MORTAR_FX.smokeStart) {
                const k=(t-MORTAR_FX.smokeStart)/(MORTAR_FX.tail-MORTAR_FX.smokeStart);
                const alpha=Math.min(1,k/.16)*(1-k)*(1-k)*.38;
                for (let i=0;i<3;i++) this.part(3+i,4+i,x+(i-1)*r*(.13+.2*k),y+r*(.08+k*(.2+i*.06)),r*(.85+.55*k),alpha, i*57+k*12);
            }
            if (t < .52) {
                for (let i=0;i<4;i++) {
                    const a=(i*.25+.08)*Math.PI*2;
                    const travel=r*(.12+.95*(1-Math.exp(-t*5)));
                    this.part(6+i,3,x+Math.cos(a)*travel,y+Math.sin(a)*travel+r*(.7*t-1.6*t*t),r*.07,Math.pow(1-t/.52,2),i*71+t*240);
                }
            }
        }
    }
}
