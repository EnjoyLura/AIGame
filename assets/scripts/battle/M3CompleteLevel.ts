import {
    _decorator,
    Color,
    Component,
    Graphics,
    HorizontalTextAlignment,
    Label,
    Node,
    profiler,
    ResolutionPolicy,
    UITransform,
    VerticalTextAlignment,
    view,
} from 'cc';
import { EnemyDefinition, EnemyId, M3_LEVEL_CONFIG, SupportDefinition, UpgradeDefinition, WaveDefinition } from './M3LevelData';
import { HeroDefinition, M4_HERO_ROSTER } from './M4HeroData';

const { ccclass, property } = _decorator;

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;
const HEADER_HEIGHT = 94;
const BATTLE_TOP = DESIGN_HEIGHT / 2 - HEADER_HEIGHT;
const BATTLE_BOTTOM = DESIGN_HEIGHT / 2 - DESIGN_HEIGHT * 0.8;
const DEFENSE_LINE = BATTLE_BOTTOM + 24;

const COLOR = {
    header: new Color(25, 35, 36, 255),
    battlefield: new Color(48, 74, 61, 255),
    battlefieldGrid: new Color(69, 98, 78, 180),
    defense: new Color(32, 42, 45, 255),
    vehicle: new Color(181, 91, 42, 255),
    vehicleTrim: new Color(226, 151, 67, 255),
    action: new Color(217, 115, 44, 255),
    energy: new Color(57, 185, 190, 255),
    warning: new Color(199, 65, 57, 255),
    text: new Color(242, 244, 235, 255),
    mutedText: new Color(178, 194, 180, 255),
    overlay: new Color(13, 20, 22, 225),
    projectile: new Color(249, 224, 117, 255),
    success: new Color(104, 176, 103, 255),
    card: new Color(44, 62, 56, 255),
    cardBorder: new Color(114, 145, 120, 255),
    xp: new Color(111, 202, 190, 255),
};

type BattleState = 'running' | 'paused' | 'upgrade' | 'won' | 'lost';
type ProjectileKind = 'normal' | 'skill';

interface Enemy {
    definition: EnemyDefinition;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    active: boolean;
    slowUntil: number;
}

interface Projectile {
    x: number;
    y: number;
    damage: number;
    target: Enemy | null;
    kind: ProjectileKind;
    heroIndex: number;
    speed: number;
    active: boolean;
}

interface SpawnTask {
    wave: WaveDefinition;
    remaining: number;
    nextAt: number;
}

interface Effect {
    x: number;
    y: number;
    radius: number;
    ttl: number;
    maxTtl: number;
    color: Color;
}

interface HeroRuntime {
    definition: HeroDefinition;
    normalDamage: number;
    normalInterval: number;
    normalTimer: number;
    projectileSpeed: number;
    projectiles: number;
    skillDamage: number;
    skillCooldown: number;
    skillTargets: number;
    skillRemaining: number;
    ultimateDamage: number;
    ultimateCharge: number;
    ultimateMaxCharge: number;
    ultimateChargePerKill: number;
    ultimateChargePerSecond: number;
}

interface BattleStats {
    kills: number;
    eliteKills: number;
    bossKills: number;
    damage: number;
    vehicleDamage: number;
    skillCasts: number;
    ultimateCasts: number;
    supportCasts: number;
    upgrades: number;
    maxEnemyCount: number;
}

@ccclass('M3CompleteLevel')
export class M3CompleteLevel extends Component {
    @property
    fixedSeed = M3_LEVEL_CONFIG.fixedSeed;

    private root: Node | null = null;
    private graphics: Graphics | null = null;
    private restartZone: Node | null = null;
    private upgradeZones: Node[] = [];
    private pauseLabel: Label | null = null;
    private speedLabel: Label | null = null;
    private autoLabel: Label | null = null;
    private phaseLabel: Label | null = null;
    private timerLabel: Label | null = null;
    private xpLabel: Label | null = null;
    private hpLabel: Label | null = null;
    private skillLabels: Label[] = [];
    private ultimateLabels: Label[] = [];
    private supportLabels: Label[] = [];
    private bossLabel: Label | null = null;
    private stateLabel: Label | null = null;
    private resultStatsLabel: Label | null = null;
    private restartLabel: Label | null = null;
    private upgradeTitleLabel: Label | null = null;
    private upgradeCardLabels: Label[] = [];
    private elapsed = 0;
    private speed = 1;
    private autoEnabled = true;
    private state: BattleState = 'running';
    private vehicleHp = M3_LEVEL_CONFIG.vehicleHp;
    private xp = 0;
    private xpToNext = M3_LEVEL_CONFIG.xp.firstLevel;
    private level = 1;
    private randomState = M3_LEVEL_CONFIG.fixedSeed;
    private startedWaves = new Set<number>();
    private readonly spawnTasks: SpawnTask[] = [];
    private readonly enemies: Enemy[] = [];
    private readonly projectiles: Projectile[] = [];
    private readonly effects: Effect[] = [];
    private readonly enemyPool: Enemy[] = [];
    private readonly projectilePool: Projectile[] = [];
    private readonly effectPool: Effect[] = [];
    private supportRemaining = [0, 0];
    private currentUpgrades: UpgradeDefinition[] = [];
    private currentUpgradeHeroIndex = 0;
    private squad = this.createHeroRuntimes();
    private hero = this.squad[0];
    private stats: BattleStats = this.createStats();

    protected onLoad(): void {
        profiler.hideStats();
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_WIDTH);
        this.resetBattle();
        this.rebuild();
        this.bindControls();
        this.refreshLabels();
        this.redraw();
    }

    protected onDestroy(): void {
        this.enemies.length = 0;
        this.projectiles.length = 0;
        this.effects.length = 0;
    }

    protected update(deltaTime: number): void {
        if (this.state !== 'running') {
            return;
        }

        const scaledDelta = Math.min(deltaTime, 0.1) * this.speed;
        this.elapsed += scaledDelta;
        for (const hero of this.squad) {
            hero.normalTimer += scaledDelta;
            hero.skillRemaining = Math.max(0, hero.skillRemaining - scaledDelta);
            hero.ultimateCharge = Math.min(
                hero.ultimateMaxCharge,
                hero.ultimateCharge + hero.ultimateChargePerSecond * scaledDelta,
            );
        }
        this.supportRemaining = this.supportRemaining.map((remaining) => Math.max(0, remaining - scaledDelta));

        this.startScheduledWaves();
        this.spawnScheduledEnemies();
        this.fireAutomaticAttacks();
        this.moveProjectiles(scaledDelta);
        this.moveEnemies(scaledDelta);
        this.updateEffects(scaledDelta);
        this.stats.maxEnemyCount = Math.max(this.stats.maxEnemyCount, this.enemies.length);

        if (this.vehicleHp <= 0) {
            this.finish('lost');
        } else if (this.elapsed >= M3_LEVEL_CONFIG.duration && !this.hasPendingThreats()) {
            this.finish('won');
        }

        this.refreshLabels();
        this.redraw();
    }

    private createHeroRuntimes(): HeroRuntime[] {
        return M4_HERO_ROSTER.map((definition) => this.createHeroRuntime(definition));
    }

    private createHeroRuntime(definition: HeroDefinition): HeroRuntime {
        return {
            definition,
            normalDamage: definition.normalDamage,
            normalInterval: definition.normalInterval,
            normalTimer: 0,
            projectileSpeed: M3_LEVEL_CONFIG.hero.projectileSpeed,
            projectiles: definition.normalProjectiles,
            skillDamage: definition.skillDamage,
            skillCooldown: definition.skillCooldown,
            skillTargets: definition.skillTargets,
            skillRemaining: 1.5,
            ultimateDamage: definition.ultimateDamage,
            ultimateCharge: 0,
            ultimateMaxCharge: M3_LEVEL_CONFIG.hero.ultimateMaxCharge,
            ultimateChargePerKill: definition.ultimateChargePerKill,
            ultimateChargePerSecond: definition.ultimateChargePerSecond,
        };
    }

    private createStats(): BattleStats {
        return {
            kills: 0,
            eliteKills: 0,
            bossKills: 0,
            damage: 0,
            vehicleDamage: 0,
            skillCasts: 0,
            ultimateCasts: 0,
            supportCasts: 0,
            upgrades: 0,
            maxEnemyCount: 0,
        };
    }

    private resetBattle(): void {
        this.elapsed = 0;
        this.speed = 1;
        this.autoEnabled = true;
        this.state = 'running';
        this.vehicleHp = M3_LEVEL_CONFIG.vehicleHp;
        this.xp = 0;
        this.xpToNext = M3_LEVEL_CONFIG.xp.firstLevel;
        this.level = 1;
        this.randomState = this.fixedSeed || M3_LEVEL_CONFIG.fixedSeed;
        this.startedWaves.clear();
        this.spawnTasks.length = 0;
        this.currentUpgrades = [];
        this.supportRemaining = [0, 0];
        this.squad = this.createHeroRuntimes();
        this.hero = this.squad[0];
        this.stats = this.createStats();
        this.recycleAllEntities();
    }

    private rebuild(): void {
        this.root?.destroy();
        this.root = new Node('M3CompleteLevelRoot');
        this.root.parent = this.node;
        this.root.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.graphics = this.root.addComponent(Graphics);

        this.addStaticLabels();
        this.pauseLabel = this.addText('暂停', -320, 390, 16, COLOR.text, 72);
        this.speedLabel = this.addText('x1', -320, 290, 18, COLOR.text, 72);
        this.autoLabel = this.addText('AUTO', -320, 190, 13, COLOR.text, 76);
        this.phaseLabel = this.addText('', 0, 642, 19, COLOR.text, 480);
        this.timerLabel = this.addText('', 0, 600, 19, COLOR.mutedText, 480);
        this.xpLabel = this.addText('', 0, -372, 16, COLOR.xp, 300);
        this.hpLabel = this.addText('', 0, BATTLE_BOTTOM - 22, 18, COLOR.text, 300);
        const heroPositions = [-225, -75, 75, 225];
        for (let index = 0; index < this.squad.length; index += 1) {
            const x = heroPositions[index];
            this.addText(this.squad[index].definition.name, x, -585, 16, COLOR.text, 126);
            this.skillLabels.push(this.addText('', x - 36, -468, 12, COLOR.text, 50, 40));
            this.ultimateLabels.push(this.addText('', x + 36, -468, 12, COLOR.text, 52, 40));
        }
        for (let index = 0; index < M3_LEVEL_CONFIG.supports.length; index += 1) {
            this.supportLabels.push(this.addText('', 320, 390 - index * 105, 13, COLOR.text, 72, 44));
        }
        this.addText('待命', 320, 180, 13, COLOR.mutedText, 72, 44);
        this.bossLabel = this.addText('', 0, 505, 16, COLOR.text, 450);
        this.bossLabel.node.active = false;
        this.stateLabel = this.addText('', 0, 210, 26, COLOR.text, 460);
        this.stateLabel.node.active = false;
        this.resultStatsLabel = this.addText('', 0, 105, 17, COLOR.mutedText, 430, 110);
        this.resultStatsLabel.node.active = false;
        this.restartLabel = this.addText('重新开始', 0, -80, 22, COLOR.text, 220);
        this.restartLabel.node.active = false;
        this.upgradeTitleLabel = this.addText('选择战术强化', 0, 278, 28, COLOR.text, 460);
        this.upgradeTitleLabel.node.active = false;

        for (const [index, x] of [-210, 0, 210].entries()) {
            const label = this.addText('', x, 85, 18, COLOR.text, 160, 170);
            label.node.active = false;
            this.upgradeCardLabels.push(label);
            const zone = this.createHitZone(`Upgrade_${index}`, x, 75, 185, 250, () => this.chooseUpgrade(index));
            zone.active = false;
            this.upgradeZones.push(zone);
        }

        this.restartZone = this.createHitZone('Restart', 0, -80, 280, 86, this.restart);
        this.restartZone.active = false;
    }

    private addStaticLabels(): void {
        this.addText('运输载具', 0, -510, 25, COLOR.text, 240);
        this.addText('四英雄协同 · 固定战斗种子', 0, -647, 14, COLOR.mutedText, 430);
    }

    private bindControls(): void {
        this.createHitZone('Pause', -320, 390, 82, 82, this.togglePause);
        this.createHitZone('Speed', -320, 290, 82, 82, this.toggleSpeed);
        this.createHitZone('Auto', -320, 190, 82, 82, this.toggleAuto);
        this.createHitZone('SupportFireRain', 320, 390, 84, 84, () => this.triggerSupport(0));
        this.createHitZone('SupportDroneStrike', 320, 285, 84, 84, () => this.triggerSupport(1));
        const heroPositions = [-225, -75, 75, 225];
        for (let index = 0; index < heroPositions.length; index += 1) {
            this.createHitZone(`HeroSkill_${index}`, heroPositions[index] - 36, -468, 58, 58, () => this.castHeroSkill(index));
            this.createHitZone(`HeroUltimate_${index}`, heroPositions[index] + 36, -468, 62, 62, () => this.castHeroUltimate(index));
        }
    }

    private createHitZone(name: string, x: number, y: number, width: number, height: number, handler: () => void): Node {
        const zone = new Node(name);
        zone.parent = this.root;
        zone.setPosition(x, y, 0);
        zone.addComponent(UITransform).setContentSize(width, height);
        zone.on(Node.EventType.TOUCH_END, handler, this);
        return zone;
    }

    private startScheduledWaves(): void {
        for (let index = 0; index < M3_LEVEL_CONFIG.waves.length; index += 1) {
            if (this.startedWaves.has(index)) {
                continue;
            }
            const wave = M3_LEVEL_CONFIG.waves[index];
            if (this.elapsed >= wave.at) {
                this.startedWaves.add(index);
                this.spawnTasks.push({ wave, remaining: wave.count, nextAt: this.elapsed });
            }
        }
    }

    private spawnScheduledEnemies(): void {
        for (let index = this.spawnTasks.length - 1; index >= 0; index -= 1) {
            const task = this.spawnTasks[index];
            while (task.remaining > 0 && this.elapsed >= task.nextAt) {
                this.spawnEnemy(task.wave.enemyId);
                task.remaining -= 1;
                task.nextAt += task.wave.interval;
            }
            if (task.remaining <= 0) {
                this.spawnTasks.splice(index, 1);
            }
        }
    }

    private spawnEnemy(id: EnemyId): void {
        if (this.enemies.length >= 54) {
            return;
        }
        const definition = M3_LEVEL_CONFIG.enemies[id];
        const enemy = this.enemyPool.pop() ?? {
            definition,
            x: 0,
            y: 0,
            hp: 0,
            maxHp: 0,
            active: true,
            slowUntil: 0,
        };
        const lanes = [-168, -92, -24, 48, 122, 182];
        enemy.definition = definition;
        enemy.x = lanes[Math.floor(this.random() * lanes.length)] + (this.random() - 0.5) * 18;
        enemy.y = BATTLE_TOP - 48 - this.random() * 36;
        enemy.maxHp = definition.hp;
        enemy.hp = definition.hp;
        enemy.active = true;
        enemy.slowUntil = 0;
        this.enemies.push(enemy);
    }

    private fireAutomaticAttacks(): void {
        for (let index = 0; index < this.squad.length; index += 1) {
            const hero = this.squad[index];
            if (this.autoEnabled && hero.normalTimer >= hero.normalInterval) {
                hero.normalTimer -= hero.normalInterval;
                this.fireNormalVolley(hero, index);
            }
            if (this.autoEnabled && hero.skillRemaining <= 0 && this.enemies.length > 0) {
                this.castHeroSkill(index);
            }
            if (this.autoEnabled && hero.ultimateCharge >= hero.ultimateMaxCharge && this.enemies.length >= 3) {
                this.castHeroUltimate(index);
            }
        }
    }

    private fireNormalVolley(hero: HeroRuntime, heroIndex: number): void {
        const targets = this.getThreatTargets(hero.projectiles);
        for (let index = 0; index < targets.length; index += 1) {
            this.fireProjectile(targets[index], hero, heroIndex, hero.normalDamage, 'normal', index);
        }
    }

    private fireProjectile(target: Enemy, hero: HeroRuntime, heroIndex: number, damage: number, kind: ProjectileKind, offset = 0): void {
        const projectile = this.projectilePool.pop() ?? { x: 0, y: 0, damage: 0, target: null, kind, heroIndex: 0, speed: 0, active: true };
        const heroPositions = [-225, -75, 75, 225];
        projectile.x = heroPositions[heroIndex] + (offset - (hero.projectiles - 1) / 2) * 14;
        projectile.y = -430;
        projectile.damage = damage;
        projectile.target = target;
        projectile.kind = kind;
        projectile.heroIndex = heroIndex;
        projectile.speed = hero.projectileSpeed;
        projectile.active = true;
        this.projectiles.push(projectile);
    }

    private moveProjectiles(deltaTime: number): void {
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.projectiles[index];
            const target = projectile.target;
            if (!target || !target.active || !this.enemies.includes(target)) {
                this.recycleProjectile(index);
                continue;
            }
            const dx = target.x - projectile.x;
            const dy = target.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= target.definition.radius + 10) {
                this.damageEnemy(target, projectile.damage);
                this.addEffect(target.x, target.y, 22, 0.16, projectile.kind === 'skill' ? COLOR.energy : COLOR.projectile);
                this.recycleProjectile(index);
                continue;
            }
            const step = Math.min(distance, projectile.speed * deltaTime);
            projectile.x += (dx / distance) * step;
            projectile.y += (dy / distance) * step;
        }
    }

    private moveEnemies(deltaTime: number): void {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            const slow = enemy.slowUntil > this.elapsed ? 0.48 : 1;
            enemy.y -= enemy.definition.speed * slow * deltaTime;
            if (enemy.y <= DEFENSE_LINE) {
                const damage = enemy.definition.damage;
                this.vehicleHp = Math.max(0, this.vehicleHp - damage);
                this.stats.vehicleDamage += damage;
                this.recycleEnemy(index, false);
            }
        }
    }

    private castSkill = (): void => {
        this.castHeroSkill(0);
    };

    private castHeroSkill(heroIndex: number): void {
        const hero = this.squad[heroIndex];
        if (!hero || this.state !== 'running' || hero.skillRemaining > 0 || this.enemies.length === 0) {
            return;
        }
        hero.skillRemaining = hero.skillCooldown;
        this.stats.skillCasts += 1;
        const targets = this.getThreatTargets(hero.skillTargets);
        for (const target of targets) {
            this.damageEnemy(target, hero.skillDamage);
            target.slowUntil = Math.max(target.slowUntil, this.elapsed + hero.definition.controlDuration);
            this.addEffect(target.x, target.y, 46, 0.3, this.heroColor(heroIndex));
        }
        if (hero.definition.repairOnSkill > 0) {
            this.vehicleHp = Math.min(M3_LEVEL_CONFIG.vehicleHp, this.vehicleHp + hero.definition.repairOnSkill);
        }
    }

    private castUltimate = (): void => {
        this.castHeroUltimate(0);
    };

    private castHeroUltimate(heroIndex: number): void {
        const hero = this.squad[heroIndex];
        if (!hero || this.state !== 'running' || hero.ultimateCharge < hero.ultimateMaxCharge) {
            return;
        }
        hero.ultimateCharge = 0;
        this.stats.ultimateCasts += 1;
        this.addEffect(0, 140, 360, 0.7, this.heroColor(heroIndex));
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            enemy.slowUntil = Math.max(enemy.slowUntil, this.elapsed + hero.definition.controlDuration);
            this.damageEnemy(enemy, hero.ultimateDamage);
        }
    }

    private triggerSupport(index: number): void {
        if (this.state !== 'running' || this.supportRemaining[index] > 0) {
            return;
        }
        const support = M3_LEVEL_CONFIG.supports[index];
        this.supportRemaining[index] = support.cooldown;
        this.stats.supportCasts += 1;
        if (support.id === 'fireRain') {
            this.addEffect(0, 170, 310, 0.55, new Color(235, 111, 53, 255));
            for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
                this.damageEnemy(this.enemies[enemyIndex], support.damage);
            }
        } else {
            const targets = this.getThreatTargets(support.targets);
            for (const target of targets) {
                this.damageEnemy(target, support.damage);
                this.addEffect(target.x, target.y, 34, 0.28, new Color(93, 188, 217, 255));
            }
        }
    }

    private damageEnemy(enemy: Enemy, damage: number): void {
        if (!enemy.active) {
            return;
        }
        enemy.hp -= damage;
        this.stats.damage += damage;
        if (enemy.hp <= 0) {
            const index = this.enemies.indexOf(enemy);
            if (index >= 0) {
                this.recycleEnemy(index, true);
            }
        }
    }

    private recycleEnemy(index: number, defeated: boolean): void {
        const enemy = this.enemies[index];
        this.enemies.splice(index, 1);
        enemy.active = false;
        this.enemyPool.push(enemy);
        if (!defeated) {
            return;
        }
        this.stats.kills += 1;
        if (enemy.definition.elite) {
            this.stats.eliteKills += 1;
        }
        if (enemy.definition.boss) {
            this.stats.bossKills += 1;
        }
        for (const hero of this.squad) {
            hero.ultimateCharge = Math.min(
                hero.ultimateMaxCharge,
                hero.ultimateCharge + enemy.definition.xp / 2 + hero.ultimateChargePerKill,
            );
        }
        this.grantXp(enemy.definition.xp);
    }

    private recycleProjectile(index: number): void {
        const projectile = this.projectiles[index];
        this.projectiles.splice(index, 1);
        projectile.active = false;
        projectile.target = null;
        this.projectilePool.push(projectile);
    }

    private addEffect(x: number, y: number, radius: number, ttl: number, color: Color): void {
        const effect = this.effectPool.pop() ?? { x: 0, y: 0, radius: 0, ttl: 0, maxTtl: 0, color };
        effect.x = x;
        effect.y = y;
        effect.radius = radius;
        effect.ttl = ttl;
        effect.maxTtl = ttl;
        effect.color = color;
        this.effects.push(effect);
    }

    private updateEffects(deltaTime: number): void {
        for (let index = this.effects.length - 1; index >= 0; index -= 1) {
            const effect = this.effects[index];
            effect.ttl -= deltaTime;
            if (effect.ttl <= 0) {
                this.effects.splice(index, 1);
                this.effectPool.push(effect);
            }
        }
    }

    private grantXp(amount: number): void {
        this.xp += amount;
        if (this.xp < this.xpToNext || this.state !== 'running') {
            return;
        }
        this.xp -= this.xpToNext;
        this.level += 1;
        this.xpToNext = Math.ceil(this.xpToNext * M3_LEVEL_CONFIG.xp.growth);
        this.presentUpgradeChoices();
    }

    private presentUpgradeChoices(): void {
        this.state = 'upgrade';
        this.currentUpgradeHeroIndex = (this.level - 2) % this.squad.length;
        this.currentUpgrades = this.pickUpgrades();
        if (this.upgradeTitleLabel) {
            this.upgradeTitleLabel.node.active = true;
        }
        for (let index = 0; index < this.upgradeCardLabels.length; index += 1) {
            const upgrade = this.currentUpgrades[index];
            const hero = this.squad[this.currentUpgradeHeroIndex];
            this.upgradeCardLabels[index].string = `${hero.definition.name}\n${upgrade.title}\n${upgrade.detail}`;
            this.upgradeCardLabels[index].node.active = true;
            this.upgradeZones[index].active = true;
        }
        this.refreshLabels();
        this.redraw();
    }

    private pickUpgrades(): UpgradeDefinition[] {
        const candidates = [...M3_LEVEL_CONFIG.upgrades];
        for (let index = candidates.length - 1; index > 0; index -= 1) {
            const otherIndex = Math.floor(this.random() * (index + 1));
            [candidates[index], candidates[otherIndex]] = [candidates[otherIndex], candidates[index]];
        }
        return candidates.slice(0, 3);
    }

    private chooseUpgrade(index: number): void {
        if (this.state !== 'upgrade' || !this.currentUpgrades[index]) {
            return;
        }
        this.applyUpgrade(this.currentUpgrades[index], this.squad[this.currentUpgradeHeroIndex]);
        this.stats.upgrades += 1;
        this.state = 'running';
        if (this.upgradeTitleLabel) {
            this.upgradeTitleLabel.node.active = false;
        }
        for (let cardIndex = 0; cardIndex < this.upgradeCardLabels.length; cardIndex += 1) {
            this.upgradeCardLabels[cardIndex].node.active = false;
            this.upgradeZones[cardIndex].active = false;
        }
        this.refreshLabels();
        this.redraw();
    }

    private applyUpgrade(upgrade: UpgradeDefinition, hero: HeroRuntime): void {
        switch (upgrade.id) {
        case 'damage':
            hero.normalDamage += 10;
            break;
        case 'rapidFire':
            hero.normalInterval = Math.max(0.16, hero.normalInterval * 0.88);
            break;
        case 'splitShot':
            hero.projectiles = Math.min(4, hero.projectiles + 1);
            break;
        case 'skillForce':
            hero.skillDamage += 25;
            break;
        case 'skillCycle':
            hero.skillCooldown = Math.max(2.8, hero.skillCooldown * 0.82);
            break;
        case 'ultimateCharge':
            hero.ultimateChargePerSecond += 1.8;
            hero.ultimateChargePerKill += 4;
            break;
        case 'ultimateForce':
            hero.ultimateDamage += 38;
            break;
        case 'repair':
            this.vehicleHp = Math.min(M3_LEVEL_CONFIG.vehicleHp, this.vehicleHp + 28);
            break;
        }
    }

    private getThreatTargets(count: number): Enemy[] {
        return [...this.enemies]
            .sort((a, b) => a.y - b.y)
            .slice(0, count);
    }

    private hasPendingThreats(): boolean {
        return this.spawnTasks.length > 0 || this.enemies.length > 0 || M3_LEVEL_CONFIG.waves.some((_, index) => !this.startedWaves.has(index));
    }

    private togglePause = (): void => {
        if (this.state === 'won' || this.state === 'lost' || this.state === 'upgrade') {
            return;
        }
        this.state = this.state === 'paused' ? 'running' : 'paused';
        this.refreshLabels();
        this.redraw();
    };

    private toggleSpeed = (): void => {
        this.speed = this.speed === 1 ? 2 : 1;
        this.refreshLabels();
        this.redraw();
    };

    private toggleAuto = (): void => {
        this.autoEnabled = !this.autoEnabled;
        this.refreshLabels();
        this.redraw();
    };

    private restart = (): void => {
        this.resetBattle();
        if (this.restartZone) {
            this.restartZone.active = false;
        }
        if (this.restartLabel) {
            this.restartLabel.node.active = false;
        }
        if (this.resultStatsLabel) {
            this.resultStatsLabel.node.active = false;
        }
        this.refreshLabels();
        this.redraw();
    };

    private finish(nextState: 'won' | 'lost'): void {
        if (this.state === 'won' || this.state === 'lost') {
            return;
        }
        this.state = nextState;
        if (this.restartZone) {
            this.restartZone.active = true;
        }
        if (this.restartLabel) {
            this.restartLabel.node.active = true;
        }
        if (this.resultStatsLabel) {
            this.resultStatsLabel.node.active = true;
            const reason = nextState === 'won' ? '任务完成，运输线已接通' : '失败原因：变异群突破防线';
            this.resultStatsLabel.string = `${reason}\n击杀 ${this.stats.kills}  精英 ${this.stats.eliteKills}  首领 ${this.stats.bossKills}\n伤害 ${Math.ceil(this.stats.damage)}  强化 ${this.stats.upgrades}  支援 ${this.stats.supportCasts}`;
        }
        this.refreshLabels();
        this.redraw();
    }

    private refreshLabels(): void {
        const phase = [...M3_LEVEL_CONFIG.phases].reverse().find((item) => this.elapsed >= item.at) ?? M3_LEVEL_CONFIG.phases[0];
        if (this.phaseLabel) {
            this.phaseLabel.string = `污染平原 · ${phase.name}`;
        }
        if (this.timerLabel) {
            const remaining = Math.max(0, Math.ceil(M3_LEVEL_CONFIG.duration - this.elapsed));
            this.timerLabel.string = this.hasBoss() ? '首领威胁：清除后撤离' : `护送进度  ${remaining}s`;
        }
        if (this.pauseLabel) {
            this.pauseLabel.string = this.state === 'paused' ? '继续' : '暂停';
        }
        if (this.speedLabel) {
            this.speedLabel.string = `x${this.speed}`;
        }
        if (this.autoLabel) {
            this.autoLabel.string = this.autoEnabled ? 'AUTO' : '手动';
        }
        if (this.xpLabel) {
            this.xpLabel.string = `Lv.${this.level}  经验 ${Math.floor(this.xp)} / ${this.xpToNext}`;
        }
        if (this.hpLabel) {
            this.hpLabel.string = `防线完整度  ${Math.ceil(this.vehicleHp / M3_LEVEL_CONFIG.vehicleHp * 100)}%`;
        }
        for (let index = 0; index < this.squad.length; index += 1) {
            const hero = this.squad[index];
            this.skillLabels[index].string = hero.skillRemaining <= 0 ? '技\n就绪' : `技\n${Math.ceil(hero.skillRemaining)}`;
            this.ultimateLabels[index].string = `大\n${Math.floor(hero.ultimateCharge)}%`;
        }
        const supportText = M3_LEVEL_CONFIG.supports.map((support, index) => `${support.name}\n${this.supportRemaining[index] <= 0 ? '就绪' : Math.ceil(this.supportRemaining[index])}`);
        for (let index = 0; index < this.supportLabels.length; index += 1) {
            this.supportLabels[index].string = supportText[index] ?? '待命';
        }
        const boss = this.getBoss();
        if (this.bossLabel) {
            this.bossLabel.node.active = Boolean(boss);
            this.bossLabel.string = boss ? `${boss.definition.name}  ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}` : '';
        }
        if (this.stateLabel) {
            this.stateLabel.node.active = this.state === 'paused' || this.state === 'won' || this.state === 'lost';
            this.stateLabel.string = this.state === 'paused' ? '战斗暂停' : this.state === 'won' ? '护送完成' : this.state === 'lost' ? '运输载具失守' : '';
        }
    }

    private redraw(): void {
        const graphics = this.graphics;
        if (!graphics) {
            return;
        }
        graphics.clear();
        this.drawBase(graphics);
        this.drawSideControls(graphics);
        this.drawVehicleAndHero(graphics);
        this.drawEnemies(graphics);
        this.drawProjectiles(graphics);
        this.drawEffects(graphics);
        this.drawBossBar(graphics);
        if (this.state === 'paused' || this.state === 'won' || this.state === 'lost' || this.state === 'upgrade') {
            this.drawOverlay(graphics);
        }
    }

    private drawBase(graphics: Graphics): void {
        this.fillRect(graphics, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR.header);
        this.fillRect(graphics, 0, BATTLE_BOTTOM + (BATTLE_TOP - BATTLE_BOTTOM) / 2, DESIGN_WIDTH, BATTLE_TOP - BATTLE_BOTTOM, COLOR.battlefield);
        this.fillRect(graphics, 0, (BATTLE_BOTTOM - DESIGN_HEIGHT / 2) / 2, DESIGN_WIDTH, BATTLE_BOTTOM + DESIGN_HEIGHT / 2, COLOR.defense);
        this.fillRect(graphics, 0, -DESIGN_HEIGHT / 2 + 20, DESIGN_WIDTH, 40, new Color(18, 27, 29, 255));
        graphics.lineWidth = 2;
        graphics.strokeColor = COLOR.battlefieldGrid;
        for (let y = BATTLE_BOTTOM + 50; y < BATTLE_TOP; y += 105) {
            graphics.moveTo(-DESIGN_WIDTH / 2 + 65, y);
            graphics.lineTo(DESIGN_WIDTH / 2 - 65, y);
            graphics.stroke();
        }
        graphics.strokeColor = new Color(224, 232, 214, 150);
        graphics.lineWidth = 3;
        graphics.moveTo(-DESIGN_WIDTH / 2, BATTLE_BOTTOM);
        graphics.lineTo(DESIGN_WIDTH / 2, BATTLE_BOTTOM);
        graphics.stroke();
    }

    private drawSideControls(graphics: Graphics): void {
        const leftX = -320;
        const rightX = 320;
        const leftControls = [
            { y: 390, color: COLOR.action },
            { y: 290, color: COLOR.energy },
            { y: 190, color: this.autoEnabled ? COLOR.success : new Color(94, 102, 93, 255) },
        ];
        for (const control of leftControls) {
            this.fillCircle(graphics, leftX, control.y, 34, control.color);
            this.strokeCircle(graphics, leftX, control.y, 34, COLOR.text, 2);
        }
        const supportColors = [new Color(202, 92, 49, 255), new Color(54, 159, 205, 255), new Color(86, 96, 89, 255)];
        for (let index = 0; index < 3; index += 1) {
            const y = 390 - index * 105;
            this.fillCircle(graphics, rightX, y, 38, supportColors[index]);
            this.strokeCircle(graphics, rightX, y, 38, COLOR.text, 2);
            if (index < 2) {
                const support = M3_LEVEL_CONFIG.supports[index];
                const ready = this.supportRemaining[index] <= 0;
                const progress = ready ? Math.PI * 2 : Math.PI * 2 * (1 - this.supportRemaining[index] / support.cooldown);
                this.strokeArc(graphics, rightX, y, 29, -Math.PI / 2, -Math.PI / 2 + progress, ready ? COLOR.text : COLOR.mutedText, 4);
            }
        }
    }

    private drawVehicleAndHero(graphics: Graphics): void {
        this.fillRect(graphics, 0, -510, 570, 128, COLOR.vehicle);
        this.fillRect(graphics, 0, -455, 480, 16, COLOR.vehicleTrim);
        this.fillRect(graphics, 0, -570, 640, 28, new Color(20, 29, 31, 255));
        const heroPositions = [-225, -75, 75, 225];
        for (let index = 0; index < this.squad.length; index += 1) {
            const hero = this.squad[index];
            const x = heroPositions[index];
            const color = this.heroColor(index);
            this.fillCircle(graphics, x, -525, 31, color);
            this.strokeCircle(graphics, x, -525, 31, COLOR.text, 2);
            this.fillCircle(graphics, x - 36, -468, 23, hero.skillRemaining <= 0 ? color : new Color(68, 82, 74, 255));
            this.fillCircle(graphics, x + 36, -468, 25, hero.ultimateCharge >= hero.ultimateMaxCharge ? new Color(224, 181, 80, 255) : new Color(55, 107, 112, 255));
            const skillProgress = 1 - hero.skillRemaining / hero.skillCooldown;
            this.strokeArc(graphics, x - 36, -468, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, skillProgress), COLOR.text, 3);
            this.strokeArc(graphics, x + 36, -468, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (hero.ultimateCharge / hero.ultimateMaxCharge), color, 4);
        }
    }

    private drawEnemies(graphics: Graphics): void {
        for (const enemy of this.enemies) {
            const definition = enemy.definition;
            const color = new Color(definition.color[0], definition.color[1], definition.color[2], 255);
            this.fillCircle(graphics, enemy.x, enemy.y, definition.radius, color);
            this.fillCircle(graphics, enemy.x - definition.radius * 0.32, enemy.y + definition.radius * 0.22, Math.max(5, definition.radius * 0.24), new Color(245, 189, 95, 255));
            if (definition.elite || definition.boss) {
                this.strokeCircle(graphics, enemy.x, enemy.y, definition.radius + 4, definition.boss ? COLOR.warning : COLOR.energy, definition.boss ? 4 : 3);
            }
            const width = Math.max(42, definition.radius * 2.15);
            this.fillRect(graphics, enemy.x, enemy.y + definition.radius + 13, width, 6, new Color(37, 46, 39, 230));
            this.fillRect(graphics, enemy.x - width / 2 + width * (enemy.hp / enemy.maxHp) / 2, enemy.y + definition.radius + 13, width * (enemy.hp / enemy.maxHp), 6, definition.boss ? COLOR.warning : COLOR.success);
        }
    }

    private drawProjectiles(graphics: Graphics): void {
        for (const projectile of this.projectiles) {
            const color = projectile.kind === 'skill' ? COLOR.energy : this.heroColor(projectile.heroIndex);
            this.fillCircle(graphics, projectile.x, projectile.y, projectile.kind === 'skill' ? 10 : 7, color);
            this.strokeCircle(graphics, projectile.x, projectile.y, projectile.kind === 'skill' ? 15 : 11, new Color(color.r, color.g, color.b, 130), 2);
        }
    }

    private drawEffects(graphics: Graphics): void {
        for (const effect of this.effects) {
            const alpha = Math.max(0, Math.floor(180 * effect.ttl / effect.maxTtl));
            this.strokeCircle(graphics, effect.x, effect.y, effect.radius * (1.2 - effect.ttl / effect.maxTtl * 0.2), new Color(effect.color.r, effect.color.g, effect.color.b, alpha), 5);
        }
    }

    private drawBossBar(graphics: Graphics): void {
        const boss = this.getBoss();
        if (!boss) {
            return;
        }
        this.fillRect(graphics, 0, 485, 430, 12, new Color(37, 46, 39, 240));
        this.fillRect(graphics, -215 + 215 * (boss.hp / boss.maxHp), 485, 430 * (boss.hp / boss.maxHp), 12, COLOR.warning);
    }

    private drawOverlay(graphics: Graphics): void {
        this.fillRect(graphics, 0, 70, DESIGN_WIDTH, 620, COLOR.overlay);
        if (this.state === 'upgrade') {
            this.fillRect(graphics, 0, 100, 650, 410, new Color(30, 42, 40, 255));
            this.strokeRect(graphics, 0, 100, 650, 410, new Color(159, 184, 159, 255), 3);
            for (let index = 0; index < 3; index += 1) {
                const x = [-210, 0, 210][index];
                const upgrade = this.currentUpgrades[index];
                this.fillRect(graphics, x, 73, 180, 250, COLOR.card);
                this.fillRect(graphics, x, 165, 180, 12, new Color(upgrade.color[0], upgrade.color[1], upgrade.color[2], 255));
                this.strokeRect(graphics, x, 73, 180, 250, COLOR.cardBorder, 2);
            }
            return;
        }
        if (this.state === 'paused') {
            this.fillRect(graphics, 0, 175, 430, 110, COLOR.card);
            this.strokeRect(graphics, 0, 175, 430, 110, COLOR.cardBorder, 2);
            return;
        }
        this.fillRect(graphics, 0, 125, 510, 300, COLOR.card);
        this.strokeRect(graphics, 0, 125, 510, 300, this.state === 'won' ? COLOR.success : COLOR.warning, 3);
        this.fillRect(graphics, 0, -80, 280, 86, COLOR.action);
        this.strokeRect(graphics, 0, -80, 280, 86, COLOR.text, 2);
    }

    private getBoss(): Enemy | null {
        return this.enemies.find((enemy) => enemy.definition.boss) ?? null;
    }

    private heroColor(index: number): Color {
        const color = this.squad[index].definition.color;
        return new Color(color[0], color[1], color[2], 255);
    }

    private hasBoss(): boolean {
        return this.getBoss() !== null;
    }

    private recycleAllEntities(): void {
        while (this.enemies.length) {
            const enemy = this.enemies.pop();
            if (enemy) {
                enemy.active = false;
                this.enemyPool.push(enemy);
            }
        }
        while (this.projectiles.length) {
            const projectile = this.projectiles.pop();
            if (projectile) {
                projectile.active = false;
                projectile.target = null;
                this.projectilePool.push(projectile);
            }
        }
        while (this.effects.length) {
            const effect = this.effects.pop();
            if (effect) {
                this.effectPool.push(effect);
            }
        }
    }

    private random(): number {
        this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
        return this.randomState / 4294967296;
    }

    private addText(text: string, x: number, y: number, fontSize: number, color: Color, width: number, height = fontSize + 14): Label {
        const node = new Node(`Label_${text}`);
        node.parent = this.root;
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private fillRect(graphics: Graphics, x: number, y: number, width: number, height: number, color: Color): void {
        graphics.fillColor = color;
        graphics.rect(x - width / 2, y - height / 2, width, height);
        graphics.fill();
    }

    private strokeRect(graphics: Graphics, x: number, y: number, width: number, height: number, color: Color, lineWidth: number): void {
        graphics.strokeColor = color;
        graphics.lineWidth = lineWidth;
        graphics.rect(x - width / 2, y - height / 2, width, height);
        graphics.stroke();
    }

    private fillCircle(graphics: Graphics, x: number, y: number, radius: number, color: Color): void {
        graphics.fillColor = color;
        graphics.circle(x, y, radius);
        graphics.fill();
    }

    private strokeCircle(graphics: Graphics, x: number, y: number, radius: number, color: Color, lineWidth: number): void {
        graphics.strokeColor = color;
        graphics.lineWidth = lineWidth;
        graphics.circle(x, y, radius);
        graphics.stroke();
    }

    private strokeArc(graphics: Graphics, x: number, y: number, radius: number, startAngle: number, endAngle: number, color: Color, lineWidth: number): void {
        graphics.strokeColor = color;
        graphics.lineWidth = lineWidth;
        graphics.arc(x, y, radius, startAngle, endAngle, false);
        graphics.stroke();
    }
}
