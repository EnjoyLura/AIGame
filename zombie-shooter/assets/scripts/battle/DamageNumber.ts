import { _decorator, Color, Component, Label, Node, UIOpacity, Vec3, tween } from 'cc';
const { ccclass } = _decorator;

/**
 * 伤害飘字（对象池管理）：弹出 → 上飘 → 淡出 → 回池。
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
        this._label.fontSize = 48;
        this._label.lineHeight = 57;
        this._label.enableOutline = true;
        this._label.outlineColor = Color.BLACK;
        this._label.outlineWidth = 4;
        this._opacity = this.node.addComponent(UIOpacity);
    }

    /**
     * 播放飘字动画。调用前由 BattleManager 设置好节点位置；
     * 动画结束后通过 onDone 回调交还对象池。
     */
    play(text: string, color: Color, scale: number, onDone: (node: Node) => void): void {
        this._onDone = onDone;
        this.node.setScale(scale, scale, 1);
        this._label.string = text;
        this._label.color = color;
        this._opacity.opacity = 255;

        tween(this.node).by(0.55, { position: new Vec3(0, 150, 0) }).start();
        tween(this._opacity)
            .delay(0.3)
            .to(0.25, { opacity: 0 })
            .call(() => this._onDone?.(this.node))
            .start();
    }
}
