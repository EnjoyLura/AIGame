/**
 * 主城 HomeUi 全量样式（base 深色层 + 青瓷浅色覆盖层，一比一复刻原型图 token）。
 * 自 HomeUi.ts 抽离：纯字符串模板，无逻辑；注意浅色层跑马灯等动画声明
 * 必须保持在 animation:none 白名单之后。
 */
import { UI_TOKENS_CSS } from './UiTheme';

export const HOME_UI_CSS = `${UI_TOKENS_CSS}
#homeUi { position: fixed; inset: 0; z-index: 8500; display: none; flex-direction: column; align-items: stretch;
  background: #0b1322;
  background-image: radial-gradient(1100px 550px at 75% -10%, #122340 0%, transparent 60%),
    radial-gradient(900px 500px at 5% 110%, #1a1430 0%, transparent 55%);
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: var(--c-text); user-select: none; overflow: hidden; }

/* ===== HUD 通栏（布局稿：头像绝对定位 + 上排资源 + 下排昵称/经验/工具） ===== */
/* 显式左对齐：宿主页 style.css 的 body{text-align:center} 会被通栏文字继承。
   昵称盒与下方经验条同为 195 宽，居中会让名字比经验条多缩进 70px（实测 x128 vs x58）；
   资源格/工具图标各自用 flex·grid 居中，不受这里影响。 */
#homeUi .topbar { position: relative; flex: none; display: flex; flex-direction: column; justify-content: center;
  height: calc(64px * var(--hs,1)); padding: 0 calc(8px * var(--hs,1)) 0 calc(58px * var(--hs,1)); text-align: left;
  background: linear-gradient(180deg, #1e3054, #141f38); border-bottom: 1px solid var(--c-line); }
#homeUi .pAvatar { position: absolute; top: calc(4px * var(--hs,1)); left: calc(9px * var(--hs,1));
  width: calc(43px * var(--hs,1)); height: calc(52px * var(--hs,1)); flex: none; padding: 0; border-radius: 0; background: none; }
/* 头像美术区是正方（43×43），槽位仍是 43×52（下方 9px 为稿里的名字条，游戏名字在 .identity）。
   此前美术区取 height:100% 被拉成 43×52，比例 0.83 比稿偏窄长。 */
#homeUi .pAvatar > div { width: 100%; height: calc(43px * var(--hs,1)); border-radius: 0; background: radial-gradient(circle at 35% 30%, var(--c-navy-1), var(--c-navy-7));
  display: flex; align-items: center; justify-content: center; font-size: calc(22px * var(--hs,1));
  clip-path: polygon(12% 0, 88% 0, 100% 14%, 100% 87%, 88% 100%, 12% 100%, 0 87%, 0 14%); }
#homeUi .lvtag { position: absolute; left: calc(-3px * var(--hs,1)); top: calc(-2px * var(--hs,1));
  font-size: calc(10px * var(--hs,1)); line-height: calc(13px * var(--hs,1)); padding: 0 calc(4px * var(--hs,1));
  background: #555; color: #fff; border-radius: 0; font-weight: 700; }
#homeUi .reswrap { flex: none; display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: calc(3px * var(--hs,1)); align-items: center;
  height: calc(31px * var(--hs,1)); }
#homeUi .res { position: relative; display: flex; align-items: center; justify-content: center; gap: calc(3px * var(--hs,1));
  min-height: calc(31px * var(--hs,1)); padding: 0; background: none; border: none; border-radius: 0; font-size: calc(12px * var(--hs,1)); font-weight: 700; }
#homeUi .res::before { content: ''; position: absolute; inset: calc(5px * var(--hs,1)) 0; background: var(--c-navy-6); transform: skewX(-12deg); }
#homeUi .res > * { position: relative; z-index: 1; }
#homeUi .res b { color: var(--c-gold-hi); }
#homeUi .res .add { width: calc(14px * var(--hs,1)); height: calc(14px * var(--hs,1)); border-radius: 0; background: none; color: var(--c-text-dim);
  font-size: calc(14px * var(--hs,1)); font-weight: 700; padding: 0 calc(4px * var(--hs,1)); display: flex; align-items: center; justify-content: center; }
#homeUi .identity { flex: none; display: flex; align-items: center; justify-content: space-between; gap: calc(6px * var(--hs,1));
  height: calc(27px * var(--hs,1)); }
#homeUi .idLeft { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
#homeUi .pname { display: block; font-size: calc(11px * var(--hs,1)); line-height: calc(13px * var(--hs,1)); font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .xpRow { display: flex; align-items: center; gap: calc(5px * var(--hs,1)); }
#homeUi .expbar { flex: none; width: calc(110px * var(--hs,1)); height: calc(10px * var(--hs,1)); margin: 0;
  background: #0a1426; border: none; border-radius: 0; overflow: hidden; }
#homeUi .expbar i { display: block; height: 100%; width: 62%; background: #3ad0ff; border-radius: 0; box-shadow: none; }
#homeUi .expnum { font-size: calc(9px * var(--hs,1)); line-height: calc(10px * var(--hs,1)); color: var(--c-text-dim); margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .hudUtil { flex: none; display: flex; align-items: center; gap: 0; }
#homeUi .hudUtil .tinyIcon { width: calc(36px * var(--hs,1)); height: calc(30px * var(--hs,1)); display: grid; place-items: center;
  font-size: calc(16px * var(--hs,1)); background: none; border: none; border-radius: 0; cursor: pointer; }

/* ===== 内容区 ===== */
#homeUi .viewport { flex: 1; position: relative; overflow: hidden;
  background: radial-gradient(500px 320px at 50% -60px, #1d3054 0%, transparent 70%), linear-gradient(180deg, #0e1830, #0a1220); }
#homeUi .screen { position: absolute; inset: 0; padding: calc(24px * var(--hs,1)) calc(24px * var(--hs,1)) calc(200px * var(--hs,1)); overflow-y: auto; display: none; }
#homeUi .screen.on { display: block; }
/* 护送页满屏竖向骨架：章节头/难度/场景/里程碑/编队/底部 CTA，场景吃掉剩余高度 */
#homeUi .screen.sStage.on { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
#homeUi .screen::-webkit-scrollbar { width: 4px; }
#homeUi .screen::-webkit-scrollbar-thumb { background: var(--c-line-dk); border-radius: 4px; }

/* ===== 通用面板/角饰/按钮 ===== */
#homeUi .panel { background: linear-gradient(180deg, #20335a, #152442); border: 1px solid var(--c-line-hi); border-radius: calc(20px * var(--hs,1));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 12px rgba(0,0,0,.35); }
#homeUi .frame { position: relative; }
#homeUi .frame::before, #homeUi .frame::after { content: ''; position: absolute; width: calc(24px * var(--hs,1)); height: calc(24px * var(--hs,1));
  border: calc(4px * var(--hs,1)) solid var(--c-gold-frame); opacity: .85; z-index: 3; }
#homeUi .frame::before { top: -1px; left: -1px; border-right: none; border-bottom: none; border-radius: calc(8px * var(--hs,1)) 0 0 0; }
#homeUi .frame::after { bottom: -1px; right: -1px; border-left: none; border-top: none; border-radius: 0 0 calc(8px * var(--hs,1)) 0; }
#homeUi .secTitle { font-size: calc(26px * var(--hs,1)); font-weight: 800; color: var(--c-gold-hi); letter-spacing: calc(4px * var(--hs,1));
  margin: calc(20px * var(--hs,1)) calc(4px * var(--hs,1)) calc(14px * var(--hs,1)); display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .secTitle::before { content: ''; width: calc(8px * var(--hs,1)); height: calc(28px * var(--hs,1));
  background: linear-gradient(180deg, var(--c-gold-hi), #e0a23c); border-radius: calc(4px * var(--hs,1)); }
#homeUi .btn { border: none; cursor: pointer; font-family: inherit; font-weight: 800; border-radius: calc(18px * var(--hs,1));
  /* 主城键的板厚缩放档：UiPlate.NINE.plate 用 calc(Npx*var(--pu,1))，主城上下文原本没有 --pu，
     不补这一行则板厚在手机上恒为 10px（弹层里是 25px），板子与件宽比例失衡 */
  --pu: var(--hs,1); }
#homeUi .btn:active { transform: scale(.95); }
#homeUi .btn.gold { background: linear-gradient(180deg, #ffe9a6, var(--c-gold) 55%, #c9861f); color: #5a3a08; border: 1px solid #8a5c12;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 3px 0 #7c520f, 0 6px 14px rgba(240,177,62,.3); }
#homeUi .btn.blue { background: linear-gradient(180deg, #7fd4ff, #2f7fd0); color: #04263f; border: 1px solid #1b5a94;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 3px 0 #174a80; }
#homeUi .btn.adBtn { background: linear-gradient(180deg, #7fe08a, #2f9c4a); color: #06300f; border: 1px solid #1d6b2e;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 3px 0 #1d6b2e; }
#homeUi .btn.dark { background: linear-gradient(180deg, #2a3f66, #1a2947); color: var(--c-text); border: 1px solid var(--c-line-hi); }
#homeUi .btn.sm { height: calc(56px * var(--hs,1)); padding: 0 calc(20px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); }
#homeUi .btn.big { width: 100%; height: calc(88px * var(--hs,1)); font-size: calc(32px * var(--hs,1)); letter-spacing: calc(4px * var(--hs,1)); border-radius: calc(22px * var(--hs,1)); }
#homeUi .btn:disabled { filter: grayscale(.8) brightness(.7); }
#homeUi .tag { font-size: calc(20px * var(--hs,1)); padding: calc(2px * var(--hs,1)) calc(14px * var(--hs,1)); border-radius: 99px;
  background: #0e1930; border: 1px solid var(--c-line); color: var(--c-text-dim); white-space: nowrap; }
#homeUi .tag.b { color: var(--c-cyan-mid); border-color: #2a6ea6; }
#homeUi .tag.g { color: var(--c-gold-hi); border-color: var(--c-gold-dk2); }
#homeUi .tag.p { color: #c792ff; border-color: #6a4a9a; }
#homeUi .goldT { color: var(--c-gold-hi); }

/* ===== Toast ===== */
/* 常规游戏提示位＝屏幕中央（+13px 落到页区 96~774 的中线上）。此前贴底导上沿，
   既不常规，握持时也容易被手指压住；自顶锚定后天然避开底部安全区。 */
#homeUi .toastEl { position: absolute; left: 50%; top: calc(50% + 13px * var(--pw,2.5)); transform: translate(-50%, calc(-50% + 10px));
  background: rgba(13,25,48,.93); border: 1px solid var(--c-gold-frame); color: var(--c-gold-hi); font-size: calc(24px * var(--hs,1)); font-weight: 700;
  padding: calc(14px * var(--hs,1)) calc(32px * var(--hs,1)); border-radius: 99px; opacity: 0; transition: .25s;
  z-index: 300; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,.5); }
#homeUi .toastEl.show { opacity: 1; transform: translate(-50%, -50%); }

/* ===== 商店页 ===== */
#homeUi .shopBanner { height: calc(168px * var(--hs,1)); border-radius: calc(24px * var(--hs,1)); overflow: hidden; position: relative; cursor: pointer;
  display: flex; align-items: center; background: linear-gradient(100deg, #3a1420, #6e2418 55%, #8a4a1a);
  border: 1px solid #a06428; box-shadow: 0 6px 16px rgba(0,0,0,.4); }
#homeUi .shopBanner::after { content: ''; position: absolute; inset: 0;
  background: radial-gradient(200px 90px at 85% 20%, rgba(255,210,120,.35), transparent 70%); }
#homeUi .sbTxt { padding: 0 calc(28px * var(--hs,1)); z-index: 2; }
#homeUi .sbTxt h3 { font-size: calc(32px * var(--hs,1)); color: var(--c-gold-hi); letter-spacing: calc(2px * var(--hs,1)); text-shadow: 0 2px 4px rgba(0,0,0,.5); }
#homeUi .sbTxt p { font-size: calc(22px * var(--hs,1)); color: var(--c-cream-2); margin-top: calc(8px * var(--hs,1)); }
#homeUi .sbTxt .price { color: #ff8a6a; font-weight: 900; font-size: calc(32px * var(--hs,1)); }
#homeUi .sbTxt .price s { color: #c98a6a; font-size: calc(22px * var(--hs,1)); margin-left: calc(8px * var(--hs,1)); }
#homeUi .sbGift { margin-left: auto; font-size: calc(88px * var(--hs,1)); margin-right: calc(32px * var(--hs,1)); z-index: 2;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)); }
#homeUi .sbTime { position: absolute; right: calc(24px * var(--hs,1)); bottom: calc(14px * var(--hs,1)); z-index: 2;
  font-size: calc(20px * var(--hs,1)); color: var(--c-cream-2); background: rgba(0,0,0,.35); padding: calc(4px * var(--hs,1)) calc(16px * var(--hs,1)); border-radius: 99px; }
#homeUi .shopTabs { display: flex; gap: calc(12px * var(--hs,1)); margin: calc(24px * var(--hs,1)) 0; }
/* 商店页签已并入底部 .flat-tabs 条带（34 高），按钮必须随条带同高：
   稿里 .flat-tabs button 不写 height，靠 flex 拉伸正好撑满 34。
   此前两层分别写 60/44 的独立页签行高度，按钮会溢出条带下沿（实测 10.6px），文字看着偏下。 */
#homeUi .shopTabs button { flex: 1; height: 100%; border-radius: calc(16px * var(--hs,1)); border: 1px solid var(--c-line);
  display: flex; align-items: center; justify-content: center; text-align: center; gap: calc(4px * var(--hs,1));
  background: var(--c-navy-4); color: var(--c-text-dim); font-family: inherit; font-size: calc(26px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .shopTabs button.on { background: linear-gradient(180deg, var(--c-line-hi), #243a63); color: var(--c-gold-hi); border-color: #6a8ab8;
  box-shadow: 0 0 10px rgba(92,150,255,.25); }
#homeUi .shopGrid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(20px * var(--hs,1)); }
#homeUi .good { padding: calc(16px * var(--hs,1)); position: relative; }
#homeUi .gIc { height: calc(120px * var(--hs,1)); border-radius: calc(16px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(64px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, var(--c-navy-1), var(--c-navy-5));
  border: 1px solid var(--c-line-hi); margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .good.r3 .gIc { border-color: #3a8ad0; box-shadow: 0 0 8px rgba(60,140,220,.35) inset; }
#homeUi .good.r4 .gIc { border-color: #9a5ce0; box-shadow: 0 0 8px rgba(160,90,230,.4) inset; }
#homeUi .good.r5 .gIc { border-color: var(--c-amber-hi); box-shadow: 0 0 10px rgba(255,157,69,.45) inset; }
#homeUi .good.r6 .gIc { border-color: var(--c-danger); box-shadow: 0 0 12px rgba(255,82,82,.55) inset, 0 0 10px rgba(255,82,82,.35); }
#homeUi .gName { font-size: calc(26px * var(--hs,1)); font-weight: 700; }
#homeUi .gTag { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); margin: calc(4px * var(--hs,1)) 0 calc(12px * var(--hs,1)); min-height: calc(48px * var(--hs,1)); line-height: 1.3; }
#homeUi .gBuy { width: 100%; display: flex; align-items: center; justify-content: center; gap: calc(6px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); }
#homeUi .gHot { position: absolute; top: calc(-10px * var(--hs,1)); right: calc(-8px * var(--hs,1));
  background: linear-gradient(180deg, #ff8a5c, #e03a2a); color: #fff; font-size: calc(20px * var(--hs,1)); font-weight: 800;
  padding: calc(4px * var(--hs,1)) calc(16px * var(--hs,1)); border-radius: 99px 99px 99px 4px; box-shadow: 0 2px 6px rgba(0,0,0,.4); z-index: 2; }
#homeUi .good.adCard .gIc { border-color: #2f9c4a; }

/* ===== 礼包中心（banner 弹窗） ===== */
#homeUi .giftBox .mHead h3 { color: var(--c-gold-hi); }
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
  background: radial-gradient(circle at 50% 30%, var(--c-navy-1), var(--c-navy-5)); border: 1px solid var(--c-line-hi); }
#homeUi .giftCard.r4 .giftIc { border-color: #9a5ce0; }
#homeUi .giftCard.r5 .giftIc { border-color: var(--c-amber-hi); box-shadow: 0 0 10px rgba(255,157,69,.4); }
#homeUi .giftInfo { flex: 1; min-width: 0; }
#homeUi .giftInfo b { font-size: calc(26px * var(--hs,1)); }
#homeUi .giftInfo p { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); margin-top: calc(4px * var(--hs,1)); }
#homeUi .giftEntries { font-size: calc(18px * var(--hs,1)); color: var(--c-cream-2); margin-top: calc(8px * var(--hs,1)); line-height: 1.5; }
#homeUi .giftSide { flex: none; display: flex; flex-direction: column; align-items: stretch; gap: calc(8px * var(--hs,1)); width: calc(200px * var(--hs,1)); }
#homeUi .giftPrice { text-align: center; font-weight: 900; font-size: calc(26px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .giftPrice em { font-style: normal; color: var(--c-ok); }
#homeUi .giftPrice s { color: #c98a6a; font-size: calc(18px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); }
#homeUi .giftSide .btn { width: 100%; height: calc(52px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
#homeUi .giftQuota { text-align: center; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .giftNote { text-align: center; font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); margin-top: calc(16px * var(--hs,1)); }
#homeUi .giftResHead { text-align: center; font-size: calc(24px * var(--hs,1)); color: #b9d9c2; margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .giftResGrid { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(16px * var(--hs,1)); }
#homeUi .giftResGrid .clDrop { width: calc(140px * var(--hs,1)); height: calc(140px * var(--hs,1)); border: 1px solid var(--c-line-hi);
  border-radius: calc(16px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #1a2a4a, var(--c-navy-7));
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(8px * var(--hs,1));
  opacity: 0; animation: giftDropIn .45s cubic-bezier(.34,1.56,.64,1) both; }
#homeUi .giftResGrid .clDropIc { font-size: calc(48px * var(--hs,1)); }
#homeUi .giftResGrid .clDropNm { font-size: calc(18px * var(--hs,1)); }
#homeUi .giftResGrid .clDrop.r3 { border-color: #5ab0f0; }
#homeUi .giftResGrid .clDrop.r4 { border-color: #c07ef5; }
#homeUi .giftResGrid .clDrop.r5 { border-color: var(--c-amber-hi); box-shadow: 0 0 10px rgba(255,157,69,.35); }
#homeUi .giftResGrid .clDrop.r6 { border-color: var(--c-danger); box-shadow: 0 0 12px rgba(255,82,82,.5); }
#homeUi .giftResRow { text-align: center; font-size: calc(22px * var(--hs,1)); color: var(--c-gold-hi); margin-top: calc(16px * var(--hs,1)); }
#homeUi .giftOkBtn { width: 100%; margin-top: calc(20px * var(--hs,1)); height: calc(64px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }
#homeUi .shopBanner .sbTime.dotOn::after { content: ''; display: inline-block; width: calc(12px * var(--hs,1)); height: calc(12px * var(--hs,1));
  margin-left: calc(8px * var(--hs,1)); border-radius: 50%; background: var(--c-danger); box-shadow: 0 0 8px rgba(255,82,82,.8); vertical-align: middle; }
@keyframes giftDropIn { from { transform: scale(.4) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }

/* ===== 任务与成就（基地页入口 + 弹窗） ===== */
#homeUi .questEntry { position: relative; margin-left: auto; flex: none; }
#homeUi .questEntry .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: var(--c-danger);
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .questEntry .questRed.on { display: block; }
#homeUi .qSecHead { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); margin: calc(16px * var(--hs,1)) 0 calc(10px * var(--hs,1)); }
#homeUi .qSecHead:first-child { margin-top: 0; }
#homeUi .qSecHead b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .qSecHead span { font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); }
#homeUi .questRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .questRow.ready { border-color: var(--c-gold-dk2); box-shadow: 0 0 10px rgba(240,177,62,.25); }
#homeUi .questRow.done { opacity: .55; filter: grayscale(.5); }
#homeUi .qIc { flex: none; width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(38px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, var(--c-navy-1), var(--c-navy-5)); border: 1px solid var(--c-line-hi); }
#homeUi .qMid { flex: 1; min-width: 0; }
#homeUi .qMid b { font-size: calc(24px * var(--hs,1)); }
#homeUi .qBar { height: calc(12px * var(--hs,1)); border-radius: 99px; background: var(--c-navy-6); border: 1px solid var(--c-line);
  margin: calc(8px * var(--hs,1)) 0 calc(6px * var(--hs,1)); overflow: hidden; }
#homeUi .qBar i { display: block; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--c-cyan-mid), var(--c-ok)); transition: width .4s ease; }
#homeUi .questRow.ready .qBar i { background: linear-gradient(90deg, var(--c-gold-hi), var(--c-gold)); }
#homeUi .qNum { font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .qRight { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: calc(8px * var(--hs,1)); }
#homeUi .qReward { font-size: calc(20px * var(--hs,1)); color: var(--c-cyan); font-weight: 700; }
#homeUi .qRight .btn { min-width: calc(140px * var(--hs,1)); height: calc(48px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }

/* ===== 活跃度宝箱（任务弹窗顶部总览） ===== */
#homeUi .actBox { padding: calc(16px * var(--hs,1)); margin-bottom: calc(6px * var(--hs,1)); }
#homeUi .actHead { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .actHead b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .actHead span { font-size: calc(22px * var(--hs,1)); color: var(--c-cyan); font-weight: 700; }
#homeUi .actBar { margin: calc(10px * var(--hs,1)) 0 calc(14px * var(--hs,1)); }
#homeUi .actBar i { background: linear-gradient(90deg, var(--c-gold), var(--c-gold-hi)); }
#homeUi .actChests { display: flex; gap: calc(12px * var(--hs,1)); }
#homeUi .actChest { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  background: radial-gradient(circle at 50% 0%, #222f4d, var(--c-navy-5)); border: 1px solid var(--c-line); }
#homeUi .actChest.ready { border-color: var(--c-gold); box-shadow: 0 0 14px rgba(240,177,62,.4); }
#homeUi .actChest.done { opacity: .5; filter: grayscale(.6); }
#homeUi .acIc { font-size: calc(46px * var(--hs,1)); line-height: 1.1; }
#homeUi .actChest.done .acIc { filter: grayscale(1); }
#homeUi .actChest.ready .acIc { animation: huiChest .9s ease-in-out infinite; }
#homeUi .acName { font-size: calc(22px * var(--hs,1)); font-weight: 700; color: #e8f1ff; }
#homeUi .acReward { font-size: calc(17px * var(--hs,1)); color: var(--c-cyan); text-align: center; line-height: 1.4; }
#homeUi .acNeed { font-size: calc(17px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .actChest.ready .acNeed { color: var(--c-gold); font-weight: 700; }
#homeUi .actChest .btn { width: 100%; margin-top: calc(6px * var(--hs,1)); height: calc(44px * var(--hs,1)); font-size: calc(19px * var(--hs,1)); }
#homeUi .actHint { margin-top: calc(12px * var(--hs,1)); font-size: calc(17px * var(--hs,1)); color: var(--c-edge-8); text-align: center; }

/* ===== 每日签到（基地页入口 + 弹窗） ===== */
#homeUi .signinEntry { position: relative; margin-left: 0; flex: none; }
#homeUi .signinEntry .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: var(--c-danger);
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .signinEntry .questRed.on { display: block; }
#homeUi .siHead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .siHead b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .siHead b i { color: var(--c-gold); font-style: normal; }
#homeUi .siHead span { font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); }
#homeUi .siGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .siCell { padding: calc(14px * var(--hs,1)) calc(8px * var(--hs,1)); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .siCell.today { border-color: var(--c-gold); box-shadow: 0 0 12px rgba(240,177,62,.35); background: linear-gradient(180deg, rgba(240,177,62,.14), transparent); }
#homeUi .siCell.done { opacity: .5; filter: grayscale(.5); }
#homeUi .siIc { font-size: calc(40px * var(--hs,1)); line-height: 1.1; }
#homeUi .siNm { font-size: calc(20px * var(--hs,1)); font-weight: 700; }
#homeUi .siDy { font-size: calc(16px * var(--hs,1)); color: var(--c-gold); }
#homeUi .siRw { font-size: calc(16px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .siFoot { display: flex; align-items: center; justify-content: space-between; gap: calc(14px * var(--hs,1));
  margin-top: calc(16px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1)); }
#homeUi .siFoot.ready { border-color: var(--c-gold-dk2); box-shadow: 0 0 10px rgba(240,177,62,.25); }
#homeUi .siFoot.done { opacity: .6; }
#homeUi .siInfo { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .siInfo b { font-size: calc(24px * var(--hs,1)); }
#homeUi .siInfo span { font-size: calc(20px * var(--hs,1)); color: var(--c-cyan); font-weight: 700; }
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
#homeUi .besSub { font-size: calc(18px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .besElite { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); margin-top: calc(16px * var(--hs,1));
  font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .besElite b { color: var(--c-gold); }
#homeUi .besDetail { display: flex; gap: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1)); }
#homeUi .besDetail.lock { opacity: .75; }
#homeUi .besDetailPic { flex: none; width: calc(180px * var(--hs,1)); height: calc(220px * var(--hs,1)); }
#homeUi .besDetail.lock .besDetailPic { background: radial-gradient(circle at 50% 60%, var(--c-navy-1), var(--c-navy-5)); border-radius: calc(16px * var(--hs,1)); border: 1px solid var(--c-line-hi); }
#homeUi .besDetailInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); text-align: left; }
#homeUi .besDetailName { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .besDetailName b { font-size: calc(30px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .besStars { font-size: calc(22px * var(--hs,1)); color: var(--c-gold); }
#homeUi .besBeh { font-size: calc(22px * var(--hs,1)); color: var(--c-cyan); font-weight: 700; }
#homeUi .besDesc { font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); line-height: 1.7; }
#homeUi .besStats { margin-top: calc(6px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .besStatRow { display: flex; justify-content: space-between; font-size: calc(20px * var(--hs,1)); }
#homeUi .besStatRow span { color: var(--c-text-dim); }
#homeUi .besStatRow b { color: var(--c-gold-hi); }

/* ===== 试炼之塔（基地建筑入口 + 弹窗） ===== */
#homeUi .trialList { max-height: calc(760px * var(--hs,1)); overflow-y: auto; display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); }
#homeUi .trialSect { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .trialSect.lock { opacity: .5; }
#homeUi .trialSectName { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .trialSect.lock .trialSectName { color: #587099; }
#homeUi .trialGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .trialCell { position: relative; padding: calc(12px * var(--hs,1)) 0; text-align: center; cursor: default;
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); }
#homeUi .trialCell b { font-size: calc(26px * var(--hs,1)); color: var(--c-text); }
#homeUi .trialCell span { font-size: calc(18px * var(--hs,1)); }
#homeUi .trialCell i { position: absolute; top: calc(2px * var(--hs,1)); right: calc(4px * var(--hs,1)); font-style: normal; font-size: calc(16px * var(--hs,1)); }
#homeUi .trialCell.done { border-color: #3f7a4a; }
#homeUi .trialCell.done b { color: #7fe08a; }
#homeUi .trialCell.now { border-color: var(--c-gold-dk2); cursor: pointer; animation: huiChest 1.8s ease-in-out infinite; }
#homeUi .trialCell.now b { color: var(--c-gold-hi); }
#homeUi .trialCell.sel { border-color: var(--c-gold); box-shadow: 0 0 14px rgba(240,177,62,.6); }
#homeUi .trialCell.lock { opacity: .45; }
#homeUi .trialCell.mile { border-top: calc(3px * var(--hs,1)) solid #c9a227; }
#homeUi .trialDetail { margin-top: calc(16px * var(--hs,1)); padding: calc(18px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); text-align: left; }
#homeUi .trialName { font-size: calc(28px * var(--hs,1)); font-weight: 700; color: var(--c-gold-hi); display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .trialName span { font-size: calc(18px * var(--hs,1)); color: var(--c-cyan); font-weight: 400; }
#homeUi .trialStat { display: flex; gap: calc(24px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); flex-wrap: wrap; }
#homeUi .trialStat b { color: var(--c-text); }
#homeUi .trialMobs { display: flex; gap: calc(16px * var(--hs,1)); flex-wrap: wrap; align-items: flex-end; }
#homeUi .trialMob { display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .trialMobPic { width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); }
#homeUi .trialReward { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .trialRewardHead { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .trialRewardRow { display: flex; gap: calc(10px * var(--hs,1)); align-items: center; font-size: calc(22px * var(--hs,1)); }
#homeUi .trialRewardRow b { color: var(--c-gold-hi); }
#homeUi .trialRewardNote { font-size: calc(20px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .trialGo { width: 100%; margin-top: calc(16px * var(--hs,1)); }

/* ===== 英雄招募 + 升星（英雄页入口） ===== */
#homeUi .hpick.recruitEntry .rcIc, #homeUi .hpick.talentEntry2 .rcIc { font-size: calc(46px * var(--hs,1)); line-height: calc(72px * var(--hs,1)); background: none !important; }
#homeUi .talentEntry2 .questRed { display: none; position: absolute; top: calc(-2px * var(--hs,1)); right: calc(6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: var(--c-danger);
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .talentEntry2 .questRed.on { display: block; }
/* 基地纯入口建筑卡红点（右上角） */
#homeUi .bcardRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(18px * var(--hs,1)); height: calc(18px * var(--hs,1)); border-radius: 50%; background: var(--c-danger);
  box-shadow: 0 0 8px rgba(255,82,82,.8); z-index: 2; }
#homeUi .bcardRed.on { display: block; }
#homeUi .starBar { margin: calc(16px * var(--hs,1)) 0; padding: calc(18px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .starBar.max { border-color: var(--c-gold-dk2); }
#homeUi .sbLine { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .sbStars { font-size: calc(32px * var(--hs,1)); color: var(--c-gold); letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .starBar.max .sbStars { color: var(--c-gold-bright); text-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.8); }
#homeUi .sbLv { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .sbProg { display: flex; align-items: baseline; gap: calc(10px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .sbProg b { color: var(--c-gold-hi); font-size: calc(24px * var(--hs,1)); }
#homeUi .sbAdd { font-size: calc(17px * var(--hs,1)); color: #587099; }
#homeUi .sbDone { color: var(--c-gold); }
#homeUi .sbBtn { width: 100%; }

#homeUi .rcHead { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .rcHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .rcHeadTop i { color: var(--c-gold); font-style: normal; font-size: calc(28px * var(--hs,1)); font-weight: 700; }
#homeUi .rcHeadTop span { font-size: calc(19px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .rcBar { height: calc(14px * var(--hs,1)); background: #1a2c4a; border-radius: calc(8px * var(--hs,1)); overflow: hidden; border: 1px solid #2f4a72; }
#homeUi .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, var(--c-gold), var(--c-gold-hi)); transition: width .3s; }
#homeUi .rcRate { padding: calc(16px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .rcRateRow { display: flex; justify-content: space-between; font-size: calc(21px * var(--hs,1)); color: var(--c-text); }
#homeUi .rcRateRow b { color: var(--c-text-dim); }
#homeUi .rcRateRow.hero span { color: var(--c-gold-bright); }
#homeUi .rcRateRow.hero b { color: var(--c-gold-bright); }
#homeUi .rcRateRow.r5 span { color: var(--c-amber-hi); }
#homeUi .rcRateRow.r3 span { color: #5ab0f0; }
#homeUi .rcRateRow.r2 span { color: #7bd67b; }
#homeUi .rcRateNote { margin-top: calc(4px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .rcShards { margin-top: calc(16px * var(--hs,1)); }
#homeUi .rcShardsHead { font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .rcShardGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .rcShard { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(10px * var(--hs,1)); }
#homeUi .rcShard.lock { opacity: .55; filter: grayscale(.7); }
#homeUi .rcShardPic { flex: none; width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); background-color: var(--c-navy-1); }
#homeUi .rcShardInfo { display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); min-width: 0; }
#homeUi .rcShardInfo b { font-size: calc(20px * var(--hs,1)); color: var(--c-text); }
#homeUi .rcShardInfo i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-cyan); }
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
#homeUi .rcCardNm { font-size: calc(18px * var(--hs,1)); color: var(--c-text); line-height: 1.3; }
#homeUi .rcCard.hero { border-color: var(--c-gold-bright); box-shadow: 0 0 calc(18px * var(--hs,1)) rgba(255,215,106,.7); }
#homeUi .rcCard.r5 { border-color: var(--c-amber-hi); }
#homeUi .rcCard.r3 { border-color: #5ab0f0; }
#homeUi .rcCard.r2 { border-color: #7bd67b; }
#homeUi .rcNew { position: absolute; top: calc(-8px * var(--hs,1)); right: calc(-8px * var(--hs,1)); background: var(--c-danger); color: #fff;
  font-size: calc(16px * var(--hs,1)); font-weight: 700; padding: calc(2px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); }
#homeUi .rcDup { position: absolute; top: calc(4px * var(--hs,1)); left: 50%; transform: translateX(-50%); font-size: calc(14px * var(--hs,1));
  color: var(--c-gold); white-space: nowrap; }
#homeUi .rcSum { margin-top: calc(18px * var(--hs,1)); text-align: center; font-size: calc(22px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .rcAgain { width: 100%; margin-top: calc(18px * var(--hs,1)); }
#homeUi .rcClose { width: 100%; margin-top: calc(10px * var(--hs,1)); }

/* ===== 天赋树（基地横幅入口） ===== */
#homeUi .talentHead { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .talentHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .talentHeadTop i { color: #8fe3ff; font-style: normal; font-size: calc(30px * var(--hs,1)); font-weight: 700; }
#homeUi .talentHeadTop span { font-size: calc(19px * var(--hs,1)); color: var(--c-gold); }
#homeUi .talentBar { height: calc(14px * var(--hs,1)); background: #1a2c4a; border-radius: calc(8px * var(--hs,1)); overflow: hidden; border: 1px solid #2f4a72; }
#homeUi .talentBar i { display: block; height: 100%; background: linear-gradient(90deg, #4aa8d8, #8fe3ff); transition: width .3s; }
#homeUi .talentSrc { font-size: calc(17px * var(--hs,1)); color: #587099; line-height: 1.5; }

#homeUi .talentBranchRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(14px * var(--hs,1)); }
#homeUi .talentBranch { display: flex; flex-direction: column; min-width: 0; }
#homeUi .tbTitle { text-align: center; margin-bottom: calc(10px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .tbTitle b { font-size: calc(22px * var(--hs,1)); color: var(--c-text); }
#homeUi .tbTitle i { font-style: normal; font-size: calc(17px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .tbNodes { display: flex; flex-direction: column; align-items: center; }
#homeUi .talentNode { position: relative; width: calc(88px * var(--hs,1)); height: calc(88px * var(--hs,1)); flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(2px * var(--hs,1));
  border: 2px solid #2f4a72; border-radius: calc(12px * var(--hs,1)); background: #16233a; cursor: pointer; }
/* 节点间竖向连线：位于节点下方，撑满 5 行间距；末节点不画 */
#homeUi .talentNode:not(:last-child) { margin-bottom: calc(30px * var(--hs,1)); }
#homeUi .talentNode:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%;
  transform: translateX(-50%); width: calc(4px * var(--hs,1)); height: calc(30px * var(--hs,1)); background: #2f4a72; }
#homeUi .talentNode.maxed:not(:last-child)::after { background: var(--c-gold); }
#homeUi .talentNode.lock { opacity: .5; filter: grayscale(.8); border-color: #26364f; }
#homeUi .talentNode.can { border-color: #4aa8d8; box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(74,168,216,.65); animation: huiChest .9s ease-in-out infinite; }
#homeUi .talentNode.maxed { border-color: var(--c-gold); box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(240,177,62,.6); }
#homeUi .talentNode.sel { outline: calc(3px * var(--hs,1)) solid #8fe3ff; outline-offset: calc(3px * var(--hs,1)); }
#homeUi .tnIc { font-size: calc(38px * var(--hs,1)); line-height: 1; }
#homeUi .tnLv { font-size: calc(16px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .talentNode.maxed .tnLv { color: var(--c-gold-bright); }
#homeUi .talentNode.can .tnLv { color: #8fe3ff; }

#homeUi .talentDetail { margin-top: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1));
  display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .tdName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .tdName b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .tdName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .tdDesc { font-size: calc(21px * var(--hs,1)); color: var(--c-text); line-height: 1.5; }
#homeUi .tdHint { font-size: calc(19px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .tdBtns { display: flex; gap: calc(14px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .tdBtns .btn { flex: 1; }

/* ===== 资源副本（基地横幅入口） ===== */
#homeUi .dgHead { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .dgHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .dgHeadTop b { color: var(--c-gold-hi); }
#homeUi .dgHeadTop span { font-size: calc(19px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .dgSrc { font-size: calc(17px * var(--hs,1)); color: #587099; line-height: 1.5; }

#homeUi .dgList { display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); }
#homeUi .dgRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1));
  border-radius: calc(18px * var(--hs,1)); background: var(--c-navy-6); border: 1px solid var(--c-line); cursor: pointer; }
#homeUi .dgRow.on { border-color: var(--c-gold); box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.35); }
#homeUi .dgInfo { flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .dgIc { font-size: calc(44px * var(--hs,1)); line-height: 1; }
#homeUi .dgMeta { display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); min-width: 0; }
#homeUi .dgMeta b { font-size: calc(24px * var(--hs,1)); color: var(--c-text); }
#homeUi .dgMeta i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .dgTiers { display: flex; gap: calc(8px * var(--hs,1)); flex: none; }
#homeUi .dgTier { min-width: calc(96px * var(--hs,1)); }
#homeUi .dgTier:disabled { opacity: .5; }

#homeUi .dgDetail { margin-top: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1));
  display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .dgName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .dgName b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .dgName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .dgDesc { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); line-height: 1.5; }
#homeUi .dgYield { font-size: calc(22px * var(--hs,1)); color: var(--c-text); }
#homeUi .dgHint { font-size: calc(19px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .dgGo { width: 100%; margin-top: calc(6px * var(--hs,1)); }

/* ===== 远征派遣 ===== */
#homeUi .expHead { margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .expHeadTop { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .expHeadTop b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .expHeadTop span { font-size: calc(22px * var(--hs,1)); color: var(--c-cyan); font-weight: 700; }
#homeUi .expSrc { font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); margin-top: calc(6px * var(--hs,1)); }
#homeUi .expList { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .expRow { padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1)); cursor: pointer;
  border: 1px solid var(--c-line); border-radius: calc(14px * var(--hs,1)); background: linear-gradient(#1b2b4a, #0f1b30); }
#homeUi .expRow.on { border-color: #4aa8d8; box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(74,168,216,.4); }
#homeUi .expRow.ready { border-color: var(--c-gold); box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.45); }
#homeUi .expInfo { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); }
#homeUi .expIc { flex: none; width: calc(64px * var(--hs,1)); height: calc(64px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(34px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, var(--c-navy-1), var(--c-navy-5)); border: 1px solid var(--c-line-hi); }
#homeUi .expMeta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--hs,1)); }
#homeUi .expMeta b { font-size: calc(24px * var(--hs,1)); color: #e8f1ff; }
#homeUi .expMeta i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .expRow.ready .expMeta i { color: var(--c-gold); font-weight: 700; }
#homeUi .expDetail { padding: calc(16px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .expName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .expName b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .expName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .expDesc { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); line-height: 1.5; }
#homeUi .expYield { font-size: calc(21px * var(--hs,1)); color: var(--c-text); line-height: 1.5; }
#homeUi .expMult { font-size: calc(20px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .expHeroes { display: flex; flex-wrap: wrap; gap: calc(10px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .expHero { flex: 1 1 calc(30% - calc(10px * var(--hs,1))); min-width: calc(160px * var(--hs,1));
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(12px * var(--hs,1));
  background: radial-gradient(circle at 50% 0%, #222f4d, var(--c-navy-5)); border: 1px solid var(--c-line); color: #cfe2f7; }
#homeUi .expHero.sel { border-color: var(--c-gold); box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.45); }
#homeUi .expHero.busy, #homeUi .expHero:disabled { opacity: .45; filter: grayscale(.6); }
#homeUi .ehIc { width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: calc(26px * var(--hs,1)); font-weight: 700;
  background: var(--c-navy-1); border: 1px solid #4a6a97; color: var(--c-gold-hi); }
#homeUi .ehName { font-size: calc(19px * var(--hs,1)); }
#homeUi .ehAttr { font-size: calc(17px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .ehBusy { font-size: calc(16px * var(--hs,1)); color: #ff8a8a; }
#homeUi .expPick { font-size: calc(19px * var(--hs,1)); color: var(--c-cyan); text-align: center; }
#homeUi .expTeam { font-size: calc(20px * var(--hs,1)); color: var(--c-text); }
#homeUi .expTimer { font-size: calc(24px * var(--hs,1)); color: var(--c-gold); font-weight: 700; text-align: center; }
#homeUi .expActions { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .expGo { width: 100%; }

/* ===== 个人主页（点头像弹出） ===== */
#homeUi .pAvatar { cursor: pointer; }
#homeUi .pfCard { display: flex; align-items: center; gap: calc(20px * var(--hs,1)); padding: calc(20px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .pfPic { flex: none; width: calc(128px * var(--hs,1)); height: calc(128px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background-color: var(--c-navy-1); border: 2px solid var(--c-line-hi); }
#homeUi .pfCardInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .pfName { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); }
#homeUi .pfName b { font-size: calc(32px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .pfName .lvtag { font-size: calc(20px * var(--hs,1)); }
#homeUi .pfTitle { font-size: calc(24px * var(--hs,1)); color: var(--c-cyan); font-weight: 700; }
#homeUi .pfPower { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .pfPower b { font-size: calc(30px * var(--hs,1)); color: var(--c-gold); font-variant-numeric: tabular-nums; }
#homeUi .pfSec { margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .pfSecHead { margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .pfSecHead b { font-size: calc(24px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .pfGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .pfStat { display: flex; flex-direction: column; align-items: center; gap: calc(5px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(6px * var(--hs,1)); }
#homeUi .pfStat em { font-style: normal; font-size: calc(32px * var(--hs,1)); line-height: 1.1; }
#homeUi .pfStat b { font-size: calc(24px * var(--hs,1)); color: var(--c-gold-hi); font-variant-numeric: tabular-nums; }
#homeUi .pfStat span { font-size: calc(17px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .pfAcc { padding: calc(14px * var(--hs,1)) calc(20px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .pfAccRow { display: flex; justify-content: space-between; font-size: calc(21px * var(--hs,1)); }
#homeUi .pfAccRow span { color: var(--c-text-dim); }
#homeUi .pfAccRow b { color: var(--c-gold-hi); }

/* ===== 排行榜（基地页入口 + 弹窗） ===== */
#homeUi .lbEntry { margin-left: 0; }
#homeUi .lbBox .mHead h3 { color: var(--c-gold-hi); }
#homeUi .lbMy { display: flex; align-items: baseline; justify-content: space-between; background: linear-gradient(90deg, rgba(240,177,62,.16), transparent);
  border: 1px solid var(--c-gold-dk2); border-radius: calc(12px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(20px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .lbMy span { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .lbMy b { font-size: calc(32px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .lbList { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .lbRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(14px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1)); }
#homeUi .lbRow.me { border-color: var(--c-gold-dk2); background: linear-gradient(90deg, rgba(240,177,62,.14), rgba(20,32,58,.6));
  box-shadow: 0 0 10px rgba(240,177,62,.18); }
#homeUi .lbRank { flex: none; width: calc(52px * var(--hs,1)); text-align: center; font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); font-weight: 800; }
#homeUi .lbRank .medal { font-style: normal; font-size: calc(30px * var(--hs,1)); }
#homeUi .lbIc { flex: none; font-size: calc(30px * var(--hs,1)); }
#homeUi .lbName { flex: 1; min-width: 0; font-size: calc(24px * var(--hs,1)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .lbRow.me .lbName { color: var(--c-gold-hi); }
#homeUi .lbScore { flex: none; font-size: calc(24px * var(--hs,1)); color: var(--c-cyan); font-weight: 800; }

/* ===== 宝石镶嵌（穿戴面板孔位区） ===== */
#homeUi .gemBox { display: flex; gap: calc(10px * var(--hs,1)); margin: calc(-4px * var(--hs,1)) 0 calc(8px * var(--hs,1)); }
#homeUi .gemHole { flex: 1; display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(6px * var(--hs,1)); border-radius: calc(12px * var(--hs,1));
  background: radial-gradient(circle at 50% 20%, #1a2a4a, var(--c-navy-7)); border: 1px dashed var(--c-line); cursor: pointer; }
#homeUi .gemHole:active { transform: scale(.96); }
#homeUi .gemHole .ghIc { font-size: calc(34px * var(--hs,1)); }
#homeUi .gemHole .ghNm { font-size: calc(18px * var(--hs,1)); font-weight: 700; }
#homeUi .gemHole .ghEff { font-size: calc(16px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .gemHole .dim { color: #4a608a; filter: grayscale(.4); }
#homeUi .gemHole .ghEff.dim { color: #4a608a; }

/* ===== 装备工坊（合成/分解） ===== */
#homeUi .forgeBtn { flex: none; width: calc(150px * var(--hs,1)); }
#homeUi .fSec { margin-bottom: calc(18px * var(--hs,1)); }
#homeUi .fHead { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .fHead b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .fHead span { font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); }
#homeUi .fRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(14px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1)); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .fInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .fInfo b { font-size: calc(22px * var(--hs,1)); }
#homeUi .fInfo span { font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .fRow .btn { flex: none; min-width: calc(140px * var(--hs,1)); height: calc(48px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .fQuick { width: 100%; margin-top: calc(6px * var(--hs,1)); }
#homeUi .fNote { text-align: center; }

/* ===== 巡逻入口（护送页底部左快捷，通关第 1 关解锁；无尽已移入右侧栏） ===== */
#homeUi .battle-bottom .hot.patrolHot { color: #bfe0ff; }
/* 无尽收进侧栏：与图鉴/排行/试炼同尺寸，仅保留配色以区分模式入口 */
#homeUi .side-tools .hot.endlessHot { color: #8fd6ff; }

/* ===== 设置（顶栏齿轮 + 弹窗） ===== */
#homeUi .setGear { flex: none; width: calc(56px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(26px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; padding: 0; }
#homeUi .setSec { margin-bottom: calc(18px * var(--hs,1)); }
#homeUi .setHead { margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .setHead b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .setHead.danger b { color: #ff8a6a; }
#homeUi .setRow { display: flex; align-items: center; justify-content: space-between; gap: calc(12px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(14px * var(--hs,1)); background: rgba(20,32,58,.6);
  border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1)); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .setRow > span { font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .setRow > b { font-size: calc(22px * var(--hs,1)); color: #cfe0f5; }
#homeUi .setRow .btn { min-width: calc(170px * var(--hs,1)); height: calc(50px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .volWrap { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); flex: 1; max-width: calc(300px * var(--hs,1)); }
#homeUi .volWrap input[type=range] { flex: 1; accent-color: var(--c-gold); height: calc(24px * var(--hs,1)); }
#homeUi .volWrap b { font-size: calc(20px * var(--hs,1)); color: var(--c-cyan); width: calc(64px * var(--hs,1)); text-align: right; }
#homeUi .resetBtn { border-color: #8a3a2a !important; color: #ff9a8a !important; }

/* ===== 建筑详情浮窗（基地页 ⓘ） ===== */
#homeUi .bInfoBtn { position: absolute; top: calc(8px * var(--hs,1)); right: calc(8px * var(--hs,1)); z-index: 2;
  width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); border-radius: 50%;
  border: 1px solid var(--c-line-hi); background: rgba(13,22,38,.8); color: var(--c-text-dim); font-size: calc(20px * var(--hs,1));
  font-style: italic; font-weight: 800; font-family: serif; cursor: pointer; }
#homeUi .bInfoBtn:active { transform: scale(.92); }
#homeUi .binfoBox .mHead h3 { color: var(--c-gold-hi); }
#homeUi .biIntro { font-size: calc(22px * var(--hs,1)); line-height: 1.65; color: #b9cbe2;
  background: rgba(20,32,58,.6); border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .biLvRow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .biLvRow span { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .biLvRow b { font-size: calc(24px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .biBar { height: calc(12px * var(--hs,1)); border-radius: 99px; background: var(--c-navy-6); border: 1px solid var(--c-line); overflow: hidden; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .biBar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--c-cyan-mid), var(--c-ok)); }
#homeUi .biEff { background: rgba(20,32,58,.6); border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .biEff em { display: block; font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); margin-bottom: calc(4px * var(--hs,1)); }
#homeUi .biEff span { font-size: calc(22px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .biEff.next span { color: var(--c-ok); }
#homeUi .biStatus { font-size: calc(20px * var(--hs,1)); color: var(--c-cream-2); margin: calc(4px * var(--hs,1)) 0 calc(14px * var(--hs,1)); }
#homeUi .biOk { width: 100%; }

/* ===== 技能详情浮窗（技能卡点击） ===== */
#homeUi .skillCard { cursor: pointer; }
#homeUi .abBox .mHead h3 { color: var(--c-gold-hi); }
#homeUi .abName { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .abName b { font-size: calc(30px * var(--hs,1)); }
#homeUi .abName .lvtag { font-size: calc(20px * var(--hs,1)); }
#homeUi .abEff { background: rgba(20,32,58,.6); border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .abEff em { display: block; font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-edge-8); margin-bottom: calc(4px * var(--hs,1)); }
#homeUi .abEff span { font-size: calc(22px * var(--hs,1)); color: var(--c-cyan); }
#homeUi .abEff.next span { color: var(--c-ok); }
#homeUi .abMs { margin: calc(14px * var(--hs,1)) 0; }
#homeUi .abMsHead { font-size: calc(22px * var(--hs,1)); color: var(--c-gold-hi); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .abMsRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(12px * var(--hs,1));
  border: 1px dashed var(--c-line); border-radius: calc(8px * var(--hs,1)); margin-bottom: calc(6px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .abMsRow.reach { border: 1px solid var(--c-gold-dk2); background: rgba(240,177,62,.1); color: var(--c-gold-hi); }
#homeUi .abMsLv { flex: none; font-weight: 900; font-size: calc(20px * var(--hs,1)); }
#homeUi .abMsRow span:last-child { font-size: calc(20px * var(--hs,1)); }
#homeUi .abCost { display: flex; align-items: center; justify-content: space-between; gap: calc(12px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid var(--c-navy-2); border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .abCost > span { font-size: calc(20px * var(--hs,1)); color: var(--c-cream-2); }
#homeUi .abCost .btn { min-width: calc(170px * var(--hs,1)); height: calc(54px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); }

/* ===== 英雄选择条 ===== */
#homeUi .heroPick { display: flex; gap: calc(12px * var(--hs,1)); overflow-x: auto; padding-bottom: calc(12px * var(--hs,1)); }
#homeUi .heroPick::-webkit-scrollbar { display: none; }
#homeUi .hpick { flex: none; width: calc(124px * var(--hs,1)); position: relative; background: none; border: none; cursor: pointer;
  font-family: inherit; color: var(--c-text-dim); display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .hpick .pic { width: calc(100px * var(--hs,1)); height: calc(100px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background-color: #16233b; background-position: center; border: 1px solid var(--c-line); transition: .2s; }
#homeUi .hpick i { font-style: normal; font-size: calc(20px * var(--hs,1)); white-space: nowrap; }
#homeUi .hpick.on .pic { border-color: var(--c-gold-frame); box-shadow: 0 0 12px rgba(245,196,81,.5); transform: translateY(calc(-6px * var(--hs,1))); }
#homeUi .hpick.on { color: var(--c-gold-hi); }
#homeUi .hpick.lock .pic { filter: grayscale(1) brightness(.55); }
#homeUi .hpick.lock::after { content: '🔒'; position: absolute; transform: translate(calc(32px * var(--hs,1)), calc(-80px * var(--hs,1))); font-size: calc(24px * var(--hs,1)); }

/* ===== 英雄页 ===== */
#homeUi .heroHead { display: flex; justify-content: space-between; align-items: center; margin: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .heroName { font-size: calc(36px * var(--hs,1)); font-weight: 900; letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .star { color: var(--c-gold-frame); font-size: calc(26px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); margin-left: calc(8px * var(--hs,1)); text-shadow: 0 0 6px rgba(245,196,81,.6); }
#homeUi .tagRow { display: flex; gap: calc(10px * var(--hs,1)); margin-top: calc(10px * var(--hs,1)); }
#homeUi .powerBadge { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); background: linear-gradient(180deg, #2a3f66, #1a2947);
  border: 1px solid var(--c-gold-dk2); border-radius: 99px; padding: calc(10px * var(--hs,1)) calc(24px * var(--hs,1));
  font-weight: 900; color: var(--c-gold-hi); font-size: calc(28px * var(--hs,1)); box-shadow: 0 0 12px rgba(240,177,62,.2);
  align-self: center; margin-top: calc(6px * var(--hs,1)); }
#homeUi .powerBadge .pwInfo { border: 1px solid var(--c-gold-hi); border-radius: 50%; background: none; color: var(--c-gold-hi);
  font-family: inherit; font-style: normal; cursor: pointer; display: flex; align-items: center; justify-content: center;
  width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
#homeUi .pwBox .pwRow { display: flex; align-items: baseline; gap: calc(14px * var(--hs,1)); }
#homeUi .pwBox .pwRow b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .pwBox .pwRow i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); flex: 1; text-align: right; }
/* 背包：页签钉在面板上沿，格子区内部滚动（页面整体不再被格子撑高） */
#homeUi .bagBar { display: flex; flex-direction: column; overflow: hidden; }
#homeUi .bagBar .bagTabs { flex: none; }
#homeUi .bagBar .bagGrid { flex: 1 1 auto; min-height: calc(160px * var(--hs,1)); overflow-y: auto; align-content: start; }
#homeUi .heroMain { display: grid; grid-template-columns: calc(120px * var(--hs,1)) minmax(0,1fr) calc(120px * var(--hs,1)) calc(250px * var(--hs,1)); align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(12px * var(--hs,1)) 0; }
/* 功能入口双列：左列 核心/强化/技能，右列 升星/天赋，分立绘两侧 */
#homeUi .fcol { display: flex; flex-direction: column; gap: calc(14px * var(--hs,1)); align-items: stretch; }
#homeUi .fcol .btn { position: relative; width: 100%; height: calc(76px * var(--hs,1)); font-size: calc(22px * var(--hs,1));
  padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(4px * var(--hs,1)); }
#homeUi .fcol .btn:disabled { opacity: .5; }
/* 右装备格：2×3 六槽（自左右夹立绘改为贴右列） */
#homeUi .eqGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: calc(16px * var(--hs,1)); }
#homeUi .eqGrid .slot { width: 100%; height: calc(112px * var(--hs,1)); }
#homeUi .bagBar { position: sticky; bottom: 0; z-index: 6; }
/* 弹层分级：L2 半屏抽屉 / L4 全屏结果层 */
#homeUi .sheetMask { align-items: flex-end; padding: 0; }
#homeUi .sheetBox { max-height: 76%; border-radius: calc(28px * var(--hs,1)) calc(28px * var(--hs,1)) 0 0; border-bottom: none;
  animation: sheetUp .28s cubic-bezier(.2,.9,.3,1); }
#homeUi .sheetGrip { position: absolute; top: calc(10px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  width: calc(64px * var(--hs,1)); height: calc(8px * var(--hs,1)); border-radius: 99px; background: rgba(140,170,210,.45); }
#homeUi .resultMask { background: rgba(4,8,16,.88); }
#homeUi .resultBox { max-height: 90%; }
@keyframes sheetUp { from { transform: translateY(60%); opacity: .5; } to { transform: translateY(0); opacity: 1; } }
/* 招募主卡（商店页顶部，自英雄页上浮） */
#homeUi .rcard { display: flex; align-items: center; gap: calc(20px * var(--hs,1)); padding: calc(18px * var(--hs,1)) calc(24px * var(--hs,1)); margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .rcard .rcLeft { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .rcard .rcTitle { font-size: calc(28px * var(--hs,1)); font-weight: 900; color: var(--c-gold-hi); }
#homeUi .rcard .rcPity { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .rcard .rcBar { flex: 1; margin: 0; }
#homeUi .rcard .rcPityTxt { font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); white-space: nowrap; }
#homeUi .rcard .rcDetail { background: none; border: none; color: var(--c-cyan); font-family: inherit; font-size: calc(19px * var(--hs,1));
  font-weight: 700; cursor: pointer; padding: 0; text-align: left; }
#homeUi .rcard .rcActs { flex: none; display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); width: calc(250px * var(--hs,1)); }
#homeUi .rcard .rcActs .btn { width: 100%; }
#homeUi .heroMain .sideActions { display: flex; flex-direction: column; gap: calc(16px * var(--hs,1)); }
#homeUi .heroMain .sideActions .btn { width: calc(180px * var(--hs,1)); height: calc(60px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
#homeUi .slotCol { display: flex; flex-direction: column; gap: calc(24px * var(--hs,1)); align-items: center; }
#homeUi .slot { width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); border-radius: calc(18px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #1a2a4a, var(--c-navy-7)); border: 1px solid var(--c-line); position: relative;
  display: flex; align-items: center; justify-content: center; font-size: calc(46px * var(--hs,1)); cursor: pointer; }
#homeUi .slot.filled { border-color: var(--c-gold-dk2); box-shadow: 0 0 8px rgba(240,177,62,.25); }
#homeUi .slot.empty { color: #4a608a; }
#homeUi .slot .slv { position: absolute; right: calc(-10px * var(--hs,1)); bottom: calc(-10px * var(--hs,1));
  background: linear-gradient(180deg, var(--c-gold-hi), #e0a23c); color: #5a3a08; font-size: calc(18px * var(--hs,1)); font-weight: 900;
  padding: calc(2px * var(--hs,1)) calc(10px * var(--hs,1)); border-radius: calc(12px * var(--hs,1)); border: 1px solid #8a5c12; }
#homeUi .slot .sname { position: absolute; top: calc(-40px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); white-space: nowrap; }
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
#homeUi .heroLv { z-index: 2; margin-top: calc(16px * var(--hs,1)); background: var(--c-navy-6); border: 1px solid var(--c-line); border-radius: 99px;
  font-size: calc(22px * var(--hs,1)); color: var(--c-cyan-mid); font-weight: 800; padding: calc(4px * var(--hs,1)) calc(24px * var(--hs,1)); }
#homeUi .statRow { display: flex; gap: calc(16px * var(--hs,1)); margin: calc(16px * var(--hs,1)) 0 calc(24px * var(--hs,1)); }
#homeUi .stat { flex: 1; text-align: center; padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .stat b { display: block; font-size: calc(30px * var(--hs,1)); color: var(--c-text); margin-top: calc(4px * var(--hs,1)); }
#homeUi .row3 { display: flex; gap: calc(16px * var(--hs,1)); margin-top: calc(20px * var(--hs,1)); }
#homeUi .row3 .btn { flex: 1; height: calc(76px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }

/* ===== 关卡页 ===== */
#homeUi .chTabs { display: flex; gap: calc(12px * var(--hs,1)); }
#homeUi .chTabs button { flex: 1; height: calc(80px * var(--hs,1)); border-radius: calc(18px * var(--hs,1)); border: 1px solid var(--c-line);
  background: var(--c-navy-4); color: var(--c-text-dim); font-family: inherit; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(2px * var(--hs,1)); padding: calc(4px * var(--hs,1)); }
#homeUi .chTabs button b { font-size: calc(22px * var(--hs,1)); white-space: nowrap; }
#homeUi .chTabs button span { font-size: calc(16px * var(--hs,1)); }
#homeUi .chTabs button.on { background: linear-gradient(180deg, var(--c-line-hi), #243a63); color: var(--c-gold-hi); border-color: var(--c-gold-dk2);
  box-shadow: 0 0 12px rgba(240,177,62,.2); }
#homeUi .chTabs button.lock { opacity: .45; }
/* ===== 护送页（布局稿 R2 骨架）：章节头 / 难度段 / 场景+内侧快捷栏 / 里程碑 / 编队条 / 底部 CTA ===== */
#homeUi .chapter-head { height: calc(125px * var(--hs,1)); display: flex; align-items: center; justify-content: center; gap: calc(44px * var(--hs,1)); }
#homeUi .chapter-head h1 { font-size: calc(53px * var(--hs,1)); font-weight: 900; color: var(--c-gold-hi); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .chapter-head small { display: block; margin-top: calc(4px * var(--hs,1)); font-size: calc(28px * var(--hs,1)); color: var(--c-text-dim); text-align: center; }
/* 章节头载具牌：本章护送的是什么车（CHAPTER_THEMES 的 veh 字形 → UiPlate.VEHICLE_TEX）。
   字形先占位、图到位由 icon() 摘掉，尺寸只归这里（贴图槽从不写 inline 宽高） */
#homeUi .chapter-head .chVeh { flex: none; display: block; font-style: normal; text-align: center;
  width: calc(76px * var(--hs,1)); height: calc(76px * var(--hs,1));
  font-size: calc(64px * var(--hs,1)); line-height: calc(76px * var(--hs,1)); }
/* 翻页器：挂在场景内侧左右边缘的垂直中线上（章节头只留章节名） */
#homeUi .stage > .arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
  display: flex; align-items: center; justify-content: center;
  width: calc(122px * var(--hs,1)); height: calc(116px * var(--hs,1));
  border-radius: calc(16px * var(--hs,1)); background: rgba(10,20,38,.6); border: 1px solid #4f7ab8; color: var(--c-gold-hi);
  font-size: calc(50px * var(--hs,1)); font-weight: 900; cursor: pointer; }
#homeUi .stage > .arrow.l { left: calc(60px * var(--hs,1)); }
#homeUi .stage > .arrow.r { right: calc(60px * var(--hs,1)); }
/* 走不动时只降透明、不吞点击：点了由 _stageStepBlocked 给出原因 */
#homeUi .stage > .arrow.dim { opacity: .35; }
#homeUi .difficulty { align-self: center; flex: none; display: flex; width: calc(620px * var(--hs,1)); height: calc(89px * var(--hs,1));
  border: 1px solid #4f7ab8; border-radius: calc(10px * var(--hs,1)); overflow: hidden; background: var(--c-navy-4); }
#homeUi .difficulty .diffSeg { flex: 1; min-width: 0; height: auto; padding: 0; font-family: inherit; font-size: calc(33px * var(--hs,1));
  font-weight: 700; color: var(--c-text-dim); background: none; border: 0; border-left: 1px solid #2a3c5a; cursor: pointer; white-space: nowrap; }
#homeUi .difficulty .diffSeg:first-child { border-left: 0; }
#homeUi .difficulty .diffSeg.on { background: linear-gradient(180deg, var(--c-line-hi), #243a63); color: var(--c-gold-hi); }
#homeUi .difficulty .diffSeg.off { color: #5a6d88; }
#homeUi .stage { position: relative; flex: 1; min-height: calc(332px * var(--hs,1)); margin-top: calc(8px * var(--hs,1)); overflow: hidden; }
#homeUi .stage-scene { position: absolute; inset: 6% 10% 0; overflow: hidden; border-radius: calc(20px * var(--hs,1));
  border: 1px solid var(--c-line-hi); box-shadow: 0 8px 24px rgba(0,0,0,.45);
  background: linear-gradient(180deg, #2b1b3d, #5a2e2a 45%, #8a4a2a 72%, #3a2a20); }
#homeUi .stage-scene.c2 { background: linear-gradient(180deg, #0d1f1a, #1a3a28 50%, #0e2418); }
#homeUi .stage-scene.c3 { background: linear-gradient(180deg, #0a1030, #1a2050 55%, #101838); }
#homeUi .stage-scene .sun { position: absolute; top: 32%; left: 50%; width: calc(176px * var(--hs,1)); height: calc(176px * var(--hs,1));
  transform: translateX(-50%); border-radius: 50%; background: radial-gradient(circle, #ffe0ae, #ff8c4a 58%, transparent 72%); filter: blur(1px); }
#homeUi .stage-scene.c2 .sun, #homeUi .stage-scene.c3 .sun { display: none; }
#homeUi .stage-scene .mtn { position: absolute; bottom: 26%; left: 0; right: 0; height: calc(128px * var(--hs,1)); background: #241a2c; opacity: .9;
  clip-path: polygon(0 100%, 10% 42%, 20% 68%, 32% 18%, 44% 60%, 56% 28%, 68% 66%, 80% 22%, 92% 58%, 100% 100%); }
#homeUi .stage-scene .hill { position: absolute; bottom: 24%; left: 0; right: 0; height: calc(88px * var(--hs,1)); background: #1a1420;
  clip-path: polygon(0 100%, 15% 55%, 30% 80%, 50% 40%, 70% 75%, 85% 50%, 100% 85%, 100% 100%); }
#homeUi .stage-scene .ground { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; background: linear-gradient(180deg, #3a3128, #221d16); }
#homeUi .stage-scene .road { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; background: #2c2a30;
  clip-path: polygon(40% 0, 60% 0, 108% 100%, -8% 100%); }
#homeUi .stage-scene .dash { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; opacity: .8;
  background: repeating-linear-gradient(180deg, #e8c85a 0 20px, transparent 20px 44px);
  clip-path: polygon(49.2% 0, 50.8% 0, 52% 100%, 48% 100%); }
#homeUi .stage-scene .mobs { position: absolute; top: 8%; left: 0; right: 0; display: flex; justify-content: space-around; font-size: calc(40px * var(--hs,1)); }
#homeUi .stage-scene .mobs span { animation: huiMob 2.6s ease-in-out infinite alternate; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
#homeUi .stage-scene .mobs span:nth-child(2) { animation-delay: .5s; font-size: calc(52px * var(--hs,1)); }
#homeUi .stage-scene .mobs span:nth-child(3) { animation-delay: 1s; font-size: calc(32px * var(--hs,1)); }
@keyframes huiMob { from { transform: translateY(0) scale(1); } to { transform: translateY(32px) scale(1.1); } }
#homeUi .stage-scene .veh { position: absolute; bottom: 7%; left: 50%; transform: translateX(-50%); font-size: calc(92px * var(--hs,1)); z-index: 2;
  background-position: center; background-repeat: no-repeat; background-size: contain; display: flex; align-items: flex-end; justify-content: center;
  filter: drop-shadow(0 8px 10px rgba(0,0,0,.55)); animation: huiVeh 1.8s ease-in-out infinite; }
@keyframes huiVeh { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-6px); } }
#homeUi .stage-scene .crew { position: absolute; bottom: 9%; left: 50%; transform: translateX(-50%); display: flex; gap: calc(28px * var(--hs,1)); z-index: 1; }
#homeUi .stage-scene .crew i { width: calc(22px * var(--hs,1)); height: calc(22px * var(--hs,1)); border-radius: 50%; box-shadow: 0 0 8px currentColor; animation: huiPulse 2s ease-in-out infinite; }
#homeUi .stage-scene .crew i:nth-child(1) { color: var(--c-cyan-mid); background: var(--c-cyan-mid); }
#homeUi .stage-scene .crew i:nth-child(2) { color: var(--c-gold-frame); background: var(--c-gold-frame); animation-delay: .3s; }
#homeUi .stage-scene .crew i:nth-child(3) { color: #7ef0c8; background: #7ef0c8; animation-delay: .6s; }
#homeUi .stage-scene .crew i:nth-child(4) { color: #c792ff; background: #c792ff; animation-delay: .9s; }
/* 场景内侧快捷栏（左运营/右快捷）：收进页面后随页显隐，不再走 viewport 悬浮 */
#homeUi .side-tools { position: absolute; top: calc(28px * var(--hs,1)); z-index: 4; display: flex; flex-direction: column; gap: calc(22px * var(--hs,1)); }
#homeUi .side-tools.left { left: calc(8px * var(--hs,1)); }
#homeUi .side-tools.right { right: calc(8px * var(--hs,1)); }
#homeUi .side-tools .hot { position: relative; width: calc(136px * var(--hs,1)); min-height: calc(141px * var(--hs,1)); display: flex;
  flex-direction: column; align-items: center; justify-content: center; gap: calc(4px * var(--hs,1));
  background: none; border: 0; color: var(--c-gold-hi); font-family: inherit; font-size: calc(28px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .side-tools .hot .ic { width: calc(56px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(56px * var(--hs,1)); line-height: 1; }
#homeUi .side-tools .hot .questRed { display: none; position: absolute; top: calc(16px * var(--hs,1)); right: calc(14px * var(--hs,1));
  width: calc(20px * var(--hs,1)); height: calc(20px * var(--hs,1)); border-radius: 50%; background: #ff4d4d; border: 1px solid #fff; }
#homeUi .side-tools .hot .questRed.on, #homeUi .side-tools .hot .questRed.dotOn { display: block; }
/* 无尽收进侧栏后仍需「锁定只降透明」：原 .off 规则只覆盖底栏与编队条 */
#homeUi .side-tools .hot.off { opacity: .45; }
/* 巡逻入口红点（底部左槽，有挂机产出可收时亮） */
#homeUi .battle-bottom .hot .questRed { display: none; position: absolute; top: calc(2px * var(--hs,1)); right: calc(6px * var(--hs,1));
  width: calc(9px * var(--hs,1)); height: calc(9px * var(--hs,1)); border-radius: 50%; background: #ff4d4f; border: 1px solid #fff; }
#homeUi .battle-bottom .hot .questRed.on { display: block; }
#homeUi .stage-caption { position: absolute; bottom: calc(22px * var(--hs,1)); left: calc(166px * var(--hs,1)); right: calc(166px * var(--hs,1));
  z-index: 3; display: flex; align-items: center; justify-content: space-between; pointer-events: none;
  font-size: calc(28px * var(--hs,1)); color: var(--c-text); text-shadow: 0 2px 6px rgba(0,0,0,.6); }
#homeUi .stage-caption b { font-size: calc(33px * var(--hs,1)); color: var(--c-gold-hi); font-variant-numeric: tabular-nums; }
/* 里程碑三档：首次通关 / 耐久过半 / 完美护送 */
#homeUi .milestones { position: relative; flex: none; height: calc(172px * var(--hs,1)); margin: 0 calc(33px * var(--hs,1));
  display: flex; justify-content: space-around; border-bottom: 1px solid #2a3c5a; }
#homeUi .milestones::before { content: ''; position: absolute; top: calc(64px * var(--hs,1)); left: 14%; right: 14%;
  height: calc(8px * var(--hs,1)); background: #2a3c5a; }
#homeUi .milestones .milestone { position: relative; z-index: 1; flex: 1; height: calc(166px * var(--hs,1)); display: flex;
  flex-direction: column; align-items: center; justify-content: center; gap: calc(4px * var(--hs,1));
  background: none; border: 0; font-family: inherit; font-size: calc(28px * var(--hs,1)); color: var(--c-text-dim); cursor: pointer; }
#homeUi .milestones .milestone .ic { width: calc(89px * var(--hs,1)); height: calc(89px * var(--hs,1)); }
#homeUi .milestones .milestone small { font-size: calc(25px * var(--hs,1)); }
#homeUi .milestones .milestone.ready { color: var(--c-gold-hi); animation: huiChest 1.8s ease-in-out infinite; }
#homeUi .milestones .milestone.got { opacity: .55; }
#homeUi .milestones .milestone.got .ic { filter: grayscale(1); }
#homeUi .milestones .milestone.lock { opacity: .7; }
#homeUi .milestones .milestone.lock .ic { filter: grayscale(.7) brightness(.8); }
#homeUi .milestones .cbtn { height: calc(64px * var(--hs,1)); padding: 0 calc(20px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }
/* 编队条：席位数 + 四席头像 + 调整入口 */
#homeUi .team-strip { flex: none; height: calc(161px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  gap: calc(19px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(22px * var(--hs,1)); }
#homeUi .team-label { flex: none; width: calc(152px * var(--hs,1)); font-size: calc(28px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .team-label b { display: block; font-size: calc(33px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .team-slots { display: flex; gap: calc(19px * var(--hs,1)); }
#homeUi .slot-avatar { position: relative; width: calc(108px * var(--hs,1)); height: calc(119px * var(--hs,1)); padding: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--c-navy-4); border: 1px solid #4f7ab8;
  border-radius: calc(8px * var(--hs,1)); font-family: inherit; color: var(--c-text-dim); cursor: pointer; }
#homeUi .slot-avatar .ic { width: calc(94px * var(--hs,1)); height: calc(83px * var(--hs,1)); }
#homeUi .slot-avatar small { font-size: calc(25px * var(--hs,1)); color: inherit; }
#homeUi .slot-avatar .plus { font-size: calc(69px * var(--hs,1)); line-height: 1; color: #5a6d88; }
#homeUi .team-strip .hot, #homeUi .battle-bottom .hot { position: relative; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: calc(2px * var(--hs,1)); background: none; border: 0; color: var(--c-gold-hi);
  font-family: inherit; font-size: calc(28px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .team-strip .hot .ic { font-size: calc(64px * var(--hs,1)); line-height: 1; }
#homeUi .team-strip .hot.off, #homeUi .battle-bottom .hot.off { opacity: .45; }
/* 底部：无尽（左）+ 开始护送（中）+ 掉落详情（右） */
#homeUi .battle-bottom { flex: none; height: calc(180px * var(--hs,1)); display: grid;
  grid-template-columns: calc(155px * var(--hs,1)) 1fr calc(155px * var(--hs,1)); gap: calc(33px * var(--hs,1)); align-items: center;
  padding: calc(6px * var(--hs,1)) calc(44px * var(--hs,1)) calc(22px * var(--hs,1)); }
#homeUi .battle-bottom .hot .ic { font-size: calc(78px * var(--hs,1)); line-height: 1; }
#homeUi .game-button { position: relative; background: linear-gradient(180deg, var(--c-line-hi), #243a63); border: 1px solid #4f7ab8;
  border-radius: calc(12px * var(--hs,1)); color: var(--c-gold-hi); font-family: inherit; font-weight: 900; cursor: pointer;
  box-shadow: inset 0 3px rgba(255,255,255,.12), inset 0 -4px rgba(0,0,0,.35); }
#homeUi .game-button.major { background: linear-gradient(180deg, #ffe9a6, var(--c-gold) 55%, #c9861f); border-color: #8a5c12; color: #5a3a08; }
#homeUi .game-button.start { height: calc(144px * var(--hs,1)); font-size: calc(53px * var(--hs,1)); line-height: 1.15; }
#homeUi .game-button.start small { display: flex; align-items: center; justify-content: center; gap: calc(6px * var(--hs,1));
  font-size: calc(30px * var(--hs,1)); font-weight: 700; color: #6b4a10; }
#homeUi .game-button.start small .ic { font-size: calc(30px * var(--hs,1)); }
#homeUi .game-button.off { opacity: .55; filter: grayscale(.35); }
@keyframes huiChest { 0%, 100% { box-shadow: 0 0 6px rgba(240,177,62,.2); } 50% { box-shadow: 0 0 18px rgba(240,177,62,.55); } }
#homeUi .screenHeading { margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .screenHeading h2 { font-size: calc(34px * var(--hs,1)); font-weight: 900; color: var(--c-gold-hi); letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .screenHeading small { display: block; font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); margin-top: calc(4px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .lootPrev { margin: calc(24px * var(--hs,1)) 0 0; padding: calc(20px * var(--hs,1)) calc(24px * var(--hs,1)); }
#homeUi .lootPrev .lpHead { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: var(--c-gold-hi); letter-spacing: calc(2px * var(--hs,1)); margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .lootPrev .lpRow { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(7px * var(--hs,1)) 0; }
#homeUi .lootPrev .lpIc { font-size: calc(24px * var(--hs,1)); flex: none; }
#homeUi .lootPrev .lpLab { flex: 1; font-size: calc(21px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .lootPrev .lpVal { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: var(--c-text); font-variant-numeric: tabular-nums; }
#homeUi .lootPrev .lpVal.lpGold { color: var(--c-gold-bright); }
#homeUi .lootPrev .lpNote { font-size: calc(17px * var(--hs,1)); color: #6b83a5; margin-top: calc(8px * var(--hs,1)); }
#homeUi .rewardEntry { width: 100%; margin-top: calc(20px * var(--hs,1)); height: calc(64px * var(--hs,1)); font-size: calc(23px * var(--hs,1)); letter-spacing: calc(1px * var(--hs,1)); }

/* ===== 技能页 ===== */
#homeUi .skillCard { display: flex; gap: calc(20px * var(--hs,1)); align-items: center; padding: calc(20px * var(--hs,1)); margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .sIcon { width: calc(96px * var(--hs,1)); height: calc(96px * var(--hs,1)); flex: none; border-radius: calc(20px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1));
  background-color: #16233b; background-position: center; border: 1px solid #3a8ad0; box-shadow: 0 0 8px rgba(60,140,220,.3) inset; }
#homeUi .sIcon.s2 { border-color: #9a5ce0; box-shadow: 0 0 8px rgba(160,90,230,.35) inset; }
#homeUi .sIcon.ult { border-color: #e0a23c; box-shadow: 0 0 12px rgba(240,170,60,.5) inset, 0 0 10px rgba(240,170,60,.25); }
#homeUi .sInfo { flex: 1; min-width: 0; }
#homeUi .sName { font-size: calc(28px * var(--hs,1)); font-weight: 800; display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .sDesc { font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); margin-top: calc(8px * var(--hs,1)); line-height: 1.5; }
#homeUi .sAct { text-align: center; flex: none; width: calc(164px * var(--hs,1)); }
#homeUi .sLv { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: var(--c-cyan-mid); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .skillHint { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); text-align: center; margin-top: calc(8px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }

/* ===== 顶部刘海/胶囊安全区条（布局稿 .safe；静态留白，系统状态栏画在其上） ===== */
#homeUi .safeBand { flex: none; height: calc(32px * var(--hs,1)); }
/* ===== 公告列表弹窗 ===== */
#homeUi .noticeBox .nItem { padding: calc(16px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .noticeBox .nHead { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .noticeBox .nTitle { font-size: calc(26px * var(--hs,1)); flex: 1; min-width: 0; }
#homeUi .noticeBox .nDate { font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); flex: none; }
#homeUi .noticeBox .nBody { margin-top: calc(10px * var(--hs,1)); font-size: calc(21px * var(--hs,1)); line-height: 1.6; color: #cfe0f5; white-space: pre-line; }

/* ===== 体力获取弹窗 ===== */
#homeUi .staminaBox .stState { padding: calc(14px * var(--hs,1)); text-align: center; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .staminaBox .stState b { font-size: calc(36px * var(--hs,1)); display: block; letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .staminaBox .stState span { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); display: block; margin-top: calc(6px * var(--hs,1)); }
#homeUi .stRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(14px * var(--hs,1)); margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .stRow .stIc { font-size: calc(42px * var(--hs,1)); flex: none; }
#homeUi .stRow .stInfo { flex: 1; min-width: 0; }
#homeUi .stRow .stInfo b { font-size: calc(24px * var(--hs,1)); display: block; }
#homeUi .stRow .stInfo span { font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); display: block; margin-top: calc(4px * var(--hs,1)); }

/* ===== 玩法页 ===== */
#homeUi .dutyBanner { padding: calc(20px * var(--hs,1)) calc(24px * var(--hs,1)); display: flex; align-items: center;
  gap: calc(16px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .dutyBanner .dutyInfo { flex: 1; min-width: 0; }
#homeUi .dutyBanner h3 { font-size: calc(28px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .dutyBanner p { font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); margin-top: calc(6px * var(--hs,1)); }
#homeUi .dutyBanner .questEntry, #homeUi .dutyBanner .signinEntry { flex: none; }

/* ===== 基地页 ===== */
#homeUi .baseBanner { padding: calc(24px * var(--hs,1)) calc(28px * var(--hs,1)); display: flex; align-items: center; gap: calc(24px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .bbIc { font-size: calc(68px * var(--hs,1)); filter: drop-shadow(0 0 8px rgba(92,200,255,.4)); }
#homeUi .baseBanner h3 { font-size: calc(30px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .baseBanner .pros { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); margin-top: calc(8px * var(--hs,1)); }
#homeUi .prosBar { width: calc(300px * var(--hs,1)); height: calc(12px * var(--hs,1)); background: #0a1426; border: 1px solid var(--c-line-dk);
  border-radius: 99px; margin-top: calc(8px * var(--hs,1)); overflow: hidden; }
#homeUi .prosBar i { display: block; height: 100%; width: 62%; background: linear-gradient(90deg, var(--c-gold), var(--c-gold-hi)); }
#homeUi .baseGrid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(20px * var(--hs,1)); }
#homeUi .bcard { padding: calc(20px * var(--hs,1)); text-align: center; position: relative; }
#homeUi .bIc { width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); margin: 0 auto calc(12px * var(--hs,1)); border-radius: calc(24px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(52px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, var(--c-navy-1), var(--c-navy-7)); border: 1px solid var(--c-line); }
#homeUi .bName { font-size: calc(26px * var(--hs,1)); font-weight: 800; }
#homeUi .bName span { color: var(--c-cyan-mid); font-size: calc(22px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); }
#homeUi .bDesc { font-size: calc(20px * var(--hs,1)); color: var(--c-text-dim); margin: calc(8px * var(--hs,1)) 0 calc(16px * var(--hs,1)); min-height: calc(56px * var(--hs,1)); line-height: 1.4; }

/* ===== 弹窗 ===== */
#homeUi .protoMask { position: absolute; inset: 0; background: rgba(4,8,16,.72); z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: var(--sat,0px) calc(40px * var(--hs,1)) var(--sab,0px); }
#homeUi .mbox { width: 100%; max-height: 82%; overflow-y: auto; background: linear-gradient(180deg, #22355c, #14203a);
  border: 1px solid #4a6a9a; border-radius: calc(28px * var(--hs,1)); padding: calc(32px * var(--hs,1)) calc(28px * var(--hs,1));
  box-shadow: 0 20px 50px rgba(0,0,0,.6); }
#homeUi .mHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .mHead h3 { font-size: calc(32px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .mClose { background: var(--c-navy-6); border: 1px solid var(--c-line); color: var(--c-text-dim); width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1));
  border-radius: 50%; cursor: pointer; font-size: calc(24px * var(--hs,1)); }
/* ===== 二级弹层系统（UX 布局稿落地）：主题令牌 + 尺寸单位 --pu =====
   几何（宽高/间距/停靠）统一写在文件末尾「弹层系统几何」，两主题共用一套；
   本块只负责深色层配色与单位（浅色青瓷层在末尾覆盖同名令牌）。 */
#homeUi .pop { --pu: var(--hs,1);
  --pbg:#232937; --pbg2:#252c3b; --pbg3:#1e2532; --pdeep:#1b2130; --pink:#12151d;
  --pline:#3a4356; --pline2:#2c3342; --ptx:#dbe2ef; --pdim:#8d97ab; --pdim2:#5c6678;
  --pk:#f0b34e; --pks:#ffd98f; --pgreen:#58c48c; --pine:#bff0d5; --pred:#e5534b; --pred2:#ff8d86;
  --prow:#272e3d; --pshad:0 24px 60px rgba(0,0,0,.6); }
#homeUi .mSub { font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .mRow { display: flex; justify-content: space-between; align-items: center; background: var(--c-navy-6); border: 1px solid var(--c-line);
  border-radius: calc(18px * var(--hs,1)); padding: calc(20px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); gap: calc(16px * var(--hs,1)); }
#homeUi .bagTabs { display: flex; gap: calc(12px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .bagTabs button { flex: 1; height: calc(56px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); border: 1px solid var(--c-line);
  background: var(--c-navy-4); color: var(--c-text-dim); font-family: inherit; font-size: calc(24px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .bagTabs button.on { color: var(--c-gold-hi); border-color: var(--c-gold-dk2); background: #1c2c4d; }
/* 二级页签图标位（商城 .shopTabs / 背包 .bagTabs 共用，同 .tab .ticon 的口径：尺寸交 CSS）。
   两套页签都并进了 34~56 高的条带、文字只有 12 号，图标取 20 与文字并排才不撑高行。 */
#homeUi .bagTabs button { display: flex; align-items: center; justify-content: center; gap: calc(4px * var(--hs,1)); }
#homeUi .shopTabs .ticon, #homeUi .bagTabs .ticon { flex: none; width: calc(20px * var(--hs,1)); height: calc(20px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(15px * var(--hs,1)); line-height: 1; }
#homeUi .bagGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(16px * var(--hs,1)); }
#homeUi .bcell { position: relative; border-radius: calc(18px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #1a2a4a, var(--c-navy-7));
  border: 1px solid var(--c-line); height: calc(124px * var(--hs,1)); display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1)); cursor: pointer; }
/* 背包格图标位：emoji 与贴图共用这一个方框（贴图到位摘字，尺寸归 CSS，同底部导航口径） */
#homeUi .bcell i { display: flex; align-items: center; justify-content: center; font-style: normal; line-height: 1;
  width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); background-size: contain; }
#homeUi .bagBar .bcell i { width: calc(64px * var(--hs,1)); height: calc(64px * var(--hs,1)); }
#homeUi .bcell.r3 { border-color: #3a8ad0; }
#homeUi .bcell.r4 { border-color: #9a5ce0; }
#homeUi .bcell.r5 { border-color: var(--c-amber-hi); }
#homeUi .bcell.r6 { border-color: var(--c-danger); box-shadow: 0 0 10px rgba(255,82,82,.5); }
#homeUi .bcell em { position: absolute; right: calc(6px * var(--hs,1)); bottom: calc(4px * var(--hs,1)); font-style: normal;
  font-size: calc(18px * var(--hs,1)); color: var(--c-text); font-weight: 700; text-shadow: 0 1px 2px #000; }
#homeUi .bagBar { margin-top: calc(20px * var(--hs,1)); padding: calc(20px * var(--hs,1)); border-radius: calc(22px * var(--hs,1));
  background: linear-gradient(180deg, #1a2947, #14203a); border: 1px solid var(--c-line); }
#homeUi .bagBar .bagTabs { margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .bagBar .bagGrid { grid-template-columns: repeat(5, 1fr); gap: calc(12px * var(--hs,1)); max-height: calc(300px * var(--hs,1)); overflow-y: auto; }
#homeUi .bagBar .bcell { height: calc(110px * var(--hs,1)); font-size: calc(44px * var(--hs,1)); }
/* ===== 背包→装备槽 拖拽穿戴 =====
   格子交出浏览器手势（否则长按后一移动就被系统滚动接管、抽掉指针），滚动改由 pointermove 手动驱动 */
#homeUi .bagBar .bcell { touch-action: none; -webkit-user-select: none; user-select: none; }
#homeUi .bcell.dragSrc { opacity: .4; }
#homeUi .slot.dropOk { border-color: #4ce07a; border-style: solid; box-shadow: 0 0 12px rgba(76,224,122,.45); }
#homeUi .slot.dropBad { opacity: .3; }
#homeUi .slot.over { border-color: var(--c-gold-hi); box-shadow: 0 0 16px rgba(255,233,168,.8); transform: scale(1.06); }
#homeUi .dragGhost { position: fixed; left: 0; top: 0; z-index: 600; pointer-events: none;
  width: calc(124px * var(--hs,1)); height: calc(124px * var(--hs,1)); display: flex; align-items: center;
  justify-content: center; font-size: calc(52px * var(--hs,1)); color: var(--c-text); border-radius: calc(20px * var(--hs,1));
  border: 2px solid var(--c-gold-dk2); background: radial-gradient(circle at 50% 30%, #1a2a4a, var(--c-navy-7));
  box-shadow: 0 12px 26px rgba(0,0,0,.55); transform: translate(-50%, -50%) scale(1.06); }
#homeUi .dragGhost.r3 { border-color: #3a8ad0; }
#homeUi .dragGhost.r4 { border-color: #9a5ce0; }
#homeUi .dragGhost.r5 { border-color: var(--c-amber-hi); }
#homeUi .dragGhost.r6 { border-color: var(--c-danger); box-shadow: 0 12px 26px rgba(255,82,82,.5); }
#homeUi .dragGhost em { position: absolute; right: calc(6px * var(--hs,1)); bottom: calc(4px * var(--hs,1));
  font-style: normal; font-size: calc(20px * var(--hs,1)); color: var(--c-text); font-weight: 700; text-shadow: 0 1px 2px #000; }
/* 背包内整行元素：网格是 5 列，说明行/空态文案要跨满整行才不会挤成一列 */
#homeUi .bagBar .bagHint, #homeUi .bagBar .bagGrid .mSub { grid-column: 1 / -1; }
#homeUi .bagHint { font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .sqRow { display: flex; gap: calc(16px * var(--hs,1)); justify-content: center; margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .sqSlot { width: calc(132px * var(--hs,1)); height: calc(148px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, var(--c-navy-1), var(--c-navy-7)); border: 1px solid var(--c-gold-dk2); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(8px * var(--hs,1)); font-size: calc(48px * var(--hs,1)); }
#homeUi .sqSlot span { font-size: calc(20px * var(--hs,1)); color: var(--c-text); font-weight: 700; }
#homeUi .sqSlot.empty { border-style: dashed; border-color: var(--c-line); color: #4a608a; }
#homeUi .bondRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1));
  margin-bottom: calc(10px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); background: var(--c-navy-6); border: 1px solid var(--c-line);
  font-size: calc(21px * var(--hs,1)); opacity: .55; }
#homeUi .bondRow.on { opacity: 1; border-color: var(--c-gold-dk2); background: #1c2c4d; }
#homeUi .bondRow .bondIc { flex: none; font-size: calc(24px * var(--hs,1)); }
#homeUi .bondRow .bondName { flex: none; font-weight: 700; color: var(--c-gold-hi); }
#homeUi .bondRow .bondDesc { flex: 1; color: var(--c-text); }
#homeUi .bondRow .bondState { flex: none; font-size: calc(18px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .bondRow.on .bondState { color: #9be29b; }
#homeUi .cand { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(16px * var(--hs,1)); }
#homeUi .candB { border: 1px solid var(--c-line); background: var(--c-navy-4); border-radius: calc(18px * var(--hs,1)); padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1));
  cursor: pointer; font-family: inherit; color: var(--c-text); display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .equipRow { display: flex; align-items: center; gap: calc(16px * var(--hs,1)); padding: calc(16px * var(--hs,1)) calc(20px * var(--hs,1));
  border-radius: calc(18px * var(--hs,1)); background: var(--c-navy-6); border: 1px solid var(--c-line); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .equipInfo { flex: 1; min-width: 0; }
#homeUi .equipName { font-size: calc(26px * var(--hs,1)); font-weight: 700; }
#homeUi .equipStat { font-size: calc(22px * var(--hs,1)); color: var(--c-text-dim); margin-top: calc(4px * var(--hs,1)); }
#homeUi .matNeed { color: var(--c-cream-2); font-size: calc(19px * var(--hs,1)); }
#homeUi .mRow .matNeed { display: block; margin-top: calc(4px * var(--hs,1)); }

/* ===== 装备词缀 ===== */
#homeUi .bcellAffix { position: absolute; left: calc(6px * var(--hs,1)); top: calc(4px * var(--hs,1));
  font-size: calc(18px * var(--hs,1)); color: var(--c-gold-bright); text-shadow: 0 0 calc(8px * var(--hs,1)) rgba(255,215,106,.9); }
#homeUi .affixMark { color: var(--c-gold-bright); font-size: calc(22px * var(--hs,1)); }
#homeUi .affixBox { margin: calc(-8px * var(--hs,1)) 0 calc(16px * var(--hs,1)) 0; padding: calc(12px * var(--hs,1)) calc(18px * var(--hs,1));
  border-radius: calc(14px * var(--hs,1)); background: #0a1526; border: 1px dashed #3d5a85;
  display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .affixHead { font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .affixRow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1));
  font-size: calc(21px * var(--hs,1)); }
#homeUi .affixName { font-weight: 700; }
#homeUi .affixVal { color: var(--c-text); }

/* ===== 底部导航 ===== */
/* 布局稿 R2：五签等分（不再有居中的凸起主钮），图标 37px、选中 42px、标签 12px */
#homeUi .tabbar { flex: none; height: calc(194px * var(--hs,1)); display: grid; grid-template-columns: repeat(5, 1fr); align-items: stretch; position: relative; z-index: 20;
  padding: 0 calc(8px * var(--hs,1)) max(calc(11px * var(--hs,1)), var(--sab,0px));
  background: linear-gradient(180deg, #182947, #0b1426); border-top: 1px solid var(--c-line); }
#homeUi .tabbar::before { content: ''; position: absolute; top: -1px; left: 8%; right: 8%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(240,177,62,.55), transparent); }
#homeUi .tab { background: none; border: none; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0;
  color: #7e93b8; font-size: calc(33px * var(--hs,1)); font-weight: 700; padding: 0; gap: calc(3px * var(--hs,1)); position: relative; border-radius: calc(8px * var(--hs,1));
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
#homeUi .tab .ticon { width: calc(102px * var(--hs,1)); height: calc(102px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(42px * var(--hs,1)); filter: grayscale(.4); transition: filter .2s; }
#homeUi .tab.on { color: var(--c-gold-hi); }
#homeUi .tab.on .ticon { transform: scale(1.12); filter: drop-shadow(0 0 8px rgba(245,196,81,.8)); }
#homeUi .tab.on::after { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: calc(140px * var(--hs,1)); height: calc(8px * var(--hs,1)); border-radius: 99px;
  background: linear-gradient(90deg, transparent, var(--c-gold-frame), transparent); box-shadow: 0 0 8px var(--c-gold-frame); }

/* ===== 广告层/水印 ===== */
#homeUi .adOverlay { position: absolute; inset: 0; z-index: 400; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: calc(24px * var(--hs,1)); background: rgba(4,8,16,.92); }
#homeUi .adTitle { font-size: calc(40px * var(--hs,1)); color: var(--c-gold-hi); font-weight: 800; }
#homeUi .adCountdown { font-size: calc(120px * var(--hs,1)); color: var(--c-cyan-mid); font-weight: 900; }
#homeUi .adTip { font-size: calc(24px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .homeStamp { position: absolute; right: calc(16px * var(--hs,1)); bottom: calc(160px * var(--hs,1)); font-size: calc(16px * var(--hs,1));
  color: rgba(140,170,210,.4); z-index: 5; pointer-events: none; }

/* ===== P0 布局改版：HUD 单行工具组 / 护送页章节头 / 里程碑 ===== */
#homeUi .hudUtil { flex: none; display: flex; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .res > span:first-child { width: calc(22px * var(--hs,1)) !important; height: calc(22px * var(--hs,1)) !important; }

/* P2 玩法页：日常状态卡（任务/签到直达）+ 玩法入口状态行（替代旧 bcard 网格） */
#homeUi .dutyRow { display: flex; gap: calc(20px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .dutyCard { position: relative; flex: 1; display: flex; align-items: center; gap: calc(18px * var(--hs,1));
  padding: calc(24px * var(--hs,1)) calc(26px * var(--hs,1)); cursor: pointer; font-family: inherit; text-align: left; }
#homeUi .dutyCard:active { transform: scale(.97); }
#homeUi .dutyCard .dcIc { font-size: calc(52px * var(--hs,1)); line-height: 1; }
#homeUi .dutyCard .dcTxt { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); min-width: 0; }
#homeUi .dutyCard .dcTxt b { font-size: calc(26px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .dutyCard .dcTxt i { font-style: normal; font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .dutyCard .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(18px * var(--hs,1)); height: calc(18px * var(--hs,1)); border-radius: 50%; background: var(--c-danger);
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .dutyCard .questRed.on { display: block; }
#homeUi .modeList { display: flex; flex-direction: column; gap: calc(16px * var(--hs,1)); }
#homeUi .modeRow { position: relative; display: flex; align-items: center; gap: calc(20px * var(--hs,1));
  padding: calc(20px * var(--hs,1)) calc(24px * var(--hs,1)); cursor: pointer; font-family: inherit; text-align: left; }
#homeUi .modeRow:active { transform: scale(.98); }
#homeUi .modeRow.locked { filter: grayscale(.55) brightness(.82); }
#homeUi .modeRow .mmIc { flex: none; width: calc(84px * var(--hs,1)); height: calc(84px * var(--hs,1)); border-radius: calc(18px * var(--hs,1));
  background: var(--c-navy-4); border: 1px solid var(--c-line); display: flex; align-items: center; justify-content: center; font-size: calc(44px * var(--hs,1)); }
#homeUi .modeRow .mm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .modeRow .mm b { font-size: calc(26px * var(--hs,1)); color: var(--c-text-hi); display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .modeRow .mm .mini4 { font-size: calc(17px * var(--hs,1)); font-weight: 700; color: var(--c-cyan); background: #123055;
  border: 1px solid #2c5f8a; border-radius: 99px; padding: calc(1px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .modeRow .mm i { font-style: normal; font-size: calc(19px * var(--hs,1)); color: var(--c-text-dim);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .modeRow .mmGo { flex: none; min-width: calc(150px * var(--hs,1)); text-align: center; font-size: calc(21px * var(--hs,1)); font-weight: 800;
  color: #3a2405; background: linear-gradient(180deg, var(--c-gold-hi), #e0a23c); border: 1px solid #8a6a1f;
  border-radius: calc(14px * var(--hs,1)); padding: calc(12px * var(--hs,1)) calc(18px * var(--hs,1)); }
#homeUi .modeRow.locked .mmGo { filter: grayscale(.8) brightness(.7); }

/* P2 基地页：建筑地图节点（固定坐标摆放，点击开详情/升级抽屉） */
#homeUi .baseMap { position: relative; height: calc(560px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background: linear-gradient(180deg, var(--c-navy-3), #101c33); border: 1px solid var(--c-line-dk); overflow: hidden; margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .baseMap::before { content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(126,224,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(126,224,255,.06) 1px, transparent 1px);
  background-size: calc(56px * var(--hs,1)) calc(56px * var(--hs,1)); }
#homeUi .mapNode { position: absolute; transform: translate(-50%, -50%); width: calc(150px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); border: 1px solid var(--c-line-hi); border-radius: calc(16px * var(--hs,1));
  background: linear-gradient(180deg, #22355c, #14203a); font-family: inherit; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); z-index: 2; }
#homeUi .mapNode:active { transform: translate(-50%, -50%) scale(.94); }
#homeUi .mapNode .mnIc { font-size: calc(44px * var(--hs,1)); line-height: 1.1; }
#homeUi .mapNode .mnName { font-size: calc(19px * var(--hs,1)); font-weight: 800; color: var(--c-text-hi); white-space: nowrap; }
#homeUi .mapNode .mnLv { font-size: calc(16px * var(--hs,1)); font-weight: 700; color: var(--c-cyan); white-space: nowrap; }
#homeUi .mapNode.lock { filter: grayscale(.6) brightness(.75); }

/* ===== 英雄页骨架（布局稿 R2 · 深色层单位口径 ×2.769） =====
   选择条(38) / 角色区(grid 44|1fr|44|124) / 工具行(34) / 背包(头30+滚动+说明25+页签34) */
#homeUi .hot { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: calc(44px * var(--hs,1)); min-height: calc(44px * var(--hs,1)); gap: 0;
  font-size: calc(11px * var(--hs,1)); font-weight: 700; color: inherit; background: none; border: none; cursor: pointer; }
#homeUi .hot .ic { width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); font-size: calc(34px * var(--hs,1)); line-height: 1; }
#homeUi .hot:active { filter: brightness(.85); }
#homeUi .screen.sHeroes { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sHeroes.on { display: flex; }
#homeUi .hero-roster { flex: none; height: calc(38px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  gap: calc(8px * var(--hs,1)); background: var(--c-navy-3); border-bottom: 1px solid var(--c-line-dk); }
#homeUi .hero-roster .hpick { position: relative; flex: 1; min-width: 0; height: calc(34px * var(--hs,1)); display: flex;
  align-items: center; justify-content: center; gap: calc(3px * var(--hs,1)); padding: 0;
  font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); background: none; border: none; cursor: pointer; }
#homeUi .hero-roster .hpick .pic { width: calc(26px * var(--hs,1)); height: calc(28px * var(--hs,1)); border-radius: calc(4px * var(--hs,1));
  background-color: #1b2c4b; background-size: cover; }
#homeUi .hero-roster .hpick i { font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .hero-roster .hpick.on { background: #1c2c4d; box-shadow: inset 0 calc(-2px * var(--hs,1)) var(--c-gold-frame); color: var(--c-gold-hi); }
#homeUi .hero-roster .hpick.lock .pic { filter: grayscale(1) brightness(.55); }
/* 编队条是横排行卡（高 34），沿用大头像条那条 translate(32,-80) 的锁徽会压在名字上。
   原先的解法是把锁徽改回随行内联排在名字之后——不遮字了，但那 27px 是从**名字头上**扣的：
   六个字的名字（狙击手·苍鹭 / 激光手·棱镜 / 辐射枪手·芮）实测只剩 58.8px 可用、要 80px，
   被省略号截掉的正好是唯一能区分四个英雄的后半截人名。
   改成钉在立绘右上角：锁本来就是「这一格没解锁」的标记，挂在头像上比跟在名字后面更对语义，
   而且它不再占行内宽度，名字拿到整行余量（实测 86px）。滤镜在 .pic 上，锁跟着一起变灰，
   正是「这一格是灰的」要的效果。特异性高于两层通用规则 */
#homeUi .hero-roster .hpick.lock::after { content: none; }
#homeUi .hero-roster .hpick.lock .pic { position: relative; }
#homeUi .hero-roster .hpick.lock .pic::after { content: '🔒'; position: absolute;
  right: calc(1px * var(--hs,1)); top: calc(1px * var(--hs,1));
  font-size: calc(13px * var(--hs,1)); line-height: 1; }
#homeUi .hero-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
#homeUi .hero-stage { flex: none; position: relative; height: 38%; max-height: calc(263px * var(--hs,1)); min-height: calc(179px * var(--hs,1));
  display: grid; grid-template-columns: calc(44px * var(--hs,1)) minmax(0,1fr) calc(44px * var(--hs,1)) calc(124px * var(--hs,1));
  gap: calc(3px * var(--hs,1)); padding: calc(5px * var(--hs,1)) calc(9px * var(--hs,1)) 0 calc(3px * var(--hs,1)); }
#homeUi .hero-quick { display: flex; flex-direction: column; justify-content: space-evenly; gap: calc(2px * var(--hs,1)); }
#homeUi .hero-quick .btn { min-width: calc(44px * var(--hs,1)); min-height: calc(44px * var(--hs,1)); padding: 0;
  font-size: calc(9px * var(--hs,1)); gap: calc(1px * var(--hs,1)); }
#homeUi .hero-quick .btn > span { font-size: calc(9px * var(--hs,1)); }
#homeUi .hero-quick .btn .ic { width: calc(26px * var(--hs,1)); height: calc(26px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }
#homeUi .hero-quick .btn:disabled { opacity: .45; }
#homeUi .hero-figure { position: relative; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
#homeUi .hero-figure::after { content: ''; position: absolute; bottom: calc(26px * var(--hs,1)); height: calc(17px * var(--hs,1));
  left: 4%; right: 4%; border-radius: 50%; background: var(--c-navy-3); border: 1px solid var(--c-line-dk); z-index: 0; }
#homeUi .hero-figure .heroEmoji { width: 100%; height: calc(100% - calc(50px * var(--hs,1))); max-height: calc(206px * var(--hs,1)); }
#homeUi .hero-name { position: absolute; left: calc(5px * var(--hs,1)); top: calc(1px * var(--hs,1)); z-index: 3;
  font-size: calc(13px * var(--hs,1)); font-weight: 800; color: var(--c-text-hi); }
#homeUi .hero-name small { font-size: calc(9px * var(--hs,1)); margin-left: calc(4px * var(--hs,1)); color: var(--c-text-dim); }
/* 卡面行内星级（_starInline 建）：跟着 9px 副标的基线走，尺寸归这里 */
#homeUi .hero-name small .starIn { display: inline-block; font-style: normal; vertical-align: calc(-1px * var(--hs,1));
  width: calc(11px * var(--hs,1)); height: calc(11px * var(--hs,1));
  font-size: calc(11px * var(--hs,1)); line-height: calc(11px * var(--hs,1)); }
#homeUi .powerBadge { position: relative; z-index: 2; flex: none; width: 100%; height: calc(27px * var(--hs,1)); display: flex;
  align-items: center; justify-content: center; gap: calc(4px * var(--hs,1)); background: none; border: none;
  font-size: calc(12px * var(--hs,1)); line-height: calc(27px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .powerBadge strong { font-size: calc(17px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .powerBadge .pwInfo { position: absolute; right: 0; width: calc(20px * var(--hs,1)); height: calc(20px * var(--hs,1));
  border: 1px solid var(--c-line); border-radius: 50%; background: none; color: var(--c-text-dim); font-size: calc(12px * var(--hs,1)); cursor: pointer; }
#homeUi .equipment { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, minmax(0,1fr));
  gap: calc(5px * var(--hs,1)); padding-bottom: calc(5px * var(--hs,1)); }
#homeUi .equipment .slot { width: 100%; height: auto; min-height: 0; position: relative; border-radius: 0;
  border: 1px solid var(--c-line); box-shadow: inset 0 0 0 2px var(--c-navy-3); background: #1b2c4b;
  display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
#homeUi .equipment .slot .sname { position: absolute; top: calc(2px * var(--hs,1)); left: calc(3px * var(--hs,1));
  transform: none; font-size: calc(9px * var(--hs,1)); color: #7d93b5; }
#homeUi .equipment .slot .slv { position: absolute; right: calc(3px * var(--hs,1)); bottom: calc(2px * var(--hs,1));
  font-size: calc(10px * var(--hs,1)); border: none; color: var(--c-gold-hi); }
#homeUi .equipment .slot .tier { position: absolute; left: calc(4px * var(--hs,1)); bottom: calc(3px * var(--hs,1));
  font-size: calc(8px * var(--hs,1)); color: #7d93b5; }
#homeUi .hero-tools { flex: none; height: calc(34px * var(--hs,1)); display: flex; align-items: center; justify-content: space-between;
  gap: calc(6px * var(--hs,1)); padding: 0 calc(10px * var(--hs,1)); border-bottom: 1px solid var(--c-line-dk); }
#homeUi .hero-tools .loadouts { display: flex; align-items: center; gap: calc(3px * var(--hs,1)); font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .hero-tools .loadouts b { color: var(--c-text-hi); font-size: calc(12px * var(--hs,1)); margin-right: calc(3px * var(--hs,1)); }
#homeUi .hero-tools .loadouts .squadEntry { min-height: calc(28px * var(--hs,1)); padding: 0 calc(8px * var(--hs,1));
  background: #22355c; border: 1px solid var(--c-line); color: var(--c-text-hi); font-size: calc(10px * var(--hs,1)); cursor: pointer; }
#homeUi .hero-tools .hot { flex-direction: row; gap: calc(3px * var(--hs,1)); min-width: calc(50px * var(--hs,1));
  min-height: calc(30px * var(--hs,1)); font-size: calc(11px * var(--hs,1)); }
#homeUi .hero-tools .hot .ic { width: calc(23px * var(--hs,1)); height: calc(23px * var(--hs,1)); font-size: calc(23px * var(--hs,1)); }
#homeUi .screen.sHeroes .bagBar { flex: 1; min-height: 0; display: flex; flex-direction: column; background: #101c33;
  margin: 0; padding: 0; border-radius: 0; position: static; max-height: none; }
#homeUi .screen.sHeroes .bag-head { flex: none; height: calc(30px * var(--hs,1)); display: flex; align-items: center;
  justify-content: space-between; padding: 0 calc(10px * var(--hs,1)); font-size: calc(12px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .screen.sHeroes .bag-head small { font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .screen.sHeroes .bag-head-right { display: flex; align-items: center; gap: calc(7px * var(--hs,1)); }
#homeUi .screen.sHeroes .bag-head select { font-size: calc(10px * var(--hs,1)); background: var(--c-navy-3); color: var(--c-text-hi);
  border: 1px solid var(--c-line); height: calc(24px * var(--hs,1)); max-width: calc(82px * var(--hs,1)); }
#homeUi .screen.sHeroes .bag-head .hot { flex-direction: row; gap: calc(3px * var(--hs,1)); min-height: calc(28px * var(--hs,1));
  min-width: calc(44px * var(--hs,1)); font-size: calc(10px * var(--hs,1)); }
#homeUi .screen.sHeroes .bag-head .hot .ic { width: calc(18px * var(--hs,1)); height: calc(18px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); }
/* 背包检索框（.uiSearch）：图标位尺寸归 CSS，贴图挂上去只换 backgroundImage 不改盒子 */
#homeUi .uiSearch { box-sizing: border-box; display: flex; align-items: center; gap: calc(3px * var(--hs,1));
  height: calc(24px * var(--hs,1)); padding: 0 calc(7px * var(--hs,1)); max-width: calc(120px * var(--hs,1));
  border-radius: calc(12px * var(--hs,1)); background: var(--c-navy-3);
  border: 1px solid var(--c-line); }
#homeUi .uiSearch i { flex: none; display: block; width: calc(14px * var(--hs,1)); height: calc(14px * var(--hs,1));
  font-size: calc(14px * var(--hs,1)); line-height: 1; }
#homeUi .uiSearch input { width: calc(72px * var(--hs,1)); min-width: 0; border: 0; outline: 0; background: none;
  font-family: inherit; font-size: calc(10px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .screen.sHeroes .bag-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  overscroll-behavior: contain; padding: calc(3px * var(--hs,1)) calc(6px * var(--hs,1)) calc(7px * var(--hs,1)); touch-action: pan-y; }
#homeUi .screen.sHeroes .bag-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr));
  gap: calc(5px * var(--hs,1)); align-items: start; max-height: none; overflow: visible; }
#homeUi .screen.sHeroes .bag-grid .bcell { aspect-ratio: 1; height: auto; min-width: 0; border-radius: calc(4px * var(--hs,1));
  font-size: calc(24px * var(--hs,1)); }
#homeUi .bag-detail { flex: none; height: calc(25px * var(--hs,1)); display: flex; align-items: center; justify-content: space-between;
  gap: calc(6px * var(--hs,1)); padding: 0 calc(10px * var(--hs,1)); background: var(--c-navy-3); border-top: 1px solid var(--c-line-dk);
  font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); white-space: nowrap; }
#homeUi .bag-detail b { font-weight: 400; overflow: hidden; text-overflow: ellipsis; }
#homeUi .flat-tabs { flex: none; height: calc(34px * var(--hs,1)); display: flex; background: var(--c-navy-3); border-top: 1px solid var(--c-line-dk); }
#homeUi .flat-tabs button { position: relative; flex: 1; min-width: 0; font-size: calc(12px * var(--hs,1)); color: var(--c-text-dim);
  background: none; border: none; white-space: nowrap; cursor: pointer; }
#homeUi .flat-tabs button.on { color: var(--c-gold-hi); font-weight: 700; background: #1c2c4d; box-shadow: inset 0 calc(-3px * var(--hs,1)) var(--c-gold-frame); }

/* ===== 行动页骨架（布局稿 R2 · 深色层单位口径 ×2.769） =====
   标题(43) / 日常四快捷(66) / 挑战场(撑满) / 资源副本(113) / 远征行(78) / 页脚三快捷(49) */
#homeUi .screen.sAction { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sAction.on { display: flex; }
#homeUi .action-title { flex: none; height: calc(43px * var(--hs,1)); display: flex; align-items: center; justify-content: space-between;
  padding: calc(6px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .action-title h1 { font-size: calc(17px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .action-title .actNum { font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .action-daily { flex: none; height: calc(66px * var(--hs,1)); display: grid; grid-template-columns: repeat(4, 1fr);
  align-items: center; padding: 0 calc(7px * var(--hs,1)); border-bottom: 1px solid var(--c-line-dk); }
#homeUi .action-daily .hot { height: calc(59px * var(--hs,1)); font-size: calc(11px * var(--hs,1)); color: #cfe3f5; }
#homeUi .action-daily .hot .ic { width: calc(31px * var(--hs,1)); height: calc(31px * var(--hs,1)); font-size: calc(28px * var(--hs,1)); }
#homeUi .action-daily .hot small { font-size: calc(9px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .action-daily .hot .questRed { position: absolute; top: calc(2px * var(--hs,1)); right: calc(6px * var(--hs,1)); }
#homeUi .challenge-ground { flex: 1; min-height: calc(105px * var(--hs,1)); position: relative; display: grid;
  grid-template-columns: 1fr 1fr; align-items: center; padding: 0 calc(14px * var(--hs,1)); gap: calc(15px * var(--hs,1));
  background: #101c33; }
#homeUi .entry { position: relative; height: 95%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: 0; gap: calc(2px * var(--hs,1)); font-size: calc(13px * var(--hs,1)); color: var(--c-text-hi);
  background: none; border: none; cursor: pointer; }
#homeUi .entry .ic { width: 90%; height: 65%; max-height: calc(190px * var(--hs,1)); font-size: calc(120px * var(--hs,1)); line-height: 1; }
#homeUi .entry h2 { font-size: calc(15px * var(--hs,1)); min-width: calc(105px * var(--hs,1)); padding: calc(3px * var(--hs,1)) calc(12px * var(--hs,1));
  background: #22355c; text-align: center; }
#homeUi .entry small { font-size: calc(10px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .entry.locked { color: #5a6d88; }
#homeUi .entry.locked .ic { opacity: .5; filter: grayscale(.6); }
#homeUi .entry .questRed { position: absolute; top: calc(6px * var(--hs,1)); right: calc(10% + 4px); }
#homeUi .dungeons { flex: none; height: calc(113px * var(--hs,1)); padding: calc(5px * var(--hs,1)) calc(10px * var(--hs,1));
  border-top: 1px solid var(--c-line-dk); background: #14203a; }
#homeUi .section-label { display: flex; justify-content: space-between; font-size: calc(12px * var(--hs,1)); color: var(--c-text-hi);
  padding: calc(3px * var(--hs,1)) calc(1px * var(--hs,1)) calc(8px * var(--hs,1)); }
#homeUi .section-label small { font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .dungeon-row { display: grid; grid-template-columns: repeat(4, 1fr); height: calc(82px * var(--hs,1)); }
#homeUi .dungeon-row .hot { font-size: calc(11px * var(--hs,1)); color: #cfe3f5; }
#homeUi .dungeon-row .hot .ic { width: calc(40px * var(--hs,1)); height: calc(40px * var(--hs,1)); font-size: calc(36px * var(--hs,1)); }
#homeUi .dungeon-row .hot small { font-size: calc(9px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .dungeon-row .hot.off { opacity: .45; }
#homeUi .dungeon-row .hot .questRed { position: absolute; top: calc(2px * var(--hs,1)); right: calc(8px * var(--hs,1)); }
#homeUi .expedition { flex: none; height: calc(78px * var(--hs,1)); position: relative; display: flex; align-items: center;
  gap: calc(9px * var(--hs,1)); padding: calc(7px * var(--hs,1)) calc(12px * var(--hs,1));
  border-top: 1px solid var(--c-line-dk); background: var(--c-navy-3); }
#homeUi .expedition > .ic { width: calc(68px * var(--hs,1)); height: calc(60px * var(--hs,1)); font-size: calc(54px * var(--hs,1)); line-height: 1; }
#homeUi .expedition-text { flex: 1; min-width: 0; font-size: calc(11px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .expedition-text b { display: block; font-size: calc(13px * var(--hs,1)); }
#homeUi .expedition-text small { display: block; margin-top: calc(4px * var(--hs,1)); font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .expedition .hot { width: calc(53px * var(--hs,1)); font-size: calc(10px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .expedition .questRed { position: absolute; top: calc(8px * var(--hs,1)); right: calc(64px * var(--hs,1)); }
#homeUi .action-footer { flex: none; height: calc(49px * var(--hs,1)); display: flex; justify-content: space-around; align-items: center; }
#homeUi .action-footer .hot { flex-direction: row; gap: calc(4px * var(--hs,1)); font-size: calc(11px * var(--hs,1)); color: #cfe3f5; }
#homeUi .action-footer .hot .ic { width: calc(27px * var(--hs,1)); height: calc(27px * var(--hs,1)); font-size: calc(25px * var(--hs,1)); }
#homeUi .action-footer .hot .questRed { position: absolute; top: 0; right: calc(4px * var(--hs,1)); }

/* ===== 商店页骨架（布局稿 R2 · 深色层单位口径 ×2.769） =====
   货架头(76) / 滚动货架（主推 offer + 分区标签 + 三列货架）/ 底部页签(34) */
#homeUi .screen.sShop { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sShop.on { display: flex; }
#homeUi .shop-mast { flex: none; height: calc(76px * var(--hs,1)); display: flex; align-items: center; justify-content: space-between;
  padding: calc(6px * var(--hs,1)) calc(16px * var(--hs,1)); background: var(--c-navy-3); }
#homeUi .shop-mast h1 { font-size: calc(23px * var(--hs,1)); line-height: calc(28px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .shop-mast p { font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .shop-mast .hot { font-size: calc(10px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .shop-mast .hot .ic { width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); font-size: calc(32px * var(--hs,1)); }
#homeUi .shop-mast .hot .questRed, #homeUi .shop-mast .hot.dotOn::after { content: ''; position: absolute; top: calc(2px * var(--hs,1));
  right: calc(6px * var(--hs,1)); width: calc(12px * var(--hs,1)); height: calc(12px * var(--hs,1)); border-radius: 50%;
  background: var(--c-danger); display: none; }
#homeUi .shop-mast .hot.dotOn::after { display: block; }
#homeUi .shop-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;
  padding: calc(8px * var(--hs,1)) calc(10px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .shop-offer { position: relative; min-height: calc(177px * var(--hs,1)); gap: 0; display: grid;
  grid-template-columns: 42% 1fr; grid-template-rows: 1fr calc(39px * var(--hs,1)); background: #1b2c4b;
  border: 1px solid var(--c-line); margin-bottom: calc(9px * var(--hs,1)); padding: calc(8px * var(--hs,1)); cursor: pointer; }
#homeUi .rcard { grid-template-columns: 42% 1fr; }
#homeUi .offer-art { grid-row: 1; align-self: stretch; min-height: calc(110px * var(--hs,1)); display: grid; place-items: center;
  font-size: calc(96px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .offer-copy { align-self: center; padding: 0 calc(3px * var(--hs,1)); min-width: 0; }
#homeUi .offer-copy h2 { font-size: calc(19px * var(--hs,1)); line-height: 1.6; color: var(--c-text-hi); }
#homeUi .offer-copy p { font-size: calc(11px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .offer-copy strong { font-size: calc(16px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .offer-copy small { display: block; margin-top: calc(3px * var(--hs,1)); font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .offer-copy .rcBar { height: calc(6px * var(--hs,1)); background: #0a1426; margin-top: calc(5px * var(--hs,1)); overflow: hidden; }
#homeUi .offer-copy .rcBar i { display: block; height: 100%; width: 0; background: #3ad0ff; }
#homeUi .offer-copy .rcDetail { margin-top: calc(5px * var(--hs,1)); font-size: calc(10px * var(--hs,1)); color: var(--c-cyan);
  background: none; border: none; text-decoration: underline; cursor: pointer; }
#homeUi .offer-buttons { grid-column: 1 / -1; display: grid; grid-template-columns: calc(44px * var(--hs,1)) 1fr 1fr;
  gap: calc(8px * var(--hs,1)); align-items: center; }
#homeUi .offer-buttons .hot { min-height: calc(34px * var(--hs,1)); font-size: calc(9px * var(--hs,1)); line-height: calc(11px * var(--hs,1));
  color: #cfe3f5; }
#homeUi .offer-buttons .hot .ic { width: calc(23px * var(--hs,1)); height: calc(23px * var(--hs,1)); font-size: calc(21px * var(--hs,1)); }
#homeUi .offer-buttons .game-button { font-size: calc(12px * var(--hs,1)); line-height: calc(14px * var(--hs,1)); }
#homeUi .offer-buttons small { display: block; font-size: calc(9px * var(--hs,1)); color: inherit; }
#homeUi .goods { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: calc(7px * var(--hs,1)); }
#homeUi .good { border: 1px solid var(--c-line); background: #1b2c4b; min-height: calc(115px * var(--hs,1)); position: relative;
  display: flex; flex-direction: column; align-items: center; padding: calc(5px * var(--hs,1)) calc(4px * var(--hs,1));
  gap: calc(3px * var(--hs,1)); }
#homeUi .good > .gIc { width: calc(44px * var(--hs,1)); height: calc(44px * var(--hs,1)); font-size: calc(40px * var(--hs,1));
  display: grid; place-items: center; }
#homeUi .good .gName { font-size: calc(10px * var(--hs,1)); color: var(--c-text-hi); text-align: center; }
#homeUi .good .gTag { font-size: calc(9px * var(--hs,1)); color: var(--c-text-dim); text-align: center; }
#homeUi .good .gBuy { width: 100%; font-size: calc(10px * var(--hs,1)); min-height: calc(27px * var(--hs,1));
  margin-top: calc(2px * var(--hs,1)); }
#homeUi .good .gHot { position: absolute; top: calc(2px * var(--hs,1)); right: calc(3px * var(--hs,1));
  font-size: calc(9px * var(--hs,1)); color: var(--c-amber-hi); }

/* ===== 基地页骨架（布局稿 R2 · 深色层单位口径 ×2.769） =====
   头行(37) / 营地地图（路面底纹 + 2×4 建筑格）/ 局外强化条 / 底行(42) */
#homeUi .screen.sBase { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sBase.on { display: flex; }
#homeUi .base-head { flex: none; height: calc(37px * var(--hs,1)); display: flex; align-items: center;
  justify-content: space-between; padding: 0 calc(12px * var(--hs,1)); }
#homeUi .base-head h1 { font-size: calc(16px * var(--hs,1)); color: var(--c-text-hi); }
#homeUi .base-head small { font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .base-map { position: relative; flex: 1; min-height: 0; overflow: hidden; }
#homeUi .map-roads { position: absolute; inset: 0; opacity: .7; pointer-events: none; }
#homeUi .map-roads svg { display: block; width: 100%; height: 100%; }
/* 营地路面与中线原先把色写死在 SVG 的 stroke 属性上（#b8b8b8 路面 / #eee 虚线）——
   页面翻暗后那摊灰就是全屏最大的一块"没换肤"。色改由令牌给（presentation attribute 低于 CSS，
   所以属性删了、这两条接管）；路面比场景亮一档、虚线用暗场景细线，两层主题共用一套 */
#homeUi .map-roads .road { stroke: var(--c-scene-3); }
#homeUi .map-roads .dash { stroke: var(--c-scene-line); }
#homeUi .base-buildings { position: absolute; inset: 0 calc(6px * var(--hs,1)) calc(15px * var(--hs,1));
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, minmax(0,1fr));
  column-gap: calc(15px * var(--hs,1)); }
#homeUi .building { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 0; font-size: calc(12px * var(--hs,1)); background: none; border: none; color: var(--c-text-hi); cursor: pointer; }
#homeUi .building .ic { height: calc(100% - calc(29px * var(--hs,1))); max-height: calc(118px * var(--hs,1));
  width: 85%; max-width: calc(135px * var(--hs,1)); font-size: calc(96px * var(--hs,1));
  display: grid; place-items: center; line-height: 1; }
#homeUi .building strong { position: relative; background: #22355c; padding: calc(2px * var(--hs,1)) calc(10px * var(--hs,1));
  font-size: calc(12px * var(--hs,1)); line-height: calc(16px * var(--hs,1)); font-weight: 700; }
#homeUi .building small { font-size: calc(9px * var(--hs,1)); line-height: calc(12px * var(--hs,1)); color: var(--c-text-dim); }
#homeUi .building:nth-child(even) { transform: translateY(calc(9px * var(--hs,1))); }
#homeUi .building.locked .ic { opacity: .38; }
#homeUi .building.locked strong { color: #5a6d88; background: var(--c-navy-3); }
#homeUi .building .questRed { position: absolute; right: calc(-3px * var(--hs,1)); top: calc(1px * var(--hs,1)); }
#homeUi .building:active { filter: brightness(.85); }
#homeUi .base-meta { flex: none; height: calc(132px * var(--hs,1)); display: grid; grid-template-columns: repeat(4, 1fr);
  gap: calc(5px * var(--hs,1)); padding: 0 calc(8px * var(--hs,1)) calc(6px * var(--hs,1)); }
#homeUi .base-meta .bcard { border: 1px solid var(--c-line); background: #1b2c4b; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(2px * var(--hs,1)); padding: calc(4px * var(--hs,1)); min-width: 0; }
#homeUi .base-meta .bIc { font-size: calc(30px * var(--hs,1)); line-height: 1; }
#homeUi .base-meta .bName { font-size: calc(10px * var(--hs,1)); color: var(--c-text-hi); text-align: center; }
#homeUi .base-meta .bName span { color: var(--c-cyan); margin-left: calc(2px * var(--hs,1)); }
#homeUi .base-meta .bDesc { font-size: calc(9px * var(--hs,1)); color: var(--c-text-dim); text-align: center; }
#homeUi .base-bottom { flex: none; height: calc(42px * var(--hs,1)); display: flex; justify-content: space-between;
  align-items: center; padding: 0 calc(13px * var(--hs,1)); border-top: 1px solid var(--c-line-dk); background: var(--c-navy-3); }
#homeUi .base-bottom small { font-size: calc(10px * var(--hs,1)); color: var(--c-text-dim); }


/* ================================================================
   浅色青瓷主题覆盖层 —— 一比一翻译 prototype-assets/interface.css
   （原型第 317 行外链皮肤；像素口径 430px 手机框 × var(--pw)）
   ================================================================ */
#homeUi { letter-spacing: 0 !important;
  background: var(--c-scene-1); background-image: none;
  color: var(--c-text); }
#homeUi .pAvatar, #homeUi .identity, #homeUi .idLeft, #homeUi .xpRow, #homeUi .pname, #homeUi .lvtag, #homeUi .expbar, #homeUi .expnum,
#homeUi .reswrap, #homeUi .res, #homeUi .viewport, #homeUi .screen, #homeUi .panel, #homeUi .secTitle,
#homeUi .btn, #homeUi .tag, #homeUi .toastEl, #homeUi .shopBanner, #homeUi .sbTxt, #homeUi .shopTabs,
#homeUi .shopGrid, #homeUi .good, #homeUi .gIc, #homeUi .gName, #homeUi .gTag, #homeUi .gBuy, #homeUi .gHot,
#homeUi .heroPick, #homeUi .hpick, #homeUi .heroHead, #homeUi .heroName, #homeUi .star, #homeUi .tagRow,
#homeUi .powerBadge, #homeUi .heroMain, #homeUi .slotCol, #homeUi .slot, #homeUi .heroFigure, #homeUi .halo,
#homeUi .halo2, #homeUi .heroEmoji, #homeUi .heroLv, #homeUi .statRow, #homeUi .stat, #homeUi .row3,
#homeUi .chTabs, #homeUi .stage-scene,
#homeUi .screenHeading, #homeUi .arrow, #homeUi .chapter-head, #homeUi .difficulty, #homeUi .diffSeg,
#homeUi .milestones, #homeUi .milestone, #homeUi .team-strip, #homeUi .slot-avatar, #homeUi .stage-caption,
#homeUi .skillCard, #homeUi .sIcon,
#homeUi .sInfo, #homeUi .sName, #homeUi .sDesc, #homeUi .sAct, #homeUi .sLv, #homeUi .skillHint,
#homeUi .baseBanner, #homeUi .bbIc, #homeUi .bcard, #homeUi .bIc, #homeUi .bName, #homeUi .bDesc,
#homeUi .protoMask, #homeUi .mbox, #homeUi .mHead, #homeUi .mClose, #homeUi .mSub, #homeUi .mRow,
#homeUi .bagTabs, #homeUi .bagGrid, #homeUi .bcell, #homeUi .bagBar, #homeUi .sqRow, #homeUi .sqSlot, #homeUi .cand,
#homeUi .candB, #homeUi .tabbar, #homeUi .tab, #homeUi .res .add, #homeUi .expbar i, #homeUi .lvtag,
#homeUi .frame::before, #homeUi .frame::after { animation: none; }

/* 天赋可加点节点的脉冲：需在青瓷层基础规则之后声明，否则被上面的 animation:none 覆盖（同 trialCell.now 的处理） */
#homeUi .talentNode.can { animation: huiChest .9s ease-in-out infinite; }
/* 活跃度宝箱可开时的脉冲：同上，显式声明以免日后被 animation:none 白名单波及 */
#homeUi .actChest.ready .acIc { animation: huiChest .9s ease-in-out infinite; }
/* 里程碑可领时的脉冲：同上——箱子图标呼吸，提示就地领取 */
#homeUi .milestones .milestone.ready .ic { animation: huiChest .9s ease-in-out infinite; }
/* --- 顶部安全区条与公告弹窗（青瓷浅色变体） --- */
/* 稿手机版：.safe{height:calc(30px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top)}。
   桌面/常规机没有状态栏，取稿的 32 基准保持与画框一致；有安全区时按 30 + 安全区撑开。 */
#homeUi .safeBand { height: max(calc(32px * var(--pw,2.5)), calc(30px * var(--pw,2.5) + var(--sat,0px)));
  /* 与顶栏同档：原先 #ddd 浅灰带在翻暗的页子上是全屏最宽的一条"没换肤"孤岛 */
  background: var(--c-scene-2); }
#homeUi .noticeBox .nItem { padding: calc(9px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .noticeBox .nTitle { font-size: calc(14px * var(--pw,2.5)); }
#homeUi .noticeBox .nDate { font-size: calc(10px * var(--pw,2.5)); color: #7a93a8; }
#homeUi .noticeBox .nBody { margin-top: calc(6px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-5); }

/* --- 体力获取弹窗（青瓷浅色变体） --- */
#homeUi .staminaBox .stState b { font-size: calc(19px * var(--pw,2.5)); }
#homeUi .staminaBox .stState span { font-size: calc(11px * var(--pw,2.5)); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .stRow { padding: calc(8px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); margin-bottom: calc(7px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .stRow .stIc { font-size: calc(22px * var(--pw,2.5)); }
#homeUi .stRow .stInfo b { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .stRow .stInfo span { font-size: calc(10px * var(--pw,2.5)); margin-top: calc(2px * var(--pw,2.5)); }

/* --- HUD 通栏（青瓷浅色变体：64px = 头像 43×52 绝对定位 + 资源 31 + 身份 27） --- */
/* 信息栏回到壳层首位，安全区上边距也交回它（走马灯在它之下，不再占顶部条位） */
/* 安全区上边距已由 .safeBand 承担，信息栏不再自己加（否则刘海机上会重复让位） */
/* 顶栏：原先是一条 #dedede 浅灰带压在暗场景上——页面翻暗之后它变成全屏最大的一块"没换肤"孤岛，
   收成同色系的金属导轨（比场景亮一档、底沿收一道暗边），字色跟着翻亮 */
#homeUi .topbar { position: relative; display: block; flex-direction: initial; box-sizing: border-box;
  height: calc(64px * var(--pw,2.5)); text-align: left;
  padding: 0 calc(8px * var(--pw,2.5)) 0 calc(58px * var(--pw,2.5));
  background: linear-gradient(180deg, var(--c-scene-3), var(--c-scene-2)); background-image: none;
  border-bottom: 1px solid var(--c-scene-edge); color: var(--c-text); white-space: nowrap; }
#homeUi .pAvatar { position: absolute; top: calc(4px * var(--pw,2.5)); left: calc(9px * var(--pw,2.5));
  width: calc(43px * var(--pw,2.5)); height: calc(52px * var(--pw,2.5)); padding: 0; border-radius: 0; background: none; }
#homeUi .pAvatar > div { width: 100%; height: calc(43px * var(--pw,2.5)); border-radius: 0; background-color: var(--c-scene-1); font-size: 0;
  clip-path: polygon(12% 0, 88% 0, 100% 14%, 100% 87%, 88% 100%, 12% 100%, 0 87%, 0 14%); }
#homeUi .lvtag { position: absolute; left: calc(-3px * var(--pw,2.5)); top: calc(-2px * var(--pw,2.5));
  font-size: calc(10px * var(--pw,2.5)); line-height: calc(13px * var(--pw,2.5)); padding: 0 calc(4px * var(--pw,2.5));
  background: #555; border: none; color: #fff; border-radius: 0; font-weight: 700; }
#homeUi .reswrap { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: calc(3px * var(--pw,2.5)); align-items: center;
  height: calc(31px * var(--pw,2.5)); min-width: 0; }
#homeUi .res { display: flex; align-items: center; justify-content: center; gap: calc(3px * var(--pw,2.5));
  min-width: 0; min-height: calc(31px * var(--pw,2.5)); margin: 0; padding: 0; border: none; border-radius: 0; background: none;
  box-shadow: none; font-size: calc(12px * var(--pw,2.5)); position: relative; }
/* 资源胶囊/经验条跟着顶栏翻暗：斜切带本身是"凹进去的暗槽"，数字用金色档、加号用弱亮字。
   基准层这几条本来就是暗底写法（--c-gold-hi 等），青瓷层此前一律改成了浅灰底配深字，
   页面翻暗后那批深字就是审计里 1.0~2.3 比值的来源 */
#homeUi .res::before { content: ''; position: absolute; inset: calc(5px * var(--pw,2.5)) 0; background: var(--c-scene-1); transform: skewX(-12deg); }
#homeUi .res > * { position: relative; z-index: 1; }
#homeUi .res > span:first-child { width: calc(20px * var(--pw,2.5)) !important; height: calc(20px * var(--pw,2.5)) !important; }
#homeUi .res b { color: var(--c-gold-hi); flex: none; font-variant-numeric: tabular-nums; font-weight: 700; }
#homeUi .res .add { width: calc(14px * var(--pw,2.5)); height: calc(14px * var(--pw,2.5)); margin: 0; padding: 0 calc(4px * var(--pw,2.5)); border-radius: 0; background: none;
  color: var(--c-text-mute); font-size: calc(14px * var(--pw,2.5)); display: flex; align-items: center; justify-content: center; }
#homeUi .identity { display: flex; align-items: center; justify-content: space-between; gap: calc(6px * var(--pw,2.5));
  height: calc(27px * var(--pw,2.5)); }
#homeUi .idLeft { display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 0; }
#homeUi .pname { font-size: calc(11px * var(--pw,2.5)); line-height: calc(13px * var(--pw,2.5)); font-weight: 700; }
#homeUi .xpRow { display: flex; align-items: center; gap: calc(5px * var(--pw,2.5)); }
#homeUi .expbar { flex: none; width: calc(110px * var(--pw,2.5)); height: calc(10px * var(--pw,2.5)); margin: 0;
  background: var(--c-scene-1); border: none; border-radius: 0; overflow: hidden; }
#homeUi .expbar i { display: block; height: 100%; width: 62%; background: var(--c-gold); border-radius: 0; box-shadow: none; }
#homeUi .expnum { font-size: calc(9px * var(--pw,2.5)); line-height: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); margin: 0; }
#homeUi .hudUtil { display: flex; align-items: center; gap: 0; }
#homeUi .hudUtil .tinyIcon { width: calc(36px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); display: grid; place-items: center;
  font-size: calc(15px * var(--pw,2.5)); background: none; border: none; border-radius: 0; }
/* 页面底：从"一块平灰"改成暗场景底（结构收敛轮的地基决定，理由见 UiTheme 的 --c-scene-* 注）。
   原先这条是 background:#e6eef3 + background-image:none，把基准层的暗色渐变整个盖掉，
   于是五页内容全部浮在灰纸上：暗金属板贴不上去、为暗底写的亮字（cream/gold-hi）当场读不出来、
   组件之间只能各贴各的板 → 方块感。改成暗场景之后，板退化成少数强调件，
   页面自己承担"底"的角色。下一轮把这条换成生成的场景图，渐变是它的占位。 */
#homeUi .viewport { background:
  radial-gradient(130% 52% at 50% 0%, var(--c-scene-3) 0%, transparent 60%),
  linear-gradient(180deg, var(--c-scene-2) 0%, var(--c-scene-1) 82%); }
#homeUi .screen { padding: calc(16px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(20px * var(--pw,2.5)); }
/* 护送页通栏：章节头/场景/里程碑/编队条/底部 CTA 各自带内边距，页面本身不留走廊 */
/* 左右不留走廊：稿里 .stage 是通栏，两侧快捷列 left/right 3px 才是贴边的；留 10px 会让列位内缩、场景压到列上 */
#homeUi .screen.sStage { padding: 0; }
#homeUi .screen.on { display: block; }
#homeUi .screen.sStage.on { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
#homeUi .panel { background: linear-gradient(#fcfdfe, #eaf1f5); border: 1px solid #b5c8d5;
  border-radius: calc(8px * var(--pw,2.5)); box-shadow: 0 2px 0 #aebfcd55, inset 0 1px #fff; }
#homeUi .frame::before, #homeUi .frame::after { display: none; content: none; }
#homeUi .secTitle { font-size: calc(14px * var(--pw,2.5)); margin: calc(15px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  color: var(--c-text-hi); letter-spacing: 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .secTitle::before { background: #eb9843; height: calc(16px * var(--pw,2.5)); width: calc(4px * var(--pw,2.5)); }

/* --- 按钮 / 标签 --- */
#homeUi .btn { border-radius: calc(6px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); box-shadow: none;
  --pu: var(--pw,2.5);
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
#homeUi .tag.g { background: #fff1d8; border-color: #d7b279; color: var(--c-gold-dk3); }
#homeUi .tag.b { background: #dfedf5; color: #28637f; border-color: #97bacd; }
#homeUi .tag.p { background: #eee5f2; color: #765188; border-color: #bda1cc; }
#homeUi .goldT { color: var(--c-gold-dk); }

/* --- Toast / 弹窗 --- */
#homeUi .toastEl { background: #244b60; color: #fff; border: 1px solid #89abbf; border-radius: calc(7px * var(--pw,2.5));
  white-space: normal; text-align: center; max-width: calc(100% - 32px); width: max-content; line-height: 1.6;
  top: calc(50% + 13px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); font-weight: 700;
  padding: calc(9px * var(--pw,2.5)) calc(18px * var(--pw,2.5)); }
#homeUi .protoMask { background: #183b50b8; backdrop-filter: blur(4px);
  padding: var(--sat,0px) calc(16px * var(--pw,2.5)) var(--sab,0px); }
#homeUi .mbox { background: var(--c-text-ice2); border: calc(2px * var(--pw,2.5)) solid #9db9ca; border-radius: calc(10px * var(--pw,2.5));
  padding: calc(16px * var(--pw,2.5)); box-shadow: 0 15px 50px #12324366; }
#homeUi .mHead h3 { font-size: calc(18px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .mHead { gap: calc(8px * var(--pw,2.5)); }
#homeUi .mClose { height: calc(44px * var(--pw,2.5)); width: calc(44px * var(--pw,2.5)); flex: none; background: #dae6ee;
  border-color: #a5becd; color: #365b70; border-radius: calc(6px * var(--pw,2.5)); font-size: calc(17px * var(--pw,2.5)); }
#homeUi .mSub { font-size: calc(12px * var(--pw,2.5)); line-height: 1.7; color: var(--c-edge-7); }
/* .mSub 同一个类名两处用：弹层里它是浅纸上的副标（深字对），背包空态里它落在暗场景上（实测 3.36:1）。
   不能直接翻 1564 那条——那会把所有弹层的副标变成亮字。只给页面里那一处开一条 */
#homeUi .bagBar .bagGrid .mSub { color: var(--c-text-dim); }
#homeUi .mRow { background: #fff; border-color: #c2d3df; border-radius: calc(5px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5));
  flex-wrap: wrap; font-size: calc(13px * var(--pw,2.5)); }
#homeUi .bagTabs button { height: calc(44px * var(--pw,2.5)); background: #d7e4ed; color: #526d7d; border-color: #b1c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .bagTabs button.on { background: #fff8e9; color: #8c5927; border-color: #d8ad74; box-shadow: inset 0 -2px #e9ab5c; }
#homeUi .bcell { background: var(--c-text-ice3); border: 1px solid #b8cbd7; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .bcell.r3 { border-color: #5a9ad0; }
#homeUi .bcell.r4 { border-color: #a678d8; }
#homeUi .bcell.r5 { border-color: var(--c-amber-dk); }
#homeUi .bcell.r6 { border-color: var(--c-danger-dk); box-shadow: 0 0 6px rgba(224,72,72,.45); }
#homeUi .bcell em { color: #395a6b; text-shadow: none; }
#homeUi .bagBar { margin-top: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5));
  background: linear-gradient(#eaf1f6, var(--c-text-ice3)); border: 1px solid #b5c8d5; border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs { gap: calc(6px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs button { height: calc(38px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .bagBar .bagGrid { grid-template-columns: repeat(5, 1fr); gap: calc(6px * var(--pw,2.5)); max-height: calc(120px * var(--pw,2.5)); }
#homeUi .bagBar .bcell { height: calc(52px * var(--pw,2.5)); font-size: calc(22px * var(--pw,2.5)); border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .bagBar .bcell em { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .sqRow { gap: calc(6px * var(--pw,2.5)); }
#homeUi .sqSlot { min-width: 0; flex: 1; background: #d9e7ef; border: 1px solid #b8cbd7; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .sqSlot span { color: var(--c-deep-teal); }
#homeUi .sqSlot.empty { border-style: dashed; border-color: #b8cbd7; color: #758994; }
#homeUi .candB { background: #e1ebf2; border: 1px solid var(--c-text-mute); border-radius: calc(5px * var(--pw,2.5)); min-height: calc(64px * var(--pw,2.5)); color: var(--c-deep-teal); }
#homeUi .bondRow { background: #fff; border-color: #c2d3df; border-radius: calc(5px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(8px * var(--pw,2.5)); gap: calc(6px * var(--pw,2.5)); }
#homeUi .bondRow.on { background: #fdf3d7; border-color: #d9b06a; }
#homeUi .bondRow .bondIc { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .bondRow .bondName { color: var(--c-gold-dk3); }
#homeUi .bondRow .bondDesc { color: var(--c-deep-teal); }
#homeUi .bondRow .bondState { font-size: calc(10px * var(--pw,2.5)); color: #758994; }
#homeUi .bondRow.on .bondState { color: #2e7d43; }

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
#homeUi .shopTabs button { height: 100%; background: #d7e4ed; color: #526d7d; border-color: #b1c6d5;
  display: flex; align-items: center; justify-content: center; text-align: center; gap: calc(4px * var(--pw,2.5));
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .shopTabs button.on { background: #fff8e9; color: #8c5927; border-color: #d8ad74; box-shadow: inset 0 -2px #e9ab5c; }
/* 二级页签图标位青瓷层：同 base 层那条规则，只换令牌（手机上实际生效的是这一层） */
#homeUi .bagTabs button { gap: calc(4px * var(--pw,2.5)); }
#homeUi .shopTabs .ticon, #homeUi .bagTabs .ticon { width: calc(20px * var(--pw,2.5)); height: calc(20px * var(--pw,2.5));
  font-size: calc(15px * var(--pw,2.5)); }
#homeUi .good { padding: calc(10px * var(--pw,2.5)); }
#homeUi .gIc { height: calc(92px * var(--pw,2.5)); background: linear-gradient(#e8f0f6, #d4e2eb); border-color: #b3c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(38px * var(--pw,2.5)); }
#homeUi .good.r3 .gIc { border-color: #5a9ad0; box-shadow: 0 0 5px rgba(90,154,208,.4) inset; }
#homeUi .good.r4 .gIc { border-color: #a678d8; box-shadow: 0 0 5px rgba(166,120,216,.45) inset; }
#homeUi .good.r5 .gIc { border-color: var(--c-amber-dk); box-shadow: 0 0 6px rgba(232,137,46,.5) inset; }
#homeUi .good.r6 .gIc { border-color: var(--c-danger-dk); box-shadow: 0 0 7px rgba(224,72,72,.6) inset, 0 0 6px rgba(224,72,72,.4); }
#homeUi .gName { font-size: calc(15px * var(--pw,2.5)); }
#homeUi .gTag { font-size: calc(11px * var(--pw,2.5)); margin: calc(4px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); }
#homeUi .gBuy { height: calc(44px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); }
#homeUi .gHot { background: #b54f37; border-radius: calc(3px * var(--pw,2.5)); font-size: calc(9px * var(--pw,2.5));
  top: calc(8px * var(--pw,2.5)); right: calc(7px * var(--pw,2.5)); box-shadow: none; }
#homeUi .screenHeading { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 calc(14px * var(--pw,2.5)); }
#homeUi .screenHeading h2 { font-size: calc(23px * var(--pw,2.5)); color: var(--c-gold-hi); font-weight: 900; letter-spacing: 0; }
#homeUi .screenHeading small { font-size: calc(11px * var(--pw,2.5)); color: var(--c-text-dim); font-weight: 700; margin: 0; }

/* --- 英雄选择条 / 英雄页 --- */
#homeUi .heroPick { padding: calc(4px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); }
#homeUi .hpick { width: calc(60px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .hpick .pic { height: calc(56px * var(--pw,2.5)); width: calc(54px * var(--pw,2.5)); background-color: var(--c-scene-1);
  border: 2px solid var(--c-scene-line); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .hpick.on .pic { box-shadow: 0 2px 0 var(--c-gold-dk); border-color: var(--c-gold); transform: none; background-color: var(--c-navy-7); }
#homeUi .hpick.on { color: var(--c-gold-hi); }
#homeUi .hpick i { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .hpick.lock::after { top: calc(5px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); transform: none; }
#homeUi .heroHead { align-items: flex-start; margin: calc(10px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); gap: calc(4px * var(--pw,2.5)); }
#homeUi .heroName { font-size: calc(20px * var(--pw,2.5)); }
#homeUi .star { display: block; margin: calc(3px * var(--pw,2.5)) 0 0; color: #b97620; text-shadow: none; }
#homeUi .tagRow { flex-wrap: wrap; gap: calc(3px * var(--pw,2.5)); }
#homeUi .powerBadge { padding: calc(2px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); background: linear-gradient(90deg, #e8602c, #f5a13d);
  border: none; color: #fff; border-radius: 99px; font-size: calc(13px * var(--pw,2.5)); box-shadow: 0 calc(1px * var(--pw,2.5)) calc(4px * var(--pw,2.5)) rgba(160,70,20,.35);
  align-self: center; margin-top: calc(3px * var(--pw,2.5)); flex: none; }
#homeUi .powerBadge span { text-shadow: 0 calc(1px * var(--pw,2.5)) 0 rgba(120,40,0,.4); }
#homeUi .powerBadge .pwInfo { width: calc(16px * var(--pw,2.5)); height: calc(16px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5));
  border-color: rgba(255,255,255,.85); color: #fff; margin-left: calc(2px * var(--pw,2.5)); flex: none; }
#homeUi .pwBox .pwRow { gap: calc(6px * var(--pw,2.5)); }
#homeUi .pwBox .pwRow b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .pwBox .pwRow i { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-1); }
/* 背包（青瓷）：页签固定，格子区内部滚动撑满剩余面板 */
#homeUi .bagBar { display: flex; flex-direction: column; overflow: hidden; max-height: calc(300px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs { flex: none; }
#homeUi .bagBar .bagGrid { flex: 1 1 auto; min-height: calc(120px * var(--pw,2.5)); overflow-y: auto; align-content: start;
  max-height: none; overscroll-behavior: contain; }
#homeUi .heroMain { grid-template-columns: calc(34px * var(--pw,2.5)) minmax(0, 1fr) calc(34px * var(--pw,2.5)) calc(96px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5));
  padding: calc(10px * var(--pw,2.5)) 0; background: linear-gradient(transparent, #d2e2eb); margin: 0 calc(-2px * var(--pw,2.5)); }
/* 功能入口双列（青瓷）：左列 核心/强化/技能，右列 升星/天赋，分立绘两侧 */
#homeUi .fcol { gap: calc(4px * var(--pw,2.5)); align-self: stretch; justify-content: space-evenly; }
#homeUi .fcol .btn { height: calc(40px * var(--pw,2.5)); font-size: calc(10.5px * var(--pw,2.5));
  padding: 0; border-radius: calc(6px * var(--pw,2.5)); min-height: 0; }
/* 英雄养成五入（技能/天赋/升星/武器/核心）= .fcol .btn.blue.hot，走 btn_cancel 蓝板。
   特异性：这条是 1 id + 3 类，压过下面 .hero-quick .btn 那条（1 id + 2 类），所以字色必须在这里翻，
   改 .hero-quick 是无效的（实测六枚标签一直停在 #243e4d 就是这个原因）。
   未贴板时的回退底也从"白蓝渐变"收成暗槽——白芯片落在暗页上就是一块没换肤的补丁 */
#homeUi .fcol .btn.blue { background: var(--c-scene-1); border: 1px solid var(--c-scene-line); color: var(--c-cream-1);
  box-shadow: none; }
/* 右装备格（青瓷）：2×3 六槽贴右列 */
#homeUi .eqGrid { gap: calc(6px * var(--pw,2.5)); align-self: stretch; align-content: space-evenly; }
#homeUi .eqGrid .slot { width: 100%; height: calc(56px * var(--pw,2.5)); }
#homeUi .bagBar { position: sticky; bottom: 0; z-index: 6; }
/* 拖拽穿戴（青瓷）：落点高亮/压暗 + 跟手拖影，配色走浅色令牌 */
#homeUi .bagBar .bcell { touch-action: none; -webkit-user-select: none; user-select: none; }
#homeUi .bcell.dragSrc { opacity: .4; }
#homeUi .slot.dropOk { border-color: #35a860; border-style: solid; box-shadow: inset 0 0 0 2px rgba(53,168,96,.4); }
#homeUi .slot.dropBad { opacity: .3; }
#homeUi .slot.over { border-color: #c8862f; box-shadow: inset 0 0 0 3px rgba(200,134,47,.5); transform: scale(1.06); }
#homeUi .dragGhost { width: calc(48px * var(--pw,2.5)); height: calc(48px * var(--pw,2.5)); font-size: calc(22px * var(--pw,2.5));
  border-radius: calc(5px * var(--pw,2.5)); border: 2px solid #c69c5e; color: #395a6b; background: var(--c-text-ice3);
  box-shadow: 0 calc(4px * var(--pw,2.5)) calc(10px * var(--pw,2.5)) rgba(40,70,90,.35); }
#homeUi .dragGhost.r3 { border-color: #5a9ad0; }
#homeUi .dragGhost.r4 { border-color: #a678d8; }
#homeUi .dragGhost.r5 { border-color: var(--c-amber-dk); }
#homeUi .dragGhost.r6 { border-color: var(--c-danger-dk); }
#homeUi .dragGhost em { font-size: calc(10px * var(--pw,2.5)); color: #395a6b; text-shadow: none; }
#homeUi .bagHint { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .heroFigure { height: calc(220px * var(--pw,2.5)); }
#homeUi .halo, #homeUi .halo2 { display: none; }
#homeUi .heroEmoji { width: 100%; max-width: calc(150px * var(--pw,2.5)); height: calc(190px * var(--pw,2.5)); filter: none; }
#homeUi .heroLv { background: #eaf2f7; border-color: #aac0cf; border-radius: calc(4px * var(--pw,2.5));
  padding: calc(4px * var(--pw,2.5)) calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); margin: 0; color: #236581; }
#homeUi .slotCol { gap: calc(29px * var(--pw,2.5)); }
#homeUi .slot { height: calc(48px * var(--pw,2.5)); width: calc(48px * var(--pw,2.5));
  background: linear-gradient(#f9fbfc, #d5e4ed); border-color: #afc3d1; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .slot.filled { border-color: #bc9b63; box-shadow: inset 0 0 0 2px #f7e8cb; }
#homeUi .slot .sname { top: calc(-17px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-7); }
#homeUi .slot .slv { border-radius: calc(3px * var(--pw,2.5)); background: #ecd1a0; border-color: #c69c5e; }
#homeUi .statRow { gap: 0; margin: 0 0 calc(14px * var(--pw,2.5)); background: #f5f9fb; border-bottom: 1px solid #becfda; }
#homeUi .stat { border: none; border-radius: 0; background: none; box-shadow: none; padding: calc(11px * var(--pw,2.5)) calc(2px * var(--pw,2.5));
  font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-7); }
#homeUi .stat b { font-size: calc(18px * var(--pw,2.5)); color: var(--c-deep-teal); }
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
/* --- 护送页（布局稿 R2 骨架）---
   页面底翻暗之后，这一页原先按"浅灰纸"写的字全部要回到暗底口径：
   章标题走金色（它是这一页的主标题，不是正文）、副标走弱亮字、翻页器从"浅底芯片+深字"
   翻成"暗底芯片+亮字"（它压在关卡实景照片上，浅底芯片在照片上读成一团雾）。 */
#homeUi .chapter-head { height: calc(50px * var(--pw,2.5)); gap: calc(18px * var(--pw,2.5)); }
#homeUi .chapter-head h1 { font-size: calc(19px * var(--pw,2.5)); color: var(--c-gold-hi); letter-spacing: 0; text-align: center; line-height: calc(23px * var(--pw,2.5)); }
#homeUi .chapter-head small { font-size: calc(10px * var(--pw,2.5)); line-height: calc(13px * var(--pw,2.5)); color: var(--c-text-dim); margin-top: 0; }
/* 载具牌在手机上收进 45px 的章头条里（h1 23 + small 13 = 36，留 9 上下边）：
   场景里那块 .veh 在浅色主题整块隐藏，这一枚是手机上唯一看得见载具的位置 */
#homeUi .chapter-head .chVeh { width: calc(28px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5));
  font-size: calc(24px * var(--pw,2.5)); line-height: calc(28px * var(--pw,2.5)); }
/* 翻页器在场景内侧：暗底芯片 + 亮箭头，禁用态整块更暗（原先是浅底深字，实测 1.73:1） */
#homeUi .stage > .arrow { width: calc(44px * var(--pw,2.5)); height: calc(42px * var(--pw,2.5));
  border: 1px solid var(--c-scene-line); border-radius: calc(6px * var(--pw,2.5));
  background: var(--c-navy-7); color: var(--c-text-hi); font-size: calc(25px * var(--pw,2.5)); }
#homeUi .stage > .arrow.l { left: calc(60px * var(--pw,2.5)); }
#homeUi .stage > .arrow.r { right: calc(60px * var(--pw,2.5)); }
#homeUi .stage > .arrow.dim { opacity: .38; }
/* 难度三档：容器收成暗槽（两档之间露出来的就是那条暗缝），
   字色按各自那块板的明度分——选中是金牌→深字，未选是蓝板→亮字，锁定那档再弱一档 */
#homeUi .difficulty { width: calc(224px * var(--pw,2.5)); height: calc(32px * var(--pw,2.5)); border-radius: 0;
  border: 1px solid var(--c-scene-edge); background: var(--c-scene-1); margin: 0; }
#homeUi .difficulty .diffSeg { font-size: calc(12px * var(--pw,2.5)); font-weight: 400; color: var(--c-cream-1); border-left-color: var(--c-scene-line); }
#homeUi .difficulty .diffSeg.on { background: #aaa; color: var(--c-navy-3); font-weight: 700; }
#homeUi .difficulty .diffSeg.off { color: var(--c-text-mute); }
#homeUi .stage { margin-top: 0; min-height: calc(120px * var(--pw,2.5)); }
#homeUi .stage-scene { inset: 6% 10% 0; border: 0; border-radius: 0; box-shadow: none; background-color: var(--c-scene-1); background-image: none; }
#homeUi .stage-scene > .sun, #homeUi .stage-scene > .mtn, #homeUi .stage-scene > .hill, #homeUi .stage-scene > .ground,
#homeUi .stage-scene > .road, #homeUi .stage-scene > .dash, #homeUi .stage-scene > .mobs, #homeUi .stage-scene > .veh,
#homeUi .stage-scene > .crew { display: none !important; }
#homeUi .stage-scene::after { content: ''; position: absolute; inset: 55% 0 0; display: block; width: auto; height: auto;
  border: 0; border-radius: 0; opacity: 1; z-index: 1; pointer-events: none; background: linear-gradient(transparent, #173d4dcc); }
#homeUi .side-tools { top: calc(10px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); }
#homeUi .side-tools.left { left: calc(3px * var(--pw,2.5)); }
#homeUi .side-tools.right { right: calc(3px * var(--pw,2.5)); }
#homeUi .side-tools .hot { width: calc(49px * var(--pw,2.5)); min-height: calc(51px * var(--pw,2.5)); gap: 0;
  /* 侧栏 7 张（签到/任务/礼包/图鉴/排行/试炼/无尽）走 btn_side 木箱板（棕底），
     #2c4a59 是给浅灰纸写的深字，压在棕板上实测 2.6:1——这一族整块翻亮 */
  color: var(--c-cream-1); font-size: calc(10px * var(--pw,2.5)); font-weight: 700; }
/* 侧栏键图标框 = 字形尺寸：贴图（contain 吃 width/height）与 emoji 占位同一 footprint，换图不跳大小 */
#homeUi .side-tools .hot .ic { width: calc(24px * var(--pw,2.5)); height: calc(24px * var(--pw,2.5)); font-size: calc(24px * var(--pw,2.5)); }
#homeUi .side-tools .hot .questRed { top: calc(-2px * var(--pw,2.5)); right: calc(5px * var(--pw,2.5));
  width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); background: #d9534f; border: 1px solid #fff; }
/* 无尽收进侧栏后仍需「锁定只降透明」：.off 规则原本只覆盖底栏与编队条 */
#homeUi .side-tools .hot.off { opacity: .45; }
/* 巡逻入口红点（底部左槽，有挂机产出可收时亮） */
#homeUi .battle-bottom .hot .questRed { display: none; position: absolute; top: calc(2px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5));
  width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); border-radius: 50%; background: #d9534f; border: 1px solid #fff; }
#homeUi .battle-bottom .hot .questRed.on { display: block; }
#homeUi .stage-caption { bottom: calc(8px * var(--pw,2.5)); left: calc(60px * var(--pw,2.5)); right: calc(60px * var(--pw,2.5));
  font-size: calc(10px * var(--pw,2.5)); color: #e8f1f5; text-shadow: 0 1px 3px #153c50; }
#homeUi .stage-caption b { font-size: calc(12px * var(--pw,2.5)); color: #ffe0a8; }
/* 里程碑三块走 btn_side 木箱板（棕底），字必须按板色翻亮——原先的 #355365/#6b8391
   是给浅灰纸写的，实测压在棕板上只剩 2.9~3.4:1；进度轨和底沿同样收成暗档 */
/* 三块里程碑原先 flex:1 顶到一起、中间无缝，读成一整条棕板被划了两刀（用户点的"方块感…间隔也导致方块感"）。
   让出缝来露出底下那条进度轨（::before 本来就画在板后 14%~86%），三箱才读成"串在一根轨上的三个节点" */
#homeUi .milestones { height: calc(62px * var(--pw,2.5)); margin: 0 calc(12px * var(--pw,2.5)); gap: calc(6px * var(--pw,2.5));
  border-bottom: 1px solid var(--c-scene-line); }
#homeUi .milestones::before { top: calc(23px * var(--pw,2.5)); height: calc(3px * var(--pw,2.5)); background: var(--c-scene-1); }
#homeUi .milestones .milestone { height: calc(60px * var(--pw,2.5)); gap: 0; font-size: calc(10px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .milestones .milestone .ic { width: calc(32px * var(--pw,2.5)); height: calc(32px * var(--pw,2.5)); }
#homeUi .milestones .milestone small { font-size: calc(9px * var(--pw,2.5)); color: var(--c-cream-2); }
#homeUi .milestones .milestone.got, #homeUi .milestones .milestone.lock { opacity: 1; }
#homeUi .milestones .milestone.got { color: var(--c-text-mute); }
#homeUi .milestones .milestone.got .ic { opacity: .55; }
#homeUi .milestones .milestone.lock .ic { opacity: .7; }
#homeUi .milestones .milestone.ready { color: var(--c-gold-hi); }
#homeUi .milestones .cbtn { height: calc(17px * var(--pw,2.5)); padding: 0 calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); border-radius: 0;
  /* 「领取」这颗小键在 CITY_BUTTON_PLATE 里是显式跳过的（.game-button.sm 只有 46×22，贴板整块糊），
     所以它永远吃 CSS 回退色——回退色原本是按浅纸写的 #e4edf2，落在棕木箱板上就是一张白纸。
     收成暗槽底 + 金字，与它所在的板同族 */
  background: rgba(10,16,22,.62); border-color: var(--c-scene-line); color: var(--c-gold-hi); }
/* 编队条与底部三槽：原先是"浅灰纸 + #cecece 灰块"，页面翻暗后它们成了全屏最扎眼的两块没换肤的孤岛
   （用户点的"有美术资源和没有美术资源的组件夹杂"就是这里）。空席改成**凹进去的暗格**：
   暗格 + 亮描边 + 弱亮加号，和贴了图的真英雄缩略图同尺寸同轮廓，读起来是"同一格的两种状态"，
   不再是"一格是游戏UI、一格是网页占位" */
#homeUi .team-strip { height: calc(58px * var(--pw,2.5)); gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(8px * var(--pw,2.5)); }
#homeUi .team-label { width: calc(55px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .team-label b { font-size: calc(12px * var(--pw,2.5)); color: var(--c-gold-hi); line-height: calc(20px * var(--pw,2.5)); }
#homeUi .team-slots { gap: calc(7px * var(--pw,2.5)); }
#homeUi .slot-avatar { width: calc(39px * var(--pw,2.5)); height: calc(43px * var(--pw,2.5)); border-radius: 0;
  background: var(--c-scene-1); border: 1px solid var(--c-scene-line); color: var(--c-text); }
#homeUi .slot-avatar .ic { width: calc(34px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); }
#homeUi .slot-avatar small { font-size: calc(9px * var(--pw,2.5)); line-height: calc(11px * var(--pw,2.5)); }
#homeUi .slot-avatar .plus { font-size: calc(25px * var(--pw,2.5)); color: var(--c-text-mute); }
#homeUi .team-strip .hot { color: var(--c-cream-1); font-size: calc(11px * var(--pw,2.5)); flex-direction: row; gap: calc(3px * var(--pw,2.5)); }
#homeUi .team-strip .hot .ic { font-size: calc(23px * var(--pw,2.5)); }
#homeUi .battle-bottom { height: calc(65px * var(--pw,2.5)); grid-template-columns: calc(56px * var(--pw,2.5)) 1fr calc(56px * var(--pw,2.5));
  gap: calc(12px * var(--pw,2.5)); padding: calc(2px * var(--pw,2.5)) calc(16px * var(--pw,2.5)) calc(8px * var(--pw,2.5) + var(--sab,0px)); }
#homeUi .battle-bottom .hot { color: var(--c-cream-1); font-size: calc(10px * var(--pw,2.5)); }
#homeUi .battle-bottom .hot .ic { font-size: calc(28px * var(--pw,2.5)); }
#homeUi .battle-bottom .hot.patrolHot { color: var(--c-cream-1); }
#homeUi .game-button { border: 1px solid #9aa9b2; border-radius: 0; color: var(--c-deep-teal);
  background: #e4edf2; box-shadow: inset 0 2px #fff, inset 0 -2px #b9cad4; }
#homeUi .game-button.major { background: #35505f; border-color: #26485b; color: #fff; box-shadow: inset 0 2px #5a7c8d, inset 0 -3px #1f3b48; }
#homeUi .game-button.start { height: calc(52px * var(--pw,2.5)); font-size: calc(19px * var(--pw,2.5)); line-height: calc(23px * var(--pw,2.5)); }
#homeUi .game-button.start small { gap: calc(4px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5));
  line-height: calc(15px * var(--pw,2.5)); color: #dbe9ef; }
#homeUi .game-button.start small .ic { font-size: calc(14px * var(--pw,2.5)); }
#homeUi .lootPrev { margin: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) 0; padding: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5));
  background: #fdfefe; }
#homeUi .lootPrev .lpHead { font-size: calc(13px * var(--pw,2.5)); color: #8c5927; letter-spacing: 0; margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .lootPrev .lpRow { padding: calc(3px * var(--pw,2.5)) 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .lootPrev .lpIc { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .lootPrev .lpLab { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-7); }
#homeUi .lootPrev .lpVal { font-size: calc(12px * var(--pw,2.5)); color: var(--c-deep-teal); }
#homeUi .lootPrev .lpVal.lpGold { color: #a8690f; }
#homeUi .lootPrev .lpNote { font-size: calc(9px * var(--pw,2.5)); color: #758994; margin-top: calc(4px * var(--pw,2.5)); }

/* --- 技能页 / 基地页 --- */
#homeUi .skillCard { gap: calc(9px * var(--pw,2.5)); padding: calc(12px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  min-height: calc(132px * var(--pw,2.5)); align-items: center; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .sIcon { width: calc(42px * var(--pw,2.5)); height: calc(48px * var(--pw,2.5)); background: #d8e8f1; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .sName { font-size: calc(15px * var(--pw,2.5)); flex-wrap: wrap; gap: calc(4px * var(--pw,2.5)); }
#homeUi .sDesc { font-size: calc(12px * var(--pw,2.5)); line-height: 1.7; color: var(--c-edge-7); }
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
#homeUi .bIc { background: var(--c-scene-2); border-color: var(--c-scene-line); border-radius: calc(7px * var(--pw,2.5));
  width: calc(58px * var(--pw,2.5)); height: calc(58px * var(--pw,2.5)); }
#homeUi .bName { font-size: calc(15px * var(--pw,2.5)); }
#homeUi .bDesc { font-size: calc(12px * var(--pw,2.5)); min-height: calc(36px * var(--pw,2.5)); line-height: 1.6; }
#homeUi .bcard.locked { opacity: .7; }

/* --- 玩法页（青瓷浅色变体） --- */
#homeUi .dutyBanner { background: #365f70; border: none; border-radius: 0; color: #fff;
  padding: calc(10px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5));
  margin-bottom: calc(12px * var(--pw,2.5)); }
#homeUi .dutyBanner h3 { font-size: calc(15px * var(--pw,2.5)); }
#homeUi .dutyBanner p { font-size: calc(10px * var(--pw,2.5)); color: #d5e5e9; margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .dutyBanner .questEntry, #homeUi .dutyBanner .signinEntry { margin-left: 0; }
#homeUi .rewardEntry { margin-top: calc(10px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }

/* --- 底部导航（青瓷） --- */
#homeUi .tabbar { display: grid; grid-template-columns: repeat(5, 1fr); height: auto; min-height: calc(77px * var(--pw,2.5));
  padding: 0 calc(3px * var(--pw,2.5)) max(calc(4px * var(--pw,2.5)), var(--sab,0px)); gap: 0; align-items: stretch;
  /* 原先是 #c9dbe6 浅蓝白带：五格导航板贴上去之后，露在板缝和板下方的整条带子还是浅色，
     读成"导航板浮在一张白纸上"。导航是页面 chrome，跟场景同色，让板自己出头 */
  background: linear-gradient(180deg, var(--c-scene-2), var(--c-scene-1)); border-top: 1px solid var(--c-scene-edge);
  box-shadow: 0 -3px 10px rgba(6,12,18,.55); }
#homeUi .tabbar::before { display: none; content: none; }
#homeUi .tab { color: var(--c-line-dim); flex: none; font-size: calc(13px * var(--pw,2.5)); height: auto; min-width: 0;
  padding: calc(4px * var(--pw,2.5)) 0; gap: calc(1px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5));
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
/* 页签 glyph 不再用 font-size:0 遮（那会让缺图页签变成空槽）：贴图到位时由 UiPlate.icon 摘掉
   glyph 文本节点，缺图则按本尺寸显示 emoji 占位，两层口径一致。 */
#homeUi .tab .ticon { width: calc(41px * var(--pw,2.5)); height: calc(41px * var(--pw,2.5)); display: grid; place-items: center; filter: none; font-size: calc(24px * var(--pw,2.5)); }
#homeUi .tab.on { background: var(--c-cream-1); color: var(--c-gold-dk3); box-shadow: inset 0 3px var(--c-amber); }
#homeUi .tab.on .ticon { transform: scale(1.1); }
#homeUi .tab.on::after { display: none; content: none; }

/* --- 礼包中心（青瓷浅色变体） --- */
#homeUi .giftBox .mbox { background: var(--c-text-ice2); }
#homeUi .giftBox .mHead h3 { color: var(--c-gold-dk3); }
#homeUi .giftList { gap: calc(12px * var(--pw,2.5)); }
#homeUi .giftCard { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(8px * var(--pw,2.5));
  gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); }
#homeUi .gTagTop { font-size: calc(11px * var(--pw,2.5)); padding: calc(2px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: 99px 99px 99px 3px; }
#homeUi .giftIc { width: calc(54px * var(--pw,2.5)); height: calc(54px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(30px * var(--pw,2.5)); background: var(--c-text-ice3); border-color: var(--c-text-mute); }
#homeUi .giftCard.r4 .giftIc { border-color: #9a6cd0; }
#homeUi .giftCard.r5 .giftIc { border-color: var(--c-amber-dk); box-shadow: 0 0 5px rgba(232,137,46,.5); }
#homeUi .giftInfo b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .giftInfo p { font-size: calc(12px * var(--pw,2.5)); color: var(--c-line-dim); margin-top: calc(2px * var(--pw,2.5)); }
#homeUi .giftEntries { font-size: calc(11px * var(--pw,2.5)); color: var(--c-gold-dk); margin-top: calc(4px * var(--pw,2.5)); }
#homeUi .giftSide { width: calc(110px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5)); }
#homeUi .giftPrice { font-size: calc(14px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .giftPrice em { color: #2f9c4a; }
#homeUi .giftPrice s { font-size: calc(11px * var(--pw,2.5)); color: #a98a72; margin-left: calc(4px * var(--pw,2.5)); }
#homeUi .giftSide .btn { height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .giftQuota { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .giftNote { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-10); margin-top: calc(10px * var(--pw,2.5)); }
#homeUi .giftResHead { font-size: calc(14px * var(--pw,2.5)); color: #3f7a52; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .giftResGrid { gap: calc(10px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDrop { width: calc(76px * var(--pw,2.5)); height: calc(76px * var(--pw,2.5));
  border: 1px solid var(--c-text-mute); border-radius: calc(8px * var(--pw,2.5)); background: var(--c-text-ice3); gap: calc(4px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDropIc { font-size: calc(26px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDropNm { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDrop.r3 { border-color: #4a9fd6; }
#homeUi .giftResGrid .clDrop.r4 { border-color: #9a6cd0; }
#homeUi .giftResGrid .clDrop.r5 { border-color: var(--c-amber-dk); box-shadow: 0 0 5px rgba(232,137,46,.45); }
#homeUi .giftResGrid .clDrop.r6 { border-color: var(--c-danger-dk); box-shadow: 0 0 6px rgba(224,72,72,.5); }
#homeUi .giftResRow { font-size: calc(13px * var(--pw,2.5)); color: var(--c-gold-dk); margin-top: calc(10px * var(--pw,2.5)); }
#homeUi .giftOkBtn { height: calc(44px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); margin-top: calc(12px * var(--pw,2.5)); }
#homeUi .shopBanner .sbTime.dotOn::after { width: calc(7px * var(--pw,2.5)); height: calc(7px * var(--pw,2.5));
  margin-left: calc(5px * var(--pw,2.5)); background: var(--c-danger-dk); box-shadow: 0 0 5px rgba(224,72,72,.8); }

/* --- 任务与成就（青瓷浅色变体） --- */
#homeUi .questEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .questEntry .questRed { width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5));
  top: calc(-3px * var(--pw,2.5)); right: calc(-3px * var(--pw,2.5)); background: var(--c-danger-dk); box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .questBox .mbox { background: var(--c-text-ice2); }
#homeUi .questBox .mHead h3 { color: var(--c-gold-dk3); }
/* --- 载具改装（青瓷浅色变体，照 questBox 模式） --- */
#homeUi .mbox.tuneBox { background: #eef4f0; }
#homeUi .mbox.tuneBox .mHead h3 { color: #5e6d2f; }
#homeUi .qSecHead { gap: calc(7px * var(--pw,2.5)); margin: calc(10px * var(--pw,2.5)) 0 calc(6px * var(--pw,2.5)); }
#homeUi .qSecHead b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .qSecHead span { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-10); }
#homeUi .questRow { background: var(--c-text-ice); border: 1px solid var(--c-text-soft); border-radius: calc(8px * var(--pw,2.5));
  gap: calc(8px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .questRow.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .qIc { width: calc(40px * var(--pw,2.5)); height: calc(40px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(22px * var(--pw,2.5)); background: var(--c-text-ice3); border-color: var(--c-text-mute); }
#homeUi .qMid b { font-size: calc(14px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .qBar { height: calc(7px * var(--pw,2.5)); background: #cddce6; border-color: var(--c-text-mute); margin: calc(5px * var(--pw,2.5)) 0 calc(3px * var(--pw,2.5)); }
#homeUi .qBar i { background: linear-gradient(90deg, #4a9fd6, #58b96b); }
#homeUi .questRow.ready .qBar i { background: linear-gradient(90deg, var(--c-gold), var(--c-amber-dk)); }
#homeUi .qNum { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .qRight { gap: calc(4px * var(--pw,2.5)); }
#homeUi .qReward { font-size: calc(12px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .qRight .btn { min-width: calc(76px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .actBox { background: var(--c-text-ice); border: 1px solid var(--c-text-soft); border-radius: calc(8px * var(--pw,2.5));
  padding: calc(8px * var(--pw,2.5)); margin-bottom: calc(4px * var(--pw,2.5)); }
#homeUi .actHead b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .actHead span { font-size: calc(13px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .actBar { margin: calc(6px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)); }
#homeUi .actBar i { background: linear-gradient(90deg, var(--c-gold), var(--c-amber-dk)); }
#homeUi .actChests { gap: calc(7px * var(--pw,2.5)); }
#homeUi .actChest { border-radius: calc(8px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(5px * var(--pw,2.5));
  gap: calc(2px * var(--pw,2.5)); background: var(--c-text-ice3); border: 1px solid var(--c-text-mute); }
#homeUi .actChest.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .acIc { font-size: calc(26px * var(--pw,2.5)); }
#homeUi .acName { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .acReward { font-size: calc(10px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .acNeed { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .actChest.ready .acNeed { color: var(--c-gold-dk); }
#homeUi .actChest .btn { height: calc(26px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .actHint { margin-top: calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-10); }

/* --- 排行榜（青瓷浅色变体） --- */
#homeUi .lbEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .lbBox .mbox { background: var(--c-text-ice2); }
#homeUi .lbBox .mHead h3 { color: var(--c-gold-dk3); }
#homeUi .lbMy { background: var(--c-cream-1); border-color: var(--c-amber); border-radius: calc(7px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .lbMy span { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .lbMy b { font-size: calc(18px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .lbList { gap: calc(5px * var(--pw,2.5)); }
#homeUi .lbRow { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5));
  gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .lbRow.me { background: var(--c-cream-1); border-color: var(--c-amber); box-shadow: none; }
#homeUi .lbRank { width: calc(28px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .lbRank .medal { font-size: calc(17px * var(--pw,2.5)); }
#homeUi .lbIc { font-size: calc(17px * var(--pw,2.5)); }
#homeUi .lbName { font-size: calc(14px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .lbRow.me .lbName { color: var(--c-gold-dk); }
#homeUi .lbScore { font-size: calc(14px * var(--pw,2.5)); color: var(--c-blue-dk); }

/* --- 宝石镶嵌（青瓷浅色变体） --- */
#homeUi .gemBox { gap: calc(6px * var(--pw,2.5)); margin: calc(-2px * var(--pw,2.5)) 0 calc(6px * var(--pw,2.5)); }
#homeUi .gemHole { padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5));
  background: var(--c-text-ice3); border: 1px dashed #9db9ca; }
#homeUi .gemHole .ghIc { font-size: calc(20px * var(--pw,2.5)); }
#homeUi .gemHole .ghNm { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .gemHole .ghEff { font-size: calc(10px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .gemHole .dim { color: #8ba3b5; }
#homeUi .gemHole .ghEff.dim { color: #8ba3b5; }

/* --- 装备工坊（青瓷浅色变体） --- */
#homeUi .forgeBtn { width: calc(76px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); padding: 0; }
#homeUi .fSec { margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .fHead { gap: calc(7px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .fHead b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .fHead span { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-10); }
#homeUi .fRow { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5));
  gap: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .fInfo b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .fInfo span { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .fRow .btn { min-width: calc(76px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .fQuick { height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 设置（青瓷浅色变体） --- */
#homeUi .setGear { width: calc(34px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); font-size: calc(16px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .setBox .mbox { background: var(--c-text-ice2); }
#homeUi .setBox .mHead h3 { color: var(--c-gold-dk3); }
#homeUi .setSec { margin-bottom: calc(12px * var(--pw,2.5)); }
#homeUi .setHead { margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .setHead b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .setHead.danger b { color: #c04a34; }
#homeUi .setRow { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .setRow > span { font-size: calc(13px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .setRow > b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .setRow .btn { min-width: calc(92px * var(--pw,2.5)); height: calc(32px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .volWrap { gap: calc(7px * var(--pw,2.5)); max-width: calc(170px * var(--pw,2.5)); }
#homeUi .volWrap input[type=range] { height: calc(12px * var(--pw,2.5)); }
#homeUi .volWrap b { font-size: calc(12px * var(--pw,2.5)); color: var(--c-blue-dk); width: calc(36px * var(--pw,2.5)); }
#homeUi .resetBtn { border-color: #d8a08a !important; color: #b8503a !important; background: #f7ece6 !important; }

/* --- 建筑详情浮窗（青瓷浅色变体） --- */
#homeUi .bInfoBtn { width: calc(22px * var(--pw,2.5)); height: calc(22px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5));
  border-color: #9db9ca; background: var(--c-text-ice3); color: var(--c-line-dim); top: calc(6px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); }
#homeUi .binfoBox .mbox { background: var(--c-text-ice2); }
#homeUi .binfoBox .mHead h3 { color: var(--c-gold-dk3); }
#homeUi .biIntro { font-size: calc(13px * var(--pw,2.5)); color: #4a6a80; background: var(--c-text-ice);
  border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .biLvRow span { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .biLvRow b { font-size: calc(14px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .biBar { height: calc(7px * var(--pw,2.5)); background: #cddce6; border-color: var(--c-text-mute); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .biBar i { background: linear-gradient(90deg, #4a9fd6, #58b96b); }
#homeUi .biEff { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .biEff em { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-10); margin-bottom: calc(2px * var(--pw,2.5)); }
#homeUi .biEff span { font-size: calc(13px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .biEff.next span { color: #2f9c4a; }
#homeUi .biStatus { font-size: calc(12px * var(--pw,2.5)); color: var(--c-gold-dk); margin: calc(2px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)); }
#homeUi .biOk { height: calc(44px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 技能详情浮窗（青瓷浅色变体） --- */
#homeUi .abBox .mbox { background: var(--c-text-ice2); }
#homeUi .abBox .mHead h3 { color: var(--c-gold-dk3); }
#homeUi .abName b { font-size: calc(17px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .abName .lvtag { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .abEff { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .abEff em { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-10); margin-bottom: calc(2px * var(--pw,2.5)); }
#homeUi .abEff span { font-size: calc(13px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .abEff.next span { color: #2f9c4a; }
#homeUi .abMs { margin: calc(8px * var(--pw,2.5)) 0; }
#homeUi .abMsHead { font-size: calc(14px * var(--pw,2.5)); color: var(--c-gold-dk3); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .abMsRow { gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(8px * var(--pw,2.5));
  border: 1px dashed #9db9ca; border-radius: calc(6px * var(--pw,2.5)); margin-bottom: calc(4px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .abMsRow.reach { border: 1px solid var(--c-amber); background: var(--c-cream-1); color: var(--c-gold-dk); }
#homeUi .abMsLv { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .abMsRow span:last-child { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .abCost { background: var(--c-text-ice); border-color: var(--c-text-soft); border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); gap: calc(7px * var(--pw,2.5)); }
#homeUi .abCost > span { font-size: calc(12px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .abCost .btn { min-width: calc(92px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 每日签到（青瓷浅色变体） --- */
#homeUi .signinEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .besEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .besGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .besCell { padding: calc(8px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); cursor: pointer; }
#homeUi .besCell.lock { opacity: .55; filter: grayscale(.8); }
#homeUi .besPic { width: calc(56px * var(--pw,2.5)); height: calc(56px * var(--pw,2.5)); }
#homeUi .besCell.lock .besPic { filter: brightness(0) opacity(.75); }
#homeUi .besNm { font-size: calc(12px * var(--pw,2.5)); font-weight: 700; color: var(--c-edge-2); }
#homeUi .besSub { font-size: calc(11px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .besElite { display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); margin-top: calc(10px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .besElite b { color: var(--c-amber); }
#homeUi .besDetail { display: flex; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); }
#homeUi .besDetail.lock { opacity: .7; }
#homeUi .besDetailPic { flex: none; width: calc(90px * var(--pw,2.5)); height: calc(110px * var(--pw,2.5)); }
#homeUi .besDetail.lock .besDetailPic { background: radial-gradient(circle at 50% 60%, #d7e2e8, #b3c4ce); border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .besDetailInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); text-align: left; }
#homeUi .besDetailName { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .besDetailName b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .besStars { font-size: calc(12px * var(--pw,2.5)); color: var(--c-amber); }
#homeUi .besBeh { font-size: calc(12px * var(--pw,2.5)); color: var(--c-line-dim); font-weight: 700; }
#homeUi .besDesc { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); line-height: 1.6; }
#homeUi .besStats { margin-top: calc(4px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .besStatRow { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .besStatRow span { color: var(--c-edge-9); }
#homeUi .besStatRow b { color: var(--c-gold-dk); }

/* --- 试炼之塔（青瓷浅色变体） --- */
#homeUi .trialList { max-height: calc(300px * var(--pw,2.5)); overflow-y: auto; display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); }
#homeUi .trialSect { display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .trialSect.lock { opacity: .55; }
#homeUi .trialSectName { font-size: calc(11px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .trialSect.lock .trialSectName { color: var(--c-edge-9); }
#homeUi .trialGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(5px * var(--pw,2.5)); }
#homeUi .trialCell { position: relative; padding: calc(6px * var(--pw,2.5)) 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(1px * var(--pw,2.5)); }
#homeUi .trialCell b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .trialCell span { font-size: calc(9px * var(--pw,2.5)); }
#homeUi .trialCell i { position: absolute; top: calc(1px * var(--pw,2.5)); right: calc(2px * var(--pw,2.5)); font-style: normal; font-size: calc(8px * var(--pw,2.5)); }
#homeUi .trialCell.done { border-color: #7fae86; }
#homeUi .trialCell.done b { color: #3f7a4a; }
#homeUi .trialCell.now { border-color: var(--c-amber); cursor: pointer; }
#homeUi .trialCell.now b { color: var(--c-gold-dk); }
#homeUi .trialCell.sel { border-color: var(--c-amber); box-shadow: 0 0 8px rgba(233,160,79,.55); }
#homeUi .trialCell.lock { opacity: .5; }
#homeUi .trialCell.mile { border-top: calc(2px * var(--pw,2.5)) solid var(--c-amber); }
#homeUi .trialDetail { margin-top: calc(8px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); text-align: left; }
#homeUi .trialName { font-size: calc(14px * var(--pw,2.5)); font-weight: 700; color: var(--c-gold-dk); display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .trialName span { font-size: calc(10px * var(--pw,2.5)); color: var(--c-line-dim); font-weight: 400; }
#homeUi .trialStat { display: flex; gap: calc(12px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); flex-wrap: wrap; }
#homeUi .trialStat b { color: var(--c-edge-2); }
#homeUi .trialMobs { display: flex; gap: calc(8px * var(--pw,2.5)); flex-wrap: wrap; align-items: flex-end; }
#homeUi .trialMob { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .trialMobPic { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); }
#homeUi .trialReward { display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .trialRewardHead { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .trialRewardRow { display: flex; gap: calc(5px * var(--pw,2.5)); align-items: center; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .trialRewardRow b { color: var(--c-gold-dk); }
#homeUi .trialRewardNote { font-size: calc(11px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .trialGo { width: 100%; margin-top: calc(8px * var(--pw,2.5)); }

/* --- 英雄招募 + 升星（青瓷浅色变体） --- */
#homeUi .hpick.recruitEntry .rcIc, #homeUi .hpick.talentEntry2 .rcIc { font-size: calc(23px * var(--pw,2.5)); line-height: calc(36px * var(--pw,2.5)); background: none !important; }
#homeUi .talentEntry2 .questRed { width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5));
  top: calc(-2px * var(--pw,2.5)); right: calc(3px * var(--pw,2.5)); background: var(--c-danger-dk); box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .bcardRed { width: calc(10px * var(--pw,2.5)); height: calc(10px * var(--pw,2.5));
  top: calc(-3px * var(--pw,2.5)); right: calc(-3px * var(--pw,2.5)); background: var(--c-danger-dk); box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .starBar { margin: calc(8px * var(--pw,2.5)) 0; padding: calc(9px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .starBar.max { border-color: var(--c-amber); }
#homeUi .sbLine { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .sbStars { font-size: calc(16px * var(--pw,2.5)); color: var(--c-amber); letter-spacing: calc(2px * var(--pw,2.5)); }
#homeUi .sbLv { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .sbProg { display: flex; align-items: baseline; gap: calc(5px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .sbProg b { color: var(--c-gold-dk); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .sbAdd { font-size: calc(9px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .sbDone { color: var(--c-gold-dk); }
#homeUi .sbBtn { width: 100%; }

#homeUi .rcHead { display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .rcHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .rcHeadTop i { color: var(--c-gold-dk); font-style: normal; font-size: calc(14px * var(--pw,2.5)); font-weight: 700; }
#homeUi .rcHeadTop span { font-size: calc(10px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .rcBar { height: calc(7px * var(--pw,2.5)); background: #dbe6ec; border-radius: calc(4px * var(--pw,2.5)); overflow: hidden; border: 1px solid var(--c-text-soft); }
#homeUi .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, var(--c-amber), #f3c98a); transition: width .3s; }
#homeUi .rcRate { padding: calc(8px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .rcRateRow { display: flex; justify-content: space-between; font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .rcRateRow b { color: var(--c-edge-1); }
#homeUi .rcRateRow.hero span, #homeUi .rcRateRow.hero b { color: var(--c-gold-dk); }
#homeUi .rcRateNote { margin-top: calc(2px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .rcShards { margin-top: calc(8px * var(--pw,2.5)); }
#homeUi .rcShardsHead { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-1); margin-bottom: calc(4px * var(--pw,2.5)); }
#homeUi .rcShardGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(5px * var(--pw,2.5)); }
#homeUi .rcShard { display: flex; align-items: center; gap: calc(5px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)); }
#homeUi .rcShard.lock { opacity: .6; filter: grayscale(.7); }
#homeUi .rcShardPic { flex: none; width: calc(26px * var(--pw,2.5)); height: calc(26px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .rcShardInfo { display: flex; flex-direction: column; gap: calc(1px * var(--pw,2.5)); min-width: 0; }
#homeUi .rcShardInfo b { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .rcShardInfo i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: var(--c-gold-dk); }
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
#homeUi .rcCardNm { font-size: calc(9px * var(--pw,2.5)); color: var(--c-edge-2); line-height: 1.3; }
#homeUi .rcCard.hero { border-color: var(--c-amber); box-shadow: 0 0 9px rgba(233,160,79,.65); }
#homeUi .rcNew { position: absolute; top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); background: #e2534f; color: #fff;
  font-size: calc(8px * var(--pw,2.5)); font-weight: 700; padding: calc(1px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5)); }
#homeUi .rcDup { position: absolute; top: calc(2px * var(--pw,2.5)); left: 50%; transform: translateX(-50%); font-size: calc(7px * var(--pw,2.5));
  color: var(--c-gold-dk); white-space: nowrap; }
#homeUi .rcSum { margin-top: calc(9px * var(--pw,2.5)); text-align: center; font-size: calc(11px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .rcAgain { width: 100%; margin-top: calc(9px * var(--pw,2.5)); }
#homeUi .rcClose { width: 100%; margin-top: calc(5px * var(--pw,2.5)); }

/* --- 天赋树（青瓷浅色变体） --- */
#homeUi .talentEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .talentHead { display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .talentHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(13px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .talentHeadTop i { color: var(--c-blue-mid); font-style: normal; font-size: calc(17px * var(--pw,2.5)); font-weight: 700; }
#homeUi .talentHeadTop span { font-size: calc(12px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .talentBar { height: calc(7px * var(--pw,2.5)); background: #dbe8ee; border-radius: calc(4px * var(--pw,2.5)); overflow: hidden; border: 1px solid #c3d6de; }
#homeUi .talentBar i { display: block; height: 100%; background: linear-gradient(90deg, #4aa8d8, var(--c-blue-mid)); }
#homeUi .talentSrc { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); line-height: 1.5; }

#homeUi .talentBranchRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(7px * var(--pw,2.5)); }
#homeUi .talentBranch { display: flex; flex-direction: column; min-width: 0; }
#homeUi .tbTitle { text-align: center; margin-bottom: calc(5px * var(--pw,2.5)); display: flex; flex-direction: column; gap: 1px; }
#homeUi .tbTitle b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .tbTitle i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .tbNodes { display: flex; flex-direction: column; align-items: center; }
#homeUi .talentNode { position: relative; width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  border: 1px solid #c3d6de; border-radius: calc(6px * var(--pw,2.5)); background: #f2f8fa; cursor: pointer; }
#homeUi .talentNode:not(:last-child) { margin-bottom: calc(15px * var(--pw,2.5)); }
#homeUi .talentNode:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%;
  transform: translateX(-50%); width: calc(2px * var(--pw,2.5)); height: calc(15px * var(--pw,2.5)); background: #c3d6de; }
#homeUi .talentNode.maxed:not(:last-child)::after { background: var(--c-amber); }
#homeUi .talentNode.lock { opacity: .5; filter: grayscale(.6); border-color: #dbe8ee; }
#homeUi .talentNode.can { border-color: var(--c-blue-mid); box-shadow: 0 0 7px #2f7fa877; animation: huiChest .9s ease-in-out infinite; }
#homeUi .talentNode.maxed { border-color: var(--c-amber); box-shadow: 0 0 7px #e9a04f88; }
#homeUi .talentNode.sel { outline: calc(2px * var(--pw,2.5)) solid #4aa8d8; outline-offset: calc(2px * var(--pw,2.5)); }
#homeUi .tnIc { font-size: calc(19px * var(--pw,2.5)); line-height: 1; }
#homeUi .tnLv { font-size: calc(8px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .talentNode.maxed .tnLv { color: var(--c-gold-dk); }
#homeUi .talentNode.can .tnLv { color: var(--c-blue-mid); }

#homeUi .talentDetail { margin-top: calc(9px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5));
  display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .tdName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(6px * var(--pw,2.5)); }
#homeUi .tdName b { font-size: calc(14px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .tdName i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .tdDesc { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-2); line-height: 1.5; }
#homeUi .tdHint { font-size: calc(11px * var(--pw,2.5)); color: var(--c-blue-mid); }
#homeUi .tdBtns { display: flex; gap: calc(7px * var(--pw,2.5)); margin-top: calc(2px * var(--pw,2.5)); }
#homeUi .tdBtns .btn { flex: 1; height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }

/* --- 资源副本（青瓷浅色变体） --- */
#homeUi .dungeonEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .dgHead { display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .dgHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(13px * var(--pw,2.5)); }
#homeUi .dgHeadTop b { color: var(--c-gold-dk); }
#homeUi .dgHeadTop span { font-size: calc(12px * var(--pw,2.5)); color: var(--c-blue-mid); }
#homeUi .dgSrc { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); line-height: 1.5; }

#homeUi .dgList { display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); }
#homeUi .dgRow { display: flex; align-items: center; gap: calc(7px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: calc(9px * var(--pw,2.5)); background: #f2f8fa; border: 1px solid #c3d6de; cursor: pointer; }
#homeUi .dgRow.on { border-color: var(--c-amber); box-shadow: 0 0 6px #e9a04f55; }
#homeUi .dgInfo { flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(6px * var(--pw,2.5)); }
#homeUi .dgIc { font-size: calc(22px * var(--pw,2.5)); line-height: 1; }
#homeUi .dgMeta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
#homeUi .dgMeta b { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .dgMeta i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: var(--c-blue-mid); }
#homeUi .dgTiers { display: flex; gap: calc(4px * var(--pw,2.5)); flex: none; }
#homeUi .dgTier { min-width: calc(44px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); }
#homeUi .dgTier:disabled { opacity: .5; }

#homeUi .dgDetail { margin-top: calc(9px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5));
  display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .dgName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(6px * var(--pw,2.5)); }
#homeUi .dgName b { font-size: calc(14px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .dgName i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .dgDesc { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-9); line-height: 1.5; }
#homeUi .dgYield { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .dgHint { font-size: calc(11px * var(--pw,2.5)); color: var(--c-blue-mid); }
#homeUi .dgGo { width: 100%; margin-top: calc(3px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }

/* --- 远征派遣（青瓷浅色变体） --- */
#homeUi .expeditionEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .expHead { margin-bottom: calc(7px * var(--pw,2.5)); }
#homeUi .expHeadTop b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .expHeadTop span { font-size: calc(13px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .expSrc { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-10); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .expList { gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .expRow { padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  border-color: var(--c-text-soft); background: var(--c-text-ice); }
#homeUi .expRow.on { border-color: #4a9fd6; box-shadow: 0 0 6px #4a9fd655; }
#homeUi .expRow.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .expInfo { gap: calc(7px * var(--pw,2.5)); }
#homeUi .expIc { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(20px * var(--pw,2.5)); background: var(--c-text-ice3); border-color: var(--c-text-mute); }
#homeUi .expMeta { gap: calc(2px * var(--pw,2.5)); }
#homeUi .expMeta b { font-size: calc(14px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .expMeta i { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .expRow.ready .expMeta i { color: var(--c-gold-dk); }
#homeUi .expDetail { padding: calc(8px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5));
  background: var(--c-text-ice); border: 1px solid var(--c-text-soft); border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .expName b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .expName i { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-1); }
#homeUi .expDesc { font-size: calc(12px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .expYield { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .expMult { font-size: calc(11px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .expHeroes { gap: calc(5px * var(--pw,2.5)); }
#homeUi .expHero { flex: 1 1 calc(30% - calc(5px * var(--pw,2.5))); min-width: calc(80px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5));
  gap: calc(2px * var(--pw,2.5)); background: var(--c-text-ice3); border-color: var(--c-text-mute); color: var(--c-edge-3); }
#homeUi .expHero.sel { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .ehIc { width: calc(28px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5));
  background: #c3d6e2; border-color: #a8bfcd; color: var(--c-gold-dk3); }
#homeUi .ehName { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .ehAttr { font-size: calc(10px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .ehBusy { font-size: calc(9px * var(--pw,2.5)); color: #c05252; }
#homeUi .expPick { font-size: calc(11px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .expTeam { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-3); }
#homeUi .expTimer { font-size: calc(14px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .expActions { gap: calc(5px * var(--pw,2.5)); }
#homeUi .expGo { height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }

/* --- 个人主页（青瓷浅色变体） --- */
#homeUi .pAvatar { cursor: pointer; }
#homeUi .pfCard { display: flex; align-items: center; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .pfPic { flex: none; width: calc(64px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5)); border-radius: calc(12px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .pfCardInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .pfName { display: flex; align-items: baseline; gap: calc(6px * var(--pw,2.5)); }
#homeUi .pfName b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .pfTitle { font-size: calc(12px * var(--pw,2.5)); color: var(--c-gold-dk); font-weight: 700; }
#homeUi .pfPower { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .pfPower b { font-size: calc(16px * var(--pw,2.5)); color: var(--c-amber); }
#homeUi .pfSec { margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .pfSecHead { margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .pfSecHead b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .pfGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .pfStat { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); }
#homeUi .pfStat em { font-style: normal; font-size: calc(16px * var(--pw,2.5)); line-height: 1; }
#homeUi .pfStat b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .pfStat span { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .pfAcc { padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .pfAccRow { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .pfAccRow span { color: var(--c-edge-9); }
#homeUi .pfAccRow b { color: var(--c-edge-2); }
#homeUi .signinEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .siHead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .siHead b { font-size: calc(15px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .siHead b i { color: var(--c-amber); font-style: normal; }
#homeUi .siHead span { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .siGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .siCell { padding: calc(8px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); }
#homeUi .siCell.today { border-color: var(--c-amber); background: var(--c-cream-1); box-shadow: 0 0 8px #e9a04f66; }
#homeUi .siCell.done { opacity: .55; filter: grayscale(.4); }
#homeUi .siIc { font-size: calc(22px * var(--pw,2.5)); line-height: 1; }
#homeUi .siNm { font-size: calc(12px * var(--pw,2.5)); font-weight: 700; color: var(--c-edge-2); }
#homeUi .siDy { font-size: calc(11px * var(--pw,2.5)); color: var(--c-amber); }
#homeUi .siRw { font-size: calc(11px * var(--pw,2.5)); color: var(--c-gold-dk); }
#homeUi .siFoot { display: flex; align-items: center; justify-content: space-between; gap: calc(8px * var(--pw,2.5));
  margin-top: calc(10px * var(--pw,2.5)); padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); }
#homeUi .siFoot.ready { border-color: var(--c-amber); box-shadow: 0 0 8px #e9a04f55; }
#homeUi .siFoot.done { opacity: .65; }
#homeUi .siInfo { display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); }
#homeUi .siInfo b { font-size: calc(14px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .siInfo span { font-size: calc(13px * var(--pw,2.5)); color: var(--c-gold-dk); font-weight: 700; }
#homeUi .siFoot .btn { min-width: calc(110px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); }

/* --- 装备词缀（青瓷浅色变体） --- */
#homeUi .bcellAffix { position: absolute; left: calc(3px * var(--pw,2.5)); top: calc(2px * var(--pw,2.5));
  font-size: calc(9px * var(--pw,2.5)); color: #c98a1e; text-shadow: none; }
#homeUi .affixMark { color: #c98a1e; font-size: calc(11px * var(--pw,2.5)); }
#homeUi .affixBox { margin: calc(-4px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)) 0; padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: calc(7px * var(--pw,2.5)); background: #f4f9fb; border: 1px dashed #b8cbd7;
  display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); }
#homeUi .affixHead { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .affixRow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(5px * var(--pw,2.5));
  font-size: calc(11px * var(--pw,2.5)); }
#homeUi .affixName { font-weight: 700; }
#homeUi .affixVal { color: var(--c-edge-2); }

/* --- 主城邮箱弹窗（base 深色层） --- */
#homeUi .homeMailBtn { position: relative; }
#homeUi .homeMailBtn::after { content: ''; display: none; position: absolute; top: calc(2px * var(--hs,1)); right: calc(2px * var(--hs,1));
  width: calc(10px * var(--hs,1)); height: calc(10px * var(--hs,1)); border-radius: 50%; background: var(--c-danger);
  border: calc(2px * var(--hs,1)) solid #ffd5d5; box-shadow: 0 0 calc(6px * var(--hs,1)) rgba(255,82,82,.8); }
#homeUi .homeMailBtn.unread::after { display: block; }
#homeUi .mailBox { width: calc(560px * var(--hs,1)); max-height: 72vh; overflow-y: auto; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .mailClaimAll { align-self: flex-end; }
#homeUi .mailListEl { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .mailListRow { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(12px * var(--hs,1));
  border-radius: calc(10px * var(--hs,1)); background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09); cursor: pointer; }
#homeUi .mailListRow.unread { border-color: rgba(255,204,85,.5); background: rgba(255,204,85,.07); }
#homeUi .mailListRow.claimable { border-color: rgba(156,204,101,.55); }
#homeUi .mIc { flex: none; width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(20px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); background: rgba(10,18,26,.55); border: 1px solid rgba(255,255,255,.12); }
#homeUi .mMid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .mMid b { font-size: calc(14px * var(--hs,1)); color: var(--c-gold-hi); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .mMid small { font-size: calc(11px * var(--hs,1)); color: var(--c-dim-1); }
#homeUi .mTag { flex: none; font-size: calc(11px * var(--hs,1)); color: var(--c-dim-1); }
#homeUi .mTag.expiring { color: #ffb74d; font-weight: 700; }
#homeUi .mailEmptyRow { padding: calc(40px * var(--hs,1)) 0; text-align: center; color: var(--c-dim-1); font-size: calc(14px * var(--hs,1)); }
#homeUi .mailDetailHead h4 { margin: calc(4px * var(--hs,1)) 0 calc(2px * var(--hs,1)); font-size: calc(17px * var(--hs,1)); color: var(--c-gold-hi); }
#homeUi .mailDetailFrom { font-size: calc(12px * var(--hs,1)); color: var(--c-dim-1); }
#homeUi .mailDetailText { font-size: calc(13px * var(--hs,1)); line-height: 1.7; color: #cfe3ee; }
#homeUi .mailDetailText p { margin: 0 0 calc(2px * var(--hs,1)); }
#homeUi .mailDetailAttach { padding: calc(10px * var(--hs,1)) calc(12px * var(--hs,1)); border-radius: calc(10px * var(--hs,1));
  background: rgba(156,204,101,.08); border: 1px dashed rgba(156,204,101,.45); display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .mailDetailItems { font-size: calc(14px * var(--hs,1)); color: #d7ffd9; font-weight: 700; }
#homeUi .mailDetailWarn { font-size: calc(11px * var(--hs,1)); color: #ffb74d; }
#homeUi .mailDelete { align-self: flex-end; }

/* --- 主城邮箱弹窗（青瓷浅色变体） --- */
#homeUi .homeMailBtn::after { top: calc(0px * var(--pw,2.5)); right: calc(0px * var(--pw,2.5));
  width: calc(7px * var(--pw,2.5)); height: calc(7px * var(--pw,2.5)); border: none; }
#homeUi .mailBox { width: calc(360px * var(--pw,2.5)); max-height: 70vh; gap: calc(8px * var(--pw,2.5)); }
#homeUi .mailListEl { gap: calc(6px * var(--pw,2.5)); }
#homeUi .mailListRow { gap: calc(8px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  background: #f4f9fb; border: 1px solid #d7e3ea; }
#homeUi .mailListRow.unread { border-color: #e0b45c; background: var(--c-cream-1); }
#homeUi .mailListRow.claimable { border-color: #8fbf6d; }
#homeUi .mIc { width: calc(26px * var(--pw,2.5)); height: calc(26px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5));
  border-radius: calc(6px * var(--pw,2.5)); background: #eaf3f7; border: 1px solid #d7e3ea; }
#homeUi .mMid b { font-size: calc(13px * var(--pw,2.5)); color: #4a5f6d; }
#homeUi .mailListRow.unread .mMid b { color: var(--c-gold-dk); }
#homeUi .mMid small { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .mTag { font-size: calc(10px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .mTag.expiring { color: #c98a1e; }
#homeUi .mailEmptyRow { color: var(--c-edge-9); font-size: calc(13px * var(--pw,2.5)); }
#homeUi .mailDetailHead h4 { font-size: calc(15px * var(--pw,2.5)); color: #4a5f6d; }
#homeUi .mailDetailFrom { font-size: calc(11px * var(--pw,2.5)); color: var(--c-edge-9); }
#homeUi .mailDetailText { font-size: calc(12px * var(--pw,2.5)); color: var(--c-edge-2); }
#homeUi .mailDetailAttach { background: #f0f7ec; border: 1px dashed #a8cc8e; gap: calc(4px * var(--pw,2.5)); }
#homeUi .mailDetailItems { font-size: calc(13px * var(--pw,2.5)); color: #4e7a33; }
#homeUi .mailDetailWarn { font-size: calc(10px * var(--pw,2.5)); color: #c98a1e; }

/* --- P0 布局改版（青瓷浅色变体）：安全区 --- */
#homeUi .tabbar { height: calc(78px * var(--pw,2.5) + var(--sab,0px)); padding-bottom: calc(3px * var(--pw,2.5) + var(--sab,0px)); }

/* --- P1 布局改版（青瓷浅色变体）：弹层分级 sheet/result + 商店招募主卡 --- */
#homeUi .sheetBox { max-height: 74%; border-radius: calc(10px * var(--pw,2.5)) calc(10px * var(--pw,2.5)) 0 0; border-bottom: none;
  animation: sheetUp .28s cubic-bezier(.2,.9,.3,1); }
#homeUi .sheetGrip { width: calc(28px * var(--pw,2.5)); height: calc(4px * var(--pw,2.5)); top: calc(6px * var(--pw,2.5)); background: #b8cbd7; }
#homeUi .resultMask { background: #102b3bd9; }
#homeUi .resultBox { max-height: 88%; }
#homeUi .rcard { display: flex; align-items: center; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)) calc(12px * var(--pw,2.5));
  margin: 0 0 calc(12px * var(--pw,2.5)); }
#homeUi .rcard .rcLeft { gap: calc(5px * var(--pw,2.5)); }
#homeUi .rcard .rcTitle { font-size: calc(15px * var(--pw,2.5)); color: var(--c-gold-dk3); }
#homeUi .rcard .rcPity { gap: calc(6px * var(--pw,2.5)); }
#homeUi .rcard .rcBar { height: calc(7px * var(--pw,2.5)); background: #dbe6ec; border-radius: calc(4px * var(--pw,2.5));
  overflow: hidden; border: 1px solid var(--c-text-soft); }
#homeUi .rcard .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, var(--c-amber), #f3c98a); transition: width .3s; }
#homeUi .rcard .rcPityTxt { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .rcard .rcDetail { font-size: calc(11px * var(--pw,2.5)); color: var(--c-blue-dk); }
#homeUi .rcard .rcActs { width: calc(112px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5)); }
#homeUi .rcard .rcActs .btn { height: calc(30px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); min-height: 0;
  border-radius: calc(6px * var(--pw,2.5)); padding: 0; }

/* P2 玩法页 · 浅色：日常状态卡 + 玩法入口状态行 */
#homeUi .dutyRow { display: flex; gap: calc(8px * var(--pw,2.5)); margin-bottom: calc(12px * var(--pw,2.5)); }
#homeUi .dutyCard { flex: 1; display: flex; align-items: center; gap: calc(8px * var(--pw,2.5));
  padding: calc(10px * var(--pw,2.5)) calc(11px * var(--pw,2.5)); border: 1px solid #bfced8; border-radius: calc(10px * var(--pw,2.5));
  background: linear-gradient(180deg, var(--c-white), #eef4f8); box-shadow: 0 calc(2px * var(--pw,2.5)) calc(5px * var(--pw,2.5)) rgba(23,58,74,.08);
  cursor: pointer; font-family: inherit; text-align: left; }
#homeUi .dutyCard:active { transform: scale(.97); }
#homeUi .dutyCard .dcIc { font-size: calc(24px * var(--pw,2.5)); line-height: 1; }
#homeUi .dutyCard .dcTxt { display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); min-width: 0; }
#homeUi .dutyCard .dcTxt b { font-size: calc(13px * var(--pw,2.5)); color: var(--c-deep-teal2); }
#homeUi .dutyCard .dcTxt i { font-style: normal; font-size: calc(9.5px * var(--pw,2.5)); color: var(--c-line-dim); }
#homeUi .dutyCard .questRed { display: none; position: absolute; top: calc(-3px * var(--pw,2.5)); right: calc(-3px * var(--pw,2.5));
  width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); border-radius: 50%; background: var(--c-danger);
  box-shadow: 0 0 calc(4px * var(--pw,2.5)) rgba(255,82,82,.7); }
#homeUi .dutyCard .questRed.on { display: block; }
#homeUi .modeList { display: flex; flex-direction: column; gap: calc(8px * var(--pw,2.5)); margin-bottom: calc(16px * var(--pw,2.5)); }
#homeUi .modeRow { position: relative; display: flex; align-items: center; gap: calc(9px * var(--pw,2.5));
  padding: calc(9px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); border: 1px solid #bfced8; border-radius: calc(10px * var(--pw,2.5));
  background: var(--c-white); box-shadow: 0 calc(1px * var(--pw,2.5)) calc(3px * var(--pw,2.5)) rgba(23,58,74,.06);
  cursor: pointer; font-family: inherit; text-align: left; }
#homeUi .modeRow:active { transform: scale(.98); }
#homeUi .modeRow.locked { filter: grayscale(.55) brightness(.95); }
#homeUi .modeRow .mmIc { flex: none; width: calc(38px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); border-radius: calc(9px * var(--pw,2.5));
  background: #eef4f8; border: 1px solid #d5e0e7; display: flex; align-items: center; justify-content: center; font-size: calc(20px * var(--pw,2.5)); }
#homeUi .modeRow .mm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .modeRow .mm b { font-size: calc(12.5px * var(--pw,2.5)); color: var(--c-deep-teal2); display: flex; align-items: center; gap: calc(5px * var(--pw,2.5)); }
#homeUi .modeRow .mm .mini4 { font-size: calc(8.5px * var(--pw,2.5)); font-weight: 700; color: var(--c-blue-dk); background: #e3f0f7;
  border: 1px solid #bcd8e6; border-radius: 99px; padding: 0 calc(5px * var(--pw,2.5)); }
#homeUi .modeRow .mm i { font-style: normal; font-size: calc(9.5px * var(--pw,2.5)); color: var(--c-line-dim);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .modeRow .mmGo { flex: none; font-size: calc(10.5px * var(--pw,2.5)); font-weight: 800; color: #7a4c12;
  background: linear-gradient(180deg, #ffe9b8, #f5c563); border: 1px solid #e0b25e; border-radius: calc(7px * var(--pw,2.5));
  padding: calc(5px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); white-space: nowrap; }
#homeUi .modeRow.locked .mmGo { filter: grayscale(.7) brightness(.9); }

/* P2 基地页 · 浅色：建筑地图节点 */
#homeUi .baseMap { position: relative; height: calc(240px * var(--pw,2.5)); border-radius: calc(10px * var(--pw,2.5));
  background: linear-gradient(180deg, #dcebf2, #cfe3ec); border: 1px solid #bfced8; overflow: hidden;
  margin-bottom: calc(12px * var(--pw,2.5)); }
#homeUi .baseMap::before { content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px);
  background-size: calc(26px * var(--pw,2.5)) calc(26px * var(--pw,2.5)); }
#homeUi .mapNode { position: absolute; transform: translate(-50%, -50%); width: calc(64px * var(--pw,2.5));
  padding: calc(4px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); border: 1px solid #bfced8; border-radius: calc(9px * var(--pw,2.5));
  background: linear-gradient(180deg, var(--c-white), #eef4f8); box-shadow: 0 calc(2px * var(--pw,2.5)) calc(4px * var(--pw,2.5)) rgba(23,58,74,.1);
  font-family: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center;
  gap: calc(1px * var(--pw,2.5)); z-index: 2; }
#homeUi .mapNode:active { transform: translate(-50%, -50%) scale(.94); }
#homeUi .mapNode .mnIc { font-size: calc(20px * var(--pw,2.5)); line-height: 1.2; }
#homeUi .mapNode .mnName { font-size: calc(10px * var(--pw,2.5)); font-weight: 800; color: var(--c-deep-teal2); white-space: nowrap; }
#homeUi .mapNode .mnLv { font-size: calc(8.5px * var(--pw,2.5)); font-weight: 700; color: var(--c-blue-dk); white-space: nowrap; }
#homeUi .mapNode.lock { filter: grayscale(.6) brightness(.95); opacity: .78; }
#homeUi .baseGrid { gap: calc(8px * var(--pw,2.5)); }

/* ================================================================
   二级弹层系统几何（UX 布局交互稿 v1.0 落地 · 布局不含美术）
   层级 L2 全屏二级页 / L3 二级弹窗 / L4 半屏抽屉 / L5 结果演出层
   尺寸 S 确认 / M 列表 / L 详情 / XL 全屏页
   五段式：头部区 → 说明·页签区 → 内容滚动区 → 槽位·消耗区 → CTA 底栏
   仅一条滚动轴（.popScroll），头部/说明/页签/槽位/CTA 全程固定不滚。
   ================================================================ */
/* 青瓷浅色令牌覆盖（后声明者胜，故本块必须在深色层令牌之后） */
#homeUi .pop { --pu: var(--pw,2.5);
  --pbg:var(--c-text-ice2); --pbg2:#e2edf3; --pbg3:#dae6ee; --pdeep:#dae6ee; --pink:var(--c-white);
  --pline:#9db9ca; --pline2:#c3d6e1; --ptx:var(--c-deep-teal2); --pdim:#5b7f92; --pdim2:#7b9aa9;
  --pk:#c8862f; --pks:var(--c-gold-dk3); --pgreen:#2f8f63; --pine:#1d6b48; --pred:#c0483f; --pred2:#a8362e;
  --prow:var(--c-white); --pshad:0 24px 60px rgba(23,58,74,.28); }

/* --- 分层：L2 全屏页 / L3 弹窗 / L4 半屏抽屉 / L5 结果演出 --- */
#homeUi .protoMask.popL2 { z-index: 210; }
#homeUi .protoMask.popL3 { z-index: 220; }
#homeUi .protoMask.popL4 { z-index: 230; }
#homeUi .protoMask.popL5 { z-index: 240; background: rgba(4,8,16,.86); }
/* 旧弹窗叠在新弹层之上（迁移过渡期）：抬到最高层，关闭后回到下方新弹层 */
#homeUi .protoMask.popAbove { z-index: 250; }
#homeUi .pop { background: var(--pbg); border: 1px solid var(--pline); display: flex; flex-direction: column;
  overflow: hidden; box-shadow: var(--pshad); animation: popIn .16s ease-out; color: var(--ptx); }
@keyframes popIn { from { opacity: 0; transform: translateY(calc(8px * var(--pu,1))); } to { opacity: 1; transform: none; } }

/* --- 尺寸档：M/L 用视口比例定位（跨长宽比稳），S 居中偏上，XL 满屏 --- */
/* 高度取「内容高，但不超过本档定位框」：内容少时收窄到内容高（不空留白、不多一条滚动条），
   内容多时封在本档高度内由 ③ 区滚动。严禁把上限抬高去迁就内容——M/L 一旦长到接近满屏，
   就和 XL 二级页没有区别，档位也就失去意义（M 上限 64vh / L 73vh / XL 100vh 必须拉得开）。
   够不着的溢出属于内容密度问题：收紧行高/间距，或按「档位由内容量决定」升到下一档。 */
#homeUi .pop.M { position: absolute; left: calc(23px * var(--pu,1)); right: calc(23px * var(--pu,1));
  top: calc(18vh + var(--sat,0px)); bottom: calc(18vh + var(--sab,0px));
  height: max-content; margin-top: auto; margin-bottom: auto;
  max-height: calc(64vh - var(--sat,0px) - var(--sab,0px)); border-radius: calc(14px * var(--pu,1)); }
#homeUi .pop.L { position: absolute; left: calc(17px * var(--pu,1)); right: calc(17px * var(--pu,1));
  top: calc(14vh + var(--sat,0px)); bottom: calc(13vh + var(--sab,0px));
  height: max-content; margin-top: auto; margin-bottom: auto;
  max-height: calc(73vh - var(--sat,0px) - var(--sab,0px)); border-radius: calc(14px * var(--pu,1)); }
#homeUi .pop.S { position: absolute; left: 50%; transform: translateX(-50%); top: 30vh;
  width: calc(287px * var(--pu,1)); max-width: 86vw;
  max-height: calc(68vh - var(--sab,0px)); border-radius: calc(12px * var(--pu,1)); }
#homeUi .pop.S.center { top: 50%; margin-top: calc(-0px * var(--pu,1)); transform: translate(-50%, -50%); }
#homeUi .pop.XL { position: absolute; inset: 0; border: 0; border-radius: 0; }
#homeUi .pop.XL.L5 { background: #12151d; color: #dbe2ef; }
#homeUi .pop.XL .popShow { padding-top: calc(24px * var(--pu,1)); }

/* --- 头部区（固定）--- */
#homeUi .popBanner { flex: none; display: flex; align-items: center; gap: calc(10px * var(--pu,1));
  padding: calc(8px * var(--pu,1)) calc(48px * var(--pu,1)) calc(8px * var(--pu,1)) calc(14px * var(--pu,1));
  background: linear-gradient(90deg, rgba(200,134,47,.16), rgba(200,134,47,.04));
  border-bottom: 1px solid var(--pline); position: relative; }
#homeUi .popBanner b { font-size: calc(16px * var(--pu,1)); color: var(--pks); letter-spacing: calc(1px * var(--pu,1)); }
#homeUi .popBanner .art { margin-left: auto; width: calc(84px * var(--pu,1)); height: calc(34px * var(--pu,1));
  border: 1px dashed var(--pline); border-radius: calc(8px * var(--pu,1)); display: flex; align-items: center;
  justify-content: center; font-size: calc(9.5px * var(--pu,1)); color: var(--pdim2); }
#homeUi .popTop { flex: none; position: relative; display: flex; align-items: center; justify-content: center;
  padding: calc(11px * var(--pu,1)) calc(48px * var(--pu,1)); border-bottom: 1px solid var(--pline);
  background: var(--pbg2); font-size: calc(15px * var(--pu,1)); font-weight: 700; }
#homeUi .popClose, #homeUi .popBack { position: absolute; top: 50%; transform: translateY(-50%);
  width: calc(30px * var(--pu,1)); height: calc(30px * var(--pu,1)); border-radius: calc(9px * var(--pu,1));
  border: 1px solid var(--pline); background: var(--pdeep); color: var(--pdim);
  font-size: calc(13px * var(--pu,1)); display: flex; align-items: center; justify-content: center; cursor: pointer; }
#homeUi .popClose { right: calc(8px * var(--pu,1)); }
#homeUi .popBack { left: calc(8px * var(--pu,1)); }
/* position:relative 必须有：✕/‹ 是绝对定位且 top:50%，若以整块 .pop 为参照
   会落在面板垂直中心压住正文（交互稿实测过 y431 压住第三行属性）。 */
#homeUi .popQ { flex: none; position: relative; display: flex; align-items: center; gap: calc(12px * var(--pu,1));
  padding: calc(12px * var(--pu,1)); border-bottom: 1px solid var(--pline); color: #fff;
  background: linear-gradient(120deg,#33532f,#26401f); }
#homeUi .popQ.q2 { background: linear-gradient(120deg,#2f4a63,#22354a); }
#homeUi .popQ.q3 { background: linear-gradient(120deg,#4a3a63,#33274a); }
#homeUi .popQ.q4 { background: linear-gradient(120deg,#63502f,#4a3a1f); }
#homeUi .popQ .qi { width: calc(58px * var(--pu,1)); height: calc(58px * var(--pu,1)); flex: none;
  border-radius: calc(11px * var(--pu,1)); border: 2px solid rgba(255,255,255,.55); background: rgba(0,0,0,.28);
  display: flex; align-items: center; justify-content: center; font-size: calc(30px * var(--pu,1)); position: relative; }
#homeUi .popQ .qm { flex: 1; min-width: 0; }
#homeUi .popQ .qm b { display: block; font-size: calc(16px * var(--pu,1)); color: #fff; }
#homeUi .popQ .qs { display: flex; gap: calc(12px * var(--pu,1)); flex-wrap: wrap;
  font-size: calc(11px * var(--pu,1)); color: rgba(255,255,255,.85); margin-top: calc(3px * var(--pu,1)); }
#homeUi .popQ .qtag { font-size: calc(10px * var(--pu,1)); font-weight: 700; color: #fff;
  background: rgba(255,255,255,.2); border-radius: calc(4px * var(--pu,1)); padding: 0 calc(6px * var(--pu,1)); }

/* --- 说明行 / 页签（固定）--- */
#homeUi .popMeta { flex: none; display: flex; align-items: center; justify-content: center; gap: calc(7px * var(--pu,1));
  padding: calc(7px * var(--pu,1)) calc(14px * var(--pu,1)); font-size: calc(12px * var(--pu,1));
  color: var(--pdim); border-bottom: 1px solid var(--pline2); }
#homeUi .popMeta .q { width: calc(17px * var(--pu,1)); height: calc(17px * var(--pu,1)); flex: none;
  border-radius: 50%; border: 1px solid var(--pline); display: flex; align-items: center; justify-content: center;
  font-size: calc(10px * var(--pu,1)); color: var(--pdim2); cursor: pointer; }
#homeUi .popTabs { flex: none; display: flex; border-bottom: 1px solid var(--pline); background: var(--pbg3); }
#homeUi .popTabs div { flex: 1; text-align: center; font-size: calc(13px * var(--pu,1));
  padding: calc(8px * var(--pu,1)) calc(4px * var(--pu,1)); color: var(--pdim); cursor: pointer; position: relative; }
#homeUi .popTabs div.on { color: var(--pks); font-weight: 700; }
#homeUi .popTabs div.on::after { content: ''; position: absolute; left: 14%; right: 14%; bottom: -1px;
  height: calc(2px * var(--pu,1)); background: var(--pk); border-radius: calc(2px * var(--pu,1)); }
#homeUi .popFixBar { flex: none; display: flex; align-items: center; gap: calc(8px * var(--pu,1)); flex-wrap: wrap;
  padding: calc(8px * var(--pu,1)) calc(12px * var(--pu,1)); border-bottom: 1px solid var(--pline2); background: var(--pdeep); }
#homeUi .popChip { font-size: calc(11.5px * var(--pu,1)); color: var(--pdim); border: 1px solid var(--pline);
  border-radius: 99px; padding: calc(3px * var(--pu,1)) calc(11px * var(--pu,1)); white-space: nowrap; cursor: pointer; }
#homeUi .popChip.on { color: var(--pks); border-color: var(--pk); background: rgba(200,134,47,.1); }

/* --- 内容滚动区（唯一滚动轴）--- */
/* flex:1 的 flex-basis:0 只在「面板被拉满、有富余高度」时才对；面板改内容自适应后
   必须以内容高度为基准（flex:1 1 auto），否则滚动区会被压成 0 高、整块内容看不见。 */
#homeUi .popScroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  position: relative; padding: calc(7px * var(--pu,1)) calc(12px * var(--pu,1)); display: flex; flex-direction: column;
  gap: calc(7px * var(--pu,1)); -webkit-overflow-scrolling: touch; }
/* 渐隐条不参与布局：绝对定位贴滚动区可见底部，不占流内高度。占流高时
   内容恰好装满的面会被这 20px 顶出一条幻影滚动条（提示「能滚」的东西自己制造滚动）。 */
#homeUi .popScroll > .popFade { position: absolute; bottom: 0; left: 0; right: 0; flex: none;
  height: calc(20px * var(--pu,1)); pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0), var(--pbg)); opacity: .96; }
#homeUi .popSec { flex: none; font-size: calc(11.5px * var(--pu,1)); color: var(--pdim2);
  letter-spacing: calc(1px * var(--pu,1)); border-left: 2px solid var(--pline); padding-left: calc(8px * var(--pu,1)); }

/* --- 槽位条（固定）--- */
#homeUi .popSlots { flex: none; display: flex; gap: calc(6px * var(--pu,1));
  padding: calc(7px * var(--pu,1)) calc(10px * var(--pu,1)); border-top: 1px solid var(--pline2); }
#homeUi .popSlots .sc { flex: 1; min-width: 0; height: calc(50px * var(--pu,1)); position: relative;
  border-radius: calc(9px * var(--pu,1)); border: 1px solid var(--pline); background: var(--pdeep);
  display: flex; align-items: center; justify-content: center; font-size: calc(20px * var(--pu,1)); cursor: pointer; }
#homeUi .popSlots .sc.on { border-color: var(--pk); box-shadow: inset 0 0 0 1px rgba(200,134,47,.45); }
/* 未解锁槽位（如巡逻里未通关的关卡）：降饱和表示不可选，但仍可点开原因说明 */
#homeUi .popSlots .sc.lock { opacity: .5; }
#homeUi .popSlots .sc .tg { position: absolute; left: calc(2px * var(--pu,1)); top: calc(2px * var(--pu,1));
  font-size: calc(8.5px * var(--pu,1)); color: var(--pdim); background: var(--pbg); line-height: 1.25;
  border-radius: calc(3px * var(--pu,1)); padding: 0 calc(3px * var(--pu,1)); }
#homeUi .popSlots .sc .rd { position: absolute; right: calc(-2px * var(--pu,1)); top: calc(-2px * var(--pu,1));
  width: calc(11px * var(--pu,1)); height: calc(11px * var(--pu,1)); border-radius: 50%;
  background: var(--pred); border: 1px solid var(--pbg); }

/* --- 底部操作栏（XL：返回 + 页签）--- */
#homeUi .popBar { flex: none; display: flex; align-items: center; gap: calc(10px * var(--pu,1));
  padding: calc(8px * var(--pu,1)) calc(12px * var(--pu,1)) calc(10px * var(--pu,1));
  border-top: 1px solid var(--pline2); }
#homeUi .popBar .bk { width: calc(44px * var(--pu,1)); height: calc(44px * var(--pu,1)); flex: none;
  border-radius: 50%; border: 1px solid var(--pline); background: var(--pdeep); color: var(--ptx);
  font-size: calc(18px * var(--pu,1)); display: flex; align-items: center; justify-content: center; cursor: pointer; }
#homeUi .popBar .pt { margin-left: auto; display: flex; gap: calc(10px * var(--pu,1)); }
#homeUi .popBar .pt div { min-width: calc(52px * var(--pu,1)); padding: calc(5px * var(--pu,1)) 0;
  border: 1px solid transparent; border-radius: calc(9px * var(--pu,1)); display: flex; flex-direction: column;
  align-items: center; gap: calc(2px * var(--pu,1)); font-size: calc(10px * var(--pu,1));
  color: var(--pdim); cursor: pointer; position: relative; }
#homeUi .popBar .pt div i { font-style: normal; font-size: calc(17px * var(--pu,1)); }
#homeUi .popBar .pt div.on { color: var(--pks); border-color: var(--pk); background: rgba(200,134,47,.1); }

/* --- 消耗行 + CTA 区（固定）--- */
#homeUi .popCost { flex: none; display: flex; gap: calc(16px * var(--pu,1)); justify-content: center;
  align-items: flex-start; padding: calc(8px * var(--pu,1)) calc(12px * var(--pu,1)) 0; }
#homeUi .popCost .c { display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pu,1)); }
#homeUi .popCost .c .ci { width: calc(40px * var(--pu,1)); height: calc(40px * var(--pu,1));
  border-radius: calc(10px * var(--pu,1)); border: 1px solid var(--pline); background: var(--pdeep);
  display: flex; align-items: center; justify-content: center; font-size: calc(20px * var(--pu,1)); }
#homeUi .popCost .c .cv { font-size: calc(12px * var(--pu,1)); color: var(--ptx); white-space: nowrap; }
#homeUi .popCost .c .cv.lack { color: var(--pred2); font-weight: 700; }
#homeUi .popCost .c .cv.ok { color: var(--pgreen); }
#homeUi .popCTA { flex: none; border-top: 1px solid var(--pline); background: var(--pbg2);
  padding: calc(7px * var(--pu,1)) calc(12px * var(--pu,1)) calc(8px * var(--pu,1));
  display: flex; flex-direction: column; align-items: center; gap: calc(5px * var(--pu,1)); }
#homeUi .popCTA .row { display: flex; gap: calc(10px * var(--pu,1)); width: 100%; }
#homeUi .popCTA .row.justify { justify-content: center; }
#homeUi .popBtn { height: calc(40px * var(--pu,1)); border-radius: calc(9px * var(--pu,1));
  display: flex; align-items: center; justify-content: center; gap: calc(6px * var(--pu,1));
  font-size: calc(15px * var(--pu,1)); font-weight: 700; cursor: pointer; position: relative;
  padding: 0 calc(22px * var(--pu,1)); border: 2px solid var(--pk); color: var(--pks);
  background: rgba(200,134,47,.12); }
#homeUi .popBtn.green { border-color: var(--pgreen); color: var(--pine); background: rgba(47,143,99,.1); }
#homeUi .popBtn.danger { border-color: var(--pred); color: var(--pred2); background: rgba(192,72,63,.1); }
#homeUi .popBtn.grey { border: 1px solid var(--pline); color: var(--pdim); background: none; font-weight: 400; }
#homeUi .popBtn.wide { flex: 1; }
/* 禁用态：板图照贴，置灰由 filter 派生（态策略见 art-spec/STYLE-SPEC.md §10——一族一件不出多态图） */
#homeUi .popBtn.disabled { opacity: .5; border-color: var(--pline); color: var(--pdim); background: none; cursor: default;
  filter: grayscale(.6) brightness(.92); }
#homeUi .popCTA .note { font-size: calc(10.5px * var(--pu,1)); color: var(--pdim2); text-align: center; }
#homeUi .popRed { position: absolute; right: calc(-4px * var(--pu,1)); top: calc(-4px * var(--pu,1));
  width: calc(12px * var(--pu,1)); height: calc(12px * var(--pu,1)); border-radius: 50%;
  background: var(--pred); border: 2px solid var(--pbg2); }
#homeUi .popTitle { flex: none; text-align: center; font-size: calc(21px * var(--pu,1)); font-weight: 800;
  letter-spacing: calc(6px * var(--pu,1)); color: var(--pks); }
#homeUi .popSub2 { flex: none; font-size: calc(11px * var(--pu,1)); color: var(--pdim); text-align: center; }

/* --- XL 展示台（英雄养成 / 装备强化 / 工坊共用头部）--- */
#homeUi .popShow { flex: none; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--pu,1));
  padding: calc(12px * var(--pu,1)) 0 calc(8px * var(--pu,1)); }
#homeUi .popPedestal { width: calc(94px * var(--pu,1)); height: calc(94px * var(--pu,1)); position: relative;
  border-radius: calc(16px * var(--pu,1)); border: 2px solid rgba(90,167,232,.55); background: var(--pdeep);
  display: flex; align-items: center; justify-content: center; font-size: calc(44px * var(--pu,1));
  box-shadow: 0 0 0 calc(10px * var(--pu,1)) rgba(90,167,232,.08); }
#homeUi .popTierTag { position: absolute; left: calc(-8px * var(--pu,1)); top: calc(-8px * var(--pu,1));
  font-size: calc(10px * var(--pu,1)); background: var(--pbg); border: 1px solid var(--pline);
  border-radius: calc(4px * var(--pu,1)); padding: 0 calc(5px * var(--pu,1)); color: var(--pks); }
#homeUi .popName { font-size: calc(18px * var(--pu,1)); font-weight: 800; letter-spacing: calc(3px * var(--pu,1));
  color: var(--pks); border: 1px solid rgba(200,134,47,.35); background: rgba(200,134,47,.08);
  border-radius: calc(8px * var(--pu,1)); padding: calc(2px * var(--pu,1)) calc(20px * var(--pu,1)); }

/* --- 组件：列表行（图标 + 两行文本 + 状态列 + 行内动作 + 红点）--- */
#homeUi .popRow { flex: none; display: flex; align-items: center; gap: calc(10px * var(--pu,1)); position: relative;
  border-radius: calc(10px * var(--pu,1)); border: 1px solid var(--pline); background: var(--prow);
  padding: calc(7px * var(--pu,1)) calc(11px * var(--pu,1)); cursor: pointer; }
#homeUi .popRow .ic { width: calc(40px * var(--pu,1)); height: calc(40px * var(--pu,1)); flex: none;
  border-radius: calc(10px * var(--pu,1)); border: 1px solid var(--pline); background: var(--pdeep);
  display: flex; align-items: center; justify-content: center; font-size: calc(21px * var(--pu,1)); }
#homeUi .popRow .m { flex: 1; min-width: 0; }
#homeUi .popRow .m b { display: block; font-size: calc(14px * var(--pu,1)); font-weight: 600; color: var(--ptx);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .popRow .m .ln { display: flex; align-items: center; gap: calc(8px * var(--pu,1)); flex-wrap: wrap;
  font-size: calc(11px * var(--pu,1)); color: var(--pdim2); margin-top: calc(2px * var(--pu,1)); }
#homeUi .popRow .m .ln .d { border: 1px solid var(--pline); border-radius: calc(5px * var(--pu,1));
  padding: 0 calc(5px * var(--pu,1)); font-size: calc(10.5px * var(--pu,1)); color: var(--pdim); }
#homeUi .popRow .m .ln .exp { color: var(--pred2); font-weight: 700; }
#homeUi .popRow .m .ln .soon { color: var(--pks); }
#homeUi .popRow .pbar { height: calc(12px * var(--pu,1)); border-radius: calc(4px * var(--pu,1));
  background: var(--pdeep); border: 1px solid var(--pline2); overflow: hidden; margin-top: calc(4px * var(--pu,1)); }
#homeUi .popRow .pbar i { display: block; height: 100%; background: var(--pgreen); }
#homeUi .popRow .st { flex: none; font-size: calc(12px * var(--pu,1)); color: var(--pdim2); text-align: right; }
#homeUi .popRow .act { flex: none; font-size: calc(12px * var(--pu,1)); font-weight: 700;
  border: 1px solid var(--pgreen); color: var(--pine); background: rgba(47,143,99,.1);
  border-radius: calc(8px * var(--pu,1)); padding: calc(4px * var(--pu,1)) calc(11px * var(--pu,1)); }
#homeUi .popRow .act.gold { border-color: var(--pk); color: var(--pks); background: rgba(200,134,47,.1); }
#homeUi .popRow .act.grey { border-color: var(--pline); color: var(--pdim2); background: none; }
#homeUi .popRow .act.off { opacity: .45; }
#homeUi .popRow.expired { opacity: .58; }
#homeUi .popRow.on { border-color: var(--pk); box-shadow: inset 0 0 0 1px rgba(200,134,47,.3); }

/* --- 组件：属性行 / 对比块 / KV --- */
#homeUi .popAttr { flex: none; display: flex; align-items: center; gap: calc(10px * var(--pu,1));
  border-radius: calc(10px * var(--pu,1)); border: 1px solid var(--pline); background: var(--prow);
  padding: calc(6px * var(--pu,1)) calc(10px * var(--pu,1)); }
#homeUi .popAttr .ai { width: calc(34px * var(--pu,1)); height: calc(34px * var(--pu,1)); flex: none;
  border-radius: calc(8px * var(--pu,1)); border: 1px solid var(--pline); background: var(--pdeep);
  display: flex; align-items: center; justify-content: center; font-size: calc(19px * var(--pu,1)); }
#homeUi .popAttr .at { flex: 1; min-width: 0; font-size: calc(12.5px * var(--pu,1)); line-height: 1.4; color: var(--ptx); }
#homeUi .popAttr .at em { font-style: normal; color: var(--pks); font-weight: 700; }
#homeUi .popAttr .ab { flex: none; width: calc(34px * var(--pu,1)); height: calc(32px * var(--pu,1));
  border-radius: calc(8px * var(--pu,1)); border: 1px solid var(--pline); background: var(--pdeep); color: var(--pdim);
  font-size: calc(13px * var(--pu,1)); display: flex; align-items: center; justify-content: center; }
#homeUi .popAttr .abAct { flex: none; font-size: calc(12px * var(--pu,1)); font-weight: 700;
  border: 1px solid var(--pk); color: var(--pks); background: rgba(200,134,47,.1);
  border-radius: calc(8px * var(--pu,1)); padding: calc(4px * var(--pu,1)) calc(13px * var(--pu,1)); }
#homeUi .popAttr .abAct.info { border-color: #5aa7e8; color: #2c6f9e; background: rgba(90,167,232,.12); }
#homeUi .popAttr.empty { border-style: dashed; }
#homeUi .popAttr.empty .at { color: var(--pdim2); }
#homeUi .popCmp { flex: none; border: 1px solid var(--pline); border-radius: calc(10px * var(--pu,1)); overflow: hidden; }
#homeUi .popCmp .ch { padding: calc(6px * var(--pu,1)) 0; text-align: center;
  font-size: calc(11.5px * var(--pu,1)); color: var(--pdim); background: var(--pbg3); border-bottom: 1px solid var(--pline2); }
#homeUi .popCmp .cb { padding: calc(9px * var(--pu,1)) calc(12px * var(--pu,1)); background: var(--pdeep);
  display: flex; flex-direction: column; gap: calc(6px * var(--pu,1)); }
#homeUi .popCmp .cl { display: flex; align-items: center; justify-content: space-between; gap: calc(8px * var(--pu,1));
  font-size: calc(15px * var(--pu,1)); }
#homeUi .popCmp .cl .lbl { font-size: calc(12.5px * var(--pu,1)); color: var(--ptx); }
#homeUi .popCmp .cl .old { color: var(--pdim); font-weight: 700; }
#homeUi .popCmp .cl .new { color: var(--pks); font-weight: 700; }
#homeUi .popCmp .cl .arrow { color: var(--pgreen); font-size: calc(16px * var(--pu,1)); }
#homeUi .popKV { flex: none; display: flex; align-items: center; justify-content: space-between;
  gap: calc(10px * var(--pu,1)); padding: calc(3px * var(--pu,1)) calc(3px * var(--pu,1));
  font-size: calc(12.5px * var(--pu,1)); color: var(--pdim); border-bottom: 1px dashed var(--pline2); }
#homeUi .popKV b { color: var(--ptx); font-weight: 600; }
#homeUi .popKV.total { border-bottom: 0; padding-top: calc(9px * var(--pu,1)); }
#homeUi .popKV.total b { color: var(--pks); font-size: calc(17px * var(--pu,1)); }
#homeUi .popKV.free { border-bottom: 0; }

/* --- 组件：格子网格 / 卡片行 / 空态 --- */
#homeUi .popGrid { display: grid; gap: calc(7px * var(--pu,1)); }
#homeUi .popGrid.c3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
#homeUi .popGrid.c4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
#homeUi .popGrid.c5 { grid-template-columns: repeat(5, minmax(0,1fr)); }
#homeUi .popGrid i { aspect-ratio: 1; border-radius: calc(8px * var(--pu,1)); border: 1px solid var(--pline);
  background: var(--pdeep); display: flex; align-items: center; justify-content: center; font-style: normal;
  font-size: calc(18px * var(--pu,1)); position: relative; cursor: pointer; }
#homeUi .popGrid i .cnt { position: absolute; left: calc(2px * var(--pu,1)); bottom: calc(1px * var(--pu,1));
  font-size: calc(9px * var(--pu,1)); color: var(--ptx); background: var(--pbg);
  border-radius: calc(4px * var(--pu,1)); padding: 0 calc(3px * var(--pu,1)); }
#homeUi .popGrid i.sel { border-color: var(--pk); background: rgba(200,134,47,.12); }
#homeUi .popGrid i .ck { position: absolute; left: calc(2px * var(--pu,1)); top: calc(2px * var(--pu,1));
  font-size: calc(10px * var(--pu,1)); color: var(--pks); }
/* 星级条（_starRow 建）：逐颗星一个元素，才贴得上亮/空两件图。缺图时里面就是 ★/☆ 文本，
   尺寸仍按这里给（贴图槽从不写 inline 宽高），所以回退观感与贴图态一致 */
#homeUi .starRow { display: flex; gap: calc(3px * var(--pu,1)); justify-content: center; padding: calc(3px * var(--pu,1)) 0; }
#homeUi .starRow i { box-sizing: border-box; display: block; flex: none;
  width: calc(26px * var(--pu,1)); height: calc(26px * var(--pu,1));
  font-size: calc(20px * var(--pu,1)); line-height: calc(26px * var(--pu,1)); text-align: center;
  color: var(--pk); font-style: normal; }
#homeUi .popCardRow { flex: none; display: flex; gap: calc(10px * var(--pu,1)); justify-content: center; flex-wrap: wrap; }
#homeUi .popCard { width: calc(92px * var(--pu,1)); padding: calc(10px * var(--pu,1)) calc(6px * var(--pu,1));
  border-radius: calc(11px * var(--pu,1)); border: 2px solid var(--pk); background: rgba(200,134,47,.08);
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--pu,1));
  font-size: calc(12px * var(--pu,1)); color: var(--pdim); position: relative; }
#homeUi .popCard .gi { font-size: calc(32px * var(--pu,1)); }
#homeUi .popCard .nb { font-size: calc(10px * var(--pu,1)); border-radius: calc(5px * var(--pu,1));
  padding: 0 calc(6px * var(--pu,1)); background: var(--pred); color: #fff; }
#homeUi .popCard .nb.dup { background: var(--pline); color: var(--ptx); }
#homeUi .popEmpty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: calc(6px * var(--pu,1)); color: var(--pdim2); font-size: calc(13px * var(--pu,1)); text-align: center;
  min-height: calc(120px * var(--pu,1)); }
#homeUi .popEmpty .ei { font-size: calc(38px * var(--pu,1)); opacity: .75; }
#homeUi .popEmpty small { font-size: calc(11px * var(--pu,1)); color: var(--pdim2); opacity: .8; }

/* --- 组件：正文段 / 警示条 / S 型居中块 --- */
#homeUi .popBody { flex: none; display: flex; flex-direction: column; gap: calc(7px * var(--pu,1));
  font-size: calc(12.5px * var(--pu,1)); line-height: 1.7; color: var(--ptx); }
#homeUi .popBody p { margin: 0; }
#homeUi .popBody .sub { font-size: calc(11px * var(--pu,1)); color: var(--pdim); }
#homeUi .popWarn { flex: none; font-size: calc(11.5px * var(--pu,1)); color: var(--pred2);
  border: 1px dashed var(--pred); border-radius: calc(8px * var(--pu,1));
  padding: calc(5px * var(--pu,1)) calc(10px * var(--pu,1)); background: rgba(192,72,63,.06); }
#homeUi .popCenter { flex: none; display: flex; flex-direction: column; align-items: center;
  gap: calc(8px * var(--pu,1)); padding: calc(2px * var(--pu,1)) 0; }
#homeUi .popIcBig { width: calc(62px * var(--pu,1)); height: calc(62px * var(--pu,1));
  border-radius: calc(14px * var(--pu,1)); border: 1px solid var(--pline); background: var(--pdeep);
  display: flex; align-items: center; justify-content: center; font-size: calc(31px * var(--pu,1)); }
#homeUi .popDesc { font-size: calc(12.5px * var(--pu,1)); line-height: 1.6; color: var(--pdim); text-align: center; }
#homeUi .popHL { color: var(--pks); font-weight: 700; }

/* --- 组件：活跃度固定块（任务页顶栏：总览进度 + 宝箱横排） --- */
#homeUi .popAct { flex: 1 1 100%; display: flex; flex-direction: column; gap: calc(5px * var(--pu,1)); }
#homeUi .popAct .hd { display: flex; align-items: center; justify-content: space-between;
  font-size: calc(12px * var(--pu,1)); color: var(--ptx); }
#homeUi .popAct .hd b { color: var(--pks); }
#homeUi .popAct .bar { height: calc(12px * var(--pu,1)); border-radius: calc(4px * var(--pu,1));
  background: var(--pdeep); border: 1px solid var(--pline2); overflow: hidden; }
#homeUi .popAct .bar i { display: block; height: 100%; background: var(--pk); }
#homeUi .popAct .chs { display: flex; gap: calc(6px * var(--pu,1)); }
#homeUi .popAct .chs .ch { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center;
  gap: calc(1px * var(--pu,1)); border: 1px solid var(--pline); border-radius: calc(8px * var(--pu,1));
  padding: calc(4px * var(--pu,1)) calc(2px * var(--pu,1)); font-size: calc(10px * var(--pu,1));
  color: var(--pdim); cursor: pointer; }
#homeUi .popAct .chs .ch .ci { font-size: calc(16px * var(--pu,1)); }
#homeUi .popAct .chs .ch em { font-style: normal; font-size: calc(9px * var(--pu,1)); white-space: nowrap; }
#homeUi .popAct .chs .ch.ready { border-color: var(--pk); background: rgba(200,134,47,.1); color: var(--pks); }
#homeUi .popAct .chs .ch.done { opacity: .5; }

/* ================================================================
   英雄页骨架（布局稿 R2 · 青瓷浅色变体 / 原型 390px 框 × var(--pw)）
   选择条 38 / 角色区 grid 44|1fr|44|124 / 工具行 34 / 背包：头 30 + 滚动 + 说明 25 + 页签 34
   ================================================================ */
#homeUi .hot { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: calc(44px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); gap: 0; padding: 0;
  font-size: calc(11px * var(--pw,2.5)); font-weight: 700; color: inherit; background: none; border: none; cursor: pointer; }
#homeUi .hot .ic { display: block; width: calc(34px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5));
  font-size: calc(30px * var(--pw,2.5)); line-height: calc(34px * var(--pw,2.5)); text-align: center; }
#homeUi .hot small { font-weight: 400; line-height: calc(13px * var(--pw,2.5)); }
#homeUi .hot:active { filter: brightness(.85); }
#homeUi .screen.sHeroes { display: none; flex-direction: column; height: 100%; overflow: hidden;
  padding: 0; }
#homeUi .screen.sHeroes.on { display: flex; }
#homeUi .hero-roster { flex: none; height: calc(38px * var(--pw,2.5)); display: flex; align-items: center; justify-content: center;
  gap: calc(8px * var(--pw,2.5)); background: var(--c-scene-2); border-bottom: 1px solid var(--c-scene-edge); }
#homeUi .hero-roster .hpick { position: relative; flex: 1; min-width: 0; height: calc(34px * var(--pw,2.5)); display: flex;
  align-items: center; justify-content: center; gap: calc(3px * var(--pw,2.5)); padding: 0;
  font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); background: none; border: none; cursor: pointer; }
#homeUi .hero-roster .hpick .pic { width: calc(26px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5)); border-radius: 0;
  background-color: var(--c-scene-1); background-size: cover; }
#homeUi .hero-roster .hpick i { font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .hero-roster .hpick.on { background: none; box-shadow: inset 0 calc(-2px * var(--pw,2.5)) var(--c-gold); color: var(--c-gold-hi); font-weight: 700; }
#homeUi .hero-roster .hpick.lock .pic { filter: grayscale(1) brightness(.8); }
/* 青瓷层同口径（锁徽钉在立绘右上角、往里收 1px 不出格；content 由基准层那条给） */
#homeUi .hero-roster .hpick.lock .pic::after { right: calc(1px * var(--pw,2.5)); top: calc(1px * var(--pw,2.5));
  font-size: calc(11px * var(--pw,2.5)); }
#homeUi .hero-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
#homeUi .hero-stage { flex: none; position: relative; height: 38%; max-height: calc(263px * var(--pw,2.5)); min-height: calc(179px * var(--pw,2.5));
  display: grid; grid-template-columns: calc(44px * var(--pw,2.5)) minmax(0,1fr) calc(44px * var(--pw,2.5)) calc(124px * var(--pw,2.5));
  gap: calc(3px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(9px * var(--pw,2.5)) 0 calc(3px * var(--pw,2.5)); }
#homeUi .hero-quick { display: flex; flex-direction: column; justify-content: space-evenly; gap: calc(2px * var(--pw,2.5)); }
#homeUi .hero-quick .btn { min-width: calc(44px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); padding: 0;
  font-size: calc(9px * var(--pw,2.5)); gap: calc(1px * var(--pw,2.5)); border-radius: 0; box-shadow: none;
  background: var(--c-scene-1); border: 1px solid var(--c-scene-line); color: var(--c-cream-1); flex-direction: column; }
#homeUi .hero-quick .btn > span { font-size: calc(9px * var(--pw,2.5)); line-height: calc(11px * var(--pw,2.5)); }
#homeUi .hero-quick .btn .ic { width: calc(26px * var(--pw,2.5)); height: calc(26px * var(--pw,2.5)); font-size: calc(26px * var(--pw,2.5)); }
#homeUi .hero-quick .btn:disabled { opacity: .45; }
#homeUi .hero-quick .btn .questRed { position: absolute; top: calc(2px * var(--pw,2.5)); right: calc(3px * var(--pw,2.5)); }
#homeUi .hero-figure { position: relative; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
/* 立绘脚下那块"影子"原先是浅灰椭圆（#bcbcbc）——浅页上它读成投影，暗页上读成一盘牛奶。
   改成比场景更暗的一档，收边去掉（暗底上描边会把椭圆轮廓钉死，反而更假） */
#homeUi .hero-figure::after { content: ''; position: absolute; bottom: calc(26px * var(--pw,2.5)); height: calc(17px * var(--pw,2.5));
  left: 4%; right: 4%; border-radius: 50%; background: var(--c-scene-edge); border: none; z-index: 0; }
#homeUi .hero-figure .halo, #homeUi .hero-figure .halo2 { display: none; }
#homeUi .hero-figure .heroEmoji { width: 100%; height: calc(100% - calc(50px * var(--pw,2.5))); max-height: calc(206px * var(--pw,2.5));
  z-index: 2; }
#homeUi .hero-name { position: absolute; left: calc(5px * var(--pw,2.5)); top: calc(1px * var(--pw,2.5)); z-index: 3;
  font-size: calc(13px * var(--pw,2.5)); font-weight: 700; color: var(--c-text-hi); }
#homeUi .hero-name small { font-size: calc(9px * var(--pw,2.5)); margin-left: calc(4px * var(--pw,2.5)); color: var(--c-text-dim); }
/* 行内星级在青瓷层：同一条尺寸口径换成 --pw（--hs 在本层没有值，只写上面那条会退回 1 倍、星比字还小） */
#homeUi .hero-name small .starIn { vertical-align: calc(-1px * var(--pw,2.5));
  width: calc(11px * var(--pw,2.5)); height: calc(11px * var(--pw,2.5));
  font-size: calc(11px * var(--pw,2.5)); line-height: calc(11px * var(--pw,2.5)); }
#homeUi .powerBadge { position: relative; z-index: 2; flex: none; width: 100%; height: calc(27px * var(--pw,2.5)); display: flex;
  align-items: center; justify-content: center; gap: calc(4px * var(--pw,2.5)); background: none; border: none;
  font-size: calc(12px * var(--pw,2.5)); line-height: calc(27px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .powerBadge strong { font-size: calc(17px * var(--pw,2.5)); margin-left: calc(6px * var(--pw,2.5)); color: var(--c-gold-hi); }
#homeUi .powerBadge .pwInfo { position: absolute; right: 0; width: calc(20px * var(--pw,2.5)); height: calc(20px * var(--pw,2.5));
  border: 1px solid var(--c-scene-line); border-radius: 50%; background: none; color: var(--c-text-dim); font-size: calc(12px * var(--pw,2.5)); cursor: pointer; }
#homeUi .equipment { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, minmax(0,1fr));
  gap: calc(5px * var(--pw,2.5)); padding-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .equipment .slot { width: 100%; height: auto; min-height: 0; position: relative; border-radius: 0;
  border: 1px solid var(--c-scene-line); box-shadow: none; background: var(--c-scene-1);
  display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: var(--c-text); }
#homeUi .equipment .slot .sname { position: absolute; top: calc(2px * var(--pw,2.5)); left: calc(3px * var(--pw,2.5));
  transform: none; font-size: calc(9px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .equipment .slot .slv { position: absolute; right: calc(3px * var(--pw,2.5)); bottom: calc(2px * var(--pw,2.5));
  font-size: calc(10px * var(--pw,2.5)); border: none; color: var(--c-gold-hi); font-weight: 700; }
#homeUi .equipment .slot .tier { position: absolute; left: calc(4px * var(--pw,2.5)); bottom: calc(3px * var(--pw,2.5));
  font-size: calc(8px * var(--pw,2.5)); color: var(--c-text-mute); }
#homeUi .equipment .slot.dropOk { border-color: #4fd08a; box-shadow: inset 0 0 0 2px rgba(79,208,138,.45); }
#homeUi .equipment .slot.over { background: var(--c-scene-3); }
#homeUi .equipment .slot.dropBad { opacity: .3; }
#homeUi .hero-tools { flex: none; height: calc(34px * var(--pw,2.5)); display: flex; align-items: center; justify-content: space-between;
  gap: calc(6px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); border-bottom: 1px solid var(--c-scene-edge); }
#homeUi .hero-tools .loadouts { display: flex; align-items: center; gap: calc(3px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .hero-tools .loadouts b { color: var(--c-gold-hi); font-size: calc(12px * var(--pw,2.5)); margin-right: calc(3px * var(--pw,2.5)); }
#homeUi .hero-tools .loadouts .squadEntry { min-height: calc(28px * var(--pw,2.5)); padding: 0 calc(8px * var(--pw,2.5));
  background: var(--c-scene-1); border: 1px solid var(--c-scene-line); color: var(--c-cream-1); font-size: calc(10px * var(--pw,2.5)); cursor: pointer; }
#homeUi .hero-tools .loadouts .squadEntry.active { background: var(--c-scene-3); font-weight: 700; color: var(--c-gold-hi); }
#homeUi .hero-tools .hot { flex-direction: row; gap: calc(3px * var(--pw,2.5)); min-width: calc(50px * var(--pw,2.5));
  min-height: calc(30px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .hero-tools .hot .ic { width: calc(23px * var(--pw,2.5)); height: calc(23px * var(--pw,2.5)); font-size: calc(21px * var(--pw,2.5));
  line-height: calc(23px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bagBar { flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; background: var(--c-scene-1);
  margin: 0; padding: 0; border-radius: 0; border-top: 1px solid var(--c-scene-edge); position: static; height: auto; max-height: none; }
#homeUi .screen.sHeroes .bag-head { flex: none; height: calc(30px * var(--pw,2.5)); display: flex; align-items: center;
  justify-content: space-between; padding: 0 calc(10px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); color: var(--c-text); }
#homeUi .screen.sHeroes .bag-head small { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .screen.sHeroes .bag-head-right { display: flex; align-items: center; gap: calc(7px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bag-head select { font-size: calc(10px * var(--pw,2.5)); background: transparent; color: var(--c-text);
  border: none; height: calc(28px * var(--pw,2.5)); max-width: calc(82px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bag-head .hot { flex-direction: row; gap: calc(3px * var(--pw,2.5)); min-height: calc(28px * var(--pw,2.5));
  min-width: calc(44px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .screen.sHeroes .bag-head .hot .ic { width: calc(18px * var(--pw,2.5)); height: calc(18px * var(--pw,2.5));
  font-size: calc(16px * var(--pw,2.5)); line-height: calc(18px * var(--pw,2.5)); }
/* 青瓷层的检索框：暗场景上它是一块"白纸"，收成凹暗格（同 select 的处理） */
#homeUi .uiSearch { height: calc(28px * var(--pw,2.5)); padding: 0 calc(7px * var(--pw,2.5));
  max-width: calc(120px * var(--pw,2.5)); background: var(--c-scene-2); border-color: var(--c-scene-line); }
#homeUi .uiSearch i { width: calc(14px * var(--pw,2.5)); height: calc(14px * var(--pw,2.5));
  font-size: calc(14px * var(--pw,2.5)); }
#homeUi .uiSearch input { width: calc(72px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5));
  color: var(--c-text); background: transparent; }
#homeUi .screen.sHeroes .bag-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  overscroll-behavior: contain; scrollbar-width: thin; padding: calc(3px * var(--pw,2.5)) calc(6px * var(--pw,2.5)) calc(7px * var(--pw,2.5));
  touch-action: pan-y; }
#homeUi .screen.sHeroes .bag-scroll::-webkit-scrollbar { width: calc(6px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bag-scroll::-webkit-scrollbar-thumb { background: var(--c-scene-line); border-radius: calc(3px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bag-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr));
  gap: calc(5px * var(--pw,2.5)); align-items: start; max-height: none; overflow: visible; }
#homeUi .screen.sHeroes .bag-grid .bcell { aspect-ratio: 1; height: auto; min-width: 0; border-radius: 0;
  font-size: calc(18px * var(--pw,2.5)); border: 1px solid var(--c-scene-line); background: var(--c-scene-2); color: var(--c-text);
  display: grid; place-items: center; }
#homeUi .screen.sHeroes .bag-grid .bcell em { right: calc(2px * var(--pw,2.5)); bottom: calc(1px * var(--pw,2.5));
  font-size: calc(9px * var(--pw,2.5)); background: var(--c-scene-edge); color: var(--c-text-dim); padding: 0 calc(1px * var(--pw,2.5)); }
/* 稀有度原先靠"越稀越浅"的灰阶区分（#bdbdbd→#e2e2e2）——暗底上这条轴整个反了，
   改成只留边框色相（青瓷层 1567 那四条蓝/紫/琥珀/红本来就是稀有度语言），底统一 */
#homeUi .screen.sHeroes .bag-grid .bcell.r3 { background: var(--c-scene-2); border: 2px solid #5a9ad0; }
#homeUi .screen.sHeroes .bag-grid .bcell.r4 { background: var(--c-scene-2); border: 1px solid #a678d8; box-shadow: inset 0 0 0 2px rgba(166,120,216,.28); }
#homeUi .screen.sHeroes .bag-grid .bcell.r5 { background: var(--c-scene-2); border-color: var(--c-amber-dk); box-shadow: 0 0 6px rgba(232,137,46,.4); }
#homeUi .screen.sHeroes .bag-grid .bcell.r6 { border-color: var(--c-danger-dk); box-shadow: 0 0 7px rgba(224,72,72,.5); }
#homeUi .bag-detail { flex: none; height: calc(25px * var(--pw,2.5)); display: flex; align-items: center; justify-content: space-between;
  gap: calc(6px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); background: var(--c-scene-2); border-top: 1px solid var(--c-scene-edge);
  font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); white-space: nowrap; }
#homeUi .bag-detail b { font-weight: 400; overflow: hidden; text-overflow: ellipsis; }
#homeUi .flat-tabs { flex: none; height: calc(34px * var(--pw,2.5)); display: flex; background: var(--c-scene-2); border-top: 1px solid var(--c-scene-edge); }
#homeUi .flat-tabs > button { position: relative; flex: 1; min-width: 0; font-size: calc(12px * var(--pw,2.5)); color: var(--c-text-dim);
  background: none; border: none; white-space: nowrap; cursor: pointer; }
#homeUi .flat-tabs > button.on { color: var(--c-gold-hi); font-weight: 700; background: none; box-shadow: inset 0 calc(-3px * var(--pw,2.5)) var(--c-gold); }
#homeUi .flat-tabs > button.on::before { content: ''; position: absolute; top: 0; left: calc(50% - calc(4px * var(--pw,2.5)));
  border: calc(4px * var(--pw,2.5)) solid transparent; border-top-color: var(--c-gold); }

/* ================================================================
   行动页骨架（布局稿 R2 · 青瓷浅色变体）
   标题 43 / 日常四快捷 66 / 挑战场(撑满) / 资源副本 113 / 远征行 78 / 页脚三快捷 49
   ================================================================ */
#homeUi .screen.sAction { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sAction.on { display: flex; }
#homeUi .action-title { flex: none; height: calc(43px * var(--pw,2.5)); display: flex; align-items: center;
  justify-content: space-between; padding: calc(6px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); }
#homeUi .action-title h1 { font-size: calc(17px * var(--pw,2.5)); color: var(--c-gold-hi); }
#homeUi .action-title .actNum { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .action-daily { flex: none; height: calc(66px * var(--pw,2.5)); display: grid; grid-template-columns: repeat(4, 1fr);
  align-items: center; gap: calc(5px * var(--pw,2.5)); padding: 0 calc(7px * var(--pw,2.5)); border-bottom: 1px solid var(--c-scene-edge); }
#homeUi .action-daily .hot { height: calc(59px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .action-daily .hot .ic { width: calc(31px * var(--pw,2.5)); height: calc(31px * var(--pw,2.5));
  font-size: calc(28px * var(--pw,2.5)); line-height: calc(31px * var(--pw,2.5)); }
#homeUi .action-daily .hot small { font-size: calc(9px * var(--pw,2.5)); color: var(--c-cream-2); line-height: calc(11px * var(--pw,2.5)); }
#homeUi .action-daily .hot .questRed { position: absolute; top: calc(2px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); }
/* 挑战场：原先整块 #d7d7d7 浅灰地 + 一圈 #b8b8b8 椭圆"竞技场围栏"，在暗页上是全屏最大的一块白纸。
   地面收成比场景更暗一档（它是"地"，不是"卡"），围栏线换成暗场景细线 */
#homeUi .challenge-ground { flex: 1; min-height: calc(105px * var(--pw,2.5)); position: relative; display: grid;
  grid-template-columns: 1fr 1fr; align-items: center; padding: 0 calc(14px * var(--pw,2.5)); gap: calc(15px * var(--pw,2.5));
  background: var(--c-scene-edge); }
/* 竞技场围栏那圈椭圆在浅灰地上是"场地"，在暗地上两张入口卡盖住之后只剩两段露头的弧线，
   读成两条画歪的线（用户点的"多出的线条"）。整圈撤掉，挑战场靠两块入口卡自己立住 */
#homeUi .challenge-ground::before { content: none; }
#homeUi .entry { position: relative; height: 95%; display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-width: 0; gap: 0; font-size: calc(13px * var(--pw,2.5)); color: var(--c-cream-1);
  background: none; border: none; cursor: pointer; }
#homeUi .entry .ic { width: 90%; height: 65%; max-height: calc(190px * var(--pw,2.5)); font-size: calc(76px * var(--pw,2.5));
  line-height: 1; display: grid; place-items: center; }
/* 同 .building strong：入口卡名原先垫一块实色 chip，落在 entry_card 板上就是黑膏药，改成投影托字 */
#homeUi .entry h2 { font-size: calc(15px * var(--pw,2.5)); min-width: calc(105px * var(--pw,2.5));
  padding: calc(3px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); background: none; color: var(--c-gold-hi);
  text-shadow: 0 1px 3px rgba(4,8,12,.9); text-align: center; }
#homeUi .entry small { font-size: calc(10px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .entry.locked { color: var(--c-text-mute); }
#homeUi .entry.locked .ic { opacity: .5; filter: grayscale(.7); }
#homeUi .entry .questRed { position: absolute; top: calc(6px * var(--pw,2.5)); right: calc(10% + calc(4px * var(--pw,2.5))); }
#homeUi .dungeons { flex: none; height: calc(113px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  border-top: 1px solid var(--c-scene-edge); background: var(--c-scene-2); }
#homeUi .section-label { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); color: var(--c-text-hi);
  padding: calc(3px * var(--pw,2.5)) calc(1px * var(--pw,2.5)) calc(8px * var(--pw,2.5)); }
#homeUi .section-label small { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .dungeon-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(5px * var(--pw,2.5)); height: calc(82px * var(--pw,2.5)); }
#homeUi .dungeon-row .hot { font-size: calc(11px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .dungeon-row .hot .ic { width: calc(40px * var(--pw,2.5)); height: calc(40px * var(--pw,2.5));
  font-size: calc(36px * var(--pw,2.5)); line-height: calc(40px * var(--pw,2.5)); }
#homeUi .dungeon-row .hot small { font-size: calc(9px * var(--pw,2.5)); color: var(--c-cream-2); line-height: calc(11px * var(--pw,2.5)); }
#homeUi .dungeon-row .hot.off { opacity: .45; }
#homeUi .dungeon-row .hot .questRed { position: absolute; top: calc(2px * var(--pw,2.5)); right: calc(8px * var(--pw,2.5)); }
#homeUi .expedition { flex: none; height: calc(78px * var(--pw,2.5)); position: relative; display: flex; align-items: center;
  gap: calc(9px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(12px * var(--pw,2.5));
  border-top: 1px solid var(--c-scene-edge); background: var(--c-scene-1); }
#homeUi .expedition > .ic { width: calc(68px * var(--pw,2.5)); height: calc(60px * var(--pw,2.5));
  font-size: calc(50px * var(--pw,2.5)); line-height: calc(60px * var(--pw,2.5)); text-align: center; }
#homeUi .expedition-text { flex: 1; min-width: 0; font-size: calc(11px * var(--pw,2.5)); color: var(--c-text); }
#homeUi .expedition-text b { display: block; font-size: calc(13px * var(--pw,2.5)); color: var(--c-gold-hi); }
#homeUi .expedition-text small { display: block; margin-top: calc(4px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5));
  color: var(--c-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .expedition .hot { width: calc(53px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .expedition .questRed { position: absolute; top: calc(8px * var(--pw,2.5)); right: calc(64px * var(--pw,2.5)); }
#homeUi .action-footer { flex: none; height: calc(49px * var(--pw,2.5)); display: flex; justify-content: space-around;
  align-items: center; }
#homeUi .action-footer .hot { flex-direction: row; gap: calc(4px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .action-footer .hot .ic { width: calc(27px * var(--pw,2.5)); height: calc(27px * var(--pw,2.5));
  font-size: calc(24px * var(--pw,2.5)); line-height: calc(27px * var(--pw,2.5)); }
#homeUi .action-footer .hot .questRed { position: absolute; top: 0; right: calc(4px * var(--pw,2.5)); }

/* ================================================================
   商店页骨架（布局稿 R2 · 青瓷浅色变体）
   货架头 76 / 滚动货架（主推 offer 177 + 分区标签 + 三列货架）/ 底部页签 34
   ================================================================ */
#homeUi .screen.sShop { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sShop.on { display: flex; }
#homeUi .shop-mast { flex: none; height: calc(76px * var(--pw,2.5)); display: flex; align-items: center;
  justify-content: space-between; padding: calc(6px * var(--pw,2.5)) calc(16px * var(--pw,2.5)); background: var(--c-scene-2);
  border-bottom: 1px solid var(--c-scene-edge); }
#homeUi .shop-mast h1 { font-size: calc(23px * var(--pw,2.5)); line-height: calc(28px * var(--pw,2.5)); color: var(--c-gold-hi); }
#homeUi .shop-mast p { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .shop-mast .hot { font-size: calc(10px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .shop-mast .hot .ic { width: calc(34px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5));
  font-size: calc(30px * var(--pw,2.5)); line-height: calc(34px * var(--pw,2.5)); }
#homeUi .shop-mast .hot.dotOn::after { content: ''; position: absolute; top: calc(2px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5));
  width: calc(7px * var(--pw,2.5)); height: calc(7px * var(--pw,2.5)); border-radius: 50%; background: var(--c-danger); border: 1px solid var(--c-scene-1); }
#homeUi .shop-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;
  scrollbar-width: thin; padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); }
#homeUi .shop-scroll::-webkit-scrollbar { width: calc(6px * var(--pw,2.5)); }
#homeUi .shop-scroll::-webkit-scrollbar-thumb { background: var(--c-scene-line); border-radius: calc(3px * var(--pw,2.5)); }
#homeUi .shop-offer { position: relative; min-height: calc(177px * var(--pw,2.5)); gap: 0; display: grid;
  grid-template-columns: 42% 1fr; grid-template-rows: 1fr calc(39px * var(--pw,2.5)); background: var(--c-scene-2);
  border: none; margin-bottom: calc(9px * var(--pw,2.5)); padding: calc(8px * var(--pw,2.5)); cursor: pointer; }
#homeUi .rcard { grid-template-columns: 42% 1fr; }
#homeUi .offer-art { grid-row: 1; align-self: stretch; min-height: calc(110px * var(--pw,2.5)); display: grid; place-items: center;
  font-size: calc(64px * var(--pw,2.5)); color: var(--c-text-mute); background-color: var(--c-scene-2); background-size: cover;
  background-position: center 45%; overflow: hidden; }
#homeUi .offer-copy { align-self: center; padding: 0 calc(3px * var(--pw,2.5)); min-width: 0; }
#homeUi .offer-copy h2 { font-size: calc(19px * var(--pw,2.5)); line-height: 1.6; color: var(--c-gold-hi); }
#homeUi .offer-copy p { font-size: calc(11px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); color: var(--c-text); }
#homeUi .offer-copy strong { font-size: calc(16px * var(--pw,2.5)); color: var(--c-text-hi); }
#homeUi .offer-copy small { display: block; margin-top: calc(3px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .offer-copy .rcBar { height: calc(6px * var(--pw,2.5)); background: var(--c-scene-edge); border: none;
  margin-top: calc(5px * var(--pw,2.5)); overflow: hidden; }
#homeUi .offer-copy .rcBar i { display: block; height: 100%; width: 0; background: var(--c-gold); }
#homeUi .offer-copy .rcDetail { margin-top: calc(5px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim);
  background: none; border: none; text-decoration: underline; cursor: pointer; }
#homeUi .offer-buttons { grid-column: 1 / -1; display: grid; grid-template-columns: calc(44px * var(--pw,2.5)) 1fr 1fr;
  gap: calc(8px * var(--pw,2.5)); align-items: center; }
#homeUi .offer-buttons .hot { min-height: calc(34px * var(--pw,2.5)); font-size: calc(9px * var(--pw,2.5));
  line-height: calc(11px * var(--pw,2.5)); color: var(--c-cream-1); }
#homeUi .offer-buttons .hot .ic { width: calc(23px * var(--pw,2.5)); height: calc(23px * var(--pw,2.5));
  font-size: calc(20px * var(--pw,2.5)); line-height: calc(23px * var(--pw,2.5)); }
#homeUi .offer-buttons .game-button { font-size: calc(12px * var(--pw,2.5)); line-height: calc(14px * var(--pw,2.5));
  min-height: calc(34px * var(--pw,2.5)); background: var(--c-scene-2); border: 1px solid var(--c-scene-line); color: var(--c-cream-1);
  box-shadow: none; font-weight: 700; padding: calc(3px * var(--pw,2.5)) calc(8px * var(--pw,2.5));
  clip-path: polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px); }
#homeUi .offer-buttons .game-button.major { background: var(--c-gold); color: var(--c-navy-7); border-color: var(--c-gold-dk);
  box-shadow: none; }
#homeUi .offer-buttons .game-button:disabled { opacity: .45; }
#homeUi .offer-buttons small { display: block; font-size: calc(9px * var(--pw,2.5)); color: inherit; }
#homeUi .goods { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: calc(7px * var(--pw,2.5)); }
#homeUi .good { border: 1px solid var(--c-scene-line); background: var(--c-scene-1); min-height: calc(115px * var(--pw,2.5)); position: relative;
  display: flex; flex-direction: column; align-items: center; padding: calc(5px * var(--pw,2.5)) calc(4px * var(--pw,2.5));
  gap: calc(3px * var(--pw,2.5)); }
#homeUi .good > .gIc { width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5));
  font-size: calc(38px * var(--pw,2.5)); line-height: calc(44px * var(--pw,2.5)); display: grid; place-items: center; text-align: center; }
#homeUi .good .gName { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text); text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
#homeUi .good .gTag { font-size: calc(9px * var(--pw,2.5)); color: var(--c-text-dim); text-align: center; }
#homeUi .good .gBuy { width: 100%; font-size: calc(10px * var(--pw,2.5)); min-height: calc(27px * var(--pw,2.5));
  margin-top: calc(2px * var(--pw,2.5)); background: var(--c-scene-2); border: 1px solid var(--c-scene-line); color: var(--c-gold-hi); font-weight: 700;
  box-shadow: none;
  clip-path: polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px); }
#homeUi .good .gHot { position: absolute; top: calc(2px * var(--pw,2.5)); right: calc(3px * var(--pw,2.5));
  font-size: calc(9px * var(--pw,2.5)); color: var(--c-gold); }

/* ================================================================
   基地页骨架（布局稿 R2 · 青瓷浅色变体）
   头行 37 / 营地地图（路面底纹 + 2×4 建筑格，偶数列下沉 9px）/ 局外强化条 / 底行 42
   ================================================================ */
#homeUi .screen.sBase { display: none; flex-direction: column; height: 100%; overflow: hidden; padding: 0; }
#homeUi .screen.sBase.on { display: flex; }
#homeUi .base-head { flex: none; height: calc(37px * var(--pw,2.5)); display: flex; align-items: center;
  justify-content: space-between; padding: 0 calc(12px * var(--pw,2.5)); }
#homeUi .base-head h1 { font-size: calc(16px * var(--pw,2.5)); color: var(--c-gold-hi); }
#homeUi .base-head small { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .base-map { position: relative; flex: 1; min-height: 0; overflow: hidden; }
#homeUi .map-roads { position: absolute; inset: 0; opacity: .55; pointer-events: none; }
#homeUi .map-roads svg { display: block; width: 100%; height: 100%; }
#homeUi .base-buildings { position: absolute; inset: 0 calc(6px * var(--pw,2.5)) calc(15px * var(--pw,2.5));
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, minmax(0,1fr));
  column-gap: calc(15px * var(--pw,2.5)); }
#homeUi .building { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 0; font-size: calc(12px * var(--pw,2.5)); background: none; border: none; color: var(--c-text); cursor: pointer; }
#homeUi .building .ic { height: calc(100% - calc(29px * var(--pw,2.5))); max-height: calc(118px * var(--pw,2.5));
  width: 85%; max-width: calc(135px * var(--pw,2.5)); font-size: calc(62px * var(--pw,2.5));
  display: grid; place-items: center; line-height: 1; }
/* 建筑名原先垫一块实色 chip（浅页 #b9b9b9 / 暗页 --c-scene-1）——贴在棕木箱板上就是一块黑膏药，
   正是用户点的"方块感"。名字直接落在板上，用投影拉开与板面的对比，不再自带底 */
#homeUi .building strong { position: relative; background: none; color: var(--c-gold-hi);
  text-shadow: 0 1px 3px rgba(4,8,12,.9);
  padding: calc(2px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  font-size: calc(12px * var(--pw,2.5)); line-height: calc(16px * var(--pw,2.5)); font-weight: 700; }
#homeUi .building small { font-size: calc(9px * var(--pw,2.5)); line-height: calc(12px * var(--pw,2.5)); color: var(--c-text-dim); }
#homeUi .building:nth-child(even) { transform: translateY(calc(9px * var(--pw,2.5))); }
#homeUi .building.locked .ic { opacity: .38; }
#homeUi .building.locked strong { color: var(--c-text-mute); background: none; }
#homeUi .building .questRed { position: absolute; right: calc(-3px * var(--pw,2.5)); top: calc(1px * var(--pw,2.5)); }
#homeUi .base-meta { flex: none; height: calc(116px * var(--pw,2.5)); display: grid; grid-template-columns: repeat(4, 1fr);
  gap: calc(5px * var(--pw,2.5)); padding: 0 calc(8px * var(--pw,2.5)) calc(6px * var(--pw,2.5)); }
#homeUi .base-meta .bcard { border: 1px solid var(--c-scene-line); background: var(--c-scene-1); display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(2px * var(--pw,2.5)); padding: calc(4px * var(--pw,2.5)); min-width: 0; }
#homeUi .base-meta .bIc { font-size: calc(26px * var(--pw,2.5)); line-height: 1; }
#homeUi .base-meta .bName { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text); text-align: center; white-space: nowrap; }
#homeUi .base-meta .bName span { color: var(--c-text-dim); margin-left: calc(2px * var(--pw,2.5)); }
#homeUi .base-meta .bDesc { font-size: calc(9px * var(--pw,2.5)); color: var(--c-text-dim); text-align: center; line-height: calc(11px * var(--pw,2.5)); }
#homeUi .base-meta .game-button { width: 100%; font-size: calc(9px * var(--pw,2.5)); min-height: calc(24px * var(--pw,2.5));
  background: var(--c-scene-2); border: 1px solid var(--c-scene-line); color: var(--c-cream-1); font-weight: 700;
  box-shadow: none;
  clip-path: polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px); }
#homeUi .base-bottom { flex: none; height: calc(42px * var(--pw,2.5)); display: flex; justify-content: space-between;
  align-items: center; padding: 0 calc(13px * var(--pw,2.5)); border-top: 1px solid var(--c-scene-edge); background: var(--c-scene-2); }
#homeUi .base-bottom small { font-size: calc(10px * var(--pw,2.5)); color: var(--c-text-dim); }

/* ---- 排版收尾（对齐布局稿）：稿里 h1/h2/h3/p 外边距为零，UA 默认 margin 会把稿定高度的条带撑高 ---- */
#homeUi .topbar h1, #homeUi .topbar h2, #homeUi .topbar h3, #homeUi .topbar p,
#homeUi .screen.sShop h1, #homeUi .screen.sShop h2, #homeUi .screen.sShop h3, #homeUi .screen.sShop p,
#homeUi .screen.sHeroes h1, #homeUi .screen.sHeroes h2, #homeUi .screen.sHeroes h3, #homeUi .screen.sHeroes p,
#homeUi .screen.sStage h1, #homeUi .screen.sStage h2, #homeUi .screen.sStage h3, #homeUi .screen.sStage p,
#homeUi .screen.sAction h1, #homeUi .screen.sAction h2, #homeUi .screen.sAction h3, #homeUi .screen.sAction p,
#homeUi .screen.sBase h1, #homeUi .screen.sBase h2, #homeUi .screen.sBase h3, #homeUi .screen.sBase p { margin: 0; }
#homeUi .flat-tabs, #homeUi .shopTabs { margin: 0; }

/* ---- 与布局稿对齐（补齐稿的全局盒模型 + 底导高度）----
   布局稿用 *{box-sizing:border-box} 且以 390 画框等比；游戏历史样式是 content-box，
   单独给五页与通栏补上 border-box，否则 height + padding 会把每条条带撑高 10px 左右。 */
#homeUi .topbar *, #homeUi .tabbar, #homeUi .tabbar *, #homeUi .safeBand,
#homeUi .screen.sShop, #homeUi .screen.sShop *, #homeUi .screen.sHeroes, #homeUi .screen.sHeroes *,
#homeUi .screen.sStage, #homeUi .screen.sStage *, #homeUi .screen.sAction, #homeUi .screen.sAction *,
#homeUi .screen.sBase, #homeUi .screen.sBase * { box-sizing: border-box; }
/* 顶部安全区条：稿 .safe 32（手机版 30 + 状态栏安全区），信息栏内容随之下移，
   刘海/胶囊不再压住头像与资源行。桌面无安全区，条带仍按稿占 32。 */
#homeUi .safeBand { margin: 0; }
/* 底导：稿 .nav 70px（含 2px 上边线 + 4px 下内边距），此前按 430 基准写大了 */
#homeUi .tabbar { height: calc(66px * var(--pw,2.5) + var(--sab,0px)); min-height: 0;
  padding-bottom: calc(2px * var(--pw,2.5) + var(--sab,0px)); }

/* ---- 收口：与布局稿逐条对齐（390 画框基准，border-box）---- */
/* 底导：稿 .nav{height:70px;border-top:2px;padding:0 3px 4px} */
#homeUi .tabbar { height: calc(70px * var(--pw,2.5) + var(--sab,0px)); min-height: 0;
  padding-bottom: calc(4px * var(--pw,2.5) + var(--sab,0px)); }
/* 商店商品卡：稿 .good{padding:5px 4px;gap:3px;min-height:115px} + 44 图标 + 27 按钮 */
#homeUi .screen.sShop .good { padding: calc(5px * var(--pw,2.5)) calc(4px * var(--pw,2.5));
  gap: calc(3px * var(--pw,2.5)); min-height: calc(115px * var(--pw,2.5)); }
#homeUi .screen.sShop .good > .gIc { width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); font-size: calc(40px * var(--pw,2.5)); }
#homeUi .screen.sShop .good .gName { font-size: calc(10px * var(--pw,2.5)); line-height: calc(12px * var(--pw,2.5)); }
#homeUi .screen.sShop .good .gTag { font-size: calc(9px * var(--pw,2.5)); line-height: calc(11px * var(--pw,2.5)); margin: 0; min-height: 0; }
#homeUi .screen.sShop .good .gBuy { min-height: calc(27px * var(--pw,2.5)); height: calc(27px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); }
/* 护送页章头条：只留章节名（45px，h1 19/23 + small 10/13），翻页箭头已移入场景 */
#homeUi .screen.sStage .chapter-head { height: calc(45px * var(--pw,2.5)); gap: calc(16px * var(--pw,2.5)); }
#homeUi .screen.sStage .chapter-head h1 { font-size: calc(19px * var(--pw,2.5)); line-height: calc(23px * var(--pw,2.5)); }
#homeUi .screen.sStage .chapter-head small { font-size: calc(10px * var(--pw,2.5)); line-height: calc(13px * var(--pw,2.5)); margin-top: 0; }
/* 关卡场景：两侧快捷列在 3px 贴边占 49px，场景左右让出 56px，列与场景不再互压 */
#homeUi .screen.sStage .stage-scene { inset: 6% calc(56px * var(--pw,2.5)) 0; }
/* 翻页器落在场景内 4px：场景左沿 56px → 箭头 60px 起 44px 宽 */
#homeUi .screen.sStage .stage > .arrow { width: calc(44px * var(--pw,2.5)); height: calc(42px * var(--pw,2.5));
  font-size: calc(25px * var(--pw,2.5)); }
#homeUi .screen.sStage .stage > .arrow.l { left: calc(60px * var(--pw,2.5)); }
#homeUi .screen.sStage .stage > .arrow.r { right: calc(60px * var(--pw,2.5)); }

/* ---- 英雄页逐条对齐布局稿 ----
   稿里 .hero-roster/.hero-stage/.hero-tools/.bag-section 都是 .screen 的直接子元素，
   .hero-stage 的 38% 是按整屏算的（257）；游戏多包了一层 .hero-body，% 变成按 641 算（243）会矮 15px。
   display:contents 让这层包壳不产生盒子，子元素回到整屏的 flex 流里，比例基准与稿一致。 */
#homeUi .screen.sHeroes .hero-body { display: contents; }
/* 英雄条：稿 .hero-roster button 是横向（图标在左、名字在右，gap 3），图标 26×28 不被压 */
#homeUi .screen.sHeroes .hero-roster .hpick { flex-direction: row; }
#homeUi .screen.sHeroes .hero-roster .hpick .pic { flex: none; width: calc(26px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5)); }
/* 装备槽主图标：稿 .equip-slot > .ic 占 65%×(100%-24px)、上限 47 —— 表情图标按字号对齐这个体量 */
#homeUi .screen.sHeroes .equipment .slot > span:not(.sname):not(.slv):not(.tier) { font-size: calc(30px * var(--pw,2.5)); line-height: 1; }
/* 背包头右侧：稿 select / .hot 都是 28 高（不掉出 30 的头部条） */
#homeUi .screen.sHeroes .bag-head-right { align-items: center; height: calc(28px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bag-head .hot { height: calc(28px * var(--pw,2.5)); min-height: calc(28px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .bag-head select { height: calc(28px * var(--pw,2.5)); }
/* 背包页签：稿 .flat-tabs button 撑满 34 的条带，容器无外边距（贴底导航） */
#homeUi .screen.sHeroes .bagTabs { margin: 0; gap: 0; }
#homeUi .screen.sHeroes .bagTabs button { height: calc(34px * var(--pw,2.5)); }
/* 编队席：稿 .loadouts button 是 29×28 的小方块（标签 + 一排四席） */
#homeUi .screen.sHeroes .hero-tools .loadouts { height: calc(30px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .hero-tools .loadouts b { flex: none; white-space: nowrap; }
#homeUi .screen.sHeroes .hero-tools .loadouts b small { font-size: calc(9px * var(--pw,2.5)); font-weight: 400;
  color: var(--c-text-dim); margin-left: calc(3px * var(--pw,2.5)); }
#homeUi .screen.sHeroes .hero-tools .loadouts .squadEntry { flex: none; min-width: calc(29px * var(--pw,2.5));
  height: calc(28px * var(--pw,2.5)); padding: 0 calc(4px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); }
/* ---- 板子到位之后，压在暗板上的字要翻亮（r31 容器底板族）----
   .plated 由 UiPlate.nineSlice 在贴图真的落到 style 上那一刻打上，所以缺图回退时这些规则整体不生效、
   旧配色照旧对——这就是为什么色写在 CSS 而不是 nineSlice 的内联 color 里（内联会盖掉回退态）。
   排在本文件最末：两层（--hs 基准 / --pw 青瓷）都在这之前，同特异性下这一条两边都赢。 */
#homeUi .tab.plated { color: var(--c-cream-1); }
/* 选中那块板是琥珀金，页签名用深墨蓝压上去（对比 ~7:1）；照旧写的 --c-gold-dk3 只有 ~2.8:1，实测糊 */
#homeUi .tab.on.plated { color: var(--c-navy-3); }
#homeUi .flat-tabs > button.plated { color: var(--c-cream-1); }
#homeUi .flat-tabs > button.on.plated { color: var(--c-gold-hi); }
#homeUi .building.plated small { color: var(--c-cream-2); }
/* 主 CTA 那块板是金牌（btn_play），未贴板时它是弹层里的暗蓝键、白字对；贴上金牌白字只剩 2.4:1，
   所以翻亮必须挂在 .plated 上，不能直接改 .major 的白字——那条会连带改掉所有弹层里的主按钮 */
#homeUi .game-button.major.plated { color: var(--c-navy-7); }
/* 蓝板（btn_cancel）同理：页面上未贴板是白纸深字（弹层里对），贴板后是蓝板，字要翻亮 */
#homeUi .game-button.plated { color: var(--c-cream-1); }
#homeUi .eqGrid .slot.plated { color: var(--c-cream-1); }
/* 槽名是 .sname 自己带色（两层各一条），继承改不动它——要翻亮必须点到这一层，特异性也刚好压过两层旧规则 */
#homeUi .eqGrid .slot.plated .sname { color: var(--c-cream-1); }
/* ---- emoji 图标摆正（普查里 ⚡ / 🛡️ / 🎁 三处「内容宽 > 盒宽」的同一根因）----
   .hot .ic 的盒与字号同尺寸（英雄页快捷列 26px×--pw = 36 的方盒配 36 的字），但 emoji 的字身宽窄
   由字体给：⚡ 在 36px 下实测占 49.4px。关键是 **text-align: center 治不了这个**——
   它只分配"剩余空间"，一个比行盒还宽的词没有剩余空间，浏览器照旧从左边起排、整块往右挂出去，
   实测图标中心比按钮中心偏 6.7px。改成 flex 居中：负空间由 justify-content 对半分，
   两侧各出界 6.7px，图标回到视觉正中。贴了图的 .ic 没有文本，这条对它无副作用。
   排在本文件最末，两层（--hs / --pw）一起吃。 */
#homeUi .hot .ic { display: flex; align-items: center; justify-content: center; }`;

