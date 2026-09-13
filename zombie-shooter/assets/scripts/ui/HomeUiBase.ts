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

/**
 * 基地页：建筑养成（升级建筑 + 局外强化）+ 建筑详情/载具改装弹窗。
 */
export abstract class HomeUiBase extends HomeUiPlay {


    /** 弹窗：护送编队（对齐原型 sq-slot + cand 网格，真数据 lineup） */
    // ================= 基地建筑详情浮窗 =================

    /** 建筑详情抽屉（L2 sheet）：功能介绍 + 当前/下一级效果 + 升级动作（地图节点点击触发） */
    protected _openBuildingInfoModal(id: string): void {
        const gm = GameManager.instance;
        const b = BUILDINGS.find(x => x.id === id);
        if (!b) {
            return;
        }
        this._openSheet(`${b.ic} ${b.name}`, (box) => {
            box.classList.add('binfoBox');
            const lv = gm.buildingLevel(b.id);
            const maxed = lv >= b.maxLevel;
            const unlocked = gm.isBuildingUnlocked(b.id);
            const hqBlocked = !maxed && unlocked && b.id !== 'hq' && lv + 1 > gm.hqLevel() + 1;

            // 功能介绍
            if (b.intro) {
                const intro = document.createElement('p');
                intro.className = 'biIntro';
                intro.textContent = b.intro;
                box.appendChild(intro);
            }
            // 等级进度
            const lvRow = document.createElement('div');
            lvRow.className = 'biLvRow';
            lvRow.innerHTML = `<span>当前等级</span><b>LV.${lv} / ${b.maxLevel}</b>`;
            box.appendChild(lvRow);
            const bar = document.createElement('div');
            bar.className = 'biBar';
            const fill = document.createElement('i');
            fill.style.width = `${Math.max(4, Math.round(lv / b.maxLevel * 100))}%`;
            bar.appendChild(fill);
            box.appendChild(bar);
            // 当前效果 / 下一级
            const curRow = document.createElement('div');
            curRow.className = 'biEff';
            curRow.innerHTML = `<em>当前效果</em><span>${lv > 0 ? b.desc(lv) : '尚未生效 · 升级后获得加成'}</span>`;
            box.appendChild(curRow);
            if (!maxed) {
                const nextRow = document.createElement('div');
                nextRow.className = 'biEff next';
                nextRow.innerHTML = `<em>升到 LV.${lv + 1}</em><span>${b.desc(lv + 1)}</span>`;
                box.appendChild(nextRow);
                // 升级状态提示
                const stRow = document.createElement('div');
                stRow.className = 'biStatus';
                const cost = gm.buildingCost(b.id);
                if (!unlocked) {
                    stRow.textContent = `🔒 需指挥中心 LV.${b.unlockHq} 解锁（当前 LV.${gm.hqLevel()}）`;
                } else if (hqBlocked) {
                    stRow.textContent = `🔒 受指挥中心上限约束（上限 LV.${gm.hqLevel() + 1}），先升级指挥中心`;
                } else {
                    stRow.textContent = `升级费用：🪙 ${cost.toLocaleString()}${gm.gold < cost ? '（金币不足）' : ''}`;
                }
                box.appendChild(stRow);
            } else {
                const stRow = document.createElement('div');
                stRow.className = 'biStatus';
                stRow.textContent = '✅ 已达满级';
                box.appendChild(stRow);
            }
            // 升级动作（可升级时直达；载具工坊附改装入口）
            if (b.id === 'workshop' && unlocked) {
                const tuneBtn = document.createElement('button');
                tuneBtn.className = 'btn blue big';
                tuneBtn.style.marginBottom = 'calc(10px * var(--hs,1))';
                tuneBtn.textContent = '🔧 载具改装';
                tuneBtn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    box.closest('.protoMask')?.remove();
                    this._openTuningModal();
                };
                box.appendChild(tuneBtn);
            }
            const act = document.createElement('button');
            act.className = 'btn gold big biOk';
            if (!unlocked) {
                act.textContent = `🔒 指挥中心 LV.${b.unlockHq} 解锁`;
                act.disabled = true;
            } else if (maxed) {
                act.textContent = '已满级';
                act.disabled = true;
            } else if (hqBlocked) {
                act.textContent = '🔒 先升级指挥中心';
                act.disabled = true;
            } else {
                const cost = gm.buildingCost(b.id);
                act.textContent = `🪙 ${cost.toLocaleString()} · 升 级`;
                act.disabled = !gm.canUpgradeBuilding(b.id);
                act.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const nextLv = gm.buildingLevel(b.id) + 1;
                    if (gm.upgradeBuilding(b.id)) {
                        SoundFx.play('buy');
                        this._toast(`${b.name} 升至 LV.${nextLv}`);
                        this._refreshBase();
                        this._refreshTop();
                        // 就地重开抽屉同步等级与费用
                        box.closest('.protoMask')?.remove();
                        this._openBuildingInfoModal(b.id);
                    }
                };
            }
            act.style.opacity = act.disabled ? '0.5' : '1';
            box.appendChild(act);
        });
    }


    /** 载具改装弹窗：四槽独立升级（装甲板/撞角/工具箱/弹药架），等级上限=载具工坊建筑等级 */
    protected _openTuningModal(): void {
        const vt = VehicleTuningSystem.instance;
        this._openModal('🔧 载具改装', (box) => {
            box.classList.add('tuneBox');
            const render = () => {
                // 就地重绘：只换内容区（.tuneList），不重建弹窗（编队弹窗同款模式）
                box.querySelector('.tuneList')?.remove();
                const list = document.createElement('div');
                list.className = 'tuneList';
                const sub = document.createElement('p');
                sub.className = 'mSub';
                sub.innerHTML = `改装上限 = 载具工坊等级（当前 <b class="goldT">LV.${vt.capOf()}</b>）· 🔧 改装图纸余量 <b class="goldT">${vt.blueprintCount}</b>`;
                list.appendChild(sub);
                for (const def of TUNE_SLOTS) {
                    const lv = vt.level(def.id);
                    const maxed = lv >= TUNE_MAX_LEVEL;
                    const gate = vt.canUpgrade(def.id);
                    const row = document.createElement('div');
                    row.className = 'mRow';
                    const cost = vt.nextCosts(def.id);
                    row.innerHTML =
                        `<span>${def.ic} ${def.name} <b class="goldT">LV.${lv}</b>${maxed ? '（满级）' : ''} · ${lv > 0 ? def.desc(lv) : '尚未改装'}</span>` +
                        (maxed ? '' : `<span class="matNeed">升 LV.${lv + 1}：${def.desc(lv + 1).split('（')[0]} · 🔧 ×${cost.blueprint}（余 ${vt.blueprintCount}）· 🪙 ${cost.gold.toLocaleString()}</span>`);
                    const btn = document.createElement('button');
                    btn.className = 'btn gold sm';
                    if (maxed) {
                        btn.textContent = '已满级';
                        btn.disabled = true;
                    } else if (!gate.ok) {
                        btn.textContent = '改 装';
                        btn.disabled = true;
                        btn.title = gate.reason;
                    } else {
                        btn.textContent = '改 装';
                        btn.onclick = () => {
                            if (vt.upgrade(def.id)) {
                                SoundFx.play('buy');
                                this._toast(`${def.name} 升至 LV.${lv + 1}`);
                                render();
                                this._refreshBase();
                                this._refreshTop();
                            } else {
                                this._toast('材料不足');
                            }
                        };
                    }
                    row.appendChild(btn);
                    list.appendChild(row);
                }
                box.appendChild(list);
            };
            render();
        });
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
