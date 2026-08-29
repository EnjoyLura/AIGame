import { _decorator, Color, Component, Graphics, Label, Node, tween, UIOpacity, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { ABILITY_MAX_LEVEL, AbilityDef } from '../battle/HeroDef';
import { Hero } from '../battle/Hero';
import { createUINode } from '../core/createUINode';

/**
 * 英雄技能/大招图标栏（参考《向僵尸开炮》）：
 * 1、2 号位英雄图标靠屏幕左列、3、4 号位靠右列，从上到下按号位排列，每英雄技能在上、大招在下。
 * 技能图标=冷却剩余秒数（冷却中变暗）；大招图标=外环充能进度；右下角数字=三选一强化的当前等级，
 * 未解锁显示灰底锁形。点按图标弹出数值浮窗，长按 0.45 秒显示该能力的战场范围圈。
 * 全部代码动态绘制（占位阶段无图标贴图，正式版替换为圆形图标帧）。
 */

const ICON_R = 32;
const COL_X = 314;
/** 每侧 6 行：每英雄占 3 行（普攻/技能/大招），两英雄共 6 行从上到下（避开顶部 HUD） */
const ROW_YS = [470, 392, 314, 236, 158, 80];
const LONG_PRESS_TIME = 0.45;
const TIP_W = 300;
const TIP_MAX_ROWS = 6;

const COLOR_SKILL_BG = new Color(31, 58, 95, 235);
const COLOR_SKILL_EDGE = new Color(79, 195, 247, 255);
const COLOR_ULT_BG = new Color(95, 58, 31, 235);
const COLOR_ULT_EDGE = new Color(255, 171, 64, 255);
const COLOR_BASIC_BG = new Color(58, 72, 88, 235);
const COLOR_BASIC_EDGE = new Color(176, 190, 197, 255);
const COLOR_LOCK_BG = new Color(55, 71, 79, 210);
const COLOR_LOCK_EDGE = new Color(120, 144, 156, 210);
const COLOR_RANGE = new Color(79, 195, 247, 150);
const COLOR_RANGE_FILL = new Color(79, 195, 247, 16);
const COLOR_RANGE_AREA = new Color(255, 171, 64, 150);

type SlotId = 'basic' | 'skill' | 'ultimate';
const SLOT_ORDER: SlotId[] = ['basic', 'skill', 'ultimate'];

/** 图标角标/tip 共用的能力运行时信息（Hero.abilityInfo 返回结构） */
interface AbilityInfo {
    def: AbilityDef;
    level: number;
    unlocked: boolean;
    cdLeft: number;
    cdTotal: number;
    damage: number;
}

/** 单个能力图标：底圆/锁形 + 名字首字 + 等级角标 + 技能冷却秒数/大招充能环 */
class AbilityIcon {
    readonly node: Node;
    private _bar: AbilityBar;
    private _hero: Hero;
    private _slot: SlotId;
    private _baseG: Graphics = null!;
    /** 冷却扇形遮罩层（参考《向僵尸开炮》：暗色饼图随冷却顺时针收缩） */
    private _maskG: Graphics = null!;
    private _ringG: Graphics = null!;
    private _nameLabel: Label = null!;
    private _lvLabel: Label = null!;
    private _opacity: UIOpacity = null!;
    private _lastUnlocked: boolean | null = null;
    private _lastLevel = -1;
    private _wasCooling = false;

    constructor(bar: AbilityBar, hero: Hero, slot: SlotId, index: number) {
        this._bar = bar;
        this._hero = hero;
        this._slot = slot;
        const left = index < 2;
        // 同侧两英雄各占 3 行：普攻/技能/大招从上到下（此前索引越界取到 undefined 导致图标 NaN 坐标不可见）
        const slotIndex = slot === 'basic' ? 0 : slot === 'skill' ? 1 : 2;
        const y = ROW_YS[(index % 2) * 3 + slotIndex];

        this.node = createUINode(`Icon_${hero.def.id}_${slot}`);
        // 图标必须挂到图标栏节点上（此前遗漏 addChild，图标成了永不渲染的孤儿节点）
        bar.node.addChild(this.node);
        this.node.addComponent(UITransform).setContentSize(ICON_R * 2, ICON_R * 2);
        this.node.setPosition(left ? -COL_X : COL_X, y);
        this._opacity = this.node.addComponent(UIOpacity);

        const bgNode = createUINode('Base');
        this.node.addChild(bgNode);
        this._baseG = bgNode.addComponent(Graphics);

        const maskNode = createUINode('Mask');
        this.node.addChild(maskNode);
        this._maskG = maskNode.addComponent(Graphics);

        const ringNode = createUINode('Ring');
        this.node.addChild(ringNode);
        this._ringG = ringNode.addComponent(Graphics);

        this._nameLabel = this._makeLabel('Name', 0, 0, 30);
        // 等级角标：右下角大号白字黑描边（参考《向僵尸开炮》样式）
        this._lvLabel = this._makeLabel('Lv', ICON_R - 6, -ICON_R + 10, 24);

        this.node.on(Node.EventType.TOUCH_START, () => this._bar.onPressStart(this), this);
        this.node.on(Node.EventType.TOUCH_END, () => this._bar.onPressEnd(this), this);
        this.node.on(Node.EventType.TOUCH_CANCEL, () => this._bar.onPressCancel(this), this);

        this.refresh();
    }

    get hero(): Hero { return this._hero; }
    get slot(): SlotId { return this._slot; }

    private _makeLabel(name: string, x: number, y: number, size: number, parent?: Node): Label {
        const n = createUINode('lb_' + name);
        (parent ?? this.node).addChild(n);
        n.setPosition(x, y);
        const label = n.addComponent(Label);
        // Label 默认字符串是 "label"，不显式清空会显示占位文字
        label.string = '';
        label.fontSize = size;
        label.lineHeight = size + 4;
        label.isBold = true;
        label.color = Color.WHITE;
        label.enableOutline = true;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 2;
        return label;
    }

    /** 每帧刷新：等级/解锁变化重画底，冷却文字与充能环按需更新 */
    refresh(): void {
        const info = this._hero.abilityInfo(this._slot);
        if (!info) {
            return;
        }
        // 未解锁的技能/大招不显示图标（普攻常显）
        this.node.active = this._slot === 'basic' || info.unlocked;
        if (info.unlocked !== this._lastUnlocked || info.level !== this._lastLevel) {
            this._lastUnlocked = info.unlocked;
            this._lastLevel = info.level;
            this._drawBase(info);
            this._lvLabel.string = info.unlocked && this._slot !== 'basic' ? String(info.level) : '';
        }

        if (this._slot === 'basic') {
            // 普攻常亮：无冷却/充能/角标
            return;
        }
        const cooling = info.unlocked && info.cdLeft > 0;
        if (this._slot === 'skill') {
            // 技能：参考《向僵尸开炮》扇形冷却遮罩（暗色饼图随冷却顺时针收缩）
            this._drawCooldownMask(info, cooling);
        } else {
            // 大招：外环充能进度，充满后消失并弹跳提示
            this._drawRing(info, cooling);
        }
        if (this._wasCooling && !cooling) {
            this._punch();
        }
        this._wasCooling = cooling;
    }

    /** 技能冷却遮罩：暗色扇形盖住"未恢复"部分，从顶部顺时针随冷却缩小 */
    private _drawCooldownMask(info: AbilityInfo, cooling: boolean): void {
        const g = this._maskG;
        g.clear();
        if (!cooling || info.cdTotal <= 0) {
            return;
        }
        const ratio = Math.min(1, Math.max(0, 1 - info.cdLeft / info.cdTotal));
        const start = -Math.PI / 2;
        // 已恢复的结束角（顺时针）；扇形盖住 recovered→顶部+整圈 的剩余部分
        const recoveredEnd = start + Math.max(0.02, ratio) * Math.PI * 2;
        g.fillColor = new Color(10, 16, 22, 150);
        g.moveTo(0, 0);
        g.arc(0, 0, ICON_R + 3, recoveredEnd, start + Math.PI * 2, false);
        g.close();
        g.fill();
    }

    private _punch(): void {
        tween(this.node)
            .to(0.08, { scale: new Vec3(1.18, 1.18, 1) })
            .to(0.14, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /** 底圆 + 中央首字/锁形 + 角标底（仅解锁状态或等级变化时重画） */
    private _drawBase(info: AbilityInfo): void {
        const g = this._baseG;
        g.clear();
        if (this._slot === 'basic') {
            // 普攻：中性灰蓝底常亮，中央显示英雄名首字，无角标
            g.fillColor = COLOR_BASIC_BG;
            g.strokeColor = COLOR_BASIC_EDGE;
            g.circle(0, 0, ICON_R);
            g.fill();
            g.lineWidth = 4;
            g.stroke();
            this._nameLabel.string = this._hero.def.name.slice(0, 1);
            this._badgeG.clear();
            return;
        }
        const isUlt = this._slot === 'ultimate';
        if (!info.unlocked) {
            g.fillColor = COLOR_LOCK_BG;
            g.strokeColor = COLOR_LOCK_EDGE;
            g.circle(0, 0, ICON_R);
            g.fill();
            g.lineWidth = 3;
            g.stroke();
            // 简易锁形：锁梁弧 + 锁体圆角方块
            g.lineWidth = 4;
            g.strokeColor = COLOR_LOCK_EDGE;
            g.arc(0, 8, 8, 0, Math.PI, false);
            g.stroke();
            g.fillColor = COLOR_LOCK_EDGE;
            g.roundRect(-11, -10, 22, 16, 3);
            g.fill();
            this._nameLabel.string = '';
            this._badgeG.clear();
            return;
        }
        g.fillColor = isUlt ? COLOR_ULT_BG : COLOR_SKILL_BG;
        g.strokeColor = isUlt ? COLOR_ULT_EDGE : COLOR_SKILL_EDGE;
        g.circle(0, 0, ICON_R);
        g.fill();
        g.lineWidth = 4;
        g.stroke();
        this._nameLabel.string = info.def.name.slice(0, 1);
    }

    /** 大招充能环：冷却中画进度弧，就绪不画（由 punch 提示） */
    private _drawRing(info: AbilityInfo, cooling: boolean): void {
        const g = this._ringG;
        g.clear();
        if (!info.unlocked || !cooling || info.cdTotal <= 0) {
            return;
        }
        const ratio = Math.min(1, Math.max(0, 1 - info.cdLeft / info.cdTotal));
        const r = ICON_R + 5;
        g.lineWidth = 5;
        g.strokeColor = new Color(0, 0, 0, 110);
        g.arc(0, 0, r, 0, Math.PI * 2, false);
        g.stroke();
        if (ratio > 0.01) {
            g.strokeColor = COLOR_ULT_EDGE;
            g.arc(0, 0, r, Math.PI / 2, Math.PI / 2 + ratio * Math.PI * 2, false);
            g.stroke();
        }
    }
}

/** 数值浮窗（点按图标弹出，参照截图样式：标题/属性行/绿色提示） */
class TipView {
    readonly node: Node;
    /** 当前浮窗绑定的图标（再点同一图标关闭） */
    public boundTo: AbilityIcon | null = null;
    private _title: Label = null!;
    private _keys: Label[] = [];
    private _values: Label[] = [];
    private _hint: Label = null!;

    constructor(parent: Node) {
        this.node = createUINode('AbilityTip');
        parent.addChild(this.node);
        this.node.addComponent(UITransform).setContentSize(TIP_W, 260);
        this.node.active = false;

        const g = this.node.addComponent(Graphics);
        g.fillColor = new Color(24, 32, 38, 245);
        g.roundRect(-TIP_W / 2, -130, TIP_W, 260, 10);
        g.fill();
        g.strokeColor = new Color(255, 214, 120, 255);
        g.lineWidth = 3;
        g.roundRect(-TIP_W / 2, -130, TIP_W, 260, 10);
        g.stroke();

        this._title = this._makeLabel('Title', -TIP_W / 2 + 18, 100, 24, 'left', new Color(255, 214, 120, 255), 264, 30);
        for (let i = 0; i < TIP_MAX_ROWS; i++) {
            const y = 58 - i * 30;
            this._keys.push(this._makeLabel('K' + i, -TIP_W / 2 + 18, y, 21, 'left', new Color(214, 222, 228, 255), 110, 27));
            this._values.push(this._makeLabel('V' + i, TIP_W / 2 - 18, y, 21, 'right', new Color(240, 244, 247, 255), 110, 27));
        }
        this._hint = this._makeLabel('Hint', 0, -100, 19, 'center', new Color(126, 226, 126, 255), 270, 50);
    }

    private _makeLabel(name: string, x: number, y: number, size: number,
        align: 'left' | 'right' | 'center', color: Color, boxW?: number, boxH?: number): Label {
        const n = createUINode('tip_' + name);
        this.node.addChild(n);
        n.setPosition(x, y);
        const ut = n.addComponent(UITransform);
        ut.setAnchorPoint(align === 'right' ? 1 : align === 'left' ? 0 : 0.5, 0.5);
        const label = n.addComponent(Label);
        label.string = '';
        label.fontSize = size;
        label.lineHeight = size + 6;
        label.isBold = name === 'Title';
        label.color = color;
        label.enableOutline = true;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 2;
        label.horizontalAlign = align === 'right'
            ? Label.HorizontalAlign.RIGHT
            : align === 'left' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.CENTER;
        // 限定宽度 + SHRUNK：超长文本自动缩字/换行，避免溢出浮窗边框
        if (boxW) {
            label.overflow = Label.Overflow.SHRUNK;
            ut.setContentSize(boxW, boxH ?? size + 6);
        }
        return label;
    }

    show(icon: AbilityIcon): void {
        const info = icon.hero.abilityInfo(icon.slot);
        if (!info) {
            return;
        }
        if (icon.slot === 'basic') {
            this._showBasic(icon.hero);
            return;
        }
        const def = info.def;
        const isUlt = icon.slot === 'ultimate';
        this._title.string = info.unlocked
            ? `${icon.hero.def.name} · ${isUlt ? '大招' : '技能'}【${def.name}】Lv.${info.level}`
            : `${icon.hero.def.name} · 未解锁【${def.name}】`;

        const suffix = def.kind === 'beam' ? '/秒' : '';
        const rows: Array<[string, string]> = [['伤害', `${info.damage}${suffix}`]];
        if (def.kind === 'beam' && def.duration) {
            rows.push(['持续', `${def.duration.toFixed(1)}秒`]);
        }
        rows.push(['冷却', def.cooldown > 0 ? `${def.cooldown.toFixed(1)}秒` : '常驻']);
        if (def.kind === 'projectile') {
            rows.push(['弹数', String(def.projectileCount ?? 1)]);
            rows.push(['穿透', def.pierce ? '是' : '否']);
        } else if (def.kind === 'multi') {
            rows.push(['目标数', String(def.maxTargets ?? 1)]);
        } else if (def.kind === 'area') {
            rows.push(['爆炸范围', `${def.areaRadius ?? 200}`]);
        }
        rows.push(['射程', `${def.range}`]);
        this._fillRows(rows);
        if (!info.unlocked) {
            this._hint.string = `选择三选一中的「解锁·${def.name}」卡解锁`;
        } else if (info.level < ABILITY_MAX_LEVEL) {
            this._hint.string = `下一级：伤害 +30%（Lv.${info.level}→${info.level + 1}）`;
        } else {
            this._hint.string = '已达最高等级';
        }
        this.node.active = true;
    }

    /** 普攻浮窗：数值实时读英雄属性（吃攻击/射频/射程卡） */
    private _showBasic(hero: Hero): void {
        this._title.string = `${hero.def.name} · 普通攻击`;
        const isLaser = hero.def.weapon === 'laser';
        const rows: Array<[string, string]> = [
            ['伤害', `${Math.round(hero.atk)}${isLaser ? '/秒' : ''}`],
            [isLaser ? '持续' : '射速', isLaser ? '常驻' : `${(1 / hero.interval).toFixed(1)}/秒`],
            ['射程', `${Math.round(hero.range)}`],
        ];
        if (hero.def.pierce) {
            rows.push(['穿透', '是']);
        }
        this._fillRows(rows);
        this._hint.string = '选择该英雄的攻击/射频/射程强化卡可提升数值';
        this.node.active = true;
    }

    private _fillRows(rows: Array<[string, string]>): void {
        for (let i = 0; i < TIP_MAX_ROWS; i++) {
            const row = rows[i];
            this._keys[i].node.active = !!row;
            this._values[i].node.active = !!row;
            if (row) {
                this._keys[i].string = row[0];
                this._values[i].string = row[1];
            }
        }
    }

    hide(): void {
        this.node.active = false;
        this.boundTo = null;
    }
}

@ccclass('AbilityBar')
export class AbilityBar extends Component {
    private _icons: AbilityIcon[] = [];
    private _tip: TipView = null!;
    private _rangeG: Graphics = null!;
    private _press: { icon: AbilityIcon; elapsed: number; fired: boolean } | null = null;
    private _rangeIcon: AbilityIcon | null = null;

    onLoad(): void {
        // 范围圈层在图标之下（本组件节点整体位于场景最上层）
        const rangeNode = createUINode('RangeLayer');
        this.node.addChild(rangeNode);
        this._rangeG = rangeNode.addComponent(Graphics);

        this._tip = new TipView(this.node);
    }

    /** 重开/首次部署后重建图标（英雄组件会被整体重建） */
    rebind(heroes: Hero[]): void {
        for (const icon of this._icons) {
            icon.node.destroy();
        }
        this._icons.length = 0;
        this._tip.hide();
        this._clearRange();
        this._press = null;
        heroes.forEach((hero, index) => {
            if (index >= 4) {
                return;
            }
            for (const slot of SLOT_ORDER) {
                this._icons.push(new AbilityIcon(this, hero, slot, index));
            }
        });
    }

    update(dt: number): void {
        for (const icon of this._icons) {
            icon.refresh();
        }
        // 长按计时：超过阈值显示范围圈
        if (this._press && !this._press.fired) {
            this._press.elapsed += dt;
            if (this._press.elapsed >= LONG_PRESS_TIME) {
                this._press.fired = true;
                this._rangeIcon = this._press.icon;
                this._tip.hide();
            }
        }
        if (this._rangeIcon) {
            this._drawRange(this._rangeIcon);
        }
    }

    // ---- 图标触摸回调（AbilityIcon 转发） ----

    onPressStart(icon: AbilityIcon): void {
        this._press = { icon, elapsed: 0, fired: false };
    }

    onPressEnd(icon: AbilityIcon): void {
        if (this._press && this._press.icon === icon && !this._press.fired) {
            // 短按：切换数值浮窗
            if (this._tip.node.active && this._tip.boundTo === icon) {
                this._tip.hide();
            } else {
                this._tip.show(icon);
                this._placeTip(icon);
                this._tip.boundTo = icon;
            }
        }
        if (this._press && this._press.fired) {
            this._clearRange();
        }
        this._press = null;
    }

    onPressCancel(icon: AbilityIcon): void {
        if (this._press && this._press.fired) {
            this._clearRange();
        }
        this._press = null;
    }

    private _placeTip(icon: AbilityIcon): void {
        const left = icon.node.position.x < 0;
        this._tip.node.setPosition(left ? -COL_X + TIP_W / 2 + 48 : COL_X - TIP_W / 2 - 48, icon.node.position.y - 60);
    }

    private _drawRange(icon: AbilityIcon): void {
        const info = icon.hero.abilityInfo(icon.slot);
        if (!info) {
            return;
        }
        const def = info.def;
        const p = icon.hero.node.position;
        const g = this._rangeG;
        g.clear();
        g.fillColor = COLOR_RANGE_FILL;
        g.circle(p.x, p.y, def.range);
        g.fill();
        g.strokeColor = COLOR_RANGE;
        g.lineWidth = 3;
        g.circle(p.x, p.y, def.range);
        g.stroke();
        if (def.kind === 'area' && def.areaRadius) {
            // area 大招：叠加爆炸半径示意圈
            g.strokeColor = COLOR_RANGE_AREA;
            g.lineWidth = 4;
            g.circle(p.x, p.y, def.areaRadius);
            g.stroke();
        }
    }

    private _clearRange(): void {
        this._rangeIcon = null;
        this._rangeG.clear();
    }
}
