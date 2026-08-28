import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from '../battle/BattleManager';

/**
 * GM 调试面板（浏览器预览专用）：DOM 覆盖层按钮，免等待快速验证技能/大招/波次/失败流程。
 * 支持输入 1~4 号位（上阵顺序），对单个英雄切换「技能无冷却」「无限大招」，再次执行即关闭。
 * 微信小游戏运行时没有 document，本面板自动不生效，无需打包前删除。
 */
@ccclass('GmPanel')
export class GmPanel extends Component {
    private _root: HTMLDivElement | null = null;
    private _body: HTMLDivElement | null = null;
    private _slotInput: HTMLInputElement | null = null;
    private _status: HTMLDivElement | null = null;
    /** 号位状态镜像（仅用于面板显示，真值在 BattleManager） */
    private _noSkillCd = [false, false, false, false];
    private _infUlt = [false, false, false, false];

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        const root = document.createElement('div');
        root.style.cssText =
            'position:fixed;top:90px;right:6px;z-index:9999;display:flex;flex-direction:column;' +
            'align-items:flex-end;gap:4px;font:12px/1.4 sans-serif;user-select:none;';
        this._root = root;

        const toggle = document.createElement('button');
        toggle.textContent = 'GM≡';
        this._styleButton(toggle);
        toggle.onclick = (e) => {
            e.stopPropagation();
            if (this._body) {
                this._body.style.display = this._body.style.display === 'none' ? 'flex' : 'none';
            }
        };
        root.appendChild(toggle);

        const body = document.createElement('div');
        body.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:flex-end;';
        root.appendChild(body);
        this._body = body;

        // ---- 常规调试 ----
        this._addButton(body, '升级', () => this._bm()?.gmLevelUp());
        this._addButton(body, '技能全解锁', () => this._bm()?.gmUnlockAbilities());
        this._addButton(body, '冷却清零', () => this._bm()?.gmResetCooldowns());
        this._addButton(body, '清屏', () => this._bm()?.gmKillAll());
        this._addButton(body, '下一波', () => this._bm()?.gmNextWave());
        this._addButton(body, '车回满', () => this._bm()?.gmVehicleRefill());
        this._addButton(body, '车打空(失败)', () => this._bm()?.gmVehicleFail());

        // ---- 号位开关：输入 1~4 + 切换按钮（再次点击同一号位即关闭） ----
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:4px;align-items:center;';
        body.appendChild(row);

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.max = '4';
        input.placeholder = '号位';
        input.title = '输入 1~4（上阵顺序：1步枪 2狙击 3激光 4辐射）';
        input.style.cssText =
            'width:44px;padding:4px;background:rgba(20,30,40,.75);color:#fff;' +
            'border:1px solid #ffb74d;border-radius:4px;font-size:12px;text-align:center;';
        // 阻止输入操作穿透到游戏画布
        input.onclick = (e) => e.stopPropagation();
        input.onkeydown = (e) => e.stopPropagation();
        row.appendChild(input);
        this._slotInput = input;

        this._addButton(row, '技能无冷却', () => {
            const slot = this._readSlot();
            if (!slot) return;
            const on = this._bm()?.gmToggleNoSkillCooldown(slot);
            if (on !== null && on !== undefined) {
                this._noSkillCd[slot - 1] = on;
                this._refreshStatus();
            }
        });
        this._addButton(row, '无限大招', () => {
            const slot = this._readSlot();
            if (!slot) return;
            const on = this._bm()?.gmToggleInfUltimate(slot);
            if (on !== null && on !== undefined) {
                this._infUlt[slot - 1] = on;
                this._refreshStatus();
            }
        });

        const status = document.createElement('div');
        status.style.cssText =
            'padding:2px 6px;background:rgba(20,30,40,.75);color:#9be7ff;' +
            'border-radius:4px;max-width:220px;text-align:right;';
        body.appendChild(status);
        this._status = status;
        this._refreshStatus();

        document.body.appendChild(root);
    }

    onDestroy(): void {
        this._root?.remove();
        this._root = null;
        this._body = null;
        this._slotInput = null;
        this._status = null;
    }

    private _bm(): BattleManager | null {
        return BattleManager.instance ?? null;
    }

    /** 读取并校验号位输入（1~4），非法时在状态行提示 */
    private _readSlot(): number | null {
        const value = Number(this._slotInput?.value ?? '');
        if (!Number.isInteger(value) || value < 1 || value > 4) {
            if (this._status) {
                this._status.textContent = '请输入 1~4 号位';
            }
            return null;
        }
        return value;
    }

    private _refreshStatus(): void {
        if (!this._status) {
            return;
        }
        const fmt = (arr: boolean[]) =>
            arr.map((on, i) => (on ? String(i + 1) : '')).filter(Boolean).join(',') || '关';
        this._status.textContent =
            `无冷却: ${fmt(this._noSkillCd)} ｜ 无限大: ${fmt(this._infUlt)}`;
    }

    private _addButton(parent: HTMLDivElement, label: string, onClick: () => void): void {
        const btn = document.createElement('button');
        btn.textContent = label;
        this._styleButton(btn);
        btn.onclick = (e) => {
            // 不让点击穿透到游戏画布
            e.stopPropagation();
            onClick();
        };
        parent.appendChild(btn);
    }

    private _styleButton(btn: HTMLButtonElement): void {
        btn.style.cssText =
            'padding:4px 8px;background:rgba(20,30,40,.75);color:#fff;border:1px solid #4fc3f7;' +
            'border-radius:4px;cursor:pointer;font-size:12px;';
    }
}
