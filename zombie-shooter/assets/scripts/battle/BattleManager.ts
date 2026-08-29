import { _decorator, Component, Graphics, Node, Sprite, Tween, tween, UIOpacity, UITransform, Vec3, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { NodePool } from '../core/NodePool';
import { createUINode } from '../core/createUINode';
import { AssetLib } from '../core/AssetLib';
import { GameManager } from '../core/GameManager';
import { Hero } from './Hero';
import { Bullet, ProjectileSpec } from './Bullet';
import { Enemy } from './Enemy';
import { DamageNumber } from './DamageNumber';
import { XpGem } from './XpGem';
import { Vehicle } from './Vehicle';
import { ABILITY_MAX_LEVEL, HERO_DEFS } from './HeroDef';
import { CardOption, makeCardOption } from './UpgradeCard';
import { HUD } from '../ui/HUD';
import { LevelUpPanel } from '../ui/LevelUpPanel';
import { GmPanel } from '../ui/GmPanel';
import { AbilityBar } from '../ui/AbilityBar';
import { MonsterInfo, WaveInfo, WAVES, MONSTERS } from './WaveData';

/**
 * 《末日航线》战斗总控：
 * 部署运输载具与上阵英雄、四方向刷怪、子弹×怪物结算、经验拾取与升级三选一、胜负流程。
 * 场景中不摆放任何业务节点，全部由 Boot 挂载本组件后动态创建。
 */
export interface EnemyHandle {
    enemy: Enemy;
    spawnId: number;
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
    private _gemPool: NodePool = null!;

    private _hud: HUD = null!;
    private _panel: LevelUpPanel = null!;
    private _abilityBar: AbilityBar = null!;

    private _waveNumber = 0;
    private _currentWave: WaveInfo = null!;
    private _spawnLeft = 0;
    private _spawnTimer = 0;
    private _waveCleared = false;
    private _restTimer = 0;

    private _gameOver = false;
    /** 升级选卡期间暂停整个战斗（各实体 update 自行检查） */
    private _paused = false;
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
    /** 路面滚动层（下移=载具前进感） */
    private _bgScroll: Node = null!;
    /** 美术路面滚动节点（上下两张镜像衔接，无缝循环） */
    private _bgArtA: Node = null!;
    private _bgArtB: Node = null!;
    private _bgArtApplied = false;

    get isGameOver(): boolean { return this._gameOver; }
    get isPaused(): boolean { return this._paused; }
    /** 战斗用时（HUD 计时显示） */
    get elapsed(): number { return this._elapsed; }
    /** 车尾条的上沿 Y：怪物追到这条线就啃咬载具 */
    get vehicleTopY(): number { return -this._visH / 2 + BattleConfig.VEHICLE_STRIP_HEIGHT; }
    /** 经验晶体的拾取点（车尾中央） */
    get vehiclePos(): Vec3 { return new Vec3(0, this.vehicleTopY); }

    onLoad(): void {
        BattleManager.instance = this;
        eventCenter.on(GameEvent.GAME_RESTART, this._restart, this);
        this._visH = view.getVisibleSize().height;
        this._drawBackground();
        this._initScrollBg();
        this._initPools();
    }

    onDestroy(): void {
        eventCenter.off(GameEvent.GAME_RESTART, this._restart, this);
        if (BattleManager.instance === this) {
            BattleManager.instance = null!;
        }
        this._enemyPool?.clear();
        this._bulletPool?.clear();
        this._dmgPool?.clear();
        this._gemPool?.clear();
    }

    start(): void {
        this._deployVehicle();
        this._deployHeroes();

        const hudNode = createUINode('HUD');
        this.node.addChild(hudNode);
        this._hud = hudNode.addComponent(HUD);

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
        this._startWave(1);
    }

    update(dt: number): void {
        if (this._gameOver || this._paused) {
            return;
        }
        dt *= this._timeScale;
        this._elapsed += dt;
        if (!this._bgArtApplied) {
            this._applyRoadArt();
        }
        this._scrollBg(dt);

        // ---- 刷怪流程 ----
        if (this._spawnLeft > 0) {
            this._spawnTimer -= dt;
            if (this._spawnTimer <= 0 && this._enemies.length < this._currentWave.maxAlive) {
                this._spawnTimer = this._currentWave.interval;
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
                    if (!bullet.pierce) {
                        this.recycleBullet(bullet);
                        break;
                    }
                    bullet.markHit(this._handleOf(enemy));
                }
            }
        }
    }

    // ================= 对外接口（供 Hero/Enemy/Bullet/XpGem 调用） =================

    /** 返回射程内最近且已入屏的敌人句柄。 */
    findTarget(from: Vec3, range: number): EnemyHandle | null {
        return this.findTargets(from, range, 1)[0] ?? null;
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

    spawnProjectile(fromPos: Vec3, dir: Vec3, spec: ProjectileSpec): void {
        const node = this._bulletPool.get();
        this.node.addChild(node);
        node.setPosition(fromPos.x, fromPos.y);
        const bullet = node.getComponent(Bullet)!;
        bullet.init(dir, spec);
        this._bullets.push(bullet);
    }

    /** 所有战斗伤害的唯一入口。sourceId=伤害来源英雄 id（击杀充能归属） */
    applyDamage(handle: EnemyHandle | null, baseDamage: number, canCrit = false, sourceId?: string): boolean {
        if (!this.isEnemyHandleValid(handle)) {
            return false;
        }
        const crit = canCrit && Math.random() < BattleConfig.CRIT_CHANCE;
        const damage = Math.max(1, Math.round(baseDamage * (crit ? BattleConfig.CRIT_MULTI : 1)));
        const enemy = handle.enemy;
        this.spawnDamageNumber(enemy.node.worldPosition, damage, crit);
        if (enemy.takeDamage(damage)) {
            this.killEnemy(enemy, sourceId);
        }
        return true;
    }

    applyAreaDamage(center: Vec3, radius: number, damage: number, sourceId?: string): number {
        const radiusSq = radius * radius;
        const targets = this._enemies
            .filter(enemy => {
                if (!this._enemyOnScreen(enemy) || enemy.hp <= 0) {
                    return false;
                }
                const ep = enemy.node.position;
                const dx = ep.x - center.x;
                const dy = ep.y - center.y;
                return dx * dx + dy * dy <= radiusSq;
            })
            .map(enemy => this._handleOf(enemy));
        for (const target of targets) {
            this.applyDamage(target, damage, false, sourceId);
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

    /** 怪物抵达载具：啃咬一口耐久后消失（不掉落经验） */
    onEnemyReachVehicle(enemy: Enemy): void {
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
        this.node.addChild(gemNode);
        gemNode.setWorldPosition(enemy.node.worldPosition);
        const gem = gemNode.getComponent(XpGem)!;
        gem.init();

        // 尸体回池（漏掉会导致死亡节点常驻场景树）
        this._enemyPool.put(enemy.node);
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

    spawnDamageNumber(worldPos: Vec3, value: number, crit: boolean): void {
        const node = this._dmgPool.get();
        this.node.addChild(node);
        node.setWorldPosition(worldPos.x + (Math.random() * 2 - 1) * 36, worldPos.y + 20, 0);
        const dmg = node.getComponent(DamageNumber)!;
        dmg.play(
            String(value),
            crit ? Palette.crit : Palette.damage,
            crit ? 1.35 : 1,
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
        this.node.addChild(vehicleNode);
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
            this.node.addChild(heroNode);
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
        this._currentWave = WAVES[idx];
        const overCount = Math.max(0, waveNumber - WAVES.length);
        this._hpScale = Math.pow(BattleConfig.ENDLESS_HP_SCALE, overCount);

        this._spawnLeft = this._currentWave.count;
        this._spawnTimer = 0.3;
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

    /** 刷一组怪（带 packSize 的成群刷新、共享车道），返回实际刷出只数 */
    private _spawnGroup(info: MonsterInfo, eliteChance: number): number {
        const pack = Math.max(1, info.packSize ?? 1);
        const baseLane = (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH;
        let spawned = 0;
        for (let i = 0; i < pack && this._enemies.length < this._currentWave.maxAlive; i++) {
            // 狗群成员围绕基准车道小幅散开，成群感
            const lane = pack > 1 ? baseLane + (Math.random() * 2 - 1) * 36 : undefined;
            this._spawnEnemy(info, eliteChance, lane);
            spawned++;
        }
        return spawned;
    }

    /** 怪物入场：疯鹰从两侧翼俯冲入场，其余主要从上方追车、少量侧伏 */
    private _spawnEnemy(info: MonsterInfo, eliteChance: number, laneX?: number): void {
        let monster = info;
        if (info.tier === 0 && eliteChance > 0 && Math.random() < eliteChance) {
            monster = { ...info, tier: 1 };
        }

        const node = this._enemyPool.get();
        this.node.addChild(node);
        const enemy = node.getComponent(Enemy)!;
        enemy.init(monster, this._hpScale, laneX);

        const halfW = Design.WIDTH / 2;
        if (monster.behavior === 'diver') {
            // 疯鹰：左右侧翼上半区入场，斜线俯冲车尾
            const side = Math.random() < 0.5 ? -1 : 1;
            enemy.node.setPosition(side * (halfW + enemy.radius + 10), (Math.random() * 0.35 + 0.5) * this._visH);
        } else {
            const roll = Math.random();
            if (roll < 0.6) {
                // 主攻：屏幕上方出现，追着向前开的车尾跑
                enemy.node.setPosition(
                    (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH,
                    this._visH / 2 + enemy.radius + 10,
                );
            } else if (roll < 0.725) {
                // 少量左侧屏外伏击（上半区入场，抄近路少走一段距离）
                enemy.node.setPosition(-halfW - enemy.radius - 10, (Math.random() * 0.5 + 0.35) * this._visH);
            } else if (roll < 0.85) {
                // 少量右侧屏外伏击
                enemy.node.setPosition(halfW + enemy.radius + 10, (Math.random() * 0.5 + 0.35) * this._visH);
            } else {
                // 道路两侧中段切入：在路面边缘、屏幕中段直接现身（比屏外伏击更近，威胁更大）
                // 带入场缩放提示，避免凭空出现的突兀感
                const side = Math.random() < 0.5 ? -1 : 1;
                enemy.node.setPosition(
                    side * (BattleConfig.ROAD_HALF_WIDTH + 24 + Math.random() * 24),
                    (Math.random() * 0.35 + 0.1) * this._visH,
                );
                node.setScale(0.2, 0.2, 1);
                tween(node).to(0.18, { scale: new Vec3(1, 1, 1) }).start();
            }
        }
        this._enemies.push(enemy);
    }

    private _hitEnemy(bullet: Bullet, enemy: Enemy, sourceId?: string): void {
        // 伤害统一走 applyDamage：暴击/飘字/死亡/掉落全部收口
        this.applyDamage(this._handleOf(enemy), bullet.damage, bullet.canCrit, sourceId);
    }

    // ================= 升级三选一 =================

    private _openLevelUp(): void {
        this._paused = true;
        const options = this._rollCards(3);
        this._panel.show(options, (card) => {
            this._applyCard(card);
            this._paused = false;
        });
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
        this._elapsed = 0;
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
        this._startWave(1);
    }

    /** 路面滚动层：虚线不断下移，营造载具向前开的感觉（暂停时冻结） */
    private _initScrollBg(): void {
        this._bgScroll = createUINode('BgScroll');
        this.node.addChild(this._bgScroll);
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
            const H = this._visH;
            for (const n of [this._bgArtA, this._bgArtB]) {
                let y = n.position.y - speed;
                if (y <= -H * 1.5) {
                    y += H * 2;
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
        const mk = (y: number, flip: boolean): Node => {
            const n = createUINode('RoadArt');
            this.node.addChild(n);
            n.setSiblingIndex(0);
            n.setPosition(0, y);
            if (flip) {
                n.setScale(1, -1, 1);
            }
            n.addComponent(UITransform).setContentSize(Design.WIDTH, H);
            const sp = n.addComponent(Sprite);
            sp.spriteFrame = frame;
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            return n;
        };
        // A 占屏幕，B 在其上方垂直翻转（镜像）：B 的顶边=A 的顶边镜像，接缝无缝
        this._bgArtA = mk(0, false);
        this._bgArtB = mk(H, true);
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
