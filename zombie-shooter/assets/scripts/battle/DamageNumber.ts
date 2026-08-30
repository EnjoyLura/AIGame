import { _decorator, Color, Component, Label, Node, UIOpacity, Vec3, tween } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from './BattleManager';

/**
 * 伤害飘字（对象池管理）：复刻 demo 效果——
 * 黑描边保证杂乱背景可读、上飘 + 字号放大 1.15 倍 + 线性渐隐，生命 0.8s。
 * 只负责展示，数值与暴击判定在 BattleManager 中完成。
 */
@ccclass('DamageNumber')
export class DamageNumber extends Component {
    private _label: Label = null!;
    private _opacity: UIOpacity = null!;
    private _onDone: ((node: Node) => void) | null = null;

    onLoad(): void {
        this._label = this.node.addComponent(Label);
        this._label.isBold = true;
        this._label.enableOutline = true;
        this._label.outlineColor = new Color(0, 0, 0, 204);
        this._opacity = this.node.addComponent(UIOpacity);
    }

    /**
     * 播放飘字动画。调用前由 BattleManager 设置好节点位置；
     * 动画结束后通过 onDone 回调交还对象池。
     */
    play(text: string, color: Color, scale: number, onDone: (node: Node) => void): void {
        this._onDone = onDone;
        const s = BattleManager.instance ? BattleManager.instance.uiScale : 1;
        this.node.setScale(scale * 0.87, scale * 0.87, 1);
        this._label.fontSize = 30 * s * scale;
        this._label.lineHeight = 34 * s * scale;
        this._label.outlineWidth = 5 * s;
        this._label.string = text;
        this._label.color = color;
        this._opacity.opacity = 255;

        // 复刻 demo：上飘 + 字号放大 1.15 倍 + 线性渐隐，生命 0.8s
        tween(this.node)
            .parallel(
                tween().by(0.8, { position: new Vec3(0, 117 * s, 0) }),
                tween().to(0.8, { scale: new Vec3(scale * 1.15, scale * 1.15, 1) }),
            )
            .start();
        tween(this._opacity)
            .to(0.8, { opacity: 0 })
            .call(() => this._onDone?.(this.node))
            .start();
    }
}
