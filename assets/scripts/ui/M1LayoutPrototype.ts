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
const BATTLE_HEIGHT = BATTLE_TOP - BATTLE_BOTTOM;

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
    overlay: new Color(13, 20, 22, 220),
    card: new Color(44, 62, 56, 255),
    cardBorder: new Color(114, 145, 120, 255),
};

@ccclass('M1LayoutPrototype')
export class M1LayoutPrototype extends Component {
    @property
    showUpgradePreview = true;

    private root: Node | null = null;
    private upgradeOverlay: Node | null = null;

    protected onLoad(): void {
        profiler.hideStats();
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_WIDTH);
        this.rebuild();
        if (this.showUpgradePreview) {
            this.schedule(this.toggleUpgradeOverlay, 6);
        }
    }

    protected onDestroy(): void {
        this.unschedule(this.toggleUpgradeOverlay);
    }

    private rebuild(): void {
        this.root?.destroy();

        this.root = new Node('M1LayoutRoot');
        this.root.parent = this.node;
        const transform = this.root.addComponent(UITransform);
        transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);

        const graphics = this.root.addComponent(Graphics);
        this.drawBase(graphics);
        this.drawBattlefield(graphics);
        this.drawSideControls(graphics);
        this.drawDefenseAndHeroes(graphics);
        this.addStaticLabels();
        this.upgradeOverlay = this.createUpgradeOverlay();
        this.upgradeOverlay.active = false;
    }

    private drawBase(graphics: Graphics): void {
        this.fillRect(graphics, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR.header);
        this.fillRect(graphics, 0, BATTLE_BOTTOM + BATTLE_HEIGHT / 2, DESIGN_WIDTH, BATTLE_HEIGHT, COLOR.battlefield);
        this.fillRect(graphics, 0, (BATTLE_BOTTOM - DESIGN_HEIGHT / 2) / 2, DESIGN_WIDTH, BATTLE_BOTTOM + DESIGN_HEIGHT / 2, COLOR.defense);
        this.fillRect(graphics, 0, -DESIGN_HEIGHT / 2 + 20, DESIGN_WIDTH, 40, new Color(18, 27, 29, 255));
    }

    private drawBattlefield(graphics: Graphics): void {
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

        this.fillRect(graphics, 0, BATTLE_TOP - 25, 270, 32, new Color(30, 42, 42, 220));
        this.fillCircle(graphics, 0, BATTLE_TOP - 13, 8, COLOR.warning);
    }

    private drawSideControls(graphics: Graphics): void {
        const leftX = -320;
        const rightX = 320;
        const controls = [
            { y: 390, color: COLOR.action },
            { y: 290, color: COLOR.energy },
            { y: 190, color: new Color(104, 176, 103, 255) },
        ];

        for (const control of controls) {
            this.fillCircle(graphics, leftX, control.y, 34, control.color);
            this.strokeCircle(graphics, leftX, control.y, 34, new Color(242, 244, 235, 210), 2);
        }

        const environmentSkills = [
            { y: 390, color: new Color(202, 92, 49, 255) },
            { y: 285, color: new Color(54, 159, 205, 255) },
            { y: 180, color: new Color(131, 164, 91, 255) },
        ];

        for (const skill of environmentSkills) {
            this.fillCircle(graphics, rightX, skill.y, 38, skill.color);
            this.strokeCircle(graphics, rightX, skill.y, 38, new Color(242, 244, 235, 220), 2);
            this.strokeArc(graphics, rightX, skill.y, 29, 0.2, Math.PI * 1.65, COLOR.text, 4);
        }
    }

    private drawDefenseAndHeroes(graphics: Graphics): void {
        this.fillRect(graphics, 0, -510, 570, 128, COLOR.vehicle);
        this.fillRect(graphics, 0, -455, 480, 16, COLOR.vehicleTrim);
        this.fillRect(graphics, 0, -570, 640, 28, new Color(20, 29, 31, 255));

        const heroPositions = [-225, -75, 75, 225];
        const heroColors = [
            new Color(239, 122, 61, 255),
            new Color(71, 184, 190, 255),
            new Color(143, 205, 115, 255),
            new Color(218, 191, 88, 255),
        ];

        for (let index = 0; index < heroPositions.length; index += 1) {
            const x = heroPositions[index];
            const color = heroColors[index];
            this.fillCircle(graphics, x, -525, 31, color);
            this.strokeCircle(graphics, x, -525, 31, COLOR.text, 2);
            this.fillCircle(graphics, x - 32, -444, 23, new Color(68, 82, 74, 255));
            this.fillCircle(graphics, x + 32, -444, 26, new Color(55, 107, 112, 255));
            this.strokeArc(graphics, x + 32, -444, 20, 0, Math.PI * 1.32, COLOR.energy, 4);
        }
    }

    private addStaticLabels(): void {
        this.addText('护送净水模块  ·  第 01 波', 0, 621, 25, COLOR.text, 420);
        this.addText('变异群来袭', 18, BATTLE_TOP - 25, 17, COLOR.mutedText, 210);
        this.addText('暂停', -320, 390, 16, COLOR.text, 62);
        this.addText('x1', -320, 290, 18, COLOR.text, 62);
        this.addText('AUTO', -320, 190, 13, COLOR.text, 66);
        this.addText('火雨', 320, 390, 15, COLOR.text, 66);
        this.addText('雷罚', 320, 285, 15, COLOR.text, 66);
        this.addText('无人机', 320, 180, 13, COLOR.text, 70);
        this.addText('防线完整度  100%', 0, BATTLE_BOTTOM - 22, 18, COLOR.text, 260);
        this.addText('运输载具', 0, -510, 25, COLOR.text, 240);

        const heroNames = ['赤隼', '霜翎', '风岚', '黑曜'];
        const heroPositions = [-225, -75, 75, 225];
        for (let index = 0; index < heroNames.length; index += 1) {
            const x = heroPositions[index];
            this.addText(heroNames[index], x, -585, 17, COLOR.text, 110);
            this.addText('技', x - 32, -444, 15, COLOR.text, 44);
            this.addText('大', x + 32, -444, 15, COLOR.text, 48);
        }

        this.addText('运输队状态  ·  纯色布局原型', 0, -647, 14, COLOR.mutedText, 430);
    }

    private createUpgradeOverlay(): Node {
        const overlay = new Node('UpgradeOverlay');
        overlay.parent = this.root;
        overlay.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        const graphics = overlay.addComponent(Graphics);

        this.fillRect(graphics, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR.overlay);
        this.fillRect(graphics, 0, 100, 650, 410, new Color(30, 42, 40, 255));
        this.strokeRect(graphics, 0, 100, 650, 410, new Color(159, 184, 159, 255), 3);

        const cardCenters = [-210, 0, 210];
        const cardColors = [COLOR.action, COLOR.energy, new Color(112, 157, 197, 255)];
        for (let index = 0; index < cardCenters.length; index += 1) {
            this.fillRect(graphics, cardCenters[index], 73, 180, 250, COLOR.card);
            this.fillRect(graphics, cardCenters[index], 165, 180, 12, cardColors[index]);
            this.strokeRect(graphics, cardCenters[index], 73, 180, 250, COLOR.cardBorder, 2);
        }

        this.addText('选择一项战术强化', 0, 270, 28, COLOR.text, 430, overlay);
        this.addText('普攻强化', -210, 185, 19, COLOR.text, 150, overlay);
        this.addText('连发齐射', -210, 119, 23, COLOR.text, 150, overlay);
        this.addText('技能强化', 0, 185, 19, COLOR.text, 150, overlay);
        this.addText('雷电连锁', 0, 119, 23, COLOR.text, 150, overlay);
        this.addText('大招强化', 210, 185, 19, COLOR.text, 150, overlay);
        this.addText('全域冰封', 210, 119, 23, COLOR.text, 150, overlay);
        this.addText('战斗在选择期间暂停', 0, -95, 16, COLOR.mutedText, 360, overlay);

        return overlay;
    }

    private toggleUpgradeOverlay = (): void => {
        if (this.upgradeOverlay) {
            this.upgradeOverlay.active = !this.upgradeOverlay.active;
        }
    };

    private addText(text: string, x: number, y: number, fontSize: number, color: Color, width: number, parent = this.root): void {
        if (!parent) {
            return;
        }

        const node = new Node(`Label_${text}`);
        node.parent = parent;
        node.setPosition(x, y, 0);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, fontSize + 14);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
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
