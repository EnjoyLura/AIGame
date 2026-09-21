import { _decorator, Color, Component, Label, Node, Sprite, Tween, UIOpacity, UITransform, Vec3, tween } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from './BattleManager';
import { AssetLib } from '../core/AssetLib';
import { createUINode } from '../core/createUINode';

/**
 * 伤害飘字（对象池管理）——爆裂散射版：
 * 数字从 0.25 倍迅速放大到最终尺寸（backOut 微过冲），同时以正上方为中心
 * ±100° 随机方向炸开、减速滑行，尾段快速渐隐；
 * 暴击飞得更远、倾斜更明显、并且垫一块冲击底纹；随机方向天然避免同点叠字。
 * 只负责展示，数值与暴击判定在 BattleManager 中完成。
 */
@ccclass('DamageNumber')
export class DamageNumber extends Component {
    private _label: Label = null!;
    private _opacity: UIOpacity = null!;
    /** 暴击底纹（r34 表 `fx/dmg_word`）与其透明度层；非暴击整块隐藏 */
    private _bg: Node = null!;
    /** 三层透明度：UIOpacity 不跨节点级联（只管自己那个节点的渲染器），
     *  所以父节点与两个子节点各挂一个、一起淡，否则字没了底纹还挂在屏上。 */
    private _ops: UIOpacity[] = [];
    private _onDone: ((node: Node) => void) | null = null;

    onLoad(): void {
        // 底纹与字各占一个子节点：Cocos 的 UI 里父节点自身的组件先画、子节点后画，
        // 底纹若挂在 this.node 上会盖住字，必须是排在字前面的另一个子节点。
        this._bg = this._makeChild('WordBg');
        const bgSp = this._bg.addComponent(Sprite);
        bgSp.sizeMode = Sprite.SizeMode.CUSTOM;
        bgSp.trim = false;
        const txt = this._makeChild('Txt');
        this._label = txt.addComponent(Label);
        this._label.isBold = true;
        this._label.enableOutline = true;
        this._label.outlineColor = new Color(0, 0, 0, 204);
        this._opacity = this.node.addComponent(UIOpacity);
        this._ops = [this._opacity, this._bg.getComponent(UIOpacity)!, txt.getComponent(UIOpacity)!];
    }

    /** 子节点 + UITransform + UIOpacity（透明度层每个渲染节点都要一份，见 _ops 注释） */
    private _makeChild(name: string): Node {
        const n = createUINode(name);
        this.node.addChild(n);
        n.addComponent(UITransform);
        n.addComponent(UIOpacity);
        return n;
    }

    /**
     * 播放飘字动画。调用前由 BattleManager 设置好节点位置；
     * 动画结束后通过 onDone 回调交还对象池。
     */
    play(text: string, color: Color, scale: number, crit: boolean, onDone: (node: Node) => void): void {
        this._onDone = onDone;
        const s = BattleManager.instance ? BattleManager.instance.uiScale : 1;
        // 池化复用保护：清掉可能残留的旧动画
        Tween.stopAllByTarget(this.node);
        for (const op of this._ops) {
            Tween.stopAllByTarget(op);
        }

        this._label.fontSize = 30 * s * scale;
        this._label.lineHeight = 34 * s * scale;
        this._label.outlineWidth = (crit ? 3 : 2) * s;
        this._label.string = text;
        this._label.color = color;
        for (const op of this._ops) {
            op.opacity = 255;
        }
        this.node.angle = (Math.random() * 2 - 1) * (crit ? 8 : 5);
        this.node.setScale(0.25, 0.25, 1);
        this._syncBackdrop(s, crit);

        // 爆裂散射：以正上方为中心 ±100° 随机方向炸开（含斜上/侧向），减速滑行；
        // 数字由小放大到最终尺寸（backOut 微过冲）；整体节奏比上浮版更快
        const fan = (Math.random() * 2 - 1) * (Math.PI / 1.8);
        const dirX = Math.sin(fan);
        const dirY = Math.cos(fan);
        const dist = (crit ? 150 : 110) * s * (0.8 + Math.random() * 0.5);
        const pop = 0.16;
        const drift = 0.5;
        const fade = 0.18;

        tween(this.node)
            .parallel(
                tween()
                    .to(pop, { scale: new Vec3(scale, scale, 1) }, { easing: 'backOut' }),
                tween()
                    .by(drift, { position: new Vec3(dirX * dist, dirY * dist, 0) }, { easing: 'quadOut' }),
            )
            .start();
        for (const op of this._ops) {
            tween(op)
                .delay(drift - fade)
                .to(fade, { opacity: 0 })
                .start();
        }
        // 归还对象池只挂在其中一个层上（三层时长完全一致），否则一次淡出会还三次
        tween(this._opacity)
            .delay(drift)
            .call(() => this._onDone?.(this.node))
            .start();
    }

    /**
     * 暴击底纹（r34 表 `fx/dmg_word`）：只在暴击那一跳出现——每个数字都垫一块会糊屏，
     * 而且"有没有底纹"本来就是玩家分辨暴击的那条线索，铺满就没有信息量了。
     * 尺寸按字号算、不去量文字宽：Label 的 contentSize 要到本帧末才算出来，此刻读到的是上一跳的值。
     */
    private _syncBackdrop(px: number, crit: boolean): void {
        const frame = crit ? AssetLib.frame('fx/dmg_word') : null;
        if (!frame) {
            this._bg.active = false;
            return;
        }
        const sp = this._bg.getComponent(Sprite)!;
        if (sp.spriteFrame !== frame) {
            sp.spriteFrame = frame;
        }
        const h = 92 * px;
        this._bg.getComponent(UITransform)!.setContentSize(h * (frame.width / frame.height), h);
        this._bg.active = true;
    }
}
