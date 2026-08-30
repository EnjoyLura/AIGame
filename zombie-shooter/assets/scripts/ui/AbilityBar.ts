import { _decorator, Color, Component, Graphics, Label, Node, Sprite, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { ABILITY_MAX_LEVEL, AbilityDef } from '../battle/HeroDef';
import { Hero } from '../battle/Hero';
import { BattleManager } from '../battle/BattleManager';
import { AssetLib } from '../core/AssetLib';
import { createUINode } from '../core/createUINode';

/**
 * 英雄技能/大招图标栏（参考《向僵尸开炮》）：
 * 1、2 号位英雄图标靠屏幕左列、3、4 号位靠右列，从上到下按号位排列，每英雄技能在上、大招在下。
 * 技能图标=冷却剩余秒数（冷却中变暗）；大招图标=外环充能进度；右下角数字=三选一强化的当前等级，
 * 未解锁显示灰底锁形。点按图标弹出数值浮窗，长按 0.45 秒显示该能力的战场范围圈。
 * 全部代码动态绘制（占位阶段无图标贴图，正式版替换为圆形图标帧）。
 */

const ICON_R = 48;
const COL_X = 471;
/** 每侧 6 行：每英雄占 3 行（普攻/技能/大招），两英雄共 6 行从上到下（避开顶部 HUD） */
const ROW_YS = [600, 492, 384, 276, 168, 60];
const LONG_PRESS_TIME = 0.45;
const TIP_W = 450;
const TIP_MAX_ROWS = 6;

const COLOR_SKILL_BG = new Color(31, 58, 95, 235);
const COLOR_SKILL_EDGE = new Color(79, 195, 247, 255);
const COLOR_ULT_BG = new Color(95, 58, 31, 235);
const COLOR_ULT_EDGE = new Color(255, 171, 64, 255);
const COLOR_BASIC_BG = new Color(58, 72, 88, 235);
const COLOR_BASIC_EDGE = new Color(176, 190, 197, 255);
const COLOR_LOCK_BG = new Color(55, 71, 79, 210);
const COLOR_LOCK_EDGE = new Color(120, 144, 156, 210);
const COLOR_CHARGE_WATER = new Color(255, 171, 64, 110);
const COLOR_CHARGE_WATER_LINE = new Color(255, 224, 160, 200);
const COLOR_COOLDOWN_MASK = new Color(10, 16, 22, 150);
/** 每英雄元素主题：大招充能填充色 + 就绪元素特效色（原神式） */
const HERO_ELEMENT: Record<string, { fill: Color; fx: Color }> = {
    rifle: { fill: new Color(255, 160, 60, 165), fx: new Color(255, 170, 70, 255) },      // 火
    sniper: { fill: new Color(178, 132, 255, 165), fx: new Color(205, 165, 255, 255) },   // 雷
    laser: { fill: new Color(90, 200, 255, 165), fx: new Color(120, 220, 255, 255) },     // 水
    radiation: { fill: new Color(140, 220, 90, 165), fx: new Color(150, 230, 100, 255) }, // 毒
};
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
    /** 大招击杀充能（仅 ultimate） */
    charge?: number;
    chargeMax?: number;
    /** 施法剩余时间（仅 beam 类技能持续期间） */
    durationLeft?: number;
    durationTotal?: number;
}

/** 单个能力图标：底圆/锁形 + 名字首字 + 等级角标 + 技能冷却秒数/大招储水充能 */
class AbilityIcon {
    readonly node: Node;
    private _bar: AbilityBar;
    private _hero: Hero;
    private _slot: SlotId;
    private _baseG: Graphics = null!;
    /** 能力内芯图标层（AssetLib 就绪后替换名字首字，缺图回退） */
    private _artNode: Node = null!;
    private _iconApplied = false;
    /** 冷却扇形遮罩层（仅在冷却刻度变化时重画，不逐帧重画） */
    private _maskG: Graphics = null!;
    /** 大招充能填充层（元素色从底部往上灌，原神式；仅在充能刻度变化时重画） */
    private _fillG: Graphics = null!;
    /** 就绪元素特效层（小粒子环绕，静态绘制一次+补间脉动，零重画） */
    private _fxG: Graphics = null!;
    private _fxNode: Node = null!;
    private _fxOpacity: UIOpacity = null!;
    /** 大招就绪呼吸光效层（静态绘制一次，脉动用节点缩放/透明度补间，零重画） */
    private _glowG: Graphics = null!;
    private _glowNode: Node = null!;
    private _glowOpacity: UIOpacity = null!;
    private _nameLabel: Label = null!;
    private _lvLabel: Label = null!;
    private _opacity: UIOpacity = null!;
    private _lastUnlocked: boolean | null = null;
    private _lastLevel = -1;
    private _lastFull: boolean | null = null;
    private _wasCooling = false;
    private _wasFull = false;
    private _lastMaskStep = -1;
    private _lastFillStep = -1;

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

        // 呼吸光效层放最底（只画图标外圈，不影响图标本体）
        const glowNode = createUINode('Glow');
        this.node.addChild(glowNode);
        this._glowG = glowNode.addComponent(Graphics);
        this._glowNode = glowNode;
        this._glowOpacity = glowNode.addComponent(UIOpacity);

        const fxNode = createUINode('ReadyFx');
        this.node.addChild(fxNode);
        this._fxG = fxNode.addComponent(Graphics);
        this._fxNode = fxNode;
        this._fxOpacity = fxNode.addComponent(UIOpacity);

        const bgNode = createUINode('Base');
        this.node.addChild(bgNode);
        this._baseG = bgNode.addComponent(Graphics);

        const artNode = createUINode('Art');
        this.node.addChild(artNode);
        artNode.addComponent(UITransform).setContentSize(ICON_R * 1.7, ICON_R * 1.7);
        artNode.active = false;
        this._artNode = artNode;


        const maskNode = createUINode('Mask');
        this.node.addChild(maskNode);
        this._maskG = maskNode.addComponent(Graphics);

        const fillNode = createUINode('Fill');
        this.node.addChild(fillNode);
        this._fillG = fillNode.addComponent(Graphics);

        const castNode = createUINode('CastRing');
        this.node.addChild(castNode);
        this._castG = castNode.addComponent(Graphics);

        this._nameLabel = this._makeLabel('Name', 0, 0, 45);
        this._cdLabel = this._makeLabel('Cd', 0, 0, 26);
        // 等级角标：右下角大号白字黑描边（参考《向僵尸开炮》样式）
        this._lvLabel = this._makeLabel('Lv', ICON_R - 9, -ICON_R + 15, 36);

        this.node.on(Node.EventType.TOUCH_START, () => this._bar.onPressStart(this), this);
        this.node.on(Node.EventType.TOUCH_END, () => this._bar.onPressEnd(this), this);
        this.node.on(Node.EventType.TOUCH_CANCEL, () => this._bar.onPressCancel(this), this);

        this.refresh(0);
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
        label.lineHeight = size + 6;
        label.isBold = true;
        label.color = Color.WHITE;
        return label;
    }

    /** 每帧刷新：等级/解锁/充能状态变化重画底，冷却遮罩与光效按需更新 */
    refresh(): void {
        const info = this._hero.abilityInfo(this._slot);
        if (!info) {
            return;
        }
        // 未解锁的技能/大招不显示图标（普攻常显）；隐藏后跳过全部绘制工作
        if (this._slot !== 'basic' && !info.unlocked) {
            this.node.active = false;
            return;
        }
        this.node.active = true;

        const cooling = info.cdLeft > 0;
        const full = this._slot === 'ultimate' && (info.charge ?? 0) >= (info.chargeMax || 1);
        // 大招充能状态切换（浅色→点亮）需要重画底色
        const baseDirty = info.unlocked !== this._lastUnlocked
            || info.level !== this._lastLevel
            || (this._slot === 'ultimate' && full !== this._lastFull);
        // 内芯图标：美术就绪即应用一次（与图标框相同的就绪探测，缺图回退首字）
        if (!this._iconApplied) {
            const iconFrame = AssetLib.frame(`icons/${this._hero.def.id}_${this._slot}`);
            if (iconFrame) {
                this._iconApplied = true;
                // 纯图标填充：清掉此前绘制的代码底色圆（灰圈边缘的来源）
                this._baseG.clear();
                const sp = this._artNode.getComponent(Sprite) ?? this._artNode.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
                sp.spriteFrame = iconFrame;
                this._artNode.active = true;
            }
        }
        if (this._iconApplied) {
            // 大招充能未满：内芯降饱和 tint（浅色），充满点亮
            const sp = this._artNode.getComponent(Sprite)!;
            sp.color = this._slot === 'ultimate' && !full ? new Color(150, 138, 124, 255) : Color.WHITE;
            this._nameLabel.string = '';
        } else if (baseDirty) {
            this._lastUnlocked = info.unlocked;
            this._lastLevel = info.level;
            this._drawBase(info, this._slot === 'ultimate' && !full);
            this._lvLabel.string = this._slot !== 'basic' ? String(info.level) : '';
        }
        this._lastFull = this._slot === 'ultimate' ? full : this._lastFull;

        if (this._slot === 'basic') {
            // 普攻常亮：无冷却/充能/角标
            return;
        }
        if (this._slot === 'skill') {
            // 冷却：扇形遮罩（24 刻度）+ 0.1s 精度倒计时数字
            const step = cooling ? Math.max(1, Math.ceil((1 - info.cdLeft / info.cdTotal) * 24)) : 0;
            if (step !== this._lastMaskStep) {
                this._lastMaskStep = step;
                this._drawCooldownMask(step);
            }
            const cdText = cooling ? (Math.ceil(info.cdLeft * 10) / 10).toFixed(1) : '';
            if (cdText !== this._lastCdText) {
                this._lastCdText = cdText;
                this._cdLabel.string = cdText;
            }
            // 施法中：外圈进度环随剩余施法时间从满圆顺时针收缩
            const castFrac = info.durationTotal! > 0 && (info.durationLeft ?? 0) > 0
                ? (info.durationLeft ?? 0) / info.durationTotal! : 0;
            if (castFrac !== this._lastCastFrac) {
                this._lastCastFrac = castFrac;
                this._drawCastRing(castFrac);
            }
            if (this._wasCooling && !cooling) {
                this._punch();
            }
            this._wasCooling = cooling;
            return;
        }
        // 大招：原神式充能——元素色从图标底部往上灌（击杀充能），充满点亮并出现元素特效
        const fillStep = Math.round((info.charge ?? 0) / (info.chargeMax || 1) * 10);
        if (fillStep !== this._lastFillStep) {
            this._lastFillStep = fillStep;
            this._drawUltFill(fillStep / 10);
        }
        if (full !== this._wasFull) {
            if (full) {
                this._punch();
            }
            this._setGlow(full);
            this._setReadyFx(full);
            this._wasFull = full;
        }
    }

    /** 大招充能填充：元素色"水位"从图标底部往上灌（圆形弓形填充+水面高光） */
    private _drawUltFill(fraction: number): void {
        const g = this._fillG;
        g.clear();
        if (!Number.isFinite(fraction) || fraction <= 0.01) {
            return;
        }
        const f = Math.min(1, fraction);
        const r = ICON_R - 3;
        const el = HERO_ELEMENT[this._hero.def.id] ?? HERO_ELEMENT.laser;
        if (f >= 0.99) {
            g.fillColor = el.fill;
            g.circle(0, 0, r);
            g.fill();
            return;
        }
        // 水面高度 yc：f=0 → 底部(-r)，f=1 → 顶部(+r)
        const yc = -r + 2 * f * r;
        const a = Math.asin(Math.max(-1, Math.min(1, yc / r)));
        const x = Math.cos(a) * r;
        g.fillColor = el.fill;
        g.arc(0, 0, r, Math.PI - a, a + Math.PI * 2, false);
        g.close();
        g.fill();
        // 水面高光线
        g.strokeColor = new Color(255, 255, 255, 170);
        g.lineWidth = 2.5;
        g.moveTo(-x, yc);
        g.lineTo(x, yc);
        g.stroke();
    }

    /** 大招就绪元素特效：4 颗元素粒子环绕图标（静态绘制一次，旋转+透明度补间驱动，零重画） */
    private _setReadyFx(on: boolean): void {
        const g = this._fxG;
        g.clear();
        Tween.stopAllByTarget(this._fxNode);
        Tween.stopAllByTarget(this._fxOpacity);
        this._fxNode.angle = 0;
        this._fxNode.setScale(1, 1, 1);
        this._fxOpacity.opacity = 255;
        if (!on) {
            return;
        }
        const el = HERO_ELEMENT[this._hero.def.id] ?? HERO_ELEMENT.laser;
        const orbit = ICON_R + 11;
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const px = Math.cos(ang) * orbit;
            const py = Math.sin(ang) * orbit;
            g.fillColor = el.fx;
            g.circle(px, py, 5);
            g.fill();
            g.strokeColor = el.fx;
            g.lineWidth = 2;
            g.circle(px, py, 8);
            g.stroke();
        }
        this._fxOpacity.opacity = 210;
        tween(this._fxNode)
            .repeatForever(tween().by(2.6, { angle: -360 }))
            .start();
        tween(this._fxOpacity)
            .repeatForever(
                tween().to(0.55, { opacity: 100 }).to(0.55, { opacity: 235 }),
            )
            .start();
    }

    /** 技能施法进度环：亮色弧随剩余施法时间从满圆顺时针收缩（图标外圈） */
    private _drawCastRing(frac: number): void {
        const g = this._castG;
        g.clear();
        if (frac <= 0.005) {
            return;
        }
        const r = ICON_R + 8;
        g.lineWidth = 4;
        g.strokeColor = COLOR_SKILL_EDGE;
        g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.min(1, frac) * Math.PI * 2, false);
        g.stroke();
    }

    /** 大招充能环：底环 + 金色弧随充能从顶部顺时针填充（原神式） */
    private _drawChargeRing(frac: number): void {
        const g = this._fillG;
        g.clear();
        if (frac <= 0.005) {
            return;
        }
        const r = ICON_R + 7;
        g.lineWidth = 4;
        g.strokeColor = new Color(0, 0, 0, 90);
        g.circle(0, 0, r);
        g.stroke();
        g.lineWidth = 5;
        g.strokeColor = new Color(255, 214, 120, 235);
        g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.min(1, frac) * Math.PI * 2, false);
        g.stroke();
    }

    /** 大招就绪呼吸光效：光圈静态绘制一次，脉动由节点缩放+透明度补间驱动 */
    private _setGlow(on: boolean): void {
        const g = this._glowG;
        g.clear();
        Tween.stopAllByTarget(this._glowNode);
        Tween.stopAllByTarget(this._glowOpacity);
        this._glowNode.setScale(1, 1, 1);
        this._glowOpacity.opacity = 255;
        if (!on) {
            return;
        }
        const el = HERO_ELEMENT[this._hero.def.id] ?? HERO_ELEMENT.laser;
        g.lineWidth = 9;
        g.strokeColor = el.fx;
        g.circle(0, 0, ICON_R + 7);
        g.stroke();
        g.lineWidth = 6;
        g.strokeColor = el.fx;
        g.circle(0, 0, ICON_R + 18);
        g.stroke();
        this._glowOpacity.opacity = 190;
        tween(this._glowNode)
            .repeatForever(
                tween()
                    .to(0.38, { scale: new Vec3(1.07, 1.07, 1) })
                    .to(0.37, { scale: new Vec3(0.97, 0.97, 1) }),
            )
            .start();
        tween(this._glowOpacity)
            .repeatForever(
                tween().to(0.38, { opacity: 120 }).to(0.37, { opacity: 210 }),
            )
            .start();
    }

    /** 大招"储水"充能：半透明橙水按充能比例从底部往上灌（圆形弓形填充+水面高光） */
    private _drawUltFill(fraction: number): void {
        const g = this._fillG;
        g.clear();
        if (!Number.isFinite(fraction) || fraction <= 0.01) {
            return;
        }
        const f = Math.min(1, fraction);
        const r = ICON_R - 3;
        if (f >= 0.99) {
            g.fillColor = COLOR_CHARGE_WATER;
            g.circle(0, 0, r);
            g.fill();
            return;
        }
        // 水面高度 yc：f=0 → 底部(-r)，f=1 → 顶部(+r)
        const yc = -r + 2 * f * r;
        const a = Math.asin(Math.max(-1, Math.min(1, yc / r)));
        const x = Math.cos(a) * r;
        // 弓形：沿圆弧从左交点经过底部到右交点，闭合弦线
        g.fillColor = COLOR_CHARGE_WATER;
        g.arc(0, 0, r, Math.PI - a, a + Math.PI * 2, false);
        g.close();
        g.fill();
        // 水面高光线
        g.strokeColor = COLOR_CHARGE_WATER_LINE;
        g.lineWidth = 4;
        g.moveTo(-x, yc);
        g.lineTo(x, yc);
        g.stroke();
    }

    /** 技能冷却遮罩：按 24 刻度绘制暗色扇形（step=0 清空），只在刻度变化时调用 */
    private _drawCooldownMask(step: number): void {
        const g = this._maskG;
        g.clear();
        if (step <= 0) {
            return;
        }
        const ratio = step / 24;
        const start = -Math.PI / 2;
        // 已恢复的结束角（顺时针）；扇形盖住 recovered→顶部+整圈 的剩余部分
        const recoveredEnd = start + Math.max(0.02, ratio) * Math.PI * 2;
        g.fillColor = COLOR_COOLDOWN_MASK;
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
    private _drawBase(info: AbilityInfo, pale: boolean): void {
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
            return;
        }
        if (isUlt && pale) {
            // 大招充能未完成：浅色（去饱和）底+描边，充满后点亮
            g.fillColor = new Color(128, 118, 106, 190);
            g.strokeColor = new Color(198, 188, 172, 170);
        } else {
            g.fillColor = isUlt ? COLOR_ULT_BG : COLOR_SKILL_BG;
            g.strokeColor = isUlt ? COLOR_ULT_EDGE : COLOR_SKILL_EDGE;
        }
        g.circle(0, 0, ICON_R);
        g.fill();
        g.lineWidth = 4;
        g.stroke();
        this._nameLabel.string = info.def.name.slice(0, 1);
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
        g.roundRect(-TIP_W / 2, -195, TIP_W, 390, 15);
        g.fill();
        g.strokeColor = new Color(255, 214, 120, 255);
        g.lineWidth = 3;
        g.roundRect(-TIP_W / 2, -195, TIP_W, 390, 15);
        g.stroke();

        this._title = this._makeLabel('Title', -TIP_W / 2 + 27, 150, 36, 'left', new Color(255, 214, 120, 255), 396, 45);
        for (let i = 0; i < TIP_MAX_ROWS; i++) {
            const y = 87 - i * 45;
            this._keys.push(this._makeLabel('K' + i, -TIP_W / 2 + 27, y, 32, 'left', new Color(214, 222, 228, 255), 165, 40));
            this._values.push(this._makeLabel('V' + i, TIP_W / 2 - 27, y, 32, 'right', new Color(240, 244, 247, 255), 165, 40));
        }
        this._hint = this._makeLabel('Hint', 0, -150, 28, 'center', new Color(126, 226, 126, 255), 405, 75);
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
        if (icon.slot === 'ultimate') {
            rows.push(['充能', `击杀 ${info.charge ?? 0}/${info.chargeMax || 10}`]);
        } else {
            rows.push(['冷却', def.cooldown > 0 ? `${def.cooldown.toFixed(1)}秒` : '常驻']);
        }
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
    /** x2 倍速开关按钮（左列顶部、1 号位普攻上方） */
    private _speedNode: Node = null!;
    private _speedG: Graphics = null!;
    private _speedLabel: Label = null!;
    private _lastSpeedOn: boolean | null = null;

    onLoad(): void {
        // 范围圈层在图标之下（本组件节点整体位于场景最上层）
        const rangeNode = createUINode('RangeLayer');
        this.node.addChild(rangeNode);
        this._rangeG = rangeNode.addComponent(Graphics);

        this._tip = new TipView(this.node);
        this._buildSpeedToggle();
    }

    /** x2 倍速开关：点击在 1x/2x 间切换（开=青色高亮） */
    private _buildSpeedToggle(): void {
        const n = createUINode('SpeedToggle');
        this.node.addChild(n);
        n.addComponent(UITransform).setContentSize(84, 84);
        n.setPosition(-COL_X, ROW_YS[0] + 114);
        this._speedNode = n;
        this._speedG = n.addComponent(Graphics);
        this._speedLabel = this._makeSpeedLabel('x2');
        n.on(Node.EventType.TOUCH_END, () => {
            const bm = BattleManager.instance;
            if (bm) {
                bm.toggleSpeed();
            }
        }, this);
        this._syncSpeedButton();
    }

    private _makeSpeedLabel(text: string): Label {
        const n = createUINode('lb_speed');
        this._speedNode.addChild(n);
        n.setPosition(0, 0);
        const label = n.addComponent(Label);
        label.string = text;
        label.fontSize = 33;
        label.lineHeight = 39;
        label.isBold = true;
        label.color = Color.WHITE;
        return label;
    }

    private _syncSpeedButton(): void {
        const on = BattleManager.instance?.timeScale === 2;
        if (on === this._lastSpeedOn) {
            return;
        }
        this._lastSpeedOn = on;
        const g = this._speedG;
        g.clear();
        g.fillColor = on ? new Color(31, 96, 110, 245) : COLOR_BASIC_BG;
        g.strokeColor = on ? COLOR_SKILL_EDGE : COLOR_BASIC_EDGE;
        g.circle(0, 0, 40);
        g.fill();
        g.lineWidth = 6;
        g.stroke();
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
        this._syncSpeedButton();
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
        this._tip.node.setPosition(left ? -COL_X + TIP_W / 2 + 72 : COL_X - TIP_W / 2 - 72, icon.node.position.y - 90);
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
