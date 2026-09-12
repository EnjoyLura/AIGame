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
import { HomeUiStage } from './HomeUiStage';

/**
 * 玩法大厅：每日任务/签到横幅 + 试炼/副本/远征/图鉴/排行入口卡
 * + 对应玩法弹窗（含入口红点调度）。
 */
export abstract class HomeUiPlay extends HomeUiStage {
    /** 玩法页（试炼/副本/远征/图鉴/排行 + 日常任务/签到） */
    protected _playGridEl: HTMLDivElement | null = null;

    /** 基地页任务入口红点 */
    protected _questRedEl: HTMLElement | null = null;

    /** 基地页签到入口红点 */
    protected _signinRedEl: HTMLElement | null = null;

    /** 远征当前选中的任务 */
    protected _expSel: ExpeditionId = 'scout';

    /** 远征当前选中的英雄（按任务切换时清空） */
    protected _expPicked: string[] = [];


    /**
     * 刷新玩法页入口卡的红点（副本/远征/试炼）。
     * _refreshPlayPage 重建卡片时会刷一遍；进度变动后由 _refreshTop 走这里增量补刷。
     */
    protected _refreshEntryReds(): void {
        const grid = this._playGridEl;
        if (!grid) {
            return;
        }
        const cards = grid.querySelectorAll<HTMLElement>('.bcard[data-entry]');
        for (const card of cards) {
            const red = card.querySelector('.bcardRed');
            if (red) {
                this._refreshPureEntryRed(card.dataset.entry ?? '', red as HTMLElement);
            }
        }
    }


    /**
     * 试炼之塔弹窗：层段网格（每 5 层一组）+ 选中层详情 + 挑战入口。
     * 格子状态：✅ 已通 / ▶ 可挑战（高亮）/ 🔒 未解锁；里程碑层（每 5 层）带 👑。
     */
    protected _openTrialModal(): void {
        const ts = TrialSystem.instance;
        // 选中层：默认停在「当前可挑战层」；越界钳到合法范围
        let sel = Math.min(TRIAL_MAX_FLOOR, Math.max(1, this._trialSelFloor || ts.nextFloor));
        if (sel > ts.nextFloor) {
            sel = ts.nextFloor;
        }
        this._trialSelFloor = sel;
        this._openModal('🗼 试炼之塔', (box) => {
            box.classList.add('trialBox');
            const head = document.createElement('div');
            head.className = 'siHead';
            head.innerHTML = ts.maxFloor > 0
                ? `<b>已通关 <i>${ts.clearedCount}</i> 层 · 最高第 ${ts.maxFloor} 层</b><span>每层 3 波 · 每 5 层大奖</span>`
                : '<b>尚未登塔</b><span>从第 1 层开始挑战</span>';
            box.appendChild(head);

            // 层段网格：每 5 层一组（含里程碑层），纵向滚动
            const list = document.createElement('div');
            list.className = 'trialList';
            const sects = Math.ceil(sel / TRIAL_MILESTONE_EVERY);
            const totalSects = Math.ceil(TRIAL_MAX_FLOOR / TRIAL_MILESTONE_EVERY);
            for (let s = 0; s < totalSects; s++) {
                const from = s * TRIAL_MILESTONE_EVERY + 1;
                const to = Math.min(TRIAL_MAX_FLOOR, from + TRIAL_MILESTONE_EVERY - 1);
                // 未推进到的层段折叠成一行（避免 60 层摊开太长），只露出解锁进度附近
                const lockedSect = from > ts.nextFloor;
                const sect = document.createElement('div');
                sect.className = 'trialSect' + (lockedSect ? ' lock' : '');
                const st = document.createElement('div');
                st.className = 'trialSectName';
                st.textContent = lockedSect
                    ? `第 ${from}~${to} 层 🔒`
                    : (s === sects - 1 ? `第 ${from}~${to} 层 · 当前层段` : `第 ${from}~${to} 层段`);
                sect.appendChild(st);
                if (!lockedSect) {
                    const grid = document.createElement('div');
                    grid.className = 'trialGrid';
                    for (let f = from; f <= to; f++) {
                        const cleared = ts.isFloorCleared(f);
                        const unlocked = ts.isFloorUnlocked(f);
                        const isNow = f === ts.nextFloor && !cleared;
                        const mile = f % TRIAL_MILESTONE_EVERY === 0;
                        const cell = document.createElement('div');
                        cell.className = 'trialCell panel'
                            + (cleared ? ' done' : isNow ? ' now' : unlocked ? '' : ' lock')
                            + (mile ? ' mile' : '')
                            + (f === sel ? ' sel' : '');
                        cell.innerHTML = `<b>${f}</b><span>${cleared ? '✅' : isNow ? '▶' : unlocked ? '◻' : '🔒'}</span>`
                            + (mile ? '<i>👑</i>' : '');
                        if (unlocked) {
                            cell.onclick = (e) => {
                                e.stopPropagation();
                                SoundFx.play('ui');
                                this._trialSelFloor = f;
                                document.querySelector('#homeUi .protoMask')?.remove();
                                this._openTrialModal();
                            };
                        }
                        grid.appendChild(cell);
                    }
                    sect.appendChild(grid);
                }
                list.appendChild(sect);
            }
            box.appendChild(list);

            // 选中层详情：怪强倍率 / 怪物池 / 首通奖励预览 / 挑战按钮
            const def = trialFloorDef(sel);
            const reward = trialFloorReward(sel);
            const cleared = ts.isFloorCleared(sel);
            const unlocked = ts.isFloorUnlocked(sel);
            const det = document.createElement('div');
            det.className = 'trialDetail panel';
            det.innerHTML = `<div class="trialName">第 ${sel} 层${def.milestone ? ' 👑 层段大奖' : ''}`
                + `<span>${def.sectName}</span></div>`;
            det.innerHTML += `<div class="trialStat">`
                + `<span>怪物强度 <b>×${def.hpMul.toFixed(1)}</b></span>`
                + `<span>精英率 <b>${Math.round(def.eliteChance * 100)}%</b></span>`
                + `<span>波次 <b>3 波</b></span></div>`;
            // 怪物池（图鉴美术 + 名称）
            const mobs = document.createElement('div');
            mobs.className = 'trialMobs';
            for (const m of def.monsters) {
                const bd = BESTIARY_DEFS.filter(d => d.id === m.id)[0];
                const cell = document.createElement('div');
                cell.className = 'trialMob';
                const pic = document.createElement('div');
                pic.className = 'trialMobPic';
                if (bd) {
                    this._tex(bd.art, u => {
                        pic.style.backgroundImage = u;
                        pic.style.backgroundSize = 'contain';
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.backgroundPosition = 'center bottom';
                    });
                }
                const nm = document.createElement('span');
                nm.textContent = bd ? bd.name : m.id;
                cell.appendChild(pic);
                cell.appendChild(nm);
                mobs.appendChild(cell);
            }
            if (def.monsters.length === 0) {
                mobs.innerHTML = '<span class="trialMobNm">—</span>';
            }
            det.appendChild(mobs);
            // 首通奖励预览
            const line = (ic: string, txt: string) => `<div class="trialRewardRow"><span>${ic}</span><b>${txt}</b></div>`;
            let rw = '';
            if (cleared) {
                rw = '<div class="trialRewardNote">✅ 已通关 · 可重复挑战（只得基础金币与少量掉落）</div>';
            } else if (unlocked) {
                rw = line('🪙', `${reward.gold.toLocaleString()} 金币`)
                    + (reward.diamond > 0 ? line('💎', `${reward.diamond} 钻石`) : '')
                    + (reward.drops.length > 0 ? line('🎁', `额外掉落 ×${reward.drops.length}`) : '');
                rw = `<div class="trialRewardHead">首通奖励</div>${rw}`;
            } else {
                rw = `<div class="trialRewardNote">🔒 需先通关第 ${sel - 1} 层</div>`;
            }
            const rwEl = document.createElement('div');
            rwEl.className = 'trialReward';
            rwEl.innerHTML = rw;
            det.appendChild(rwEl);
            box.appendChild(det);

            const go = document.createElement('button');
            go.className = 'btn gold big trialGo';
            go.textContent = !unlocked ? `🔒 第 ${sel} 层未解锁`
                : cleared ? `⚔️ 重挑 第 ${sel} 层` : `⚔️ 挑战 第 ${sel} 层`;
            go.disabled = !unlocked;
            go.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._startTrial(sel);
            };
            box.appendChild(go);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '试炼不消耗体力、不限次数；层内失败不影响已通关进度';
            box.appendChild(note);
        });
    }


    /** 选中层记忆（弹窗重开时保持焦点） */
    protected _trialSelFloor = 0;


    /** 进入试炼之塔某层：走流程状态机（免体力/免关卡门槛，只校验层数解锁链） */
    protected _startTrial(floor: number): void {
        if (!this._root) {
            return;
        }
        if (!GameFlow.instance.startRun(false, 0, floor)) {
            this._toast(`第 ${floor} 层尚未解锁`);
            return;
        }
        this.hide();
    }


    // ================= 资源副本 =================

    /** 选中副本记忆（弹窗重开时保持焦点） */
    protected _dungeonSel: DungeonId = 'gold';


    /**
     * 资源副本弹窗：四个副本卡片（图标/名称/今日剩余次数/三档按钮）+ 选中档位的产出预览。
     * 点档位就地刷新选中态与详情区，不重开弹窗（避免闪烁）。
     */
    protected _openDungeonModal(tier = 0): void {
        const ds = DungeonSystem.instance;
        const gm = GameManager.instance;
        const selId = this._dungeonSel;
        const selTier = Math.min(2, Math.max(0, Math.floor(tier)));
        this._openModal('🏰 资源副本', (box) => {
            box.classList.add('dungeonBox');
            const head = document.createElement('div');
            head.className = 'dgHead';
            head.innerHTML = `<div class="dgHeadTop"><b>今日次数</b>`
                + `<span>体力 ${gm.stamina()}/${gm.staminaMax()} · 每次消耗 ${DUNGEON_STAMINA_COST}</span></div>`
                + `<div class="dgSrc">每副本每日 ${DUNGEON_RUNS_PER_DAY} 次，隔日重置；通关打满 ${DUNGEON_WAVES} 波即结算</div>`;
            box.appendChild(head);

            const list = document.createElement('div');
            list.className = 'dgList';
            for (const def of DUNGEON_DEFS) {
                const left = ds.remaining(def.id);
                const row = document.createElement('div');
                row.className = 'dgRow' + (def.id === selId ? ' on' : '');
                const info = document.createElement('div');
                info.className = 'dgInfo';
                info.innerHTML = `<span class="dgIc">${def.ic}</span>`
                    + `<span class="dgMeta"><b>${def.name}</b><i>今日剩余 ${left}/${DUNGEON_RUNS_PER_DAY}</i></span>`;
                row.appendChild(info);
                const tiers = document.createElement('div');
                tiers.className = 'dgTiers';
                for (let t = 0; t < 3; t++) {
                    const tb = document.createElement('button');
                    const unlocked = ds.isTierUnlocked(def.id, t);
                    tb.className = 'btn sm dgTier' + (def.id === selId && t === selTier ? ' gold' : ' dark');
                    tb.textContent = DUNGEON_TIER_NAMES[t];
                    tb.disabled = !unlocked;
                    tb.title = unlocked ? '' : `需通关第 ${ds.unlockStageOf(def.id, t)} 关`;
                    tb.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        this._dungeonSel = def.id;
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openDungeonModal(t);
                    };
                    tiers.appendChild(tb);
                }
                row.appendChild(tiers);
                row.onclick = () => {
                    SoundFx.play('ui');
                    this._dungeonSel = def.id;
                };
                list.appendChild(row);
            }
            box.appendChild(list);

            // ---- 选中详情 + 产出预览 + 挑战入口 ----
            const def = dungeonDef(selId);
            if (!def) {
                return;
            }
            const detail = document.createElement('div');
            detail.className = 'dgDetail panel';
            const range = dungeonYieldRange(def.id, selTier);
            const left = ds.remaining(def.id);
            const gate = ds.canEnter(def.id, selTier);
            const staminaOk = gm.stamina() >= DUNGEON_STAMINA_COST;
            const yieldText = def.id === 'gold'
                ? `🪙 ${range.lo}~${range.hi} 金币${selTier === 2 ? ' + 💎 钻石' : ''}`
                : def.id === 'gem'
                    ? `💠 随机宝石 ×${range.lo}~${range.hi}（档位越高品质越好）`
                    : `${def.rewardIc[selTier]} ${def.id === 'stone' ? '强化石' : '精炼合金'} ×${range.lo}~${range.hi}`;
            detail.innerHTML = `<div class="dgName"><b>${def.ic} ${def.name}</b>`
                + `<i>${DUNGEON_TIER_NAMES[selTier]} · 今日剩余 ${left}/${DUNGEON_RUNS_PER_DAY}</i></div>`
                + `<div class="dgDesc">${def.desc}</div>`
                + `<div class="dgYield">预计产出：${yieldText}</div>`
                + `<div class="dgHint">${gate.ok
                    ? (staminaOk ? `消耗体力 ${DUNGEON_STAMINA_COST} 点` : `⚠️ 体力不足，需要 ${DUNGEON_STAMINA_COST} 点`)
                    : `🔒 ${gate.reason}`}</div>`;
            const go = document.createElement('button');
            go.className = 'btn big gold dgGo';
            go.textContent = gate.ok && staminaOk ? '挑 战' : (gate.ok ? '体力不足' : '未 解 锁');
            go.disabled = !gate.ok || !staminaOk;
            go.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                this._startDungeon(def.id, selTier);
            };
            detail.appendChild(go);
            box.appendChild(detail);
        });
    }


    // ================= 远征派遣 =================

    /**
     * 远征弹窗：三个任务位（列表）→ 选中详情（奖励预览 + 英雄选择）→ 派遣/领取/加速。
     * 倒计时每秒重绘一次，但剩余时间一律由 endTs 现算，定时器只负责画，不负责计时。
     */
    protected _openExpeditionModal(): void {
        const es = ExpeditionSystem.instance;
        const gm = GameManager.instance;
        const selId = this._expSel;
        this._openModal('🚀 远征派遣', (box) => {
            box.classList.add('expBox');
            const head = document.createElement('div');
            head.className = 'expHead';
            head.innerHTML = `<div class="expHeadTop"><b>今日次数</b>`
                + `<span>剩余 ${es.remainingToday()}/${EXPEDITION_RUNS_PER_DAY}</span></div>`
                + `<div class="expSrc">派英雄执行限时任务，真实时间到点回来领奖；三个任务可同时派遣</div>`;
            box.appendChild(head);

            const list = document.createElement('div');
            list.className = 'expList';
            for (const def of EXPEDITION_DEFS) {
                const st = es.stateOf(def.id);
                const row = document.createElement('div');
                row.className = 'expRow' + (def.id === selId ? ' on' : '') + (st === 'ready' ? ' ready' : '');
                const info = document.createElement('div');
                info.className = 'expInfo';
                const stateText = st === 'ready'
                    ? '✨ 可领取'
                    : st === 'running'
                        ? `⏳ ${es.remainText(def.id)}`
                        : `${def.minutes} 分钟`;
                info.innerHTML = `<span class="expIc">${def.ic}</span>`
                    + `<span class="expMeta"><b>${def.name}</b>`
                    + `<i>${HERO_ATTR_IC[def.attr]}${HERO_ATTR_NAMES[def.attr]} · ${def.slots} 人 · ${stateText}</i></span>`;
                row.appendChild(info);
                row.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._expSel = def.id;
                    this._expPicked = [];
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openExpeditionModal();
                };
                list.appendChild(row);
            }
            box.appendChild(list);

            const def = expeditionDef(selId);
            if (!def) {
                return;
            }
            const st = es.stateOf(def.id);
            const run = es.runOf(def.id);
            const detail = document.createElement('div');
            detail.className = 'expDetail panel';

            // ---- 奖励预览：已派遣的用定格倍率，未派遣的用当前选择的匹配度 ----
            const picked = st === 'idle' ? this._expPicked : [];
            const previewMult = run ? run.mult : matchMultiplier(def.attr, picked);
            const range = expeditionYieldRange(def.id, previewMult);
            const rewardParts: string[] = [`🪙 ${range.lo}~${range.hi} 金币`];
            if (def.diamond > 0) {
                rewardParts.push(`💎 ${Math.max(1, Math.round(def.diamond * previewMult))}`);
            }
            for (const item of def.misc) {
                const md = miscDef(item.id);
                rewardParts.push(`${md ? md.ic : '📦'} ${md ? md.name : item.id}×${Math.max(1, Math.round(item.n * previewMult))}`);
            }
            const multPct = Math.round(previewMult * 100);
            detail.innerHTML = `<div class="expName"><b>${def.ic} ${def.name}</b>`
                + `<i>${def.minutes} 分钟 · 需 ${def.slots} 人</i></div>`
                + `<div class="expDesc">${def.desc}</div>`
                + `<div class="expYield">预计产出：${rewardParts.join(' · ')}</div>`
                + `<div class="expMult">队伍匹配 ${HERO_ATTR_IC[def.attr]}${HERO_ATTR_NAMES[def.attr]} · 奖励 ×${(multPct / 100).toFixed(2)}</div>`;

            // ---- 英雄选择（仅空闲任务显示；已派遣的显示队伍名单） ----
            if (st === 'idle') {
                const grid = document.createElement('div');
                grid.className = 'expHeroes';
                const locked = gm.stageCleared < def.unlockStage;
                for (const hid of gm.ownedHeroes) {
                    const hdef = HERO_DEFS.find(d => d.id === hid);
                    const inLineup = gm.isInLineup(hid);
                    const busy = es.isHeroBusy(hid);
                    const null_ = !hdef;
                    if (null_) {
                        continue;
                    }
                    const isPicked = picked.indexOf(hid) >= 0;
                    const cell = document.createElement('button');
                    cell.className = 'expHero' + (isPicked ? ' sel' : '') + (inLineup || busy ? ' busy' : '');
                    const blockReason = inLineup ? '上阵中' : busy ? '远征中' : '';
                    cell.innerHTML = `<span class="ehIc">${hdef?.name.slice(0, 1) ?? '?'}</span>`
                        + `<span class="ehName">${hdef.name}</span>`
                        + `<span class="ehAttr">${HERO_ATTR_IC[def.attr]}${Math.round(heroAttrValue(hid, def.attr))}</span>`
                        + (blockReason ? `<span class="ehBusy">${blockReason}</span>` : '');
                    cell.disabled = locked || inLineup || busy;
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        const idx = this._expPicked.indexOf(hid);
                        if (idx >= 0) {
                            this._expPicked.splice(idx, 1);
                        } else if (this._expPicked.length >= def.slots) {
                            // 已满员：挤掉最早选的，保证「点谁选谁」的手感
                            this._expPicked.shift();
                            this._expPicked.push(hid);
                        } else {
                            this._expPicked.push(hid);
                        }
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openExpeditionModal();
                    };
                    grid.appendChild(cell);
                }
                detail.appendChild(grid);
                const pickHint = document.createElement('div');
                pickHint.className = 'expPick';
                pickHint.textContent = locked
                    ? `🔒 需通关第 ${def.unlockStage} 关`
                    : `已选 ${picked.length}/${def.slots} 人`;
                detail.appendChild(pickHint);
            } else if (run) {
                const names: string[] = [];
                for (const hid of run.heroes) {
                    const hdef = HERO_DEFS.find(d => d.id === hid);
                    names.push(hdef ? hdef.name : hid);
                }
                const team = document.createElement('div');
                team.className = 'expTeam';
                team.textContent = `出征队伍：${names.join('、')}`;
                detail.appendChild(team);
                if (st === 'running') {
                    const timer = document.createElement('div');
                    timer.className = 'expTimer';
                    timer.textContent = `⏳ 剩余 ${es.remainText(def.id)}`;
                    detail.appendChild(timer);
                }
            }

            // ---- 操作区 ----
            const actions = document.createElement('div');
            actions.className = 'expActions';
            if (st === 'idle') {
                const gate = es.canStart(def.id, picked);
                const go = document.createElement('button');
                go.className = 'btn big gold expGo';
                go.textContent = picked.length < def.slots
                    ? `请选择 ${def.slots - picked.length} 名英雄`
                    : (gate.ok ? '派 遣' : gate.reason ?? '不可派遣');
                go.disabled = !gate.ok;
                go.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (es.start(def.id, picked)) {
                        SoundFx.play('buy');
                        this._toast(`${def.name} 已出发`);
                        this._expPicked = [];
                        this._refreshTop();
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openExpeditionModal();
                    } else {
                        this._toast(es.canStart(def.id, picked).reason ?? '派遣失败');
                    }
                };
                actions.appendChild(go);
            } else if (st === 'ready') {
                const take = document.createElement('button');
                take.className = 'btn big gold expGo';
                take.textContent = '领 取 奖 励';
                take.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const reward = es.finish(def.id);
                    if (reward) {
                        SoundFx.play('coin');
                        this._toast(`${def.name} 完成：${rewardText({ gold: reward.gold, diamond: reward.diamond, misc: reward.misc })}`);
                        this._refreshTop();
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openExpeditionModal();
                    }
                };
                actions.appendChild(take);
            } else {
                const cost = es.speedUpCost(def.id);
                const canPay = gm.res.get('diamond') >= cost;
                const fast = document.createElement('button');
                fast.className = 'btn gold expGo';
                fast.textContent = cost > 0 ? `💎${cost} 立即完成` : '立即完成';
                fast.disabled = !canPay;
                fast.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (es.speedUpCost(def.id) <= 0) {
                        return;
                    }
                    if (!gm.res.spend('diamond', es.speedUpCost(def.id))) {
                        this._toast('钻石不足');
                        return;
                    }
                    gm.save();
                    es.speedUp(def.id);
                    SoundFx.play('buy');
                    this._toast('已立即完成，快去领取');
                    this._refreshTop();
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openExpeditionModal();
                };
                actions.appendChild(fast);
                const adLeft = AdService.instance.remaining('expedition');
                const free = document.createElement('button');
                free.className = 'btn dark expGo';
                free.textContent = adLeft > 0 ? `📺 免费完成 (${adLeft})` : '📺 今日已用完';
                free.disabled = adLeft <= 0;
                free.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    AdService.instance.claimReward('expedition', () => {
                        es.speedUp(def.id);
                        gm.save();
                        this._toast('广告加速完成');
                        this._refreshTop();
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openExpeditionModal();
                    });
                };
                actions.appendChild(free);
            }
            detail.appendChild(actions);
            box.appendChild(detail);

            // ---- 倒计时驱动：每秒重绘；归零时广播一次 EXPEDITION_READY 并就地刷新 ----
            clearInterval(this._expTimer);
            const readyFired: string[] = [];
            this._expTimer = setInterval(() => {
                const mask = document.querySelector('#homeUi .protoMask');
                if (!mask) {
                    clearInterval(this._expTimer);
                    return;
                }
                let anyReady = false;
                for (const d of EXPEDITION_DEFS) {
                    if (es.stateOf(d.id) === 'ready') {
                        anyReady = true;
                        if (readyFired.indexOf(d.id) < 0) {
                            readyFired.push(d.id);
                            eventCenter.emit(GameEvent.EXPEDITION_READY, d.id);
                        }
                    }
                }
                const t = box.querySelector('.expTimer');
                if (t) {
                    t.textContent = `⏳ 剩余 ${es.remainText(def.id)}`;
                }
                if (anyReady) {
                    clearInterval(this._expTimer);
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openExpeditionModal();
                }
            }, 1000) as unknown as number;
        });
    }


    /** 进入资源副本：走流程状态机（内部校验次数/体力/档位，失败给出具体原因） */
    protected _startDungeon(id: DungeonId, tier: number): void {
        if (!this._root) {
            return;
        }
        const def = dungeonDef(id);
        // 进入前再校验一次（弹窗打开期间体力/次数可能已变），给出精确提示
        const gate = DungeonSystem.instance.canEnter(id, tier);
        if (!gate.ok) {
            this._toast(gate.reason ?? '无法进入');
            document.querySelector('#homeUi .protoMask')?.remove();
            this._openDungeonModal(tier);
            return;
        }
        if (GameManager.instance.stamina() < DUNGEON_STAMINA_COST) {
            this._toast(`体力不足（需要 ${DUNGEON_STAMINA_COST} 点）`);
            return;
        }
        if (!GameFlow.instance.startRun(false, 0, encodeDungeon(id, tier))) {
            this._toast('进入副本失败');
            return;
        }
        SoundFx.play('ui');
        this._toast(`${def ? def.name : '副本'} · ${DUNGEON_TIER_NAMES[tier]} 开始`);
        this.hide();
    }


    /** 怪物图鉴弹窗：完成度头部 + 五怪网格（未解锁剪影）+ 点卡片进详情浮窗 */
    protected _openBestiaryModal(): void {
        const bs = BestiarySystem.instance;
        this._openModal('📖 怪物图鉴', (box) => {
            box.classList.add('besBox');
            const { done, total } = bs.completion();
            const head = document.createElement('div');
            head.className = 'siHead';
            head.innerHTML = `<b>已收录 <i>${done}</i> / ${total} 种</b><span>击杀对应怪物自动解锁</span>`;
            box.appendChild(head);
            const grid = document.createElement('div');
            grid.className = 'besGrid';
            for (const def of BESTIARY_DEFS) {
                const unlocked = bs.unlocked(def.id);
                const kills = bs.kills(def.id);
                const cell = document.createElement('div');
                cell.className = 'besCell panel' + (unlocked ? '' : ' lock');
                const pic = document.createElement('div');
                pic.className = 'besPic';
                this._tex(def.art, u => {
                    pic.style.backgroundImage = u;
                    pic.style.backgroundSize = 'contain';
                    pic.style.backgroundRepeat = 'no-repeat';
                    pic.style.backgroundPosition = 'center bottom';
                });
                const nm = document.createElement('div');
                nm.className = 'besNm';
                nm.textContent = unlocked ? def.name : '？？？';
                const sub = document.createElement('div');
                sub.className = 'besSub';
                sub.textContent = unlocked ? `击杀 ×${kills}` : '尚未遭遇';
                cell.appendChild(pic);
                cell.appendChild(nm);
                cell.appendChild(sub);
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBestiaryDetail(def);
                };
                grid.appendChild(cell);
            }
            box.appendChild(grid);
            // 精英怪累计 + 提示
            const elite = document.createElement('div');
            elite.className = 'besElite';
            elite.innerHTML = `<span>🩸 精英怪累计击杀：<b>${bs.eliteKills}</b></span><span>精英怪体型更大、数值更强（红色描边）</span>`;
            box.appendChild(elite);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '出战迎战每一种怪物，击杀后自动收录进图鉴';
            box.appendChild(note);
        });
    }


    /** 图鉴详情浮窗：立绘 + 威胁星级 + 习性/数值 + 遭遇记录（未解锁灰态剪影） */
    protected _openBestiaryDetail(def: BestiaryDef): void {
        const bs = BestiarySystem.instance;
        this._openModal('📖 图鉴详情', (box) => {
            box.classList.add('besBox');
            const unlocked = bs.unlocked(def.id);
            const wrap = document.createElement('div');
            wrap.className = 'besDetail panel' + (unlocked ? '' : ' lock');
            const pic = document.createElement('div');
            pic.className = 'besDetailPic';
            if (unlocked) {
                this._tex(def.art, u => {
                    pic.style.backgroundImage = u;
                    pic.style.backgroundSize = 'contain';
                    pic.style.backgroundRepeat = 'no-repeat';
                    pic.style.backgroundPosition = 'center bottom';
                });
            }
            const info = document.createElement('div');
            info.className = 'besDetailInfo';
            const nm = document.createElement('div');
            nm.className = 'besDetailName';
            nm.innerHTML = `<b>${unlocked ? def.name : '？？？'}</b><span class="besStars">${unlocked ? '★'.repeat(def.threat) + '☆'.repeat(5 - def.threat) : '☆☆☆☆☆'}</span>`;
            const beh = document.createElement('div');
            beh.className = 'besBeh';
            beh.textContent = unlocked ? def.behavior : '？？？ · ？？？';
            const desc = document.createElement('div');
            desc.className = 'besDesc';
            desc.textContent = unlocked ? def.desc : '尚未遭遇该怪物。出击迎战，击杀后自动收录。';
            const stats = document.createElement('div');
            stats.className = 'besStats';
            if (unlocked) {
                stats.innerHTML =
                    `<div class="besStatRow"><span>基准生命</span><b>${def.stats.hp.toLocaleString()}</b></div>` +
                    `<div class="besStatRow"><span>移动速度</span><b>${def.stats.speed}</b></div>` +
                    `<div class="besStatRow"><span>啃咬伤害</span><b>${def.stats.touchDamage}</b></div>` +
                    `<div class="besStatRow"><span>首次出没</span><b>${def.debut}</b></div>` +
                    `<div class="besStatRow"><span>累计击杀</span><b>×${bs.kills(def.id)}</b></div>`;
            } else {
                stats.innerHTML = '<div class="besStatRow"><span>数据未收录</span><b>—</b></div>';
            }
            info.appendChild(nm);
            info.appendChild(beh);
            info.appendChild(desc);
            info.appendChild(stats);
            wrap.appendChild(pic);
            wrap.appendChild(info);
            box.appendChild(wrap);
            const ok = document.createElement('button');
            ok.className = 'btn gold big biOk';
            ok.textContent = '返 回 图 鉴';
            ok.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openBestiaryModal();
            };
            box.appendChild(ok);
        });
    }


    /** 七日签到弹窗：日历格子（已领/今日可领高亮/未到档位）+ 今日奖励详情 + 领取 */
    protected _openSigninModal(): void {
        const ss = SigninSystem.instance;
        this._openModal('📅 每日签到 · 七日目标', (box) => {
            box.classList.add('signinBox');
            const rewardText = (r: SigninReward): string => {
                const parts: string[] = [];
                if (r.reward.gold) {
                    parts.push(`🪙${r.reward.gold.toLocaleString()}`);
                }
                if (r.reward.diamond) {
                    parts.push(`💎${r.reward.diamond}`);
                }
                if (r.reward.misc) {
                    parts.push(`${miscDef(r.reward.misc.id)?.ic ?? '📦'}×${r.reward.misc.n}`);
                }
                return parts.join(' ');
            };
            // 历史累计 + 当前循环进度
            const head = document.createElement('div');
            head.className = 'siHead';
            head.innerHTML = `<b>累计签到 <i>${ss.totalDays}</i> 天</b><span>当前第 ${ss.day} / 7 天 · 断签不惩罚</span>`;
            box.appendChild(head);
            // 七日日历格子
            const grid = document.createElement('div');
            grid.className = 'siGrid';
            const claimedToday = ss.isTodayClaimed();
            const curDay = ss.day;
            // 今日刚领的档位（已领时 day 指针已前移，回退一格）
            const justClaimedDay = claimedToday ? (curDay === 1 ? 7 : curDay - 1) : 0;
            // 今日可领的档位
            const claimableDay = claimedToday ? 0 : curDay;
            for (const r of SIGNIN_REWARDS) {
                // 本轮已领：day 指针之前的档位
                const done = r.day < curDay;
                const isToday = r.day === claimableDay || r.day === justClaimedDay;
                const cell = document.createElement('div');
                cell.className = 'siCell panel' + (isToday ? ' today' : '') + (done ? ' done' : '');
                const ic = document.createElement('div');
                ic.className = 'siIc';
                ic.textContent = done ? '✅' : r.ic;
                const nm = document.createElement('div');
                nm.className = 'siNm';
                nm.textContent = r.label;
                const dy = document.createElement('div');
                dy.className = 'siDy';
                dy.textContent = r.day === 7 ? '第7天·大奖' : `第${r.day}天`;
                const rw = document.createElement('div');
                rw.className = 'siRw';
                rw.textContent = rewardText(r);
                cell.appendChild(ic);
                cell.appendChild(nm);
                cell.appendChild(dy);
                cell.appendChild(rw);
                grid.appendChild(cell);
            }
            box.appendChild(grid);
            // 今日奖励详情 + 领取按钮
            const claimed = ss.isTodayClaimed();
            const today = ss.todayReward();
            const foot = document.createElement('div');
            foot.className = 'siFoot panel' + (claimed ? ' done' : ' ready');
            const info = document.createElement('div');
            info.className = 'siInfo';
            info.innerHTML = `<b>今日档位：${today.ic} ${today.label}</b><span>${rewardText(today)}</span>`;
            foot.appendChild(info);
            const btn = document.createElement('button');
            btn.className = `btn ${claimed ? 'dark' : 'gold'} sm`;
            btn.textContent = claimed ? '今日已签到' : '签 到';
            btn.disabled = claimed;
            if (!claimed) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const got = ss.claim();
                    if (got) {
                        SoundFx.play('coin');
                        this._toast(`签到成功：${got.label}`);
                        this._refreshTop();
                        this._refreshSigninRed(this._signinRedEl);
                        // 整弹重开刷新日历状态
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openSigninModal();
                    }
                };
            }
            foot.appendChild(btn);
            box.appendChild(foot);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '每天登录领一档 · 领满 7 天开新一轮 · 错过不补领';
            box.appendChild(note);
        });
    }


    /** 任务中心弹窗：活跃度宝箱 + 每日任务（自然日重置）+ 成就（累计里程碑），进度条 + 领奖 */
    protected _openQuestModal(): void {
        const qs = QuestSystem.instance;
        this._openModal('📋 任务 · 成就', (box) => {
            box.classList.add('questBox');
            const mkSection = (title: string, sub: string) => {
                const head = document.createElement('div');
                head.className = 'qSecHead';
                head.innerHTML = `<b>${title}</b><span>${sub}</span>`;
                box.appendChild(head);
            };
            const mkRow = (def: QuestDef) => {
                const done = qs.isComplete(def);
                const claimed = qs.isClaimed(def);
                const prog = qs.progress(def);
                const row = document.createElement('div');
                row.className = 'questRow panel' + (claimed ? ' done' : done ? ' ready' : '');
                const ic = document.createElement('div');
                ic.className = 'qIc';
                ic.textContent = def.ic;
                row.appendChild(ic);
                const mid = document.createElement('div');
                mid.className = 'qMid';
                const nm = document.createElement('b');
                nm.textContent = def.name;
                mid.appendChild(nm);
                const bar = document.createElement('div');
                bar.className = 'qBar';
                const fill = document.createElement('i');
                fill.style.width = `${Math.max(claimed ? 100 : 0, Math.min(100, Math.round(prog / def.target * 100)))}%`;
                bar.appendChild(fill);
                mid.appendChild(bar);
                const num = document.createElement('span');
                num.className = 'qNum';
                num.textContent = `${prog.toLocaleString()} / ${def.target.toLocaleString()}`;
                mid.appendChild(num);
                row.appendChild(mid);
                const right = document.createElement('div');
                right.className = 'qRight';
                const rw = document.createElement('span');
                rw.className = 'qReward';
                // 每日任务额外标出活跃度：让玩家看清"领了这单能推进宝箱"
                const act = qs.activityOf(def);
                rw.textContent = rewardText(def.reward) + (act > 0 ? ` · 活跃+${act}` : '');
                right.appendChild(rw);
                const btn = document.createElement('button');
                btn.className = `btn sm ${done && !claimed ? 'gold' : 'dark'}`;
                btn.textContent = claimed ? '已领取' : done ? '领 取' : '进行中';
                btn.disabled = !done || claimed;
                if (done && !claimed) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.unlock();
                        if (qs.claim(def)) {
                            SoundFx.play('coin');
                            this._toast(`领取成功：${def.name}`);
                            this._refreshTop();
                            // 整弹重开刷新状态 + 同步基地页红点
                            document.querySelector('#homeUi .protoMask')?.remove();
                            this._refreshQuestRed(this._questRedEl);
                            this._openQuestModal();
                        }
                    };
                }
                right.appendChild(btn);
                row.appendChild(right);
                box.appendChild(row);
            };

            // ---- 活跃度宝箱（置顶：这是任务体系的目标总览，也让"领任务"有明确指向） ----
            const act = qs.activity;
            const actBox = document.createElement('div');
            actBox.className = 'actBox panel';
            const actHead = document.createElement('div');
            actHead.className = 'actHead';
            actHead.innerHTML = `<b>🔥 活跃度</b><span>${act} / ${ACTIVITY_MAX}</span>`;
            actBox.appendChild(actHead);
            const actBar = document.createElement('div');
            actBar.className = 'qBar actBar';
            const actFill = document.createElement('i');
            actFill.style.width = `${Math.min(100, Math.round(act / ACTIVITY_MAX * 100))}%`;
            actBar.appendChild(actFill);
            actBox.appendChild(actBar);
            const chests = document.createElement('div');
            chests.className = 'actChests';
            for (const c of ACTIVITY_CHESTS) {
                const claimed = qs.isChestClaimed(c);
                const can = qs.canClaimChest(c);
                const cell = document.createElement('div');
                cell.className = 'actChest' + (claimed ? ' done' : can ? ' ready' : '');
                const need = Math.max(0, c.need - act);
                cell.innerHTML =
                    `<div class="acIc">${c.ic}</div>` +
                    `<div class="acName">${c.name}</div>` +
                    `<div class="acReward">${rewardText(c.reward)}</div>` +
                    `<div class="acNeed">${claimed ? '已领取' : can ? `可开启 · ${c.need}` : `还差 ${need}`}</div>`;
                const btn = document.createElement('button');
                btn.className = `btn sm ${can ? 'gold' : 'dark'}`;
                btn.textContent = claimed ? '已领取' : can ? '开 启' : `${c.need} 活跃`;
                btn.disabled = !can;
                if (can) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.unlock();
                        if (qs.claimChest(c)) {
                            SoundFx.play('coin');
                            this._toast(`${c.name} 开启：${rewardText(c.reward)}`);
                            this._refreshTop();
                            document.querySelector('#homeUi .protoMask')?.remove();
                            this._refreshQuestRed(this._questRedEl);
                            this._openQuestModal();
                        }
                    };
                }
                cell.appendChild(btn);
                chests.appendChild(cell);
            }
            actBox.appendChild(chests);
            const actHint = document.createElement('div');
            actHint.className = 'actHint';
            actHint.textContent = '领取每日任务奖励可获得活跃度 · 每日 0 点与任务一同重置';
            actBox.appendChild(actHint);
            box.appendChild(actBox);

            mkSection('📅 每日任务', '每日 0 点重置');
            for (const def of QUEST_DEFS.filter(q => q.kind === 'daily')) {
                mkRow(def);
            }
            mkSection('🏆 成就', '累计进度 · 一次性领奖');
            for (const def of QUEST_DEFS.filter(q => q.kind === 'achv')) {
                mkRow(def);
            }
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '完成任务领钻石 · 钻石可在商店购买礼包';
            box.appendChild(note);
        });
    }


    // ================= 排行榜 =================

    /** 排行榜弹窗：积分榜（本地模拟对手，接入微信开放数据域时替换数据源） */
    protected _openLeaderboardModal(): void {
        this._openModal('🏆 末日航线 · 排行榜', (box) => {
            box.classList.add('lbBox');
            const myScoreVal = myScore();
            const head = document.createElement('div');
            head.className = 'lbMy';
            head.innerHTML = `<span>我的积分</span><b>${myScoreVal.toLocaleString()}</b>`;
            box.appendChild(head);
            const list = document.createElement('div');
            list.className = 'lbList';
            const rows = loadBoard();
            rows.forEach((r, i) => {
                const row = document.createElement('div');
                row.className = 'lbRow' + (r.me ? ' me' : '');
                const rank = document.createElement('span');
                rank.className = 'lbRank';
                const topCls = i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : '';
                rank.innerHTML = i < 3 ? `<i class="medal${topCls}">${['🥇', '🥈', '🥉'][i]}</i>` : `${i + 1}`;
                row.appendChild(rank);
                const ic = document.createElement('span');
                ic.className = 'lbIc';
                ic.textContent = r.ic;
                row.appendChild(ic);
                const nm = document.createElement('b');
                nm.className = 'lbName';
                nm.textContent = r.name;
                row.appendChild(nm);
                const sc = document.createElement('span');
                sc.className = 'lbScore';
                sc.textContent = r.score.toLocaleString();
                row.appendChild(sc);
                list.appendChild(row);
            });
            box.appendChild(list);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = boardNote();
            box.appendChild(note);
        });
    }


    // ================= 玩法页（日常运营 + 玩法入口） =================

    /** 玩法页：每日任务/签到横幅（自基地横幅迁入）+ 试炼/副本/远征/图鉴/排行五大玩法入口卡 */
    protected _buildPlayPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.core = page;
        page.appendChild(this._mkHeading('玩法大厅', '日常运营 · 挑战 · 图鉴'));

        // 日常横幅：任务 + 签到（运营功能与基地建筑养成解耦，集中放在玩法页顶部）
        const duty = document.createElement('div');
        duty.className = 'dutyBanner panel frame';
        duty.innerHTML = `<div class="dutyInfo"><h3>📣 每日运营</h3>` +
            `<p>完成任务领活跃宝箱 · 连续签到拿稀有奖励</p></div>` +
            `<button class="btn gold sm questEntry">📋 任务<span class="questRed"></span></button>` +
            `<button class="btn gold sm signinEntry">📅 签到<span class="questRed"></span></button>`;
        const questBtn = duty.querySelector('.questEntry') as HTMLButtonElement;
        questBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openQuestModal();
        };
        this._refreshQuestRed(questBtn.querySelector('.questRed') as HTMLElement);
        this._questRedEl = questBtn.querySelector('.questRed') as HTMLElement;
        const signinBtn = duty.querySelector('.signinEntry') as HTMLButtonElement;
        signinBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openSigninModal();
        };
        this._refreshSigninRed(signinBtn.querySelector('.questRed') as HTMLElement);
        this._signinRedEl = signinBtn.querySelector('.questRed') as HTMLElement;
        page.appendChild(duty);

        // 五大玩法入口（BUILDINGS pureEntry：试炼/副本/远征/图鉴/排行）
        const grid = document.createElement('div');
        grid.className = 'baseGrid';
        page.appendChild(grid);
        this._playGridEl = grid;
        root.appendChild(page);
    }


    /** 玩法页刷新：重建玩法入口卡（动态进度描述 + 红点 + 进入按钮） */
    protected _refreshPlayPage(): void {
        const grid = this._playGridEl;
        if (!grid) {
            return;
        }
        grid.innerHTML = '';
        const gm = GameManager.instance;
        // 玩法定位短语（卡片副标题）
        const sub: Record<string, string> = {
            trial: '爬塔挑战', dungeon: '材料产线', expedition: '离线派遣',
            bestiary: '图鉴收集', leaderboard: '积分竞技',
        };
        for (const b of BUILDINGS) {
            if (!b.pureEntry) {
                continue;
            }
            const unlocked = gm.isBuildingUnlocked(b.id);
            const card = document.createElement('div');
            card.className = 'bcard panel' + (unlocked ? '' : ' locked');
            card.dataset.entry = b.id;
            card.title = b.intro ?? '';
            const ic = document.createElement('div');
            ic.className = 'bIc';
            ic.textContent = b.ic;
            card.appendChild(ic);
            const nm = document.createElement('div');
            nm.className = 'bName';
            nm.innerHTML = `${b.name}<span>${sub[b.id] ?? ''}</span>`;
            card.appendChild(nm);
            const ds = document.createElement('div');
            ds.className = 'bDesc';
            ds.textContent = unlocked ? this._pureEntryDesc(b.id) : `🔒 指挥中心 LV.${b.unlockHq} 解锁`;
            card.appendChild(ds);
            const btn = document.createElement('button');
            btn.className = 'btn blue sm';
            btn.style.width = '100%';
            btn.textContent = this._pureEntryBtnText(b.id);
            btn.disabled = !unlocked;
            btn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._enterPureEntry(b.id);
            };
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            card.appendChild(btn);
            const red = document.createElement('span');
            red.className = 'bcardRed';
            card.appendChild(red);
            this._refreshPureEntryRed(b.id, red);
            grid.appendChild(card);
        }
    }


    /** 纯入口建筑的进度描述（替代等级文案） */
    protected _pureEntryDesc(id: string): string {
        if (id === 'trial') {
            const ts = TrialSystem.instance;
            return ts.maxFloor > 0
                ? `已通关 ${ts.clearedCount} 层 · 可挑战第 ${ts.nextFloor} 层`
                : '尚未登塔 · 从第 1 层开始';
        }
        if (id === 'dungeon') {
            const ds = DungeonSystem.instance;
            let left = 0;
            for (const d of DUNGEON_DEFS) {
                left += ds.remaining(d.id);
            }
            return `今日剩余 ${left} 次 · 产出强化石/合金/宝石`;
        }
        if (id === 'expedition') {
            const es = ExpeditionSystem.instance;
            return es.hasClaimable()
                ? '✨ 有任务完成，可领取奖励'
                : `今日剩余 ${es.remainingToday()} 次 · 5/15/30 分钟三档`;
        }
        if (id === 'bestiary') {
            const { done, total } = BestiarySystem.instance.completion();
            return `已记录 ${done}/${total} 种变异体`;
        }
        if (id === 'leaderboard') {
            return `我的积分 ${myScore().toLocaleString()}`;
        }
        return '';
    }


    /** 纯入口建筑的按钮文案 */
    protected _pureEntryBtnText(id: string): string {
        switch (id) {
            case 'trial': {
                const ts = TrialSystem.instance;
                return ts.maxFloor > 0 ? `⚔️ 进入试炼 · 第 ${ts.nextFloor} 层` : '⚔️ 进入试炼';
            }
            case 'dungeon': return '⚔️ 进入副本';
            case 'expedition': return '🚀 进入远征';
            case 'bestiary': return '📖 查看图鉴';
            case 'leaderboard': return '🏆 查看排行';
            default: return '进 入';
        }
    }


    /** 纯入口建筑的入口动作（与横幅按钮原有的 onclick 分发一致） */
    protected _enterPureEntry(id: string): void {
        switch (id) {
            case 'trial': this._openTrialModal(); break;
            case 'dungeon': this._openDungeonModal(); break;
            case 'expedition': this._openExpeditionModal(); break;
            case 'bestiary': this._openBestiaryModal(); break;
            case 'leaderboard': this._openLeaderboardModal(); break;
        }
    }


    /** 纯入口建筑卡的红点：可领奖/可进入的玩法点亮（副本红点沿用「有次数且体力够」口径） */
    protected _refreshPureEntryRed(id: string, el: HTMLElement): void {
        let on = false;
        if (id === 'dungeon') {
            const ds = DungeonSystem.instance;
            const staminaOk = GameManager.instance.stamina() >= DUNGEON_STAMINA_COST;
            for (const d of DUNGEON_DEFS) {
                if (ds.remaining(d.id) > 0) {
                    on = true;
                    break;
                }
            }
            on = on && staminaOk;
        } else if (id === 'expedition') {
            on = ExpeditionSystem.instance.hasClaimable();
        } else if (id === 'trial') {
            on = TrialSystem.instance.isFloorUnlocked(TrialSystem.instance.nextFloor);
        }
        el.classList.toggle('on', on);
    }

}
