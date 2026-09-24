import { _decorator, Color, Component, Graphics, Label, Node, Sprite, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
const { ccclass } = _decorator;
import { Design, Palette } from '../config/GameConfig';
import { AssetLib } from '../core/AssetLib';
import { createUINode } from '../core/createUINode';
import { CardOption } from '../battle/UpgradeCard';

/**
 * 升级三选一面板：暂停战斗 → 展示 3 张随机增益卡 → 点选后由 BattleManager 结算并恢复战斗。
 * 全部代码动态构建（不依赖预制体）；正式版替换为九宫格图 UI + 弹出动效。
 */
@ccclass('LevelUpPanel')
export class LevelUpPanel extends Component {
    private static readonly CARD_W = 285;
    private static readonly CARD_H = 375;

    private _title: Label = null!;
    /** 副题：选择提示（点卡即选，无撤销） */
    private _subtitle: Label = null!;
    private _cards: Node[] = [];
    private _banner: Node = null!;
    /** 升级光柱（r34 表 `fx/levelup_glow`）：一根贯通上下的实心光柱，压在选卡三张的后方。
     *  与上面那块标题横幅是两件东西——横幅槽早就被 `ui/banner/banner` 占用，别再往它身上挂。 */
    private _glow: Node = null!;
    /** 面板/卡片透明度层（入场与选卡动画用） */
    private _panelOp: UIOpacity = null!;
    private _cardOps: UIOpacity[] = [];
    /** 选卡动画进行中：吞掉重复点击 */
    private _picking = false;

    onLoad(): void {
        const halfW = Design.WIDTH / 2;
        const halfH = Design.HEIGHT / 2;
        this.node.addComponent(UITransform).setContentSize(Design.WIDTH, Design.HEIGHT);

        const g = this.node.addComponent(Graphics);
        g.fillColor = Palette.overlay;
        g.rect(-halfW, -halfH, Design.WIDTH, Design.HEIGHT);
        g.fill();
        this._panelOp = this.node.addComponent(UIOpacity);

        // 标题区两行结构（交互稿 battle.html H2 升级面）：横幅「团队升级」+ 副题选择提示
        this._title = this._makeLabel('团 队 升 级', 0, 42);
        this._title.node.setPosition(0, 310);
        this._subtitle = this._makeLabel('选择一项强化（点卡即选，无撤销）', 0, 28, new Color('#c3cad2'));
        this._subtitle.node.setPosition(0, 200);
        // 顶部暂停状态 chip（与暂停菜单 pauseChip 同语义）：锚可视区顶部 194 设计像素，
        // 不能写死画布 y——可视高随视口变化（横屏裁切时写死值会飘出屏外）
        const pauseChip = this._makeLabel('战斗已暂停 · 选卡后恢复', 0, 28, new Color('#aab4c2'));
        pauseChip.node.setPosition(0, view.getVisibleSize().height / 2 - 194);

        // 标题横幅（撕纸横幅；美术就绪后显示在标题文字下层）
        const banner = createUINode('Banner');
        this.node.addChild(banner);
        banner.addComponent(UITransform).setContentSize(540, 183);
        banner.setPosition(0, 310);
        banner.addComponent(Sprite);
        banner.addComponent(UIOpacity);
        banner.active = false;
        this._banner = banner;
        banner.setSiblingIndex(this._title.node.getSiblingIndex());

        // 升级光柱：压在遮罩之上、所有文字与卡片之下（siblingIndex 0），宽度按贴图比例算，
        // 不写死——写死就会把一根瘦长光柱拉成一条宽带（同 D21 的口径：显示尺寸跟着源件比例走）
        const glow = createUINode('Glow');
        this.node.addChild(glow);
        glow.addComponent(UITransform);
        glow.addComponent(Sprite);
        glow.addComponent(UIOpacity);
        glow.active = false;
        glow.setSiblingIndex(0);
        this._glow = glow;

        this.node.active = false;
    }

    /** 展示三张卡片；点选回调由 BattleManager 注入 */
    show(options: CardOption[], onPick: (option: CardOption) => void): void {
        // 面板置顶：运行中动态生成的怪物节点会排在后面，必须重新排到最上层
        this.node.setSiblingIndex(this.node.parent.children.length - 1);
        this._clearCards();
        this._picking = false;
        this.node.active = true;

        // 入场：遮罩淡入 + 标题弹跳 + 三卡自下而上错峰滑入（backOut 过冲）
        Tween.stopAllByTarget(this.node);
        this._panelOp.opacity = 0;
        tween(this._panelOp).to(0.15, { opacity: 255 }).start();
        this._title.node.setScale(0.7, 0.7, 1);
        tween(this._title.node)
            .to(0.26, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        // 标题横幅：美术就绪即显示（标题文字压在其上）
        const bannerFrame = AssetLib.frame('ui/banner/banner');
        if (bannerFrame && !this._banner.active) {
            const bsp = this._banner.getComponent(Sprite)!;
            bsp.sizeMode = Sprite.SizeMode.CUSTOM;
            bsp.trim = false;
            bsp.spriteFrame = bannerFrame;
            this._banner.active = true;
        }
        if (this._banner.active) {
            const bop = this._banner.getComponent(UIOpacity)!;
            bop.opacity = 0;
            tween(bop).to(0.2, { opacity: 255 }).start();
        }

        // 光柱：图就绪才点亮（缺图就整根不出现，不会留一块黑底矩形），随面板一起淡入。
        // 上限压到 150：再亮就会把三张卡上的字洗白，读者看不清选什么。
        const glowFrame = AssetLib.frame('fx/levelup_glow');
        if (glowFrame && this._glow) {
            const gsp = this._glow.getComponent(Sprite)!;
            if (!this._glow.active) {
                gsp.sizeMode = Sprite.SizeMode.CUSTOM;
                gsp.trim = false;
                gsp.spriteFrame = glowFrame;
                const gh = Design.HEIGHT;
                this._glow.getComponent(UITransform)!.setContentSize(gh * (glowFrame.width / glowFrame.height), gh);
                this._glow.active = true;
            }
            const gop = this._glow.getComponent(UIOpacity)!;
            Tween.stopAllByTarget(gop);
            gop.opacity = 0;
            tween(gop).to(0.24, { opacity: 150 }).start();
        }

        options.forEach((option, i) => {
            const card = createUINode('Card' + i);
            this.node.addChild(card);
            card.addComponent(UITransform).setContentSize(LevelUpPanel.CARD_W, LevelUpPanel.CARD_H);
            card.setPosition((i - 1) * 315, 20);
            const op = card.addComponent(UIOpacity);
            this._cardOps.push(op);
            const cardFrame = AssetLib.frame('ui/panel/panel_card');
            if (cardFrame) {
                // 卡片底：米白纸质卡
                const bgNode = createUINode('CardBg');
                card.addChild(bgNode);
                bgNode.addComponent(UITransform).setContentSize(LevelUpPanel.CARD_W, LevelUpPanel.CARD_H);
                const sp = bgNode.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
                sp.spriteFrame = cardFrame;
            } else {
            const g = card.addComponent(Graphics);
            g.fillColor = Palette.cardBg;
            g.roundRect(-LevelUpPanel.CARD_W / 2, -LevelUpPanel.CARD_H / 2, LevelUpPanel.CARD_W, LevelUpPanel.CARD_H, 12);
            g.fill();
            g.strokeColor = Palette.cardBorder;
            g.lineWidth = 4;
            g.roundRect(-LevelUpPanel.CARD_W / 2, -LevelUpPanel.CARD_H / 2, LevelUpPanel.CARD_W, LevelUpPanel.CARD_H, 12);
            g.stroke();
            }

            // 卡面：英雄名 / 强化名 / 数值说明（占位三行文本）
            const lines = option.title.split('\n');
            // 米白卡底配纯黑小字，避免描边糊字
            const textColor = cardFrame ? Color.BLACK : Palette.text;
            this._makeCardLabel(card, lines[0], 105, 30, undefined, textColor);
            this._makeCardLabel(card, lines[1], 0, 28, undefined, textColor);
            // 描述行给两行高度，长说明换行显示
            this._makeCardLabel(card, option.desc, -105, 24, 81, textColor);

            // 入场：初始状态压在下方半透明缩小，错峰滑入（卡片整体下移，给副题让出间隙）
            const targetY = -40;
            card.setPosition((i - 1) * 315, targetY - 130);
            op.opacity = 0;
            card.setScale(0.6, 0.6, 1);
            tween(card)
                .delay(i * 0.07)
                .parallel(
                    tween(card).to(0.3, { position: new Vec3((i - 1) * 315, targetY, 0) }, { easing: 'backOut' }),
                    tween(card).to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }),
                    tween(op).to(0.14, { opacity: 255 }),
                )
                .start();

            card.on(Node.EventType.TOUCH_END, () => {
                if (this._picking) {
                    return;
                }
                this._picking = true;
                // 选卡：中选卡弹跳放大上浮，其余两卡缩小淡出，动画结束后结算并关闭
                Tween.stopAllByTarget(card);
                tween(card)
                    .parallel(
                        tween(card).to(0.16, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' }),
                        tween(card).to(0.16, { position: new Vec3(card.position.x, targetY + 46, 0) }, { easing: 'quadOut' }),
                        tween(op).to(0.16, { opacity: 255 }),
                    )
                    .start();
                this._cards.forEach((other, j) => {
                    if (other === card) {
                        return;
                    }
                    Tween.stopAllByTarget(other);
                    const otherOp = this._cardOps[j];
                    tween(other)
                        .parallel(
                            tween(other).to(0.18, { scale: new Vec3(0.8, 0.8, 1) }, { easing: 'quadIn' }),
                            tween(other).to(0.18, { position: new Vec3(other.position.x, targetY - 70, 0) }, { easing: 'quadIn' }),
                            tween(otherOp).to(0.18, { opacity: 0 }),
                        )
                        .start();
                });
                tween(this.node)
                    .delay(0.3)
                    .call(() => {
                        this._clearCards();
                        this.node.active = false;
                        this._picking = false;
                        onPick(option);
                    })
                    .start();
            });

            this._cards.push(card);
        });
    }

    private _clearCards(): void {
        for (const card of this._cards) {
            Tween.stopAllByTarget(card);
            card.destroy();
        }
        this._cards.length = 0;
        this._cardOps.length = 0;
    }

    private _makeLabel(text: string, x: number, size: number, color?: Color): Label {
        const labelNode = createUINode('label');
        this.node.addChild(labelNode);
        labelNode.setPosition(x, 0);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 6;
        label.isBold = true;
        label.color = color ?? Palette.text;
        return label;
    }

    private _makeCardLabel(parent: Node, text: string, y: number, size: number, boxH?: number, color?: Color): void {
        const labelNode = createUINode('cardLabel');
        parent.addChild(labelNode);
        labelNode.setPosition(0, y);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 6;
        label.isBold = true;
        label.color = color ?? Palette.text;
        // 米白卡底配纯黑文字，无需描边
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        // 技能卡文案较长：限定宽度并 SHRINK，超长自动缩字/换行，避免溢出卡面
        label.overflow = Label.Overflow.SHRINK;
        labelNode.getComponent(UITransform)!.setContentSize(255, boxH ?? size + 15);
    }
}
