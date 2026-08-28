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
