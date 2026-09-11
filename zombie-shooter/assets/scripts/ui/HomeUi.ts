import { _decorator, Component, SpriteFrame, sys } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES, BUILDINGS } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { ShopData, ShopItem } from '../core/ShopData';
import { GIFT_PACKS, GiftService, GiftPackDef } from '../core/GiftPackData';
import { QUEST_DEFS, QuestSystem, QuestDef } from '../core/QuestSystem';
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
    /** 商城页广告补给按钮（领取后刷新文案） */
    private _mallAdBtn: HTMLButtonElement | null = null;
    /** 礼包服务（每日限购持久化） */
    private _giftSvc = new GiftService();
    /** 商城礼包 banner（红点刷新用） */
    private _giftBannerEl: HTMLDivElement | null = null;
    /** 基地页任务入口红点 */
    private _questRedEl: HTMLElement | null = null;
    /** 基地页签到入口红点 */
    private _signinRedEl: HTMLElement | null = null;
    /** 基地页天赋入口红点（有未分配点数时点亮） */
    private _talentRedEl: HTMLElement | null = null;
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
        SoundFx.init();
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

    private _startBattle(endless = false, _diff?: StageDifficulty): void {
        if (!this._root) {
            return;
        }
        // 守卫（体力/解锁/难度门槛）与开波统一走流程状态机；失败回滚显示防止黑屏。
        // 普通出战/无尽共用：难度取当前关卡页选择（无尽恒普通）
        if (!GameFlow.instance.startRun(endless, endless ? 0 : this._stageDiffSel)) {
            this._refreshAll();
            if (endless) {
                this._toast('无尽模式需通关全部关卡后解锁');
            }
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
        avatar.title = '查看个人主页';
        avatar.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openProfileModal();
        };
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
        // 设置入口（顶栏右侧齿轮）
        const gear = document.createElement('button');
        gear.className = 'btn dark sm setGear';
        gear.textContent = '⚙️';
        gear.title = '设置';
        gear.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openSettingsModal();
        };
        bar.appendChild(gear);
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
        // 天赋点随经验/通关变化，顺带刷新入口红点（_refreshTop 是所有进度变动后的统一出口）
        this._refreshTalentRed();
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

    // ================= 礼包系统 =================

    /** 免费补给未领 → banner 角标加红点；已领恢复常态 */
    private _refreshGiftDot(el: HTMLElement | null): void {
        if (!el) {
            return;
        }
        const freeDef = GIFT_PACKS.find(g => g.id === 'gift_free');
        el.classList.toggle('dotOn', !!freeDef && !this._giftSvc.hasBoughtToday(freeDef));
    }

    /** 礼包中心弹窗：每日免费补给 + 钻石礼包，购买后掉落以结算样式翻出 */
    private _openGiftModal(): void {
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
    private _openGiftResultModal(def: GiftPackDef, drops: LootDrop[]): void {
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

    // ================= 任务与成就 =================

    /** 任务入口红点：有可领奖任务时点亮 */
    private _refreshQuestRed(el: HTMLElement | null): void {
        if (el) {
            el.classList.toggle('on', QuestSystem.instance.hasClaimable());
        }
    }

    /** 签到入口红点：今天未签到时点亮 */
    private _refreshSigninRed(el: HTMLElement | null): void {
        if (el) {
            el.classList.toggle('on', SigninSystem.instance.canClaimToday());
        }
    }

    /** 天赋入口红点：有未分配的可用天赋点时点亮 */
    private _refreshTalentRed(): void {
        if (this._talentRedEl) {
            this._talentRedEl.classList.toggle('on', TalentSystem.instance.available > 0);
        }
    }

    /** 个人主页浮窗（点头像弹出）：名片 + 战绩 + 养成 + 系统进度 + 账号信息 */
    private _openProfileModal(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const qs = QuestSystem.instance;
        const bs = BestiarySystem.instance;
        const ss = SigninSystem.instance;
        this._openModal('🎖️ 个人主页', (box) => {
            box.classList.add('pfBox');

            // ---- 名片：大头像 + 称号 + 队伍战力 ----
            const card = document.createElement('div');
            card.className = 'pfCard panel frame';
            const pic = document.createElement('div');
            pic.className = 'pfPic';
            this._tex('characters/commander', u => {
                pic.style.backgroundImage = u;
                pic.style.backgroundSize = '180% auto';
                pic.style.backgroundPosition = 'center 12%';
                pic.style.backgroundRepeat = 'no-repeat';
            });
            card.appendChild(pic);
            const cardInfo = document.createElement('div');
            cardInfo.className = 'pfCardInfo';
            const nm = document.createElement('div');
            nm.className = 'pfName';
            nm.innerHTML = `<b>末日指挥官</b><span class="lvtag">LV.${gm.hqLevel()}</span>`;
            const title = document.createElement('div');
            title.className = 'pfTitle';
            // 称号按通关进度晋升
            const stage = gm.stageCleared;
            title.textContent = stage >= FINAL_STAGE_ID ? '☠️ 尸潮终结者' : stage >= 8 ? '🛡️ 王牌护卫'
                : stage >= 4 ? '🎯 资深猎手' : stage >= 1 ? '🎖️ 幸存者' : '🌱 拾荒新人';
            cardInfo.appendChild(nm);
            cardInfo.appendChild(title);
            // 队伍战力：全队攻击乘区总和（英雄等级玩法下线，口径 = 武器×装备×局外强化）
            let power = 0;
            for (const id of gm.ownedHeroes) {
                power += Math.round(hs.atkMulOf(id) * gm.metaAtkMul() * 100);
            }
            const powerRow = document.createElement('div');
            powerRow.className = 'pfPower';
            powerRow.innerHTML = `<span>⚔️ 队伍战力</span><b>${power.toLocaleString()}</b>`;
            cardInfo.appendChild(powerRow);
            card.appendChild(cardInfo);
            box.appendChild(card);

            // ---- 战绩统计 ----
            const secStats = document.createElement('div');
            secStats.className = 'pfSec';
            secStats.innerHTML = '<div class="pfSecHead"><b>📊 战绩统计</b></div>';
            const grid1 = document.createElement('div');
            grid1.className = 'pfGrid';
            const stat = (ic: string, label: string, val: string) => {
                const c = document.createElement('div');
                c.className = 'pfStat panel';
                c.innerHTML = `<em>${ic}</em><b>${val}</b><span>${label}</span>`;
                grid1.appendChild(c);
            };
            stat('🚚', '通关关卡', `${gm.stageCleared}/${FINAL_STAGE_ID}`);
            stat('🌊', '最远波次', `第 ${gm.bestWave} 波`);
            stat('💀', '累计击杀', gm.totalKills.toLocaleString());
            stat('♾️', '无尽里程碑', `${Math.floor(gm.bestWave / 5)} 次`);
            secStats.appendChild(grid1);
            box.appendChild(secStats);

            // ---- 养成收集 ----
            const { done: besDone, total: besTotal } = bs.completion();
            const skillTotal = Object.keys(gm.skillLevels).length;
            const gemCount = hs.miscCount('gem_fire') + hs.miscCount('gem_wind') + hs.miscCount('gem_ice') + hs.miscCount('gem_thunder');
            const secGrow = document.createElement('div');
            secGrow.className = 'pfSec';
            secGrow.innerHTML = '<div class="pfSecHead"><b>🎖️ 养成收集</b></div>';
            const grid2 = document.createElement('div');
            grid2.className = 'pfGrid';
            const grow = (ic: string, label: string, val: string) => {
                const c = document.createElement('div');
                c.className = 'pfStat panel';
                c.innerHTML = `<em>${ic}</em><b>${val}</b><span>${label}</span>`;
                grid2.appendChild(c);
            };
            grow('🎖️', '已拥有英雄', `${gm.ownedHeroes.length}/${HERO_DEFS.length}`);
            grow('📚', '已学技能', `${skillTotal} 门`);
            grow('💎', '持有宝石', `${gemCount} 颗`);
            grow('📖', '图鉴收录', `${besDone}/${besTotal}`);
            secGrow.appendChild(grid2);
            box.appendChild(secGrow);

            // ---- 系统进度 ----
            const pro = gm.prosperity();
            const secSys = document.createElement('div');
            secSys.className = 'pfSec';
            secSys.innerHTML = '<div class="pfSecHead"><b>🏗️ 系统进度</b></div>';
            const grid3 = document.createElement('div');
            grid3.className = 'pfGrid';
            grow('🏰', '基地繁荣度', `${pro.cur}/${pro.max}`);
            grow('📅', '累计签到', `${ss.totalDays} 天`);
            grow('✅', '成就达成', `${QUEST_DEFS.filter(q => qs.isClaimed(q)).length}/${QUEST_DEFS.length}`);
            grow('📬', '邮箱附件', `${MailSystem.instance.hasClaimable() ? '有可领取' : '已清空'}`);
            grow('🌟', '天赋加点', `${TalentSystem.instance.spent}/${TalentSystem.instance.total} 点`);
            secSys.appendChild(grid3);
            box.appendChild(secSys);

            // ---- 账号信息 ----
            const secAcc = document.createElement('div');
            secAcc.className = 'pfSec';
            secAcc.innerHTML = '<div class="pfSecHead"><b>ℹ️ 账号信息</b></div>';
            const acc = document.createElement('div');
            acc.className = 'pfAcc panel';
            acc.innerHTML =
                `<div class="pfAccRow"><span>游戏版本</span><b>${BUILD_STAMP}</b></div>` +
                `<div class="pfAccRow"><span>平台</span><b>Web Mobile</b></div>` +
                `<div class="pfAccRow"><span>称号晋升</span><b>${stage >= FINAL_STAGE_ID ? '已满称号' : `通关第 ${gm.stageCleared + 1} 关晋升`}</b></div>`;
            secAcc.appendChild(acc);
            box.appendChild(secAcc);
        });
    }

    /**
     * 天赋树弹窗：三分支并排 × 每支 5 节点竖排（节点间连线表示解锁先后）。
     * 点数为进度派生（累计等级/通关/爬塔/招募），洗点免费无限次。
     * 选中的节点在下方详情区就地更新，加点/洗点后重开本弹窗刷新整棵树。
     */
    private _openTalentModal(selId = 'fire_1'): void {
        const ts = TalentSystem.instance;
        this._openModal('🌟 天赋树', (box) => {
            box.classList.add('talentBox');

            // ---- 头部：可用点数 + 总进度 ----
            const head = document.createElement('div');
            head.className = 'talentHead';
            head.innerHTML = `<div class="talentHeadTop"><b>可用天赋点 <i>${ts.available}</i></b>`
                + `<span>已投 ${ts.spent} / 共 ${ts.total}</span></div>`;
            const barWrap = document.createElement('div');
            barWrap.className = 'talentBar';
            const barIn = document.createElement('i');
            barIn.style.width = `${ts.total > 0 ? Math.round(ts.spent / ts.total * 100) : 0}%`;
            barWrap.appendChild(barIn);
            head.appendChild(barWrap);
            const src = document.createElement('div');
            src.className = 'talentSrc';
            src.textContent = '天赋点来源：累计等级每 5 级 +1 · 通关每关 +1 · 爬塔每 5 层 +1 · 招募每 10 抽 +1';
            head.appendChild(src);
            box.appendChild(head);

            // ---- 三分支并排 ----
            const row = document.createElement('div');
            row.className = 'talentBranchRow';
            for (const br of TALENT_BRANCHES) {
                const col = document.createElement('div');
                col.className = 'talentBranch';
                const title = document.createElement('div');
                title.className = 'tbTitle';
                title.innerHTML = `<b>${TALENT_BRANCH_NAMES[br]}</b><i>${ts.spentIn(br)}/${branchPointTotal(br)} 点</i>`;
                col.appendChild(title);
                const nodes = document.createElement('div');
                nodes.className = 'tbNodes';
                for (const def of branchNodes(br)) {
                    const lv = ts.level(def.id);
                    const maxed = ts.isMaxed(def.id);
                    const unlocked = ts.isUnlocked(def.id);
                    const node = document.createElement('div');
                    node.className = 'talentNode';
                    if (maxed) {
                        node.classList.add('maxed');
                    } else if (!unlocked) {
                        node.classList.add('lock');
                    } else if (ts.canUpgrade(def.id)) {
                        node.classList.add('can');
                    }
                    if (def.id === selId) {
                        node.classList.add('sel');
                    }
                    node.innerHTML = `<span class="tnIc">${def.ic}</span>`
                        + `<span class="tnLv">${def.maxLevel > 1 ? `${lv}/${def.maxLevel}` : (lv > 0 ? '已激活' : '未激活')}</span>`;
                    node.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openTalentModal(def.id);
                    };
                    nodes.appendChild(node);
                }
                col.appendChild(nodes);
                row.appendChild(col);
            }
            box.appendChild(row);

            // ---- 详情区（就地更新，不重开弹窗） ----
            const def = talentNode(selId) || TALENT_NODES[0];
            const lv = ts.level(def.id);
            const maxed = ts.isMaxed(def.id);
            const unlocked = ts.isUnlocked(def.id);
            const detail = document.createElement('div');
            detail.className = 'talentDetail panel';
            const nameLine = document.createElement('div');
            nameLine.className = 'tdName';
            nameLine.innerHTML = `<b>${def.ic} ${def.name}</b>`
                + `<i>Lv.${lv}/${def.maxLevel} · ${TALENT_BRANCH_NAMES[def.branch]}线第 ${def.idx + 1} 层</i>`;
            detail.appendChild(nameLine);
            const descLine = document.createElement('div');
            descLine.className = 'tdDesc';
            descLine.textContent = def.desc(lv);
            detail.appendChild(descLine);
            const hint = document.createElement('div');
            hint.className = 'tdHint';
            if (maxed) {
                hint.textContent = '✅ 已满级';
            } else if (!unlocked) {
                const prev = branchNodes(def.branch)[def.idx - 1];
                hint.textContent = `🔒 需先将「${prev ? prev.name : '前置节点'}」点满`;
            } else if (ts.available < def.pointCost) {
                hint.textContent = `⚠️ 天赋点不足，还差 ${def.pointCost - ts.available} 点`;
            } else {
                hint.textContent = `消耗 ${def.pointCost} 点天赋点`;
            }
            detail.appendChild(hint);

            const btns = document.createElement('div');
            btns.className = 'tdBtns';
            const up = document.createElement('button');
            up.className = 'btn big gold';
            up.textContent = maxed ? '✅ 已满级' : `🌟 加点（${def.pointCost} 点）`;
            up.disabled = !ts.canUpgrade(def.id);
            up.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                const lvNow = ts.upgrade(def.id);
                if (lvNow === null) {
                    SoundFx.play('ui');
                    this._toast('加点失败');
                    return;
                }
                SoundFx.play('coin');
                this._toast(`${def.name} 升至 Lv.${lvNow}`);
                this._refreshTop();
                this._refreshTalentRed();
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openTalentModal(def.id);
            };
            btns.appendChild(up);

            const reset = document.createElement('button');
            reset.className = 'btn big';
            reset.textContent = '🔄 洗点';
            reset.disabled = ts.spent <= 0;
            // 二次确认：沿用设置页重置存档的两次点击模式，防误触
            let confirm = false;
            reset.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                if (!confirm) {
                    confirm = true;
                    reset.textContent = `⚠️ 再点一次确认洗点（退 ${ts.spent} 点）`;
                    return;
                }
                const back = ts.reset();
                SoundFx.play('bigkill');
                this._toast(`洗点完成，退还 ${back} 点天赋点`);
                this._refreshTop();
                this._refreshTalentRed();
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openTalentModal(def.id);
            };
            btns.appendChild(reset);
            detail.appendChild(btns);
            box.appendChild(detail);
        });
    }

    /**
     * 英雄招募弹窗：保底进度 + 概率表 + 四英雄碎片库存 + 单抽/十连/看广告免费招募。
     * 结果不在此展示，交由 _openRecruitResultModal 做揭示动画。
     */
    private _openRecruitModal(): void {
        const rs = RecruitSystem.instance;
        const gm = GameManager.instance;
        const diam = gm.res.get('diamond');
        this._openModal('🎖️ 英雄招募', (box) => {
            box.classList.add('recruitBox');
            // 头部：累计抽数 + 保底进度条
            const head = document.createElement('div');
            head.className = 'rcHead';
            head.innerHTML = `<div class="rcHeadTop"><b>已招募 <i>${rs.totalRecruits}</i> 次</b>`
                + `<span>距保底还差 ${rs.pityLeft} 抽</span></div>`;
            const barWrap = document.createElement('div');
            barWrap.className = 'rcBar';
            const barIn = document.createElement('i');
            barIn.style.width = `${Math.round((RECRUIT_PITY - rs.pityLeft) / RECRUIT_PITY * 100)}%`;
            barWrap.appendChild(barIn);
            head.appendChild(barWrap);
            box.appendChild(head);

            // 概率表
            const rate = document.createElement('div');
            rate.className = 'rcRate panel';
            rate.innerHTML =
                `<div class="rcRateRow hero"><span>🎖️ 英雄本体（未获得优先）</span><b>6%</b></div>` +
                `<div class="rcRateRow r5"><span>⭐ 传说碎片 ×10</span><b>14%</b></div>` +
                `<div class="rcRateRow r3"><span>🔷 稀有碎片 ×5</span><b>40%</b></div>` +
                `<div class="rcRateRow r2"><span>🔹 普通碎片 ×2</span><b>40%</b></div>` +
                `<div class="rcRateNote">🛡️ 十连必出稀有以上 · ${RECRUIT_PITY} 抽内必出英雄本体</div>`;
            box.appendChild(rate);

            // 四英雄碎片库存
            const shardBox = document.createElement('div');
            shardBox.className = 'rcShards';
            const shardHead = document.createElement('div');
            shardHead.className = 'rcShardsHead';
            shardHead.textContent = '碎 片 库 存';
            shardBox.appendChild(shardHead);
            const shardGrid = document.createElement('div');
            shardGrid.className = 'rcShardGrid';
            HERO_DEFS.forEach((d, i) => {
                const cell = document.createElement('div');
                cell.className = 'rcShard';
                const pic = document.createElement('span');
                pic.className = 'rcShardPic';
                const photo = this._heroPhoto(i, 'slot');
                this._tex(photo.key, u => {
                    pic.style.backgroundImage = u;
                    pic.style.backgroundRepeat = 'no-repeat';
                    pic.style.cssText += photo.css;
                });
                const info = document.createElement('span');
                info.className = 'rcShardInfo';
                const own = gm.isHeroOwned(d.id);
                info.innerHTML = `<b>${d.name}</b><i>${rs.stars(d.id)}★ · 🔩${rs.shards(d.id)}</i>`;
                if (!own) {
                    cell.classList.add('lock');
                }
                cell.appendChild(pic);
                cell.appendChild(info);
                shardGrid.appendChild(cell);
            });
            shardBox.appendChild(shardGrid);
            box.appendChild(shardBox);

            // 抽卡按钮组
            const btns = document.createElement('div');
            btns.className = 'rcBtns';
            const mkPull = (label: string, cost: number, count: 1 | 10) => {
                const b = document.createElement('button');
                b.className = 'btn big rcBtn' + (count === 10 ? ' gold' : '');
                b.textContent = `${label}（💎 ${cost.toLocaleString()}）`;
                b.disabled = diam < cost;
                b.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const got = rs.recruit(count);
                    if (!got) {
                        SoundFx.play('ui');
                        this._toast('钻石不足');
                        return;
                    }
                    SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                    this._refreshTop();
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openRecruitResultModal(got);
                };
                btns.appendChild(b);
            };
            mkPull('单 抽', RECRUIT_PRICE_1, 1);
            mkPull('十 连', RECRUIT_PRICE_10, 10);
            box.appendChild(btns);

            // 看广告免费招募（每日 1 次）
            const left = AdService.instance.remaining('recruit');
            const ad = document.createElement('button');
            ad.className = 'btn big rcAdBtn';
            ad.textContent = left > 0 ? `▶ 看广告免费招募（今日 ${left}/1）` : '▶ 今日免费招募已用完';
            ad.disabled = left <= 0;
            ad.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                AdService.instance.claimReward('recruit', () => {
                    const got = rs.recruit(1, true);
                    if (!got) {
                        return;
                    }
                    SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                    this._refreshTop();
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openRecruitResultModal(got);
                });
            };
            box.appendChild(ad);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '抽到已拥有的英雄会转化为该英雄碎片，碎片用于升星';
            box.appendChild(note);
            this._applyPendingTex();
        });
    }

    /** 招募结果浮窗：卡片错峰揭示（复用 giftDropIn 动画），十连带汇总行 */
    private _openRecruitResultModal(results: RecruitResult[]): void {
        const hasHero = results.some(r => r.kind === 'hero');
        const shardTotal = results.reduce((n, r) => n + (r.shardN ?? 0), 0);
        const heroCount = results.filter(r => r.kind === 'hero').length;
        this._openModal(hasHero ? '🎖️ 招 募 大 成 功' : '🎖️ 招 募 结 果', (box) => {
            box.classList.add('recruitResBox');
            const grid = document.createElement('div');
            grid.className = 'recruitResGrid' + (results.length > 1 ? ' many' : '');
            results.forEach((r, i) => {
                const idx = HERO_DEFS.findIndex(d => d.id === r.heroId);
                const cell = document.createElement('div');
                cell.className = `rcCard r${r.tierRank}` + (r.kind === 'hero' ? ' hero' : '');
                cell.style.animationDelay = `${(0.1 + i * 0.15).toFixed(2)}s`;
                // 英雄本体用立绘，碎片用 emoji
                if (r.kind === 'hero' && idx >= 0) {
                    const pic = document.createElement('span');
                    pic.className = 'rcCardPic';
                    const photo = this._heroPhoto(idx, 'figure');
                    this._tex(photo.key, u => {
                        pic.style.backgroundImage = u;
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.cssText += photo.css;
                    });
                    cell.appendChild(pic);
                } else if (idx >= 0) {
                    const pic = document.createElement('span');
                    pic.className = 'rcCardPic';
                    const photo = this._heroPhoto(idx, 'slot');
                    this._tex(photo.key, u => {
                        pic.style.backgroundImage = u;
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.cssText += photo.css;
                    });
                    cell.appendChild(pic);
                } else {
                    const ic = document.createElement('span');
                    ic.className = 'rcCardIc';
                    ic.textContent = r.ic;
                    cell.appendChild(ic);
                }
                if (r.kind === 'hero') {
                    const flag = document.createElement('span');
                    flag.className = 'rcNew';
                    flag.textContent = 'NEW!';
                    cell.appendChild(flag);
                } else if (r.duplicate) {
                    const flag = document.createElement('span');
                    flag.className = 'rcDup';
                    flag.textContent = '转化为碎片';
                    cell.appendChild(flag);
                }
                const nm = document.createElement('span');
                nm.className = 'rcCardNm';
                nm.textContent = r.kind === 'hero' ? r.name : `${r.name}`;
                cell.appendChild(nm);
                grid.appendChild(cell);
                this.scheduleOnce(() => {
                    SoundFx.play(r.kind === 'hero' ? 'bigkill' : r.tier === 'legend' ? 'buy' : 'ui');
                }, 0.15 + i * 0.15);
            });
            box.appendChild(grid);
            if (results.length > 1) {
                const sum = document.createElement('div');
                sum.className = 'rcSum';
                sum.textContent = `本次获得：英雄 ×${heroCount} · 碎片 ×${shardTotal}`;
                box.appendChild(sum);
            }
            // 再来一次（钻石够时显示）+ 关闭
            const again = document.createElement('button');
            again.className = 'btn gold big rcAgain';
            again.textContent = results.length > 1
                ? `再 来 一 次（💎 ${RECRUIT_PRICE_10.toLocaleString()}）`
                : `再 来 一 次（💎 ${RECRUIT_PRICE_1.toLocaleString()}）`;
            const cost = results.length > 1 ? RECRUIT_PRICE_10 : RECRUIT_PRICE_1;
            again.disabled = GameManager.instance.res.get('diamond') < cost;
            again.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                const got = RecruitSystem.instance.recruit(results.length > 1 ? 10 : 1);
                if (!got) {
                    SoundFx.play('ui');
                    this._toast('钻石不足');
                    return;
                }
                SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                this._refreshTop();
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openRecruitResultModal(got);
            };
            box.appendChild(again);
            const ok = document.createElement('button');
            ok.className = 'btn big rcClose';
            ok.textContent = '关 闭';
            ok.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                document.querySelector('#homeUi .protoMask')?.remove();
                this._refreshHeroes();
            };
            box.appendChild(ok);
            this._applyPendingTex();
        });
    }

    /**
     * 试炼之塔弹窗：层段网格（每 5 层一组）+ 选中层详情 + 挑战入口。
     * 格子状态：✅ 已通 / ▶ 可挑战（高亮）/ 🔒 未解锁；里程碑层（每 5 层）带 👑。
     */
    private _openTrialModal(): void {
        const ts = TrialSystem.instance;
        // 选中层：默认停在「当前可挑战层」；越界钳到合法范围
        let sel = Math.min(TRIAL_MAX_FLOOR, Math.max(1, this._trialSelFloor || ts.nextFloor));
        if (sel > ts.nextFloor) {
            sel = ts.nextFloor;
        }
        this._trialSelFloor = sel;
        this._openModal('🗼 试炼之塔', (box) => {
            box.classList.add('trialBox');
            const head = document.createElement('div');
            head.className = 'siHead';
            head.innerHTML = ts.maxFloor > 0
                ? `<b>已通关 <i>${ts.clearedCount}</i> 层 · 最高第 ${ts.maxFloor} 层</b><span>每层 3 波 · 每 5 层大奖</span>`
                : '<b>尚未登塔</b><span>从第 1 层开始挑战</span>';
            box.appendChild(head);

            // 层段网格：每 5 层一组（含里程碑层），纵向滚动
            const list = document.createElement('div');
            list.className = 'trialList';
            const sects = Math.ceil(sel / TRIAL_MILESTONE_EVERY);
            const totalSects = Math.ceil(TRIAL_MAX_FLOOR / TRIAL_MILESTONE_EVERY);
            for (let s = 0; s < totalSects; s++) {
                const from = s * TRIAL_MILESTONE_EVERY + 1;
                const to = Math.min(TRIAL_MAX_FLOOR, from + TRIAL_MILESTONE_EVERY - 1);
                // 未推进到的层段折叠成一行（避免 60 层摊开太长），只露出解锁进度附近
                const lockedSect = from > ts.nextFloor;
                const sect = document.createElement('div');
                sect.className = 'trialSect' + (lockedSect ? ' lock' : '');
                const st = document.createElement('div');
                st.className = 'trialSectName';
                st.textContent = lockedSect
                    ? `第 ${from}~${to} 层 🔒`
                    : (s === sects - 1 ? `第 ${from}~${to} 层 · 当前层段` : `第 ${from}~${to} 层段`);
                sect.appendChild(st);
                if (!lockedSect) {
                    const grid = document.createElement('div');
                    grid.className = 'trialGrid';
                    for (let f = from; f <= to; f++) {
                        const cleared = ts.isFloorCleared(f);
                        const unlocked = ts.isFloorUnlocked(f);
                        const isNow = f === ts.nextFloor && !cleared;
                        const mile = f % TRIAL_MILESTONE_EVERY === 0;
                        const cell = document.createElement('div');
                        cell.className = 'trialCell panel'
                            + (cleared ? ' done' : isNow ? ' now' : unlocked ? '' : ' lock')
                            + (mile ? ' mile' : '')
                            + (f === sel ? ' sel' : '');
                        cell.innerHTML = `<b>${f}</b><span>${cleared ? '✅' : isNow ? '▶' : unlocked ? '◻' : '🔒'}</span>`
                            + (mile ? '<i>👑</i>' : '');
                        if (unlocked) {
                            cell.onclick = (e) => {
                                e.stopPropagation();
                                SoundFx.play('ui');
                                this._trialSelFloor = f;
                                document.querySelector('#homeUi .protoMask')?.remove();
                                this._openTrialModal();
                            };
                        }
                        grid.appendChild(cell);
                    }
                    sect.appendChild(grid);
                }
                list.appendChild(sect);
            }
            box.appendChild(list);

            // 选中层详情：怪强倍率 / 怪物池 / 首通奖励预览 / 挑战按钮
            const def = trialFloorDef(sel);
            const reward = trialFloorReward(sel);
            const cleared = ts.isFloorCleared(sel);
            const unlocked = ts.isFloorUnlocked(sel);
            const det = document.createElement('div');
            det.className = 'trialDetail panel';
            det.innerHTML = `<div class="trialName">第 ${sel} 层${def.milestone ? ' 👑 层段大奖' : ''}`
                + `<span>${def.sectName}</span></div>`;
            det.innerHTML += `<div class="trialStat">`
                + `<span>怪物强度 <b>×${def.hpMul.toFixed(1)}</b></span>`
                + `<span>精英率 <b>${Math.round(def.eliteChance * 100)}%</b></span>`
                + `<span>波次 <b>3 波</b></span></div>`;
            // 怪物池（图鉴美术 + 名称）
            const mobs = document.createElement('div');
            mobs.className = 'trialMobs';
            for (const m of def.monsters) {
                const bd = BESTIARY_DEFS.filter(d => d.id === m.id)[0];
                const cell = document.createElement('div');
                cell.className = 'trialMob';
                const pic = document.createElement('div');
                pic.className = 'trialMobPic';
                if (bd) {
                    this._tex(bd.art, u => {
                        pic.style.backgroundImage = u;
                        pic.style.backgroundSize = 'contain';
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.backgroundPosition = 'center bottom';
                    });
                }
                const nm = document.createElement('span');
                nm.textContent = bd ? bd.name : m.id;
                cell.appendChild(pic);
                cell.appendChild(nm);
                mobs.appendChild(cell);
            }
            if (def.monsters.length === 0) {
                mobs.innerHTML = '<span class="trialMobNm">—</span>';
            }
            det.appendChild(mobs);
            // 首通奖励预览
            const line = (ic: string, txt: string) => `<div class="trialRewardRow"><span>${ic}</span><b>${txt}</b></div>`;
            let rw = '';
            if (cleared) {
                rw = '<div class="trialRewardNote">✅ 已通关 · 可重复挑战（只得基础金币与少量掉落）</div>';
            } else if (unlocked) {
                rw = line('🪙', `${reward.gold.toLocaleString()} 金币`)
                    + (reward.diamond > 0 ? line('💎', `${reward.diamond} 钻石`) : '')
                    + (reward.drops.length > 0 ? line('🎁', `额外掉落 ×${reward.drops.length}`) : '');
                rw = `<div class="trialRewardHead">首通奖励</div>${rw}`;
            } else {
                rw = `<div class="trialRewardNote">🔒 需先通关第 ${sel - 1} 层</div>`;
            }
            const rwEl = document.createElement('div');
            rwEl.className = 'trialReward';
            rwEl.innerHTML = rw;
            det.appendChild(rwEl);
            box.appendChild(det);

            const go = document.createElement('button');
            go.className = 'btn gold big trialGo';
            go.textContent = !unlocked ? `🔒 第 ${sel} 层未解锁`
                : cleared ? `⚔️ 重挑 第 ${sel} 层` : `⚔️ 挑战 第 ${sel} 层`;
            go.disabled = !unlocked;
            go.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._startTrial(sel);
            };
            box.appendChild(go);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '试炼不消耗体力、不限次数；层内失败不影响已通关进度';
            box.appendChild(note);
        });
    }

    /** 选中层记忆（弹窗重开时保持焦点） */
    private _trialSelFloor = 0;

    /** 进入试炼之塔某层：走流程状态机（免体力/免关卡门槛，只校验层数解锁链） */
    private _startTrial(floor: number): void {
        if (!this._root) {
            return;
        }
        if (!GameFlow.instance.startRun(false, 0, floor)) {
            this._toast(`第 ${floor} 层尚未解锁`);
            return;
        }
        this.hide();
    }

    /** 怪物图鉴弹窗：完成度头部 + 五怪网格（未解锁剪影）+ 点卡片进详情浮窗 */
    private _openBestiaryModal(): void {
        const bs = BestiarySystem.instance;
        this._openModal('📖 怪物图鉴', (box) => {
            box.classList.add('besBox');
            const { done, total } = bs.completion();
            const head = document.createElement('div');
            head.className = 'siHead';
            head.innerHTML = `<b>已收录 <i>${done}</i> / ${total} 种</b><span>击杀对应怪物自动解锁</span>`;
            box.appendChild(head);
            const grid = document.createElement('div');
            grid.className = 'besGrid';
            for (const def of BESTIARY_DEFS) {
                const unlocked = bs.unlocked(def.id);
                const kills = bs.kills(def.id);
                const cell = document.createElement('div');
                cell.className = 'besCell panel' + (unlocked ? '' : ' lock');
                const pic = document.createElement('div');
                pic.className = 'besPic';
                this._tex(def.art, u => {
                    pic.style.backgroundImage = u;
                    pic.style.backgroundSize = 'contain';
                    pic.style.backgroundRepeat = 'no-repeat';
                    pic.style.backgroundPosition = 'center bottom';
                });
                const nm = document.createElement('div');
                nm.className = 'besNm';
                nm.textContent = unlocked ? def.name : '？？？';
                const sub = document.createElement('div');
                sub.className = 'besSub';
                sub.textContent = unlocked ? `击杀 ×${kills}` : '尚未遭遇';
                cell.appendChild(pic);
                cell.appendChild(nm);
                cell.appendChild(sub);
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBestiaryDetail(def);
                };
                grid.appendChild(cell);
            }
            box.appendChild(grid);
            // 精英怪累计 + 提示
            const elite = document.createElement('div');
            elite.className = 'besElite';
            elite.innerHTML = `<span>🩸 精英怪累计击杀：<b>${bs.eliteKills}</b></span><span>精英怪体型更大、数值更强（红色描边）</span>`;
            box.appendChild(elite);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '出战迎战每一种怪物，击杀后自动收录进图鉴';
            box.appendChild(note);
        });
    }

    /** 图鉴详情浮窗：立绘 + 威胁星级 + 习性/数值 + 遭遇记录（未解锁灰态剪影） */
    private _openBestiaryDetail(def: BestiaryDef): void {
        const bs = BestiarySystem.instance;
        this._openModal('📖 图鉴详情', (box) => {
            box.classList.add('besBox');
            const unlocked = bs.unlocked(def.id);
            const wrap = document.createElement('div');
            wrap.className = 'besDetail panel' + (unlocked ? '' : ' lock');
            const pic = document.createElement('div');
            pic.className = 'besDetailPic';
            if (unlocked) {
                this._tex(def.art, u => {
                    pic.style.backgroundImage = u;
                    pic.style.backgroundSize = 'contain';
                    pic.style.backgroundRepeat = 'no-repeat';
                    pic.style.backgroundPosition = 'center bottom';
                });
            }
            const info = document.createElement('div');
            info.className = 'besDetailInfo';
            const nm = document.createElement('div');
            nm.className = 'besDetailName';
            nm.innerHTML = `<b>${unlocked ? def.name : '？？？'}</b><span class="besStars">${unlocked ? '★'.repeat(def.threat) + '☆'.repeat(5 - def.threat) : '☆☆☆☆☆'}</span>`;
            const beh = document.createElement('div');
            beh.className = 'besBeh';
            beh.textContent = unlocked ? def.behavior : '？？？ · ？？？';
            const desc = document.createElement('div');
            desc.className = 'besDesc';
            desc.textContent = unlocked ? def.desc : '尚未遭遇该怪物。出击迎战，击杀后自动收录。';
            const stats = document.createElement('div');
            stats.className = 'besStats';
            if (unlocked) {
                stats.innerHTML =
                    `<div class="besStatRow"><span>基准生命</span><b>${def.stats.hp.toLocaleString()}</b></div>` +
                    `<div class="besStatRow"><span>移动速度</span><b>${def.stats.speed}</b></div>` +
                    `<div class="besStatRow"><span>啃咬伤害</span><b>${def.stats.touchDamage}</b></div>` +
                    `<div class="besStatRow"><span>首次出没</span><b>${def.debut}</b></div>` +
                    `<div class="besStatRow"><span>累计击杀</span><b>×${bs.kills(def.id)}</b></div>`;
            } else {
                stats.innerHTML = '<div class="besStatRow"><span>数据未收录</span><b>—</b></div>';
            }
            info.appendChild(nm);
            info.appendChild(beh);
            info.appendChild(desc);
            info.appendChild(stats);
            wrap.appendChild(pic);
            wrap.appendChild(info);
            box.appendChild(wrap);
            const ok = document.createElement('button');
            ok.className = 'btn gold big biOk';
            ok.textContent = '返 回 图 鉴';
            ok.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openBestiaryModal();
            };
            box.appendChild(ok);
        });
    }

    /** 七日签到弹窗：日历格子（已领/今日可领高亮/未到档位）+ 今日奖励详情 + 领取 */
    private _openSigninModal(): void {
        const ss = SigninSystem.instance;
        this._openModal('📅 每日签到 · 七日目标', (box) => {
            box.classList.add('signinBox');
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
            // 历史累计 + 当前循环进度
            const head = document.createElement('div');
            head.className = 'siHead';
            head.innerHTML = `<b>累计签到 <i>${ss.totalDays}</i> 天</b><span>当前第 ${ss.day} / 7 天 · 断签不惩罚</span>`;
            box.appendChild(head);
            // 七日日历格子
            const grid = document.createElement('div');
            grid.className = 'siGrid';
            const claimedToday = ss.isTodayClaimed();
            const curDay = ss.day;
            // 今日刚领的档位（已领时 day 指针已前移，回退一格）
            const justClaimedDay = claimedToday ? (curDay === 1 ? 7 : curDay - 1) : 0;
            // 今日可领的档位
            const claimableDay = claimedToday ? 0 : curDay;
            for (const r of SIGNIN_REWARDS) {
                // 本轮已领：day 指针之前的档位
                const done = r.day < curDay;
                const isToday = r.day === claimableDay || r.day === justClaimedDay;
                const cell = document.createElement('div');
                cell.className = 'siCell panel' + (isToday ? ' today' : '') + (done ? ' done' : '');
                const ic = document.createElement('div');
                ic.className = 'siIc';
                ic.textContent = done ? '✅' : r.ic;
                const nm = document.createElement('div');
                nm.className = 'siNm';
                nm.textContent = r.label;
                const dy = document.createElement('div');
                dy.className = 'siDy';
                dy.textContent = r.day === 7 ? '第7天·大奖' : `第${r.day}天`;
                const rw = document.createElement('div');
                rw.className = 'siRw';
                rw.textContent = rewardText(r);
                cell.appendChild(ic);
                cell.appendChild(nm);
                cell.appendChild(dy);
                cell.appendChild(rw);
                grid.appendChild(cell);
            }
            box.appendChild(grid);
            // 今日奖励详情 + 领取按钮
            const claimed = ss.isTodayClaimed();
            const today = ss.todayReward();
            const foot = document.createElement('div');
            foot.className = 'siFoot panel' + (claimed ? ' done' : ' ready');
            const info = document.createElement('div');
            info.className = 'siInfo';
            info.innerHTML = `<b>今日档位：${today.ic} ${today.label}</b><span>${rewardText(today)}</span>`;
            foot.appendChild(info);
            const btn = document.createElement('button');
            btn.className = `btn ${claimed ? 'dark' : 'gold'} sm`;
            btn.textContent = claimed ? '今日已签到' : '签 到';
            btn.disabled = claimed;
            if (!claimed) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const got = ss.claim();
                    if (got) {
                        SoundFx.play('coin');
                        this._toast(`签到成功：${got.label}`);
                        this._refreshTop();
                        this._refreshSigninRed(this._signinRedEl);
                        // 整弹重开刷新日历状态
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._openSigninModal();
                    }
                };
            }
            foot.appendChild(btn);
            box.appendChild(foot);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '每天登录领一档 · 领满 7 天开新一轮 · 错过不补领';
            box.appendChild(note);
        });
    }

    /** 任务中心弹窗：每日任务（自然日重置）+ 成就（累计里程碑），进度条 + 领奖 */
    private _openQuestModal(): void {
        const qs = QuestSystem.instance;
        this._openModal('📋 任务 · 成就', (box) => {
            box.classList.add('questBox');
            const mkSection = (title: string, sub: string) => {
                const head = document.createElement('div');
                head.className = 'qSecHead';
                head.innerHTML = `<b>${title}</b><span>${sub}</span>`;
                box.appendChild(head);
            };
            const mkRow = (def: QuestDef) => {
                const done = qs.isComplete(def);
                const claimed = qs.isClaimed(def);
                const prog = qs.progress(def);
                const row = document.createElement('div');
                row.className = 'questRow panel' + (claimed ? ' done' : done ? ' ready' : '');
                const ic = document.createElement('div');
                ic.className = 'qIc';
                ic.textContent = def.ic;
                row.appendChild(ic);
                const mid = document.createElement('div');
                mid.className = 'qMid';
                const nm = document.createElement('b');
                nm.textContent = def.name;
                mid.appendChild(nm);
                const bar = document.createElement('div');
                bar.className = 'qBar';
                const fill = document.createElement('i');
                fill.style.width = `${Math.max(claimed ? 100 : 0, Math.min(100, Math.round(prog / def.target * 100)))}%`;
                bar.appendChild(fill);
                mid.appendChild(bar);
                const num = document.createElement('span');
                num.className = 'qNum';
                num.textContent = `${prog.toLocaleString()} / ${def.target.toLocaleString()}`;
                mid.appendChild(num);
                row.appendChild(mid);
                const right = document.createElement('div');
                right.className = 'qRight';
                const reward: string[] = [];
                if (def.reward.diamond) {
                    reward.push(`💎${def.reward.diamond}`);
                }
                if (def.reward.gold) {
                    reward.push(`🪙${def.reward.gold}`);
                }
                const rw = document.createElement('span');
                rw.className = 'qReward';
                rw.textContent = reward.join(' ');
                right.appendChild(rw);
                const btn = document.createElement('button');
                btn.className = `btn sm ${done && !claimed ? 'gold' : 'dark'}`;
                btn.textContent = claimed ? '已领取' : done ? '领 取' : '进行中';
                btn.disabled = !done || claimed;
                if (done && !claimed) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.unlock();
                        if (qs.claim(def)) {
                            SoundFx.play('coin');
                            this._toast(`领取成功：${def.name}`);
                            this._refreshTop();
                            // 整弹重开刷新状态 + 同步基地页红点
                            document.querySelector('#homeUi .protoMask')?.remove();
                            this._refreshQuestRed(this._questRedEl);
                            this._openQuestModal();
                        }
                    };
                }
                right.appendChild(btn);
                row.appendChild(right);
                box.appendChild(row);
            };
            mkSection('📅 每日任务', '每日 0 点重置');
            for (const def of QUEST_DEFS.filter(q => q.kind === 'daily')) {
                mkRow(def);
            }
            mkSection('🏆 成就', '累计进度 · 一次性领奖');
            for (const def of QUEST_DEFS.filter(q => q.kind === 'achv')) {
                mkRow(def);
            }
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '完成任务领钻石 · 钻石可在商店购买礼包';
            box.appendChild(note);
        });
    }

    // ================= 排行榜 =================

    /** 排行榜弹窗：积分榜（本地模拟对手，接入微信开放数据域时替换数据源） */
    private _openLeaderboardModal(): void {
        this._openModal('🏆 末日航线 · 排行榜', (box) => {
            box.classList.add('lbBox');
            const myScoreVal = myScore();
            const head = document.createElement('div');
            head.className = 'lbMy';
            head.innerHTML = `<span>我的积分</span><b>${myScoreVal.toLocaleString()}</b>`;
            box.appendChild(head);
            const list = document.createElement('div');
            list.className = 'lbList';
            const rows = loadBoard();
            rows.forEach((r, i) => {
                const row = document.createElement('div');
                row.className = 'lbRow' + (r.me ? ' me' : '');
                const rank = document.createElement('span');
                rank.className = 'lbRank';
                const topCls = i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : '';
                rank.innerHTML = i < 3 ? `<i class="medal${topCls}">${['🥇', '🥈', '🥉'][i]}</i>` : `${i + 1}`;
                row.appendChild(rank);
                const ic = document.createElement('span');
                ic.className = 'lbIc';
                ic.textContent = r.ic;
                row.appendChild(ic);
                const nm = document.createElement('b');
                nm.className = 'lbName';
                nm.textContent = r.name;
                row.appendChild(nm);
                const sc = document.createElement('span');
                sc.className = 'lbScore';
                sc.textContent = r.score.toLocaleString();
                row.appendChild(sc);
                list.appendChild(row);
            });
            box.appendChild(list);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = boardNote();
            box.appendChild(note);
        });
    }

    // ================= 设置 =================

    /** 设置弹窗：音效开关/音量、版本信息、重置存档（输入 CONFIRM 二次确认） */
    private _openSettingsModal(): void {
        this._openModal('⚙️ 设置', (box) => {
            box.classList.add('setBox');

            // ---- 音效 ----
            const secSound = document.createElement('div');
            secSound.className = 'setSec';
            secSound.innerHTML = '<div class="setHead"><b>🔊 音效</b></div>';
            const soundRow = document.createElement('div');
            soundRow.className = 'setRow';
            soundRow.innerHTML = `<span>战斗与界面音效</span>`;
            const sndBtn = document.createElement('button');
            sndBtn.className = 'btn dark sm';
            const syncSnd = () => {
                sndBtn.textContent = SoundFx.muted ? '🔇 已静音' : '🔊 开启';
            };
            syncSnd();
            sndBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.setMuted(!SoundFx.muted);
                syncSnd();
                if (!SoundFx.muted) {
                    SoundFx.play('ui');
                }
            };
            soundRow.appendChild(sndBtn);
            secSound.appendChild(soundRow);

            // 音量滑条
            const volRow = document.createElement('div');
            volRow.className = 'setRow';
            volRow.innerHTML = `<span>音量</span>`;
            const volWrap = document.createElement('div');
            volWrap.className = 'volWrap';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = String(Math.round(SoundFx.volume * 100));
            slider.oninput = () => {
                SoundFx.setVolume(Number(slider.value) / 100);
            };
            slider.onchange = () => {
                SoundFx.play('coin');
            };
            volWrap.appendChild(slider);
            const volNum = document.createElement('b');
            const syncVol = () => {
                volNum.textContent = `${slider.value}%`;
            };
            syncVol();
            slider.addEventListener('input', syncVol);
            volWrap.appendChild(volNum);
            volRow.appendChild(volWrap);
            secSound.appendChild(volRow);
            box.appendChild(secSound);

            // ---- 关于 ----
            const secAbout = document.createElement('div');
            secAbout.className = 'setSec';
            secAbout.innerHTML =
                `<div class="setHead"><b>ℹ️ 关于</b></div>` +
                `<div class="setRow"><span>版本</span><b>${BUILD_STAMP}</b></div>` +
                `<div class="setRow"><span>游戏</span><b>末日航线 · 尸潮突围</b></div>`;
            box.appendChild(secAbout);

            // ---- 危险区：重置存档 ----
            const secDanger = document.createElement('div');
            secDanger.className = 'setSec';
            secDanger.innerHTML = '<div class="setHead danger"><b>⚠️ 危险操作</b></div>';
            const dangerRow = document.createElement('div');
            dangerRow.className = 'setRow col';
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn dark sm resetBtn';
            resetBtn.textContent = '🗑️ 重置全部存档';
            let confirmState = 0;
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirmState === 0) {
                    confirmState = 1;
                    resetBtn.textContent = '再次点击确认重置（5 秒内）';
                    setTimeout(() => {
                        confirmState = 0;
                        resetBtn.textContent = '🗑️ 重置全部存档';
                    }, 5000);
                    return;
                }
                sys.localStorage.removeItem(GameManager.SAVE_KEY);
                this._toast('存档已重置，即将刷新页面');
                setTimeout(() => location.reload(), 800);
            };
            dangerRow.appendChild(resetBtn);
            secDanger.appendChild(dangerRow);
            box.appendChild(secDanger);
        });
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
        const rs = RecruitSystem.instance;
        const pick = this._heroPickEl;
        const body = this._heroBodyEl;
        if (!pick || !body) {
            return;
        }
        // 横滑选择条 + 招募入口
        pick.innerHTML = '';
        const recruitBtn = document.createElement('button');
        recruitBtn.className = 'hpick recruitEntry';
        recruitBtn.innerHTML = '<span class="pic rcIc">🎖️</span><i>招募</i>';
        recruitBtn.title = '英雄招募（抽卡）';
        recruitBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openRecruitModal();
        };
        pick.appendChild(recruitBtn);
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
            // 星级 = 招募升星真实等级（0~6 星），不再是固定标签
            const st = rs.stars(def.id);
            const stars = document.createElement('span');
            stars.className = 'star';
            stars.textContent = '★'.repeat(st) + '☆'.repeat(HERO_STAR_MAX - st);
            stars.title = st >= HERO_STAR_MAX
                ? '已满星'
                : `升星进度 ${rs.shards(def.id)} / ${rs.starCost(def.id)} 碎片`;
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
            // 加成口径 = 装备+宝石+核心（不含星级，星级单独在升星条展示）
            mkStat('🛡️ 装备加成', `+${Math.round((hs.equipMulOf(def.id).atk - 1) * 100)}%`);
        } else {
            mkStat('⚔️ 攻击', '---');
            mkStat('⚡ 战力', '---');
            mkStat('🛡️ 装备加成', '---');
        }
        body.appendChild(stats);

        // 升星条（仅已拥有英雄）：星级 + 碎片进度 + 升星按钮
        if (owned) {
            const st = rs.stars(def.id);
            const cost = rs.starCost(def.id);
            const have = rs.shards(def.id);
            const bar = document.createElement('div');
            bar.className = 'starBar panel' + (st >= HERO_STAR_MAX ? ' max' : '');
            const line = document.createElement('div');
            line.className = 'sbLine';
            line.innerHTML = `<b class="sbStars">${'★'.repeat(st)}${'☆'.repeat(HERO_STAR_MAX - st)}</b>`
                + `<span class="sbLv">${st} / ${HERO_STAR_MAX} 星</span>`;
            bar.appendChild(line);
            const prog = document.createElement('div');
            prog.className = 'sbProg';
            if (st >= HERO_STAR_MAX) {
                prog.innerHTML = '<span class="sbDone">★ 已 满 星 ★ 该英雄已无升星空间</span>';
            } else {
                prog.innerHTML = `<span class="sbNum">碎片 <b>${have}</b> / ${cost}</span>`
                    + `<span class="sbAdd">（招募重复获得可转碎片）</span>`;
            }
            bar.appendChild(prog);
            const btn = document.createElement('button');
            btn.className = 'btn gold sm sbBtn';
            if (st >= HERO_STAR_MAX) {
                btn.textContent = '已满星';
                btn.disabled = true;
            } else if (rs.canStarUp(def.id)) {
                btn.textContent = `⚡ 升 星（−${cost} 碎片）`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const next = rs.starUp(def.id);
                    if (next !== null) {
                        SoundFx.play('buy');
                        this._toast(`${def.name} 升至 ★${next}`);
                        this._refreshTop();
                        this._refreshHeroes();
                    } else {
                        SoundFx.play('ui');
                    }
                };
            } else {
                btn.textContent = `还差 ${cost - have} 片`;
                btn.disabled = true;
            }
            bar.appendChild(btn);
            body.appendChild(bar);
        }

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
        // 装备页签右上角挂「工坊」入口（合成/分解）
        if (this._heroBagTab === 'equip') {
            const forgeBtn = document.createElement('button');
            forgeBtn.className = 'btn dark sm forgeBtn';
            forgeBtn.textContent = '⚒️ 工坊';
            forgeBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openForgeModal();
            };
            tabs.appendChild(forgeBtn);
        }
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
                cell.innerHTML = `${SLOT_EMOJI[it.slot]}<em>+${it.lv}</em>`
                    + (this._affixBadge(it.affixes) ? `<span class="bcellAffix">${this._affixBadge(it.affixes)}</span>` : '');
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBagItemTip(def.id, { slot: it.slot, tier: it.tier, lv: it.lv, affixes: it.affixes });
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

    // ================= 背包工坊（合成/分解） =================

    /** 工坊弹窗：合成区（同槽同品质 3→1）+ 分解区（单件产出材料 + 一键分解白绿） */
    private _openForgeModal(): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        this._openModal('⚒️ 装备工坊', (box) => {
            box.classList.add('forgeBox');
            const rebuild = () => {
                box.querySelectorAll('.fSec,.fNote').forEach(el => el.remove());
                // ---- 合成区 ----
                const secC = document.createElement('div');
                secC.className = 'fSec';
                secC.innerHTML = `<div class="fHead"><b>🔮 合成</b><span>同部位同品质 ×3 → 高一品质（保留最高强化级）</span></div>`;
                let hasGroup = false;
                for (const slot of EQUIP_SLOTS) {
                    for (let tier = 1; tier <= 5; tier++) {
                        const groups = combineGroupCount(slot, tier as EquipTier);
                        if (groups <= 0) {
                            continue;
                        }
                        hasGroup = true;
                        const row = document.createElement('div');
                        row.className = 'fRow';
                        const cost = hs.combineCost((tier + 1) as EquipTier);
                        const info = document.createElement('div');
                        info.className = 'fInfo';
                        info.innerHTML =
                            `<b style="color:${EQUIP_TIER_COLORS[tier - 1]}">${SLOT_EMOJI[slot]} ${EQUIP_TIER_NAMES[tier - 1]}${EQUIP_SLOT_NAMES[slot]} ×3</b>` +
                            `<span>→ <i style="color:${EQUIP_TIER_COLORS[tier]}">${EQUIP_TIER_NAMES[tier]}${EQUIP_SLOT_NAMES[slot]} ×1</i> · 🪙 ${cost}/组</span>`;
                        row.appendChild(info);
                        const btn = document.createElement('button');
                        btn.className = 'btn gold sm';
                        btn.textContent = `合成 ×${groups}`;
                        btn.disabled = gm.gold < cost;
                        btn.onclick = () => {
                            if (hs.combine(null, slot, tier as EquipTier)) {
                                SoundFx.play('buy');
                                this._toast(`合成成功：${EQUIP_TIER_NAMES[tier]}${EQUIP_SLOT_NAMES[slot]}`);
                                this._refreshTop();
                                rebuild();
                            } else {
                                SoundFx.play('ui');
                            }
                        };
                        row.appendChild(btn);
                        secC.appendChild(row);
                    }
                }
                if (!hasGroup) {
                    const empty = document.createElement('p');
                    empty.className = 'mSub';
                    empty.textContent = '凑齐 3 件同部位同品质装备即可合成';
                    secC.appendChild(empty);
                }
                box.appendChild(secC);
                // ---- 分解区 ----
                const secS = document.createElement('div');
                secS.className = 'fSec';
                secS.innerHTML = `<div class="fHead"><b>♻️ 分解</b><span>装备→强化石（紫+额外返还精炼合金）</span></div>`;
                const bag = gm.bag;
                if (bag.length === 0) {
                    const empty = document.createElement('p');
                    empty.className = 'mSub';
                    empty.textContent = '背包中没有可分解的装备';
                    secS.appendChild(empty);
                }
                bag.forEach((it, index) => {
                    const row = document.createElement('div');
                    row.className = 'fRow';
                    const info = document.createElement('div');
                    info.className = 'fInfo';
                    const alloy = salvageAlloyYield(it.tier);
                    info.innerHTML =
                        `<b style="color:${EQUIP_TIER_COLORS[it.tier - 1]}">${SLOT_EMOJI[it.slot]} ${bagItemName(it)} +${it.lv}</b>` +
                        `<span>→ 🧱 ${salvageStoneYield(it.tier)}${alloy > 0 ? ` · 🔩 ${alloy}` : ''}</span>`;
                    row.appendChild(info);
                    const btn = document.createElement('button');
                    btn.className = 'btn dark sm';
                    btn.textContent = '分解';
                    btn.onclick = () => {
                        if (hs.salvage(index)) {
                            SoundFx.play('ui');
                            this._toast('分解完成，材料入包');
                            this._refreshTop();
                            rebuild();
                        }
                    };
                    row.appendChild(btn);
                    secS.appendChild(row);
                });
                // 一键分解白绿（保留蓝+）
                const lowCount = bag.filter(it => it.tier <= 2).length;
                if (lowCount > 0) {
                    const quick = document.createElement('button');
                    quick.className = 'btn dark big fQuick';
                    quick.textContent = `一键分解白绿装备（${lowCount} 件）`;
                    quick.onclick = () => {
                        // 索引降序分解防串位
                        for (let i = bag.length - 1; i >= 0; i--) {
                            if (bag[i].tier <= 2) {
                                hs.salvage(i);
                            }
                        }
                        SoundFx.play('coin');
                        this._toast(`已分解 ${lowCount} 件，强化石/合金入包`);
                        this._refreshTop();
                        rebuild();
                    };
                    secS.appendChild(quick);
                }
                box.appendChild(secS);
                const note = document.createElement('p');
                note.className = 'fNote giftNote';
                note.textContent = '强化石用于武器强化 · 精炼合金用于装备强化（材料消耗口已打通）';
                box.appendChild(note);
            };
            rebuild();
        });
    }

    /** 背包格词缀角标文案（✦ 数量；无词缀返回空串） */
    private _affixBadge(affixes: string[] | undefined): string {
        if (!affixes || affixes.length === 0) {
            return '';
        }
        return affixes.length > 1 ? `✦${affixes.length}` : '✦';
    }

    /** 词缀区块（详情弹窗/穿戴面板共用）；无词缀返回 null 不占位 */
    private _affixBlock(affixes: string[] | undefined, tier: EquipTier): HTMLDivElement | null {
        if (!affixes || affixes.length === 0) {
            return null;
        }
        const wrap = document.createElement('div');
        wrap.className = 'affixBox';
        const head = document.createElement('div');
        head.className = 'affixHead';
        head.textContent = `✦ 词缀（${affixes.length}）`;
        wrap.appendChild(head);
        for (const id of affixes) {
            const row = document.createElement('div');
            row.className = 'affixRow';
            row.innerHTML = `<span class="affixName" style="color:${affixColor(id)}">${affixName(id)}</span>`
                + `<span class="affixVal">${affixValueText(id, tier)}</span>`;
            wrap.appendChild(row);
        }
        return wrap;
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
                box.appendChild(info);
                const affixBox = this._affixBlock(it.affixes, it.tier);
                if (affixBox) {
                    box.appendChild(affixBox);
                }
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

    /** 宝石镶嵌选择面板：列出库存中的宝石（含效果与镶嵌费），点击镶嵌到空孔 */
    private _openGemPickPanel(heroId: string, slot: EquipSlot): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        this._openModal('💎 选择宝石镶嵌', (box, close) => {
            const state = hs.equipped(heroId, slot);
            const def = state ? hs.equipDef(state.id) : null;
            const tier = def?.tier ?? (state && state.id.startsWith('bag:') ? Number(state.id.split(':')[2]) as EquipTier : 1);
            const cost = gemSocketCost(tier);
            const tip = document.createElement('p');
            tip.className = 'mSub';
            tip.textContent = `镶嵌费用：🪙 ${cost}（拆卸免费返还）`;
            box.appendChild(tip);
            const ownedGems = GEM_EFFECTS.filter(g => HeroSystem.instance.miscCount(g.miscId) > 0);
            if (ownedGems.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'mSub';
                empty.textContent = '背包中没有宝石 · 通关掉落/商店获取';
                box.appendChild(empty);
            }
            for (const g of ownedGems) {
                const gd = miscDef(g.miscId)!;
                const effTxt = (g.key === 'atkPct' ? '攻击' : g.key === 'ratePct' ? '射速' : g.key === 'rangePct' ? '射程' : '暴击')
                    + `+${Math.round(g.value * 100)}%`;
                const row = document.createElement('div');
                row.className = 'equipRow';
                row.innerHTML =
                    `<div class="equipInfo"><div class="equipName" style="color:${EQUIP_TIER_COLORS[gd.tier - 1]}">${gd.ic} ${gd.name} ×${HeroSystem.instance.miscCount(g.miscId)}</div>` +
                    `<div class="equipStat">${effTxt}</div></div>`;
                const btn = document.createElement('button');
                btn.className = 'btn gold sm';
                btn.textContent = '镶 嵌';
                btn.disabled = gm.gold < cost;
                btn.onclick = () => {
                    if (hs.socketGem(heroId, slot, g.miscId)) {
                        SoundFx.play('buy');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                        this._openEquipSlotPanel(heroId, slot);
                    }
                };
                row.appendChild(btn);
                box.appendChild(row);
            }
            const back = document.createElement('button');
            back.className = 'btn dark big';
            back.style.marginTop = 'calc(12px * var(--hs,1))';
            back.textContent = '返 回';
            back.onclick = (e) => {
                e.stopPropagation();
                close();
                this._openEquipSlotPanel(heroId, slot);
            };
            box.appendChild(back);
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
                const stone = hs.weaponUpgradeStone(heroId);
                const stoneLeft = hs.miscCount('mat_stone');
                row.innerHTML = `<span>强化至 +${lv + 1}（攻击加成 +${Math.round((Math.pow(1 + 0.05, lv + 1) - 1) * 100)}%）</span>` +
                    `<span class="matNeed">🪙 ${cost} · 🧱 强化石 ×${stone}（余 ${stoneLeft}）</span>`;
                const b = document.createElement('button');
                b.className = 'btn gold sm';
                b.textContent = '强 化';
                b.disabled = GameManager.instance.gold < cost || stoneLeft < stone;
                b.onclick = () => {
                    if (hs.upgradeWeapon(heroId)) {
                        SoundFx.play('buy');
                        this._toast(`武器强化至 +${lv + 1}`);
                        close();
                        this._refreshHeroes();
                    } else {
                        this._toast('材料不足：分解装备或通关掉落获取强化石');
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
                    const alloy = hs.equipUpgradeAlloy(cur);
                    const alloyLeft = hs.miscCount('mat_alloy');
                    info.innerHTML =
                        `<div class="equipName" style="color:${EQUIP_TIER_COLORS[tier - 1]}">当前：${name}</div>` +
                        `<div class="equipStat">强化 +${cur.lv} · ${parts.join(' ') || '无属性'}</div>` +
                        `<div class="equipStat matNeed">强化需 🪙 ${cost} · 🔩 精炼合金 ×${alloy}（余 ${alloyLeft}）</div>`;
                    btn.textContent = '强 化';
                    btn.disabled = gm.gold < cost || alloyLeft < alloy;
                    btn.onclick = () => {
                        if (hs.upgradeEquip(heroId, slot)) {
                            SoundFx.play('buy');
                            document.querySelector('#homeUi .protoMask')?.remove();
                            this._refreshHeroes();
                        } else {
                            this._toast('材料不足：分解紫装以上或礼包获取精炼合金');
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
                // 已穿件的词缀明细（数值已计入上面的「含词缀」总属性）
                const curAffix = this._affixBlock(cur.affixes, tier);
                if (curAffix) {
                    list.appendChild(curAffix);
                }

                // ---- 宝石孔区：已镶宝石可拆卸，空孔选择库存宝石镶嵌 ----
                const holes = hs.gemSlotCount(heroId, slot);
                if (holes > 0) {
                    const gemBox = document.createElement('div');
                    gemBox.className = 'gemBox';
                    const gems = hs.equippedGems(heroId, slot);
                    for (let hi = 0; hi < holes; hi++) {
                        const hole = document.createElement('div');
                        hole.className = 'gemHole';
                        const gid = gems[hi];
                        if (gid) {
                            const gd = miscDef(gid)!;
                            const eff = GEM_EFFECTS.find(g => g.miscId === gid);
                            const effTxt = eff ? (eff.key === 'atkPct' ? '攻击' : eff.key === 'ratePct' ? '射速' : eff.key === 'rangePct' ? '射程' : '暴击')
                                + `+${Math.round(eff.value * 100)}%` : '';
                            hole.innerHTML = `<span class="ghIc">${gd.ic}</span><span class="ghNm" style="color:${EQUIP_TIER_COLORS[gd.tier - 1]}">${gd.name}</span><span class="ghEff">${effTxt}</span>`;
                            hole.title = '点击拆卸（宝石返还背包）';
                            hole.onclick = () => {
                                if (hs.unsocketGem(heroId, slot, hi)) {
                                    SoundFx.play('ui');
                                    document.querySelector('#homeUi .protoMask')?.remove();
                                    this._refreshHeroes();
                                    this._openEquipSlotPanel(heroId, slot);
                                }
                            };
                        } else {
                            hole.innerHTML = `<span class="ghIc dim">◇</span><span class="ghNm dim">空孔位</span><span class="ghEff">点击镶嵌</span>`;
                            hole.onclick = () => {
                                document.querySelector('#homeUi .protoMask')?.remove();
                                this._openGemPickPanel(heroId, slot);
                            };
                        }
                        gemBox.appendChild(hole);
                    }
                    list.appendChild(gemBox);
                }
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
                    `<div class="equipName" style="color:${EQUIP_TIER_COLORS[item.tier - 1]}">${bagItemName(item)}`
                    + `${this._affixBadge(item.affixes) ? ` <span class="affixMark">${this._affixBadge(item.affixes)}</span>` : ''}</div>` +
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
                const bagAffix = this._affixBlock(item.affixes, item.tier);
                if (bagAffix) {
                    list.appendChild(bagAffix);
                }
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

        // 难度选择器：普通/精英/噩梦三档（高难度需依次通关解锁）
        const diffRow = document.createElement('div');
        diffRow.className = 'diffRow';
        page.appendChild(diffRow);
        this._diffRowEl = diffRow;

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
        // 无尽模式入口：全通关解锁，波次无限+每 5 波里程碑奖励
        const endlessAllClear = GameManager.instance.stageCleared >= FINAL_STAGE_ID;
        const goEndless = document.createElement('button');
        goEndless.className = 'btn dark go endless';
        goEndless.textContent = endlessAllClear ? '♾️ 无尽模式' : '🔒 无尽模式';
        goEndless.onclick = (e) => {
            e.stopPropagation();
            SoundFx.unlock();
            this._startBattle(true);
        };
        btns.appendChild(squad);
        btns.appendChild(go);
        btns.appendChild(goEndless);
        page.appendChild(btns);
        this._squadBtn = squad;

        root.appendChild(page);
    }

    private _squadBtn: HTMLButtonElement | null = null;
    /** 关卡难度选择（0 普通/1 精英/2 噩梦；跨关卡切换时重置为可解锁的最高档） */
    private _stageDiffSel: StageDifficulty = 0;
    /** 难度选择器容器（_refreshStagePage 重建三档按钮） */
    private _diffRowEl: HTMLDivElement | null = null;
    /** 战斗页掉落预览容器（_refreshStagePage 填充金币区间与掉率） */
    private _lootPrevEl: HTMLDivElement | null = null;

    /** 关卡页刷新：章节页签/场景内容/信息/宝箱（真数据 STAGES + stageCleared） */
    private _refreshStagePage(): void {
        const gm = GameManager.instance;
        const tabs = this._stageTabsEl;
        const scene = this._sceneEl;
        const chests = this._chestsEl;
        if (!tabs || !scene || !chests) {
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
        const clearedAll = stageId <= gm.stageCleared;
        // 难度选择：切关卡时重置为本关已解锁的最高档
        let maxDiff: StageDifficulty = 0;
        for (const d of STAGE_DIFFS) {
            if (gm.isDiffUnlocked(stageId, d.id)) {
                maxDiff = d.id;
            }
        }
        if (this._stageDiffSel > maxDiff) {
            this._stageDiffSel = maxDiff;
        }
        if (!gm.isDiffUnlocked(stageId, this._stageDiffSel)) {
            this._stageDiffSel = 0;
        }
        const diffDef = stageDiffDef(this._stageDiffSel);
        if (this._diffRowEl) {
            this._diffRowEl.innerHTML = '';
            const head = document.createElement('div');
            head.className = 'diffHead';
            head.textContent = '⚔️ 难度';
            this._diffRowEl.appendChild(head);
            for (const d of STAGE_DIFFS) {
                const unlocked = gm.isDiffUnlocked(stageId, d.id);
                const cleared = gm.isStageDiffCleared(stageId, d.id);
                const b = document.createElement('button');
                b.className = 'btn sm diffBtn' + (d.id === this._stageDiffSel ? ' gold on' : unlocked ? ' blue' : ' dark lock');
                b.innerHTML = `<b>${d.ic} ${d.name}</b>` +
                    `<span>${unlocked ? (cleared ? '✅ 已通关' : `怪强 ×${d.hpMul} · 奖励 ×${d.rewardMul}`) : '🔒 ' + d.unlockNote}</span>`;
                if (!unlocked) {
                    b.disabled = true;
                } else {
                    b.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        this._stageDiffSel = d.id;
                        this._refreshStagePage();
                    };
                }
                this._diffRowEl.appendChild(b);
            }
        }
        if (this._siLvlEl) {
            this._siLvlEl.textContent = `${stageId}-${this._stageDiffSel + 1}`;
        }
        if (this._siPowEl) {
            this._siPowEl.textContent = Math.round((7600 + stageId * 1400) * (0.7 + diffDef.hpMul * 0.3)).toLocaleString();
        }
        if (this._siStEl) {
            if (clearedAll) {
                this._siStEl.textContent = `✅ 已通关·${diffDef.name}`;
                this._siStEl.className = 'ok';
            } else if (stageId === gm.stageCleared + 1) {
                this._siStEl.textContent = `▶ ${diffDef.name}·待挑战`;
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
            const goldMul = gm.metaGoldMul() * gm.depotGoldMul() * diffDef.rewardMul;
            const mid = (kills * 2 + WAVES_PER_STAGE * 15) * goldMul;
            const lo = Math.round(mid * 0.85);
            const hi = Math.round(mid * 1.15);
            const rates = lootRateText(stageId, diffDef.rewardMul);
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
    // ================= 基地建筑详情浮窗 =================

    /** 建筑详情浮窗：功能介绍 + 当前/下一级效果 + 升级信息（基地页「详情」按钮触发） */
    private _openBuildingInfoModal(id: string): void {
        const gm = GameManager.instance;
        const b = BUILDINGS.find(x => x.id === id);
        if (!b) {
            return;
        }
        this._openModal(`${b.ic} ${b.name}`, (box) => {
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
            const ok = document.createElement('button');
            ok.className = 'btn gold big biOk';
            ok.textContent = '知道了';
            ok.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                box.closest('.protoMask')?.remove();
            };
            box.appendChild(ok);
        });
    }

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
            card.title = '点击查看技能详情';
            card.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openAbilityModal(def.id, c.slot);
            };
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
            if (locked) {
                // 技能/大招不卖解锁：只能局内升级三选一随机刷出解锁卡
                btn.textContent = '局内解锁';
                btn.disabled = true;
            } else if (maxed) {
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

    /** 技能升级效果文案：当前等级伤害倍率描述 */
    private _abilityEffectText(def: HeroDef, slot: AbilitySlot, lv: number): string {
        if (slot === 'basic') {
            return `基础射击伤害 ×${(1 + ABILITY_LEVEL_DMG_BONUS * Math.max(0, lv - 1)).toFixed(2)}`;
        }
        const ab = slot === 'ultimate' ? def.ultimate : def.skill;
        const mul = ab.damageScale * (1 + ABILITY_LEVEL_DMG_BONUS * Math.max(0, lv - 1));
        return `${ab.desc} · 伤害倍率 ×${mul.toFixed(2)}`;
    }

    /** 里程碑等级效果文案（技能浮窗展示；文案与数值设计约定，非运行时强绑定） */
    private _abilityMilestones(slot: AbilitySlot): Array<{ lv: number; text: string }> {
        if (slot === 'basic') {
            return [{ lv: 2, text: '射击节奏微调，体感更顺滑' }, { lv: 3, text: '暴击伤害显著提升' }];
        }
        if (slot === 'ultimate') {
            return [{ lv: 2, text: '效果范围/目标数 +30%' }, { lv: 3, text: '伤害倍率大幅提升，冷却小幅缩短' }];
        }
        return [{ lv: 2, text: '技能持续时间 +25%' }, { lv: 3, text: '伤害倍率大幅提升，冷却小幅缩短' }];
    }

    /**
     * 技能详情浮窗（技能卡点击触发）：
     * 升级效果对比 + 里程碑等级解锁 + 消耗物（金币+英雄核心）+ 升级按钮。
     */
    private _openAbilityModal(heroId: string, slot: AbilitySlot): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def || !gm.isHeroOwned(heroId)) {
            return;
        }
        const titles: Record<AbilitySlot, string> = { basic: '🔫 基础射击', skill: '💫 技能', ultimate: '☄️ 大招' };
        this._openModal(titles[slot], (box) => {
            box.classList.add('abBox');
            const lv = hs.abilityLevel(heroId, slot);
            const maxed = hs.isAbilityMaxLevel(heroId, slot);
            const locked = lv <= 0;
            const cap = gm.abilityLevelCap();

            const nm = document.createElement('div');
            nm.className = 'abName';
            const an = slot === 'ultimate' ? def.ultimate.name : slot === 'skill' ? def.skill.name : '基础射击';
            nm.innerHTML = `<b>${an}</b><span class="lvtag">Lv.${lv}${maxed ? ' · MAX' : ''}</span>`;
            box.appendChild(nm);

            // 升级效果对比（当前 → 下一级）
            const effCur = document.createElement('div');
            effCur.className = 'abEff';
            effCur.innerHTML = `<em>当前（Lv.${Math.max(1, lv)}）</em><span>${this._abilityEffectText(def, slot, Math.max(1, lv))}</span>`;
            box.appendChild(effCur);
            if (!maxed) {
                const effNext = document.createElement('div');
                effNext.className = 'abEff next';
                effNext.innerHTML = `<em>升到 Lv.${lv + 1}</em><span>${this._abilityEffectText(def, slot, lv + 1)}</span>`;
                box.appendChild(effNext);
            }

            // 里程碑等级效果
            const msSec = document.createElement('div');
            msSec.className = 'abMs';
            msSec.innerHTML = '<div class="abMsHead">🏆 里程碑解锁</div>';
            for (const m of this._abilityMilestones(slot)) {
                const reach = lv >= m.lv;
                const row = document.createElement('div');
                row.className = 'abMsRow' + (reach ? ' reach' : '');
                row.innerHTML = `<span class="abMsLv">Lv.${m.lv}</span><span>${m.text}${reach ? ' · ✅' : ''}</span>`;
                msSec.appendChild(row);
            }
            box.appendChild(msSec);

            // 消耗 + 升级按钮
            const costRow = document.createElement('div');
            costRow.className = 'abCost';
            const btn = document.createElement('button');
            btn.className = 'btn gold';
            if (locked) {
                // 技能/大招不卖解锁：只能局内升级三选一随机刷出解锁卡
                costRow.innerHTML = '<span>未解锁 · 出战时升级三选一随机刷出「解锁卡」后获得</span>';
                btn.textContent = '局内解锁';
                btn.disabled = true;
            } else if (maxed) {
                costRow.innerHTML = '<span>技能已达当前上限（研究所可提升上限）</span>';
                btn.textContent = '已满级';
                btn.disabled = true;
            } else {
                const cost = hs.abilityUpgradeCost(heroId, slot);
                const core = hs.abilityUpgradeCore(heroId, slot);
                const coreLeft = hs.miscCount('mat_core');
                costRow.innerHTML = `<span>消耗：🪙 ${cost.toLocaleString()} · ⚙️ 英雄核心 ×${core}（余 ${coreLeft}）</span>`;
                btn.textContent = '升 级';
                btn.disabled = gm.gold < cost || coreLeft < core;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (hs.upgradeAbility(heroId, slot)) {
                        SoundFx.play('buy');
                        this._toast(`${an} 升至 Lv.${lv + 1}`);
                        this._refreshTop();
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshSkillPage();
                        this._openAbilityModal(heroId, slot);
                    }
                };
            }
            costRow.appendChild(btn);
            box.appendChild(costRow);
        });
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
            `<div class="prosBar"><i></i></div></div>` +
            `<button class="btn gold sm questEntry">📋 任务<span class="questRed"></span></button>` +
            `<button class="btn gold sm signinEntry">📅 签到<span class="questRed"></span></button>` +
            `<button class="btn gold sm lbEntry">🏆 排行</button>` +
            `<button class="btn gold sm besEntry">📖 图鉴</button>` +
            `<button class="btn gold sm talentEntry">🌟 天赋<span class="questRed"></span></button>`;
        const questBtn = banner.querySelector('.questEntry') as HTMLButtonElement;
        questBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openQuestModal();
        };
        this._refreshQuestRed(questBtn.querySelector('.questRed') as HTMLElement);
        this._questRedEl = questBtn.querySelector('.questRed') as HTMLElement;
        const signinBtn = banner.querySelector('.signinEntry') as HTMLButtonElement;
        signinBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openSigninModal();
        };
        this._refreshSigninRed(signinBtn.querySelector('.questRed') as HTMLElement);
        this._signinRedEl = signinBtn.querySelector('.questRed') as HTMLElement;
        const lbBtn = banner.querySelector('.lbEntry') as HTMLButtonElement;
        lbBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openLeaderboardModal();
        };
        const besBtn = banner.querySelector('.besEntry') as HTMLButtonElement;
        besBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openBestiaryModal();
        };
        const talentBtn = banner.querySelector('.talentEntry') as HTMLButtonElement;
        talentBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openTalentModal();
        };
        this._talentRedEl = talentBtn.querySelector('.questRed') as HTMLElement;
        this._refreshTalentRed();
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
            // 详情浮窗按钮（右上角 ⓘ）
            const infoBtn = document.createElement('button');
            infoBtn.className = 'bInfoBtn';
            infoBtn.textContent = 'ⓘ';
            infoBtn.title = '建筑功能详情';
            infoBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openBuildingInfoModal(b.id);
            };
            card.appendChild(infoBtn);
            const ds = document.createElement('div');
            ds.className = 'bDesc';
            if (b.id === 'trial') {
                // 试炼之塔：建筑描述改为塔进度（不走等级文案）
                const ts = TrialSystem.instance;
                ds.textContent = ts.maxFloor > 0
                    ? `已通关 ${ts.clearedCount} 层 · 可挑战第 ${ts.nextFloor} 层`
                    : '尚未登塔 · 从第 1 层开始';
            } else {
                ds.textContent = maxed ? `${b.desc(lv)}（已满级）` : b.desc(lv + 1);
            }
            card.appendChild(ds);
            const btn = document.createElement('button');
            btn.className = 'btn gold sm';
            btn.style.width = '100%';
            if (b.id === 'trial') {
                // 试炼之塔：纯入口建筑不参与升级，按钮即入口（显示下一可挑战层）
                const ts = TrialSystem.instance;
                btn.className = 'btn blue sm';
                btn.textContent = ts.maxFloor > 0 ? `⚔️ 进入试炼 · 第 ${ts.nextFloor} 层` : '⚔️ 进入试炼';
                btn.disabled = !unlocked;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openTrialModal();
                };
                btn.style.opacity = btn.disabled ? '0.5' : '1';
                card.appendChild(btn);
                grid.appendChild(card);
                continue;
            }
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

/* ===== 礼包中心（banner 弹窗） ===== */
#homeUi .giftBox .mHead h3 { color: #ffe9a8; }
#homeUi .giftList { display: flex; flex-direction: column; gap: calc(16px * var(--hs,1)); }
#homeUi .giftCard { display: flex; align-items: center; gap: calc(16px * var(--hs,1)); padding: calc(16px * var(--hs,1)); position: relative; }
#homeUi .giftCard.done { filter: grayscale(.7) brightness(.75); }
#homeUi .gTagTop { position: absolute; top: calc(-10px * var(--hs,1)); left: calc(-6px * var(--hs,1));
  font-size: calc(18px * var(--hs,1)); font-weight: 800; padding: calc(3px * var(--hs,1)) calc(14px * var(--hs,1));
  border-radius: 99px 99px 99px 4px; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.4); z-index: 2; }
#homeUi .gTagTop.free { background: linear-gradient(180deg, #58c96b, #2f9c4a); }
#homeUi .gTagTop.sale { background: linear-gradient(180deg, #ff8a5c, #e03a2a); }
#homeUi .giftIc { flex: none; width: calc(96px * var(--hs,1)); height: calc(96px * var(--hs,1)); border-radius: calc(16px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(52px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #101c34); border: 1px solid #3a567f; }
#homeUi .giftCard.r4 .giftIc { border-color: #9a5ce0; }
#homeUi .giftCard.r5 .giftIc { border-color: #ff9d45; box-shadow: 0 0 10px rgba(255,157,69,.4); }
#homeUi .giftInfo { flex: 1; min-width: 0; }
#homeUi .giftInfo b { font-size: calc(26px * var(--hs,1)); }
#homeUi .giftInfo p { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .giftEntries { font-size: calc(18px * var(--hs,1)); color: #ffd9b0; margin-top: calc(8px * var(--hs,1)); line-height: 1.5; }
#homeUi .giftSide { flex: none; display: flex; flex-direction: column; align-items: stretch; gap: calc(8px * var(--hs,1)); width: calc(200px * var(--hs,1)); }
#homeUi .giftPrice { text-align: center; font-weight: 900; font-size: calc(26px * var(--hs,1)); color: #7ee0ff; }
#homeUi .giftPrice em { font-style: normal; color: #7bdc7b; }
#homeUi .giftPrice s { color: #c98a6a; font-size: calc(18px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); }
#homeUi .giftSide .btn { width: 100%; height: calc(52px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
#homeUi .giftQuota { text-align: center; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .giftNote { text-align: center; font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-top: calc(16px * var(--hs,1)); }
#homeUi .giftResHead { text-align: center; font-size: calc(24px * var(--hs,1)); color: #b9d9c2; margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .giftResGrid { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(16px * var(--hs,1)); }
#homeUi .giftResGrid .clDrop { width: calc(140px * var(--hs,1)); height: calc(140px * var(--hs,1)); border: 1px solid #3a567f;
  border-radius: calc(16px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #1a2a4a, #0d1626);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(8px * var(--hs,1));
  opacity: 0; animation: giftDropIn .45s cubic-bezier(.34,1.56,.64,1) both; }
#homeUi .giftResGrid .clDropIc { font-size: calc(48px * var(--hs,1)); }
#homeUi .giftResGrid .clDropNm { font-size: calc(18px * var(--hs,1)); }
#homeUi .giftResGrid .clDrop.r3 { border-color: #5ab0f0; }
#homeUi .giftResGrid .clDrop.r4 { border-color: #c07ef5; }
#homeUi .giftResGrid .clDrop.r5 { border-color: #ff9d45; box-shadow: 0 0 10px rgba(255,157,69,.35); }
#homeUi .giftResGrid .clDrop.r6 { border-color: #ff5252; box-shadow: 0 0 12px rgba(255,82,82,.5); }
#homeUi .giftResRow { text-align: center; font-size: calc(22px * var(--hs,1)); color: #ffe9a8; margin-top: calc(16px * var(--hs,1)); }
#homeUi .giftOkBtn { width: 100%; margin-top: calc(20px * var(--hs,1)); height: calc(64px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }
#homeUi .shopBanner .sbTime.dotOn::after { content: ''; display: inline-block; width: calc(12px * var(--hs,1)); height: calc(12px * var(--hs,1));
  margin-left: calc(8px * var(--hs,1)); border-radius: 50%; background: #ff5252; box-shadow: 0 0 8px rgba(255,82,82,.8); vertical-align: middle; }
@keyframes giftDropIn { from { transform: scale(.4) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }

/* ===== 任务与成就（基地页入口 + 弹窗） ===== */
#homeUi .questEntry { position: relative; margin-left: auto; flex: none; }
#homeUi .questEntry .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: #ff5252;
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .questEntry .questRed.on { display: block; }
#homeUi .qSecHead { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); margin: calc(16px * var(--hs,1)) 0 calc(10px * var(--hs,1)); }
#homeUi .qSecHead:first-child { margin-top: 0; }
#homeUi .qSecHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .qSecHead span { font-size: calc(18px * var(--hs,1)); color: #6a83a8; }
#homeUi .questRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .questRow.ready { border-color: #8a6a20; box-shadow: 0 0 10px rgba(240,177,62,.25); }
#homeUi .questRow.done { opacity: .55; filter: grayscale(.5); }
#homeUi .qIc { flex: none; width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(38px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #101c34); border: 1px solid #3a567f; }
#homeUi .qMid { flex: 1; min-width: 0; }
#homeUi .qMid b { font-size: calc(24px * var(--hs,1)); }
#homeUi .qBar { height: calc(12px * var(--hs,1)); border-radius: 99px; background: #0d1930; border: 1px solid #33507a;
  margin: calc(8px * var(--hs,1)) 0 calc(6px * var(--hs,1)); overflow: hidden; }
#homeUi .qBar i { display: block; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #5cc8ff, #7bdc7b); transition: width .4s ease; }
#homeUi .questRow.ready .qBar i { background: linear-gradient(90deg, #ffe9a8, #f0b13e); }
#homeUi .qNum { font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .qRight { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: calc(8px * var(--hs,1)); }
#homeUi .qReward { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .qRight .btn { min-width: calc(140px * var(--hs,1)); height: calc(48px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }

/* ===== 每日签到（基地页入口 + 弹窗） ===== */
#homeUi .signinEntry { position: relative; margin-left: 0; flex: none; }
#homeUi .signinEntry .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: #ff5252;
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .signinEntry .questRed.on { display: block; }
#homeUi .siHead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .siHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .siHead b i { color: #f0b13e; font-style: normal; }
#homeUi .siHead span { font-size: calc(18px * var(--hs,1)); color: #6a83a8; }
#homeUi .siGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .siCell { padding: calc(14px * var(--hs,1)) calc(8px * var(--hs,1)); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .siCell.today { border-color: #f0b13e; box-shadow: 0 0 12px rgba(240,177,62,.35); background: linear-gradient(180deg, rgba(240,177,62,.14), transparent); }
#homeUi .siCell.done { opacity: .5; filter: grayscale(.5); }
#homeUi .siIc { font-size: calc(40px * var(--hs,1)); line-height: 1.1; }
#homeUi .siNm { font-size: calc(20px * var(--hs,1)); font-weight: 700; }
#homeUi .siDy { font-size: calc(16px * var(--hs,1)); color: #f0b13e; }
#homeUi .siRw { font-size: calc(16px * var(--hs,1)); color: #7ee0ff; }
#homeUi .siFoot { display: flex; align-items: center; justify-content: space-between; gap: calc(14px * var(--hs,1));
  margin-top: calc(16px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1)); }
#homeUi .siFoot.ready { border-color: #8a6a20; box-shadow: 0 0 10px rgba(240,177,62,.25); }
#homeUi .siFoot.done { opacity: .6; }
#homeUi .siInfo { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .siInfo b { font-size: calc(24px * var(--hs,1)); }
#homeUi .siInfo span { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .siFoot .btn { min-width: calc(180px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); }

/* ===== 怪物图鉴（基地页入口 + 弹窗） ===== */
#homeUi .besEntry { position: relative; margin-left: 0; flex: none; }
#homeUi .besGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(14px * var(--hs,1)); }
#homeUi .besCell { padding: calc(16px * var(--hs,1)) calc(10px * var(--hs,1)); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: calc(8px * var(--hs,1)); cursor: pointer; }
#homeUi .besCell.lock { opacity: .55; filter: grayscale(.8); }
#homeUi .besPic { width: calc(110px * var(--hs,1)); height: calc(110px * var(--hs,1)); }
#homeUi .besCell.lock .besPic { filter: brightness(0) opacity(.75); }
#homeUi .besNm { font-size: calc(22px * var(--hs,1)); font-weight: 700; }
#homeUi .besSub { font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
#homeUi .besElite { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); margin-top: calc(16px * var(--hs,1));
  font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .besElite b { color: #f0b13e; }
#homeUi .besDetail { display: flex; gap: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1)); }
#homeUi .besDetail.lock { opacity: .75; }
#homeUi .besDetailPic { flex: none; width: calc(180px * var(--hs,1)); height: calc(220px * var(--hs,1)); }
#homeUi .besDetail.lock .besDetailPic { background: radial-gradient(circle at 50% 60%, #2a4470, #101c34); border-radius: calc(16px * var(--hs,1)); border: 1px solid #3a567f; }
#homeUi .besDetailInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); text-align: left; }
#homeUi .besDetailName { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .besDetailName b { font-size: calc(30px * var(--hs,1)); color: #ffe9a8; }
#homeUi .besStars { font-size: calc(22px * var(--hs,1)); color: #f0b13e; }
#homeUi .besBeh { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .besDesc { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; line-height: 1.7; }
#homeUi .besStats { margin-top: calc(6px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .besStatRow { display: flex; justify-content: space-between; font-size: calc(20px * var(--hs,1)); }
#homeUi .besStatRow span { color: #8ba3c7; }
#homeUi .besStatRow b { color: #ffe9a8; }

/* ===== 试炼之塔（基地建筑入口 + 弹窗） ===== */
#homeUi .trialList { max-height: calc(760px * var(--hs,1)); overflow-y: auto; display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); }
#homeUi .trialSect { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .trialSect.lock { opacity: .5; }
#homeUi .trialSectName { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .trialSect.lock .trialSectName { color: #587099; }
#homeUi .trialGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .trialCell { position: relative; padding: calc(12px * var(--hs,1)) 0; text-align: center; cursor: default;
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); }
#homeUi .trialCell b { font-size: calc(26px * var(--hs,1)); color: #dce8f7; }
#homeUi .trialCell span { font-size: calc(18px * var(--hs,1)); }
#homeUi .trialCell i { position: absolute; top: calc(2px * var(--hs,1)); right: calc(4px * var(--hs,1)); font-style: normal; font-size: calc(16px * var(--hs,1)); }
#homeUi .trialCell.done { border-color: #3f7a4a; }
#homeUi .trialCell.done b { color: #7fe08a; }
#homeUi .trialCell.now { border-color: #8a6a20; cursor: pointer; animation: huiChest 1.8s ease-in-out infinite; }
#homeUi .trialCell.now b { color: #ffe9a8; }
#homeUi .trialCell.sel { border-color: #f0b13e; box-shadow: 0 0 14px rgba(240,177,62,.6); }
#homeUi .trialCell.lock { opacity: .45; }
#homeUi .trialCell.mile { border-top: calc(3px * var(--hs,1)) solid #c9a227; }
#homeUi .trialDetail { margin-top: calc(16px * var(--hs,1)); padding: calc(18px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); text-align: left; }
#homeUi .trialName { font-size: calc(28px * var(--hs,1)); font-weight: 700; color: #ffe9a8; display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .trialName span { font-size: calc(18px * var(--hs,1)); color: #7ee0ff; font-weight: 400; }
#homeUi .trialStat { display: flex; gap: calc(24px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: #8ba3c7; flex-wrap: wrap; }
#homeUi .trialStat b { color: #dce8f7; }
#homeUi .trialMobs { display: flex; gap: calc(16px * var(--hs,1)); flex-wrap: wrap; align-items: flex-end; }
#homeUi .trialMob { display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .trialMobPic { width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); }
#homeUi .trialReward { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .trialRewardHead { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .trialRewardRow { display: flex; gap: calc(10px * var(--hs,1)); align-items: center; font-size: calc(22px * var(--hs,1)); }
#homeUi .trialRewardRow b { color: #ffe9a8; }
#homeUi .trialRewardNote { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; }
#homeUi .trialGo { width: 100%; margin-top: calc(16px * var(--hs,1)); }

/* ===== 英雄招募 + 升星（英雄页入口） ===== */
#homeUi .hpick.recruitEntry .rcIc { font-size: calc(46px * var(--hs,1)); line-height: calc(72px * var(--hs,1)); background: none !important; }
#homeUi .starBar { margin: calc(16px * var(--hs,1)) 0; padding: calc(18px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .starBar.max { border-color: #8a6a20; }
#homeUi .sbLine { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .sbStars { font-size: calc(32px * var(--hs,1)); color: #f0b13e; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .starBar.max .sbStars { color: #ffd76a; text-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.8); }
#homeUi .sbLv { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .sbProg { display: flex; align-items: baseline; gap: calc(10px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .sbProg b { color: #ffe9a8; font-size: calc(24px * var(--hs,1)); }
#homeUi .sbAdd { font-size: calc(17px * var(--hs,1)); color: #587099; }
#homeUi .sbDone { color: #f0b13e; }
#homeUi .sbBtn { width: 100%; }

#homeUi .rcHead { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .rcHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .rcHeadTop i { color: #f0b13e; font-style: normal; font-size: calc(28px * var(--hs,1)); font-weight: 700; }
#homeUi .rcHeadTop span { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcBar { height: calc(14px * var(--hs,1)); background: #1a2c4a; border-radius: calc(8px * var(--hs,1)); overflow: hidden; border: 1px solid #2f4a72; }
#homeUi .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, #f0b13e, #ffe9a8); transition: width .3s; }
#homeUi .rcRate { padding: calc(16px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .rcRateRow { display: flex; justify-content: space-between; font-size: calc(21px * var(--hs,1)); color: #dce8f7; }
#homeUi .rcRateRow b { color: #8ba3c7; }
#homeUi .rcRateRow.hero span { color: #ffd76a; }
#homeUi .rcRateRow.hero b { color: #ffd76a; }
#homeUi .rcRateRow.r5 span { color: #ff9d45; }
#homeUi .rcRateRow.r3 span { color: #5ab0f0; }
#homeUi .rcRateRow.r2 span { color: #7bd67b; }
#homeUi .rcRateNote { margin-top: calc(4px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcShards { margin-top: calc(16px * var(--hs,1)); }
#homeUi .rcShardsHead { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .rcShardGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .rcShard { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(10px * var(--hs,1)); }
#homeUi .rcShard.lock { opacity: .55; filter: grayscale(.7); }
#homeUi .rcShardPic { flex: none; width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); background-color: #2a4470; }
#homeUi .rcShardInfo { display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); min-width: 0; }
#homeUi .rcShardInfo b { font-size: calc(20px * var(--hs,1)); color: #dce8f7; }
#homeUi .rcShardInfo i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcBtns { display: flex; gap: calc(14px * var(--hs,1)); margin-top: calc(18px * var(--hs,1)); }
#homeUi .rcBtn { flex: 1; }
#homeUi .rcAdBtn { width: 100%; margin-top: calc(12px * var(--hs,1)); }
#homeUi .recruitResGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(12px * var(--hs,1)); }
#homeUi .recruitResGrid:not(.many) { grid-template-columns: 1fr; max-width: calc(300px * var(--hs,1)); margin: 0 auto; }
#homeUi .rcCard { position: relative; padding: calc(12px * var(--hs,1)) calc(6px * var(--hs,1)); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1));
  animation: giftDropIn .45s cubic-bezier(.2,1.5,.4,1) backwards; }
#homeUi .rcCardPic { width: calc(96px * var(--hs,1)); height: calc(96px * var(--hs,1)); }
#homeUi .rcCardIc { font-size: calc(64px * var(--hs,1)); line-height: 1; }
#homeUi .rcCardNm { font-size: calc(18px * var(--hs,1)); color: #dce8f7; line-height: 1.3; }
#homeUi .rcCard.hero { border-color: #ffd76a; box-shadow: 0 0 calc(18px * var(--hs,1)) rgba(255,215,106,.7); }
#homeUi .rcCard.r5 { border-color: #ff9d45; }
#homeUi .rcCard.r3 { border-color: #5ab0f0; }
#homeUi .rcCard.r2 { border-color: #7bd67b; }
#homeUi .rcNew { position: absolute; top: calc(-8px * var(--hs,1)); right: calc(-8px * var(--hs,1)); background: #ff5252; color: #fff;
  font-size: calc(16px * var(--hs,1)); font-weight: 700; padding: calc(2px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); }
#homeUi .rcDup { position: absolute; top: calc(4px * var(--hs,1)); left: 50%; transform: translateX(-50%); font-size: calc(14px * var(--hs,1));
  color: #f0b13e; white-space: nowrap; }
#homeUi .rcSum { margin-top: calc(18px * var(--hs,1)); text-align: center; font-size: calc(22px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcAgain { width: 100%; margin-top: calc(18px * var(--hs,1)); }
#homeUi .rcClose { width: 100%; margin-top: calc(10px * var(--hs,1)); }

/* ===== 天赋树（基地横幅入口） ===== */
#homeUi .talentHead { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .talentHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .talentHeadTop i { color: #8fe3ff; font-style: normal; font-size: calc(30px * var(--hs,1)); font-weight: 700; }
#homeUi .talentHeadTop span { font-size: calc(19px * var(--hs,1)); color: #f0b13e; }
#homeUi .talentBar { height: calc(14px * var(--hs,1)); background: #1a2c4a; border-radius: calc(8px * var(--hs,1)); overflow: hidden; border: 1px solid #2f4a72; }
#homeUi .talentBar i { display: block; height: 100%; background: linear-gradient(90deg, #4aa8d8, #8fe3ff); transition: width .3s; }
#homeUi .talentSrc { font-size: calc(17px * var(--hs,1)); color: #587099; line-height: 1.5; }

#homeUi .talentBranchRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(14px * var(--hs,1)); }
#homeUi .talentBranch { display: flex; flex-direction: column; min-width: 0; }
#homeUi .tbTitle { text-align: center; margin-bottom: calc(10px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .tbTitle b { font-size: calc(22px * var(--hs,1)); color: #dce8f7; }
#homeUi .tbTitle i { font-style: normal; font-size: calc(17px * var(--hs,1)); color: #8ba3c7; }
#homeUi .tbNodes { display: flex; flex-direction: column; align-items: center; }
#homeUi .talentNode { position: relative; width: calc(88px * var(--hs,1)); height: calc(88px * var(--hs,1)); flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(2px * var(--hs,1));
  border: 2px solid #2f4a72; border-radius: calc(12px * var(--hs,1)); background: #16233a; cursor: pointer; }
/* 节点间竖向连线：位于节点下方，撑满 5 行间距；末节点不画 */
#homeUi .talentNode:not(:last-child) { margin-bottom: calc(30px * var(--hs,1)); }
#homeUi .talentNode:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%;
  transform: translateX(-50%); width: calc(4px * var(--hs,1)); height: calc(30px * var(--hs,1)); background: #2f4a72; }
#homeUi .talentNode.maxed:not(:last-child)::after { background: #f0b13e; }
#homeUi .talentNode.lock { opacity: .5; filter: grayscale(.8); border-color: #26364f; }
#homeUi .talentNode.can { border-color: #4aa8d8; box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(74,168,216,.65); animation: huiChest .9s ease-in-out infinite; }
#homeUi .talentNode.maxed { border-color: #f0b13e; box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(240,177,62,.6); }
#homeUi .talentNode.sel { outline: calc(3px * var(--hs,1)) solid #8fe3ff; outline-offset: calc(3px * var(--hs,1)); }
#homeUi .tnIc { font-size: calc(38px * var(--hs,1)); line-height: 1; }
#homeUi .tnLv { font-size: calc(16px * var(--hs,1)); color: #8ba3c7; }
#homeUi .talentNode.maxed .tnLv { color: #ffd76a; }
#homeUi .talentNode.can .tnLv { color: #8fe3ff; }

#homeUi .talentDetail { margin-top: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1));
  display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .tdName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .tdName b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .tdName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .tdDesc { font-size: calc(21px * var(--hs,1)); color: #dce8f7; line-height: 1.5; }
#homeUi .tdHint { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; }
#homeUi .tdBtns { display: flex; gap: calc(14px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .tdBtns .btn { flex: 1; }

/* ===== 个人主页（点头像弹出） ===== */
#homeUi .pAvatar { cursor: pointer; }
#homeUi .pfCard { display: flex; align-items: center; gap: calc(20px * var(--hs,1)); padding: calc(20px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .pfPic { flex: none; width: calc(128px * var(--hs,1)); height: calc(128px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background-color: #2a4470; border: 2px solid #3a567f; }
#homeUi .pfCardInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .pfName { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); }
#homeUi .pfName b { font-size: calc(32px * var(--hs,1)); color: #ffe9a8; }
#homeUi .pfName .lvtag { font-size: calc(20px * var(--hs,1)); }
#homeUi .pfTitle { font-size: calc(24px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .pfPower { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .pfPower b { font-size: calc(30px * var(--hs,1)); color: #f0b13e; font-variant-numeric: tabular-nums; }
#homeUi .pfSec { margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .pfSecHead { margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .pfSecHead b { font-size: calc(24px * var(--hs,1)); color: #ffe9a8; }
#homeUi .pfGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .pfStat { display: flex; flex-direction: column; align-items: center; gap: calc(5px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(6px * var(--hs,1)); }
#homeUi .pfStat em { font-style: normal; font-size: calc(32px * var(--hs,1)); line-height: 1.1; }
#homeUi .pfStat b { font-size: calc(24px * var(--hs,1)); color: #ffe9a8; font-variant-numeric: tabular-nums; }
#homeUi .pfStat span { font-size: calc(17px * var(--hs,1)); color: #8ba3c7; }
#homeUi .pfAcc { padding: calc(14px * var(--hs,1)) calc(20px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .pfAccRow { display: flex; justify-content: space-between; font-size: calc(21px * var(--hs,1)); }
#homeUi .pfAccRow span { color: #8ba3c7; }
#homeUi .pfAccRow b { color: #ffe9a8; }

/* ===== 排行榜（基地页入口 + 弹窗） ===== */
#homeUi .lbEntry { margin-left: 0; }
#homeUi .lbBox .mHead h3 { color: #ffe9a8; }
#homeUi .lbMy { display: flex; align-items: baseline; justify-content: space-between; background: linear-gradient(90deg, rgba(240,177,62,.16), transparent);
  border: 1px solid #8a6a20; border-radius: calc(12px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(20px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .lbMy span { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .lbMy b { font-size: calc(32px * var(--hs,1)); color: #ffe9a8; }
#homeUi .lbList { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .lbRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(14px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1)); }
#homeUi .lbRow.me { border-color: #8a6a20; background: linear-gradient(90deg, rgba(240,177,62,.14), rgba(20,32,58,.6));
  box-shadow: 0 0 10px rgba(240,177,62,.18); }
#homeUi .lbRank { flex: none; width: calc(52px * var(--hs,1)); text-align: center; font-size: calc(22px * var(--hs,1)); color: #8ba3c7; font-weight: 800; }
#homeUi .lbRank .medal { font-style: normal; font-size: calc(30px * var(--hs,1)); }
#homeUi .lbIc { flex: none; font-size: calc(30px * var(--hs,1)); }
#homeUi .lbName { flex: 1; min-width: 0; font-size: calc(24px * var(--hs,1)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .lbRow.me .lbName { color: #ffe9a8; }
#homeUi .lbScore { flex: none; font-size: calc(24px * var(--hs,1)); color: #7ee0ff; font-weight: 800; }

/* ===== 宝石镶嵌（穿戴面板孔位区） ===== */
#homeUi .gemBox { display: flex; gap: calc(10px * var(--hs,1)); margin: calc(-4px * var(--hs,1)) 0 calc(8px * var(--hs,1)); }
#homeUi .gemHole { flex: 1; display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(6px * var(--hs,1)); border-radius: calc(12px * var(--hs,1));
  background: radial-gradient(circle at 50% 20%, #1a2a4a, #0d1626); border: 1px dashed #33507a; cursor: pointer; }
#homeUi .gemHole:active { transform: scale(.96); }
#homeUi .gemHole .ghIc { font-size: calc(34px * var(--hs,1)); }
#homeUi .gemHole .ghNm { font-size: calc(18px * var(--hs,1)); font-weight: 700; }
#homeUi .gemHole .ghEff { font-size: calc(16px * var(--hs,1)); color: #7ee0ff; }
#homeUi .gemHole .dim { color: #4a608a; filter: grayscale(.4); }
#homeUi .gemHole .ghEff.dim { color: #4a608a; }

/* ===== 装备工坊（合成/分解） ===== */
#homeUi .forgeBtn { flex: none; width: calc(150px * var(--hs,1)); }
#homeUi .fSec { margin-bottom: calc(18px * var(--hs,1)); }
#homeUi .fHead { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .fHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .fHead span { font-size: calc(18px * var(--hs,1)); color: #6a83a8; }
#homeUi .fRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(14px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1)); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .fInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .fInfo b { font-size: calc(22px * var(--hs,1)); }
#homeUi .fInfo span { font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .fRow .btn { flex: none; min-width: calc(140px * var(--hs,1)); height: calc(48px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .fQuick { width: 100%; margin-top: calc(6px * var(--hs,1)); }
#homeUi .fNote { text-align: center; }

/* ===== 无尽模式入口 ===== */
#homeUi .stageBtns .go.endless { background: linear-gradient(180deg, #3d5a86, #22345c); border-color: #5c7ea8; color: #bfe0ff; }
#homeUi .stageBtns .go.endless:active { filter: brightness(1.12); }

/* ===== 设置（顶栏齿轮 + 弹窗） ===== */
#homeUi .setGear { flex: none; width: calc(56px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(26px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; padding: 0; }
#homeUi .setSec { margin-bottom: calc(18px * var(--hs,1)); }
#homeUi .setHead { margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .setHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .setHead.danger b { color: #ff8a6a; }
#homeUi .setRow { display: flex; align-items: center; justify-content: space-between; gap: calc(12px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(14px * var(--hs,1)); background: rgba(20,32,58,.6);
  border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1)); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .setRow > span { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .setRow > b { font-size: calc(22px * var(--hs,1)); color: #cfe0f5; }
#homeUi .setRow .btn { min-width: calc(170px * var(--hs,1)); height: calc(50px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .volWrap { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); flex: 1; max-width: calc(300px * var(--hs,1)); }
#homeUi .volWrap input[type=range] { flex: 1; accent-color: #f0b13e; height: calc(24px * var(--hs,1)); }
#homeUi .volWrap b { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; width: calc(64px * var(--hs,1)); text-align: right; }
#homeUi .resetBtn { border-color: #8a3a2a !important; color: #ff9a8a !important; }

/* ===== 建筑详情浮窗（基地页 ⓘ） ===== */
#homeUi .bInfoBtn { position: absolute; top: calc(8px * var(--hs,1)); right: calc(8px * var(--hs,1)); z-index: 2;
  width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); border-radius: 50%;
  border: 1px solid #3a567f; background: rgba(13,22,38,.8); color: #8ba3c7; font-size: calc(20px * var(--hs,1));
  font-style: italic; font-weight: 800; font-family: serif; cursor: pointer; }
#homeUi .bInfoBtn:active { transform: scale(.92); }
#homeUi .binfoBox .mHead h3 { color: #ffe9a8; }
#homeUi .biIntro { font-size: calc(22px * var(--hs,1)); line-height: 1.65; color: #b9cbe2;
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .biLvRow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .biLvRow span { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .biLvRow b { font-size: calc(24px * var(--hs,1)); color: #ffe9a8; }
#homeUi .biBar { height: calc(12px * var(--hs,1)); border-radius: 99px; background: #0d1930; border: 1px solid #33507a; overflow: hidden; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .biBar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #5cc8ff, #7bdc7b); }
#homeUi .biEff { background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .biEff em { display: block; font-style: normal; font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-bottom: calc(4px * var(--hs,1)); }
#homeUi .biEff span { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; }
#homeUi .biEff.next span { color: #7bdc7b; }
#homeUi .biStatus { font-size: calc(20px * var(--hs,1)); color: #ffd9b0; margin: calc(4px * var(--hs,1)) 0 calc(14px * var(--hs,1)); }
#homeUi .biOk { width: 100%; }

/* ===== 技能详情浮窗（技能卡点击） ===== */
#homeUi .skillCard { cursor: pointer; }
#homeUi .abBox .mHead h3 { color: #ffe9a8; }
#homeUi .abName { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .abName b { font-size: calc(30px * var(--hs,1)); }
#homeUi .abName .lvtag { font-size: calc(20px * var(--hs,1)); }
#homeUi .abEff { background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .abEff em { display: block; font-style: normal; font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-bottom: calc(4px * var(--hs,1)); }
#homeUi .abEff span { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; }
#homeUi .abEff.next span { color: #7bdc7b; }
#homeUi .abMs { margin: calc(14px * var(--hs,1)) 0; }
#homeUi .abMsHead { font-size: calc(22px * var(--hs,1)); color: #ffe9a8; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .abMsRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(12px * var(--hs,1));
  border: 1px dashed #33507a; border-radius: calc(8px * var(--hs,1)); margin-bottom: calc(6px * var(--hs,1)); color: #8ba3c7; }
#homeUi .abMsRow.reach { border: 1px solid #8a6a20; background: rgba(240,177,62,.1); color: #ffe9a8; }
#homeUi .abMsLv { flex: none; font-weight: 900; font-size: calc(20px * var(--hs,1)); }
#homeUi .abMsRow span:last-child { font-size: calc(20px * var(--hs,1)); }
#homeUi .abCost { display: flex; align-items: center; justify-content: space-between; gap: calc(12px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .abCost > span { font-size: calc(20px * var(--hs,1)); color: #ffd9b0; }
#homeUi .abCost .btn { min-width: calc(170px * var(--hs,1)); height: calc(54px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); }

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

/* ===== 关卡难度选择器（普通/精英/噩梦） ===== */
#homeUi .diffRow { display: flex; align-items: stretch; gap: calc(12px * var(--hs,1)); margin: 0 0 calc(20px * var(--hs,1)); }
#homeUi .diffHead { flex: none; display: flex; align-items: center; font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .diffBtn { flex: 1; height: auto; padding: calc(10px * var(--hs,1)) calc(8px * var(--hs,1));
  display: flex; flex-direction: column; align-items: center; gap: calc(5px * var(--hs,1)); }
#homeUi .diffBtn b { font-size: calc(23px * var(--hs,1)); }
#homeUi .diffBtn span { font-size: calc(16px * var(--hs,1)); font-weight: 500; opacity: .85; }
#homeUi .diffBtn.lock { opacity: .55; }
#homeUi .diffBtn.on { box-shadow: 0 0 12px rgba(240,177,62,.45); }
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
#homeUi .bcard { padding: calc(20px * var(--hs,1)); text-align: center; position: relative; }
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
#homeUi .matNeed { color: #ffd9b0; font-size: calc(19px * var(--hs,1)); }
#homeUi .mRow .matNeed { display: block; margin-top: calc(4px * var(--hs,1)); }

/* ===== 装备词缀 ===== */
#homeUi .bcellAffix { position: absolute; left: calc(6px * var(--hs,1)); top: calc(4px * var(--hs,1));
  font-size: calc(18px * var(--hs,1)); color: #ffd76a; text-shadow: 0 0 calc(8px * var(--hs,1)) rgba(255,215,106,.9); }
#homeUi .affixMark { color: #ffd76a; font-size: calc(22px * var(--hs,1)); }
#homeUi .affixBox { margin: calc(-8px * var(--hs,1)) 0 calc(16px * var(--hs,1)) 0; padding: calc(12px * var(--hs,1)) calc(18px * var(--hs,1));
  border-radius: calc(14px * var(--hs,1)); background: #0a1526; border: 1px dashed #3d5a85;
  display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .affixHead { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; }
#homeUi .affixRow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1));
  font-size: calc(21px * var(--hs,1)); }
#homeUi .affixName { font-weight: 700; }
#homeUi .affixVal { color: #dce8f7; }

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
#homeUi .chTabs, #homeUi .scene, #homeUi .sceneInfo, #homeUi .siChip,
#homeUi .siHp, #homeUi .hpBar, #homeUi .sceneTitle, #homeUi .screenHeading, #homeUi .arrow, #homeUi .stageInfo,
#homeUi .siBox, #homeUi .chests, #homeUi .chest, #homeUi .stageBtns, #homeUi .skillCard, #homeUi .sIcon,
#homeUi .sInfo, #homeUi .sName, #homeUi .sDesc, #homeUi .sAct, #homeUi .sLv, #homeUi .skillHint,
#homeUi .baseBanner, #homeUi .bbIc, #homeUi .bcard, #homeUi .bIc, #homeUi .bName, #homeUi .bDesc,
#homeUi .protoMask, #homeUi .mbox, #homeUi .mHead, #homeUi .mClose, #homeUi .mSub, #homeUi .mRow,
#homeUi .bagTabs, #homeUi .bagGrid, #homeUi .bcell, #homeUi .bagBar, #homeUi .sqRow, #homeUi .sqSlot, #homeUi .cand,
#homeUi .candB, #homeUi .tabbar, #homeUi .tab, #homeUi .res .add, #homeUi .expbar i, #homeUi .lvtag,
#homeUi .frame::before, #homeUi .frame::after { animation: none; }

/* 天赋可加点节点的脉冲：需在青瓷层基础规则之后声明，否则被上面的 animation:none 覆盖（同 trialCell.now 的处理） */
#homeUi .talentNode.can { animation: huiChest .9s ease-in-out infinite; }

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
#homeUi .siBox b.go { color: #9a6a20; }

/* --- 关卡难度选择器（青瓷浅色变体） --- */
#homeUi .diffRow { padding: calc(8px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); background: #f8fafb; border-bottom: 1px solid #bfced8; gap: calc(6px * var(--pw,2.5)); margin: 0; }
#homeUi .diffHead { font-size: calc(11px * var(--pw,2.5)); color: #536f7f; }
#homeUi .diffBtn { border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); gap: calc(3px * var(--pw,2.5)); }
#homeUi .diffBtn b { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .diffBtn span { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .diffBtn.dark { background: #e7eff5; border-color: #bdced8; color: #536f7f; }
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
#homeUi .stageBtns .go.endless { background: linear-gradient(#dfeaf1, #c3d6e2); border-color: #9db9ca; color: #4a7ba6; box-shadow: inset 0 1px #fff; }
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

/* --- 礼包中心（青瓷浅色变体） --- */
#homeUi .giftBox .mbox { background: #edf4f8; }
#homeUi .giftBox .mHead h3 { color: #88551f; }
#homeUi .giftList { gap: calc(12px * var(--pw,2.5)); }
#homeUi .giftCard { background: #e7eff5; border-color: #bdced8; border-radius: calc(8px * var(--pw,2.5));
  gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); }
#homeUi .gTagTop { font-size: calc(11px * var(--pw,2.5)); padding: calc(2px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: 99px 99px 99px 3px; }
#homeUi .giftIc { width: calc(54px * var(--pw,2.5)); height: calc(54px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(30px * var(--pw,2.5)); background: #dce8ef; border-color: #b3c8d6; }
#homeUi .giftCard.r4 .giftIc { border-color: #9a6cd0; }
#homeUi .giftCard.r5 .giftIc { border-color: #e8892e; box-shadow: 0 0 5px rgba(232,137,46,.5); }
#homeUi .giftInfo b { font-size: calc(15px * var(--pw,2.5)); color: #31536a; }
#homeUi .giftInfo p { font-size: calc(12px * var(--pw,2.5)); color: #527085; margin-top: calc(2px * var(--pw,2.5)); }
#homeUi .giftEntries { font-size: calc(11px * var(--pw,2.5)); color: #945d24; margin-top: calc(4px * var(--pw,2.5)); }
#homeUi .giftSide { width: calc(110px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5)); }
#homeUi .giftPrice { font-size: calc(14px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .giftPrice em { color: #2f9c4a; }
#homeUi .giftPrice s { font-size: calc(11px * var(--pw,2.5)); color: #a98a72; margin-left: calc(4px * var(--pw,2.5)); }
#homeUi .giftSide .btn { height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .giftQuota { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .giftNote { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; margin-top: calc(10px * var(--pw,2.5)); }
#homeUi .giftResHead { font-size: calc(14px * var(--pw,2.5)); color: #3f7a52; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .giftResGrid { gap: calc(10px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDrop { width: calc(76px * var(--pw,2.5)); height: calc(76px * var(--pw,2.5));
  border: 1px solid #b3c8d6; border-radius: calc(8px * var(--pw,2.5)); background: #dce8ef; gap: calc(4px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDropIc { font-size: calc(26px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDropNm { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDrop.r3 { border-color: #4a9fd6; }
#homeUi .giftResGrid .clDrop.r4 { border-color: #9a6cd0; }
#homeUi .giftResGrid .clDrop.r5 { border-color: #e8892e; box-shadow: 0 0 5px rgba(232,137,46,.45); }
#homeUi .giftResGrid .clDrop.r6 { border-color: #e04848; box-shadow: 0 0 6px rgba(224,72,72,.5); }
#homeUi .giftResRow { font-size: calc(13px * var(--pw,2.5)); color: #945d24; margin-top: calc(10px * var(--pw,2.5)); }
#homeUi .giftOkBtn { height: calc(44px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); margin-top: calc(12px * var(--pw,2.5)); }
#homeUi .shopBanner .sbTime.dotOn::after { width: calc(7px * var(--pw,2.5)); height: calc(7px * var(--pw,2.5));
  margin-left: calc(5px * var(--pw,2.5)); background: #e04848; box-shadow: 0 0 5px rgba(224,72,72,.8); }

/* --- 任务与成就（青瓷浅色变体） --- */
#homeUi .questEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .questEntry .questRed { width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5));
  top: calc(-3px * var(--pw,2.5)); right: calc(-3px * var(--pw,2.5)); background: #e04848; box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .questBox .mbox { background: #edf4f8; }
#homeUi .questBox .mHead h3 { color: #88551f; }
#homeUi .qSecHead { gap: calc(7px * var(--pw,2.5)); margin: calc(10px * var(--pw,2.5)) 0 calc(6px * var(--pw,2.5)); }
#homeUi .qSecHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .qSecHead span { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; }
#homeUi .questRow { background: #e7eff5; border: 1px solid #bdced8; border-radius: calc(8px * var(--pw,2.5));
  gap: calc(8px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .questRow.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .qIc { width: calc(40px * var(--pw,2.5)); height: calc(40px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(22px * var(--pw,2.5)); background: #dce8ef; border-color: #b3c8d6; }
#homeUi .qMid b { font-size: calc(14px * var(--pw,2.5)); color: #31536a; }
#homeUi .qBar { height: calc(7px * var(--pw,2.5)); background: #cddce6; border-color: #b3c8d6; margin: calc(5px * var(--pw,2.5)) 0 calc(3px * var(--pw,2.5)); }
#homeUi .qBar i { background: linear-gradient(90deg, #4a9fd6, #58b96b); }
#homeUi .questRow.ready .qBar i { background: linear-gradient(90deg, #f0b13e, #e8892e); }
#homeUi .qNum { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .qRight { gap: calc(4px * var(--pw,2.5)); }
#homeUi .qReward { font-size: calc(12px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .qRight .btn { min-width: calc(76px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }

/* --- 排行榜（青瓷浅色变体） --- */
#homeUi .lbEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .lbBox .mbox { background: #edf4f8; }
#homeUi .lbBox .mHead h3 { color: #88551f; }
#homeUi .lbMy { background: #fff8e5; border-color: #e9a04f; border-radius: calc(7px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .lbMy span { font-size: calc(12px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .lbMy b { font-size: calc(18px * var(--pw,2.5)); color: #945d24; }
#homeUi .lbList { gap: calc(5px * var(--pw,2.5)); }
#homeUi .lbRow { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .lbRow.me { background: #fff8e5; border-color: #e9a04f; box-shadow: none; }
#homeUi .lbRank { width: calc(28px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .lbRank .medal { font-size: calc(17px * var(--pw,2.5)); }
#homeUi .lbIc { font-size: calc(17px * var(--pw,2.5)); }
#homeUi .lbName { font-size: calc(14px * var(--pw,2.5)); color: #31536a; }
#homeUi .lbRow.me .lbName { color: #945d24; }
#homeUi .lbScore { font-size: calc(14px * var(--pw,2.5)); color: #1e6e9e; }

/* --- 宝石镶嵌（青瓷浅色变体） --- */
#homeUi .gemBox { gap: calc(6px * var(--pw,2.5)); margin: calc(-2px * var(--pw,2.5)) 0 calc(6px * var(--pw,2.5)); }
#homeUi .gemHole { padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5));
  background: #dce8ef; border: 1px dashed #9db9ca; }
#homeUi .gemHole .ghIc { font-size: calc(20px * var(--pw,2.5)); }
#homeUi .gemHole .ghNm { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .gemHole .ghEff { font-size: calc(10px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .gemHole .dim { color: #8ba3b5; }
#homeUi .gemHole .ghEff.dim { color: #8ba3b5; }

/* --- 装备工坊（青瓷浅色变体） --- */
#homeUi .forgeBtn { width: calc(76px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); padding: 0; }
#homeUi .fSec { margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .fHead { gap: calc(7px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .fHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .fHead span { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; }
#homeUi .fRow { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  gap: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .fInfo b { font-size: calc(13px * var(--pw,2.5)); color: #31536a; }
#homeUi .fInfo span { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .fRow .btn { min-width: calc(76px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .fQuick { height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 设置（青瓷浅色变体） --- */
#homeUi .setGear { width: calc(34px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); font-size: calc(16px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .setBox .mbox { background: #edf4f8; }
#homeUi .setBox .mHead h3 { color: #88551f; }
#homeUi .setSec { margin-bottom: calc(12px * var(--pw,2.5)); }
#homeUi .setHead { margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .setHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .setHead.danger b { color: #c04a34; }
#homeUi .setRow { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .setRow > span { font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .setRow > b { font-size: calc(13px * var(--pw,2.5)); color: #31536a; }
#homeUi .setRow .btn { min-width: calc(92px * var(--pw,2.5)); height: calc(32px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .volWrap { gap: calc(7px * var(--pw,2.5)); max-width: calc(170px * var(--pw,2.5)); }
#homeUi .volWrap input[type=range] { height: calc(12px * var(--pw,2.5)); }
#homeUi .volWrap b { font-size: calc(12px * var(--pw,2.5)); color: #1e6e9e; width: calc(36px * var(--pw,2.5)); }
#homeUi .resetBtn { border-color: #d8a08a !important; color: #b8503a !important; background: #f7ece6 !important; }

/* --- 建筑详情浮窗（青瓷浅色变体） --- */
#homeUi .bInfoBtn { width: calc(22px * var(--pw,2.5)); height: calc(22px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5));
  border-color: #9db9ca; background: #dce8ef; color: #527085; top: calc(6px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); }
#homeUi .binfoBox .mbox { background: #edf4f8; }
#homeUi .binfoBox .mHead h3 { color: #88551f; }
#homeUi .biIntro { font-size: calc(13px * var(--pw,2.5)); color: #4a6a80; background: #e7eff5;
  border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .biLvRow span { font-size: calc(12px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .biLvRow b { font-size: calc(14px * var(--pw,2.5)); color: #945d24; }
#homeUi .biBar { height: calc(7px * var(--pw,2.5)); background: #cddce6; border-color: #b3c8d6; margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .biBar i { background: linear-gradient(90deg, #4a9fd6, #58b96b); }
#homeUi .biEff { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .biEff em { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; margin-bottom: calc(2px * var(--pw,2.5)); }
#homeUi .biEff span { font-size: calc(13px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .biEff.next span { color: #2f9c4a; }
#homeUi .biStatus { font-size: calc(12px * var(--pw,2.5)); color: #945d24; margin: calc(2px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)); }
#homeUi .biOk { height: calc(44px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 技能详情浮窗（青瓷浅色变体） --- */
#homeUi .abBox .mbox { background: #edf4f8; }
#homeUi .abBox .mHead h3 { color: #88551f; }
#homeUi .abName b { font-size: calc(17px * var(--pw,2.5)); color: #31536a; }
#homeUi .abName .lvtag { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .abEff { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .abEff em { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; margin-bottom: calc(2px * var(--pw,2.5)); }
#homeUi .abEff span { font-size: calc(13px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .abEff.next span { color: #2f9c4a; }
#homeUi .abMs { margin: calc(8px * var(--pw,2.5)) 0; }
#homeUi .abMsHead { font-size: calc(14px * var(--pw,2.5)); color: #88551f; margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .abMsRow { gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(8px * var(--pw,2.5));
  border: 1px dashed #9db9ca; border-radius: calc(6px * var(--pw,2.5)); margin-bottom: calc(4px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .abMsRow.reach { border: 1px solid #e9a04f; background: #fff8e5; color: #945d24; }
#homeUi .abMsLv { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .abMsRow span:last-child { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .abCost { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); gap: calc(7px * var(--pw,2.5)); }
#homeUi .abCost > span { font-size: calc(12px * var(--pw,2.5)); color: #945d24; }
#homeUi .abCost .btn { min-width: calc(92px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 每日签到（青瓷浅色变体） --- */
#homeUi .signinEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .besEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .besGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .besCell { padding: calc(8px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); cursor: pointer; }
#homeUi .besCell.lock { opacity: .55; filter: grayscale(.8); }
#homeUi .besPic { width: calc(56px * var(--pw,2.5)); height: calc(56px * var(--pw,2.5)); }
#homeUi .besCell.lock .besPic { filter: brightness(0) opacity(.75); }
#homeUi .besNm { font-size: calc(12px * var(--pw,2.5)); font-weight: 700; color: #46647a; }
#homeUi .besSub { font-size: calc(11px * var(--pw,2.5)); color: #945d24; }
#homeUi .besElite { display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); margin-top: calc(10px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); color: #527085; }
#homeUi .besElite b { color: #e9a04f; }
#homeUi .besDetail { display: flex; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); }
#homeUi .besDetail.lock { opacity: .7; }
#homeUi .besDetailPic { flex: none; width: calc(90px * var(--pw,2.5)); height: calc(110px * var(--pw,2.5)); }
#homeUi .besDetail.lock .besDetailPic { background: radial-gradient(circle at 50% 60%, #d7e2e8, #b3c4ce); border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .besDetailInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); text-align: left; }
#homeUi .besDetailName { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .besDetailName b { font-size: calc(15px * var(--pw,2.5)); color: #945d24; }
#homeUi .besStars { font-size: calc(12px * var(--pw,2.5)); color: #e9a04f; }
#homeUi .besBeh { font-size: calc(12px * var(--pw,2.5)); color: #527085; font-weight: 700; }
#homeUi .besDesc { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; line-height: 1.6; }
#homeUi .besStats { margin-top: calc(4px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .besStatRow { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .besStatRow span { color: #8fa9ba; }
#homeUi .besStatRow b { color: #945d24; }

/* --- 试炼之塔（青瓷浅色变体） --- */
#homeUi .trialList { max-height: calc(300px * var(--pw,2.5)); overflow-y: auto; display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); }
#homeUi .trialSect { display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .trialSect.lock { opacity: .55; }
#homeUi .trialSectName { font-size: calc(11px * var(--pw,2.5)); color: #527085; }
#homeUi .trialSect.lock .trialSectName { color: #8fa9ba; }
#homeUi .trialGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(5px * var(--pw,2.5)); }
#homeUi .trialCell { position: relative; padding: calc(6px * var(--pw,2.5)) 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(1px * var(--pw,2.5)); }
#homeUi .trialCell b { font-size: calc(13px * var(--pw,2.5)); color: #46647a; }
#homeUi .trialCell span { font-size: calc(9px * var(--pw,2.5)); }
#homeUi .trialCell i { position: absolute; top: calc(1px * var(--pw,2.5)); right: calc(2px * var(--pw,2.5)); font-style: normal; font-size: calc(8px * var(--pw,2.5)); }
#homeUi .trialCell.done { border-color: #7fae86; }
#homeUi .trialCell.done b { color: #3f7a4a; }
#homeUi .trialCell.now { border-color: #e9a04f; cursor: pointer; }
#homeUi .trialCell.now b { color: #945d24; }
#homeUi .trialCell.sel { border-color: #e9a04f; box-shadow: 0 0 8px rgba(233,160,79,.55); }
#homeUi .trialCell.lock { opacity: .5; }
#homeUi .trialCell.mile { border-top: calc(2px * var(--pw,2.5)) solid #e9a04f; }
#homeUi .trialDetail { margin-top: calc(8px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); text-align: left; }
#homeUi .trialName { font-size: calc(14px * var(--pw,2.5)); font-weight: 700; color: #945d24; display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .trialName span { font-size: calc(10px * var(--pw,2.5)); color: #527085; font-weight: 400; }
#homeUi .trialStat { display: flex; gap: calc(12px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; flex-wrap: wrap; }
#homeUi .trialStat b { color: #46647a; }
#homeUi .trialMobs { display: flex; gap: calc(8px * var(--pw,2.5)); flex-wrap: wrap; align-items: flex-end; }
#homeUi .trialMob { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .trialMobPic { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); }
#homeUi .trialReward { display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .trialRewardHead { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .trialRewardRow { display: flex; gap: calc(5px * var(--pw,2.5)); align-items: center; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .trialRewardRow b { color: #945d24; }
#homeUi .trialRewardNote { font-size: calc(11px * var(--pw,2.5)); color: #527085; }
#homeUi .trialGo { width: 100%; margin-top: calc(8px * var(--pw,2.5)); }

/* --- 英雄招募 + 升星（青瓷浅色变体） --- */
#homeUi .hpick.recruitEntry .rcIc { font-size: calc(23px * var(--pw,2.5)); line-height: calc(36px * var(--pw,2.5)); background: none !important; }
#homeUi .starBar { margin: calc(8px * var(--pw,2.5)) 0; padding: calc(9px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .starBar.max { border-color: #e9a04f; }
#homeUi .sbLine { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .sbStars { font-size: calc(16px * var(--pw,2.5)); color: #e9a04f; letter-spacing: calc(2px * var(--pw,2.5)); }
#homeUi .sbLv { font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .sbProg { display: flex; align-items: baseline; gap: calc(5px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .sbProg b { color: #945d24; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .sbAdd { font-size: calc(9px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .sbDone { color: #945d24; }
#homeUi .sbBtn { width: 100%; }

#homeUi .rcHead { display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .rcHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(11px * var(--pw,2.5)); color: #46647a; }
#homeUi .rcHeadTop i { color: #945d24; font-style: normal; font-size: calc(14px * var(--pw,2.5)); font-weight: 700; }
#homeUi .rcHeadTop span { font-size: calc(10px * var(--pw,2.5)); color: #527085; }
#homeUi .rcBar { height: calc(7px * var(--pw,2.5)); background: #dbe6ec; border-radius: calc(4px * var(--pw,2.5)); overflow: hidden; border: 1px solid #bdced8; }
#homeUi .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, #e9a04f, #f3c98a); transition: width .3s; }
#homeUi .rcRate { padding: calc(8px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .rcRateRow { display: flex; justify-content: space-between; font-size: calc(11px * var(--pw,2.5)); color: #46647a; }
#homeUi .rcRateRow b { color: #6b8ba1; }
#homeUi .rcRateRow.hero span, #homeUi .rcRateRow.hero b { color: #945d24; }
#homeUi .rcRateNote { margin-top: calc(2px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #527085; }
#homeUi .rcShards { margin-top: calc(8px * var(--pw,2.5)); }
#homeUi .rcShardsHead { font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; margin-bottom: calc(4px * var(--pw,2.5)); }
#homeUi .rcShardGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(5px * var(--pw,2.5)); }
#homeUi .rcShard { display: flex; align-items: center; gap: calc(5px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)); }
#homeUi .rcShard.lock { opacity: .6; filter: grayscale(.7); }
#homeUi .rcShardPic { flex: none; width: calc(26px * var(--pw,2.5)); height: calc(26px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .rcShardInfo { display: flex; flex-direction: column; gap: calc(1px * var(--pw,2.5)); min-width: 0; }
#homeUi .rcShardInfo b { font-size: calc(11px * var(--pw,2.5)); color: #46647a; }
#homeUi .rcShardInfo i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #945d24; }
#homeUi .rcBtns { display: flex; gap: calc(7px * var(--pw,2.5)); margin-top: calc(9px * var(--pw,2.5)); }
#homeUi .rcBtn { flex: 1; }
#homeUi .rcAdBtn { width: 100%; margin-top: calc(6px * var(--pw,2.5)); }
#homeUi .recruitResGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .recruitResGrid:not(.many) { grid-template-columns: 1fr; max-width: calc(150px * var(--pw,2.5)); margin: 0 auto; }
#homeUi .rcCard { position: relative; padding: calc(6px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5));
  animation: giftDropIn .45s cubic-bezier(.2,1.5,.4,1) backwards; }
#homeUi .rcCardPic { width: calc(48px * var(--pw,2.5)); height: calc(48px * var(--pw,2.5)); }
#homeUi .rcCardIc { font-size: calc(32px * var(--pw,2.5)); line-height: 1; }
#homeUi .rcCardNm { font-size: calc(9px * var(--pw,2.5)); color: #46647a; line-height: 1.3; }
#homeUi .rcCard.hero { border-color: #e9a04f; box-shadow: 0 0 9px rgba(233,160,79,.65); }
#homeUi .rcNew { position: absolute; top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); background: #e2534f; color: #fff;
  font-size: calc(8px * var(--pw,2.5)); font-weight: 700; padding: calc(1px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5)); }
#homeUi .rcDup { position: absolute; top: calc(2px * var(--pw,2.5)); left: 50%; transform: translateX(-50%); font-size: calc(7px * var(--pw,2.5));
  color: #945d24; white-space: nowrap; }
#homeUi .rcSum { margin-top: calc(9px * var(--pw,2.5)); text-align: center; font-size: calc(11px * var(--pw,2.5)); color: #527085; }
#homeUi .rcAgain { width: 100%; margin-top: calc(9px * var(--pw,2.5)); }
#homeUi .rcClose { width: 100%; margin-top: calc(5px * var(--pw,2.5)); }

/* --- 天赋树（青瓷浅色变体） --- */
#homeUi .talentEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .talentHead { display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .talentHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .talentHeadTop i { color: #2f7fa8; font-style: normal; font-size: calc(17px * var(--pw,2.5)); font-weight: 700; }
#homeUi .talentHeadTop span { font-size: calc(12px * var(--pw,2.5)); color: #945d24; }
#homeUi .talentBar { height: calc(7px * var(--pw,2.5)); background: #dbe8ee; border-radius: calc(4px * var(--pw,2.5)); overflow: hidden; border: 1px solid #c3d6de; }
#homeUi .talentBar i { display: block; height: 100%; background: linear-gradient(90deg, #4aa8d8, #2f7fa8); }
#homeUi .talentSrc { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; line-height: 1.5; }

#homeUi .talentBranchRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(7px * var(--pw,2.5)); }
#homeUi .talentBranch { display: flex; flex-direction: column; min-width: 0; }
#homeUi .tbTitle { text-align: center; margin-bottom: calc(5px * var(--pw,2.5)); display: flex; flex-direction: column; gap: 1px; }
#homeUi .tbTitle b { font-size: calc(13px * var(--pw,2.5)); color: #46647a; }
#homeUi .tbTitle i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .tbNodes { display: flex; flex-direction: column; align-items: center; }
#homeUi .talentNode { position: relative; width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  border: 1px solid #c3d6de; border-radius: calc(6px * var(--pw,2.5)); background: #f2f8fa; cursor: pointer; }
#homeUi .talentNode:not(:last-child) { margin-bottom: calc(15px * var(--pw,2.5)); }
#homeUi .talentNode:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%;
  transform: translateX(-50%); width: calc(2px * var(--pw,2.5)); height: calc(15px * var(--pw,2.5)); background: #c3d6de; }
#homeUi .talentNode.maxed:not(:last-child)::after { background: #e9a04f; }
#homeUi .talentNode.lock { opacity: .5; filter: grayscale(.6); border-color: #dbe8ee; }
#homeUi .talentNode.can { border-color: #2f7fa8; box-shadow: 0 0 7px #2f7fa877; animation: huiChest .9s ease-in-out infinite; }
#homeUi .talentNode.maxed { border-color: #e9a04f; box-shadow: 0 0 7px #e9a04f88; }
#homeUi .talentNode.sel { outline: calc(2px * var(--pw,2.5)) solid #4aa8d8; outline-offset: calc(2px * var(--pw,2.5)); }
#homeUi .tnIc { font-size: calc(19px * var(--pw,2.5)); line-height: 1; }
#homeUi .tnLv { font-size: calc(8px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .talentNode.maxed .tnLv { color: #945d24; }
#homeUi .talentNode.can .tnLv { color: #2f7fa8; }

#homeUi .talentDetail { margin-top: calc(9px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5));
  display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .tdName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(6px * var(--pw,2.5)); }
#homeUi .tdName b { font-size: calc(14px * var(--pw,2.5)); color: #945d24; }
#homeUi .tdName i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .tdDesc { font-size: calc(12px * var(--pw,2.5)); color: #46647a; line-height: 1.5; }
#homeUi .tdHint { font-size: calc(11px * var(--pw,2.5)); color: #2f7fa8; }
#homeUi .tdBtns { display: flex; gap: calc(7px * var(--pw,2.5)); margin-top: calc(2px * var(--pw,2.5)); }
#homeUi .tdBtns .btn { flex: 1; height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }

/* --- 个人主页（青瓷浅色变体） --- */
#homeUi .pAvatar { cursor: pointer; }
#homeUi .pfCard { display: flex; align-items: center; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .pfPic { flex: none; width: calc(64px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5)); border-radius: calc(12px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .pfCardInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .pfName { display: flex; align-items: baseline; gap: calc(6px * var(--pw,2.5)); }
#homeUi .pfName b { font-size: calc(15px * var(--pw,2.5)); color: #46647a; }
#homeUi .pfTitle { font-size: calc(12px * var(--pw,2.5)); color: #945d24; font-weight: 700; }
#homeUi .pfPower { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); color: #527085; }
#homeUi .pfPower b { font-size: calc(16px * var(--pw,2.5)); color: #e9a04f; }
#homeUi .pfSec { margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .pfSecHead { margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .pfSecHead b { font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .pfGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .pfStat { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); }
#homeUi .pfStat em { font-style: normal; font-size: calc(16px * var(--pw,2.5)); line-height: 1; }
#homeUi .pfStat b { font-size: calc(13px * var(--pw,2.5)); color: #945d24; }
#homeUi .pfStat span { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .pfAcc { padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .pfAccRow { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .pfAccRow span { color: #8fa9ba; }
#homeUi .pfAccRow b { color: #46647a; }
#homeUi .signinEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .siHead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .siHead b { font-size: calc(15px * var(--pw,2.5)); color: #527085; }
#homeUi .siHead b i { color: #e9a04f; font-style: normal; }
#homeUi .siHead span { font-size: calc(12px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .siGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .siCell { padding: calc(8px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); }
#homeUi .siCell.today { border-color: #e9a04f; background: #fff8e5; box-shadow: 0 0 8px #e9a04f66; }
#homeUi .siCell.done { opacity: .55; filter: grayscale(.4); }
#homeUi .siIc { font-size: calc(22px * var(--pw,2.5)); line-height: 1; }
#homeUi .siNm { font-size: calc(12px * var(--pw,2.5)); font-weight: 700; color: #46647a; }
#homeUi .siDy { font-size: calc(11px * var(--pw,2.5)); color: #e9a04f; }
#homeUi .siRw { font-size: calc(11px * var(--pw,2.5)); color: #945d24; }
#homeUi .siFoot { display: flex; align-items: center; justify-content: space-between; gap: calc(8px * var(--pw,2.5));
  margin-top: calc(10px * var(--pw,2.5)); padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); }
#homeUi .siFoot.ready { border-color: #e9a04f; box-shadow: 0 0 8px #e9a04f55; }
#homeUi .siFoot.done { opacity: .65; }
#homeUi .siInfo { display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); }
#homeUi .siInfo b { font-size: calc(14px * var(--pw,2.5)); color: #46647a; }
#homeUi .siInfo span { font-size: calc(13px * var(--pw,2.5)); color: #945d24; font-weight: 700; }
#homeUi .siFoot .btn { min-width: calc(110px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); }

/* --- 装备词缀（青瓷浅色变体） --- */
#homeUi .bcellAffix { position: absolute; left: calc(3px * var(--pw,2.5)); top: calc(2px * var(--pw,2.5));
  font-size: calc(9px * var(--pw,2.5)); color: #c98a1e; text-shadow: none; }
#homeUi .affixMark { color: #c98a1e; font-size: calc(11px * var(--pw,2.5)); }
#homeUi .affixBox { margin: calc(-4px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)) 0; padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: calc(7px * var(--pw,2.5)); background: #f4f9fb; border: 1px dashed #b8cbd7;
  display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); }
#homeUi .affixHead { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .affixRow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(5px * var(--pw,2.5));
  font-size: calc(11px * var(--pw,2.5)); }
#homeUi .affixName { font-weight: 700; }
#homeUi .affixVal { color: #46647a; }
`;
        document.head.appendChild(style);
    }
}
