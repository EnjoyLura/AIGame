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
import { HOME_UI_CSS } from './HomeUiStyle';

export const MALL_AD_STAMINA = 10;
/** 体力获取弹窗：钻石直购档位（1💎=1体力，可超上限囤积） */

export const STAMINA_BUY_N = 20;

export const STAMINA_BUY_COST = 20;

/** 六槽部位图标（原型图 emoji 风格） */

export const SLOT_EMOJI: Record<EquipSlot, string> = {
    head: '🪖', body: '🛡️', legs: '🦵', gloves: '🧤', wrist: '💪', shoes: '🥾',
};

/** 章节主题（对应 STAGES 五关的场景表现：场景渐变/载具 emoji/怪物 emoji） */

/**
 * HomeUi 壳：组件生命周期/事件接线、共享工具（弹窗骨架/toast/贴图挂载）、
 * 顶栏资源与体力补给、底部导航与页面切换、公告条、模拟广告层。
 */
export abstract class HomeUiCore extends Component {
    protected static _styleInjected = false;


    protected _root: HTMLDivElement | null = null;

    protected _pages: Record<string, HTMLDivElement> = {};

    protected _navBtns: Record<string, HTMLButtonElement> = {};

    /** 顶栏资源胶囊数值元素 */
    protected _topRes: Partial<Record<'gold' | 'diamond' | 'stamina', HTMLElement>> = {};

    /** 顶栏经验条与文案 */
    protected _expFill: HTMLElement | null = null;

    protected _expNum: HTMLDivElement | null = null;

    /** 公告条跑马灯文字与未读红点 */
    protected _noticeTextEl: HTMLDivElement | null = null;

    protected _noticeRedEl: HTMLElement | null = null;

    /** 本次会话是否已自动弹过公告（每次启动至多自动弹一次） */
    protected _autoNoticeShown = false;

    /** 远征弹窗的秒级倒计时刷新定时器（弹窗关闭即清，防泄漏） */
    protected _expTimer = 0;

    /** 基地区红点兜底轮询：倒计时归零没有事件驱动，靠低频轮询补亮 */
    protected _expIdleTimer = 0;

    /** 模拟广告层 */
    protected _adOverlay: HTMLDivElement | null = null;

    protected _adCountdown: HTMLDivElement | null = null;

    protected _adTimer = 0;

    /** 贴图挂起队列：AssetLib 异步就绪后补挂 */
    protected _pendingTex: Array<{ key: string; apply: (url: string) => void }> = [];


    protected _tex(key: string, apply: (url: string) => void): void {
        const url = this._frameUrl(key);
        if (url) {
            apply(url);
            return;
        }
        this._pendingTex.push({ key, apply });
    }


    protected _applyPendingTex(): void {
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


    protected _heroWeaponName(id: string): string {
        const def = HERO_DEFS.find(d => d.id === id);
        if (!def) {
            return '';
        }
        return def.weapon === 'rifle' ? '步枪' : def.weapon === 'sniper' ? '狙击' : def.weapon === 'laser' ? '激光' : '辐射';
    }


    /** 英雄战力（与旧版口径一致：基础攻击 × 总乘区 × 10） */
    protected _heroPower(id: string): number {
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
        // 远征倒计时归零没有事件源（时间自己走），靠这个低频轮询兜底补亮红点：
        // 玩家切后台回来、或停留在基地页等任务到点时，入口红点不能一直不亮。
        this._expIdleTimer = setInterval(() => {
            this._refreshEntryReds();
        }, 30000) as unknown as number;
        this.show();
    }

    onDestroy(): void {
        clearInterval(this._expTimer);
        clearInterval(this._expIdleTimer);
        this._root?.remove();
        this._root = null;
    }


    protected show(): void {
        if (this._root) {
            this._root.style.display = 'flex';
            this._refreshAll();
            // 有未读公告时进主城自动弹出（每次启动至多一次；已有弹窗时本次让路）
            if (NoticeSystem.instance.hasUnread() && !this._autoNoticeShown) {
                this._autoNoticeShown = true;
                setTimeout(() => {
                    if (this._root && !document.querySelector('#homeUi .protoMask')) {
                        SoundFx.play('ui');
                        this._openNoticeModal();
                    }
                }, 800);
            }
        }
    }


    protected hide(): void {
        this._root && (this._root.style.display = 'none');
    }


    protected _refreshAll(): void {
        this._refreshTop();
        this._refreshStagePage();
        this._refreshMall();
        this._refreshHeroes();
        this._refreshPlayPage();
        this._refreshBase();
        this._refreshNoticeBar();
        this._applyPendingTex();
    }


    protected _toast(msg: string): void {
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
    protected _openModal(title: string, buildBody: (box: HTMLDivElement, close: () => void) => void): void {
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
    protected _buildTopbar(root: HTMLDivElement): void {
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
                if (id === 'stamina') {
                    // 体力直达获取面板（广告/钻石/恢复倒计时）；金币钻石仍跳商城
                    this._openStaminaModal();
                } else {
                    this._switchPage('mall');
                }
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


    protected _refreshTop(): void {
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
        this._refreshEntryReds();
    }


    // ================= 底部导航 =================

    protected _buildNav(root: HTMLDivElement): void {
        const nav = document.createElement('div');
        nav.className = 'tabbar';
        const NAV: Array<{ key: string; icon: string; name: string; main?: boolean }> = [
            { key: 'mall', icon: '🛒', name: '商店' },
            { key: 'heroes', icon: '🎖️', name: '英雄' },
            { key: 'battle', icon: '🚚', name: '关卡', main: true },
            { key: 'core', icon: '🎮', name: '玩法' },
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


    protected _switchPage(page: string): void {
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
            this._refreshPlayPage();
        }
        if (page === 'base') {
            this._refreshBase();
        }
        this._refreshTop();
        this._applyPendingTex();
    }


    // ================= 构建入口 =================

    protected _build(): void {
        const root = document.createElement('div');
        root.id = 'homeUi';
        this._root = root;

        this._buildTopbar(root);
        this._buildNoticeBar(root);

        const viewport = document.createElement('div');
        viewport.className = 'viewport';
        root.appendChild(viewport);

        this._buildMallPage(viewport);
        this._buildHeroesPage(viewport);
        this._buildStagePage(viewport);
        this._buildPlayPage(viewport);
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


    // ================= 公告条与公告弹窗 =================

    /** 主城顶部公告条（topbar 之下全局常驻）：跑马灯滚动最新公告，点击打开公告列表，未读亮红点 */
    protected _buildNoticeBar(root: HTMLDivElement): void {
        const bar = document.createElement('div');
        bar.className = 'noticeBar';
        bar.title = '查看全部公告';
        const ic = document.createElement('span');
        ic.className = 'nIc';
        ic.textContent = '📣';
        const clip = document.createElement('div');
        clip.className = 'nClip';
        const text = document.createElement('div');
        text.className = 'noticeText';
        clip.appendChild(text);
        const red = document.createElement('i');
        red.className = 'nRed';
        bar.appendChild(ic);
        bar.appendChild(clip);
        bar.appendChild(red);
        bar.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openNoticeModal();
        };
        root.appendChild(bar);
        this._noticeTextEl = text;
        this._noticeRedEl = red;
        this._refreshNoticeBar();
    }


    /** 公告条刷新：跑马灯文案 = 最新公告（类型｜标题，重复拼接便于循环）+ 未读红点 */
    protected _refreshNoticeBar(): void {
        if (this._noticeTextEl) {
            const n = NoticeSystem.instance.latest();
            const seg = `${NOTICE_KIND_NAMES[n.kind]}｜${n.title}　🔔 点击查看全部公告`;
            this._noticeTextEl.textContent = seg + '　　' + seg + '　　';
        }
        if (this._noticeRedEl) {
            this._noticeRedEl.classList.toggle('on', NoticeSystem.instance.hasUnread());
        }
    }


    /** 公告列表弹窗（新→旧全量展示）；打开即全部标记已读：红点熄灭、下次进主城不再自动弹 */
    protected _openNoticeModal(): void {
        NoticeSystem.instance.markAllRead();
        this._refreshNoticeBar();
        this._openModal('📣 游戏公告', (box) => {
            box.classList.add('noticeBox');
            for (let i = NOTICE_DEFS.length - 1; i >= 0; i--) {
                const n = NOTICE_DEFS[i];
                const item = document.createElement('div');
                item.className = 'nItem panel';
                const head = document.createElement('div');
                head.className = 'nHead';
                head.innerHTML = `<span class="tag ${n.kind === 'update' ? 'g' : n.kind === 'activity' ? 'p' : 'b'}">${NOTICE_KIND_NAMES[n.kind]}</span>` +
                    `<b class="nTitle">${n.title}</b><span class="nDate">${n.date}</span>`;
                const body = document.createElement('p');
                body.className = 'nBody';
                body.textContent = n.body;
                item.appendChild(head);
                item.appendChild(body);
                box.appendChild(item);
            }
        });
    }


    /**
     * 体力获取弹窗：恢复倒计时 + 看广告领体力 + 钻石直购。
     * 顶栏体力「+」与出战体力不足守卫的统一去处（广告入口在商城页另有一份）。
     */
    protected _openStaminaModal(): void {
        const gm = GameManager.instance;
        this._openModal('🍖 体力补给', (box) => {
            box.classList.add('staminaBox');

            // 状态区：当前/上限 + 恢复速率 + 下一几点倒计时（每秒刷新，弹窗关闭即停）
            const state = document.createElement('div');
            state.className = 'stState panel';
            box.appendChild(state);
            const renderState = () => {
                const nextIn = gm.staminaNextIn();
                const ss = nextIn % 60;
                state.innerHTML = `<b>${gm.stamina()} / ${gm.staminaMax()}</b>` +
                    `<span>每 ${BattleConfig.STAMINA_REGEN_MINUTES} 分钟恢复 1 点` +
                    (nextIn > 0 ? ` · 下一几点 ${Math.floor(nextIn / 60)}:${ss < 10 ? '0' + ss : ss}` : ' · 体力已满') +
                    `</span>`;
            };
            renderState();
            const timer = setInterval(() => {
                if (!box.isConnected) {
                    clearInterval(timer);
                    return;
                }
                renderState();
            }, 1000) as unknown as number;

            // 获取条目区：广告 + 钻石两条路，领取/购买后就地重绘
            const wrap = document.createElement('div');
            box.appendChild(wrap);
            const render = () => {
                wrap.innerHTML = '';
                const left = AdService.instance.remaining('stamina');
                const full = gm.stamina() >= gm.staminaMax();

                const adRow = document.createElement('div');
                adRow.className = 'stRow panel';
                adRow.innerHTML = `<span class="stIc">📺</span>` +
                    `<div class="stInfo"><b>看广告领体力</b>` +
                    `<span>+${MALL_AD_STAMINA} 体力 · 今日剩余 ${left}/3 次${full ? ' · 体力已满无法领取' : ''}</span></div>`;
                const adBtn = document.createElement('button');
                adBtn.className = 'btn blue sm';
                adBtn.textContent = '▶ 观 看';
                adBtn.disabled = left <= 0 || full;
                adBtn.style.opacity = adBtn.disabled ? '0.45' : '1';
                adBtn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    AdService.instance.claimReward('stamina', () => {
                        gm.res.add('stamina', MALL_AD_STAMINA);
                        SoundFx.play('coin');
                        this._toast(`体力 +${MALL_AD_STAMINA}`);
                        this._refreshTop();
                        render();
                        renderState();
                    });
                };
                adRow.appendChild(adBtn);
                wrap.appendChild(adRow);

                const buyRow = document.createElement('div');
                buyRow.className = 'stRow panel';
                buyRow.innerHTML = `<span class="stIc">💎</span>` +
                    `<div class="stInfo"><b>钻石购买</b>` +
                    `<span>+${STAMINA_BUY_N} 体力 · ${STAMINA_BUY_COST} 💎（可超出上限囤积）</span></div>`;
                const buyBtn = document.createElement('button');
                buyBtn.className = 'btn gold sm';
                buyBtn.textContent = '购 买';
                buyBtn.disabled = gm.res.get('diamond') < STAMINA_BUY_COST;
                buyBtn.style.opacity = buyBtn.disabled ? '0.45' : '1';
                buyBtn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (gm.buyStamina(STAMINA_BUY_N, STAMINA_BUY_COST)) {
                        SoundFx.play('buy');
                        this._toast(`体力 +${STAMINA_BUY_N}`);
                        this._refreshTop();
                        render();
                        renderState();
                    } else {
                        this._toast('钻石不足');
                    }
                };
                buyRow.appendChild(buyBtn);
                wrap.appendChild(buyRow);

                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.style.textAlign = 'center';
                tip.textContent = '体力随时间自动恢复 · 加油站每级提高体力上限';
                wrap.appendChild(tip);
            };
            render();
        });
    }


    // ================= 商店页 =================

    /** 商店页：礼包 banner + 四页签（英雄/装备/宝石/材料）+ 广告补给 + 双列商品网格 */
    /**
     * 原型人物照片挂载（interface.css 规则）：
     * idx 0 = commander.png（特写），idx 1-3 = specialists.png 横向三联精灵图；
     * mount 区分三种挂载的 background 尺寸（头像条/大立绘/小编队格）。
     */
    protected _heroPhoto(idx: number, mount: 'pick' | 'figure' | 'slot'): { key: string; css: string } {
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
    protected _mkHeading(h2: string, small: string): HTMLDivElement {
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


    // ================= 任务与成就 =================

    /** 任务入口红点：有可领奖任务时点亮 */
    protected _refreshQuestRed(el: HTMLElement | null): void {
        if (el) {
            el.classList.toggle('on', QuestSystem.instance.hasClaimable());
        }
    }


    /** 签到入口红点：今天未签到时点亮 */
    protected _refreshSigninRed(el: HTMLElement | null): void {
        if (el) {
            el.classList.toggle('on', SigninSystem.instance.canClaimToday());
        }
    }


    /** 个人主页浮窗（点头像弹出）：名片 + 战绩 + 养成 + 系统进度 + 账号信息 */
    protected _openProfileModal(): void {
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


    // ================= 设置 =================

    /** 设置弹窗：音效开关/音量、版本信息、重置存档（输入 CONFIRM 二次确认） */
    protected _openSettingsModal(): void {
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


    // ================= 模拟广告层 =================

    /** 模拟广告层：AD_START 弹出 3 秒倒计时，AD_END 关闭 */
    protected _buildAdOverlay(root: HTMLDivElement): void {
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


    protected _frameUrl(key: string): string | null {
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


    // ---- 跨组共享的实例状态（构建/使用在链上子类） ----
    protected abstract _heroSelIdx: number;

    // ---- 五页构建/刷新与全局红点（实现在各页文件，链上子类） ----
    protected abstract _buildMallPage(root: HTMLDivElement): void;
    protected abstract _refreshMall(): void;
    protected abstract _buildHeroesPage(root: HTMLDivElement): void;
    protected abstract _refreshHeroes(): void;
    protected abstract _refreshTalentRed(): void;
    protected abstract _buildStagePage(root: HTMLDivElement): void;
    protected abstract _refreshStagePage(): void;
    protected abstract _buildPlayPage(root: HTMLDivElement): void;
    protected abstract _refreshPlayPage(): void;
    protected abstract _refreshEntryReds(): void;
    protected abstract _buildBasePage(root: HTMLDivElement): void;
    protected abstract _refreshBase(): void;

    /** 样式注入（全量 CSS 见 HomeUiStyle.ts；仅注入一次） */
    protected _injectStyle(): void {
        if (HomeUiCore._styleInjected) {
            return;
        }
        HomeUiCore._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = HOME_UI_CSS;
        document.head.appendChild(style);
    }

}
