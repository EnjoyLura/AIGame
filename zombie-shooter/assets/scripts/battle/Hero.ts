import { _decorator, Component, Graphics, Node, Sprite, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { Palette } from '../config/GameConfig';
import { HeroDef } from './HeroDef';
import { AssetLib } from '../core/AssetLib';
import { BattleManager } from './BattleManager';
import { createUINode } from '../core/createUINode';
import { HeroCombatController } from './HeroCombat';

export type HeroUpgradeId = 'atk' | 'rate' | 'range' | 'skill' | 'ultimate'
    | 'multishot' | 'volley' | 'pierce' | 'boom' | 'split'
    | 'splitMore' | 'splitDmg' | 'boomRange' | 'boomDmg' | 'secBoom';

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
    /** 激光帧末直锁标记：本帧跳过插值直接对准目标 */
    private _snapAim = false;
    private _recoil = 0;

    /** 基础攻击（局外强化的乘区基准，beginRun 时按 meta 乘区重算 atk） */
    atkBase = 0;
    /** 武器核心暴击加成（绝对值；部署时由 HeroSystem 写入，applyDamage 叠加基础暴击率） */
    critBonus = 0;

    init(def: HeroDef): void {
        this.def = def;
        this.atkBase = def.atk;
        this.atk = def.atk;
        this.interval = def.interval || 1;
        this.range = def.range * BattleManager.instance.uiScale;
        this._combat?.reset();
        this._combat = new HeroCombatController(def, this, this.node);
        this._drawPlaceholder();
        this._aimLean = 0;
        this._aimTarget = 0;
        this._snapAim = false;
        this.node.angle = 0;
    }

    /** 射击/施法时由战斗控制器回调：身体朝向目标方向倾斜；snap=true 瞬间转向（激光每帧调用，跟随目标） */
    notifyShot(targetPos: Vec3, snap = false): void {
        const p = this.node.position;
        const dx = targetPos.x - p.x;
        const dy = Math.max(60 * BattleManager.instance.uiScale, targetPos.y - p.y);
        // 侧向偏移比例 → 倾斜角：目标在左（dx<0）身体向左倾（正角度=逆时针）
        this._aimTarget = Math.max(-60, Math.min(60, -(dx / dy) * 60));
        if (snap) {
            // 激光：标记本帧末直接锁角（在 _updateAimPose 里应用，覆盖插值）
            this._snapAim = true;
        }
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
        } else if (upgradeId === 'multishot') {
            this._combat.levelUpMultishot();
        } else if (upgradeId === 'volley') {
            this._combat.levelUpVolley();
        } else if (upgradeId === 'pierce') {
            this._combat.levelUpPierce();
        } else if (upgradeId === 'boom') {
            this._combat.levelUpBoom();
        } else if (upgradeId === 'split') {
            this._combat.levelUpSplit();
        } else if (upgradeId === 'splitMore') {
            this._combat.levelUpSplitMore();
        } else if (upgradeId === 'splitDmg') {
            this._combat.levelUpSplitDmg();
        } else if (upgradeId === 'boomRange') {
            this._combat.levelUpBoomRange();
        } else if (upgradeId === 'boomDmg') {
            this._combat.levelUpBoomDmg();
        } else if (upgradeId === 'secBoom') {
            this._combat.levelUpSecBoom();
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

    /** 技能/大招等级、普攻增益层数（升级卡用它区分解锁卡/升级卡、过滤满级卡） */
    upgradeLevel(upgradeId: HeroUpgradeId): number {
        if (upgradeId === 'skill') {
            return this._combat.skillLevel;
        }
        if (upgradeId === 'ultimate') {
            return this._combat.ultimateLevel;
        }
        if (upgradeId === 'multishot') {
            return this._combat.multishotStacks;
        }
        if (upgradeId === 'volley') {
            return this._combat.volleyStacks;
        }
        if (upgradeId === 'pierce') {
            return this._combat.pierceStacks;
        }
        if (upgradeId === 'boom') {
            return this._combat.boomStacks;
        }
        if (upgradeId === 'split') {
            return this._combat.splitStacks;
        }
        if (upgradeId === 'splitMore') {
            return this._combat.splitMoreStacks;
        }
        if (upgradeId === 'splitDmg') {
            return this._combat.splitDmgStacks;
        }
        if (upgradeId === 'boomRange') {
            return this._combat.boomRangeStacks;
        }
        if (upgradeId === 'boomDmg') {
            return this._combat.boomDmgStacks;
        }
        if (upgradeId === 'secBoom') {
            return this._combat.secBoomStacks;
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

    /** 手动点按大招：充满即可立即释放（跳过 1 秒自动延迟）；返回是否成功起手 */
    tryManualUltimate(): boolean {
        return this._combat ? this._combat.tryManualUltimate() : false;
    }

    /** 应用局外攻击强化（每局开始时调用一次，幂等：基于 atkBase 重算） */
    applyMetaAtk(mul: number): void {
        this.atk = Math.round(this.atkBase * mul);
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

    /** 瞄准倾斜平滑跟随：射击方向改变时身体平滑转向，停止射击后缓慢回正 */
    private _updateAimPose(dt: number): void {
        // 快速插值朝向目标；不回正——保持朝向最后攻击的目标
        this._aimLean += (this._aimTarget - this._aimLean) * Math.min(1, dt * 25);
        this.node.angle = this._aimLean;
        // 激光每帧 notifyShot(snap)：身体即时锁死目标角度（照抄 code(3).html rotate(aim)），不做插值
        if (this._snapAim) {
            this._aimLean = this._aimTarget;
            this.node.angle = this._aimLean;
            this._snapAim = false;
        }
        this._recoil = Math.max(0, this._recoil - dt * 5);
        const kick = this._recoil * 12 * (BattleManager.instance ? BattleManager.instance.uiScale : 1);
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
