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
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, WEAPON_CORE_DEFS, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot, BagItem } from '../core/HeroSystem';
import { HERO_DEFS, ABILITY_LEVEL_DMG_BONUS } from '../battle/HeroDef';
import { STAGES, FINAL_STAGE_ID, stageInfo } from '../battle/StageData';

/** 看广告单次发放体力 */
const MALL_AD_STAMINA = 10;

/** 六槽部位图标（原型图 emoji 风格） */
const SLOT_EMOJI: Record<EquipSlot, string> = {
    head: '🪖', body: '🛡️', legs: '🦵', gloves: '🧤', wrist: '💪', shoes: '🥾',
};

/** 章节主题（对应 STAGES 五关的场景表现：场景渐变/载具 emoji/怪物 emoji） */
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
@ccclass('HomeUi')
export class HomeUi extends Component {
    private static _styleInjected = false;

    private _root: HTMLDivElement | null = null;
    private _pages: Record<string, HTMLDivElement> = {};
    private _navBtns: Record<string, HTMLButtonElement> = {};
    /** 顶栏资源胶囊数值元素 */
    private _topRes: Partial<Record<'gold' | 'diamond' | 'stamina', HTMLElement>> = {};
    /** 顶栏经验条与文案 */
    private _expFill: HTMLElement | null = null;
    private _expNum: HTMLDivElement | null = null;
    /** 关卡页动态元素 */
    private _stageTabsEl: HTMLDivElement | null = null;
    private _lvlTrackEl: HTMLDivElement | null = null;
    private _sceneEl: HTMLDivElement | null = null;
    private _sceneChipEl: HTMLDivElement | null = null;
    private _vehEl: HTMLDivElement | null = null;
    private _mobsEl: HTMLDivElement | null = null;
    private _siLvlEl: HTMLElement | null = null;
    private _siPowEl: HTMLElement | null = null;
    private _siStEl: HTMLElement | null = null;
    private _chestsEl: HTMLDivElement | null = null;
    private _arrowL: HTMLDivElement | null = null;
    private _arrowR: HTMLDivElement | null = null;
    /** 英雄页 */
    private _heroPickEl: HTMLDivElement | null = null;
    private _heroBodyEl: HTMLDivElement | null = null;
    private _heroSelIdx = 0;
    /** 技能页 */
    private _skillPickEl: HTMLDivElement | null = null;
    private _skillListEl: HTMLDivElement | null = null;
    private _skillSelIdx = 0;
    /** 基地页强化行（迁移自战斗页的 META_UPGRADES） */
    private _baseRows: Array<{ def: (typeof META_UPGRADES)[number]; lv: HTMLElement; eff: HTMLDivElement; btn: HTMLButtonElement; cost: HTMLElement }> = [];
    /** 商城页 */
    private _mallResEls: Partial<Record<'gold' | 'diamond' | 'stamina', HTMLDivElement>> = {};
    private _mallTabsEl: HTMLDivElement | null = null;
    private _mallGridEl: HTMLDivElement | null = null;
    private _mallTab: 'hero' | 'equip' | 'gem' | 'mat' | 'ad' = 'hero';
    private _mallAdBtn: HTMLButtonElement | null = null;
    private _mallAdLab: HTMLDivElement | null = null;
    /** 模拟广告层 */
    private _adOverlay: HTMLDivElement | null = null;
    private _adCountdown: HTMLDivElement | null = null;
    private _adTimer = 0;
    /** 贴图挂起队列：AssetLib 异步就绪后补挂 */
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

    private _heroWeaponName(id: string): string {
        const def = HERO_DEFS.find(d => d.id === id);
        if (!def) {
            return '';
        }
        return def.weapon === 'rifle' ? '步枪' : def.weapon === 'sniper' ? '狙击' : def.weapon === 'laser' ? '激光' : '辐射';
    }

    /** 英雄战力（与旧版口径一致：基础攻击 × 总乘区 × 10） */
    private _heroPower(id: string): number {
        const def = HERO_DEFS.find(d => d.id === id);
        if (!def) {
            return 0;
        }
        return Math.round(def.atk * HeroSystem.instance.atkMulOf(id) * 10);
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
            this._refreshTop();
            this._refreshMall();
            this._refreshHeroes();
            this._refreshStagePage();
        }, this);
        // 流程状态机驱动主城显隐：state==='home' 显示，其余隐藏
        eventCenter.on(GameEvent.FLOW_CHANGED, (from: string, to: string) => {
            if (to === 'home') {
                this.show();
            } else {
                this.hide();
            }
        }, this);
        eventCenter.on(GameEvent.HOME_SHOW, () => this.show(), this);
        this.show();
    }

    onDestroy(): void {
        this._root?.remove();
        this._root = null;
    }

    private show(): void {
        if (this._root) {
            this._root.style.display = 'flex';
            this._refreshAll();
        }
    }

    private hide(): void {
        this._root && (this._root.style.display = 'none');
    }

    private _refreshAll(): void {
        this._refreshTop();
        this._refreshStagePage();
        this._refreshMall();
        this._refreshHeroes();
        this._refreshSkillPage();
        this._refreshBase();
        this._applyPendingTex();
    }

    private _startBattle(): void {
        if (!this._root) {
            return;
        }
        // 守卫（体力/解锁）与开波统一走流程状态机；失败回滚显示防止黑屏
        if (!GameFlow.instance.startRun()) {
            this._refreshAll();
            return;
        }
        this.hide();
    }

    /** 关卡页关卡切换：只在已解锁范围（1 ~ stageCleared+1）内移动 */
    private _switchStage(dir: number): void {
        const gm = GameManager.instance;
        const maxUnlocked = Math.min(FINAL_STAGE_ID, gm.stageCleared + 1);
        const next = Math.min(maxUnlocked, Math.max(1, gm.currentStage + dir));
        if (next !== gm.currentStage) {
            gm.currentStage = next;
            gm.save();
            this._refreshStagePage();
        }
    }

    private _toast(msg: string): void {
        if (!this._root) {
            return;
        }
        document.querySelector('#homeUi .toastEl')?.remove();
        const t = document.createElement('div');
        t.className = 'toastEl';
        t.textContent = msg;
        this._root.appendChild(t);
        setTimeout(() => {
            t.classList.add('show');
            setTimeout(() => t.remove(), 1800);
        }, 10);
    }

    /** 原型风弹窗：mask + mbox frame（英雄核心/武器强化/背包共用） */
    private _openModal(title: string, buildBody: (box: HTMLDivElement, close: () => void) => void): void {
        if (!this._root || document.querySelector('#homeUi .protoMask')) {
            return;
        }
        const mask = document.createElement('div');
        mask.className = 'protoMask';
        mask.onclick = (e) => {
            e.stopPropagation();
            if (e.target === mask) {
                mask.remove();
            }
        };
        const box = document.createElement('div');
        box.className = 'mbox frame';
        box.onclick = (e) => e.stopPropagation();
        const head = document.createElement('div');
        head.className = 'mHead';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const x = document.createElement('button');
        x.className = 'mClose';
        x.textContent = '✕';
        x.onclick = (e) => {
            e.stopPropagation();
            mask.remove();
        };
        head.appendChild(h3);
        head.appendChild(x);
        box.appendChild(head);
        const close = () => mask.remove();
        buildBody(box, close);
        mask.appendChild(box);
        this._root.appendChild(mask);
    }

    // ================= 顶栏（全局） =================

    /** 顶栏：玩家头像 + 名牌/等级/经验条 + 三资源胶囊（金币/钻石/体力） */
    private _buildTopbar(root: HTMLDivElement): void {
        const bar = document.createElement('div');
        bar.className = 'topbar';
        const avatar = document.createElement('div');
        avatar.className = 'pAvatar';
        const face = document.createElement('div');
        face.textContent = '🎖️';
        avatar.appendChild(face);
        bar.appendChild(avatar);
        const info = document.createElement('div');
        info.className = 'pinfo';
        const nameRow = document.createElement('div');
        nameRow.className = 'pname';
        nameRow.appendChild(document.createTextNode('末日指挥官'));
        const lvtag = document.createElement('span');
        lvtag.className = 'lvtag';
        lvtag.textContent = 'LV.12';
        nameRow.appendChild(lvtag);
        const exp = document.createElement('div');
        exp.className = 'expbar';
        const fill = document.createElement('i');
        exp.appendChild(fill);
        const expnum = document.createElement('div');
        expnum.className = 'expnum';
        info.appendChild(nameRow);
        info.appendChild(exp);
        info.appendChild(expnum);
        bar.appendChild(info);
        this._expFill = fill;
        this._expNum = expnum;
        const reswrap = document.createElement('div');
        reswrap.className = 'reswrap';
        const mkRes = (id: 'gold' | 'diamond' | 'stamina', ico: string) => {
            const chip = document.createElement('div');
            chip.className = 'res';
            chip.appendChild(document.createTextNode(ico + ' '));
            const b = document.createElement('b');
            chip.appendChild(b);
            const add = document.createElement('span');
            add.className = 'add';
            add.textContent = '+';
            add.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._switchPage('mall');
            };
            chip.appendChild(add);
            reswrap.appendChild(chip);
            this._topRes[id] = b;
        };
        mkRes('gold', '🪙');
        mkRes('diamond', '💎');
        mkRes('stamina', '🍖');
        bar.appendChild(reswrap);
        root.appendChild(bar);
    }

    private _refreshTop(): void {
        const gm = GameManager.instance;
        const gold = this._topRes.gold;
        const diamond = this._topRes.diamond;
        const stamina = this._topRes.stamina;
        if (gold) {
            gold.textContent = gm.gold >= 10000 ? `${(gm.gold / 10000).toFixed(1)}万` : String(gm.gold);
        }
        if (diamond) {
            diamond.textContent = String(gm.res.get('diamond'));
        }
        if (stamina) {
            stamina.textContent = `${gm.stamina()}/${BattleConfig.STAMINA_MAX}`;
        }
        // 经验条（占位口径：最远波次 / 100）
        if (this._expFill) {
            const pct = Math.min(100, Math.round(gm.bestWave));
            this._expFill.style.width = `${Math.max(5, pct)}%`;
        }
        if (this._expNum) {
            this._expNum.textContent = `最远波次 ${gm.bestWave} · 已通关 ${gm.stageCleared}/${FINAL_STAGE_ID} 章`;
        }
    }

    // ================= 底部导航 =================

    private _buildNav(root: HTMLDivElement): void {
        const nav = document.createElement('div');
        nav.className = 'tabbar';
        const NAV: Array<{ key: string; icon: string; name: string; main?: boolean }> = [
            { key: 'mall', icon: '🛒', name: '商店' },
            { key: 'heroes', icon: '🎖️', name: '英雄' },
            { key: 'battle', icon: '🚚', name: '关卡', main: true },
            { key: 'core', icon: '⚡', name: '技能' },
            { key: 'base', icon: '🏰', name: '基地' },
        ];
        for (const item of NAV) {
            const btn = document.createElement('button');
            btn.className = 'tab' + (item.main ? ' main' : '') + (item.key === 'battle' ? ' on' : '');
            const icon = document.createElement('span');
            icon.className = 'ticon';
            icon.textContent = item.icon;
            const label = document.createElement('span');
            label.textContent = item.name;
            btn.appendChild(icon);
            btn.appendChild(label);
            btn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._switchPage(item.key);
            };
            const texKey = item.key === 'mall' ? 'ui/nav_mall' : item.key === 'heroes' ? 'ui/nav_heroes'
                : item.key === 'battle' ? 'ui/nav_battle' : item.key === 'core' ? 'ui/nav_core' : 'ui/nav_base';
            this._tex(texKey, u => {
                icon.style.backgroundImage = u;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = 'calc(46px * var(--hs,1))';
                icon.style.height = 'calc(46px * var(--hs,1))';
                icon.textContent = '';
            });
            nav.appendChild(btn);
            this._navBtns[item.key] = btn;
        }
        root.appendChild(nav);
    }

    private _switchPage(page: string): void {
        for (const key of Object.keys(this._pages)) {
            this._pages[key].style.display = key === page ? 'block' : 'none';
        }
        for (const key of Object.keys(this._navBtns)) {
            this._navBtns[key].classList.toggle('on', key === page);
        }
        if (page === 'battle') {
            this._refreshStagePage();
        }
        if (page === 'mall') {
            this._refreshMall();
        }
        if (page === 'heroes') {
            this._refreshHeroes();
        }
        if (page === 'core') {
            this._refreshSkillPage();
        }
        if (page === 'base') {
            this._refreshBase();
        }
        this._refreshTop();
        this._applyPendingTex();
    }

    // ================= 构建入口 =================

    private _build(): void {
        const root = document.createElement('div');
        root.id = 'homeUi';
        this._root = root;

        this._buildTopbar(root);

        const viewport = document.createElement('div');
        viewport.className = 'viewport';
        root.appendChild(viewport);

        this._buildMallPage(viewport);
        this._buildHeroesPage(viewport);
        this._buildStagePage(viewport);
        this._buildSkillPage(viewport);
        this._buildBasePage(viewport);

        this._buildNav(root);
        this._buildAdOverlay(root);

        const stamp = document.createElement('div');
        stamp.className = 'homeStamp';
        stamp.textContent = BUILD_STAMP;
        root.appendChild(stamp);

        document.body.appendChild(root);
        this._switchPage('battle');
    }

    // ================= 商店页 =================

    /** 商店页：礼包 banner + 四页签（英雄/装备/宝石/材料）+ 广告补给 + 双列商品网格 */
    private _buildMallPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.mall = page;

        // 限时礼包 banner（装饰，点击 toast）
        const banner = document.createElement('div');
        banner.className = 'shopBanner frame';
        banner.innerHTML = `<div class="sbTxt"><h3>末日启程 · 超值礼包</h3>` +
            `<p>自选超能力英雄 + 680钻石</p>` +
            `<div class="price">💎 3,280 <s>💎 6,880</s></div></div>` +
            `<div class="sbGift">🎁</div>` +
            `<div class="sbTime">⏰ 限时特惠</div>`;
        banner.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._toast('礼包系统即将开放，敬请期待');
        };
        page.appendChild(banner);

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

    private _setMallTab(tab: 'hero' | 'equip' | 'gem' | 'mat'): void {
        this._mallTab = tab;
        this._refreshMall();
    }

    /** 商店页刷新：页签高亮 + 商品网格重绘（真数据：英雄解锁/装备部件/强化材料占位/广告） */
    private _refreshMall(): void {
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
                        r: def.tier <= 1 ? 2 : def.tier === 2 ? 3 : def.tier === 3 ? 4 : 5,
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
                    r: core.tier <= 1 ? 3 : core.tier === 2 ? 4 : 5,
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
            // 材料页签 = 商城道具（ShopData）+ 体力广告卡
            for (const item of ShopData.ITEMS) {
                const RES_NAME = { gold: '🪙', diamond: '💎', stamina: '🍖' } as const;
                mkGood({
                    ic: item.grant.res === 'stamina' ? '🍖' : item.grant.res === 'gold' ? '🪙' : '💎',
                    name: item.name, tag: item.desc,
                    price: `${RES_NAME[item.price.res]} ${item.price.amount.toLocaleString()}`,
                    r: 3,
                    disabled: !gm.res.canSpend(item.price.res, item.price.amount)
                        || (item.grant.res === 'stamina' && gm.stamina() >= BattleConfig.STAMINA_MAX)
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
            const full = gm.stamina() >= BattleConfig.STAMINA_MAX;
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

    private _buyShopItem(item: ShopItem): void {
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

    // ================= 英雄页 =================

    /** 英雄页：英雄横滑选择条 + 详情（由 _refreshHeroes 整块重建） */
    private _buildHeroesPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.heroes = page;
        const pick = document.createElement('div');
        pick.className = 'heroPick';
        page.appendChild(pick);
        this._heroPickEl = pick;
        const body = document.createElement('div');
        page.appendChild(body);
        this._heroBodyEl = body;
        root.appendChild(page);
    }

    private _pickHero(i: number): void {
        const gm = GameManager.instance;
        const def = HERO_DEFS[i % HERO_DEFS.length];
        if (!gm.isHeroOwned(def.id)) {
            this._toast(`「${def.name}」尚未获得 · 可在商店解锁`);
            return;
        }
        this._heroSelIdx = i;
        this._refreshHeroes();
    }

    /** 英雄页刷新：横滑选择条 + 头牌/战力 + 左右三槽夹立绘 + 三维 + 升级/核心/武器/背包 */
    private _refreshHeroes(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const pick = this._heroPickEl;
        const body = this._heroBodyEl;
        if (!pick || !body) {
            return;
        }
        // 横滑选择条
        pick.innerHTML = '';
        HERO_DEFS.forEach((d, i) => {
            const owned = gm.isHeroOwned(d.id);
            const b = document.createElement('button');
            b.className = 'hpick' + (i === this._heroSelIdx ? ' on' : '') + (owned ? '' : ' lock');
            const pic = document.createElement('span');
            pic.className = 'pic';
            this._tex(`characters/hero_${d.id}`, u => {
                pic.style.backgroundImage = u;
                pic.style.backgroundSize = 'contain';
                pic.style.backgroundRepeat = 'no-repeat';
                pic.style.backgroundPosition = 'center';
            });
            const nm = document.createElement('i');
            nm.textContent = d.name;
            b.appendChild(pic);
            b.appendChild(nm);
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._pickHero(i);
            };
            pick.appendChild(b);
        });

        // 详情区整块重建
        body.innerHTML = '';
        const def = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length];
        const owned = gm.isHeroOwned(def.id);
        const inLineup = gm.isInLineup(def.id);
        const idx = this._heroSelIdx % HERO_DEFS.length;

        // 头牌：名字+星级 / 定位标签 / 战力徽章
        const head = document.createElement('div');
        head.className = 'heroHead';
        const hLeft = document.createElement('div');
        const hName = document.createElement('div');
        hName.className = 'heroName';
        if (owned) {
            const stars = document.createElement('span');
            stars.className = 'star';
            const lv = hs.heroLevel(def.id);
            const starN = Math.min(5, 1 + Math.floor(lv / 4));
            stars.textContent = '★'.repeat(starN) + '☆'.repeat(5 - starN);
            hName.appendChild(document.createTextNode(def.name));
            hName.appendChild(stars);
        } else {
            hName.textContent = def.name + '（未获得）';
        }
        const tagRow = document.createElement('div');
        tagRow.className = 'tagRow';
        tagRow.innerHTML = `<span class="tag b">人类·${this._heroWeaponName(def.id)}</span>` +
            `<span class="tag g">${def.role}</span>` +
            `<span class="tag">${inLineup ? '已上阵' : '未上阵'} ${gm.lineup.length}/${GameManager.LINEUP_MAX}</span>`;
        hLeft.appendChild(hName);
        hLeft.appendChild(tagRow);
        const power = document.createElement('div');
        power.className = 'powerBadge';
        power.innerHTML = `⚡ <span>${owned ? this._heroPower(def.id).toLocaleString() : '---'}</span>`;
        head.appendChild(hLeft);
        head.appendChild(power);
        body.appendChild(head);

        // 中部：左槽列（头/身/臂）+ 立绘 + 右槽列（手/腿/脚）
        const main = document.createElement('div');
        main.className = 'heroMain';
        const mkSlot = (slot: EquipSlot) => {
            const cur = owned ? hs.equipped(def.id, slot) : null;
            const el = document.createElement('div');
            el.className = 'slot' + (cur ? ' filled' : ' empty');
            const sname = document.createElement('span');
            sname.className = 'sname';
            sname.textContent = EQUIP_SLOT_NAMES[slot];
            el.appendChild(sname);
            if (cur) {
                let tier: 1 | 2 | 3 | 4 = 1;
                if (cur.id.startsWith('bag:')) {
                    tier = Number(cur.id.split(':')[2]) as 1 | 2 | 3 | 4;
                } else {
                    const d = hs.equipDef(cur.id);
                    tier = d ? d.tier : 1;
                }
                const ic = document.createElement('span');
                ic.textContent = SLOT_EMOJI[slot];
                el.appendChild(ic);
                const slv = document.createElement('span');
                slv.className = 'slv';
                slv.textContent = `+${cur.lv}`;
                slv.style.borderColor = EQUIP_TIER_COLORS[tier - 1];
                el.appendChild(slv);
                el.title = `${bagItemName({ slot, tier, lv: cur.lv })}`;
            } else {
                el.title = `${EQUIP_SLOT_NAMES[slot]} · 空槽位`;
            }
            el.onclick = (e) => {
                e.stopPropagation();
                if (!owned) {
                    this._toast('先解锁英雄');
                    return;
                }
                SoundFx.play('ui');
                this._openEquipSlotPanel(def.id, slot);
            };
            return el;
        };
        const colL = document.createElement('div');
        colL.className = 'slotCol';
        colL.appendChild(mkSlot('head'));
        colL.appendChild(mkSlot('body'));
        colL.appendChild(mkSlot('gloves'));
        const fig = document.createElement('div');
        fig.className = 'heroFigure';
        const halo = document.createElement('div');
        halo.className = 'halo';
        const halo2 = document.createElement('div');
        halo2.className = 'halo2';
        const emoji = document.createElement('div');
        emoji.className = 'heroEmoji' + (owned ? '' : ' lock');
        this._tex(`characters/hero_${def.id}`, u => {
            emoji.style.backgroundImage = u;
            emoji.style.backgroundSize = 'contain';
            emoji.style.backgroundRepeat = 'no-repeat';
            emoji.style.backgroundPosition = 'center';
        });
        emoji.title = owned ? (inLineup ? '点击下阵' : '点击上阵') : '未获得';
        emoji.onclick = (e) => {
            e.stopPropagation();
            if (!owned) {
                this._toast('先到商店解锁英雄');
                return;
            }
            SoundFx.unlock();
            if (gm.toggleLineupMember(def.id)) {
                SoundFx.play('ui');
                this._refreshHeroes();
            }
        };
        const heroLv = document.createElement('div');
        heroLv.className = 'heroLv';
        heroLv.textContent = owned ? `Lv.${hs.heroLevel(def.id)} · ${def.role}` : '未获得';
        fig.appendChild(halo);
        fig.appendChild(halo2);
        fig.appendChild(emoji);
        fig.appendChild(heroLv);
        const colR = document.createElement('div');
        colR.className = 'slotCol';
        colR.appendChild(mkSlot('wrist'));
        colR.appendChild(mkSlot('legs'));
        colR.appendChild(mkSlot('shoes'));
        main.appendChild(colL);
        main.appendChild(fig);
        main.appendChild(colR);
        body.appendChild(main);

        // 三维面板（攻击/战力口径真实；生命/防御占位推算）
        const stats = document.createElement('div');
        stats.className = 'statRow';
        const mkStat = (lab: string, val: string) => {
            const s = document.createElement('div');
            s.className = 'stat panel';
            s.innerHTML = `${lab}<b>${val}</b>`;
            stats.appendChild(s);
        };
        if (owned) {
            mkStat('⚔️ 攻击', String(Math.round(def.atk * hs.atkMulOf(def.id))));
            mkStat('⚡ 战力', this._heroPower(def.id).toLocaleString());
            mkStat('🛡️ 加成', `+${Math.round((hs.equipMulOf(def.id).atk - 1) * 100)}%`);
        } else {
            mkStat('⚔️ 攻击', '---');
            mkStat('⚡ 战力', '---');
            mkStat('🛡️ 加成', '---');
        }
        body.appendChild(stats);

        if (!owned) {
            const unlock = document.createElement('button');
            unlock.className = 'btn gold big';
            unlock.textContent = `🔓 前往商店解锁（🪙 ${(HeroSystem.HERO_PRICES[def.id] ?? 0).toLocaleString()}）`;
            unlock.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._switchPage('mall');
            };
            body.appendChild(unlock);
            this._applyPendingTex();
            return;
        }

        // 大升级按钮（英雄升级）
        const up = document.createElement('button');
        up.className = 'btn gold big';
        if (hs.isHeroMaxLevel(def.id)) {
            up.textContent = '▲ 已满级';
            up.disabled = true;
        } else {
            up.textContent = `▲ 英雄升级（消耗 🪙 ${hs.heroUpgradeCost(def.id).toLocaleString()}）`;
            up.disabled = !gm.canUpgrade('atk') && gm.gold < hs.heroUpgradeCost(def.id);
            up.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                if (hs.upgradeHero(def.id)) {
                    SoundFx.play('buy');
                    this._toast(`${def.name} 升至 Lv.${hs.heroLevel(def.id)}`);
                    this._refreshHeroes();
                    this._refreshTop();
                }
            };
        }
        up.style.opacity = up.disabled ? '0.6' : '1';
        body.appendChild(up);

        // 三按钮行：英雄核心 / 武器强化 / 背包
        const row3 = document.createElement('div');
        row3.className = 'row3';
        const coreBtn = document.createElement('button');
        coreBtn.className = 'btn blue';
        coreBtn.textContent = '🧬 英雄核心';
        coreBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openCoreModal(def.id);
        };
        const wpnBtn = document.createElement('button');
        wpnBtn.className = 'btn blue';
        wpnBtn.textContent = '🔧 武器强化';
        wpnBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openWeaponModal(def.id);
        };
        const bagBtn = document.createElement('button');
        bagBtn.className = 'btn dark';
        bagBtn.textContent = '🎒 背包';
        bagBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openBagModal(def.id);
        };
        row3.appendChild(coreBtn);
        row3.appendChild(wpnBtn);
        row3.appendChild(bagBtn);
        body.appendChild(row3);
        this._applyPendingTex();
    }

    /** 弹窗：英雄核心（武器核心嵌入/拆除，口径同旧 gem 钮） */
    private _openCoreModal(heroId: string): void {
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        const core = hs.weaponCore(heroId);
        this._openModal('🧬 英雄核心', (box, close) => {
            const sub = document.createElement('p');
            sub.className = 'mSub';
            sub.textContent = `核心为 ${def?.name ?? ''} 提供武器特效加成（暴击/攻击等）`;
            box.appendChild(sub);
            if (core) {
                const row = document.createElement('div');
                row.className = 'mRow';
                row.innerHTML = `<span>当前核心 <b class="goldT" style="color:${EQUIP_TIER_COLORS[core.tier - 1]}">${core.name}</b> · ${core.desc}</span>`;
                const off = document.createElement('button');
                off.className = 'btn dark sm';
                off.textContent = '拆 除';
                off.onclick = () => {
                    if (hs.removeCore(heroId)) {
                        SoundFx.play('ui');
                        this._toast('核心已拆除');
                        close();
                        this._refreshHeroes();
                    }
                };
                row.appendChild(off);
                box.appendChild(row);
            } else {
                const rec = WEAPON_CORE_DEFS.slice()
                    .sort((a, b) => (a.tier - b.tier) || (a.baseCost - b.baseCost))[0] ?? null;
                if (rec) {
                    const row = document.createElement('div');
                    row.className = 'mRow';
                    row.innerHTML = `<span>未嵌入核心 · 推荐 <b class="goldT">${rec.name}</b>（${rec.desc}）</span>`;
                    const buy = document.createElement('button');
                    buy.className = 'btn gold sm';
                    buy.textContent = `🪙 ${rec.baseCost} 嵌入`;
                    buy.disabled = GameManager.instance.gold < rec.baseCost;
                    buy.onclick = () => {
                        if (hs.buyCore(heroId, rec.id)) {
                            SoundFx.play('buy');
                            this._toast(`${rec.name} 嵌入成功`);
                            close();
                            this._refreshHeroes();
                        }
                    };
                    row.appendChild(buy);
                    box.appendChild(row);
                }
                // 全核心列表（供选择）
                for (const c of WEAPON_CORE_DEFS) {
                    const row = document.createElement('div');
                    row.className = 'mRow';
                    row.innerHTML = `<span><b style="color:${EQUIP_TIER_COLORS[c.tier - 1]}">${c.name}</b> · ${c.desc}</span>`;
                    const b2 = document.createElement('button');
                    b2.className = 'btn blue sm';
                    b2.textContent = `🪙 ${c.baseCost}`;
                    b2.disabled = GameManager.instance.gold < c.baseCost;
                    b2.onclick = () => {
                        if (hs.buyCore(heroId, c.id)) {
                            SoundFx.play('buy');
                            this._toast(`${c.name} 嵌入成功`);
                            close();
                            this._refreshHeroes();
                        }
                    };
                    row.appendChild(b2);
                    box.appendChild(row);
                }
            }
        });
    }

    /** 弹窗：武器强化 */
    private _openWeaponModal(heroId: string): void {
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        this._openModal(`🔧 武器强化 · ${def?.name ?? ''}`, (box, close) => {
            const lv = hs.weaponLevel(heroId);
            const sub = document.createElement('p');
            sub.className = 'mSub';
            sub.textContent = '武器强化提升普攻基础伤害（每级攻击加成叠加）';
            box.appendChild(sub);
            const cur = document.createElement('div');
            cur.className = 'mRow';
            cur.innerHTML = `<span>当前武器 <b class="goldT">+${lv}</b> · 攻击加成 +${Math.round((hs.weaponAtkMul(heroId) - 1) * 100)}%</span>`;
            box.appendChild(cur);
            const row = document.createElement('div');
            row.className = 'mRow';
            if (hs.isWeaponMaxLevel(heroId)) {
                row.innerHTML = '<span>武器已满级</span>';
                const b = document.createElement('button');
                b.className = 'btn dark sm';
                b.disabled = true;
                b.textContent = '已满级';
                row.appendChild(b);
            } else {
                const cost = hs.weaponUpgradeCost(heroId);
                row.innerHTML = `<span>强化至 +${lv + 1}（攻击加成 +${Math.round((Math.pow(1 + 0.05, lv + 1) - 1) * 100)}%）</span>`;
                const b = document.createElement('button');
                b.className = 'btn gold sm';
                b.textContent = `🪙 ${cost} 强化`;
                b.disabled = GameManager.instance.gold < cost;
                b.onclick = () => {
                    if (hs.upgradeWeapon(heroId)) {
                        SoundFx.play('buy');
                        this._toast(`武器强化至 +${lv + 1}`);
                        close();
                        this._refreshHeroes();
                    }
                };
                row.appendChild(b);
            }
            box.appendChild(row);
        });
    }

    /** 弹窗：指挥官背包（装备/材料双页签，真数据 gm.bag） */
    private _openBagModal(heroId: string): void {
        let tab: 'equip' | 'all' = 'equip';
        const gm = GameManager.instance;
        const render = (box: HTMLDivElement) => {
            box.querySelector('.bagWrap')?.remove();
            const wrap = document.createElement('div');
            wrap.className = 'bagWrap';
            const tabs = document.createElement('div');
            tabs.className = 'bagTabs';
            const mk = (key: 'equip' | 'all', label: string) => {
                const b = document.createElement('button');
                b.className = tab === key ? 'on' : '';
                b.textContent = label;
                b.onclick = (e) => {
                    e.stopPropagation();
                    tab = key;
                    render(box);
                };
                tabs.appendChild(b);
            };
            mk('equip', '🛡️ 装备');
            mk('all', '📦 全部');
            wrap.appendChild(tabs);
            const grid = document.createElement('div');
            grid.className = 'bagGrid';
            const items: BagItem[] = tab === 'equip' ? gm.bag : gm.bag;
            if (items.length === 0) {
                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.textContent = '背包空空如也 · 去商店购买装备部件';
                grid.appendChild(tip);
            }
            for (const it of items) {
                const cell = document.createElement('div');
                cell.className = `bcell r${it.tier <= 1 ? 2 : it.tier === 2 ? 3 : it.tier === 3 ? 4 : 5}`;
                cell.innerHTML = `${SLOT_EMOJI[it.slot]}<em>${it.lv}</em>`;
                cell.title = `${bagItemName(it)}（点击穿戴）`;
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openEquipSlotPanel(heroId, it.slot);
                };
                grid.appendChild(cell);
            }
            wrap.appendChild(grid);
            box.appendChild(wrap);
        };
        this._openModal('🎒 指挥官背包', (box) => render(box));
    }

    /** 穿戴面板（对齐原型 mbox 风格）：已穿件（强化/卸下）+ 背包件（穿戴） */
    private _openEquipSlotPanel(heroId: string, slot: EquipSlot): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        if (!gm.isHeroOwned(heroId)) {
            return;
        }
        this._openModal(`${EQUIP_SLOT_NAMES[slot]} · 穿戴`, (box, close) => {
            const list = document.createElement('div');
            list.className = 'equipSlots wide';
            box.appendChild(list);
            const cur = hs.equipped(heroId, slot);
            if (cur) {
                const row = document.createElement('div');
                row.className = 'equipRow';
                const info = document.createElement('div');
                info.className = 'equipInfo';
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
                const parts: string[] = [];
                for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                    const v = Math.round(hs.equipSlotValue(cur, key) * 100);
                    if (v > 0) {
                        parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                    }
                }
                info.innerHTML =
                    `<div class="equipName" style="color:${EQUIP_TIER_COLORS[tier - 1]}">当前：${name}</div>` +
                    `<div class="equipStat">强化 +${cur.lv} · ${parts.join(' ') || '无属性'}</div>`;
                const btn = document.createElement('button');
                btn.className = 'btn gold sm';
                if (!hs.isEquipMaxLevel(cur)) {
                    const cost = hs.equipUpgradeCost(cur);
                    btn.textContent = `🪙 ${cost} 强化`;
                    btn.disabled = gm.gold < cost;
                    btn.onclick = () => {
                        if (hs.upgradeEquip(heroId, slot)) {
                            SoundFx.play('buy');
                            document.querySelector('#homeUi .protoMask')?.remove();
                            this._refreshHeroes();
                        }
                    };
                } else {
                    btn.textContent = '已满级';
                    btn.disabled = true;
                }
                const offBtn = document.createElement('button');
                offBtn.className = 'btn dark sm';
                offBtn.textContent = '卸 下';
                offBtn.onclick = () => {
                    if (hs.unequipToBag(heroId, slot)) {
                        SoundFx.play('ui');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                    }
                };
                const wrap = document.createElement('div');
                wrap.style.display = 'flex';
                wrap.style.gap = 'calc(8px * var(--hs,1))';
                wrap.appendChild(btn);
                wrap.appendChild(offBtn);
                row.appendChild(info);
                row.appendChild(wrap);
                list.appendChild(row);
            }
            const items = hs.bagItemsOf(slot);
            if (items.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'mSub';
                empty.textContent = cur ? '背包中该部位没有其他件' : '背包中该部位没有装备 · 去商店购买';
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
                btn.className = 'btn gold sm';
                btn.textContent = '穿 戴';
                btn.onclick = () => {
                    if (hs.equipFromBag(heroId, index)) {
                        SoundFx.play('buy');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                    }
                };
                row.appendChild(info);
                row.appendChild(btn);
                list.appendChild(row);
            }
            const closeBar = document.createElement('button');
            closeBar.className = 'btn dark big';
            closeBar.style.marginTop = 'calc(12px * var(--hs,1))';
            closeBar.textContent = '关 闭';
            closeBar.onclick = (e) => {
                e.stopPropagation();
                close();
            };
            box.appendChild(closeBar);
        });
    }

    // ================= 关卡页 =================

    /** 关卡页：章节页签 + 波次进度轨道 + 护送场景（动画）+ 关卡信息 + 耐久宝箱 + 编队/出战 */
    private _buildStagePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.battle = page;

        // 章节页签（1~5 关，未解锁灰态）
        const tabs = document.createElement('div');
        tabs.className = 'chTabs';
        page.appendChild(tabs);
        this._stageTabsEl = tabs;

        // 波次进度轨道（1~5 波 done/cur/lock 圆点）
        const track = document.createElement('div');
        track.className = 'lvlTrack';
        page.appendChild(track);
        this._lvlTrackEl = track;

        // 护送场景（CSS 动画：太阳/山丘/公路/载具/怪物 + 耐久角标 + 左右箭头）
        const scene = document.createElement('div');
        scene.className = 'scene frame';
        scene.innerHTML = `<div class="sun"></div><div class="mtn"></div><div class="hill"></div>` +
            `<div class="ground"></div><div class="road"></div><div class="dash"></div>` +
            `<div class="mobs"><span>🐺</span><span>🐗</span><span>🦅</span></div>` +
            `<div class="veh">🚚</div>` +
            `<div class="crew"><i></i><i></i><i></i><i></i></div>` +
            `<div class="sceneInfo"><div class="siChip"></div>` +
            `<div class="siHp">🛡️ 难度 ×<b class="hpMul"></b></div></div>`;
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
        this._sceneChipEl = scene.querySelector('.siChip');
        this._vehEl = scene.querySelector('.veh');
        this._mobsEl = scene.querySelector('.mobs');
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

        // 耐久结算宝箱三档
        const chestTitle = document.createElement('div');
        chestTitle.className = 'secTitle';
        chestTitle.textContent = '🛡️ 通关宝箱 · 越少受伤，奖励越丰厚';
        page.appendChild(chestTitle);
        const chests = document.createElement('div');
        chests.className = 'chests';
        page.appendChild(chests);
        this._chestsEl = chests;

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
        btns.appendChild(squad);
        btns.appendChild(go);
        page.appendChild(btns);
        this._squadBtn = squad;

        root.appendChild(page);
    }

    private _squadBtn: HTMLButtonElement | null = null;

    /** 关卡页刷新：章节页签/进度点/场景内容/信息/宝箱（真数据 STAGES + stageCleared） */
    private _refreshStagePage(): void {
        const gm = GameManager.instance;
        const tabs = this._stageTabsEl;
        const track = this._lvlTrackEl;
        const scene = this._sceneEl;
        const chests = this._chestsEl;
        if (!tabs || !track || !scene || !chests) {
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

        // 波次进度轨道（done = 已通关整关全部点亮 / 当前关 cur 高亮最后一格）
        track.innerHTML = '';
        const clearedAll = stageId <= gm.stageCleared;
        for (let w = 0; w < WAVES_PER_STAGE; w++) {
            const dot = document.createElement('span');
            let cls = 'lock';
            if (clearedAll) {
                cls = 'done';
            } else if (stageId === gm.stageCleared + 1 && w === WAVES_PER_STAGE - 1) {
                cls = 'cur';
            }
            dot.className = `dot ${cls}`;
            dot.style.left = `${8 + w * 21}%`;
            const em = document.createElement('em');
            em.textContent = `${w + 1}`;
            dot.appendChild(em);
            track.appendChild(dot);
        }

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
        if (this._arrowL) {
            this._arrowL.style.visibility = stageId > 1 ? 'visible' : 'hidden';
        }
        if (this._arrowR) {
            this._arrowR.style.visibility = stageId < FINAL_STAGE_ID && stageId < gm.stageCleared + 1 ? 'visible' : 'hidden';
        }

        // 关卡信息
        if (this._siLvlEl) {
            this._siLvlEl.innerHTML = `${stageId}-1<span style="font-size:calc(18px * var(--hs,1));color:#8ba3c7"> ${info.name.replace(/^\d+\./, '')}</span>`;
        }
        if (this._siPowEl) {
            this._siPowEl.textContent = (7600 + stageId * 1400).toLocaleString();
        }
        if (this._siStEl) {
            if (clearedAll) {
                this._siStEl.textContent = '✅ 已通关';
                this._siStEl.className = 'ok';
            } else if (stageId === gm.stageCleared + 1) {
                this._siStEl.textContent = '▶ 待挑战';
                this._siStEl.className = 'go';
            } else {
                this._siStEl.textContent = '🔒 未解锁';
                this._siStEl.className = '';
            }
        }

        // 通关宝箱三档（已通关=可领，待挑战=锁，通关后可领=ready）
        chests.innerHTML = '';
        const boxes: Array<[string, string, string, string, boolean]> = clearedAll
            ? [['📦', '通关奖励', 'got', '已可领取', true], ['🎁', '无伤通关', 'got', '进阶挑战', false], ['🏆', '完美通关', 'lock', '敬请期待', false]]
            : stageId === gm.stageCleared + 1
                ? [['📦', '通关奖励', 'ready', '', true], ['🎁', '无伤通关', 'lock', '进阶挑战', false], ['🏆', '完美通关', 'lock', '敬请期待', false]]
                : [['📦', '通关奖励', 'lock', '通关后结算', true], ['🎁', '无伤通关', 'lock', '通关后结算', false], ['🏆', '完美通关', 'lock', '通关后结算', false]];
        for (const [ic, label, st, tip, goldBox] of boxes) {
            const c = document.createElement('div');
            c.className = `chest panel ${st}`;
            const cic = document.createElement('span');
            cic.className = 'cic';
            cic.textContent = ic;
            this._tex('ui/chest', u => { void u; });
            c.appendChild(cic);
            const p = document.createElement('p');
            p.textContent = label;
            c.appendChild(p);
            if (st === 'ready') {
                const b = document.createElement('button');
                b.className = 'btn gold sm';
                b.textContent = '领 取';
                b.onclick = (e) => {
                    e.stopPropagation();
                    // 通关奖励在结算面板发放，这里跳结算提示
                    this._toast('通关奖励在战斗结算时发放');
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
            void goldBox;
            chests.appendChild(c);
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

    /** 弹窗：护送编队（对齐原型 sq-slot + cand 网格，真数据 lineup） */
    private _openSquadModal(): void {
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
                const sq = document.createElement('div');
                sq.className = 'sqRow';
                for (let i = 0; i < GameManager.LINEUP_MAX; i++) {
                    const id = gm.lineup[i];
                    const slot = document.createElement('div');
                    slot.className = 'sqSlot' + (id ? '' : ' empty');
                    if (id) {
                        const def = HERO_DEFS.find(d => d.id === id);
                        const pic = document.createElement('span');
                        this._tex(`characters/hero_${id}`, u => {
                            pic.style.backgroundImage = u;
                            pic.style.width = 'calc(44px * var(--hs,1))';
                            pic.style.height = 'calc(44px * var(--hs,1))';
                            pic.style.backgroundSize = 'contain';
                            pic.style.backgroundRepeat = 'no-repeat';
                            pic.style.backgroundPosition = 'center';
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
                    this._tex(`characters/hero_${def.id}`, u => {
                        pic.style.backgroundImage = u;
                        pic.style.width = 'calc(40px * var(--hs,1))';
                        pic.style.height = 'calc(40px * var(--hs,1))';
                        pic.style.display = 'block';
                        pic.style.backgroundSize = 'contain';
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.backgroundPosition = 'center';
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

    // ================= 技能页（核心页） =================

    /** 技能页：英雄横滑选择条 + 普攻/技能/大招三横卡（原型 s-skill 风格） */
    private _buildSkillPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.core = page;
        const pick = document.createElement('div');
        pick.className = 'heroPick';
        page.appendChild(pick);
        this._skillPickEl = pick;
        const list = document.createElement('div');
        list.style.marginTop = 'calc(16px * var(--hs,1))';
        page.appendChild(list);
        this._skillListEl = list;
        const hint = document.createElement('div');
        hint.className = 'skillHint';
        hint.textContent = '—— 普攻 / 技能 / 大招 三线独立成长 · 战斗内三选一升级在此基础上继续 ——';
        page.appendChild(hint);
        root.appendChild(page);
    }

    private _pickSkillHero(i: number): void {
        const gm = GameManager.instance;
        const def = HERO_DEFS[i % HERO_DEFS.length];
        if (!gm.isHeroOwned(def.id)) {
            this._toast(`「${def.name}」尚未获得 · 无法升级技能`);
            return;
        }
        this._skillSelIdx = i;
        this._refreshSkillPage();
    }

    private _refreshSkillPage(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const pick = this._skillPickEl;
        const list = this._skillListEl;
        if (!pick || !list) {
            return;
        }
        pick.innerHTML = '';
        HERO_DEFS.forEach((d, i) => {
            const owned = gm.isHeroOwned(d.id);
            const b = document.createElement('button');
            b.className = 'hpick' + (i === this._skillSelIdx ? ' on' : '') + (owned ? '' : ' lock');
            const pic = document.createElement('span');
            pic.className = 'pic';
            this._tex(`characters/hero_${d.id}`, u => {
                pic.style.backgroundImage = u;
                pic.style.backgroundSize = 'contain';
                pic.style.backgroundRepeat = 'no-repeat';
                pic.style.backgroundPosition = 'center';
            });
            const nm = document.createElement('i');
            nm.textContent = d.name;
            b.appendChild(pic);
            b.appendChild(nm);
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._pickSkillHero(i);
            };
            pick.appendChild(b);
        });

        list.innerHTML = '';
        const def = HERO_DEFS[this._skillSelIdx % HERO_DEFS.length];
        const owned = gm.isHeroOwned(def.id);
        if (!owned) {
            const tip = document.createElement('p');
            tip.className = 'mSub';
            tip.style.textAlign = 'center';
            tip.textContent = `「${def.name}」尚未获得 · 解锁后开放技能升级`;
            list.appendChild(tip);
            return;
        }
        const basicDesc = def.weapon === 'rifle' ? '自动锁定最近目标，稳定单发射击，可触发暴击。'
            : def.weapon === 'sniper' ? '超远射程锁定高威胁目标，高伤慢速单体狙击。'
                : def.weapon === 'laser' ? '持续锁定跟踪光束，附加灼烧持续伤害。'
                    : '弹速极快的辐射弹，穿透直线上多个敌人。';
        const cards: Array<{ t: string; ic: string; iconKey: string; n: string; d: string; slot: AbilitySlot; ult: boolean }> = [
            { t: '普攻', ic: '🔫', iconKey: `icons/${def.id}_basic`, n: '基础射击', d: basicDesc, slot: 'basic', ult: false },
            { t: '技能', ic: '💫', iconKey: `icons/${def.id}_skill`, n: def.skill.name, d: def.skill.desc, slot: 'skill', ult: false },
            { t: '大招', ic: '☄️', iconKey: `icons/${def.id}_ultimate`, n: def.ultimate.name, d: def.ultimate.desc, slot: 'ultimate', ult: true },
        ];
        for (const c of cards) {
            const lv = hs.abilityLevel(def.id, c.slot);
            const maxed = hs.isAbilityMaxLevel(def.id, c.slot);
            const card = document.createElement('div');
            card.className = 'skillCard panel' + (c.ult ? ' frame' : '');
            const icon = document.createElement('div');
            icon.className = 'sIcon' + (c.ult ? ' ult' : c.t === '技能' ? ' s2' : '');
            icon.textContent = c.ic;
            this._tex(c.iconKey, u => {
                icon.style.backgroundImage = u;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.textContent = '';
            });
            const info = document.createElement('div');
            info.className = 'sInfo';
            const nm = document.createElement('div');
            nm.className = 'sName';
            nm.innerHTML = `${c.n}<span class="tag ${c.ult ? 'g' : c.t === '技能' ? 'p' : 'b'}">${c.t}</span>`;
            const desc = document.createElement('div');
            desc.className = 'sDesc';
            desc.textContent = `${c.d}（每级伤害 +${Math.round(ABILITY_LEVEL_DMG_BONUS * 100)}%）`;
            info.appendChild(nm);
            info.appendChild(desc);
            const act = document.createElement('div');
            act.className = 'sAct';
            const lvEl = document.createElement('div');
            lvEl.className = 'sLv';
            lvEl.textContent = maxed ? 'MAX' : `Lv.${lv}`;
            const btn = document.createElement('button');
            btn.className = `btn ${c.ult ? 'gold' : 'blue'} sm`;
            if (maxed) {
                btn.textContent = '已满级';
                btn.disabled = true;
            } else {
                const cost = hs.abilityUpgradeCost(def.id, c.slot);
                btn.textContent = `🪙 ${cost.toLocaleString()}`;
                btn.disabled = gm.gold < cost;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (hs.upgradeAbility(def.id, c.slot)) {
                        SoundFx.play('buy');
                        this._toast(`${c.n} 升至 Lv.${lv + 1}`);
                        this._refreshSkillPage();
                        this._refreshTop();
                    }
                };
            }
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            act.appendChild(lvEl);
            act.appendChild(btn);
            card.appendChild(icon);
            card.appendChild(info);
            card.appendChild(act);
            list.appendChild(card);
        }
        this._applyPendingTex();
    }

    // ================= 基地页 =================

    /** 基地页：基地横幅（繁荣度）+ 建筑卡 2 列网格（第 5 格起挂 META_UPGRADES 真数据） */
    private _buildBasePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.base = page;
        const banner = document.createElement('div');
        banner.className = 'baseBanner panel frame';
        banner.innerHTML = `<div class="bbIc">🏰</div><div><h3>第 7 区 · 方舟基地 <span class="lvtag">基地 LV.5</span></h3>` +
            `<div class="pros">繁荣度 1,240 / 2,000 · 升级建筑提升繁荣度</div>` +
            `<div class="prosBar"><i></i></div></div>`;
        page.appendChild(banner);
        const grid = document.createElement('div');
        grid.className = 'baseGrid';
        page.appendChild(grid);
        this._baseGridEl = grid;
        root.appendChild(page);
    }

    private _baseGridEl: HTMLDivElement | null = null;

    private _refreshBase(): void {
        const gm = GameManager.instance;
        const grid = this._baseGridEl;
        if (!grid) {
            return;
        }
        grid.innerHTML = '';
        // 建筑卡（视觉复刻，数值占位）
        const buildings: Array<{ ic: string; n: string; lv: number; d: string }> = [
            { ic: '🏛️', n: '指挥中心', lv: 5, d: '提升所有建筑等级上限' },
            { ic: '🏕️', n: '训练营', lv: 4, d: '英雄等级上限 +2' },
            { ic: '⚒️', n: '军械库', lv: 3, d: '装备强化等级上限 +1' },
            { ic: '🔬', n: '研究所', lv: 4, d: '技能等级上限 +1' },
        ];
        for (const b of buildings) {
            const card = document.createElement('div');
            card.className = 'bcard panel';
            card.innerHTML = `<div class="bIc">${b.ic}</div>` +
                `<div class="bName">${b.n}<span>LV.${b.lv}</span></div>` +
                `<div class="bDesc">${b.d}</div>`;
            const btn = document.createElement('button');
            btn.className = 'btn dark sm';
            btn.style.width = '100%';
            btn.textContent = '🔒 即将开放';
            btn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._toast('基地建筑系统即将开放');
            };
            card.appendChild(btn);
            grid.appendChild(card);
        }
        // 局外强化卡（真数据 META_UPGRADES：火力/装甲/赏金/演练）
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
            grid.appendChild(card);
            this._baseRows.push({ def, lv: nm, eff: ds, btn, cost: btn });
        }
        this._applyPendingTex();
    }

    // ================= 模拟广告层 =================

    /** 模拟广告层：AD_START 弹出 3 秒倒计时，AD_END 关闭 */
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

    // ================= 样式（一比一复刻原型图 token） =================

    private _injectStyle(): void {
        if (HomeUi._styleInjected) {
            return;
        }
        HomeUi._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = `
#homeUi { position: fixed; inset: 0; z-index: 8500; display: none; flex-direction: column; align-items: stretch;
  background: #0b1322;
  background-image: radial-gradient(1100px 550px at 75% -10%, #122340 0%, transparent 60%),
    radial-gradient(900px 500px at 5% 110%, #1a1430 0%, transparent 55%);
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #dce8f7; user-select: none; overflow: hidden; }

/* ===== 顶栏 ===== */
#homeUi .topbar { flex: none; display: flex; align-items: center; gap: calc(16px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(20px * var(--hs,1));
  background: linear-gradient(180deg, #1e3054, #141f38); border-bottom: 1px solid #33507a; }
#homeUi .pAvatar { width: calc(92px * var(--hs,1)); height: calc(92px * var(--hs,1)); flex: none; border-radius: 50%; padding: calc(4px * var(--hs,1));
  background: conic-gradient(from 210deg, #f7d98a, #b47b1e, #ffe9a8, #8a5c12, #f7d98a); }
#homeUi .pAvatar > div { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #2a4470, #0d1626);
  display: flex; align-items: center; justify-content: center; font-size: calc(44px * var(--hs,1)); }
#homeUi .pinfo { flex: none; width: calc(236px * var(--hs,1)); }
#homeUi .pname { font-size: calc(26px * var(--hs,1)); font-weight: 700; display: flex; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .lvtag { font-size: calc(18px * var(--hs,1)); color: #5a3a08; background: linear-gradient(180deg, #ffe9a8, #e0a23c);
  padding: calc(1px * var(--hs,1)) calc(10px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); font-weight: 800; }
#homeUi .expbar { height: calc(10px * var(--hs,1)); background: #0a1426; border: 1px solid #2c405f; border-radius: 99px; margin-top: calc(8px * var(--hs,1)); overflow: hidden; }
#homeUi .expbar i { display: block; height: 100%; width: 65%; background: linear-gradient(90deg, #3ad0ff, #7ef0ff); border-radius: 99px; box-shadow: 0 0 6px #3ad0ff; }
#homeUi .expnum { font-size: calc(18px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .reswrap { flex: 1; display: flex; gap: calc(10px * var(--hs,1)); justify-content: flex-end; flex-wrap: wrap; }
#homeUi .res { display: flex; align-items: center; gap: calc(6px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a;
  border-radius: 99px; padding: calc(6px * var(--hs,1)) calc(12px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); font-weight: 700; }
#homeUi .res b { color: #ffe9a8; }
#homeUi .res .add { width: calc(28px * var(--hs,1)); height: calc(28px * var(--hs,1)); border-radius: 50%; background: linear-gradient(180deg, #7fe08a, #2f9c4a);
  color: #06300f; font-size: calc(22px * var(--hs,1)); font-weight: 900; display: flex; align-items: center; justify-content: center; cursor: pointer; }

/* ===== 内容区 ===== */
#homeUi .viewport { flex: 1; position: relative; overflow: hidden;
  background: radial-gradient(500px 320px at 50% -60px, #1d3054 0%, transparent 70%), linear-gradient(180deg, #0e1830, #0a1220); }
#homeUi .screen { position: absolute; inset: 0; padding: calc(24px * var(--hs,1)) calc(24px * var(--hs,1)) calc(200px * var(--hs,1)); overflow-y: auto; display: none; }
#homeUi .screen::-webkit-scrollbar { width: 4px; }
#homeUi .screen::-webkit-scrollbar-thumb { background: #2c405f; border-radius: 4px; }

/* ===== 通用面板/角饰/按钮 ===== */
#homeUi .panel { background: linear-gradient(180deg, #20335a, #152442); border: 1px solid #3a567f; border-radius: calc(20px * var(--hs,1));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 12px rgba(0,0,0,.35); }
#homeUi .frame { position: relative; }
#homeUi .frame::before, #homeUi .frame::after { content: ''; position: absolute; width: calc(24px * var(--hs,1)); height: calc(24px * var(--hs,1));
  border: calc(4px * var(--hs,1)) solid #f5c451; opacity: .85; z-index: 3; }
#homeUi .frame::before { top: -1px; left: -1px; border-right: none; border-bottom: none; border-radius: calc(8px * var(--hs,1)) 0 0 0; }
#homeUi .frame::after { bottom: -1px; right: -1px; border-left: none; border-top: none; border-radius: 0 0 calc(8px * var(--hs,1)) 0; }
#homeUi .secTitle { font-size: calc(26px * var(--hs,1)); font-weight: 800; color: #ffe9a8; letter-spacing: calc(4px * var(--hs,1));
  margin: calc(20px * var(--hs,1)) calc(4px * var(--hs,1)) calc(14px * var(--hs,1)); display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .secTitle::before { content: ''; width: calc(8px * var(--hs,1)); height: calc(28px * var(--hs,1));
  background: linear-gradient(180deg, #ffe9a8, #e0a23c); border-radius: calc(4px * var(--hs,1)); }
#homeUi .btn { border: none; cursor: pointer; font-family: inherit; font-weight: 800; border-radius: calc(18px * var(--hs,1)); }
#homeUi .btn:active { transform: scale(.95); }
#homeUi .btn.gold { background: linear-gradient(180deg, #ffe9a6, #f0b13e 55%, #c9861f); color: #5a3a08; border: 1px solid #8a5c12;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 3px 0 #7c520f, 0 6px 14px rgba(240,177,62,.3); }
#homeUi .btn.blue { background: linear-gradient(180deg, #7fd4ff, #2f7fd0); color: #04263f; border: 1px solid #1b5a94;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 3px 0 #174a80; }
#homeUi .btn.adBtn { background: linear-gradient(180deg, #7fe08a, #2f9c4a); color: #06300f; border: 1px solid #1d6b2e;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 3px 0 #1d6b2e; }
#homeUi .btn.dark { background: linear-gradient(180deg, #2a3f66, #1a2947); color: #dce8f7; border: 1px solid #3a567f; }
#homeUi .btn.sm { height: calc(56px * var(--hs,1)); padding: 0 calc(20px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); }
#homeUi .btn.big { width: 100%; height: calc(88px * var(--hs,1)); font-size: calc(32px * var(--hs,1)); letter-spacing: calc(4px * var(--hs,1)); border-radius: calc(22px * var(--hs,1)); }
#homeUi .btn:disabled { filter: grayscale(.8) brightness(.7); }
#homeUi .tag { font-size: calc(20px * var(--hs,1)); padding: calc(2px * var(--hs,1)) calc(14px * var(--hs,1)); border-radius: 99px;
  background: #0e1930; border: 1px solid #33507a; color: #8ba3c7; white-space: nowrap; }
#homeUi .tag.b { color: #5cc8ff; border-color: #2a6ea6; }
#homeUi .tag.g { color: #ffe9a8; border-color: #8a6a20; }
#homeUi .tag.p { color: #c792ff; border-color: #6a4a9a; }
#homeUi .goldT { color: #ffe9a8; }

/* ===== Toast ===== */
#homeUi .toastEl { position: absolute; left: 50%; bottom: calc(220px * var(--hs,1)); transform: translateX(-50%) translateY(10px);
  background: rgba(13,25,48,.93); border: 1px solid #f5c451; color: #ffe9a8; font-size: calc(24px * var(--hs,1)); font-weight: 700;
  padding: calc(14px * var(--hs,1)) calc(32px * var(--hs,1)); border-radius: 99px; opacity: 0; transition: .25s;
  z-index: 300; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,.5); }
#homeUi .toastEl.show { opacity: 1; }

/* ===== 商店页 ===== */
#homeUi .shopBanner { height: calc(168px * var(--hs,1)); border-radius: calc(24px * var(--hs,1)); overflow: hidden; position: relative; cursor: pointer;
  display: flex; align-items: center; background: linear-gradient(100deg, #3a1420, #6e2418 55%, #8a4a1a);
  border: 1px solid #a06428; box-shadow: 0 6px 16px rgba(0,0,0,.4); }
#homeUi .shopBanner::after { content: ''; position: absolute; inset: 0;
  background: radial-gradient(200px 90px at 85% 20%, rgba(255,210,120,.35), transparent 70%); }
#homeUi .sbTxt { padding: 0 calc(28px * var(--hs,1)); z-index: 2; }
#homeUi .sbTxt h3 { font-size: calc(32px * var(--hs,1)); color: #ffe9a8; letter-spacing: calc(2px * var(--hs,1)); text-shadow: 0 2px 4px rgba(0,0,0,.5); }
#homeUi .sbTxt p { font-size: calc(22px * var(--hs,1)); color: #ffd9b0; margin-top: calc(8px * var(--hs,1)); }
#homeUi .sbTxt .price { color: #ff8a6a; font-weight: 900; font-size: calc(32px * var(--hs,1)); }
#homeUi .sbTxt .price s { color: #c98a6a; font-size: calc(22px * var(--hs,1)); margin-left: calc(8px * var(--hs,1)); }
#homeUi .sbGift { margin-left: auto; font-size: calc(88px * var(--hs,1)); margin-right: calc(32px * var(--hs,1)); z-index: 2;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)); }
#homeUi .sbTime { position: absolute; right: calc(24px * var(--hs,1)); bottom: calc(14px * var(--hs,1)); z-index: 2;
  font-size: calc(20px * var(--hs,1)); color: #ffd9b0; background: rgba(0,0,0,.35); padding: calc(4px * var(--hs,1)) calc(16px * var(--hs,1)); border-radius: 99px; }
#homeUi .shopTabs { display: flex; gap: calc(12px * var(--hs,1)); margin: calc(24px * var(--hs,1)) 0; }
#homeUi .shopTabs button { flex: 1; height: calc(60px * var(--hs,1)); border-radius: calc(16px * var(--hs,1)); border: 1px solid #33507a;
  background: #101d38; color: #8ba3c7; font-family: inherit; font-size: calc(26px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .shopTabs button.on { background: linear-gradient(180deg, #3a567f, #243a63); color: #ffe9a8; border-color: #6a8ab8;
  box-shadow: 0 0 10px rgba(92,150,255,.25); }
#homeUi .shopGrid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(20px * var(--hs,1)); }
#homeUi .good { padding: calc(16px * var(--hs,1)); position: relative; }
#homeUi .gIc { height: calc(120px * var(--hs,1)); border-radius: calc(16px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(64px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #2a4470, #101c34);
  border: 1px solid #3a567f; margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .good.r3 .gIc { border-color: #3a8ad0; box-shadow: 0 0 8px rgba(60,140,220,.35) inset; }
#homeUi .good.r4 .gIc { border-color: #9a5ce0; box-shadow: 0 0 8px rgba(160,90,230,.4) inset; }
#homeUi .good.r5 .gIc { border-color: #e0a23c; box-shadow: 0 0 10px rgba(240,170,60,.45) inset; }
#homeUi .gName { font-size: calc(26px * var(--hs,1)); font-weight: 700; }
#homeUi .gTag { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin: calc(4px * var(--hs,1)) 0 calc(12px * var(--hs,1)); min-height: calc(48px * var(--hs,1)); line-height: 1.3; }
#homeUi .gBuy { width: 100%; display: flex; align-items: center; justify-content: center; gap: calc(6px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); }
#homeUi .gHot { position: absolute; top: calc(-10px * var(--hs,1)); right: calc(-8px * var(--hs,1));
  background: linear-gradient(180deg, #ff8a5c, #e03a2a); color: #fff; font-size: calc(20px * var(--hs,1)); font-weight: 800;
  padding: calc(4px * var(--hs,1)) calc(16px * var(--hs,1)); border-radius: 99px 99px 99px 4px; box-shadow: 0 2px 6px rgba(0,0,0,.4); z-index: 2; }
#homeUi .good.adCard .gIc { border-color: #2f9c4a; }

/* ===== 英雄选择条 ===== */
#homeUi .heroPick { display: flex; gap: calc(12px * var(--hs,1)); overflow-x: auto; padding-bottom: calc(12px * var(--hs,1)); }
#homeUi .heroPick::-webkit-scrollbar { display: none; }
#homeUi .hpick { flex: none; width: calc(124px * var(--hs,1)); position: relative; background: none; border: none; cursor: pointer;
  font-family: inherit; color: #8ba3c7; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .hpick .pic { width: calc(100px * var(--hs,1)); height: calc(100px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background-color: #16233b; background-position: center; border: 1px solid #33507a; transition: .2s; }
#homeUi .hpick i { font-style: normal; font-size: calc(20px * var(--hs,1)); white-space: nowrap; }
#homeUi .hpick.on .pic { border-color: #f5c451; box-shadow: 0 0 12px rgba(245,196,81,.5); transform: translateY(calc(-6px * var(--hs,1))); }
#homeUi .hpick.on { color: #ffe9a8; }
#homeUi .hpick.lock .pic { filter: grayscale(1) brightness(.55); }
#homeUi .hpick.lock::after { content: '🔒'; position: absolute; transform: translate(calc(32px * var(--hs,1)), calc(-80px * var(--hs,1))); font-size: calc(24px * var(--hs,1)); }

/* ===== 英雄页 ===== */
#homeUi .heroHead { display: flex; justify-content: space-between; align-items: center; margin: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .heroName { font-size: calc(36px * var(--hs,1)); font-weight: 900; letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .star { color: #f5c451; font-size: calc(26px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); margin-left: calc(8px * var(--hs,1)); text-shadow: 0 0 6px rgba(245,196,81,.6); }
#homeUi .tagRow { display: flex; gap: calc(10px * var(--hs,1)); margin-top: calc(10px * var(--hs,1)); }
#homeUi .powerBadge { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); background: linear-gradient(180deg, #2a3f66, #1a2947);
  border: 1px solid #8a6a20; border-radius: 99px; padding: calc(10px * var(--hs,1)) calc(24px * var(--hs,1));
  font-weight: 900; color: #ffe9a8; font-size: calc(28px * var(--hs,1)); box-shadow: 0 0 12px rgba(240,177,62,.2); }
#homeUi .heroMain { display: grid; grid-template-columns: 1fr calc(300px * var(--hs,1)) 1fr; align-items: center; gap: calc(8px * var(--hs,1)); padding: calc(12px * var(--hs,1)) 0; }
#homeUi .slotCol { display: flex; flex-direction: column; gap: calc(24px * var(--hs,1)); align-items: center; }
#homeUi .slot { width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); border-radius: calc(18px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #1a2a4a, #0d1626); border: 1px solid #33507a; position: relative;
  display: flex; align-items: center; justify-content: center; font-size: calc(46px * var(--hs,1)); cursor: pointer; }
#homeUi .slot.filled { border-color: #8a6a20; box-shadow: 0 0 8px rgba(240,177,62,.25); }
#homeUi .slot.empty { border-style: dashed; color: #4a608a; }
#homeUi .slot .slv { position: absolute; right: calc(-10px * var(--hs,1)); bottom: calc(-10px * var(--hs,1));
  background: linear-gradient(180deg, #ffe9a8, #e0a23c); color: #5a3a08; font-size: calc(18px * var(--hs,1)); font-weight: 900;
  padding: calc(2px * var(--hs,1)) calc(10px * var(--hs,1)); border-radius: calc(12px * var(--hs,1)); border: 1px solid #8a5c12; }
#homeUi .slot .sname { position: absolute; top: calc(-40px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  font-size: calc(18px * var(--hs,1)); color: #8ba3c7; white-space: nowrap; }
#homeUi .heroFigure { height: calc(420px * var(--hs,1)); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
#homeUi .halo { position: absolute; width: calc(256px * var(--hs,1)); height: calc(256px * var(--hs,1)); border-radius: 50%;
  border: 2px dashed rgba(120,180,255,.35); animation: huiSpin 16s linear infinite; }
#homeUi .halo2 { position: absolute; width: calc(192px * var(--hs,1)); height: calc(192px * var(--hs,1)); border-radius: 50%;
  background: radial-gradient(circle, rgba(92,200,255,.22), transparent 70%); animation: huiPulse 3s ease-in-out infinite; }
@keyframes huiSpin { to { transform: rotate(360deg); } }
@keyframes huiPulse { 0%, 100% { transform: scale(1); opacity: .8; } 50% { transform: scale(1.18); opacity: 1; } }
#homeUi .heroEmoji { width: calc(220px * var(--hs,1)); height: calc(280px * var(--hs,1)); z-index: 2; cursor: pointer;
  background-position: center bottom; background-repeat: no-repeat; filter: drop-shadow(0 6px 14px rgba(0,0,0,.6)); }
#homeUi .heroEmoji.lock { filter: grayscale(1) brightness(.55); }
#homeUi .heroLv { z-index: 2; margin-top: calc(16px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a; border-radius: 99px;
  font-size: calc(22px * var(--hs,1)); color: #5cc8ff; font-weight: 800; padding: calc(4px * var(--hs,1)) calc(24px * var(--hs,1)); }
#homeUi .statRow { display: flex; gap: calc(16px * var(--hs,1)); margin: calc(16px * var(--hs,1)) 0 calc(24px * var(--hs,1)); }
#homeUi .stat { flex: 1; text-align: center; padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .stat b { display: block; font-size: calc(30px * var(--hs,1)); color: #dce8f7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .row3 { display: flex; gap: calc(16px * var(--hs,1)); margin-top: calc(20px * var(--hs,1)); }
#homeUi .row3 .btn { flex: 1; height: calc(76px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }

/* ===== 关卡页 ===== */
#homeUi .chTabs { display: flex; gap: calc(12px * var(--hs,1)); }
#homeUi .chTabs button { flex: 1; height: calc(80px * var(--hs,1)); border-radius: calc(18px * var(--hs,1)); border: 1px solid #33507a;
  background: #101d38; color: #8ba3c7; font-family: inherit; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(2px * var(--hs,1)); padding: calc(4px * var(--hs,1)); }
#homeUi .chTabs button b { font-size: calc(22px * var(--hs,1)); white-space: nowrap; }
#homeUi .chTabs button span { font-size: calc(16px * var(--hs,1)); }
#homeUi .chTabs button.on { background: linear-gradient(180deg, #3a567f, #243a63); color: #ffe9a8; border-color: #8a6a20;
  box-shadow: 0 0 12px rgba(240,177,62,.2); }
#homeUi .chTabs button.lock { opacity: .45; }
#homeUi .lvlTrack { position: relative; margin: calc(40px * var(--hs,1)) calc(16px * var(--hs,1)) calc(40px * var(--hs,1)); height: calc(52px * var(--hs,1)); }
#homeUi .lvlTrack::before { content: ''; position: absolute; top: calc(22px * var(--hs,1)); left: 6px; right: 6px; height: calc(6px * var(--hs,1));
  border-radius: 99px; background: #22345a; }
#homeUi .dot { position: absolute; top: calc(8px * var(--hs,1)); width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1));
  border-radius: 50%; background: #1a2947; border: 2px solid #3a567f; transform: translateX(-50%); z-index: 2; }
#homeUi .dot.done { background: linear-gradient(180deg, #ffe9a8, #e0a23c); border-color: #8a5c12; box-shadow: 0 0 6px rgba(240,177,62,.5); }
#homeUi .dot.cur { width: calc(44px * var(--hs,1)); height: calc(44px * var(--hs,1)); top: calc(2px * var(--hs,1));
  background: radial-gradient(circle, #fff2c8, #f0b13e); border-color: #fff; box-shadow: 0 0 14px rgba(245,196,81,.9); }
#homeUi .dot em { position: absolute; top: calc(40px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  font-style: normal; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; white-space: nowrap; }
#homeUi .scene { height: calc(500px * var(--hs,1)); border-radius: calc(24px * var(--hs,1)); overflow: hidden; position: relative; margin-top: calc(28px * var(--hs,1));
  border: 1px solid #3a567f; box-shadow: 0 8px 24px rgba(0,0,0,.45);
  background: linear-gradient(180deg, #2b1b3d, #5a2e2a 45%, #8a4a2a 72%, #3a2a20); }
#homeUi .scene.c2 { background: linear-gradient(180deg, #0d1f1a, #1a3a28 50%, #0e2418); }
#homeUi .scene.c3 { background: linear-gradient(180deg, #0a1030, #1a2050 55%, #101838); }
#homeUi .scene .sun { position: absolute; top: 32%; left: 50%; width: calc(176px * var(--hs,1)); height: calc(176px * var(--hs,1));
  transform: translateX(-50%); border-radius: 50%; background: radial-gradient(circle, #ffe0ae, #ff8c4a 58%, transparent 72%); filter: blur(1px); }
#homeUi .scene.c2 .sun, #homeUi .scene.c3 .sun { display: none; }
#homeUi .scene .mtn { position: absolute; bottom: 26%; left: 0; right: 0; height: calc(128px * var(--hs,1)); background: #241a2c; opacity: .9;
  clip-path: polygon(0 100%, 10% 42%, 20% 68%, 32% 18%, 44% 60%, 56% 28%, 68% 66%, 80% 22%, 92% 58%, 100% 100%); }
#homeUi .scene .hill { position: absolute; bottom: 24%; left: 0; right: 0; height: calc(88px * var(--hs,1)); background: #1a1420;
  clip-path: polygon(0 100%, 15% 55%, 30% 80%, 50% 40%, 70% 75%, 85% 50%, 100% 85%, 100% 100%); }
#homeUi .scene .ground { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; background: linear-gradient(180deg, #3a3128, #221d16); }
#homeUi .scene .road { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; background: #2c2a30;
  clip-path: polygon(40% 0, 60% 0, 108% 100%, -8% 100%); }
#homeUi .scene .dash { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; opacity: .8;
  background: repeating-linear-gradient(180deg, #e8c85a 0 20px, transparent 20px 44px);
  clip-path: polygon(49.2% 0, 50.8% 0, 52% 100%, 48% 100%); }
#homeUi .scene .mobs { position: absolute; top: 8%; left: 0; right: 0; display: flex; justify-content: space-around; font-size: calc(40px * var(--hs,1)); }
#homeUi .scene .mobs span { animation: huiMob 2.6s ease-in-out infinite alternate; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
#homeUi .scene .mobs span:nth-child(2) { animation-delay: .5s; font-size: calc(52px * var(--hs,1)); }
#homeUi .scene .mobs span:nth-child(3) { animation-delay: 1s; font-size: calc(32px * var(--hs,1)); }
@keyframes huiMob { from { transform: translateY(0) scale(1); } to { transform: translateY(32px) scale(1.1); } }
#homeUi .scene .veh { position: absolute; bottom: 7%; left: 50%; transform: translateX(-50%); font-size: calc(92px * var(--hs,1)); z-index: 2;
  filter: drop-shadow(0 8px 10px rgba(0,0,0,.55)); animation: huiVeh 1.8s ease-in-out infinite; }
@keyframes huiVeh { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-6px); } }
#homeUi .scene .crew { position: absolute; bottom: 9%; left: 50%; transform: translateX(-50%); display: flex; gap: calc(28px * var(--hs,1)); z-index: 1; }
#homeUi .scene .crew i { width: calc(22px * var(--hs,1)); height: calc(22px * var(--hs,1)); border-radius: 50%; box-shadow: 0 0 8px currentColor; animation: huiPulse 2s ease-in-out infinite; }
#homeUi .scene .crew i:nth-child(1) { color: #5cc8ff; background: #5cc8ff; }
#homeUi .scene .crew i:nth-child(2) { color: #f5c451; background: #f5c451; animation-delay: .3s; }
#homeUi .scene .crew i:nth-child(3) { color: #7ef0c8; background: #7ef0c8; animation-delay: .6s; }
#homeUi .scene .crew i:nth-child(4) { color: #c792ff; background: #c792ff; animation-delay: .9s; }
#homeUi .sceneInfo { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-start;
  padding: calc(16px * var(--hs,1)); z-index: 5; }
#homeUi .siChip { background: rgba(10,20,38,.8); border: 1px solid #33507a; border-radius: calc(16px * var(--hs,1));
  padding: calc(8px * var(--hs,1)) calc(20px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); font-weight: 700; }
#homeUi .siHp { display: flex; align-items: center; gap: calc(8px * var(--hs,1)); background: rgba(10,20,38,.8);
  border: 1px solid #33507a; border-radius: calc(16px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(16px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .arrow { position: absolute; top: 46%; width: calc(68px * var(--hs,1)); height: calc(68px * var(--hs,1)); border-radius: 50%; z-index: 6; cursor: pointer;
  background: rgba(10,20,38,.6); border: 1px solid #4f7ab8; color: #ffe9a8; font-size: calc(36px * var(--hs,1)); font-weight: 900;
  display: flex; align-items: center; justify-content: center; }
#homeUi .arrow.l { left: calc(16px * var(--hs,1)); }
#homeUi .arrow.r { right: calc(16px * var(--hs,1)); }
#homeUi .stageInfo { display: flex; gap: calc(16px * var(--hs,1)); margin: calc(24px * var(--hs,1)) 0; }
#homeUi .siBox { flex: 1; text-align: center; padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .siBox b { display: block; font-size: calc(26px * var(--hs,1)); color: #dce8f7; margin-top: calc(6px * var(--hs,1)); }
#homeUi .siBox b.ok { color: #7fe08a; }
#homeUi .siBox b.go { color: #ffe9a8; }
#homeUi .chests { display: flex; gap: calc(16px * var(--hs,1)); }
#homeUi .chest { flex: 1; text-align: center; padding: calc(20px * var(--hs,1)) calc(8px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .chest .cic { font-size: calc(64px * var(--hs,1)); display: block; }
#homeUi .chest p { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); }
#homeUi .chest.ready { border-color: #8a6a20; animation: huiChest 1.8s ease-in-out infinite; }
@keyframes huiChest { 0%, 100% { box-shadow: 0 0 6px rgba(240,177,62,.2); } 50% { box-shadow: 0 0 18px rgba(240,177,62,.55); } }
#homeUi .chest.got { opacity: .55; }
#homeUi .chest.got .cic { filter: grayscale(1); }
#homeUi .chest.lock { opacity: .7; }
#homeUi .chest.lock .cic { filter: grayscale(.7) brightness(.8); }
#homeUi .stageBtns { display: flex; gap: calc(20px * var(--hs,1)); margin-top: calc(28px * var(--hs,1)); }
#homeUi .stageBtns .btn.squad { flex: 1; height: calc(88px * var(--hs,1)); font-size: calc(28px * var(--hs,1)); }
#homeUi .stageBtns .btn.go { flex: 1.7; height: calc(88px * var(--hs,1)); font-size: calc(34px * var(--hs,1)); letter-spacing: calc(6px * var(--hs,1)); }

/* ===== 技能页 ===== */
#homeUi .skillCard { display: flex; gap: calc(20px * var(--hs,1)); align-items: center; padding: calc(20px * var(--hs,1)); margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .sIcon { width: calc(96px * var(--hs,1)); height: calc(96px * var(--hs,1)); flex: none; border-radius: calc(20px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1));
  background-color: #16233b; background-position: center; border: 1px solid #3a8ad0; box-shadow: 0 0 8px rgba(60,140,220,.3) inset; }
#homeUi .sIcon.s2 { border-color: #9a5ce0; box-shadow: 0 0 8px rgba(160,90,230,.35) inset; }
#homeUi .sIcon.ult { border-color: #e0a23c; box-shadow: 0 0 12px rgba(240,170,60,.5) inset, 0 0 10px rgba(240,170,60,.25); }
#homeUi .sInfo { flex: 1; min-width: 0; }
#homeUi .sName { font-size: calc(28px * var(--hs,1)); font-weight: 800; display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .sDesc { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); line-height: 1.5; }
#homeUi .sAct { text-align: center; flex: none; width: calc(164px * var(--hs,1)); }
#homeUi .sLv { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: #5cc8ff; margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .skillHint { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; text-align: center; margin-top: calc(8px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }

/* ===== 基地页 ===== */
#homeUi .baseBanner { padding: calc(24px * var(--hs,1)) calc(28px * var(--hs,1)); display: flex; align-items: center; gap: calc(24px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .bbIc { font-size: calc(68px * var(--hs,1)); filter: drop-shadow(0 0 8px rgba(92,200,255,.4)); }
#homeUi .baseBanner h3 { font-size: calc(30px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .baseBanner .pros { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); }
#homeUi .prosBar { width: calc(300px * var(--hs,1)); height: calc(12px * var(--hs,1)); background: #0a1426; border: 1px solid #2c405f;
  border-radius: 99px; margin-top: calc(8px * var(--hs,1)); overflow: hidden; }
#homeUi .prosBar i { display: block; height: 100%; width: 62%; background: linear-gradient(90deg, #f0b13e, #ffe9a8); }
#homeUi .baseGrid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(20px * var(--hs,1)); }
#homeUi .bcard { padding: calc(20px * var(--hs,1)); text-align: center; }
#homeUi .bIc { width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); margin: 0 auto calc(12px * var(--hs,1)); border-radius: calc(24px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(52px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #0d1626); border: 1px solid #33507a; }
#homeUi .bName { font-size: calc(26px * var(--hs,1)); font-weight: 800; }
#homeUi .bName span { color: #5cc8ff; font-size: calc(22px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); }
#homeUi .bDesc { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin: calc(8px * var(--hs,1)) 0 calc(16px * var(--hs,1)); min-height: calc(56px * var(--hs,1)); line-height: 1.4; }

/* ===== 弹窗 ===== */
#homeUi .protoMask { position: absolute; inset: 0; background: rgba(4,8,16,.72); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: calc(40px * var(--hs,1)); }
#homeUi .mbox { width: 100%; max-height: 82%; overflow-y: auto; background: linear-gradient(180deg, #22355c, #14203a);
  border: 1px solid #4a6a9a; border-radius: calc(28px * var(--hs,1)); padding: calc(32px * var(--hs,1)) calc(28px * var(--hs,1));
  box-shadow: 0 20px 50px rgba(0,0,0,.6); }
#homeUi .mHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .mHead h3 { font-size: calc(32px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); color: #ffe9a8; }
#homeUi .mClose { background: #0d1930; border: 1px solid #33507a; color: #8ba3c7; width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1));
  border-radius: 50%; cursor: pointer; font-size: calc(24px * var(--hs,1)); }
#homeUi .mSub { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .mRow { display: flex; justify-content: space-between; align-items: center; background: #0d1930; border: 1px solid #33507a;
  border-radius: calc(18px * var(--hs,1)); padding: calc(20px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); gap: calc(16px * var(--hs,1)); }
#homeUi .bagTabs { display: flex; gap: calc(12px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .bagTabs button { flex: 1; height: calc(56px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); border: 1px solid #33507a;
  background: #101d38; color: #8ba3c7; font-family: inherit; font-size: calc(24px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .bagTabs button.on { color: #ffe9a8; border-color: #8a6a20; background: #1c2c4d; }
#homeUi .bagGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(16px * var(--hs,1)); }
#homeUi .bcell { position: relative; border-radius: calc(18px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #1a2a4a, #0d1626);
  border: 1px solid #33507a; height: calc(124px * var(--hs,1)); display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1)); cursor: pointer; }
#homeUi .bcell.r3 { border-color: #3a8ad0; }
#homeUi .bcell.r4 { border-color: #9a5ce0; }
#homeUi .bcell.r5 { border-color: #e0a23c; }
#homeUi .bcell em { position: absolute; right: calc(6px * var(--hs,1)); bottom: calc(4px * var(--hs,1)); font-style: normal;
  font-size: calc(18px * var(--hs,1)); color: #dce8f7; font-weight: 700; text-shadow: 0 1px 2px #000; }
#homeUi .sqRow { display: flex; gap: calc(16px * var(--hs,1)); justify-content: center; margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .sqSlot { width: calc(132px * var(--hs,1)); height: calc(148px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #0d1626); border: 1px solid #8a6a20; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(8px * var(--hs,1)); font-size: calc(48px * var(--hs,1)); }
#homeUi .sqSlot span { font-size: calc(20px * var(--hs,1)); color: #dce8f7; font-weight: 700; }
#homeUi .sqSlot.empty { border-style: dashed; border-color: #33507a; color: #4a608a; }
#homeUi .cand { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(16px * var(--hs,1)); }
#homeUi .candB { border: 1px solid #33507a; background: #101d38; border-radius: calc(18px * var(--hs,1)); padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1));
  cursor: pointer; font-family: inherit; color: #dce8f7; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .equipRow { display: flex; align-items: center; gap: calc(16px * var(--hs,1)); padding: calc(16px * var(--hs,1)) calc(20px * var(--hs,1));
  border-radius: calc(18px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a; margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .equipInfo { flex: 1; min-width: 0; }
#homeUi .equipName { font-size: calc(26px * var(--hs,1)); font-weight: 700; }
#homeUi .equipStat { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); }

/* ===== 底部导航 ===== */
#homeUi .tabbar { flex: none; height: calc(150px * var(--hs,1)); display: flex; align-items: center; justify-content: space-around; position: relative; z-index: 20;
  background: linear-gradient(180deg, #182947, #0b1426); border-top: 1px solid #33507a; }
#homeUi .tabbar::before { content: ''; position: absolute; top: -1px; left: 8%; right: 8%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(240,177,62,.55), transparent); }
#homeUi .tab { background: none; border: none; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1));
  color: #7e93b8; font-size: calc(22px * var(--hs,1)); font-weight: 700; padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); position: relative; }
#homeUi .tab .ticon { width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(42px * var(--hs,1)); filter: grayscale(.4); transition: .2s; }
#homeUi .tab.on { color: #ffe9a8; }
#homeUi .tab.on .ticon { filter: none; transform: translateY(calc(-4px * var(--hs,1))) scale(1.12); filter: drop-shadow(0 0 8px rgba(245,196,81,.8)); }
#homeUi .tab.on::after { content: ''; position: absolute; top: calc(-18px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  width: calc(52px * var(--hs,1)); height: calc(6px * var(--hs,1)); border-radius: 99px;
  background: linear-gradient(90deg, transparent, #f5c451, transparent); box-shadow: 0 0 8px #f5c451; }
#homeUi .tab.main { margin-top: calc(-60px * var(--hs,1)); width: calc(128px * var(--hs,1)); height: calc(128px * var(--hs,1)); border-radius: 50%; color: #5a3a08;
  background: linear-gradient(180deg, #ffe9a6, #f0b13e 55%, #c9861f); border: 2px solid #8a5c12;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #7c520f, 0 8px 20px rgba(240,177,62,.45);
  font-size: calc(22px * var(--hs,1)); animation: huiMain 2.4s ease-in-out infinite; }
#homeUi .tab.main .ticon { font-size: calc(48px * var(--hs,1)); filter: none; }
#homeUi .tab.main.on::after { display: none; }
@keyframes huiMain { 0%, 100% { box-shadow: inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #7c520f, 0 8px 20px rgba(240,177,62,.45); }
  50% { box-shadow: inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #7c520f, 0 8px 30px rgba(240,177,62,.75); } }

/* ===== 广告层/水印 ===== */
#homeUi .adOverlay { position: absolute; inset: 0; z-index: 400; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: calc(24px * var(--hs,1)); background: rgba(4,8,16,.92); }
#homeUi .adTitle { font-size: calc(40px * var(--hs,1)); color: #ffe9a8; font-weight: 800; }
#homeUi .adCountdown { font-size: calc(120px * var(--hs,1)); color: #5cc8ff; font-weight: 900; }
#homeUi .adTip { font-size: calc(24px * var(--hs,1)); color: #8ba3c7; }
#homeUi .homeStamp { position: absolute; right: calc(16px * var(--hs,1)); bottom: calc(160px * var(--hs,1)); font-size: calc(16px * var(--hs,1));
  color: rgba(140,170,210,.4); z-index: 5; pointer-events: none; }
`;
        document.head.appendChild(style);
    }
}
