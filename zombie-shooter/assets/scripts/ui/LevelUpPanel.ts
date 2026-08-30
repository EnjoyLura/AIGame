import { _decorator, Color, Component, Graphics, Label, Node, Sprite, UITransform } from 'cc';
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
    private _cards: Node[] = [];
    private _banner: Node = null!;

    onLoad(): void {
        const halfW = Design.WIDTH / 2;
        const halfH = Design.HEIGHT / 2;
        this.node.addComponent(UITransform).setContentSize(Design.WIDTH, Design.HEIGHT);

        const g = this.node.addComponent(Graphics);
        g.fillColor = Palette.overlay;
        g.rect(-halfW, -halfH, Design.WIDTH, Design.HEIGHT);
        g.fill();

        this._title = this._makeLabel('团队升级！选择一项强化', 0, 66);
        this._title.node.setPosition(0, 260);

        // 标题横幅（参考《向僵尸开炮》撕纸横幅；美术就绪后显示在标题文字下层）
        const banner = createUINode('Banner');
        this.node.addChild(banner);
        banner.addComponent(UITransform).setContentSize(540, 183);
        banner.setPosition(0, 260);
        banner.addComponent(Sprite);
        banner.active = false;
        this._banner = banner;
        banner.setSiblingIndex(this._title.node.getSiblingIndex());

        this.node.active = false;
    }

    /** 展示三张卡片；点选回调由 BattleManager 注入 */
    show(options: CardOption[], onPick: (option: CardOption) => void): void {
        // 面板置顶：运行中动态生成的怪物节点会排在后面，必须重新排到最上层
        this.node.setSiblingIndex(this.node.parent.children.length - 1);
        this._clearCards();
        this.node.active = true;

        // 标题横幅：美术就绪即显示（标题文字压在其上）
        const bannerFrame = AssetLib.frame('ui/banner');
        if (bannerFrame && !this._banner.active) {
            const bsp = this._banner.getComponent(Sprite)!;
            bsp.sizeMode = Sprite.SizeMode.CUSTOM;
            bsp.trim = false;
            bsp.spriteFrame = bannerFrame;
            this._banner.active = true;
        }

        options.forEach((option, i) => {
            const card = createUINode('Card' + i);
            this.node.addChild(card);
            card.addComponent(UITransform).setContentSize(LevelUpPanel.CARD_W, LevelUpPanel.CARD_H);
            card.setPosition((i - 1) * 315, 20);

            const cardFrame = AssetLib.frame('ui/panel_card');
            if (cardFrame) {
                // 正式版卡片底（参考《向僵尸开炮》米白纸质卡）
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
            card.on(Node.EventType.TOUCH_END, () => {
                this._clearCards();
                this.node.active = false;
                onPick(option);
            });

            this._cards.push(card);
        });
    }

    private _clearCards(): void {
        for (const card of this._cards) {
            card.destroy();
        }
        this._cards.length = 0;
    }

    private _makeLabel(text: string, x: number, size: number): Label {
        const labelNode = createUINode('label');
        this.node.addChild(labelNode);
        labelNode.setPosition(x, 0);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 6;
        label.isBold = true;
        label.color = Palette.text;
        label.enableOutline = true;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 2;
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
        label.enableOutline = false;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 2;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        // 技能卡文案较长：限定宽度并 SHRUNK，超长自动缩字/换行，避免溢出卡面
        label.overflow = Label.Overflow.SHRUNK;
        labelNode.getComponent(UITransform)!.setContentSize(255, boxH ?? size + 15);
    }
}
