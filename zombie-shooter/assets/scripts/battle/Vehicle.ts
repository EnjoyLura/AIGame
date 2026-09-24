import { _decorator, Component, Graphics, Node, Sprite, UITransform, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { AssetLib } from '../core/AssetLib';
import { createUINode } from '../core/createUINode';
import { BattleManager } from './BattleManager';

/**
 * 据点（防线视角）：只露出横贯屏幕底部的防守条，像《王国保卫战》那样
 * 防线占满宽度、英雄站在城墙上；耐久归零 = 据点陷落。
 * 正式版按章节切换据点/城门/要塞的防线资源。
 */
@ccclass('Vehicle')
export class Vehicle extends Component {
    maxHp: number = BattleConfig.VEHICLE_MAX_HP;
    hp: number = BattleConfig.VEHICLE_MAX_HP;
    /** UI/世界缩放系数（部署时由 BattleManager 注入） */
    uiScale = 1;
    private _artTried = false;
    /** 防线立绘的 Sprite 与当前受损态：换态只换 spriteFrame，尺寸算法一行不动 */
    private _artSprite: Sprite | null = null;
    private _damaged = false;

    onLoad(): void {
        this._drawPlaceholder();
    }

    /** 美术就绪即替换占位（AssetLib 异步，逐帧探测直到成功） */
    update(): void {
        if (this._artTried) {
            this._syncDamageArt();
            return;
        }
        const frame = AssetLib.frame('scenes/vehicle_tail');
        if (!frame) {
            return;
        }
        this._artTried = true;
        const s = this.uiScale;
        const art = createUINode('TailArt');
        this.node.addChild(art);
        art.setSiblingIndex(0);
        const w = view.getVisibleSize().width + 12 * s;
        const h = w * (frame.height / frame.width);
        art.addComponent(UITransform).setContentSize(w, h);
        const sp = art.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        sp.spriteFrame = frame;
        this._artSprite = sp;
        for (const g of this.node.getComponents(Graphics)) {
            g.clear();
        }
    }

    /**
     * 耐久进 danger 档就换上受损防线：门槛 0.25 与 HUD 据点条 `.danger` 同一个数，
     * 让「条变红」和「城被打烂」是同一件事，而不是两套各变各的。缺图就下一帧再试。
     */
    private _syncDamageArt(): void {
        if (!this._artSprite) {
            return;
        }
        const want = this.hp <= this.maxHp * 0.25;
        if (want === this._damaged) {
            return;
        }
        const frame = AssetLib.frame(want ? 'scenes/vehicle_tail_damaged' : 'scenes/vehicle_tail');
        if (!frame) {
            return;
        }
        this._damaged = want;
        this._artSprite.spriteFrame = frame;
    }

    resetState(): void {
        // 局外装甲强化在 beginRun 时再叠加；重置先回基础值（幂等基准）
        this.maxHp = BattleConfig.VEHICLE_MAX_HP;
        this.hp = this.maxHp;
        eventCenter.emit(GameEvent.VEHICLE_HP_CHANGED, this.hp, this.maxHp);
    }

    /** 应用局外装甲强化（每局开始时调用一次，幂等：基于基础耐久重算并回满） */
    applyMetaHp(mul: number): void {
        this.maxHp = Math.round(BattleConfig.VEHICLE_MAX_HP * mul);
        this.hp = this.maxHp;
        eventCenter.emit(GameEvent.VEHICLE_HP_CHANGED, this.hp, this.maxHp);
    }

    takeDamage(dmg: number): void {
        if (BattleManager.instance.isGameOver) {
            return;
        }
        this.hp = Math.max(0, this.hp - dmg);
        eventCenter.emit(GameEvent.VEHICLE_HP_CHANGED, this.hp, this.maxHp);
        if (this.hp <= 0) {
            BattleManager.instance.gameOver();
        }
    }

    /** 回复耐久（天赋「自修复层」调用；只在损失耐久时才有意义，满了直接跳过不发事件） */
    heal(amount: number): void {
        if (amount <= 0 || this.hp >= this.maxHp || BattleManager.instance.isGameOver) {
            return;
        }
        this.hp = Math.min(this.maxHp, this.hp + amount);
        eventCenter.emit(GameEvent.VEHICLE_HP_CHANGED, this.hp, this.maxHp);
    }

    /** 占位绘制：占满宽度的防线城墙 + 护栏 + 警示条纹（正式版替换为据点立绘） */
    private _drawPlaceholder(): void {
        const g = this.node.addComponent(Graphics);
        const w = Design.WIDTH + 8;
        const h = BattleConfig.VEHICLE_STRIP_HEIGHT;

        // 城墙体
        g.fillColor = Palette.heroDark;
        g.rect(-w / 2, -h / 2, w, h);
        g.fill();
        // 顶缘护栏（防守线上沿）
        g.strokeColor = Palette.hero;
        g.lineWidth = 8;
        g.moveTo(-w / 2, h / 2 - 4);
        g.lineTo(w / 2, h / 2 - 4);
        g.stroke();
        // 警示条纹
        g.fillColor = Palette.vehicleBarFill;
        for (let x = -w / 2; x < w / 2; x += 80) {
            g.rect(x, h / 2 - 26, 40, 10);
        }
        g.fill();
        // 城门铆钉
        g.fillColor = Palette.bg;
        for (let x = -w / 2 + 30; x < w / 2; x += 120) {
            g.circle(x, -h / 2 + 30, 6);
        }
        g.fill();
    }
}
