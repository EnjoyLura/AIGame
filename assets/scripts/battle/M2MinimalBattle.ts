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
    enemyCore: new Color(245, 189, 95, 255),
    projectile: new Color(249, 224, 117, 255),
    success: new Color(104, 176, 103, 255),
};

type BattleState = 'running' | 'paused' | 'won' | 'lost';

interface Enemy {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    radius: number;
    active: boolean;
}

interface Projectile {
    x: number;
    y: number;
    target: Enemy | null;
    active: boolean;
}

@ccclass('M2MinimalBattle')
export class M2MinimalBattle extends Component {
    @property
    escortDuration = 30;

    @property
    maxVehicleHp = 100;

    @property
    enemySpawnInterval = 0.85;

    @property
    heroAttackInterval = 0.42;

    private root: Node | null = null;
    private graphics: Graphics | null = null;
    private restartZone: Node | null = null;
    private pauseLabel: Label | null = null;
    private speedLabel: Label | null = null;
    private autoLabel: Label | null = null;
    private timerLabel: Label | null = null;
    private hpLabel: Label | null = null;
    private stateLabel: Label | null = null;
    private restartLabel: Label | null = null;
    private elapsed = 0;
    private spawnTimer = 0;
    private attackTimer = 0;
    private speed = 1;
    private autoEnabled = true;
    private state: BattleState = 'running';
    private vehicleHp = 100;
    private spawnIndex = 0;
    private readonly enemies: Enemy[] = [];
    private readonly projectiles: Projectile[] = [];
    private readonly enemyPool: Enemy[] = [];
    private readonly projectilePool: Projectile[] = [];

    protected onLoad(): void {
        profiler.hideStats();
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_WIDTH);
        this.vehicleHp = this.maxVehicleHp;
        this.rebuild();
        this.bindControls();
        this.refreshLabels();
    }

    protected onDestroy(): void {
        this.enemies.length = 0;
        this.projectiles.length = 0;
    }

    protected update(deltaTime: number): void {
        if (this.state !== 'running') {
            return;
        }

        const scaledDelta = Math.min(deltaTime, 0.1) * this.speed;
        this.elapsed += scaledDelta;
        this.spawnTimer += scaledDelta;
        this.attackTimer += scaledDelta;

        while (this.spawnTimer >= this.enemySpawnInterval) {
            this.spawnTimer -= this.enemySpawnInterval;
            this.spawnEnemy();
        }

        if (this.autoEnabled && this.attackTimer >= this.heroAttackInterval) {
            this.attackTimer -= this.heroAttackInterval;
            this.fireAtFirstEnemy();
        }

        this.moveEnemies(scaledDelta);
        this.moveProjectiles(scaledDelta);

        if (this.elapsed >= this.escortDuration) {
            this.finish('won');
        }

        this.refreshLabels();
        this.redraw();
    }

    private rebuild(): void {
        this.root?.destroy();

        this.root = new Node('M2MinimalBattleRoot');
        this.root.parent = this.node;
        this.root.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.graphics = this.root.addComponent(Graphics);

        this.addStaticLabels();
        this.pauseLabel = this.addText('暂停', -320, 390, 16, COLOR.text, 72);
        this.speedLabel = this.addText('x1', -320, 290, 18, COLOR.text, 72);
        this.autoLabel = this.addText('AUTO', -320, 190, 13, COLOR.text, 76);
        this.timerLabel = this.addText('', 0, 600, 20, COLOR.mutedText, 440);
        this.hpLabel = this.addText('', 0, BATTLE_BOTTOM - 22, 18, COLOR.text, 300);
        this.stateLabel = this.addText('', 0, 180, 24, COLOR.text, 420);
        this.stateLabel.node.active = false;
        this.restartLabel = this.addText('重新开始', 0, -40, 22, COLOR.text, 220);
        this.restartLabel.node.active = false;

        this.restartZone = this.createHitZone('Restart', 0, -40, 280, 86, this.restart);
        this.restartZone.active = false;
    }

    private addStaticLabels(): void {
        this.addText('污染平原  ·  单英雄护送', 0, 642, 19, COLOR.text, 500);
        this.addText('变异群来袭', 18, BATTLE_TOP - 25, 17, COLOR.mutedText, 210);
        this.addText('火雨', 320, 390, 15, COLOR.text, 66);
        this.addText('雷罚', 320, 285, 15, COLOR.text, 66);
        this.addText('无人机', 320, 180, 13, COLOR.text, 70);
        this.addText('运输载具', 0, -510, 25, COLOR.text, 240);
        this.addText('远程干员', 0, -585, 17, COLOR.text, 150);
        this.addText('技', -42, -444, 15, COLOR.mutedText, 44);
        this.addText('大', 42, -444, 15, COLOR.mutedText, 48);
        this.addText('普通攻击自动选取最近威胁目标', 0, -647, 14, COLOR.mutedText, 430);
    }

    private bindControls(): void {
        this.createHitZone('Pause', -320, 390, 82, 82, this.togglePause);
        this.createHitZone('Speed', -320, 290, 82, 82, this.toggleSpeed);
        this.createHitZone('Auto', -320, 190, 82, 82, this.toggleAuto);
        this.createHitZone('EnvironmentA', 320, 390, 84, 84, this.triggerEnvironmentSkill);
        this.createHitZone('EnvironmentB', 320, 285, 84, 84, this.triggerEnvironmentSkill);
        this.createHitZone('EnvironmentC', 320, 180, 84, 84, this.triggerEnvironmentSkill);
    }

    private createHitZone(name: string, x: number, y: number, width: number, height: number, handler: () => void): Node {
        const zone = new Node(name);
        zone.parent = this.root;
        zone.setPosition(x, y, 0);
        zone.addComponent(UITransform).setContentSize(width, height);
        zone.on(Node.EventType.TOUCH_END, handler, this);
        return zone;
    }

    private spawnEnemy(): void {
        const enemy = this.enemyPool.pop() ?? {
            x: 0,
            y: 0,
            hp: 0,
            maxHp: 0,
            radius: 20,
            active: true,
        };
        const spawnXs = [-145, -72, 0, 72, 145];
        enemy.x = spawnXs[this.spawnIndex % spawnXs.length];
        enemy.y = BATTLE_TOP - 48;
        enemy.maxHp = 44;
        enemy.hp = enemy.maxHp;
        enemy.radius = 20;
        enemy.active = true;
        this.spawnIndex += 1;
        this.enemies.push(enemy);
    }

    private fireAtFirstEnemy(): void {
        const target = this.enemies.find((enemy) => enemy.active);
        if (!target) {
            return;
        }

        const projectile = this.projectilePool.pop() ?? { x: 0, y: 0, target: null, active: true };
        projectile.x = 0;
        projectile.y = -392;
        projectile.target = target;
        projectile.active = true;
        this.projectiles.push(projectile);
    }

    private moveEnemies(deltaTime: number): void {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            enemy.y -= 58 * deltaTime;
            if (enemy.y <= DEFENSE_LINE) {
                this.vehicleHp = Math.max(0, this.vehicleHp - 14);
                this.recycleEnemy(index);
            }
        }

        if (this.vehicleHp <= 0) {
            this.finish('lost');
        }
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
            if (distance <= 28) {
                target.hp -= 22;
                if (target.hp <= 0) {
                    const enemyIndex = this.enemies.indexOf(target);
                    if (enemyIndex >= 0) {
                        this.recycleEnemy(enemyIndex);
                    }
                }
                this.recycleProjectile(index);
                continue;
            }

            const step = Math.min(distance, 510 * deltaTime);
            projectile.x += (dx / distance) * step;
            projectile.y += (dy / distance) * step;
        }
    }

    private recycleEnemy(index: number): void {
        const enemy = this.enemies[index];
        enemy.active = false;
        this.enemies.splice(index, 1);
        this.enemyPool.push(enemy);
    }

    private recycleProjectile(index: number): void {
        const projectile = this.projectiles[index];
        projectile.active = false;
        projectile.target = null;
        this.projectiles.splice(index, 1);
        this.projectilePool.push(projectile);
    }

    private togglePause = (): void => {
        if (this.state === 'won' || this.state === 'lost') {
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

    private triggerEnvironmentSkill = (): void => {
        if (this.state !== 'running') {
            return;
        }
        for (const enemy of this.enemies) {
            if (enemy.y > 120 && enemy.y < 430) {
                enemy.hp -= 8;
            }
        }
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            if (this.enemies[index].hp <= 0) {
                this.recycleEnemy(index);
            }
        }
        this.redraw();
    };

    private restart = (): void => {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            this.recycleEnemy(index);
        }
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            this.recycleProjectile(index);
        }
        this.elapsed = 0;
        this.spawnTimer = 0;
        this.attackTimer = 0;
        this.vehicleHp = this.maxVehicleHp;
        this.spawnIndex = 0;
        this.state = 'running';
        if (this.restartZone) {
            this.restartZone.active = false;
        }
        if (this.restartLabel) {
            this.restartLabel.node.active = false;
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
        this.refreshLabels();
        this.redraw();
    }

    private refreshLabels(): void {
        if (this.pauseLabel) {
            this.pauseLabel.string = this.state === 'paused' ? '继续' : '暂停';
        }
        if (this.speedLabel) {
            this.speedLabel.string = `x${this.speed}`;
        }
        if (this.autoLabel) {
            this.autoLabel.string = this.autoEnabled ? 'AUTO' : '手动';
        }
        if (this.timerLabel) {
            const remaining = Math.max(0, Math.ceil(this.escortDuration - this.elapsed));
            this.timerLabel.string = `护送进度  ${remaining}s`;
        }
        if (this.hpLabel) {
            this.hpLabel.string = `防线完整度  ${Math.ceil(this.vehicleHp)}%`;
        }
        if (this.stateLabel) {
            this.stateLabel.node.active = this.state !== 'running';
            this.stateLabel.string = this.state === 'paused'
                ? '战斗暂停'
                : this.state === 'won'
                    ? '护送完成'
                    : this.state === 'lost'
                        ? '运输载具失守'
                        : '';
        }
    }

    private redraw(): void {
        const graphics = this.graphics;
        if (!graphics) {
            return;
        }

        graphics.clear();
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

        this.drawSideControls(graphics);
        this.drawVehicleAndHero(graphics);
        this.drawEnemies(graphics);
        this.drawProjectiles(graphics);

        if (this.state === 'paused' || this.state === 'won' || this.state === 'lost') {
            this.fillRect(graphics, 0, 70, DESIGN_WIDTH, 620, COLOR.overlay);
            if (this.state === 'paused') {
                this.fillRect(graphics, 0, 160, 430, 110, new Color(44, 62, 56, 255));
                this.strokeRect(graphics, 0, 160, 430, 110, COLOR.cardBorder, 2);
            } else {
                this.fillRect(graphics, 0, 140, 500, 210, new Color(44, 62, 56, 255));
                this.strokeRect(graphics, 0, 140, 500, 210, this.state === 'won' ? COLOR.success : COLOR.warning, 3);
                this.fillRect(graphics, 0, -40, 280, 86, COLOR.action);
                this.strokeRect(graphics, 0, -40, 280, 86, COLOR.text, 2);
            }
        }
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

        const environmentSkills = [
            { y: 390, color: new Color(202, 92, 49, 255) },
            { y: 285, color: new Color(54, 159, 205, 255) },
            { y: 180, color: new Color(131, 164, 91, 255) },
        ];
        for (const skill of environmentSkills) {
            this.fillCircle(graphics, rightX, skill.y, 38, skill.color);
            this.strokeCircle(graphics, rightX, skill.y, 38, COLOR.text, 2);
            this.strokeArc(graphics, rightX, skill.y, 29, 0.2, Math.PI * 1.65, COLOR.text, 4);
        }
    }

    private drawVehicleAndHero(graphics: Graphics): void {
        this.fillRect(graphics, 0, -510, 570, 128, COLOR.vehicle);
        this.fillRect(graphics, 0, -455, 480, 16, COLOR.vehicleTrim);
        this.fillRect(graphics, 0, -570, 640, 28, new Color(20, 29, 31, 255));
        this.fillCircle(graphics, 0, -525, 34, new Color(239, 122, 61, 255));
        this.strokeCircle(graphics, 0, -525, 34, COLOR.text, 2);
        this.fillCircle(graphics, -42, -444, 23, new Color(68, 82, 74, 255));
        this.fillCircle(graphics, 42, -444, 26, new Color(55, 107, 112, 255));
        this.strokeArc(graphics, 42, -444, 20, 0, Math.PI * 1.32, COLOR.energy, 4);
    }

    private drawEnemies(graphics: Graphics): void {
        for (const enemy of this.enemies) {
            this.fillCircle(graphics, enemy.x, enemy.y, enemy.radius, COLOR.warning);
            this.fillCircle(graphics, enemy.x - 7, enemy.y + 6, 5, COLOR.enemyCore);
            this.fillRect(graphics, enemy.x, enemy.y + 31, 42, 6, new Color(37, 46, 39, 230));
            this.fillRect(graphics, enemy.x - 21 + 21 * (enemy.hp / enemy.maxHp), enemy.y + 31, 42 * (enemy.hp / enemy.maxHp), 6, COLOR.success);
        }
    }

    private drawProjectiles(graphics: Graphics): void {
        for (const projectile of this.projectiles) {
            this.fillCircle(graphics, projectile.x, projectile.y, 8, COLOR.projectile);
            this.strokeCircle(graphics, projectile.x, projectile.y, 12, new Color(255, 241, 158, 130), 2);
        }
    }

    private addText(text: string, x: number, y: number, fontSize: number, color: Color, width: number): Label {
        const node = new Node(`Label_${text}`);
        node.parent = this.root;
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, fontSize + 14);
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
