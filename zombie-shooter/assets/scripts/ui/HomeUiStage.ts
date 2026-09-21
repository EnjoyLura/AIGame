import { _decorator, Component, SpriteFrame, sys } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES, BUILDINGS } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { ShopData, ShopItem, ShopQuota } from '../core/ShopData';
import { GIFT_PACKS, GiftService, GiftPackDef } from '../core/GiftPackData';
import { QUEST_DEFS, QuestSystem, QuestDef, ACTIVITY_CHESTS, ACTIVITY_MAX, rewardText } from '../core/QuestSystem';
import { loadBoard, myScore, boardNote } from '../core/LeaderboardSystem';
import { SigninSystem, SIGNIN_REWARDS, SigninReward } from '../core/SigninSystem';
import { BestiarySystem, BESTIARY_DEFS, BestiaryDef } from '../core/BestiarySystem';
import { MailSystem } from '../core/MailSystem';
import { SoundFx } from '../core/SoundFx';
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, WEAPON_CORE_DEFS, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot, BagItem, MiscItemDef, MISC_ITEM_DEFS, miscDef, lootRateText, tierRank, EquipTier, LootDrop, lootDropColor, GEM_EFFECTS, gemSlots, gemSocketCost, combineGroupCount, salvageStoneYield, salvageAlloyYield } from '../core/HeroSystem';
import { HERO_DEFS, ABILITY_LEVEL_DMG_BONUS, HeroDef } from '../battle/HeroDef';
import { FINAL_STAGE_ID, stageInfo, stageWaves, STAGE_DIFFS, stageDiffDef, StageDifficulty } from '../battle/StageData';
import { TrialSystem, trialFloorDef, trialFloorReward, TRIAL_MAX_FLOOR, TRIAL_MILESTONE_EVERY } from '../core/TrialSystem';
import { RecruitSystem, rollRecruit, HERO_STAR_MAX, RECRUIT_PRICE_1, RECRUIT_PRICE_10, RECRUIT_PITY, RecruitResult } from '../core/RecruitSystem';
import { TalentSystem, TALENT_NODES, TALENT_BRANCHES, TALENT_BRANCH_NAMES, branchNodes, branchPointTotal, talentNode, TalentNodeDef, TalentBranch } from '../core/TalentSystem';
import { affixName, affixValueText, affixColor, AFFIX_MAX } from '../core/EquipmentAffix';
import { DungeonSystem, DungeonId, DUNGEON_DEFS, DUNGEON_TIER_NAMES, DUNGEON_RUNS_PER_DAY, DUNGEON_STAMINA_COST, DUNGEON_WAVES, dungeonDef, dungeonYieldRange, encodeDungeon } from '../core/DungeonSystem';
import { ExpeditionSystem, ExpeditionId, EXPEDITION_DEFS, EXPEDITION_RUNS_PER_DAY, HERO_ATTR_NAMES, HERO_ATTR_IC, EXP_MULT_MIN, EXP_MULT_MAX, expeditionDef, matchMultiplier, expeditionYieldRange, heroAttrValue } from '../core/ExpeditionSystem';
import { VehicleTuningSystem, TUNE_SLOTS, TUNE_MAX_LEVEL } from '../core/VehicleTuningSystem';
import { PatrolSystem } from '../core/PatrolSystem';
import { BOND_DEFS, activeBonds } from '../core/HeroBond';
import { NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES } from '../core/NoticeData';
import { HomeUiHeroes } from './HomeUiHeroes';
import type { PopOpts } from './HomeUiPop';
import * as UiPlate from './UiPlate';

const CHAPTER_THEMES: Array<{ veh: string; mobs: string[] }> = [
    { veh: '🚚', mobs: ['🐺', '🐗', '🦅'] },
    { veh: '🚢', mobs: ['🦅', '🐊', '🐍'] },
    { veh: '🚚', mobs: ['🐺', '🦂', '🐝'] },
    { veh: '🚛', mobs: ['🐗', '🐻', '🐺'] },
    { veh: '🚚', mobs: ['🦅', '🐻', '🐺'] },
];

/** 每关波次进度点标签（1~5 波 + BOSS，对齐原型 lvl-track 10 关制压缩为波次轨道） */

const WAVES_PER_STAGE = 5;

/**
 * 主城界面（战斗外玩法入口，DOM 渲染）——一比一复刻《末日航线》原型图：
 * 顶栏（玩家头像/经验/资源胶囊）+ 底部五导航（商店/英雄/关卡主钮/技能/基地）。
 * 视觉风格对齐原型：深蓝底 + 鎏金面板 + 金角饰 frame。
 * 界面显隐由 GameFlow 状态机驱动。
 */

/**
 * 关卡页（主界面）：章节页签 + 护送场景 + 难度 + 出击按钮，
 * 奖励详情弹窗与护送编队弹窗。
 */
export abstract class HomeUiStage extends HomeUiHeroes {
    /** 护送页动态元素 */
    protected _sceneEl: HTMLDivElement | null = null;

    protected _vehEl: HTMLDivElement | null = null;

    /** 章节头左侧的载具牌：本章护送的是什么车（浅色主题隐藏场景载具，这一枚是手机上唯一可见处） */
    protected _chVehEl: HTMLElement | null = null;

    protected _mobsEl: HTMLDivElement | null = null;

    /** 已领取里程碑的关卡（对齐原型 claimedRewards：ready 领取后置 got） */
    protected _claimedChests = new Set<string>();

    /** 章节头（‹ 章节名 + 副标 ›，替代原五章页签） */
    protected _chNameEl: HTMLElement | null = null;

    protected _chSubEl: HTMLElement | null = null;

    protected _chArrowL: HTMLButtonElement | null = null;

    protected _chArrowR: HTMLButtonElement | null = null;

    /** 场景底部注脚：我方队伍战力 / 本关推荐战力 */
    protected _capPowEl: HTMLElement | null = null;

    protected _capRecEl: HTMLElement | null = null;

    /** 里程碑三档容器（首次通关/耐久过半/完美护送，就地在主界面领取） */
    protected _chestRowEl: HTMLDivElement | null = null;

    /** 编队条：上阵席位数 + 四席头像 */
    protected _teamLabelEl: HTMLElement | null = null;

    protected _teamSlotsEl: HTMLDivElement | null = null;

    /** 场景左栏运营入口红点（签到/任务/礼包） */
    protected _sideSigninRed: HTMLElement | null = null;

    protected _sideQuestRed: HTMLElement | null = null;

    protected _sideGiftRed: HTMLElement | null = null;

    /** 无尽入口（已从底部左槽收进场景右侧栏；锁定态只降透明不禁用，点击落进未解锁拦截） */
    protected _endlessHot: HTMLButtonElement | null = null;

    /** 底部左·巡逻入口（挂机收益 + 扫荡；未通关第 1 关时点击进未解锁拦截） */
    protected _patrolHot: HTMLButtonElement | null = null;

    /** 巡逻入口红点（有挂机产出可收时亮） */
    protected _patrolRed: HTMLElement | null = null;


    // ---- 场景侧栏弹层分发（实现在链下游 HomeUiPlay；此处只声明入口供 _buildSideTools 接线） ----
    protected abstract _openSigninModal(): void;
    protected abstract _openQuestModal(): void;
    protected abstract _openTrialModal(): void;
    protected abstract _openBestiaryModal(): void;
    protected abstract _openLeaderboardModal(): void;
    /** 巡逻页（实现在链下游 HomeUiPlay） */
    protected abstract _openPatrolModal(): void;


    protected _startBattle(endless = false, _diff?: StageDifficulty): void {
        if (!this._root) {
            return;
        }
        // 守卫（体力/解锁/难度门槛）与开波统一走流程状态机；失败回滚显示防止黑屏。
        // 普通出战/无尽共用：难度取当前关卡页选择（无尽恒普通）
        if (!GameFlow.instance.startRun(endless, endless ? 0 : this._stageDiffSel)) {
            this._refreshAll();
            const gm = GameManager.instance;
            if (endless && gm.stageCleared < FINAL_STAGE_ID) {
                // 无尽锁定优先于体力：点「无尽」看到的第一阻塞点应是解锁条件
                this._openUnlockGate('无尽未解锁', '♾️', '无尽模式每 5 波一次里程碑奖励，需先通关全部章节');
            } else if (!gm.canStartRun()) {
                // 体力不足是最常见失败：3-C 拦截弹窗直接给两条出路（等待 / 看广告），不再 toast 混杂
                this._openStaminaGate(BattleConfig.RUN_STAMINA_COST);
            }
            return;
        }
        this.hide();
    }


    /**
     * 关卡页关卡切换：只在已解锁范围（1 ~ stageCleared+1）内移动。
     * 返回是否真的动了——不动时调用方据此给玩家一句说明，而不是把按钮做成死键。
     */
    protected _switchStage(dir: number): boolean {
        const gm = GameManager.instance;
        const maxUnlocked = Math.min(FINAL_STAGE_ID, gm.stageCleared + 1);
        const next = Math.min(maxUnlocked, Math.max(1, gm.currentStage + dir));
        if (next === gm.currentStage) {
            return false;
        }
        gm.currentStage = next;
        gm.save();
        this._refreshStagePage();
        return true;
    }


    /** 翻页器某一方向为什么走不动（null = 可以走）：边界不置灰吞点击，点了由调用方 toast 这句 */
    protected _stageStepBlocked(dir: number): string | null {
        const gm = GameManager.instance;
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        if (dir < 0) {
            return stageId <= 1 ? '已是第一章' : null;
        }
        if (stageId >= FINAL_STAGE_ID) {
            return '已是最后一章';
        }
        if (stageId >= gm.stageCleared + 1) {
            return `通关第 ${stageId} 章后解锁第 ${stageId + 1} 章`;
        }
        return null;
    }


    // ================= 关卡页（战斗页） =================

    /**
     * 护送页（布局稿 R2）：章节头 + 居中难度段 + 场景（内侧左右快捷栏 + 底部战力注脚）
     * + 里程碑三档 + 编队条 + 底部主 CTA。运营/快捷入口收进场景内侧，不再挂 viewport 悬浮。
     */
    protected _buildStagePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen sStage';
        this._pages.battle = page;

        // 章节头：章节名 + 副标（翻页器改挂场景内侧，见下方 mkArrow）
        const head = document.createElement('div');
        head.className = 'chapter-head';
        const hBox = document.createElement('div');
        hBox.className = 'chBox';
        const hName = document.createElement('h1');
        hName.className = 'chName';
        const hSub = document.createElement('small');
        hSub.className = 'chSub';
        hBox.appendChild(hName);
        hBox.appendChild(hSub);
        const hVeh = document.createElement('i');
        hVeh.className = 'chVeh';
        hVeh.textContent = '🚚';
        head.appendChild(hVeh);
        head.appendChild(hBox);
        page.appendChild(head);
        this._chNameEl = hName;
        this._chSubEl = hSub;
        this._chVehEl = hVeh;

        // 难度段：居中定宽三档（普通/精英/噩梦），无尽入口移到底部左快捷
        const diff = document.createElement('div');
        diff.className = 'difficulty';
        page.appendChild(diff);
        this._diffRowEl = diff;

        // 场景：护送底图 + 左运营栏 + 右快捷栏 + 底部战力注脚
        const stage = document.createElement('div');
        stage.className = 'stage';
        const scene = document.createElement('div');
        scene.className = 'stage-scene';
        scene.innerHTML = `<div class="sun"></div><div class="mtn"></div><div class="hill"></div>` +
            `<div class="ground"></div><div class="road"></div><div class="dash"></div>` +
            `<div class="mobs"><span>🐺</span><span>🐗</span><span>🦅</span></div>` +
            `<div class="veh">🚚</div>` +
            `<div class="crew"><i></i><i></i><i></i><i></i></div>`;
        stage.appendChild(scene);
        const railL = document.createElement('div');
        railL.className = 'side-tools left';
        this._buildSideTools(railL, 'L');
        const railR = document.createElement('div');
        railR.className = 'side-tools right';
        this._buildSideTools(railR, 'R');
        const cap = document.createElement('div');
        cap.className = 'stage-caption';
        cap.innerHTML = `<span>战力 <b class="capPow"></b></span><span>推荐 <b class="capRec"></b></span>`;
        stage.appendChild(railL);
        stage.appendChild(railR);
        stage.appendChild(cap);
        // 翻页器：章节切换箭头挂在场景内侧左右边缘的垂直中线上（不再占顶部一行，
        // 顶部只留章节名）。左右各距场景边 4px，落在两侧快捷列（贴边 3px 起 49px）之外。
        const mkArrow = (dir: number): HTMLButtonElement => {
            const b = document.createElement('button');
            b.className = 'arrow ' + (dir < 0 ? 'l' : 'r');
            b.textContent = dir < 0 ? '‹' : '›';
            b.title = dir < 0 ? '上一章' : '下一章';
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                const why = this._stageStepBlocked(dir);
                if (why) {
                    this._toast(why);
                } else {
                    this._switchStage(dir);
                }
            };
            return b;
        };
        const hl = mkArrow(-1);
        const hr = mkArrow(1);
        stage.appendChild(hl);
        stage.appendChild(hr);
        page.appendChild(stage);
        this._chArrowL = hl;
        this._chArrowR = hr;
        this._sceneEl = scene;
        this._capPowEl = cap.querySelector('.capPow');
        this._capRecEl = cap.querySelector('.capRec');
        // 浅色主题：场景底图 = escort.png 照片（interface.css：center 57%/cover），CSS 装饰子元素全部隐藏
        this._tex('scenes/escort', u => {
            scene.style.backgroundImage = u;
            scene.style.backgroundSize = 'cover';
            scene.style.backgroundPosition = 'center 57%';
            scene.style.backgroundRepeat = 'no-repeat';
        });
        this._vehEl = scene.querySelector('.veh');
        this._mobsEl = scene.querySelector('.mobs');

        // 里程碑三档：首次通关 / 耐久过半 / 完美护送（就地在主界面领取，明细走奖励详情弹窗）
        const chestRow = document.createElement('div');
        chestRow.className = 'milestones';
        page.appendChild(chestRow);
        this._chestRowEl = chestRow;

        // 编队条：编队席位数 + 四席头像 + 调整入口
        const team = document.createElement('div');
        team.className = 'team-strip';
        const teamLabel = document.createElement('span');
        teamLabel.className = 'team-label';
        team.appendChild(teamLabel);
        this._teamLabelEl = teamLabel;
        const teamSlots = document.createElement('div');
        teamSlots.className = 'team-slots';
        team.appendChild(teamSlots);
        this._teamSlotsEl = teamSlots;
        const squad = document.createElement('button');
        squad.className = 'hot squadEntry';
        squad.innerHTML = `<span class="ic">👥</span><span>编队</span>`;
        squad.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openSquadModal();
        };
        team.appendChild(squad);
        page.appendChild(team);

        // 底部：巡逻（左）+ 开始护送主 CTA（中）+ 宝箱奖励详情（右）
        // 无尽让出这个位置，收进场景右侧栏（与图鉴/排行/试炼同列）
        const bottom = document.createElement('div');
        bottom.className = 'battle-bottom';
        const patrol = document.createElement('button');
        patrol.className = 'hot patrolHot';
        patrol.innerHTML = `<span class="ic">🛡️</span><span>巡逻</span><i class="questRed"></i>`;
        patrol.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            if (!PatrolSystem.instance.unlocked()) {
                this._openUnlockGate('巡逻未解锁', '🛡️', '通关第 1 关后解锁：派巡逻队驻扎已通关关卡，离线攒收益并支持扫荡');
                return;
            }
            this._openPatrolModal();
        };
        bottom.appendChild(patrol);
        this._patrolHot = patrol;
        this._patrolRed = patrol.querySelector('.questRed');
        // 巡逻/掉落两枚 .ic 有 39px，是护送页页脚仅剩的两个大号 emoji 插画位。
        // 「编队」原先判过"不上图"——库里唯一的人形件 ico_friend 已经挂在页脚「好友」上，
        // 两个语义挂同一件等于把编队和好友压成同一个符号；r37 给它出了专件，所以三枚都上图
        this._tex(UiPlate.MODE_TEX.patrol, UiPlate.icon(patrol.querySelector('.ic') as HTMLElement));
        this._tex(UiPlate.MODE_TEX.squad, UiPlate.icon(squad.querySelector('.ic') as HTMLElement));
        const go = document.createElement('button');
        go.className = 'game-button major start go';
        go.innerHTML = `开始护送<small><span class="ic">⚡</span><span class="goCost"></span></small>`;
        go.onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            this._startBattle();
        };
        bottom.appendChild(go);
        this._goBtnEl = go;
        const detailBtn = document.createElement('button');
        detailBtn.className = 'hot rewardHot';
        detailBtn.innerHTML = `<span class="ic">🎁</span><span>掉落</span>`;
        detailBtn.title = '护送宝箱 · 奖励详情';
        // 掉落详情用补给箱件（不是礼包件）：这一格说的是"这趟会掉什么"，宝箱比礼盒读得对
        this._tex('ui/shop/shop_chest', UiPlate.icon(detailBtn.querySelector('.ic') as HTMLElement));
        detailBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openStageRewardModal();
        };
        bottom.appendChild(detailBtn);
        page.appendChild(bottom);

        root.appendChild(page);
    }


    /**
     * 护送场景内侧快捷栏：左·运营（签到/任务/礼包，带红点）右·快捷（图鉴/排行/试炼）。
     * 收进场景内后随页面显隐，无需 _switchPage 再切 on 类。
     */
    protected _buildSideTools(rail: HTMLDivElement, side: 'L' | 'R'): void {
        const mkBtn = (ic: string, label: string, red: boolean, onTap: () => void, tex?: string): HTMLButtonElement => {
            const b = document.createElement('button');
            b.className = 'hot toolHot';
            b.innerHTML = `<span class="ic">${ic}</span><span>${label}</span>`;
            // 在库图标到位即顶掉 emoji 占位（尺寸归 .side-tools .hot .ic，两层同 footprint）
            if (tex) {
                this._tex(tex, UiPlate.icon(b.querySelector('.ic') as HTMLElement));
            }
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                onTap();
            };
            rail.appendChild(b);
            if (red) {
                const dot = document.createElement('i');
                dot.className = 'questRed';
                b.appendChild(dot);
            }
            return b;
        };
        if (side === 'L') {
            const signBtn = mkBtn('📅', '签到', true, () => this._openSigninModal(), 'ui/ico/ico_signin');
            this._sideSigninRed = signBtn.querySelector('.questRed');
            const questBtn = mkBtn('📋', '任务', true, () => this._openQuestModal(), 'ui/ico/ico_task');
            this._sideQuestRed = questBtn.querySelector('.questRed');
            const giftBtn = mkBtn('🎁', '礼包', true, () => this._openGiftModal(), 'ui/shop/shop_gift');
            this._sideGiftRed = giftBtn.querySelector('.questRed');
            return;
        }
        mkBtn('📖', '图鉴', false, () => this._openBestiaryModal(), 'ui/shop/shop_scroll');
        mkBtn('🏆', '排行', false, () => this._openLeaderboardModal(), 'ui/ico/ico_trophy');
        mkBtn('🗼', '试炼', false, () => this._openTrialModal(), 'ui/ico/ico_trial');
        // 无尽从底部左槽收进侧栏：锁定态只降透明不禁用，点击落进未解锁拦截
        const endlessBtn = mkBtn('♾️', '无尽', false, () => {
            SoundFx.unlock();
            this._startBattle(true);
        }, 'ui/ico/ico_endless');
        endlessBtn.classList.add('endlessHot');
        endlessBtn.title = '波次无限 · 每 5 波里程碑奖励';
        this._endlessHot = endlessBtn;
    }

    /** 关卡难度选择（0 普通/1 精英/2 噩梦；跨关卡切换时重置为可解锁的最高档） */
    protected _stageDiffSel: StageDifficulty = 0;

    /** 难度选择器容器（_refreshStagePage 重建三档按钮） */
    protected _diffRowEl: HTMLDivElement | null = null;

    /** 底部主 CTA（体力口径与拦截提示） */
    protected _goBtnEl: HTMLButtonElement | null = null;


    /** 护送页刷新：章节头/场景/战力注脚/难度段/编队条（真数据 STAGES + stageCleared）；里程碑与运营红点一并同步 */
    protected _refreshStagePage(): void {
        const gm = GameManager.instance;
        const scene = this._sceneEl;
        if (!scene) {
            return;
        }
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        const info = stageInfo(stageId);
        const theme = CHAPTER_THEMES[stageId - 1] ?? CHAPTER_THEMES[0];

        const clearedAll = stageId <= gm.stageCleared;
        // 无尽模式可用态：全通关解锁（底部左快捷入口）
        const endlessOk = gm.stageCleared >= FINAL_STAGE_ID;

        // 章节头：名称 + 副标（对齐原型「护送主线 · 3/5」）+ 切换箭头可用态
        if (this._chNameEl) {
            this._chNameEl.textContent = info.name;
        }
        if (this._chSubEl) {
            const open = clearedAll || stageId === gm.stageCleared + 1;
            this._chSubEl.textContent = `${open ? '护送主线' : '尚未解锁'} · ${stageId}/${FINAL_STAGE_ID}`;
        }
        if (this._chVehEl) {
            this._chVehEl.textContent = theme.veh;
            const vehTex = UiPlate.VEHICLE_TEX[theme.veh];
            if (vehTex) {
                this._tex(vehTex, UiPlate.icon(this._chVehEl));
            }
        }
        if (this._chArrowL) {
            const whyL = this._stageStepBlocked(-1);
            this._chArrowL.classList.toggle('dim', whyL !== null);
            this._chArrowL.title = whyL ?? '上一章';
        }
        if (this._chArrowR) {
            const whyR = this._stageStepBlocked(1);
            this._chArrowR.classList.toggle('dim', whyR !== null);
            this._chArrowR.title = whyR ?? '下一章';
        }

        // 场景内容
        scene.className = 'stage-scene c' + ((stageId - 1) % 3 + 1);
        if (this._vehEl) {
            this._vehEl.textContent = theme.veh;
            this._tex('scenes/vehicle_tail', u => {
                if (this._vehEl) {
                    this._vehEl.style.backgroundImage = 'none';
                    this._vehEl.textContent = theme.veh;
                }
            });
        }
        if (this._mobsEl) {
            this._mobsEl.innerHTML = theme.mobs.map((m, i) =>
                `<span style="animation-delay:${i * 0.4}s">${m}</span>`).join('');
        }

        // 难度选择：切关卡时重置为本关已解锁的最高档
        let maxDiff: StageDifficulty = 0;
        for (const d of STAGE_DIFFS) {
            if (gm.isDiffUnlocked(stageId, d.id)) {
                maxDiff = d.id;
            }
        }
        if (this._stageDiffSel > maxDiff) {
            this._stageDiffSel = maxDiff;
        }
        if (!gm.isDiffUnlocked(stageId, this._stageDiffSel)) {
            this._stageDiffSel = 0;
        }
        const diffDef = stageDiffDef(this._stageDiffSel);

        // 难度条（布局稿：居中定宽三段）。锁定档只置灰不禁用，点击给解锁条件
        if (this._diffRowEl) {
            this._diffRowEl.innerHTML = '';
            for (const d of STAGE_DIFFS) {
                const unlocked = gm.isDiffUnlocked(stageId, d.id);
                const cleared = gm.isStageDiffCleared(stageId, d.id);
                const b = document.createElement('button');
                b.className = 'diffSeg' + (d.id === this._stageDiffSel ? ' on' : '') + (unlocked ? '' : ' off');
                b.textContent = `${unlocked ? '' : '🔒'}${cleared ? '✅' : ''}${d.name}`;
                b.title = unlocked
                    ? `怪强 ×${d.hpMul} · 奖励 ×${d.rewardMul}${cleared ? ' · 已通关' : ''}`
                    : `未解锁 · ${d.unlockNote}`;
                if (unlocked) {
                    b.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        this._stageDiffSel = d.id;
                        this._refreshStagePage();
                    };
                } else {
                    b.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        this._toast(`🔒 ${d.name}未解锁 · ${d.unlockNote}`);
                    };
                }
                this._diffRowEl.appendChild(b);
            }
        }

        // 场景底部注脚：我方编队战力 vs 本关推荐战力
        if (this._capPowEl) {
            this._capPowEl.textContent = gm.lineup.reduce((s, id) => s + this._heroPower(id), 0).toLocaleString();
        }
        if (this._capRecEl) {
            this._capRecEl.textContent = Math.round((7600 + stageId * 1400) * (0.7 + diffDef.hpMul * 0.3)).toLocaleString();
        }

        // 编队条：席位数 + 四席头像（空席显示 +，点击进编队抽屉）
        if (this._teamLabelEl) {
            this._teamLabelEl.innerHTML = `<b>编队 1</b>${gm.lineup.length} / ${GameManager.LINEUP_MAX} 已上阵`;
        }
        if (this._teamSlotsEl) {
            this._teamSlotsEl.innerHTML = '';
            for (let i = 0; i < GameManager.LINEUP_MAX; i++) {
                const id = gm.lineup[i];
                const av = document.createElement('button');
                av.className = 'slot-avatar' + (id ? '' : ' empty');
                if (id) {
                    const def = HERO_DEFS.find(d => d.id === id);
                    const photo = this._heroPhoto(Math.max(0, HERO_DEFS.findIndex(d => d.id === id)), 'slot');
                    const ic = document.createElement('span');
                    ic.className = 'ic';
                    ic.setAttribute('style', photo.css);
                    this._tex(photo.key, u => { ic.style.backgroundImage = u; });
                    av.appendChild(ic);
                    const nm = document.createElement('small');
                    nm.textContent = def ? def.name : id;
                    av.appendChild(nm);
                } else {
                    const plus = document.createElement('span');
                    plus.className = 'plus';
                    plus.textContent = '+';
                    av.appendChild(plus);
                    const nm = document.createElement('small');
                    nm.textContent = '空席';
                    av.appendChild(nm);
                }
                av.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openSquadModal();
                };
                this._teamSlotsEl.appendChild(av);
            }
        }

        // 底部：主 CTA 体力口径 + 无尽可用态（锁定只降透明，点击落进 3-C 未解锁拦截）
        if (this._goBtnEl) {
            const ok = gm.canStartRun();
            this._goBtnEl.classList.toggle('off', !ok);
            this._goBtnEl.title = ok ? '' : `体力不足（需要 ${BattleConfig.RUN_STAMINA_COST} 点）`;
            const cost = this._goBtnEl.querySelector('.goCost');
            if (cost) {
                cost.textContent = `${BattleConfig.RUN_STAMINA_COST}`;
            }
        }
        if (this._endlessHot) {
            this._endlessHot.classList.toggle('off', !endlessOk);
            this._endlessHot.title = endlessOk ? '波次无限 · 每 5 波里程碑奖励' : '通关全部章节后解锁';
        }
        // 巡逻：已通关关卡可驻扎挂机；红点在有产出可收时亮
        if (this._patrolHot) {
            const ps = PatrolSystem.instance;
            const unlocked = ps.unlocked();
            this._patrolHot.classList.toggle('off', !unlocked);
            this._patrolHot.title = !unlocked
                ? '通关第 1 关后解锁巡逻'
                : ps.isPatrolling
                    ? `巡逻中 · 第 ${ps.stageId} 关 · 已累积 ${ps.accruedText()}`
                    : `巡逻队待命 · 已通关 ${gm.stageCleared} 关，可驻扎挂机与扫荡`;
            if (this._patrolRed) {
                this._patrolRed.classList.toggle('on', unlocked && ps.hasClaimable());
            }
        }

        // 里程碑三档（就地在主界面领取）
        this._refreshBattleChests();

        // 场景左栏运营红点
        if (this._sideQuestRed) {
            this._refreshQuestRed(this._sideQuestRed);
        }
        if (this._sideSigninRed) {
            this._refreshSigninRed(this._sideSigninRed);
        }
        if (this._sideGiftRed) {
            this._refreshGiftDot(this._sideGiftRed);
        }
        this._applyPendingTex();
    }


    /**
     * 里程碑三档（布局稿：首次通关 / 耐久过半 / 完美护送）：通关结算奖励就地领取，
     * 金币区间与掉率明细走底部「掉落」入口的奖励详情弹窗。
     */
    protected _refreshBattleChests(): void {
        const row = this._chestRowEl;
        if (!row) {
            return;
        }
        const gm = GameManager.instance;
        row.innerHTML = '';
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        const clearedAll = stageId <= gm.stageCleared;
        const claimKey = `${stageId}`;
        const claimed = this._claimedChests.has(claimKey);
        const boxes: Array<[string, string, string]> = clearedAll
            ? [['首次通关', 'got', '已达成'], ['耐久过半', 'got', '已达成'], ['完美护送', 'got', '已达成']]
            : stageId === gm.stageCleared + 1
                ? [['首次通关', 'got', '已达成'], ['耐久过半', 'ready', ''], ['完美护送', 'lock', '需完美护送']]
                : [['首次通关', 'lock', '通关后结算'], ['耐久过半', 'lock', '通关后结算'], ['完美护送', 'lock', '通关后结算']];
        if (claimed && boxes[1][1] === 'ready') {
            boxes[1][1] = 'got';
            boxes[1][2] = '已领取';
        }
        // 进度轨：撤掉三格各自的金属板之后，中间那条线从装饰改成真的进度条（口径见 CSS 注释）。
        // 「可领取」也算推进到这一档——它已经达成了，只是还没点领取
        const done = boxes.filter(([, st]) => st !== 'lock').length / boxes.length;
        row.style.setProperty('--mile', done.toFixed(3));
        for (const [label, st, tip] of boxes) {
            const c = document.createElement('div');
            c.className = `hot milestone ${st}`;
            const cic = document.createElement('span');
            cic.className = 'ic';
            this._tex('ui/shop/chest', u => {
                cic.style.backgroundImage = u;
                cic.style.backgroundSize = 'contain';
                cic.style.backgroundRepeat = 'no-repeat';
                cic.style.backgroundPosition = 'center';
            });
            c.appendChild(cic);
            const p = document.createElement('span');
            p.textContent = label;
            c.appendChild(p);
            if (st === 'ready') {
                const b = document.createElement('button');
                b.className = 'game-button sm cbtn';
                b.textContent = '领取';
                b.onclick = (e) => {
                    e.stopPropagation();
                    this._claimedChests.add(claimKey);
                    SoundFx.play('coin');
                    this._toast('领取成功：金币 ×3,000 + 精炼合金 ×10');
                    this._refreshTop();
                    this._refreshBattleChests();
                };
                c.appendChild(b);
            } else {
                const tag = document.createElement('small');
                tag.textContent = tip;
                c.appendChild(tag);
            }
            c.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openStageRewardModal();
            };
            row.appendChild(c);
        }
    }


    /**
     * 关卡奖励详情（UX 布局稿：L3·M）：结算奖励预览——金币区间 + 装备/核心/稀有掉率
     * + 结算口径 KV；耐久宝箱仍在战斗页主界面领取。
     */
    protected _openStageRewardModal(): void {
        const gm = GameManager.instance;
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        const info = stageInfo(stageId);
        const diffDef = stageDiffDef(this._stageDiffSel);
        // 金币区间（结算公式折算 ±15% 浮动）+ 各档掉率（含关卡加成）
        const waves = stageWaves(stageId);
        let kills = 0;
        for (const w of waves) {
            kills += Math.round(w.count * (1 + w.eliteChance));
        }
        const goldMul = gm.metaGoldMul() * gm.depotGoldMul() * diffDef.rewardMul;
        const mid = (kills * 2 + WAVES_PER_STAGE * 15) * goldMul;
        const rates = lootRateText(stageId, diffDef.rewardMul);
        this._openPop({
            tier: 3,
            size: 'M',
            banner: `🎁 ${info.name} · 通关奖励`,
            art: `${diffDef.name}难度`,
            subtitle: `第 ${stageId} 关 · 掉率随关卡难度提升`,
            build: c => {
                c.appendChild(this._popSec('结算奖励预览'));
                c.appendChild(this._popAttr({
                    icon: '🪙',
                    text: `金币收益区间 **${Math.round(mid * 0.85).toLocaleString()} ~ ${Math.round(mid * 1.15).toLocaleString()}**`
                }));
                c.appendChild(this._popAttr({ icon: '🎁', text: `装备掉落率 **${rates.equip}**` }));
                c.appendChild(this._popAttr({ icon: '⚙️', text: `英雄核心掉落率 **${rates.core}**` }));
                c.appendChild(this._popAttr({ icon: '💎', text: `稀有杂物掉落率 **${rates.rare}**` }));
                c.appendChild(this._popSec('结算口径'));
                c.appendChild(this._popKV('金币公式', '击杀 ×2 + 波次 ×15 × 加成'));
                c.appendChild(this._popKV('难度加成', `×${diffDef.rewardMul.toFixed(2)}`));
                c.appendChild(this._popKV('装备强化', '+1 ~ +3 随机', 'free'));
            },
            note: '耐久结算宝箱在战斗页主界面领取 · 越少受伤，奖励越丰厚'
        });
    }


    /**
     * 护送编队（UX 布局稿：L4 半屏抽屉）：阵容槽位条[固定] + 羁绊激活态 + 候补英雄上下阵
     * + 保存 CTA。羁绊条件按星级门槛实时派生，改动即时回写战斗页 CTA 行。
     */
    protected _openSquadModal(): void {
        const gm = GameManager.instance;
        const opt = (): PopOpts => {
            const total = gm.lineup.reduce((s, id) => s + this._heroPower(id), 0);
            const actives = activeBonds();
            const full = gm.lineup.length >= GameManager.LINEUP_MAX;
            const applyToggle = (id: string): void => {
                SoundFx.unlock();
                if (gm.toggleLineupMember(id)) {
                    SoundFx.play('ui');
                    this._refreshStagePage();
                }
            };
            const toggle = (id: string): void => {
                applyToggle(id);
                this._popRebuild(opt());
            };
            /** 下阵走 S 型双按钮模板（UX 3-3）：消耗/移出类操作先确认再执行 */
            const confirmOff = (id: string): void => {
                const def = HERO_DEFS.find(d => d.id === id);
                const name = def ? def.name : id;
                this._popConfirm({
                    title: '下阵确认',
                    icon: '👥',
                    desc: `将「${name}」移出护送编队 · 战力 −${this._heroPower(id).toLocaleString()}`,
                    danger: true,
                    ok: '确 认 下 阵',
                    cancel: '再 想 想',
                    onOk: () => {
                        applyToggle(id);
                        this._popBack();
                        this._popRebuild(opt());
                    }
                });
            };
            return {
                tier: 4,
                size: 'M',
                banner: '👥 护送编队',
                art: `总战力 ${total.toLocaleString()}`,
                subtitle: `最多上阵 ${GameManager.LINEUP_MAX} 名英雄护卫载具尾部 · 当前 ${gm.lineup.length}/${GameManager.LINEUP_MAX}`,
                build: c => {
                    c.appendChild(this._popSec(`英雄羁绊 · 已激活 ${actives.length}/${BOND_DEFS.length}`));
                    for (const b of BOND_DEFS) {
                        const on = actives.indexOf(b) >= 0;
                        let cond: string;
                        if (b.starSumNeed !== undefined) {
                            let sum = 0;
                            let allIn = full;
                            for (const id of b.members) {
                                if (gm.lineup.indexOf(id) < 0) {
                                    allIn = false;
                                }
                                sum += RecruitSystem.instance.stars(id);
                            }
                            cond = allIn ? `星级合计 ${b.starSumNeed}★（当前 ${sum}★）` : '全员上阵';
                        } else {
                            const need = b.starNeed ?? 0;
                            const names = b.members.map(id => HERO_DEFS.find(d => d.id === id)?.name ?? id);
                            cond = `${names.join(' + ')} 双双 ${need}★`;
                        }
                        c.appendChild(this._popRow({
                            icon: b.ic,
                            title: b.name,
                            lines: [b.desc],
                            status: on ? '✅ 已激活' : cond,
                            statusKind: on ? 'soon' : undefined,
                            on
                        }));
                    }
                    c.appendChild(this._popSec('候补英雄 · 点选上下阵'));
                    for (const def of HERO_DEFS) {
                        const owned = gm.isHeroOwned(def.id);
                        const inLineup = gm.isInLineup(def.id);
                        c.appendChild(this._popRow({
                            icon: '🎖',
                            iconTex: this._heroPhoto(HERO_DEFS.indexOf(def), 'slot').key,
                            title: owned ? def.name : `🔒 ${def.name}`,
                            lines: [owned ? `战力 ${this._heroPower(def.id).toLocaleString()}` : '未获得 · 可在招募或商店解锁'],
                            status: inLineup ? '上阵中' : undefined,
                            on: inLineup,
                            action: {
                                label: inLineup ? '下阵' : '上阵',
                                kind: inLineup ? 'grey' : 'green',
                                disabled: !inLineup && full,
                                onDisabled: () => this._toast(`编队已满（${GameManager.LINEUP_MAX} 人）· 先下阵一名英雄`),
                                onClick: () => {
                                    if (!owned) {
                                        this._toast(`「${def.name}」尚未获得 · 可在商店解锁`);
                                        return;
                                    }
                                    if (inLineup) {
                                        confirmOff(def.id);
                                    } else {
                                        toggle(def.id);
                                    }
                                }
                            }
                        }));
                    }
                },
                slots: sb => {
                    for (let i = 0; i < GameManager.LINEUP_MAX; i++) {
                        const id = gm.lineup[i];
                        const cell = this._popSlot({
                            icon: id ? '🎖' : '＋',
                            on: !!id,
                            onClick: id ? () => confirmOff(id) : undefined
                        });
                        if (id) {
                            const photo = this._heroPhoto(Math.max(0, HERO_DEFS.findIndex(d => d.id === id)), 'slot');
                            this._tex(photo.key, u => {
                                cell.textContent = '';
                                cell.style.backgroundImage = u;
                                cell.style.cssText += photo.css;
                            });
                        }
                        sb.appendChild(cell);
                    }
                },
                ctas: [{
                    label: '保 存 编 队',
                    onClick: () => {
                        gm.save();
                        SoundFx.play('buy');
                        this._closePop();
                        this._toast('编队已保存');
                    }
                }],
                note: '羁绊按星级门槛实时派生 · 编队改动会影响护送战力'
            };
        };
        this._openPop(opt());
    }


}
