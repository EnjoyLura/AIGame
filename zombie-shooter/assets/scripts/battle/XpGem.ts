import { _decorator, Component, Graphics, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Palette } from '../config/GameConfig';
import { BattleManager } from './BattleManager';

@ccclass('XpGem')
export class XpGem extends Component {
    private _delay = 0;
    private _speed = 0;

    onLoad(): void {
        const g = this.node.addComponent(Graphics);
        g.fillColor = Palette.xpGem;
        g.moveTo(0, 12);
        g.lineTo(8, 0);
        g.lineTo(0, -12);
        g.lineTo(-8, 0);
        g.close();
        g.fill();
    }

    init(): void {
        this._delay = BattleConfig.XP_GEM_COLLECT_DELAY;
        this._speed = 210;
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        dt *= bm.timeScale;
        if (this._delay > 0) {
            this._delay -= dt;
            return;
        }
        // 吸附目标恒为车尾 (0, vehicleTopY)：直接用标量，避免每帧每宝石走 vehiclePos 的 Vec3 分配
        const p = this.node.position;
        const dx = -p.x;
        const dy = bm.vehicleTopY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this._speed = Math.min(this._speed + 1650 * dt, 2250);
        if (dist <= Math.max(60, this._speed * dt)) {
            bm.collectXp(this);
            return;
        }
        this.node.setPosition(p.x + (dx / dist) * this._speed * dt, p.y + (dy / dist) * this._speed * dt);
    }
}
