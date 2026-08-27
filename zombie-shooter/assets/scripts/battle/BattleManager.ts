import { _decorator, Component, Graphics, Node, Tween, UIOpacity, Vec3, view } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, Design, GameEvent, Palette } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { NodePool } from '../core/NodePool';
import { createUINode } from '../core/createUINode';
import { GameManager } from '../core/GameManager';
import { Hero } from './Hero';
import { Bullet } from './Bullet';
import { Enemy } from './Enemy';
import { DamageNumber } from './DamageNumber';
import { XpGem } from './XpGem';
import { Vehicle } from './Vehicle';
import { HERO_DEFS, HeroDef } from './HeroDef';
import { CardOption, makeCardOption } from './UpgradeCard';
import { HUD } from '../ui/HUD';
import { LevelUpPanel } from '../ui/LevelUpPanel';
import { MonsterInfo, WaveInfo, WAVES } from './WaveData';

/**
 * 《末日航线》战斗总控：
 * 部署运输载具与上阵英雄、四方向刷怪、子弹×怪物结算、经验拾取与升级三选一、胜负流程。
 * 场景中不摆放任何业务节点，全部由 Boot 挂载本组件后动态创建。
 */
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

    private _waveNumber = 0;
    private _currentWave: WaveInfo = null!;
    private _spawnLeft = 0;
    private _spawnTimer = 0;
    private _waveCleared = false;
    private _restTimer = 0;

    private _gameOver = false;
    /** 升级选卡期间暂停整个战斗（各实体 update 自行检查） */
    private _paused = false;
    private _elapsed = 0;
    private _visH = Design.HEIGHT;
    /** 路面滚动层（下移=载具前进感） */
    private _bgScroll: Node = null!;

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

        GameManager.instance.load();
        this._startWave(1);
    }

    update(dt: number): void {
        if (this._gameOver || this._paused) {
            return;
        }
        this._elapsed += dt;
        this._scrollBg(dt);

        // ---- 刷怪流程 ----
        if (this._spawnLeft > 0) {
            this._spawnTimer -= dt;
            if (this._spawnTimer <= 0 && this._enemies.length < this._currentWave.maxAlive) {
                this._spawnTimer = this._currentWave.interval;
                this._spawnLeft--;
                this._spawnEnemy(this._currentWave.monster, this._currentWave.eliteChance);
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
                if (bullet.hasHit(enemy)) {
                    continue;
                }
                const ep = enemy.node.position;
                const dx = bp.x - ep.x;
                const dy = bp.y - ep.y;
                const rr = bullet.radius + enemy.radius;
                if (dx * dx + dy * dy <= rr * rr) {
                    this._hitEnemy(bullet, enemy);
                    if (!bullet.pierce) {
                        this.recycleBullet(bullet);
                        break;
                    }
                    bullet.markHit(enemy);
                }
            }
        }
    }

    // ================= 对外接口（供 Hero/Enemy/Bullet/XpGem 调用） =================

    /**
     * 索敌：返回射程内离 from 最近、且已进入屏幕的敌人；没有则返回 null。
     * 各英雄自动瞄准与"射程内才开火"都依赖这里。
     */
    findTarget(from: Vec3, range: number): Enemy | null {
        let best: Enemy = null!;
        let bestDistSq = range * range;
        for (const enemy of this._enemies) {
            if (!this._enemyOnScreen(enemy)) {
                continue;
            }
            const ep = enemy.node.position;
            const dx = ep.x - from.x;
            const dy = ep.y - from.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= bestDistSq) {
                bestDistSq = distSq;
                best = enemy;
            }
        }
        return best;
    }

    /** 该怪物是否仍在场上：激光锁定等缓存引用的有效性以此为准（回池/死亡即为否） */
    isEnemyInBattle(enemy: Enemy): boolean {
        return this._enemies.indexOf(enemy) >= 0;
    }

    spawnBullet(fromPos: Vec3, dir: Vec3, def: HeroDef): void {
        const node = this._bulletPool.get();
        this.node.addChild(node);
        node.setPosition(fromPos.x, fromPos.y);
        const bullet = node.getComponent(Bullet)!;
        bullet.init(this._heroAtkOf(def), dir, def);
        this._bullets.push(bullet);
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

    /** 击杀结算：掉落经验晶体（激光等直伤武器也会调用） */
    killEnemy(enemy: Enemy): void {
        const idx = this._enemies.indexOf(enemy);
        if (idx < 0) {
            return;
        }
        this._enemies.splice(idx, 1);
        GameManager.instance.kills++;
        GameManager.instance.totalKills++;
        eventCenter.emit(GameEvent.ENEMY_DEAD, GameManager.instance.kills);

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
    }

    private _clearHeroes(): void {
        for (const hero of this._heroes) {
            hero.node.destroy();
        }
        this._heroes.length = 0;
    }

    /** 子弹伤害直接取英雄当前 atk（含卡片强化） */
    private _heroAtkOf(def: HeroDef): number {
        const hero = this._heroes.find(h => h.def === def);
        return hero ? hero.atk : def.atk;
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

    /** 怪物按权重从四个方向入场：前方(追头)/两侧(伏击)/后方(追赶) */
    private _spawnEnemy(info: MonsterInfo, eliteChance: number): void {
        let monster = info;
        if (info.tier === 0 && eliteChance > 0 && Math.random() < eliteChance) {
            monster = { ...info, tier: 1 };
        }

        const node = this._enemyPool.get();
        this.node.addChild(node);
        const enemy = node.getComponent(Enemy)!;
        enemy.init(monster, this._hpScale);

        const halfW = Design.WIDTH / 2;
        const roll = Math.random();
        if (roll < 0.75) {
            // 主攻：屏幕上方出现，追着向前开的车尾跑
            enemy.node.setPosition(
                (Math.random() * 2 - 1) * BattleConfig.ROAD_HALF_WIDTH,
                this._visH / 2 + enemy.radius + 10,
            );
        } else if (roll < 0.875) {
            // 少量左侧伏击（上半区入场，抄近路少走一段距离）
            enemy.node.setPosition(-halfW - enemy.radius - 10, (Math.random() * 0.5 + 0.35) * this._visH);
        } else {
            // 少量右侧伏击
            enemy.node.setPosition(halfW + enemy.radius + 10, (Math.random() * 0.5 + 0.35) * this._visH);
        }
        this._enemies.push(enemy);
    }

    private _hitEnemy(bullet: Bullet, enemy: Enemy): void {
        const crit = Math.random() < BattleConfig.CRIT_CHANCE;
        const dmg = Math.round(bullet.atk * (crit ? BattleConfig.CRIT_MULTI : 1));
        this.spawnDamageNumber(enemy.node.worldPosition, dmg, crit);

        if (enemy.takeDamage(dmg)) {
            this.killEnemy(enemy);
        }
    }

    // ================= 升级三选一 =================

    private _openLevelUp(): void {
        this._paused = true;
        const options = this._rollCards(3);
        this._panel.show(options, (card) => {
            card.hero.applyBuff(card.type);
            this._paused = false;
        });
    }

    /** 从「上阵英雄 × 强化类型」组合中随机抽 count 张 */
    private _rollCards(count: number): CardOption[] {
        const types: Array<'atk' | 'rate' | 'range'> = ['atk', 'rate', 'range'];
        const pool: CardOption[] = [];
        for (const hero of this._heroes) {
            for (const type of types) {
                pool.push(makeCardOption(hero, type));
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

    private _scrollBg(dt: number): void {
        const tile = 640;
        let y = this._bgScroll.position.y - BattleConfig.ROAD_SCROLL_SPEED * dt;
        if (y <= -tile) {
            y += tile;
        }
        this._bgScroll.setPosition(0, y);
    }

    /** 占位背景：底色（车道虚线在滚动层 _bgScroll 上，营造前进感） */
    private _drawBackground(): void {
        const g = this.node.addComponent(Graphics);
        g.fillColor = Palette.bg;
        g.rect(-Design.WIDTH / 2, -this._visH, Design.WIDTH, this._visH * 2);
        g.fill();
    }
}
