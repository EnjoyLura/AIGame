import { _decorator, Color, Component, Graphics, Label, Node, UIOpacity, UITransform, Vec3, view, tween } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { createUINode } from '../core/createUINode';
import { GameManager } from '../core/GameManager';
import { BattleManager } from '../battle/BattleManager';
import { SoundFx } from '../core/SoundFx';

/** 两位数补零（计时 mm:ss；tsconfig lib 无 padStart，用本地实现） */
function pad2(n: number): string {
    return n < 10 ? '0' + n : String(n);
}

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
    private _vehicleText: Label = null!;
    private _popupLabel: Label = null!;
    private _popupOpacity: UIOpacity = null!;
    private _overPanel: Node = null!;
    private _pausePanel: Node = null!;
    private _statsPanel: Node = null!;
    private _statsTeamLabel: Label = null!;
    private _statsRows: Array<{ main: Label; sub: Label }> = [];
    private _statsRefresh = 0;
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
        this._buildPauseButton();
        this._buildPausePanel();
        this._buildStatsButton();
        this._buildStatsPanel();

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

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm) {
            return;
        }
        const total = Math.floor(bm.elapsed);
        const m = pad2(Math.floor(total / 60));
        const s = pad2(total % 60);
        this._timeLabel.string = `${m}:${s}`;
        // 统计浮窗打开期间每 0.5s 实时刷新
        if (this._statsPanel.active) {
            this._statsRefresh -= dt;
            if (this._statsRefresh <= 0) {
                this._statsRefresh = 0.5;
                this._refreshStats();
            }
        }
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
        this._vehicleFill.setScale(maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0, 1, 1);
        this._vehicleText.string = `耐久 ${Math.ceil(Math.max(0, hp))} / ${maxHp}`;
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
        return label;
    }

    private _buildTopBar(): void {
        // 构建版本戳（左下角小字，识别设备构建新旧）：常量 + 构建时间（postbuild 注入）
        const buildTime = (typeof window !== 'undefined' && (window as any).__BUILD_TIME) || '';
        const stamp = this._makeLabel(this.node, BUILD_STAMP + (buildTime ? '·' + buildTime : ''), -Design.WIDTH / 2 + 70, -this._vh / 2 + 30, 22);
        stamp.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        stamp.node.setPosition(-Design.WIDTH / 2 + 16, -this._vh / 2 + 30);
        stamp.color = new Color(195, 206, 213, 255);
        console.log('[末日航线] build', BUILD_STAMP, buildTime);
        // 计时右移让位左上角 暂停/统计 按钮排
        this._timeLabel = this._makeLabel(this.node, '00:00', -Design.WIDTH / 2 + 268, this._vh / 2 - 75, 36);
        this._waveLabel = this._makeLabel(this.node, '', 0, this._vh / 2 - 75, 51);
        this._killLabel = this._makeLabel(this.node, '击杀 0', Design.WIDTH / 2 - 135, this._vh / 2 - 75, 36);
        for (const label of [this._timeLabel, this._killLabel]) {
            label.isBold = false;
            label.color = new Color(189, 203, 212, 255);
        }
    }

    /** 左上角伤害统计按钮：深色圆角方块 + 柱状图图标 */
    private _buildStatsButton(): void {
        const btn = createUINode('StatsBtn');
        this.node.addChild(btn);
        btn.addComponent(UITransform).setContentSize(84, 84);
        btn.setPosition(-Design.WIDTH / 2 + 154, this._vh / 2 - 74);
        const g = btn.addComponent(Graphics);
        g.fillColor = new Color(38, 52, 63, 255);
        g.roundRect(-42, -42, 84, 84, 18);
        g.fill();
        g.strokeColor = new Color(128, 222, 228, 255);
        g.lineWidth = 2;
        g.roundRect(-42, -42, 84, 84, 18);
        g.stroke();
        // 三根高低柱：统计图示意
        g.fillColor = Palette.text;
        g.roundRect(-23, -13, 12, 26, 3);
        g.fill();
        g.roundRect(-6, -22, 12, 35, 3);
        g.fill();
        g.roundRect(11, -4, 12, 17, 3);
        g.fill();
        btn.on(Node.EventType.TOUCH_END, () => this._toggleStats());
    }

    /** 伤害统计浮窗：非模态卡片，展开后每 0.5s 实时刷新 */
    private _buildStatsPanel(): void {
        const panel = createUINode('StatsPanel');
        this.node.addChild(panel);
        panel.addComponent(UITransform).setContentSize(Design.WIDTH, this._vh);

        const card = createUINode('StatsCard');
        panel.addChild(card);
        const cardW = 900;
        const cardH = 880;
        card.setPosition(0, 40);
        card.addComponent(UITransform).setContentSize(cardW, cardH);
        const cg = card.addComponent(Graphics);
        cg.fillColor = Palette.cardBg;
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        cg.fill();
        cg.strokeColor = Palette.cardBorder;
        cg.lineWidth = 6;
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        cg.stroke();

        this._makeLabel(card, '伤 害 统 计', 0, cardH / 2 - 66, 56);
        this._statsTeamLabel = this._makeLabel(card, '', 0, cardH / 2 - 138, 40);

        // 每英雄两行：主行（名/伤害/团队占比）+ 副行（普攻/技能/大招占比）
        const rowTop = cardH / 2 - 236;
        const rowGap = 128;
        for (let i = 0; i < 4; i++) {
            const y = rowTop - i * rowGap;
            const main = this._makeLabel(card, '', 0, y, 40);
            const sub = this._makeLabel(card, '', 0, y - 50, 30);
            sub.color = new Color(120, 130, 140, 255);
            this._statsRows.push({ main, sub });
        }

        this._makeMenuButton(card, '关 闭', -cardH / 2 + 84, Palette.hpBarBg, () => this._hideStats());
        panel.active = false;
        this._statsPanel = panel;
    }

    private _toggleStats(): void {
        SoundFx.play('ui');
        if (this._statsPanel.active) {
            this._hideStats();
            return;
        }
        this._statsPanel.setSiblingIndex(this._statsPanel.parent.children.length - 1);
        this._statsPanel.active = true;
        this._statsRefresh = 0.5;
        this._refreshStats();
    }

    private _hideStats(): void {
        this._statsPanel.active = false;
    }

    /** 刷新统计浮窗数值（伤害缩写与飘字同规则：≥1000 → k） */
    private _refreshStats(): void {
        const bm = BattleManager.instance;
        if (!bm) {
            return;
        }
        const stats = bm.getDamageStats();
        const fmt = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v));
        this._statsTeamLabel.string = `团队总伤害：${fmt(stats.teamTotal)}`;
        stats.byHero.forEach((h, i) => {
            const row = this._statsRows[i];
            if (!row) {
                return;
            }
            const pct = stats.teamTotal > 0 ? Math.round((h.total / stats.teamTotal) * 100) : 0;
            row.main.string = `${h.name}　${fmt(h.total)}　·　${pct}%`;
            const sp = (v: number) => (h.total > 0 ? Math.round((v / h.total) * 100) : 0);
            row.sub.string = `普攻 ${sp(h.basic)}% ｜ 技能 ${sp(h.skill)}% ｜ 大招 ${sp(h.ultimate)}%`;
        });
    }

    /** 左上角暂停按钮：深色圆角方块 + 双竖条图标 */
    private _buildPauseButton(): void {
        const btn = createUINode('PauseBtn');
        this.node.addChild(btn);
        btn.addComponent(UITransform).setContentSize(84, 84);
        btn.setPosition(-Design.WIDTH / 2 + 58, this._vh / 2 - 74);
        const g = btn.addComponent(Graphics);
        g.fillColor = new Color(38, 52, 63, 255);
        g.roundRect(-42, -42, 84, 84, 18);
        g.fill();
        g.strokeColor = new Color(128, 222, 228, 255);
        g.lineWidth = 2;
        g.roundRect(-42, -42, 84, 84, 18);
        g.stroke();
        g.fillColor = Palette.text;
        g.roundRect(-15, -16, 10, 32, 3);
        g.fill();
        g.roundRect(5, -16, 10, 32, 3);
        g.fill();
        btn.on(Node.EventType.TOUCH_END, () => this._togglePause());
    }

    /** 暂停菜单：全屏遮罩 + 「继续游戏 / 重新挑战」 */
    private _buildPausePanel(): void {
        const panel = createUINode('PausePanel');
        this.node.addChild(panel);
        panel.addComponent(UITransform).setContentSize(Design.WIDTH, this._vh);
        const g = panel.addComponent(Graphics);
        g.fillColor = Palette.overlay;
        g.rect(-Design.WIDTH / 2, -this._vh / 2, Design.WIDTH, this._vh);
        g.fill();
        // 吞掉遮罩上的点击，防止穿透到战场
        panel.on(Node.EventType.TOUCH_END, () => { /* 仅拦截 */ });

        this._makeLabel(panel, '已暂停', 0, 280, 84);
        this._makeMenuButton(panel, '继 续 游 戏', 80, Palette.xpBarFill, () => {
            this._hidePausePanel();
            BattleManager.instance?.togglePause();
        });
        this._makeMenuButton(panel, '重 新 挑 战', -110, Palette.vehicleBarFill, () => {
            this._hidePausePanel();
            eventCenter.emit(GameEvent.GAME_RESTART);
        });
        panel.active = false;
        this._pausePanel = panel;
    }

    /** 暂停菜单按钮：圆角胶囊 + 文案 */
    private _makeMenuButton(parent: Node, text: string, y: number, bgColor: Color, onClick: () => void): void {
        const btn = createUINode('MenuBtn_' + text);
        parent.addChild(btn);
        btn.addComponent(UITransform).setContentSize(480, 132);
        btn.setPosition(0, y);
        const g = btn.addComponent(Graphics);
        g.fillColor = bgColor;
        g.roundRect(-240, -66, 480, 132, 66);
        g.fill();
        g.strokeColor = Palette.cardBorder;
        g.lineWidth = 5;
        g.roundRect(-240, -66, 480, 132, 66);
        g.stroke();
        this._makeLabel(btn, text, 0, 0, 48);
        btn.on(Node.EventType.TOUCH_END, onClick);
    }

    private _togglePause(): void {
        const bm = BattleManager.instance;
        if (!bm) {
            return;
        }
        SoundFx.play('ui');
        const paused = bm.togglePause();
        if (paused) {
            // 置顶：运行中动态生成的节点会排在 HUD 之后
            this._pausePanel.setSiblingIndex(this._pausePanel.parent.children.length - 1);
        }
        this._pausePanel.active = paused;
    }

    private _hidePausePanel(): void {
        this._pausePanel.active = false;
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
        this._vehicleText = this._makeLabel(bg, `耐久 ${BattleConfig.VEHICLE_MAX_HP} / ${BattleConfig.VEHICLE_MAX_HP}`, 0, 0, 23);
    }

    private _buildWavePopup(): void {
        this._popupLabel = this._makeLabel(this.node, '', 0, this._vh * 0.16, 84);
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
