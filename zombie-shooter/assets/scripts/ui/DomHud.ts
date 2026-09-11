import { _decorator, Component, SpriteFrame, Texture2D, sys } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, Design, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { BattleManager } from '../battle/BattleManager';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { SoundFx } from '../core/SoundFx';
import { FINAL_STAGE_ID } from '../battle/StageData';
import { LootDrop, lootDropColor, tierRank, miscDef } from '../core/HeroSystem';
import { HERO_DEFS } from '../battle/HeroDef';
import { MailSystem, MailState } from '../core/MailSystem';
import { DungeonReward, dungeonDef, DUNGEON_TIER_NAMES } from '../core/DungeonSystem';

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
    /** 载具耐久条容器（warn/danger/hit 状态类挂载点） */
    private _vehBarEl: HTMLDivElement | null = null;
    /** 低耐久红色边缘晕（危险预警） */
    private _vignette: HTMLDivElement | null = null;
    private _popupEl: HTMLDivElement | null = null;
    private _pauseMenu: HTMLDivElement | null = null;
    /** 战斗页菜单浮窗（设置/邮件入口） */
    private _battleMenu: HTMLDivElement | null = null;
    /** 战斗页邮件浮窗 */
    private _mailOverlay: HTMLDivElement | null = null;
    /** BOSS 血条（WAVE_BOSS 显示，BOSS_DEAD 收起） */
    private _bossBarEl: HTMLDivElement | null = null;
    private _bossNameEl: HTMLDivElement | null = null;
    private _bossFill: HTMLDivElement | null = null;
    /** 战斗页设置浮窗 */
    private _settingsOverlay: HTMLDivElement | null = null;
    /** 菜单按钮上的邮件红点 */
    private _menuMailRed: HTMLElement | null = null;
    private _statsOverlay: HTMLDivElement | null = null;
    private _statsTotalEl: HTMLDivElement | null = null;
    private _statsDpsEl: HTMLDivElement | null = null;
    private _statsTimeEl: HTMLDivElement | null = null;
    private _statsRows: StatRow[] = [];
    private _statsRefresh = 0;
    private _failPanel: HTMLDivElement | null = null;
    private _failTitle: HTMLDivElement | null = null;
    private _failGold: HTMLDivElement | null = null;
    private _failWave: HTMLDivElement | null = null;
    private _failKill: HTMLDivElement | null = null;
    private _failLevel: HTMLDivElement | null = null;
    /** 通关结算面板（STAGE_CLEAR / TRIAL_CLEAR 时弹出，与失败结算互斥） */
    private _clearPanel: HTMLDivElement | null = null;
    private _clearTitle: HTMLDivElement | null = null;
    /** 结算动态区：每次通关重建（统计芯片 + 掉落展示） */
    private _clearBody: HTMLDivElement | null = null;
    private _clearAdBtn: HTMLButtonElement | null = null;
    /** GOLD_EARNED 缓存：通关面板与失败面板共用金币数据源 */
    private _lastGoldEarned = 0;
    /** 结算"看广告金币×2"按钮（失败/通关各一） */
    private _failAdBtn: HTMLButtonElement | null = null;
    /** 缩放系数：设计像素 → CSS 像素（FIXED_WIDTH：宽恒定 1080 设计像素） */
    private _scale = 1;

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        this._injectStyle();
        this._build();
        eventCenter.on(GameEvent.WAVE_START, this._onWaveStart, this);
        eventCenter.on(GameEvent.WAVE_BOSS, this._onWaveBoss, this);
        eventCenter.on(GameEvent.BOSS_HP, this._onBossHp, this);
        eventCenter.on(GameEvent.BOSS_DEAD, this._onBossDead, this);
        eventCenter.on(GameEvent.XP_CHANGED, this._onXpChanged, this);
        eventCenter.on(GameEvent.VEHICLE_HP_CHANGED, this._onVehicleHpChanged, this);
        eventCenter.on(GameEvent.ENEMY_DEAD, this._onKill, this);
        eventCenter.on(GameEvent.GAME_OVER, this._onGameOver, this);
        eventCenter.on(GameEvent.ENDLESS_MILESTONE, this._onEndlessMilestone, this);
        eventCenter.on(GameEvent.STAGE_CLEAR, this._onStageClear, this);
        eventCenter.on(GameEvent.TRIAL_CLEAR, this._onTrialClear, this);
        eventCenter.on(GameEvent.DUNGEON_CLEAR, this._onDungeonClear, this);
        eventCenter.on(GameEvent.GOLD_EARNED, this._onGoldEarned, this);
        window.addEventListener('resize', () => this._layout());
        console.log('[末日航线] build', BUILD_STAMP, (window as any).__BUILD_TIME ?? '');
    }

    onDestroy(): void {
        eventCenter.off(GameEvent.WAVE_START, this._onWaveStart, this);
        eventCenter.off(GameEvent.WAVE_BOSS, this._onWaveBoss, this);
        eventCenter.off(GameEvent.BOSS_HP, this._onBossHp, this);
        eventCenter.off(GameEvent.BOSS_DEAD, this._onBossDead, this);
        eventCenter.off(GameEvent.XP_CHANGED, this._onXpChanged, this);
        eventCenter.off(GameEvent.VEHICLE_HP_CHANGED, this._onVehicleHpChanged, this);
        eventCenter.off(GameEvent.ENEMY_DEAD, this._onKill, this);
        eventCenter.off(GameEvent.GAME_OVER, this._onGameOver, this);
        eventCenter.off(GameEvent.ENDLESS_MILESTONE, this._onEndlessMilestone, this);
        eventCenter.off(GameEvent.STAGE_CLEAR, this._onStageClear, this);
        eventCenter.off(GameEvent.TRIAL_CLEAR, this._onTrialClear, this);
        eventCenter.off(GameEvent.DUNGEON_CLEAR, this._onDungeonClear, this);
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
            this._waveEl.textContent = wave > total ? '无尽' : `${wave} / ${total}`;
        }
        // 新一波开始 = 上一个 BOSS 波已结束，血条兜底收起
        if (this._bossBarEl) {
            this._bossBarEl.style.display = 'none';
        }
        if (this._failPanel) {
            this._failPanel.style.display = 'none';
        }
        if (this._clearPanel) {
            this._clearPanel.style.display = 'none';
        }
        this._root?.classList.remove('paused');
        this._flashPopup(`第 ${wave} 波`);
    }

    /** 中央弹报（波次/BOSS 提示共用）：重排强制重播 CSS 动画 */
    private _flashPopup(text: string): void {
        if (this._popupEl) {
            this._popupEl.textContent = text;
            this._popupEl.classList.remove('play');
            void (this._popupEl as HTMLElement & { offsetWidth: number }).offsetWidth;
            this._popupEl.classList.add('play');
        }
    }

    /** BOSS 波开始：弹报预警 + 血条显示满血 */
    private _onWaveBoss(name: unknown): void {
        this._flashPopup(`⚠ BOSS 来袭 · ${String(name ?? '')}`);
        if (this._bossNameEl) {
            this._bossNameEl.textContent = `👑 ${String(name ?? 'BOSS')}`;
        }
        if (this._bossFill) {
            this._bossFill.style.width = '100%';
        }
        if (this._bossBarEl) {
            this._bossBarEl.style.display = '';
        }
    }

    /** BOSS 受击：血条实时联动 */
    private _onBossHp(hp: unknown, maxHp: unknown): void {
        const cur = Number(hp ?? 0);
        const max = Number(maxHp ?? 0);
        if (this._bossFill) {
            this._bossFill.style.width = `${(max > 0 ? Math.max(0, cur / max) : 0) * 100}%`;
        }
    }

    /** BOSS 击破：收血条 + 弹报奖励 */
    private _onBossDead(reward: unknown): void {
        if (this._bossBarEl) {
            this._bossBarEl.style.display = 'none';
        }
        this._flashPopup(`👑 BOSS 击破！奖励 🪙 ${Number(reward ?? 0).toLocaleString()}`);
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
        const ratio = maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0;
        if (this._vehicleFill) {
            this._vehicleFill.style.width = `${(ratio * 100).toFixed(1)}%`;
        }
        if (this._vehicleText) {
            this._vehicleText.textContent = `${Math.ceil(Math.max(0, hp))} / ${maxHp}`;
        }
        if (this._vehBarEl) {
            // 阈值状态：>50% 常规 / ≤50% 预警 / ≤25% 危险（红条+脉冲+边缘红晕）+ 受击抖动
            this._vehBarEl.classList.toggle('warn', ratio <= 0.5 && ratio > 0.25);
            this._vehBarEl.classList.toggle('danger', ratio <= 0.25);
            this._vehBarEl.classList.remove('hit');
            void (this._vehBarEl as HTMLElement).offsetWidth;
            this._vehBarEl.classList.add('hit');
        }
        if (this._vignette) {
            this._vignette.style.display = ratio <= 0.25 ? 'block' : 'none';
            this._vignette.classList.toggle('crit', ratio <= 0.12);
        }
    }

    private _onKill(kills: number): void {
        if (this._killEl) {
            this._killEl.textContent = String(kills);
        }
    }

    private _onGameOver(): void {
        this._fillGameOver();
        this._syncAdButton(this._failAdBtn);
        if (this._failPanel) {
            this._failPanel.style.display = 'flex';
        }
    }

    /** 无尽里程碑弹幕：短暂浮动提示奖励到账（不暂停战斗） */
    private _onEndlessMilestone(wave: number, amount: number): void {
        if (!this._root) {
            return;
        }
        const el = document.createElement('div');
        el.className = 'endlessBanner';
        el.textContent = `♾️ 第 ${wave} 波里程碑 · 金币 +${amount.toLocaleString()}`;
        this._root.appendChild(el);
        SoundFx.play('buy');
        this.scheduleOnce(() => el.remove(), 3);
    }

    /** 结算双倍广告按钮：文案=本次收益金额，限次用完/无收益时隐藏 */
    private _syncAdButton(btn: HTMLButtonElement | null): void {
        if (!btn) {
            return;
        }
        const earned = Math.max(0, this._lastGoldEarned);
        const can = earned > 0 && AdService.instance.canShow('doubleSettle');
        btn.style.display = can ? '' : 'none';
        if (can) {
            const left = AdService.instance.remaining('doubleSettle');
            btn.textContent = `▶ 看广告 金币×2（今日 ${3 - left}/3）`;
        }
    }

    /** 看广告领双倍结算金币（AdService 计次，看完发等额金币） */
    private _claimDoubleGold(btn: HTMLButtonElement | null): void {
        const earned = Math.max(0, this._lastGoldEarned);
        if (earned <= 0 || !AdService.instance.canShow('doubleSettle')) {
            return;
        }
        AdService.instance.claimReward('doubleSettle', () => {
            GameManager.instance.addGold(earned);
            SoundFx.play('coin');
            // 已翻倍：清零缓存防重复领取，按钮收起
            this._lastGoldEarned = 0;
            this._syncAdButton(this._failAdBtn);
            this._syncAdButton(this._clearAdBtn);
            void btn;
        });
    }

    private _onStageClear(stageId: number, bonus: number, drops: LootDrop[]): void {
        if (this._clearTitle) {
            const hasNext = stageId < FINAL_STAGE_ID;
            this._clearTitle.textContent = hasNext ? `第 ${stageId} 关 通 关` : '全 部 通 关';
            this._clearTitle.style.color = hasNext ? '#7bdc7b' : '#ffd76a';
        }
        this._fillClearBody(bonus, drops);
    }

    /** 试炼之塔通关本层（TRIAL_CLEAR）：与关卡通关共用结算卡片，标题/文案改走塔口径 */
    private _onTrialClear(floor: number, bonus: number, drops: LootDrop[], firstClear: boolean): void {
        if (this._clearTitle) {
            this._clearTitle.textContent = `第 ${floor} 层 通 关`;
            this._clearTitle.style.color = firstClear ? '#ffd76a' : '#7bdc7b';
        }
        this._fillClearBody(bonus, drops, firstClear);
    }

    /**
     * 资源副本通关（DUNGEON_CLEAR）：复用关卡通关卡片，标题改副本文案，
     * 掉落区展示本次副本产出（金币/钻石/材料统一转成 LootDrop 形状以便复用渲染）。
     */
    private _onDungeonClear(id: string, tier: number, reward: DungeonReward | null): void {
        const def = dungeonDef(id);
        if (this._clearTitle) {
            this._clearTitle.textContent = `${def ? def.name : '副本'} · ${DUNGEON_TIER_NAMES[tier] ?? ''} 通关`;
            this._clearTitle.style.color = '#7bdc7b';
        }
        const drops: LootDrop[] = [];
        if (reward) {
            for (const line of reward.lines) {
                drops.push({
                    kind: 'misc', tier: 4, name: `${line.name} ×${line.n}`, ic: line.ic,
                });
            }
        }
        this._fillClearBody(0, drops, true);
    }

    /**
     * 通关结算动态区：统计芯片 + 金币 + 掉落展示（每次通关重建以重放入场动画）。
     * bonus = 首通奖励金币（0 表示重复通关）；trial 为真时金币标签改口径。
     */
    private _fillClearBody(bonus: number, drops: LootDrop[], trial = false): void {
        const gm = GameManager.instance;
        if (this._clearBody) {
            const body = this._clearBody;
            body.innerHTML = '';

            // 统计三芯片：击杀 / 团队等级 / 金币收益
            const chips = document.createElement('div');
            chips.className = 'clChips';
            const mkChip = (val: string, lab: string, cls: string) => {
                const c = document.createElement('div');
                c.className = 'clChip ' + cls;
                const v = document.createElement('b');
                v.textContent = val;
                const l = document.createElement('span');
                l.textContent = lab;
                c.appendChild(v);
                c.appendChild(l);
                chips.appendChild(c);
            };
            const earned = Number(this._lastGoldEarned) || 0;
            mkChip(String(gm.kills), '击杀怪物', '');
            mkChip(`Lv.${gm.level}`, '团队等级', '');
            mkChip(`+${earned}`, '金币收益' + (bonus > 0 ? (trial ? '（含首通奖）' : '（含首通）') : ''), 'gold');
            body.appendChild(chips);

            // 掉落区：有掉落才显示，逐项翻转弹出；无掉落给固定提示位
            const loot = document.createElement('div');
            loot.className = 'clLoot';
            const head = document.createElement('div');
            head.className = 'clLootHead';
            head.textContent = drops.length > 0 ? '✨ 掉 落 获 得 ✨'
                : (trial ? '本层没有掉落 · 再上一层试试' : '本次通关没有掉落 · 再接再厉');
            loot.appendChild(head);
            const grid = document.createElement('div');
            grid.className = 'clLootGrid';
            drops.forEach((d, i) => {
                const cell = document.createElement('div');
                cell.className = `clDrop r${tierRank(d.tier)}`;
                cell.style.animationDelay = `${(0.55 + i * 0.28).toFixed(2)}s`;
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
                // 掉落物落袋音效错峰播放
                this.scheduleOnce(() => {
                    SoundFx.play(d.tier >= 5 ? 'buy' : 'ui');
                }, 0.6 + i * 0.28);
            });
            loot.appendChild(grid);
            body.appendChild(loot);
        }
        this._syncAdButton(this._clearAdBtn);
        if (this._clearPanel) {
            this._clearPanel.style.display = 'flex';
        }
        if (drops.length > 0) {
            SoundFx.play('buy');
        }
    }

    private _onGoldEarned(amount: number): void {
        this._lastGoldEarned = amount;
        if (this._failGold) {
            this._failGold.textContent = `金币收益　+${amount}`;
        }
    }

    /** 结算数据：读全局 GameManager 单例 */
    private _fillGameOver(): void {
        const gm = GameManager.instance;
        const bm = BattleManager.instance;
        const endless = bm?.isEndless ?? false;
        const trialFloor = bm?.isTrial ? bm.trialFloor : 0;
        if (this._failTitle) {
            this._failTitle.textContent = trialFloor > 0 ? '试 炼 失 败' : '护 送 失 败';
        }
        if (this._failWave) {
            this._failWave.textContent = trialFloor > 0 ? `试炼层数：第 ${trialFloor} 层`
                : endless ? `无尽波数：第 ${gm.wave} 波` : `抵达波次：第 ${gm.wave} 波`;
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

    // ================= 战斗页菜单 / 邮件 / 设置 =================

    /** 菜单浮窗开关（打开时暂停战斗，关闭恢复原暂停态） */
    private _toggleBattleMenu(): void {
        if (!this._battleMenu) {
            return;
        }
        const open = this._battleMenu.style.display !== 'flex';
        this._battleMenu.style.display = open ? 'flex' : 'none';
        const bmgr = BattleManager.instance;
        if (open && bmgr && !bmgr.isPaused) {
            bmgr.togglePause();
            this._menuAutoPaused = true;
        } else if (!open && this._menuAutoPaused) {
            this._menuAutoPaused = false;
            if (bmgr && bmgr.isPaused) {
                bmgr.togglePause();
            }
        }
    }
    /** 菜单打开前战斗是否被本菜单自动暂停（关闭时恢复用） */
    private _menuAutoPaused = false;

    private _syncMenuRed(el?: HTMLElement | null): void {
        const target = el ?? this._menuMailRed;
        if (target) {
            target.classList.toggle('on', MailSystem.instance.hasUnread());
        }
    }

    private _closeMail(): void {
        if (this._mailOverlay) {
            this._mailOverlay.style.display = 'none';
        }
        this._syncMenuRed();
    }

    /** 打开邮件浮窗（每次重建列表，反映最新已读/领取状态） */
    private _openMail(): void {
        if (!this._mailOverlay) {
            return;
        }
        const list = this._mailOverlay.querySelector('.mailList') as HTMLDivElement | null;
        if (list) {
            this._fillMailList(list);
        }
        this._mailOverlay.style.display = 'flex';
    }

    private _fillMailList(list: HTMLDivElement): void {
        const ms = MailSystem.instance;
        list.innerHTML = '';
        const mails = ms.mails();
        if (mails.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'mailEmpty';
            empty.textContent = '📭 暂无邮件';
            list.appendChild(empty);
            return;
        }
        for (const m of mails) {
            const row = document.createElement('div');
            row.className = 'mailRow panel' + (m.read ? '' : ' unread') + (m.kind === 'reward' && !m.claimed ? ' claimable' : '');
            const ic = document.createElement('div');
            ic.className = 'mailIc';
            ic.textContent = m.kind === 'reward' ? '🎁' : '📢';
            row.appendChild(ic);
            const mid = document.createElement('div');
            mid.className = 'mailMid';
            const title = document.createElement('div');
            title.className = 'mailTitle';
            title.textContent = (m.read ? '' : '● ') + m.title;
            const from = document.createElement('div');
            from.className = 'mailFrom';
            from.textContent = `来自：${m.from} · ${m.kind === 'reward' ? (m.claimed ? '附件已领取' : '含附件奖励') : '系统通知'}`;
            mid.appendChild(title);
            mid.appendChild(from);
            row.appendChild(mid);
            const tag = document.createElement('div');
            tag.className = 'mailTag';
            tag.textContent = m.read ? '已读' : '未读';
            row.appendChild(tag);
            row.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openMailDetail(m.id);
            };
            list.appendChild(row);
        }
    }

    /** 邮件详情：正文 + 附件领取（奖励邮件），领取后刷新列表 */
    private _openMailDetail(id: string): void {
        const ms = MailSystem.instance;
        const m = ms.mail(id);
        if (!m) {
            return;
        }
        ms.markRead(id);
        const overlay = this._mailOverlay;
        if (!overlay) {
            return;
        }
        const panel = overlay.querySelector('.mailPanel') as HTMLDivElement;
        panel.innerHTML = '';
        const head = document.createElement('div');
        head.className = 'statsHead';
        head.appendChild(this._panelTitleEl(m.kind === 'reward' ? '🎁 奖励邮件' : '📢 系统邮件'));
        const back = document.createElement('button');
        back.className = 'statsClose';
        back.textContent = '↩';
        back.onclick = (e) => {
            e.stopPropagation();
            this._openMail();
        };
        head.appendChild(back);
        panel.appendChild(head);
        const body = document.createElement('div');
        body.className = 'mailBody';
        const title = document.createElement('div');
        title.className = 'mailBodyTitle';
        title.textContent = m.title;
        const from = document.createElement('div');
        from.className = 'mailFrom';
        from.textContent = `来自：${m.from}`;
        const text = document.createElement('div');
        text.className = 'mailText';
        for (const line of m.body.split('\n')) {
            const p = document.createElement('p');
            p.textContent = line || ' ';
            text.appendChild(p);
        }
        body.appendChild(title);
        body.appendChild(from);
        body.appendChild(text);
        panel.appendChild(body);
        // 附件区
        if (m.kind === 'reward') {
            const attach = document.createElement('div');
            attach.className = 'mailAttach';
            const r = m.reward ?? {};
            const parts: string[] = [];
            if (r.gold) {
                parts.push(`🪙 ${r.gold.toLocaleString()}`);
            }
            if (r.diamond) {
                parts.push(`💎 ${r.diamond}`);
            }
            if (r.misc) {
                parts.push(`${miscDef(r.misc.id)?.ic ?? '📦'} ${miscDef(r.misc.id)?.name ?? r.misc.id} ×${r.misc.n}`);
            }
            const label = document.createElement('div');
            label.className = 'mailAttachHead';
            label.textContent = '📦 附件奖励';
            attach.appendChild(label);
            const items = document.createElement('div');
            items.className = 'mailAttachItems';
            items.textContent = parts.join('　');
            attach.appendChild(items);
            const btn = document.createElement('button');
            btn.className = 'menuBtn mailClaimBtn';
            btn.style.background = 'linear-gradient(180deg, #c5e1a5 0%, #9ccc65 52%, #7cb342 100%)';
            if (m.claimed) {
                btn.textContent = '已领取';
                btn.disabled = true;
                btn.style.filter = 'grayscale(.6)';
            } else {
                btn.textContent = '领取附件';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (ms.claim(id)) {
                        SoundFx.play('coin');
                        this._openMailDetail(id);
                    }
                };
            }
            attach.appendChild(btn);
            panel.appendChild(attach);
        }
        const del = document.createElement('button');
        del.className = 'menuBtn mailClaimBtn';
        del.style.background = 'linear-gradient(180deg, #b0bec5 0%, #8a9aab 52%, #6d7d8c 100%)';
        del.textContent = '🗑 删除邮件';
        del.onclick = (e) => {
            e.stopPropagation();
            ms.remove(id);
            this._openMail();
        };
        panel.appendChild(del);
    }

    private _closeSettings(): void {
        if (this._settingsOverlay) {
            this._settingsOverlay.style.display = 'none';
        }
    }

    /** 战斗页设置浮窗：内容与主城设置一致（音效/音量/关于/重置存档） */
    private _openSettings(): void {
        if (!this._settingsOverlay) {
            return;
        }
        const panel = this._settingsOverlay.querySelector('.settingsPanel') as HTMLDivElement;
        panel.innerHTML = '';
        const head = document.createElement('div');
        head.className = 'statsHead';
        head.appendChild(this._panelTitleEl('⚙️ 设 置'));
        const sclose = document.createElement('button');
        sclose.className = 'statsClose';
        sclose.textContent = '✕';
        sclose.onclick = (e) => {
            e.stopPropagation();
            this._closeSettings();
        };
        head.appendChild(sclose);
        panel.appendChild(head);
        this._fillSettings(panel);
        this._settingsOverlay.style.display = 'flex';
    }

    private _fillSettings(panel: HTMLDivElement): void {
        const mkHead = (icon: string, text: string): HTMLDivElement => {
            const h = document.createElement('div');
            h.className = 'bSetHead';
            h.textContent = `${icon} ${text}`;
            return h;
        };
        // 音效
        panel.appendChild(mkHead('🔊', '音效'));
        const soundRow = document.createElement('div');
        soundRow.className = 'bSetRow';
        soundRow.innerHTML = '<span>战斗与界面音效</span>';
        const sndBtn = document.createElement('button');
        sndBtn.className = 'bSetBtn';
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
        panel.appendChild(soundRow);
        // 音量
        const volRow = document.createElement('div');
        volRow.className = 'bSetRow';
        volRow.innerHTML = '<span>音量</span>';
        const volWrap = document.createElement('div');
        volWrap.className = 'bSetVol';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = String(Math.round(SoundFx.volume * 100));
        const volNum = document.createElement('b');
        const syncVol = () => {
            volNum.textContent = `${slider.value}%`;
        };
        syncVol();
        slider.addEventListener('input', () => {
            SoundFx.setVolume(Number(slider.value) / 100);
            syncVol();
        });
        slider.addEventListener('change', () => SoundFx.play('coin'));
        volWrap.appendChild(slider);
        volWrap.appendChild(volNum);
        volRow.appendChild(volWrap);
        panel.appendChild(volRow);
        // 关于
        panel.appendChild(mkHead('ℹ️', '关于'));
        const about = document.createElement('div');
        about.className = 'bSetRow col';
        about.innerHTML = `<div class="bSetLine"><span>版本</span><b>${BUILD_STAMP}</b></div>` +
            `<div class="bSetLine"><span>游戏</span><b>末日航线 · 尸潮突围</b></div>`;
        panel.appendChild(about);
        // 危险区
        panel.appendChild(mkHead('⚠️', '危险操作'));
        const resetBtn = document.createElement('button');
        resetBtn.className = 'bSetBtn reset';
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
            setTimeout(() => location.reload(), 300);
        };
        panel.appendChild(resetBtn);
    }

    /** 面板标题（金色渐变，与伤害统计同款）；_panelTitleEl 为独立节点版 */
    private _panelTitleEl(text: string): HTMLDivElement {
        const t = document.createElement('div');
        t.className = 'statsTitle';
        t.textContent = text;
        return t;
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
        if (this._failPanel) {
            this._failPanel.style.display = 'none';
        }
        if (this._clearPanel) {
            this._clearPanel.style.display = 'none';
        }
        // 重试转移统一走流程状态机（settle → battle，再扣体力开波）
        GameFlow.instance.retry();
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

        // 顶部信息板：深色渐变横条 + 左按钮组 / 中央波次 / 右侧时间·击杀 chips
        const top = document.createElement('div');
        top.className = 'topbar';
        root.appendChild(top);
        const topLeft = document.createElement('div');
        topLeft.className = 'topLeft';
        top.appendChild(topLeft);
        topLeft.appendChild(this._button('暂停', () => this._togglePause(), 'pauseBtn'));
        topLeft.appendChild(this._button('统计', () => this._toggleStats(), 'statsBtn'));
        const waveChip = document.createElement('div');
        waveChip.className = 'chip waveChip';
        waveChip.appendChild(this._chipLab('波次'));
        this._waveEl = this._chipVal(waveChip, '3 / 10');
        top.appendChild(waveChip);
        const topRight = document.createElement('div');
        topRight.className = 'topRight';
        top.appendChild(topRight);
        const timeChip = document.createElement('div');
        timeChip.className = 'chip';
        timeChip.appendChild(this._chipLab('时间'));
        this._timeEl = this._chipVal(timeChip, '00:00');
        topRight.appendChild(timeChip);
        const killChip = document.createElement('div');
        killChip.className = 'chip killChip';
        killChip.appendChild(this._chipLab('击杀'));
        this._killEl = this._chipVal(killChip, '0');
        topRight.appendChild(killChip);

        // 经验条：等级徽章 + 渐变发光条
        const xpRow = document.createElement('div');
        xpRow.className = 'xpRow';
        root.appendChild(xpRow);
        this._levelEl = this._label(xpRow, 'levelBadge', 'Lv.1');
        const xpBar = document.createElement('div');
        xpBar.className = 'xpBar';
        this._xpFill = document.createElement('div');
        this._xpFill.className = 'xpFill';
        this._xpFill.style.width = '0%';
        xpBar.appendChild(this._xpFill);
        xpRow.appendChild(xpBar);

        // 载具耐久：标签 + 轨道条 + 数值（warn/danger/hit 状态）+ 低耐久红晕
        const vBar = document.createElement('div');
        vBar.className = 'vehicleBar';
        this._vehBarEl = vBar;
        const vLab = document.createElement('div');
        vLab.className = 'vehLab';
        vLab.textContent = '载具';
        vBar.appendChild(vLab);
        const track = document.createElement('div');
        track.className = 'vehTrack';
        this._vehicleFill = document.createElement('div');
        this._vehicleFill.className = 'vehicleFill';
        this._vehicleFill.style.width = '100%';
        track.appendChild(this._vehicleFill);
        vBar.appendChild(track);
        this._vehicleText = this._label(vBar, 'vehicleText', `${BattleConfig.VEHICLE_MAX_HP} / ${BattleConfig.VEHICLE_MAX_HP}`);
        root.appendChild(vBar);

        // 低耐久红色边缘晕
        const vig = document.createElement('div');
        vig.className = 'vignette';
        vig.style.display = 'none';
        root.appendChild(vig);
        this._vignette = vig;

        // 中央波次提示
        this._popupEl = document.createElement('div');
        this._popupEl.className = 'popup';
        root.appendChild(this._popupEl);

        // BOSS 血条：顶部中央，WAVE_BOSS 显示 / BOSS_DEAD 收起
        const bossBar = document.createElement('div');
        bossBar.className = 'bossBar';
        bossBar.style.display = 'none';
        const bossName = document.createElement('div');
        bossName.className = 'bossName';
        bossBar.appendChild(bossName);
        const bossTrack = document.createElement('div');
        bossTrack.className = 'bossTrack';
        this._bossFill = document.createElement('div');
        this._bossFill.className = 'bossFill';
        this._bossFill.style.width = '100%';
        bossTrack.appendChild(this._bossFill);
        bossBar.appendChild(bossTrack);
        root.appendChild(bossBar);
        this._bossBarEl = bossBar;
        this._bossNameEl = bossName;

        // 暂停菜单
        const pm = document.createElement('div');
        pm.className = 'menuOverlay';
        pm.style.display = 'none';
        pm.appendChild(this._bigLabel('已暂停', 84));
        pm.appendChild(this._menuButton('继 续 游 戏', '#4dd0e9', () => this._togglePause()));
        pm.appendChild(this._menuButton('重 新 挑 战', '#ffa726', () => this._restart()));
        pm.appendChild(this._menuButton('退 出 关 卡', '#ef5350', () => {
            if (this._pauseMenu) {
                this._pauseMenu.style.display = 'none';
            }
            BattleManager.instance?.exitRun();
        }));
        root.appendChild(pm);
        this._pauseMenu = pm;

        // 战斗页菜单：菜单按钮（含邮件红点）+ 菜单浮窗（邮件/设置/关闭）
        const menuBtn = this._button('菜单', () => this._toggleBattleMenu(), 'menuBtn');
        const red = document.createElement('i');
        red.className = 'mailRed';
        menuBtn.appendChild(red);
        this._syncMenuRed();
        this._menuMailRed = red;
        topLeft.appendChild(menuBtn);

        const bm = document.createElement('div');
        bm.className = 'statsOverlay';
        bm.style.display = 'none';
        bm.onclick = () => this._toggleBattleMenu();
        const bmp = document.createElement('div');
        bmp.className = 'statsPanel battleMenuPanel';
        bmp.onclick = (e) => e.stopPropagation();
        const bmpHead = document.createElement('div');
        bmpHead.className = 'statsHead';
        bmpHead.appendChild(this._panelTitleEl('菜 单'));
        bmp.appendChild(bmpHead);
        bmp.appendChild(this._menuButton('📬 邮 箱', '#4dd0e9', () => {
            this._toggleBattleMenu();
            this._openMail();
        }));
        const mbRed = document.createElement('i');
        mbRed.className = 'mailRed menu';
        this._syncMenuRed(mbRed);
        (bmp.lastChild as HTMLButtonElement).appendChild(mbRed);
        bmp.appendChild(this._menuButton('⚙️ 设 置', '#8a9aab', () => {
            this._toggleBattleMenu();
            this._openSettings();
        }));
        bmp.appendChild(this._menuButton('返 回 战 斗', '#ffa726', () => this._toggleBattleMenu()));
        bm.appendChild(bmp);
        root.appendChild(bm);
        this._battleMenu = bm;

        // 战斗页邮件浮窗（点遮罩或 ✕ 关闭）
        const mo = document.createElement('div');
        mo.className = 'statsOverlay';
        mo.style.display = 'none';
        mo.onclick = () => this._closeMail();
        const mpanel = document.createElement('div');
        mpanel.className = 'statsPanel mailPanel';
        mpanel.onclick = (e) => e.stopPropagation();
        const mhead = document.createElement('div');
        mhead.className = 'statsHead';
        mhead.appendChild(this._panelTitleEl('📬 邮 箱'));
        const mclose = document.createElement('button');
        mclose.className = 'statsClose';
        mclose.textContent = '✕';
        mclose.onclick = (e) => {
            e.stopPropagation();
            this._closeMail();
        };
        mhead.appendChild(mclose);
        mpanel.appendChild(mhead);
        const mlist = document.createElement('div');
        mlist.className = 'mailList';
        this._fillMailList(mlist);
        mpanel.appendChild(mlist);
        mo.appendChild(mpanel);
        root.appendChild(mo);
        this._mailOverlay = mo;

        // 战斗页设置浮窗（音效/音量/关于/重置，与主城设置同内容）
        const so = document.createElement('div');
        so.className = 'statsOverlay';
        so.style.display = 'none';
        so.onclick = () => this._closeSettings();
        const spanel = document.createElement('div');
        spanel.className = 'statsPanel settingsPanel';
        spanel.onclick = (e) => e.stopPropagation();
        const shead = document.createElement('div');
        shead.className = 'statsHead';
        shead.appendChild(this._panelTitleEl('⚙️ 设 置'));
        const sclose = document.createElement('button');
        sclose.className = 'statsClose';
        sclose.textContent = '✕';
        sclose.onclick = (e) => {
            e.stopPropagation();
            this._closeSettings();
        };
        shead.appendChild(sclose);
        spanel.appendChild(shead);
        this._fillSettings(spanel);
        so.appendChild(spanel);
        root.appendChild(so);
        this._settingsOverlay = so;

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
        // 标题复用（试炼局显示「试炼失败」，普通局「护送失败」），_fillGameOver 按模式改文案
        this._failTitle = this._bigLabel('护 送 失 败', 72);
        card.appendChild(this._failTitle);
        this._failWave = this._label(card, 'failLine', '');
        this._failKill = this._label(card, 'failLine', '');
        this._failLevel = this._label(card, 'failLine', '');
        this._failGold = this._label(card, 'failGold', '');
        card.appendChild(this._menuButton('重 试 一 次', '#ffa726', () => this._restart()));
        this._failAdBtn = this._menuButton('', '#9ccc65', () => this._claimDoubleGold(this._failAdBtn));
        card.appendChild(this._failAdBtn);
        card.appendChild(this._menuButton('返 回 主 城', '#4dd0e9', () => {
            if (this._failPanel) {
                this._failPanel.style.display = 'none';
            }
            GameFlow.instance.toHome();
        }));
        fp.appendChild(card);
        root.appendChild(fp);
        this._failPanel = fp;

        // 关卡通关结算（STAGE_CLEAR）：重设计卡片 = 金字标题 + 统计芯片 + 掉落展示 + 双倍/返回
        const cp = document.createElement('div');
        cp.className = 'menuOverlay clearOverlay';
        cp.style.display = 'none';
        const ccard = document.createElement('div');
        ccard.className = 'clearCard';
        this._clearTitle = this._bigLabel('通 关', 72);
        this._clearTitle.className = 'bigLabel clTitle';
        this._clearTitle.style.fontSize = '';
        ccard.appendChild(this._clearTitle);
        this._clearBody = document.createElement('div');
        this._clearBody.className = 'clBody';
        ccard.appendChild(this._clearBody);
        this._clearAdBtn = this._menuButton('', '#9ccc65', () => this._claimDoubleGold(this._clearAdBtn));
        ccard.appendChild(this._clearAdBtn);
        ccard.appendChild(this._menuButton('返 回 主 城', '#7bdc7b', () => {
            if (this._clearPanel) {
                this._clearPanel.style.display = 'none';
            }
            GameFlow.instance.toHome();
        }));
        cp.appendChild(ccard);
        root.appendChild(cp);
        this._clearPanel = cp;

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

    private _chipLab(text: string): HTMLSpanElement {
        const el = document.createElement('span');
        el.className = 'chipLab';
        el.textContent = text;
        return el;
    }

    private _chipVal(parent: HTMLElement, text: string): HTMLDivElement {
        const el = document.createElement('div');
        el.className = 'chipVal';
        el.textContent = text;
        parent.appendChild(el);
        return el;
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
#domHud .topbar { position: absolute; top: 0; left: 0; right: 0; height: calc(120px * var(--s, 1));
  background: linear-gradient(180deg, rgba(9,14,20,.92) 0%, rgba(13,22,31,.75) 62%, rgba(13,22,31,0) 100%); }
#domHud .topLeft { position: absolute; left: calc(16px * var(--s,1)); top: calc(30px * var(--s,1)); display: flex; gap: calc(12px * var(--s,1)); }
#domHud .topRight { position: absolute; right: calc(16px * var(--s,1)); top: calc(40px * var(--s,1)); display: flex; align-items: center; gap: calc(14px * var(--s,1)); }
#domHud .chip { display: flex; align-items: baseline; gap: calc(8px * var(--s,1)); padding: calc(10px * var(--s,1)) calc(22px * var(--s,1));
  border-radius: calc(999px * var(--s,1)); background: rgba(10,18,26,.62);
  border: calc(2px * var(--s,1)) solid rgba(128,222,228,.25);
  box-shadow: inset 0 calc(2px * var(--s,1)) calc(4px * var(--s,1)) rgba(0,0,0,.4); }
#domHud .chipLab { font-size: calc(22px * var(--s,1)); color: #8fa0ab; letter-spacing: 1px; }
#domHud .chipVal { font-size: calc(34px * var(--s,1)); color: #ecf1f1; font-variant-numeric: tabular-nums; }
#domHud .waveChip { position: absolute; left: 50%; transform: translateX(-50%); top: calc(34px * var(--s,1));
  border-color: rgba(255,204,85,.4); }
#domHud .waveChip .chipVal { color: #ffd76a; font-weight: 800; }
#domHud .killChip .chipVal { color: #ff8f9a; font-weight: 800; }
#domHud .buildStamp { position: absolute; left: calc(16px * var(--s,1)); bottom: calc(10px * var(--s,1));
  font-size: calc(22px * var(--s,1)); color: #c3ced5; letter-spacing: .5px;
  padding: 2px 4px; border-radius: 3px; background: rgba(15,22,30,.75); }
#domHud .hudBtn { border-radius: calc(18px * var(--s,1)); border: calc(2px * var(--s,1)) solid #80dee4;
  width: calc(84px * var(--s,1)); height: calc(84px * var(--s,1));
  background: linear-gradient(180deg, #344652 0%, #26343f 55%, #1b2630 100%);
  color: #ecf1f1; font-size: calc(27px * var(--s,1)); line-height: 1;
  box-shadow: 0 calc(4px * var(--s,1)) 0 rgba(0,0,0,.45), inset 0 calc(2px * var(--s,1)) 0 rgba(255,255,255,.28); }
#domHud .xpRow { position: absolute; top: calc(128px * var(--s,1)); left: calc(34px * var(--s,1));
  right: calc(34px * var(--s,1)); height: calc(46px * var(--s,1)); display: flex; align-items: center; gap: calc(16px * var(--s,1)); }
#domHud .levelBadge { flex: none; min-width: calc(96px * var(--s,1)); height: calc(46px * var(--s,1));
  padding: 0 calc(18px * var(--s,1)); border-radius: calc(999px * var(--s,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(30px * var(--s,1)); font-weight: 800;
  color: #ffffff; background: linear-gradient(180deg, #2aa7cc, #1e88a8);
  border: calc(3px * var(--s,1)) solid #9be7ff; box-shadow: 0 calc(3px * var(--s,1)) 0 rgba(0,0,0,.4); }
#domHud .xpBar { flex: 1; height: calc(24px * var(--s,1)); border-radius: calc(999px * var(--s,1));
  background: rgba(8,14,20,.8); border: calc(2px * var(--s,1)) solid rgba(128,222,228,.28);
  overflow: hidden; box-shadow: inset 0 calc(3px * var(--s,1)) calc(6px * var(--s,1)) rgba(0,0,0,.5); }
#domHud .xpFill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #1e88a8, #4dd0e9 60%, #a5f3ff);
  box-shadow: 0 0 calc(12px * var(--s,1)) rgba(77,208,233,.55); transition: width .25s ease; }
#domHud .vehicleBar { position: absolute; left: 50%;
  transform: translateX(-50%); width: calc(480px * var(--s,1)); height: calc(40px * var(--s,1));
  display: flex; align-items: center; gap: calc(12px * var(--s,1)); padding: 0 calc(20px * var(--s,1));
  border-radius: calc(999px * var(--s,1)); background: rgba(8,14,20,.72);
  border: calc(2px * var(--s,1)) solid rgba(217,155,66,.35); }
#domHud .vehLab { flex: none; font-size: calc(22px * var(--s,1)); color: #d9b06a; letter-spacing: 1px; }
#domHud .vehTrack { flex: 1; height: calc(20px * var(--s,1)); border-radius: calc(999px * var(--s,1));
  background: rgba(0,0,0,.45); overflow: hidden; box-shadow: inset 0 calc(2px * var(--s,1)) calc(4px * var(--s,1)) rgba(0,0,0,.5); }
#domHud .vehicleFill { height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #8a5a1e, #d99b42 60%, #ffcf7d); transition: width .25s ease; }
#domHud .vehicleBar.warn .vehicleFill { background: linear-gradient(90deg, #a05a12, #ff8f3d 60%, #ffc37d); }
#domHud .vehicleBar.danger .vehicleFill { background: linear-gradient(90deg, #8f1d1d, #ff4d4d 60%, #ff9d9d); }
#domHud .bossBar { position: absolute; left: 50%; top: calc(196px * var(--s,1));
  transform: translateX(-50%); width: calc(640px * var(--s,1)); display: flex; flex-direction: column;
  align-items: center; gap: calc(6px * var(--s,1)); padding: calc(10px * var(--s,1)) calc(24px * var(--s,1));
  border-radius: calc(16px * var(--s,1)); background: rgba(8,12,18,.72);
  border: calc(2px * var(--s,1)) solid rgba(255,193,7,.45); }
#domHud .bossName { font-size: calc(26px * var(--s,1)); color: #ffd75e; letter-spacing: 2px;
  text-shadow: 0 1px 3px rgba(0,0,0,.85); }
#domHud .bossTrack { width: 100%; height: calc(18px * var(--s,1)); border-radius: calc(999px * var(--s,1));
  background: rgba(0,0,0,.5); overflow: hidden; box-shadow: inset 0 calc(2px * var(--s,1)) calc(4px * var(--s,1)) rgba(0,0,0,.5); }
#domHud .bossFill { height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #a3271d, #ef5350 55%, #ff9d7d); transition: width .2s ease; }
#domHud .vehicleBar.danger { border-color: rgba(255,77,77,.6); animation: vehPulse 1s ease-in-out infinite; }
#domHud .vehicleBar.hit { animation: vehShake .28s ease; }
@keyframes vehPulse { 50% { box-shadow: 0 0 calc(24px * var(--s,1)) rgba(255,77,77,.55); } }
@keyframes vehShake { 0%, 100% { transform: translateX(-50%); }
  25% { transform: translateX(calc(-50% + 5px * var(--s,1))); }
  75% { transform: translateX(calc(-50% - 5px * var(--s,1))); } }
#domHud .vignette { position: absolute; inset: 0; pointer-events: none; opacity: .8;
  box-shadow: inset 0 0 calc(160px * var(--s,1)) rgba(255,45,45,.36); transition: opacity .4s ease; }
#domHud .vignette.crit { animation: vinPulse .8s ease-in-out infinite; }
@keyframes vinPulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
#domHud .vehicleText { position: absolute; inset: 0; text-align: center;
  font-size: calc(23px * var(--s,1)); line-height: calc(40px * var(--s,1)); font-variant-numeric: tabular-nums; }
#domHud .popup { position: absolute; top: 16%; left: 50%; transform: translateX(-50%); opacity: 0;
  font-size: calc(88px * var(--s,1)); font-weight: 800;
  background: linear-gradient(180deg, #ffe9a8 0%, #ffcc55 52%, #e8a027 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 calc(4px * var(--s,1)) 0 rgba(0,0,0,.6)) drop-shadow(0 0 calc(18px * var(--s,1)) rgba(255,204,85,.35)); }
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

/* ===== 战斗页菜单 / 邮箱 / 设置浮窗 ===== */
#domHud .hudBtn.menuBtn { position: relative; }
#domHud .mailRed { display: none; position: absolute; top: calc(-4px * var(--s,1)); right: calc(-4px * var(--s,1));
  width: calc(20px * var(--s,1)); height: calc(20px * var(--s,1)); border-radius: 50%; background: #ff5252;
  border: calc(2px * var(--s,1)) solid #ffd5d5; box-shadow: 0 0 calc(8px * var(--s,1)) rgba(255,82,82,.8); }
#domHud .mailRed.on { display: block; }
#domHud .battleMenuPanel { gap: calc(24px * var(--s,1)); width: calc(640px * var(--s,1)); }
#domHud .battleMenuPanel .menuBtn { position: relative; min-width: calc(420px * var(--s,1)); font-size: calc(36px * var(--s,1));
  padding: calc(20px * var(--s,1)) calc(40px * var(--s,1)); }
#domHud .battleMenuPanel .mailRed.menu { width: calc(16px * var(--s,1)); height: calc(16px * var(--s,1));
  top: calc(6px * var(--s,1)); right: calc(10px * var(--s,1)); border-width: calc(2px * var(--s,1)); }
#domHud .mailPanel, #domHud .settingsPanel { width: calc(980px * var(--s,1)); max-height: 78vh; overflow-y: auto; }
#domHud .mailList { width: 100%; display: flex; flex-direction: column; gap: calc(14px * var(--s,1)); margin-top: calc(20px * var(--s,1)); }
#domHud .mailRow { display: flex; align-items: center; gap: calc(18px * var(--s,1)); text-align: left;
  padding: calc(16px * var(--s,1)) calc(20px * var(--s,1)); border-radius: calc(16px * var(--s,1));
  background: rgba(255,255,255,.035); border: calc(2px * var(--s,1)) solid rgba(255,255,255,.08);
  cursor: pointer; }
#domHud .mailRow.unread { border-color: rgba(255,204,85,.45); background: rgba(255,204,85,.06); }
#domHud .mailRow.claimable { border-color: rgba(156,204,101,.5); }
#domHud .mailIc { flex: none; width: calc(72px * var(--s,1)); height: calc(72px * var(--s,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(38px * var(--s,1));
  border-radius: calc(14px * var(--s,1)); background: rgba(10,18,26,.6);
  border: calc(2px * var(--s,1)) solid rgba(255,255,255,.12); }
#domHud .mailMid { flex: 1; min-width: 0; }
#domHud .mailTitle { font-size: calc(30px * var(--s,1)); color: #ffe9a8; }
#domHud .mailRow.unread .mailTitle { color: #ffd76a; }
#domHud .mailFrom { font-size: calc(22px * var(--s,1)); color: #8fa0ab; margin-top: calc(6px * var(--s,1)); }
#domHud .mailTag { flex: none; font-size: calc(22px * var(--s,1)); color: #8fa0ab; }
#domHud .mailRow.unread .mailTag { color: #ffd76a; }
#domHud .mailEmpty { padding: calc(60px * var(--s,1)) 0; text-align: center; font-size: calc(30px * var(--s,1)); color: #8fa0ab; }
#domHud .mailBody { width: 100%; margin-top: calc(20px * var(--s,1)); text-align: left; }
#domHud .mailBodyTitle { font-size: calc(38px * var(--s,1)); color: #ffe9a8; font-weight: 800; }
#domHud .mailText { margin-top: calc(18px * var(--s,1)); padding: calc(20px * var(--s,1));
  border-radius: calc(14px * var(--s,1)); background: rgba(0,0,0,.25); }
#domHud .mailText p { margin: 0 0 calc(10px * var(--s,1)); font-size: calc(26px * var(--s,1)); line-height: 1.7;
  color: #cfe2ea; font-weight: 500; }
#domHud .mailAttach { width: 100%; margin-top: calc(24px * var(--s,1)); padding: calc(18px * var(--s,1)) calc(20px * var(--s,1));
  border-radius: calc(14px * var(--s,1)); background: rgba(156,204,101,.08);
  border: calc(2px * var(--s,1)) dashed rgba(156,204,101,.45); display: flex; flex-direction: column;
  align-items: center; gap: calc(14px * var(--s,1)); }
#domHud .mailAttachHead { align-self: flex-start; font-size: calc(26px * var(--s,1)); color: #c5e1a5; }
#domHud .mailAttachItems { font-size: calc(28px * var(--s,1)); color: #ffffff; font-weight: 700; }
#domHud .mailClaimBtn { min-width: calc(320px * var(--s,1)); margin-top: calc(20px * var(--s,1));
  font-size: calc(30px * var(--s,1)); padding: calc(16px * var(--s,1)) calc(30px * var(--s,1)); }
#domHud .mailClaimBtn:disabled { filter: grayscale(.6); }
#domHud .bSetHead { width: 100%; text-align: left; font-size: calc(30px * var(--s,1)); color: #ffe9a8;
  margin: calc(20px * var(--s,1)) 0 calc(10px * var(--s,1)); }
#domHud .bSetRow { display: flex; align-items: center; justify-content: space-between; width: 100%;
  padding: calc(14px * var(--s,1)) calc(4px * var(--s,1)); font-size: calc(26px * var(--s,1)); color: #cfe2ea; }
#domHud .bSetRow.col { flex-direction: column; align-items: stretch; gap: calc(10px * var(--s,1)); }
#domHud .bSetLine { display: flex; justify-content: space-between; }
#domHud .bSetLine b { color: #ffe9a8; }
#domHud .bSetBtn { min-width: calc(220px * var(--s,1)); height: calc(64px * var(--s,1)); border-radius: calc(32px * var(--s,1));
  border: calc(2px * var(--s,1)) solid #80dee4; color: #ecf1f1; font-size: calc(26px * var(--s,1));
  background: linear-gradient(180deg, #344652 0%, #26343f 100%);
  box-shadow: 0 calc(3px * var(--s,1)) 0 rgba(0,0,0,.4); }
#domHud .bSetBtn.reset { border-color: #ff8f9a; color: #ffb3bb; }
#domHud .bSetVol { display: flex; align-items: center; gap: calc(14px * var(--s,1)); flex: 1; margin-left: calc(20px * var(--s,1)); }
#domHud .bSetVol input[type="range"] { flex: 1; }
#domHud .bSetVol b { min-width: calc(80px * var(--s,1)); text-align: right; color: #9be7ff; }

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
#domHud .failGold { font-size: calc(42px * var(--s,1)); color: #ffd76a; }
/* --- 通关结算重设计 --- */
#domHud .clearOverlay { background: radial-gradient(ellipse at center, rgba(24,52,38,.78) 0%, rgba(0,0,0,.82) 100%); }
#domHud .clearCard { display: flex; flex-direction: column; align-items: center; gap: calc(30px * var(--s,1));
  width: calc(880px * var(--s,1)); padding: calc(48px * var(--s,1)) calc(30px * var(--s,1)) calc(44px * var(--s,1));
  border-radius: calc(24px * var(--s,1)); background: linear-gradient(180deg, #2c4438 0%, #1e2f27 58%, #17241e 100%);
  border: calc(3px * var(--s,1)) solid #7bdc7b;
  box-shadow: 0 0 0 calc(3px * var(--s,1)) rgba(0,0,0,.55), 0 calc(16px * var(--s,1)) calc(48px * var(--s,1)) rgba(0,0,0,.6),
    inset 0 0 calc(110px * var(--s,1)) rgba(123,220,123,.08);
  animation: clCardIn .38s cubic-bezier(.34,1.56,.64,1); }
@keyframes clCardIn { from { opacity: 0; transform: scale(.86) translateY(calc(30px * var(--s,1))); } }
#domHud .clTitle { font-size: calc(84px * var(--s,1)); letter-spacing: calc(12px * var(--s,1));
  background: linear-gradient(180deg, #eaffea 0%, #7bdc7b 55%, #3f9f4f 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 calc(4px * var(--s,1)) 0 rgba(0,0,0,.55));
  animation: clTitleBounce .5s cubic-bezier(.34,1.8,.64,1) .1s both; }
@keyframes clTitleBounce { from { opacity: 0; transform: scale(.4) rotate(-4deg); }
  60% { opacity: 1; transform: scale(1.12) rotate(1deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
#domHud .clBody { display: flex; flex-direction: column; align-items: center; gap: calc(26px * var(--s,1)); width: 100%; }
#domHud .clChips { display: flex; gap: calc(18px * var(--s,1)); animation: clFadeUp .4s ease-out .18s both; }

/* ===== 无尽模式（里程碑弹幕） ===== */
#domHud .endlessBanner { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); z-index: 320;
  font-size: calc(26px * var(--s,1)); font-weight: 800; color: #ffe9a8; white-space: nowrap;
  background: rgba(10,18,34,.82); border: 1px solid #8a6a20; border-radius: 99px;
  padding: calc(10px * var(--s,1)) calc(28px * var(--s,1)); box-shadow: 0 0 16px rgba(240,177,62,.3);
  animation: endlessBan 3s ease-out both; pointer-events: none; }
@keyframes endlessBan { 0% { opacity: 0; transform: translateX(-50%) translateY(18px); }
  12% { opacity: 1; transform: translateX(-50%) translateY(0); }
  82% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) translateY(-14px); } }
@keyframes clFadeUp { from { opacity: 0; transform: translateY(calc(22px * var(--s,1))); } }
#domHud .clChip { display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--s,1));
  min-width: calc(230px * var(--s,1)); padding: calc(14px * var(--s,1)) calc(24px * var(--s,1));
  border-radius: calc(16px * var(--s,1)); background: rgba(10,18,14,.55);
  border: calc(2px * var(--s,1)) solid rgba(123,220,123,.25); }
#domHud .clChip b { font-size: calc(42px * var(--s,1)); color: #dff5e4; font-variant-numeric: tabular-nums; }
#domHud .clChip.gold b { color: #ffd76a; }
#domHud .clChip span { font-size: calc(24px * var(--s,1)); color: #8fa898; letter-spacing: calc(3px * var(--s,1)); }
#domHud .clLoot { display: flex; flex-direction: column; align-items: center; gap: calc(16px * var(--s,1));
  width: calc(780px * var(--s,1)); padding: calc(18px * var(--s,1)) 0; border-radius: calc(16px * var(--s,1));
  background: rgba(8,16,12,.45); border: calc(2px * var(--s,1)) dashed rgba(123,220,123,.3);
  animation: clFadeUp .4s ease-out .32s both; }
#domHud .clLootHead { font-size: calc(28px * var(--s,1)); color: #b9d9c2; letter-spacing: calc(6px * var(--s,1)); }
#domHud .clLootGrid { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(16px * var(--s,1));
  min-height: calc(150px * var(--s,1)); align-items: center; }
#domHud .clDrop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(6px * var(--s,1));
  width: calc(220px * var(--s,1)); height: calc(150px * var(--s,1)); border-radius: calc(14px * var(--s,1));
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.35));
  border: calc(3px * var(--s,1)) solid rgba(123,220,123,.35);
  opacity: 0; animation: clDropIn .45s cubic-bezier(.34,1.56,.64,1) both; }
#domHud .clDrop.r3 { border-color: #5ab0f0; }
#domHud .clDrop.r4 { border-color: #c07ef5; }
#domHud .clDrop.r5 { border-color: #ff9d45; box-shadow: 0 0 calc(20px * var(--s,1)) rgba(255,157,69,.35); }
#domHud .clDrop.r6 { border-color: #ff5252; box-shadow: 0 0 calc(28px * var(--s,1)) rgba(255,82,82,.5); animation: clDropIn .45s cubic-bezier(.34,1.56,.64,1) both, clRedPulse 1.4s ease-in-out infinite; }
@keyframes clRedPulse { 0%, 100% { box-shadow: 0 0 calc(18px * var(--s,1)) rgba(255,82,82,.4); } 50% { box-shadow: 0 0 calc(38px * var(--s,1)) rgba(255,82,82,.75); } }
#domHud .clDropIc { font-size: calc(58px * var(--s,1)); line-height: 1; filter: drop-shadow(0 calc(3px * var(--s,1)) calc(4px * var(--s,1)) rgba(0,0,0,.5)); }
#domHud .clDropNm { font-size: calc(27px * var(--s,1)); text-shadow: 0 calc(2px * var(--s,1)) calc(3px * var(--s,1)) rgba(0,0,0,.6); }
@keyframes clDropIn { from { opacity: 0; transform: scale(.3) rotate(-10deg); }
  65% { opacity: 1; transform: scale(1.14) rotate(2deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
`;
        document.head.appendChild(style);
    }
}
