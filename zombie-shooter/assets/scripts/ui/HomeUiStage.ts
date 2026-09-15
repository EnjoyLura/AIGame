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
import { BOND_DEFS, activeBonds } from '../core/HeroBond';
import { NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES } from '../core/NoticeData';
import { HomeUiHeroes } from './HomeUiHeroes';
import type { PopOpts } from './HomeUiCore';

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
    /** 关卡页动态元素 */
    protected _sceneEl: HTMLDivElement | null = null;

    protected _sceneChipEl: HTMLDivElement | null = null;

    protected _vehEl: HTMLDivElement | null = null;

    protected _mobsEl: HTMLDivElement | null = null;

    protected _missionTitleEl: HTMLElement | null = null;

    /** 已领取宝箱的关卡（对齐原型 claimedRewards：ready 领取后置 got） */
    protected _claimedChests = new Set<string>();

    protected _siLvlEl: HTMLElement | null = null;

    protected _siPowEl: HTMLElement | null = null;

    protected _siStEl: HTMLElement | null = null;

    /** 章节头（‹ 章节名 ›，替代原五章页签） */
    protected _chNameEl: HTMLElement | null = null;

    protected _chArrowL: HTMLButtonElement | null = null;

    protected _chArrowR: HTMLButtonElement | null = null;

    /** 主页宝箱三档容器（自奖励弹窗上浮到战斗页） */
    protected _chestRowEl: HTMLDivElement | null = null;

    /** 战斗页专属悬浮栏（左运营：签到/任务/礼包；右快捷：无尽/试炼） */
    protected _railSigninRed: HTMLElement | null = null;

    protected _railQuestRed: HTMLElement | null = null;

    protected _railGiftRed: HTMLElement | null = null;

    protected _railEndlessBtn: HTMLButtonElement | null = null;


    // ---- 悬浮栏弹层分发（实现在链下游 HomeUiPlay；此处只声明入口供 _buildFloatRails 接线） ----
    protected abstract _openSigninModal(): void;
    protected abstract _openQuestModal(): void;
    protected abstract _openTrialModal(): void;


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


    /** 关卡页关卡切换：只在已解锁范围（1 ~ stageCleared+1）内移动 */
    protected _switchStage(dir: number): void {
        const gm = GameManager.instance;
        const maxUnlocked = Math.min(FINAL_STAGE_ID, gm.stageCleared + 1);
        const next = Math.min(maxUnlocked, Math.max(1, gm.currentStage + dir));
        if (next !== gm.currentStage) {
            gm.currentStage = next;
            gm.save();
            this._refreshStagePage();
        }
    }


    // ================= 关卡页（战斗页） =================

    /**
     * 战斗页：章节头 + 护送场景 + 关卡信息条 + 难度分段（行尾无尽 chip）+ 主页宝箱三档 + 编队/出战 CTA。
     * 悬浮栏（左运营/右快捷）挂 viewport、仅本页显示（_switchPage 切 on）。
     */
    protected _buildStagePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen sStage';
        this._pages.battle = page;

        // 章节头：‹ 章节名 ›（自原五章页签瘦身为单行标题，切换箭头从场景内上移到此）
        const head = document.createElement('div');
        head.className = 'chHead';
        const hl = document.createElement('button');
        hl.className = 'chArrow l';
        hl.textContent = '‹';
        hl.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._switchStage(-1);
        };
        const hName = document.createElement('div');
        hName.className = 'chName';
        const hr = document.createElement('button');
        hr.className = 'chArrow r';
        hr.textContent = '›';
        hr.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._switchStage(1);
        };
        head.appendChild(hl);
        head.appendChild(hName);
        head.appendChild(hr);
        page.appendChild(head);
        this._chNameEl = hName;
        this._chArrowL = hl;
        this._chArrowR = hr;

        // 护送场景（CSS 动画：太阳/山丘/公路/载具/怪物 + 关卡 chip 左上 + 最佳耐久 chip 右上 + 底部标题块）
        const scene = document.createElement('div');
        scene.className = 'scene frame';
        scene.innerHTML = `<div class="sun"></div><div class="mtn"></div><div class="hill"></div>` +
            `<div class="ground"></div><div class="road"></div><div class="dash"></div>` +
            `<div class="mobs"><span>🐺</span><span>🐗</span><span>🦅</span></div>` +
            `<div class="veh">🚚</div>` +
            `<div class="crew"><i></i><i></i><i></i><i></i></div>` +
            `<div class="sceneTitle"><small>末日航线 / 护送行动</small><h1 class="missionTitle"></h1>` +
            `<p>穿越荒原，让希望抵达下一站。</p></div>` +
            `<div class="sceneInfo"><div class="siChip"></div>` +
            `<div class="siHp">最佳耐久 <div class="hpBar"><i></i></div> 82%</div></div>`;
        page.appendChild(scene);
        this._sceneEl = scene;
        // 浅色主题：场景底图 = escort.png 照片（interface.css：center 57%/cover），CSS 装饰子元素全部隐藏
        this._tex('scenes/escort', u => {
            scene.style.backgroundImage = u;
            scene.style.backgroundSize = 'cover';
            scene.style.backgroundPosition = 'center 57%';
            scene.style.backgroundRepeat = 'no-repeat';
        });
        this._sceneChipEl = scene.querySelector('.siChip');
        this._vehEl = scene.querySelector('.veh');
        this._mobsEl = scene.querySelector('.mobs');
        this._missionTitleEl = scene.querySelector('.missionTitle');

        // 关卡信息单条三格：当前关卡 / 推荐战力 / 关卡状态
        const info = document.createElement('div');
        info.className = 'stageInfo';
        info.innerHTML = `<div class="siBox panel">当前关卡<b class="siLvl"></b></div>` +
            `<div class="siBox panel">推荐战力<b class="siPow"></b></div>` +
            `<div class="siBox panel">关卡状态<b class="siSt"></b></div>`;
        page.appendChild(info);
        this._siLvlEl = info.querySelector('.siLvl');
        this._siPowEl = info.querySelector('.siPow');
        this._siStEl = info.querySelector('.siSt');

        // 难度分段选择器：普通/精英/噩梦（行尾无尽 chip 在 _refreshStagePage 追加）
        const diffRow = document.createElement('div');
        diffRow.className = 'diffRow';
        page.appendChild(diffRow);
        this._diffRowEl = diffRow;

        // 主页宝箱三档 + 奖励详情入口（领取上浮到主界面，金币区间/掉率明细收进弹窗）
        const chestHead = document.createElement('div');
        chestHead.className = 'chestHead';
        const detailBtn = document.createElement('button');
        detailBtn.textContent = '🎁 护送宝箱 · 奖励详情 ›';
        detailBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openStageRewardModal();
        };
        chestHead.appendChild(detailBtn);
        page.appendChild(chestHead);
        const chestRow = document.createElement('div');
        chestRow.className = 'chests';
        page.appendChild(chestRow);
        this._chestRowEl = chestRow;

        // 底部 CTA：编队 + 出战（无尽入口上浮到难度行 chip 与右侧悬浮栏）
        const btns = document.createElement('div');
        btns.className = 'stageBtns';
        const squad = document.createElement('button');
        squad.className = 'btn blue squad';
        squad.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openSquadModal();
        };
        const go = document.createElement('button');
        go.className = 'btn gold go';
        go.textContent = '▶ 开始护送';
        go.onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            this._startBattle();
        };
        btns.appendChild(squad);
        btns.appendChild(go);
        page.appendChild(btns);
        this._squadBtn = squad;

        root.appendChild(page);
        this._buildFloatRails(root);
    }


    /** 战斗页专属悬浮栏：左·运营（签到/任务/礼包，带红点）右·快捷（无尽/试炼）；挂 viewport，仅 battle 页挂 on 类 */
    protected _buildFloatRails(root: HTMLDivElement): void {
        const mkBtn = (rail: HTMLDivElement, ic: string, label: string, onTap: () => void): HTMLButtonElement => {
            const b = document.createElement('button');
            b.className = 'frBtn';
            b.innerHTML = `<span class="fi">${ic}</span><span>${label}</span>`;
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                onTap();
            };
            rail.appendChild(b);
            return b;
        };
        const railL = document.createElement('div');
        railL.className = 'floatRail L';
        const signBtn = mkBtn(railL, '📅', '签到', () => this._openSigninModal());
        this._railSigninRed = document.createElement('i');
        this._railSigninRed.className = 'frRed';
        signBtn.appendChild(this._railSigninRed);
        const questBtn = mkBtn(railL, '📋', '任务', () => this._openQuestModal());
        this._railQuestRed = document.createElement('i');
        this._railQuestRed.className = 'frRed';
        questBtn.appendChild(this._railQuestRed);
        const giftBtn = mkBtn(railL, '🎁', '礼包', () => this._openGiftModal());
        this._railGiftRed = document.createElement('i');
        this._railGiftRed.className = 'frRed';
        giftBtn.appendChild(this._railGiftRed);
        root.appendChild(railL);

        const railR = document.createElement('div');
        railR.className = 'floatRail R';
        this._railEndlessBtn = mkBtn(railR, '♾️', '无尽', () => this._startBattle(true));
        mkBtn(railR, '🗼', '试炼', () => this._openTrialModal());
        root.appendChild(railR);
    }


    protected _squadBtn: HTMLButtonElement | null = null;

    /** 关卡难度选择（0 普通/1 精英/2 噩梦；跨关卡切换时重置为可解锁的最高档） */
    protected _stageDiffSel: StageDifficulty = 0;

    /** 难度选择器容器（_refreshStagePage 重建三档按钮） */
    protected _diffRowEl: HTMLDivElement | null = null;


    /** 战斗页刷新：章节头/场景内容/信息/难度（真数据 STAGES + stageCleared）；宝箱与悬浮栏红点一并同步 */
    protected _refreshStagePage(): void {
        const gm = GameManager.instance;
        const scene = this._sceneEl;
        if (!scene) {
            return;
        }
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        const info = stageInfo(stageId);
        const theme = CHAPTER_THEMES[stageId - 1] ?? CHAPTER_THEMES[0];

        // 章节头：名称 + 切换箭头可用态
        if (this._chNameEl) {
            this._chNameEl.textContent = info.name;
        }
        if (this._chArrowL) {
            this._chArrowL.disabled = stageId <= 1;
        }
        if (this._chArrowR) {
            this._chArrowR.disabled = !(stageId < FINAL_STAGE_ID && stageId < gm.stageCleared + 1);
        }

        // 场景内容
        scene.className = 'scene frame c' + ((stageId - 1) % 3 + 1);
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
        if (this._sceneChipEl) {
            this._sceneChipEl.textContent = `${info.name} ${theme.veh}`;
        }
        if (this._missionTitleEl) {
            this._missionTitleEl.textContent = info.name.replace(/^\d+\./, '');
        }

        // 关卡信息
        const clearedAll = stageId <= gm.stageCleared;
        // 无尽模式可用态：全通关解锁（难度行 chip 与右侧悬浮栏共用）
        const endlessOk = gm.stageCleared >= FINAL_STAGE_ID;
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
        if (this._diffRowEl) {
            this._diffRowEl.innerHTML = '';
            const head = document.createElement('div');
            head.className = 'diffHead';
            head.textContent = '⚔️ 难度';
            this._diffRowEl.appendChild(head);
            for (const d of STAGE_DIFFS) {
                const unlocked = gm.isDiffUnlocked(stageId, d.id);
                const cleared = gm.isStageDiffCleared(stageId, d.id);
                const b = document.createElement('button');
                b.className = 'btn sm diffBtn' + (d.id === this._stageDiffSel ? ' gold on' : unlocked ? ' blue' : ' dark lock');
                b.innerHTML = `<b>${d.ic} ${d.name}</b>` +
                    `<span>${unlocked ? (cleared ? '✅ 已通关' : `怪强 ×${d.hpMul} · 奖励 ×${d.rewardMul}`) : '🔒 ' + d.unlockNote}</span>`;
                if (!unlocked) {
                    b.disabled = true;
                } else {
                    b.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        this._stageDiffSel = d.id;
                        this._refreshStagePage();
                    };
                }
                this._diffRowEl.appendChild(b);
            }
            // 无尽 chip（自 stageBtns 迁入行尾）：全通关解锁，波次无限 + 里程碑奖励
            const endChip = document.createElement('button');
            endChip.className = 'btn sm dark endChip';
            endChip.textContent = endlessOk ? '♾️ 无尽' : '🔒 无尽';
            // 不禁用真按钮（disabled 会吞掉 click）：锁定态点击同样落进 3-C 未解锁拦截
            endChip.style.opacity = endlessOk ? '1' : '0.45';
            endChip.title = endlessOk ? '波次无限 · 每 5 波里程碑奖励' : '通关全部章节后解锁';
            endChip.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                this._startBattle(true);
            };
            this._diffRowEl.appendChild(endChip);
        }
        if (this._siLvlEl) {
            this._siLvlEl.textContent = `${stageId}-${this._stageDiffSel + 1}`;
        }
        if (this._siPowEl) {
            this._siPowEl.textContent = Math.round((7600 + stageId * 1400) * (0.7 + diffDef.hpMul * 0.3)).toLocaleString();
        }
        if (this._siStEl) {
            if (clearedAll) {
                this._siStEl.textContent = `✅ 已通关·${diffDef.name}`;
                this._siStEl.className = 'ok';
            } else if (stageId === gm.stageCleared + 1) {
                this._siStEl.textContent = `▶ ${diffDef.name}·待挑战`;
                this._siStEl.className = 'go';
            } else {
                this._siStEl.textContent = '🔒 未解锁';
                this._siStEl.className = '';
            }
        }

        // 编队按钮文案
        if (this._squadBtn) {
            this._squadBtn.textContent = `👥 护送编队 ${gm.lineup.length}/${GameManager.LINEUP_MAX}`;
        }

        // 主页宝箱三档 + 出战按钮体力口径
        this._refreshBattleChests();
        const go2 = document.querySelector<HTMLButtonElement>('#homeUi .btn.go');
        if (go2) {
            go2.style.opacity = gm.canStartRun() ? '1' : '0.45';
            go2.title = gm.canStartRun() ? '' : `体力不足（需要 ${BattleConfig.RUN_STAMINA_COST} 点）`;
        }

        // 悬浮栏红点 + 无尽可用态
        if (this._railQuestRed) {
            this._refreshQuestRed(this._railQuestRed);
        }
        if (this._railSigninRed) {
            this._refreshSigninRed(this._railSigninRed);
        }
        if (this._railGiftRed) {
            this._refreshGiftDot(this._railGiftRed);
        }
        if (this._railEndlessBtn) {
            // 不禁用真按钮（disabled 会吞掉 click）：保持可点，点击落进 3-C 未解锁拦截
            this._railEndlessBtn.style.opacity = endlessOk ? '1' : '0.45';
            this._railEndlessBtn.title = endlessOk ? '波次无限 · 每 5 波里程碑奖励' : '通关全部章节后解锁';
        }
        this._applyPendingTex();
    }


    /** 主页宝箱三档：耐久结算奖励上浮到战斗页（ready 可直接领取；明细见奖励详情弹窗） */
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
            ? [['耐久≥50%', 'got', '已领取'], ['耐久≥75%', 'got', '已领取'], ['满耐久通关', 'got', '已领取']]
            : stageId === gm.stageCleared + 1
                ? [['耐久≥50%', 'got', '已领取'], ['耐久≥75%', 'ready', ''], ['满耐久通关', 'lock', '需完美护送']]
                : [['耐久≥50%', 'lock', '通关后结算'], ['耐久≥75%', 'lock', '通关后结算'], ['满耐久通关', 'lock', '通关后结算']];
        if (claimed && boxes[1][1] === 'ready') {
            boxes[1][1] = 'got';
            boxes[1][2] = '已领取';
        }
        for (const [label, st, tip] of boxes) {
            const c = document.createElement('div');
            c.className = `chest panel ${st}`;
            const cic = document.createElement('span');
            cic.className = 'cic';
            this._tex('ui/chest', u => {
                cic.style.backgroundImage = u;
                cic.style.backgroundSize = 'contain';
                cic.style.backgroundRepeat = 'no-repeat';
                cic.style.backgroundPosition = 'center';
            });
            c.appendChild(cic);
            const p = document.createElement('p');
            p.textContent = label;
            c.appendChild(p);
            if (st === 'ready') {
                const b = document.createElement('button');
                b.className = 'btn gold sm cbtn';
                b.textContent = '领 取';
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
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.style.marginTop = 'calc(6px * var(--hs,1))';
                tag.style.display = 'inline-block';
                tag.textContent = tip;
                c.appendChild(tag);
            }
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
