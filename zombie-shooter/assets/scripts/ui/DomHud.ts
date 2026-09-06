import { _decorator, Component, SpriteFrame, Texture2D } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, Design, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { BattleManager } from '../battle/BattleManager';
import { HERO_DEFS } from '../battle/HeroDef';

/** 伤害统计面板每英雄一行的可更新元素 */
interface StatRow {
    root: HTMLDivElement;
    rank: HTMLDivElement;
    avatar: HTMLDivElement;
    name: HTMLDivElement;
    dmg: HTMLDivElement;
    pct: HTMLDivElement;
    fill: HTMLDivElement;
    /** 普攻/技能/大招 三个占比值 */
    slots: HTMLSpanElement[];
}

/**
 * DOM 版 HUD：所有文本/进度条/面板用浏览器原生元素渲染（与 GmPanel 同路径），
 * 文字清晰度与网页一致——画布内文字的栅格化/双线性采样损失不再存在。
 * 微信小游戏无 DOM，走画布版 HUD 回退。
 * 伤害数字当前仍由画布 DamageNumber 渲染；下面保留的 DOM 伤害样式尚未接入。
 */
@ccclass('DomHud')
export class DomHud extends Component {
    private static _styleInjected = false;

    private _root: HTMLDivElement | null = null;
    private _timeEl: HTMLDivElement | null = null;
    private _waveEl: HTMLDivElement | null = null;
    private _killEl: HTMLDivElement | null = null;
    private _levelEl: HTMLDivElement | null = null;
    private _xpFill: HTMLDivElement | null = null;
    private _vehicleFill: HTMLDivElement | null = null;
    private _vehicleText: HTMLDivElement | null = null;
    private _popupEl: HTMLDivElement | null = null;
    private _pauseMenu: HTMLDivElement | null = null;
    private _statsOverlay: HTMLDivElement | null = null;
    private _statsTotalEl: HTMLDivElement | null = null;
    private _statsDpsEl: HTMLDivElement | null = null;
    private _statsTimeEl: HTMLDivElement | null = null;
    private _statsRows: StatRow[] = [];
    private _statsRefresh = 0;
    private _failPanel: HTMLDivElement | null = null;
    private _failWave: HTMLDivElement | null = null;
    private _failKill: HTMLDivElement | null = null;
    private _failLevel: HTMLDivElement | null = null;
    /** 缩放系数：设计像素 → CSS 像素（FIXED_WIDTH：宽恒定 1080 设计像素） */
    private _scale = 1;

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        this._injectStyle();
        this._build();
        eventCenter.on(GameEvent.WAVE_START, this._onWaveStart, this);
        eventCenter.on(GameEvent.XP_CHANGED, this._onXpChanged, this);
        eventCenter.on(GameEvent.VEHICLE_HP_CHANGED, this._onVehicleHpChanged, this);
        eventCenter.on(GameEvent.ENEMY_DEAD, this._onKill, this);
        eventCenter.on(GameEvent.GAME_OVER, this._onGameOver, this);
        window.addEventListener('resize', () => this._layout());
        console.log('[末日航线] build', BUILD_STAMP, (window as any).__BUILD_TIME ?? '');
    }

    onDestroy(): void {
        eventCenter.off(GameEvent.WAVE_START, this._onWaveStart, this);
        eventCenter.off(GameEvent.XP_CHANGED, this._onXpChanged, this);
        eventCenter.off(GameEvent.VEHICLE_HP_CHANGED, this._onVehicleHpChanged, this);
        eventCenter.off(GameEvent.ENEMY_DEAD, this._onKill, this);
        eventCenter.off(GameEvent.GAME_OVER, this._onGameOver, this);
        this._root?.remove();
        this._root = null;
    }

    update(dt: number): void {
        if (!this._root) {
            return;
        }
        const bm = BattleManager.instance;
        if (bm) {
            const total = Math.floor(bm.elapsed);
            const m = total / 60 | 0;
            const s = total % 60;
            if (this._timeEl) {
                this._timeEl.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
            }
            // 战斗暂停（含升级选卡）→ 冻结 DOM 伤害数字动画
            this._root.classList.toggle('paused', bm.isPaused);
            // 统计浮窗打开期间每 0.5s 实时刷新
            if (this._statsOverlay && this._statsOverlay.style.display === 'flex') {
                this._statsRefresh -= dt;
                if (this._statsRefresh <= 0) {
                    this._statsRefresh = 0.5;
                    this._refreshStats();
                }
            }
        }
    }

    // ================= 事件响应 =================

    private _onWaveStart(wave: number, total: number): void {
        if (this._waveEl) {
            this._waveEl.textContent = wave > total ? `第 ${wave} 波 · 无尽` : `第 ${wave} / ${total} 波`;
        }
        if (this._failPanel) {
            this._failPanel.style.display = 'none';
        }
        this._root?.classList.remove('paused');
        if (this._popupEl) {
            this._popupEl.textContent = `第 ${wave} 波`;
            this._popupEl.classList.remove('play');
            void (this._popupEl as HTMLElement & { offsetWidth: number }).offsetWidth;
            this._popupEl.classList.add('play');
        }
    }

    private _onXpChanged(xp: number, need: number, level: number): void {
        if (this._levelEl) {
            this._levelEl.textContent = `Lv.${level}`;
        }
        if (this._xpFill) {
            this._xpFill.style.width = `${(Math.max(0, Math.min(1, xp / need)) * 100).toFixed(1)}%`;
        }
    }

    private _onVehicleHpChanged(hp: number, maxHp: number): void {
        if (this._vehicleFill) {
            this._vehicleFill.style.width = `${(maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0) * 100}%`;
        }
        if (this._vehicleText) {
            this._vehicleText.textContent = `耐久 ${Math.ceil(Math.max(0, hp))} / ${maxHp}`;
        }
    }

    private _onKill(kills: number): void {
        if (this._killEl) {
            this._killEl.textContent = `击杀 ${kills}`;
        }
    }

    private _onGameOver(): void {
        this._fillGameOver();
        if (this._failPanel) {
            this._failPanel.style.display = 'flex';
        }
    }

    /** 结算数据：读全局 GameManager 单例 */
    private _fillGameOver(): void {
        const gm = GameManager.instance;
        if (this._failWave) {
            this._failWave.textContent = `抵达波次：第 ${gm.wave} 波`;
        }
        if (this._failKill) {
            this._failKill.textContent = `击杀怪物：${gm.kills}`;
        }
        if (this._failLevel) {
            this._failLevel.textContent = `团队等级：Lv.${gm.level}`;
        }
    }

    // ================= 交互 =================

    private _togglePause(): void {
        const bm = BattleManager.instance;
        if (!bm) {
            return;
        }
        const paused = bm.togglePause();
        if (this._pauseMenu) {
            this._pauseMenu.style.display = paused ? 'flex' : 'none';
        }
    }

    private _toggleStats(): void {
        if (!this._statsOverlay) {
            return;
        }
        const open = this._statsOverlay.style.display !== 'flex';
        this._statsOverlay.style.display = open ? 'flex' : 'none';
        if (open) {
            this._statsRefresh = 0.5;
            this._refreshStats();
        }
    }

    /** 伤害数字格式化：万位缩写（1.23万 / 12.3万），与同类手游一致 */
    private _fmtDmg(v: number): string {
        if (v >= 100000) {
            return (v / 10000).toFixed(1) + '万';
        }
        if (v >= 10000) {
            return (v / 10000).toFixed(2) + '万';
        }
        return String(Math.round(v));
    }

    /** 英雄名字与主题色（HEX，带 #） */
    private _heroMeta(id: string): { name: string; hex: string } {
        const def = HERO_DEFS.find(d => d.id === id);
        const c = def?.color;
        const hex = c ? '#' + c.toHEX('#rrggbb') : '#4dd0e9';
        return { name: def?.name ?? id, hex };
    }

    /** 英雄立绘 → CSS 背景图 URL；资源未就绪返回 null（回退首字母徽章） */
    private _heroAvatarUrl(id: string): string | null {
        const frame: SpriteFrame | null = AssetLib.frame(`characters/hero_${id}`);
        const tex = (frame ? frame.texture : null) as Texture2D | null;
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
        if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
            try {
                const cv = document.createElement('canvas');
                cv.width = asset!.width;
                cv.height = asset!.height;
                cv.getContext('2d')!.drawImage(img, 0, 0);
                return `url(${cv.toDataURL('image/png')})`;
            } catch {
                return null;
            }
        }
        return null;
    }

    private _refreshStats(): void {
        const bm = BattleManager.instance;
        if (!bm || !this._statsTotalEl) {
            return;
        }
        const stats = bm.getDamageStats();
        this._statsTotalEl.textContent = this._fmtDmg(stats.teamTotal);
        const secs = Math.max(1, Math.floor(bm.elapsed));
        this._statsDpsEl.textContent = this._fmtDmg(stats.teamTotal / secs) + '/s';
        const t = Math.floor(bm.elapsed);
        const mm = t / 60 | 0;
        const ss = t % 60;
        this._statsTimeEl.textContent = `${mm < 10 ? '0' : ''}${mm}:${ss < 10 ? '0' : ''}${ss}`;
        // 按总伤害降序排名：第一名有金色徽章和行高亮
        const sorted = [...stats.byHero].sort((a, b) => b.total - a.total);
        sorted.forEach((h, i) => {
            const row = this._statsRows[i];
            if (!row) {
                return;
            }
            const meta = this._heroMeta(h.id);
            const pct = stats.teamTotal > 0 ? Math.round((h.total / stats.teamTotal) * 100) : 0;
            row.rank.textContent = String(i + 1);
            row.rank.className = 'statRank rank' + (i + 1);
            row.root.classList.toggle('lead', i === 0);
            const url = this._heroAvatarUrl(h.id);
            if (url) {
                row.avatar.style.backgroundImage = url;
                row.avatar.textContent = '';
            } else {
                row.avatar.style.backgroundImage = 'none';
                row.avatar.textContent = meta.name.charAt(0);
            }
            row.avatar.style.borderColor = meta.hex;
            row.name.textContent = meta.name;
            row.dmg.textContent = this._fmtDmg(h.total);
            row.pct.textContent = `${pct}%`;
            row.pct.style.color = meta.hex;
            row.fill.style.width = `${pct}%`;
            row.fill.style.background = `linear-gradient(90deg, ${this._darken(meta.hex, 0.3)}, ${meta.hex} 55%, ${this._lighten(meta.hex, 0.28)})`;
            const sp = (v: number) => (h.total > 0 ? Math.round((v / h.total) * 100) : 0);
            const vals = [sp(h.basic), sp(h.skill), sp(h.ultimate)];
            row.slots.forEach((el, k) => {
                el.textContent = `${vals[k]}%`;
            });
        });
    }

    private _restart(): void {
        if (this._pauseMenu) {
            this._pauseMenu.style.display = 'none';
        }
        if (this._statsOverlay) {
            this._statsOverlay.style.display = 'none';
        }
        eventCenter.emit(GameEvent.GAME_RESTART);
    }

    // ================= 构建 =================

    /** 世界坐标（画布中心原点，y 向上）→ 屏幕 CSS 像素 */
    private _worldToCss(wx: number, wy: number): { x: number; y: number; scale: number } {
        const canvas = document.querySelector('canvas');
        const rect = (canvas ?? document.body).getBoundingClientRect();
        const scale = rect.width / Design.WIDTH;
        return {
            x: rect.left + rect.width / 2 + wx * scale,
            y: rect.top + rect.height / 2 - wy * scale,
            scale,
        };
    }

    /** 依据窗口尺寸重排所有设计像素定位的元素 */
    private _layout(): void {
        if (!this._root) {
            return;
        }
        const canvas = document.querySelector('canvas');
        const rect = (canvas ?? document.body).getBoundingClientRect();
        this._scale = rect.width / Design.WIDTH;
        this._root.style.setProperty('--s', this._scale.toFixed(4));
        // 保留 DOM 载具条现有底部锚点：车尾区域高度减 98 设计像素
        const vBar = this._root.querySelector<HTMLDivElement>('.vehicleBar');
        if (vBar) {
            vBar.style.bottom = `${(BattleConfig.VEHICLE_STRIP_HEIGHT - 98) * this._scale}px`;
        }
    }

    private _build(): void {
        const root = document.createElement('div');
        root.id = 'domHud';
        this._root = root;

        // 左下角版本戳（画布版 HUD 有，DOM 版此前漏掉了）
        const stamp = document.createElement('div');
        stamp.className = 'buildStamp';
        const bt = (window as any).__BUILD_TIME ?? '';
        stamp.textContent = BUILD_STAMP + (bt ? '·' + bt : '');
        root.appendChild(stamp);

        const top = document.createElement('div');
        top.className = 'topbar';
        root.appendChild(top);
        top.appendChild(this._button('暂停', () => this._togglePause(), 'pauseBtn'));
        top.appendChild(this._button('统计', () => this._toggleStats(), 'statsBtn'));
        this._timeEl = this._label(top, 'timeLabel', '00:00');
        this._waveEl = this._label(top, 'waveLabel', '');
        this._killEl = this._label(top, 'killLabel', '击杀 0');

        // 经验条 + 等级
        const xpRow = document.createElement('div');
        xpRow.className = 'xpRow';
        root.appendChild(xpRow);
        this._levelEl = this._label(xpRow, 'levelLabel', 'Lv.1');
        const xpBar = document.createElement('div');
        xpBar.className = 'xpBar';
        this._xpFill = document.createElement('div');
        this._xpFill.className = 'xpFill';
        this._xpFill.style.width = '0%';
        xpBar.appendChild(this._xpFill);
        xpRow.appendChild(xpBar);

        // 载具耐久条
        const vBar = document.createElement('div');
        vBar.className = 'vehicleBar';
        this._vehicleFill = document.createElement('div');
        this._vehicleFill.className = 'vehicleFill';
        this._vehicleFill.style.width = '100%';
        vBar.appendChild(this._vehicleFill);
        this._vehicleText = this._label(vBar, 'vehicleText', `耐久 ${BattleConfig.VEHICLE_MAX_HP} / ${BattleConfig.VEHICLE_MAX_HP}`);
        root.appendChild(vBar);

        // 中央波次提示
        this._popupEl = document.createElement('div');
        this._popupEl.className = 'popup';
        root.appendChild(this._popupEl);

        // 暂停菜单
        const pm = document.createElement('div');
        pm.className = 'menuOverlay';
        pm.style.display = 'none';
        pm.appendChild(this._bigLabel('已暂停', 84));
        pm.appendChild(this._menuButton('继 续 游 戏', '#4dd0e9', () => this._togglePause()));
        pm.appendChild(this._menuButton('重 新 挑 战', '#ffa726', () => this._restart()));
        root.appendChild(pm);
        this._pauseMenu = pm;

        // 伤害统计浮窗：半透明遮罩 + 商业级战绩面板（点遮罩或 ✕ 关闭）
        const ov = document.createElement('div');
        ov.className = 'statsOverlay';
        ov.style.display = 'none';
        ov.onclick = () => this._toggleStats();
        const sp = document.createElement('div');
        sp.className = 'statsPanel';
        sp.onclick = (e) => e.stopPropagation();
        // 标题行（金色渐变标题 + 右上角关闭）
        const head = document.createElement('div');
        head.className = 'statsHead';
        const title = document.createElement('div');
        title.className = 'statsTitle';
        title.textContent = '伤害统计';
        head.appendChild(title);
        const close = document.createElement('button');
        close.className = 'statsClose';
        close.textContent = '✕';
        close.onclick = (e) => {
            e.stopPropagation();
            this._toggleStats();
        };
        head.appendChild(close);
        sp.appendChild(head);
        const divider = document.createElement('div');
        divider.className = 'statsDivider';
        sp.appendChild(divider);
        // 团队汇总：总伤害 / DPS / 战斗时长
        const sum = document.createElement('div');
        sum.className = 'statsSummary';
        const mkChip = (label: string): HTMLDivElement => {
            const chip = document.createElement('div');
            chip.className = 'statChip';
            const val = document.createElement('div');
            val.className = 'statChipVal';
            const lab = document.createElement('div');
            lab.className = 'statChipLab';
            lab.textContent = label;
            chip.appendChild(val);
            chip.appendChild(lab);
            sum.appendChild(chip);
            return val;
        };
        this._statsTotalEl = mkChip('团队总伤害');
        this._statsTotalEl.textContent = '0';
        this._statsDpsEl = mkChip('团队 DPS');
        this._statsDpsEl.textContent = '0/s';
        this._statsTimeEl = mkChip('战斗时长');
        this._statsTimeEl.textContent = '00:00';
        sp.appendChild(sum);
        // 英雄行：排名徽章 + 头像 + 伤害/占比 + 占比条 + 分槽统计
        const SLOT_NAMES = ['普攻', '技能', '大招'];
        for (let i = 0; i < HERO_DEFS.length; i++) {
            const row = document.createElement('div');
            row.className = 'statRow';
            const rank = document.createElement('div');
            rank.className = 'statRank rank' + (i + 1);
            rank.textContent = String(i + 1);
            const avatar = document.createElement('div');
            avatar.className = 'statAvatar';
            const info = document.createElement('div');
            info.className = 'statInfo';
            const line = document.createElement('div');
            line.className = 'statLine';
            const name = document.createElement('div');
            name.className = 'statName';
            const dmg = document.createElement('div');
            dmg.className = 'statDmg';
            const pct = document.createElement('div');
            pct.className = 'statPct';
            line.appendChild(name);
            line.appendChild(dmg);
            line.appendChild(pct);
            const bar = document.createElement('div');
            bar.className = 'statBar';
            const fill = document.createElement('div');
            fill.className = 'statBarFill';
            fill.style.width = '0%';
            bar.appendChild(fill);
            const chips = document.createElement('div');
            chips.className = 'statSlots';
            const slots: HTMLSpanElement[] = [];
            SLOT_NAMES.forEach((nm) => {
                const chip = document.createElement('span');
                chip.className = 'slotChip';
                const dot = document.createElement('i');
                dot.className = 'slotDot';
                chip.appendChild(dot);
                chip.appendChild(document.createTextNode(nm + ' '));
                const val = document.createElement('b');
                val.textContent = '0%';
                chip.appendChild(val);
                slots.push(val);
                chips.appendChild(chip);
            });
            info.appendChild(line);
            info.appendChild(bar);
            info.appendChild(chips);
            row.appendChild(rank);
            row.appendChild(avatar);
            row.appendChild(info);
            sp.appendChild(row);
            this._statsRows.push({ root: row, rank, avatar, name, dmg, pct, fill, slots });
        }
        sp.appendChild(this._menuButton('关 闭', '#4dd0e9', () => this._toggleStats()));
        ov.appendChild(sp);
        root.appendChild(ov);
        this._statsOverlay = ov;

        // 护送失败结算
        const fp = document.createElement('div');
        fp.className = 'menuOverlay';
        fp.style.display = 'none';
        const card = document.createElement('div');
        card.className = 'failCard';
        card.appendChild(this._bigLabel('护 送 失 败', 72));
        this._failWave = this._label(card, 'failLine', '');
        this._failKill = this._label(card, 'failLine', '');
        this._failLevel = this._label(card, 'failLine', '');
        card.appendChild(this._menuButton('重 新 挑 战', '#ffa726', () => this._restart()));
        fp.appendChild(card);
        root.appendChild(fp);
        this._failPanel = fp;

        document.body.appendChild(root);
        this._layout();
    }

    private _button(text: string, onClick: () => void, cls: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'hudBtn ' + cls;
        btn.textContent = text;
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick();
        };
        return btn;
    }

    private _label(parent: HTMLElement, cls: string, text: string): HTMLDivElement {
        const el = document.createElement('div');
        el.className = 'hudLabel ' + cls;
        el.textContent = text;
        parent.appendChild(el);
        return el;
    }

    private _bigLabel(text: string, size: number): HTMLDivElement {
        const el = document.createElement('div');
        el.className = 'bigLabel';
        el.textContent = text;
        el.style.fontSize = `${size.toFixed(0)}px`;
        return el;
    }

    private _menuButton(text: string, color: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'menuBtn';
        btn.textContent = text;
        // 立体按钮：顶亮渐变 + 底部倒角 + 投影（同款手游按钮质感）
        btn.style.background = `linear-gradient(180deg, ${this._lighten(color, 0.28)} 0%, ${color} 52%, ${this._darken(color, 0.18)} 100%)`;
        btn.style.borderBottom = `calc(6px * var(--s,1)) solid ${this._darken(color, 0.38)}`;
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick();
        };
        return btn;
    }

    /** 颜色工具：按比例加亮/压暗（#rrggbb） */
    private _lighten(hex: string, k: number): string {
        const n = parseInt(hex.slice(1), 16);
        const f = (v: number) => Math.min(255, Math.round(v + (255 - v) * k));
        return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
    }

    private _darken(hex: string, k: number): string {
        const n = parseInt(hex.slice(1), 16);
        const f = (v: number) => Math.max(0, Math.round(v * (1 - k)));
        return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
    }

    private _injectStyle(): void {
        if (DomHud._styleInjected) {
            return;
        }
        DomHud._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = `
#domHud { position: fixed; inset: 0; z-index: 8000; pointer-events: none;
  font-family: system-ui, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  font-weight: 700; color: #ecf1f1; user-select: none; }
#domHud .hudLabel, #domHud .bigLabel { text-shadow: 0 1px 2px rgba(0,0,0,.85); white-space: nowrap; }
#domHud button { pointer-events: auto; cursor: pointer; font: inherit;
  transition: transform .06s ease, filter .06s ease; }
#domHud button:active { transform: translateY(calc(4px * var(--s,1))) scale(.98); filter: brightness(.92); }
#domHud .topbar { position: absolute; top: 0; left: 0; right: 0; height: calc(120px * var(--s, 1)); }
#domHud .buildStamp { position: absolute; left: calc(16px * var(--s,1)); bottom: calc(10px * var(--s,1));
  font-size: calc(22px * var(--s,1)); color: #c3ced5; letter-spacing: .5px;
  padding: 2px 4px; border-radius: 3px; background: rgba(15,22,30,.75); }
#domHud .hudBtn { position: absolute; top: calc(32px * var(--s,1)); width: calc(84px * var(--s,1));
  height: calc(84px * var(--s,1)); border-radius: calc(18px * var(--s,1)); border: calc(2px * var(--s,1)) solid #80dee4;
  background: linear-gradient(180deg, #344652 0%, #26343f 55%, #1b2630 100%);
  color: #ecf1f1; font-size: calc(27px * var(--s,1)); line-height: 1;
  box-shadow: 0 calc(4px * var(--s,1)) 0 rgba(0,0,0,.45), inset 0 calc(2px * var(--s,1)) 0 rgba(255,255,255,.28); }
#domHud .pauseBtn { left: calc(16px * var(--s,1)); }
#domHud .statsBtn { left: calc(112px * var(--s,1)); }
#domHud .timeLabel { position: absolute; top: calc(30px * var(--s,1)); left: calc(226px * var(--s,1));
  font-size: calc(36px * var(--s,1)); font-weight: 500; color: #bdcbd4; font-variant-numeric: tabular-nums; }
#domHud .waveLabel { position: absolute; top: calc(28px * var(--s,1)); left: 50%; transform: translateX(-50%);
  font-size: calc(51px * var(--s,1)); }
#domHud .killLabel { position: absolute; top: calc(30px * var(--s,1)); right: calc(93px * var(--s,1));
  font-size: calc(36px * var(--s,1)); font-weight: 500; color: #bdcbd4; font-variant-numeric: tabular-nums; }
#domHud .xpRow { position: absolute; top: calc(128px * var(--s,1)); left: 0; right: 0; height: calc(46px * var(--s,1)); }
#domHud .levelLabel { position: absolute; top: 0; left: calc(34px * var(--s,1)); font-size: calc(39px * var(--s,1)); }
#domHud .xpBar { position: absolute; top: calc(8px * var(--s,1)); left: calc(120px * var(--s,1));
  width: calc(900px * var(--s,1)); height: calc(21px * var(--s,1)); border-radius: calc(12px * var(--s,1));
  background: rgba(55,71,79,.86); overflow: hidden; }
#domHud .xpFill { height: 100%; border-radius: calc(12px * var(--s,1)); background: #4dd0e9; }
#domHud .vehicleBar { position: absolute; left: 50%;
  transform: translateX(-50%); width: calc(480px * var(--s,1)); height: calc(33px * var(--s,1));
  border-radius: calc(18px * var(--s,1)); background: rgba(55,71,79,.86); overflow: hidden; }
#domHud .vehicleFill { height: 100%; border-radius: calc(18px * var(--s,1)); background: #d99b42; }
#domHud .vehicleText { position: absolute; inset: 0; text-align: center;
  font-size: calc(23px * var(--s,1)); line-height: calc(33px * var(--s,1)); font-variant-numeric: tabular-nums; }
#domHud .popup { position: absolute; top: 16%; left: 50%; transform: translateX(-50%);
  font-size: calc(84px * var(--s,1)); opacity: 0; }
#domHud .popup.play { animation: domPop 1.2s ease-out forwards; }
@keyframes domPop { 0% { opacity: 0; transform: translateX(-50%) scale(.6); }
  15% { opacity: 1; transform: translateX(-50%) scale(1); }
  75% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) scale(1); } }
#domHud .dmgLayer { position: absolute; inset: 0; overflow: hidden; }
#domHud .dmg { position: absolute; transform: translate(-50%, -50%); font-weight: 800; line-height: 1;
  animation-name: dmgNorm, dmgFade; animation-timing-function: ease-out, linear;
  animation-fill-mode: forwards, forwards; will-change: transform, opacity; }
#domHud .dmgNorm { color: #ffffff; }
#domHud .dmgCrit { color: #ff3a3a; }
@keyframes dmgNorm { 0% { transform: translate(-50%,-50%) scale(.25); }
  18% { transform: translate(-50%,-64%) scale(1.16); } 30% { transform: translate(-50%,-70%) scale(1); }
  100% { transform: translate(-50%,-165%) scale(1); } }
@keyframes dmgFade { 0%, 62% { opacity: 1; } 100% { opacity: 0; } }
#domHud.paused .dmg { animation-play-state: paused; }
#domHud .menuOverlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(40px * var(--s,1));
  background: rgba(0,0,0,.66); pointer-events: auto; }
#domHud .bigLabel { font-weight: 800; }
#domHud .menuBtn { min-width: calc(440px * var(--s,1)); padding: calc(26px * var(--s,1)) calc(60px * var(--s,1));
  border: none; border-radius: calc(66px * var(--s,1)); color: #1b262e; font-size: calc(44px * var(--s,1));
  box-shadow: 0 calc(6px * var(--s,1)) 0 rgba(0,0,0,.4), inset 0 calc(3px * var(--s,1)) 0 rgba(255,255,255,.4),
    0 calc(10px * var(--s,1)) calc(24px * var(--s,1)) rgba(0,0,0,.45);
  text-shadow: 0 1px 0 rgba(255,255,255,.35); }
#domHud .statsOverlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(4,10,16,.58); pointer-events: auto; animation: statsFade .16s ease-out; }
@keyframes statsFade { from { opacity: 0; } }
#domHud .statsPanel { display: flex; flex-direction: column; align-items: center;
  width: calc(940px * var(--s,1)); padding: calc(34px * var(--s,1)) calc(44px * var(--s,1)) calc(44px * var(--s,1));
  border-radius: calc(28px * var(--s,1));
  background: linear-gradient(180deg, #2c3d4a 0%, #1d2833 58%, #16202a 100%);
  border: calc(3px * var(--s,1)) solid #3d5666;
  box-shadow: 0 0 0 calc(3px * var(--s,1)) rgba(0,0,0,.55), 0 calc(18px * var(--s,1)) calc(60px * var(--s,1)) rgba(0,0,0,.65),
    inset 0 calc(2px * var(--s,1)) 0 rgba(255,255,255,.12), inset 0 0 calc(120px * var(--s,1)) rgba(77,208,233,.07);
  animation: statsIn .22s cubic-bezier(.34,1.56,.64,1); }
@keyframes statsIn { from { opacity: 0; transform: scale(.88); } }
#domHud .statsHead { position: relative; width: 100%; text-align: center; }
#domHud .statsTitle { display: inline-block; font-size: calc(52px * var(--s,1)); font-weight: 800;
  letter-spacing: calc(8px * var(--s,1));
  background: linear-gradient(180deg, #ffe9a8 0%, #ffcc55 48%, #e8a027 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 calc(3px * var(--s,1)) 0 rgba(0,0,0,.55)); }
#domHud .statsClose { position: absolute; top: calc(-6px * var(--s,1)); right: 0;
  width: calc(64px * var(--s,1)); height: calc(64px * var(--s,1)); border-radius: 50%;
  border: calc(3px * var(--s,1)) solid #62808f; color: #cfe2ea; font-size: calc(30px * var(--s,1)); line-height: 1;
  background: linear-gradient(180deg, #3a4e5c 0%, #26343f 100%);
  box-shadow: 0 calc(3px * var(--s,1)) 0 rgba(0,0,0,.4), inset 0 calc(2px * var(--s,1)) 0 rgba(255,255,255,.2); }
#domHud .statsDivider { width: calc(560px * var(--s,1)); height: calc(4px * var(--s,1));
  margin: calc(18px * var(--s,1)) 0 calc(26px * var(--s,1)); border-radius: calc(2px * var(--s,1));
  background: linear-gradient(90deg, transparent, rgba(128,222,228,.75), transparent); }
#domHud .statsSummary { display: flex; gap: calc(20px * var(--s,1)); margin-bottom: calc(30px * var(--s,1)); }
#domHud .statChip { display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--s,1));
  min-width: calc(240px * var(--s,1)); padding: calc(18px * var(--s,1)) calc(24px * var(--s,1));
  border-radius: calc(18px * var(--s,1)); background: rgba(10,18,26,.55);
  border: calc(2px * var(--s,1)) solid rgba(128,222,228,.22); }
#domHud .statChipVal { font-size: calc(44px * var(--s,1)); color: #9be7ff; font-variant-numeric: tabular-nums; }
#domHud .statChipLab { font-size: calc(26px * var(--s,1)); color: #8fa0ab; letter-spacing: 2px; }
#domHud .statRow { display: flex; align-items: center; gap: calc(22px * var(--s,1));
  width: calc(850px * var(--s,1)); padding: calc(18px * var(--s,1)) calc(22px * var(--s,1));
  border-radius: calc(20px * var(--s,1)); background: rgba(255,255,255,.035); margin-bottom: calc(16px * var(--s,1)); }
#domHud .statRow.lead { background: rgba(255,204,85,.07); border: calc(2px * var(--s,1)) solid rgba(255,204,85,.28); }
#domHud .statRank { flex: none; width: calc(56px * var(--s,1)); height: calc(56px * var(--s,1));
  border-radius: calc(16px * var(--s,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(34px * var(--s,1)); font-weight: 800;
  background: rgba(10,18,26,.6); color: #8fa0ab; border: calc(2px * var(--s,1)) solid rgba(255,255,255,.12); }
#domHud .statRank.rank1 { color: #1b262e; background: linear-gradient(180deg, #ffe08a, #f0a72c); border-color: #ffd76a; }
#domHud .statRank.rank2 { color: #1b262e; background: linear-gradient(180deg, #eef3f5, #a9b8c1); border-color: #d7e2e8; }
#domHud .statRank.rank3 { color: #1b262e; background: linear-gradient(180deg, #f0c08a, #c07a35); border-color: #e8a86a; }
#domHud .statAvatar { flex: none; width: calc(92px * var(--s,1)); height: calc(92px * var(--s,1));
  border-radius: calc(20px * var(--s,1)); background-color: rgba(10,18,26,.6);
  background-size: cover; background-position: 50% 18%;
  border: calc(3px * var(--s,1)) solid #4dd0e9;
  display: flex; align-items: center; justify-content: center;
  font-size: calc(44px * var(--s,1)); color: #ecf1f1; }
#domHud .statInfo { flex: 1; min-width: 0; }
#domHud .statLine { display: flex; align-items: baseline; gap: calc(14px * var(--s,1)); }
#domHud .statName { font-size: calc(34px * var(--s,1)); color: #dbe6ec; }
#domHud .statDmg { flex: 1; text-align: right; font-size: calc(40px * var(--s,1)); color: #ffffff;
  font-variant-numeric: tabular-nums; }
#domHud .statPct { font-size: calc(34px * var(--s,1)); font-variant-numeric: tabular-nums; }
#domHud .statBar { height: calc(20px * var(--s,1)); margin: calc(10px * var(--s,1)) 0 calc(8px * var(--s,1));
  border-radius: calc(10px * var(--s,1)); background: rgba(0,0,0,.4); overflow: hidden;
  box-shadow: inset 0 calc(2px * var(--s,1)) calc(4px * var(--s,1)) rgba(0,0,0,.5); }
#domHud .statBarFill { height: 100%; border-radius: calc(10px * var(--s,1)); transition: width .35s ease; }
#domHud .statSlots { display: flex; gap: calc(26px * var(--s,1)); }
#domHud .slotChip { display: inline-flex; align-items: center; gap: calc(8px * var(--s,1));
  font-size: calc(24px * var(--s,1)); font-weight: 500; color: #9aa7b0; }
#domHud .slotChip b { color: #dbe6ec; font-weight: 700; font-variant-numeric: tabular-nums; }
#domHud .slotDot { width: calc(14px * var(--s,1)); height: calc(14px * var(--s,1)); border-radius: 50%; }
#domHud .slotChip:nth-child(1) .slotDot { background: #4dd0e9; }
#domHud .slotChip:nth-child(2) .slotDot { background: #ffb74d; }
#domHud .slotChip:nth-child(3) .slotDot { background: #ff6b81; }
#domHud .failCard { display: flex; flex-direction: column; align-items: center; gap: calc(30px * var(--s,1));
  width: calc(820px * var(--s,1)); padding: calc(60px * var(--s,1)) 0; border-radius: 16px;
  background: linear-gradient(180deg, #31414d 0%, #222d36 100%);
  border: 3px solid #80dee4;
  box-shadow: 0 0 0 calc(3px * var(--s,1)) rgba(0,0,0,.55), 0 calc(16px * var(--s,1)) calc(48px * var(--s,1)) rgba(0,0,0,.6),
    inset 0 0 calc(80px * var(--s,1)) rgba(255,167,38,.06); }
#domHud .failLine { font-size: calc(42px * var(--s,1)); }
`;
        document.head.appendChild(style);
    }
}
