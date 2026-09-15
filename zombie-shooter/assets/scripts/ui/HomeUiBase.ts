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

    /** 基地页：基地横幅（繁荣度）+ 建筑地图（节点化布局，点击开详情/升级抽屉）+ 局外强化卡 */
    protected _buildBasePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.base = page;
        // 基地页只承载建筑养成：任务/签到迁玩法页、五大玩法入口迁玩法页，横幅只留等级与繁荣度
        const banner = document.createElement('div');
        banner.className = 'baseBanner panel frame';
        banner.innerHTML = `<div class="bbIc">🏰</div><div><h3>第 7 区 · 方舟基地 <span class="lvtag"></span></h3>` +
            `<div class="pros"></div>` +
            `<div class="prosBar"><i></i></div></div>`;
        page.appendChild(banner);
        this._baseBannerEls = {
            lv: banner.querySelector('.lvtag'),
            pros: banner.querySelector('.pros'),
            bar: banner.querySelector('.prosBar i'),
        };
        // 建筑地图（节点坐标在 _refreshBase 固定摆放）
        const map = document.createElement('div');
        map.className = 'baseMap';
        page.appendChild(map);
        this._baseMapEl = map;
        // 局外强化（META_UPGRADES 卡网格）
        const sec = document.createElement('div');
        sec.className = 'secTitle';
        sec.textContent = '⚒️ 局外强化';
        page.appendChild(sec);
        const meta = document.createElement('div');
        meta.className = 'baseGrid';
        page.appendChild(meta);
        this._baseMetaEl = meta;
        root.appendChild(page);
    }


    protected _baseMapEl: HTMLDivElement | null = null;

    protected _baseMetaEl: HTMLDivElement | null = null;

    protected _baseBannerEls: { lv: HTMLElement | null; pros: HTMLElement | null; bar: HTMLElement | null } | null = null;


    protected _refreshBase(): void {
        const gm = GameManager.instance;
        const map = this._baseMapEl;
        if (!map) {
            return;
        }
        // 横幅：基地等级 = 指挥中心等级；繁荣度 = 建筑等级总和
        const pro = gm.prosperity();
        if (this._baseBannerEls) {
            const { lv, pros, bar } = this._baseBannerEls;
            if (lv) {
                lv.textContent = `基地 LV.${gm.hqLevel()}`;
            }
            if (pros) {
                pros.textContent = `繁荣度 ${pro.cur.toLocaleString()} / ${pro.max.toLocaleString()} · 升级建筑提升繁荣度与全局上限`;
            }
            if (bar) {
                bar.style.width = `${pro.max > 0 ? Math.max(3, Math.round(pro.cur / pro.max * 100)) : 0}%`;
            }
        }
        // 建筑地图节点重绘（养成建筑固定坐标摆放；玩法入口建筑不在此页）
        map.innerHTML = '';
        const POS: Record<string, [number, number]> = {
            camp: [20, 12], lab: [50, 9], armory: [80, 12],
            station: [15, 48], hq: [50, 44], depot: [85, 48],
            workshop: [32, 80], radar: [68, 80],
        };
        for (const b of BUILDINGS) {
            if (b.pureEntry) {
                continue;
            }
            const lv = gm.buildingLevel(b.id);
            const maxed = lv >= b.maxLevel;
            const unlocked = gm.isBuildingUnlocked(b.id);
            const pos = POS[b.id] ?? [50, 50];
            const node = document.createElement('button');
            node.className = 'mapNode panel' + (unlocked ? '' : ' lock');
            node.style.left = `${pos[0]}%`;
            node.style.top = `${pos[1]}%`;
            node.innerHTML = `<span class="mnIc">${b.ic}</span><span class="mnName">${b.name}</span>` +
                `<span class="mnLv">${unlocked ? `LV.${lv}${maxed ? ' · MAX' : ''}` : `🔒 HQ${b.unlockHq} 解锁`}</span>`;
            node.title = unlocked ? `${b.name} · 点击查看详情/升级` : `${b.name} · 指挥中心 LV.${b.unlockHq} 解锁`;
            node.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openBuildingInfoModal(b.id);
            };
            map.appendChild(node);
        }
        // 局外强化卡（真数据 META_UPGRADES：火力/装甲/赏金/演练）
        const meta = this._baseMetaEl;
        if (meta) {
            meta.innerHTML = '';
            for (const def of META_UPGRADES) {
                const lv = gm.upgradeLevel(def.id);
                const maxed = lv >= def.maxLevel;
                const cost = gm.upgradeCost(def.id);
                const card = document.createElement('div');
                card.className = 'bcard panel';
                const ic = document.createElement('div');
                ic.className = 'bIc';
                ic.textContent = def.id === 'atk' ? '⚔️' : def.id === 'vehHp' ? '🛡️' : def.id === 'goldGain' ? '🪙' : '🎯';
                card.appendChild(ic);
                const nm = document.createElement('div');
                nm.className = 'bName';
                nm.innerHTML = `${def.name}<span>LV.${lv}</span>`;
                card.appendChild(nm);
                const ds = document.createElement('div');
                ds.className = 'bDesc';
                ds.textContent = maxed ? def.desc(lv) : def.desc(lv + 1);
                card.appendChild(ds);
                const btn = document.createElement('button');
                btn.className = 'btn gold sm';
                btn.style.width = '100%';
                if (maxed) {
                    btn.textContent = '已满级';
                    btn.disabled = true;
                } else {
                    btn.textContent = `🪙 ${cost.toLocaleString()}`;
                    btn.disabled = !gm.canUpgrade(def.id);
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.unlock();
                        if (gm.buyUpgrade(def.id)) {
                            SoundFx.play('buy');
                            this._refreshBase();
                            this._refreshTop();
                        }
                    };
                }
                btn.style.opacity = btn.disabled ? '0.5' : '1';
                card.appendChild(btn);
                meta.appendChild(card);
            }
        }
        this._applyPendingTex();
    }

}
