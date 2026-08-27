import { _decorator, Component, Graphics } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Palette } from '../config/GameConfig';
import { BattleManager } from './BattleManager';

/**
 * 经验晶体：怪物死亡掉落，短暂滞留后自动飞向载具（自动拾取），
 * 触达后由 BattleManager 累加经验并触发升级判定。
 */
@ccclass('XpGem')
export class XpGem extends Component {
    private _delay = 0;
    private _speed = 0;

    onLoad(): void {
        const g = this.node.addComponent(Graphics);
        g.fillColor = Palette.xpGem;
        // 菱形晶体
        g.moveTo(0, 12);
        g.lineTo(8, 0);
        g.lineTo(0, -12);
        g.lineTo(-8, 0);
        g.close();
        g.fill();
    }

    init(): void {
        this._delay = BattleConfig.XP_GEM_COLLECT_DELAY;
        this._speed = 140;
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        if (this._delay > 0) {
            this._delay -= dt;
            return;
        }
        // 加速飞向载具（自动拾取）
        const target = bm.vehiclePos;
        const p = this.node.position;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this._speed = Math.min(this._speed + 1100 * dt, 1500);
        if (dist <= Math.max(40, this._speed * dt)) {
            bm.collectXp(this);
            return;
        }
        this.node.setPosition(p.x + (dx / dist) * this._speed * dt, p.y + (dy / dist) * this._speed * dt);
    }
}
