import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;
import { BattleManager } from '../battle/BattleManager';

/**
 * GM 调试面板（浏览器预览专用）：DOM 覆盖层按钮，免等待快速验证技能/大招/波次/失败流程。
 * 微信小游戏运行时没有 document，本面板自动不生效，无需打包前删除。
 * 按钮走 BattleManager 的 gm* 入口，只做调试不做正式玩法。
 */
@ccclass('GmPanel')
export class GmPanel extends Component {
    private _root: HTMLDivElement | null = null;
    private _body: HTMLDivElement | null = null;

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        const root = document.createElement('div');
        root.style.cssText =
            'position:fixed;top:90px;right:6px;z-index:9999;display:flex;flex-direction:column;' +
            'align-items:flex-end;gap:4px;font:12px/1.4 sans-serif;user-select:none;';

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
        body.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
        root.appendChild(body);
        this._body = body;
        this._root = root;

        this._addButton(body, '升级', () => this._bm()?.gmLevelUp());
        this._addButton(body, '技能全解锁', () => this._bm()?.gmUnlockAbilities());
        this._addButton(body, '冷却清零', () => this._bm()?.gmResetCooldowns());
        this._addButton(body, '清屏', () => this._bm()?.gmKillAll());
        this._addButton(body, '下一波', () => this._bm()?.gmNextWave());
        this._addButton(body, '车回满', () => this._bm()?.gmVehicleRefill());
        this._addButton(body, '车打空(失败)', () => this._bm()?.gmVehicleFail());

        document.body.appendChild(root);
    }

    onDestroy(): void {
        this._root?.remove();
        this._root = null;
        this._body = null;
    }

    private _bm(): BattleManager | null {
        return BattleManager.instance ?? null;
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
