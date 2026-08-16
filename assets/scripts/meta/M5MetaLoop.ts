import {
    _decorator,
    Color,
    Component,
    Graphics,
    HorizontalTextAlignment,
    Label,
    Node,
    ResolutionPolicy,
    UITransform,
    VerticalTextAlignment,
    view,
} from 'cc';
import { BattleResult } from '../battle/M3CompleteLevel';
import { M4FourHeroBattle } from '../battle/M4FourHeroBattle';
import { LevelId, getLevelConfig } from '../battle/M6LevelCatalog';
import {
    M5Profile,
    M5UpgradeId,
    calculateIdleReward,
    claimIdleReward,
    completeMission,
    getCombatModifiers,
    upgradeProfile,
} from './M5Profile';
import { M5ProfileStore } from './M5ProfileStore';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;

const COLOR = {
    background: new Color(27, 38, 36, 255),
    map: new Color(54, 78, 64, 255),
    route: new Color(110, 161, 113, 255),
    panel: new Color(35, 51, 47, 255),
    panelAlt: new Color(45, 66, 59, 255),
    line: new Color(138, 169, 143, 255),
    action: new Color(211, 111, 48, 255),
    sample: new Color(80, 172, 184, 255),
    supply: new Color(211, 178, 82, 255),
    success: new Color(105, 179, 108, 255),
    muted: new Color(168, 184, 171, 255),
    text: new Color(241, 244, 235, 255),
    locked: new Color(88, 99, 91, 255),
};

type MetaScreen = 'home' | 'missions';

@ccclass('M5MetaLoop')
export class M5MetaLoop extends Component {
    private readonly store = new M5ProfileStore();
    private battle: M4FourHeroBattle | null = null;
    private profile: M5Profile | null = null;
    private root: Node | null = null;
    private graphics: Graphics | null = null;
    private screen: MetaScreen = 'home';
    private notice = '';
    private selectedLevelId: LevelId = 'polluted-plain-01';

    protected onLoad(): void {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_WIDTH);
        this.battle = this.getComponent(M4FourHeroBattle);
        this.profile = this.store.load(Date.now());
        this.battle?.configureMetaLoop(this.handleBattleFinished, this.showHome);
        this.showHome();
    }

    protected onDestroy(): void {
        this.root?.destroy();
    }

    private showHome = (): void => {
        this.screen = 'home';
        this.notice = '';
        this.rebuild();
    };

    private showMissions = (): void => {
        this.screen = 'missions';
        this.notice = '';
        this.rebuild();
    };

    private startMission = (): void => {
        if (!this.battle || !this.profile) {
            return;
        }
        this.root?.destroy();
        this.root = null;
        this.graphics = null;
        this.battle.configureExternalModifiers(getCombatModifiers(this.profile));
        this.battle.configureLevel(this.selectedLevelId);
        this.battle.startBattle();
    };

    private selectLevel = (levelId: LevelId): void => {
        this.selectedLevelId = levelId;
        this.rebuild();
    };

    private handleBattleFinished = (result: BattleResult): void => {
        if (!this.profile) {
            return;
        }
        const rewards = completeMission(this.profile, result.outcome === 'won', result.kills);
        this.profile = rewards.profile;
        this.store.save(this.profile);
        this.battle?.setResultFooter(`补给 +${rewards.supplies}  样本 +${rewards.samples}`);
    };

    private claimIdle = (): void => {
        if (!this.profile) {
            return;
        }
        const claimed = claimIdleReward(this.profile, Date.now());
        this.profile = claimed.profile;
        this.store.save(this.profile);
        this.notice = claimed.reward.supplies > 0 ? `已领取补给 +${claimed.reward.supplies}` : '补给正在汇集';
        this.rebuild();
    };

    private upgrade = (upgradeId: M5UpgradeId): void => {
        if (!this.profile) {
            return;
        }
        const upgraded = upgradeProfile(this.profile, upgradeId);
        if (!upgraded) {
            this.notice = upgradeId === 'vehicle' ? '补给不足' : '样本不足';
            this.rebuild();
            return;
        }
        this.profile = upgraded;
        this.store.save(this.profile);
        this.notice = upgradeId === 'hero' ? '护卫训练完成' : upgradeId === 'equipment' ? '武器模块已校准' : '运输车体已加固';
        this.rebuild();
    };

    private rebuild(): void {
        this.root?.destroy();
        this.root = new Node('M5MetaLoopRoot');
        this.root.parent = this.node;
        this.root.setSiblingIndex(this.node.children.length - 1);
        this.root.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        this.graphics = this.root.addComponent(Graphics);
        if (this.screen === 'home') {
            this.buildHome();
        } else {
            this.buildMissions();
        }
    }

    private buildHome(): void {
        const profile = this.requireProfile();
        const idle = calculateIdleReward(profile, Date.now());
        this.drawBackground();
        this.addText('荒境护送', -210, 600, 34, COLOR.text, 300, 48, HorizontalTextAlignment.LEFT);
        this.addText('第 1 运输队 · 污染平原前线', -210, 557, 16, COLOR.muted, 330, 28, HorizontalTextAlignment.LEFT);
        this.drawResource(-152, 640, COLOR.supply, `补给 ${profile.supplies}`);
        this.drawResource(150, 640, COLOR.sample, `样本 ${profile.samples}`);
        this.addText(`已恢复运输线 ${profile.completedMissions} 条`, 0, 435, 19, COLOR.text, 420, 30);
        this.addText(`最高清除 ${profile.bestKills} 只变异体`, 0, 400, 16, COLOR.muted, 420, 28);

        this.fillRect(0, 82, 650, 590, COLOR.map);
        this.strokeRect(0, 82, 650, 590, COLOR.line, 2);
        this.addText('污染平原运输线', 0, 330, 23, COLOR.text, 380, 38);
        this.addText('净水组件护送任务', 0, 294, 16, COLOR.muted, 360, 28);
        this.drawRoute();
        this.addText('前线中继点', 0, -140, 17, COLOR.text, 260, 28);
        this.addText('变异群活动增强', 0, -175, 15, new Color(237, 183, 97, 255), 300, 26);

        this.drawButton(0, -314, 430, 82, COLOR.action, '选择行动任务', this.showMissions);
        this.drawButton(0, -410, 430, 68, COLOR.panelAlt, idle.supplies > 0 ? `领取巡逻补给 +${idle.supplies}` : '巡逻补给汇集中', this.claimIdle);

        this.drawUpgradeButton(-214, -548, '训练', `Lv.${profile.heroTrainingLevel}`, COLOR.success, () => this.upgrade('hero'));
        this.drawUpgradeButton(0, -548, '模块', `Lv.${profile.equipmentLevel}`, COLOR.sample, () => this.upgrade('equipment'));
        this.drawUpgradeButton(214, -548, '车体', `Lv.${profile.vehicleLevel}`, COLOR.supply, () => this.upgrade('vehicle'));
        this.addText('训练/模块消耗样本，车体消耗补给', 0, -628, 15, COLOR.muted, 560, 26);
        if (this.notice) {
            this.addText(this.notice, 0, -255, 17, COLOR.text, 430, 28);
        }
    }

    private buildMissions(): void {
        const profile = this.requireProfile();
        const modifiers = getCombatModifiers(profile);
        const selectedLevel = getLevelConfig(this.selectedLevelId);
        const secondLevelUnlocked = profile.completedMissions >= 1;
        const plainSelected = this.selectedLevelId === 'polluted-plain-01';
        const grasslandSelected = this.selectedLevelId === 'withered-grassland-01';
        this.drawBackground();
        this.drawCircleButton(-320, 600, COLOR.panelAlt, '返回', this.showHome);
        this.addText('行动任务', 0, 598, 30, COLOR.text, 400, 44);
        this.addText('选择运输线后进入护送', 0, 556, 16, COLOR.muted, 420, 28);
        this.fillRect(0, 270, 650, 250, COLOR.panel);
        this.strokeRect(0, 270, 650, 250, plainSelected ? COLOR.action : COLOR.success, plainSelected ? 4 : 2);
        this.addText('01  污染平原 · 净水组件护送', 0, 340, 21, COLOR.text, 570, 34);
        this.addText('威胁：腐甲爬兽 / 精英变异体 / 污蚀巨兽', 0, 300, 16, COLOR.muted, 580, 28);
        this.addText('完成后获得补给与生态样本', 0, 260, 16, COLOR.supply, 560, 28);
        this.addText('已解锁', 0, 206, 15, COLOR.success, 200, 26);
        this.createHitZone('Mission_PollutedPlain', 0, 270, 650, 250, () => this.selectLevel('polluted-plain-01'));
        this.fillRect(0, -5, 650, 210, COLOR.panelAlt);
        this.addText('护卫编队', 0, 69, 20, COLOR.text, 320, 34);
        const roster = ['巡航者', '风岚', '脉冲者', '霜翎'];
        const colors = [new Color(239, 122, 61, 255), new Color(107, 191, 117, 255), new Color(67, 177, 205, 255), new Color(125, 184, 225, 255)];
        for (let index = 0; index < roster.length; index += 1) {
            const x = -225 + index * 150;
            this.fillCircle(x, 0, 34, colors[index]);
            this.strokeCircle(x, 0, 34, COLOR.text, 2);
            this.addText(roster[index], x, -52, 15, COLOR.text, 118, 26);
        }
        this.addText(`火力 +${Math.round((modifiers.damageMultiplier - 1) * 100)}%  车体完整度 +${modifiers.vehicleHpBonus}`, 0, -125, 16, COLOR.muted, 580, 28);
        this.fillRect(0, -288, 650, 120, secondLevelUnlocked ? COLOR.panel : COLOR.locked);
        this.strokeRect(0, -288, 650, 120, grasslandSelected ? COLOR.action : secondLevelUnlocked ? COLOR.line : COLOR.locked, grasslandSelected ? 4 : 2);
        this.addText('02  荒化草原运输线', 0, -266, 19, secondLevelUnlocked ? COLOR.text : COLOR.muted, 540, 30);
        this.addText(secondLevelUnlocked ? '风蚀迁徙群与强化首领' : '完成首条运输线后开放', 0, -302, 15, secondLevelUnlocked ? COLOR.supply : COLOR.muted, 540, 26);
        if (secondLevelUnlocked) {
            this.createHitZone('Mission_WitheredGrassland', 0, -288, 650, 120, () => this.selectLevel('withered-grassland-01'));
        }
        this.drawButton(0, -470, 430, 82, COLOR.action, `开始${selectedLevel.name}护送`, this.startMission);
    }

    private requireProfile(): M5Profile {
        if (!this.profile) {
            this.profile = this.store.load(Date.now());
        }
        return this.profile;
    }

    private drawBackground(): void {
        this.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR.background);
        this.fillRect(0, 617, DESIGN_WIDTH, 100, new Color(20, 29, 30, 255));
        const graphics = this.graphics;
        if (!graphics) {
            return;
        }
        graphics.strokeColor = new Color(78, 111, 89, 180);
        graphics.lineWidth = 2;
        for (let y = -560; y < 500; y += 96) {
            graphics.moveTo(-375, y);
            graphics.lineTo(375, y);
            graphics.stroke();
        }
    }

    private drawRoute(): void {
        const graphics = this.graphics;
        if (!graphics) {
            return;
        }
        graphics.strokeColor = COLOR.route;
        graphics.lineWidth = 8;
        graphics.moveTo(-130, 205);
        graphics.bezierCurveTo(-180, 115, 130, 80, 90, -30);
        graphics.bezierCurveTo(50, -105, -50, -110, 0, -125);
        graphics.stroke();
        this.fillCircle(-130, 205, 19, COLOR.sample);
        this.fillCircle(90, -30, 24, COLOR.action);
        this.fillCircle(0, -125, 21, COLOR.success);
        this.strokeCircle(-130, 205, 19, COLOR.text, 2);
        this.strokeCircle(90, -30, 24, COLOR.text, 2);
        this.strokeCircle(0, -125, 21, COLOR.text, 2);
    }

    private drawResource(x: number, y: number, color: Color, text: string): void {
        this.fillRect(x, y, 250, 48, COLOR.panel);
        this.fillCircle(x - 94, y, 12, color);
        this.addText(text, x + 20, y, 17, COLOR.text, 180, 28, HorizontalTextAlignment.LEFT);
    }

    private drawUpgradeButton(x: number, y: number, title: string, level: string, color: Color, handler: () => void): void {
        this.fillCircle(x, y, 63, color);
        this.strokeCircle(x, y, 63, COLOR.text, 2);
        this.addText(title, x, y + 12, 18, COLOR.text, 110, 28);
        this.addText(level, x, y - 17, 15, COLOR.text, 110, 25);
        this.createHitZone(`Upgrade_${title}`, x, y, 132, 132, handler);
    }

    private drawCircleButton(x: number, y: number, color: Color, label: string, handler: () => void): void {
        this.fillCircle(x, y, 38, color);
        this.strokeCircle(x, y, 38, COLOR.text, 2);
        this.addText(label, x, y, 13, COLOR.text, 72, 30);
        this.createHitZone(`Circle_${label}`, x, y, 86, 86, handler);
    }

    private drawButton(x: number, y: number, width: number, height: number, color: Color, label: string, handler: () => void): void {
        this.fillRect(x, y, width, height, color);
        this.strokeRect(x, y, width, height, COLOR.text, 2);
        this.addText(label, x, y, 21, COLOR.text, width - 30, 38);
        this.createHitZone(`Action_${label}`, x, y, width, height, handler);
    }

    private createHitZone(name: string, x: number, y: number, width: number, height: number, handler: () => void): void {
        const zone = new Node(name);
        zone.parent = this.root;
        zone.setPosition(x, y, 0);
        zone.addComponent(UITransform).setContentSize(width, height);
        zone.on(Node.EventType.TOUCH_END, handler, this);
    }

    private addText(
        text: string,
        x: number,
        y: number,
        fontSize: number,
        color: Color,
        width: number,
        height: number,
        horizontalAlign = HorizontalTextAlignment.CENTER,
    ): Label {
        const node = new Node(`Label_${text}`);
        node.parent = this.root;
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.horizontalAlign = horizontalAlign;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private fillRect(x: number, y: number, width: number, height: number, color: Color): void {
        if (!this.graphics) {
            return;
        }
        this.graphics.fillColor = color;
        this.graphics.rect(x - width / 2, y - height / 2, width, height);
        this.graphics.fill();
    }

    private strokeRect(x: number, y: number, width: number, height: number, color: Color, lineWidth: number): void {
        if (!this.graphics) {
            return;
        }
        this.graphics.strokeColor = color;
        this.graphics.lineWidth = lineWidth;
        this.graphics.rect(x - width / 2, y - height / 2, width, height);
        this.graphics.stroke();
    }

    private fillCircle(x: number, y: number, radius: number, color: Color): void {
        if (!this.graphics) {
            return;
        }
        this.graphics.fillColor = color;
        this.graphics.circle(x, y, radius);
        this.graphics.fill();
    }

    private strokeCircle(x: number, y: number, radius: number, color: Color, lineWidth: number): void {
        if (!this.graphics) {
            return;
        }
        this.graphics.strokeColor = color;
        this.graphics.lineWidth = lineWidth;
        this.graphics.circle(x, y, radius);
        this.graphics.stroke();
    }
}
