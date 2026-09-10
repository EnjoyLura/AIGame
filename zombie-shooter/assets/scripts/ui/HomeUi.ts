import { _decorator, Component, SpriteFrame } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES, BUILDINGS } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { ShopData, ShopItem } from '../core/ShopData';
import { SoundFx } from '../core/SoundFx';
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, WEAPON_CORE_DEFS, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot, BagItem, MiscItemDef, MISC_ITEM_DEFS, miscDef, lootRateText, tierRank, EquipTier } from '../core/HeroSystem';
import { HERO_DEFS, ABILITY_LEVEL_DMG_BONUS } from '../battle/HeroDef';
import { STAGES, FINAL_STAGE_ID, stageInfo, stageWaves } from '../battle/StageData';

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
    private _missionTitleEl: HTMLElement | null = null;
    /** 已领取宝箱的关卡（对齐原型 claimedRewards：ready 领取后置 got） */
    private _claimedChests = new Set<string>();
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
    /** 英雄页内嵌物品栏当前页签（equip/gem/mat/item） */
    private _heroBagTab: 'equip' | 'gem' | 'mat' | 'item' = 'equip';
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
                const w = canvas.getBoundingClientRect().width;
                // --hs：设计宽 1080 缩放；--pw：原型 430px 手机框等比缩放（interface.css 覆盖层用）
                document.documentElement.style.setProperty('--hs', (w / 1080).toFixed(4));
                document.documentElement.style.setProperty('--pw', (w / 430).toFixed(4));
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
        // 原型 interface.css：头像底图 = commander.png（照片），无 emoji
        this._tex('characters/commander', u => {
            face.style.backgroundImage = u;
            face.style.backgroundSize = '180% auto';
            face.style.backgroundPosition = 'center 8%';
            face.style.backgroundRepeat = 'no-repeat';
            face.textContent = '';
        });
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
        const mkRes = (id: 'gold' | 'diamond' | 'stamina', texKey: string) => {
            const chip = document.createElement('div');
            chip.className = 'res';
            const ico = document.createElement('span');
            this._tex(texKey, u => {
                ico.style.backgroundImage = u;
                ico.style.backgroundSize = 'contain';
                ico.style.backgroundRepeat = 'no-repeat';
                ico.style.backgroundPosition = 'center';
                ico.style.width = 'calc(22px * var(--pw,2.5))';
                ico.style.height = 'calc(22px * var(--pw,2.5))';
                ico.style.display = 'inline-block';
                ico.textContent = '';
            });
            chip.appendChild(ico);
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
        mkRes('gold', 'ui/res_gold');
        mkRes('diamond', 'ui/res_diamond');
        mkRes('stamina', 'ui/res_stamina');
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
            stamina.textContent = `${gm.stamina()}/${gm.staminaMax()}`;
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
                // 原型 interface.css：普通页签图标 34px、主钮图标 39px（430px 口径）
                const iw = item.main ? 39 : 34;
                icon.style.width = `calc(${iw}px * var(--pw,2.5))`;
                icon.style.height = `calc(${iw}px * var(--pw,2.5))`;
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
    /**
     * 原型人物照片挂载（interface.css 规则）：
     * idx 0 = commander.png（特写），idx 1-3 = specialists.png 横向三联精灵图；
     * mount 区分三种挂载的 background 尺寸（头像条/大立绘/小编队格）。
     */
    private _heroPhoto(idx: number, mount: 'pick' | 'figure' | 'slot'): { key: string; css: string } {
        const key = idx <= 0 ? 'characters/commander' : 'characters/specialists';
        const i = Math.max(0, idx - 1) * 50;
        if (mount === 'pick') {
            return idx <= 0
                ? { key, css: 'background-size:160% auto;background-position:center 8%;background-repeat:no-repeat;' }
                : { key, css: `background-size:300% auto;background-position:${i}% 10%;background-repeat:no-repeat;` };
        }
        if (mount === 'figure') {
            return idx <= 0
                ? { key, css: 'background-size:contain;background-position:center;background-repeat:no-repeat;' }
                : { key, css: `background-size:300% 100%;background-position:${i}% center;background-repeat:no-repeat;` };
        }
        return { key, css: 'background-size:contain;background-position:center;background-repeat:no-repeat;' };
    }

    /** 页面头部标题（对齐原型 screen-heading：h2 主标题 + small 副题） */
    private _mkHeading(h2: string, small: string): HTMLDivElement {
        const hd = document.createElement('div');
        hd.className = 'screenHeading';
        const t = document.createElement('h2');
        t.textContent = h2;
        const s = document.createElement('small');
        s.textContent = small;
        hd.appendChild(t);
        hd.appendChild(s);
        return hd;
    }

    private _buildMallPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.mall = page;
        page.appendChild(this._mkHeading('补给商店', '每日精选'));

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
        // 浅色主题：banner 底图 = escort.png 照片（interface.css：center 45%/cover），左暗渐变由 CSS ::after 完成
        this._tex('scenes/escort', u => {
            banner.style.backgroundImage = u;
            banner.style.backgroundSize = 'cover';
            banner.style.backgroundPosition = 'center 45%';
            banner.style.backgroundRepeat = 'no-repeat';
        });
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
            // 材料页签 = 商城道具（ShopData）+ 体力广告卡
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
        page.appendChild(this._mkHeading('英雄档案', '护卫队 / 04'));
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
            pic.dataset.hero = String(i);
            const photo = this._heroPhoto(i, 'pick');
            this._tex(photo.key, u => {
                pic.style.backgroundImage = u;
                pic.style.backgroundRepeat = 'no-repeat';
                pic.style.cssText += photo.css;
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
            // 星级：按品质固定 4 星（等级玩法移除，星级改为静态标签）
            stars.textContent = '★★★★☆';
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
                let tier: EquipTier = 1;
                if (cur.id.startsWith('bag:')) {
                    tier = Number(cur.id.split(':')[2]) as EquipTier;
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
        emoji.dataset.hero = String(idx);
        const heroPhoto = this._heroPhoto(idx, 'figure');
        this._tex(heroPhoto.key, u => {
            emoji.style.backgroundImage = u;
            emoji.style.backgroundRepeat = 'no-repeat';
            emoji.style.backgroundSize = 'contain';
            emoji.style.backgroundPosition = 'center';
        });
        emoji.title = owned ? def.name : '未获得';
        const heroLv = document.createElement('div');
        heroLv.className = 'heroLv';
        heroLv.textContent = owned ? def.role : '未获得';
        fig.appendChild(halo);
        fig.appendChild(halo2);
        fig.appendChild(emoji);
        fig.appendChild(heroLv);
        const colR = document.createElement('div');
        colR.className = 'slotCol';
        colR.appendChild(mkSlot('wrist'));
        colR.appendChild(mkSlot('legs'));
        colR.appendChild(mkSlot('shoes'));
        // 右缘纵向按钮列：英雄核心 / 武器强化（英雄立绘与左槽列之间，用户指定落点）
        const side = document.createElement('div');
        side.className = 'sideActions';
        if (owned) {
            const coreBtn = document.createElement('button');
            coreBtn.className = 'btn blue';
            coreBtn.textContent = '🧬 核心';
            coreBtn.title = '英雄核心';
            coreBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openCoreModal(def.id);
            };
            const wpnBtn = document.createElement('button');
            wpnBtn.className = 'btn blue';
            wpnBtn.textContent = '🔧 强化';
            wpnBtn.title = '武器强化';
            wpnBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openWeaponModal(def.id);
            };
            side.appendChild(coreBtn);
            side.appendChild(wpnBtn);
        }
        main.appendChild(colL);
        main.appendChild(side);
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

        // 大按钮（上阵/下阵）已按需求移除：编队切换统一走关卡页护送编队弹窗

        // 底部内嵌物品栏：四页签（装备/宝石/材料/道具），点击物品弹详情
        const bar = document.createElement('div');
        bar.className = 'bagBar';
        const tabs = document.createElement('div');
        tabs.className = 'bagTabs';
        const mkTab = (key: 'equip' | 'gem' | 'mat' | 'item', label: string) => {
            const b = document.createElement('button');
            if (this._heroBagTab === key) {
                b.className = 'on';
            }
            b.textContent = label;
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._heroBagTab = key;
                this._refreshHeroes();
            };
            tabs.appendChild(b);
        };
        mkTab('equip', '🛡️ 装备');
        mkTab('gem', '💎 宝石');
        mkTab('mat', '⚙️ 材料');
        mkTab('item', '🧪 道具');
        bar.appendChild(tabs);
        const grid = document.createElement('div');
        grid.className = 'bagGrid';
        if (this._heroBagTab === 'equip') {
            const items = gm.bag;
            if (items.length === 0) {
                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.textContent = '装备背包空空如也 · 去商店购买装备部件';
                grid.appendChild(tip);
            }
            for (const it of items) {
                const cell = document.createElement('div');
                cell.className = `bcell r${tierRank(it.tier)}`;
                cell.innerHTML = `${SLOT_EMOJI[it.slot]}<em>+${it.lv}</em>`;
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBagItemTip(def.id, { slot: it.slot, tier: it.tier, lv: it.lv });
                };
                grid.appendChild(cell);
            }
        } else {
            for (const md of MISC_ITEM_DEFS) {
                const n = hs.miscCount(md.id);
                if (n <= 0) {
                    continue;
                }
                const cell = document.createElement('div');
                cell.className = `bcell r${md.tier}`;
                cell.innerHTML = `${md.ic}<em>×${n}</em>`;
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBagItemTip(def.id, md);
                };
                grid.appendChild(cell);
            }
            if (grid.children.length === 0) {
                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.textContent = this._heroBagTab === 'gem' ? '暂无宝石 · 商店后续开放'
                    : this._heroBagTab === 'mat' ? '暂无材料 · 关卡与商店产出'
                        : '暂无道具 · 商城与活动产出';
                grid.appendChild(tip);
            }
        }
        bar.appendChild(grid);
        body.appendChild(bar);
        this._applyPendingTex();
    }

    /** 内嵌物品栏物品详情弹窗：装备可穿戴（走穿戴面板），道具可用则显示使用按钮 */
    private _openBagItemTip(heroId: string, src: BagItem | MiscItemDef): void {
        const hs = HeroSystem.instance;
        const isEquip = (src as BagItem).slot !== undefined;
        const title = isEquip
            ? `${bagItemName(src as BagItem)} · +${(src as BagItem).lv}`
            : `${(src as MiscItemDef).ic} ${(src as MiscItemDef).name}`;
        this._openModal(title, (box, close) => {
            const info = document.createElement('p');
            info.className = 'mSub';
            if (isEquip) {
                const it = src as BagItem;
                const parts: string[] = [];
                for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                    const v = Math.round(bagItemValue(it, key) * 100);
                    if (v > 0) {
                        parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                    }
                }
                info.innerHTML = `<b style="color:${EQUIP_TIER_COLORS[it.tier - 1]}">${EQUIP_TIER_NAMES[it.tier - 1]}${EQUIP_SLOT_NAMES[it.slot]}</b>` +
                    ` · 强化 +${it.lv}<br>${parts.join(' ') || '无属性'}`;
            } else {
                const md = src as MiscItemDef;
                const n = hs.miscCount(md.id);
                info.innerHTML = `<b style="color:${EQUIP_TIER_COLORS[md.tier - 1]}">${md.name}</b> · 持有 ×${n}<br>${md.desc}`;
            }
            box.appendChild(info);
            if (isEquip) {
                const btn = document.createElement('button');
                btn.className = 'btn gold big';
                btn.textContent = '装 备';
                btn.onclick = () => {
                    close();
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openEquipSlotPanel(heroId, (src as BagItem).slot);
                };
                box.appendChild(btn);
            } else if (miscDef((src as MiscItemDef).id)?.use) {
                const btn = document.createElement('button');
                btn.className = 'btn gold big';
                btn.textContent = '使 用';
                btn.onclick = () => {
                    if (hs.useMisc((src as MiscItemDef).id)) {
                        SoundFx.play('buy');
                        this._toast('使用成功');
                        close();
                        this._refreshHeroes();
                    }
                };
                box.appendChild(btn);
            }
            const closeBar = document.createElement('button');
            closeBar.className = 'btn dark sm';
            closeBar.textContent = '关 闭';
            closeBar.onclick = (e) => {
                e.stopPropagation();
                close();
            };
            box.appendChild(closeBar);
        });
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
                let tier: EquipTier = 1;
                let name = '';
                if (cur.id.startsWith('bag:')) {
                    tier = Number(cur.id.split(':')[2]) as EquipTier;
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
        page.className = 'screen sStage';
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

        // 护送场景（CSS 动画：太阳/山丘/公路/载具/怪物 + 任务标题 + 最佳耐久 + 左右箭头）
        const scene = document.createElement('div');
        scene.className = 'scene frame';
        scene.innerHTML = `<div class="sun"></div><div class="mtn"></div><div class="hill"></div>` +
            `<div class="ground"></div><div class="road"></div><div class="dash"></div>` +
            `<div class="mobs"><span>🐺</span><span>🐗</span><span>🦅</span></div>` +
            `<div class="veh">🚚</div>` +
            `<div class="crew"><i></i><i></i><i></i><i></i></div>` +
            `<div class="sceneTitle"><small>末日航线 / 护送行动</small><h1 class="missionTitle"></h1>` +
            `<p>穿越荒原，让希望抵达下一站。</p></div>` +
            `<div class="sceneInfo"><div class="siChip"></div>` +
            `<div class="siHp">最佳耐久 <div class="hpBar"><i></i></div> 82%</div></div>`;
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
        // 浅色主题：场景底图 = escort.png 照片（interface.css：center 57%/cover），CSS 装饰子元素全部隐藏
        this._tex('scenes/escort', u => {
            scene.style.backgroundImage = u;
            scene.style.backgroundSize = 'cover';
            scene.style.backgroundPosition = 'center 57%';
            scene.style.backgroundRepeat = 'no-repeat';
        });
        this._sceneChipEl = scene.querySelector('.siChip');
        this._vehEl = scene.querySelector('.veh');
        this._mobsEl = scene.querySelector('.mobs');
        this._missionTitleEl = scene.querySelector('.missionTitle');
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

        // 通关结算奖励预览：金币区间 + 装备/核心/稀有杂物掉落率（真数据公式）
        const lootPrev = document.createElement('div');
        lootPrev.className = 'lootPrev panel';
        lootPrev.innerHTML = `<div class="lpHead">⚔️ 通关结算奖励预览</div>` +
            `<div class="lpRow"><span class="lpIc">🪙</span><span class="lpLab">金币收益区间</span><b class="lpVal lpGold"></b></div>` +
            `<div class="lpRow"><span class="lpIc">🎁</span><span class="lpLab">装备掉落率</span><b class="lpVal lpEquip"></b></div>` +
            `<div class="lpRow"><span class="lpIc">⚙️</span><span class="lpLab">英雄核心掉落率</span><b class="lpVal lpCore"></b></div>` +
            `<div class="lpRow"><span class="lpIc">💎</span><span class="lpLab">稀有杂物掉落率</span><b class="lpVal lpRare"></b></div>` +
            `<p class="lpNote">※ 掉率随关卡难度提升 · 装备强化等级 +1~+3 随机</p>`;
        page.appendChild(lootPrev);
        this._lootPrevEl = lootPrev;

        // 耐久结算宝箱三档
        const chestTitle = document.createElement('div');
        chestTitle.className = 'secTitle';
        chestTitle.textContent = '🎁 护送奖励 · 越少受伤，奖励越丰厚';
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
    /** 战斗页掉落预览容器（_refreshStagePage 填充金币区间与掉率） */
    private _lootPrevEl: HTMLDivElement | null = null;

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

        // 波次进度轨道（done = 已通关整关全部点亮 / 当前关 cur 高亮 + 下一格 available / 未达 lock）
        track.innerHTML = '';
        const clearedAll = stageId <= gm.stageCleared;
        for (let w = 0; w < WAVES_PER_STAGE; w++) {
            const dot = document.createElement('span');
            let cls = 'lock';
            if (clearedAll) {
                cls = 'done';
            } else if (stageId === gm.stageCleared + 1) {
                cls = w === WAVES_PER_STAGE - 1 ? 'cur' : (w === WAVES_PER_STAGE - 2 ? 'available' : 'lock');
            }
            dot.className = `dot ${cls}`;
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
        if (this._missionTitleEl) {
            this._missionTitleEl.textContent = info.name.replace(/^\d+\./, '');
        }
        if (this._arrowL) {
            this._arrowL.style.visibility = stageId > 1 ? 'visible' : 'hidden';
        }
        if (this._arrowR) {
            this._arrowR.style.visibility = stageId < FINAL_STAGE_ID && stageId < gm.stageCleared + 1 ? 'visible' : 'hidden';
        }

        // 关卡信息
        if (this._siLvlEl) {
            this._siLvlEl.textContent = `${stageId}-${1}`;
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

        // 通关宝箱三档（对齐原型：耐久档位；当前关 ready 可领取，领取后置 got；宝箱用真贴图）
        chests.innerHTML = '';
        const claimKey = `${stageId}`;
        const claimed = this._claimedChests.has(claimKey);
        const boxes: Array<[string, string, string]> = clearedAll
            ? [['耐久≥50%', 'got', '已领取'], ['耐久≥75%', 'got', '已领取'], ['满耐久通关', 'got', '已领取']]
            : stageId === gm.stageCleared + 1
                ? [['耐久≥50%', 'got', '已领取'], ['耐久≥75%', 'ready', ''], ['满耐久通关', 'lock', '需完美护送']]
                : [['耐久≥50%', 'lock', '通关后结算'], ['耐久≥75%', 'lock', '通关后结算'], ['满耐久通关', 'lock', '通关后结算']];
        if (claimed && boxes[1][1] === 'ready') {
            boxes[1][1] = 'got';
            boxes[1][2] = '已领取';
        }
        for (const [label, st, tip] of boxes) {
            const c = document.createElement('div');
            c.className = `chest panel ${st}`;
            const cic = document.createElement('span');
            cic.className = 'cic';
            this._tex('ui/chest', u => {
                cic.style.backgroundImage = u;
                cic.style.backgroundSize = 'contain';
                cic.style.backgroundRepeat = 'no-repeat';
                cic.style.backgroundPosition = 'center';
            });
            c.appendChild(cic);
            const p = document.createElement('p');
            p.textContent = label;
            c.appendChild(p);
            if (st === 'ready') {
                const b = document.createElement('button');
                b.className = 'btn gold sm cbtn';
                b.textContent = '领 取';
                b.onclick = (e) => {
                    e.stopPropagation();
                    this._claimedChests.add(claimKey);
                    SoundFx.play('coin');
                    this._toast('领取成功：金币 ×3,000 + 精炼合金 ×10');
                    this._refreshStagePage();
                    this._refreshTop();
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

        // 掉落预览数值：金币区间（结算公式折算 ±15% 浮动）+ 各档掉率（含关卡加成）
        if (this._lootPrevEl) {
            const waves = stageWaves(stageId);
            let kills = 0;
            for (const w of waves) {
                kills += Math.round(w.count * (1 + w.eliteChance));
            }
            const goldMul = gm.metaGoldMul() * gm.depotGoldMul();
            const mid = (kills * 2 + WAVES_PER_STAGE * 15) * goldMul;
            const lo = Math.round(mid * 0.85);
            const hi = Math.round(mid * 1.15);
            const rates = lootRateText(stageId);
            const q = (c: string) => this._lootPrevEl?.querySelector('.' + c);
            const gold = q('lpGold');
            if (gold) {
                gold.textContent = `${lo.toLocaleString()} ~ ${hi.toLocaleString()}`;
            }
            const eq = q('lpEquip');
            if (eq) {
                eq.textContent = rates.equip;
            }
            const co = q('lpCore');
            if (co) {
                co.textContent = rates.core;
            }
            const ra = q('lpRare');
            if (ra) {
                ra.textContent = rates.rare;
            }
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
                        const hIdx = Math.max(0, HERO_DEFS.findIndex(d => d.id === id));
                        const slotPhoto = this._heroPhoto(hIdx, 'slot');
                        this._tex(slotPhoto.key, u => {
                            pic.style.backgroundImage = u;
                            pic.style.width = 'calc(44px * var(--pw,2.5))';
                            pic.style.height = 'calc(44px * var(--pw,2.5))';
                            pic.style.display = 'inline-block';
                            pic.style.cssText += slotPhoto.css;
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
                    const candIdx = HERO_DEFS.indexOf(def);
                    const candPhoto = this._heroPhoto(candIdx, 'slot');
                    this._tex(candPhoto.key, u => {
                        pic.style.backgroundImage = u;
                        pic.style.width = 'calc(40px * var(--pw,2.5))';
                        pic.style.height = 'calc(40px * var(--pw,2.5))';
                        pic.style.display = 'block';
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.cssText += candPhoto.css;
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
        page.appendChild(this._mkHeading('战术研究', '技能成长'));
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
        hint.textContent = '—— 普攻 / 技能 / 大招 三线独立成长 · 技能等级受研究所等级上限约束 ——';
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
            const locked = lv <= 0;
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
            lvEl.textContent = maxed ? 'MAX' : locked ? '未解锁' : `Lv.${lv}`;
            const btn = document.createElement('button');
            btn.className = `btn ${c.ult ? 'gold' : 'blue'} sm`;
            if (maxed) {
                btn.textContent = '已满级';
                btn.disabled = true;
            } else {
                const cost = hs.abilityUpgradeCost(def.id, c.slot);
                btn.textContent = locked ? `🔓 解锁 🪙 ${cost.toLocaleString()}` : `🪙 ${cost.toLocaleString()}`;
                btn.disabled = gm.gold < cost;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (hs.upgradeAbility(def.id, c.slot)) {
                        SoundFx.play('buy');
                        this._toast(locked ? `${c.n} 已解锁` : `${c.n} 升至 Lv.${lv + 1}`);
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

    /** 基地页：基地横幅（繁荣度，_refreshBase 刷新）+ 建筑卡 2 列网格（真数据 BUILDINGS + META_UPGRADES） */
    private _buildBasePage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.base = page;
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
        const grid = document.createElement('div');
        grid.className = 'baseGrid';
        page.appendChild(grid);
        this._baseGridEl = grid;
        root.appendChild(page);
    }

    private _baseGridEl: HTMLDivElement | null = null;
    private _baseBannerEls: { lv: HTMLElement | null; pros: HTMLElement | null; bar: HTMLElement | null } | null = null;

    private _refreshBase(): void {
        const gm = GameManager.instance;
        const grid = this._baseGridEl;
        if (!grid) {
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
        grid.innerHTML = '';
        // 建筑卡（真数据 BUILDINGS：等级持久化，升级提升全局成长上限）
        for (const b of BUILDINGS) {
            const lv = gm.buildingLevel(b.id);
            const maxed = lv >= b.maxLevel;
            const unlocked = gm.isBuildingUnlocked(b.id);
            const hqBlocked = !maxed && unlocked && b.id !== 'hq' && lv + 1 > gm.hqLevel() + 1;
            const card = document.createElement('div');
            card.className = 'bcard panel' + (unlocked ? '' : ' locked');
            const ic = document.createElement('div');
            ic.className = 'bIc';
            ic.textContent = b.ic;
            card.appendChild(ic);
            const nm = document.createElement('div');
            nm.className = 'bName';
            nm.innerHTML = `${b.name}<span>LV.${lv}</span>`;
            card.appendChild(nm);
            const ds = document.createElement('div');
            ds.className = 'bDesc';
            ds.textContent = maxed ? `${b.desc(lv)}（已满级）` : b.desc(lv + 1);
            card.appendChild(ds);
            const btn = document.createElement('button');
            btn.className = 'btn gold sm';
            btn.style.width = '100%';
            if (!unlocked) {
                btn.textContent = `🔒 指挥中心 LV.${b.unlockHq} 解锁`;
                btn.disabled = true;
            } else if (maxed) {
                btn.textContent = '已满级';
                btn.disabled = true;
            } else if (hqBlocked) {
                btn.textContent = '🔒 先升级指挥中心';
                btn.disabled = true;
            } else {
                const cost = gm.buildingCost(b.id);
                btn.textContent = `🪙 ${cost.toLocaleString()}`;
                btn.disabled = !gm.canUpgradeBuilding(b.id);
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const nextLv = gm.buildingLevel(b.id) + 1;
                    if (gm.upgradeBuilding(b.id)) {
                        SoundFx.play('buy');
                        this._toast(`${b.name} 升至 LV.${nextLv}`);
                        this._refreshBase();
                        this._refreshTop();
                    }
                };
            }
            btn.style.opacity = btn.disabled ? '0.5' : '1';
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
#homeUi .good.r5 .gIc { border-color: #ff9d45; box-shadow: 0 0 10px rgba(255,157,69,.45) inset; }
#homeUi .good.r6 .gIc { border-color: #ff5252; box-shadow: 0 0 12px rgba(255,82,82,.55) inset, 0 0 10px rgba(255,82,82,.35); }
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
#homeUi .heroMain { display: grid; grid-template-columns: 1fr auto calc(300px * var(--hs,1)) 1fr; align-items: center; gap: calc(8px * var(--hs,1)); padding: calc(12px * var(--hs,1)) 0; }
#homeUi .heroMain .sideActions { display: flex; flex-direction: column; gap: calc(16px * var(--hs,1)); }
#homeUi .heroMain .sideActions .btn { width: calc(180px * var(--hs,1)); height: calc(60px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
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
#homeUi .dot.available { background: linear-gradient(180deg, #ffe9a8, #e0a23c); border-color: #8a5c12; box-shadow: 0 0 10px rgba(240,177,62,.7); }
#homeUi .dot.available em { color: #ffe9a8; }
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
#homeUi .hpBar { width: calc(70px * var(--hs,1)); height: calc(6px * var(--hs,1)); border-radius: calc(99px * var(--hs,1));
  background: #0a1426; border: 1px solid #2c405f; overflow: hidden; display: inline-block; }
#homeUi .hpBar i { display: block; height: 100%; width: 82%; background: linear-gradient(90deg, #7fe08a, #3ad06a); }
#homeUi .sceneTitle { position: absolute; top: calc(36px * var(--hs,1)); left: 0; right: 0; text-align: center; z-index: 5; pointer-events: none;
  text-shadow: 0 2px 8px rgba(0,0,0,.6); }
#homeUi .sceneTitle small { display: block; font-size: calc(20px * var(--hs,1)); color: #ffe9a8; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .sceneTitle h1 { font-size: calc(44px * var(--hs,1)); font-weight: 900; color: #fff; letter-spacing: calc(6px * var(--hs,1));
  margin-top: calc(4px * var(--hs,1)); }
#homeUi .sceneTitle p { font-size: calc(18px * var(--hs,1)); color: #dce8f7; opacity: .8; margin-top: calc(4px * var(--hs,1)); }
#homeUi .screenHeading { margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .screenHeading h2 { font-size: calc(34px * var(--hs,1)); font-weight: 900; color: #ffe9a8; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .screenHeading small { display: block; font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
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
#homeUi .chest .cic { font-size: calc(64px * var(--hs,1)); display: block; width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1));
  margin: 0 auto; }
#homeUi .chest p { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); }
#homeUi .chest.ready { border-color: #8a6a20; animation: huiChest 1.8s ease-in-out infinite; }
#homeUi .chest .cbtn { margin-top: calc(6px * var(--hs,1)); }
@keyframes huiChest { 0%, 100% { box-shadow: 0 0 6px rgba(240,177,62,.2); } 50% { box-shadow: 0 0 18px rgba(240,177,62,.55); } }
#homeUi .chest.got { opacity: .55; }
#homeUi .chest.got .cic { filter: grayscale(1); }
#homeUi .chest.lock { opacity: .7; }
#homeUi .chest.lock .cic { filter: grayscale(.7) brightness(.8); }
#homeUi .lootPrev { margin: calc(24px * var(--hs,1)) 0 0; padding: calc(20px * var(--hs,1)) calc(24px * var(--hs,1)); }
#homeUi .lootPrev .lpHead { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: #ffe9a8; letter-spacing: calc(2px * var(--hs,1)); margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .lootPrev .lpRow { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(7px * var(--hs,1)) 0; }
#homeUi .lootPrev .lpIc { font-size: calc(24px * var(--hs,1)); flex: none; }
#homeUi .lootPrev .lpLab { flex: 1; font-size: calc(21px * var(--hs,1)); color: #8ba3c7; }
#homeUi .lootPrev .lpVal { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: #dce8f7; font-variant-numeric: tabular-nums; }
#homeUi .lootPrev .lpVal.lpGold { color: #ffd76a; }
#homeUi .lootPrev .lpNote { font-size: calc(17px * var(--hs,1)); color: #6b83a5; margin-top: calc(8px * var(--hs,1)); }
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
#homeUi .bcell.r5 { border-color: #ff9d45; }
#homeUi .bcell.r6 { border-color: #ff5252; box-shadow: 0 0 10px rgba(255,82,82,.5); }
#homeUi .bcell em { position: absolute; right: calc(6px * var(--hs,1)); bottom: calc(4px * var(--hs,1)); font-style: normal;
  font-size: calc(18px * var(--hs,1)); color: #dce8f7; font-weight: 700; text-shadow: 0 1px 2px #000; }
#homeUi .bagBar { margin-top: calc(20px * var(--hs,1)); padding: calc(20px * var(--hs,1)); border-radius: calc(22px * var(--hs,1));
  background: linear-gradient(180deg, #1a2947, #14203a); border: 1px solid #33507a; }
#homeUi .bagBar .bagTabs { margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .bagBar .bagGrid { grid-template-columns: repeat(5, 1fr); gap: calc(12px * var(--hs,1)); max-height: calc(300px * var(--hs,1)); overflow-y: auto; }
#homeUi .bagBar .bcell { height: calc(110px * var(--hs,1)); font-size: calc(44px * var(--hs,1)); }
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

/* ================================================================
   浅色青瓷主题覆盖层 —— 一比一翻译 prototype-assets/interface.css
   （原型第 317 行外链皮肤；像素口径 430px 手机框 × var(--pw)）
   ================================================================ */
#homeUi { letter-spacing: 0 !important;
  background: #243f47; background-image: none;
  color: #243e4d; }
#homeUi .pAvatar, #homeUi .pinfo, #homeUi .pname, #homeUi .lvtag, #homeUi .expbar, #homeUi .expnum,
#homeUi .reswrap, #homeUi .res, #homeUi .viewport, #homeUi .screen, #homeUi .panel, #homeUi .secTitle,
#homeUi .btn, #homeUi .tag, #homeUi .toastEl, #homeUi .shopBanner, #homeUi .sbTxt, #homeUi .shopTabs,
#homeUi .shopGrid, #homeUi .good, #homeUi .gIc, #homeUi .gName, #homeUi .gTag, #homeUi .gBuy, #homeUi .gHot,
#homeUi .heroPick, #homeUi .hpick, #homeUi .heroHead, #homeUi .heroName, #homeUi .star, #homeUi .tagRow,
#homeUi .powerBadge, #homeUi .heroMain, #homeUi .slotCol, #homeUi .slot, #homeUi .heroFigure, #homeUi .halo,
#homeUi .halo2, #homeUi .heroEmoji, #homeUi .heroLv, #homeUi .statRow, #homeUi .stat, #homeUi .row3,
#homeUi .chTabs, #homeUi .lvlTrack, #homeUi .dot, #homeUi .scene, #homeUi .sceneInfo, #homeUi .siChip,
#homeUi .siHp, #homeUi .hpBar, #homeUi .sceneTitle, #homeUi .screenHeading, #homeUi .arrow, #homeUi .stageInfo,
#homeUi .siBox, #homeUi .chests, #homeUi .chest, #homeUi .stageBtns, #homeUi .skillCard, #homeUi .sIcon,
#homeUi .sInfo, #homeUi .sName, #homeUi .sDesc, #homeUi .sAct, #homeUi .sLv, #homeUi .skillHint,
#homeUi .baseBanner, #homeUi .bbIc, #homeUi .bcard, #homeUi .bIc, #homeUi .bName, #homeUi .bDesc,
#homeUi .protoMask, #homeUi .mbox, #homeUi .mHead, #homeUi .mClose, #homeUi .mSub, #homeUi .mRow,
#homeUi .bagTabs, #homeUi .bagGrid, #homeUi .bcell, #homeUi .bagBar, #homeUi .sqRow, #homeUi .sqSlot, #homeUi .cand,
#homeUi .candB, #homeUi .tabbar, #homeUi .tab, #homeUi .res .add, #homeUi .expbar i, #homeUi .lvtag,
#homeUi .frame::before, #homeUi .frame::after { animation: none; }

/* --- 布局骨架 --- */
#homeUi .topbar { display: grid; grid-template-columns: calc(44px * var(--pw,2.5)) 1fr; gap: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  padding: calc(12px * var(--pw,2.5)) calc(16px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  background: linear-gradient(#50788c, #355b70); border-bottom: calc(3px * var(--pw,2.5)) solid #26485b; color: #fff; }
#homeUi .pAvatar { height: calc(44px * var(--pw,2.5)); width: calc(44px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  background: #eab56c; padding: calc(2px * var(--pw,2.5)); grid-row: 1; }
#homeUi .pAvatar > div { border-radius: calc(6px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .pinfo { width: auto; display: grid; grid-template-columns: 1fr auto; align-items: center;
  gap: calc(2px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); }
#homeUi .pname { font-size: calc(14px * var(--pw,2.5)); grid-column: 1 / -1; }
#homeUi .expnum { font-size: calc(10px * var(--pw,2.5)); color: #d5e5eb; margin: 0; }
#homeUi .expbar { margin: 0; background: #25485d; border: none; height: calc(6px * var(--pw,2.5)); border-radius: 0; }
#homeUi .expbar i { box-shadow: none; background: #89cbd5; border-radius: 0; }
#homeUi .lvtag { background: #efc780; border: 1px solid #c7944b; color: #64421d; border-radius: calc(3px * var(--pw,2.5)); font-weight: inherit; }
#homeUi .reswrap { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: calc(7px * var(--pw,2.5)); }
#homeUi .res { min-width: 0; border: 1px solid #274a5e; border-radius: calc(5px * var(--pw,2.5)); background: #294d62;
  font-size: calc(12px * var(--pw,2.5)); padding: calc(4px * var(--pw,2.5)) calc(5px * var(--pw,2.5));
  gap: calc(4px * var(--pw,2.5)); box-shadow: inset 0 1px 2px #183b53; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .res b { color: #fff; flex: 1; }
#homeUi .res .add { width: calc(24px * var(--pw,2.5)); height: calc(24px * var(--pw,2.5)); background: #789e6d;
  color: #fff; border-radius: calc(4px * var(--pw,2.5)); margin: 0; font-size: calc(17px * var(--pw,2.5)); }
#homeUi .viewport { background: #e6eef3; background-image: none; }
#homeUi .screen { padding: calc(16px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(20px * var(--pw,2.5)); }
#homeUi .screen.sStage { padding: 0 0 calc(14px * var(--pw,2.5)); }
#homeUi .panel { background: linear-gradient(#fcfdfe, #eaf1f5); border: 1px solid #b5c8d5;
  border-radius: calc(8px * var(--pw,2.5)); box-shadow: 0 2px 0 #aebfcd55, inset 0 1px #fff; }
#homeUi .frame::before, #homeUi .frame::after { display: none; content: none; }
#homeUi .secTitle { font-size: calc(14px * var(--pw,2.5)); margin: calc(15px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  color: #355365; letter-spacing: 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .secTitle::before { background: #eb9843; height: calc(16px * var(--pw,2.5)); width: calc(4px * var(--pw,2.5)); }

/* --- 按钮 / 标签 --- */
#homeUi .btn { border-radius: calc(6px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); box-shadow: none;
  font-size: calc(14px * var(--pw,2.5)); }
#homeUi .btn.gold { background: linear-gradient(#ffc06e, #f29a40 60%, #e88931); color: #58320f; border: 1px solid #c57b2e;
  box-shadow: inset 0 2px #ffdb9d, 0 3px 0 #ad6626; }
#homeUi .btn.blue { background: linear-gradient(#8db8cb, #6191ac); color: #173e52; border: 1px solid #527d96;
  box-shadow: inset 0 2px #b4d5e4, 0 3px 0 #466c85; }
#homeUi .btn.adBtn { background: linear-gradient(#8fc79a, #5b9a67); color: #17361f; border: 1px solid #4c8457;
  box-shadow: inset 0 2px #b9dfc1, 0 3px 0 #41704b; }
#homeUi .btn.dark { background: linear-gradient(#fafcfd, #d7e4ec); border: 1px solid #9fb7c7; color: #35566b;
  box-shadow: 0 2px 0 #9fb7c7; }
#homeUi .btn.sm { height: calc(44px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .btn.big { height: calc(50px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); font-size: calc(16px * var(--pw,2.5)); letter-spacing: 0; }
#homeUi .tag { border-radius: calc(4px * var(--pw,2.5)); background: #e4edf3; color: #456477; font-size: calc(10px * var(--pw,2.5));
  padding: calc(3px * var(--pw,2.5)) calc(6px * var(--pw,2.5)); border: 1px solid transparent; }
#homeUi .tag.g { background: #fff1d8; border-color: #d7b279; color: #88551f; }
#homeUi .tag.b { background: #dfedf5; color: #28637f; border-color: #97bacd; }
#homeUi .tag.p { background: #eee5f2; color: #765188; border-color: #bda1cc; }
#homeUi .goldT { color: #945d24; }

/* --- Toast / 弹窗 --- */
#homeUi .toastEl { background: #244b60; color: #fff; border: 1px solid #89abbf; border-radius: calc(7px * var(--pw,2.5));
  white-space: normal; text-align: center; max-width: calc(100% - 32px); width: max-content; line-height: 1.6;
  bottom: calc(95px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); font-weight: 700;
  padding: calc(9px * var(--pw,2.5)) calc(18px * var(--pw,2.5)); }
#homeUi .protoMask { background: #183b50b8; backdrop-filter: blur(4px); padding: calc(16px * var(--pw,2.5)); }
#homeUi .mbox { background: #edf4f8; border: calc(2px * var(--pw,2.5)) solid #9db9ca; border-radius: calc(10px * var(--pw,2.5));
  padding: calc(16px * var(--pw,2.5)); box-shadow: 0 15px 50px #12324366; }
#homeUi .mHead h3 { font-size: calc(18px * var(--pw,2.5)); color: #31536a; }
#homeUi .mHead { gap: calc(8px * var(--pw,2.5)); }
#homeUi .mClose { height: calc(44px * var(--pw,2.5)); width: calc(44px * var(--pw,2.5)); flex: none; background: #dae6ee;
  border-color: #a5becd; color: #365b70; border-radius: calc(6px * var(--pw,2.5)); font-size: calc(17px * var(--pw,2.5)); }
#homeUi .mSub { font-size: calc(12px * var(--pw,2.5)); line-height: 1.7; color: #536f7f; }
#homeUi .mRow { background: #fff; border-color: #c2d3df; border-radius: calc(5px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5));
  flex-wrap: wrap; font-size: calc(13px * var(--pw,2.5)); }
#homeUi .bagTabs button { height: calc(44px * var(--pw,2.5)); background: #d7e4ed; color: #526d7d; border-color: #b1c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .bagTabs button.on { background: #fff8e9; color: #8c5927; border-color: #d8ad74; box-shadow: inset 0 -2px #e9ab5c; }
#homeUi .bcell { background: #dce8ef; border: 1px solid #b8cbd7; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .bcell.r3 { border-color: #5a9ad0; }
#homeUi .bcell.r4 { border-color: #a678d8; }
#homeUi .bcell.r5 { border-color: #e8892e; }
#homeUi .bcell.r6 { border-color: #e04848; box-shadow: 0 0 6px rgba(224,72,72,.45); }
#homeUi .bcell em { color: #395a6b; text-shadow: none; }
#homeUi .bagBar { margin-top: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5));
  background: linear-gradient(#eaf1f6, #dce8ef); border: 1px solid #b5c8d5; border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs { gap: calc(6px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs button { height: calc(38px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .bagBar .bagGrid { grid-template-columns: repeat(5, 1fr); gap: calc(6px * var(--pw,2.5)); max-height: calc(120px * var(--pw,2.5)); }
#homeUi .bagBar .bcell { height: calc(52px * var(--pw,2.5)); font-size: calc(22px * var(--pw,2.5)); border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .bagBar .bcell em { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .sqRow { gap: calc(6px * var(--pw,2.5)); }
#homeUi .sqSlot { min-width: 0; flex: 1; background: #d9e7ef; border: 1px solid #b8cbd7; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .sqSlot span { color: #243e4d; }
#homeUi .sqSlot.empty { border-style: dashed; border-color: #b8cbd7; color: #758994; }
#homeUi .candB { background: #e1ebf2; border: 1px solid #b3c8d6; border-radius: calc(5px * var(--pw,2.5)); min-height: calc(64px * var(--pw,2.5)); color: #243e4d; }

/* --- 商店页 --- */
#homeUi .shopBanner { height: calc(125px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); border: 1px solid #a8bdc7;
  background-color: #547b85; background-image: none; }
#homeUi .shopBanner::after { content: ''; display: block; position: absolute; inset: 0; width: auto; height: auto;
  border: 0; border-radius: 0; opacity: 1; z-index: 1; pointer-events: none;
  background: linear-gradient(90deg, #163b50dd, transparent); }
#homeUi .sbTxt h3 { font-size: calc(19px * var(--pw,2.5)); color: #fff; }
#homeUi .sbTxt p { color: #e7eff0; }
#homeUi .sbTxt .price { color: #ffce8f; margin-top: calc(7px * var(--pw,2.5)); }
#homeUi .sbGift { font-size: 0; }
#homeUi .sbTime { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .shopTabs { margin: calc(14px * var(--pw,2.5)) 0; gap: calc(5px * var(--pw,2.5)); }
#homeUi .shopTabs button { height: calc(44px * var(--pw,2.5)); background: #d7e4ed; color: #526d7d; border-color: #b1c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .shopTabs button.on { background: #fff8e9; color: #8c5927; border-color: #d8ad74; box-shadow: inset 0 -2px #e9ab5c; }
#homeUi .good { padding: calc(10px * var(--pw,2.5)); }
#homeUi .gIc { height: calc(92px * var(--pw,2.5)); background: linear-gradient(#e8f0f6, #d4e2eb); border-color: #b3c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(38px * var(--pw,2.5)); }
#homeUi .good.r3 .gIc { border-color: #5a9ad0; box-shadow: 0 0 5px rgba(90,154,208,.4) inset; }
#homeUi .good.r4 .gIc { border-color: #a678d8; box-shadow: 0 0 5px rgba(166,120,216,.45) inset; }
#homeUi .good.r5 .gIc { border-color: #e8892e; box-shadow: 0 0 6px rgba(232,137,46,.5) inset; }
#homeUi .good.r6 .gIc { border-color: #e04848; box-shadow: 0 0 7px rgba(224,72,72,.6) inset, 0 0 6px rgba(224,72,72,.4); }
#homeUi .gName { font-size: calc(15px * var(--pw,2.5)); }
#homeUi .gTag { font-size: calc(11px * var(--pw,2.5)); margin: calc(4px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); }
#homeUi .gBuy { height: calc(44px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); }
#homeUi .gHot { background: #b54f37; border-radius: calc(3px * var(--pw,2.5)); font-size: calc(9px * var(--pw,2.5));
  top: calc(8px * var(--pw,2.5)); right: calc(7px * var(--pw,2.5)); box-shadow: none; }
#homeUi .screenHeading { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 calc(14px * var(--pw,2.5)); }
#homeUi .screenHeading h2 { font-size: calc(23px * var(--pw,2.5)); color: #264756; font-weight: 900; letter-spacing: 0; }
#homeUi .screenHeading small { font-size: calc(11px * var(--pw,2.5)); color: #536f7f; font-weight: 700; margin: 0; }

/* --- 英雄选择条 / 英雄页 --- */
#homeUi .heroPick { padding: calc(4px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); }
#homeUi .hpick { width: calc(60px * var(--pw,2.5)); color: #536f7f; }
#homeUi .hpick .pic { height: calc(56px * var(--pw,2.5)); width: calc(54px * var(--pw,2.5)); background-color: #d9e6ef;
  border: 2px solid #b5c9d7; border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .hpick.on .pic { box-shadow: 0 2px 0 #cc9854; border-color: #e5ac5e; transform: none; background-color: #fff0d9; }
#homeUi .hpick.on { color: #855522; }
#homeUi .hpick i { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .hpick.lock::after { top: calc(5px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); transform: none; }
#homeUi .heroHead { align-items: flex-start; margin: calc(10px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); gap: calc(4px * var(--pw,2.5)); }
#homeUi .heroName { font-size: calc(20px * var(--pw,2.5)); }
#homeUi .star { display: block; margin: calc(3px * var(--pw,2.5)) 0 0; color: #b97620; text-shadow: none; }
#homeUi .tagRow { flex-wrap: wrap; gap: calc(3px * var(--pw,2.5)); }
#homeUi .powerBadge { padding: calc(6px * var(--pw,2.5)) calc(8px * var(--pw,2.5)); background: #fff1d9; border-color: #d2ad75;
  color: #875623; border-radius: calc(5px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); box-shadow: none; }
#homeUi .heroMain { grid-template-columns: calc(60px * var(--pw,2.5)) auto minmax(0, 1fr) calc(60px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5));
  padding: calc(10px * var(--pw,2.5)) 0; background: linear-gradient(transparent, #d2e2eb); margin: 0 calc(-2px * var(--pw,2.5)); }
#homeUi .heroMain .slotCol { justify-content: center; }
#homeUi .heroMain .sideActions { align-self: stretch; justify-content: space-evenly; gap: 0; padding: calc(24px * var(--pw,2.5)) 0; }
#homeUi .heroMain .sideActions .btn { width: calc(52px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5));
  padding: 0; border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .heroMain .sideActions .btn.blue { background: linear-gradient(#fdfefe, #c9dcea); border: 1px solid #a9c0cf; color: #243e4d;
  box-shadow: 0 calc(2px * var(--pw,2.5)) 0 #9fb6c5; }
#homeUi .heroFigure { height: calc(220px * var(--pw,2.5)); }
#homeUi .halo, #homeUi .halo2 { display: none; }
#homeUi .heroEmoji { width: 100%; max-width: calc(150px * var(--pw,2.5)); height: calc(190px * var(--pw,2.5)); filter: none; }
#homeUi .heroLv { background: #eaf2f7; border-color: #aac0cf; border-radius: calc(4px * var(--pw,2.5));
  padding: calc(4px * var(--pw,2.5)) calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); margin: 0; color: #236581; }
#homeUi .slotCol { gap: calc(29px * var(--pw,2.5)); }
#homeUi .slot { height: calc(48px * var(--pw,2.5)); width: calc(48px * var(--pw,2.5));
  background: linear-gradient(#f9fbfc, #d5e4ed); border-color: #afc3d1; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .slot.filled { border-color: #bc9b63; box-shadow: inset 0 0 0 2px #f7e8cb; }
#homeUi .slot .sname { top: calc(-17px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #536f7f; }
#homeUi .slot .slv { border-radius: calc(3px * var(--pw,2.5)); background: #ecd1a0; border-color: #c69c5e; }
#homeUi .statRow { gap: 0; margin: 0 0 calc(14px * var(--pw,2.5)); background: #f5f9fb; border-bottom: 1px solid #becfda; }
#homeUi .stat { border: none; border-radius: 0; background: none; box-shadow: none; padding: calc(11px * var(--pw,2.5)) calc(2px * var(--pw,2.5));
  font-size: calc(12px * var(--pw,2.5)); color: #536f7f; }
#homeUi .stat b { font-size: calc(18px * var(--pw,2.5)); color: #243e4d; }
#homeUi .row3 { gap: calc(8px * var(--pw,2.5)); }
#homeUi .row3 .btn { font-size: calc(12px * var(--pw,2.5)); height: calc(46px * var(--pw,2.5)); min-width: 0; }

/* --- 关卡页 --- */
#homeUi .chTabs { padding: calc(12px * var(--pw,2.5)) calc(12px * var(--pw,2.5)) 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .chTabs button { height: calc(47px * var(--pw,2.5)); background: #d5e1e9; color: #526d7b; border: 1px solid #aec2cf;
  border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .chTabs button b { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .chTabs button span { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .chTabs button.on { background: #f8fbfd; border-color: #89a6b7; color: #2d5266; box-shadow: inset 0 -3px #e99a42; }
#homeUi .chTabs button.lock { opacity: 1; color: #758994; background: #dae3e8; }
#homeUi .lvlTrack { display: flex; justify-content: space-between; align-items: center;
  margin: calc(9px * var(--pw,2.5)) calc(12px * var(--pw,2.5)) 0; height: calc(44px * var(--pw,2.5)); }
#homeUi .lvlTrack::before { left: calc(12px * var(--pw,2.5)); right: calc(12px * var(--pw,2.5));
  top: calc(21px * var(--pw,2.5)); background: #b7cbd7; height: calc(3px * var(--pw,2.5)); border-radius: 0; }
#homeUi .dot { position: relative; left: auto !important; top: auto !important; transform: none !important;
  width: calc(26px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); border: 0; border-radius: calc(4px * var(--pw,2.5));
  background: transparent; display: grid; place-items: center; box-shadow: none !important; color: #31596d; }
#homeUi .dot::before { content: ''; position: absolute; inset: calc(10px * var(--pw,2.5)) calc(2px * var(--pw,2.5));
  border: 1px solid #abc0ce; background: #dce7ee; border-radius: calc(4px * var(--pw,2.5)); z-index: -1; }
#homeUi .dot.done { background: none; border: 0; }
#homeUi .dot.done::before { background: #7299a9; border-color: #537e92; }
#homeUi .dot.done em { color: white; }
#homeUi .dot.cur { background: none; border: none; }
#homeUi .dot.cur::before { inset: calc(7px * var(--pw,2.5)) 0; background: #f4b668; border: 2px solid white;
  box-shadow: 0 0 0 1px #ce9142; }
#homeUi .dot em { position: static; transform: none; font-size: calc(11px * var(--pw,2.5)); color: inherit; }
#homeUi .dot.lock { color: #8a9fab; }
#homeUi .scene, #homeUi .scene.c1, #homeUi .scene.c2, #homeUi .scene.c3 { height: calc(290px * var(--pw,2.5));
  margin: calc(2px * var(--pw,2.5)) 0 0; border: 0; border-radius: 0; background-color: #8dbac0;
  background-image: none; box-shadow: none; overflow: hidden; }
#homeUi .scene > .sun, #homeUi .scene > .mtn, #homeUi .scene > .hill, #homeUi .scene > .ground, #homeUi .scene > .road,
#homeUi .scene > .dash, #homeUi .scene > .water, #homeUi .scene > .mobs, #homeUi .scene > .veh, #homeUi .scene > .crew,
#homeUi .scene > .plane, #homeUi .scene > .cloud, #homeUi .scene > .bolt { display: none !important; }
#homeUi .scene::after { content: ''; position: absolute; inset: 55% 0 0; display: block; width: auto; height: auto;
  border: 0; border-radius: 0; opacity: 1; z-index: 1; pointer-events: none;
  background: linear-gradient(transparent, #173d4dcc); }
#homeUi .sceneInfo { padding: calc(12px * var(--pw,2.5)); gap: calc(6px * var(--pw,2.5)); }
#homeUi .siChip { background: #f7fcf3ed; border: 1px solid #fff; border-radius: calc(4px * var(--pw,2.5));
  color: #365360; font-size: calc(11px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(8px * var(--pw,2.5));
  box-shadow: 0 2px 6px #24465326; }
#homeUi .siHp { background: #234b5be8; color: #fff; font-size: calc(10px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)); border: 1px solid #8db4bd; border-radius: calc(4px * var(--pw,2.5));
  gap: calc(4px * var(--pw,2.5)); }
#homeUi .hpBar { width: calc(40px * var(--pw,2.5)); border: none; background: #173c49; height: calc(5px * var(--pw,2.5)); border-radius: 0; }
#homeUi .hpBar i { background: #91ce93; }
#homeUi .arrow { width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); top: 43%;
  background: #244a5d9c; border: 1px solid #c3dce291; color: #fff; border-radius: calc(6px * var(--pw,2.5)); font-size: calc(18px * var(--pw,2.5)); }
#homeUi .arrow:hover { background: #244a5dd9; }
#homeUi .sceneTitle { position: absolute; bottom: calc(17px * var(--pw,2.5)); left: calc(18px * var(--pw,2.5));
  top: auto; right: auto; text-align: left; z-index: 3; color: #fff; text-shadow: 0 2px 4px #153c50; pointer-events: none; }
#homeUi .sceneTitle small { font-size: calc(10px * var(--pw,2.5)); font-weight: 800; color: #fbd194; letter-spacing: 0; }
#homeUi .sceneTitle h1 { font-size: calc(26px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); font-weight: 900; letter-spacing: 0; }
#homeUi .sceneTitle p { font-size: calc(11px * var(--pw,2.5)); margin-top: calc(5px * var(--pw,2.5)); color: #e0eef1; }
#homeUi .stageInfo { margin: 0; padding: calc(12px * var(--pw,2.5)); background: #f8fafb; border-bottom: 1px solid #bfced8; gap: 0; }
#homeUi .siBox { background: none; border: none; border-radius: 0; box-shadow: none; padding: 0 calc(5px * var(--pw,2.5));
  font-size: calc(10px * var(--pw,2.5)); color: #536f7f; }
#homeUi .siBox + .siBox { border-left: 1px solid #c9d6df; }
#homeUi .siBox b { font-size: calc(12px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); color: #243e4d; }
#homeUi .siBox:first-child { flex: 1.5; }
#homeUi .siBox b.ok { color: #267555; }
#homeUi .siBox b.go { color: #9b5a20; }
#homeUi .chests { margin: 0 calc(14px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); }
#homeUi .chest { padding: calc(8px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); min-width: 0; }
#homeUi .chest .cic { height: calc(38px * var(--pw,2.5)); font-size: calc(28px * var(--pw,2.5));
  width: calc(48px * var(--pw,2.5)); background-size: contain; background-repeat: no-repeat; background-position: center; }
#homeUi .chest p { font-size: calc(10px * var(--pw,2.5)); color: #536f7f; }
#homeUi .chest .tag { font-size: calc(9px * var(--pw,2.5)); border: none; background: none; padding: calc(3px * var(--pw,2.5)) 0;
  white-space: normal; min-height: calc(40px * var(--pw,2.5)); display: grid !important; place-items: center; color: #456477; }
#homeUi .chest.ready { background: #fff5dd; border: 1px solid #d5a254; }
#homeUi .chest.got, #homeUi .chest.lock { opacity: 1; }
#homeUi .chest.got .cic { opacity: .6; }
#homeUi .chest .cbtn { height: calc(44px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); width: 85%;
  font-size: calc(12px * var(--pw,2.5)); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .stageBtns { position: sticky; bottom: calc(-14px * var(--pw,2.5)); z-index: 10;
  margin: calc(12px * var(--pw,2.5)) 0 calc(-14px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(15px * var(--pw,2.5));
  background: #e6eef3f5; border-top: 1px solid #cedce5; gap: calc(10px * var(--pw,2.5)); }
#homeUi .stageBtns .btn.squad, #homeUi .stageBtns .btn.go { height: calc(49px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); }
#homeUi .stageBtns .btn.go { font-size: calc(18px * var(--pw,2.5)); letter-spacing: 0; }
#homeUi .lootPrev { margin: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) 0; padding: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5));
  background: #fdfefe; }
#homeUi .lootPrev .lpHead { font-size: calc(13px * var(--pw,2.5)); color: #8c5927; letter-spacing: 0; margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .lootPrev .lpRow { padding: calc(3px * var(--pw,2.5)) 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .lootPrev .lpIc { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .lootPrev .lpLab { font-size: calc(11px * var(--pw,2.5)); color: #536f7f; }
#homeUi .lootPrev .lpVal { font-size: calc(12px * var(--pw,2.5)); color: #243e4d; }
#homeUi .lootPrev .lpVal.lpGold { color: #a8690f; }
#homeUi .lootPrev .lpNote { font-size: calc(9px * var(--pw,2.5)); color: #758994; margin-top: calc(4px * var(--pw,2.5)); }

/* --- 技能页 / 基地页 --- */
#homeUi .skillCard { gap: calc(9px * var(--pw,2.5)); padding: calc(12px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  min-height: calc(132px * var(--pw,2.5)); align-items: center; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .sIcon { width: calc(42px * var(--pw,2.5)); height: calc(48px * var(--pw,2.5)); background: #d8e8f1; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .sName { font-size: calc(15px * var(--pw,2.5)); flex-wrap: wrap; gap: calc(4px * var(--pw,2.5)); }
#homeUi .sDesc { font-size: calc(12px * var(--pw,2.5)); line-height: 1.7; color: #536f7f; }
#homeUi .sAct { width: calc(76px * var(--pw,2.5)); }
#homeUi .sAct .btn { padding: 0 calc(5px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); width: 100%; }
#homeUi .sLv { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .skillHint { display: none; }
#homeUi .baseBanner { border: none; border-radius: 0; background: #365f70; color: #fff;
  margin: calc(-16px * var(--pw,2.5)) calc(-14px * var(--pw,2.5)) calc(16px * var(--pw,2.5));
  padding: calc(22px * var(--pw,2.5)) calc(16px * var(--pw,2.5)); box-shadow: none; }
#homeUi .baseBanner h3 { font-size: calc(16px * var(--pw,2.5)); }
#homeUi .baseBanner .lvtag { font-size: calc(9px * var(--pw,2.5)); }
#homeUi .baseBanner .pros { color: #d5e5e9; font-size: calc(11px * var(--pw,2.5)); }
#homeUi .prosBar { width: calc(150px * var(--pw,2.5)); height: calc(6px * var(--pw,2.5)); background: #1d3a46;
  border: 1px solid #567c8c; border-radius: 99px; }
#homeUi .bbIc { filter: none; }
#homeUi .bcard { padding: calc(12px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .bIc { background: #e3edf3; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  width: calc(58px * var(--pw,2.5)); height: calc(58px * var(--pw,2.5)); }
#homeUi .bName { font-size: calc(15px * var(--pw,2.5)); }
#homeUi .bDesc { font-size: calc(12px * var(--pw,2.5)); min-height: calc(36px * var(--pw,2.5)); line-height: 1.6; }
#homeUi .bcard.locked { opacity: .7; }

/* --- 底部导航 --- */
#homeUi .tabbar { height: calc(78px * var(--pw,2.5)); padding: calc(3px * var(--pw,2.5)) calc(6px * var(--pw,2.5));
  background: linear-gradient(#edf4f8, #c9dbe6); border-top: 2px solid #fff; box-shadow: 0 -3px 10px #294f681c;
  gap: calc(2px * var(--pw,2.5)); }
#homeUi .tabbar::before { display: none; content: none; }
#homeUi .tab { color: #527085; flex: 1; font-size: calc(12px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5));
  padding: calc(4px * var(--pw,2.5)) 0; gap: 0; border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .tab .ticon { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); display: grid; place-items: center; filter: none; }
#homeUi .tab.on { background: #fff8e5; color: #88551f; box-shadow: inset 0 -3px #e9a04f; }
#homeUi .tab.on .ticon { transform: none; filter: none; }
#homeUi .tab.on::after { display: none; content: none; }
#homeUi .tab.main { flex: 1.12; width: auto; height: calc(68px * var(--pw,2.5)); margin-top: calc(-8px * var(--pw,2.5));
  border-radius: calc(9px * var(--pw,2.5)); background: linear-gradient(#ffcd82, #eda052); border: 1px solid #cc8d45;
  color: #67411b; box-shadow: inset 0 2px #ffe8bb, 0 3px #b27a35; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .tab.main .ticon { width: calc(39px * var(--pw,2.5)); height: calc(39px * var(--pw,2.5)); font-size: 0; }
`;
        document.head.appendChild(style);
    }
}
