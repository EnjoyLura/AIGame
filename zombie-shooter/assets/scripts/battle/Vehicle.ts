import { _decorator, Component, Graphics, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { BattleManager } from './BattleManager';

/**
 * 运输载具（车尾视角）：只露出横贯屏幕底部的车尾条，像《向僵尸开炮》那样
 * 车尾占满宽度、英雄站在车尾上；耐久归零 = 护送失败。
 * 正式版按章节切换货车/船/飞机的尾部资源。
 */
@ccclass('Vehicle')
export class Vehicle extends Component {
    maxHp = BattleConfig.VEHICLE_MAX_HP;
    hp = BattleConfig.VEHICLE_MAX_HP;
    /** UI/世界缩放系数（部署时由 BattleManager 注入） */
    uiScale = 1;

    onLoad(): void {
        this._drawPlaceholder();
    }

    resetState(): void {
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

    /** 占位绘制：占满宽度的车尾货厢 + 护栏 + 警示条纹（正式版替换为 Spine 载具尾部） */
    private _drawPlaceholder(): void {
        const g = this.node.addComponent(Graphics);
        const s = this.uiScale;
        const w = view.getVisibleSize().width + 12 * s;
        const h = BattleConfig.VEHICLE_STRIP_HEIGHT * s;

        // 货厢
        g.fillColor = Palette.heroDark;
        g.rect(-w / 2, -h / 2, w, h);
        g.fill();
        // 顶缘护栏
        g.strokeColor = Palette.hero;
        g.lineWidth = 12 * s;
        g.moveTo(-w / 2, h / 2 - 6 * s);
        g.lineTo(w / 2, h / 2 - 6 * s);
        g.stroke();
        // 警示条纹
        g.fillColor = Palette.vehicleBarFill;
        for (let x = -w / 2; x < w / 2; x += 120 * s) {
            g.rect(x, h / 2 - 39 * s, 60 * s, 15 * s);
        }
        g.fill();
        // 尾门铆钉
        g.fillColor = Palette.bg;
        for (let x = -w / 2 + 45 * s; x < w / 2; x += 180 * s) {
            g.circle(x, -h / 2 + 45 * s, 9 * s);
        }
        g.fill();
    }
}
