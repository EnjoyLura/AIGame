import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;
import { BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES } from '../core/GameManager';
import { BattleManager } from '../battle/BattleManager';

/**
 * 主城界面（战斗外玩法入口，DOM 渲染）：
 * 金币与最高波次总览、局外强化升级（火力/装甲/赏金/演练）、出战按钮。
 * 启动即显示；战斗模拟由 BattleManager._runActive 冻结；战败结算后经 HOME_SHOW 返回。
 */
@ccclass('HomeUi')
export class HomeUi extends Component {
    private static _styleInjected = false;

    private _root: HTMLDivElement | null = null;
    private _goldEl: HTMLDivElement | null = null;
    private _bestEl: HTMLDivElement | null = null;
    private _rewardEl: HTMLDivElement | null = null;
    private _rows: Array<{ def: (typeof META_UPGRADES)[number]; lv: HTMLSpanElement; eff: HTMLDivElement; cost: HTMLDivElement; btn: HTMLButtonElement }> = [];

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        this._injectStyle();
        this._build();
        // 缩放系数：设计宽 1080 → CSS 像素（与 DomHud --s 同源）
        const applyScale = () => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                document.documentElement.style.setProperty('--hs',
                    (canvas.getBoundingClientRect().width / 1080).toFixed(4));
            }
        };
        applyScale();
        window.addEventListener('resize', applyScale);
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
        if (!this._root) {
            return;
        }
        this._root.style.display = 'none';
        eventCenter.emit(GameEvent.GAME_RESTART);
        BattleManager.instance?.beginRun();
    }

    private _refresh(): void {
        const gm = GameManager.instance;
        if (this._goldEl) {
            this._goldEl.textContent = String(gm.gold);
        }
        if (this._bestEl) {
            this._bestEl.textContent = String(gm.bestWave);
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
    }

    private _build(): void {
        const root = document.createElement('div');
        root.id = 'homeUi';
        this._root = root;

        const title = document.createElement('div');
        title.className = 'homeTitle';
        title.textContent = '末日航线';
        root.appendChild(title);

        const sub = document.createElement('div');
        sub.className = 'homeSub';
        sub.textContent = '护送车队穿越尸潮 · 不断变强';
        root.appendChild(sub);

        const statsRow = document.createElement('div');
        statsRow.className = 'homeStats';
        const mkStat = (lab: string, val: string): HTMLDivElement => {
            const chip = document.createElement('div');
            chip.className = 'homeStat';
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
        this._goldEl = mkStat('金币', '0');
        this._bestEl = mkStat('最远波次', '0');
        root.appendChild(statsRow);

        const reward = document.createElement('div');
        reward.className = 'homeReward';
        reward.style.display = 'none';
        root.appendChild(reward);
        this._rewardEl = reward;

        const upTitle = document.createElement('div');
        upTitle.className = 'homeSection';
        upTitle.textContent = '基地强化';
        root.appendChild(upTitle);

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
            right.appendChild(cost);
            right.appendChild(btn);
            row.appendChild(info);
            row.appendChild(right);
            root.appendChild(row);
            this._rows.push({ def, lv, eff, cost, btn });
        }

        const start = document.createElement('button');
        start.className = 'homeStart';
        start.textContent = '出 战';
        start.onclick = (e) => {
            e.stopPropagation();
            this._startBattle();
        };
        root.appendChild(start);

        const stamp = document.createElement('div');
        stamp.className = 'homeStamp';
        stamp.textContent = BUILD_STAMP;
        root.appendChild(stamp);

        document.body.appendChild(root);
    }

    private _injectStyle(): void {
        if (HomeUi._styleInjected) {
            return;
        }
        HomeUi._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = `
#homeUi { position: fixed; inset: 0; z-index: 8500; display: flex; flex-direction: column; align-items: center;
  padding: calc(120px * var(--hs,1)) calc(60px * var(--hs,1)) calc(60px * var(--hs,1));
  background: linear-gradient(180deg, #101a24 0%, #0c141d 55%, #091018 100%);
  font-family: system-ui, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  font-weight: 700; color: #ecf1f1; user-select: none; overflow: hidden; }
#homeUi .homeTitle { font-size: calc(96px * var(--hs,1)); font-weight: 800; letter-spacing: calc(10px * var(--hs,1));
  background: linear-gradient(180deg, #ffe9a8 0%, #ffcc55 48%, #e8a027 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 calc(4px * var(--hs,1)) 0 rgba(0,0,0,.6)); }
#homeUi .homeSub { margin-top: calc(14px * var(--hs,1)); font-size: calc(30px * var(--hs,1)); color: #8fa0ab; letter-spacing: 3px; }
#homeUi .homeStats { display: flex; gap: calc(24px * var(--hs,1)); margin-top: calc(44px * var(--hs,1)); }
#homeUi .homeStat { min-width: calc(280px * var(--hs,1)); padding: calc(20px * var(--hs,1)) calc(30px * var(--hs,1));
  border-radius: calc(20px * var(--hs,1)); background: rgba(255,255,255,.04);
  border: calc(2px * var(--hs,1)) solid rgba(128,222,228,.22); text-align: center; }
#homeUi .homeStatVal { font-size: calc(52px * var(--hs,1)); color: #ffd76a; font-variant-numeric: tabular-nums; }
#homeUi .homeStatLab { font-size: calc(24px * var(--hs,1)); color: #8fa0ab; letter-spacing: 2px; margin-top: calc(4px * var(--hs,1)); }
#homeUi .homeReward { margin-top: calc(28px * var(--hs,1)); font-size: calc(32px * var(--hs,1)); color: #9be7ff;
  padding: calc(12px * var(--hs,1)) calc(30px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  background: rgba(77,208,233,.1); border: calc(2px * var(--hs,1)) solid rgba(77,208,233,.3); }
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
#homeUi .homeStart { margin-top: calc(50px * var(--hs,1)); min-width: calc(560px * var(--hs,1));
  padding: calc(30px * var(--hs,1)) 0; border: none; border-radius: calc(999px * var(--hs,1));
  font-size: calc(52px * var(--hs,1)); font-weight: 800; letter-spacing: calc(16px * var(--hs,1)); color: #0e1620; cursor: pointer;
  background: linear-gradient(180deg, #9be7ff 0%, #4dd0e9 52%, #2aa7cc 100%);
  box-shadow: 0 calc(8px * var(--hs,1)) 0 rgba(0,0,0,.4), 0 calc(14px * var(--hs,1)) calc(30px * var(--hs,1)) rgba(77,208,233,.3),
    inset 0 calc(3px * var(--hs,1)) 0 rgba(255,255,255,.4); }
#homeUi .homeStart:active { transform: translateY(calc(4px * var(--hs,1))); }
#homeUi .homeStamp { position: absolute; left: calc(20px * var(--hs,1)); bottom: calc(14px * var(--hs,1));
  font-size: calc(20px * var(--hs,1)); color: rgba(236,241,241,.4); }
`;
        document.head.appendChild(style);
    }
}
