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
import { PatrolSystem, PATROL_MAX_HOURS, patrolGoldPerHour, patrolMiscPerHour, patrolSweepPerDay, patrolSweepReward, isPatrolStage } from '../core/PatrolSystem';
import { BOND_DEFS, activeBonds } from '../core/HeroBond';
import { NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES } from '../core/NoticeData';
import { HomeUiStage } from './HomeUiStage';
import type { PopCta, PopOpts } from './HomeUiPop';
import * as UiPlate from './UiPlate';

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

    /** 行动页标题右侧的今日活跃度 */
    protected _actNumEl: HTMLElement | null = null;

    /** 日常四快捷的副标（签到天数 / 待领任务 / 成就进度 / 礼包） */
    protected _signinSubEl: HTMLElement | null = null;
    protected _questSubEl: HTMLElement | null = null;
    protected _achSubEl: HTMLElement | null = null;
    protected _giftSubEl: HTMLElement | null = null;

    /** 挑战场两席（无尽试炼 / 无尽守卫）与远征行文案 */
    protected _trialEntryEl: HTMLElement | null = null;
    protected _endlessEntryEl: HTMLElement | null = null;
    protected _expTextEl: HTMLElement | null = null;

    /** 城防改装 XL 页（实现在 HomeUiBase；行动页页脚复用入口） */
    protected abstract _openTuningModal(onBack?: () => void): void;

    /** 远征当前选中的任务 */
    protected _expSel: ExpeditionId = 'scout';

    /** 远征当前选中的英雄（按任务切换时清空） */
    protected _expPicked: string[] = [];


    /**
     * 刷新玩法页入口卡的红点（副本/远征/试炼）。
     * _refreshPlayPage 重建卡片时会刷一遍；进度变动后由 _refreshTop 走这里增量补刷。
     */
    protected _refreshEntryReds(): void {
        // 巡逻红点：挂机产出随时间涨，凡是走 _refreshTop 的时机都顺带校准一次
        if (this._patrolRed) {
            const ps = PatrolSystem.instance;
            this._patrolRed.classList.toggle('on', ps.unlocked() && ps.hasClaimable());
        }
        const grid = this._playGridEl;
        if (!grid) {
            return;
        }
        const cards = grid.querySelectorAll<HTMLElement>('[data-entry]');
        for (const card of cards) {
            const red = card.querySelector('.questRed');
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
                    this._openUnlockGate('试炼未解锁', '🗼', `需先通关第 ${Math.max(0, f - 1)} 层`);
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
                                this._openUnlockGate('试炼未解锁', '🗼', `需先通关第 ${from - 1} 层`);
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
                    // 禁用不是死键：点未解锁层给 3-C 拦截（解锁条件 + 前往关卡）
                    onDisabled: () => this._openUnlockGate('试炼未解锁', '🗼', `需先通关第 ${sel - 1} 层`),
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
        // 档位寄在方法内可变变量上：切页签就地重绘（保留滚动位），不再整层重开（UX 0-7）
        let selTier = Math.min(2, Math.max(0, Math.floor(tier)));
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
                onTab: t => {
                    selTier = t;
                    this._popRebuild(opt());
                },
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
                                onDisabled: () => this._toast(`已在查看「${d.name}」`),
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
                        // 标签直接取 gate.reason：与「不可派遣」拦截弹窗同源，避免
                        // 「显示选人提示、点开却说未解锁」两套说辞（选人进度下方 0/N 已可见）
                        label: gate.ok ? '派 遣' : gate.reason ?? '不可派遣',
                        disabled: !gate.ok,
                        // 禁用不是死键：点不可派遣给 3-C 拦截（条件说明 + 前往关卡）
                        onDisabled: () => this._openUnlockGate('暂不可派遣', '🚀', gate.reason ?? '未满足派遣条件'),
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
                        // 禁用不是死键：钻石不够给 3-C 资源拦截（差额 + 获取去向）
                        onDisabled: () => this._openResGate('diamond', cost, '立即完成'),
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
                        onDisabled: () => this._toast('今日广告额度已用完 · 隔日重置'),
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
                                    onDisabled: () => this._toast(locked
                                        ? `${hdef.name} 尚未解锁，无法派遣`
                                        : inLineup ? `${hdef.name} 已在上阵编队中` : `${hdef.name} 正在远征中`),
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



    // ================= 巡逻队（挂机收益 + 扫荡） =================

    /** 巡逻页当前选中的驻扎关卡（0 = 用系统里已驻扎的 / 默认最后一关） */
    protected _patrolSel = 0;

    /**
     * 巡逻队（XL 二级页）：驻扎关卡选择（只在已通关关卡里挑）+ 挂机产出累积
     * （真实时间计时，8 小时封顶）+ 一键收取 + 扫荡（花体力瞬时再清一遍）。
     *
     * 收益口径全在 PatrolSystem：金币按「已通关关数 × 400/小时 ×（1 + 关卡加成）」，
     * 所以推得越远、驻扎关卡越靠后，收益越高——这是「打过的关卡越多越有收益」的落点。
     */
    protected _openPatrolModal(): void {
        const ps = PatrolSystem.instance;
        const gm = GameManager.instance;
        const cleared = Math.max(0, Math.min(FINAL_STAGE_ID, gm.stageCleared));
        const opt = (): PopOpts => {
            // 默认驻扎：已驻扎的关卡优先，否则停在「最新通关的那一关」（收益最好的已通关关）
            const fallback = Math.max(1, cleared);
            let sel = this._patrolSel || ps.stageId || fallback;
            sel = Math.min(Math.max(1, sel), Math.max(1, cleared));
            this._patrolSel = sel;
            const def = stageInfo(sel);
            const stationed = ps.stageId === sel;
            const pending = stationed ? ps.pendingYield() : { gold: 0, misc: [] };
            const goldRate = patrolGoldPerHour(sel);
            const miscRate = patrolMiscPerHour(sel);
            const md = miscDef(miscRate.id);
            const sweep = ps.canSweep(sel);
            const left = ps.sweepLeft();
            const perDay = patrolSweepPerDay();
            const preview = patrolSweepReward(sel);
            const previewMd = miscDef(preview.misc[0]?.id ?? '');
            const pick = (id: number): void => {
                this._patrolSel = id;
                SoundFx.play('ui');
                this._popRebuild(opt());
            };
            const progress = Math.min(100, Math.round(ps.accruedSecs() / (PATROL_MAX_HOURS * 3600) * 100));
            return {
                tier: 2,
                size: 'XL',
                title: '🛡️ 巡逻队',
                barBack: true,
                show: {
                    icon: '🛡️',
                    tier: stationed ? (ps.isCapped() ? '已满仓' : '巡逻中') : '待命',
                    name: stationed ? `第 ${sel} 关 · ${def.name}` : '尚未派出巡逻队',
                    sub: `已通关 ${cleared} 关 · 挂机 🪙${goldRate.toLocaleString()}/小时`
                },
                subtitle: `驻扎已通关关卡离线攒收益（${PATROL_MAX_HOURS} 小时封顶）· 扫荡今日剩余 ${left}/${perDay} 次`,
                // 驻扎关卡只能挑打过的：这里列全 5 关，未通关的置灰并用 status 说明
                slots: sb => {
                    for (let id = 1; id <= FINAL_STAGE_ID; id++) {
                        const open = id <= cleared;
                        const cap = ps.accruedSecs() >= PATROL_MAX_HOURS * 3600;
                        const cell = this._popSlot({
                            icon: open ? (id === sel ? '🛡️' : '🚩') : '🔒',
                            tier: `第${id}关`,
                            on: id === sel,
                            // 红点：正在驻扎且已攒够（或顶到上限）时提示可收
                            red: open && ps.stageId === id && (cap || ps.hasClaimable()),
                            // 未通关的格子不是死键：点了说明为什么不能选（不留「看着能点却没反应」）
                            onClick: open
                                ? () => pick(id)
                                : () => this._openUnlockGate('无法驻扎', '🔒', `第 ${id} 关尚未通关，巡逻只服务已通关的关卡`)
                        });
                        if (!open) {
                            cell.classList.add('lock');
                        }
                        sb.appendChild(cell);
                    }
                },
                build: c => {
                    // 正在别处巡逻时先说清队伍在哪：否则「未驻扎」会让人以为收益停了
                    if (ps.isPatrolling && !stationed) {
                        c.appendChild(this._popKV('巡逻队位置', `第 ${ps.stageId} 关 · 已累积 ${ps.accruedText()}（点该关可回去收取）`, 'total'));
                    }
                    c.appendChild(this._popSec(`🚩 第 ${sel} 关 · ${def.name}`));
                    c.appendChild(this._popKV('关卡状态', sel <= cleared ? '已通关 · 可驻扎 / 可扫荡' : '未通关 · 通关后才能巡逻'));
                    c.appendChild(this._popKV('挂机产出', `🪙 ${goldRate.toLocaleString()}/小时 · ${md ? md.ic : '📦'}${md ? md.name : miscRate.id} ${miscRate.n}/小时`, 'total'));
                    c.appendChild(this._popKV('累积进度', stationed ? `${ps.accruedText()} / ${PATROL_MAX_HOURS} 小时` : '未驻扎', stationed && ps.isCapped() ? 'total' : 'free'));
                    if (stationed) {
                        const yieldText = [`🪙 ${pending.gold.toLocaleString()} 金币`];
                        for (const m of pending.misc) {
                            const pmd = miscDef(m.id);
                            yieldText.push(`${pmd ? pmd.ic : '📦'} ${pmd ? pmd.name : m.id}×${m.n}`);
                        }
                        c.appendChild(this._popKV('待领取', yieldText.join(' · '), 'total'));
                    }
                    c.appendChild(this._popAttr({
                        icon: '📈',
                        text: `收益随进度增长：每通关 1 关，挂机金币 +${(400).toLocaleString()}/小时；驻扎关卡越靠后另有最高 +32% 加成`
                    }));
                    if (stationed && ps.isCapped()) {
                        c.appendChild(this._popWarn(`⚠️ 已顶到 ${PATROL_MAX_HOURS} 小时上限，超出部分不再累积，请尽快收取`));
                    } else if (stationed) {
                        c.appendChild(this._popWarn(`⏳ 已在第 ${ps.stageId} 关巡逻 · 随时可收取，收取后重新计时`));
                    } else if (ps.isPatrolling) {
                        c.appendChild(this._popWarn(`🚩 巡逻队正在第 ${ps.stageId} 关：点「派驻第 ${sel} 关」会先自动收取，再转驻本关`));
                    } else {
                        c.appendChild(this._popWarn('🚩 当前未驻扎：选好关卡后点「派驻巡逻队」开始计时'));
                    }
                    c.appendChild(this._popSec('⚔️ 扫荡 · 花体力立刻再清一遍'));
                    c.appendChild(this._popKV('扫荡对象', `第 ${sel} 关 · ${def.name}`));
                    c.appendChild(this._popKV('预计产出', `🪙 ${preview.gold.toLocaleString()} · ${previewMd ? previewMd.ic : '📦'}${previewMd ? previewMd.name : ''}×${preview.misc[0]?.n ?? 0}`, 'total'));
                    c.appendChild(this._popKV('今日剩余', `${left}/${perDay} 次`, left <= 0 ? 'total' : 'free'));
                    c.appendChild(this._popKV('消耗', `⚡ ${BattleConfig.RUN_STAMINA_COST} 体力 / 次`));
                    if (!sweep.ok) {
                        c.appendChild(this._popWarn(`🔒 ${sweep.reason ?? '不可扫荡'}`));
                    }
                    c.appendChild(this._popSec('其余已通关关卡'));
                    let listed = 0;
                    for (let id = cleared; id >= 1; id--) {
                        if (id === sel) {
                            continue;
                        }
                        listed++;
                        const d = stageInfo(id);
                        const gr = patrolGoldPerHour(id);
                        c.appendChild(this._popRow({
                            icon: ps.stageId === id ? '🛡️' : '🚩',
                            title: `第 ${id} 关 · ${d.name}`,
                            tag: ps.stageId === id ? '巡逻中' : undefined,
                            lines: [`🪙 ${gr.toLocaleString()}/小时`, '已通关 · 可驻扎/扫荡'],
                            on: ps.stageId === id,
                            action: { label: '选 中', kind: 'gold', onClick: () => pick(id) }
                        }));
                    }
                    if (listed === 0) {
                        c.appendChild(this._popEmpty('暂无其他已通关关卡', '继续推进主线可解锁更多巡逻点', '🚩'));
                    }
                },
                ctas: stationed
                    ? [
                        {
                            label: pending.gold > 0 || pending.misc.length > 0 ? `🪙 收 取 ${pending.gold.toLocaleString()}` : '暂 无 产 出',
                            kind: 'gold',
                            disabled: !(pending.gold > 0 || pending.misc.length > 0),
                            onDisabled: () => this._toast('还没攒够产出 · 巡逻中会持续累积'),
                            red: pending.gold > 0,
                            onClick: () => {
                                SoundFx.play('coin');
                                const y = ps.claim();
                                if (y) {
                                    this._toast(`巡逻收取：🪙 ${y.gold.toLocaleString()}${y.misc.length ? ` · ${md ? md.name : ''}×${y.misc[0].n}` : ''}`);
                                }
                                this._refreshTop();
                                this._popRebuild(opt());
                            }
                        },
                        {
                            label: sweep.ok ? `⚔️ 扫 荡 ⚡${BattleConfig.RUN_STAMINA_COST}` : sweep.reason ?? '不可扫荡',
                            kind: 'green',
                            disabled: !sweep.ok,
                            // 禁用不是死键：按缺口给拦截弹窗或差额说明
                            onDisabled: () => {
                                if (!sweep.ok) {
                                    if (ps.sweepLeft() <= 0) {
                                        this._toast(sweep.reason ?? '今日扫荡次数已用完');
                                    } else if (!isPatrolStage(sel)) {
                                        this._openUnlockGate('无法扫荡', '🚩', sweep.reason ?? '该关尚未通关');
                                    } else {
                                        this._openStaminaGate(BattleConfig.RUN_STAMINA_COST, () => this._openPatrolModal());
                                    }
                                }
                            },
                            onClick: () => {
                                SoundFx.unlock();
                                const r = ps.sweep(sel);
                                if (r) {
                                    SoundFx.play('coin');
                                    const rmd = miscDef(r.misc[0]?.id ?? '');
                                    this._toast(`扫荡 ${r.stageName}：🪙 ${r.gold.toLocaleString()}${rmd ? ` · ${rmd.name}×${r.misc[0].n}` : ''}`);
                                } else {
                                    this._toast(ps.canSweep(sel).reason ?? '扫荡失败');
                                }
                                this._refreshTop();
                                this._popRebuild(opt());
                            }
                        }
                    ]
                    : [{
                        label: `🚩 派 驻 第 ${sel} 关`,
                        kind: 'gold',
                        disabled: sel > cleared,
                        onDisabled: () => this._openUnlockGate('无法驻扎', '🚩', `第 ${sel} 关尚未通关，巡逻只服务已通关的关卡`),
                        onClick: () => {
                            SoundFx.unlock();
                            const auto = ps.setStage(sel);
                            if (auto && (auto.gold > 0 || auto.misc.length > 0)) {
                                this._toast(`已转驻 · 上次产出自动收取 🪙 ${auto.gold.toLocaleString()}`);
                            } else {
                                this._toast(`巡逻队已派驻第 ${sel} 关`);
                            }
                            this._refreshTop();
                            this._popRebuild(opt());
                        }
                    }],
                note: '离线也计时 · 8 小时封顶 · 扫荡次数每日 00:00 重置 · 通关越多收益越高'
            };
        };
        this._openPop(opt());
    }


    /** 进入资源副本：走流程状态机（内部校验次数/体力/档位，失败给出具体原因） */
    protected _startDungeon(id: DungeonId, tier: number): void {        if (!this._root) {
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

    /** 好友（社交系统还没做，但入口这一轮先落地）：图标与位置都是真的，点开有说明、有出路，
     *  不是静默吞点击的死键。功能上线时把 build 里的两行换成好友列表即可，键位不用动。 */
    protected _openFriendsModal(): void {
        this._openPop({
            tier: 3,
            size: 'M',
            banner: '好友',
            art: '开发中',
            show: { icon: '👥', name: '好友', sub: '社交系统 · 尚未开放' },
            build: c => {
                c.appendChild(this._popAttr({
                    icon: '👥',
                    iconTex: 'ui/ico/ico_friend',
                    text: '**好友系统开发中** 上线后可加好友、看好友编队、互赠体力'
                }));
                c.appendChild(this._popAttr({
                    icon: '🏆',
                    iconTex: 'ui/ico/ico_trophy',
                    text: '现在就能比的是**排行榜**：出战结算自动上榜'
                }));
            },
            // 文案不带空格：金字板（btn_play）按 7 个字符宽就撑不下了，「去 看 排 行 榜」实测压出板外
            ctas: [{ label: '去看排行榜', kind: 'gold', onClick: () => this._openLeaderboardModal() }],
            note: '好友开放后会在此入口挂红点提示，不必反复点开'
        });
    }

    /** 敌军图鉴（UX 布局稿：L3·L 列表型）：完成度头部 + 敌军条目（未解锁剪影/未遭遇）+ 点条目进详情 */
    protected _openBestiaryModal(): void {
        const bs = BestiarySystem.instance;
        const opt = (): PopOpts => {
            const { done, total } = bs.completion();
            return {
                tier: 3,
                size: 'L',
                banner: '📖 敌军图鉴',
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
                name: unlocked ? def.name : '？？？',
                sub: unlocked ? def.behavior : '？？？ · ？？？'
            },
            build: c => {
                // 威胁等级从「一串 ★ 文本」改成逐颗星元素：文本星只能整串一个颜色，也贴不了图
                if (unlocked) {
                    c.appendChild(this._popSec('威胁等级'));
                    c.appendChild(this._starRow(def.threat, 5));
                }
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
                    onDisabled: () => this._toast('今日已签到 · 明天再来'),
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
                // 档位由内容量决定（交互稿口径，稿里本面即 L3）：活跃度固定块 + 双页签列表
                // 在 M 档装不下（实测溢出 ~100px），升 L 档。
                size: 'L',
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
                    this._barTex(pbar, fill, 'ui/progress/bar_fill_yellow');
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
                        c.appendChild(this._popEmpty('暂无任务', undefined, 'ui/ico/ico_task'));
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
                // 说明行与固定活跃度块（每日 0 点重置）重复，省一行高度让列表一屏多读一行
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
                        c.appendChild(this._popEmpty('榜单暂无数据', '首次出战结算后上榜', 'ui/ico/ico_rank'));
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

    /**
     * 行动页（布局稿 R2）：标题行（今日活跃）→ 日常四快捷 → 挑战场（无尽试炼/无尽守卫）
     * → 资源副本四联 → 远征行 → 页脚三快捷。整页竖排，副本/远征/页脚常驻底部。
     */
    protected _buildPlayPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen sAction';
        this._pages.core = page;

        // 标题行：页名 + 今日活跃度（活跃宝箱口径）
        const title = document.createElement('div');
        title.className = 'action-title';
        const h1 = document.createElement('h1');
        h1.textContent = '作战行动';
        const act = document.createElement('small');
        act.className = 'actNum';
        title.appendChild(h1);
        title.appendChild(act);
        page.appendChild(title);
        this._actNumEl = act;

        // 日常四快捷：签到 / 任务 / 成就 / 礼包（红点驱动，点击直达）
        const daily = document.createElement('div');
        daily.className = 'action-daily';
        const mkDaily = (ic: string, label: string, sub: string, onTap: () => void, tex?: string): HTMLButtonElement => {
            const b = document.createElement('button');
            b.className = 'hot dutyCard';
            b.innerHTML = `<span class="ic">${ic}</span><span>${label}</span><small class="dcSub">${sub}</small>`
                + '<i class="questRed"></i>';
            // 这四枚 .ic 有 31px，素材早就为侧栏同一批入口出过图（本轮只接线、不出新图）
            if (tex) {
                this._tex(tex, UiPlate.icon(b.querySelector('.ic') as HTMLElement));
            }
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                onTap();
            };
            daily.appendChild(b);
            return b;
        };
        const signinBtn = mkDaily('📅', '签到', '第 1 天', () => this._openSigninModal(), 'ui/ico/ico_signin');
        this._signinRedEl = signinBtn.querySelector('.questRed') as HTMLElement;
        this._refreshSigninRed(this._signinRedEl);
        this._signinSubEl = signinBtn.querySelector('.dcSub') as HTMLElement;
        const questBtn = mkDaily('📋', '任务', '0 项可领', () => this._openQuestModal(0), 'ui/ico/ico_task');
        this._questRedEl = questBtn.querySelector('.questRed') as HTMLElement;
        this._refreshQuestRed(this._questRedEl);
        this._questSubEl = questBtn.querySelector('.dcSub') as HTMLElement;
        const achBtn = mkDaily('🎖️', '成就', '0 项达成', () => this._openQuestModal(1), UiPlate.MODE_TEX.achievement);
        this._achSubEl = achBtn.querySelector('.dcSub') as HTMLElement;
        const giftBtn = mkDaily('🎁', '礼包', '每日补给', () => this._openGiftModal(), 'ui/shop/shop_gift');
        this._giftSubEl = giftBtn.querySelector('.dcSub') as HTMLElement;
        page.appendChild(daily);

        // 挑战场：无尽试炼（塔层） / 无尽守卫（通关全章解锁）
        const ground = document.createElement('div');
        ground.className = 'challenge-ground';
        const mkEntry = (ic: string, name: string, onTap?: () => void, tex?: string): HTMLButtonElement => {
            const b = document.createElement('button');
            b.className = 'entry';
            b.innerHTML = `<span class="ic">${ic}</span><h2>${name}</h2><small></small>`;
            // 挑战场那两张入口卡的 .ic 有 105px，是全主城最大的插画位（宿主自带 entry_card 底板，图不出框）
            if (tex) {
                this._tex(tex, UiPlate.icon(b.querySelector('.ic') as HTMLElement));
            }
            if (onTap) {
                b.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    onTap();
                };
            }
            ground.appendChild(b);
            return b;
        };
        const trialEl = mkEntry('🗼', '无尽试炼', () => this._openTrialModal(), UiPlate.MODE_TEX.trial);
        trialEl.dataset.entry = 'trial';
        trialEl.appendChild(this._mkRed('trial'));
        const endlessEl = mkEntry('🌀', '无尽守卫', () => this._startBattle(true), UiPlate.MODE_TEX.endless);
        endlessEl.dataset.entry = 'endless';
        this._trialEntryEl = trialEl;
        this._endlessEntryEl = endlessEl;
        page.appendChild(ground);

        // 资源副本四联（金币/强化石/合金/宝石）
        const dungeons = document.createElement('div');
        dungeons.className = 'dungeons';
        const dLabel = document.createElement('div');
        dLabel.className = 'section-label';
        dLabel.innerHTML = `<b>资源副本</b><small>每次 ${DUNGEON_STAMINA_COST} 体力</small>`;
        dungeons.appendChild(dLabel);
        const dRow = document.createElement('div');
        dRow.className = 'dungeon-row';
        DUNGEON_DEFS.forEach((def, i) => {
            const b = document.createElement('button');
            b.className = 'hot';
            b.dataset.entry = 'dungeon';
            b.dataset.dungeon = def.id;
            b.innerHTML = `<span class="ic">${def.ic}</span><span>${def.name}</span><small>${DUNGEON_RUNS_PER_DAY} 次</small>`;
            // 副本行 50px：四条里强化石那条的图判死没落盘（与晶体矿脉撞形），它继续走 emoji——
            // 撞形比缺一个更糟，玩家在这排要做的正是"选哪一条"
            const dIc = b.querySelector<HTMLElement>('.ic');
            const dTex = UiPlate.MODE_TEX[`dungeon_${def.id}`];
            if (dIc && dTex) {
                this._tex(dTex, UiPlate.icon(dIc));
            }
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                if (!GameManager.instance.isBuildingUnlocked('dungeon')) {
                    this._toast('🔒 指挥中心 LV.2 解锁资源副本');
                    return;
                }
                this._openDungeonModal(i);
            };
            b.appendChild(this._mkRed('dungeon'));
            dRow.appendChild(b);
        });
        dungeons.appendChild(dRow);
        page.appendChild(dungeons);

        // 远征行：图标 + 进度文案 + 远征入口
        const exp = document.createElement('div');
        exp.className = 'expedition';
        exp.dataset.entry = 'expedition';
        exp.innerHTML = '<span class="ic">🚚</span><div class="expedition-text"><b>远征 · 物资搜寻</b><small></small></div>';
        // 远征那枚 🚚 复用出征章节头同一件载具图（同图不同位是允许的，同位重复才禁止）
        this._tex(UiPlate.VEHICLE_TEX['🚚'], UiPlate.icon(exp.querySelector('.ic') as HTMLElement));
        const expHot = document.createElement('button');
        expHot.className = 'hot';
        expHot.innerHTML = '<span class="ic">🚩</span>远征';
        this._tex(UiPlate.MODE_TEX.expedition, UiPlate.icon(expHot.querySelector('.ic') as HTMLElement));
        expHot.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._enterPureEntry('expedition');
        };
        exp.appendChild(expHot);
        exp.appendChild(this._mkRed('expedition'));
        page.appendChild(exp);
        this._expTextEl = exp.querySelector('.expedition-text small') as HTMLElement;

        // 页脚四快捷：敌军图鉴 / 排行榜 / 好友 / 城防改装
        const footer = document.createElement('div');
        footer.className = 'action-footer';
        const mkFoot = (ic: string, label: string, onTap: () => void, key?: string, tex?: string): HTMLButtonElement => {
            const b = document.createElement('button');
            b.className = 'hot';
            b.innerHTML = `<span class="ic">${ic}</span>${label}`;
            // 在库图标到位即顶掉 emoji 占位（.hot .ic 已是 34px 方框，尺寸归 CSS）
            if (tex) {
                this._tex(tex, UiPlate.icon(b.querySelector('.ic') as HTMLElement));
            }
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                onTap();
            };
            if (key) {
                b.dataset.entry = key;
                b.appendChild(this._mkRed(key));
            }
            footer.appendChild(b);
            return b;
        };
        mkFoot('📖', '敌军图鉴', () => this._openBestiaryModal(), 'bestiary', 'ui/shop/shop_scroll');
        mkFoot('🏆', '排行榜', () => this._openLeaderboardModal(), 'leaderboard', 'ui/ico/ico_trophy');
        mkFoot('🔧', '城防改装', () => this._openTuningModal(), undefined, UiPlate.MODE_TEX.vehicle_tuning);
        mkFoot('👥', '好友', () => this._openFriendsModal(), undefined, 'ui/ico/ico_friend');
        page.appendChild(footer);

        root.appendChild(page);
        // 入口红点巡检覆盖整页（入口分散在挑战场/副本/远征/页脚）
        this._playGridEl = page;
    }

    /** 入口红点占位（纯 CSS 控制显隐） */
    protected _mkRed(key: string): HTMLElement {
        const red = document.createElement('i');
        red.className = 'questRed';
        red.dataset.red = key;
        return red;
    }


    /** 行动页刷新：标题活跃度 + 日常副标 + 挑战场层数/解锁 + 副本次数 + 远征文案 */
    protected _refreshPlayPage(): void {
        const page = this._playGridEl;
        if (!page) {
            return;
        }
        const gm = GameManager.instance;
        const qs = QuestSystem.instance;
        // 标题：今日活跃度（活跃宝箱口径）
        if (this._actNumEl) {
            this._actNumEl.textContent = `今日活跃 ${qs.activity} / ${ACTIVITY_MAX}`;
        }
        const owned = QUEST_DEFS.filter(q => q.kind === 'daily' && qs.canClaim(q)).length;
        if (this._questSubEl) {
            this._questSubEl.textContent = owned > 0 ? `${owned} 项可领` : '今日已清';
        }
        if (this._signinSubEl) {
            this._signinSubEl.textContent = this._signinDayText();
        }
        if (this._achSubEl) {
            const achv = QUEST_DEFS.filter(q => q.kind === 'achv');
            const done = achv.filter(q => qs.isClaimed(q)).length;
            this._achSubEl.textContent = `达成 ${done} / ${achv.length}`;
        }
        if (this._giftSubEl) {
            this._giftSubEl.textContent = '每日补给';
        }
        // 挑战场：试炼层数 / 无尽解锁（通关全章）
        if (this._trialEntryEl) {
            const ts = TrialSystem.instance;
            const sub = this._trialEntryEl.querySelector('small') as HTMLElement;
            sub.textContent = ts.maxFloor > 0 ? `第 ${ts.nextFloor} 层 · 不耗体力` : '不耗体力 · 从第 1 层开始';
            this._trialEntryEl.title = '爬塔：层段固定奖励，首通结算';
        }
        if (this._endlessEntryEl) {
            const ok = gm.stageCleared >= FINAL_STAGE_ID;
            const sub = this._endlessEntryEl.querySelector('small') as HTMLElement;
            sub.textContent = ok ? '波次无限 · 每 5 波里程碑' : `通关第 ${FINAL_STAGE_ID} 章解锁`;
            this._endlessEntryEl.className = 'entry' + (ok ? '' : ' locked');
            this._endlessEntryEl.title = ok ? '无尽守卫：波次无限' : `通关第 ${FINAL_STAGE_ID} 章解锁`;
        }
        // 资源副本：每类今日剩余次数
        page.querySelectorAll<HTMLElement>('.dungeon-row .hot[data-dungeon]').forEach(el => {
            const id = el.dataset.dungeon as DungeonId;
            const sub = el.querySelector('small');
            if (sub) {
                const left = DungeonSystem.instance.remaining(id);
                sub.textContent = left > 0 ? `${left} / ${DUNGEON_RUNS_PER_DAY} 次` : '今日已用尽';
            }
            el.classList.toggle('off', GameManager.instance.stamina() < DUNGEON_STAMINA_COST);
        });
        if (this._expTextEl) {
            this._expTextEl.textContent = this._pureEntryDesc('expedition');
        }
        this._refreshEntryReds();
    }


    /** 签到副标：按当前签到天数给出「第 N 天 / 7」 */
    protected _signinDayText(): string {
        const ss = SigninSystem.instance;
        return `第 ${Math.min(ss.totalDays, ss.day)} 天 / ${ss.totalDays}`;
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
            return `已记录 ${done}/${total} 种敌军`;
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
