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
import type { PopCta, PopOpts } from './HomeUiCore';

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
        const cards = grid.querySelectorAll<HTMLElement>('.modeRow[data-entry]');
        for (const card of cards) {
            const red = card.querySelector('.bcardRed');
            if (red) {
                this._refreshPureEntryRed(card.dataset.entry ?? '', red as HTMLElement);
            }
        }
    }

    /**
     * 试炼之塔（UX 布局稿 · XL 二级页）：固定层段胶囊 + 展示台（选中层/层段）+ 底部层格槽位条
     * + 层段参数/怪物池/首通奖励明细 + 挑战 CTA。
     */
    protected _openTrialModal(): void {
        const ts = TrialSystem.instance;
        const opt = (): PopOpts => {
            // 选中层：默认停在「当前可挑战层」；越界钳到合法范围
            let sel = Math.min(TRIAL_MAX_FLOOR, Math.max(1, this._trialSelFloor || ts.nextFloor));
            if (sel > ts.nextFloor) {
                sel = ts.nextFloor;
            }
            this._trialSelFloor = sel;
            const def = trialFloorDef(sel);
            const reward = trialFloorReward(sel);
            const cleared = ts.isFloorCleared(sel);
            const unlocked = ts.isFloorUnlocked(sel);
            const totalSects = Math.ceil(TRIAL_MAX_FLOOR / TRIAL_MILESTONE_EVERY);
            const curSect = Math.ceil(sel / TRIAL_MILESTONE_EVERY);
            const sectFrom = (curSect - 1) * TRIAL_MILESTONE_EVERY + 1;
            const sectTo = Math.min(TRIAL_MAX_FLOOR, sectFrom + TRIAL_MILESTONE_EVERY - 1);
            const pick = (f: number): void => {
                if (!ts.isFloorUnlocked(f)) {
                    this._toast(`第 ${f} 层尚未解锁`);
                    return;
                }
                this._trialSelFloor = f;
                this._popRebuild(opt());
            };
            return {
                tier: 2,
                size: 'XL',
                title: '🗼 试炼之塔',
                barBack: true,
                show: {
                    icon: '🗼',
                    tier: `第 ${sel} 层${def.milestone ? ' 👑' : ''}`,
                    name: def.sectName,
                    sub: `${cleared ? '已通关' : unlocked ? '可挑战' : '未解锁'} · 怪物强度 ×${def.hpMul.toFixed(1)} · 精英率 ${Math.round(def.eliteChance * 100)}%`
                },
                subtitle: `每层 3 波 · 每 ${TRIAL_MILESTONE_EVERY} 层大奖 · 免体力不限次 · ${ts.maxFloor > 0 ? `已通 ${ts.clearedCount} 层 · 最高第 ${ts.maxFloor} 层` : '尚未登塔'}`,
                fixed: bar => {
                    for (let s = 0; s < totalSects; s++) {
                        const from = s * TRIAL_MILESTONE_EVERY + 1;
                        const to = Math.min(TRIAL_MAX_FLOOR, from + TRIAL_MILESTONE_EVERY - 1);
                        const lockedSect = from > ts.nextFloor;
                        bar.appendChild(this._popChip(`${from}~${to}${lockedSect ? ' 🔒' : ''}`, s === curSect - 1, () => {
                            if (lockedSect) {
                                this._toast(`第 ${from} 层尚未解锁`);
                                return;
                            }
                            pick(from);
                        }));
                    }
                },
                slots: sb => {
                    for (let f = sectFrom; f <= sectTo; f++) {
                        const fl = ts.isFloorCleared(f);
                        const now = f === ts.nextFloor && !fl;
                        const open = ts.isFloorUnlocked(f);
                        sb.appendChild(this._popSlot({
                            icon: `${f}${f % TRIAL_MILESTONE_EVERY === 0 ? '👑' : ''}`,
                            tier: fl ? '✅' : now ? '▶' : open ? '◻' : '🔒',
                            on: f === sel,
                            red: now,
                            onClick: () => pick(f)
                        }));
                    }
                },
                build: c => {
                    c.appendChild(this._popSec(`第 ${sel} 层${def.milestone ? ' · 👑 层段大奖' : ''}`));
                    c.appendChild(this._popKV('层段名称', def.sectName));
                    c.appendChild(this._popKV('怪物强度', `×${def.hpMul.toFixed(1)}`));
                    c.appendChild(this._popKV('精英率', `${Math.round(def.eliteChance * 100)}%`));
                    c.appendChild(this._popKV('波次', '3 波', 'free'));
                    if (def.monsters.length > 0) {
                        c.appendChild(this._popSec('怪物池'));
                        for (const m of def.monsters) {
                            const bd = BESTIARY_DEFS.filter(d => d.id === m.id)[0];
                            c.appendChild(this._popRow({
                                icon: bd ? '👾' : '❓',
                                iconTex: bd ? bd.art : undefined,
                                title: bd ? bd.name : m.id,
                                lines: [bd ? `威胁 ${'★'.repeat(bd.threat)}${'☆'.repeat(5 - bd.threat)}` : '图鉴未收录']
                            }));
                        }
                    }
                    c.appendChild(this._popSec('首通奖励'));
                    if (cleared) {
                        c.appendChild(this._popAttr({ icon: '✅', text: '**已通关** · 可重复挑战（只得基础金币与少量掉落）' }));
                    } else if (unlocked) {
                        c.appendChild(this._popAttr({ icon: '🪙', text: `**${reward.gold.toLocaleString()}** 金币` }));
                        if (reward.diamond > 0) {
                            c.appendChild(this._popAttr({ icon: '💎', text: `**${reward.diamond}** 钻石` }));
                        }
                        if (reward.drops.length > 0) {
                            c.appendChild(this._popAttr({ icon: '🎁', text: `额外掉落 **×${reward.drops.length}**` }));
                        }
                    } else {
                        c.appendChild(this._popAttr({ icon: '🔒', text: `需先通关第 **${sel - 1}** 层` }));
                    }
                    c.appendChild(this._popSec('后续层段'));
                    for (let s = 0; s < totalSects; s++) {
                        const from = s * TRIAL_MILESTONE_EVERY + 1;
                        const to = Math.min(TRIAL_MAX_FLOOR, from + TRIAL_MILESTONE_EVERY - 1);
                        if (s === curSect - 1) {
                            continue;
                        }
                        if (from > ts.nextFloor) {
                            // 未推进到的层段折叠成一行，避免 60 层摊开太长
                            c.appendChild(this._popRow({
                                icon: '🔒',
                                title: `第 ${from}~${to} 层`,
                                lines: [`通关第 ${from - 1} 层后解锁`]
                            }));
                            continue;
                        }
                        let done = 0;
                        for (let f = from; f <= to; f++) {
                            if (ts.isFloorCleared(f)) {
                                done++;
                            }
                        }
                        c.appendChild(this._popRow({
                            icon: '🗼',
                            title: `第 ${from}~${to} 层`,
                            lines: [`已通 ${done}/${to - from + 1} 层`],
                            progress: done / (to - from + 1),
                            action: { label: '前 往', kind: 'gold', onClick: () => pick(from) }
                        }));
                    }
                },
                ctas: [{
                    label: !unlocked ? `🔒 第 ${sel} 层未解锁` : cleared ? `⚔️ 重挑 第 ${sel} 层` : `⚔️ 挑战 第 ${sel} 层`,
                    kind: 'gold',
                    disabled: !unlocked,
                    onClick: () => this._startTrial(sel)
                }],
                note: '试炼不消耗体力、不限次数；层内失败不影响已通关进度'
            };
        };
        this._openPop(opt());
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
     * 资源副本（UX 布局稿 · XL 二级页）：顶部分档页签 + 展示台（今日次数/体力）+ 底部副本档位卡
     * + 产出与解锁明细 + 体力消耗行 + 挑战 CTA（解锁/次数/体力三态）。
     */
    protected _openDungeonModal(tier = 0): void {
        const ds = DungeonSystem.instance;
        const gm = GameManager.instance;
        const selTier = Math.min(2, Math.max(0, Math.floor(tier)));
        const opt = (): PopOpts => {
            const selId = this._dungeonSel;
            const def = dungeonDef(selId);
            const left = def ? ds.remaining(def.id) : 0;
            const gate = def ? ds.canEnter(def.id, selTier) : { ok: false, reason: '副本数据缺失' };
            const staminaOk = gm.stamina() >= DUNGEON_STAMINA_COST;
            const range = def ? dungeonYieldRange(def.id, selTier) : { lo: 0, hi: 0 };
            const yieldText = !def ? '—'
                : def.id === 'gold'
                    ? `🪙 ${range.lo}~${range.hi} 金币${selTier === 2 ? ' + 💎 钻石' : ''}`
                    : def.id === 'gem'
                        ? `💠 随机宝石 ×${range.lo}~${range.hi}（档位越高品质越好）`
                        : `${def.rewardIc[selTier]} ${def.id === 'stone' ? '强化石' : '精炼合金'} ×${range.lo}~${range.hi}`;
            return {
                tier: 2,
                size: 'XL',
                title: '🏰 资源副本',
                barBack: true,
                show: {
                    icon: def ? def.ic : '🏰',
                    tier: DUNGEON_TIER_NAMES[selTier],
                    name: def ? def.name : '副本数据缺失',
                    sub: `今日剩余 ${left}/${DUNGEON_RUNS_PER_DAY} · 体力 ${gm.stamina()}/${gm.staminaMax()}`
                },
                tab: selTier,
                tabs: DUNGEON_TIER_NAMES,
                onTab: t => this._openDungeonModal(t),
                slots: sb => {
                    for (const d of DUNGEON_DEFS) {
                        const rest = ds.remaining(d.id);
                        const dg = ds.canEnter(d.id, selTier);
                        sb.appendChild(this._popSlot({
                            icon: d.ic,
                            tier: `${rest}次`,
                            on: d.id === selId,
                            red: rest > 0 && dg.ok && gm.stamina() >= DUNGEON_STAMINA_COST,
                            onClick: () => {
                                this._dungeonSel = d.id;
                                this._openDungeonModal(selTier);
                            }
                        }));
                    }
                },
                build: c => {
                    if (!def) {
                        c.appendChild(this._popEmpty('副本数据缺失', undefined, '🏰'));
                        return;
                    }
                    c.appendChild(this._popSec(`${def.ic} ${def.name} · ${DUNGEON_TIER_NAMES[selTier]}`));
                    c.appendChild(this._popAttr({ icon: '📄', text: def.desc }));
                    c.appendChild(this._popKV('今日剩余', `${left}/${DUNGEON_RUNS_PER_DAY}`, left <= 0 ? 'total' : undefined));
                    c.appendChild(this._popKV('预计产出', yieldText, 'total'));
                    c.appendChild(this._popKV('解锁状态', gate.ok ? '已解锁' : gate.reason ?? '未解锁'));
                    c.appendChild(this._popKV('波次', `打满 ${DUNGEON_WAVES} 波结算`, 'free'));
                    if (!gate.ok) {
                        c.appendChild(this._popWarn(`🔒 ${gate.reason ?? '未解锁'}`));
                    } else if (left <= 0) {
                        c.appendChild(this._popWarn('今日次数已用完 · 隔日重置'));
                    } else if (!staminaOk) {
                        c.appendChild(this._popWarn(`⚠️ 体力不足，本次需要 ${DUNGEON_STAMINA_COST} 点`));
                    }
                    c.appendChild(this._popSec('全部副本'));
                    for (const d of DUNGEON_DEFS) {
                        if (d.id === def.id) {
                            continue;
                        }
                        const rest = ds.remaining(d.id);
                        const dg = ds.canEnter(d.id, selTier);
                        c.appendChild(this._popRow({
                            icon: d.ic,
                            title: d.name,
                            lines: [`${DUNGEON_TIER_NAMES[selTier]} · 今日剩余 ${rest}/${DUNGEON_RUNS_PER_DAY}`],
                            status: rest <= 0 ? '次数用完' : !dg.ok ? '未解锁' : undefined,
                            statusKind: rest <= 0 || !dg.ok ? 'expire' : undefined,
                            action: {
                                label: '选 中',
                                kind: 'gold',
                                disabled: d.id === selId,
                                onClick: () => {
                                    this._dungeonSel = d.id;
                                    this._openDungeonModal(selTier);
                                }
                            }
                        }));
                    }
                },
                cost: [{ icon: '⚡', have: gm.stamina(), need: DUNGEON_STAMINA_COST }],
                ctas: [{
                    label: !def || !gate.ok ? '未 解 锁' : left <= 0 ? '今日次数已用完' : staminaOk ? '挑 战' : '体力不足',
                    kind: 'gold',
                    disabled: !def || !gate.ok || left <= 0 || !staminaOk,
                    // 禁用不是死键：按缺口给拦截弹窗或差额说明（UX 0-4）
                    onDisabled: () => {
                        if (!def || !gate.ok) {
                            this._openUnlockGate('副本未解锁', '🏰', gate.reason ?? '未解锁');
                        } else if (left <= 0) {
                            this._toast('今日次数已用完 · 隔日重置');
                        } else {
                            this._openStaminaGate(DUNGEON_STAMINA_COST, () => this._openDungeonModal(selTier));
                        }
                    },
                    onClick: () => {
                        if (def) {
                            this._startDungeon(def.id, selTier);
                        }
                    }
                }],
                note: '副本是材料产线：金币 / 宝石 / 强化石 / 精炼合金各一条线 · 档位越高产出越好'
            };
        };
        this._openPop(opt());
    }



    // ================= 远征派遣 =================

    /**
     * 远征派遣（UX 布局稿 · XL 二级页）：固定任务胶囊（状态 + 最近归来的倒计时）+ 展示台
     * （任务 + 奖励预览）+ 英雄属性匹配列表 + 队伍槽位条 + 派遣/领取/加速 CTA。
     * 倒计时每秒只改固定条胶囊文案，归零广播一次并就地重绘。
     */
    protected _openExpeditionModal(): void {
        const es = ExpeditionSystem.instance;
        const gm = GameManager.instance;
        const runningText = (): string => {
            const runs = es.runs().filter(r => es.remainSecs(r.defId) > 0);
            if (runs.length === 0) {
                return '⏳ 无进行中任务';
            }
            let soon = runs[0];
            for (const r of runs) {
                if (es.remainSecs(r.defId) < es.remainSecs(soon.defId)) {
                    soon = r;
                }
            }
            const d = expeditionDef(soon.defId);
            return `⏳ ${d ? d.ic : ''} ${es.remainText(soon.defId)}`;
        };
        const opt = (): PopOpts => {
            const selId = this._expSel;
            const def = expeditionDef(selId);
            const st = def ? es.stateOf(def.id) : 'idle';
            const run = def ? es.runOf(def.id) : null;
            const picked = def && st === 'idle' ? this._expPicked : [];
            const previewMult = run ? run.mult : def ? matchMultiplier(def.attr, picked) : 1;
            const range = def ? expeditionYieldRange(def.id, previewMult) : { lo: 0, hi: 0 };
            const rewardParts: string[] = [`🪙 ${range.lo}~${range.hi} 金币`];
            if (def && def.diamond > 0) {
                rewardParts.push(`💎 ${Math.max(1, Math.round(def.diamond * previewMult))}`);
            }
            if (def) {
                for (const item of def.misc) {
                    const md = miscDef(item.id);
                    rewardParts.push(`${md ? md.ic : '📦'} ${md ? md.name : item.id}×${Math.max(1, Math.round(item.n * previewMult))}`);
                }
            }
            const multPct = Math.round(previewMult * 100);
            const gate = def ? es.canStart(def.id, picked) : { ok: false, reason: '任务数据缺失' };
            const pickHero = (hid: string): void => {
                if (!def) {
                    return;
                }
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
                this._popRebuild(opt());
            };
            const stateText = !def ? '—'
                : st === 'ready' ? '✨ 可领取'
                    : st === 'running' ? `⏳ ${es.remainText(def.id)}`
                        : `${def.minutes} 分钟`;
            const ctas = ((): PopCta[] | undefined => {
                if (!def) {
                    return undefined;
                }
                if (st === 'idle') {
                    return [{
                        label: picked.length < def.slots
                            ? `请选择 ${def.slots - picked.length} 名英雄`
                            : gate.ok ? '派 遣' : gate.reason ?? '不可派遣',
                        disabled: !gate.ok,
                        onClick: () => {
                            SoundFx.unlock();
                            if (es.start(def.id, picked)) {
                                SoundFx.play('buy');
                                this._toast(`${def.name} 已出发`);
                                this._expPicked = [];
                                this._refreshTop();
                            } else {
                                this._toast(es.canStart(def.id, picked).reason ?? '派遣失败');
                            }
                            this._popRebuild(opt());
                        }
                    }];
                }
                if (st === 'ready') {
                    return [{
                        label: '领 取 奖 励',
                        red: true,
                        onClick: () => {
                            SoundFx.unlock();
                            const reward = es.finish(def.id);
                            if (reward) {
                                SoundFx.play('coin');
                                this._toast(`${def.name} 完成：${rewardText({ gold: reward.gold, diamond: reward.diamond, misc: reward.misc })}`);
                                this._refreshTop();
                            }
                            this._popRebuild(opt());
                        }
                    }];
                }
                const cost = es.speedUpCost(def.id);
                const adLeft = AdService.instance.remaining('expedition');
                return [
                    {
                        label: cost > 0 ? `💎${cost} 立即完成` : '立即完成',
                        disabled: gm.res.get('diamond') < cost,
                        onClick: () => {
                            SoundFx.unlock();
                            const pay = es.speedUpCost(def.id);
                            if (pay <= 0) {
                                this._popRebuild(opt());
                                return;
                            }
                            if (!gm.res.spend('diamond', pay)) {
                                this._toast('钻石不足');
                                return;
                            }
                            gm.save();
                            es.speedUp(def.id);
                            SoundFx.play('buy');
                            this._toast('已立即完成，快去领取');
                            this._refreshTop();
                            this._popRebuild(opt());
                        }
                    },
                    {
                        label: adLeft > 0 ? `📺 免费完成 (${adLeft})` : '📺 今日已用完',
                        kind: 'grey',
                        disabled: adLeft <= 0,
                        onClick: () => {
                            SoundFx.unlock();
                            AdService.instance.claimReward('expedition', () => {
                                es.speedUp(def.id);
                                gm.save();
                                this._toast('广告加速完成');
                                this._refreshTop();
                                this._popRebuild(opt());
                            });
                        }
                    }
                ];
            })();
            // 队伍槽位条：idle 显示已选（点格取消），running/ready 显示出征队伍
            const slotHeroes: string[] = run ? run.heroes.slice() : picked.slice();
            const slotCount = run ? run.heroes.length : def ? def.slots : 0;
            return {
                tier: 2,
                size: 'XL',
                title: '🚀 远征派遣',
                barBack: true,
                show: {
                    icon: def ? def.ic : '🚀',
                    tier: stateText,
                    name: def ? def.name : '任务数据缺失',
                    sub: def ? `${HERO_ATTR_IC[def.attr]}${HERO_ATTR_NAMES[def.attr]} · ${def.slots} 人 · 奖励 ×${(multPct / 100).toFixed(2)}` : ''
                },
                subtitle: `今日剩余 ${es.remainingToday()}/${EXPEDITION_RUNS_PER_DAY} · 派英雄执行限时任务 · 真实时间到点领取 · 三任务位可并行`,
                fixed: bar => {
                    for (const d of EXPEDITION_DEFS) {
                        const dst = es.stateOf(d.id);
                        const mark = dst === 'ready' ? ' ✨' : dst === 'running' ? ` ⏳${es.remainText(d.id)}` : '';
                        bar.appendChild(this._popChip(`${d.ic} ${d.name}${mark}`, d.id === selId, () => {
                            this._expSel = d.id;
                            this._expPicked = [];
                            this._popRebuild(opt());
                        }));
                    }
                    this._expTimerEl = this._popInfo(runningText());
                    bar.appendChild(this._expTimerEl);
                },
                slots: slotCount > 0 ? sb => {
                    const locked = !!def && st === 'idle' && gm.stageCleared < def.unlockStage;
                    for (let i = 0; i < slotCount; i++) {
                        const hid = slotHeroes[i];
                        const cell = this._popSlot({
                            icon: hid ? '🎖' : '＋',
                            on: !!hid,
                            onClick: !hid || locked || st !== 'idle' ? undefined : () => pickHero(hid)
                        });
                        if (hid) {
                            const idx = Math.max(0, HERO_DEFS.findIndex(d => d.id === hid));
                            const photo = this._heroPhoto(idx, 'slot');
                            this._tex(photo.key, u => {
                                cell.textContent = '';
                                cell.style.backgroundImage = u;
                                cell.style.cssText += photo.css;
                            });
                        }
                        sb.appendChild(cell);
                    }
                } : undefined,
                build: c => {
                    if (!def) {
                        c.appendChild(this._popEmpty('任务数据缺失', undefined, '🚀'));
                        return;
                    }
                    c.appendChild(this._popSec(`${def.ic} ${def.name}`));
                    c.appendChild(this._popKV('任务状态', stateText));
                    c.appendChild(this._popKV('耗时', `${def.minutes} 分钟`));
                    c.appendChild(this._popKV('需求', `${HERO_ATTR_IC[def.attr]}${HERO_ATTR_NAMES[def.attr]} · ${def.slots} 人`));
                    c.appendChild(this._popKV('预计产出', rewardParts.join(' · '), 'total'));
                    c.appendChild(this._popKV('队伍匹配', `奖励 ×${(multPct / 100).toFixed(2)}`, 'free'));
                    c.appendChild(this._popAttr({ icon: '📄', text: def.desc }));
                    if (st === 'idle') {
                        const locked = gm.stageCleared < def.unlockStage;
                        c.appendChild(this._popSec(`选择英雄 ${picked.length}/${def.slots} · 匹配度越高奖励越多`));
                        if (locked) {
                            c.appendChild(this._popWarn(`🔒 需通关第 ${def.unlockStage} 关`));
                        }
                        // 按该任务属性从高到低排序：一眼看出派谁收益最高
                        const cands = gm.ownedHeroes
                            .map(hid => ({ hid, val: heroAttrValue(hid, def.attr) }))
                            .filter(o => !!HERO_DEFS.find(d => d.id === o.hid))
                            .sort((a, b) => b.val - a.val);
                        for (const o of cands) {
                            const hdef = HERO_DEFS.find(d => d.id === o.hid);
                            if (!hdef) {
                                continue;
                            }
                            const inLineup = gm.isInLineup(o.hid);
                            const busy = es.isHeroBusy(o.hid);
                            const isPicked = picked.indexOf(o.hid) >= 0;
                            c.appendChild(this._popRow({
                                icon: '🎖',
                                iconTex: this._heroPhoto(Math.max(0, HERO_DEFS.indexOf(hdef)), 'slot').key,
                                title: hdef.name,
                                tag: isPicked ? '已选' : undefined,
                                lines: [`${HERO_ATTR_IC[def.attr]}${HERO_ATTR_NAMES[def.attr]} ${Math.round(o.val)}`],
                                on: isPicked,
                                status: inLineup ? '上阵中' : busy ? '远征中' : undefined,
                                action: {
                                    label: isPicked ? '取消' : '选择',
                                    kind: isPicked ? 'gold' : 'green',
                                    disabled: locked || inLineup || busy,
                                    onClick: () => pickHero(o.hid)
                                }
                            }));
                        }
                        if (cands.length === 0) {
                            c.appendChild(this._popEmpty('暂无可用英雄', '先去招募英雄再来派遣', '🎖'));
                        }
                    } else {
                        c.appendChild(this._popSec('出征队伍'));
                        for (const hid of (run ? run.heroes : [])) {
                            const hdef = HERO_DEFS.find(d => d.id === hid);
                            c.appendChild(this._popRow({
                                icon: '🎖',
                                iconTex: this._heroPhoto(Math.max(0, HERO_DEFS.indexOf(hdef ?? HERO_DEFS[0])), 'slot').key,
                                title: hdef ? hdef.name : hid,
                                lines: [`${HERO_ATTR_IC[def.attr]}${HERO_ATTR_NAMES[def.attr]} ${Math.round(heroAttrValue(hid, def.attr))}`],
                                status: '任务中',
                                statusKind: 'soon'
                            }));
                        }
                        c.appendChild(this._popWarn(st === 'running'
                            ? `⏳ 剩余 ${es.remainText(def.id)} · 到点回来领取`
                            : '✨ 任务已完成，领取后英雄归队'));
                    }
                },
                ctas,
                note: '真实时间倒计时 · 离线也计时 · 三个任务位可同时派遣'
            };
        };
        this._openPop(opt());
        // 秒级倒计时：只改固定条胶囊文案；归零广播一次 EXPEDITION_READY 并就地重绘
        clearInterval(this._expTimer);
        const readyFired: string[] = [];
        let readyDone = false;
        this._expTimer = setInterval(() => {
            if (!this._expTimerEl || !this._expTimerEl.isConnected) {
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
            this._expTimerEl.textContent = runningText();
            if (anyReady && !readyDone) {
                readyDone = true;
                this._popRebuild(opt());
            }
        }, 1000) as unknown as number;
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
            this._openUnlockGate('副本未解锁', '🏰', gate.reason ?? '未解锁');
            return;
        }
        if (GameManager.instance.stamina() < DUNGEON_STAMINA_COST) {
            this._openStaminaGate(DUNGEON_STAMINA_COST, () => this._openDungeonModal(tier));
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

    /** 怪物图鉴（UX 布局稿：L3·L 列表型）：完成度头部 + 怪物条目（未解锁剪影/未遭遇）+ 点条目进详情 */
    protected _openBestiaryModal(): void {
        const bs = BestiarySystem.instance;
        const opt = (): PopOpts => {
            const { done, total } = bs.completion();
            return {
                tier: 3,
                size: 'L',
                banner: '📖 怪物图鉴',
                art: `已收录 ${done}/${total}`,
                subtitle: '击杀对应怪物自动解锁 · 点条目看档案',
                build: c => {
                    c.appendChild(this._popSec('怪物档案'));
                    for (const def of BESTIARY_DEFS) {
                        const unlocked = bs.unlocked(def.id);
                        const kills = bs.kills(def.id);
                        c.appendChild(this._popRow({
                            icon: unlocked ? '👾' : '❓',
                            iconTex: unlocked ? def.art : undefined,
                            title: unlocked ? def.name : '？？？',
                            tag: unlocked ? `${'★'.repeat(def.threat)}${'☆'.repeat(5 - def.threat)}` : undefined,
                            lines: [unlocked ? def.behavior : '尚未遭遇'],
                            status: unlocked ? `×${kills}` : '未解锁',
                            statusKind: unlocked ? undefined : 'expire',
                            onClick: () => this._openBestiaryDetail(def)
                        }));
                    }
                    c.appendChild(this._popSec('精英怪'));
                    c.appendChild(this._popKV('累计击杀', `×${bs.eliteKills}`));
                    c.appendChild(this._popKV('特征', '体型更大 · 数值更强（红色描边）', 'free'));
                },
                note: '出战迎战每一种怪物，击杀后自动收录进图鉴'
            };
        };
        this._openPop(opt());
    }

    /**
     * 图鉴详情（UX 布局稿：L3·L 详情型 · 钻取）：展示台立绘 + 威胁星级 + 习性/数值 KV + 遭遇记录。
     * 未解锁显示剪影与「数据未收录」；返回走 onBack 重新取数回列表。
     */
    protected _openBestiaryDetail(def: BestiaryDef): void {
        const bs = BestiarySystem.instance;
        const unlocked = bs.unlocked(def.id);
        this._openPop({
            tier: 3,
            size: 'L',
            banner: '📖 图鉴详情',
            art: unlocked ? `威胁 ${def.threat}/5` : '未收录',
            push: true,
            onBack: () => this._openBestiaryModal(),
            show: {
                icon: unlocked ? '👾' : '❓',
                tier: unlocked ? `${'★'.repeat(def.threat)}` : undefined,
                name: unlocked ? def.name : '？？？',
                sub: unlocked ? def.behavior : '？？？ · ？？？'
            },
            build: c => {
                c.appendChild(this._popSec('习性'));
                c.appendChild(this._popAttr({
                    icon: '📄',
                    text: unlocked ? def.desc : '尚未遭遇该怪物。出击迎战，击杀后自动收录。'
                }));
                c.appendChild(this._popSec('数值'));
                if (unlocked) {
                    c.appendChild(this._popKV('基准生命', def.stats.hp.toLocaleString()));
                    c.appendChild(this._popKV('移动速度', `${def.stats.speed}`));
                    c.appendChild(this._popKV('啃咬伤害', `${def.stats.touchDamage}`));
                    c.appendChild(this._popKV('首次出没', def.debut));
                    c.appendChild(this._popKV('累计击杀', `×${bs.kills(def.id)}`, 'free'));
                } else {
                    c.appendChild(this._popKV('档案数据', '未收录', 'free'));
                    c.appendChild(this._popWarn('击杀该怪物后解锁完整档案'));
                }
            },
            ctas: [{
                label: '返 回 图 鉴',
                kind: 'grey',
                onClick: () => this._openBestiaryModal()
            }],
            note: '威胁星级越高，生命/伤害越高、出没波次越靠后'
        });
        if (unlocked) {
            // 展示台挂怪物立绘（资源就绪后替换占位）
            this._tex(def.art, u => {
                const ped = this._root?.querySelector('.popPedestal') as HTMLElement | null;
                if (ped) {
                    ped.textContent = '';
                    ped.style.backgroundImage = u;
                    ped.style.backgroundSize = 'contain';
                    ped.style.backgroundRepeat = 'no-repeat';
                    ped.style.backgroundPosition = 'center bottom';
                }
            });
        }
    }


    /** 七日签到弹窗：日历格子（已领/今日可领高亮/未到档位）+ 今日奖励详情 + 领取 */
    protected _openSigninModal(): void {
        const ss = SigninSystem.instance;
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
        const opt = (): PopOpts => {
            const claimed = ss.isTodayClaimed();
            const today = ss.todayReward();
            const justClaimedDay = claimed ? (ss.day === 1 ? 7 : ss.day - 1) : 0;
            const claimableDay = claimed ? 0 : ss.day;
            return {
                tier: 3,
                size: 'M',
                banner: '📅 每日签到',
                art: `累计 ${ss.totalDays} 天`,
                cost: undefined,
                build: c => {
                    c.appendChild(this._popKV('本轮进度', `第 ${ss.day} / 7 天 · ${claimed ? '今日已签' : '今日可签'}`, 'total'));
                    c.appendChild(this._popGrid(SIGNIN_REWARDS.map(r => ({
                        icon: r.day < ss.day ? '✅' : r.ic,
                        count: r.day,
                        sel: r.day === claimableDay || r.day === justClaimedDay,
                        title: `${r.label} ${rewardText(r)}`
                    })), 4));
                    c.appendChild(this._popSec('今日档位'));
                    c.appendChild(this._popAttr({
                        icon: today.ic,
                        text: `**${today.label}** ${rewardText(today)}`,
                        empty: false
                    }));
                    c.appendChild(this._popKV('错过是否补领', '不补领 · 断签不惩罚', 'free'));
                },
                ctas: [{
                    label: claimed ? '今日已签到' : '签 到',
                    disabled: claimed,
                    onClick: () => {
                        SoundFx.unlock();
                        const got = ss.claim();
                        if (got) {
                            SoundFx.play('coin');
                            this._toast(`签到成功：${got.label}`);
                            this._refreshTop();
                            this._refreshSigninRed(this._signinRedEl);
                        }
                        this._popRebuild(opt());
                    }
                }],
                note: '每天登录领一档 · 领满 7 天开新一轮'
            };
        };
        this._openPop(opt());
    }


    /** 任务中心弹窗：活跃度宝箱 + 每日任务（自然日重置）+ 成就（累计里程碑），进度条 + 领奖 */
    /**
     * 任务中心（UX 布局稿 1-C · L3·M）：顶部固定活跃度总览 + 宝箱横排，中部页签切换每日任务/成就，
     * 行内进度条与领取，底部固定一键领取；领奖后就地重绘并同步基地页红点。
     */
    protected _openQuestModal(tab = 0): void {
        const qs = QuestSystem.instance;
        const opt = (): PopOpts => {
            const list = QUEST_DEFS.filter(q => (tab === 0 ? q.kind === 'daily' : q.kind === 'achv'));
            const ready = list.filter(q => qs.isComplete(q) && !qs.isClaimed(q));
            const claim = (def: QuestDef): void => {
                SoundFx.unlock();
                if (qs.claim(def)) {
                    SoundFx.play('coin');
                    this._toast(`领取成功：${def.name}`);
                    this._refreshTop();
                    this._refreshQuestRed(this._questRedEl);
                    this._popRebuild(opt());
                }
            };
            return {
                tier: 3,
                size: 'M',
                banner: '📋 任务 · 成就',
                art: `活跃 ${qs.activity}/${ACTIVITY_MAX}`,
                tabs: ['每日任务', '成就'],
                tab,
                onTab: i => this._openQuestModal(i),
                fixed: bar => {
                    const act = qs.activity;
                    const box = this._el('div', 'popAct');
                    const hd = this._el('div', 'hd');
                    const hdl = this._el('span');
                    hdl.innerHTML = '🔥 活跃度 <b>' + act + ' / ' + ACTIVITY_MAX + '</b>';
                    hd.appendChild(hdl);
                    hd.appendChild(this._el('span', undefined, '每日 0 点重置'));
                    box.appendChild(hd);
                    const pbar = this._el('div', 'bar');
                    const fill = this._el('i');
                    fill.style.width = `${Math.min(100, Math.round(act / ACTIVITY_MAX * 100))}%`;
                    pbar.appendChild(fill);
                    box.appendChild(pbar);
                    const chs = this._el('div', 'chs');
                    for (const c of ACTIVITY_CHESTS) {
                        const claimed = qs.isChestClaimed(c);
                        const can = qs.canClaimChest(c);
                        const ch = this._el('div', `ch${claimed ? ' done' : can ? ' ready' : ''}`);
                        ch.appendChild(this._el('div', 'ci', c.ic));
                        ch.appendChild(this._el('em', undefined, claimed ? '已领' : can ? '可开' : `${c.need}点`));
                        ch.onclick = (e) => {
                            e.stopPropagation();
                            if (!can) {
                                this._toast(`${c.name}：还需 ${Math.max(0, c.need - act)} 点活跃度`);
                                return;
                            }
                            SoundFx.unlock();
                            if (qs.claimChest(c)) {
                                SoundFx.play('coin');
                                this._toast(`${c.name} 开启：${rewardText(c.reward)}`);
                                this._refreshTop();
                                this._refreshQuestRed(this._questRedEl);
                                this._popRebuild(opt());
                            }
                        };
                        chs.appendChild(ch);
                    }
                    box.appendChild(chs);
                    bar.appendChild(box);
                },
                build: c => {
                    for (const def of list) {
                        const done = qs.isComplete(def);
                        const claimed = qs.isClaimed(def);
                        const prog = qs.progress(def);
                        const act = qs.activityOf(def);
                        const reward = rewardText(def.reward) + (act > 0 ? ` · 活跃+${act}` : '');
                        c.appendChild(this._popRow({
                            icon: def.ic,
                            title: def.name,
                            tag: claimed ? '已领' : done ? '可领' : undefined,
                            lines: [reward],
                            progress: claimed ? 1 : prog / def.target,
                            status: `${prog.toLocaleString()}/${def.target.toLocaleString()}`,
                            statusKind: done && !claimed ? 'soon' : undefined,
                            action: done && !claimed ? {
                                label: '领取',
                                onClick: () => claim(def)
                            } : undefined
                        }));
                    }
                    if (!list.length) {
                        c.appendChild(this._popEmpty('暂无任务', undefined, '📋'));
                    }
                },
                ctas: ready.length > 0 ? [{
                    label: `一键领取（${ready.length}）`,
                    red: true,
                    onClick: () => {
                        SoundFx.unlock();
                        let n = 0;
                        for (const def of ready) {
                            if (qs.claim(def)) {
                                n++;
                            }
                        }
                        if (n > 0) {
                            SoundFx.play('coin');
                            this._toast(`已领取 ${n} 项奖励`);
                            this._refreshTop();
                            this._refreshQuestRed(this._questRedEl);
                        }
                        this._popRebuild(opt());
                    }
                }] : undefined,
                note: '完成每日任务获得活跃度 · 活跃宝箱领完当日封顶'
            };
        };
        this._openPop(opt());
    }


    // ================= 排行榜 =================

    /** 排行榜弹窗：积分榜（本地模拟对手，接入微信开放数据域时替换数据源） */
    /** 排行榜（UX 布局稿：L3·L 列表型）：我的积分置顶说明行 + 名次行（前三奖牌）+ 榜单口径注脚 */
    protected _openLeaderboardModal(): void {
        const opt = (): PopOpts => {
            const rows = loadBoard();
            const mine = myScore();
            const rank = rows.findIndex(r => r.me);
            return {
                tier: 3,
                size: 'L',
                banner: '🏆 排行榜',
                art: `我的积分 ${mine.toLocaleString()}`,
                subtitle: rank >= 0 ? `当前名次 #${rank + 1} / ${rows.length}` : undefined,
                build: c => {
                    if (!rows.length) {
                        c.appendChild(this._popEmpty('榜单暂无数据', '首次出战结算后上榜', '🏆'));
                        return;
                    }
                    rows.forEach((r, i) => {
                        const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`;
                        c.appendChild(this._popRow({
                            icon: r.ic,
                            title: r.name,
                            tag: medal,
                            lines: [`积分 ${r.score.toLocaleString()}`],
                            status: r.me ? '我' : undefined,
                            statusKind: r.me ? 'soon' : undefined,
                            on: r.me
                        }));
                    });
                },
                note: boardNote()
            };
        };
        this._openPop(opt());
    }



    // ================= 玩法页（日常运营 + 玩法入口） =================

    /** 玩法页：每日任务/签到状态卡（红点驱动，点击直达）+ 试炼/副本/远征/图鉴/排行入口行 */
    protected _buildPlayPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.core = page;

        // 日常状态卡：任务 + 签到（运营功能与基地建筑养成解耦，集中放在玩法页顶部）
        const dutyRow = document.createElement('div');
        dutyRow.className = 'dutyRow';
        const mkDuty = (ic: string, title: string, sub: string, onTap: () => void): HTMLButtonElement => {
            const card = document.createElement('button');
            card.className = 'dutyCard panel frame';
            card.innerHTML = `<span class="dcIc">${ic}</span><span class="dcTxt"><b>${title}</b><i>${sub}</i></span><i class="questRed"></i>`;
            card.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                onTap();
            };
            dutyRow.appendChild(card);
            return card;
        };
        const questBtn = mkDuty('📋', '每日任务', '活跃宝箱 · 成就领奖', () => this._openQuestModal());
        this._refreshQuestRed(questBtn.querySelector('.questRed') as HTMLElement);
        this._questRedEl = questBtn.querySelector('.questRed') as HTMLElement;
        const signinBtn = mkDuty('📅', '每日签到', '七日奖励 · 断签不罚', () => this._openSigninModal());
        this._refreshSigninRed(signinBtn.querySelector('.questRed') as HTMLElement);
        this._signinRedEl = signinBtn.querySelector('.questRed') as HTMLElement;
        page.appendChild(dutyRow);

        // 玩法入口列表（BUILDINGS pureEntry：试炼/副本/远征/图鉴/排行）
        const list = document.createElement('div');
        list.className = 'modeList';
        page.appendChild(list);
        this._playGridEl = list;
        root.appendChild(page);
    }


    /** 玩法页刷新：入口行重绘（动态进度描述 + 红点 + 进入态） */
    protected _refreshPlayPage(): void {
        const grid = this._playGridEl;
        if (!grid) {
            return;
        }
        grid.innerHTML = '';
        const gm = GameManager.instance;
        // 玩法定位短语（行内副标签）
        const sub: Record<string, string> = {
            trial: '爬塔挑战', dungeon: '材料产线', expedition: '离线派遣',
            bestiary: '图鉴收集', leaderboard: '积分竞技',
        };
        for (const b of BUILDINGS) {
            if (!b.pureEntry) {
                continue;
            }
            const unlocked = gm.isBuildingUnlocked(b.id);
            const row = document.createElement('button');
            row.className = 'modeRow panel' + (unlocked ? '' : ' locked lock');
            row.dataset.entry = b.id;
            row.title = b.intro ?? '';
            const ic = document.createElement('div');
            ic.className = 'mmIc';
            ic.textContent = b.ic;
            row.appendChild(ic);
            const mid = document.createElement('div');
            mid.className = 'mm';
            mid.innerHTML = `<b>${b.name}<span class="mini4">${sub[b.id] ?? ''}</span></b>` +
                `<i>${unlocked ? this._pureEntryDesc(b.id) : `🔒 指挥中心 LV.${b.unlockHq} 解锁`}</i>`;
            row.appendChild(mid);
            const btn = document.createElement('span');
            btn.className = 'mmGo';
            btn.textContent = this._pureEntryBtnText(b.id);
            row.appendChild(btn);
            if (unlocked) {
                row.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._enterPureEntry(b.id);
                };
            }
            const red = document.createElement('span');
            red.className = 'bcardRed';
            row.appendChild(red);
            this._refreshPureEntryRed(b.id, red);
            grid.appendChild(row);
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
