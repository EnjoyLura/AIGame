import { _decorator, Component, SpriteFrame, sys } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES, BUILDINGS } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { ShopData, ShopItem, ShopQuota } from '../core/ShopData';
import type { ResourceId } from '../core/PlayerResources';
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
import type { PopOpts } from './HomeUiCore';

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

    /** 招募主卡（自英雄页上浮到商店页顶部） */
    protected _rcardEl: HTMLDivElement | null = null;


    // ---- 招募主卡分发（招募弹窗与结果揭示实现在链下游 HomeUiHeroes，此处声明入口） ----
    protected abstract _openRecruitModal(): void;
    protected abstract _openRecruitResultModal(results: RecruitResult[]): void;


    protected _buildMallPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.mall = page;

        // 招募主卡：保底进度 + 概率详情入口 + 单抽/十连/广告免费抽直达（抽卡结果走 L4 全屏结果层）
        const rcard = document.createElement('div');
        rcard.className = 'rcard panel frame';
        rcard.innerHTML = `<div class="rcLeft"><div class="rcTitle">🎖️ 英雄招募</div>` +
            `<div class="rcPity"><div class="rcBar"><i></i></div><span class="rcPityTxt"></span></div>` +
            `<button class="rcDetail">概率详情 ›</button></div>` +
            `<div class="rcActs"><button class="btn gold sm rcOne"></button>` +
            `<button class="btn blue sm rcTen"></button><button class="btn adBtn sm rcAd"></button></div>`;
        (rcard.querySelector('.rcDetail') as HTMLButtonElement).onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openRecruitModal();
        };
        const doPull = (count: 1 | 10, free = false) => {
            const cost = count === 10 ? RECRUIT_PRICE_10 : RECRUIT_PRICE_1;
            const diamNow = GameManager.instance.res.get('diamond');
            if (!free && diamNow < cost) {
                SoundFx.play('ui');
                this._toast(`钻石不足：还差 💎${(cost - diamNow).toLocaleString()}`);
                return;
            }
            const got = RecruitSystem.instance.recruit(count, free);
            if (!got) {
                SoundFx.play('ui');
                this._toast('钻石不足');
                return;
            }
            SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
            this._refreshTop();
            this._refreshMall();
            this._openRecruitResultModal(got);
        };
        (rcard.querySelector('.rcOne') as HTMLButtonElement).onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            doPull(1);
        };
        (rcard.querySelector('.rcTen') as HTMLButtonElement).onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            doPull(10);
        };
        (rcard.querySelector('.rcAd') as HTMLButtonElement).onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            AdService.instance.claimReward('recruit', () => doPull(1, true));
        };
        page.appendChild(rcard);
        this._rcardEl = rcard;

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
        // 招募主卡：保底进度 + 直达按钮文案态
        const rcard = this._rcardEl;
        if (rcard) {
            const rs = RecruitSystem.instance;
            const bar = rcard.querySelector('.rcBar i') as HTMLElement | null;
            if (bar) {
                bar.style.width = `${Math.round((RECRUIT_PITY - rs.pityLeft) / RECRUIT_PITY * 100)}%`;
            }
            const pityTxt = rcard.querySelector('.rcPityTxt') as HTMLElement | null;
            if (pityTxt) {
                pityTxt.textContent = `已招募 ${rs.totalRecruits} 次 · 距保底 ${rs.pityLeft} 抽`;
            }
            const one = rcard.querySelector('.rcOne') as HTMLButtonElement | null;
            if (one) {
                one.textContent = `单抽 💎${RECRUIT_PRICE_1}`;
            }
            const ten = rcard.querySelector('.rcTen') as HTMLButtonElement | null;
            if (ten) {
                ten.textContent = `十连 💎${RECRUIT_PRICE_10}`;
            }
            const ad = rcard.querySelector('.rcAd') as HTMLButtonElement | null;
            if (ad) {
                const adLeft = AdService.instance.remaining('recruit');
                ad.textContent = adLeft > 0 ? `▶ 广告免费抽 ${adLeft}/1` : '今日已免费抽';
                ad.disabled = adLeft <= 0;
                ad.style.opacity = ad.disabled ? '0.45' : '1';
            }
        }
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
        const mkGood = (opt: { ic: string; name: string; tag: string; price: string; r: number; hot?: boolean; disabled?: boolean; onTap: () => void; onBlocked?: () => void }) => {
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
            // 保持可点：HTML disabled 会吞掉 click，缺口说明就走不到了，故只做视觉置灰
            buy.className = 'btn gold gBuy' + (opt.disabled ? ' off' : '');
            buy.textContent = opt.price;
            buy.style.opacity = opt.disabled ? '0.45' : '1';
            buy.onclick = (e) => {
                e.stopPropagation();
                if (opt.disabled) {
                    // 禁用不是死键：差什么就说清（缺口拦截 / 差额说明）
                    opt.onBlocked?.();
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
                const poor = !owned && gm.gold < price;
                mkGood({
                    ic: '🎖️', name: def.name, tag: `${def.role} · ${this._heroWeaponName(def.id)}`,
                    price: owned ? '已拥有' : `🪙 ${price.toLocaleString()}`,
                    r: price >= 2000 ? 5 : 4, disabled: owned || poor,
                    onBlocked: () => {
                        if (owned) {
                            this._toast('该英雄已拥有');
                        } else {
                            this._openResGate('gold', price, def.name);
                        }
                    },
                    onTap: () => this._confirmSpend({
                        name: def.name,
                        desc: `解锁英雄 · ${def.role} · ${this._heroWeaponName(def.id)}`,
                        res: 'gold', need: price, okLabel: '确 认 解 锁',
                        onOk: () => {
                            if (gm.unlockHero(def.id)) {
                                SoundFx.play('buy');
                                this._toast(`${def.name} 解锁成功！`);
                            } else {
                                SoundFx.play('ui');
                                this._toast('金币不足 · 未能解锁');
                            }
                        }
                    }),
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
                        onBlocked: () => this._openResGate('gold', def.baseCost, def.name),
                        onTap: () => this._confirmSpend({
                            name: def.name,
                            desc: `装备入包 · ${EQUIP_SLOT_NAMES[slot]} · ${EQUIP_TIER_NAMES[def.tier - 1]} · ${parts.join(' ')}`,
                            res: 'gold', need: def.baseCost, okLabel: '确 认 购 买',
                            onOk: () => {
                                if (hs.buyEquipToBag(def.id)) {
                                    SoundFx.play('buy');
                                    this._toast(`${def.name} 已放入背包`);
                                } else {
                                    SoundFx.play('ui');
                                }
                            }
                        }),
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
                    onBlocked: () => this._openResGate('gold', core.baseCost, core.name),
                    onTap: () => this._confirmSpend({
                        name: core.name,
                        desc: `武器核心 · ${core.desc}`,
                        res: 'gold', need: core.baseCost, okLabel: '确 认 购 买',
                        onOk: () => {
                            // 买核心入背包口径：直接挂到当前选中英雄（若未嵌）
                            const heroId = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length].id;
                            if (hs.buyCore(heroId, core.id)) {
                                SoundFx.play('buy');
                                this._toast(`${core.name} 已嵌入 ${HERO_DEFS.find(d => d.id === heroId)?.name ?? ''}`);
                            } else {
                                SoundFx.play('ui');
                                this._toast('该英雄已有核心，先到英雄页拆除');
                            }
                        }
                    }),
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
                    onTap: () => this._tapBuy(item, () => this._buyMaterialItem(item)),
                    onBlocked: () => {
                        if (!gm.res.canSpend(item.price.res, item.price.amount)) {
                            this._openResGate(item.price.res, item.price.amount, item.name);
                        } else {
                            this._toast('今日限购已用完 · 隔日重置');
                        }
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
                    onTap: () => this._tapBuy(item, () => this._buyShopItem(item)),
                    onBlocked: () => {
                        if (!gm.res.canSpend(item.price.res, item.price.amount)) {
                            this._openResGate(item.price.res, item.price.amount, item.name);
                        } else if (item.grant.res === 'stamina' && gm.stamina() >= gm.staminaMax()) {
                            this._toast('体力已满 · 先消耗再购买');
                        } else {
                            this._toast('今日购买次数已用完 · 隔日重置');
                        }
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


    /**
     * 大额购买确认（S 型双按钮 · 与钻石购买同模板）：
     * 英雄/装备/核心单价从数百到数千金币，误触一次代价明显，故与钻石付款共用同一确认口径。
     * 确认后由调用方 `onOk` 自行结算；取消走 `_popBack`，不产生任何副作用。
     */
    protected _confirmSpend(o: {
        name: string;
        desc: string;
        res: 'gold' | 'diamond';
        need: number;
        okLabel?: string;
        onOk: () => void;
    }): void {
        const gm = GameManager.instance;
        const isGem = o.res === 'diamond';
        this._popConfirm({
            title: '购买确认',
            icon: isGem ? '💎' : '🛒',
            desc: `${o.name} · ${o.desc}`,
            cost: [{ icon: isGem ? '💎' : '🪙', have: gm.res.get(o.res), need: o.need }],
            ok: o.okLabel ?? '确 认 购 买',
            cancel: '再 想 想',
            note: isGem ? '钻石为贵重资源 · 购买后不可退回'
                : `确认后扣除 ${o.need.toLocaleString()} 金币 · 关卡结算可持续回收`,
            onOk: () => {
                this._popBack();
                o.onOk();
                this._refreshMall();
            }
        });
    }


    /**
     * 购买入口分发（UX 3-D 危险操作）：钻石贵重资源付款走 S 型确认，
     * 金币材料/道具保持即点即得（廉价高频，多一层确认只会变钝）。
     */
    protected _tapBuy(item: ShopItem, buy: () => void): void {
        if (item.price.res !== 'diamond') {
            buy();
            this._refreshMall();
            return;
        }
        this._confirmSpend({
            name: item.name,
            desc: item.desc,
            res: 'diamond',
            need: item.price.amount,
            onOk: buy
        });
    }


    /** 资源不足拦截（3-C 母版 · 资源变体）：给差额与两条出路（再等等 / 前往获取） */
    protected _openResGate(res: string, need: number, itemName: string): void {
        const gm = GameManager.instance;
        const META: Record<string, { icon: string; name: string; from: string }> = {
            diamond: { icon: '💎', name: '钻石', from: '礼包与关卡结算都会产出钻石' },
            gold: { icon: '🪙', name: '金币', from: '通关结算与资源副本是金币主产线' },
            stamina: { icon: '🍖', name: '体力', from: `体力每 ${BattleConfig.STAMINA_REGEN_MINUTES} 分钟自然恢复 1 点` }
        };
        const m = META[res] ?? { icon: '📦', name: res, from: '推进主线可获得' };
        const have = gm.res.get(res as ResourceId);
        this._popIntercept({
            title: `${m.name}不足`,
            icon: m.icon,
            rows: [
                { icon: '🛒', text: `「${itemName}」需要 **${need}** ${m.name}` },
                { icon: m.icon, text: `当前持有 **${have.toLocaleString()}** · 还差 **${Math.max(0, need - have).toLocaleString()}**` }
            ],
            ok: {
                label: '前 往 获 取',
                kind: 'gold',
                onClick: () => {
                    this._closePop();
                    if (res === 'diamond') {
                        this._openGiftModal();
                    } else if (res === 'stamina') {
                        this._openStaminaModal();
                    } else {
                        this._switchPage('battle');
                    }
                }
            },
            stayLabel: '再 等 等',
            note: m.from
        });
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

    /**
     * 礼包中心（UX 布局稿：L3·M 列表型）：每日免费补给 + 钻石礼包逐行展示，行尾购买/领取，
     * 售罄行置灰；购买后掉落交给 L5 结果演出层翻出。
     */
    protected _openGiftModal(): void {
        const opt = (): PopOpts => {
            return {
                tier: 3,
                size: 'M',
                banner: '🎁 限时礼包中心',
                art: `${GIFT_PACKS.length} 档补给`,
                subtitle: '每日 0 点重置次数 · 免费补给可攒钻石',
                build: c => {
                    for (const def of GIFT_PACKS) {
                        const left = this._giftSvc.remaining(def);
                        const free = def.price.amount <= 0;
                        const soldOut = left <= 0;
                        const tag = free
                            ? 'FREE'
                            : def.originalPrice
                                ? `省${Math.round((1 - def.price.amount / def.originalPrice) * 100)}%`
                                : undefined;
                        c.appendChild(this._popRow({
                            icon: def.ic,
                            title: def.name,
                            tag,
                            lines: [def.entries.map(e => e.label).join(' · '), def.desc],
                            status: `今日剩余 ${left}/${def.dailyLimit}`,
                            statusKind: soldOut ? 'expire' : (free ? 'soon' : undefined),
                            action: {
                                label: soldOut ? '今日已购' : free ? '领 取' : `💎${def.price.amount.toLocaleString()}`,
                                kind: free ? 'green' : 'gold',
                                disabled: soldOut,
                                onClick: () => {
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
                                    this._openGiftResultModal(def, r.drops);
                                }
                            }
                        }));
                    }
                },
                note: '钻石可用每日免费补给攒取 · 次数每日 0 点重置'
            };
        };
        this._openPop(opt());
    }

    /** 礼包购买结果（L5 结果演出层）：获得物逐格翻出（错峰入场）+ 资源合并行 + 收下 */
    protected _openGiftResultModal(def: GiftPackDef, drops: LootDrop[]): void {
        const resParts = def.entries.filter(e => e.kind === 'res').map(e => e.label);
        this._openPop({
            tier: 5,
            size: 'M',
            banner: `🎉 ${def.name}`,
            art: `${drops.length} 项掉落`,
            maskClose: true,
            build: c => {
                c.appendChild(this._popSec('获得以下物品'));
                const row = this._popCardRow(drops.map(d => ({ icon: d.ic, name: d.name })));
                row.querySelectorAll<HTMLElement>('.popCard').forEach((el, i) => {
                    el.style.animationDelay = `${(0.1 + i * 0.15).toFixed(2)}s`;
                    const nameEl = el.children[1] as HTMLElement | undefined;
                    if (nameEl) {
                        nameEl.style.color = lootDropColor(drops[i]);
                    }
                });
                c.appendChild(row);
                if (resParts.length > 0) {
                    c.appendChild(this._popKV('附加资源', `＋ ${resParts.join('　')}`, 'total'));
                }
            },
            ctas: [{ label: '收 下', onClick: () => this._closePop() }],
            note: '已全部入账 · 可在背包与英雄页查看'
        });
    }

}
