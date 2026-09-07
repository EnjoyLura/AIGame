import { _decorator, Component, SpriteFrame } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { BattleManager } from '../battle/BattleManager';

/**
 * 主城界面（战斗外玩法入口，DOM 渲染）：
 * 底部五格导航（商城/角色/战斗/核心/基地），先实装中央「战斗」页——
 * 章节横幅、难度切换、载具展台、三档通关宝箱、出战按钮、基地强化；
 * 其余四页为建设中占位，逐个迭代。战斗模拟由 BattleManager._runActive 冻结。
 */
@ccclass('HomeUi')
export class HomeUi extends Component {
    private static _styleInjected = false;

    private _root: HTMLDivElement | null = null;
    private _goldEl: HTMLDivElement | null = null;
    private _bestEl: HTMLDivElement | null = null;
    private _rewardEl: HTMLDivElement | null = null;
    private _chapterEl: HTMLDivElement | null = null;
    private _staminaEl: HTMLDivElement | null = null;
    private _rows: Array<{ def: (typeof META_UPGRADES)[number]; lv: HTMLSpanElement; eff: HTMLDivElement; cost: HTMLDivElement; btn: HTMLButtonElement }> = [];
    private _pages: Record<string, HTMLDivElement> = {};
    private _navBtns: Record<string, HTMLButtonElement> = {};
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

    /** 章节名（随最远波次推进展示位） */
    private static readonly CHAPTERS = ['1.末日公路', '2.跨海大桥', '3.雨夜废墟', '4.炼钢厂', '5.尸潮深谷'];

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
        eventCenter.on(GameEvent.RES_CHANGED, () => this._refresh(), this);
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
        this.leaveBattle();
        if (this._root) {
            this._root.style.display = 'flex';
            this._refresh();
        }
    }

    private leaveBattle(): void {
        this._root && (this._root.style.display = 'none');
        BattleManager.instance?.leaveRun();
    }

    private _startBattle(): void {
        const gm = GameManager.instance;
        if (!this._root || !gm.canStartRun()) {
            this._refresh();
            return;
        }
        this._root.style.display = 'none';
        eventCenter.emit(GameEvent.GAME_RESTART);
        // beginRun 失败（体力不足等）必须回滚显示，否则主城藏起后整屏卡死
        if (!BattleManager.instance?.beginRun()) {
            this._root.style.display = 'flex';
            this._refresh();
        }
    }

    /** 场景/立绘 SpriteFrame → CSS 背景图 URL；缺图返回 null */
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
            const idx = Math.min(HomeUi.CHAPTERS.length - 1, Math.floor(gm.bestWave / 10));
            this._chapterEl.textContent = HomeUi.CHAPTERS[idx];
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

        // 章节横幅：编号章名 + 骷髅徽记
        const chapter = document.createElement('div');
        chapter.className = 'chapterBanner';
        const chapterName = document.createElement('div');
        chapterName.className = 'chapterName';
        this._chapterEl = chapterName;
        chapterName.textContent = HomeUi.CHAPTERS[0];
        const chapterSkull = document.createElement('div');
        chapterSkull.className = 'chapterSkull';
        chapterSkull.textContent = '☠';
        chapter.appendChild(chapterName);
        chapter.appendChild(chapterSkull);
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

        // ---- 其余四页：建设中占位 ----
        const PLACEHOLDERS: Record<string, { icon: string; name: string; hint: string }> = {
            mall: { icon: '🛒', name: '商城', hint: '补给箱与特惠礼包 · 建设中' },
            heroes: { icon: '🦸', name: '角色', hint: '先锋官与枪械养成 · 建设中' },
            core: { icon: '🧬', name: '核心', hint: '核心科技研发 · 建设中' },
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
`;
        document.head.appendChild(style);
    }
}
