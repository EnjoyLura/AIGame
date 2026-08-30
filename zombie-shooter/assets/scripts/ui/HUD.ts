import { _decorator, Color, Component, Graphics, Label, Node, UIOpacity, UITransform, Vec3, view, tween } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { createUINode } from '../core/createUINode';
import { GameManager } from '../core/GameManager';
import { BattleManager } from '../battle/BattleManager';

/**
 * 战斗 HUD：计时、波次、击杀、经验条与等级、载具耐久条、波次提示、结算面板。
 * 全部代码动态构建（不依赖预制体）；正式版逐步替换为九宫格图片 UI。
 */
@ccclass('HUD')
export class HUD extends Component {
    private static readonly XP_BAR_W = 900;
    private static readonly XP_BAR_H = 21;
    private static readonly VEHICLE_BAR_W = 480;
    private static readonly VEHICLE_BAR_H = 33;

    private _waveLabel: Label = null!;
    private _timeLabel: Label = null!;
    private _killLabel: Label = null!;
    private _levelLabel: Label = null!;
    private _xpFill: Node = null!;
    private _vehicleFill: Node = null!;
    private _popupLabel: Label = null!;
    private _popupOpacity: UIOpacity = null!;
    private _overPanel: Node = null!;
    private _failWaveLabel: Label = null!;
    private _failKillLabel: Label = null!;
    private _failLevelLabel: Label = null!;

    /** 实际可见高度（fitWidth 模式下随屏幕长宽比变化），HUD 上下边缘都锚定它 */
    private get _vh(): number {
        return view.getVisibleSize().height;
    }
    /** 车尾条上沿的 HUD 坐标系 Y（与 BattleManager 部署逻辑同源） */
    private get _vehicleTopY(): number {
        return -this._vh / 2 + BattleConfig.VEHICLE_STRIP_HEIGHT;
    }

    onLoad(): void {
        this._buildTopBar();
        this._buildXpBar();
        this._buildVehicleBar();
        this._buildWavePopup();
        this._buildOverPanel();

        eventCenter.on(GameEvent.WAVE_START, this._onWaveStart, this);
        eventCenter.on(GameEvent.XP_CHANGED, this._onXpChanged, this);
        eventCenter.on(GameEvent.VEHICLE_HP_CHANGED, this._onVehicleHpChanged, this);
        eventCenter.on(GameEvent.ENEMY_DEAD, this._onKill, this);
        eventCenter.on(GameEvent.GAME_OVER, this._onGameOver, this);
    }

    onDestroy(): void {
        eventCenter.off(GameEvent.WAVE_START, this._onWaveStart, this);
        eventCenter.off(GameEvent.XP_CHANGED, this._onXpChanged, this);
        eventCenter.off(GameEvent.VEHICLE_HP_CHANGED, this._onVehicleHpChanged, this);
        eventCenter.off(GameEvent.ENEMY_DEAD, this._onKill, this);
        eventCenter.off(GameEvent.GAME_OVER, this._onGameOver, this);
    }

    update(): void {
        const bm = BattleManager.instance;
        if (!bm) {
            return;
        }
        const total = Math.floor(bm.elapsed);
        const m = String(Math.floor(total / 60)).padStart(2, '0');
        const s = String(total % 60).padStart(2, '0');
        this._timeLabel.string = `${m}:${s}`;
    }

    // ================= 事件响应 =================

    private _onWaveStart(wave: number, total: number): void {
        this._overPanel.active = false;
        this._waveLabel.string = wave > total ? `第 ${wave} 波 · 无尽` : `第 ${wave} / ${total} 波`;

        // 中央波次提示：弹出 → 停留 → 淡出
        this._popupLabel.string = `第 ${wave} 波`;
        this._popupOpacity.opacity = 255;
        const popupNode = this._popupLabel.node;
        popupNode.setScale(0.6, 0.6, 1);
        tween(popupNode).to(0.18, { scale: new Vec3(1, 1, 1) }).start();
        tween(this._popupOpacity).delay(0.9).to(0.3, { opacity: 0 }).start();
    }

    private _onXpChanged(xp: number, need: number, level: number): void {
        this._levelLabel.string = `Lv.${level}`;
        this._xpFill.setScale(Math.max(0, Math.min(1, xp / need)), 1, 1);
    }

    private _onVehicleHpChanged(hp: number, maxHp: number): void {
        this._vehicleFill.setScale(maxHp > 0 ? Math.max(0, hp / maxHp) : 0, 1, 1);
    }

    private _onKill(kills: number): void {
        this._killLabel.string = `击杀 ${kills}`;
    }

    private _onGameOver(): void {
        // 结算数据
        const gm = GameManager.instance;
        this._failWaveLabel.string = `抵达波次：第 ${gm.wave} 波`;
        this._failKillLabel.string = `击杀怪物：${gm.kills}`;
        this._failLevelLabel.string = `团队等级：Lv.${gm.level}`;
        // 弹窗置顶：运行中动态生成的节点会排在 HUD 之后
        this._overPanel.setSiblingIndex(this._overPanel.parent.children.length - 1);
        this._overPanel.active = true;
    }

    // ================= 动态构建 =================

    private _makeLabel(parent: Node, text: string, x: number, y: number, size: number): Label {
        const node = createUINode('label');
        parent.addChild(node);
        node.setPosition(x, y);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 9;
        label.isBold = true;
        label.color = Palette.text;
        label.enableOutline = true;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 3;
        return label;
    }

    private _buildTopBar(): void {
        this._timeLabel = this._makeLabel(this.node, '00:00', -Design.WIDTH / 2 + 135, this._vh / 2 - 75, 45);
        this._waveLabel = this._makeLabel(this.node, '', 0, this._vh / 2 - 75, 51);
        this._killLabel = this._makeLabel(this.node, '击杀 0', Design.WIDTH / 2 - 135, this._vh / 2 - 75, 45);
    }

    /** 经验条：顶栏下方细条 + 等级徽标 */
    private _buildXpBar(): void {
        const barY = this._vh / 2 - 150;
        this._levelLabel = this._makeLabel(this.node, 'Lv.1', -Design.WIDTH / 2 + 75, barY, 39);

        const bg = createUINode('XpBarBg');
        this.node.addChild(bg);
        bg.setPosition(60, barY);
        const g = bg.addComponent(Graphics);
        g.fillColor = Palette.hpBarBg;
        g.roundRect(-HUD.XP_BAR_W / 2, -HUD.XP_BAR_H / 2, HUD.XP_BAR_W, HUD.XP_BAR_H, HUD.XP_BAR_H / 2);
        g.fill();

        const fillNode = createUINode('XpBarFill');
        bg.addChild(fillNode);
        const fillH = HUD.XP_BAR_H - 6;
        const ut = fillNode.addComponent(UITransform);
        ut.setAnchorPoint(0, 0.5);
        ut.setContentSize(HUD.XP_BAR_W - 12, fillH);
        fillNode.setPosition(-HUD.XP_BAR_W / 2 + 6, 0);
        const fg = fillNode.addComponent(Graphics);
        fg.fillColor = Palette.xpBarFill;
        fg.roundRect(0, -fillH / 2, HUD.XP_BAR_W - 12, fillH, fillH / 2);
        fg.fill();
        fillNode.setScale(0, 1, 1);
        this._xpFill = fillNode;
    }

    /** 载具耐久条：悬在车尾护栏上方 */
    private _buildVehicleBar(): void {
        const barY = this._vehicleTopY + 82;
        const bg = createUINode('VehicleBarBg');
        this.node.addChild(bg);
        bg.setPosition(0, barY);
        const g = bg.addComponent(Graphics);
        g.fillColor = Palette.hpBarBg;
        g.roundRect(-HUD.VEHICLE_BAR_W / 2, -HUD.VEHICLE_BAR_H / 2, HUD.VEHICLE_BAR_W, HUD.VEHICLE_BAR_H, HUD.VEHICLE_BAR_H / 2);
        g.fill();

        const fillNode = createUINode('VehicleBarFill');
        bg.addChild(fillNode);
        const fillH = HUD.VEHICLE_BAR_H - 9;
        const ut = fillNode.addComponent(UITransform);
        ut.setAnchorPoint(0, 0.5);
        ut.setContentSize(HUD.VEHICLE_BAR_W - 12, fillH);
        fillNode.setPosition(-HUD.VEHICLE_BAR_W / 2 + 6, 0);
        const fg = fillNode.addComponent(Graphics);
        fg.fillColor = Palette.vehicleBarFill;
        fg.roundRect(0, -fillH / 2, HUD.VEHICLE_BAR_W - 12, fillH, fillH / 2);
        fg.fill();
        fillNode.setScale(1, 1, 1);
        this._vehicleFill = fillNode;
    }

    private _buildWavePopup(): void {
        this._popupLabel = this._makeLabel(this.node, '', 0, this._vh * 0.16, 84);
        this._popupLabel.outlineWidth = 4;
        this._popupOpacity = this._popupLabel.node.addComponent(UIOpacity);
        this._popupOpacity.opacity = 0;
    }

    /** 护送失败结算弹窗：半屏遮罩 + 结算卡片 + 重新挑战按钮 */
    private _buildOverPanel(): void {
        const panel = createUINode('FailPanel');
        this.node.addChild(panel);
        panel.addComponent(UITransform).setContentSize(Design.WIDTH, this._vh);

        const g = panel.addComponent(Graphics);
        g.fillColor = Palette.overlay;
        g.rect(-Design.WIDTH / 2, -this._vh / 2, Design.WIDTH, this._vh);
        g.fill();

        // 结算卡片
        const card = createUINode('FailCard');
        panel.addChild(card);
        const cardW = 840;
        const cardH = 690;
        card.setPosition(0, 90);
        card.addComponent(UITransform).setContentSize(cardW, cardH);
        const cg = card.addComponent(Graphics);
        cg.fillColor = Palette.cardBg;
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        cg.fill();
        cg.strokeColor = Palette.cardBorder;
        cg.lineWidth = 6;
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        cg.stroke();

        this._makeLabel(card, '护送失败', 0, 225, 84);
        this._failWaveLabel = this._makeLabel(card, '', 0, 90, 45);
        this._failKillLabel = this._makeLabel(card, '', 0, 15, 45);
        this._failLevelLabel = this._makeLabel(card, '', 0, -60, 45);

        // 重新挑战按钮
        const btn = createUINode('RetryBtn');
        card.addChild(btn);
        btn.addComponent(UITransform).setContentSize(480, 144);
        btn.setPosition(0, -225);
        const bg = btn.addComponent(Graphics);
        bg.fillColor = Palette.vehicleBarFill;
        bg.roundRect(-240, -72, 480, 144, 72);
        bg.fill();
        const btnLabel = this._makeLabel(btn, '重 新 挑 战', 0, 0, 51);
        btnLabel.node.setPosition(0, 0);

        btn.on(Node.EventType.TOUCH_END, () => {
            eventCenter.emit(GameEvent.GAME_RESTART);
        });
        panel.active = false;
        this._overPanel = panel;
    }
}
