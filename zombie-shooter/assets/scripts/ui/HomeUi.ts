import { _decorator, Component, SpriteFrame } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { ShopData, ShopItem } from '../core/ShopData';
import { SoundFx } from '../core/SoundFx';
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, EQUIP_UPGRADE_STEP, WEAPON_CORE_DEFS, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot } from '../core/HeroSystem';
import { HERO_DEFS, ABILITY_LEVEL_DMG_BONUS } from '../battle/HeroDef';
import { STAGES, FINAL_STAGE_ID } from '../battle/StageData';

/** 看广告单次发放体力 */
const MALL_AD_STAMINA = 10;

/** 六槽部位图标（复刻稿 emoji 风格） */
const SLOT_EMOJI: Record<EquipSlot, string> = {
    head: '⛑️', body: '🦺', legs: '👖', gloves: '🧤', wrist: '🥊', shoes: '🥾',
};

/**
 * 主城界面（战斗外玩法入口，DOM 渲染）：
 * 底部五格导航（商城/角色/战斗/核心/基地），先实装中央「战斗」页——
 * 章节横幅、难度切换、载具展台、三档通关宝箱、出战按钮、基地强化；
 * 其余四页为建设中占位，逐个迭代。界面显隐由 GameFlow 状态机驱动。
 */
@ccclass('HomeUi')
export class HomeUi extends Component {
    private static _styleInjected = false;

    private _root: HTMLDivElement | null = null;
    private _goldEl: HTMLDivElement | null = null;
    private _bestEl: HTMLDivElement | null = null;
    private _rewardEl: HTMLDivElement | null = null;
    private _chapterEl: HTMLDivElement | null = null;
    private _chapterPrev: HTMLDivElement | null = null;
    private _chapterNext: HTMLDivElement | null = null;
    private _staminaEl: HTMLDivElement | null = null;
    private _rows: Array<{ def: (typeof META_UPGRADES)[number]; lv: HTMLSpanElement; eff: HTMLDivElement; cost: HTMLDivElement; btn: HTMLButtonElement }> = [];
    private _pages: Record<string, HTMLDivElement> = {};
    private _navBtns: Record<string, HTMLButtonElement> = {};
    /** 商城页可刷新元素：资源数值 + 商品购买按钮 + 广告按钮 */
    private _mallResEls: Partial<Record<'gold' | 'diamond' | 'stamina', HTMLDivElement>> = {};
    private _mallShopRows: Array<{ item: ShopItem; btn: HTMLButtonElement }> = [];
    private _mallAdBtn: HTMLButtonElement | null = null;
    private _mallAdLab: HTMLDivElement | null = null;
    /** 商城英雄区容器（每次刷新重绘） */
    private _heroShopBoxEl: HTMLDivElement | null = null;
    /** 商城装备区容器（每次刷新重绘） */
    private _equipShopBoxEl: HTMLDivElement | null = null;
    /** 模拟广告层（AD_START 显示 / AD_END 关闭，倒计时文案） */
    private _adOverlay: HTMLDivElement | null = null;
    private _adCountdown: HTMLDivElement | null = null;
    private _adTimer = 0;
    /** 角色编队页：英雄详情区容器（左右切换选中索引） */
    private _heroDetailBodyEl: HTMLDivElement | null = null;
    private _heroSelIdx = 0;
    /** 核心页（技能升级）：英雄展示容器 + 三技能卡容器 + 选中索引 */
    private _coreBodyEl: HTMLDivElement | null = null;
    private _coreCardsEl: HTMLDivElement | null = null;
    private _coreSelIdx = 0;
    /** 贴图挂起队列：AssetLib 异步就绪后补挂（_refresh 轮询消化） */
    private _pendingTex: Array<{ key: string; apply: (url: string) => void }> = [];

    private _tex(key: string, apply: (url: string) => void): void {
        const url = this._frameUrl(key);
        if (url) {
            apply(url);
            return;
        }
        this._pendingTex.push({ key, apply });
    }

    private _applyPendingTex(): void {
        if (!this._pendingTex.length) {
            return;
        }
        this._pendingTex = this._pendingTex.filter(p => {
            const url = this._frameUrl(p.key);
            if (url) {
                p.apply(url);
                return false;
            }
            return true;
        });
    }

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        this._injectStyle();
        this._build();
        const applyScale = () => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                document.documentElement.style.setProperty('--hs',
                    (canvas.getBoundingClientRect().width / 1080).toFixed(4));
            }
        };
        applyScale();
        window.addEventListener('resize', applyScale);
        eventCenter.on(GameEvent.RES_CHANGED, () => {
            this._refresh();
            this._refreshMall();
            this._refreshHeroes();
        }, this);
        // 流程状态机驱动主城显隐：state==='home' 显示，其余隐藏（替代点击事件里手动切 display）
        eventCenter.on(GameEvent.FLOW_CHANGED, (from: string, to: string) => {
            if (to === 'home') {
                this.show();
            } else {
                this.hide();
            }
        }, this);
        eventCenter.on(GameEvent.HOME_SHOW, () => this.show(), this);
        eventCenter.on(GameEvent.GOLD_EARNED, (amount: number) => {
            if (this._rewardEl) {
                this._rewardEl.textContent = `本次出战收益　${amount} 金币`;
            }
        });
        this.show();
    }

    onDestroy(): void {
        this._root?.remove();
        this._root = null;
    }

    private show(): void {
        if (this._root) {
            this._root.style.display = 'flex';
            this._refresh();
        }
    }

    private hide(): void {
        this._root && (this._root.style.display = 'none');
    }

    private _startBattle(): void {
        if (!this._root) {
            return;
        }
        // 守卫（体力/解锁）与开波统一走流程状态机；失败回滚显示防止黑屏
        if (!GameFlow.instance.startRun()) {
            this._refresh();
            return;
        }
        this.hide();
    }

    /** 横幅左右箭头切关：只在已解锁范围（1 ~ stageCleared+1）内移动 */
    private _switchStage(dir: number): void {
        const gm = GameManager.instance;
        const maxUnlocked = Math.min(FINAL_STAGE_ID, gm.stageCleared + 1);
        const next = Math.min(maxUnlocked, Math.max(1, gm.currentStage + dir));
        if (next !== gm.currentStage) {
            gm.currentStage = next;
            gm.save();
            this._refresh();
        }
    }

    // ================= 商城页 =================

    /** 商城页：资源条 + 商品行 + 看广告领体力区块（购买/发奖走 PlayerResources 唯一入口） */
    private _buildMall(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'page';

        // 资源条：金币/钻石/体力
        const resRow = document.createElement('div');
        resRow.className = 'mallResRow';
        const mkRes = (id: 'gold' | 'diamond' | 'stamina', lab: string) => {
            const chip = document.createElement('div');
            chip.className = 'mallRes';
            const ico = document.createElement('i');
            ico.className = 'mallResIco';
            this._tex(`ui/res_${id}`, u => { ico.style.backgroundImage = u; });
            const val = document.createElement('div');
            val.className = 'mallResVal';
            chip.appendChild(ico);
            chip.appendChild(val);
            resRow.appendChild(chip);
            this._mallResEls[id] = val;
            void lab;
        };
        mkRes('gold', '金币');
        mkRes('diamond', '钻石');
        mkRes('stamina', '体力');
        page.appendChild(resRow);

        // 商品区
        const sec1 = document.createElement('div');
        sec1.className = 'homeSection';
        sec1.textContent = '━ 商 品 ━';
        page.appendChild(sec1);
        for (const item of ShopData.ITEMS) {
            page.appendChild(this._mkShopRow(item));
        }

        // 装备区：全部部件统一列表，购买入背包（角色页穿戴）
        const secE = document.createElement('div');
        secE.className = 'homeSection';
        secE.textContent = '━ 装 备 ━';
        page.appendChild(secE);
        const equipShopBox = document.createElement('div');
        equipShopBox.className = 'heroShopBox';
        page.appendChild(equipShopBox);
        this._equipShopBoxEl = equipShopBox;
        const equipHint = document.createElement('div');
        equipHint.className = 'mallAdHint';
        equipHint.textContent = '购买后入背包，在角色页点击装备槽穿戴';
        page.appendChild(equipHint);

        // 英雄区：未拥有英雄金币买断解锁
        const secH = document.createElement('div');
        secH.className = 'homeSection';
        secH.textContent = '━ 英 雄 ━';
        page.appendChild(secH);
        const heroShopBox = document.createElement('div');
        heroShopBox.className = 'heroShopBox';
        page.appendChild(heroShopBox);
        this._heroShopBoxEl = heroShopBox;

        // 广告区
        const sec2 = document.createElement('div');
        sec2.className = 'homeSection';
        sec2.textContent = '━ 免 费 补 给 ━';
        page.appendChild(sec2);
        const adBtn = document.createElement('button');
        adBtn.className = 'mallAdBtn';
        const adLab = document.createElement('div');
        adLab.className = 'mallAdLab';
        adBtn.appendChild(adLab);
        adBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            AdService.instance.claimReward('stamina', () => {
                GameManager.instance.res.add('stamina', MALL_AD_STAMINA);
                SoundFx.play('coin');
            });
        };
        this._tex('ui/btn_cyan', u => {
            adBtn.style.backgroundImage = u;
            adBtn.style.backgroundSize = '100% 100%';
            adBtn.style.border = 'none';
        });
        this._mallAdBtn = adBtn;
        this._mallAdLab = adLab;
        page.appendChild(adBtn);
        const adHint = document.createElement('div');
        adHint.className = 'mallAdHint';
        adHint.textContent = '观看广告免费领取，每日 3 次';
        page.appendChild(adHint);

        root.appendChild(page);
        this._pages.mall = page;
    }

    /** 单个商品行（样式复用基地强化的行结构） */
    private _mkShopRow(item: ShopItem): HTMLDivElement {
        const row = document.createElement('div');
        row.className = 'upRow';
        const info = document.createElement('div');
        info.className = 'upInfo';
        const name = document.createElement('div');
        name.className = 'upName';
        name.textContent = item.name;
        const eff = document.createElement('div');
        eff.className = 'upEff';
        eff.textContent = item.desc;
        info.appendChild(name);
        info.appendChild(eff);
        const right = document.createElement('div');
        right.className = 'upRight';
        const cost = document.createElement('div');
        cost.className = 'upCost';
        const RES_NAME = { gold: '金币', diamond: '钻石', stamina: '体力' } as const;
        cost.textContent = `${item.price.amount} ${RES_NAME[item.price.res]}`;
        const btn = document.createElement('button');
        btn.className = 'upBtn';
        btn.textContent = '购 买';
        btn.onclick = (e) => {
            e.stopPropagation();
            this._buyShopItem(item);
        };
        this._tex('ui/btn_gold', u => {
            btn.style.backgroundImage = u;
            btn.style.backgroundSize = '100% 100%';
            btn.style.border = 'none';
        });
        right.appendChild(cost);
        right.appendChild(btn);
        row.appendChild(info);
        row.appendChild(right);
        this._mallShopRows.push({ item, btn });
        return row;
    }

    /** 购买商品：余额/条件校验 → 扣费 → 发货 → 音效；失败刷新显示 */
    private _buyShopItem(item: ShopItem): void {
        const gm = GameManager.instance;
        SoundFx.unlock();
        // 特例：体力商品满仓时不可购买
        if (item.grant.res === 'stamina' && gm.stamina() >= BattleConfig.STAMINA_MAX) {
            this._refreshMall();
            return;
        }
        if (item.canBuy && !item.canBuy()) {
            this._refreshMall();
            return;
        }
        if (!gm.res.spend(item.price.res, item.price.amount)) {
            SoundFx.play('ui');
            this._refreshMall();
            return;
        }
        gm.res.add(item.grant.res, item.grant.amount);
        gm.save();
        SoundFx.play('buy');
        this._refreshMall();
    }

    /** 商城英雄区重绘：每英雄一行（立绘+名字+定位+价格/已拥有），解锁即时刷角色页 */
    private _refreshHeroShop(): void {
        const box = this._heroShopBoxEl;
        if (!box) {
            return;
        }
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        box.innerHTML = '';
        for (const def of HERO_DEFS) {
            const price = HeroSystem.HERO_PRICES[def.id];
            const owned = gm.isHeroOwned(def.id);
            if (!price) {
                continue;
            }
            const row = document.createElement('div');
            row.className = 'upRow';
            const avatar = document.createElement('div');
            avatar.className = 'heroAvatar shop';
            this._tex(`characters/hero_${def.id}`, u => { avatar.style.backgroundImage = u; });
            const info = document.createElement('div');
            info.className = 'upInfo';
            const name = document.createElement('div');
            name.className = 'upName';
            name.textContent = def.name;
            const eff = document.createElement('div');
            eff.className = 'upEff';
            eff.textContent = def.role;
            info.appendChild(name);
            info.appendChild(eff);
            const right = document.createElement('div');
            right.className = 'upRight';
            const cost = document.createElement('div');
            cost.className = 'upCost';
            const btn = document.createElement('button');
            btn.className = 'upBtn';
            if (owned) {
                cost.textContent = '已拥有';
                btn.textContent = '已拥有';
                btn.disabled = true;
            } else {
                cost.textContent = `${price} 金币`;
                btn.textContent = '解 锁';
                btn.disabled = gm.gold < price;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this._buyHero(def.id);
                };
            }
            btn.style.opacity = btn.disabled ? '0.45' : '1';
            right.appendChild(cost);
            right.appendChild(btn);
            row.appendChild(avatar);
            row.appendChild(info);
            row.appendChild(right);
            box.appendChild(row);
        }
    }

    /** 商城购买英雄：解锁（GameManager 扣费+落盘），成功后商城与角色页同步刷新 */
    private _buyHero(heroId: string): void {
        const gm = GameManager.instance;
        SoundFx.unlock();
        if (!gm.unlockHero(heroId)) {
            SoundFx.play('ui');
            this._refreshMall();
            return;
        }
        SoundFx.play('buy');
        this._refreshMall();
        this._refreshHeroes();
    }

    /** 商城装备区重绘：全部部件统一列表（按槽位顺序），购买入背包 */
    private _refreshEquipShop(): void {
        const box = this._equipShopBoxEl;
        if (!box) {
            return;
        }
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        box.innerHTML = '';
        for (const slot of EQUIP_SLOTS) {
            for (const def of EQUIPMENT_DEFS.filter(e => e.slot === slot)) {
                const row = document.createElement('div');
                row.className = 'upRow';
                const info = document.createElement('div');
                info.className = 'upInfo';
                const parts: string[] = [];
                if (def.atkPct) {
                    parts.push(`攻击+${Math.round(def.atkPct * 100)}%`);
                }
                if (def.ratePct) {
                    parts.push(`射速+${Math.round(def.ratePct * 100)}%`);
                }
                if (def.rangePct) {
                    parts.push(`射程+${Math.round(def.rangePct * 100)}%`);
                }
                info.innerHTML =
                    `<div class="upName" style="color:${EQUIP_TIER_COLORS[def.tier - 1]}">${def.name}（${EQUIP_SLOT_NAMES[slot]}·${EQUIP_TIER_NAMES[def.tier - 1]}）</div>` +
                    `<div class="upEff">${parts.join(' ')}</div>`;
                const right = document.createElement('div');
                right.className = 'upRight';
                const cost = document.createElement('div');
                cost.className = 'upCost';
                cost.textContent = `${def.baseCost} 金币`;
                const btn = document.createElement('button');
                btn.className = 'upBtn';
                btn.textContent = '购 买';
                btn.disabled = gm.gold < def.baseCost;
                btn.style.opacity = btn.disabled ? '0.45' : '1';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (hs.buyEquipToBag(def.id)) {
                        SoundFx.play('buy');
                    } else {
                        SoundFx.play('ui');
                    }
                    this._refreshMall();
                };
                right.appendChild(cost);
                right.appendChild(btn);
                row.appendChild(info);
                row.appendChild(right);
                box.appendChild(row);
            }
        }
    }

    /** 商城页数值刷新（RES_CHANGED 与切页时调用） */
    private _refreshMall(): void {
        const gm = GameManager.instance;
        const gold = this._mallResEls.gold;
        const diamond = this._mallResEls.diamond;
        const stamina = this._mallResEls.stamina;
        if (gold) {
            gold.textContent = String(gm.gold);
        }
        if (diamond) {
            diamond.textContent = String(gm.res.get('diamond'));
        }
        if (stamina) {
            stamina.textContent = `${gm.stamina()}/${BattleConfig.STAMINA_MAX}`;
        }
        for (const { item, btn } of this._mallShopRows) {
            let disabled = !gm.res.canSpend(item.price.res, item.price.amount);
            if (item.grant.res === 'stamina' && gm.stamina() >= BattleConfig.STAMINA_MAX) {
                disabled = true;
            }
            if (item.canBuy && !item.canBuy()) {
                disabled = true;
            }
            btn.disabled = disabled;
            btn.style.opacity = disabled ? '0.45' : '1';
            btn.title = disabled && item.disabledTip ? item.disabledTip : '';
        }
        this._refreshHeroShop();
        this._refreshEquipShop();
        if (this._mallAdBtn && this._mallAdLab) {
            const left = AdService.instance.remaining('stamina');
            const full = gm.stamina() >= BattleConfig.STAMINA_MAX;
            this._mallAdLab.textContent =
                full ? '体力已满' : left > 0 ? `看广告领 ${MALL_AD_STAMINA} 体力（今日 ${3 - left}/3）` : '今日次数已用完，明日再来';
            this._mallAdBtn.disabled = left <= 0 || full;
            this._mallAdBtn.style.opacity = this._mallAdBtn.disabled ? '0.45' : '1';
        }
    }

    /** 编队弹出面板（战斗页入口）：四槽位 + 可选英雄列表，上阵/下阵即时刷新 */
    private _openLineupPanel(): void {
        if (!this._root || document.querySelector('#homeUi .lineupPanelOverlay')) {
            return;
        }
        const ov = document.createElement('div');
        ov.className = 'lineupPanelOverlay';
        ov.onclick = (e) => {
            e.stopPropagation();
            ov.remove();
        };
        const card = document.createElement('div');
        card.className = 'lineupPanelCard';
        card.onclick = (e) => e.stopPropagation();

        const title = document.createElement('div');
        title.className = 'lineupPanelTitle';
        title.textContent = '出 战 编 队';
        card.appendChild(title);

        // 槽位行 + 候选列表（内容由 refresh 重建）
        const slots = document.createElement('div');
        slots.className = 'lineupRow center';
        const pool = document.createElement('div');
        pool.className = 'lineupPool';
        card.appendChild(slots);
        card.appendChild(pool);

        const tip = document.createElement('div');
        tip.className = 'lineupTip';
        tip.textContent = '点击下方英雄上阵 / 再次点击下阵（最多 4 人，至少 1 人）';
        card.appendChild(tip);

        const close = document.createElement('button');
        close.className = 'heroCardBtn cyan lineupClose';
        close.textContent = '关 闭';
        close.onclick = (e) => {
            e.stopPropagation();
            ov.remove();
        };
        card.appendChild(close);

        ov.appendChild(card);
        this._root.appendChild(ov);
        this._refreshLineupPanel(slots, pool);
    }

    /** 编队面板刷新：槽位与候选英雄重绘 */
    private _refreshLineupPanel(slots: HTMLDivElement, pool: HTMLDivElement): void {
        const gm = GameManager.instance;
        slots.innerHTML = '';
        pool.innerHTML = '';
        // 槽位
        for (let i = 0; i < GameManager.LINEUP_MAX; i++) {
            const slot = document.createElement('div');
            slot.className = 'lineupSlot' + (i < gm.lineup.length ? '' : ' empty');
            const id = gm.lineup[i];
            if (id) {
                this._tex(`characters/hero_${id}`, u => { slot.style.backgroundImage = u; });
                slot.title = '点击下阵';
                slot.onclick = (e) => {
                    e.stopPropagation();
                    if (gm.toggleLineupMember(id)) {
                        SoundFx.play('ui');
                        this._refreshLineupPanel(slots, pool);
                        this._refreshHeroes();
                    }
                };
            } else {
                slot.textContent = '+';
            }
            slots.appendChild(slot);
        }
        // 候选英雄（仅已拥有）
        for (const def of HERO_DEFS) {
            if (!gm.isHeroOwned(def.id)) {
                continue;
            }
            const inLineup = gm.isInLineup(def.id);
            const item = document.createElement('div');
            item.className = 'lineupPoolItem' + (inLineup ? ' active' : '');
            this._tex(`characters/hero_${def.id}`, u => { item.style.backgroundImage = u; });
            const name = document.createElement('div');
            name.className = 'lineupPoolName';
            name.textContent = def.name;
            item.appendChild(name);
            item.title = inLineup ? '点击下阵' : '点击上阵';
            item.onclick = (e) => {
                e.stopPropagation();
                if (gm.toggleLineupMember(def.id)) {
                    SoundFx.play('ui');
                    this._refreshLineupPanel(slots, pool);
                    this._refreshHeroes();
                }
            };
            pool.appendChild(item);
        }
    }

    /** 模拟广告层：AD_START 弹出 3 秒倒计时（真实观感占位），AD_END 关闭 */
    private _buildAdOverlay(root: HTMLDivElement): void {
        const ov = document.createElement('div');
        ov.className = 'adOverlay';
        ov.style.display = 'none';
        const title = document.createElement('div');
        title.className = 'adTitle';
        title.textContent = '📺 广告播放中…';
        const cd = document.createElement('div');
        cd.className = 'adCountdown';
        cd.textContent = '3';
        const tip = document.createElement('div');
        tip.className = 'adTip';
        tip.textContent = '观看完毕后将自动发放奖励';
        ov.appendChild(title);
        ov.appendChild(cd);
        ov.appendChild(tip);
        root.appendChild(ov);
        this._adOverlay = ov;
        this._adCountdown = cd;

        eventCenter.on(GameEvent.AD_START, () => {
            if (!this._adOverlay || !this._adCountdown) {
                return;
            }
            this._adOverlay.style.display = 'flex';
            let n = 3;
            this._adCountdown.textContent = String(n);
            clearInterval(this._adTimer);
            this._adTimer = setInterval(() => {
                n--;
                if (this._adCountdown) {
                    this._adCountdown.textContent = String(Math.max(0, n));
                }
                if (n <= 0) {
                    clearInterval(this._adTimer);
                }
            }, 1000) as unknown as number;
        }, this);
        eventCenter.on(GameEvent.AD_END, () => {
            clearInterval(this._adTimer);
            if (this._adOverlay) {
                this._adOverlay.style.display = 'none';
            }
            this._refreshMall();
        }, this);
    }

    // ================= 角色编队页 =================

    /** 角色页：顶部资源条 + 英雄居中展示（左右箭头切换）+ 右侧六槽装备卡 + 主武器区 */
    private _buildHeroes(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'page';

        // 顶部资源条（与商城页共用同一组元素引用，RES_CHANGED 两页同步刷新）
        const resRow = document.createElement('div');
        resRow.className = 'mallResRow';
        const mkRes = (id: 'gold' | 'diamond' | 'stamina') => {
            const chip = document.createElement('div');
            chip.className = 'mallRes';
            const ico = document.createElement('i');
            ico.className = 'mallResIco';
            this._tex(`ui/res_${id}`, u => { ico.style.backgroundImage = u; });
            const val = document.createElement('div');
            val.className = 'mallResVal';
            chip.appendChild(ico);
            chip.appendChild(val);
            resRow.appendChild(chip);
            this._mallResEls[id] = val;
        };
        mkRes('gold');
        mkRes('diamond');
        mkRes('stamina');
        page.appendChild(resRow);

        // 英雄展示：左右箭头 + 立绘 + 信息 + 按钮 + 装备栏（内容全部由 _refreshHeroes 重建）
        const detail = document.createElement('div');
        detail.className = 'heroDetail';
        const prev = document.createElement('div');
        prev.className = 'heroArrow';
        prev.textContent = '❮';
        prev.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._heroSelIdx = (this._heroSelIdx + HERO_DEFS.length - 1) % HERO_DEFS.length;
            this._refreshHeroes();
        };
        const next = document.createElement('div');
        next.className = 'heroArrow';
        next.textContent = '❯';
        next.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._heroSelIdx = (this._heroSelIdx + 1) % HERO_DEFS.length;
            this._refreshHeroes();
        };
        const body = document.createElement('div');
        body.className = 'heroDetailBody';
        detail.appendChild(prev);
        detail.appendChild(body);
        detail.appendChild(next);
        page.appendChild(detail);
        this._heroDetailBodyEl = body;

        root.appendChild(page);
        this._pages.heroes = page;
    }

    /** 角色页刷新：完全复刻装备界面 HTML 稿布局——
     *  stage（左上头像铭牌/左侧圆钮/中央立绘/盾形武器/宝石钮/右侧 2×3 装备格/火焰战力牌）
     *  + 方案锻造行 + 背包标题行 + 六列背包网格 + 分类标签 */
    private _refreshHeroes(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const body = this._heroDetailBodyEl;
        if (!body) {
            return;
        }
        body.innerHTML = '';
        body.className = 'heroDetailBody col';
        const def = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length];
        const owned = gm.isHeroOwned(def.id);
        const inLineup = gm.isInLineup(def.id);
        const weaponName = def.weapon === 'rifle' ? '步枪' : def.weapon === 'sniper' ? '狙击' : def.weapon === 'laser' ? '激光' : '辐射';

        // ===== 角色展示区（.stage） =====
        const stage = document.createElement('div');
        stage.className = 'heroStage';

        // 左上：avatar-box（头像+等级角标+名牌）+ badge-role
        const avatarBox = document.createElement('div');
        avatarBox.className = 'heroAvatarBox';
        const faceWrap = document.createElement('div');
        faceWrap.className = 'heroFace';
        this._tex(`characters/hero_${def.id}`, u => { faceWrap.style.backgroundImage = u; });
        if (owned) {
            const lv = document.createElement('div');
            lv.className = 'heroLvBadge';
            lv.textContent = `${hs.heroLevel(def.id)}`;
            faceWrap.appendChild(lv);
        }
        const plate = document.createElement('div');
        plate.className = 'heroNamePlate';
        plate.textContent = def.name;
        const roleBadge = document.createElement('div');
        roleBadge.className = 'heroRoleBadge';
        roleBadge.textContent = `${def.role} · ${weaponName}` + (owned ? (inLineup ? ' · 上阵中' : '') : ' · 未拥有');
        avatarBox.appendChild(faceWrap);
        avatarBox.appendChild(plate);
        avatarBox.appendChild(roleBadge);
        stage.appendChild(avatarBox);

        // 左侧：side-btns 两个圆形功能钮（上阵/下阵 + 升级；未拥有 = 解锁跳商城）
        const side = document.createElement('div');
        side.className = 'heroSideBtns';
        const mkSide = (ic: string, tx: string, onTap: () => void, dim = false) => {
            const b = document.createElement('div');
            b.className = 'heroCircleBtn' + (dim ? ' dim' : '');
            b.innerHTML = `<span class="ic">${ic}</span><span class="tx">${tx}</span>`;
            b.onclick = (e) => {
                e.stopPropagation();
                if (dim) {
                    return;
                }
                SoundFx.unlock();
                onTap();
            };
            return b;
        };
        if (owned) {
            side.appendChild(mkSide(inLineup ? '🛡' : '⚔', inLineup ? '下阵' : '上阵', () => {
                if (gm.toggleLineupMember(def.id)) {
                    SoundFx.play('ui');
                    this._refreshHeroes();
                }
            }, inLineup && gm.lineup.length <= 1));
            side.appendChild(mkSide('⬆', hs.isHeroMaxLevel(def.id) ? '满级' : '升级', () => {
                if (hs.upgradeHero(def.id)) {
                    SoundFx.play('buy');
                    this._refreshHeroes();
                }
            }, hs.isHeroMaxLevel(def.id) || gm.gold < hs.heroUpgradeCost(def.id)));
        } else {
            side.appendChild(mkSide('🔓', '解锁', () => {
                SoundFx.play('ui');
                this._switchPage('mall');
            }));
        }
        stage.appendChild(side);

        // 中央：char-model 英雄立绘（点击 = 上阵切换 / 未拥有跳商城）
        const model = document.createElement('div');
        model.className = 'heroCharModel' + (owned ? '' : ' locked');
        this._tex(`characters/hero_${def.id}`, u => { model.style.backgroundImage = u; });
        model.title = owned ? '点击切换上阵' : '未拥有，前往商城解锁';
        model.onclick = (e) => {
            e.stopPropagation();
            if (!owned) {
                SoundFx.play('ui');
                this._switchPage('mall');
                return;
            }
            SoundFx.unlock();
            if (gm.toggleLineupMember(def.id)) {
                SoundFx.play('ui');
                this._refreshHeroes();
            }
        };
        stage.appendChild(model);

        if (owned) {
            // 右上：shield-slot 主武器（盾形 + 等级阶标，点击强化）
            const wpn = document.createElement('div');
            wpn.className = 'heroWpnSlot';
            const wpnMax = hs.isWeaponMaxLevel(def.id);
            wpn.innerHTML = `<div class="heroWpnIco">🔫</div>` +
                `<div class="heroWpnStep">${wpnMax ? '已满级' : `Lv.${hs.weaponLevel(def.id)}`}</div>` +
                (wpnMax ? '' : `<div class="heroWpnCost">${hs.weaponUpgradeCost(def.id)}金</div>`);
            wpn.title = wpnMax ? '武器已满级' : '点击强化武器攻击力';
            wpn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                if (hs.upgradeWeapon(def.id)) {
                    SoundFx.play('buy');
                    this._refreshHeroes();
                }
            };
            stage.appendChild(wpn);

            // 武器下方：gem-btn 宝石钮（武器核心，嵌入/拆除）
            const core = hs.weaponCore(def.id);
            const gem = document.createElement('div');
            gem.className = 'heroGemBtn';
            if (core) {
                gem.innerHTML = `<div class="heroGemLines" style="color:${EQUIP_TIER_COLORS[core.tier - 1]}">◆◆◆</div>` +
                    `<div class="heroGemTx">${core.name}</div>`;
                gem.title = `${core.desc}（点击拆除）`;
                gem.onclick = (e) => {
                    e.stopPropagation();
                    if (hs.removeCore(def.id)) {
                        SoundFx.play('ui');
                        this._refreshHeroes();
                    }
                };
            } else {
                const rec = WEAPON_CORE_DEFS.slice()
                    .sort((a, b) => (a.tier - b.tier) || (a.baseCost - b.baseCost))[0] ?? null;
                if (rec) {
                    gem.innerHTML = `<div class="heroGemLines">◆◆◆</div><div class="heroGemTx">宝石</div>`;
                    gem.title = `推荐 ${rec.name} · ${rec.desc}（${rec.baseCost}金，点击嵌入）`;
                    gem.onclick = (e) => {
                        e.stopPropagation();
                        if (hs.buyCore(def.id, rec.id)) {
                            SoundFx.play('buy');
                            this._refreshHeroes();
                        }
                    };
                } else {
                    gem.innerHTML = `<div class="heroGemLines">◆◆◆</div><div class="heroGemTx">暂无</div>`;
                }
            }
            stage.appendChild(gem);

            // 右侧：equip-panel 六槽装备格 2×3
            const panel = document.createElement('div');
            panel.className = 'heroEquipPanel';
            for (const slot of EQUIP_SLOTS) {
                panel.appendChild(this._mkEquipCell(def.id, slot));
            }
            stage.appendChild(panel);

            // 底部：flame-badge 火焰战力牌
            const power = document.createElement('div');
            power.className = 'heroFlameBadge';
            const pw = Math.round(def.atk * hs.atkMulOf(def.id) * 10);
            power.innerHTML = `<span class="fire">🔥</span><b>${pw}</b><i class="infoI">i</i>`;
            power.title = `Lv.${hs.heroLevel(def.id)} · 武器 Lv.${hs.weaponLevel(def.id)} · 装备/核心加成`;
            stage.appendChild(power);
        } else {
            const lock = document.createElement('div');
            lock.className = 'heroLockTip';
            lock.textContent = '解锁英雄后开放装备栏与武器养成';
            stage.appendChild(lock);
        }
        body.appendChild(stage);

        // ===== 方案 & 锻造行（.plan-row） =====
        const planRow = document.createElement('div');
        planRow.className = 'heroPlanRow';
        if (owned) {
            const plans = ['1 方案1 ⚙️', '2', '3', '4', '5'];
            for (let i = 0; i < plans.length; i++) {
                const tab = document.createElement('div');
                tab.className = 'heroPlanTab' + (i === 0 ? ' active' : '');
                tab.textContent = plans[i];
                planRow.appendChild(tab);
            }
            const more = document.createElement('div');
            more.className = 'heroPlanTab';
            more.textContent = '»';
            planRow.appendChild(more);
            // 锻造钮 = 武器强化（带红点）
            const forge = document.createElement('div');
            forge.className = 'heroForgeBtn';
            const wpnMax = hs.isWeaponMaxLevel(def.id);
            forge.innerHTML = wpnMax ? '⚒ 武器已满级' : `⚒ 武器强化 ${hs.weaponUpgradeCost(def.id)}金`;
            forge.title = wpnMax ? '武器已满级' : '点击强化武器攻击力';
            if (wpnMax) {
                forge.classList.add('dim');
            }
            forge.onclick = (e) => {
                e.stopPropagation();
                if (wpnMax) {
                    return;
                }
                SoundFx.unlock();
                if (hs.upgradeWeapon(def.id)) {
                    SoundFx.play('buy');
                    this._refreshHeroes();
                }
            };
            planRow.appendChild(forge);
        }
        body.appendChild(planRow);

        // ===== 背包标题行（.bag-head：标题 + 筛选 + 一键合成） =====
        const bagHead = document.createElement('div');
        bagHead.className = 'heroBagHead';
        const bagTitle = document.createElement('div');
        bagTitle.className = 'heroBagTitle';
        bagTitle.textContent = '🎒 我的背包';
        const filter = document.createElement('div');
        filter.className = 'heroBagFilter';
        filter.textContent = '🔼 全部';
        const merge = document.createElement('div');
        merge.className = 'heroBagMerge';
        merge.textContent = '一键合成';
        merge.title = '敬请期待';
        bagHead.appendChild(bagTitle);
        bagHead.appendChild(filter);
        bagHead.appendChild(merge);
        body.appendChild(bagHead);

        // ===== 六列背包网格（.bag-grid） =====
        const grid = document.createElement('div');
        grid.className = 'heroBagGrid';
        if (gm.bag.length === 0) {
            const tip = document.createElement('div');
            tip.className = 'heroBagEmpty';
            tip.textContent = '背包空空如也，去商城购买装备部件吧';
            grid.appendChild(tip);
        } else {
            for (const item of gm.bag) {
                const cell = document.createElement('div');
                cell.className = 'heroBagCell';
                cell.style.borderColor = EQUIP_TIER_COLORS[item.tier - 1];
                cell.style.background = `linear-gradient(180deg, ${EQUIP_TIER_COLORS[item.tier - 1]}22, #241a10)`;
                cell.innerHTML = `<span class="slotIc">${SLOT_EMOJI[item.slot]}</span>` +
                    `<span class="cnt">Lv.${item.lv}</span>`;
                cell.title = `${bagItemName(item)} · ${EQUIP_TIER_NAMES[item.tier - 1]}（点击穿戴）`;
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openEquipSlotPanel(def.id, item.slot);
                };
                grid.appendChild(cell);
            }
        }
        body.appendChild(grid);

        // ===== 分类标签（.cat-tabs：宝石/装备/材料/芯片，装饰） =====
        const cats = document.createElement('div');
        cats.className = 'heroCatTabs';
        const catDefs: Array<[string, boolean]> = [['宝石', false], ['装备', true], ['材料', true], ['芯片', false]];
        for (const [name, active] of catDefs) {
            const c = document.createElement('div');
            c.className = 'heroCat' + (active ? ' active' : '');
            c.innerHTML = name + (name === '装备' ? '<span class="dot"></span>' : '');
            cats.appendChild(c);
        }
        body.appendChild(cats);
    }

    /** 六槽装备格（复刻稿 equip-cell）：品质角标 + 部位图标 + 强化等级 + 宝石点，点击弹出穿戴面板 */
    private _mkEquipCell(heroId: string, slot: EquipSlot): HTMLDivElement {
        const hs = HeroSystem.instance;
        const cur = hs.equipped(heroId, slot);
        const cell = document.createElement('div');
        cell.className = 'heroEquipCell';
        if (cur) {
            let tier: 1 | 2 | 3 | 4 = 1;
            let name = '';
            if (cur.id.startsWith('bag:')) {
                tier = Number(cur.id.split(':')[2]) as 1 | 2 | 3 | 4;
                name = bagItemName({ slot, tier, lv: cur.lv });
            } else {
                const d = hs.equipDef(cur.id);
                if (d) {
                    tier = d.tier;
                    name = d.name;
                }
            }
            cell.style.borderColor = EQUIP_TIER_COLORS[tier - 1];
            // 宝石点：品质数=tier 个品质色点，其余绿点，共 4 点（复刻稿 stars 装饰）
            const dots = [1, 2, 3, 4].map(n =>
                `<i class="gemDot" style="background:${n <= tier ? EQUIP_TIER_COLORS[tier - 1] : '#58c05a'}"></i>`).join('');
            cell.innerHTML =
                `<span class="step">${EQUIP_TIER_NAMES[tier - 1]}</span>` +
                `<div class="ico">${SLOT_EMOJI[slot]}</div>` +
                `<div class="lvtx" style="color:${EQUIP_TIER_COLORS[tier - 1]}">${name} Lv.${cur.lv}</div>` +
                `<div class="stars">${dots}</div>`;
            cell.title = `${EQUIP_SLOT_NAMES[slot]}：${name}（点击管理）`;
        } else {
            cell.innerHTML =
                `<div class="ico dim">${SLOT_EMOJI[slot]}</div>` +
                `<div class="lvtx dim">${EQUIP_SLOT_NAMES[slot]}</div>`;
        }
        cell.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openEquipSlotPanel(heroId, slot);
        };
        return cell;
    }

    /** 穿戴面板：列出背包中该槽全部件（穿戴）+ 已穿件（卸下/强化） */
    private _openEquipSlotPanel(heroId: string, slot: EquipSlot): void {
        if (!this._root || !GameManager.instance.isHeroOwned(heroId) || document.querySelector('#homeUi .equipSlotPanel')) {
            return;
        }
        const ov = document.createElement('div');
        ov.className = 'lineupPanelOverlay';
        ov.onclick = (e) => {
            e.stopPropagation();
            ov.remove();
        };
        const card = document.createElement('div');
        card.className = 'lineupPanelCard';
        card.onclick = (e) => e.stopPropagation();
        const title = document.createElement('div');
        title.className = 'lineupPanelTitle';
        title.textContent = `${EQUIP_SLOT_NAMES[slot]} · 穿 戴`;
        card.appendChild(title);

        const list = document.createElement('div');
        list.className = 'equipSlots wide';
        card.appendChild(list);
        this._refreshEquipSlotPanel(list, heroId, slot, ov);

        const close = document.createElement('button');
        close.className = 'heroCardBtn cyan lineupClose';
        close.textContent = '关 闭';
        close.onclick = (e) => {
            e.stopPropagation();
            ov.remove();
        };
        card.appendChild(close);
        ov.appendChild(card);
        this._root.appendChild(ov);
    }

    /** 穿戴面板刷新：背包件列表（穿戴按钮）+ 已穿件操作（卸下/强化） */
    private _refreshEquipSlotPanel(list: HTMLDivElement, heroId: string, slot: EquipSlot, ov: HTMLDivElement): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        list.innerHTML = '';
        const cur = hs.equipped(heroId, slot);

        // 已穿件：卸下 / 强化
        if (cur) {
            const row = document.createElement('div');
            row.className = 'equipRow';
            const info = document.createElement('div');
            info.className = 'equipInfo';
            let nameHtml = '';
            let tier: 1 | 2 | 3 | 4 = 1;
            if (cur.id.startsWith('bag:')) {
                const t = Number(cur.id.split(':')[2]) as 1 | 2 | 3 | 4;
                tier = t;
                nameHtml = bagItemName({ slot, tier, lv: cur.lv });
            } else {
                const d = hs.equipDef(cur.id);
                if (d) {
                    tier = d.tier;
                    nameHtml = d.name;
                }
            }
            const parts: string[] = [];
            for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                const v = Math.round(hs.equipSlotValue(cur, key) * 100);
                if (v > 0) {
                    parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                }
            }
            info.innerHTML =
                `<div class="equipName" style="color:${EQUIP_TIER_COLORS[tier - 1]}">当前：${nameHtml}</div>` +
                `<div class="equipStat">强化 Lv.${cur.lv} · ${parts.join(' ') || '无属性'}</div>`;
            const btn = document.createElement('button');
            btn.className = 'heroCardBtn';
            if (!hs.isEquipMaxLevel(cur)) {
                const cost = hs.equipUpgradeCost(cur);
                btn.textContent = `强 化 ${cost}金`;
                btn.disabled = gm.gold < cost;
                btn.onclick = () => {
                    if (hs.upgradeEquip(heroId, slot)) {
                        SoundFx.play('buy');
                        this._refreshEquipSlotPanel(list, heroId, slot, ov);
                        this._refreshHeroes();
                    }
                };
            } else {
                btn.textContent = '已满级';
                btn.disabled = true;
            }
            const offBtn = document.createElement('button');
            offBtn.className = 'heroCardBtn cyan';
            offBtn.textContent = '卸 下';
            offBtn.style.marginLeft = 'calc(10px * var(--hs,1))';
            offBtn.onclick = () => {
                if (hs.unequipToBag(heroId, slot)) {
                    SoundFx.play('ui');
                    this._refreshEquipSlotPanel(list, heroId, slot, ov);
                    this._refreshHeroes();
                }
            };
            const btnWrap = document.createElement('div');
            btnWrap.className = 'heroBtnCol';
            btnWrap.style.flexDirection = 'row';
            btnWrap.appendChild(btn);
            btnWrap.appendChild(offBtn);
            row.appendChild(info);
            row.appendChild(btnWrap);
            list.appendChild(row);
        }

        // 背包件列表
        const items = hs.bagItemsOf(slot);
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'equipStat';
            empty.textContent = cur ? '背包中该部位没有其他件' : '背包中该部位没有装备，去商城购买';
            list.appendChild(empty);
        }
        for (const { index, item } of items) {
            const row = document.createElement('div');
            row.className = 'equipRow';
            const info = document.createElement('div');
            info.className = 'equipInfo';
            const parts: string[] = [];
            for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                const v = Math.round(bagItemValue(item, key) * 100);
                if (v > 0) {
                    parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                }
            }
            info.innerHTML =
                `<div class="equipName" style="color:${EQUIP_TIER_COLORS[item.tier - 1]}">${bagItemName(item)}</div>` +
                `<div class="equipStat">${parts.join(' ') || '无属性'}</div>`;
            const btn = document.createElement('button');
            btn.className = 'heroCardBtn';
            btn.textContent = '穿 戴';
            btn.onclick = () => {
                if (hs.equipFromBag(heroId, index)) {
                    SoundFx.play('buy');
                    ov.remove();
                    this._refreshHeroes();
                }
            };
            row.appendChild(info);
            row.appendChild(btn);
            list.appendChild(row);
        }
    }

    // ================= 核心页（技能升级） =================

    /** 核心页：顶部资源条 + 英雄左右切换 + 三张技能卡（普攻/技能/大招升级） */
    private _buildCore(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'page';

        // 顶部资源条（与商城/角色页共用元素引用）
        const resRow = document.createElement('div');
        resRow.className = 'mallResRow';
        const mkRes = (id: 'gold' | 'diamond' | 'stamina') => {
            const chip = document.createElement('div');
            chip.className = 'mallRes';
            const ico = document.createElement('i');
            ico.className = 'mallResIco';
            this._tex(`ui/res_${id}`, u => { ico.style.backgroundImage = u; });
            const val = document.createElement('div');
            val.className = 'mallResVal';
            chip.appendChild(ico);
            chip.appendChild(val);
            resRow.appendChild(chip);
            this._mallResEls[id] = val;
        };
        mkRes('gold');
        mkRes('diamond');
        mkRes('stamina');
        page.appendChild(resRow);

        // 英雄展示：左右箭头 + 详情（立绘/名字，由 _refreshCore 重建）
        const detail = document.createElement('div');
        detail.className = 'heroDetail';
        const prev = document.createElement('div');
        prev.className = 'heroArrow';
        prev.textContent = '❮';
        prev.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._coreSelIdx = (this._coreSelIdx + HERO_DEFS.length - 1) % HERO_DEFS.length;
            this._refreshCore();
        };
        const next = document.createElement('div');
        next.className = 'heroArrow';
        next.textContent = '❯';
        next.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._coreSelIdx = (this._coreSelIdx + 1) % HERO_DEFS.length;
            this._refreshCore();
        };
        const body = document.createElement('div');
        body.className = 'heroDetailBody';
        detail.appendChild(prev);
        detail.appendChild(body);
        detail.appendChild(next);
        page.appendChild(detail);
        this._coreBodyEl = body;

        // 技能升级区标题 + 三卡容器
        const sec = document.createElement('div');
        sec.className = 'homeSection';
        sec.textContent = '━ 技 能 升 级 ━';
        page.appendChild(sec);
        const cards = document.createElement('div');
        cards.className = 'abilityCards';
        page.appendChild(cards);
        this._coreCardsEl = cards;

        root.appendChild(page);
        this._pages.core = page;
    }

    /** 核心页刷新：英雄展示区与三张技能卡整块重建 */
    private _refreshCore(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const body = this._coreBodyEl;
        const cardsBox = this._coreCardsEl;
        if (!body || !cardsBox) {
            return;
        }
        const def = HERO_DEFS[this._coreSelIdx % HERO_DEFS.length];
        const owned = gm.isHeroOwned(def.id);
        const weaponName = def.weapon === 'rifle' ? '步枪' : def.weapon === 'sniper' ? '狙击' : def.weapon === 'laser' ? '激光' : '辐射';

        // 英雄展示（居中）
        body.innerHTML = '';
        const showcase = document.createElement('div');
        showcase.className = 'heroShowcase';
        const avatar = document.createElement('div');
        avatar.className = 'heroAvatar detail' + (owned ? '' : ' locked');
        this._tex(`characters/hero_${def.id}`, u => { avatar.style.backgroundImage = u; });
        if (owned) {
            avatar.title = '前往角色页穿戴装备与养成';
            avatar.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._switchPage('heroes');
            };
        } else {
            avatar.title = '未拥有，前往商城解锁';
            avatar.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._switchPage('mall');
            };
        }
        const name = document.createElement('div');
        name.className = 'heroName center';
        name.textContent = def.name;
        const role = document.createElement('div');
        role.className = 'heroRole center';
        role.textContent = `${def.role} · ${weaponName}` + (owned ? '' : ' · 未拥有');
        showcase.appendChild(avatar);
        showcase.appendChild(name);
        showcase.appendChild(role);
        body.appendChild(showcase);
        if (!owned) {
            const lockTip = document.createElement('div');
            lockTip.className = 'equipStat';
            lockTip.style.alignSelf = 'center';
            lockTip.textContent = '解锁英雄后开放技能升级';
            cardsBox.innerHTML = '';
            cardsBox.appendChild(lockTip);
            return;
        }

        // 三张技能卡
        cardsBox.innerHTML = '';
        const basicDesc = def.weapon === 'rifle' ? '连续射击单个目标'
            : def.weapon === 'sniper' ? '高伤狙击单体目标'
                : def.weapon === 'laser' ? '激光束持续灼烧目标'
                    : '辐射弹群体溅射';
        const slots: Array<{ slot: AbilitySlot; name: string; desc: string; icon: string }> = [
            { slot: 'basic', name: '普攻', desc: basicDesc, icon: `icons/${def.id}_basic` },
            { slot: 'skill', name: def.skill.name, desc: def.skill.desc, icon: `icons/${def.id}_skill` },
            { slot: 'ultimate', name: def.ultimate.name, desc: def.ultimate.desc, icon: `icons/${def.id}_ultimate` },
        ];
        for (const info of slots) {
            cardsBox.appendChild(this._mkAbilityCard(def.id, info.slot, info.name, info.desc, info.icon));
        }
    }

    /** 单张技能卡：图标圆窗 + 名称/等级 + 描述 + 升级按钮 */
    private _mkAbilityCard(heroId: string, slot: AbilitySlot, name: string, desc: string, iconKey: string): HTMLDivElement {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        const card = document.createElement('div');
        card.className = 'abilityCard';

        const iconWin = document.createElement('div');
        iconWin.className = 'abilityIconWin';
        this._tex(iconKey, u => { iconWin.style.backgroundImage = u; });
        card.appendChild(iconWin);

        const nameRow = document.createElement('div');
        nameRow.className = 'abilityName';
        nameRow.textContent = name;
        card.appendChild(nameRow);

        const lv = document.createElement('div');
        lv.className = 'abilityLv';
        const level = hs.abilityLevel(heroId, slot);
        lv.textContent = hs.isAbilityMaxLevel(heroId, slot) ? '已满级' : `${level} 级`;
        card.appendChild(lv);

        const descEl = document.createElement('div');
        descEl.className = 'abilityDesc';
        descEl.textContent = desc + `（每级伤害 +${Math.round(ABILITY_LEVEL_DMG_BONUS * 100)}%）`;
        card.appendChild(descEl);

        const btn = document.createElement('button');
        btn.className = 'heroCardBtn';
        if (hs.isAbilityMaxLevel(heroId, slot)) {
            btn.textContent = '已满级';
            btn.disabled = true;
        } else {
            const cost = hs.abilityUpgradeCost(heroId, slot);
            btn.textContent = `升 级 ${cost}金`;
            btn.disabled = gm.gold < cost;
            btn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                if (hs.upgradeAbility(heroId, slot)) {
                    SoundFx.play('buy');
                    this._refreshCore();
                }
            };
        }
        btn.style.opacity = btn.disabled ? '0.45' : '1';
        card.appendChild(btn);
        return card;
    }

    private _frameUrl(key: string): string | null {
        const frame: SpriteFrame | null = AssetLib.frame(key);
        const tex = (frame ? frame.texture : null) as (import('cc').Texture2D & { image?: { data?: unknown } }) | null;
        const asset = tex ? tex.image : null;
        const img = asset ? asset.data : null;
        if (!img) {
            return null;
        }
        if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && img.src) {
            return `url(${img.src})`;
        }
        if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) {
            return `url(${img.toDataURL('image/png')})`;
        }
        return null;
    }

    private _switchPage(page: string): void {
        for (const key of Object.keys(this._pages)) {
            this._pages[key].style.display = key === page ? 'flex' : 'none';
        }
        for (const key of Object.keys(this._navBtns)) {
            this._navBtns[key].classList.toggle('active', key === page);
        }
        if (page === 'battle') {
            this._refresh();
        }
        if (page === 'mall') {
            this._refreshMall();
        }
        if (page === 'heroes') {
            this._refreshHeroes();
        }
        if (page === 'core') {
            this._refreshCore();
        }
    }

    private _refresh(): void {
        const gm = GameManager.instance;
        if (this._goldEl) {
            this._goldEl.textContent = String(gm.gold);
        }
        if (this._bestEl) {
            this._bestEl.textContent = String(gm.bestWave);
        }
        if (this._staminaEl) {
            const st = gm.stamina();
            this._staminaEl.textContent = `${st}/${BattleConfig.STAMINA_MAX}`;
            this._staminaEl.style.color = gm.canStartRun() ? '#ffd76a' : '#ff6b6b';
        }
        if (this._chapterEl) {
            const stage = STAGES[Math.min(Math.max(1, gm.currentStage), FINAL_STAGE_ID) - 1];
            this._chapterEl.textContent = stage.name;
        }
        if (this._chapterPrev) {
            this._chapterPrev.style.visibility = gm.currentStage > 1 ? 'visible' : 'hidden';
        }
        if (this._chapterNext) {
            this._chapterNext.style.visibility = gm.currentStage < FINAL_STAGE_ID ? 'visible' : 'hidden';
        }
        for (const row of this._rows) {
            const lv = gm.upgradeLevel(row.def.id);
            const cost = gm.upgradeCost(row.def.id);
            row.lv.textContent = `Lv.${lv}`;
            row.eff.textContent = row.def.desc(lv + 1);
            const maxed = lv >= row.def.maxLevel;
            row.cost.textContent = maxed ? '已满级' : `${cost} 金币`;
            row.btn.style.display = maxed ? 'none' : '';
            row.btn.disabled = !gm.canUpgrade(row.def.id);
            row.btn.style.opacity = gm.canUpgrade(row.def.id) ? '1' : '0.45';
        }
        const startBtn = document.querySelector<HTMLButtonElement>('#homeUi .homeStart');
        if (startBtn) {
            startBtn.style.opacity = gm.canStartRun() ? '1' : '0.45';
        }
        this._applyPendingTex();
    }

    // ================= 构建 =================

    private _build(): void {
        const root = document.createElement('div');
        root.id = 'homeUi';
        this._root = root;

        // ---- 战斗页（中央主页面） ----
        const battle = document.createElement('div');
        battle.className = 'page';
        this._pages['battle'] = battle;
        root.appendChild(battle);

        // 顶部：金币 / 最远波次
        const statsRow = document.createElement('div');
        statsRow.className = 'homeStats';
        const mkStat = (lab: string, val: string, iconKey?: string): HTMLDivElement => {
            const chip = document.createElement('div');
            chip.className = 'homeStat';
            if (iconKey) {
                const ico = document.createElement('i');
                ico.className = 'statIco';
                chip.appendChild(ico);
                this._tex(iconKey, u => { ico.style.backgroundImage = u; });
            }
            const v = document.createElement('div');
            v.className = 'homeStatVal';
            v.textContent = val;
            const l = document.createElement('div');
            l.className = 'homeStatLab';
            l.textContent = lab;
            chip.appendChild(v);
            chip.appendChild(l);
            statsRow.appendChild(chip);
            return v;
        };
        this._goldEl = mkStat('金币', '0', 'ui/res_gold');
        this._staminaEl = mkStat('体力', '30/30', 'ui/res_stamina');
        this._bestEl = mkStat('最远波次', '0');
        battle.appendChild(statsRow);

        const reward = document.createElement('div');
        reward.className = 'homeReward';
        reward.style.display = 'none';
        battle.appendChild(reward);
        this._rewardEl = reward;

        // 章节横幅：编号章名 + 骷髅徽记 + 左右切关箭头
        const chapter = document.createElement('div');
        chapter.className = 'chapterBanner';
        const chapterPrev = document.createElement('div');
        chapterPrev.className = 'chapterArrow';
        chapterPrev.textContent = '❮';
        chapterPrev.onclick = (e) => {
            e.stopPropagation();
            this._switchStage(-1);
        };
        const chapterName = document.createElement('div');
        chapterName.className = 'chapterName';
        this._chapterEl = chapterName;
        const chapterSkull = document.createElement('div');
        chapterSkull.className = 'chapterSkull';
        chapterSkull.textContent = '☠';
        const chapterNext = document.createElement('div');
        chapterNext.className = 'chapterArrow';
        chapterNext.textContent = '❯';
        chapterNext.onclick = (e) => {
            e.stopPropagation();
            this._switchStage(1);
        };
        chapter.appendChild(chapterPrev);
        chapter.appendChild(chapterName);
        chapter.appendChild(chapterSkull);
        chapter.appendChild(chapterNext);
        this._tex('ui/banner_orange', u => {
            chapter.style.backgroundImage = u;
            chapter.style.backgroundSize = '100% 100%';
            chapter.style.padding = 'calc(26px * var(--hs,1)) calc(80px * var(--hs,1))';
        });
        battle.appendChild(chapter);

        // 难度切换：普通 / 精英（精英暂锁定）
        const diffRow = document.createElement('div');
        diffRow.className = 'diffRow';
        const normal = document.createElement('div');
        normal.className = 'diffTab active';
        normal.textContent = '普通';
        const elite = document.createElement('div');
        elite.className = 'diffTab locked';
        elite.textContent = '精英';
        elite.title = '通关 10 波解锁';
        diffRow.appendChild(normal);
        diffRow.appendChild(elite);
        battle.appendChild(diffRow);

        // 载具展台：左右箭头 + 平台 + 载具图
        const stage = document.createElement('div');
        stage.className = 'stage';
        const arrowL = document.createElement('div');
        arrowL.className = 'stageArrow dim';
        arrowL.textContent = '❮';
        const platform = document.createElement('div');
        platform.className = 'platform';
        const vehicle = document.createElement('div');
        vehicle.className = 'vehicle';
        const vehUrl = this._frameUrl('scenes/vehicle_tail');
        if (vehUrl) {
            vehicle.style.backgroundImage = vehUrl;
        }
        this._tex('ui/panel_metal', u => {
            platform.style.backgroundImage = u;
            platform.style.backgroundSize = '100% 100%';
            platform.style.border = 'none';
        });
        platform.appendChild(vehicle);
        const arrowR = document.createElement('div');
        arrowR.className = 'stageArrow dim';
        arrowR.textContent = '❯';
        stage.appendChild(arrowL);
        stage.appendChild(platform);
        stage.appendChild(arrowR);
        battle.appendChild(stage);

        // 三档通关宝箱（占位：随关卡进度解锁）
        const chests = document.createElement('div');
        chests.className = 'chests';
        for (const lab of ['成功通关', '50%血量通关', '完美通关']) {
            const chest = document.createElement('div');
            chest.className = 'chest';
            const box = document.createElement('div');
            box.className = 'chestBox';
            const cl = document.createElement('div');
            cl.className = 'chestLab';
            cl.textContent = lab;
            chest.appendChild(box);
            chest.appendChild(cl);
            this._tex('ui/chest', u => {
                box.classList.add('tex');
                box.style.backgroundImage = u;
                box.style.backgroundSize = 'contain';
                box.style.backgroundRepeat = 'no-repeat';
                box.style.backgroundPosition = 'center';
                box.style.border = 'none';
            });
            chests.appendChild(chest);
        }
        battle.appendChild(chests);

        // 出战按钮
        const start = document.createElement('button');
        start.className = 'homeStart';
        start.textContent = '出 战';
        start.onclick = (e) => {
            e.stopPropagation();
            this._startBattle();
        };
        this._tex('ui/btn_gold', u => {
            start.style.backgroundImage = u;
            start.style.backgroundSize = '100% 100%';
            start.style.borderRadius = 'calc(18px * var(--hs,1))';
            start.style.border = 'none';
            start.style.boxShadow = '0 calc(6px * var(--hs,1)) 0 rgba(0,0,0,.4)';
        });
        battle.appendChild(start);

        // 编队按钮：弹出编队面板（上阵/下阵）
        const lineupOpen = document.createElement('button');
        lineupOpen.className = 'lineupOpen';
        lineupOpen.textContent = '编 队';
        lineupOpen.onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            SoundFx.play('ui');
            this._openLineupPanel();
        };
        battle.appendChild(lineupOpen);

        // 基地强化（过渡期挂在战斗页底部，基地页实装后迁走）
        const upTitle = document.createElement('div');
        upTitle.className = 'homeSection';
        upTitle.textContent = '基地强化';
        battle.appendChild(upTitle);
        for (const def of META_UPGRADES) {
            const row = document.createElement('div');
            row.className = 'upRow';
            const info = document.createElement('div');
            info.className = 'upInfo';
            const name = document.createElement('div');
            name.className = 'upName';
            const lv = document.createElement('span');
            lv.className = 'upLv';
            lv.textContent = 'Lv.0';
            name.appendChild(document.createTextNode(def.name + ' '));
            name.appendChild(lv);
            const eff = document.createElement('div');
            eff.className = 'upEff';
            info.appendChild(name);
            info.appendChild(eff);
            const right = document.createElement('div');
            right.className = 'upRight';
            const cost = document.createElement('div');
            cost.className = 'upCost';
            const btn = document.createElement('button');
            btn.className = 'upBtn';
            btn.textContent = '升 级';
            btn.onclick = (e) => {
                e.stopPropagation();
                if (GameManager.instance.buyUpgrade(def.id)) {
                    this._refresh();
                }
            };
            this._tex('ui/btn_cyan', u => {
                btn.style.backgroundImage = u;
                btn.style.backgroundSize = '100% 100%';
                btn.style.borderRadius = 'calc(10px * var(--hs,1))';
                btn.style.boxShadow = '0 calc(3px * var(--hs,1)) 0 rgba(0,0,0,.4)';
                btn.style.color = '#0e1620';
            });
            right.appendChild(cost);
            right.appendChild(btn);
            row.appendChild(info);
            row.appendChild(right);
            battle.appendChild(row);
            this._rows.push({ def, lv, eff, cost, btn });
        }

        // ---- 其余四页：商城/角色实装，其余建设中占位 ----
        const PLACEHOLDERS: Record<string, { icon: string; name: string; hint: string }> = {
            base: { icon: '🏰', name: '基地', hint: '基地建设与产出 · 建设中' },
        };
        for (const key of Object.keys(PLACEHOLDERS)) {
            const ph = PLACEHOLDERS[key];
            const page = document.createElement('div');
            page.className = 'page';
            const icon = document.createElement('div');
            icon.className = 'phIcon';
            icon.textContent = ph.icon;
            const name = document.createElement('div');
            name.className = 'phName';
            name.textContent = ph.name;
            const hint = document.createElement('div');
            hint.className = 'phHint';
            hint.textContent = ph.hint;
            page.appendChild(icon);
            page.appendChild(name);
            page.appendChild(hint);
            root.appendChild(page);
            this._pages[key] = page;
        }

        // ---- 核心页（技能升级）----
        this._buildCore(root);

        // ---- 商城页 / 角色编队页 ----
        this._buildMall(root);
        this._buildHeroes(root);

        // ---- 底部导航栏 ----
        const nav = document.createElement('div');
        nav.className = 'navBar';
        const NAV: Array<{ key: string; icon: string; name: string }> = [
            { key: 'mall', icon: '🛒', name: '商城' },
            { key: 'heroes', icon: '🦸', name: '角色' },
            { key: 'battle', icon: '🔫', name: '战斗' },
            { key: 'core', icon: '🧬', name: '核心' },
            { key: 'base', icon: '🏰', name: '基地' },
        ];
        for (const item of NAV) {
            const btn = document.createElement('button');
            btn.className = 'navBtn' + (item.key === 'battle' ? ' active' : '');
            const icon = document.createElement('div');
            icon.className = 'navIcon';
            icon.textContent = item.icon;
            const label = document.createElement('div');
            label.className = 'navLab';
            label.textContent = item.name;
            btn.appendChild(icon);
            btn.appendChild(label);
            btn.onclick = (e) => {
                e.stopPropagation();
                this._switchPage(item.key);
            };
            this._tex(`ui/nav_${item.key}`, u => {
                icon.style.backgroundImage = u;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.textContent = '';
            });
            nav.appendChild(btn);
            this._navBtns[item.key] = btn;
        }
        root.appendChild(nav);

        // 模拟广告层（全屏覆盖，AD_START/AD_END 驱动）
        this._buildAdOverlay(root);

        const stamp = document.createElement('div');
        stamp.className = 'homeStamp';
        stamp.textContent = BUILD_STAMP;
        root.appendChild(stamp);

        document.body.appendChild(root);
        this._switchPage('battle');
    }

    private _injectStyle(): void {
        if (HomeUi._styleInjected) {
            return;
        }
        HomeUi._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = `
#homeUi { position: fixed; inset: 0; z-index: 8500; display: flex; flex-direction: column; align-items: center;
  padding: calc(50px * var(--hs,1)) calc(40px * var(--hs,1)) 0;
  background: linear-gradient(180deg, #101a24 0%, #0c141d 55%, #091018 100%);
  font-family: system-ui, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  font-weight: 700; color: #ecf1f1; user-select: none; overflow: hidden; }
#homeUi .page { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center;
  overflow-y: auto; padding-bottom: calc(190px * var(--hs,1)); }
#homeUi .phIcon { font-size: calc(140px * var(--hs,1)); opacity: .5; }
#homeUi .phName { font-size: calc(52px * var(--hs,1)); color: #9be7ff; margin-top: calc(20px * var(--hs,1)); letter-spacing: 6px; }
#homeUi .phHint { font-size: calc(28px * var(--hs,1)); color: #8fa0ab; margin-top: calc(14px * var(--hs,1)); }

#homeUi .homeStats { display: flex; gap: calc(24px * var(--hs,1)); margin-top: calc(10px * var(--hs,1)); }
#homeUi .homeStat { min-width: calc(280px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(26px * var(--hs,1));
  border-radius: calc(20px * var(--hs,1)); background: rgba(255,255,255,.04);
  border: calc(2px * var(--hs,1)) solid rgba(128,222,228,.22); text-align: center;
  display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .statIco { width: calc(44px * var(--hs,1)); height: calc(44px * var(--hs,1)); flex: none;
  background-size: contain; background-repeat: no-repeat; background-position: center; }
#homeUi .homeStatVal, #homeUi .homeStatLab { text-align: left; }
#homeUi .homeStatVal { line-height: 1.05; }
#homeUi .chestBox.tex::before { display: none; }
#homeUi .homeStatVal { font-size: calc(52px * var(--hs,1)); color: #ffd76a; font-variant-numeric: tabular-nums; }
#homeUi .homeStatLab { font-size: calc(24px * var(--hs,1)); color: #8fa0ab; letter-spacing: 2px; margin-top: calc(4px * var(--hs,1)); }
#homeUi .homeReward { margin-top: calc(24px * var(--hs,1)); font-size: calc(32px * var(--hs,1)); color: #9be7ff;
  padding: calc(12px * var(--hs,1)) calc(30px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  background: rgba(77,208,233,.1); border: calc(2px * var(--hs,1)) solid rgba(77,208,233,.3); }

#homeUi .chapterBanner { display: flex; align-items: center; gap: calc(18px * var(--hs,1)); margin-top: calc(34px * var(--hs,1)); }
#homeUi .chapterName { font-size: calc(72px * var(--hs,1)); font-weight: 800; letter-spacing: calc(4px * var(--hs,1));
  background: linear-gradient(180deg, #ffe9a8 0%, #ffcc55 48%, #e8a027 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 calc(4px * var(--hs,1)) 0 rgba(0,0,0,.6)); }
#homeUi .chapterSkull { font-size: calc(64px * var(--hs,1));
  filter: drop-shadow(0 0 calc(14px * var(--hs,1)) rgba(255,120,40,.8)); }
#homeUi .chapterArrow { font-size: calc(52px * var(--hs,1)); color: #ffd76a; padding: 0 calc(16px * var(--hs,1));
  text-shadow: 0 calc(3px * var(--hs,1)) 0 rgba(0,0,0,.6); user-select: none; }
#homeUi .chapterArrow:active { opacity: .6; }

#homeUi .diffRow { display: flex; margin-top: calc(30px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  overflow: hidden; border: calc(2px * var(--hs,1)) solid rgba(217,155,66,.4); }
#homeUi .diffTab { padding: calc(12px * var(--hs,1)) calc(60px * var(--hs,1)); font-size: calc(34px * var(--hs,1));
  background: rgba(255,255,255,.05); color: #8fa0ab; }
#homeUi .diffTab.active { color: #0e1620; font-weight: 800;
  background: linear-gradient(180deg, #ffe08a, #f0a72c); }
#homeUi .diffTab.locked { opacity: .45; }

#homeUi .stage { display: flex; align-items: center; justify-content: center; gap: calc(26px * var(--hs,1));
  width: 100%; max-width: calc(920px * var(--hs,1)); margin-top: calc(34px * var(--hs,1)); }
#homeUi .platform { width: calc(560px * var(--hs,1)); height: calc(430px * var(--hs,1)); border-radius: calc(26px * var(--hs,1));
  background: radial-gradient(ellipse at 50% 62%, rgba(255,204,85,.22), rgba(255,204,85,.05) 55%, transparent),
    linear-gradient(180deg, #22303c 0%, #1a2530 100%);
  border: calc(3px * var(--hs,1)) solid rgba(255,204,85,.35);
  box-shadow: 0 0 calc(40px * var(--hs,1)) rgba(255,204,85,.18), inset 0 0 calc(60px * var(--hs,1)) rgba(0,0,0,.5);
  display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
#homeUi .vehicle { width: 78%; height: 62%; margin-bottom: calc(26px * var(--hs,1));
  background-size: contain; background-repeat: no-repeat; background-position: center bottom;
  filter: drop-shadow(0 calc(14px * var(--hs,1)) calc(18px * var(--hs,1)) rgba(0,0,0,.55)); }
#homeUi .stageArrow { font-size: calc(72px * var(--hs,1)); color: #ffd76a; }
#homeUi .stageArrow.dim { opacity: .3; }

#homeUi .chests { display: flex; gap: calc(60px * var(--hs,1)); margin-top: calc(30px * var(--hs,1)); }
#homeUi .chest { display: flex; flex-direction: column; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .chestBox { width: calc(110px * var(--hs,1)); height: calc(86px * var(--hs,1)); border-radius: calc(12px * var(--hs,1));
  background: linear-gradient(180deg, #7a2a24 0%, #571c18 100%);
  border: calc(3px * var(--hs,1)) solid #c9a24a; position: relative;
  box-shadow: inset 0 calc(3px * var(--hs,1)) calc(6px * var(--hs,1)) rgba(0,0,0,.45), 0 calc(4px * var(--hs,1)) calc(10px * var(--hs,1)) rgba(0,0,0,.4); }
#homeUi .chestBox::before { content: ''; position: absolute; left: 50%; top: calc(-3px * var(--hs,1)); transform: translateX(-50%);
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%;
  background: #ffd76a; box-shadow: inset 0 0 0 calc(3px * var(--hs,1)) #8a5a1e; }
#homeUi .chestLab { font-size: calc(24px * var(--hs,1)); color: #d9b06a; }

#homeUi .homeStart { margin-top: calc(36px * var(--hs,1)); min-width: calc(560px * var(--hs,1));
  padding: calc(30px * var(--hs,1)) 0; border: none; border-radius: calc(999px * var(--hs,1));
  font-size: calc(52px * var(--hs,1)); font-weight: 800; letter-spacing: calc(16px * var(--hs,1)); color: #0e1620; cursor: pointer;
  background: linear-gradient(180deg, #ffe08a 0%, #f0a72c 55%, #d18a1a 100%);
  box-shadow: 0 calc(8px * var(--hs,1)) 0 rgba(0,0,0,.4), 0 calc(14px * var(--hs,1)) calc(30px * var(--hs,1)) rgba(255,204,85,.28),
    inset 0 calc(3px * var(--hs,1)) 0 rgba(255,255,255,.5); }
#homeUi .homeStart:active { transform: translateY(calc(4px * var(--hs,1))); }

#homeUi .homeSection { width: 100%; max-width: calc(920px * var(--hs,1)); margin: calc(44px * var(--hs,1)) 0 calc(18px * var(--hs,1));
  font-size: calc(34px * var(--hs,1)); color: #9be7ff; letter-spacing: 4px; }
#homeUi .upRow { width: 100%; max-width: calc(920px * var(--hs,1)); display: flex; align-items: center;
  justify-content: space-between; padding: calc(20px * var(--hs,1)) calc(28px * var(--hs,1));
  border-radius: calc(18px * var(--hs,1)); background: rgba(255,255,255,.035);
  border: calc(2px * var(--hs,1)) solid rgba(255,255,255,.06); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .upName { font-size: calc(32px * var(--hs,1)); }
#homeUi .upLv { color: #ffd76a; font-size: calc(28px * var(--hs,1)); font-variant-numeric: tabular-nums; }
#homeUi .upEff { font-size: calc(25px * var(--hs,1)); color: #8fa0ab; margin-top: calc(6px * var(--hs,1)); }
#homeUi .upRight { display: flex; align-items: center; gap: calc(18px * var(--hs,1)); }
#homeUi .upCost { font-size: calc(26px * var(--hs,1)); color: #ffd76a; font-variant-numeric: tabular-nums; }
#homeUi .upBtn { border: none; border-radius: calc(14px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(30px * var(--hs,1));
  font-size: calc(28px * var(--hs,1)); font-weight: 700; color: #0e1620; cursor: pointer;
  background: linear-gradient(180deg, #9be7ff, #4dd0e9); box-shadow: 0 calc(3px * var(--hs,1)) 0 rgba(0,0,0,.4); }
#homeUi .upBtn:disabled { cursor: default; }

#homeUi .navBar { position: absolute; left: 0; right: 0; bottom: 0; height: calc(150px * var(--hs,1));
  display: flex; align-items: stretch; background: linear-gradient(180deg, rgba(20,30,40,.6), rgba(12,20,28,.98));
  border-top: calc(3px * var(--hs,1)) solid rgba(255,204,85,.25); }
#homeUi .navBtn { flex: 1; border: none; background: transparent; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(6px * var(--hs,1));
  color: #8fa0ab; font-weight: 700; }
#homeUi .navBtn.active { color: #ffd76a;
  background: linear-gradient(180deg, rgba(255,204,85,.24), rgba(255,204,85,.05));
  box-shadow: inset 0 calc(4px * var(--hs,1)) 0 #ffd76a; }
#homeUi .navIcon { font-size: calc(52px * var(--hs,1)); line-height: 1; }
#homeUi .navLab { font-size: calc(28px * var(--hs,1)); letter-spacing: 2px; }

#homeUi .homeStamp { position: absolute; right: calc(20px * var(--hs,1)); bottom: calc(160px * var(--hs,1));
  font-size: calc(20px * var(--hs,1)); color: rgba(236,241,241,.35); }

/* ---- 商城页 ---- */
#homeUi .mallResRow { display: flex; gap: calc(18px * var(--hs,1)); margin-top: calc(18px * var(--hs,1)); width: 100%;
  max-width: calc(900px * var(--hs,1)); }
#homeUi .mallRes { flex: 1; display: flex; align-items: center; gap: calc(12px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(20px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  background: rgba(10,18,26,.72); border: calc(2px * var(--hs,1)) solid rgba(120,150,170,.25); }
#homeUi .mallResIco { width: calc(44px * var(--hs,1)); height: calc(44px * var(--hs,1)); flex: none;
  background-size: contain; background-repeat: no-repeat; background-position: center; }
#homeUi .mallResVal { font-size: calc(34px * var(--hs,1)); color: #fff; font-variant-numeric: tabular-nums; }
#homeUi .mallAdBtn { margin-top: calc(22px * var(--hs,1)); min-width: calc(620px * var(--hs,1));
  padding: calc(20px * var(--hs,1)) calc(50px * var(--hs,1)); border-radius: calc(18px * var(--hs,1)); cursor: pointer;
  font-size: calc(34px * var(--hs,1)); font-weight: 800; color: #062028; letter-spacing: calc(3px * var(--hs,1));
  filter: drop-shadow(0 calc(5px * var(--hs,1)) 0 rgba(0,0,0,.4)); }
#homeUi .mallAdBtn:active { transform: translateY(calc(3px * var(--hs,1))); }
#homeUi .mallAdLab { display: flex; align-items: center; justify-content: center; gap: calc(10px * var(--hs,1)); }
#homeUi .mallAdLab::before { content: '▶'; font-size: calc(30px * var(--hs,1)); }
#homeUi .mallAdHint { margin-top: calc(14px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); color: #8fa0ab; }

/* ---- 模拟广告层 ---- */
#homeUi .adOverlay { position: fixed; inset: 0; z-index: 9600; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(30px * var(--hs,1)); background: rgba(2,6,10,.94);
  pointer-events: auto; }
#homeUi .adTitle { font-size: calc(52px * var(--hs,1)); color: #9be7ff; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .adCountdown { font-size: calc(140px * var(--hs,1)); font-weight: 800; color: #ffd76a;
  font-variant-numeric: tabular-nums; text-shadow: 0 calc(6px * var(--hs,1)) 0 rgba(0,0,0,.6); }
#homeUi .adTip { font-size: calc(28px * var(--hs,1)); color: #8fa0ab; }

/* ---- 角色编队页 ---- */
#homeUi .lineupRow { display: flex; gap: calc(20px * var(--hs,1)); margin-top: calc(20px * var(--hs,1)); }
#homeUi .lineupSlot { width: calc(160px * var(--hs,1)); height: calc(190px * var(--hs,1)); border-radius: calc(16px * var(--hs,1));
  background: rgba(10,18,26,.72) center / contain no-repeat; border: calc(3px * var(--hs,1)) solid rgba(255,204,85,.55);
  cursor: pointer; transition: transform .12s; }
#homeUi .lineupSlot:active { transform: scale(.94); }
#homeUi .lineupSlot.empty { border-style: dashed; border-color: rgba(120,150,170,.4); cursor: default;
  display: flex; align-items: center; justify-content: center; font-size: calc(64px * var(--hs,1)); color: rgba(143,160,171,.5); }
#homeUi .lineupTip { margin-top: calc(14px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); color: #8fa0ab; }
#homeUi .heroDetail { display: flex; align-items: stretch; gap: calc(14px * var(--hs,1)); margin-top: calc(20px * var(--hs,1));
  width: 100%; max-width: calc(920px * var(--hs,1)); }
#homeUi .heroArrow { flex: none; width: calc(70px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(56px * var(--hs,1)); color: #ffd76a; cursor: pointer; user-select: none;
  text-shadow: 0 calc(3px * var(--hs,1)) 0 rgba(0,0,0,.6); }
#homeUi .heroArrow:active { opacity: .6; }
#homeUi .heroDetailBody { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: flex-start; gap: calc(24px * var(--hs,1));
  padding: calc(20px * var(--hs,1)); border-radius: calc(16px * var(--hs,1));
  background: rgba(10,18,26,.72); border: calc(2px * var(--hs,1)) solid rgba(120,150,170,.25); }
#homeUi .heroDetailBody.col { flex-direction: column; flex-wrap: nowrap; }
/* ---- 角色页：完全复刻装备界面 HTML 稿 ---- */
#homeUi .heroDetailBody { background: linear-gradient(180deg, #3a2c1c 0%, #241a10 40%, #1a120b 100%);
  border: none; border-radius: 0; padding: 0; gap: 0; }
#homeUi .heroDetailBody.col { flex-direction: column; flex-wrap: nowrap; }
/* ===== 角色展示区 stage ===== */
#homeUi .heroStage { position: relative; width: 100%; height: calc(600px * var(--hs,1)); flex: none; }
#homeUi .heroAvatarBox { position: absolute; top: calc(4px * var(--hs,1)); left: calc(20px * var(--hs,1)); z-index: 5;
  display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .heroFace { position: relative; width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); border-radius: 50%;
  border: calc(4px * var(--hs,1)) solid #f5a623; background: linear-gradient(135deg, #c98850, #7a4a22) center / contain no-repeat; }
#homeUi .heroFace.locked { filter: grayscale(1) brightness(.55); }
#homeUi .heroLvBadge { position: absolute; top: calc(-8px * var(--hs,1)); left: calc(-12px * var(--hs,1));
  background: linear-gradient(180deg, #ffd86b, #e0891f); color: #5a2d00; font-size: calc(22px * var(--hs,1)); font-weight: 800;
  padding: calc(1px * var(--hs,1)) calc(12px * var(--hs,1)); border-radius: calc(20px * var(--hs,1)) calc(20px * var(--hs,1)) calc(20px * var(--hs,1)) calc(4px * var(--hs,1));
  border: calc(2px * var(--hs,1)) solid #8a5a10; }
#homeUi .heroNamePlate { background: rgba(0,0,0,.5); color: #ffd98a; font-size: calc(24px * var(--hs,1));
  padding: calc(2px * var(--hs,1)) calc(14px * var(--hs,1)); border-radius: calc(6px * var(--hs,1));
  border: calc(2px * var(--hs,1)) solid #6b5433; }
#homeUi .heroRoleBadge { position: absolute; top: calc(112px * var(--hs,1)); left: calc(16px * var(--hs,1)); z-index: 5;
  background: linear-gradient(180deg, #4a90d9, #2a5a9e); color: #fff;
  font-size: calc(20px * var(--hs,1)); padding: calc(3px * var(--hs,1)) calc(12px * var(--hs,1)); border-radius: calc(6px * var(--hs,1)); }
#homeUi .heroSideBtns { position: absolute; left: calc(24px * var(--hs,1)); top: calc(190px * var(--hs,1));
  display: flex; flex-direction: column; gap: calc(24px * var(--hs,1)); z-index: 5; }
#homeUi .heroCircleBtn { width: calc(92px * var(--hs,1)); height: calc(92px * var(--hs,1)); border-radius: 50%;
  background: rgba(0,0,0,.45); border: calc(4px * var(--hs,1)) solid #8a6a3a; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(2px * var(--hs,1)); }
#homeUi .heroCircleBtn .ic { font-size: calc(36px * var(--hs,1)); line-height: 1; }
#homeUi .heroCircleBtn .tx { font-size: calc(20px * var(--hs,1)); color: #ffd98a; }
#homeUi .heroCircleBtn.dim { opacity: .4; }
#homeUi .heroCircleBtn:active { transform: scale(.94); }
#homeUi .heroCharModel { position: absolute; left: 50%; top: calc(12px * var(--hs,1)); transform: translateX(-58%); z-index: 2;
  width: calc(300px * var(--hs,1)); height: calc(480px * var(--hs,1)); cursor: pointer;
  background: radial-gradient(ellipse at 50% 30%, rgba(120,90,50,.35), transparent 70%) top / 100% 55% no-repeat,
    center calc(30%) / contain no-repeat;
  filter: drop-shadow(0 calc(8px * var(--hs,1)) calc(10px * var(--hs,1)) rgba(0,0,0,.6)); }
#homeUi .heroCharModel.locked { filter: grayscale(1) brightness(.55); }
#homeUi .heroWpnSlot { position: absolute; right: calc(236px * var(--hs,1)); top: calc(60px * var(--hs,1)); z-index: 5;
  width: calc(96px * var(--hs,1)); text-align: center; cursor: pointer; }
#homeUi .heroWpnIco { width: calc(76px * var(--hs,1)); height: calc(84px * var(--hs,1)); margin: 0 auto;
  background: linear-gradient(180deg, #7ed957, #3a8a2a); clip-path: polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%);
  border: calc(2px * var(--hs,1)) solid #cfe; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; font-size: calc(36px * var(--hs,1)); }
#homeUi .heroWpnStep { margin-top: calc(4px * var(--hs,1)); background: rgba(0,0,0,.55); color: #cfe;
  font-size: calc(20px * var(--hs,1)); padding: calc(1px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(6px * var(--hs,1)); display: inline-block; }
#homeUi .heroWpnCost { font-size: calc(18px * var(--hs,1)); color: #ffd76a; margin-top: calc(2px * var(--hs,1)); }
#homeUi .heroGemBtn { position: absolute; right: calc(256px * var(--hs,1)); top: calc(220px * var(--hs,1)); z-index: 5;
  display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--hs,1)); cursor: pointer; }
#homeUi .heroGemLines { font-size: calc(40px * var(--hs,1)); color: #9ab; letter-spacing: calc(-4px * var(--hs,1)); line-height: 1; }
#homeUi .heroGemTx { background: rgba(0,0,0,.5); color: #cde; font-size: calc(20px * var(--hs,1));
  padding: calc(1px * var(--hs,1)) calc(12px * var(--hs,1)); border-radius: calc(6px * var(--hs,1)); }
#homeUi .heroEquipPanel { position: absolute; right: calc(20px * var(--hs,1)); top: calc(48px * var(--hs,1)); z-index: 5;
  display: grid; grid-template-columns: repeat(2, calc(132px * var(--hs,1))); grid-auto-rows: calc(148px * var(--hs,1));
  gap: calc(16px * var(--hs,1)); }
#homeUi .heroEquipCell { background: linear-gradient(180deg, #5a4a30, #3a2c18);
  border: calc(4px * var(--hs,1)) solid #8a6a3a; border-radius: calc(12px * var(--hs,1));
  position: relative; padding: calc(6px * var(--hs,1)); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(4px * var(--hs,1)); }
#homeUi .heroEquipCell:active { transform: scale(.96); }
#homeUi .heroEquipCell .step { position: absolute; top: calc(4px * var(--hs,1)); left: calc(4px * var(--hs,1)); z-index: 2;
  background: linear-gradient(180deg, #ffd86b, #e0891f); color: #5a2d00; font-size: calc(18px * var(--hs,1));
  padding: calc(0px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(6px * var(--hs,1)); font-weight: 700; }
#homeUi .heroEquipCell .ico { font-size: calc(64px * var(--hs,1)); line-height: 1; filter: drop-shadow(0 calc(2px * var(--hs,1)) calc(3px * var(--hs,1)) rgba(0,0,0,.5)); }
#homeUi .heroEquipCell .ico.dim { opacity: .4; }
#homeUi .heroEquipCell .lvtx { text-align: center; color: #ffe9b8; font-size: calc(18px * var(--hs,1)); line-height: 1.2; }
#homeUi .heroEquipCell .lvtx.dim { color: #6b7d88; }
#homeUi .heroEquipCell .stars { position: absolute; bottom: calc(4px * var(--hs,1)); left: calc(6px * var(--hs,1)); right: calc(6px * var(--hs,1));
  display: flex; gap: calc(2px * var(--hs,1)); justify-content: center; }
#homeUi .gemDot { width: calc(12px * var(--hs,1)); height: calc(12px * var(--hs,1)); border-radius: calc(3px * var(--hs,1)); transform: rotate(45deg); }
#homeUi .heroFlameBadge { position: absolute; left: 50%; bottom: calc(56px * var(--hs,1)); transform: translateX(-90%); z-index: 5;
  display: flex; align-items: center; gap: calc(8px * var(--hs,1));
  background: linear-gradient(180deg, #3a2a1a, #241808); border: calc(4px * var(--hs,1)) solid #c8862a;
  border-radius: calc(999px * var(--hs,1)); padding: calc(4px * var(--hs,1)) calc(28px * var(--hs,1)) calc(4px * var(--hs,1)) calc(14px * var(--hs,1)); }
#homeUi .heroFlameBadge .fire { font-size: calc(40px * var(--hs,1)); filter: drop-shadow(0 0 calc(6px * var(--hs,1)) #f80); line-height: 1; }
#homeUi .heroFlameBadge b { color: #ffe9b8; font-size: calc(34px * var(--hs,1)); font-variant-numeric: tabular-nums; }
#homeUi .heroFlameBadge .infoI { font-style: italic; font-weight: 700; font-size: calc(22px * var(--hs,1)); color: #fff;
  background: #c8862a; border-radius: 50%; width: calc(26px * var(--hs,1)); height: calc(26px * var(--hs,1));
  line-height: calc(26px * var(--hs,1)); text-align: center; margin-left: calc(4px * var(--hs,1)); }
#homeUi .heroLockTip { position: absolute; right: calc(20px * var(--hs,1)); top: calc(120px * var(--hs,1)); z-index: 5;
  width: calc(280px * var(--hs,1)); text-align: center; color: #8fa0ab; font-size: calc(24px * var(--hs,1)); }
/* ===== 方案 & 锻造行 ===== */
#homeUi .heroPlanRow { width: 100%; display: flex; align-items: center; gap: calc(10px * var(--hs,1));
  padding: calc(6px * var(--hs,1)) calc(20px * var(--hs,1)) calc(14px * var(--hs,1)); flex: none; }
#homeUi .heroPlanTab { min-width: calc(56px * var(--hs,1)); height: calc(56px * var(--hs,1)); border-radius: calc(28px * var(--hs,1));
  padding: 0 calc(14px * var(--hs,1)); background: rgba(0,0,0,.5); border: calc(2px * var(--hs,1)) solid #6b5433;
  color: #cbb387; font-size: calc(24px * var(--hs,1)); display: flex; align-items: center; justify-content: center; }
#homeUi .heroPlanTab.active { background: linear-gradient(180deg, #ffd86b, #e0891f); color: #5a2d00;
  font-weight: 700; border-color: #8a5a10; }
#homeUi .heroForgeBtn { margin-left: auto; height: calc(64px * var(--hs,1)); padding: 0 calc(30px * var(--hs,1));
  border-radius: calc(32px * var(--hs,1)); background: linear-gradient(180deg, #ffd86b, #e0891f);
  border: calc(3px * var(--hs,1)) solid #8a5a10; color: #5a2d00; font-weight: 700; font-size: calc(26px * var(--hs,1));
  display: flex; align-items: center; cursor: pointer; position: relative;
  box-shadow: 0 calc(4px * var(--hs,1)) calc(8px * var(--hs,1)) rgba(0,0,0,.4); }
#homeUi .heroForgeBtn.dim { opacity: .6; }
#homeUi .heroForgeBtn:active { transform: translateY(calc(2px * var(--hs,1))); }
/* ===== 背包标题行 ===== */
#homeUi .heroBagHead { width: 100%; display: flex; align-items: center; gap: calc(14px * var(--hs,1));
  padding: calc(4px * var(--hs,1)) calc(24px * var(--hs,1)) calc(12px * var(--hs,1)); flex: none; }
#homeUi .heroBagTitle { color: #ffd98a; font-size: calc(28px * var(--hs,1)); font-weight: 700; }
#homeUi .heroBagFilter { flex: 1; height: calc(56px * var(--hs,1)); border-radius: calc(28px * var(--hs,1));
  background: rgba(0,0,0,.5); border: calc(2px * var(--hs,1)) solid #6b5433; color: #cbb387;
  display: flex; align-items: center; justify-content: center; font-size: calc(24px * var(--hs,1)); }
#homeUi .heroBagMerge { height: calc(58px * var(--hs,1)); padding: 0 calc(24px * var(--hs,1)); border-radius: calc(29px * var(--hs,1));
  background: linear-gradient(180deg, #ffd86b, #e0891f); border: calc(3px * var(--hs,1)) solid #8a5a10;
  color: #5a2d00; font-weight: 700; font-size: calc(24px * var(--hs,1)); display: flex; align-items: center; cursor: pointer; position: relative; }
#homeUi .heroBagMerge::after { content: ""; position: absolute; top: calc(-4px * var(--hs,1)); right: calc(-4px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: #e33; }
/* ===== 六列背包网格 ===== */
#homeUi .heroBagGrid { width: 100%; flex: 1; min-height: calc(300px * var(--hs,1)); overflow-y: auto;
  padding: calc(8px * var(--hs,1)) calc(18px * var(--hs,1)); display: grid; grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: calc(104px * var(--hs,1)); gap: calc(10px * var(--hs,1)); background: rgba(0,0,0,.25);
  align-content: start; }
#homeUi .heroBagCell { border-radius: calc(8px * var(--hs,1)); position: relative; cursor: pointer;
  border: calc(3px * var(--hs,1)) solid #4a3a24;
  display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1)); }
#homeUi .heroBagCell:active { transform: scale(.94); }
#homeUi .heroBagCell .slotIc { opacity: .95; }
#homeUi .heroBagCell .cnt { position: absolute; bottom: calc(2px * var(--hs,1)); right: calc(6px * var(--hs,1));
  color: #ffe9b8; font-size: calc(18px * var(--hs,1)); text-shadow: 0 calc(1px * var(--hs,1)) calc(2px * var(--hs,1)) #000; }
#homeUi .heroBagEmpty { grid-column: 1 / -1; text-align: center; color: #8fa0ab; font-size: calc(24px * var(--hs,1));
  padding: calc(40px * var(--hs,1)) 0; }
/* ===== 分类标签 ===== */
#homeUi .heroCatTabs { width: 100%; display: flex; padding: calc(10px * var(--hs,1)) calc(18px * var(--hs,1)) calc(14px * var(--hs,1));
  gap: calc(4px * var(--hs,1)); flex: none; }
#homeUi .heroCat { flex: 1; text-align: center; padding: calc(12px * var(--hs,1)) 0; font-size: calc(26px * var(--hs,1));
  color: #cbb387; position: relative; border-radius: calc(14px * var(--hs,1)) calc(14px * var(--hs,1)) 0 0;
  background: rgba(0,0,0,.35); border: calc(2px * var(--hs,1)) solid #4a3a24; border-bottom: none; }
#homeUi .heroCat.active { background: linear-gradient(180deg, #e8a93a, #b5761f); color: #fff8e8;
  font-weight: 700; box-shadow: 0 calc(-2px * var(--hs,1)) calc(6px * var(--hs,1)) rgba(0,0,0,.4); }
#homeUi .heroCat .dot { position: absolute; top: calc(4px * var(--hs,1)); right: calc(10px * var(--hs,1));
  width: calc(14px * var(--hs,1)); height: calc(14px * var(--hs,1)); border-radius: 50%; background: #e33; }
#homeUi .heroAvatar { width: calc(110px * var(--hs,1)); height: calc(110px * var(--hs,1)); flex: none; border-radius: calc(12px * var(--hs,1));
  background: rgba(255,255,255,.06) center / contain no-repeat; }
#homeUi .heroAvatar.detail { width: calc(220px * var(--hs,1)); height: calc(240px * var(--hs,1)); cursor: pointer; }
#homeUi .heroAvatar.locked { filter: grayscale(1) brightness(.55); }
#homeUi .heroAvatar.shop { width: calc(84px * var(--hs,1)); height: calc(84px * var(--hs,1)); }
#homeUi .heroShopBox { display: flex; flex-direction: column; gap: calc(16px * var(--hs,1)); width: 100%;
  max-width: calc(900px * var(--hs,1)); }
#homeUi .heroInfo { flex: 1; min-width: calc(300px * var(--hs,1)); }
#homeUi .heroName { font-size: calc(36px * var(--hs,1)); font-weight: 800; color: #ecf1f1; }
#homeUi .heroRole { font-size: calc(26px * var(--hs,1)); color: #8fa0ab; margin-top: calc(4px * var(--hs,1)); }
#homeUi .heroCardBtn { flex: none; border: none; border-radius: calc(12px * var(--hs,1)); cursor: pointer;
  padding: calc(12px * var(--hs,1)) calc(26px * var(--hs,1)); font-size: calc(28px * var(--hs,1)); font-weight: 800;
  color: #062028; background: linear-gradient(180deg, #ffe9a8, #e8a027); }
#homeUi .heroCardBtn:active { transform: translateY(calc(2px * var(--hs,1))); }
#homeUi .heroCardBtn.cyan { background: linear-gradient(180deg, #b3f0ff, #4db8dd); }
#homeUi .heroLv { font-size: calc(26px * var(--hs,1)); color: #ffd76a; margin-top: calc(4px * var(--hs,1)); }
#homeUi .heroBtnCol { flex: none; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .heroShowcase { flex: none; width: calc(340px * var(--hs,1)); display: flex; flex-direction: column; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .heroAvatar.inLineup { border: calc(3px * var(--hs,1)) solid rgba(255,204,85,.8); }
#homeUi .equipSectionLab { width: 100%; font-size: calc(28px * var(--hs,1)); color: #8fa0ab; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .equipSlots { display: flex; flex-direction: column; gap: calc(14px * var(--hs,1)); width: 100%; }
#homeUi .equipRow { display: flex; align-items: center; gap: calc(18px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(20px * var(--hs,1));
  border-radius: calc(14px * var(--hs,1)); background: rgba(6,12,18,.6); border: calc(2px * var(--hs,1)) solid rgba(120,150,170,.2); }
#homeUi .equipInfo { flex: 1; min-width: 0; }
#homeUi .equipName { font-size: calc(30px * var(--hs,1)); font-weight: 700; }
#homeUi .equipStat { font-size: calc(26px * var(--hs,1)); color: #8fa0ab; margin-top: calc(4px * var(--hs,1)); }

/* ---- 核心页：技能升级三卡 ---- */
#homeUi .abilityCards { width: 100%; max-width: calc(920px * var(--hs,1)); display: grid;
  grid-template-columns: 1fr 1fr 1fr; gap: calc(18px * var(--hs,1)); align-content: start;
  flex: 1; min-height: 0; overflow-y: auto; padding: calc(4px * var(--hs,1)) calc(2px * var(--hs,1)); }
#homeUi .abilityCard { display: flex; flex-direction: column; align-items: center; gap: calc(8px * var(--hs,1));
  border-radius: calc(14px * var(--hs,1)); background: rgba(6,12,18,.72);
  border: calc(3px * var(--hs,1)) solid rgba(120,150,170,.35); padding: calc(16px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .abilityIconWin { width: calc(120px * var(--hs,1)); height: calc(120px * var(--hs,1)); flex: none;
  border-radius: 50%; background: rgba(255,255,255,.08) center / 72% no-repeat;
  border: calc(4px * var(--hs,1)) solid rgba(255,204,85,.55);
  box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(255,204,85,.25) inset; }
#homeUi .abilityName { font-size: calc(28px * var(--hs,1)); font-weight: 800; color: #ecf1f1; }
#homeUi .abilityLv { font-size: calc(24px * var(--hs,1)); color: #ffd76a; }
#homeUi .abilityDesc { font-size: calc(20px * var(--hs,1)); color: #8fa0ab; text-align: center;
  line-height: 1.35; min-height: calc(56px * var(--hs,1)); }

/* ---- 编队按钮与弹出面板 ---- */
#homeUi .lineupOpen { margin-top: calc(20px * var(--hs,1)); min-width: calc(360px * var(--hs,1));
  padding: calc(18px * var(--hs,1)) calc(50px * var(--hs,1)); border-radius: calc(16px * var(--hs,1)); cursor: pointer;
  font-size: calc(32px * var(--hs,1)); font-weight: 800; color: #062028; letter-spacing: calc(3px * var(--hs,1));
  border: none; filter: drop-shadow(0 calc(5px * var(--hs,1)) 0 rgba(0,0,0,.4));
  background: linear-gradient(180deg, #b3f0ff, #4db8dd); }
#homeUi .lineupOpen:active { transform: translateY(calc(3px * var(--hs,1))); }
#homeUi .lineupPanelOverlay { position: fixed; inset: 0; z-index: 9200; display: flex; align-items: center; justify-content: center;
  background: rgba(2,6,10,.85); pointer-events: auto; }
#homeUi .lineupPanelCard { display: flex; flex-direction: column; align-items: center; gap: calc(24px * var(--hs,1));
  width: calc(960px * var(--hs,1)); max-height: 86vh; overflow-y: auto; padding: calc(36px * var(--hs,1));
  border-radius: calc(22px * var(--hs,1)); background: linear-gradient(180deg, #17222c, #0c141c);
  border: calc(3px * var(--hs,1)) solid rgba(255,204,85,.5); box-shadow: 0 calc(16px * var(--hs,1)) 0 rgba(0,0,0,.5); }
#homeUi .lineupPanelTitle { font-size: calc(48px * var(--hs,1)); font-weight: 800; color: #ffd76a; letter-spacing: calc(6px * var(--hs,1)); }
#homeUi .lineupRow.center { justify-content: center; }
#homeUi .lineupPool { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(20px * var(--hs,1)); width: 100%; }
#homeUi .lineupPoolItem { width: calc(170px * var(--hs,1)); height: calc(200px * var(--hs,1)); border-radius: calc(16px * var(--hs,1));
  background: rgba(10,18,26,.72) center / contain no-repeat; border: calc(3px * var(--hs,1)) solid rgba(120,150,170,.35);
  cursor: pointer; position: relative; transition: transform .12s; }
#homeUi .lineupPoolItem:active { transform: scale(.94); }
#homeUi .lineupPoolItem.active { border-color: rgba(255,204,85,.85); box-shadow: 0 0 calc(16px * var(--hs,1)) rgba(255,204,85,.35); }
#homeUi .lineupPoolName { position: absolute; left: 0; right: 0; bottom: calc(6px * var(--hs,1)); text-align: center;
  font-size: calc(24px * var(--hs,1)); color: #ecf1f1; text-shadow: 0 calc(2px * var(--hs,1)) 0 rgba(0,0,0,.8); }
#homeUi .lineupClose { align-self: center; }
`;
        document.head.appendChild(style);
    }
}
