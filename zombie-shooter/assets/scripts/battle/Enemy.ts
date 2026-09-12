import { _decorator, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Palette } from '../config/GameConfig';
import { createUINode } from '../core/createUINode';
import { AssetLib } from '../core/AssetLib';
import { MonsterBehavior, MonsterInfo } from './WaveData';
import { MonsterAffixId, monsterAffix } from './MonsterAffix';
import { BattleManager } from './BattleManager';

/** 受击反馈常量（命中是高频路径，预建共享避免每次命中分配 Color） */
const HIT_TINT = new Color(255, 70, 70, 255);
const BASE_TINT = new Color(255, 255, 255, 255);

/** 已有美术立绘的怪型（key 相对 textures/；缺图的回退 Graphics 占位） */
const MONSTER_ART: Record<string, string> = {
    crawler: 'monsters/crawler',
    dog: 'monsters/dog',
    boar: 'monsters/boar',
    bear: 'monsters/bear',
    eagle: 'monsters/eagle',
};

/**
 * 变异怪物：按 WaveData 的 behavior 分派移动逻辑——
 * chaser 直线追车 / swarm 疯狗成群直线快跑 / charger 野猪贴近蓄力再冲刺 /
 * tanker 双足熊高血肉盾 / diver 疯鹰侧翼斜线俯冲。
 * 驻留啃咬（向僵尸开炮式）：到车沿后停住不走，按各自咬击间隔持续咬车（每怪独立伤害），
 * 直到被击杀；被击杀掉落经验晶体。
 * 占位形象由 Graphics 按 behavior 绘制（正式版替换为 sp.Skeleton）。
 */
@ccclass('Enemy')
export class Enemy extends Component {
    private static _nextSpawnId = 1;
    spawnId = 0;
    maxHp = 100;
    hp = 100;
    speed = 100;
    radius = 30;
    touchDamage = 10;
    /** 咬击间隔（秒）：贴车驻留后每隔该时长咬车一口；精英/BOSS 在 init 放大（咬得更疼但更慢） */
    biteGap = 1.6;
    /** 驻留啃咬中：已到车沿停住，位置钳在车沿上（车恒在 x=0，无需跟车） */
    private _biting = false;
    /** 距下次咬车的冷却（秒） */
    private _biteCd = 0;
    /** 咬击前扑脉冲剩余时长（占位视觉；有 attack 序列帧的怪型以帧动画为主） */
    private _biteFxT = 0;
    private _behavior: MonsterBehavior = 'chaser';
    /** 当前垂直下压速度（px/s，向下为正）：射击预瞄用。
     *  垂直下压/冲刺 = 实际移速；蓄力定身 = 0。所有行为最终都只有纵向位移，可线性外推。 */
    get verticalSpeed(): number {
        if (this._biting) {
            return 0;
        }
        if (this._behavior === 'charger' && this._chargeState === 'dash') {
            return this._dashSpeed;
        }
        if (this._behavior === 'charger' && this._chargeState === 'windup') {
            return 0;
        }
        return this.speed;
    }
    /** 行走动效参数（按怪型在 init 配置） */
    private _walkPhase = 0;
    private _walkFreq = 9;
    private _bobAmp = 2;
    private _isFlyer = false;
    /** charger：蓄力-冲刺状态机（蓄力期间定身，是集火窗口） */
    private _chargeState: 'advance' | 'windup' | 'dash' = 'advance';
    private _windupLeft = 0;
    private _windupTime = 0.6;
    private _dashRange = 340;
    private _dashSpeed = 430;
    private _windupPos = new Vec3();

    private _graphics: Graphics = null!;
    /** 视觉子节点：占位 Graphics 画在它本体，行走动效作用于它（不影响逻辑坐标） */
    private _bodyNode: Node = null!;
    /** 美术立绘子节点：Sprite 必须与 Graphics 分节点（同节点先后挂两个渲染组件会导致 Sprite 不渲染） */
    private _artNode: Node | null = null;
    /** 三态动作状态机：walk 循环 / attack 单次回 walk / die 单次播完回调回池 */
    private _mid = '';
    /** 图鉴打点用：本只怪的怪型 id（init 时快照） */
    get monsterId(): string { return this._mid; }
    /** 本只怪是否精英（init 时快照；图鉴精英计数用） */
    isElite = false;
    /** 层级快照：0 普通 / 1 精英 / 2 BOSS */
    private _tier: 0 | 1 | 2 = 0;
    /** 精英词缀（掷精英时由 BattleManager 附带；BOSS 恒无） */
    private _affix: MonsterAffixId | null = null;
    /** init 时的波次配置快照（分裂词缀生成小怪用） */
    private _info: MonsterInfo | null = null;
    /** 治疗词缀计时 / 狂暴与 BOSS 狂暴的一次性触发标记 */
    private _healTimer = 0;
    private _frenzied = false;
    private _enraged = false;
    /** 头顶徽标（精英=词缀 emoji，BOSS=👑），Graphics 圈与 Label 分节点防渲染冲突 */
    private _badgeNode: Node | null = null;
    /** BOSS 专用：图鉴与结算按普通击杀链走，身份只影响血条与奖励 */
    get isBoss(): boolean { return this._tier === 2; }
    /** 精英词缀 id（无词缀为 null；BattleManager 分裂/结算读取） */
    get affixId(): MonsterAffixId | null { return this._affix; }
    /** init 配置快照（分裂小怪以本怪基础配置缩比生成） */
    get spawnInfo(): MonsterInfo | null { return this._info; }
    private _dying = false;
    private _animState: 'walk' | 'attack' | 'die' = 'walk';
    private _animFrames: SpriteFrame[] | null = null;
    private _animIdx = -1;
    private _animT = 0;
    private _animDur = 0;
    private _onAnimDone: (() => void) | null = null;
    private _bodyOp: UIOpacity = null!;
    /** 准星/标记：锁定读秒（黄）与存活标记（红）共用一层，随目标移动 */
    private _reticleLeft = 0;
    private _reticleTotal = 1;
    private _reticleNode: Node | null = null;
    private _reticleG: Graphics | null = null;
    /** 脚下阴影/精英圈层（接地感的关键：大小/透明度随身体起落联动） */
    private _shadowNode: Node | null = null;

    onLoad(): void {
        // 根节点必须有 UITransform：2D 渲染靠它逐层计算子节点世界矩阵
        // （占位 Graphics 移到 Body 后根节点不再自动获得，缺失会导致子孙 Sprite 整体不渲染）
        this.node.addComponent(UITransform);
        this._bodyNode = createUINode('Body');
        this.node.addChild(this._bodyNode);
        this._graphics = this._bodyNode.addComponent(Graphics);
        this._bodyOp = this._bodyNode.addComponent(UIOpacity);
    }

    /** 从池中取出后调用：按波次配置与成长系数初始化 */
    init(info: MonsterInfo, hpScale: number): void {
        this.spawnId = Enemy._nextSpawnId++;
        this.maxHp = Math.round(info.hp * hpScale * BattleConfig.MONSTER_HP_SCALE
            * (info.tier === 2 ? BattleConfig.BOSS_HP_SCALE : 1));
        this.hp = this.maxHp;
        const boss = info.tier === 2;
        this._tier = info.tier;
        this._info = { ...info };
        this._affix = info.affix ?? null;
        this._frenzied = false;
        this._enraged = false;
        this._healTimer = BattleConfig.AFFIX_HEAL_INTERVAL * (0.5 + Math.random() * 0.5);
        this.speed = info.speed * BattleConfig.MONSTER_SPEED_SCALE
            * (info.tier === 1 ? 1.15 : boss ? BattleConfig.BOSS_SPEED : 1)
            * (this._affix === 'swift' ? BattleConfig.AFFIX_SWIFT_SPEED : 1);
        this.radius = info.radius * (info.tier === 1 ? 1.35 : boss ? BattleConfig.BOSS_RADIUS : 1);
        this.touchDamage = info.touchDamage * (info.tier === 1 ? 2 : boss ? BattleConfig.BOSS_TOUCH : 1);
        this.biteGap = BattleConfig.BITE_GAP * (info.tier === 1 ? 1.3 : boss ? 2.2 : 1);
        this._biting = false;
        this._biteCd = 0;
        this._biteFxT = 0;
        this._behavior = info.behavior;
        this._chargeState = 'advance';
        this._windupLeft = 0;
        this._windupTime = info.windupTime ?? 0.6;
        this._dashRange = info.dashRange ?? 510;
        this._dashSpeed = info.dashSpeed ?? 645;
        // 蓄力中途被回收的怪会带缩放入池，重置防串状态
        this.node.setScale(1, 1, 1);
        // 受击反馈计时清零（tint 由 _tryApplyArt 换装/死亡收尾归白，这里兜底防带红复用）
        this._hitT = 0;
        // 动作状态机复位
        this._mid = info.id;
        this.isElite = info.tier === 1;
        this._dying = false;
        this._animState = 'walk';
        this._animFrames = AssetLib.monsterFrames(info.id, 'walk');
        this._animIdx = -1;
        this._animT = 0;
        this._onAnimDone = null;
        this._bodyOp.opacity = 255;
        // 准星/标记随池化回收清零
        this._reticleLeft = 0;
        this._hideReticle();
        // 行走动效节奏：疯狗高频碎步 / 野猪沉重小跑 / 熊缓慢沉稳 / 疯鹰振翅悬浮
        this._walkPhase = Math.random() * Math.PI * 2;
        switch (info.behavior) {
            case 'swarm':
                this._walkFreq = 14; this._bobAmp = 2; this._isFlyer = false;
                break;
            case 'charger':
                this._walkFreq = 7; this._bobAmp = 2.5; this._isFlyer = false;
                break;
            case 'tanker':
                this._walkFreq = 4; this._bobAmp = 3; this._isFlyer = false;
                break;
            case 'diver':
                this._walkFreq = 6; this._bobAmp = 5; this._isFlyer = true;
                break;
            default:
                this._walkFreq = 9; this._bobAmp = 2; this._isFlyer = false;
                break;
        }
        this._bodyNode.setPosition(0, 0);
        this._bodyNode.angle = 0;
        this._bodyNode.setScale(1, 1, 1);
        this._ensureShadow(info);
        this._ensureBadge(info);
        this._draw(info);
    }

    /** 在目标头顶挂准星：锁定读秒用黄白色（短时），存活标记用红色（长时）；随目标移动、缓慢自旋 */
    private _reticleMarked = false;
    private _reticleColor = new Color();

    showReticle(color: Color, life: number, marked = false): void {
        if (!this._reticleNode) {
            this._reticleNode = createUINode('Reticle');
            this.node.addChild(this._reticleNode);
            this._reticleG = this._reticleNode.addComponent(Graphics);
        }
        this._reticleMarked = marked;
        this._reticleColor = color.clone();
        this._reticleLeft = life;
        this._reticleTotal = life;
        this._reticleNode.active = true;
        this._reticleNode.angle = 0;
        this._reticleNode.setScale(marked ? 1 : 1.35, marked ? 1 : 1.35, 1);
        this._drawReticle(1);
        this._reticleKDrawn = 1;
    }

    private _hideReticle(): void {
        this._reticleLeft = 0;
        if (this._reticleNode) {
            this._reticleNode.active = false;
            this._reticleG?.clear();
        }
    }

    /** 上次绘制读秒弧时的进度值（重绘步进门控） */
    private _reticleKDrawn = -1;

    /** 准星计时：读秒全程从 1.6 倍收缩到 1 倍，自旋随读秒推进不断加速（锁定收紧的紧迫感） */
    private _updateReticle(dt: number): void {
        if (this._reticleLeft <= 0 || !this._reticleNode) {
            return;
        }
        this._reticleLeft -= dt;
        if (this._reticleLeft <= 0) {
            this._hideReticle();
            return;
        }
        const k = Math.min(1, this._reticleLeft / this._reticleTotal);
        const scale = this._reticleMarked ? 1 : 1 + 0.35 * k;
        this._reticleNode.setScale(scale, scale, 1);
        // 重绘门槛：标记态图形固定零重绘；读秒弧按 2% 步进重绘（约 60 帧全程，肉眼光滑），
        // 收缩/自旋观感由 setScale 承担，避免 8 目标锁定时每帧 8 次全量 Graphics 重绘
        if (!this._reticleMarked && Math.abs(k - this._reticleKDrawn) > 0.02) {
            this._reticleKDrawn = k;
            this._drawReticle(k);
        }
    }

    private _drawReticle(k: number): void {
        const g = this._reticleG!;
        const r = this.radius + 10;
        g.clear();
        g.strokeColor = this._reticleColor;
        g.lineWidth = this._reticleMarked ? 3 : 2;
        // Fixed orientation brackets; read countdown rather than a noisy spinning wheel.
        for (let q = 0; q < 4; q++) {
            const a = q * Math.PI / 2 + Math.PI / 4;
            g.arc(0, 0, r, a - 0.22, a + 0.22, false); g.stroke();
        }
        if (!this._reticleMarked) {
            g.lineWidth = 1.5;
            g.arc(0, 0, r * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.stroke();
            g.fillColor = this._reticleColor;
            g.circle(0, 0, 2); g.fill();
        } else {
            // Unambiguous red chevron above the survivor; does not cover the body.
            g.moveTo(-6, r + 9); g.lineTo(0, r + 3); g.lineTo(6, r + 9); g.stroke();
        }
    }

    update(dt: number): void {
        const bm = BattleManager.instance;
        if (!bm || bm.isPaused || bm.isGameOver) {
            return;
        }
        dt *= bm.timeScale;
        if (this._dying) {
            this._updateDeathAnim(dt);
            // 死亡期间把受击反馈收尾（tint 归白），防止带红回池串到下一次复用
            this._updateHitFx(dt);
            return;
        }
        const p = this.node.position;
        // 驻留啃咬（向僵尸开炮式）：到车沿停住不走，按咬击间隔持续咬车，直到被击杀
        if (this._biting) {
            this._biteTick(dt, bm);
            return;
        }
        if (p.y - this.radius <= bm.vehicleTopY) {
            this._startBiting(bm);
            return;
        }
        switch (this._behavior) {
            case 'charger':
                this._updateCharger(dt, bm);
                break;
            default:
                // 全部垂直下压（像雪一样直落）；疯鹰的"侧翼"只体现在入场位置
                this._descend(dt);
                break;
        }
        this._updateAffix(dt, bm);
        this._updateReticle(dt);
        this._updateWalkAnim(dt);
        this._updateHitFx(dt);
    }

    /** 受击反馈剩余时长（>0 期间红闪+放大回弹，update 中字段驱动，零 tween 零分配） */
    private _hitT = 0;

    /** 受击；返回是否已死亡（死亡结算由 BattleManager 处理） */
    takeDamage(dmg: number): boolean {
        if (this.hp <= 0) {
            return false;
        }
        // 坚甲词缀：受伤减免 30%（最低保留 1 点防免疫）
        this.hp -= this._affix === 'armor' ? Math.max(1, Math.round(dmg * BattleConfig.AFFIX_ARMOR_CUT)) : dmg;
        // 受击反馈：红闪（立绘 tint）+ 轻微放大回弹，节奏由 _updateHitFx 按 _hitT 推进
        this._hitT = 0.14;
        const sp = this._artNode ? this._artNode.getComponent(Sprite) : null;
        if (sp) {
            sp.color = HIT_TINT;
        } else {
            // 占位图形：闪红
            this._graphics.strokeColor = HIT_TINT;
        }
        return this.hp <= 0;
    }

    /** 受击反馈推进：前 0.05s 放大到 1.12 倍，随后线性回弹；结束后恢复白底与 1 倍 */
    private _updateHitFx(dt: number): void {
        if (this._hitT <= 0) {
            return;
        }
        this._hitT -= dt;
        if (this._hitT > 0) {
            const elapsed = 0.14 - this._hitT;
            const k = elapsed <= 0.05 ? elapsed / 0.05 : Math.max(0, this._hitT / 0.09);
            const s = 1 + 0.12 * k;
            this.node.setScale(s, s, 1);
            return;
        }
        this._hitT = 0;
        this.node.setScale(1, 1, 1);
        const sp = this._artNode ? this._artNode.getComponent(Sprite) : null;
        if (sp) {
            sp.color = BASE_TINT;
        }
    }

    // ================= 行为逻辑 =================

    /** 词缀/BOSS 周期行为：治疗光环、狂暴词缀与 BOSS 半血狂暴（均一次性触发提速） */
    private _updateAffix(dt: number, bm: BattleManager): void {
        // 治疗：周期性为半径内受伤同伴回血（不含自己，回血量按治疗者最大生命）
        if (this._affix === 'heal') {
            this._healTimer -= dt;
            if (this._healTimer <= 0) {
                this._healTimer = BattleConfig.AFFIX_HEAL_INTERVAL;
                bm.healNearby(this, BattleConfig.AFFIX_HEAL_RANGE,
                    Math.max(2, Math.round(this.maxHp * BattleConfig.AFFIX_HEAL_RATIO)));
            }
        }
        const enrageNow = this.hp > 0 && this.hp < this.maxHp * BattleConfig.BOSS_ENRAGE_AT;
        if (this._affix === 'frenzy' && !this._frenzied && enrageNow) {
            this._frenzied = true;
            this.speed *= BattleConfig.BOSS_ENRAGE_SPEED;
            this._markRing(new Color(255, 82, 82, 255));
        }
        // BOSS 半血狂暴：移速突增，脚下金圈转红（血条压力骤增的翻盘提示）
        if (this._tier === 2 && !this._enraged && enrageNow) {
            this._enraged = true;
            this.speed *= BattleConfig.BOSS_ENRAGE_SPEED;
            this._markRing(new Color(255, 82, 82, 255));
        }
    }

    /** 回复生命（治疗词缀光环为同伴回复）：满血/阵亡跳过，绿闪反馈；返回是否实际回复 */
    heal(amount: number): boolean {
        if (amount <= 0 || this.hp <= 0 || this.hp >= this.maxHp) {
            return false;
        }
        this.hp = Math.min(this.maxHp, this.hp + amount);
        const sp = this._artNode ? this._artNode.getComponent(Sprite) : null;
        if (sp) {
            sp.color = new Color(120, 255, 140, 255);
            tween(sp)
                .delay(0.12)
                .call(() => { if (sp.isValid) { sp.color = new Color(255, 255, 255, 255); } })
                .start();
        }
        return true;
    }

    /** 垂直下压：保持出生横坐标直落车尾（车尾横贯全宽，直行必达） */
    private _descend(dt: number): void {
        const p = this.node.position;
        this.node.setPosition(p.x, p.y - this.speed * dt);
    }

    // ================= 驻留啃咬 =================

    /** 抵达车沿：钳位驻车（底边贴车沿上沿），短起手后进入咬击循环 */
    private _startBiting(bm: BattleManager): void {
        const p = this.node.position;
        this.node.setPosition(p.x, bm.vehicleTopY + this.radius, p.z);
        this._biting = true;
        this._biteCd = BattleConfig.BITE_STARTUP;
    }

    /** 咬击循环：每隔咬击间隔咬一口（伤害口径在 BattleManager），期间位置锁定在车沿 */
    private _biteTick(dt: number, bm: BattleManager): void {
        const p = this.node.position;
        // 位置钳制：驻留期间不再位移（词缀/击退等位移源全部忽略，车恒在 x=0 无需跟车）
        if (p.y !== bm.vehicleTopY + this.radius) {
            this.node.setPosition(p.x, bm.vehicleTopY + this.radius, p.z);
        }
        this._biteCd -= dt;
        if (this._biteCd <= 0) {
            this._biteCd = this.biteGap;
            this._biteFxT = 0.22;
            this.playAttack();
            bm.onEnemyBiteVehicle(this);
        }
        this._updateAffix(dt, bm);
        this._updateReticle(dt);
        this._updateWalkAnim(dt);
        this._updateHitFx(dt);
        this._updateBiteFx(dt);
    }

    /** 咬击前扑脉冲：前 40% 拉伸扑向车体、后 60% 回弹（零 tween 零分配；与受击红闪同为全量 setScale，同帧互踩取后写者，一帧级瑕疵可接受） */
    private _updateBiteFx(dt: number): void {
        if (this._biteFxT <= 0) {
            return;
        }
        this._biteFxT -= dt;
        if (this._biteFxT <= 0) {
            this._bodyNode.setScale(1, 1, 1);
            return;
        }
        const k = 1 - this._biteFxT / 0.22;
        const s = k < 0.4 ? k / 0.4 : Math.max(0, 1 - (k - 0.4) / 0.6);
        this._bodyNode.setScale(1 + 0.12 * s, 1 - 0.08 * s, 1);
    }

    private _updateCharger(dt: number, bm: BattleManager): void {
        const p = this.node.position;
        if (this._chargeState === 'advance') {
            const distToLine = p.y - this.radius - bm.vehicleTopY;
            if (distToLine <= this._dashRange) {
                // 进入冲刺发起距离：定身蓄力（telegraph），是集火击杀窗口
                this._chargeState = 'windup';
                this._windupLeft = this._windupTime;
                this._windupPos.set(p.x, p.y, 0);
                return;
            }
            this._descend(dt);
            return;
        }
        if (this._chargeState === 'windup') {
            this._windupLeft -= dt;
            // 蓄力表现：定身 + 缩放脉冲 + 轻微颤抖
            const k = 1 - Math.max(0, this._windupLeft) / this._windupTime;
            const pulse = 1 + 0.18 * Math.sin(k * Math.PI * 6);
            this.node.setScale(pulse, pulse, 1);
            this.node.setPosition(this._windupPos.x + (Math.random() * 2 - 1) * 2.5, this._windupPos.y);
            if (this._windupLeft <= 0) {
                this._chargeState = 'dash';
                this.node.setScale(1, 1, 1);
                this.playAttack();
            }
            return;
        }
        // dash：蓄力完毕，直线高速扑向车尾
        const step = Math.min(this._dashSpeed * dt, p.y - bm.vehicleTopY - this.radius);
        this.node.setPosition(p.x, p.y - Math.max(0, step));
    }

    // ================= 占位绘制 =================

    private _draw(info: MonsterInfo): void {
        const g = this._graphics;
        g.clear();
        g.lineWidth = 4;
        // 优先用美术立绘；没出图的怪型回退 Graphics 占位
        // （_tryApplyArt 失败时已把立绘子节点隐藏，占位直接画在本体 Graphics 上）
        if (this._tryApplyArt(info)) {
            return;
        }
        const r = this.radius;
        const elite = info.tier >= 1;
        const main = elite ? Palette.elite : this._bodyColor(info.behavior);
        g.fillColor = main;
        g.strokeColor = main;
        switch (info.behavior) {
            case 'swarm':
                this._drawDog(g, r);
                break;
            case 'charger':
                this._drawBoar(g, r);
                break;
            case 'tanker':
                this._drawBear(g, r);
                break;
            case 'diver':
                this._drawEagle(g, r);
                break;
            default:
                this._drawApe(g, r, elite);
                break;
        }
    }

    /** 尝试挂美术立绘：行走序列帧（6 帧）优先，回退静态整图，再回退占位 Graphics */
    private _tryApplyArt(info: MonsterInfo): boolean {
        // 序列帧就绪：逐帧播放取代静态图（帧切换在 _updateWalkAnim 按步相推进）
        const walk = AssetLib.monsterFrames(info.id, 'walk');
        if (walk && walk.length > 0) {
            this._animFrames = walk;
            this._animIdx = -1;
            this._showArt(walk[0]);
            return true;
        }
        this._animFrames = null;
        const key = MONSTER_ART[info.id];
        const frame = key ? AssetLib.frame(key) : null;
        if (!frame) {
            if (this._artNode) {
                this._artNode.active = false;
            }
            return false;
        }
        this._showArt(frame);
        return true;
    }

    /** 立绘 Sprite 装载：显示高度按碰撞直径约 1.3 倍；宽高比必须用 rect
     *  （frame.width/height 在动态合图后返回整张图集尺寸，不是这张图的实际尺寸） */
    private _showArt(frame: SpriteFrame): void {
        if (!this._artNode) {
            // Sprite 独立子节点：一节点只挂一种渲染组件（Graphics/Sprite 同节点会冲突）
            this._artNode = createUINode('Art');
            this._bodyNode.addChild(this._artNode);
        }
        this._artNode.active = true;
        const sprite = this._artNode.getComponent(Sprite) ?? this._artNode.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        const ut = this._artNode.getComponent(UITransform)!;
        const rect = frame.rect;
        const dispH = this.radius * 2.6;
        ut.setContentSize(dispH * rect.width / rect.height, dispH);
    }

    /** 脚下阴影+精英圈：接地感的关键，不跟随身体摆动（画在不动的 Shadow 层） */
    private _ensureShadow(info: MonsterInfo): void {
        if (!this._shadowNode) {
            this._shadowNode = createUINode('Shadow');
            this.node.addChild(this._shadowNode);
            this._shadowNode.setSiblingIndex(0);
        }
        const g = this._shadowNode.getComponent(Graphics) ?? this._shadowNode.addComponent(Graphics);
        g.clear();
        g.fillColor = new Color(0, 0, 0, 70);
        // 立绘高 2.6r 居中挂载，脚在图像底部（约 -1.1r）：影子画在脚下而不是身体中心
        g.ellipse(0, -this.radius * 1.02, this.radius * 0.95, this.radius * 0.32);
        g.fill();
        // BOSS：脚下金色王圈；精英怪：立绘保留原色，用脚下精英红圈标识
        if (info.tier === 2) {
            g.strokeColor = new Color(255, 193, 7, 255);
            g.lineWidth = 8;
            g.circle(0, -this.radius * 1.02, this.radius * 1.02);
            g.stroke();
        } else if (info.tier === 1) {
            g.strokeColor = Palette.elite;
            g.lineWidth = 5;
            g.circle(0, -this.radius * 1.02, this.radius * 1.05);
            g.stroke();
        }
    }

    /** 狂暴提示：脚下圈重画为红色（影子保留，一次性触发时调用） */
    private _markRing(color: Color): void {
        if (!this._shadowNode) {
            return;
        }
        const g = this._shadowNode.getComponent(Graphics);
        if (!g) {
            return;
        }
        g.clear();
        g.fillColor = new Color(0, 0, 0, 70);
        g.ellipse(0, -this.radius * 1.02, this.radius * 0.95, this.radius * 0.32);
        g.fill();
        g.strokeColor = color;
        g.lineWidth = 6;
        g.circle(0, -this.radius * 1.02, this.radius * 1.05);
        g.stroke();
    }

    /** 头顶徽标：精英=词缀 emoji+词缀色圈，BOSS=👑（金圈）；普通怪隐藏。Graphics 与 Label 分节点防渲染冲突 */
    private _ensureBadge(info: MonsterInfo): void {
        const affix = info.affix ? monsterAffix(info.affix) : null;
        const boss = info.tier === 2;
        if (!affix && !boss) {
            if (this._badgeNode) {
                this._badgeNode.active = false;
            }
            return;
        }
        if (!this._badgeNode) {
            this._badgeNode = createUINode('Badge');
            this.node.addChild(this._badgeNode);
            const ring = createUINode('BadgeRing');
            this._badgeNode.addChild(ring);
            ring.addComponent(Graphics);
            const txt = createUINode('BadgeIc');
            this._badgeNode.addChild(txt);
            const label = txt.addComponent(Label);
            label.isBold = true;
        }
        this._badgeNode.active = true;
        // 立绘高 2.6r（头顶约 1.3r），徽标悬在头顶上方
        this._badgeNode.setPosition(0, this.radius * 1.3 + 22);
        const ring = this._badgeNode.children[0];
        const g = ring.getComponent(Graphics)!;
        g.clear();
        const r = 17;
        g.fillColor = new Color(255, 255, 255, 235);
        g.circle(0, 0, r);
        g.fill();
        g.strokeColor = boss ? new Color(255, 193, 7, 255) : affix!.color;
        g.lineWidth = 4;
        g.circle(0, 0, r);
        g.stroke();
        const label = this._badgeNode.children[1].getComponent(Label)!;
        label.string = boss ? '👑' : affix!.ic;
        label.fontSize = 22;
        label.lineHeight = 24;
    }

    /** 行走动效（克制版）：上下颠簸 + 极轻微摆动 + 阴影起落联动；
     *  静态整图不做压扁/拉伸/蠕行等整身形变（会读成蠕动），真实迈步感交给分层纸娃娃方案 */
    private _updateWalkAnim(dt: number): void {
        // 野猪蓄力/冲刺专属姿态
        if (this._behavior === 'charger' && this._chargeState !== 'advance') {
            this._bodyNode.angle = 0;
            if (this._chargeState === 'dash') {
                this._bodyNode.setScale(0.94, 1.08, 1);
            } else {
                this._bodyNode.setScale(1, 1, 1);
            }
            this._bodyNode.setPosition(0, 0);
            this._updateShadow(0.4);
            this._tickOnceAnim(dt);
            return;
        }
        this._walkPhase += dt * this._walkFreq;
        const ph = this._walkPhase;
        const bob = this._isFlyer ? 0.5 + 0.5 * Math.sin(ph) : Math.abs(Math.cos(ph));
        // 行走循环帧：步相每循环推进一整圈 → 依次切帧（与 bob 同源，脚感一致）
        if (this._animState === 'walk' && this._animFrames && this._animFrames.length > 0) {
            const cycle = (ph % (Math.PI * 2)) / (Math.PI * 2);
            this._applyFrame(Math.min(this._animFrames.length - 1, Math.floor(cycle * this._animFrames.length)));
        }
        this._bodyNode.setPosition(0, bob * this._bobAmp);
        this._bodyNode.angle = Math.sin(ph) * 1.6;
        if (this._isFlyer) {
            // 振翅：极轻微的躯干收张（翅膀拍打反作用），幅度压到不可察边界
            const flap = 0.02 * Math.sin(ph * 2);
            this._bodyNode.setScale(1 - flap * 0.6, 1 + flap, 1);
        } else {
            this._bodyNode.setScale(1, 1, 1);
        }
        // 阴影联动：身体越贴近地面影子越大越实，腾空则小而淡
        this._updateShadow(this._isFlyer ? 1 - bob * 0.5 : 1 - bob);
        this._tickOnceAnim(dt);
    }

    /** 单次动作（attack）帧轨推进：播完自动回 walk */
    private _tickOnceAnim(dt: number): void {
        if (this._animState !== 'attack' || !this._animFrames) {
            return;
        }
        this._animT += dt;
        const k = Math.min(1, this._animT / Math.max(0.01, this._animDur));
        this._applyFrame(Math.min(this._animFrames.length - 1, Math.floor(k * this._animFrames.length)));
        if (k >= 1 && this._onAnimDone) {
            const cb = this._onAnimDone;
            this._onAnimDone = null;
            cb();
        }
    }

    /** 应用序列帧（同帧跳过，避免重复赋值） */
    private _applyFrame(idx: number): void {
        if (idx === this._animIdx) {
            return;
        }
        this._animIdx = idx;
        const sp = this._artNode ? this._artNode.getComponent(Sprite) : null;
        if (sp && this._animFrames) {
            sp.spriteFrame = this._animFrames[idx];
        }
    }

    /** 播放攻击动作：有 attack 序列帧才生效，播完自动回 walk；无图静默（骨架预留） */
    playAttack(): void {
        if (this._dying || this._animState === 'attack') {
            return;
        }
        const frames = AssetLib.monsterFrames(this._mid, 'attack');
        if (!frames) {
            return;
        }
        this._animState = 'attack';
        this._animFrames = frames;
        this._animIdx = -1;
        this._animT = 0;
        this._animDur = frames.length / 14;
        this._onAnimDone = () => {
            this._animState = 'walk';
            this._animFrames = AssetLib.monsterFrames(this._mid, 'walk');
            this._animIdx = -1;
        };
    }

    /** 死亡表演：有 die 序列帧才进入（返回 true=节点延迟回池，播完回调回收）；无图返回 false 立即回收 */
    playDieAnim(onRecycle: () => void): boolean {
        if (this._dying) {
            return true;
        }
        const frames = AssetLib.monsterFrames(this._mid, 'die');
        if (!frames) {
            return false;
        }
        this._dying = true;
        this._animState = 'die';
        this._animFrames = frames;
        this._animIdx = -1;
        this._animT = 0;
        this._animDur = Math.max(0.4, frames.length / 12);
        this._onAnimDone = onRecycle;
        this._hideReticle();
        this._bodyNode.setPosition(0, 0);
        this._bodyNode.angle = 0;
        return true;
    }

    /** 死亡表演推进：帧轨单次播放 + 末段 30% 淡出，播完回调回收 */
    private _updateDeathAnim(dt: number): void {
        this._animT += dt;
        const k = Math.min(1, this._animT / Math.max(0.01, this._animDur));
        if (this._animFrames && this._animFrames.length > 0) {
            this._applyFrame(Math.min(this._animFrames.length - 1, Math.floor(k * this._animFrames.length)));
        }
        if (this._bodyOp) {
            this._bodyOp.opacity = Math.round(255 * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3));
        }
        if (k >= 1 && this._onAnimDone) {
            const cb = this._onAnimDone;
            this._onAnimDone = null;
            cb();
        }
    }

    /** 阴影联动：airK 0=贴地（影子大而实）→ 1=腾空（影子小而淡） */
    private _updateShadow(airK: number): void {
        if (!this._shadowNode) {
            return;
        }
        const s = 1 - airK * 0.07;
        this._shadowNode.setScale(s, s, 1);
        const op = this._shadowNode.getComponent(UIOpacity) ?? this._shadowNode.addComponent(UIOpacity);
        op.opacity = Math.round(255 * (1 - airK * 0.22));
    }

    private _bodyColor(behavior: MonsterBehavior): Color {
        switch (behavior) {
            case 'swarm': return new Color(255, 202, 40, 255);   // 疯狗：琥珀
            case 'charger': return new Color(178, 115, 80, 255); // 野猪：棕
            case 'tanker': return new Color(66, 56, 49, 255);    // 熊：深褐
            case 'diver': return new Color(149, 117, 205, 255);  // 疯鹰：紫
            default: return new Color(122, 138, 116, 255);       // 巨石猿：苔藓灰绿
        }
    }

    /** 巨石猿占位：圆钝巨躯+前伸长臂+小头（苔藓灰绿） */
    private _drawApe(g: Graphics, r: number, elite: boolean): void {
        g.ellipse(0, 0, r * 1.05, r * 0.95);
        g.fill();
        g.stroke();
        g.circle(-r * 0.95, r * 0.25, r * 0.34);
        g.fill();
        g.circle(r * 0.95, r * 0.25, r * 0.34);
        g.fill();
        g.fillColor = Palette.bg;
        g.circle(-r * 0.22, -r * 0.35, r * 0.09);
        g.circle(r * 0.22, -r * 0.35, r * 0.09);
        g.fill();
    }

    /** 疯狗：横向椭圆身+前伸头+翘尾 */
    private _drawDog(g: Graphics, r: number): void {
        g.ellipse(0, r * 0.1, r * 1.2, r * 0.8);
        g.fill();
        g.circle(0, -r * 0.65, r * 0.45);
        g.fill();
        g.lineWidth = 3;
        g.moveTo(r * 0.9, r * 0.5);
        g.lineTo(r * 1.3, r * 0.9);
        g.stroke();
        g.fillColor = Palette.bg;
        g.circle(-r * 0.15, -r * 0.7, 2.5);
        g.circle(r * 0.15, -r * 0.7, 2.5);
        g.fill();
    }

    /** 野猪：圆角方身+獠牙+猪鼻（头朝下=车尾方向） */
    private _drawBoar(g: Graphics, r: number): void {
        g.roundRect(-r, -r * 0.7, r * 2, r * 1.4, r * 0.5);
        g.fill();
        g.fillColor = new Color(240, 230, 210, 255);
        g.moveTo(-r * 0.55, -r * 0.55);
        g.lineTo(-r * 0.35, -r * 1.05);
        g.lineTo(-r * 0.2, -r * 0.55);
        g.close();
        g.fill();
        g.moveTo(r * 0.55, -r * 0.55);
        g.lineTo(r * 0.35, -r * 1.05);
        g.lineTo(r * 0.2, -r * 0.55);
        g.close();
        g.fill();
        g.fillColor = Palette.bg;
        g.ellipse(0, -r * 0.55, r * 0.28, r * 0.18);
        g.fill();
    }

    /** 双足熊：大圆身+双耳+浅色口鼻 */
    private _drawBear(g: Graphics, r: number): void {
        g.circle(0, 0, r);
        g.fill();
        g.circle(-r * 0.55, -r * 0.75, r * 0.28);
        g.fill();
        g.circle(r * 0.55, -r * 0.75, r * 0.28);
        g.fill();
        g.fillColor = new Color(122, 104, 88, 255);
        g.ellipse(0, -r * 0.35, r * 0.42, r * 0.32);
        g.fill();
        g.fillColor = Palette.bg;
        g.circle(-r * 0.18, -r * 0.5, 3);
        g.circle(r * 0.18, -r * 0.5, 3);
        g.fill();
    }

    /** 疯鹰：菱形身+双展翅（俯冲姿态） */
    private _drawEagle(g: Graphics, r: number): void {
        g.moveTo(0, -r * 1.1);
        g.lineTo(r * 0.55, 0);
        g.lineTo(0, r);
        g.lineTo(-r * 0.55, 0);
        g.close();
        g.fill();
        g.moveTo(-r * 0.4, 0);
        g.lineTo(-r * 1.5, r * 0.35);
        g.lineTo(-r * 0.5, r * 0.45);
        g.close();
        g.fill();
        g.moveTo(r * 0.4, 0);
        g.lineTo(r * 1.5, r * 0.35);
        g.lineTo(r * 0.5, r * 0.45);
        g.close();
        g.fill();
    }
}
