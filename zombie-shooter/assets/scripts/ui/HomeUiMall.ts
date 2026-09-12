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
import { MALL_AD_STAMINA, SLOT_EMOJI } from './HomeUiCore';
import { HomeUiCore } from './HomeUiCore';

/**
 * 商店页：礼包 banner + 四页签商品网格 + 广告补给卡 + 礼包弹窗。
 */
export abstract class HomeUiMall extends HomeUiCore {
    /** 商城页 */
    protected _mallResEls: Partial<Record<'gold' | 'diamond' | 'stamina', HTMLDivElement>> = {};

    protected _mallTabsEl: HTMLDivElement | null = null;

    protected _mallGridEl: HTMLDivElement | null = null;

    protected _mallTab: 'hero' | 'equip' | 'gem' | 'mat' | 'ad' = 'hero';

    /** 商城页广告补给按钮（领取后刷新文案） */
    protected _mallAdBtn: HTMLButtonElement | null = null;

    /** 礼包服务（每日限购持久化） */
    protected _giftSvc = new GiftService();

    /** 商城礼包 banner（红点刷新用） */
    protected _giftBannerEl: HTMLDivElement | null = null;

    protected _mallAdLab: HTMLDivElement | null = null;


    protected _buildMallPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.mall = page;
        page.appendChild(this._mkHeading('补给商店', '每日精选'));

        // 限时礼包 banner（点击打开礼包弹窗）
        const banner = document.createElement('div');
        banner.className = 'shopBanner frame';
        banner.innerHTML = `<div class="sbTxt"><h3>末日启程 · 超值礼包</h3>` +
            `<p>每日免费补给 + 钻石礼包</p>` +
            `<div class="price">🎁 立即查看 <s>限时特惠</s></div></div>` +
            `<div class="sbGift">🎁</div>` +
            `<div class="sbTime giftDot">⏰ 限时特惠</div>`;
        banner.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openGiftModal();
        };
        // 每日免费补给未领时 banner 角标亮红点
        this._refreshGiftDot(banner.querySelector('.giftDot') as HTMLElement);
        // 浅色主题：banner 底图 = escort.png 照片（interface.css：center 45%/cover），左暗渐变由 CSS ::after 完成
        this._tex('scenes/escort', u => {
            banner.style.backgroundImage = u;
            banner.style.backgroundSize = 'cover';
            banner.style.backgroundPosition = 'center 45%';
            banner.style.backgroundRepeat = 'no-repeat';
        });
        page.appendChild(banner);
        this._giftBannerEl = banner;

        // 页签：英雄 / 装备 / 宝石 / 材料
        const tabs = document.createElement('div');
        tabs.className = 'shopTabs';
        page.appendChild(tabs);
        this._mallTabsEl = tabs;

        // 双列商品网格（含广告补给卡，置底）
        const grid = document.createElement('div');
        grid.className = 'shopGrid';
        page.appendChild(grid);
        this._mallGridEl = grid;

        root.appendChild(page);
    }


    protected _setMallTab(tab: 'hero' | 'equip' | 'gem' | 'mat'): void {
        this._mallTab = tab;
        this._refreshMall();
    }


    /** 商店页刷新：页签高亮 + 商品网格重绘（真数据：英雄解锁/装备部件/强化材料占位/广告） */
    protected _refreshMall(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const tabs = this._mallTabsEl;
        const grid = this._mallGridEl;
        if (!tabs || !grid) {
            return;
        }
        // 顶栏资源（mall 页与全局顶栏共用数据）
        this._refreshTop();
        const TABS: Array<['hero' | 'equip' | 'gem' | 'mat', string]> = [
            ['hero', '🦸 英雄'], ['equip', '🛡️ 装备'], ['gem', '💎 宝石'], ['mat', '⚙️ 材料'],
        ];
        tabs.innerHTML = '';
        for (const [key, label] of TABS) {
            const b = document.createElement('button');
            b.className = this._mallTab === key ? 'on' : '';
            b.textContent = label;
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._setMallTab(key);
            };
            tabs.appendChild(b);
        }

        grid.innerHTML = '';
        const mkGood = (opt: { ic: string; name: string; tag: string; price: string; r: number; hot?: boolean; disabled?: boolean; onTap: () => void }) => {
            const card = document.createElement('div');
            card.className = `good panel r${opt.r}`;
            if (opt.hot) {
                const hot = document.createElement('span');
                hot.className = 'gHot';
                hot.textContent = 'HOT';
                card.appendChild(hot);
            }
            const ic = document.createElement('div');
            ic.className = 'gIc';
            ic.textContent = opt.ic;
            card.appendChild(ic);
            const name = document.createElement('div');
            name.className = 'gName';
            name.textContent = opt.name;
            card.appendChild(name);
            const tag = document.createElement('div');
            tag.className = 'gTag';
            tag.textContent = opt.tag;
            card.appendChild(tag);
            const buy = document.createElement('button');
            buy.className = 'btn gold gBuy';
            buy.textContent = opt.price;
            buy.disabled = !!opt.disabled;
            buy.style.opacity = opt.disabled ? '0.45' : '1';
            buy.onclick = (e) => {
                e.stopPropagation();
                if (opt.disabled) {
                    return;
                }
                SoundFx.unlock();
                opt.onTap();
            };
            card.appendChild(buy);
            grid.appendChild(card);
        };

        if (this._mallTab === 'hero') {
            for (const def of HERO_DEFS) {
                const price = HeroSystem.HERO_PRICES[def.id];
                if (!price) {
                    continue;
                }
                const owned = gm.isHeroOwned(def.id);
                mkGood({
                    ic: '🎖️', name: def.name, tag: `${def.role} · ${this._heroWeaponName(def.id)}`,
                    price: owned ? '已拥有' : `🪙 ${price.toLocaleString()}`,
                    r: price >= 2000 ? 5 : 4, disabled: owned,
                    onTap: () => {
                        if (gm.unlockHero(def.id)) {
                            SoundFx.play('buy');
                            this._toast(`${def.name} 解锁成功！`);
                        } else {
                            SoundFx.play('ui');
                        }
                        this._refreshMall();
                    },
                });
            }
        } else if (this._mallTab === 'equip') {
            for (const slot of EQUIP_SLOTS) {
                for (const def of EQUIPMENT_DEFS.filter(e => e.slot === slot)) {
                    const parts: string[] = [];
                    if (def.atkPct) {
                        parts.push(`攻+${Math.round(def.atkPct * 100)}%`);
                    }
                    if (def.ratePct) {
                        parts.push(`速+${Math.round(def.ratePct * 100)}%`);
                    }
                    if (def.rangePct) {
                        parts.push(`程+${Math.round(def.rangePct * 100)}%`);
                    }
                    mkGood({
                        ic: SLOT_EMOJI[slot], name: def.name,
                        tag: `${EQUIP_SLOT_NAMES[slot]} · ${EQUIP_TIER_NAMES[def.tier - 1]} · ${parts.join(' ')}`,
                        price: `🪙 ${def.baseCost.toLocaleString()}`,
                        r: tierRank(def.tier),
                        hot: def.tier >= 4,
                        disabled: gm.gold < def.baseCost,
                        onTap: () => {
                            if (hs.buyEquipToBag(def.id)) {
                                SoundFx.play('buy');
                                this._toast(`${def.name} 已放入背包`);
                            } else {
                                SoundFx.play('ui');
                            }
                            this._refreshMall();
                        },
                    });
                }
            }
        } else if (this._mallTab === 'gem') {
            // 宝石页签 = 武器核心（六种核心即"宝石"，对应核心嵌入玩法）
            for (const core of WEAPON_CORE_DEFS) {
                mkGood({
                    ic: '💠', name: core.name, tag: core.desc,
                    price: `🪙 ${core.baseCost.toLocaleString()}`,
                    r: tierRank(core.tier === 1 ? 3 : core.tier === 2 ? 5 : 4),
                    disabled: gm.gold < core.baseCost,
                    onTap: () => {
                        // 买核心入背包口径：直接挂到当前选中英雄（若未嵌）
                        const heroId = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length].id;
                        if (hs.buyCore(heroId, core.id)) {
                            SoundFx.play('buy');
                            this._toast(`${core.name} 已嵌入 ${HERO_DEFS.find(d => d.id === heroId)?.name ?? ''}`);
                        } else {
                            SoundFx.play('ui');
                            this._toast('该英雄已有核心，先到英雄页拆除');
                        }
                        this._refreshMall();
                    },
                });
            }
        } else {
            // 材料页签 = 材料货柜（每日限量）+ 商城道具（ShopData）+ 体力广告卡
            const MAT_IC: Record<string, string> = { mat_stone: '🧱', mat_alloy: '🔩', mat_core: '⚙️', gem_fire: '🔴', gem_wind: '🟢', gem_ice: '🔵', gem_thunder: '🟡' };
            for (const item of ShopData.MATERIALS) {
                const left = ShopQuota.remaining(item);
                const soldOut = left <= 0;
                mkGood({
                    ic: item.grantMisc ? (item.pickRandom ? '💠' : (MAT_IC[item.grantMisc[0].id] ?? '📦')) : '📦',
                    name: item.name, tag: item.desc,
                    price: `${item.price.res === 'gold' ? '🪙' : '💎'} ${item.price.amount.toLocaleString()}`,
                    r: 3,
                    disabled: soldOut || !gm.res.canSpend(item.price.res, item.price.amount),
                    onTap: () => {
                        this._buyMaterialItem(item);
                        this._refreshMall();
                    },
                });
            }
            for (const item of ShopData.ITEMS) {
                const RES_NAME = { gold: '🪙', diamond: '💎', stamina: '🍖' } as const;
                mkGood({
                    ic: item.grant.res === 'stamina' ? '🍖' : item.grant.res === 'gold' ? '🪙' : '💎',
                    name: item.name, tag: item.desc,
                    price: `${RES_NAME[item.price.res]} ${item.price.amount.toLocaleString()}`,
                    r: 3,
                    disabled: !gm.res.canSpend(item.price.res, item.price.amount)
                        || (item.grant.res === 'stamina' && gm.stamina() >= gm.staminaMax())
                        || (!!item.canBuy && !item.canBuy()),
                    onTap: () => {
                        this._buyShopItem(item);
                        this._refreshMall();
                    },
                });
            }
            // 广告补给卡
            const adCard = document.createElement('div');
            adCard.className = 'good panel adCard';
            const adIc = document.createElement('div');
            adIc.className = 'gIc';
            adIc.textContent = '📺';
            adCard.appendChild(adIc);
            const adName = document.createElement('div');
            adName.className = 'gName';
            adName.textContent = '广告补给';
            adCard.appendChild(adName);
            const adTag = document.createElement('div');
            adTag.className = 'gTag';
            const left = AdService.instance.remaining('stamina');
            adTag.textContent = left > 0 ? `今日剩余 ${left}/3 次` : '今日已用完';
            adCard.appendChild(adTag);
            const adBtn = document.createElement('button');
            adBtn.className = 'btn adBtn gBuy';
            adBtn.textContent = '▶ 领体力';
            const full = gm.stamina() >= gm.staminaMax();
            adBtn.disabled = left <= 0 || full;
            adBtn.style.opacity = adBtn.disabled ? '0.45' : '1';
            adBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                AdService.instance.claimReward('stamina', () => {
                    gm.res.add('stamina', MALL_AD_STAMINA);
                    SoundFx.play('coin');
                });
            };
            this._mallAdBtn = adBtn;
            adCard.appendChild(adBtn);
            grid.appendChild(adCard);
        }
        this._applyPendingTex();
    }


    protected _buyShopItem(item: ShopItem): void {
        const gm = GameManager.instance;
        if (!gm.res.spend(item.price.res, item.price.amount)) {
            SoundFx.play('ui');
            return;
        }
        gm.res.add(item.grant.res, item.grant.amount);
        gm.save();
        SoundFx.play('buy');
        this._toast(`购买成功：${item.name}`);
    }


    /** 材料货柜购买：扣费 → 随机/全量发材料 → 计当日次数 */
    protected _buyMaterialItem(item: ShopItem): void {
        const gm = GameManager.instance;
        if (!item.grantMisc || !gm.res.spend(item.price.res, item.price.amount)) {
            SoundFx.play('ui');
            return;
        }
        const drops = item.pickRandom
            ? [item.grantMisc[Math.floor(Math.random() * item.grantMisc.length)]]
            : item.grantMisc;
        for (const m of drops) {
            gm.misc[m.id] = (gm.misc[m.id] ?? 0) + m.n;
        }
        ShopQuota.consume(item);
        gm.save();
        SoundFx.play('buy');
        const names: string[] = [];
        for (const d of drops) {
            const md = miscDef(d.id);
            names.push(`${md ? md.ic : '📦'}${md ? md.name : d.id}×${d.n}`);
        }
        this._toast(`购买成功：${names.join(' ')}`);
    }


    // ================= 礼包系统 =================

    /** 免费补给未领 → banner 角标加红点；已领恢复常态 */
    protected _refreshGiftDot(el: HTMLElement | null): void {
        if (!el) {
            return;
        }
        const freeDef = GIFT_PACKS.find(g => g.id === 'gift_free');
        el.classList.toggle('dotOn', !!freeDef && !this._giftSvc.hasBoughtToday(freeDef));
    }


    /** 礼包中心弹窗：每日免费补给 + 钻石礼包，购买后掉落以结算样式翻出 */
    protected _openGiftModal(): void {
        const gm = GameManager.instance;
        this._openModal('🎁 限时礼包中心', (box) => {
            box.classList.add('giftBox');
            const list = document.createElement('div');
            list.className = 'giftList';
            for (const def of GIFT_PACKS) {
                const left = this._giftSvc.remaining(def);
                const free = def.price.amount <= 0;
                const card = document.createElement('div');
                card.className = `giftCard panel r${tierRank(def.tier)}`;
                if (free && left >= def.dailyLimit) {
                    card.classList.add('done');
                }
                // 角标：FREE / 划线原价
                if (free) {
                    const tag = document.createElement('span');
                    tag.className = 'gTagTop free';
                    tag.textContent = 'FREE';
                    card.appendChild(tag);
                } else if (def.originalPrice) {
                    const tag = document.createElement('span');
                    tag.className = 'gTagTop sale';
                    tag.textContent = `省${Math.round((1 - def.price.amount / def.originalPrice) * 100)}%`;
                    card.appendChild(tag);
                }
                const ic = document.createElement('div');
                ic.className = 'giftIc';
                ic.textContent = def.ic;
                card.appendChild(ic);
                const info = document.createElement('div');
                info.className = 'giftInfo';
                const name = document.createElement('b');
                name.textContent = def.name;
                info.appendChild(name);
                const desc = document.createElement('p');
                desc.textContent = def.desc;
                info.appendChild(desc);
                const entries = document.createElement('div');
                entries.className = 'giftEntries';
                entries.textContent = def.entries.map(e => e.label).join(' · ');
                info.appendChild(entries);
                card.appendChild(info);
                const side = document.createElement('div');
                side.className = 'giftSide';
                const price = document.createElement('div');
                price.className = 'giftPrice';
                price.innerHTML = free
                    ? '<em>免费</em>'
                    : `💎 ${def.price.amount.toLocaleString()}${def.originalPrice ? ` <s>💎${def.originalPrice.toLocaleString()}</s>` : ''}`;
                side.appendChild(price);
                const buy = document.createElement('button');
                buy.className = `btn ${free ? 'adBtn' : 'gold'}`;
                const soldOut = left <= 0;
                buy.textContent = soldOut ? '今日已购' : free ? '领 取' : '购 买';
                buy.disabled = soldOut;
                buy.style.opacity = soldOut ? '0.45' : '1';
                buy.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const r = this._giftSvc.buy(def);
                    if (!r.ok) {
                        SoundFx.play('ui');
                        this._toast(r.reason ?? '购买失败');
                        return;
                    }
                    SoundFx.play(r.drops.some(d => d.tier >= 5) ? 'buy' : 'coin');
                    this._toast(free ? '每日补给已到账！' : `${def.name} 购买成功！`);
                    this._refreshTop();
                    this._refreshMall();
                    this._refreshGiftDot(this._giftBannerEl?.querySelector('.giftDot') as HTMLElement | null);
                    // 翻牌式展示获得物
                    this._openGiftResultModal(def, r.drops);
                };
                side.appendChild(buy);
                const quota = document.createElement('div');
                quota.className = 'giftQuota';
                quota.textContent = `今日剩余 ${left}/${def.dailyLimit}`;
                side.appendChild(quota);
                card.appendChild(side);
                list.appendChild(card);
            }
            box.appendChild(list);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '钻石可用每日免费补给攒取 · 次数每日 0 点重置';
            box.appendChild(note);
        });
    }


    /** 礼包购买结果：获得物翻牌展示（复用结算掉落视觉） */
    protected _openGiftResultModal(def: GiftPackDef, drops: LootDrop[]): void {
        this._openModal(`🎉 ${def.name}`, (box) => {
            box.classList.add('giftBox');
            const head = document.createElement('p');
            head.className = 'giftResHead';
            head.textContent = '获得以下物品：';
            box.appendChild(head);
            const grid = document.createElement('div');
            grid.className = 'giftResGrid';
            drops.forEach((d, i) => {
                const cell = document.createElement('div');
                cell.className = `clDrop r${tierRank(d.tier)}`;
                cell.style.animationDelay = `${(0.1 + i * 0.15).toFixed(2)}s`;
                const ic = document.createElement('span');
                ic.className = 'clDropIc';
                ic.textContent = d.ic;
                const nm = document.createElement('span');
                nm.className = 'clDropNm';
                nm.textContent = d.name;
                nm.style.color = lootDropColor(d);
                cell.appendChild(ic);
                cell.appendChild(nm);
                grid.appendChild(cell);
            });
            // res 类内容（金币/钻石）没有 LootDrop 形态，展示为合并文本
            const resParts: string[] = [];
            for (const e of def.entries) {
                if (e.kind === 'res') {
                    resParts.push(e.label);
                }
            }
            if (resParts.length > 0) {
                const resRow = document.createElement('div');
                resRow.className = 'giftResRow';
                resRow.textContent = `＋ ${resParts.join('　')}`;
                box.appendChild(resRow);
            }
            box.appendChild(grid);
            const ok = document.createElement('button');
            ok.className = 'btn gold giftOkBtn';
            ok.textContent = '收 下';
            ok.onclick = () => {
                SoundFx.play('ui');
                const mask = box.closest('.protoMask');
                mask?.remove();
            };
            box.appendChild(ok);
        });
    }

}
