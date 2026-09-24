import { Component, sys } from 'cc';
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES, BUILDINGS } from '../core/GameManager';
import { AdService } from '../core/AdService';
import { QUEST_DEFS, QuestSystem, QuestDef, ACTIVITY_CHESTS, ACTIVITY_MAX, rewardText } from '../core/QuestSystem';
import { SigninSystem, SIGNIN_REWARDS, SigninReward } from '../core/SigninSystem';
import { BestiarySystem, BESTIARY_DEFS, BestiaryDef } from '../core/BestiarySystem';
import { MailSystem, mailTimeText, mailExpiringSoon, MailDef } from '../core/MailSystem';
import { SoundFx } from '../core/SoundFx';
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, WEAPON_CORE_DEFS, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot, BagItem, MiscItemDef, MISC_ITEM_DEFS, miscDef, lootRateText, tierRank, EquipTier, LootDrop, lootDropColor, GEM_EFFECTS, gemSlots, gemSocketCost, combineGroupCount, salvageStoneYield, salvageAlloyYield } from '../core/HeroSystem';
import { HERO_DEFS, ABILITY_LEVEL_DMG_BONUS, HeroDef } from '../battle/HeroDef';
import { STAGES, FINAL_STAGE_ID, stageInfo, stageWaves, STAGE_DIFFS, stageDiffDef, StageDifficulty } from '../battle/StageData';
import { TalentSystem, TALENT_NODES, TALENT_BRANCHES, TALENT_BRANCH_NAMES, branchNodes, branchPointTotal, talentNode, TalentNodeDef, TalentBranch } from '../core/TalentSystem';
import { NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES, NoticeKind } from '../core/NoticeData';
import { HOME_UI_CSS } from './HomeUiStyle';
import * as UiPlate from './UiPlate';
import type { PopTier, PopSize, PopText, PopCta, PopRowOpts, PopAttrOpts, PopOpts } from './HomeUiPop';

export const MALL_AD_STAMINA = 10;
/** 体力获取弹窗：钻石直购档位（1💎=1体力，可超上限囤积） */

export const STAMINA_BUY_N = 20;

/** `_popEmpty` 的默认空态件：贴图 key + 缺图时的占位字形。整串字面量写在这里是
 *  `check-art-manifest` 的要求（拼接出来的 key 它不认，会把已落盘的图判成「在库无归宿」）。 */
const EMPTY_SLOT = 'ui/ico/ico_empty';
const EMPTY_GLYPH = '\ud83d\udced';

export const STAMINA_BUY_COST = 20;

/** 六槽部位图标（原型图 emoji 风格） */

export const SLOT_EMOJI: Record<EquipSlot, string> = {
    head: '🪖', body: '🛡️', legs: '🦵', gloves: '🧤', wrist: '💪', shoes: '🥾',
};

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

    /** 顶栏邮箱按钮（未读红点驱动） */
    protected _homeMailBtn: HTMLButtonElement | null = null;

    /** 顶栏公告按钮（未读红点驱动） */
    protected _homeNoticeBtn: HTMLButtonElement | null = null;

    /** 顶部刘海/胶囊安全区条（静态留白，只占位不画内容） */
    protected _safeBandEl: HTMLDivElement | null = null;

    /** 本次会话是否已自动弹过公告（每次启动至多自动弹一次） */
    protected _autoNoticeShown = false;

    /** 远征弹窗的秒级倒计时刷新定时器（弹窗关闭即清，防泄漏） */
    protected _expTimer = 0;

    /** 远征弹窗固定条里的倒计时胶囊（每秒就地改文案，不重绘整层） */
    protected _expTimerEl: HTMLElement | null = null;

    /** 体力补给弹窗的秒级恢复倒计时（弹窗关闭即清，防泄漏） */
    protected _stamTimer = 0;

    /** 体力补给弹窗固定条里的倒计时胶囊 */
    protected _stamTimerEl: HTMLElement | null = null;

    /** 基地区红点兜底轮询：倒计时归零没有事件驱动，靠低频轮询补亮 */
    protected _expIdleTimer = 0;

    /** 模拟广告层 */
    protected _adOverlay: HTMLDivElement | null = null;

    protected _adCountdown: HTMLDivElement | null = null;

    protected _adTimer = 0;

    /** 贴图挂起队列：AssetLib 异步就绪后补挂 */
    protected _pendingTex: Array<{ key: string; apply: (url: string) => void }> = [];
    private _pendingTexTimer = 0;


    protected _tex(key: string, apply: (url: string) => void): void {
        const url = this._frameUrl(key);
        if (url) {
            apply(url);
            return;
        }
        this._pendingTex.push({ key, apply });
    }

    /** 进度条贴图：底槽走 `barThin`（主城四条都是 12px，配 2px/4px 板边才留得出内腔），
     *  填充走横向拉伸、宽度仍由调用方写 %。缺图整条回退 CSS 底色。 */
    protected _barTex(track: HTMLElement, fill: HTMLElement | null, fillKey?: string): void {
        this._tex('ui/progress/bar_track', UiPlate.nineSlice(track, 'barThin'));
        if (fill && fillKey) {
            this._tex(fillKey, UiPlate.strip(fill));
        }
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
        // 竞态兜底：预载图晚于首次排水到达时自续排水直至清空（换图冷加载必踩，此前靠切页掩盖）
        if (this._pendingTex.length && !this._pendingTexTimer) {
            this._pendingTexTimer = window.setTimeout(() => {
                this._pendingTexTimer = 0;
                this._applyPendingTex();
            }, 400);
        }
    }


    /** 主城 .btn 语义变体 → 去字底板：按 class 查 UiPlate.CITY_PLATE，缺图保留 CSS 渐变。
     *  弹层 CTA 走 _openPop 的 kind 路由，这里是主城页内手工建的键（商城购买 / 英雄养成五入）。 */
    protected _plateCityBtn(el: HTMLElement): void {
        const kind = UiPlate.cityKind(el);
        if (!kind) {
            return;
        }
        this._tex(UiPlate.CITY_PLATE[kind], UiPlate.nineSlice(el, 'plate'));
    }


    /** 主城按钮族一次性铺板：按 `UiPlate.CITY_BUTTON_PLATE` 的选择器优先级整族扫。
     *  原来只有「解锁大键」一处手工铺板，`.game-button`（开始守卫 / 十连 / 立即查看这些最大的 CTA）、
     *  侧栏 `.hot` 入口、编队行 `.hpick`、商城 `.gBuy` 全是 CSS 渐变——按钮类不成套就是这么来的。
     *  表里 `key: null` 的那几档（46×22 难度小键）是**故意不贴**：宿主比板厚四倍还小，贴上去整块糊掉。
     *  只扫 `.viewport` 里的五个页面：弹层的 CTA 由 `_openPop` 按 kind 路由，两套规则不要互相覆盖。
     *  调用时机不靠这里——见 `HomeUiMall._watchCityPlates`（页面每次重建都要重扫一遍，否则板子跟着 DOM 一起没了）。 */
    protected _plateCityButtons(): void {
        const view = this._root?.querySelector<HTMLElement>('.viewport');
        // 两张表两套扫描范围：按钮族只扫 `.viewport`（弹层 CTA 归 `_openPop` 路由，不许互相覆盖），
        // 容器族要连 `.viewport` 之外的 `.tabbar` 一起扫，所以它自带容器前缀。
        for (const [table, host] of [[UiPlate.CITY_BUTTON_PLATE, view], [UiPlate.SURFACE_PLATE, this._root]] as const) {
            if (!host) {
                continue;
            }
            for (const el of Array.from(host.querySelectorAll<HTMLElement>(table.map(r => r.sel).join(', ')))) {
                const hit = table.find(r => el.matches(r.sel));
                if (hit?.key) {
                    this._tex(hit.key, UiPlate.nineSlice(el, hit.spec));
                }
            }
        }
    }


    /** 斜切条族铺板（ART-PLAN §4.9 第 5 条；§10.1 选中抬起同表）。整 `#homeUi` 扫——
     *  顶栏那三枚资源胶囊不在 `.viewport` 里。带 `var` 的行（.res 斜带、.tab.on 抬起瓷砖）
     *  的板画在伪元素上，inline style 上不去，只能走 `nineSliceVar` 把切片参数落成
     *  自定义属性交给样式表（判据见 `UiPlate.BEVEL_PLATE` 那段注释）。
     *  调用时机与 `_plateCityButtons` 同一处：页面每次重建都要重扫。 */
    protected _plateBevels(): void {
        const root = this._root;
        if (!root) {
            return;
        }
        for (const el of Array.from(root.querySelectorAll<HTMLElement>(UiPlate.BEVEL_PLATE.map(r => r.sel).join(', ')))) {
            const hit = UiPlate.BEVEL_PLATE.find(r => el.matches(r.sel));
            if (!hit?.key) {
                continue;
            }
            this._tex(hit.key, hit.var
                ? UiPlate.nineSliceVar(el, hit.spec, hit.var)
                : UiPlate.nineSlice(el, hit.spec));
        }
    }


    /** 二级弹层族铺板：按 `UiPlate.POP_PLATE` 扫**当前 `.pop`**。单独一个扫描器不并进上面两张表，
     *  是因为扫描时机不同——弹层是重绘的临时 DOM，页面级扫描只在切页后跑、扫不到后开的弹层，
     *  所以每次 `_renderPop` 组装完都要对着弹层根重扫一遍（行卡/页签/挑选格/材料槽就在这一步接板）。 */
    protected _platePop(pop: HTMLElement): void {
        for (const el of Array.from(pop.querySelectorAll<HTMLElement>(UiPlate.POP_PLATE.map(r => r.sel).join(', ')))) {
            const hit = UiPlate.POP_PLATE.find(r => el.matches(r.sel));
            if (hit?.key) {
                this._tex(hit.key, UiPlate.nineSlice(el, hit.spec));
            }
        }
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
                // 画布在超长屏上按高度铺满时 CSS 宽会超出视口；DOM 覆盖层必须按视口宽缩放，
                // 否则 --pw 偏大导致 HUD 超屏被裁。取画布宽与视口宽的较小值。
                const w = Math.min(canvas.getBoundingClientRect().width, window.innerWidth);
                // --hs：设计宽 1080 缩放；--pw：布局稿 390×844 手机框等比缩放（青瓷覆盖层用）。
                // 390 是布局稿画框宽度：以它为基准，真机 390 宽时逐条与稿 1:1，更宽屏等比放大。
                document.documentElement.style.setProperty('--hs', (w / 1080).toFixed(4));
                document.documentElement.style.setProperty('--pw', (w / 390).toFixed(4));
            }
            this._applySafeArea();
        };
        applyScale();
        window.addEventListener('resize', applyScale);
        window.addEventListener('orientationchange', applyScale);
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
        // 新邮件到达（投放器/运营接口触发）：toast 提醒 + 顶栏红点实时亮起
        eventCenter.on(GameEvent.MAIL_NEW, (def: MailDef) => {
            if (this._root) {
                this._toast(`📬 新邮件：${def.title}`);
                this._refreshTop();
            }
        }, this);
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
        clearTimeout(this._pendingTexTimer);
        this._pendingTexTimer = 0;
        this._root?.remove();
        this._root = null;
    }


    protected show(): void {
        if (this._root) {
            // 每日/回归邮件投放（内部按天去重，重复调用安全）
            MailSystem.instance.feedDaily();
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


    /** L2 半屏抽屉（底部滑出）：编队/批量操作等中低高度流程；复用 protoMask 类保证就地重开逻辑兼容 */
    protected _openSheet(title: string, buildBody: (box: HTMLDivElement, close: () => void) => void): void {
        if (!this._root || this._legacyMaskOpen()) {
            return;
        }
        const mask = document.createElement('div');
        mask.className = 'protoMask sheetMask';
        this._stackOverPop(mask);
        mask.onclick = (e) => {
            e.stopPropagation();
            if (e.target === mask) {
                mask.remove();
            }
        };
        const box = document.createElement('div');
        box.className = 'mbox frame sheetBox';
        box.onclick = (e) => e.stopPropagation();
        const head = document.createElement('div');
        head.className = 'mHead';
        const grip = document.createElement('i');
        grip.className = 'sheetGrip';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const x = document.createElement('button');
        x.className = 'mClose';
        x.textContent = '✕';
        x.onclick = (e) => {
            e.stopPropagation();
            mask.remove();
        };
        head.appendChild(grip);
        head.appendChild(h3);
        head.appendChild(x);
        box.appendChild(head);
        const close = () => mask.remove();
        buildBody(box, close);
        mask.appendChild(box);
        this._root.appendChild(mask);
    }


    /** L4 全屏结果层：招募揭示/大额奖励等强反馈场景；复用 protoMask 类保证就地重开逻辑兼容 */
    protected _openResult(title: string, buildBody: (box: HTMLDivElement, close: () => void) => void): void {
        if (!this._root || this._legacyMaskOpen()) {
            return;
        }
        const mask = document.createElement('div');
        mask.className = 'protoMask resultMask';
        this._stackOverPop(mask);
        mask.onclick = (e) => {
            e.stopPropagation();
            if (e.target === mask) {
                mask.remove();
            }
        };
        const box = document.createElement('div');
        box.className = 'mbox frame resultBox';
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


    // ================= 二级弹层系统（UX 布局稿 §0 落地） =================

    protected _popMask: HTMLDivElement | null = null;

    protected _popOpts: PopOpts | null = null;

    /** 钻取返回栈：push 打开的层压栈，左上返回逐级回退（最多保留 2 跳） */
    protected _popStack: PopOpts[] = [];

    /** 元素工厂（新弹层内部使用，避免与既有 createElement 样板重复） */
    protected _el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, txt?: string): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        if (cls) {
            el.className = cls;
        }
        if (txt !== undefined) {
            el.textContent = txt;
        }
        return el;
    }

    protected _esc(s: string): string {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * 二级弹层统一入口（五段式）：
     * 头部区[固定] → 说明·页签区[固定] → 内容区[唯一滚动轴] → 消耗·槽位区[固定] → CTA 底栏[固定]
     * 同层就地替换：同一时刻 #homeUi 下只保留一个 .protoMask，沿用既有重入判断语义。
     */
    protected _openPop(opts: PopOpts): void {
        if (!this._root) {
            return;
        }
        if (opts.push && this._popOpts) {
            this._popStack.push(this._popOpts);
            if (this._popStack.length > 2) {
                this._popStack.shift();
            }
        } else {
            this._popStack = [];
        }
        this._renderPop(opts);
    }

    /** 就地重绘当前弹层（保留滚动位置）：领取/切换等状态变化后调用；传入 next 可换用新入参 */
    protected _popRebuild(next?: PopOpts): void {
        if (next) {
            this._popOpts = next;
        }
        if (this._popOpts) {
            this._renderPop(this._popOpts, true);
        }
    }

    protected _popOpen(): boolean {
        return !!this._popMask;
    }

    /** 关闭整层（清空返回栈）；右上 ✕ 与遮罩点击走这里 */
    protected _closePop(): void {
        const opts = this._popOpts;
        this._popMask?.remove();
        this._popMask = null;
        this._popOpts = null;
        this._popStack = [];
        opts?.onClose?.();
    }

    /** 旧弹窗是否已开（旧弹窗之间互斥；新弹层不挡旧弹窗，二者可叠放） */
    protected _legacyMaskOpen(): boolean {
        return !!document.querySelector('#homeUi .protoMask:not(.popL2):not(.popL3):not(.popL4):not(.popL5)');
    }

    /** 旧弹窗叠在新弹层之上时抬到层级 250，关闭后自然回到下方新弹层 */
    private _stackOverPop(mask: HTMLDivElement): void {
        if (document.querySelector('#homeUi .pop')) {
            mask.classList.add('popAbove');
        }
    }

    /** 关闭最上层弹窗（旧弹窗/新弹层共存时的统一出口，避免误删底层弹层） */
    protected _closeTopMask(): void {
        const all = this._root?.querySelectorAll('.protoMask');
        if (all && all.length) {
            all[all.length - 1].remove();
        }
    }

    /** 返回上一级：栈空则关闭整层 */
    protected _popBack(): void {
        const prev = this._popStack.pop();
        if (prev) {
            this._renderPop(prev);
            return;
        }
        this._closePop();
    }

    private _renderPop(opts: PopOpts, keepScroll = false): void {
        const root = this._root;
        if (!root) {
            return;
        }
        const prevScroll = keepScroll ? (root.querySelector('.popScroll') as HTMLElement | null)?.scrollTop ?? 0 : 0;
        root.querySelectorAll('.protoMask').forEach(m => m.remove());

        const tier = opts.tier ?? 3;
        const size = opts.size ?? 'M';
        const closable = opts.closable ?? true;
        const canBack = this._popStack.length > 0 || !!opts.onBack;
        const goBack = (): void => {
            SoundFx.play('ui');
            if (opts.onBack) {
                opts.onBack();
                return;
            }
            this._popBack();
        };

        const mask = this._el('div', `protoMask popL${tier}`);
        const maskClose = opts.maskClose ?? (tier !== 5 && size !== 'XL');
        mask.onclick = (e) => {
            e.stopPropagation();
            if (e.target !== mask) {
                return;
            }
            if (maskClose) {
                this._closePop();
                return;
            }
            // 不可关的层级（L5 演出 / XL 满屏）也要给出口：静默无反应等于死键（UX 0-4）。
            // XL 铺满整屏本就点不到遮罩，这里实际服务 L5。
            this._toast('本层需用底部命令关闭，避免误触中断');
        };
        const pop = this._el('div', `pop ${size} L${tier}`);
        pop.onclick = (e) => e.stopPropagation();
        // 弹层底板走九宫格 border-image（面板框图自带边框；XL 满屏演出层保持平铺底色）
        if (size !== 'XL') {
            this._tex(size === 'S' ? 'ui/panel/panel_sub' : 'ui/panel/panel_main', UiPlate.nineSlice(pop, 'panel'));
        }

        // —— 1. 头部区（固定）：横幅 / 品质头 / 细标题条 ——
        const closeBtn = () => {
            const x = this._el('div', 'popClose', '✕');
            // 红 X 金属板：contain 适配小方钮，边框隐去由图自带
            this._tex('ui/button/btn_close', UiPlate.icon(x, { hideBorder: true }));
            x.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._closePop();
            };
            return x;
        };
        const backBtn = () => {
            const b = this._el('div', 'popBack', '‹');
            // 圆形金属小钮做返回键底，‹ 字符压在板面上（keepGlyph：这块的 glyph 是功能符号，不是占位）
            this._tex('ui/button/btn_round', u => {
                UiPlate.icon(b, { color: '#e9f2fb', keepGlyph: true })(u);
            });
            b.onclick = (e) => {
                e.stopPropagation();
                goBack();
            };
            return b;
        };
        if (opts.banner) {
            const head = this._el('div', 'popBanner');
            // 木质标题绶带做横幅底（100% 拉伸铺满，边框/底色交图）
            this._tex('ui/banner/ribbon_banner', UiPlate.strip(head));
            head.appendChild(this._el('b', undefined, opts.banner));
            if (opts.art) {
                head.appendChild(this._el('div', 'art', opts.art));
            }
            if (canBack) {
                head.appendChild(backBtn());
            } else if (closable) {
                head.appendChild(closeBtn());
            }
            pop.appendChild(head);
        } else if (opts.quality) {
            const q = opts.quality;
            const head = this._el('div', `popQ q${q.q}`);
            const qi = this._el('div', 'qi', q.icon);
            // 品质框唯一真源（frame_q0~q3 白绿蓝紫）：框图压在道具图标外圈，同位 glyph 保留；
            // CSS 的 .qi 白边只作缺图回退，不再当第二套品质边框实现。
            this._tex(UiPlate.QUALITY_FRAME[q.q - 1] ?? UiPlate.QUALITY_FRAME[0],
                UiPlate.icon(qi, { hideBorder: true, keepGlyph: true }));
            if (q.tier) {
                qi.appendChild(this._el('span', 'qtag', q.tier));
            }
            head.appendChild(qi);
            const qm = this._el('div', 'qm');
            qm.appendChild(this._el('b', undefined, q.name));
            if (q.stats?.length) {
                const qs = this._el('div', 'qs');
                q.stats.forEach(s => qs.appendChild(this._el('span', undefined, s)));
                qm.appendChild(qs);
            }
            head.appendChild(qm);
            if (canBack) {
                head.appendChild(backBtn());
            } else if (closable) {
                head.appendChild(closeBtn());
            }
            pop.appendChild(head);
        } else if (opts.title) {
            const head = this._el('div', 'popTop', opts.title);
            // 金属标题条做细标题底（100% 拉伸铺满）
            this._tex('ui/banner/bar_title', UiPlate.strip(head));
            if (canBack) {
                head.insertBefore(backBtn(), head.firstChild);
            }
            if (closable) {
                head.appendChild(closeBtn());
            }
            pop.appendChild(head);
        }

        // —— XL 展示台（固定在头部之下） ——
        if (opts.show) {
            const sh = this._el('div', 'popShow');
            const ped = this._el('div', 'popPedestal', opts.show.icon);
            if (opts.show.tier) {
                ped.appendChild(this._el('span', 'popTierTag', opts.show.tier));
            }
            sh.appendChild(ped);
            if (opts.show.name) {
                sh.appendChild(this._el('div', 'popName', opts.show.name));
            }
            if (opts.show.sub) {
                sh.appendChild(this._el('div', 'popSub2', opts.show.sub));
            }
            pop.appendChild(sh);
        }

        // —— 2. 说明行 / 页签 / 固定筛选条 ——
        if (opts.subtitle) {
            const meta = this._el('div', 'popMeta');
            meta.appendChild(this._el('span', undefined, opts.subtitle));
            if (opts.help) {
                const q = this._el('div', 'q', '?');
                // 圆板备用件做帮助钮底（? 是功能符号，压在板面上）
                this._tex('ui/button/btn_round2', UiPlate.icon(q, { hideBorder: true, keepGlyph: true }));
                q.onclick = (e) => {
                    e.stopPropagation();
                    opts.help!();
                };
                meta.appendChild(q);
            }
            pop.appendChild(meta);
        }
        if (opts.tabs?.length) {
            const bar = this._el('div', 'popTabs');
            opts.tabs.forEach((label, i) => {
                const t = this._el('div', i === (opts.tab ?? 0) ? 'on' : undefined, label);
                t.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    opts.onTab?.(i);
                };
                bar.appendChild(t);
            });
            pop.appendChild(bar);
        }
        if (opts.fixed) {
            const bar = this._el('div', 'popFixBar');
            opts.fixed(bar);
            pop.appendChild(bar);
        }

        // —— 3. 内容滚动区（唯一滚动轴） ——
        const scroll = this._el('div', 'popScroll');
        opts.build(scroll);
        if (size !== 'S') {
            scroll.appendChild(this._el('div', 'popFade'));
        }
        pop.appendChild(scroll);

        // —— 4. 消耗行（固定，不足标红） ——
        if (opts.cost?.length) {
            const cr = this._el('div', 'popCost');
            opts.cost.forEach(c => {
                const one = this._el('div', 'c');
                one.appendChild(this._el('div', 'ci', c.icon));
                const lack = c.have < c.need;
                one.appendChild(this._el('div', `cv ${lack ? 'lack' : 'ok'}`, `${c.have}/${c.need}`));
                cr.appendChild(one);
            });
            pop.appendChild(cr);
        }

        // —— 5. CTA 底栏（固定；S 档按 game-ux 稿 §1 并入内容尾：双键 46/54 分，不另起固定栏） ——
        if (opts.ctas?.length || opts.note) {
            const cta = this._el('div', `popCTA${size === 'S' ? ' tail' : ''}`);
            if (opts.ctas?.length) {
                const multi = opts.ctas.length > 1;
                const row = this._el('div', `row${multi ? '' : ' justify'}`);
                opts.ctas.forEach(c => {
                    const b = this._el('div',
                        `popBtn ${c.kind ?? 'gold'}${multi ? ' wide' : ''}${c.disabled ? ' disabled' : ''}`, c.label);
                    // 语义 → 去字底板只查 UiPlate.PLATE（旧版按中文文案正则猜板，改一句文案就掉板）。
                    // 禁用态照样贴板，置灰由 .popBtn.disabled 的 CSS filter 派生（态策略见 STYLE-SPEC §10）。
                    const plate = UiPlate.plateOf(c.kind);
                    if (plate) {
                        this._tex(plate, u => {
                            UiPlate.nineSlice(b, 'plate')(u);
                            if (c.kind === 'grey') {
                                b.style.color = '#e9f2fb';
                            }
                        });
                    }
                    if (c.red) {
                        b.appendChild(this._el('i', 'popRed'));
                    }
                    b.onclick = (e) => {
                        e.stopPropagation();
                        if (c.disabled) {
                            // 禁用态仍可点：给出缺口说明或拦截弹窗，不打开新的执行层（UX 0-4）
                            c.onDisabled?.();
                            return;
                        }
                        SoundFx.play('ui');
                        c.onClick();
                    };
                    row.appendChild(b);
                });
                cta.appendChild(row);
            }
            if (opts.note) {
                cta.appendChild(this._el('div', 'note', opts.note));
            }
            (size === 'S' ? scroll : pop).appendChild(cta);
        }

        // —— 6. 槽位条（固定） ——
        if (opts.slots) {
            const sb = this._el('div', 'popSlots');
            opts.slots(sb);
            pop.appendChild(sb);
        }

        // —— 7. 底部操作栏（XL 二级页：返回 + 页签） ——
        if (opts.barBack || opts.barTabs?.length) {
            const bar = this._el('div', 'popBar');
            if (opts.barBack) {
                const bk = this._el('div', 'bk', opts.barTabs?.length ? '↩' : '←');
                bk.onclick = (e) => {
                    e.stopPropagation();
                    goBack();
                };
                bar.appendChild(bk);
            }
            if (opts.barTabs?.length) {
                const pt = this._el('div', 'pt');
                opts.barTabs.forEach(t => {
                    const one = this._el('div', t.on ? 'on' : undefined);
                    one.appendChild(this._el('i', undefined, t.icon));
                    one.appendChild(this._el('span', undefined, t.label));
                    if (t.red) {
                        one.appendChild(this._el('i', 'popRed'));
                    }
                    one.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        t.onClick();
                    };
                    pt.appendChild(one);
                });
                bar.appendChild(pt);
            }
            pop.appendChild(bar);
        }

        mask.appendChild(pop);
        this._platePop(pop);
        root.appendChild(mask);
        this._popMask = mask;
        this._popOpts = opts;
        if (prevScroll) {
            scroll.scrollTop = prevScroll;
        }
    }

    /** 组件：列表行（图标 + 两行文本 + 状态列 + 行内动作 + 红点） */
    protected _popRow(o: PopRowOpts): HTMLElement {
        const row = this._el('div', `popRow${o.expired ? ' expired' : ''}${o.on ? ' on' : ''}`);
        if (o.onClick) {
            row.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                o.onClick!();
            };
        }
        if (o.red) {
            row.appendChild(this._el('i', 'popRed'));
        }
        const ic = this._el('div', 'ic', o.icon ?? '📦');
        row.appendChild(ic);
        const m = this._el('div', 'm');
        m.appendChild(this._el('b', undefined, o.title));
        if (o.tag || o.lines?.length) {
            const ln = this._el('div', 'ln');
            if (o.tag) {
                ln.appendChild(this._el('span', 'd', o.tag));
            }
            (o.lines ?? []).forEach(t => {
                const text = typeof t === 'string' ? t : t.text;
                const kind = typeof t === 'string' ? '' : t.kind ?? '';
                ln.appendChild(this._el('span', kind || undefined, text));
            });
            m.appendChild(ln);
        }
        if (o.progress !== undefined) {
            const pbar = this._el('div', 'pbar');
            const fill = this._el('i');
            fill.style.width = `${Math.round(Math.max(0, Math.min(1, o.progress)) * 100)}%`;
            pbar.appendChild(fill);
            this._barTex(pbar, fill, 'ui/progress/bar_fill_green');
            m.appendChild(pbar);
        }
        row.appendChild(m);
        if (o.status) {
            const st = this._el('div', 'st', o.status);
            if (o.statusKind === 'expire') {
                st.style.color = 'var(--pred2)';
            } else if (o.statusKind === 'soon') {
                st.style.color = 'var(--pks)';
            }
            row.appendChild(st);
        }
        if (o.action) {
            const kind = o.action.kind && o.action.kind !== 'green' ? ` ${o.action.kind}` : '';
            const act = this._el('div', `act${kind}${o.action.disabled ? ' off' : ''}`, o.action.label);
            act.onclick = (e) => {
                e.stopPropagation();
                if (o.action!.disabled) {
                    o.action!.onDisabled?.();
                    return;
                }
                SoundFx.play('ui');
                o.action!.onClick();
            };
            row.appendChild(act);
        }
        if (o.iconTex) {
            this._tex(o.iconTex, UiPlate.icon(ic, { size: 'cover' }));
        }
        if (o.frameTex) {
            // 框件后挂：只吃 border 区，不覆盖 iconTex 写进去的背景
            this._tex(o.frameTex, UiPlate.frame(ic));
        }
        return row;
    }

    /** 组件：属性行（说明里的 **xx** 高亮为 em，行尾可挂动作按钮或空插槽） */
    protected _popAttr(o: PopAttrOpts): HTMLElement {
        const row = this._el('div', `popAttr${o.empty ? ' empty' : ''}`);
        const ai = this._el('div', 'ai', o.empty ? '＋' : o.icon ?? '🔹');
        if (o.iconTex) {
            this._tex(o.iconTex, UiPlate.icon(ai));
        }
        row.appendChild(ai);
        const at = this._el('div', 'at');
        at.innerHTML = this._esc(o.text).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');
        row.appendChild(at);
        if (o.action) {
            const b = this._el('div', `abAct${o.action.kind === 'info' ? ' info' : ''}`, o.action.label);
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                o.action!.onClick();
            };
            row.appendChild(b);
        } else if (o.slot) {
            row.appendChild(this._el('div', 'ab', '＋'));
        }
        return row;
    }

    /** 组件：对比块（战力/属性 拆解与预览） */
    protected _popCmp(title: string, lines: Array<{ label: string; old: string; now: string }>): HTMLElement {
        const box = this._el('div', 'popCmp');
        box.appendChild(this._el('div', 'ch', title));
        const body = this._el('div', 'cb');
        lines.forEach(l => {
            const cl = this._el('div', 'cl');
            cl.appendChild(this._el('span', 'lbl', l.label));
            cl.appendChild(this._el('span', 'old', l.old));
            cl.appendChild(this._el('span', 'arrow', '▶'));
            cl.appendChild(this._el('span', 'new', l.now));
            body.appendChild(cl);
        });
        box.appendChild(body);
        return box;
    }

    /** 组件：KV 行（.total 合计强调 / .free 去下边框） */
    protected _popKV(label: string, value: string, cls?: 'total' | 'free'): HTMLElement {
        const row = this._el('div', `popKV${cls ? ` ${cls}` : ''}`);
        row.appendChild(this._el('span', undefined, label));
        row.appendChild(this._el('b', undefined, value));
        return row;
    }

    /** 组件：格子网格（装备/材料/宝石/层格） */
    protected _popGrid(
        items: Array<{ icon: string; count?: number | string; sel?: boolean; title?: string; tex?: string }>,
        cols: 3 | 4 | 5,
        onPick?: (i: number) => void
    ): HTMLElement {
        const grid = this._el('div', `popGrid c${cols}`);
        items.forEach((it, i) => {
            const cell = this._el('i', it.sel ? 'sel' : undefined, it.icon);
            if (it.tex) { this._tex(it.tex, UiPlate.icon(cell, { keepGlyph: true })); }
            if (it.title) {
                cell.title = it.title;
            }
            if (it.count !== undefined) {
                cell.appendChild(this._el('span', 'cnt', String(it.count)));
            }
            if (it.sel) {
                cell.appendChild(this._el('span', 'ck', '✓'));
            }
            if (onPick) {
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    onPick(i);
                };
            }
            grid.appendChild(cell);
        });
        return grid;
    }

    /** 组件：卡片行（招募/奖励揭示） */
    protected _popCardRow(cards: Array<{ icon: string; name: string; badge?: string; dup?: boolean }>): HTMLElement {
        const row = this._el('div', 'popCardRow');
        cards.forEach(c => {
            const card = this._el('div', 'popCard');
            card.appendChild(this._el('div', 'gi', c.icon));
            card.appendChild(this._el('div', undefined, c.name));
            if (c.badge) {
                card.appendChild(this._el('div', `nb${c.dup ? ' dup' : ''}`, c.badge));
            }
            row.appendChild(card);
        });
        return row;
    }

    /** 组件：空态（无数据/筛选无结果） */
    protected _popEmpty(text: string, hint?: string, icon = EMPTY_SLOT): HTMLElement {
        const box = this._el('div', 'popEmpty');
        const asKey = icon.startsWith('ui/');
        // 传贴图 key 时也先摆占位字形：预载没回来那一刻不能留一个空槽，图到位由 icon() 摘掉
        const ei = this._el('div', 'ei', asKey ? EMPTY_GLYPH : icon);
        // icon 传贴图 key（'ui/…' 前缀）时回填素材图，否则按 emoji 占位
        if (asKey) {
            this._tex(icon, UiPlate.icon(ei));
        }
        box.appendChild(ei);
        box.appendChild(this._el('div', undefined, text));
        if (hint) {
            box.appendChild(this._el('small', undefined, hint));
        }
        return box;
    }

    /** 空装备槽的底纹：槽里垫一枚这一位的暗色剪影，让空位读成"这格收头盔"而不是"这格没做" */
    protected _slotGhost(host: HTMLElement, key: string): void {
        const g = this._el('i', 'slotGhost');
        host.appendChild(g);
        this._tex(key, UiPlate.icon(g));
    }

    /** 组件：分组小标题 */
    protected _popSec(text: string): HTMLElement {
        return this._el('div', 'popSec', text);
    }

    /** 组件：固定条里的静态信息胶囊（不响应点击：倒计时/口径说明） */
    protected _popInfo(text: string, on = false): HTMLElement {
        return this._el('div', `popChip${on ? ' on' : ''}`, text);
    }

    /** 组件：筛选胶囊（放入 PopOpts.fixed 的固定条中） */
    protected _popChip(text: string, on: boolean, onClick: () => void): HTMLElement {
        const chip = this._el('div', `popChip${on ? ' on' : ''}`, text);
        chip.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            onClick();
        };
        return chip;
    }

    /** 组件：槽位格（放入 PopOpts.slots 的固定条中） */
    protected _popSlot(o: { icon: string; tier?: string; on?: boolean; red?: boolean; onClick?: () => void }): HTMLElement {
        const cell = this._el('div', `sc${o.on ? ' on' : ''}`, o.icon);
        if (o.tier) {
            cell.appendChild(this._el('span', 'tg', o.tier));
        }
        if (o.red) {
            cell.appendChild(this._el('i', 'rd'));
        }
        if (o.onClick) {
            cell.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                o.onClick!();
            };
        }
        return cell;
    }

    /**
     * 二次确认模板（L3 · S）：大图标 + 说明 + 可选消耗/预览 + 取消·确认双按钮。
     * push 打开，取消/确认后回到上级层；confirm 由调用方决定危险色。
     */
    protected _popConfirm(o: {
        title: string;
        icon?: string;
        desc: string;
        cost?: Array<{ icon: string; have: number; need: number }>;
        preview?: HTMLElement;
        ok: string;
        cancel?: string;
        danger?: boolean;
        note?: string;
        onOk: () => void;
        onCancel?: () => void;
    }): void {
        this._openPop({
            tier: 3,
            size: 'S',
            title: o.title,
            push: true,
            cost: o.cost,
            note: o.note,
            build: c => {
                const center = this._el('div', 'popCenter');
                if (o.icon) {
                    // 与 _popEmpty 同一条口径：icon 传 'ui/…' 前缀即贴图 key，否则按 emoji 占位
                    const asKey = o.icon.startsWith('ui/');
                    const big = this._el('div', 'popIcBig', asKey ? '' : o.icon);
                    if (asKey) {
                        this._tex(o.icon, UiPlate.icon(big));
                    }
                    center.appendChild(big);
                }
                center.appendChild(this._el('div', 'popDesc', o.desc));
                c.appendChild(center);
                if (o.preview) {
                    c.appendChild(o.preview);
                }
            },
            ctas: [
                {
                    label: o.cancel ?? '取消',
                    kind: 'grey',
                    onClick: () => {
                        if (o.onCancel) {
                            o.onCancel();
                            return;
                        }
                        this._popBack();
                    }
                },
                {
                    label: o.ok,
                    kind: o.danger ? 'danger' : 'gold',
                    onClick: () => o.onOk()
                }
            ]
        });
    }


    /**
     * 拦截型 S 弹窗（UX 3-C）：体力不足 / 未解锁等硬拦截只给两条出路（等待 / 获取），
     * 不出现「取消」干扰项。右按钮是获取路径，左按钮是「再等等」（仅退出，不算取消）。
     */
    protected _popIntercept(o: {
        title: string;
        icon: string;
        rows: Array<{ icon?: string; text: string }>;
        note?: string;
        ok: { label: string; kind?: PopCta['kind']; onClick: () => void };
        stayLabel?: string;
    }): void {
        this._openPop({
            tier: 3,
            size: 'S',
            title: o.title,
            push: true,
            build: c => {
                const center = this._el('div', 'popCenter');
                center.appendChild(this._el('div', 'popIcBig', o.icon));
                c.appendChild(center);
                for (const r of o.rows) {
                    c.appendChild(this._popAttr({ icon: r.icon, text: r.text }));
                }
            },
            ctas: [
                {
                    label: o.stayLabel ?? '再 等 等',
                    kind: 'grey',
                    onClick: () => this._popBack()
                },
                {
                    label: o.ok.label,
                    kind: o.ok.kind ?? 'green',
                    onClick: o.ok.onClick
                }
            ],
            note: o.note
        });
    }


    /**
     * 体力不足拦截（3-C 母版）：给需求/当前存量/恢复时间，出路为看广告（额度用尽则钻石购买，
     * 都不行则退回体力补给面板——仍是「获取」而非「取消」）。
     */
    protected _openStaminaGate(need: number, after?: () => void, stayLabel?: string): void {
        const gm = GameManager.instance;
        const cur = gm.stamina();
        const max = gm.staminaMax();
        const adLeft = AdService.instance.remaining('stamina');
        const diamonds = gm.res.get('diamond');
        const nextIn = gm.staminaNextIn();
        const ss = nextIn % 60;
        const waitText = nextIn <= 0
            ? '即将恢复 1 点'
            : `距自然恢复 ${Math.floor(nextIn / 60)}:${ss < 10 ? '0' + ss : ss}`;
        const done = (): void => {
            // 领到体力后回到来处（副本页/关卡页），由调用方决定是否就地重绘
            this._popBack();
            after?.();
        };
        let ok: { label: string; kind?: PopCta['kind']; onClick: () => void };
        if (adLeft > 0) {
            ok = {
                label: `📺 看广告 +${MALL_AD_STAMINA}`,
                kind: 'ad',
                onClick: () => {
                    SoundFx.unlock();
                    AdService.instance.claimReward('stamina', () => {
                        gm.res.add('stamina', MALL_AD_STAMINA);
                        SoundFx.play('coin');
                        this._toast(`体力 +${MALL_AD_STAMINA}`);
                        this._refreshTop();
                        done();
                    });
                }
            };
        } else if (diamonds >= STAMINA_BUY_COST) {
            ok = {
                label: `💎 ${STAMINA_BUY_COST} 买 ${STAMINA_BUY_N} 点`,
                kind: 'gold',
                onClick: () => {
                    SoundFx.unlock();
                    if (gm.buyStamina(STAMINA_BUY_N, STAMINA_BUY_COST)) {
                        SoundFx.play('buy');
                        this._toast(`体力 +${STAMINA_BUY_N}`);
                        this._refreshTop();
                        done();
                    }
                }
            };
        } else {
            ok = {
                label: '前 往 获 取',
                kind: 'gold',
                onClick: () => {
                    this._closePop();
                    this._openStaminaModal();
                }
            };
        }
        this._popIntercept({
            title: '体力不足',
            icon: '🍖',
            rows: [
                { icon: '⚡', text: `本次需要 **${need}** 点体力` },
                { icon: '🍖', text: `当前 **${cur}/${max}** ｜ ${waitText}` }
            ],
            ok,
            stayLabel,
            note: `也可用 💎 ${STAMINA_BUY_COST} 购买 +${STAMINA_BUY_N} 体力 · 今日广告额度 ${adLeft} 次`
        });
    }


    /** 未解锁拦截（3-C）：说明解锁条件 + 两条出路（知道了 / 前往条件所在地） */
    protected _openUnlockGate(
        title: string,
        icon: string,
        reason: string,
        goLabel = '前 往 关 卡',
        go?: () => void,
        note = '解锁进度随主线推进自动刷新'
    ): void {
        this._popIntercept({
            title,
            icon,
            rows: [{ icon: '🔒', text: reason }],
            ok: {
                label: goLabel,
                kind: 'gold',
                onClick: () => {
                    this._closePop();
                    if (go) {
                        go();
                    } else {
                        this._switchPage('battle');
                    }
                }
            },
            stayLabel: '知 道 了',
            note
        });
    }


    // ================= 顶栏（全局） =================

    /**
     * HUD 通栏（五页共用）：左侧竖版头像（等级角标压左上角、绝对定位），
     * 右侧两行——上排三资源等分，下排昵称 + 经验条 + 邮箱/设置小图标。
     * 内容整体右移让位头像，整条 64px（原型口径）。
     */
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
        // 头像底图 = commander（照片类，cover 口径由参数给出），到位即顶掉 emoji
        this._tex('characters/commander', UiPlate.icon(face, { size: '180% auto', position: 'center 8%' }));
        avatar.appendChild(face);
        // 等级角标压在头像左上角外沿（布局稿 .portrait strong），头像即等级入口
        const lvBadge = document.createElement('b');
        lvBadge.className = 'lvtag';
        lvBadge.textContent = '12';
        avatar.appendChild(lvBadge);
        bar.appendChild(avatar);
        const reswrap = document.createElement('div');
        reswrap.className = 'reswrap';
        const mkRes = (id: 'gold' | 'diamond' | 'stamina', texKey: string) => {
            const chip = document.createElement('div');
            chip.className = 'res';
            const ico = document.createElement('span');
            // 尺寸归 CSS（.res > span:first-child 两层各自覆盖），JS 只挂图
            this._tex(texKey, UiPlate.icon(ico));
            chip.appendChild(ico);
            const b = document.createElement('b');
            chip.appendChild(b);
            const add = document.createElement('span');
            add.className = 'add';
            add.textContent = '+';
            // 顶栏「+」由文本符号换成在库加号件（尺寸归 .res .add 两层，缺图保留 '+'）
            this._tex('ui/ico/ico_add', UiPlate.icon(add));
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
        mkRes('gold', 'ui/res/res_gold');
        mkRes('diamond', 'ui/res/res_diamond');
        mkRes('stamina', 'ui/res/res_stamina');
        bar.appendChild(reswrap);
        // 下排：昵称 + 经验条（+ 进度文案）｜右侧邮箱 / 设置两个小图标
        const identity = document.createElement('div');
        identity.className = 'identity';
        const idLeft = document.createElement('div');
        idLeft.className = 'idLeft';
        const nameRow = document.createElement('span');
        nameRow.className = 'pname';
        nameRow.textContent = '指挥官将军';
        const xpRow = document.createElement('div');
        xpRow.className = 'xpRow';
        const exp = document.createElement('div');
        exp.className = 'expbar';
        const fill = document.createElement('i');
        exp.appendChild(fill);
        this._barTex(exp, fill, 'ui/progress/bar_fill_blue');
        const expnum = document.createElement('span');
        expnum.className = 'expnum';
        xpRow.appendChild(exp);
        xpRow.appendChild(expnum);
        idLeft.appendChild(nameRow);
        idLeft.appendChild(xpRow);
        identity.appendChild(idLeft);
        this._expFill = fill;
        this._expNum = expnum as HTMLDivElement;
        const util = document.createElement('div');
        util.className = 'hudUtil';
        const mailBtn = document.createElement('button');
        mailBtn.className = 'tinyIcon homeMailBtn';
        mailBtn.textContent = '📬';
        mailBtn.title = '邮箱';
        // 邮箱铁皮箱图标替换 emoji
        this._tex('ui/ico/ico_mail', UiPlate.icon(mailBtn, { hideBorder: true }));
        mailBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openMailModal();
        };
        util.appendChild(mailBtn);
        this._homeMailBtn = mailBtn;
        const noticeBtn = document.createElement('button');
        noticeBtn.className = 'tinyIcon homeNoticeBtn';
        noticeBtn.textContent = '📣';
        noticeBtn.title = '游戏公告';
        // 军喇叭公告图标替换 emoji
        this._tex('ui/ico/ico_notice', UiPlate.icon(noticeBtn, { hideBorder: true }));
        noticeBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openNoticeModal();
        };
        util.appendChild(noticeBtn);
        this._homeNoticeBtn = noticeBtn;
        const gear = document.createElement('button');
        gear.className = 'tinyIcon';
        gear.textContent = '⚙️';
        gear.title = '设置';
        // 齿轮图标替换 emoji
        this._tex('ui/ico/ico_setting', UiPlate.icon(gear, { hideBorder: true }));
        gear.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openSettingsModal();
        };
        util.appendChild(gear);
        identity.appendChild(util);
        bar.appendChild(identity);
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
        // 邮箱未读红点（新邮件到达/已读实时同步）
        this._homeMailBtn?.classList.toggle('unread', MailSystem.instance.hasUnread());
        this._homeNoticeBtn?.classList.toggle('unread', NoticeSystem.instance.hasUnread());
        // 经验条（占位口径：最远波次 / 100）
        if (this._expFill) {
            const pct = Math.min(100, Math.round(gm.bestWave));
            this._expFill.style.width = `${Math.max(5, pct)}%`;
        }
        if (this._expNum) {
            this._expNum.textContent = `波次 ${gm.bestWave} · 通关 ${gm.stageCleared}/${FINAL_STAGE_ID} 章`;
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
            { key: 'battle', icon: '🚚', name: '出征' },
            { key: 'core', icon: '🎮', name: '行动' },
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
            const texKey = UiPlate.NAV_PLATE[item.key];
            if (texKey) {
                // 页签 → 槽位查表；尺寸交 CSS（五签等分，选中态放大由 .tab.on 覆盖）——
                // 内联尺寸会压掉覆盖规则，glyph 由贴图到位时摘除，缺图仍是 emoji 占位
                this._tex(texKey, UiPlate.icon(icon));
            }
            nav.appendChild(btn);
            this._navBtns[item.key] = btn;
        }
        root.appendChild(nav);
    }


    /** 胶囊禁入区：读系统安全区 env() 填充 --sat/--sab 令牌（刘海屏/虚拟条避让；env 不可用时回退 0）。
     * 微信/部分安卓 WebView 对普通流内元素可能报 env()=0，故再挂一个 fixed 全屏探针兜底取最大值。 */
    protected _applySafeArea(): void {
        try {
            const probe = document.createElement('div');
            probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;'
                + 'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
            const probe2 = document.createElement('div');
            probe2.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;'
                + 'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
            document.body.appendChild(probe);
            document.body.appendChild(probe2);
            const cs = getComputedStyle(probe);
            const cs2 = getComputedStyle(probe2);
            const top = Math.max(parseFloat(cs.paddingTop) || 0, parseFloat(cs2.paddingTop) || 0);
            const bottom = Math.max(parseFloat(cs.paddingBottom) || 0, parseFloat(cs2.paddingBottom) || 0);
            probe.remove();
            probe2.remove();
            document.documentElement.style.setProperty('--sat', `${top}px`);
            document.documentElement.style.setProperty('--sab', `${bottom}px`);
        } catch (e) { /* 忽略：令牌保持默认 0px */ }
    }


    /** 整页底当前已应用到的 key（贴图异步落位，连点页签时用来丢弃迟到的旧回调） */
    protected _pageBgKey = '';

    /**
     * 整页底图贴在 `#homeUi` 上，**不贴在 `.viewport` 上**。
     *
     * 差别只有一条：顶栏与刘海安全区带是 `.viewport` 的兄弟节点，底图贴在 viewport 上就必然在屏幕
     * 最上方留一条与世隔绝的平色带——2026-09-21 用户圈出来问"顶部组件怎么办"的那条 36px navy 带
     * 就是它。改成贴整屏、并把 `.safeBand` / `.topbar` / `.viewport` 三层底色清成透明之后，
     * 一张图从状态栏一直铺到底导，全屏不再有"没换肤"的孤岛。
     *
     * 遮罩照旧不许省（口径见 STYLE-SPEC §7.2）：场景中段那条琥珀雾亮带是整幅最亮处，
     * 弱亮字压上去会掉到 4.5:1 以下；压暗到能读，但保留轮廓，让它读成"世界"而不是"壁纸"。
     */
    protected _applyPageBackdrop(key: string): void {
        if (this._pageBgKey === key) {
            return;
        }
        this._pageBgKey = key;
        const root = this._root;
        if (!root) {
            return;
        }
        this._tex(key, (u) => {
            if (this._pageBgKey !== key) {
                return;
            }
            // `_tex` 给回来的 u **已经是一整个 url 串**（UiPlate.frameUrl 里就包好了壳），这里不能再套一层：
            // 套了会得到 url 里嵌 url，浏览器判整条 background-image 非法，于是只剩前面那层遮罩渐变，
            // 页面底从来没画出来过。全工程只有这一处套了壳，另外 19 处都是直接赋值，
            // 所以别的地方都好的、偏偏背景是空的。回归断言见 check-art-manifest 的 5.9。
            //
            // 最上面那层琥珀是**整片世界的主光**（对标 §4.9 第 4 条）。三件事按顺序试过才定下来：
            // ① 先想的是把过金的金牌、过蓝的蓝板用 filter 拉回世界带宽，算完在源图上预览直接否决——
            //    去饱和把主 CTA 从"最该抢眼的东西"拉成一块脏黄铜，层级没了；蓝板拉灰则把
            //    "蓝=取消/次要"这个功能色弄丢了。数值合格、画面更坏。
            // ② 于是反过来：不动控件，把**世界**打暖。实测五页界面件落在暖度 +19~+44，
            //    而两张底图整张只有 +6 与 -9（`tools/audit_light_temp.mjs` 量的），
            //    差着二十多档——控件没错，是它们站在一片没有光的地方。
            // ③ 混合模式与强度是 `tools/calc_key_grade.py` 在源图上算出来的，不是试出来的：
            //    soft-light .45 是唯一能把两张底图**都**送进 +19~+44、而亮度只从 33/29 抬到 42/38 的档；
            //    平涂同强度也能进带宽，但亮度抬到 55/52，等于把暗场景洗亮，会反过来吃亮字对比度。
            // 用 background-blend-mode 而不是盖一层 div：混合只发生在本元素的背景栈内部，
            // 子节点（所有文字、所有板）不参与，所以这一层**不可能**动到可读性——
            // 而 contrast_audit 现在量的是屏幕真实像素，万一它报了变化，那才是真的有问题。
            root.style.backgroundImage =
                'linear-gradient(180deg, rgba(255,158,58,.34) 0%, rgba(255,158,58,.5) 46%, rgba(255,146,44,.45) 100%), ' +
                'linear-gradient(180deg, rgba(11,18,26,.86) 0%, rgba(11,18,26,.44) 34%, rgba(10,16,24,.34) 60%, rgba(8,13,20,.86) 100%), ' +
                u;
            root.style.backgroundSize = 'cover, cover, cover';
            root.style.backgroundPosition = 'center, center, center';
            root.style.backgroundBlendMode = 'soft-light, normal, normal';
        });
    }

    protected _switchPage(page: string): void {
        // 显隐交给 CSS 的 .on 类：出征页是满屏竖向 flex 骨架，其余四页为块级滚动流，
        // 内联 display 会把两种布局模式压成同一个值
        for (const key of Object.keys(this._pages)) {
            this._pages[key].classList.toggle('on', key === page);
        }
        for (const key of Object.keys(this._navBtns)) {
            this._navBtns[key].classList.toggle('on', key === page);
        }
        // 运营/快捷入口已收进出征页场景内侧，随页面显隐；此处不再切悬浮栏
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
        // 出征页的底由 _refreshStagePage 按章节定（每章站在自己的世界里），其余四页共用营地那一张
        if (page !== 'battle') {
            this._applyPageBackdrop('scenes/hub_camp');
        }
        this._refreshTop();
        this._plateCityButtons();
        this._plateBevels();
        this._applyPendingTex();
    }


    // ================= 构建入口 =================

    protected _build(): void {
        const root = document.createElement('div');
        root.id = 'homeUi';
        this._root = root;

        // 壳层顺序＝布局稿：顶部刘海/胶囊安全区 32（手机版 30 + 状态栏安全区）→ 信息栏 64 → 页面 → 底导 70
        this._buildSafeBand(root);
        this._buildTopbar(root);

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


    // ================= 顶部安全区与公告弹窗 =================

    /**
     * 手机刘海/胶囊安全区条（布局稿 .safe 32；手机版 30 + 状态栏安全区）。
     * 微信小游戏在刘海机上是沉浸式全屏，顶部这块必须留空，否则信息栏会被
     * 状态栏与右侧胶囊盖住。稿里这条是系统状态栏内容占位（时间/胶囊），
     * 游戏里交给系统绘制，所以这里只做一块静态留白，不画任何元素。
     */
    protected _buildSafeBand(root: HTMLDivElement): void {
        const band = document.createElement('div');
        band.className = 'safeBand';
        root.appendChild(band);
        this._safeBandEl = band;
    }



    /** 公告列表弹窗（新→旧全量展示）；打开即全部标记已读：红点熄灭、下次进主城不再自动弹 */
    /** 游戏公告（UX 布局稿 1-B · L3·L）：分类页签 + 列表（标题/日期/摘要）+ 点行就地展开全文 */
    protected _openNoticeModal(tab = 0, expand = -1): void {
        NoticeSystem.instance.markAllRead();
        this._refreshTop();
        const filters: Array<{ label: string; kind: NoticeKind | null }> = [
            { label: '全部', kind: null },
            { label: '更新', kind: 'update' },
            { label: '活动', kind: 'activity' },
            { label: '公告', kind: 'notice' }
        ];
        const opt = (): PopOpts => {
            const cur = filters[Math.max(0, Math.min(filters.length - 1, tab))];
            const list = NOTICE_DEFS
                .filter(n => !cur.kind || n.kind === cur.kind)
                .slice()
                .sort((a, b) => b.id - a.id);
            const opened = list.find(n => n.id === expand) ?? null;
            return {
                tier: 3,
                size: 'L',
                banner: '📣 游戏公告',
                art: `${list.length} 条`,
                tabs: filters.map(f => f.label),
                tab,
                onTab: i => this._openNoticeModal(i, -1),
                build: c => {
                    if (!list.length) {
                        c.appendChild(this._popEmpty('该分类暂无公告', undefined, '📣'));
                        return;
                    }
                    for (const n of list) {
                        const on = opened?.id === n.id;
                        const brief = n.body.split('\n').find(x => x.trim()) ?? '';
                        c.appendChild(this._popRow({
                            icon: n.kind === 'update' ? '🛠' : n.kind === 'activity' ? '🎉' : '📢',
                            title: n.title,
                            tag: NOTICE_KIND_NAMES[n.kind],
                            lines: [n.date, on ? '点击收起' : `摘要：${brief.slice(0, 14)}…`],
                            status: on ? '▾' : '▸',
                            onClick: () => this._openNoticeModal(tab, on ? -1 : n.id)
                        }));
                        if (on) {
                            const body = this._el('div', 'popBody');
                            for (const line of n.body.split('\n')) {
                                body.appendChild(this._el('p', undefined, line || ' '));
                            }
                            c.appendChild(body);
                        }
                    }
                },
                note: '公告按发布时间倒序 · 新公告在信息栏 📣 上亮红点'
            };
        };
        this._openPop(opt());
    }


    /**
     * 体力补给（UX 布局稿：L3·M）：固定条挂秒级恢复倒计时胶囊，内容区两条获取路径
     * （看广告 / 钻石直购）行内动作，领取后就地重绘同步余量与置灰态。
     */
    protected _openStaminaModal(): void {
        const gm = GameManager.instance;
        const opt = (): PopOpts => {
            const cur = gm.stamina();
            const max = gm.staminaMax();
            const full = cur >= max;
            const left = AdService.instance.remaining('stamina');
            const diamonds = gm.res.get('diamond');
            return {
                tier: 3,
                size: 'M',
                banner: '🍖 体力补给',
                art: `${cur} / ${max}`,
                subtitle: `每 ${BattleConfig.STAMINA_REGEN_MINUTES} 分钟恢复 1 点 · 加油站每级提高上限`,
                fixed: bar => {
                    this._stamTimerEl = this._popInfo('');
                    bar.appendChild(this._stamTimerEl);
                    this._stamTick();
                },
                build: c => {
                    c.appendChild(this._popSec('当前体力'));
                    c.appendChild(this._popKV('体力', `${cur} / ${max}`, 'total'));
                    c.appendChild(this._popKV('恢复速率', `每 ${BattleConfig.STAMINA_REGEN_MINUTES} 分钟 1 点`));
                    c.appendChild(this._popSec('获取途径'));
                    c.appendChild(this._popRow({
                        icon: '📺',
                        title: '看广告领体力',
                        lines: [`+${MALL_AD_STAMINA} 体力 · 今日剩余 ${left}/3 次`],
                        status: full ? '体力已满' : left <= 0 ? '今日已用完' : undefined,
                        statusKind: full || left <= 0 ? 'expire' : undefined,
                        action: {
                            label: '观 看',
                            kind: 'green',
                            disabled: left <= 0 || full,
                            onDisabled: () => this._toast(full ? '体力已满，先消耗一些再来领' : '今日广告额度已用完 · 隔日重置'),
                            onClick: () => {
                                SoundFx.unlock();
                                AdService.instance.claimReward('stamina', () => {
                                    gm.res.add('stamina', MALL_AD_STAMINA);
                                    SoundFx.play('coin');
                                    this._toast(`体力 +${MALL_AD_STAMINA}`);
                                    this._refreshTop();
                                    this._popRebuild(opt());
                                });
                            }
                        }
                    }));
                    c.appendChild(this._popRow({
                        icon: '💎',
                        title: '钻石购买',
                        lines: [`+${STAMINA_BUY_N} 体力 · ${STAMINA_BUY_COST} 💎（可超出上限囤积）`],
                        status: diamonds < STAMINA_BUY_COST ? '钻石不足' : undefined,
                        statusKind: diamonds < STAMINA_BUY_COST ? 'expire' : undefined,
                        action: {
                            label: `💎 ${STAMINA_BUY_COST}`,
                            kind: 'gold',
                            disabled: diamonds < STAMINA_BUY_COST,
                            onDisabled: () => this._toast(`钻石不足 · 还差 💎 ${STAMINA_BUY_COST - diamonds}`),
                            onClick: () => {
                                SoundFx.unlock();
                                if (gm.buyStamina(STAMINA_BUY_N, STAMINA_BUY_COST)) {
                                    SoundFx.play('buy');
                                    this._toast(`体力 +${STAMINA_BUY_N}`);
                                    this._refreshTop();
                                    this._popRebuild(opt());
                                } else {
                                    this._toast('钻石不足');
                                }
                            }
                        }
                    }));
                    c.appendChild(this._popAttr({ icon: '💎', text: `当前钻石 **${diamonds.toLocaleString()}**` }));
                },
                onClose: () => {
                    clearInterval(this._stamTimer);
                    this._stamTimer = 0;
                    this._stamTimerEl = null;
                },
                note: '体力随时间自动恢复 · 商城页另有广告体力入口'
            };
        };
        this._openPop(opt());
        clearInterval(this._stamTimer);
        this._stamTimer = setInterval(() => this._stamTick(), 1000) as unknown as number;
    }


    /** 体力恢复倒计时：每秒就地改固定条胶囊文案（胶囊断开即停表，重绘后仍续跑） */
    private _stamTick(): void {
        if (!this._stamTimerEl || !this._stamTimerEl.isConnected) {
            clearInterval(this._stamTimer);
            this._stamTimer = 0;
            return;
        }
        const nextIn = GameManager.instance.staminaNextIn();
        if (nextIn <= 0) {
            this._stamTimerEl.textContent = '✅ 体力已满';
            return;
        }
        const ss = nextIn % 60;
        this._stamTimerEl.textContent = `⏳ 下一点 ${Math.floor(nextIn / 60)}:${ss < 10 ? '0' + ss : ss}`;
    }


    /**
     * 主城邮箱（UX 布局稿 1-A · L3·M）：横幅头 + 列表行（状态列/行内领取）+ 固定「一键领取」底栏 + 过期注脚。
     * 详情为钻取层（列表 ↔ 详情各自重新取数，避免快照过期）；删除走 S 型确认模板。
     * 战斗页菜单另有 DomHud 邮箱浮窗；这里给主城同样能力（一键领取/过期提醒/删除）。
     */
    protected _openMailModal(openId: string | null = null): void {
        const ms = MailSystem.instance;
        if (openId) {
            this._openMailDetail(openId);
            return;
        }
        const opt = (): PopOpts => {
            const mails = ms.mails();
            const claimable = mails.filter(x => x.kind === 'reward' && !x.claimed).length;
            const unread = ms.unreadCount();
            return {
                tier: 3,
                size: 'M',
                banner: '📬 邮箱',
                art: `待领 ${claimable} · 未读 ${unread}`,
                build: c => {
                    if (!mails.length) {
                        c.appendChild(this._popEmpty('暂无邮件', '战役与活动奖励会送达这里', 'ui/shop/shop_letter'));
                        return;
                    }
                    for (const m of mails) {
                        const timeText = mailTimeText(m.ts);
                        const soon = mailExpiringSoon(m);
                        const canClaim = m.kind === 'reward' && !m.claimed;
                        const lines: PopText[] = [`来自：${m.from}`];
                        if (timeText) {
                            lines.push(timeText);
                        }
                        c.appendChild(this._popRow({
                            icon: m.kind === 'reward' ? '🎁' : '📢',
                            title: m.title,
                            tag: m.kind === 'reward' ? '附件' : '系统',
                            lines,
                            red: !m.read,
                            status: canClaim ? (soon ? '将过期' : '可领') : (m.kind === 'reward' ? '已领' : (m.read ? '已读' : '未读')),
                            statusKind: canClaim && soon ? 'soon' : undefined,
                            action: canClaim ? {
                                label: '领取',
                                onClick: () => {
                                    SoundFx.unlock();
                                    if (ms.claim(m.id)) {
                                        SoundFx.play('coin');
                                        this._refreshTop();
                                        this._popRebuild(opt());
                                    }
                                }
                            } : undefined,
                            onClick: () => this._openMailDetail(m.id)
                        }));
                    }
                },
                ctas: claimable > 0 ? [{
                    label: `一键领取（${claimable} 封）`,
                    red: true,
                    onClick: () => {
                        SoundFx.unlock();
                        const n = ms.claimAll();
                        if (n > 0) {
                            SoundFx.play('coin');
                            this._refreshTop();
                            this._toast(`已领取 ${n} 封附件`);
                        }
                        this._popRebuild(opt());
                    }
                }] : undefined,
                note: '附件 24 小时内过期作废 · 点击邮件查看详情'
            };
        };
        this._openPop(opt());
    }

    /** 邮件详情（1-A 的钻取层）：发件人/时间 → 正文 → 附件格 → 领取·删除双动作 */
    protected _openMailDetail(openId: string): void {
        const ms = MailSystem.instance;
        const opt = (): PopOpts => {
            const m = ms.mail(openId);
            const reward = m?.reward ?? {};
            const attach: Array<{ icon: string; count?: number; title?: string }> = [];
            if (reward.gold) {
                attach.push({ icon: '🪙', count: reward.gold, title: `金币 ×${reward.gold.toLocaleString()}` });
            }
            if (reward.diamond) {
                attach.push({ icon: '💎', count: reward.diamond, title: `钻石 ×${reward.diamond}` });
            }
            if (reward.misc) {
                attach.push({
                    icon: miscDef(reward.misc.id)?.ic ?? '📦',
                    count: reward.misc.n,
                    title: `${miscDef(reward.misc.id)?.name ?? reward.misc.id} ×${reward.misc.n}`
                });
            }
            const timeText = m ? mailTimeText(m.ts) : '';
            const del = (): void => {
                this._popConfirm({
                    title: '删除邮件',
                    icon: 'ui/ico/ico_del',
                    desc: m?.kind === 'reward' && !m.claimed ? '附件尚未领取，删除后附件一并作废' : '删除后不可恢复',
                    danger: true,
                    ok: '确认删除',
                    onOk: () => {
                        SoundFx.play('ui');
                        ms.remove(openId);
                        this._refreshTop();
                        this._openMailModal();
                    },
                    onCancel: () => this._openMailDetail(openId)
                });
            };
            const ctas: PopCta[] = [];
            if (m && m.kind === 'reward') {
                ctas.push({ label: '🗑 删除', kind: 'danger', onClick: del });
                ctas.push({
                    label: m.claimed ? '已领取' : '领取附件',
                    disabled: m.claimed,
                    onDisabled: () => this._toast('该附件已领取过了'),
                    onClick: () => {
                        SoundFx.unlock();
                        if (ms.claim(openId)) {
                            SoundFx.play('coin');
                            this._refreshTop();
                            this._popRebuild(opt());
                        }
                    }
                });
            } else {
                ctas.push({ label: '🗑 删除', kind: 'danger', onClick: del });
            }
            return {
                tier: 3,
                size: 'M',
                title: '✉ 邮件详情',
                onBack: () => this._openMailModal(),
                build: c => {
                    if (!m) {
                        c.appendChild(this._popEmpty('邮件已删除', '返回列表查看其他邮件', 'ui/shop/shop_letter'));
                        return;
                    }
                    ms.markRead(openId);
                    c.appendChild(this._popKV('发件人', m.from));
                    if (timeText) {
                        c.appendChild(this._popKV('时间', timeText));
                    }
                    const body = this._el('div', 'popBody');
                    for (const line of m.body.split('\n')) {
                        body.appendChild(this._el('p', undefined, line || ' '));
                    }
                    c.appendChild(body);
                    if (m.kind === 'reward') {
                        c.appendChild(this._popSec('附件奖励'));
                        c.appendChild(attach.length
                            ? this._popGrid(attach, 4)
                            : this._popEmpty('附件为空', undefined, 'ui/shop/shop_chest'));
                        c.appendChild(this._popKV('领取状态', m.claimed ? '已领取' : '未领取', 'free'));
                        if (mailExpiringSoon(m) && !m.claimed) {
                            c.appendChild(this._el('div', 'popWarn', '⏳ 附件 24 小时内过期，过期作废'));
                        }
                    }
                },
                ctas,
                note: '删除后不可恢复'
            };
        };
        this._openPop(opt());
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


    /** 页面头部标题已按需求移除（补给商店/英雄档案/玩法大厅等页顶大字不再显示） */


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


    /**
     * 个人主页（UX 布局稿：L3·L）：名片（头像 + 称号 + 队伍战力）+ 战绩 / 养成 / 系统 / 账号
     * 四段 KV，全部读存档实时值。
     */
    protected _openProfileModal(): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const qs = QuestSystem.instance;
        const bs = BestiarySystem.instance;
        const ss = SigninSystem.instance;
        const stage = gm.stageCleared;
        // 称号按通关进度晋升
        const title = stage >= FINAL_STAGE_ID ? '☠️ 深渊终结者' : stage >= 8 ? '🛡️ 王牌守卫'
            : stage >= 4 ? '🎯 资深猎手' : stage >= 1 ? '🎖️ 幸存者' : '🌱 拾荒新人';
        // 队伍战力：全队攻击乘区总和（口径 = 武器×装备×局外强化）
        let power = 0;
        for (const id of gm.ownedHeroes) {
            power += Math.round(hs.atkMulOf(id) * gm.metaAtkMul() * 100);
        }
        const { done: besDone, total: besTotal } = bs.completion();
        const skillTotal = Object.keys(gm.skillLevels).length;
        const gemCount = hs.miscCount('gem_fire') + hs.miscCount('gem_wind') + hs.miscCount('gem_ice') + hs.miscCount('gem_thunder');
        const pro = gm.prosperity();
        this._openPop({
            tier: 3,
            size: 'L',
            banner: '🎖️ 个人主页',
            art: `LV.${gm.hqLevel()}`,
            subtitle: `指挥官将军 · ${title}`,
            build: c => {
                c.appendChild(this._popRow({
                    icon: '🎖',
                    iconTex: 'characters/commander',
                    frameTex: 'ui/frame/avatar_frame',
                    title: '指挥官将军',
                    lines: [`${title} · 基地 LV.${gm.hqLevel()}`],
                    status: `⚔️ ${power.toLocaleString()}`,
                    statusKind: 'soon'
                }));
                c.appendChild(this._popSec('📊 战绩统计'));
                c.appendChild(this._popKV('通关关卡', `${stage}/${FINAL_STAGE_ID}`));
                c.appendChild(this._popKV('最远波次', `第 ${gm.bestWave} 波`));
                c.appendChild(this._popKV('累计击杀', gm.totalKills.toLocaleString()));
                c.appendChild(this._popKV('无尽里程碑', `${Math.floor(gm.bestWave / 5)} 次`, 'free'));
                c.appendChild(this._popSec('🎖️ 养成收集'));
                c.appendChild(this._popKV('已拥有英雄', `${gm.ownedHeroes.length}/${HERO_DEFS.length}`));
                c.appendChild(this._popKV('已学技能', `${skillTotal} 门`));
                c.appendChild(this._popKV('持有宝石', `${gemCount} 颗`));
                c.appendChild(this._popKV('图鉴收录', `${besDone}/${besTotal}`, 'free'));
                c.appendChild(this._popSec('🏗️ 系统进度'));
                c.appendChild(this._popKV('基地繁荣度', `${pro.cur}/${pro.max}`));
                c.appendChild(this._popKV('累计签到', `${ss.totalDays} 天`));
                c.appendChild(this._popKV('成就达成', `${QUEST_DEFS.filter(q => qs.isClaimed(q)).length}/${QUEST_DEFS.length}`));
                c.appendChild(this._popKV('邮箱附件', MailSystem.instance.hasClaimable() ? '有可领取' : '已清空'));
                c.appendChild(this._popKV('天赋加点', `${TalentSystem.instance.spent}/${TalentSystem.instance.total} 点`, 'free'));
                c.appendChild(this._popSec('ℹ️ 账号信息'));
                c.appendChild(this._popKV('游戏版本', BUILD_STAMP));
                c.appendChild(this._popKV('平台', 'Web Mobile'));
                c.appendChild(this._popKV('称号晋升', stage >= FINAL_STAGE_ID ? '已满称号' : `通关第 ${stage + 1} 关晋升`, 'free'));
            },
            note: '所有数值取自本机存档 · 换设备不同步'
        });
    }



    // ================= 设置 =================

    /** 设置弹窗：音效开关/音量、版本信息、重置存档（输入 CONFIRM 二次确认） */
    /** 设置（UX 布局稿：L3·L 列表型）：音效/音量/关于 + 危险操作走 S 型确认（替代原双击确认） */
    protected _openSettingsModal(): void {
        const opt = (): PopOpts => ({
            tier: 3,
            size: 'L',
            banner: '⚙️ 设置',
            art: `版本 ${BUILD_STAMP}`,
            build: c => {
                c.appendChild(this._popSec('🔊 音效'));
                c.appendChild(this._popAttr({
                    icon: SoundFx.muted ? '🔇' : '🔊',
                    iconTex: SoundFx.muted ? 'ui/ico/ico_mute' : 'ui/ico/ico_sound',
                    text: `战斗与界面音效 **${SoundFx.muted ? '已静音' : '已开启'}**`,
                    action: {
                        label: SoundFx.muted ? '开启' : '静音',
                        kind: SoundFx.muted ? 'gold' : 'info',
                        onClick: () => {
                            SoundFx.setMuted(!SoundFx.muted);
                            if (!SoundFx.muted) {
                                SoundFx.play('ui');
                            }
                            this._popRebuild(opt());
                        }
                    }
                }));
                const volRow = this._el('div', 'popAttr');
                const volIc = this._el('div', 'ai', '🎚');
                volRow.appendChild(volIc);
                this._tex('ui/ico/ico_slider', UiPlate.icon(volIc));
                const at = this._el('div', 'at');
                at.style.display = 'flex';
                at.style.alignItems = 'center';
                at.style.gap = 'calc(8px * var(--pu,1))';
                at.appendChild(this._el('span', undefined, '音量'));
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = '0';
                slider.max = '100';
                slider.value = String(Math.round(SoundFx.volume * 100));
                slider.style.flex = '1';
                slider.style.minWidth = '0';
                slider.oninput = () => {
                    SoundFx.setVolume(Number(slider.value) / 100);
                    num.textContent = `${slider.value}%`;
                };
                slider.onchange = () => SoundFx.play('coin');
                at.appendChild(slider);
                const num = this._el('b', undefined, `${slider.value}%`);
                at.appendChild(num);
                volRow.appendChild(at);
                c.appendChild(volRow);
                c.appendChild(this._popSec('ℹ️ 关于'));
                c.appendChild(this._popKV('版本', BUILD_STAMP));
                c.appendChild(this._popKV('游戏', '王国守望 · 据点守卫'));
                c.appendChild(this._popKV('类型', '竖屏 · 塔防割草 · 微信小游戏', 'free'));
                c.appendChild(this._popSec('⚠️ 危险操作'));
                c.appendChild(this._popAttr({
                    icon: '🗑',
                    text: '重置全部存档：进度/装备/英雄**全部清空且不可恢复**',
                    empty: true
                }));
            },
            ctas: [{
                label: '🗑 重置全部存档',
                kind: 'danger',
                onClick: () => this._popConfirm({
                    title: '重置存档',
                    icon: 'ui/ico/ico_warn',
                    desc: '所有进度、装备、英雄与货币将被清空，且无法恢复',
                    danger: true,
                    ok: '确认重置',
                    cancel: '我再想想',
                    onOk: () => {
                        sys.localStorage.removeItem(GameManager.SAVE_KEY);
                        this._toast('存档已重置，即将刷新页面');
                        setTimeout(() => location.reload(), 800);
                    }
                })
            }],
            note: '存档保存在本机浏览器 · 重置后从第一关重新开始'
        });
        this._openPop(opt());
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
        return UiPlate.frameUrl(key);
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
