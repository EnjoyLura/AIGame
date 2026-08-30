import { _decorator, Component, Graphics, Node, Sprite, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { Palette } from '../config/GameConfig';
import { HeroDef } from './HeroDef';
import { AssetLib } from '../core/AssetLib';
import { BattleManager } from './BattleManager';
import { createUINode } from '../core/createUINode';
import { HeroCombatController } from './HeroCombat';

export type HeroUpgradeId = 'atk' | 'rate' | 'range' | 'skill' | 'ultimate';

@ccclass('Hero')
export class Hero extends Component {
    def: HeroDef = null!;
    atk = 0;
    interval = 1;
    range = 800;
    private _combat: HeroCombatController = null!;
    /** 立绘子节点（AssetLib 就绪后替换代码占位，缺图回退） */
    private _artNode: Node = null!;
    private _artApplied = false;
    /** 瞄准倾斜（跟随射击方向）与后坐状态 */
    private _aimLean = 0;
    private _aimTarget = 0;
    private _recoil = 0;

    init(def: HeroDef): void {
        this.def = def;
        this.atk = def.atk;
        this.interval = def.interval || 1;
        this.range = def.range * BattleManager.instance.uiScale;
        this._combat?.reset();
        this._combat = new HeroCombatController(def, this, this.node);
        this._drawPlaceholder();
        this._aimLean = 0;
        this._aimTarget = 0;
        this.node.angle = 0;
    }

    /** 射击/施法时由战斗控制器回调：身体朝向目标方向倾斜（代码手段的瞄准表现） */
    notifyShot(targetPos: Vec3): void {
        const p = this.node.position;
        const dx = targetPos.x - p.x;
        const dy = Math.max(60 * BattleManager.instance.uiScale, targetPos.y - p.y);
        // 侧向偏移比例 → 倾斜角（背视立绘朝上，只做 ±35° 内的倾斜提示）
        this._aimTarget = Math.max(-35, Math.min(35, (dx / dy) * 45));
        this._recoil = 1;
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
        // 立绘就绪即替换占位（AssetLib 异步加载，逐帧探测直到成功）
        if (!this._artApplied) {
            const frame = AssetLib.frame(`characters/hero_${this.def.id}`);
            if (frame) {
                this._artApplied = true;
                const sp = this._artNode.getComponent(Sprite) ?? this._artNode.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
                sp.spriteFrame = frame;
                const s = bm ? bm.uiScale : 1;
                const h = 180 * s;
                this._artNode.getComponent(UITransform)!.setContentSize(frame.width / frame.height * h, h);
                for (const g of this.node.getComponents(Graphics)) {
                    g.clear();
                }
            }
        }
        if (!bm || bm.isPaused || bm.isGameOver) {
            this._combat?.clearBeam();
            return;
        }
        this._combat.update(dt * bm.timeScale);
        this._updateAimPose(dt);
    }

    /** 瞄准倾斜平滑跟随 + 无射击时缓慢回正 */
    private _updateAimPose(dt: number): void {
        this._aimLean += (this._aimTarget - this._aimLean) * Math.min(1, dt * 10);
        this._aimTarget += -this._aimTarget * Math.min(1, dt * 1.5);
        this.node.angle = this._aimLean;
        this._recoil = Math.max(0, this._recoil - dt * 6);
        const kick = this._recoil * 5 * (BattleManager.instance ? BattleManager.instance.uiScale : 1);
        this.node.setPosition(this.node.position.x, this.node.position.y);
        this._artNode.setPosition(0, -kick);
    }

    private _drawPlaceholder(): void {
        if (!this._artNode) {
            this._artNode = createUINode('Art');
            this.node.addChild(this._artNode);
            this._artNode.addComponent(UITransform);
            this._artNode.setPosition(0, 0);
        }
        this._artNode.active = !this._artApplied;
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
