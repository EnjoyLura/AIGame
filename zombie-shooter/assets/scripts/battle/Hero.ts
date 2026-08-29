import { _decorator, Component, Graphics } from 'cc';
const { ccclass } = _decorator;
import { Palette } from '../config/GameConfig';
import { HeroDef } from './HeroDef';
import { HeroCombatController } from './HeroCombat';

export type HeroUpgradeId = 'atk' | 'rate' | 'range' | 'skill' | 'ultimate';

@ccclass('Hero')
export class Hero extends Component {
    def: HeroDef = null!;
    atk = 0;
    interval = 1;
    range = 800;
    private _combat: HeroCombatController = null!;

    init(def: HeroDef): void {
        this.def = def;
        this.atk = def.atk;
        this.interval = def.interval || 1;
        this.range = def.range;
        this._combat?.reset();
        this._combat = new HeroCombatController(def, this, this.node);
        this._drawPlaceholder();
    }

    applyUpgrade(upgradeId: HeroUpgradeId): void {
        if (upgradeId === 'atk') {
            this.atk = Math.round(this.atk * 1.25);
        } else if (upgradeId === 'rate') {
            if (this.def.weapon === 'laser') {
                this.atk = Math.round(this.atk * 1.15);
            } else {
                this.interval = Math.max(0.15, this.interval * 0.85);
            }
        } else if (upgradeId === 'range') {
            this.range = Math.min(1400, Math.round(this.range * 1.2));
        } else if (upgradeId === 'skill') {
            this._combat.levelUpSkill();
        } else {
            this._combat.levelUpUltimate();
        }
    }

    hasUpgrade(upgradeId: HeroUpgradeId): boolean {
        if (upgradeId === 'skill') {
            return this._combat.skillUnlocked;
        }
        if (upgradeId === 'ultimate') {
            return this._combat.ultimateUnlocked;
        }
        return false;
    }

    /** 技能/大招当前等级（普攻三维恒为 0；升级卡用它区分解锁卡/升级卡、过滤满级卡） */
    upgradeLevel(upgradeId: HeroUpgradeId): number {
        if (upgradeId === 'skill') {
            return this._combat.skillLevel;
        }
        if (upgradeId === 'ultimate') {
            return this._combat.ultimateLevel;
        }
        return 0;
    }

    /** 普攻/技能/大招运行时信息（技能图标 HUD 与数值浮窗用） */
    abilityInfo(upgradeId: 'skill' | 'ultimate' | 'basic') {
        return this._combat ? this._combat.abilityInfo(upgradeId) : null;
    }

    /** GM：清空技能/大招冷却 */
    gmResetCooldowns(): void {
        this._combat?.resetCooldowns();
    }

    /** 击杀充能：本英雄大招 +n（未解锁不生效） */
    gainUltimateCharge(n: number = 1): void {
        this._combat?.gainCharge(n);
    }

    /** GM：开关本英雄「技能无冷却」；开启时技能未解锁则顺手解锁 */
    gmSetNoSkillCooldown(on: boolean): void {
        if (!this._combat) {
            return;
        }
        this._combat.gmNoSkillCooldown = on;
        if (on && !this.hasUpgrade('skill')) {
            this.applyUpgrade('skill');
        }
    }

    /** GM：开关本英雄「无限大招」；开启时大招未解锁则顺手解锁 */
    gmSetInfUltimate(on: boolean): void {
        if (!this._combat) {
            return;
        }
        this._combat.gmInfUltimate = on;
        if (on && !this.hasUpgrade('ultimate')) {
            this.applyUpgrade('ultimate');
        }
    }

    update(dt: number): void {
        const bm = this._combat?.battle;
        if (!bm || bm.isPaused || bm.isGameOver) {
            this._combat?.clearBeam();
            return;
        }
        this._combat.update(dt * bm.timeScale);
    }

    private _drawPlaceholder(): void {
        const own = this.node.getComponents(Graphics);
        for (const g of own) {
            g.clear();
        }
        const g = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
        g.fillColor = Palette.heroDark;
        g.roundRect(-42, -46, 84, 12, 6);
        g.fill();
        g.fillColor = this.def.color;
        g.circle(0, 0, 30);
        g.fill();
        g.fillColor = Palette.heroDark;
        g.roundRect(-5, 20, 10, 46, 4);
        g.fill();
    }
}
