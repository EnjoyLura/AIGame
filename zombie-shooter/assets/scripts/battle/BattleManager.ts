import { _decorator, Color, Component, Graphics, Node, Sprite, Tween, tween, UIOpacity, UITransform, Vec3, view, profiler } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { NodePool } from '../core/NodePool';
import { createUINode } from '../core/createUINode';
import { AssetLib } from '../core/AssetLib';
import { GameManager } from '../core/GameManager';
import { Hero, HeroUpgradeId } from './Hero';
import { Bullet, ProjectileSpec } from './Bullet';
import { Enemy } from './Enemy';
import { DamageNumber } from './DamageNumber';
import { XpGem } from './XpGem';
import { Vehicle } from './Vehicle';
import { ABILITY_MAX_LEVEL, BASIC_ENHANCE_MAX, BOOM_DMG_RATIO, BOOM_DMG_RATIO_STEP, BOOM_DMG_UP_MAX, BOOM_MAX, BOOM_RADIUS, BOOM_RADIUS_STEP, HERO_DEFS, PIERCE_PLUS_MAX, SEC_BOOM_DMG_RATIO, SEC_BOOM_DMG_RATIO_STEP, SEC_BOOM_MAX, SEC_BOOM_RADIUS, SEC_BOOM_RADIUS_STEP, SPLIT_DMG_RATIO, SPLIT_DMG_UP_MAX, SPLIT_FAN_ANGLE, SPLIT_MAX, SPLIT_MORE_MAX, SPLIT_SEEK_RANGE, BOOM_RANGE_MAX } from './HeroDef';
import { CardOption, makeCardOption } from './UpgradeCard';
import { HUD } from '../ui/HUD';
import { DomHud } from '../ui/DomHud';
import { LevelUpPanel } from '../ui/LevelUpPanel';
import { GmPanel } from '../ui/GmPanel';
import { AbilityBar } from '../ui/AbilityBar';
import { MonsterInfo, WaveInfo, WAVES, MONSTERS } from './WaveData';
import { HitParticle } from './HitParticle';
import { MortarFx, MORTAR_FX } from './MortarFx';
import { HomeUi } from '../ui/HomeUi';
import { SoundFx } from '../core/SoundFx';

/**
 * 《末日航线》战斗总控：
 * 部署运输载具与上阵英雄、四方向刷怪、子弹×怪物结算、经验拾取与升级三选一、胜负流程。
 * 场景中不摆放任何业务节点，全部由 Boot 挂载本组件后动态创建。
 */
export interface EnemyHandle {
    enemy: Enemy;
    spawnId: number;
}

/** 伤害统计槽位：普攻 / 技能 / 大招 */
export type DamageSlotKey = 'basic' | 'skill' | 'ultimate';

/** 伤害统计快照（HUD 统计浮窗用） */
export interface DamageStats {
    teamTotal: number;
    byHero: Array<{
        id: string;
        name: string;
        total: number;
        basic: number;
        skill: number;
        ultimate: number;
    }>;
}

@ccclass('BattleManager')
export class BattleManager extends Component {
    static instance: BattleManager = null!;

    private _vehicle: Vehicle = null!;
    private _heroes: Hero[] = [];
    private _enemies: Enemy[] = [];
    private _bullets: Bullet[] = [];

    private _enemyPool: NodePool = null!;
    private _bulletPool: NodePool = null!;
    private _dmgPool: NodePool = null!;
    private _particlePool: NodePool = null!;
    private _gemPool: NodePool = null!;

    private _hud: HUD = null!;
    private _domHud: DomHud | null = null;
    private _panel: LevelUpPanel = null!;
    private _abilityBar: AbilityBar = null!;
    /** 分层容器：世界层（路面+单位+特效）与其下的单位层/特效层，保证 UI 永远在最上 */
    private _worldLayer: Node = null!;
    private _unitLayer: Node = null!;
    private _fxLayer: Node = null!;
    /** 战斗时间轴延时回调：技能连射/多段打击的节奏驱动（暂停冻结、重开清空） */
    private _delayed: Array<{ left: number; fn: () => void }> = [];
    private _mortarFx: MortarFx[] = [];

    /** Rifle-only pooled visual composition; closure is invoked by the original damage timer. */
    beginRifleMortarFx(from: Vec3, to: Vec3, radius: number, flight: number, color: Color): () => void {
        let fx = this._mortarFx.find(item => !item.active);
        if (!fx && this._mortarFx.length < MORTAR_FX.maxActive) {
            fx = new MortarFx(this._fxLayer);
            this._mortarFx.push(fx);
        }
        // Visual overload drops the extra composition, never gameplay or its callback.
        if (!fx) return () => {};
        const generation = fx.begin(from, to, radius, flight, this.uiScale);
        return () => {
            if (!fx!.impact(generation)) {
                this.burstUltRingFx(to, radius, color);
                this.burstHitSparks(to, new Color(255, 255, 255, 255));
            }
        };
    }

    /** 延时回调（战斗秒数）：到点执行；随暂停冻结，重开清空 */
    delayCall(delay: number, fn: () => void): void {
        this._delayed.push({ left: delay, fn });
    }

    private _tickDelayed(dt: number): void {
        for (let i = this._delayed.length - 1; i >= 0; i--) {
            const d = this._delayed[i];
            d.left -= dt;
            if (d.left <= 0) {
                this._delayed.splice(i, 1);
                d.fn();
            }
        }
    }

    private _waveNumber = 0;
    private _currentWave: WaveInfo = null!;
    private _spawnLeft = 0;
    private _spawnTimer = 0;
    private _spawnGroups = 0;
    private _autoCastReadyAt = 0;

    /** 只错开新施法；等待期间不耗充能、不锁定目标，普攻照常。 */
    tryBeginAutoCast(): boolean {
        if (this._paused || this._gameOver || this._elapsed < this._autoCastReadyAt) return false;
        this._autoCastReadyAt = this._elapsed + BattleConfig.AUTO_CAST_GAP;
        return true;
    }
    private _waveCleared = false;
    private _restTimer = 0;

    private _gameOver = false;
    /** 战斗外玩法：false=主城/结算（模拟冻结），true=局内进行中 */
    private _runActive = false;
    /** 升级选卡期间暂停整个战斗（各实体 update 自行检查） */
    private _paused = false;

    // ================= 伤害统计 =================
    /** 英雄总伤（sourceId → 累计伤害） */
    private _dmgByHero: Map<string, number> = new Map();
    /** 英雄分槽位伤害（sourceId → 普攻/技能/大招） */
    private _dmgBySlot: Map<string, Record<DamageSlotKey, number>> = new Map();

    /** 伤害记账：applyDamage 唯一入口调用 */
    private _recordDamage(sourceId: string | undefined, slot: DamageSlotKey, damage: number): void {
        if (!sourceId || damage <= 0) {
            return;
        }
        this._dmgByHero.set(sourceId, (this._dmgByHero.get(sourceId) ?? 0) + damage);
        const slots = this._dmgBySlot.get(sourceId) ?? { basic: 0, skill: 0, ultimate: 0 };
        slots[slot] += damage;
        this._dmgBySlot.set(sourceId, slots);
    }

    /** 伤害统计快照（HUD 统计浮窗读取） */
    getDamageStats(): DamageStats {
        const byHero: DamageStats['byHero'] = [];
        let teamTotal = 0;
        for (const hero of this._heroes) {
            const total = this._dmgByHero.get(hero.def.id) ?? 0;
            const slots = this._dmgBySlot.get(hero.def.id) ?? { basic: 0, skill: 0, ultimate: 0 };
            byHero.push({ id: hero.def.id, name: hero.def.name, total, ...slots });
            teamTotal += total;
        }
        return { byHero, teamTotal };
    }

    /** 战斗倍速（1 或 2，图标栏 x2 按钮切换；重开保留） */
    private _timeScale = 1;
    get timeScale(): number { return this._timeScale; }
    /** 切换 1x/2x 倍速，返回切换后的倍速 */
    toggleSpeed(): number {
        this._timeScale = this._timeScale === 1 ? 2 : 1;
        return this._timeScale;
    }
    private _elapsed = 0;
    private _visH = Design.HEIGHT;
    /** 实际可视宽（随窗口比例变化） */
    private get _visW(): number { return view.getVisibleSize().width; }
    /** UI/世界统一缩放系数：可视高 / 1080 设计基准高（1920） */
    get uiScale(): number { return Math.max(0.5, Math.min(2.5, this._visH / 1920)); }
    /** 路面滚动层（下移=载具前进感） */
    private _bgScroll: Node = null!;
    /** 美术路面滚动节点（上下两张镜像衔接，无缝循环） */
    private _bgArtA: Node = null!;
    private _bgArtB: Node = null!;
    private _bgArtApplied = false;
    /** 美术路面单张实际高度（等比缩放后，滚动间距/回卷以此为准） */
    private _bgArtH = 0;

    get isGameOver(): boolean { return this._gameOver; }
    get isPaused(): boolean { return this._paused; }

    /** 手动暂停/恢复（HUD 暂停按钮）：升级三选一与护送失败流程期间不响应 */
    togglePause(): boolean {
        if (this._gameOver || this._panel.node.active) {
            return this._paused;
        }
        this._paused = !this._paused;
        return this._paused;
    }

    /** 战斗用时（HUD 计时显示） */
    get elapsed(): number { return this._elapsed; }
    /** 车尾条的上沿 Y：怪物追到这条线就啃咬载具 */
    get vehicleTopY(): number { return -this._visH / 2 + BattleConfig.VEHICLE_STRIP_HEIGHT; }
    /** 屏幕对角线长度（贯穿光束等全屏特效的保底长度） */
    get screenDiag(): number { return Math.sqrt(this._visW * this._visW + this._visH * this._visH); }
    /** 屏幕上边缘（世界 y） */
    get screenTop(): number { return this._visH / 2; }
    /** 经验晶体的拾取点（车尾中央） */
    get vehiclePos(): Vec3 { return new Vec3(0, this.vehicleTopY); }
    /** 单位层（无人机等战斗实体挂载点） */
    get unitLayer(): Node { return this._unitLayer; }

    onLoad(): void {
        BattleManager.instance = this;
        // 首次触摸解锁程序合成音效（浏览器自动播放策略）
        this.node.on(Node.EventType.TOUCH_START, () => SoundFx.unlock(), this);
        eventCenter.on(GameEvent.GAME_RESTART, this._restart, this);
        this._visH = view.getVisibleSize().height;
        // 世界层包裹路面/单位/特效，与 HUD 分层；当前不启用震屏
        this._worldLayer = createUINode('WorldLayer');
        this.node.addChild(this._worldLayer);
        this._drawBackground();
        this._initScrollBg();
        this._initPools();
    }

    onDestroy(): void {
        eventCenter.off(GameEvent.GAME_RESTART, this._restart, this);
        this._delayed.length = 0;
        for (const fx of this._mortarFx) fx.destroy();
        this._mortarFx.length = 0;
        if (BattleManager.instance === this) {
            BattleManager.instance = null!;
        }
        this._enemyPool?.clear();
        this._bulletPool?.clear();
        this._dmgPool?.clear();
        this._gemPool?.clear();
        this._particlePool?.clear();
    }

    start(): void {
        // debug 构建也默认隐藏大块引擎统计，GM 可按需开启；重开不覆盖开关。
        profiler.hideStats();
        // 分层容器：世界层（路面+单位层[车/英雄/怪/弹/晶体]+特效层[粒子/飘字]）→ UI。
        // 动态刷出的节点一律挂进对应层，避免追加到根节点后把技能图标/升级卡片盖住；
        // 世界层与 HUD 独立排序，不施加震屏偏移
        this._unitLayer = createUINode('UnitsLayer');
        this._worldLayer.addChild(this._unitLayer);
        this._fxLayer = createUINode('FxLayer');
        this._worldLayer.addChild(this._fxLayer);

        this._deployVehicle();
        this._deployHeroes();

        const hudNode = createUINode('HUD');
        this.node.addChild(hudNode);
        if (typeof document !== 'undefined') {
            // 浏览器环境：HUD 文本/条/面板走 DOM；伤害数字仍由 DamageNumber 渲染
            this._domHud = hudNode.addComponent(DomHud);
        } else {
            // 微信小游戏回退：画布版 HUD
            this._hud = hudNode.addComponent(HUD);
        }

        const panelNode = createUINode('LevelUpPanel');
        this.node.addChild(panelNode);
        this._panel = panelNode.addComponent(LevelUpPanel);

        // GM 调试面板：仅浏览器预览生效（微信端无 DOM 自动跳过）
        if (typeof document !== 'undefined') {
            const gmNode = createUINode('GmPanel');
            this.node.addChild(gmNode);
            gmNode.addComponent(GmPanel);
        }

        // 技能/大招图标栏（放最后创建=渲染在最上层）
        const barNode = createUINode('AbilityBar');
        this.node.addChild(barNode);
        this._abilityBar = barNode.addComponent(AbilityBar);
        this._abilityBar.rebind(this._heroes);

        GameManager.instance.load();
        // 战斗外玩法：启动后先进入主城（战斗模拟冻结），点击出战才 beginRun
        if (typeof document !== 'undefined') {
            const homeNode = createUINode('HomeUi');
            this.node.addChild(homeNode);
            homeNode.addComponent(HomeUi);
        }
    }

    /** 主城点击出战：应用局外强化（幂等）并开启第一波 */
    beginRun(): void {
        const gm = GameManager.instance;
        this._runActive = true;
        for (const h of this._heroes) {
            h.applyMetaAtk(gm.metaAtkMul());
        }
        this._vehicle.applyMetaHp(gm.metaVehHpMul());
        this._startWave(1);
    }

    /** 返回主城：冻结战斗模拟（主城覆盖层负责展示与再次出战） */
    leaveRun(): void {
        this._runActive = false;
    }

    update(dt: number): void {
        // 主城/结算界面期间冻结整场模拟（不刷怪、不计时不滚动）
        if (!this._runActive || this._gameOver || this._paused) {
            return;
        }
        dt *= this._timeScale;
        this._elapsed += dt;
        // Tick before callbacks: newly triggered impact starts at t=0, not one dt into its flash.
        for (const fx of this._mortarFx) fx.tick(dt);
        this._tickDelayed(dt);
        if (!this._bgArtApplied) {
            this._applyRoadArt();
        }
        this._scrollBg(dt);

        // ---- 刷怪流程 ----
        if (this._spawnLeft > 0) {
            this._spawnTimer -= dt;
            if (this._spawnTimer <= 0 && this._enemies.length < this._currentWave.maxAlive) {
                const ramp = Math.max(0, 1 - this._spawnGroups / BattleConfig.WAVE_RAMP_GROUPS);
                this._spawnTimer = this._currentWave.interval * (1 + 0.5 * ramp);
                this._spawnGroups++;
                // 从本波怪物池随机取一种；带 packSize 的怪成群刷新
                const info = this._pickWaveMonster();
                const spawned = this._spawnGroup(info, this._currentWave.eliteChance);
                this._spawnLeft = Math.max(0, this._spawnLeft - spawned);
            }
        } else if (!this._waveCleared && this._enemies.length === 0) {
            this._waveCleared = true;
            this._restTimer = BattleConfig.WAVE_REST_TIME;
        }
        if (this._waveCleared) {
            this._restTimer -= dt;
            if (this._restTimer <= 0) {
                this._startWave(this._waveNumber + 1);
            }
        }

        // ---- 碰撞：子弹 × 怪物（量大后换空间网格） ----
        for (let i = this._bullets.length - 1; i >= 0; i--) {
            const bullet = this._bullets[i];
            const bp = bullet.node.position;
            for (let j = this._enemies.length - 1; j >= 0; j--) {
                const enemy = this._enemies[j];
                // 尚未进入屏幕的怪物不可被索敌/击中
                if (!this._enemyOnScreen(enemy)) {
                    continue;
                }
                if (bullet.hasHit(this._handleOf(enemy))) {
                    continue;
                }
                const ep = enemy.node.position;
                const dx = bp.x - ep.x;
                const dy = bp.y - ep.y;
                const rr = bullet.radius + enemy.radius;
                if (dx * dx + dy * dy <= rr * rr) {
                    this._hitEnemy(bullet, enemy, bullet.sourceId);
                    if (!bullet.canPierceMore()) {
                        this.recycleBullet(bullet);
                        break;
                    }
                    bullet.consumePierce();
                    bullet.markHit(this._handleOf(enemy));
                }
            }
        }
    }

    // ================= 对外接口（供 Hero/Enemy/Bullet/XpGem 调用） =================

    /** 激光索敌（照抄 code(3).html pickTarget）：射程内「推进最深/离车最近」的活怪优先——
     * 参考版取画布 y 最大（画布 y 向下），本作 y 轴向上，等价于世界 y 最小；
     * exclude 用于多光束锁定时排除其它光束已锁定的敌人 */
    findFrontTarget(from: Vec3, range: number, exclude?: EnemyHandle[]): EnemyHandle | null {
        let best: EnemyHandle | null = null;
        let bestY = Infinity;
        for (const enemy of this._enemies) {
            if (!this._enemyOnScreen(enemy) || enemy.hp <= 0) continue;
            if (exclude) {
                let locked = false;
                for (const ex of exclude) {
                    if (ex.enemy === enemy && ex.spawnId === enemy.spawnId) { locked = true; break; }
                }
                if (locked) continue;
            }
            const ep = enemy.node.position;
            const dx = ep.x - from.x, dy = ep.y - from.y;
            if (dx * dx + dy * dy > range * range) continue;
            if (ep.y < bestY) { bestY = ep.y; best = this._handleOf(enemy); }
        }
        return best;
    }

    findTarget(from: Vec3, range: number): EnemyHandle | null {
        return this.findTargets(from, range, 1)[0] ?? null;
    }

    /** 严格入屏索敌（无人机等即时射线召唤物专用）：目标整个身体进入屏幕才可锁定。
     *  普通索敌带 radius 容差，怪物中心还在屏幕顶端之上（刚入场）就会被选中，
     *  即时光束会一直拉到屏幕顶端之外，视觉上像从屏幕顶部射出 */
    findTargetOnScreen(from: Vec3, range: number): EnemyHandle | null {
        let best: EnemyHandle | null = null;
        let bestDistSq = Infinity;
        const top = this._visH / 2, bottom = -this._visH / 2, halfW = Design.WIDTH / 2;
        for (const enemy of this._enemies) {
            if (enemy.hp <= 0) continue;
            const ep = enemy.node.position;
            // 垂直方向整个身体入屏；水平方向中心入屏（侧翼入场的怪身位略出屏边仍可打）
            if (ep.y + enemy.radius >= top || ep.y - enemy.radius <= bottom) continue;
            if (Math.abs(ep.x) >= halfW) continue;
            const dx = ep.x - from.x;
            const dy = ep.y - from.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > range * range || distSq >= bestDistSq) continue;
            bestDistSq = distSq;
            best = this._handleOf(enemy);
        }
        return best;
    }

    /** 射程内血量最高的前 count 个敌人（猎杀锁定用：优先锁定最肉的目标） */
    findTargetsByHp(from: Vec3, range: number, count: number): EnemyHandle[] {
        const rangeSq = range * range;
        return this._enemies
            .filter(enemy => this._enemyOnScreen(enemy) && enemy.hp > 0)
            .map(enemy => {
                const ep = enemy.node.position;
                const dx = ep.x - from.x;
                const dy = ep.y - from.y;
                return { handle: this._handleOf(enemy), hp: enemy.hp, distSq: dx * dx + dy * dy };
            })
            .filter(item => item.distSq <= rangeSq)
            .sort((a, b) => b.hp - a.hp)
            .slice(0, count)
            .map(item => item.handle);
    }

    /** 严格入屏的多目标索敌（技能射线专用）：整体入屏的怪按距离取前 count 个。
     *  与 findTargetOnScreen 同门槛——防止技能射线拉到屏幕顶端之外 */
    findTargetsOnScreen(from: Vec3, range: number, count: number): EnemyHandle[] {
        const rangeSq = range * range;
        const top = this._visH / 2, bottom = -this._visH / 2, halfW = Design.WIDTH / 2;
        return this._enemies
            .filter(enemy => enemy.hp > 0)
            .map(enemy => {
                const ep = enemy.node.position;
                const dx = ep.x - from.x;
                const dy = ep.y - from.y;
                return { handle: this._handleOf(enemy), distSq: dx * dx + dy * dy, ep };
            })
            .filter(item => item.distSq <= rangeSq
                // 垂直整个身体入屏；水平中心入屏（侧翼入场的怪身位略出屏边仍可打）
                && item.ep.y + item.handle.enemy.radius < top
                && item.ep.y - item.handle.enemy.radius > bottom
                && Math.abs(item.ep.x) < halfW)
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, count)
            .map(item => item.handle);
    }

    /** 构造敌人句柄：缓存目标一律持句柄而非裸组件引用（池化复用防串代） */
    private _handleOf(enemy: Enemy): EnemyHandle {
        return { enemy, spawnId: enemy.spawnId };
    }

    /** 返回按距离排序的有效敌人句柄。 */
    findTargets(from: Vec3, range: number, count: number): EnemyHandle[] {
        const rangeSq = range * range;
        return this._enemies
            .filter(enemy => this._enemyOnScreen(enemy) && enemy.hp > 0)
            .map(enemy => {
                const ep = enemy.node.position;
                const dx = ep.x - from.x;
                const dy = ep.y - from.y;
                return { handle: this._handleOf(enemy), distSq: dx * dx + dy * dy };
            })
            .filter(item => item.distSq <= rangeSq)
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, count)
            .map(item => item.handle);
    }

    /** 校验池化对象句柄，防止旧引用命中新一轮复用的节点。 */
    isEnemyHandleValid(handle: EnemyHandle | null, from?: Vec3, range?: number): handle is EnemyHandle {
        if (!handle || handle.enemy.spawnId !== handle.spawnId
            || this._enemies.indexOf(handle.enemy) < 0 || handle.enemy.hp <= 0
            || !this._enemyOnScreen(handle.enemy)) {
            return false;
        }
        if (from && range !== undefined) {
            const ep = handle.enemy.node.position;
            const dx = ep.x - from.x;
            const dy = ep.y - from.y;
            return dx * dx + dy * dy <= range * range;
        }
        return true;
    }

    spawnProjectile(fromPos: Vec3, dir: Vec3, spec: ProjectileSpec): Bullet {
        const node = this._bulletPool.get();
        this._unitLayer.addChild(node);
        node.setPosition(fromPos.x, fromPos.y);
        const bullet = node.getComponent(Bullet)!;
        bullet.init(dir, spec);
        this._bullets.push(bullet);
        return bullet;
    }

    /** 所有战斗伤害的唯一入口。sourceId=伤害来源英雄 id（击杀充能归属）；slot=统计槽位 */
    applyDamage(handle: EnemyHandle | null, baseDamage: number, canCrit = false, sourceId?: string, slot: DamageSlotKey = 'basic'): boolean {
        if (!this.isEnemyHandleValid(handle)) {
            return false;
        }
        const crit = canCrit && Math.random() < BattleConfig.CRIT_CHANCE;
        const damage = Math.max(1, Math.round(baseDamage * (crit ? BattleConfig.CRIT_MULTI : 1)));
        const enemy = handle.enemy;
        this.spawnDamageNumber(enemy.node.worldPosition, damage, crit);
        this._recordDamage(sourceId, slot, damage);
        if (enemy.takeDamage(damage)) {
            this.killEnemy(enemy, sourceId);
        }
        return true;
    }

    /** 光束线伤：从 from 沿 dir 延伸 length，对线上 halfWidth（含怪本体）内的所有敌人结算——贯穿光束用 */
    applyBeamDamage(from: Vec3, dir: Vec3, length: number, halfWidth: number,
        damage: number, sourceId?: string, slot: DamageSlotKey = 'basic'): number {
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
        const nx = dir.x / len, ny = dir.y / len;
        let hits = 0;
        for (const enemy of this._enemies) {
            if (!this._enemyOnScreen(enemy) || enemy.hp <= 0) {
                continue;
            }
            const ep = enemy.node.position;
            const dx = ep.x - from.x, dy = ep.y - from.y;
            const t = dx * nx + dy * ny;
            if (t < 0 || t > length) {
                continue;
            }
            const px = dx - nx * t, py = dy - ny * t;
            const rr = halfWidth + enemy.radius;
            if (px * px + py * py <= rr * rr) {
                this.applyDamage(this._handleOf(enemy), damage, false, sourceId, slot);
                hits++;
            }
        }
        return hits;
    }

    applyAreaDamage(center: Vec3, radius: number, damage: number, sourceId?: string, exclude?: Enemy, slot: DamageSlotKey = 'basic'): number {
        const radiusSq = radius * radius;
        const targets = this._enemies
            .filter(enemy => {
                if (enemy === exclude) {
                    return false;
                }
                if (!this._enemyOnScreen(enemy) || enemy.hp <= 0) {
                    return false;
                }
                // Both the impact center and enemy node may be nested under world-layer nodes;
                // compare in world space so mortar/area casts do not miss every target.
                const ep = enemy.node.worldPosition;
                const dx = ep.x - center.x;
                const dy = ep.y - center.y;
                return dx * dx + dy * dy <= radiusSq;
            })
            .map(enemy => this._handleOf(enemy));
        for (const target of targets) {
            this.applyDamage(target, damage, false, sourceId, slot);
        }
        return targets.length;
    }

    recycleBullet(bullet: Bullet): void {
        const idx = this._bullets.indexOf(bullet);
        if (idx < 0) {
            return;
        }
        this._bullets.splice(idx, 1);
        this._bulletPool.put(bullet.node);
    }

    /** 结算金币：击杀与波次折算，带局外赏金加成（GAME_OVER 前调用） */
    private _awardRunGold(): void {
        const gm = GameManager.instance;
        const amount = Math.round((gm.kills * 2 + gm.wave * 15) * gm.metaGoldMul());
        gm.addGold(amount);
        eventCenter.emit(GameEvent.GOLD_EARNED, amount);
    }

    /** 怪物抵达载具：啃咬一口耐久后消失（不掉落经验） */
    onEnemyReachVehicle(enemy: Enemy): void {
        SoundFx.play('vehicleHit');
        this._vehicle.takeDamage(enemy.touchDamage);
        const idx = this._enemies.indexOf(enemy);
        if (idx >= 0) {
            this._enemies.splice(idx, 1);
        }
        this._enemyPool.put(enemy.node);
    }

    /** 击杀结算：掉落经验晶体（激光等直伤武器也会调用）；sourceId=击杀来源英雄（大招充能归属） */
    killEnemy(enemy: Enemy, sourceId?: string): void {
        const idx = this._enemies.indexOf(enemy);
        if (idx < 0) {
            return;
        }
        this._enemies.splice(idx, 1);
        const big = enemy.radius >= 55;
        this.burstKillFx(enemy.node.worldPosition, enemy.radius, big);
        SoundFx.play(big ? 'bigkill' : 'kill');
        GameManager.instance.kills++;
        GameManager.instance.totalKills++;
        eventCenter.emit(GameEvent.ENEMY_DEAD, GameManager.instance.kills);
        if (sourceId) {
            const killer = this._heroes.find(h => h.def.id === sourceId);
            if (killer) {
                killer.gainUltimateCharge(1);
            }
        }

        const gemNode = this._gemPool.get();
        this._unitLayer.addChild(gemNode);
        gemNode.setWorldPosition(enemy.node.worldPosition);
        const gem = gemNode.getComponent(XpGem)!;
        gem.init();

        // 尸体处理：有死亡序列帧则先表演（节点延迟回池），否则立即回池
        if (!enemy.playDieAnim(() => this._enemyPool.put(enemy.node))) {
            this._enemyPool.put(enemy.node);
        }
    }

    /** 经验晶体飞抵载具：累加经验，满级则暂停战斗弹出三选一 */
    collectXp(gem: XpGem): void {
        this._gemPool.put(gem.node);
        const gm = GameManager.instance;
        const leveled = gm.addXp(BattleConfig.XP_GEM_VALUE);
        eventCenter.emit(GameEvent.XP_CHANGED, gm.xp, gm.xpToNext(gm.level), gm.level);
        if (leveled && !this._gameOver) {
            this._openLevelUp();
        }
    }

    // ================= 打击粒子（末日航线风格重设计） =================

    private _emitParticle(cfg: Parameters<HitParticle['init']>[0]): void {
        // Shared visual-only ceiling, including burst-heavy upgrades; never drop damage.
        if (!this._fxLayer || this._fxLayer.children.length >= 180) return;
        const node = this._particlePool.get();
        this._fxLayer.addChild(node);
        node.getComponent(HitParticle)!.init(cfg);
    }

    /** Compact amber highlight: one pooled object instead of a white flash/ring/spark stack. */
    precisionFlash(worldPos: Vec3, size = 5, color = new Color(255, 202, 105, 255)): void {
        this._emitParticle({ type: 'precision', pos: worldPos.clone(), vel: new Vec3(),
            life: 0.16, size: size * this.uiScale, color,
            onDone: nd => this._particlePool.put(nd) });
    }

    /** Bounded green mist/pulse; radius is visual only and never exceeds the supplied area. */
    corrosionPulse(worldPos: Vec3, radius: number, life = 0.48): void {
        this._emitParticle({ type: 'corrosion', pos: worldPos.clone(), vel: new Vec3(),
            life, size: radius * 0.35, r1: radius * 0.65, color: new Color(132, 212, 55, 255),
            onDone: nd => this._particlePool.put(nd) });
    }

    /** Thin battle-clock tracer, pooled and frozen on pause (no Tween lifecycle). */
    precisionTracer(from: Vec3, to: Vec3, color: Color, width: number, life = 0.14): void {
        this._emitParticle({ type: 'tracer', pos: from.clone(),
            vel: new Vec3(to.x - from.x, to.y - from.y, 0), life, size: width, color,
            onDone: nd => this._particlePool.put(nd) });
    }

    /** 技能施法冲击环（照抄 code(3).html ring(x,y,color,10,70,.4)：半径 10→70，0.4s） */
    burstCastRing(worldPos: Vec3, color: Color): void {
        const s = this.uiScale;
        this._emitParticle({
            type: 'ring',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.4,
            size: 10 * s,
            r1: 70 * s,
            color,
            onDone: (nd) => this._particlePool.put(nd),
        });
    }

    /** 屏幕震动：已按要求移除——保留空实现避免调用点散落 */
    shake(_amp: number, _time: number): void { }

    /** 一次性射线闪光：技能/大招施法的追踪线（快速淡出后销毁） */
    spawnBeamFx(fromWorld: Vec3, toWorld: Vec3, color: Color, width: number, life = 0.16): void {
        const node = createUINode('BeamFx');
        this._fxLayer.addChild(node);
        const g = node.addComponent(Graphics);
        // 三层射线：柔光晕 → 主色束 → 白热芯
        const glow = new Color(color.r, color.g, color.b, 90);
        g.strokeColor = glow;
        g.lineWidth = width * 2.6;
        g.moveTo(fromWorld.x, fromWorld.y);
        g.lineTo(toWorld.x, toWorld.y);
        g.stroke();
        g.strokeColor = color;
        g.lineWidth = width;
        g.moveTo(fromWorld.x, fromWorld.y);
        g.lineTo(toWorld.x, toWorld.y);
        g.stroke();
        g.strokeColor = new Color(255, 255, 255, 230);
        g.lineWidth = Math.max(2, width * 0.35);
        g.moveTo(fromWorld.x, fromWorld.y);
        g.lineTo(toWorld.x, toWorld.y);
        g.stroke();
        const op = node.addComponent(UIOpacity);
        tween(op)
            .to(life, { opacity: 0 })
            .call(() => node.destroy())
            .start();
    }

    /** 蓄力预警圈：范围大招起爆前从中心扩散到伤害半径的细环（预期感） */
    spawnTelegraphFx(worldPos: Vec3, radius: number, color: Color, life = 0.35): void {
        this._emitParticle({
            type: 'ring',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life,
            size: radius * 0.15,
            // radius is the authoritative gameplay impact radius; do not shrink the boundary.
            r1: radius,
            color,
            onDone: (nd) => this._particlePool.put(nd),
        });
    }

    /** 施法前摇：枪口蓄力环（由小膨胀到 90s，随前摇时长推进）+ 中心聚能辉光，纯表现 */
    castChargeFx(worldPos: Vec3, color: Color, life: number): void {
        const s = this.uiScale;
        this._emitParticle({
            type: 'ring',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life,
            size: 90 * s * 0.15,
            r1: 90 * s,
            color,
            onDone: (nd) => this._particlePool.put(nd),
        });
        this._emitParticle({
            type: 'glow',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: Math.max(0.2, life * 0.6),
            size: 26 * s,
            color,
            onDone: (nd) => this._particlePool.put(nd),
        });
    }

    /** 榴弹炮弹体：从枪口沿抛物线飞向落点，到点即销毁（起爆结算由技能层 delayCall 调度） */
    spawnMortarFx(fromWorld: Vec3, toWorld: Vec3, color: Color, flight = 0.5, radius = 15): void {
        const node = createUINode('MortarFx');
        this._fxLayer.addChild(node);
        node.setPosition(fromWorld.x, fromWorld.y);
        const g = node.addComponent(Graphics);
        // 弹体：柔光晕 + 主体 + 白芯
        g.fillColor = new Color(color.r, color.g, color.b, 70);
        g.circle(0, 0, radius * 1.5);
        g.fill();
        g.fillColor = color;
        g.circle(0, 0, radius);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 220);
        g.circle(0, 0, radius * 0.4);
        g.fill();
        node.addComponent(UIOpacity);
        // 抛物线：中点抬升 + 两段直线近似；飞行中自旋增加"翻滚弹"观感
        const midX = (fromWorld.x + toWorld.x) / 2;
        const midY = Math.max(fromWorld.y, toWorld.y) + 300 * this.uiScale;
        tween(node)
            .to(flight / 2, { position: new Vec3(midX, midY) })
            .to(flight / 2, { position: new Vec3(toWorld.x, toWorld.y) })
            .call(() => node.destroy())
            .start();
        tween(node)
            .by(flight, { angle: 360 })
            .start();
    }

    /** 大招范围冲击：中心爆闪 + 双层冲击环 + 环形迸溅火花（范围大招施放反馈） */
    burstUltRingFx(worldPos: Vec3, radius: number, color: Color): void {
        const s = this.uiScale;
        this._emitParticle({
            type: 'flash',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.15,
            size: radius * 0.3,
            color: new Color(255, 245, 225, 255),
            onDone: (nd) => this._particlePool.put(nd),
        });
        this._emitParticle({
            type: 'ring',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.38,
            size: radius * 0.3,
            r1: radius * 1.05,
            color: new Color(255, 255, 255, 230),
            onDone: (nd) => this._particlePool.put(nd),
        });
        this._emitParticle({
            type: 'ring',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.58,
            size: radius * 0.12,
            r1: radius * 1.3,
            color,
            onDone: (nd) => this._particlePool.put(nd),
        });
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
            const speed = radius * (2 + Math.random()) / 0.4;
            this._emitParticle({
                type: 'spark',
                pos: new Vec3(worldPos.x + Math.cos(a) * radius * 0.3, worldPos.y + Math.sin(a) * radius * 0.3, 0),
                vel: new Vec3(Math.cos(a) * speed, Math.sin(a) * speed, 0),
                life: 0.3 + Math.random() * 0.15,
                size: 5 * s,
                drag: 0.05,
                color,
                onDone: (nd) => this._particlePool.put(nd),
            });
        }
    }

    /** 枪口闪光：爆闪十字 + 小冲击环 + 迸溅（发射瞬间打击感） */
    /** 枪口火焰 Sprite 池（正式贴图；粒子光斑仍是基础层） */
    private _flashPool: Node[] = [];

    muzzleFlashFx(worldPos: Vec3, color: Color, angle = 0): void {
        // 粒子枪焰（渲染有保证的主层）：中心白热闪光 + 主色光斑
        const s = this.uiScale;
        this._emitParticle({
            type: 'flash',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.12,
            size: 30 * s,
            color: new Color(255, 243, 200, 255),
            onDone: (nd) => this._particlePool.put(nd),
        });
        this.precisionFlash(worldPos, 6, color);
        // 正式火焰贴图：资源就绪时叠加在粒子之上，未就绪仅粒子
        const frame = AssetLib.frame('fx/rifle_muzzle_flash');
        if (!frame) {
            return;
        }
        let node = this._flashPool.pop();
        if (!node) {
            node = createUINode('MuzzleFlash');
            node.addComponent(UITransform);
            const sp = node.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            node.addComponent(UIOpacity);
            this._fxLayer.addChild(node);
        }
        Tween.stopAllByTarget(node);
        const op = node.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(op);
        node.active = true;
        const sp = node.getComponent(Sprite)!;
        sp.spriteFrame = frame;
        const h = 150 * s;
        node.getComponent(UITransform)!.setContentSize(h * (frame.width / frame.height), h);
        node.setWorldPosition(worldPos.x, worldPos.y, 0);
        node.angle = angle;
        node.setScale(1, 1, 1);
        op.opacity = 255;
        // 快速胀缩 + 淡出（纯表现，与既有 spawnMortarFx 同为 Tween 视觉层）
        tween(node)
            .to(0.045, { scale: new Vec3(1.12, 1.12, 1) })
            .to(0.06, { scale: new Vec3(0.72, 0.72, 1) })
            .call(() => { node!.active = false; this._flashPool.push(node!); })
            .start();
        tween(op)
            .delay(0.05)
            .to(0.07, { opacity: 0 })
            .start();
    }

    /** 柔光迸溅：无十字臂的渐隐光斑（光束灼烧点等需要"亮但不炸裂"的场景） */
    burstGlow(worldPos: Vec3, color: Color, size: number): void {
        this._emitParticle({
            type: 'glow',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.22 + Math.random() * 0.1,
            size,
            color,
            onDone: (nd) => this._particlePool.put(nd),
        });
    }

    /** 普通命中只留少量短火花；持续激光 tick 共用此入口，不叠加十字白闪。 */
    burstHitSparks(worldPos: Vec3, color: Color, count?: number): void {
        const s = this.uiScale;
        const n = count ?? (2 + Math.floor(Math.random() * 2));
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = (260 + Math.random() * 380) * s;
            this._emitParticle({
                type: 'spark',
                pos: worldPos.clone(),
                vel: new Vec3(Math.cos(a) * speed, Math.sin(a) * speed, 0),
                life: 0.16 + Math.random() * 0.12,
                size: (3 + Math.random() * 1.5) * s,
                drag: 0.02,
                color,
                onDone: (nd) => this._particlePool.put(nd),
            });
        }
    }

    /** 子弹爆炸：中心爆闪 + 双层冲击环 + 火花迸溅（范围爆炸卡） */
    burstBoomFx(worldPos: Vec3, radius: number, color: Color): void {
        if (color.g > color.r && color.g > color.b * 1.3) {
            this.corrosionPulse(worldPos, radius);
            return;
        }
        this.precisionFlash(worldPos, Math.min(12, radius / this.uiScale * 0.15), color);
        this._emitParticle({ type: 'blood', pos: worldPos.clone(), vel: new Vec3(),
            life: 0.3, size: radius * 0.16, color: new Color(168, 104, 48, 255),
            onDone: nd => this._particlePool.put(nd) });
        this.burstHitSparks(worldPos, color, 2);
    }

    /** 击杀：白闪 + 冲击环 + 血雾 + 火花 + 旋转碎屑 + 尸体残留暗斑（大型怪加倍） */
    burstKillFx(worldPos: Vec3, radius: number, big: boolean): void {
        const s = this.uiScale;
        // 击杀白闪（打击感定帧）
        this._emitParticle({
            type: 'flash',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.14,
            size: (big ? 16 : 11) * s,
            color: new Color(255, 240, 220, 255),
            onDone: (nd) => this._particlePool.put(nd),
        });
        // 血雾团
        const n = big ? 10 : 6;
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = (60 + Math.random() * 180) * s;
            this._emitParticle({
                type: 'blood',
                pos: worldPos.clone(),
                vel: new Vec3(Math.cos(a) * speed, Math.sin(a) * speed, 0),
                life: 0.45 + Math.random() * 0.25,
                size: (big ? 14 : 9) * s,
                drag: 0.1,
                color: new Color(150, 40, 40, 255),
                onDone: (nd) => this._particlePool.put(nd),
            });
        }
        // 白色冲击环
        this._emitParticle({
            type: 'ring',
            pos: worldPos.clone(),
            vel: new Vec3(0, 0, 0),
            life: 0.32,
            size: radius * 0.5,
            r1: radius * 1.6,
            color: new Color(255, 255, 255, 255),
            onDone: (nd) => this._particlePool.put(nd),
        });
        // 放射火花（与血雾同向的亮色点缀）
        for (let i = 0; i < (big ? 6 : 4); i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = (220 + Math.random() * 300) * s;
            this._emitParticle({
                type: 'spark',
                pos: worldPos.clone(),
                vel: new Vec3(Math.cos(a) * speed, Math.sin(a) * speed, 0),
                life: 0.2 + Math.random() * 0.12,
                size: 3 * s,
                drag: 0.04,
                color: new Color(255, 200, 120, 255),
                onDone: (nd) => this._particlePool.put(nd),
            });
        }
        // 旋转碎屑（2~4 片）
        for (let i = 0; i < (big ? 4 : 2); i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = (200 + Math.random() * 280) * s;
            this._emitParticle({
                type: 'shard',
                pos: worldPos.clone(),
                vel: new Vec3(Math.cos(a) * speed, Math.sin(a) * speed, 0),
                life: 0.4 + Math.random() * 0.2,
                size: 4 * s,
                drag: 0.15,
                gravity: -900 * s,
                rot: Math.random() * 360,
                vr: (Math.random() * 2 - 1) * 420,
                color: new Color(90, 70, 55, 255),
                onDone: (nd) => this._particlePool.put(nd),
            });
        }
    }

    spawnDamageNumber(worldPos: Vec3, value: number, crit: boolean): void {
        // 伤害数字走画布对象池（DOM 版在部分环境不可见，已回退）；
        // 字体栅格化补丁（_maxFontSize 320）保证画布文字锐利
        const node = this._dmgPool.get();
        this._fxLayer.addChild(node);
        const s = this.uiScale;
        // 随机散布：密集飘字（激光 0.1s 一跳）不叠在同一处
        node.setWorldPosition(
            worldPos.x + (Math.random() * 2 - 1) * 26 * s,
            worldPos.y + 10 * s + (Math.random() * 2 - 1) * 12 * s, 0);
        const dmg = node.getComponent(DamageNumber)!;
        // 大数字缩写（demo fmt）：≥1000 显示 1.2k
        const txt = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : String(value);
        dmg.play(
            txt,
            crit ? Palette.crit : Palette.damage,
            crit ? 1.32 : 1.2,
            crit,
            (n) => this._dmgPool.put(n),
        );
    }

    gameOver(): void {
        if (this._gameOver) {
            return;
        }
        this._gameOver = true;
        GameManager.instance.wave = this._waveNumber;
        GameManager.instance.bestWave = Math.max(GameManager.instance.bestWave, this._waveNumber);
        GameManager.instance.save();
        this._awardRunGold();
        eventCenter.emit(GameEvent.GAME_OVER);
    }

    // ================= GM 调试（浏览器预览专用，GmPanel 调用） =================

    /** GM：号位开关状态（true=该 1~4 号位生效；重开英雄后会自动回填到新英雄） */
    private _gmNoSkillCd = [false, false, false, false];
    private _gmInfUlt = [false, false, false, false];

    /** GM：立即升一级并弹出三选一 */
    gmLevelUp(): void {
        if (this._gameOver) {
            return;
        }
        const gm = GameManager.instance;
        gm.addXp(gm.xpToNext(gm.level));
        eventCenter.emit(GameEvent.XP_CHANGED, gm.xp, gm.xpToNext(gm.level), gm.level);
        this._openLevelUp();
    }

    /** GM：全体英雄技能+大招各解锁/升一级（连点到满级） */
    gmUnlockAbilities(): void {
        for (const hero of this._heroes) {
            hero.applyUpgrade('skill');
            hero.applyUpgrade('ultimate');
        }
    }

    /** GM：清空全部技能/大招冷却 */
    gmResetCooldowns(): void {
        for (const hero of this._heroes) {
            hero.gmResetCooldowns();
        }
    }

    /** GM：立即充满全部大招充能 */
    gmFullCharge(): void {
        for (const hero of this._heroes) {
            hero.gainUltimateCharge(9999);
        }
    }

    /** GM：击杀场上全部怪物（正常掉落经验） */
    gmKillAll(): void {
        for (const enemy of this._enemies.slice()) {
            if (enemy.takeDamage(enemy.hp)) {
                this.killEnemy(enemy);
            }
        }
    }

    /** GM：清屏并立即进入下一波 */
    gmNextWave(): void {
        this.gmKillAll();
        this._startWave(this._waveNumber + 1);
    }

    /** GM：载具耐久回满 */
    gmVehicleRefill(): void {
        this._vehicle.resetState();
    }

    /** GM：载具耐久打空，触发护送失败 */
    gmVehicleFail(): void {
        this._vehicle.takeDamage(this._vehicle.hp);
    }

    /** GM：立即刷一种怪（狗群成刷），不消耗当前波次进度 */
    gmSpawnMonster(id: string): void {
        const info = MONSTERS[id];
        if (info) {
            this._spawnGroup(info, 0);
        }
    }

    /** GM：切换 1~4 号位「技能无冷却」，返回切换后的开/关；号位非法返回 null */
    gmToggleNoSkillCooldown(slot: number): boolean | null {
        const hero = this._gmHeroAt(slot);
        if (!hero) {
            return null;
        }
        const idx = slot - 1;
        this._gmNoSkillCd[idx] = !this._gmNoSkillCd[idx];
        hero.gmSetNoSkillCooldown(this._gmNoSkillCd[idx]);
        return this._gmNoSkillCd[idx];
    }

    /** GM：切换 1~4 号位「无限大招」，返回切换后的开/关；号位非法返回 null */
    gmToggleInfUltimate(slot: number): boolean | null {
        const hero = this._gmHeroAt(slot);
        if (!hero) {
            return null;
        }
        const idx = slot - 1;
        this._gmInfUlt[idx] = !this._gmInfUlt[idx];
        hero.gmSetInfUltimate(this._gmInfUlt[idx]);
        return this._gmInfUlt[idx];
    }

    private _gmHeroAt(slot: number): Hero | null {
        const idx = slot - 1;
        return idx >= 0 && idx < this._heroes.length ? this._heroes[idx] : null;
    }

    // ================= 内部流程 =================

    /** 部署运输载具（车尾条横贯屏幕底部，只露尾部） */
    private _deployVehicle(): void {
        const vehicleNode = createUINode('Vehicle');
        this._unitLayer.addChild(vehicleNode);
        vehicleNode.setPosition(0, -this._visH / 2 + BattleConfig.VEHICLE_STRIP_HEIGHT / 2);
        this._vehicle = vehicleNode.addComponent(Vehicle);
    }

    /** 部署上阵英雄（基础版固定前 4 名定义，横排在载具上） */
    private _deployHeroes(): void {
        this._clearHeroes();
        const count = Math.min(BattleConfig.DEPLOY_HERO_COUNT, HERO_DEFS.length);
        for (let i = 0; i < count; i++) {
            const def = HERO_DEFS[i];
            const heroNode = createUINode('Hero_' + def.id);
            this._unitLayer.addChild(heroNode);
            const slotX = (i - (count - 1) / 2) * BattleConfig.HERO_SLOT_SPACING;
            // 英雄分散站在车尾货厢上（脚底落在车尾条内）
            heroNode.setPosition(slotX, this.vehicleTopY - 40);
            const hero = heroNode.addComponent(Hero);
            hero.init(def);
            this._heroes.push(hero);
        }
        // 图标栏重新绑定新英雄（重开时英雄整体重建）
        this._abilityBar?.rebind(this._heroes);
    }

    private _clearHeroes(): void {
        for (const hero of this._heroes) {
            hero.node.destroy();
        }
        this._heroes.length = 0;
    }

    /** 怪物中心是否已进入屏幕（索敌与击中的统一可见性门槛） */
    private _enemyOnScreen(enemy: Enemy): boolean {
        const ep = enemy.node.position;
        return ep.y < this._visH / 2 + enemy.radius
            && ep.y > -this._visH / 2 - enemy.radius
            && Math.abs(ep.x) < Design.WIDTH / 2 + enemy.radius;
    }

    private _initPools(): void {
        this._enemyPool = new NodePool(
            () => {
                const n = createUINode('Enemy');
                n.addComponent(Enemy);
                return n;
            },
            (n) => n.setScale(1, 1, 1),
        );
        this._bulletPool = new NodePool(
            () => {
                const n = createUINode('Bullet');
                n.addComponent(Bullet);
                return n;
            },
        );
        this._particlePool = new NodePool(
            () => {
                const n = createUINode('HitParticle');
                n.addComponent(HitParticle);
                return n;
            },
            (n) => {
                Tween.stopAllByTarget(n);
            },
        );
        this._dmgPool = new NodePool(
            () => {
                const n = createUINode('DamageNumber');
                n.addComponent(DamageNumber);
                return n;
            },
            (n) => {
                // 飘字有两条 tween（位移+透明度），回池前都要停掉
                Tween.stopAllByTarget(n);
                const opacity = n.getComponent(UIOpacity);
                if (opacity) {
                    Tween.stopAllByTarget(opacity);
                }
            },
        );
        this._gemPool = new NodePool(
            () => {
                const n = createUINode('XpGem');
                n.addComponent(XpGem);
                return n;
            },
        );
    }

    private _startWave(waveNumber: number): void {
        this._waveNumber = waveNumber;
        // 超出配置表后循环最后一波，进入无尽模式
        const idx = Math.min(waveNumber - 1, WAVES.length - 1);
        // 总量/上限保留 ×3；前三波生成密度由 ×2 平滑过渡至 ×3。
        const base = WAVES[idx];
        const scale = BattleConfig.WAVE_SCALE;
        const density = Math.min(scale, 2 + (waveNumber - 1) * 0.5);
        this._currentWave = {
            ...base,
            count: base.count * scale,
            maxAlive: base.maxAlive * scale,
            interval: Math.max(0.28, base.interval / density),
        };
        const overCount = Math.max(0, waveNumber - WAVES.length);
        this._hpScale = Math.pow(BattleConfig.ENDLESS_HP_SCALE, overCount);

        this._spawnLeft = this._currentWave.count;
        this._spawnTimer = BattleConfig.WAVE_START_DELAY;
        this._spawnGroups = 0;
        this._waveCleared = false;

        GameManager.instance.wave = waveNumber;
        eventCenter.emit(GameEvent.WAVE_START, waveNumber, WAVES.length);
    }

    private _hpScale = 1;

    /** 本波怪物池随机取一种 */
    private _pickWaveMonster(): MonsterInfo {
        const pool = this._currentWave.monsters;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /** 刷一组怪（带 packSize 的成群刷新、出生点相邻），返回实际刷出只数 */
    private _spawnGroup(info: MonsterInfo, eliteChance: number): number {
        const pack = Math.max(1, info.packSize ?? 1);
        const baseX = (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH;
        let spawned = 0;
        for (let i = 0; i < pack && this._enemies.length < this._currentWave.maxAlive; i++) {
            // 狗群成员围绕基准横坐标小幅散开，成群感
            const x = pack > 1 ? baseX + (Math.random() * 2 - 1) * 36 : undefined;
            this._spawnEnemy(info, eliteChance, x);
            spawned++;
        }
        return spawned;
    }

    /** 怪物入场：全部垂直下压。顶部为主，道路两侧中段切入（屏内、带缩放提示），疯鹰侧翼上半区入场 */
    private _spawnEnemy(info: MonsterInfo, eliteChance: number, x?: number): void {
        let monster = info;
        if (info.tier === 0 && eliteChance > 0 && Math.random() < eliteChance) {
            monster = { ...info, tier: 1 };
        }

        const node = this._enemyPool.get();
        this._unitLayer.addChild(node);
        const enemy = node.getComponent(Enemy)!;
        enemy.init(monster, this._hpScale);

        const roadsideX = (): number =>
            (Math.random() < 0.5 ? -1 : 1) * (BattleConfig.ROAD_HALF_WIDTH + 36 + Math.random() * 36);
        if (monster.behavior === 'diver') {
            // 疯鹰：两侧翼上半区入场，之后同样垂直下压
            enemy.node.setPosition(roadsideX(), (Math.random() * 0.35 + 0.5) * this._visH);
        } else {
            const roll = Math.random();
            if (roll < 0.7) {
                // 主攻：屏幕上方出现，直着向下压
                enemy.node.setPosition(
                    x ?? (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH,
                    this._visH / 2 + enemy.radius + 15,
                );
            } else if (roll < 0.85) {
                // 道路左侧中段切入（带入场缩放提示，比屏外伏击更近、威胁更大）
                enemy.node.setPosition(
                    -(BattleConfig.ROAD_HALF_WIDTH + 36 + Math.random() * 36),
                    (Math.random() * 0.35 + 0.1) * this._visH,
                );
                node.setScale(0.2, 0.2, 1);
                tween(node).to(0.18, { scale: new Vec3(1, 1, 1) }).start();
            } else {
                // 道路右侧中段切入
                enemy.node.setPosition(
                    BattleConfig.ROAD_HALF_WIDTH + 36 + Math.random() * 36,
                    (Math.random() * 0.35 + 0.1) * this._visH,
                );
                node.setScale(0.2, 0.2, 1);
                tween(node).to(0.18, { scale: new Vec3(1, 1, 1) }).start();
            }
        }
        this._enemies.push(enemy);
    }

    private _hitEnemy(bullet: Bullet, enemy: Enemy, sourceId?: string): void {
        SoundFx.play('hit');
        if (bullet.sourceId === 'radiation') this.corrosionPulse(enemy.node.worldPosition, 20 * this.uiScale, 0.32);
        else if (bullet.sourceId === 'sniper') this.precisionFlash(enemy.node.worldPosition, 5, bullet.specColor);
        else this.burstHitSparks(enemy.node.worldPosition, bullet.specColor, 2);
        const hitPos = enemy.node.position.clone();
        // 伤害统一走 applyDamage：暴击/飘字/死亡/掉落全部收口
        this.applyDamage(this._handleOf(enemy), bullet.damage, bullet.canCrit, sourceId, bullet.slot);
        // 范围爆炸：命中点小范围爆炸（排除被直接命中的目标，避免双重结算）
        if (bullet.boomLevel > 0) {
            const level = bullet.boomLevel;
            const damage = Math.max(1, Math.round(
                bullet.damage * (BOOM_DMG_RATIO + BOOM_DMG_RATIO_STEP * (level - 1)) * bullet.boomDmgMul));
            const radius = (BOOM_RADIUS + BOOM_RADIUS_STEP * (level - 1)) * bullet.boomRangeMul * this.uiScale;
            this.burstBoomFx(enemy.node.worldPosition, radius, bullet.specColor);
            SoundFx.play('boom');
            this.applyAreaDamage(hitPos, radius, damage, sourceId, enemy, bullet.slot);
        }
        // 子弹分裂：命中后分裂出次级自动索敌弹（无目标则扇形裂变飞出）
        if (bullet.splitCount > 0) {
            this._spawnSplitBullets(bullet, hitPos, enemy, sourceId);
        }
        // 次级爆炸：次级子弹命中后小范围爆炸（次级弹自身直接结算，不再二次分裂/爆炸）
        if (bullet.secBoomLevel > 0) {
            const level = bullet.secBoomLevel;
            const damage = Math.max(1, Math.round(
                bullet.damage * (SEC_BOOM_DMG_RATIO + SEC_BOOM_DMG_RATIO_STEP * (level - 1))));
            const radius = (SEC_BOOM_RADIUS + SEC_BOOM_RADIUS_STEP * (level - 1)) * this.uiScale;
            this.burstBoomFx(enemy.node.worldPosition, radius, bullet.specColor);
            SoundFx.play('boom');
            this.applyAreaDamage(hitPos, radius, damage, sourceId, enemy, bullet.slot);
        }
    }

    /** 子弹分裂：优先瞄准命中点附近的敌人；不足时按母弹方向扇形裂变飞出 */
    private _spawnSplitBullets(bullet: Bullet, from: Vec3, hitEnemy: Enemy, sourceId?: string): void {
        const count = bullet.splitCount;
        const spec: ProjectileSpec = {
            damage: Math.max(1, Math.round(bullet.damage * SPLIT_DMG_RATIO * bullet.splitDmgMul)),
            speed: bullet.speed * 0.85,
            radius: Math.max(7, bullet.radius * 0.75),
            color: bullet.specColor,
            pierce: false,
            canCrit: false,
            sourceId,
            slot: bullet.slot,
            // 继承次级爆炸等级；不带穿透/爆炸/分裂，防止递归
            secBoomLevel: bullet.secBoomLevel,
        };
        // 索敌多找 1 个（可能包含被命中的目标本身），再过滤掉——次级弹只打其它目标
        const seekers = this.findTargets(from, SPLIT_SEEK_RANGE * this.uiScale, count + 1)
            .filter(handle => handle.enemy !== hitEnemy);
        const baseAngle = Math.atan2(bullet.dirVec.y, bullet.dirVec.x);
        for (let i = 0; i < count; i++) {
            const handle = seekers[i];
            let dir: Vec3;
            if (handle) {
                dir = new Vec3(handle.enemy.node.position.x - from.x, handle.enemy.node.position.y - from.y);
            } else {
                // 无目标：相对母弹飞行方向对称裂变
                const offset = (i - (count - 1) / 2) * SPLIT_FAN_ANGLE;
                const a = baseAngle + offset;
                dir = new Vec3(Math.cos(a), Math.sin(a));
            }
            // 从母目标身体边缘射出，避免次级弹从怪物中心生成后立刻撞上母目标"闪没"
            const dirLen = dir.length();
            const spawnOffset = hitEnemy.radius * 0.8;
            const spawn = dirLen > 0
                ? new Vec3(from.x + dir.x / dirLen * spawnOffset, from.y + dir.y / dirLen * spawnOffset)
                : from.clone();
            const sec = this.spawnProjectile(spawn, dir, spec);
            // 母目标整体加入次级弹命中黑名单：只攻击其它目标
            sec.markHit(this._handleOf(hitEnemy));
        }
    }

    // ================= 升级三选一 =================

    private _openLevelUp(): void {
        this._paused = true;
        try {
            const options = this._rollCards(3);
            this._panel.show(options, (card) => {
                // try/finally：应用卡片抛异常（如漏导入常量）也不能把游戏软锁死在暂停态
                try {
                    this._applyCard(card);
                } finally {
                    this._paused = false;
                    this._autoCastReadyAt = Math.max(this._autoCastReadyAt,
                        this._elapsed + BattleConfig.LEVEL_UP_CAST_GRACE);
                    // 竞态修复：选卡暂停期间载具被打空（gameOver 已置位）——
                    // 不恢复战斗，重新把护送失败面板顶到最前，避免"点卡后世界定格"的假死
                    if (this._gameOver) {
                        this._paused = true;
                        this._awardRunGold();
        eventCenter.emit(GameEvent.GAME_OVER);
                    }
                }
            });
        } catch (e) {
            // 兜底：卡池/面板构建异常时放弃本次升级并恢复战斗，绝不把游戏定格在暂停态
            this._paused = false;
            console.error('[BattleManager] openLevelUp failed:', e);
        }
    }

    /** 按 heroId 找到英雄并应用升级（卡片是纯数据，不持有英雄组件） */
    private _applyCard(card: CardOption): void {
        const hero = this._heroes.find(h => h.def.id === card.heroId);
        if (hero) {
            hero.applyUpgrade(card.upgradeId);
        }
    }

    /** 从「上阵英雄 × 强化项」组合中随机抽 count 张；已满级的能力卡不入池 */
    private _rollCards(count: number): CardOption[] {
        const statIds: Array<'atk' | 'rate' | 'range'> = ['atk', 'rate', 'range'];
        const abilityIds: Array<'skill' | 'ultimate'> = ['skill', 'ultimate'];
        const pool: CardOption[] = [];
        for (const hero of this._heroes) {
            for (const id of statIds) {
                pool.push(makeCardOption(hero.def.id, id));
            }
            // 普攻增益：连射（全员，激光手=多目标光束）+ 其余弹体机制（追踪光束无子弹语义，激光手不入池）
            const basicCaps: Array<[HeroUpgradeId, number]> = [
                ['multishot', BASIC_ENHANCE_MAX],
                ['volley', BASIC_ENHANCE_MAX],
                ['pierce', PIERCE_PLUS_MAX],
                ['boom', BOOM_MAX],
                ['split', SPLIT_MAX],
                ['splitMore', SPLIT_MORE_MAX],
                ['boomRange', BOOM_RANGE_MAX],
                ['boomDmg', BOOM_DMG_UP_MAX],
                ['splitDmg', SPLIT_DMG_UP_MAX],
                ['secBoom', SEC_BOOM_MAX],
            ];
            // 进阶卡的解锁前提：对应基础增益至少 1 层才会进入卡池
            const basicPrereq: Partial<Record<HeroUpgradeId, HeroUpgradeId>> = {
                splitMore: 'split',
                splitDmg: 'split',
                boomRange: 'boom',
                boomDmg: 'boom',
                secBoom: 'split',
            };
            for (const [id, cap] of basicCaps) {
                if (hero.def.weapon === 'laser' && id !== 'multishot') {
                    continue;
                }
                const prereq = basicPrereq[id];
                if (prereq && hero.upgradeLevel(prereq) < 1) {
                    continue;
                }
                const stacks = hero.upgradeLevel(id);
                if (stacks < cap) {
                    pool.push(makeCardOption(hero.def.id, id, stacks));
                }
            }
            for (const id of abilityIds) {
                const level = hero.upgradeLevel(id);
                if (level < ABILITY_MAX_LEVEL) {
                    pool.push(makeCardOption(hero.def.id, id, level));
                }
            }
        }
        // 洗牌取前 count
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, count);
    }

    private _restart(): void {
        for (const fx of this._mortarFx) fx.reset();
        // Also remove legacy fallback particles belonging to the previous battle.
        for (const child of [...this._fxLayer.children]) {
            if (child.getComponent(HitParticle)) this._particlePool.put(child);
        }
        for (const e of this._enemies) {
            this._enemyPool.put(e.node);
        }
        this._enemies.length = 0;
        for (const b of this._bullets) {
            this._bulletPool.put(b.node);
        }
        this._bullets.length = 0;

        this._gameOver = false;
        this._paused = false;
        this._runActive = false;
        this._elapsed = 0;
        this._autoCastReadyAt = 0;
        this._dmgByHero.clear();
        this._dmgBySlot.clear();
        this._delayed.length = 0;
        this._panel.node.active = false;
        GameManager.instance.resetRun();
        this._vehicle.resetState();
        this._deployHeroes();
        // GM 号位开关跨重开保留：重新部署后回填到新英雄，便于反复测试
        this._heroes.forEach((hero, i) => {
            hero.gmSetNoSkillCooldown(this._gmNoSkillCd[i] ?? false);
            hero.gmSetInfUltimate(this._gmInfUlt[i] ?? false);
        });
        eventCenter.emit(GameEvent.XP_CHANGED, 0, GameManager.instance.xpToNext(1), 1);
    }

    /** 路面滚动层：虚线不断下移，营造载具向前开的感觉（暂停时冻结） */
    private _initScrollBg(): void {
        this._bgScroll = createUINode('BgScroll');
        this._worldLayer.addChild(this._bgScroll);
        const g = this._bgScroll.addComponent(Graphics);
        g.fillColor = Palette.lane;
        const tile = 640;
        for (let y = -3 * tile; y <= 2 * tile; y += tile / 4) {
            g.rect(-8, y, 16, 80);
        }
        g.fill();
    }

    /** 路面滚动：有美术路面时滚双镜像节点（无缝循环），否则退回代码虚线层 */
    private _scrollBg(dt: number): void {
        const speed = BattleConfig.ROAD_SCROLL_SPEED * dt;
        if (this._bgArtApplied) {
            const h = this._bgArtH;
            for (const n of [this._bgArtA, this._bgArtB]) {
                let y = n.position.y - speed;
                // 顶边刚离开屏幕底就回卷到上方（晚了会露出画面空档）
                if (y <= -h) {
                    y += h * 2;
                }
                n.setPosition(0, y);
            }
            return;
        }
        const tile = 640;
        let y = this._bgScroll.position.y - speed;
        if (y <= -tile) {
            y += tile;
        }
        this._bgScroll.setPosition(0, y);
    }

    /** 美术路面就绪后替换代码背景：上下两张镜像 Sprite 循环滚动，压在所有节点最底层 */
    private _applyRoadArt(): void {
        const frame = AssetLib.frame('scenes/road');
        if (!frame) {
            return;
        }
        this._bgArtApplied = true;
        const H = this._visH;
        const rect = frame.rect;
        // 等比缩放：高度铺满屏幕，宽度不足 720 时才按宽度铺（另一维度超出屏幕裁掉，不拉伸变形）
        let w = Design.WIDTH;
        let h = rect.height * (w / rect.width);
        if (h < H) {
            h = H;
            w = rect.width * (h / rect.height);
        }
        this._bgArtH = h;
        const mk = (y: number, flip: boolean): Node => {
            const n = createUINode('RoadArt');
            this.node.addChild(n);
            n.setSiblingIndex(0);
            n.setPosition(0, y);
            if (flip) {
                n.setScale(1, -1, 1);
            }
            const ut = n.addComponent(UITransform);
            const sp = n.addComponent(Sprite);
            // 先设 CUSTOM 再赋 spriteFrame：默认 TRIMMED 会在赋图时把节点尺寸重置为图片原始尺寸
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            sp.spriteFrame = frame;
            ut.setContentSize(w, h);
            return n;
        };
        // A 占屏幕，B 在其上方垂直翻转（镜像）：接缝两侧互为镜像，无缝
        this._bgArtA = mk(0, false);
        this._bgArtB = mk(h, true);
        // 有美术路面后关闭代码绘制的车道虚线（图里自带标线）
        if (this._bgScroll) {
            this._bgScroll.active = false;
        }
    }

    /** 占位背景：底色（车道虚线在滚动层 _bgScroll 上，营造前进感） */
    private _drawBackground(): void {
        const g = this.node.addComponent(Graphics);
        g.fillColor = Palette.bg;
        g.rect(-Design.WIDTH / 2, -this._visH, Design.WIDTH, this._visH * 2);
        g.fill();
    }
}
