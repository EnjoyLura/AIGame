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
import { HomeUiPlay } from './HomeUiPlay';
import type { PopOpts, PopText } from './HomeUiCore';

/**
 * 基地页：建筑养成（升级建筑 + 局外强化）+ 建筑详情/载具改装弹窗。
 */
export abstract class HomeUiBase extends HomeUiPlay {




    /**
     * 建筑详情（UX 布局稿：L3·M）：介绍 + 当前/下一级效果 + 升级费用与货币余量 + 受限说明。
     * 升级后就地重绘同步等级与费用；载具工坊额外钻取到载具改装。
     */
    protected _openBuildingInfoModal(id: string): void {
        const gm = GameManager.instance;
        const b = BUILDINGS.find(x => x.id === id);
        if (!b) {
            return;
        }
        const opt = (): PopOpts => {
            const lv = gm.buildingLevel(b.id);
            const maxed = lv >= b.maxLevel;
            const unlocked = gm.isBuildingUnlocked(b.id);
            const hqBlocked = !maxed && unlocked && b.id !== 'hq' && lv + 1 > gm.hqLevel() + 1;
            const cost = maxed ? 0 : gm.buildingCost(b.id);
            const can = gm.canUpgradeBuilding(b.id);
            return {
                tier: 3,
                size: 'M',
                banner: `${b.ic} ${b.name}`,
                art: `LV.${lv} / ${b.maxLevel}`,
                subtitle: b.intro,
                build: c => {
                    c.appendChild(this._popSec('效果'));
                    c.appendChild(this._popAttr({
                        icon: '✅',
                        text: lv > 0 ? `当前：**${b.desc(lv)}**` : '尚未生效 · 升级后获得加成'
                    }));
                    if (!maxed) {
                        c.appendChild(this._popAttr({ icon: '⬆️', text: `升到 LV.${lv + 1}：**${b.desc(lv + 1)}**` }));
                    }
                    c.appendChild(this._popSec('升级'));
                    c.appendChild(this._popKV('当前等级', `LV.${lv} / ${b.maxLevel}`));
                    c.appendChild(this._popKV('指挥中心', `LV.${gm.hqLevel()} · 本建筑上限 LV.${gm.hqLevel() + 1}`));
                    if (!maxed) {
                        c.appendChild(this._popKV('升级费用', `🪙 ${cost.toLocaleString()}`, 'total'));
                    }
                    if (!unlocked) {
                        c.appendChild(this._popWarn(`需指挥中心 LV.${b.unlockHq} 解锁（当前 LV.${gm.hqLevel()}）`));
                    } else if (hqBlocked) {
                        c.appendChild(this._popWarn('受指挥中心上限约束 · 先升级指挥中心'));
                    } else if (maxed) {
                        c.appendChild(this._popAttr({ icon: '🏁', text: '已达满级' }));
                    } else if (!can) {
                        c.appendChild(this._popWarn(`金币不足 · 还差 🪙 ${(cost - gm.gold).toLocaleString()}`));
                    }
                    if (b.id === 'hq' && unlocked) {
                        c.appendChild(this._popSec('关联功能'));
                        c.appendChild(this._popRow({
                            icon: '⚒️',
                            title: '局外强化',
                            lines: ['火力 / 装甲 / 赏金 / 演练 四向金币直购，全局生效'],
                            action: {
                                label: '进 入',
                                kind: 'gold',
                                onClick: () => this._openMetaUpgradeModal(() => this._openBuildingInfoModal(b.id))
                            }
                        }));
                    }
                    if (b.id === 'workshop' && unlocked) {
                        c.appendChild(this._popSec('关联功能'));
                        c.appendChild(this._popRow({
                            icon: '🔧',
                            title: '载具改装',
                            lines: ['装甲板 / 撞角 / 工具箱 / 弹药架 四槽独立升级'],
                            action: {
                                label: '进 入',
                                kind: 'gold',
                                onClick: () => this._openTuningModal(() => this._openBuildingInfoModal(b.id))
                            }
                        }));
                    }
                },
                cost: maxed || !unlocked || hqBlocked ? undefined : [{ icon: '🪙', have: gm.gold, need: cost }],
                ctas: [{
                    label: !unlocked ? `🔒 指挥中心 LV.${b.unlockHq} 解锁`
                        : maxed ? '已 满 级'
                            : hqBlocked ? '🔒 先升级指挥中心'
                                : `🪙 ${cost.toLocaleString()} · 升 级`,
                    disabled: !can,
                    // 禁用不是死键：按缺口分派到拦截弹窗或差额 toast（UX 0-4）
                    onDisabled: () => {
                        if (!unlocked) {
                            this._openUnlockGate('指挥中心未达标', '🏛️',
                                `需指挥中心 LV.${b.unlockHq}（当前 LV.${gm.hqLevel()}）`,
                                '前 往 指 挥 中 心', () => this._openBuildingInfoModal('hq'),
                                '升级指挥中心后本建筑自动解锁');
                        } else if (hqBlocked) {
                            this._openUnlockGate('受指挥中心上限约束', '🏛️',
                                `本建筑上限 LV.${gm.hqLevel() + 1} · 需先升级指挥中心`,
                                '前 往 指 挥 中 心', () => this._openBuildingInfoModal('hq'),
                                '指挥中心等级即全基地等级上限');
                        } else if (maxed) {
                            this._toast('该建筑已满级');
                        } else {
                            this._toast(`金币不足 · 还差 🪙 ${(cost - gm.gold).toLocaleString()}`);
                        }
                    },
                    onClick: () => {
                        SoundFx.unlock();
                        const nextLv = gm.buildingLevel(b.id) + 1;
                        if (gm.upgradeBuilding(b.id)) {
                            SoundFx.play('buy');
                            this._toast(`${b.name} 升至 LV.${nextLv}`);
                            this._refreshBase();
                            this._refreshTop();
                            this._popRebuild(opt());
                        } else {
                            this._toast('升级失败 · 检查金币与指挥中心等级');
                        }
                    }
                }],
                note: '升级效果即时生效 · 建筑上限受指挥中心等级约束'
            };
        };
        this._openPop(opt());
    }


    /**
     * 载具改装（UX 布局稿 · XL 二级页）：四部位槽位条 + 选中部位展示台 + 当前/下级对比块
     * + 消耗行 + 底栏返回。改装上限 = 载具工坊等级；由建筑详情钻取时底栏返回回建筑详情。
     */
    protected _openTuningModal(onBack?: () => void): void {
        const vt = VehicleTuningSystem.instance;
        let sel = 0;
        const opt = (): PopOpts => {
            const def = TUNE_SLOTS[sel];
            const lv = vt.level(def.id);
            const maxed = lv >= TUNE_MAX_LEVEL;
            const gate = vt.canUpgrade(def.id);
            const bp = vt.blueprintCount;
            const cost = maxed ? null : vt.nextCosts(def.id);
            return {
                tier: 2,
                size: 'XL',
                title: '🔧 载具改装',
                onBack,
                barBack: true,
                show: {
                    icon: def.ic,
                    tier: maxed ? 'MAX' : `LV.${lv}`,
                    name: def.name,
                    sub: lv > 0 ? def.desc(lv) : '尚未改装 · 改装后获得加成'
                },
                slots: sb => {
                    for (let i = 0; i < TUNE_SLOTS.length; i++) {
                        const d = TUNE_SLOTS[i];
                        const dlv = vt.level(d.id);
                        const dmax = dlv >= TUNE_MAX_LEVEL;
                        sb.appendChild(this._popSlot({
                            icon: d.ic,
                            tier: dmax ? 'MAX' : `L${dlv}`,
                            on: i === sel,
                            red: !dmax && vt.canUpgrade(d.id).ok,
                            onClick: () => {
                                sel = i;
                                this._popRebuild(opt());
                            }
                        }));
                    }
                },
                build: c => {
                    c.appendChild(this._popSec(`${def.name} · 改装进度`));
                    c.appendChild(this._popKV('当前等级', `LV.${lv} / ${TUNE_MAX_LEVEL}`, maxed ? 'total' : undefined));
                    if (!maxed) {
                        c.appendChild(this._popCmp('改装预览', [{
                            label: def.name,
                            old: def.desc(lv),
                            now: def.desc(lv + 1)
                        }]));
                        c.appendChild(this._popAttr({
                            icon: '⬆️',
                            text: `升到 LV.${lv + 1} 后生效 · 改装加成计入**载具基础属性**`
                        }));
                    } else {
                        c.appendChild(this._popAttr({ icon: '🏁', text: '该部位已改装至上限' }));
                    }
                    c.appendChild(this._popSec('改装条件'));
                    c.appendChild(this._popKV('改装上限', `LV.${vt.capOf()}（载具工坊等级）`));
                    c.appendChild(this._popKV('改装图纸', `${bp} 张`, 'free'));
                    if (!maxed && !gate.ok && gate.reason) {
                        c.appendChild(this._popWarn(gate.reason));
                    } else if (!maxed && cost && bp < cost.blueprint) {
                        c.appendChild(this._popWarn(`图纸不足 · 还差 ${cost.blueprint - bp} 张`));
                    }
                    c.appendChild(this._popSec('其余部位'));
                    for (const d of TUNE_SLOTS) {
                        if (d.id === def.id) {
                            continue;
                        }
                        const dlv = vt.level(d.id);
                        c.appendChild(this._popAttr({
                            icon: d.ic,
                            text: `${d.name} **LV.${dlv}**（${dlv > 0 ? d.desc(dlv) : '尚未改装'}）`
                        }));
                    }
                },
                cost: maxed || !cost ? undefined : [
                    { icon: '🔧', have: bp, need: cost.blueprint },
                    { icon: '🪙', have: GameManager.instance.gold, need: cost.gold }
                ],
                ctas: [{
                    label: maxed ? '已 满 级' : `🔧 改 装（LV.${lv + 1}）`,
                    kind: 'gold',
                    disabled: maxed || !gate.ok,
                    onDisabled: () => this._toast(maxed
                        ? `${def.name} 已满级`
                        : gate.reason ?? `图纸不足 · 还差 ${Math.max(0, cost.blueprint - bp)}`),
                    onClick: () => {
                        SoundFx.unlock();
                        if (vt.upgrade(def.id)) {
                            SoundFx.play('buy');
                            this._toast(`${def.name} 升至 LV.${lv + 1}`);
                            this._refreshBase();
                            this._refreshTop();
                            this._popRebuild(opt());
                        } else {
                            this._toast('图纸或金币不足');
                        }
                    }
                }],
                note: '图纸由关卡掉落与商店获取 · 提升载具工坊等级可提高改装上限'
            };
        };
        this._openPop(opt());
    }




    // ================= 基地页 =================

    /**
     * 基地页（布局稿 R2）：头行（基地名 + 全队加成）→ 营地地图（路面底纹 + 2×4 建筑格）
     * → 局外强化条 → 底行（下一级目标 / 已开放设施数）。
     */
    protected _buildBasePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen sBase';
        this._pages.base = page;
        // 局外强化（META_UPGRADES）升为 L2·XL 二级页，入口挂指挥中心详情 —— 布局稿基地页中部整块留给地图
        // 头行：基地等级 = 指挥中心等级；右侧全局加成（火力/装甲强化实时值）
        const head = document.createElement('div');
        head.className = 'base-head';
        const h1 = document.createElement('h1');
        h1.textContent = '第 7 区 · 方舟基地';
        const sub = document.createElement('small');
        head.appendChild(h1);
        head.appendChild(sub);
        page.appendChild(head);
        this._baseHeadSubEl = sub;
        // 营地地图：路面底纹 + 建筑格（2 列 × 4 行，养成建筑 8 座）
        const map = document.createElement('div');
        map.className = 'base-map';
        const roads = document.createElement('div');
        roads.className = 'map-roads';
        roads.innerHTML = '<svg viewBox="0 0 390 600" preserveAspectRatio="none" aria-hidden="true">' +
            '<path d="M180-20 210 630M-20 99 400 170M-20 247 400 320M-20 392 400 470" stroke="#b8b8b8" stroke-width="40" fill="none"/>' +
            '<path d="M180-20 210 630M-20 99 400 170M-20 247 400 320M-20 392 400 470" stroke="#eee" stroke-width="2" stroke-dasharray="12 12" fill="none"/>' +
            '</svg>';
        const buildings = document.createElement('div');
        buildings.className = 'base-buildings';
        map.appendChild(roads);
        map.appendChild(buildings);
        page.appendChild(map);
        this._baseMapEl = map;
        this._baseBuildingsEl = buildings;
        // 底行：下一级目标 + 已开放设施数
        const bottom = document.createElement('div');
        bottom.className = 'base-bottom';
        const nextTip = document.createElement('small');
        const openTip = document.createElement('small');
        bottom.appendChild(nextTip);
        bottom.appendChild(openTip);
        page.appendChild(bottom);
        this._baseNextEl = nextTip;
        this._baseOpenEl = openTip;
        root.appendChild(page);
    }


    protected _baseMapEl: HTMLDivElement | null = null;

    protected _baseBuildingsEl: HTMLDivElement | null = null;

    protected _baseHeadSubEl: HTMLElement | null = null;
    protected _baseNextEl: HTMLElement | null = null;

    protected _baseOpenEl: HTMLElement | null = null;


    protected _refreshBase(): void {
        const gm = GameManager.instance;
        const list = this._baseBuildingsEl;
        if (!list) {
            return;
        }
        const lvOf = (id: string): number => gm.upgradeLevel(id);
        const descOf = (id: string): string => {
            const def = META_UPGRADES.find(u => u.id === id);
            return def ? def.desc(lvOf(id)) : '';
        };
        if (this._baseHeadSubEl) {
            this._baseHeadSubEl.textContent = `${descOf('atk')}　${descOf('vehHp')}`;
        }
        // 营地建筑格（养成建筑按 BUILDINGS 顺序铺 2×4；奇偶错位由 CSS nth-child 完成）
        list.innerHTML = '';
        let opened = 0;
        let lockedName = '';
        let unlockedCount = 0;
        for (const b of BUILDINGS) {
            if (b.pureEntry) {
                continue;
            }
            const lv = gm.buildingLevel(b.id);
            const maxed = lv >= b.maxLevel;
            const unlocked = gm.isBuildingUnlocked(b.id);
            if (unlocked) {
                opened++;
            }
            const canUp = unlocked && gm.canUpgradeBuilding(b.id);
            if (!unlocked && !lockedName) {
                lockedName = `${b.name}（指挥中心 LV.${b.unlockHq}）`;
            }
            const node = document.createElement('button');
            node.className = 'building' + (unlocked ? '' : ' locked');
            node.dataset.building = b.id;
            node.innerHTML = `<span class="ic">${b.ic}</span>` +
                `<strong>${unlocked ? '' : '♙ '}${b.name}${canUp ? '<i class="questRed on"></i>' : ''}</strong>` +
                `<small>${unlocked ? `LV.${lv}${maxed ? ' · MAX' : ''}` : `指挥中心 Lv.${b.unlockHq} 解锁`}</small>`;
            node.title = unlocked ? `${b.name} · 点击查看详情/升级` : `${b.name} · 指挥中心 LV.${b.unlockHq} 解锁`;
            node.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openBuildingInfoModal(b.id);
            };
            list.appendChild(node);
            unlockedCount++;
        }
        if (this._baseNextEl) {
            this._baseNextEl.textContent = lockedName ? `下一级营地：解锁${lockedName}` : '全部设施已开放';
        }
        if (this._baseOpenEl) {
            this._baseOpenEl.textContent = `已开放 ${opened} / ${unlockedCount} 设施`;
        }
        // 局外强化卡已移入「⚒️ 局外强化」二级页（指挥中心详情 → 关联功能）
        this._applyPendingTex();
    }

    /** 局外强化图标（META_UPGRADES 无 ic 字段，按 id 映射） */
    protected _metaIc(id: string): string {
        return id === 'atk' ? '⚔️' : id === 'vehHp' ? '🛡️' : id === 'goldGain' ? '🪙' : '🎯';
    }

    /**
     * 局外强化（UX 布局稿 · XL 二级页）：四强化槽位条 + 选中项当前/下级对比 + 消耗行 + 底栏返回。
     * 入口挂在指挥中心详情（基地页中部整块留给营地地图，与稿一致）。
     */
    protected _openMetaUpgradeModal(onBack?: () => void): void {
        const gm = GameManager.instance;
        let sel = 0;
        const opt = (): PopOpts => {
            const def = META_UPGRADES[sel];
            const lv = gm.upgradeLevel(def.id);
            const maxed = lv >= def.maxLevel;
            const can = gm.canUpgrade(def.id);
            const cost = maxed ? 0 : gm.upgradeCost(def.id);
            return {
                tier: 2,
                size: 'XL',
                title: '⚒️ 局外强化',
                onBack,
                barBack: true,
                show: {
                    icon: this._metaIc(def.id),
                    tier: maxed ? 'MAX' : `LV.${lv}`,
                    name: def.name,
                    sub: lv > 0 ? def.desc(lv) : '尚未强化 · 强化后全局生效'
                },
                slots: sb => {
                    for (let i = 0; i < META_UPGRADES.length; i++) {
                        const d = META_UPGRADES[i];
                        const dlv = gm.upgradeLevel(d.id);
                        const dmax = dlv >= d.maxLevel;
                        sb.appendChild(this._popSlot({
                            icon: this._metaIc(d.id),
                            tier: dmax ? 'MAX' : `L${dlv}`,
                            on: i === sel,
                            red: !dmax && gm.canUpgrade(d.id),
                            onClick: () => {
                                sel = i;
                                this._popRebuild(opt());
                            }
                        }));
                    }
                },
                build: c => {
                    c.appendChild(this._popSec(`${def.name} · 强化进度`));
                    c.appendChild(this._popKV('当前等级', `LV.${lv} / ${def.maxLevel}`, maxed ? 'total' : undefined));
                    if (!maxed) {
                        c.appendChild(this._popCmp('强化预览', [{
                            label: def.name,
                            old: def.desc(lv),
                            now: def.desc(lv + 1)
                        }]));
                        c.appendChild(this._popAttr({
                            icon: '⬆️',
                            text: `升到 LV.${lv + 1} 后生效 · 加成计入**局外面板**，战斗开始时套用`
                        }));
                    } else {
                        c.appendChild(this._popAttr({ icon: '🏁', text: '该强化已达上限' }));
                    }
                    c.appendChild(this._popSec('强化条件'));
                    c.appendChild(this._popKV('购买方式', '金币直购 · 无等级门槛'));
                    if (!maxed && !can) {
                        c.appendChild(this._popWarn(`金币不足 · 还差 🪙 ${(cost - gm.gold).toLocaleString()}`));
                    }
                    c.appendChild(this._popSec('其余强化'));
                    for (const d of META_UPGRADES) {
                        if (d.id === def.id) {
                            continue;
                        }
                        const dlv = gm.upgradeLevel(d.id);
                        c.appendChild(this._popAttr({
                            icon: this._metaIc(d.id),
                            text: `${d.name} **LV.${dlv}**（${dlv > 0 ? d.desc(dlv) : '尚未强化'}）`
                        }));
                    }
                },
                cost: maxed ? undefined : [{ icon: '🪙', have: gm.gold, need: cost }],
                ctas: [{
                    label: maxed ? '已 满 级' : `🪙 ${cost.toLocaleString()} · 强 化`,
                    kind: 'gold',
                    disabled: maxed || !can,
                    onDisabled: () => this._toast(maxed ? '该强化已满级' : `金币不足 · 还差 🪙 ${(cost - gm.gold).toLocaleString()}`),
                    onClick: () => {
                        SoundFx.unlock();
                        const nextLv = gm.upgradeLevel(def.id) + 1;
                        if (gm.buyUpgrade(def.id)) {
                            SoundFx.play('buy');
                            this._toast(`${def.name} 升至 LV.${nextLv}`);
                            this._refreshBase();
                            this._refreshTop();
                            this._popRebuild(opt());
                        } else {
                            this._toast('强化失败 · 检查金币');
                        }
                    }
                }],
                note: '局外强化全局生效 · 与英雄、装备加成叠乘'
            };
        };
        this._openPop(opt());
    }

}
