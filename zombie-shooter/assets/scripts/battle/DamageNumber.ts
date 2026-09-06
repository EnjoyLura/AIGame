import { _decorator, Color, Component, Label, Node, Tween, UIOpacity, Vec3, tween } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from './BattleManager';

/**
 * 伤害飘字（对象池管理）——爆裂散射版：
 * 数字从 0.25 倍迅速放大到最终尺寸（backOut 微过冲），同时以正上方为中心
 * ±100° 随机方向炸开、减速滑行，尾段快速渐隐；
 * 暴击飞得更远、倾斜更明显；随机方向天然避免同点叠字。
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
    play(text: string, color: Color, scale: number, crit: boolean, onDone: (node: Node) => void): void {
        this._onDone = onDone;
        const s = BattleManager.instance ? BattleManager.instance.uiScale : 1;
        // 池化复用保护：清掉可能残留的旧动画
        Tween.stopAllByTarget(this.node);
        Tween.stopAllByTarget(this._opacity);

        this._label.fontSize = 30 * s * scale;
        this._label.lineHeight = 34 * s * scale;
        this._label.outlineWidth = (crit ? 3 : 2) * s;
        this._label.string = text;
        this._label.color = color;
        this._opacity.opacity = 255;
        this.node.angle = (Math.random() * 2 - 1) * (crit ? 8 : 5);
        this.node.setScale(0.25, 0.25, 1);

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
        tween(this._opacity)
            .delay(drift - fade)
            .to(fade, { opacity: 0 })
            .call(() => this._onDone?.(this.node))
            .start();
    }
}
