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
import { STAGES, FINAL_STAGE_ID, stageInfo, stageWaves, STAGE_DIFFS, stageDiffDef, StageDifficulty } from '../battle/StageData';
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
    protected _stageTabsEl: HTMLDivElement | null = null;

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

    protected _arrowL: HTMLDivElement | null = null;

    protected _arrowR: HTMLDivElement | null = null;


    protected _startBattle(endless = false, _diff?: StageDifficulty): void {
        if (!this._root) {
            return;
        }
        // 守卫（体力/解锁/难度门槛）与开波统一走流程状态机；失败回滚显示防止黑屏。
        // 普通出战/无尽共用：难度取当前关卡页选择（无尽恒普通）
        if (!GameFlow.instance.startRun(endless, endless ? 0 : this._stageDiffSel)) {
            this._refreshAll();
            const gm = GameManager.instance;
            if (!gm.canStartRun()) {
                // 体力不足是最常见失败：说明需求并直接引导到体力获取面板（闭环，不让玩家干等）
                this._toast(`体力不足（需要 ${BattleConfig.RUN_STAMINA_COST} 点）`);
                this._openStaminaModal();
            } else if (endless) {
                this._toast('无尽模式需通关全部关卡后解锁');
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


    // ================= 关卡页 =================

    /** 关卡页：章节页签 + 波次进度轨道 + 护送场景（动画）+ 关卡信息 + 耐久宝箱 + 编队/出战 */
    protected _buildStagePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen sStage';
        this._pages.battle = page;

        // 章节页签（1~5 关，未解锁灰态）
        const tabs = document.createElement('div');
        tabs.className = 'chTabs';
        page.appendChild(tabs);
        this._stageTabsEl = tabs;

        // 护送场景（CSS 动画：太阳/山丘/公路/载具/怪物 + 任务标题 + 最佳耐久 + 左右箭头）
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
        const al = document.createElement('div');
        al.className = 'arrow l';
        al.textContent = '‹';
        al.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._switchStage(-1);
        };
        const ar = document.createElement('div');
        ar.className = 'arrow r';
        ar.textContent = '›';
        ar.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._switchStage(1);
        };
        scene.appendChild(al);
        scene.appendChild(ar);
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
        this._arrowL = al;
        this._arrowR = ar;

        // 关卡信息三格：当前关卡 / 推荐战力 / 关卡状态
        const info = document.createElement('div');
        info.className = 'stageInfo';
        info.innerHTML = `<div class="siBox panel">当前关卡<b class="siLvl"></b></div>` +
            `<div class="siBox panel">推荐战力<b class="siPow"></b></div>` +
            `<div class="siBox panel">关卡状态<b class="siSt"></b></div>`;
        page.appendChild(info);
        this._siLvlEl = info.querySelector('.siLvl');
        this._siPowEl = info.querySelector('.siPow');
        this._siStEl = info.querySelector('.siSt');

        // 难度选择器：普通/精英/噩梦三档（高难度需依次通关解锁）
        const diffRow = document.createElement('div');
        diffRow.className = 'diffRow';
        page.appendChild(diffRow);
        this._diffRowEl = diffRow;

        // 奖励详情入口：金币区间/掉落率/耐久宝箱三档收进弹窗，主界面只留出战决策
        const rewardBtn = document.createElement('button');
        rewardBtn.className = 'btn dark sm rewardEntry';
        rewardBtn.textContent = '🎁 奖励详情 · 金币 / 掉落 / 宝箱';
        rewardBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openStageRewardModal();
        };
        page.appendChild(rewardBtn);

        // 底部按钮：编队 + 出战
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
        // 无尽模式入口：全通关解锁，波次无限+每 5 波里程碑奖励
        const endlessAllClear = GameManager.instance.stageCleared >= FINAL_STAGE_ID;
        const goEndless = document.createElement('button');
        goEndless.className = 'btn dark go endless';
        goEndless.textContent = endlessAllClear ? '♾️ 无尽模式' : '🔒 无尽模式';
        goEndless.onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            this._startBattle(true);
        };
        btns.appendChild(squad);
        btns.appendChild(go);
        btns.appendChild(goEndless);
        page.appendChild(btns);
        this._squadBtn = squad;

        root.appendChild(page);
    }


    protected _squadBtn: HTMLButtonElement | null = null;

    /** 关卡难度选择（0 普通/1 精英/2 噩梦；跨关卡切换时重置为可解锁的最高档） */
    protected _stageDiffSel: StageDifficulty = 0;

    /** 难度选择器容器（_refreshStagePage 重建三档按钮） */
    protected _diffRowEl: HTMLDivElement | null = null;


    /** 关卡页刷新：章节页签/场景内容/信息（真数据 STAGES + stageCleared）；奖励详情收进弹窗 */
    protected _refreshStagePage(): void {
        const gm = GameManager.instance;
        const tabs = this._stageTabsEl;
        const scene = this._sceneEl;
        if (!tabs || !scene) {
            return;
        }
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        const info = stageInfo(stageId);
        const theme = CHAPTER_THEMES[stageId - 1] ?? CHAPTER_THEMES[0];

        // 章节页签
        tabs.innerHTML = '';
        STAGES.forEach((s, i) => {
            const open = s.id <= gm.stageCleared + 1;
            const b = document.createElement('button');
            b.className = (s.id === stageId ? 'on' : '') + (open ? '' : ' lock');
            const nm = document.createElement('b');
            nm.textContent = s.name;
            const sub = document.createElement('span');
            sub.textContent = open ? `难度 ×${s.hpMul}` : '🔒 未解锁';
            b.appendChild(nm);
            b.appendChild(sub);
            b.title = open ? `前往第 ${s.id} 关` : `通关第 ${s.id - 1} 关后解锁`;
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                if (!open) {
                    this._toast(`通关「${STAGES[i - 1]?.name ?? '上一关'}」后解锁`);
                    return;
                }
                gm.currentStage = s.id;
                gm.save();
                this._refreshStagePage();
            };
            tabs.appendChild(b);
        });

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
        if (this._arrowL) {
            this._arrowL.style.visibility = stageId > 1 ? 'visible' : 'hidden';
        }
        if (this._arrowR) {
            this._arrowR.style.visibility = stageId < FINAL_STAGE_ID && stageId < gm.stageCleared + 1 ? 'visible' : 'hidden';
        }

        // 关卡信息
        const clearedAll = stageId <= gm.stageCleared;
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

        // 出战按钮体力口径（css opacity）
        const go = document.querySelector<HTMLButtonElement>('#homeUi .btn.go');
        if (go) {
            go.style.opacity = gm.canStartRun() ? '1' : '0.45';
            go.title = gm.canStartRun() ? '' : `体力不足（需要 ${BattleConfig.RUN_STAMINA_COST} 点）`;
        }
        this._applyPendingTex();
    }


    /** 关卡奖励详情弹窗：通关奖励预览（金币区间/掉落率）+ 耐久结算宝箱三档（主界面瘦身收进这里） */
    protected _openStageRewardModal(): void {
        const gm = GameManager.instance;
        const stageId = Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID);
        const info = stageInfo(stageId);
        const diffDef = stageDiffDef(this._stageDiffSel);
        this._openModal(`🎁 ${info.name} · 通关奖励`, (box) => {
            box.classList.add('rewardBox');

            // 通关结算奖励预览：金币区间 + 装备/核心/稀有杂物掉落率（真数据公式）
            const lootPrev = document.createElement('div');
            lootPrev.className = 'lootPrev panel';
            lootPrev.innerHTML = `<div class="lpHead">⚔️ 通关结算奖励预览 · ${diffDef.name}难度</div>` +
                `<div class="lpRow"><span class="lpIc">🪙</span><span class="lpLab">金币收益区间</span><b class="lpVal lpGold"></b></div>` +
                `<div class="lpRow"><span class="lpIc">🎁</span><span class="lpLab">装备掉落率</span><b class="lpVal lpEquip"></b></div>` +
                `<div class="lpRow"><span class="lpIc">⚙️</span><span class="lpLab">英雄核心掉落率</span><b class="lpVal lpCore"></b></div>` +
                `<div class="lpRow"><span class="lpIc">💎</span><span class="lpLab">稀有杂物掉落率</span><b class="lpVal lpRare"></b></div>` +
                `<p class="lpNote">※ 掉率随关卡难度提升 · 装备强化等级 +1~+3 随机</p>`;
            box.appendChild(lootPrev);

            // 金币区间（结算公式折算 ±15% 浮动）+ 各档掉率（含关卡加成）
            const waves = stageWaves(stageId);
            let kills = 0;
            for (const w of waves) {
                kills += Math.round(w.count * (1 + w.eliteChance));
            }
            const goldMul = gm.metaGoldMul() * gm.depotGoldMul() * diffDef.rewardMul;
            const mid = (kills * 2 + WAVES_PER_STAGE * 15) * goldMul;
            const gold = lootPrev.querySelector('.lpGold');
            if (gold) {
                gold.textContent = `${Math.round(mid * 0.85).toLocaleString()} ~ ${Math.round(mid * 1.15).toLocaleString()}`;
            }
            const rates = lootRateText(stageId, diffDef.rewardMul);
            const eq = lootPrev.querySelector('.lpEquip');
            if (eq) {
                eq.textContent = rates.equip;
            }
            const co = lootPrev.querySelector('.lpCore');
            if (co) {
                co.textContent = rates.core;
            }
            const ra = lootPrev.querySelector('.lpRare');
            if (ra) {
                ra.textContent = rates.rare;
            }

            // 耐久结算宝箱三档
            const chestTitle = document.createElement('div');
            chestTitle.className = 'secTitle';
            chestTitle.textContent = '🎁 护送奖励 · 越少受伤，奖励越丰厚';
            box.appendChild(chestTitle);
            const chests = document.createElement('div');
            chests.className = 'chests';
            box.appendChild(chests);
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
                        // 就地重开弹窗，宝箱态刷新为已领取
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openStageRewardModal();
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
                chests.appendChild(c);
            }
        });
    }


    protected _openSquadModal(): void {
        this._openModal('👥 护送编队', (box) => {
            const gm = GameManager.instance;
            const render = () => {
                box.querySelector('.sqWrap')?.remove();
                const wrap = document.createElement('div');
                wrap.className = 'sqWrap';
                const sub = document.createElement('p');
                sub.className = 'mSub';
                const total = gm.lineup.reduce((s, id) => s + this._heroPower(id), 0);
                sub.innerHTML = `最多上阵 ${GameManager.LINEUP_MAX} 名英雄护卫载具尾部 · 当前 <b class="goldT">${gm.lineup.length}/${GameManager.LINEUP_MAX}</b> · 总战力 <b class="goldT">${total.toLocaleString()}</b>`;
                wrap.appendChild(sub);
                // 英雄羁绊：激活金色高亮，未激活灰字注明条件（星级门槛实时派生）
                const actives = activeBonds();
                const bondLab = document.createElement('p');
                bondLab.className = 'mSub';
                bondLab.innerHTML = `英雄羁绊 · 已激活 <b class="goldT">${actives.length}/${BOND_DEFS.length}</b>`;
                wrap.appendChild(bondLab);
                for (const b of BOND_DEFS) {
                    const on = actives.indexOf(b) >= 0;
                    const row = document.createElement('div');
                    row.className = 'bondRow' + (on ? ' on' : '');
                    let cond: string;
                    if (b.starSumNeed !== undefined) {
                        let sum = 0;
                        let allIn = gm.lineup.length >= GameManager.LINEUP_MAX;
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
                    row.innerHTML =
                        `<span class="bondIc">${b.ic}</span><span class="bondName">${b.name}</span>` +
                        `<span class="bondDesc">${b.desc}</span><span class="bondState">${on ? '✅ 已激活' : cond}</span>`;
                    wrap.appendChild(row);
                }
                const sq = document.createElement('div');
                sq.className = 'sqRow';
                for (let i = 0; i < GameManager.LINEUP_MAX; i++) {
                    const id = gm.lineup[i];
                    const slot = document.createElement('div');
                    slot.className = 'sqSlot' + (id ? '' : ' empty');
                    if (id) {
                        const def = HERO_DEFS.find(d => d.id === id);
                        const pic = document.createElement('span');
                        const hIdx = Math.max(0, HERO_DEFS.findIndex(d => d.id === id));
                        const slotPhoto = this._heroPhoto(hIdx, 'slot');
                        this._tex(slotPhoto.key, u => {
                            pic.style.backgroundImage = u;
                            pic.style.width = 'calc(44px * var(--pw,2.5))';
                            pic.style.height = 'calc(44px * var(--pw,2.5))';
                            pic.style.display = 'inline-block';
                            pic.style.cssText += slotPhoto.css;
                        });
                        const nm = document.createElement('span');
                        nm.textContent = def?.name ?? id;
                        slot.appendChild(pic);
                        slot.appendChild(nm);
                        slot.title = '点击下阵';
                        slot.onclick = (e) => {
                            e.stopPropagation();
                            if (gm.toggleLineupMember(id)) {
                                SoundFx.play('ui');
                                render();
                                this._refreshStagePage();
                            }
                        };
                    } else {
                        slot.textContent = '+';
                    }
                    sq.appendChild(slot);
                }
                wrap.appendChild(sq);
                const candLab = document.createElement('p');
                candLab.className = 'mSub';
                candLab.textContent = '候补英雄 · 点击上阵';
                wrap.appendChild(candLab);
                const cand = document.createElement('div');
                cand.className = 'cand';
                for (const def of HERO_DEFS) {
                    const owned = gm.isHeroOwned(def.id);
                    const inLineup = gm.isInLineup(def.id);
                    const b = document.createElement('button');
                    b.className = 'candB';
                    if (!owned) {
                        b.style.opacity = '.4';
                    }
                    const ic = document.createElement('b');
                    const pic = document.createElement('span');
                    const candIdx = HERO_DEFS.indexOf(def);
                    const candPhoto = this._heroPhoto(candIdx, 'slot');
                    this._tex(candPhoto.key, u => {
                        pic.style.backgroundImage = u;
                        pic.style.width = 'calc(40px * var(--pw,2.5))';
                        pic.style.height = 'calc(40px * var(--pw,2.5))';
                        pic.style.display = 'block';
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.cssText += candPhoto.css;
                    });
                    ic.appendChild(pic);
                    const nm = document.createElement('span');
                    nm.textContent = owned ? def.name : '🔒 未获得';
                    b.appendChild(ic);
                    b.appendChild(nm);
                    b.onclick = (e) => {
                        e.stopPropagation();
                        if (!owned) {
                            this._toast(`「${def.name}」尚未获得 · 可在商店解锁`);
                            return;
                        }
                        SoundFx.unlock();
                        if (gm.toggleLineupMember(def.id)) {
                            SoundFx.play('ui');
                            render();
                            this._refreshStagePage();
                        }
                    };
                    cand.appendChild(b);
                    void inLineup;
                }
                wrap.appendChild(cand);
                const save = document.createElement('button');
                save.className = 'btn gold big';
                save.style.marginTop = 'calc(14px * var(--hs,1))';
                save.textContent = '保存编队';
                save.onclick = (e) => {
                    e.stopPropagation();
                    gm.save();
                    SoundFx.play('buy');
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._toast('编队已保存');
                };
                wrap.appendChild(save);
                box.appendChild(wrap);
            };
            render();
        });
    }

}
