import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;
import { SoundFx } from '../core/SoundFx';
import { NoticeSystem, NOTICE_KIND_NAMES, NoticeDef } from '../core/NoticeData';
import { BUILD_STAMP } from '../config/GameConfig';
import { UI_TOKENS_CSS } from './UiTheme';
import * as UiPlate from './UiPlate';

/**
 * 登录界面（参考主流小游戏登录图一比一落地，DOM 渲染）：
 * 全屏废墟都市背景 + 顶部版本号/适龄提示 + 公告入口 + 游戏大 LOGO
 * + 底部服务器行 + 「开始游戏」大金钮 + 协议勾选 + 版号合规文案。
 * 盖在 #homeUi 之上（z-index 9000 > 8500），点击开始游戏淡出揭开主城。
 * 样式独立成串（LOGIN_UI_CSS），颜色一律走 UiTheme token（不自带色板）。
 */
export const LOGIN_UI_CSS = `${UI_TOKENS_CSS}
#loginUi { position: fixed; inset: 0; z-index: 9000; display: flex; flex-direction: column;
  background: #1a2129;
  background-image:
    radial-gradient(900px 520px at 78% 4%, #3d4a5c 0%, transparent 55%),
    radial-gradient(700px 480px at 8% 96%, #2c2320 0%, transparent 60%);
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #fff; user-select: none; overflow: hidden; transition: opacity .5s ease; }
#loginUi.hide { opacity: 0; pointer-events: none; }
#loginUi .lgBg { position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-position: center 22%; background-repeat: no-repeat; filter: saturate(1.05); }
#loginUi .lgShade { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(180deg, rgba(16,20,28,.5) 0%, transparent 26%, transparent 52%, rgba(10,13,20,.78) 82%, rgba(8,10,16,.92) 100%); }

/* 顶角信息：左上 版本号+适龄提示；右上 公告按钮（安全区避让胶囊） */
#loginUi .lgCorner { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between;
  padding: calc(12px * var(--pw,2.5) + var(--sat,0px)) calc(12px * var(--pw,2.5)) 0; }
#loginUi .lgVer { font-size: calc(11px * var(--pw,2.5)); font-weight: 700; color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,.8); }
#loginUi .lgAgeWrap { margin-top: calc(6px * var(--pw,2.5)); display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); }
#loginUi .lgAge { width: calc(34px * var(--pw,2.5)); height: calc(42px * var(--pw,2.5)); border-radius: calc(5px * var(--pw,2.5));
  border: calc(2px * var(--pw,2.5)) solid #fff; background: linear-gradient(180deg, #2e6fd8 55%, #1d4fa8 55%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-weight: 800; line-height: 1; box-shadow: 0 2px 6px rgba(0,0,0,.4); }
#loginUi .lgAge b { font-size: calc(13px * var(--pw,2.5)); }
#loginUi .lgAge i { font-style: normal; font-size: calc(5.5px * var(--pw,2.5)); letter-spacing: .5px; margin-top: calc(2px * var(--pw,2.5)); }
#loginUi .lgAgeTip { font-size: calc(8px * var(--pw,2.5)); font-weight: 700; background: #fff; color: #1a2129;
  border-radius: calc(3px * var(--pw,2.5)); padding: calc(1px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); }
#loginUi .lgNotice { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5));
  background: none; border: none; padding: calc(4px * var(--pw,2.5)); cursor: pointer; color: #fff; }
#loginUi .lgNotice .ic { width: calc(34px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); border-radius: 50%;
  border: calc(2px * var(--pw,2.5)) solid rgba(255,255,255,.9); background: rgba(30,38,50,.55);
  display: flex; align-items: center; justify-content: center; font-size: calc(16px * var(--pw,2.5));
  box-shadow: 0 2px 6px rgba(0,0,0,.4); position: relative; }
#loginUi .lgNotice .questRed { display: none; position: absolute; top: calc(-2px * var(--pw,2.5)); right: calc(-2px * var(--pw,2.5));
  width: calc(8px * var(--pw,2.5)); height: calc(8px * var(--pw,2.5)); border-radius: 50%; background: #ff4d4d; border: 1px solid #fff; }
#loginUi .lgNotice .questRed.on { display: block; }
#loginUi .lgNotice .tx { font-size: calc(10px * var(--pw,2.5)); font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,.8); }

/* 中央 LOGO：游戏名大字 + 副标（描边+投影贴卡牌游戏味） */
#loginUi .lgLogo { position: relative; z-index: 2; margin-top: calc(56px * var(--pw,2.5)); text-align: center; pointer-events: none; }
#loginUi .lgLogo h1 { margin: 0; font-size: calc(46px * var(--pw,2.5)); font-weight: 900; letter-spacing: calc(3px * var(--pw,2.5));
  color: var(--c-coin);
  text-shadow: 0 calc(2px * var(--pw,2.5)) 0 #b4541e, 0 calc(4px * var(--pw,2.5)) 0 #7a3410,
    0 calc(7px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) rgba(0,0,0,.65), 0 0 calc(24px * var(--pw,2.5)) rgba(255,170,60,.35);
  -webkit-text-stroke: calc(1.5px * var(--pw,2.5)) #5c2708; }
#loginUi .lgLogo .sub { margin-top: calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); font-weight: 700; letter-spacing: calc(6px * var(--pw,2.5));
  color: #ffe9bd; opacity: .9; text-shadow: 0 1px 3px rgba(0,0,0,.8); }

/* 底部操作区：服务器行 + 开始游戏 + 协议 + 合规文案（安全区避让胶囊） */
#loginUi .lgBottom { position: relative; z-index: 2; margin-top: auto; display: flex; flex-direction: column; align-items: center;
  padding: 0 calc(16px * var(--pw,2.5)) calc(10px * var(--pw,2.5) + var(--sab,0px)); }
#loginUi .lgServer { display: flex; align-items: center; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5));
  font-size: calc(13px * var(--pw,2.5)); font-weight: 800; color: #fff; background: rgba(14,18,26,.62);
  border: 1px solid rgba(255,255,255,.28); border-radius: 99px; padding: calc(5px * var(--pw,2.5)) calc(14px * var(--pw,2.5));
  cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
#loginUi .lgServer .gear { font-size: calc(12px * var(--pw,2.5)); }
#loginUi .lgStart { min-width: calc(200px * var(--pw,2.5)); border: none; cursor: pointer; position: relative;
  font-size: calc(21px * var(--pw,2.5)); font-weight: 900; letter-spacing: calc(6px * var(--pw,2.5)); color: #fff;
  padding: calc(11px * var(--pw,2.5)) calc(40px * var(--pw,2.5)); border-radius: calc(12px * var(--pw,2.5));
  background: linear-gradient(180deg, #ffcf5e 0%, #f5a623 52%, #e8820c 100%);
  border-bottom: calc(4px * var(--pw,2.5)) solid #9a5606;
  text-shadow: 0 calc(1.5px * var(--pw,2.5)) 0 #9a5606, 0 calc(3px * var(--pw,2.5)) calc(6px * var(--pw,2.5)) rgba(0,0,0,.35);
  box-shadow: 0 calc(6px * var(--pw,2.5)) calc(16px * var(--pw,2.5)) rgba(240,160,40,.45), inset 0 calc(2px * var(--pw,2.5)) 0 rgba(255,255,255,.55); }
#loginUi .lgStart:active { transform: translateY(calc(2px * var(--pw,2.5))); }
#loginUi .lgProto { display: flex; align-items: center; gap: calc(4px * var(--pw,2.5)); margin-top: calc(10px * var(--pw,2.5));
  font-size: calc(10px * var(--pw,2.5)); color: #e8edf4; text-shadow: 0 1px 2px rgba(0,0,0,.7); cursor: pointer; }
#loginUi .lgChk { width: calc(13px * var(--pw,2.5)); height: calc(13px * var(--pw,2.5)); border-radius: 50%;
  border: calc(1.5px * var(--pw,2.5)) solid #9fb0c3; background: rgba(20,26,36,.6); display: flex; align-items: center; justify-content: center;
  font-size: calc(9px * var(--pw,2.5)); color: transparent; }
#loginUi .lgChk.on { background: #2ecc71; border-color: #2ecc71; color: #fff; }
#loginUi .lgProto a { color: var(--c-coin); font-weight: 700; text-decoration: none; }
#loginUi .lgLegal { margin-top: calc(6px * var(--pw,2.5)); text-align: center; font-size: calc(8.5px * var(--pw,2.5)); line-height: 1.6; color: rgba(255,255,255,.82); text-shadow: 0 1px 2px rgba(0,0,0,.75); }

/* 登录层弹窗（公告/协议正文）：暗幕 + 居中面板 */
#loginUi .lgMask { position: absolute; inset: 0; z-index: 10; background: rgba(8,12,20,.72);
  display: flex; align-items: center; justify-content: center; padding: calc(24px * var(--pw,2.5)); }
#loginUi .lgBox { width: calc(320px * var(--pw,2.5)); max-width: 100%; max-height: 70vh; display: flex; flex-direction: column;
  background: linear-gradient(180deg, #26313f, #1a222d); border: 1px solid #48586c; border-radius: calc(12px * var(--pw,2.5));
  box-shadow: 0 10px 30px rgba(0,0,0,.6); overflow: hidden; }
#loginUi .lgHead { position: relative; flex: none; text-align: center; font-size: calc(14px * var(--pw,2.5)); font-weight: 800; color: var(--c-coin);
  padding: calc(10px * var(--pw,2.5)); background: linear-gradient(180deg, #31404f, #232f3c); border-bottom: 1px solid #3c4c5e; }
#loginUi .lgClose { position: absolute; top: calc(6px * var(--pw,2.5)); right: calc(8px * var(--pw,2.5)); width: calc(22px * var(--pw,2.5)); height: calc(22px * var(--pw,2.5));
  border: none; border-radius: 50%; background: rgba(255,255,255,.14); color: #fff; font-size: calc(11px * var(--pw,2.5)); cursor: pointer; }
#loginUi .lgBody { flex: 1 1 auto; overflow-y: auto; padding: calc(10px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); overscroll-behavior: contain; }
#loginUi .lgEmpty { text-align: center; color: #9fb0c3; font-size: calc(11px * var(--pw,2.5)); padding: calc(24px * var(--pw,2.5)) 0; }
#loginUi .lgItem { margin-bottom: calc(10px * var(--pw,2.5)); background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  border-radius: calc(8px * var(--pw,2.5)); padding: calc(8px * var(--pw,2.5)); }
#loginUi .lgTag { display: inline-block; font-size: calc(8.5px * var(--pw,2.5)); font-weight: 700; color: #fff; border-radius: 99px;
  padding: calc(1px * var(--pw,2.5)) calc(7px * var(--pw,2.5)); margin-bottom: calc(4px * var(--pw,2.5)); }
#loginUi .lgTag.kupdate { background: #e8602c; }
#loginUi .lgTag.kactivity { background: #c17a10; }
#loginUi .lgTag.knotice { background: #4a7fa8; }
#loginUi .lgItemTitle { font-size: calc(12px * var(--pw,2.5)); font-weight: 800; color: #ffe9bd; }
#loginUi .lgItemBody { margin-top: calc(4px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); line-height: 1.7; color: var(--c-text); }
#loginUi .lgItemBody p { margin: 0; }
#loginUi .lgBox p { margin: 0 0 calc(6px * var(--pw,2.5)); font-size: calc(10.5px * var(--pw,2.5)); line-height: 1.7; color: var(--c-text); }
#loginUi .lgToast { position: absolute; left: 50%; bottom: calc(160px * var(--pw,2.5) + var(--sab,0px)); transform: translateX(-50%);
  z-index: 20; background: rgba(14,18,26,.9); border: 1px solid rgba(255,255,255,.25); color: #fff;
  font-size: calc(11px * var(--pw,2.5)); border-radius: 99px; padding: calc(7px * var(--pw,2.5)) calc(16px * var(--pw,2.5));
  white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,.5); animation: lgToastIn .25s ease; pointer-events: none; }
@keyframes lgToastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;

@ccclass('LoginUi')
export class LoginUi extends Component {

    private _root: HTMLDivElement | null = null;
    private _bg: HTMLDivElement | null = null;
    private _chk: HTMLSpanElement | null = null;
    private _red: HTMLSpanElement | null = null;
    private _agreed = true;
    private _pendingTex: { key: string; apply: (url: string) => void }[] = [];
    private _styleInjected = false;

    onLoad(): void {
        if (typeof document === 'undefined') {
            return;
        }
        this._injectStyle();
        this._build();
        // 未读公告红点实时驱动（登录页公告角标）
        this._refreshNoticeRed();
        // 贴图异步就绪轮询（AssetLib 预载未完成时 _tex 会先落队列）
        setTimeout(() => this._applyPendingTex(), 400);
    }

    onDestroy(): void {
        this._root?.remove();
        this._root = null;
    }

    /** 样式注入（仅一次） */
    private _injectStyle(): void {
        if (this._styleInjected) {
            return;
        }
        this._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = LOGIN_UI_CSS;
        document.head.appendChild(style);
    }

    private _build(): void {
        const root = document.createElement('div');
        root.id = 'loginUi';
        this._root = root;

        // 背景：指挥官立绘铺底（AssetLib 异步就绪后回填；缺图只露氛围底色，不阻断）
        const bg = document.createElement('div');
        bg.className = 'lgBg';
        this._bg = bg;
        root.appendChild(bg);
        this._tex('characters/commander', u => { bg.style.backgroundImage = u; });

        const shade = document.createElement('div');
        shade.className = 'lgShade';
        root.appendChild(shade);

        // 左上：版本号 + 适龄提示；右上：公告按钮（有未读公告时亮红点）
        const corner = document.createElement('div');
        corner.className = 'lgCorner';
        const ageWrap = document.createElement('div');
        const ver = document.createElement('div');
        ver.className = 'lgVer';
        ver.textContent = `版本:${BUILD_STAMP}`;
        ageWrap.appendChild(ver);
        const age = document.createElement('div');
        age.className = 'lgAge';
        age.innerHTML = '<b>12+</b><i>CADPA</i>';
        ageWrap.appendChild(age);
        const ageTip = document.createElement('div');
        ageTip.className = 'lgAgeTip';
        ageTip.textContent = '适龄提示';
        ageWrap.appendChild(ageTip);
        corner.appendChild(ageWrap);
        const notice = document.createElement('button');
        notice.className = 'lgNotice';
        notice.onclick = () => {
            SoundFx.play('ui');
            this._openNotice();
        };
        const nic = document.createElement('span');
        nic.className = 'ic';
        nic.innerHTML = '📋<span class="questRed"></span>';
        this._red = nic.querySelector('.questRed');
        notice.appendChild(nic);
        const ntx = document.createElement('span');
        ntx.className = 'tx';
        ntx.textContent = '公告';
        notice.appendChild(ntx);
        corner.appendChild(notice);
        root.appendChild(corner);

        // 中央 LOGO
        const logo = document.createElement('div');
        logo.className = 'lgLogo';
        logo.innerHTML = '<h1>末日航线</h1><div class="sub">DOOMSDAY ROUTE</div>';
        root.appendChild(logo);

        // 底部：服务器行 + 开始游戏 + 协议勾选 + 合规文案
        const bottom = document.createElement('div');
        bottom.className = 'lgBottom';
        const server = document.createElement('button');
        server.className = 'lgServer';
        server.innerHTML = '<span class="gear">⚙️</span>末日1区 · 战地18123服';
        bottom.appendChild(server);
        const start = document.createElement('button');
        start.className = 'lgStart';
        start.textContent = '开始游戏';
        // 金板开始按钮：九宫格参数与弹层 CTA 同族（platePw 档：宽度按 --pw 缩放）
        this._tex('ui/button/btn_play', u => {
            UiPlate.nineSlice(start, 'platePw')(u);
            start.style.color = '#5a3a08';
            start.style.textShadow = 'none';
        });
        start.onclick = () => this._onStart();
        bottom.appendChild(start);
        const proto = document.createElement('div');
        proto.className = 'lgProto';
        const chk = document.createElement('span');
        chk.className = 'lgChk on';
        chk.textContent = '✓';
        this._chk = chk;
        proto.appendChild(chk);
        proto.appendChild(document.createTextNode('我已详细阅读并同意 '));
        const ua = document.createElement('a');
        ua.textContent = '用户协议';
        ua.onclick = (e) => { e.stopPropagation(); SoundFx.play('ui'); this._openDoc('用户协议', USER_AGREEMENT); };
        proto.appendChild(ua);
        proto.appendChild(document.createTextNode(' 和 '));
        const pp = document.createElement('a');
        pp.textContent = '隐私保护指引';
        pp.onclick = (e) => { e.stopPropagation(); SoundFx.play('ui'); this._openDoc('隐私保护指引', PRIVACY_POLICY); };
        proto.appendChild(pp);
        proto.onclick = () => {
            SoundFx.play('ui');
            this._agreed = !this._agreed;
            this._chk?.classList.toggle('on', this._agreed);
        };
        bottom.appendChild(proto);
        const legal = document.createElement('div');
        legal.className = 'lgLegal';
        legal.innerHTML = LEGAL_TEXT;
        bottom.appendChild(legal);
        root.appendChild(bottom);

        document.body.appendChild(root);
    }

    /** 点击开始游戏：未勾选协议先提示；已勾选淡出揭开主城 */
    private _onStart(): void {
        SoundFx.play('ui');
        if (!this._agreed) {
            this._toast('请先阅读并同意用户协议和隐私保护指引');
            return;
        }
        const root = this._root;
        if (!root || root.classList.contains('hide')) {
            return;
        }
        root.classList.add('hide');
        setTimeout(() => {
            this._root?.remove();
            this._root = null;
        }, 550);
    }

    /** 公告弹窗：直接复用 NoticeSystem 已读口径，看完标已读（红点随之熄灭） */
    private _openNotice(): void {
        if (!this._root) {
            return;
        }
        const list: NoticeDef[] = NoticeSystem.instance.unreadList();
        const mask = document.createElement('div');
        mask.className = 'lgMask';
        const box = document.createElement('div');
        box.className = 'lgBox';
        const head = document.createElement('div');
        head.className = 'lgHead';
        head.textContent = '📢 游戏公告';
        const close = document.createElement('button');
        close.className = 'lgClose';
        close.textContent = '✕';
        close.onclick = () => { SoundFx.play('ui'); mask.remove(); };
        head.appendChild(close);
        box.appendChild(head);
        const body = document.createElement('div');
        body.className = 'lgBody';
        if (!list.length) {
            const empty = document.createElement('div');
            empty.className = 'lgEmpty';
            empty.textContent = '暂无新公告';
            body.appendChild(empty);
        } else {
            for (const n of [...list].reverse()) {
                const item = document.createElement('div');
                item.className = 'lgItem';
                const tag = document.createElement('span');
                tag.className = `lgTag k${n.kind}`;
                tag.textContent = NOTICE_KIND_NAMES[n.kind];
                item.appendChild(tag);
                const title = document.createElement('div');
                title.className = 'lgItemTitle';
                title.textContent = `${n.title}（${n.date}）`;
                item.appendChild(title);
                const text = document.createElement('div');
                text.className = 'lgItemBody';
                text.innerHTML = n.body.split('\n').map(s => s ? `<p>${s}</p>` : '<p>&nbsp;</p>').join('');
                item.appendChild(text);
                body.appendChild(item);
            }
            NoticeSystem.instance.markAllRead();
        }
        box.appendChild(body);
        mask.appendChild(box);
        this._root.appendChild(mask);
        this._refreshNoticeRed();
    }

    /** 协议/隐私正文弹窗 */
    private _openDoc(title: string, body: string): void {
        if (!this._root) {
            return;
        }
        const mask = document.createElement('div');
        mask.className = 'lgMask';
        const box = document.createElement('div');
        box.className = 'lgBox';
        const head = document.createElement('div');
        head.className = 'lgHead';
        head.textContent = title;
        const close = document.createElement('button');
        close.className = 'lgClose';
        close.textContent = '✕';
        close.onclick = () => { SoundFx.play('ui'); mask.remove(); };
        head.appendChild(close);
        box.appendChild(head);
        const bd = document.createElement('div');
        bd.className = 'lgBody';
        bd.innerHTML = body.split('\n').map(s => s ? `<p>${s}</p>` : '<p>&nbsp;</p>').join('');
        box.appendChild(bd);
        mask.appendChild(box);
        this._root.appendChild(mask);
    }

    /** 轻提示（协议未勾选等场景） */
    private _toast(msg: string): void {
        if (!this._root) {
            return;
        }
        document.querySelector('#loginUi .lgToast')?.remove();
        const t = document.createElement('div');
        t.className = 'lgToast';
        t.textContent = msg;
        this._root.appendChild(t);
        setTimeout(() => t.remove(), 2200);
    }

    private _refreshNoticeRed(): void {
        this._red?.classList.toggle('on', NoticeSystem.instance.hasUnread());
    }

    /** 贴图回填（同 HomeUi 的 _tex/_frameUrl 口径：HTMLImage/Canvas → dataURL） */
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
        if (this._pendingTex.length) {
            setTimeout(() => this._applyPendingTex(), 400);
        }
    }

    private _frameUrl(key: string): string | null {
        return UiPlate.frameUrl(key);
    }

}

/** 版号合规文案（登录页底部） */
const LEGAL_TEXT = `
    著作权人：末日航线工作室 &nbsp;软著登记号：2024SR000001<br/>
    出版单位：无（内部测试版） &nbsp;审批文号：暂无<br/>
    备案号：暂无 &nbsp;经营许可证编号：暂无<br/>
    抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。<br/>
    适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。`;

const USER_AGREEMENT = `欢迎使用《末日航线》！（以下称"本游戏"）
一、账号：本游戏当前为单机试玩版，游戏进度保存在本机，删除浏览器数据可能导致进度丢失。
二、虚拟财产：游戏内金币、钻石等均为虚拟道具，仅限本游戏内使用，不可转让或兑换法定货币。
三、行为规范：请勿利用游戏漏洞、外挂或脚本破坏游戏公平性，一经发现有权收回异常收益。
四、未成年人保护：未满 12 周岁的用户应在监护人陪同下适度游戏。
五、本协议自玩家点击"开始游戏"时生效。`;

const PRIVACY_POLICY = `我们非常重视您的隐私。
一、信息收集：本游戏为单机试玩版，仅在本机存储游戏进度（存档、设置、公告已读记录），不收集、不上传任何个人身份信息。
二、本地存储：进度数据通过浏览器 localStorage 保存，您可以随时清除浏览器数据以删除全部信息。
三、第三方：本游戏不接入任何第三方统计或广告 SDK，不向任何第三方共享数据。
四、未成年人：建议监护人为未成年人设置合理的游戏时长。`;
