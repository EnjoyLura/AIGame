/**
 * 主城 HomeUi 全量样式（base 深色层 + 青瓷浅色覆盖层，一比一复刻原型图 token）。
 * 自 HomeUi.ts 抽离：纯字符串模板，无逻辑；注意浅色层跑马灯等动画声明
 * 必须保持在 animation:none 白名单之后。
 */
export const HOME_UI_CSS = `
#homeUi { position: fixed; inset: 0; z-index: 8500; display: none; flex-direction: column; align-items: stretch;
  background: #0b1322;
  background-image: radial-gradient(1100px 550px at 75% -10%, #122340 0%, transparent 60%),
    radial-gradient(900px 500px at 5% 110%, #1a1430 0%, transparent 55%);
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #dce8f7; user-select: none; overflow: hidden; }

/* ===== 顶栏 ===== */
#homeUi .topbar { flex: none; display: flex; align-items: center; gap: calc(16px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(20px * var(--hs,1));
  background: linear-gradient(180deg, #1e3054, #141f38); border-bottom: 1px solid #33507a; }
#homeUi .pAvatar { width: calc(92px * var(--hs,1)); height: calc(92px * var(--hs,1)); flex: none; border-radius: 50%; padding: calc(4px * var(--hs,1));
  background: conic-gradient(from 210deg, #f7d98a, #b47b1e, #ffe9a8, #8a5c12, #f7d98a); }
#homeUi .pAvatar > div { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #2a4470, #0d1626);
  display: flex; align-items: center; justify-content: center; font-size: calc(44px * var(--hs,1)); }
#homeUi .pinfo { flex: none; width: calc(236px * var(--hs,1)); }
#homeUi .pname { font-size: calc(26px * var(--hs,1)); font-weight: 700; display: flex; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .lvtag { font-size: calc(18px * var(--hs,1)); color: #5a3a08; background: linear-gradient(180deg, #ffe9a8, #e0a23c);
  padding: calc(1px * var(--hs,1)) calc(10px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); font-weight: 800; }
#homeUi .expbar { height: calc(10px * var(--hs,1)); background: #0a1426; border: 1px solid #2c405f; border-radius: 99px; margin-top: calc(8px * var(--hs,1)); overflow: hidden; }
#homeUi .expbar i { display: block; height: 100%; width: 65%; background: linear-gradient(90deg, #3ad0ff, #7ef0ff); border-radius: 99px; box-shadow: 0 0 6px #3ad0ff; }
#homeUi .expnum { font-size: calc(18px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .reswrap { flex: 1; display: flex; gap: calc(10px * var(--hs,1)); justify-content: flex-end; flex-wrap: wrap; }
#homeUi .res { display: flex; align-items: center; gap: calc(6px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a;
  border-radius: 99px; padding: calc(6px * var(--hs,1)) calc(12px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); font-weight: 700; }
#homeUi .res b { color: #ffe9a8; }
#homeUi .res .add { width: calc(28px * var(--hs,1)); height: calc(28px * var(--hs,1)); border-radius: 50%; background: linear-gradient(180deg, #7fe08a, #2f9c4a);
  color: #06300f; font-size: calc(22px * var(--hs,1)); font-weight: 900; display: flex; align-items: center; justify-content: center; cursor: pointer; }

/* ===== 内容区 ===== */
#homeUi .viewport { flex: 1; position: relative; overflow: hidden;
  background: radial-gradient(500px 320px at 50% -60px, #1d3054 0%, transparent 70%), linear-gradient(180deg, #0e1830, #0a1220); }
#homeUi .screen { position: absolute; inset: 0; padding: calc(24px * var(--hs,1)) calc(24px * var(--hs,1)) calc(200px * var(--hs,1)); overflow-y: auto; display: none; }
#homeUi .screen::-webkit-scrollbar { width: 4px; }
#homeUi .screen::-webkit-scrollbar-thumb { background: #2c405f; border-radius: 4px; }

/* ===== 通用面板/角饰/按钮 ===== */
#homeUi .panel { background: linear-gradient(180deg, #20335a, #152442); border: 1px solid #3a567f; border-radius: calc(20px * var(--hs,1));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 12px rgba(0,0,0,.35); }
#homeUi .frame { position: relative; }
#homeUi .frame::before, #homeUi .frame::after { content: ''; position: absolute; width: calc(24px * var(--hs,1)); height: calc(24px * var(--hs,1));
  border: calc(4px * var(--hs,1)) solid #f5c451; opacity: .85; z-index: 3; }
#homeUi .frame::before { top: -1px; left: -1px; border-right: none; border-bottom: none; border-radius: calc(8px * var(--hs,1)) 0 0 0; }
#homeUi .frame::after { bottom: -1px; right: -1px; border-left: none; border-top: none; border-radius: 0 0 calc(8px * var(--hs,1)) 0; }
#homeUi .secTitle { font-size: calc(26px * var(--hs,1)); font-weight: 800; color: #ffe9a8; letter-spacing: calc(4px * var(--hs,1));
  margin: calc(20px * var(--hs,1)) calc(4px * var(--hs,1)) calc(14px * var(--hs,1)); display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .secTitle::before { content: ''; width: calc(8px * var(--hs,1)); height: calc(28px * var(--hs,1));
  background: linear-gradient(180deg, #ffe9a8, #e0a23c); border-radius: calc(4px * var(--hs,1)); }
#homeUi .btn { border: none; cursor: pointer; font-family: inherit; font-weight: 800; border-radius: calc(18px * var(--hs,1)); }
#homeUi .btn:active { transform: scale(.95); }
#homeUi .btn.gold { background: linear-gradient(180deg, #ffe9a6, #f0b13e 55%, #c9861f); color: #5a3a08; border: 1px solid #8a5c12;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 3px 0 #7c520f, 0 6px 14px rgba(240,177,62,.3); }
#homeUi .btn.blue { background: linear-gradient(180deg, #7fd4ff, #2f7fd0); color: #04263f; border: 1px solid #1b5a94;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 3px 0 #174a80; }
#homeUi .btn.adBtn { background: linear-gradient(180deg, #7fe08a, #2f9c4a); color: #06300f; border: 1px solid #1d6b2e;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 3px 0 #1d6b2e; }
#homeUi .btn.dark { background: linear-gradient(180deg, #2a3f66, #1a2947); color: #dce8f7; border: 1px solid #3a567f; }
#homeUi .btn.sm { height: calc(56px * var(--hs,1)); padding: 0 calc(20px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); }
#homeUi .btn.big { width: 100%; height: calc(88px * var(--hs,1)); font-size: calc(32px * var(--hs,1)); letter-spacing: calc(4px * var(--hs,1)); border-radius: calc(22px * var(--hs,1)); }
#homeUi .btn:disabled { filter: grayscale(.8) brightness(.7); }
#homeUi .tag { font-size: calc(20px * var(--hs,1)); padding: calc(2px * var(--hs,1)) calc(14px * var(--hs,1)); border-radius: 99px;
  background: #0e1930; border: 1px solid #33507a; color: #8ba3c7; white-space: nowrap; }
#homeUi .tag.b { color: #5cc8ff; border-color: #2a6ea6; }
#homeUi .tag.g { color: #ffe9a8; border-color: #8a6a20; }
#homeUi .tag.p { color: #c792ff; border-color: #6a4a9a; }
#homeUi .goldT { color: #ffe9a8; }

/* ===== Toast ===== */
#homeUi .toastEl { position: absolute; left: 50%; bottom: calc(220px * var(--hs,1)); transform: translateX(-50%) translateY(10px);
  background: rgba(13,25,48,.93); border: 1px solid #f5c451; color: #ffe9a8; font-size: calc(24px * var(--hs,1)); font-weight: 700;
  padding: calc(14px * var(--hs,1)) calc(32px * var(--hs,1)); border-radius: 99px; opacity: 0; transition: .25s;
  z-index: 300; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,.5); }
#homeUi .toastEl.show { opacity: 1; }

/* ===== 商店页 ===== */
#homeUi .shopBanner { height: calc(168px * var(--hs,1)); border-radius: calc(24px * var(--hs,1)); overflow: hidden; position: relative; cursor: pointer;
  display: flex; align-items: center; background: linear-gradient(100deg, #3a1420, #6e2418 55%, #8a4a1a);
  border: 1px solid #a06428; box-shadow: 0 6px 16px rgba(0,0,0,.4); }
#homeUi .shopBanner::after { content: ''; position: absolute; inset: 0;
  background: radial-gradient(200px 90px at 85% 20%, rgba(255,210,120,.35), transparent 70%); }
#homeUi .sbTxt { padding: 0 calc(28px * var(--hs,1)); z-index: 2; }
#homeUi .sbTxt h3 { font-size: calc(32px * var(--hs,1)); color: #ffe9a8; letter-spacing: calc(2px * var(--hs,1)); text-shadow: 0 2px 4px rgba(0,0,0,.5); }
#homeUi .sbTxt p { font-size: calc(22px * var(--hs,1)); color: #ffd9b0; margin-top: calc(8px * var(--hs,1)); }
#homeUi .sbTxt .price { color: #ff8a6a; font-weight: 900; font-size: calc(32px * var(--hs,1)); }
#homeUi .sbTxt .price s { color: #c98a6a; font-size: calc(22px * var(--hs,1)); margin-left: calc(8px * var(--hs,1)); }
#homeUi .sbGift { margin-left: auto; font-size: calc(88px * var(--hs,1)); margin-right: calc(32px * var(--hs,1)); z-index: 2;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)); }
#homeUi .sbTime { position: absolute; right: calc(24px * var(--hs,1)); bottom: calc(14px * var(--hs,1)); z-index: 2;
  font-size: calc(20px * var(--hs,1)); color: #ffd9b0; background: rgba(0,0,0,.35); padding: calc(4px * var(--hs,1)) calc(16px * var(--hs,1)); border-radius: 99px; }
#homeUi .shopTabs { display: flex; gap: calc(12px * var(--hs,1)); margin: calc(24px * var(--hs,1)) 0; }
#homeUi .shopTabs button { flex: 1; height: calc(60px * var(--hs,1)); border-radius: calc(16px * var(--hs,1)); border: 1px solid #33507a;
  background: #101d38; color: #8ba3c7; font-family: inherit; font-size: calc(26px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .shopTabs button.on { background: linear-gradient(180deg, #3a567f, #243a63); color: #ffe9a8; border-color: #6a8ab8;
  box-shadow: 0 0 10px rgba(92,150,255,.25); }
#homeUi .shopGrid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(20px * var(--hs,1)); }
#homeUi .good { padding: calc(16px * var(--hs,1)); position: relative; }
#homeUi .gIc { height: calc(120px * var(--hs,1)); border-radius: calc(16px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(64px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #2a4470, #101c34);
  border: 1px solid #3a567f; margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .good.r3 .gIc { border-color: #3a8ad0; box-shadow: 0 0 8px rgba(60,140,220,.35) inset; }
#homeUi .good.r4 .gIc { border-color: #9a5ce0; box-shadow: 0 0 8px rgba(160,90,230,.4) inset; }
#homeUi .good.r5 .gIc { border-color: #ff9d45; box-shadow: 0 0 10px rgba(255,157,69,.45) inset; }
#homeUi .good.r6 .gIc { border-color: #ff5252; box-shadow: 0 0 12px rgba(255,82,82,.55) inset, 0 0 10px rgba(255,82,82,.35); }
#homeUi .gName { font-size: calc(26px * var(--hs,1)); font-weight: 700; }
#homeUi .gTag { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin: calc(4px * var(--hs,1)) 0 calc(12px * var(--hs,1)); min-height: calc(48px * var(--hs,1)); line-height: 1.3; }
#homeUi .gBuy { width: 100%; display: flex; align-items: center; justify-content: center; gap: calc(6px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); }
#homeUi .gHot { position: absolute; top: calc(-10px * var(--hs,1)); right: calc(-8px * var(--hs,1));
  background: linear-gradient(180deg, #ff8a5c, #e03a2a); color: #fff; font-size: calc(20px * var(--hs,1)); font-weight: 800;
  padding: calc(4px * var(--hs,1)) calc(16px * var(--hs,1)); border-radius: 99px 99px 99px 4px; box-shadow: 0 2px 6px rgba(0,0,0,.4); z-index: 2; }
#homeUi .good.adCard .gIc { border-color: #2f9c4a; }

/* ===== 礼包中心（banner 弹窗） ===== */
#homeUi .giftBox .mHead h3 { color: #ffe9a8; }
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
  background: radial-gradient(circle at 50% 30%, #2a4470, #101c34); border: 1px solid #3a567f; }
#homeUi .giftCard.r4 .giftIc { border-color: #9a5ce0; }
#homeUi .giftCard.r5 .giftIc { border-color: #ff9d45; box-shadow: 0 0 10px rgba(255,157,69,.4); }
#homeUi .giftInfo { flex: 1; min-width: 0; }
#homeUi .giftInfo b { font-size: calc(26px * var(--hs,1)); }
#homeUi .giftInfo p { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .giftEntries { font-size: calc(18px * var(--hs,1)); color: #ffd9b0; margin-top: calc(8px * var(--hs,1)); line-height: 1.5; }
#homeUi .giftSide { flex: none; display: flex; flex-direction: column; align-items: stretch; gap: calc(8px * var(--hs,1)); width: calc(200px * var(--hs,1)); }
#homeUi .giftPrice { text-align: center; font-weight: 900; font-size: calc(26px * var(--hs,1)); color: #7ee0ff; }
#homeUi .giftPrice em { font-style: normal; color: #7bdc7b; }
#homeUi .giftPrice s { color: #c98a6a; font-size: calc(18px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); }
#homeUi .giftSide .btn { width: 100%; height: calc(52px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
#homeUi .giftQuota { text-align: center; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .giftNote { text-align: center; font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-top: calc(16px * var(--hs,1)); }
#homeUi .giftResHead { text-align: center; font-size: calc(24px * var(--hs,1)); color: #b9d9c2; margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .giftResGrid { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(16px * var(--hs,1)); }
#homeUi .giftResGrid .clDrop { width: calc(140px * var(--hs,1)); height: calc(140px * var(--hs,1)); border: 1px solid #3a567f;
  border-radius: calc(16px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #1a2a4a, #0d1626);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(8px * var(--hs,1));
  opacity: 0; animation: giftDropIn .45s cubic-bezier(.34,1.56,.64,1) both; }
#homeUi .giftResGrid .clDropIc { font-size: calc(48px * var(--hs,1)); }
#homeUi .giftResGrid .clDropNm { font-size: calc(18px * var(--hs,1)); }
#homeUi .giftResGrid .clDrop.r3 { border-color: #5ab0f0; }
#homeUi .giftResGrid .clDrop.r4 { border-color: #c07ef5; }
#homeUi .giftResGrid .clDrop.r5 { border-color: #ff9d45; box-shadow: 0 0 10px rgba(255,157,69,.35); }
#homeUi .giftResGrid .clDrop.r6 { border-color: #ff5252; box-shadow: 0 0 12px rgba(255,82,82,.5); }
#homeUi .giftResRow { text-align: center; font-size: calc(22px * var(--hs,1)); color: #ffe9a8; margin-top: calc(16px * var(--hs,1)); }
#homeUi .giftOkBtn { width: 100%; margin-top: calc(20px * var(--hs,1)); height: calc(64px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }
#homeUi .shopBanner .sbTime.dotOn::after { content: ''; display: inline-block; width: calc(12px * var(--hs,1)); height: calc(12px * var(--hs,1));
  margin-left: calc(8px * var(--hs,1)); border-radius: 50%; background: #ff5252; box-shadow: 0 0 8px rgba(255,82,82,.8); vertical-align: middle; }
@keyframes giftDropIn { from { transform: scale(.4) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }

/* ===== 任务与成就（基地页入口 + 弹窗） ===== */
#homeUi .questEntry { position: relative; margin-left: auto; flex: none; }
#homeUi .questEntry .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: #ff5252;
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .questEntry .questRed.on { display: block; }
#homeUi .qSecHead { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); margin: calc(16px * var(--hs,1)) 0 calc(10px * var(--hs,1)); }
#homeUi .qSecHead:first-child { margin-top: 0; }
#homeUi .qSecHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .qSecHead span { font-size: calc(18px * var(--hs,1)); color: #6a83a8; }
#homeUi .questRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .questRow.ready { border-color: #8a6a20; box-shadow: 0 0 10px rgba(240,177,62,.25); }
#homeUi .questRow.done { opacity: .55; filter: grayscale(.5); }
#homeUi .qIc { flex: none; width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(38px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #101c34); border: 1px solid #3a567f; }
#homeUi .qMid { flex: 1; min-width: 0; }
#homeUi .qMid b { font-size: calc(24px * var(--hs,1)); }
#homeUi .qBar { height: calc(12px * var(--hs,1)); border-radius: 99px; background: #0d1930; border: 1px solid #33507a;
  margin: calc(8px * var(--hs,1)) 0 calc(6px * var(--hs,1)); overflow: hidden; }
#homeUi .qBar i { display: block; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #5cc8ff, #7bdc7b); transition: width .4s ease; }
#homeUi .questRow.ready .qBar i { background: linear-gradient(90deg, #ffe9a8, #f0b13e); }
#homeUi .qNum { font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .qRight { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: calc(8px * var(--hs,1)); }
#homeUi .qReward { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .qRight .btn { min-width: calc(140px * var(--hs,1)); height: calc(48px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }

/* ===== 活跃度宝箱（任务弹窗顶部总览） ===== */
#homeUi .actBox { padding: calc(16px * var(--hs,1)); margin-bottom: calc(6px * var(--hs,1)); }
#homeUi .actHead { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .actHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .actHead span { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .actBar { margin: calc(10px * var(--hs,1)) 0 calc(14px * var(--hs,1)); }
#homeUi .actBar i { background: linear-gradient(90deg, #f0b13e, #ffe9a8); }
#homeUi .actChests { display: flex; gap: calc(12px * var(--hs,1)); }
#homeUi .actChest { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  background: radial-gradient(circle at 50% 0%, #222f4d, #101c34); border: 1px solid #33507a; }
#homeUi .actChest.ready { border-color: #f0b13e; box-shadow: 0 0 14px rgba(240,177,62,.4); }
#homeUi .actChest.done { opacity: .5; filter: grayscale(.6); }
#homeUi .acIc { font-size: calc(46px * var(--hs,1)); line-height: 1.1; }
#homeUi .actChest.done .acIc { filter: grayscale(1); }
#homeUi .actChest.ready .acIc { animation: huiChest .9s ease-in-out infinite; }
#homeUi .acName { font-size: calc(22px * var(--hs,1)); font-weight: 700; color: #e8f1ff; }
#homeUi .acReward { font-size: calc(17px * var(--hs,1)); color: #7ee0ff; text-align: center; line-height: 1.4; }
#homeUi .acNeed { font-size: calc(17px * var(--hs,1)); color: #8ba3c7; }
#homeUi .actChest.ready .acNeed { color: #f0b13e; font-weight: 700; }
#homeUi .actChest .btn { width: 100%; margin-top: calc(6px * var(--hs,1)); height: calc(44px * var(--hs,1)); font-size: calc(19px * var(--hs,1)); }
#homeUi .actHint { margin-top: calc(12px * var(--hs,1)); font-size: calc(17px * var(--hs,1)); color: #6a83a8; text-align: center; }

/* ===== 每日签到（基地页入口 + 弹窗） ===== */
#homeUi .signinEntry { position: relative; margin-left: 0; flex: none; }
#homeUi .signinEntry .questRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: #ff5252;
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .signinEntry .questRed.on { display: block; }
#homeUi .siHead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .siHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .siHead b i { color: #f0b13e; font-style: normal; }
#homeUi .siHead span { font-size: calc(18px * var(--hs,1)); color: #6a83a8; }
#homeUi .siGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .siCell { padding: calc(14px * var(--hs,1)) calc(8px * var(--hs,1)); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .siCell.today { border-color: #f0b13e; box-shadow: 0 0 12px rgba(240,177,62,.35); background: linear-gradient(180deg, rgba(240,177,62,.14), transparent); }
#homeUi .siCell.done { opacity: .5; filter: grayscale(.5); }
#homeUi .siIc { font-size: calc(40px * var(--hs,1)); line-height: 1.1; }
#homeUi .siNm { font-size: calc(20px * var(--hs,1)); font-weight: 700; }
#homeUi .siDy { font-size: calc(16px * var(--hs,1)); color: #f0b13e; }
#homeUi .siRw { font-size: calc(16px * var(--hs,1)); color: #7ee0ff; }
#homeUi .siFoot { display: flex; align-items: center; justify-content: space-between; gap: calc(14px * var(--hs,1));
  margin-top: calc(16px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1)); }
#homeUi .siFoot.ready { border-color: #8a6a20; box-shadow: 0 0 10px rgba(240,177,62,.25); }
#homeUi .siFoot.done { opacity: .6; }
#homeUi .siInfo { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .siInfo b { font-size: calc(24px * var(--hs,1)); }
#homeUi .siInfo span { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
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
#homeUi .besSub { font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
#homeUi .besElite { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); margin-top: calc(16px * var(--hs,1));
  font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .besElite b { color: #f0b13e; }
#homeUi .besDetail { display: flex; gap: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1)); }
#homeUi .besDetail.lock { opacity: .75; }
#homeUi .besDetailPic { flex: none; width: calc(180px * var(--hs,1)); height: calc(220px * var(--hs,1)); }
#homeUi .besDetail.lock .besDetailPic { background: radial-gradient(circle at 50% 60%, #2a4470, #101c34); border-radius: calc(16px * var(--hs,1)); border: 1px solid #3a567f; }
#homeUi .besDetailInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); text-align: left; }
#homeUi .besDetailName { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .besDetailName b { font-size: calc(30px * var(--hs,1)); color: #ffe9a8; }
#homeUi .besStars { font-size: calc(22px * var(--hs,1)); color: #f0b13e; }
#homeUi .besBeh { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .besDesc { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; line-height: 1.7; }
#homeUi .besStats { margin-top: calc(6px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .besStatRow { display: flex; justify-content: space-between; font-size: calc(20px * var(--hs,1)); }
#homeUi .besStatRow span { color: #8ba3c7; }
#homeUi .besStatRow b { color: #ffe9a8; }

/* ===== 试炼之塔（基地建筑入口 + 弹窗） ===== */
#homeUi .trialList { max-height: calc(760px * var(--hs,1)); overflow-y: auto; display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); }
#homeUi .trialSect { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .trialSect.lock { opacity: .5; }
#homeUi .trialSectName { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .trialSect.lock .trialSectName { color: #587099; }
#homeUi .trialGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .trialCell { position: relative; padding: calc(12px * var(--hs,1)) 0; text-align: center; cursor: default;
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); }
#homeUi .trialCell b { font-size: calc(26px * var(--hs,1)); color: #dce8f7; }
#homeUi .trialCell span { font-size: calc(18px * var(--hs,1)); }
#homeUi .trialCell i { position: absolute; top: calc(2px * var(--hs,1)); right: calc(4px * var(--hs,1)); font-style: normal; font-size: calc(16px * var(--hs,1)); }
#homeUi .trialCell.done { border-color: #3f7a4a; }
#homeUi .trialCell.done b { color: #7fe08a; }
#homeUi .trialCell.now { border-color: #8a6a20; cursor: pointer; animation: huiChest 1.8s ease-in-out infinite; }
#homeUi .trialCell.now b { color: #ffe9a8; }
#homeUi .trialCell.sel { border-color: #f0b13e; box-shadow: 0 0 14px rgba(240,177,62,.6); }
#homeUi .trialCell.lock { opacity: .45; }
#homeUi .trialCell.mile { border-top: calc(3px * var(--hs,1)) solid #c9a227; }
#homeUi .trialDetail { margin-top: calc(16px * var(--hs,1)); padding: calc(18px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); text-align: left; }
#homeUi .trialName { font-size: calc(28px * var(--hs,1)); font-weight: 700; color: #ffe9a8; display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .trialName span { font-size: calc(18px * var(--hs,1)); color: #7ee0ff; font-weight: 400; }
#homeUi .trialStat { display: flex; gap: calc(24px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: #8ba3c7; flex-wrap: wrap; }
#homeUi .trialStat b { color: #dce8f7; }
#homeUi .trialMobs { display: flex; gap: calc(16px * var(--hs,1)); flex-wrap: wrap; align-items: flex-end; }
#homeUi .trialMob { display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .trialMobPic { width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1)); }
#homeUi .trialReward { display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .trialRewardHead { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .trialRewardRow { display: flex; gap: calc(10px * var(--hs,1)); align-items: center; font-size: calc(22px * var(--hs,1)); }
#homeUi .trialRewardRow b { color: #ffe9a8; }
#homeUi .trialRewardNote { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; }
#homeUi .trialGo { width: 100%; margin-top: calc(16px * var(--hs,1)); }

/* ===== 英雄招募 + 升星（英雄页入口） ===== */
#homeUi .hpick.recruitEntry .rcIc, #homeUi .hpick.talentEntry2 .rcIc { font-size: calc(46px * var(--hs,1)); line-height: calc(72px * var(--hs,1)); background: none !important; }
#homeUi .talentEntry2 .questRed { display: none; position: absolute; top: calc(-2px * var(--hs,1)); right: calc(6px * var(--hs,1));
  width: calc(16px * var(--hs,1)); height: calc(16px * var(--hs,1)); border-radius: 50%; background: #ff5252;
  box-shadow: 0 0 8px rgba(255,82,82,.8); }
#homeUi .talentEntry2 .questRed.on { display: block; }
/* 基地纯入口建筑卡红点（右上角） */
#homeUi .bcardRed { display: none; position: absolute; top: calc(-6px * var(--hs,1)); right: calc(-6px * var(--hs,1));
  width: calc(18px * var(--hs,1)); height: calc(18px * var(--hs,1)); border-radius: 50%; background: #ff5252;
  box-shadow: 0 0 8px rgba(255,82,82,.8); z-index: 2; }
#homeUi .bcardRed.on { display: block; }
#homeUi .starBar { margin: calc(16px * var(--hs,1)) 0; padding: calc(18px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .starBar.max { border-color: #8a6a20; }
#homeUi .sbLine { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .sbStars { font-size: calc(32px * var(--hs,1)); color: #f0b13e; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .starBar.max .sbStars { color: #ffd76a; text-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.8); }
#homeUi .sbLv { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .sbProg { display: flex; align-items: baseline; gap: calc(10px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .sbProg b { color: #ffe9a8; font-size: calc(24px * var(--hs,1)); }
#homeUi .sbAdd { font-size: calc(17px * var(--hs,1)); color: #587099; }
#homeUi .sbDone { color: #f0b13e; }
#homeUi .sbBtn { width: 100%; }

#homeUi .rcHead { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .rcHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .rcHeadTop i { color: #f0b13e; font-style: normal; font-size: calc(28px * var(--hs,1)); font-weight: 700; }
#homeUi .rcHeadTop span { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcBar { height: calc(14px * var(--hs,1)); background: #1a2c4a; border-radius: calc(8px * var(--hs,1)); overflow: hidden; border: 1px solid #2f4a72; }
#homeUi .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, #f0b13e, #ffe9a8); transition: width .3s; }
#homeUi .rcRate { padding: calc(16px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .rcRateRow { display: flex; justify-content: space-between; font-size: calc(21px * var(--hs,1)); color: #dce8f7; }
#homeUi .rcRateRow b { color: #8ba3c7; }
#homeUi .rcRateRow.hero span { color: #ffd76a; }
#homeUi .rcRateRow.hero b { color: #ffd76a; }
#homeUi .rcRateRow.r5 span { color: #ff9d45; }
#homeUi .rcRateRow.r3 span { color: #5ab0f0; }
#homeUi .rcRateRow.r2 span { color: #7bd67b; }
#homeUi .rcRateNote { margin-top: calc(4px * var(--hs,1)); font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcShards { margin-top: calc(16px * var(--hs,1)); }
#homeUi .rcShardsHead { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .rcShardGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .rcShard { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(10px * var(--hs,1)); }
#homeUi .rcShard.lock { opacity: .55; filter: grayscale(.7); }
#homeUi .rcShardPic { flex: none; width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); background-color: #2a4470; }
#homeUi .rcShardInfo { display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); min-width: 0; }
#homeUi .rcShardInfo b { font-size: calc(20px * var(--hs,1)); color: #dce8f7; }
#homeUi .rcShardInfo i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
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
#homeUi .rcCardNm { font-size: calc(18px * var(--hs,1)); color: #dce8f7; line-height: 1.3; }
#homeUi .rcCard.hero { border-color: #ffd76a; box-shadow: 0 0 calc(18px * var(--hs,1)) rgba(255,215,106,.7); }
#homeUi .rcCard.r5 { border-color: #ff9d45; }
#homeUi .rcCard.r3 { border-color: #5ab0f0; }
#homeUi .rcCard.r2 { border-color: #7bd67b; }
#homeUi .rcNew { position: absolute; top: calc(-8px * var(--hs,1)); right: calc(-8px * var(--hs,1)); background: #ff5252; color: #fff;
  font-size: calc(16px * var(--hs,1)); font-weight: 700; padding: calc(2px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(8px * var(--hs,1)); }
#homeUi .rcDup { position: absolute; top: calc(4px * var(--hs,1)); left: 50%; transform: translateX(-50%); font-size: calc(14px * var(--hs,1));
  color: #f0b13e; white-space: nowrap; }
#homeUi .rcSum { margin-top: calc(18px * var(--hs,1)); text-align: center; font-size: calc(22px * var(--hs,1)); color: #7ee0ff; }
#homeUi .rcAgain { width: 100%; margin-top: calc(18px * var(--hs,1)); }
#homeUi .rcClose { width: 100%; margin-top: calc(10px * var(--hs,1)); }

/* ===== 天赋树（基地横幅入口） ===== */
#homeUi .talentHead { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .talentHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .talentHeadTop i { color: #8fe3ff; font-style: normal; font-size: calc(30px * var(--hs,1)); font-weight: 700; }
#homeUi .talentHeadTop span { font-size: calc(19px * var(--hs,1)); color: #f0b13e; }
#homeUi .talentBar { height: calc(14px * var(--hs,1)); background: #1a2c4a; border-radius: calc(8px * var(--hs,1)); overflow: hidden; border: 1px solid #2f4a72; }
#homeUi .talentBar i { display: block; height: 100%; background: linear-gradient(90deg, #4aa8d8, #8fe3ff); transition: width .3s; }
#homeUi .talentSrc { font-size: calc(17px * var(--hs,1)); color: #587099; line-height: 1.5; }

#homeUi .talentBranchRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(14px * var(--hs,1)); }
#homeUi .talentBranch { display: flex; flex-direction: column; min-width: 0; }
#homeUi .tbTitle { text-align: center; margin-bottom: calc(10px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .tbTitle b { font-size: calc(22px * var(--hs,1)); color: #dce8f7; }
#homeUi .tbTitle i { font-style: normal; font-size: calc(17px * var(--hs,1)); color: #8ba3c7; }
#homeUi .tbNodes { display: flex; flex-direction: column; align-items: center; }
#homeUi .talentNode { position: relative; width: calc(88px * var(--hs,1)); height: calc(88px * var(--hs,1)); flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(2px * var(--hs,1));
  border: 2px solid #2f4a72; border-radius: calc(12px * var(--hs,1)); background: #16233a; cursor: pointer; }
/* 节点间竖向连线：位于节点下方，撑满 5 行间距；末节点不画 */
#homeUi .talentNode:not(:last-child) { margin-bottom: calc(30px * var(--hs,1)); }
#homeUi .talentNode:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%;
  transform: translateX(-50%); width: calc(4px * var(--hs,1)); height: calc(30px * var(--hs,1)); background: #2f4a72; }
#homeUi .talentNode.maxed:not(:last-child)::after { background: #f0b13e; }
#homeUi .talentNode.lock { opacity: .5; filter: grayscale(.8); border-color: #26364f; }
#homeUi .talentNode.can { border-color: #4aa8d8; box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(74,168,216,.65); animation: huiChest .9s ease-in-out infinite; }
#homeUi .talentNode.maxed { border-color: #f0b13e; box-shadow: 0 0 calc(14px * var(--hs,1)) rgba(240,177,62,.6); }
#homeUi .talentNode.sel { outline: calc(3px * var(--hs,1)) solid #8fe3ff; outline-offset: calc(3px * var(--hs,1)); }
#homeUi .tnIc { font-size: calc(38px * var(--hs,1)); line-height: 1; }
#homeUi .tnLv { font-size: calc(16px * var(--hs,1)); color: #8ba3c7; }
#homeUi .talentNode.maxed .tnLv { color: #ffd76a; }
#homeUi .talentNode.can .tnLv { color: #8fe3ff; }

#homeUi .talentDetail { margin-top: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1));
  display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .tdName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .tdName b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .tdName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .tdDesc { font-size: calc(21px * var(--hs,1)); color: #dce8f7; line-height: 1.5; }
#homeUi .tdHint { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; }
#homeUi .tdBtns { display: flex; gap: calc(14px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .tdBtns .btn { flex: 1; }

/* ===== 资源副本（基地横幅入口） ===== */
#homeUi .dgHead { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .dgHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); }
#homeUi .dgHeadTop b { color: #ffe9a8; }
#homeUi .dgHeadTop span { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; }
#homeUi .dgSrc { font-size: calc(17px * var(--hs,1)); color: #587099; line-height: 1.5; }

#homeUi .dgList { display: flex; flex-direction: column; gap: calc(12px * var(--hs,1)); }
#homeUi .dgRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1));
  border-radius: calc(18px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a; cursor: pointer; }
#homeUi .dgRow.on { border-color: #f0b13e; box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.35); }
#homeUi .dgInfo { flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .dgIc { font-size: calc(44px * var(--hs,1)); line-height: 1; }
#homeUi .dgMeta { display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); min-width: 0; }
#homeUi .dgMeta b { font-size: calc(24px * var(--hs,1)); color: #dce8f7; }
#homeUi .dgMeta i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #7ee0ff; }
#homeUi .dgTiers { display: flex; gap: calc(8px * var(--hs,1)); flex: none; }
#homeUi .dgTier { min-width: calc(96px * var(--hs,1)); }
#homeUi .dgTier:disabled { opacity: .5; }

#homeUi .dgDetail { margin-top: calc(18px * var(--hs,1)); padding: calc(18px * var(--hs,1));
  display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .dgName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .dgName b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .dgName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .dgDesc { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; line-height: 1.5; }
#homeUi .dgYield { font-size: calc(22px * var(--hs,1)); color: #dce8f7; }
#homeUi .dgHint { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; }
#homeUi .dgGo { width: 100%; margin-top: calc(6px * var(--hs,1)); }

/* ===== 远征派遣 ===== */
#homeUi .expHead { margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .expHeadTop { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .expHeadTop b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .expHeadTop span { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .expSrc { font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-top: calc(6px * var(--hs,1)); }
#homeUi .expList { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .expRow { padding: calc(14px * var(--hs,1)) calc(18px * var(--hs,1)); cursor: pointer;
  border: 1px solid #33507a; border-radius: calc(14px * var(--hs,1)); background: linear-gradient(#1b2b4a, #0f1b30); }
#homeUi .expRow.on { border-color: #4aa8d8; box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(74,168,216,.4); }
#homeUi .expRow.ready { border-color: #f0b13e; box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.45); }
#homeUi .expInfo { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); }
#homeUi .expIc { flex: none; width: calc(64px * var(--hs,1)); height: calc(64px * var(--hs,1)); border-radius: calc(14px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(34px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #101c34); border: 1px solid #3a567f; }
#homeUi .expMeta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--hs,1)); }
#homeUi .expMeta b { font-size: calc(24px * var(--hs,1)); color: #e8f1ff; }
#homeUi .expMeta i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .expRow.ready .expMeta i { color: #f0b13e; font-weight: 700; }
#homeUi .expDetail { padding: calc(16px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .expName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1)); }
#homeUi .expName b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .expName i { font-style: normal; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .expDesc { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; line-height: 1.5; }
#homeUi .expYield { font-size: calc(21px * var(--hs,1)); color: #dce8f7; line-height: 1.5; }
#homeUi .expMult { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; }
#homeUi .expHeroes { display: flex; flex-wrap: wrap; gap: calc(10px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .expHero { flex: 1 1 calc(30% - calc(10px * var(--hs,1))); min-width: calc(160px * var(--hs,1));
  display: flex; flex-direction: column; align-items: center; gap: calc(4px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); border-radius: calc(12px * var(--hs,1));
  background: radial-gradient(circle at 50% 0%, #222f4d, #101c34); border: 1px solid #33507a; color: #cfe2f7; }
#homeUi .expHero.sel { border-color: #f0b13e; box-shadow: 0 0 calc(12px * var(--hs,1)) rgba(240,177,62,.45); }
#homeUi .expHero.busy, #homeUi .expHero:disabled { opacity: .45; filter: grayscale(.6); }
#homeUi .ehIc { width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: calc(26px * var(--hs,1)); font-weight: 700;
  background: #2a4470; border: 1px solid #4a6a97; color: #ffe9a8; }
#homeUi .ehName { font-size: calc(19px * var(--hs,1)); }
#homeUi .ehAttr { font-size: calc(17px * var(--hs,1)); color: #7ee0ff; }
#homeUi .ehBusy { font-size: calc(16px * var(--hs,1)); color: #ff8a8a; }
#homeUi .expPick { font-size: calc(19px * var(--hs,1)); color: #7ee0ff; text-align: center; }
#homeUi .expTeam { font-size: calc(20px * var(--hs,1)); color: #dce8f7; }
#homeUi .expTimer { font-size: calc(24px * var(--hs,1)); color: #f0b13e; font-weight: 700; text-align: center; }
#homeUi .expActions { display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); margin-top: calc(4px * var(--hs,1)); }
#homeUi .expGo { width: 100%; }

/* ===== 个人主页（点头像弹出） ===== */
#homeUi .pAvatar { cursor: pointer; }
#homeUi .pfCard { display: flex; align-items: center; gap: calc(20px * var(--hs,1)); padding: calc(20px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .pfPic { flex: none; width: calc(128px * var(--hs,1)); height: calc(128px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background-color: #2a4470; border: 2px solid #3a567f; }
#homeUi .pfCardInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .pfName { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); }
#homeUi .pfName b { font-size: calc(32px * var(--hs,1)); color: #ffe9a8; }
#homeUi .pfName .lvtag { font-size: calc(20px * var(--hs,1)); }
#homeUi .pfTitle { font-size: calc(24px * var(--hs,1)); color: #7ee0ff; font-weight: 700; }
#homeUi .pfPower { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .pfPower b { font-size: calc(30px * var(--hs,1)); color: #f0b13e; font-variant-numeric: tabular-nums; }
#homeUi .pfSec { margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .pfSecHead { margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .pfSecHead b { font-size: calc(24px * var(--hs,1)); color: #ffe9a8; }
#homeUi .pfGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(10px * var(--hs,1)); }
#homeUi .pfStat { display: flex; flex-direction: column; align-items: center; gap: calc(5px * var(--hs,1)); padding: calc(14px * var(--hs,1)) calc(6px * var(--hs,1)); }
#homeUi .pfStat em { font-style: normal; font-size: calc(32px * var(--hs,1)); line-height: 1.1; }
#homeUi .pfStat b { font-size: calc(24px * var(--hs,1)); color: #ffe9a8; font-variant-numeric: tabular-nums; }
#homeUi .pfStat span { font-size: calc(17px * var(--hs,1)); color: #8ba3c7; }
#homeUi .pfAcc { padding: calc(14px * var(--hs,1)) calc(20px * var(--hs,1)); display: flex; flex-direction: column; gap: calc(10px * var(--hs,1)); }
#homeUi .pfAccRow { display: flex; justify-content: space-between; font-size: calc(21px * var(--hs,1)); }
#homeUi .pfAccRow span { color: #8ba3c7; }
#homeUi .pfAccRow b { color: #ffe9a8; }

/* ===== 排行榜（基地页入口 + 弹窗） ===== */
#homeUi .lbEntry { margin-left: 0; }
#homeUi .lbBox .mHead h3 { color: #ffe9a8; }
#homeUi .lbMy { display: flex; align-items: baseline; justify-content: space-between; background: linear-gradient(90deg, rgba(240,177,62,.16), transparent);
  border: 1px solid #8a6a20; border-radius: calc(12px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(20px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .lbMy span { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .lbMy b { font-size: calc(32px * var(--hs,1)); color: #ffe9a8; }
#homeUi .lbList { display: flex; flex-direction: column; gap: calc(8px * var(--hs,1)); }
#homeUi .lbRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(14px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1)); }
#homeUi .lbRow.me { border-color: #8a6a20; background: linear-gradient(90deg, rgba(240,177,62,.14), rgba(20,32,58,.6));
  box-shadow: 0 0 10px rgba(240,177,62,.18); }
#homeUi .lbRank { flex: none; width: calc(52px * var(--hs,1)); text-align: center; font-size: calc(22px * var(--hs,1)); color: #8ba3c7; font-weight: 800; }
#homeUi .lbRank .medal { font-style: normal; font-size: calc(30px * var(--hs,1)); }
#homeUi .lbIc { flex: none; font-size: calc(30px * var(--hs,1)); }
#homeUi .lbName { flex: 1; min-width: 0; font-size: calc(24px * var(--hs,1)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#homeUi .lbRow.me .lbName { color: #ffe9a8; }
#homeUi .lbScore { flex: none; font-size: calc(24px * var(--hs,1)); color: #7ee0ff; font-weight: 800; }

/* ===== 宝石镶嵌（穿戴面板孔位区） ===== */
#homeUi .gemBox { display: flex; gap: calc(10px * var(--hs,1)); margin: calc(-4px * var(--hs,1)) 0 calc(8px * var(--hs,1)); }
#homeUi .gemHole { flex: 1; display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(6px * var(--hs,1)); border-radius: calc(12px * var(--hs,1));
  background: radial-gradient(circle at 50% 20%, #1a2a4a, #0d1626); border: 1px dashed #33507a; cursor: pointer; }
#homeUi .gemHole:active { transform: scale(.96); }
#homeUi .gemHole .ghIc { font-size: calc(34px * var(--hs,1)); }
#homeUi .gemHole .ghNm { font-size: calc(18px * var(--hs,1)); font-weight: 700; }
#homeUi .gemHole .ghEff { font-size: calc(16px * var(--hs,1)); color: #7ee0ff; }
#homeUi .gemHole .dim { color: #4a608a; filter: grayscale(.4); }
#homeUi .gemHole .ghEff.dim { color: #4a608a; }

/* ===== 装备工坊（合成/分解） ===== */
#homeUi .forgeBtn { flex: none; width: calc(150px * var(--hs,1)); }
#homeUi .fSec { margin-bottom: calc(18px * var(--hs,1)); }
#homeUi .fHead { display: flex; align-items: baseline; gap: calc(12px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .fHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .fHead span { font-size: calc(18px * var(--hs,1)); color: #6a83a8; }
#homeUi .fRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(10px * var(--hs,1)) calc(14px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1)); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .fInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(2px * var(--hs,1)); }
#homeUi .fInfo b { font-size: calc(22px * var(--hs,1)); }
#homeUi .fInfo span { font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .fRow .btn { flex: none; min-width: calc(140px * var(--hs,1)); height: calc(48px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .fQuick { width: 100%; margin-top: calc(6px * var(--hs,1)); }
#homeUi .fNote { text-align: center; }

/* ===== 无尽模式入口 ===== */
#homeUi .stageBtns .go.endless { background: linear-gradient(180deg, #3d5a86, #22345c); border-color: #5c7ea8; color: #bfe0ff; }
#homeUi .stageBtns .go.endless:active { filter: brightness(1.12); }

/* ===== 设置（顶栏齿轮 + 弹窗） ===== */
#homeUi .setGear { flex: none; width: calc(56px * var(--hs,1)); height: calc(56px * var(--hs,1)); font-size: calc(26px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; padding: 0; }
#homeUi .setSec { margin-bottom: calc(18px * var(--hs,1)); }
#homeUi .setHead { margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .setHead b { font-size: calc(26px * var(--hs,1)); color: #ffe9a8; }
#homeUi .setHead.danger b { color: #ff8a6a; }
#homeUi .setRow { display: flex; align-items: center; justify-content: space-between; gap: calc(12px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(14px * var(--hs,1)); background: rgba(20,32,58,.6);
  border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1)); margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .setRow > span { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .setRow > b { font-size: calc(22px * var(--hs,1)); color: #cfe0f5; }
#homeUi .setRow .btn { min-width: calc(170px * var(--hs,1)); height: calc(50px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .volWrap { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); flex: 1; max-width: calc(300px * var(--hs,1)); }
#homeUi .volWrap input[type=range] { flex: 1; accent-color: #f0b13e; height: calc(24px * var(--hs,1)); }
#homeUi .volWrap b { font-size: calc(20px * var(--hs,1)); color: #7ee0ff; width: calc(64px * var(--hs,1)); text-align: right; }
#homeUi .resetBtn { border-color: #8a3a2a !important; color: #ff9a8a !important; }

/* ===== 建筑详情浮窗（基地页 ⓘ） ===== */
#homeUi .bInfoBtn { position: absolute; top: calc(8px * var(--hs,1)); right: calc(8px * var(--hs,1)); z-index: 2;
  width: calc(34px * var(--hs,1)); height: calc(34px * var(--hs,1)); border-radius: 50%;
  border: 1px solid #3a567f; background: rgba(13,22,38,.8); color: #8ba3c7; font-size: calc(20px * var(--hs,1));
  font-style: italic; font-weight: 800; font-family: serif; cursor: pointer; }
#homeUi .bInfoBtn:active { transform: scale(.92); }
#homeUi .binfoBox .mHead h3 { color: #ffe9a8; }
#homeUi .biIntro { font-size: calc(22px * var(--hs,1)); line-height: 1.65; color: #b9cbe2;
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .biLvRow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .biLvRow span { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .biLvRow b { font-size: calc(24px * var(--hs,1)); color: #ffe9a8; }
#homeUi .biBar { height: calc(12px * var(--hs,1)); border-radius: 99px; background: #0d1930; border: 1px solid #33507a; overflow: hidden; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .biBar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #5cc8ff, #7bdc7b); }
#homeUi .biEff { background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .biEff em { display: block; font-style: normal; font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-bottom: calc(4px * var(--hs,1)); }
#homeUi .biEff span { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; }
#homeUi .biEff.next span { color: #7bdc7b; }
#homeUi .biStatus { font-size: calc(20px * var(--hs,1)); color: #ffd9b0; margin: calc(4px * var(--hs,1)) 0 calc(14px * var(--hs,1)); }
#homeUi .biOk { width: 100%; }

/* ===== 技能详情浮窗（技能卡点击） ===== */
#homeUi .skillCard { cursor: pointer; }
#homeUi .abBox .mHead h3 { color: #ffe9a8; }
#homeUi .abName { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .abName b { font-size: calc(30px * var(--hs,1)); }
#homeUi .abName .lvtag { font-size: calc(20px * var(--hs,1)); }
#homeUi .abEff { background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .abEff em { display: block; font-style: normal; font-size: calc(18px * var(--hs,1)); color: #6a83a8; margin-bottom: calc(4px * var(--hs,1)); }
#homeUi .abEff span { font-size: calc(22px * var(--hs,1)); color: #7ee0ff; }
#homeUi .abEff.next span { color: #7bdc7b; }
#homeUi .abMs { margin: calc(14px * var(--hs,1)) 0; }
#homeUi .abMsHead { font-size: calc(22px * var(--hs,1)); color: #ffe9a8; margin-bottom: calc(8px * var(--hs,1)); }
#homeUi .abMsRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(12px * var(--hs,1));
  border: 1px dashed #33507a; border-radius: calc(8px * var(--hs,1)); margin-bottom: calc(6px * var(--hs,1)); color: #8ba3c7; }
#homeUi .abMsRow.reach { border: 1px solid #8a6a20; background: rgba(240,177,62,.1); color: #ffe9a8; }
#homeUi .abMsLv { flex: none; font-weight: 900; font-size: calc(20px * var(--hs,1)); }
#homeUi .abMsRow span:last-child { font-size: calc(20px * var(--hs,1)); }
#homeUi .abCost { display: flex; align-items: center; justify-content: space-between; gap: calc(12px * var(--hs,1));
  background: rgba(20,32,58,.6); border: 1px solid #24365c; border-radius: calc(10px * var(--hs,1));
  padding: calc(10px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .abCost > span { font-size: calc(20px * var(--hs,1)); color: #ffd9b0; }
#homeUi .abCost .btn { min-width: calc(170px * var(--hs,1)); height: calc(54px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); }

/* ===== 英雄选择条 ===== */
#homeUi .heroPick { display: flex; gap: calc(12px * var(--hs,1)); overflow-x: auto; padding-bottom: calc(12px * var(--hs,1)); }
#homeUi .heroPick::-webkit-scrollbar { display: none; }
#homeUi .hpick { flex: none; width: calc(124px * var(--hs,1)); position: relative; background: none; border: none; cursor: pointer;
  font-family: inherit; color: #8ba3c7; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); }
#homeUi .hpick .pic { width: calc(100px * var(--hs,1)); height: calc(100px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background-color: #16233b; background-position: center; border: 1px solid #33507a; transition: .2s; }
#homeUi .hpick i { font-style: normal; font-size: calc(20px * var(--hs,1)); white-space: nowrap; }
#homeUi .hpick.on .pic { border-color: #f5c451; box-shadow: 0 0 12px rgba(245,196,81,.5); transform: translateY(calc(-6px * var(--hs,1))); }
#homeUi .hpick.on { color: #ffe9a8; }
#homeUi .hpick.lock .pic { filter: grayscale(1) brightness(.55); }
#homeUi .hpick.lock::after { content: '🔒'; position: absolute; transform: translate(calc(32px * var(--hs,1)), calc(-80px * var(--hs,1))); font-size: calc(24px * var(--hs,1)); }

/* ===== 英雄页 ===== */
#homeUi .heroHead { display: flex; justify-content: space-between; align-items: center; margin: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)) calc(12px * var(--hs,1)); }
#homeUi .heroName { font-size: calc(36px * var(--hs,1)); font-weight: 900; letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .star { color: #f5c451; font-size: calc(26px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); margin-left: calc(8px * var(--hs,1)); text-shadow: 0 0 6px rgba(245,196,81,.6); }
#homeUi .tagRow { display: flex; gap: calc(10px * var(--hs,1)); margin-top: calc(10px * var(--hs,1)); }
#homeUi .powerBadge { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); background: linear-gradient(180deg, #2a3f66, #1a2947);
  border: 1px solid #8a6a20; border-radius: 99px; padding: calc(10px * var(--hs,1)) calc(24px * var(--hs,1));
  font-weight: 900; color: #ffe9a8; font-size: calc(28px * var(--hs,1)); box-shadow: 0 0 12px rgba(240,177,62,.2); }
#homeUi .heroMain { display: grid; grid-template-columns: 1fr auto calc(300px * var(--hs,1)) 1fr; align-items: center; gap: calc(8px * var(--hs,1)); padding: calc(12px * var(--hs,1)) 0; }
#homeUi .heroMain .sideActions { display: flex; flex-direction: column; gap: calc(16px * var(--hs,1)); }
#homeUi .heroMain .sideActions .btn { width: calc(180px * var(--hs,1)); height: calc(60px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); padding: 0; }
#homeUi .slotCol { display: flex; flex-direction: column; gap: calc(24px * var(--hs,1)); align-items: center; }
#homeUi .slot { width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); border-radius: calc(18px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #1a2a4a, #0d1626); border: 1px solid #33507a; position: relative;
  display: flex; align-items: center; justify-content: center; font-size: calc(46px * var(--hs,1)); cursor: pointer; }
#homeUi .slot.filled { border-color: #8a6a20; box-shadow: 0 0 8px rgba(240,177,62,.25); }
#homeUi .slot.empty { border-style: dashed; color: #4a608a; }
#homeUi .slot .slv { position: absolute; right: calc(-10px * var(--hs,1)); bottom: calc(-10px * var(--hs,1));
  background: linear-gradient(180deg, #ffe9a8, #e0a23c); color: #5a3a08; font-size: calc(18px * var(--hs,1)); font-weight: 900;
  padding: calc(2px * var(--hs,1)) calc(10px * var(--hs,1)); border-radius: calc(12px * var(--hs,1)); border: 1px solid #8a5c12; }
#homeUi .slot .sname { position: absolute; top: calc(-40px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  font-size: calc(18px * var(--hs,1)); color: #8ba3c7; white-space: nowrap; }
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
#homeUi .heroLv { z-index: 2; margin-top: calc(16px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a; border-radius: 99px;
  font-size: calc(22px * var(--hs,1)); color: #5cc8ff; font-weight: 800; padding: calc(4px * var(--hs,1)) calc(24px * var(--hs,1)); }
#homeUi .statRow { display: flex; gap: calc(16px * var(--hs,1)); margin: calc(16px * var(--hs,1)) 0 calc(24px * var(--hs,1)); }
#homeUi .stat { flex: 1; text-align: center; padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .stat b { display: block; font-size: calc(30px * var(--hs,1)); color: #dce8f7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .row3 { display: flex; gap: calc(16px * var(--hs,1)); margin-top: calc(20px * var(--hs,1)); }
#homeUi .row3 .btn { flex: 1; height: calc(76px * var(--hs,1)); font-size: calc(26px * var(--hs,1)); }

/* ===== 关卡页 ===== */
#homeUi .chTabs { display: flex; gap: calc(12px * var(--hs,1)); }
#homeUi .chTabs button { flex: 1; height: calc(80px * var(--hs,1)); border-radius: calc(18px * var(--hs,1)); border: 1px solid #33507a;
  background: #101d38; color: #8ba3c7; font-family: inherit; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: calc(2px * var(--hs,1)); padding: calc(4px * var(--hs,1)); }
#homeUi .chTabs button b { font-size: calc(22px * var(--hs,1)); white-space: nowrap; }
#homeUi .chTabs button span { font-size: calc(16px * var(--hs,1)); }
#homeUi .chTabs button.on { background: linear-gradient(180deg, #3a567f, #243a63); color: #ffe9a8; border-color: #8a6a20;
  box-shadow: 0 0 12px rgba(240,177,62,.2); }
#homeUi .chTabs button.lock { opacity: .45; }
#homeUi .scene { height: calc(500px * var(--hs,1)); border-radius: calc(24px * var(--hs,1)); overflow: hidden; position: relative; margin-top: calc(28px * var(--hs,1));
  border: 1px solid #3a567f; box-shadow: 0 8px 24px rgba(0,0,0,.45);
  background: linear-gradient(180deg, #2b1b3d, #5a2e2a 45%, #8a4a2a 72%, #3a2a20); }
#homeUi .scene.c2 { background: linear-gradient(180deg, #0d1f1a, #1a3a28 50%, #0e2418); }
#homeUi .scene.c3 { background: linear-gradient(180deg, #0a1030, #1a2050 55%, #101838); }
#homeUi .scene .sun { position: absolute; top: 32%; left: 50%; width: calc(176px * var(--hs,1)); height: calc(176px * var(--hs,1));
  transform: translateX(-50%); border-radius: 50%; background: radial-gradient(circle, #ffe0ae, #ff8c4a 58%, transparent 72%); filter: blur(1px); }
#homeUi .scene.c2 .sun, #homeUi .scene.c3 .sun { display: none; }
#homeUi .scene .mtn { position: absolute; bottom: 26%; left: 0; right: 0; height: calc(128px * var(--hs,1)); background: #241a2c; opacity: .9;
  clip-path: polygon(0 100%, 10% 42%, 20% 68%, 32% 18%, 44% 60%, 56% 28%, 68% 66%, 80% 22%, 92% 58%, 100% 100%); }
#homeUi .scene .hill { position: absolute; bottom: 24%; left: 0; right: 0; height: calc(88px * var(--hs,1)); background: #1a1420;
  clip-path: polygon(0 100%, 15% 55%, 30% 80%, 50% 40%, 70% 75%, 85% 50%, 100% 85%, 100% 100%); }
#homeUi .scene .ground { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; background: linear-gradient(180deg, #3a3128, #221d16); }
#homeUi .scene .road { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; background: #2c2a30;
  clip-path: polygon(40% 0, 60% 0, 108% 100%, -8% 100%); }
#homeUi .scene .dash { position: absolute; bottom: 0; left: 0; right: 0; height: 26%; opacity: .8;
  background: repeating-linear-gradient(180deg, #e8c85a 0 20px, transparent 20px 44px);
  clip-path: polygon(49.2% 0, 50.8% 0, 52% 100%, 48% 100%); }
#homeUi .scene .mobs { position: absolute; top: 8%; left: 0; right: 0; display: flex; justify-content: space-around; font-size: calc(40px * var(--hs,1)); }
#homeUi .scene .mobs span { animation: huiMob 2.6s ease-in-out infinite alternate; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
#homeUi .scene .mobs span:nth-child(2) { animation-delay: .5s; font-size: calc(52px * var(--hs,1)); }
#homeUi .scene .mobs span:nth-child(3) { animation-delay: 1s; font-size: calc(32px * var(--hs,1)); }
@keyframes huiMob { from { transform: translateY(0) scale(1); } to { transform: translateY(32px) scale(1.1); } }
#homeUi .scene .veh { position: absolute; bottom: 7%; left: 50%; transform: translateX(-50%); font-size: calc(92px * var(--hs,1)); z-index: 2;
  filter: drop-shadow(0 8px 10px rgba(0,0,0,.55)); animation: huiVeh 1.8s ease-in-out infinite; }
@keyframes huiVeh { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-6px); } }
#homeUi .scene .crew { position: absolute; bottom: 9%; left: 50%; transform: translateX(-50%); display: flex; gap: calc(28px * var(--hs,1)); z-index: 1; }
#homeUi .scene .crew i { width: calc(22px * var(--hs,1)); height: calc(22px * var(--hs,1)); border-radius: 50%; box-shadow: 0 0 8px currentColor; animation: huiPulse 2s ease-in-out infinite; }
#homeUi .scene .crew i:nth-child(1) { color: #5cc8ff; background: #5cc8ff; }
#homeUi .scene .crew i:nth-child(2) { color: #f5c451; background: #f5c451; animation-delay: .3s; }
#homeUi .scene .crew i:nth-child(3) { color: #7ef0c8; background: #7ef0c8; animation-delay: .6s; }
#homeUi .scene .crew i:nth-child(4) { color: #c792ff; background: #c792ff; animation-delay: .9s; }
#homeUi .sceneInfo { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-start;
  padding: calc(16px * var(--hs,1)); z-index: 5; }
#homeUi .siChip { background: rgba(10,20,38,.8); border: 1px solid #33507a; border-radius: calc(16px * var(--hs,1));
  padding: calc(8px * var(--hs,1)) calc(20px * var(--hs,1)); font-size: calc(22px * var(--hs,1)); font-weight: 700; }
#homeUi .siHp { display: flex; align-items: center; gap: calc(8px * var(--hs,1)); background: rgba(10,20,38,.8);
  border: 1px solid #33507a; border-radius: calc(16px * var(--hs,1)); padding: calc(8px * var(--hs,1)) calc(16px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .hpBar { width: calc(70px * var(--hs,1)); height: calc(6px * var(--hs,1)); border-radius: calc(99px * var(--hs,1));
  background: #0a1426; border: 1px solid #2c405f; overflow: hidden; display: inline-block; }
#homeUi .hpBar i { display: block; height: 100%; width: 82%; background: linear-gradient(90deg, #7fe08a, #3ad06a); }
#homeUi .sceneTitle { position: absolute; top: calc(36px * var(--hs,1)); left: 0; right: 0; text-align: center; z-index: 5; pointer-events: none;
  text-shadow: 0 2px 8px rgba(0,0,0,.6); }
#homeUi .sceneTitle small { display: block; font-size: calc(20px * var(--hs,1)); color: #ffe9a8; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .sceneTitle h1 { font-size: calc(44px * var(--hs,1)); font-weight: 900; color: #fff; letter-spacing: calc(6px * var(--hs,1));
  margin-top: calc(4px * var(--hs,1)); }
#homeUi .sceneTitle p { font-size: calc(18px * var(--hs,1)); color: #dce8f7; opacity: .8; margin-top: calc(4px * var(--hs,1)); }
#homeUi .screenHeading { margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .screenHeading h2 { font-size: calc(34px * var(--hs,1)); font-weight: 900; color: #ffe9a8; letter-spacing: calc(4px * var(--hs,1)); }
#homeUi .screenHeading small { display: block; font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .arrow { position: absolute; top: 46%; width: calc(68px * var(--hs,1)); height: calc(68px * var(--hs,1)); border-radius: 50%; z-index: 6; cursor: pointer;
  background: rgba(10,20,38,.6); border: 1px solid #4f7ab8; color: #ffe9a8; font-size: calc(36px * var(--hs,1)); font-weight: 900;
  display: flex; align-items: center; justify-content: center; }
#homeUi .arrow.l { left: calc(16px * var(--hs,1)); }
#homeUi .arrow.r { right: calc(16px * var(--hs,1)); }
#homeUi .stageInfo { display: flex; gap: calc(16px * var(--hs,1)); margin: calc(24px * var(--hs,1)) 0; }
#homeUi .siBox { flex: 1; text-align: center; padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); color: #8ba3c7; }
#homeUi .siBox b { display: block; font-size: calc(26px * var(--hs,1)); color: #dce8f7; margin-top: calc(6px * var(--hs,1)); }
#homeUi .siBox b.ok { color: #7fe08a; }
#homeUi .siBox b.go { color: #ffe9a8; }

/* ===== 关卡难度选择器（普通/精英/噩梦） ===== */
#homeUi .diffRow { display: flex; align-items: stretch; gap: calc(12px * var(--hs,1)); margin: 0 0 calc(20px * var(--hs,1)); }
#homeUi .diffHead { flex: none; display: flex; align-items: center; font-size: calc(22px * var(--hs,1)); color: #8ba3c7; }
#homeUi .diffBtn { flex: 1; height: auto; padding: calc(10px * var(--hs,1)) calc(8px * var(--hs,1));
  display: flex; flex-direction: column; align-items: center; gap: calc(5px * var(--hs,1)); }
#homeUi .diffBtn b { font-size: calc(23px * var(--hs,1)); }
#homeUi .diffBtn span { font-size: calc(16px * var(--hs,1)); font-weight: 500; opacity: .85; }
#homeUi .diffBtn.lock { opacity: .55; }
#homeUi .diffBtn.on { box-shadow: 0 0 12px rgba(240,177,62,.45); }
#homeUi .chests { display: flex; gap: calc(16px * var(--hs,1)); }
#homeUi .chest { flex: 1; text-align: center; padding: calc(20px * var(--hs,1)) calc(8px * var(--hs,1)) calc(16px * var(--hs,1)); }
#homeUi .chest .cic { font-size: calc(64px * var(--hs,1)); display: block; width: calc(72px * var(--hs,1)); height: calc(72px * var(--hs,1));
  margin: 0 auto; }
#homeUi .chest p { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); }
#homeUi .chest.ready { border-color: #8a6a20; animation: huiChest 1.8s ease-in-out infinite; }
#homeUi .chest .cbtn { margin-top: calc(6px * var(--hs,1)); }
@keyframes huiChest { 0%, 100% { box-shadow: 0 0 6px rgba(240,177,62,.2); } 50% { box-shadow: 0 0 18px rgba(240,177,62,.55); } }
#homeUi .chest.got { opacity: .55; }
#homeUi .chest.got .cic { filter: grayscale(1); }
#homeUi .chest.lock { opacity: .7; }
#homeUi .chest.lock .cic { filter: grayscale(.7) brightness(.8); }
#homeUi .lootPrev { margin: calc(24px * var(--hs,1)) 0 0; padding: calc(20px * var(--hs,1)) calc(24px * var(--hs,1)); }
#homeUi .lootPrev .lpHead { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: #ffe9a8; letter-spacing: calc(2px * var(--hs,1)); margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .lootPrev .lpRow { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); padding: calc(7px * var(--hs,1)) 0; }
#homeUi .lootPrev .lpIc { font-size: calc(24px * var(--hs,1)); flex: none; }
#homeUi .lootPrev .lpLab { flex: 1; font-size: calc(21px * var(--hs,1)); color: #8ba3c7; }
#homeUi .lootPrev .lpVal { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: #dce8f7; font-variant-numeric: tabular-nums; }
#homeUi .lootPrev .lpVal.lpGold { color: #ffd76a; }
#homeUi .lootPrev .lpNote { font-size: calc(17px * var(--hs,1)); color: #6b83a5; margin-top: calc(8px * var(--hs,1)); }
#homeUi .stageBtns { display: flex; gap: calc(20px * var(--hs,1)); margin-top: calc(28px * var(--hs,1)); }
#homeUi .rewardEntry { width: 100%; margin-top: calc(20px * var(--hs,1)); height: calc(64px * var(--hs,1)); font-size: calc(23px * var(--hs,1)); letter-spacing: calc(1px * var(--hs,1)); }
#homeUi .stageBtns .btn.squad { flex: 1; height: calc(88px * var(--hs,1)); font-size: calc(28px * var(--hs,1)); }
#homeUi .stageBtns .btn.go { flex: 1.7; height: calc(88px * var(--hs,1)); font-size: calc(34px * var(--hs,1)); letter-spacing: calc(6px * var(--hs,1)); }

/* ===== 技能页 ===== */
#homeUi .skillCard { display: flex; gap: calc(20px * var(--hs,1)); align-items: center; padding: calc(20px * var(--hs,1)); margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .sIcon { width: calc(96px * var(--hs,1)); height: calc(96px * var(--hs,1)); flex: none; border-radius: calc(20px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1));
  background-color: #16233b; background-position: center; border: 1px solid #3a8ad0; box-shadow: 0 0 8px rgba(60,140,220,.3) inset; }
#homeUi .sIcon.s2 { border-color: #9a5ce0; box-shadow: 0 0 8px rgba(160,90,230,.35) inset; }
#homeUi .sIcon.ult { border-color: #e0a23c; box-shadow: 0 0 12px rgba(240,170,60,.5) inset, 0 0 10px rgba(240,170,60,.25); }
#homeUi .sInfo { flex: 1; min-width: 0; }
#homeUi .sName { font-size: calc(28px * var(--hs,1)); font-weight: 800; display: flex; align-items: center; gap: calc(12px * var(--hs,1)); }
#homeUi .sDesc { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); line-height: 1.5; }
#homeUi .sAct { text-align: center; flex: none; width: calc(164px * var(--hs,1)); }
#homeUi .sLv { font-size: calc(24px * var(--hs,1)); font-weight: 900; color: #5cc8ff; margin-bottom: calc(10px * var(--hs,1)); }
#homeUi .skillHint { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; text-align: center; margin-top: calc(8px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }

/* ===== 公告条（topbar 下全局常驻） ===== */
#homeUi .noticeBar { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); margin: calc(12px * var(--hs,1)) calc(16px * var(--hs,1)) 0;
  padding: calc(8px * var(--hs,1)) calc(18px * var(--hs,1)); background: linear-gradient(90deg, #1c2f55, #243a66);
  border: 1px solid #3a5687; border-radius: calc(14px * var(--hs,1)); position: relative; overflow: hidden; }
#homeUi .noticeBar .nIc { flex: none; font-size: calc(26px * var(--hs,1)); }
#homeUi .noticeBar .nClip { flex: 1; min-width: 0; overflow: hidden; }
#homeUi .noticeText { white-space: nowrap; display: inline-block; padding-left: 100%; font-size: calc(21px * var(--hs,1)); color: #cfe3ff;
  animation: noticeScroll 16s linear infinite; }
#homeUi .noticeBar .nRed { display: none; position: absolute; top: calc(4px * var(--hs,1)); right: calc(10px * var(--hs,1));
  width: calc(14px * var(--hs,1)); height: calc(14px * var(--hs,1)); border-radius: 50%; background: #ff4d4f; border: 1px solid #fff; }
#homeUi .noticeBar .nRed.on { display: block; }
@keyframes noticeScroll { to { transform: translateX(-100%); } }
#homeUi .noticeBox .nItem { padding: calc(16px * var(--hs,1)); margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .noticeBox .nHead { display: flex; align-items: center; gap: calc(10px * var(--hs,1)); }
#homeUi .noticeBox .nTitle { font-size: calc(26px * var(--hs,1)); flex: 1; min-width: 0; }
#homeUi .noticeBox .nDate { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; flex: none; }
#homeUi .noticeBox .nBody { margin-top: calc(10px * var(--hs,1)); font-size: calc(21px * var(--hs,1)); line-height: 1.6; color: #cfe0f5; white-space: pre-line; }

/* ===== 体力获取弹窗 ===== */
#homeUi .staminaBox .stState { padding: calc(14px * var(--hs,1)); text-align: center; margin-bottom: calc(14px * var(--hs,1)); }
#homeUi .staminaBox .stState b { font-size: calc(36px * var(--hs,1)); display: block; letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .staminaBox .stState span { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; display: block; margin-top: calc(6px * var(--hs,1)); }
#homeUi .stRow { display: flex; align-items: center; gap: calc(14px * var(--hs,1)); padding: calc(14px * var(--hs,1)); margin-bottom: calc(12px * var(--hs,1)); }
#homeUi .stRow .stIc { font-size: calc(42px * var(--hs,1)); flex: none; }
#homeUi .stRow .stInfo { flex: 1; min-width: 0; }
#homeUi .stRow .stInfo b { font-size: calc(24px * var(--hs,1)); display: block; }
#homeUi .stRow .stInfo span { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; display: block; margin-top: calc(4px * var(--hs,1)); }

/* ===== 玩法页 ===== */
#homeUi .dutyBanner { padding: calc(20px * var(--hs,1)) calc(24px * var(--hs,1)); display: flex; align-items: center;
  gap: calc(16px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .dutyBanner .dutyInfo { flex: 1; min-width: 0; }
#homeUi .dutyBanner h3 { font-size: calc(28px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .dutyBanner p { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; margin-top: calc(6px * var(--hs,1)); }
#homeUi .dutyBanner .questEntry, #homeUi .dutyBanner .signinEntry { flex: none; }

/* ===== 基地页 ===== */
#homeUi .baseBanner { padding: calc(24px * var(--hs,1)) calc(28px * var(--hs,1)); display: flex; align-items: center; gap: calc(24px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .bbIc { font-size: calc(68px * var(--hs,1)); filter: drop-shadow(0 0 8px rgba(92,200,255,.4)); }
#homeUi .baseBanner h3 { font-size: calc(30px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); }
#homeUi .baseBanner .pros { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin-top: calc(8px * var(--hs,1)); }
#homeUi .prosBar { width: calc(300px * var(--hs,1)); height: calc(12px * var(--hs,1)); background: #0a1426; border: 1px solid #2c405f;
  border-radius: 99px; margin-top: calc(8px * var(--hs,1)); overflow: hidden; }
#homeUi .prosBar i { display: block; height: 100%; width: 62%; background: linear-gradient(90deg, #f0b13e, #ffe9a8); }
#homeUi .baseGrid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(20px * var(--hs,1)); }
#homeUi .bcard { padding: calc(20px * var(--hs,1)); text-align: center; position: relative; }
#homeUi .bIc { width: calc(104px * var(--hs,1)); height: calc(104px * var(--hs,1)); margin: 0 auto calc(12px * var(--hs,1)); border-radius: calc(24px * var(--hs,1));
  display: flex; align-items: center; justify-content: center; font-size: calc(52px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #0d1626); border: 1px solid #33507a; }
#homeUi .bName { font-size: calc(26px * var(--hs,1)); font-weight: 800; }
#homeUi .bName span { color: #5cc8ff; font-size: calc(22px * var(--hs,1)); margin-left: calc(6px * var(--hs,1)); }
#homeUi .bDesc { font-size: calc(20px * var(--hs,1)); color: #8ba3c7; margin: calc(8px * var(--hs,1)) 0 calc(16px * var(--hs,1)); min-height: calc(56px * var(--hs,1)); line-height: 1.4; }

/* ===== 弹窗 ===== */
#homeUi .protoMask { position: absolute; inset: 0; background: rgba(4,8,16,.72); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: calc(40px * var(--hs,1)); }
#homeUi .mbox { width: 100%; max-height: 82%; overflow-y: auto; background: linear-gradient(180deg, #22355c, #14203a);
  border: 1px solid #4a6a9a; border-radius: calc(28px * var(--hs,1)); padding: calc(32px * var(--hs,1)) calc(28px * var(--hs,1));
  box-shadow: 0 20px 50px rgba(0,0,0,.6); }
#homeUi .mHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .mHead h3 { font-size: calc(32px * var(--hs,1)); letter-spacing: calc(2px * var(--hs,1)); color: #ffe9a8; }
#homeUi .mClose { background: #0d1930; border: 1px solid #33507a; color: #8ba3c7; width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1));
  border-radius: 50%; cursor: pointer; font-size: calc(24px * var(--hs,1)); }
#homeUi .mSub { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; margin-bottom: calc(20px * var(--hs,1)); }
#homeUi .mRow { display: flex; justify-content: space-between; align-items: center; background: #0d1930; border: 1px solid #33507a;
  border-radius: calc(18px * var(--hs,1)); padding: calc(20px * var(--hs,1)); margin-bottom: calc(16px * var(--hs,1)); font-size: calc(24px * var(--hs,1)); gap: calc(16px * var(--hs,1)); }
#homeUi .bagTabs { display: flex; gap: calc(12px * var(--hs,1)); margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .bagTabs button { flex: 1; height: calc(56px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); border: 1px solid #33507a;
  background: #101d38; color: #8ba3c7; font-family: inherit; font-size: calc(24px * var(--hs,1)); font-weight: 700; cursor: pointer; }
#homeUi .bagTabs button.on { color: #ffe9a8; border-color: #8a6a20; background: #1c2c4d; }
#homeUi .bagGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(16px * var(--hs,1)); }
#homeUi .bcell { position: relative; border-radius: calc(18px * var(--hs,1)); background: radial-gradient(circle at 50% 30%, #1a2a4a, #0d1626);
  border: 1px solid #33507a; height: calc(124px * var(--hs,1)); display: flex; align-items: center; justify-content: center; font-size: calc(48px * var(--hs,1)); cursor: pointer; }
#homeUi .bcell.r3 { border-color: #3a8ad0; }
#homeUi .bcell.r4 { border-color: #9a5ce0; }
#homeUi .bcell.r5 { border-color: #ff9d45; }
#homeUi .bcell.r6 { border-color: #ff5252; box-shadow: 0 0 10px rgba(255,82,82,.5); }
#homeUi .bcell em { position: absolute; right: calc(6px * var(--hs,1)); bottom: calc(4px * var(--hs,1)); font-style: normal;
  font-size: calc(18px * var(--hs,1)); color: #dce8f7; font-weight: 700; text-shadow: 0 1px 2px #000; }
#homeUi .bagBar { margin-top: calc(20px * var(--hs,1)); padding: calc(20px * var(--hs,1)); border-radius: calc(22px * var(--hs,1));
  background: linear-gradient(180deg, #1a2947, #14203a); border: 1px solid #33507a; }
#homeUi .bagBar .bagTabs { margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .bagBar .bagGrid { grid-template-columns: repeat(5, 1fr); gap: calc(12px * var(--hs,1)); max-height: calc(300px * var(--hs,1)); overflow-y: auto; }
#homeUi .bagBar .bcell { height: calc(110px * var(--hs,1)); font-size: calc(44px * var(--hs,1)); }
#homeUi .sqRow { display: flex; gap: calc(16px * var(--hs,1)); justify-content: center; margin-bottom: calc(24px * var(--hs,1)); }
#homeUi .sqSlot { width: calc(132px * var(--hs,1)); height: calc(148px * var(--hs,1)); border-radius: calc(20px * var(--hs,1));
  background: radial-gradient(circle at 50% 30%, #2a4470, #0d1626); border: 1px solid #8a6a20; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(8px * var(--hs,1)); font-size: calc(48px * var(--hs,1)); }
#homeUi .sqSlot span { font-size: calc(20px * var(--hs,1)); color: #dce8f7; font-weight: 700; }
#homeUi .sqSlot.empty { border-style: dashed; border-color: #33507a; color: #4a608a; }
#homeUi .bondRow { display: flex; align-items: center; gap: calc(12px * var(--hs,1)); padding: calc(12px * var(--hs,1)) calc(16px * var(--hs,1));
  margin-bottom: calc(10px * var(--hs,1)); border-radius: calc(14px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a;
  font-size: calc(21px * var(--hs,1)); opacity: .55; }
#homeUi .bondRow.on { opacity: 1; border-color: #8a6a20; background: #1c2c4d; }
#homeUi .bondRow .bondIc { flex: none; font-size: calc(24px * var(--hs,1)); }
#homeUi .bondRow .bondName { flex: none; font-weight: 700; color: #ffe9a8; }
#homeUi .bondRow .bondDesc { flex: 1; color: #dce8f7; }
#homeUi .bondRow .bondState { flex: none; font-size: calc(18px * var(--hs,1)); color: #8ba3c7; }
#homeUi .bondRow.on .bondState { color: #9be29b; }
#homeUi .cand { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(16px * var(--hs,1)); }
#homeUi .candB { border: 1px solid #33507a; background: #101d38; border-radius: calc(18px * var(--hs,1)); padding: calc(16px * var(--hs,1)) calc(4px * var(--hs,1));
  cursor: pointer; font-family: inherit; color: #dce8f7; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1)); font-size: calc(20px * var(--hs,1)); }
#homeUi .equipRow { display: flex; align-items: center; gap: calc(16px * var(--hs,1)); padding: calc(16px * var(--hs,1)) calc(20px * var(--hs,1));
  border-radius: calc(18px * var(--hs,1)); background: #0d1930; border: 1px solid #33507a; margin-bottom: calc(16px * var(--hs,1)); }
#homeUi .equipInfo { flex: 1; min-width: 0; }
#homeUi .equipName { font-size: calc(26px * var(--hs,1)); font-weight: 700; }
#homeUi .equipStat { font-size: calc(22px * var(--hs,1)); color: #8ba3c7; margin-top: calc(4px * var(--hs,1)); }
#homeUi .matNeed { color: #ffd9b0; font-size: calc(19px * var(--hs,1)); }
#homeUi .mRow .matNeed { display: block; margin-top: calc(4px * var(--hs,1)); }

/* ===== 装备词缀 ===== */
#homeUi .bcellAffix { position: absolute; left: calc(6px * var(--hs,1)); top: calc(4px * var(--hs,1));
  font-size: calc(18px * var(--hs,1)); color: #ffd76a; text-shadow: 0 0 calc(8px * var(--hs,1)) rgba(255,215,106,.9); }
#homeUi .affixMark { color: #ffd76a; font-size: calc(22px * var(--hs,1)); }
#homeUi .affixBox { margin: calc(-8px * var(--hs,1)) 0 calc(16px * var(--hs,1)) 0; padding: calc(12px * var(--hs,1)) calc(18px * var(--hs,1));
  border-radius: calc(14px * var(--hs,1)); background: #0a1526; border: 1px dashed #3d5a85;
  display: flex; flex-direction: column; gap: calc(6px * var(--hs,1)); }
#homeUi .affixHead { font-size: calc(19px * var(--hs,1)); color: #8ba3c7; }
#homeUi .affixRow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(10px * var(--hs,1));
  font-size: calc(21px * var(--hs,1)); }
#homeUi .affixName { font-weight: 700; }
#homeUi .affixVal { color: #dce8f7; }

/* ===== 底部导航 ===== */
#homeUi .tabbar { flex: none; height: calc(150px * var(--hs,1)); display: flex; align-items: center; justify-content: space-around; position: relative; z-index: 20;
  background: linear-gradient(180deg, #182947, #0b1426); border-top: 1px solid #33507a; }
#homeUi .tabbar::before { content: ''; position: absolute; top: -1px; left: 8%; right: 8%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(240,177,62,.55), transparent); }
#homeUi .tab { background: none; border: none; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--hs,1));
  color: #7e93b8; font-size: calc(22px * var(--hs,1)); font-weight: 700; padding: calc(12px * var(--hs,1)) calc(8px * var(--hs,1)); position: relative; }
#homeUi .tab .ticon { width: calc(52px * var(--hs,1)); height: calc(52px * var(--hs,1)); display: flex; align-items: center; justify-content: center;
  font-size: calc(42px * var(--hs,1)); filter: grayscale(.4); transition: .2s; }
#homeUi .tab.on { color: #ffe9a8; }
#homeUi .tab.on .ticon { filter: none; transform: translateY(calc(-4px * var(--hs,1))) scale(1.12); filter: drop-shadow(0 0 8px rgba(245,196,81,.8)); }
#homeUi .tab.on::after { content: ''; position: absolute; top: calc(-18px * var(--hs,1)); left: 50%; transform: translateX(-50%);
  width: calc(52px * var(--hs,1)); height: calc(6px * var(--hs,1)); border-radius: 99px;
  background: linear-gradient(90deg, transparent, #f5c451, transparent); box-shadow: 0 0 8px #f5c451; }
#homeUi .tab.main { margin-top: calc(-60px * var(--hs,1)); width: calc(128px * var(--hs,1)); height: calc(128px * var(--hs,1)); border-radius: 50%; color: #5a3a08;
  background: linear-gradient(180deg, #ffe9a6, #f0b13e 55%, #c9861f); border: 2px solid #8a5c12;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #7c520f, 0 8px 20px rgba(240,177,62,.45);
  font-size: calc(22px * var(--hs,1)); animation: huiMain 2.4s ease-in-out infinite; }
#homeUi .tab.main .ticon { font-size: calc(48px * var(--hs,1)); filter: none; }
#homeUi .tab.main.on::after { display: none; }
@keyframes huiMain { 0%, 100% { box-shadow: inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #7c520f, 0 8px 20px rgba(240,177,62,.45); }
  50% { box-shadow: inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #7c520f, 0 8px 30px rgba(240,177,62,.75); } }

/* ===== 广告层/水印 ===== */
#homeUi .adOverlay { position: absolute; inset: 0; z-index: 400; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: calc(24px * var(--hs,1)); background: rgba(4,8,16,.92); }
#homeUi .adTitle { font-size: calc(40px * var(--hs,1)); color: #ffe9a8; font-weight: 800; }
#homeUi .adCountdown { font-size: calc(120px * var(--hs,1)); color: #5cc8ff; font-weight: 900; }
#homeUi .adTip { font-size: calc(24px * var(--hs,1)); color: #8ba3c7; }
#homeUi .homeStamp { position: absolute; right: calc(16px * var(--hs,1)); bottom: calc(160px * var(--hs,1)); font-size: calc(16px * var(--hs,1));
  color: rgba(140,170,210,.4); z-index: 5; pointer-events: none; }

/* ================================================================
   浅色青瓷主题覆盖层 —— 一比一翻译 prototype-assets/interface.css
   （原型第 317 行外链皮肤；像素口径 430px 手机框 × var(--pw)）
   ================================================================ */
#homeUi { letter-spacing: 0 !important;
  background: #243f47; background-image: none;
  color: #243e4d; }
#homeUi .pAvatar, #homeUi .pinfo, #homeUi .pname, #homeUi .lvtag, #homeUi .expbar, #homeUi .expnum,
#homeUi .reswrap, #homeUi .res, #homeUi .viewport, #homeUi .screen, #homeUi .panel, #homeUi .secTitle,
#homeUi .btn, #homeUi .tag, #homeUi .toastEl, #homeUi .shopBanner, #homeUi .sbTxt, #homeUi .shopTabs,
#homeUi .shopGrid, #homeUi .good, #homeUi .gIc, #homeUi .gName, #homeUi .gTag, #homeUi .gBuy, #homeUi .gHot,
#homeUi .heroPick, #homeUi .hpick, #homeUi .heroHead, #homeUi .heroName, #homeUi .star, #homeUi .tagRow,
#homeUi .powerBadge, #homeUi .heroMain, #homeUi .slotCol, #homeUi .slot, #homeUi .heroFigure, #homeUi .halo,
#homeUi .halo2, #homeUi .heroEmoji, #homeUi .heroLv, #homeUi .statRow, #homeUi .stat, #homeUi .row3,
#homeUi .chTabs, #homeUi .scene, #homeUi .sceneInfo, #homeUi .siChip,
#homeUi .siHp, #homeUi .hpBar, #homeUi .sceneTitle, #homeUi .screenHeading, #homeUi .arrow, #homeUi .stageInfo,
#homeUi .siBox, #homeUi .chests, #homeUi .chest, #homeUi .stageBtns, #homeUi .skillCard, #homeUi .sIcon,
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
/* 公告条跑马灯：同上——在 animation:none 白名单之后重声明，保证浅色主题下滚动不被清掉 */
#homeUi .noticeText { animation: noticeScroll 16s linear infinite; }

/* --- 公告条与公告弹窗（青瓷浅色变体） --- */
#homeUi .noticeBar { margin: calc(5px * var(--pw,2.5)) calc(10px * var(--pw,2.5)) 0; padding: calc(4px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  background: #eef5f9; border: 1px solid #bdced8; border-radius: calc(6px * var(--pw,2.5)); gap: calc(6px * var(--pw,2.5)); }
#homeUi .noticeBar .nIc { font-size: calc(14px * var(--pw,2.5)); }
#homeUi .noticeText { font-size: calc(12px * var(--pw,2.5)); color: #527085; }
#homeUi .noticeBar .nRed { top: calc(2px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); width: calc(8px * var(--pw,2.5)); height: calc(8px * var(--pw,2.5)); border: none; }
#homeUi .noticeBox .nItem { padding: calc(9px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .noticeBox .nTitle { font-size: calc(14px * var(--pw,2.5)); }
#homeUi .noticeBox .nDate { font-size: calc(10px * var(--pw,2.5)); color: #7a93a8; }
#homeUi .noticeBox .nBody { margin-top: calc(6px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); color: #3d5a70; }

/* --- 体力获取弹窗（青瓷浅色变体） --- */
#homeUi .staminaBox .stState b { font-size: calc(19px * var(--pw,2.5)); }
#homeUi .staminaBox .stState span { font-size: calc(11px * var(--pw,2.5)); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .stRow { padding: calc(8px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); margin-bottom: calc(7px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .stRow .stIc { font-size: calc(22px * var(--pw,2.5)); }
#homeUi .stRow .stInfo b { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .stRow .stInfo span { font-size: calc(10px * var(--pw,2.5)); margin-top: calc(2px * var(--pw,2.5)); }

/* --- 布局骨架 --- */
#homeUi .topbar { display: grid; grid-template-columns: calc(44px * var(--pw,2.5)) 1fr; gap: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  padding: calc(12px * var(--pw,2.5)) calc(16px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  background: linear-gradient(#50788c, #355b70); border-bottom: calc(3px * var(--pw,2.5)) solid #26485b; color: #fff; }
#homeUi .pAvatar { height: calc(44px * var(--pw,2.5)); width: calc(44px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  background: #eab56c; padding: calc(2px * var(--pw,2.5)); grid-row: 1; }
#homeUi .pAvatar > div { border-radius: calc(6px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .pinfo { width: auto; display: grid; grid-template-columns: 1fr auto; align-items: center;
  gap: calc(2px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); }
#homeUi .pname { font-size: calc(14px * var(--pw,2.5)); grid-column: 1 / -1; }
#homeUi .expnum { font-size: calc(10px * var(--pw,2.5)); color: #d5e5eb; margin: 0; }
#homeUi .expbar { margin: 0; background: #25485d; border: none; height: calc(6px * var(--pw,2.5)); border-radius: 0; }
#homeUi .expbar i { box-shadow: none; background: #89cbd5; border-radius: 0; }
#homeUi .lvtag { background: #efc780; border: 1px solid #c7944b; color: #64421d; border-radius: calc(3px * var(--pw,2.5)); font-weight: inherit; }
#homeUi .reswrap { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: calc(7px * var(--pw,2.5)); }
#homeUi .res { min-width: 0; border: 1px solid #274a5e; border-radius: calc(5px * var(--pw,2.5)); background: #294d62;
  font-size: calc(12px * var(--pw,2.5)); padding: calc(4px * var(--pw,2.5)) calc(5px * var(--pw,2.5));
  gap: calc(4px * var(--pw,2.5)); box-shadow: inset 0 1px 2px #183b53; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .res b { color: #fff; flex: 1; }
#homeUi .res .add { width: calc(24px * var(--pw,2.5)); height: calc(24px * var(--pw,2.5)); background: #789e6d;
  color: #fff; border-radius: calc(4px * var(--pw,2.5)); margin: 0; font-size: calc(17px * var(--pw,2.5)); }
#homeUi .viewport { background: #e6eef3; background-image: none; }
#homeUi .screen { padding: calc(16px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(20px * var(--pw,2.5)); }
#homeUi .screen.sStage { padding: 0 0 calc(14px * var(--pw,2.5)); }
#homeUi .panel { background: linear-gradient(#fcfdfe, #eaf1f5); border: 1px solid #b5c8d5;
  border-radius: calc(8px * var(--pw,2.5)); box-shadow: 0 2px 0 #aebfcd55, inset 0 1px #fff; }
#homeUi .frame::before, #homeUi .frame::after { display: none; content: none; }
#homeUi .secTitle { font-size: calc(14px * var(--pw,2.5)); margin: calc(15px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  color: #355365; letter-spacing: 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .secTitle::before { background: #eb9843; height: calc(16px * var(--pw,2.5)); width: calc(4px * var(--pw,2.5)); }

/* --- 按钮 / 标签 --- */
#homeUi .btn { border-radius: calc(6px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); box-shadow: none;
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
#homeUi .tag.g { background: #fff1d8; border-color: #d7b279; color: #88551f; }
#homeUi .tag.b { background: #dfedf5; color: #28637f; border-color: #97bacd; }
#homeUi .tag.p { background: #eee5f2; color: #765188; border-color: #bda1cc; }
#homeUi .goldT { color: #945d24; }

/* --- Toast / 弹窗 --- */
#homeUi .toastEl { background: #244b60; color: #fff; border: 1px solid #89abbf; border-radius: calc(7px * var(--pw,2.5));
  white-space: normal; text-align: center; max-width: calc(100% - 32px); width: max-content; line-height: 1.6;
  bottom: calc(95px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); font-weight: 700;
  padding: calc(9px * var(--pw,2.5)) calc(18px * var(--pw,2.5)); }
#homeUi .protoMask { background: #183b50b8; backdrop-filter: blur(4px); padding: calc(16px * var(--pw,2.5)); }
#homeUi .mbox { background: #edf4f8; border: calc(2px * var(--pw,2.5)) solid #9db9ca; border-radius: calc(10px * var(--pw,2.5));
  padding: calc(16px * var(--pw,2.5)); box-shadow: 0 15px 50px #12324366; }
#homeUi .mHead h3 { font-size: calc(18px * var(--pw,2.5)); color: #31536a; }
#homeUi .mHead { gap: calc(8px * var(--pw,2.5)); }
#homeUi .mClose { height: calc(44px * var(--pw,2.5)); width: calc(44px * var(--pw,2.5)); flex: none; background: #dae6ee;
  border-color: #a5becd; color: #365b70; border-radius: calc(6px * var(--pw,2.5)); font-size: calc(17px * var(--pw,2.5)); }
#homeUi .mSub { font-size: calc(12px * var(--pw,2.5)); line-height: 1.7; color: #536f7f; }
#homeUi .mRow { background: #fff; border-color: #c2d3df; border-radius: calc(5px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5));
  flex-wrap: wrap; font-size: calc(13px * var(--pw,2.5)); }
#homeUi .bagTabs button { height: calc(44px * var(--pw,2.5)); background: #d7e4ed; color: #526d7d; border-color: #b1c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .bagTabs button.on { background: #fff8e9; color: #8c5927; border-color: #d8ad74; box-shadow: inset 0 -2px #e9ab5c; }
#homeUi .bcell { background: #dce8ef; border: 1px solid #b8cbd7; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .bcell.r3 { border-color: #5a9ad0; }
#homeUi .bcell.r4 { border-color: #a678d8; }
#homeUi .bcell.r5 { border-color: #e8892e; }
#homeUi .bcell.r6 { border-color: #e04848; box-shadow: 0 0 6px rgba(224,72,72,.45); }
#homeUi .bcell em { color: #395a6b; text-shadow: none; }
#homeUi .bagBar { margin-top: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5));
  background: linear-gradient(#eaf1f6, #dce8ef); border: 1px solid #b5c8d5; border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs { gap: calc(6px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .bagBar .bagTabs button { height: calc(38px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .bagBar .bagGrid { grid-template-columns: repeat(5, 1fr); gap: calc(6px * var(--pw,2.5)); max-height: calc(120px * var(--pw,2.5)); }
#homeUi .bagBar .bcell { height: calc(52px * var(--pw,2.5)); font-size: calc(22px * var(--pw,2.5)); border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .bagBar .bcell em { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .sqRow { gap: calc(6px * var(--pw,2.5)); }
#homeUi .sqSlot { min-width: 0; flex: 1; background: #d9e7ef; border: 1px solid #b8cbd7; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .sqSlot span { color: #243e4d; }
#homeUi .sqSlot.empty { border-style: dashed; border-color: #b8cbd7; color: #758994; }
#homeUi .candB { background: #e1ebf2; border: 1px solid #b3c8d6; border-radius: calc(5px * var(--pw,2.5)); min-height: calc(64px * var(--pw,2.5)); color: #243e4d; }
#homeUi .bondRow { background: #fff; border-color: #c2d3df; border-radius: calc(5px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(8px * var(--pw,2.5)); gap: calc(6px * var(--pw,2.5)); }
#homeUi .bondRow.on { background: #fdf3d7; border-color: #d9b06a; }
#homeUi .bondRow .bondIc { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .bondRow .bondName { color: #88551f; }
#homeUi .bondRow .bondDesc { color: #243e4d; }
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
#homeUi .shopTabs button { height: calc(44px * var(--pw,2.5)); background: #d7e4ed; color: #526d7d; border-color: #b1c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }
#homeUi .shopTabs button.on { background: #fff8e9; color: #8c5927; border-color: #d8ad74; box-shadow: inset 0 -2px #e9ab5c; }
#homeUi .good { padding: calc(10px * var(--pw,2.5)); }
#homeUi .gIc { height: calc(92px * var(--pw,2.5)); background: linear-gradient(#e8f0f6, #d4e2eb); border-color: #b3c6d5;
  border-radius: calc(5px * var(--pw,2.5)); font-size: calc(38px * var(--pw,2.5)); }
#homeUi .good.r3 .gIc { border-color: #5a9ad0; box-shadow: 0 0 5px rgba(90,154,208,.4) inset; }
#homeUi .good.r4 .gIc { border-color: #a678d8; box-shadow: 0 0 5px rgba(166,120,216,.45) inset; }
#homeUi .good.r5 .gIc { border-color: #e8892e; box-shadow: 0 0 6px rgba(232,137,46,.5) inset; }
#homeUi .good.r6 .gIc { border-color: #e04848; box-shadow: 0 0 7px rgba(224,72,72,.6) inset, 0 0 6px rgba(224,72,72,.4); }
#homeUi .gName { font-size: calc(15px * var(--pw,2.5)); }
#homeUi .gTag { font-size: calc(11px * var(--pw,2.5)); margin: calc(4px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); }
#homeUi .gBuy { height: calc(44px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); }
#homeUi .gHot { background: #b54f37; border-radius: calc(3px * var(--pw,2.5)); font-size: calc(9px * var(--pw,2.5));
  top: calc(8px * var(--pw,2.5)); right: calc(7px * var(--pw,2.5)); box-shadow: none; }
#homeUi .screenHeading { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 calc(14px * var(--pw,2.5)); }
#homeUi .screenHeading h2 { font-size: calc(23px * var(--pw,2.5)); color: #264756; font-weight: 900; letter-spacing: 0; }
#homeUi .screenHeading small { font-size: calc(11px * var(--pw,2.5)); color: #536f7f; font-weight: 700; margin: 0; }

/* --- 英雄选择条 / 英雄页 --- */
#homeUi .heroPick { padding: calc(4px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); }
#homeUi .hpick { width: calc(60px * var(--pw,2.5)); color: #536f7f; }
#homeUi .hpick .pic { height: calc(56px * var(--pw,2.5)); width: calc(54px * var(--pw,2.5)); background-color: #d9e6ef;
  border: 2px solid #b5c9d7; border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .hpick.on .pic { box-shadow: 0 2px 0 #cc9854; border-color: #e5ac5e; transform: none; background-color: #fff0d9; }
#homeUi .hpick.on { color: #855522; }
#homeUi .hpick i { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .hpick.lock::after { top: calc(5px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); transform: none; }
#homeUi .heroHead { align-items: flex-start; margin: calc(10px * var(--pw,2.5)) 0 calc(10px * var(--pw,2.5)); gap: calc(4px * var(--pw,2.5)); }
#homeUi .heroName { font-size: calc(20px * var(--pw,2.5)); }
#homeUi .star { display: block; margin: calc(3px * var(--pw,2.5)) 0 0; color: #b97620; text-shadow: none; }
#homeUi .tagRow { flex-wrap: wrap; gap: calc(3px * var(--pw,2.5)); }
#homeUi .powerBadge { padding: calc(6px * var(--pw,2.5)) calc(8px * var(--pw,2.5)); background: #fff1d9; border-color: #d2ad75;
  color: #875623; border-radius: calc(5px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); box-shadow: none; }
#homeUi .heroMain { grid-template-columns: calc(60px * var(--pw,2.5)) auto minmax(0, 1fr) calc(60px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5));
  padding: calc(10px * var(--pw,2.5)) 0; background: linear-gradient(transparent, #d2e2eb); margin: 0 calc(-2px * var(--pw,2.5)); }
#homeUi .heroMain .slotCol { justify-content: center; }
#homeUi .heroMain .sideActions { align-self: stretch; justify-content: space-evenly; gap: 0; padding: calc(24px * var(--pw,2.5)) 0; }
#homeUi .heroMain .sideActions .btn { width: calc(52px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5));
  padding: 0; border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .heroMain .sideActions .btn.blue { background: linear-gradient(#fdfefe, #c9dcea); border: 1px solid #a9c0cf; color: #243e4d;
  box-shadow: 0 calc(2px * var(--pw,2.5)) 0 #9fb6c5; }
#homeUi .heroFigure { height: calc(220px * var(--pw,2.5)); }
#homeUi .halo, #homeUi .halo2 { display: none; }
#homeUi .heroEmoji { width: 100%; max-width: calc(150px * var(--pw,2.5)); height: calc(190px * var(--pw,2.5)); filter: none; }
#homeUi .heroLv { background: #eaf2f7; border-color: #aac0cf; border-radius: calc(4px * var(--pw,2.5));
  padding: calc(4px * var(--pw,2.5)) calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); margin: 0; color: #236581; }
#homeUi .slotCol { gap: calc(29px * var(--pw,2.5)); }
#homeUi .slot { height: calc(48px * var(--pw,2.5)); width: calc(48px * var(--pw,2.5));
  background: linear-gradient(#f9fbfc, #d5e4ed); border-color: #afc3d1; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .slot.filled { border-color: #bc9b63; box-shadow: inset 0 0 0 2px #f7e8cb; }
#homeUi .slot .sname { top: calc(-17px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #536f7f; }
#homeUi .slot .slv { border-radius: calc(3px * var(--pw,2.5)); background: #ecd1a0; border-color: #c69c5e; }
#homeUi .statRow { gap: 0; margin: 0 0 calc(14px * var(--pw,2.5)); background: #f5f9fb; border-bottom: 1px solid #becfda; }
#homeUi .stat { border: none; border-radius: 0; background: none; box-shadow: none; padding: calc(11px * var(--pw,2.5)) calc(2px * var(--pw,2.5));
  font-size: calc(12px * var(--pw,2.5)); color: #536f7f; }
#homeUi .stat b { font-size: calc(18px * var(--pw,2.5)); color: #243e4d; }
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
#homeUi .scene, #homeUi .scene.c1, #homeUi .scene.c2, #homeUi .scene.c3 { height: calc(290px * var(--pw,2.5));
  margin: calc(2px * var(--pw,2.5)) 0 0; border: 0; border-radius: 0; background-color: #8dbac0;
  background-image: none; box-shadow: none; overflow: hidden; }
#homeUi .scene > .sun, #homeUi .scene > .mtn, #homeUi .scene > .hill, #homeUi .scene > .ground, #homeUi .scene > .road,
#homeUi .scene > .dash, #homeUi .scene > .water, #homeUi .scene > .mobs, #homeUi .scene > .veh, #homeUi .scene > .crew,
#homeUi .scene > .plane, #homeUi .scene > .cloud, #homeUi .scene > .bolt { display: none !important; }
#homeUi .scene::after { content: ''; position: absolute; inset: 55% 0 0; display: block; width: auto; height: auto;
  border: 0; border-radius: 0; opacity: 1; z-index: 1; pointer-events: none;
  background: linear-gradient(transparent, #173d4dcc); }
#homeUi .sceneInfo { padding: calc(12px * var(--pw,2.5)); gap: calc(6px * var(--pw,2.5)); }
#homeUi .siChip { background: #f7fcf3ed; border: 1px solid #fff; border-radius: calc(4px * var(--pw,2.5));
  color: #365360; font-size: calc(11px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(8px * var(--pw,2.5));
  box-shadow: 0 2px 6px #24465326; }
#homeUi .siHp { background: #234b5be8; color: #fff; font-size: calc(10px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)); border: 1px solid #8db4bd; border-radius: calc(4px * var(--pw,2.5));
  gap: calc(4px * var(--pw,2.5)); }
#homeUi .hpBar { width: calc(40px * var(--pw,2.5)); border: none; background: #173c49; height: calc(5px * var(--pw,2.5)); border-radius: 0; }
#homeUi .hpBar i { background: #91ce93; }
#homeUi .arrow { width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); top: 43%;
  background: #244a5d9c; border: 1px solid #c3dce291; color: #fff; border-radius: calc(6px * var(--pw,2.5)); font-size: calc(18px * var(--pw,2.5)); }
#homeUi .arrow:hover { background: #244a5dd9; }
#homeUi .sceneTitle { position: absolute; bottom: calc(17px * var(--pw,2.5)); left: calc(18px * var(--pw,2.5));
  top: auto; right: auto; text-align: left; z-index: 3; color: #fff; text-shadow: 0 2px 4px #153c50; pointer-events: none; }
#homeUi .sceneTitle small { font-size: calc(10px * var(--pw,2.5)); font-weight: 800; color: #fbd194; letter-spacing: 0; }
#homeUi .sceneTitle h1 { font-size: calc(26px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); font-weight: 900; letter-spacing: 0; }
#homeUi .sceneTitle p { font-size: calc(11px * var(--pw,2.5)); margin-top: calc(5px * var(--pw,2.5)); color: #e0eef1; }
#homeUi .stageInfo { margin: 0; padding: calc(12px * var(--pw,2.5)); background: #f8fafb; border-bottom: 1px solid #bfced8; gap: 0; }
#homeUi .siBox b.go { color: #9a6a20; }

/* --- 关卡难度选择器（青瓷浅色变体） --- */
#homeUi .diffRow { padding: calc(8px * var(--pw,2.5)) calc(12px * var(--pw,2.5)); background: #f8fafb; border-bottom: 1px solid #bfced8; gap: calc(6px * var(--pw,2.5)); margin: 0; }
#homeUi .diffHead { font-size: calc(11px * var(--pw,2.5)); color: #536f7f; }
#homeUi .diffBtn { border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); gap: calc(3px * var(--pw,2.5)); }
#homeUi .diffBtn b { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .diffBtn span { font-size: calc(10px * var(--pw,2.5)); }
#homeUi .diffBtn.dark { background: #e7eff5; border-color: #bdced8; color: #536f7f; }
#homeUi .siBox { background: none; border: none; border-radius: 0; box-shadow: none; padding: 0 calc(5px * var(--pw,2.5));
  font-size: calc(10px * var(--pw,2.5)); color: #536f7f; }
#homeUi .siBox + .siBox { border-left: 1px solid #c9d6df; }
#homeUi .siBox b { font-size: calc(12px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); color: #243e4d; }
#homeUi .siBox:first-child { flex: 1.5; }
#homeUi .siBox b.ok { color: #267555; }
#homeUi .siBox b.go { color: #9b5a20; }
#homeUi .chests { margin: 0 calc(14px * var(--pw,2.5)); gap: calc(8px * var(--pw,2.5)); }
#homeUi .chest { padding: calc(8px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); min-width: 0; }
#homeUi .chest .cic { height: calc(38px * var(--pw,2.5)); font-size: calc(28px * var(--pw,2.5));
  width: calc(48px * var(--pw,2.5)); background-size: contain; background-repeat: no-repeat; background-position: center; }
#homeUi .chest p { font-size: calc(10px * var(--pw,2.5)); color: #536f7f; }
#homeUi .chest .tag { font-size: calc(9px * var(--pw,2.5)); border: none; background: none; padding: calc(3px * var(--pw,2.5)) 0;
  white-space: normal; min-height: calc(40px * var(--pw,2.5)); display: grid !important; place-items: center; color: #456477; }
#homeUi .chest.ready { background: #fff5dd; border: 1px solid #d5a254; }
#homeUi .chest.got, #homeUi .chest.lock { opacity: 1; }
#homeUi .chest.got .cic { opacity: .6; }
#homeUi .chest .cbtn { height: calc(44px * var(--pw,2.5)); min-height: calc(44px * var(--pw,2.5)); width: 85%;
  font-size: calc(12px * var(--pw,2.5)); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .stageBtns { position: sticky; bottom: calc(-14px * var(--pw,2.5)); z-index: 10;
  margin: calc(12px * var(--pw,2.5)) 0 calc(-14px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) calc(15px * var(--pw,2.5));
  background: #e6eef3f5; border-top: 1px solid #cedce5; gap: calc(10px * var(--pw,2.5)); }
#homeUi .stageBtns .btn.squad, #homeUi .stageBtns .btn.go { height: calc(49px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); }
#homeUi .stageBtns .btn.go { font-size: calc(18px * var(--pw,2.5)); letter-spacing: 0; }
#homeUi .stageBtns .go.endless { background: linear-gradient(#dfeaf1, #c3d6e2); border-color: #9db9ca; color: #4a7ba6; box-shadow: inset 0 1px #fff; }
#homeUi .lootPrev { margin: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5)) 0; padding: calc(10px * var(--pw,2.5)) calc(14px * var(--pw,2.5));
  background: #fdfefe; }
#homeUi .lootPrev .lpHead { font-size: calc(13px * var(--pw,2.5)); color: #8c5927; letter-spacing: 0; margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .lootPrev .lpRow { padding: calc(3px * var(--pw,2.5)) 0; gap: calc(6px * var(--pw,2.5)); }
#homeUi .lootPrev .lpIc { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .lootPrev .lpLab { font-size: calc(11px * var(--pw,2.5)); color: #536f7f; }
#homeUi .lootPrev .lpVal { font-size: calc(12px * var(--pw,2.5)); color: #243e4d; }
#homeUi .lootPrev .lpVal.lpGold { color: #a8690f; }
#homeUi .lootPrev .lpNote { font-size: calc(9px * var(--pw,2.5)); color: #758994; margin-top: calc(4px * var(--pw,2.5)); }

/* --- 技能页 / 基地页 --- */
#homeUi .skillCard { gap: calc(9px * var(--pw,2.5)); padding: calc(12px * var(--pw,2.5)) calc(10px * var(--pw,2.5));
  min-height: calc(132px * var(--pw,2.5)); align-items: center; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .sIcon { width: calc(42px * var(--pw,2.5)); height: calc(48px * var(--pw,2.5)); background: #d8e8f1; border-radius: calc(5px * var(--pw,2.5)); }
#homeUi .sName { font-size: calc(15px * var(--pw,2.5)); flex-wrap: wrap; gap: calc(4px * var(--pw,2.5)); }
#homeUi .sDesc { font-size: calc(12px * var(--pw,2.5)); line-height: 1.7; color: #536f7f; }
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
#homeUi .bIc { background: #e3edf3; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
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

/* --- 底部导航 --- */
#homeUi .tabbar { height: calc(78px * var(--pw,2.5)); padding: calc(3px * var(--pw,2.5)) calc(6px * var(--pw,2.5));
  background: linear-gradient(#edf4f8, #c9dbe6); border-top: 2px solid #fff; box-shadow: 0 -3px 10px #294f681c;
  gap: calc(2px * var(--pw,2.5)); }
#homeUi .tabbar::before { display: none; content: none; }
#homeUi .tab { color: #527085; flex: 1; font-size: calc(12px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5));
  padding: calc(4px * var(--pw,2.5)) 0; gap: 0; border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .tab .ticon { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); display: grid; place-items: center; filter: none; }
#homeUi .tab.on { background: #fff8e5; color: #88551f; box-shadow: inset 0 -3px #e9a04f; }
#homeUi .tab.on .ticon { transform: none; filter: none; }
#homeUi .tab.on::after { display: none; content: none; }
#homeUi .tab.main { flex: 1.12; width: auto; height: calc(68px * var(--pw,2.5)); margin-top: calc(-8px * var(--pw,2.5));
  border-radius: calc(9px * var(--pw,2.5)); background: linear-gradient(#ffcd82, #eda052); border: 1px solid #cc8d45;
  color: #67411b; box-shadow: inset 0 2px #ffe8bb, 0 3px #b27a35; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .tab.main .ticon { width: calc(39px * var(--pw,2.5)); height: calc(39px * var(--pw,2.5)); font-size: 0; }

/* --- 礼包中心（青瓷浅色变体） --- */
#homeUi .giftBox .mbox { background: #edf4f8; }
#homeUi .giftBox .mHead h3 { color: #88551f; }
#homeUi .giftList { gap: calc(12px * var(--pw,2.5)); }
#homeUi .giftCard { background: #e7eff5; border-color: #bdced8; border-radius: calc(8px * var(--pw,2.5));
  gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); }
#homeUi .gTagTop { font-size: calc(11px * var(--pw,2.5)); padding: calc(2px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: 99px 99px 99px 3px; }
#homeUi .giftIc { width: calc(54px * var(--pw,2.5)); height: calc(54px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(30px * var(--pw,2.5)); background: #dce8ef; border-color: #b3c8d6; }
#homeUi .giftCard.r4 .giftIc { border-color: #9a6cd0; }
#homeUi .giftCard.r5 .giftIc { border-color: #e8892e; box-shadow: 0 0 5px rgba(232,137,46,.5); }
#homeUi .giftInfo b { font-size: calc(15px * var(--pw,2.5)); color: #31536a; }
#homeUi .giftInfo p { font-size: calc(12px * var(--pw,2.5)); color: #527085; margin-top: calc(2px * var(--pw,2.5)); }
#homeUi .giftEntries { font-size: calc(11px * var(--pw,2.5)); color: #945d24; margin-top: calc(4px * var(--pw,2.5)); }
#homeUi .giftSide { width: calc(110px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5)); }
#homeUi .giftPrice { font-size: calc(14px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .giftPrice em { color: #2f9c4a; }
#homeUi .giftPrice s { font-size: calc(11px * var(--pw,2.5)); color: #a98a72; margin-left: calc(4px * var(--pw,2.5)); }
#homeUi .giftSide .btn { height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .giftQuota { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .giftNote { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; margin-top: calc(10px * var(--pw,2.5)); }
#homeUi .giftResHead { font-size: calc(14px * var(--pw,2.5)); color: #3f7a52; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .giftResGrid { gap: calc(10px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDrop { width: calc(76px * var(--pw,2.5)); height: calc(76px * var(--pw,2.5));
  border: 1px solid #b3c8d6; border-radius: calc(8px * var(--pw,2.5)); background: #dce8ef; gap: calc(4px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDropIc { font-size: calc(26px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDropNm { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .giftResGrid .clDrop.r3 { border-color: #4a9fd6; }
#homeUi .giftResGrid .clDrop.r4 { border-color: #9a6cd0; }
#homeUi .giftResGrid .clDrop.r5 { border-color: #e8892e; box-shadow: 0 0 5px rgba(232,137,46,.45); }
#homeUi .giftResGrid .clDrop.r6 { border-color: #e04848; box-shadow: 0 0 6px rgba(224,72,72,.5); }
#homeUi .giftResRow { font-size: calc(13px * var(--pw,2.5)); color: #945d24; margin-top: calc(10px * var(--pw,2.5)); }
#homeUi .giftOkBtn { height: calc(44px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); margin-top: calc(12px * var(--pw,2.5)); }
#homeUi .shopBanner .sbTime.dotOn::after { width: calc(7px * var(--pw,2.5)); height: calc(7px * var(--pw,2.5));
  margin-left: calc(5px * var(--pw,2.5)); background: #e04848; box-shadow: 0 0 5px rgba(224,72,72,.8); }

/* --- 任务与成就（青瓷浅色变体） --- */
#homeUi .questEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .questEntry .questRed { width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5));
  top: calc(-3px * var(--pw,2.5)); right: calc(-3px * var(--pw,2.5)); background: #e04848; box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .questBox .mbox { background: #edf4f8; }
#homeUi .questBox .mHead h3 { color: #88551f; }
/* --- 载具改装（青瓷浅色变体，照 questBox 模式） --- */
#homeUi .mbox.tuneBox { background: #eef4f0; }
#homeUi .mbox.tuneBox .mHead h3 { color: #5e6d2f; }
#homeUi .qSecHead { gap: calc(7px * var(--pw,2.5)); margin: calc(10px * var(--pw,2.5)) 0 calc(6px * var(--pw,2.5)); }
#homeUi .qSecHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .qSecHead span { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; }
#homeUi .questRow { background: #e7eff5; border: 1px solid #bdced8; border-radius: calc(8px * var(--pw,2.5));
  gap: calc(8px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .questRow.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .qIc { width: calc(40px * var(--pw,2.5)); height: calc(40px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(22px * var(--pw,2.5)); background: #dce8ef; border-color: #b3c8d6; }
#homeUi .qMid b { font-size: calc(14px * var(--pw,2.5)); color: #31536a; }
#homeUi .qBar { height: calc(7px * var(--pw,2.5)); background: #cddce6; border-color: #b3c8d6; margin: calc(5px * var(--pw,2.5)) 0 calc(3px * var(--pw,2.5)); }
#homeUi .qBar i { background: linear-gradient(90deg, #4a9fd6, #58b96b); }
#homeUi .questRow.ready .qBar i { background: linear-gradient(90deg, #f0b13e, #e8892e); }
#homeUi .qNum { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .qRight { gap: calc(4px * var(--pw,2.5)); }
#homeUi .qReward { font-size: calc(12px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .qRight .btn { min-width: calc(76px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .actBox { background: #e7eff5; border: 1px solid #bdced8; border-radius: calc(8px * var(--pw,2.5));
  padding: calc(8px * var(--pw,2.5)); margin-bottom: calc(4px * var(--pw,2.5)); }
#homeUi .actHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .actHead span { font-size: calc(13px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .actBar { margin: calc(6px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)); }
#homeUi .actBar i { background: linear-gradient(90deg, #f0b13e, #e8892e); }
#homeUi .actChests { gap: calc(7px * var(--pw,2.5)); }
#homeUi .actChest { border-radius: calc(8px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(5px * var(--pw,2.5));
  gap: calc(2px * var(--pw,2.5)); background: #dce8ef; border: 1px solid #b3c8d6; }
#homeUi .actChest.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .acIc { font-size: calc(26px * var(--pw,2.5)); }
#homeUi .acName { font-size: calc(12px * var(--pw,2.5)); color: #31536a; }
#homeUi .acReward { font-size: calc(10px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .acNeed { font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .actChest.ready .acNeed { color: #945d24; }
#homeUi .actChest .btn { height: calc(26px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .actHint { margin-top: calc(6px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #7e97a8; }

/* --- 排行榜（青瓷浅色变体） --- */
#homeUi .lbEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .lbBox .mbox { background: #edf4f8; }
#homeUi .lbBox .mHead h3 { color: #88551f; }
#homeUi .lbMy { background: #fff8e5; border-color: #e9a04f; border-radius: calc(7px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .lbMy span { font-size: calc(12px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .lbMy b { font-size: calc(18px * var(--pw,2.5)); color: #945d24; }
#homeUi .lbList { gap: calc(5px * var(--pw,2.5)); }
#homeUi .lbRow { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); }
#homeUi .lbRow.me { background: #fff8e5; border-color: #e9a04f; box-shadow: none; }
#homeUi .lbRank { width: calc(28px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .lbRank .medal { font-size: calc(17px * var(--pw,2.5)); }
#homeUi .lbIc { font-size: calc(17px * var(--pw,2.5)); }
#homeUi .lbName { font-size: calc(14px * var(--pw,2.5)); color: #31536a; }
#homeUi .lbRow.me .lbName { color: #945d24; }
#homeUi .lbScore { font-size: calc(14px * var(--pw,2.5)); color: #1e6e9e; }

/* --- 宝石镶嵌（青瓷浅色变体） --- */
#homeUi .gemBox { gap: calc(6px * var(--pw,2.5)); margin: calc(-2px * var(--pw,2.5)) 0 calc(6px * var(--pw,2.5)); }
#homeUi .gemHole { padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5));
  background: #dce8ef; border: 1px dashed #9db9ca; }
#homeUi .gemHole .ghIc { font-size: calc(20px * var(--pw,2.5)); }
#homeUi .gemHole .ghNm { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .gemHole .ghEff { font-size: calc(10px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .gemHole .dim { color: #8ba3b5; }
#homeUi .gemHole .ghEff.dim { color: #8ba3b5; }

/* --- 装备工坊（青瓷浅色变体） --- */
#homeUi .forgeBtn { width: calc(76px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); padding: 0; }
#homeUi .fSec { margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .fHead { gap: calc(7px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .fHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .fHead span { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; }
#homeUi .fRow { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  gap: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .fInfo b { font-size: calc(13px * var(--pw,2.5)); color: #31536a; }
#homeUi .fInfo span { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .fRow .btn { min-width: calc(76px * var(--pw,2.5)); height: calc(30px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .fQuick { height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); margin-top: calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 设置（青瓷浅色变体） --- */
#homeUi .setGear { width: calc(34px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); font-size: calc(16px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }
#homeUi .setBox .mbox { background: #edf4f8; }
#homeUi .setBox .mHead h3 { color: #88551f; }
#homeUi .setSec { margin-bottom: calc(12px * var(--pw,2.5)); }
#homeUi .setHead { margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .setHead b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .setHead.danger b { color: #c04a34; }
#homeUi .setRow { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .setRow > span { font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .setRow > b { font-size: calc(13px * var(--pw,2.5)); color: #31536a; }
#homeUi .setRow .btn { min-width: calc(92px * var(--pw,2.5)); height: calc(32px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }
#homeUi .volWrap { gap: calc(7px * var(--pw,2.5)); max-width: calc(170px * var(--pw,2.5)); }
#homeUi .volWrap input[type=range] { height: calc(12px * var(--pw,2.5)); }
#homeUi .volWrap b { font-size: calc(12px * var(--pw,2.5)); color: #1e6e9e; width: calc(36px * var(--pw,2.5)); }
#homeUi .resetBtn { border-color: #d8a08a !important; color: #b8503a !important; background: #f7ece6 !important; }

/* --- 建筑详情浮窗（青瓷浅色变体） --- */
#homeUi .bInfoBtn { width: calc(22px * var(--pw,2.5)); height: calc(22px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5));
  border-color: #9db9ca; background: #dce8ef; color: #527085; top: calc(6px * var(--pw,2.5)); right: calc(6px * var(--pw,2.5)); }
#homeUi .binfoBox .mbox { background: #edf4f8; }
#homeUi .binfoBox .mHead h3 { color: #88551f; }
#homeUi .biIntro { font-size: calc(13px * var(--pw,2.5)); color: #4a6a80; background: #e7eff5;
  border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .biLvRow span { font-size: calc(12px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .biLvRow b { font-size: calc(14px * var(--pw,2.5)); color: #945d24; }
#homeUi .biBar { height: calc(7px * var(--pw,2.5)); background: #cddce6; border-color: #b3c8d6; margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .biBar i { background: linear-gradient(90deg, #4a9fd6, #58b96b); }
#homeUi .biEff { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .biEff em { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; margin-bottom: calc(2px * var(--pw,2.5)); }
#homeUi .biEff span { font-size: calc(13px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .biEff.next span { color: #2f9c4a; }
#homeUi .biStatus { font-size: calc(12px * var(--pw,2.5)); color: #945d24; margin: calc(2px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)); }
#homeUi .biOk { height: calc(44px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 技能详情浮窗（青瓷浅色变体） --- */
#homeUi .abBox .mbox { background: #edf4f8; }
#homeUi .abBox .mHead h3 { color: #88551f; }
#homeUi .abName b { font-size: calc(17px * var(--pw,2.5)); color: #31536a; }
#homeUi .abName .lvtag { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .abEff { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); margin-bottom: calc(6px * var(--pw,2.5)); }
#homeUi .abEff em { font-size: calc(11px * var(--pw,2.5)); color: #7e97a8; margin-bottom: calc(2px * var(--pw,2.5)); }
#homeUi .abEff span { font-size: calc(13px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .abEff.next span { color: #2f9c4a; }
#homeUi .abMs { margin: calc(8px * var(--pw,2.5)) 0; }
#homeUi .abMsHead { font-size: calc(14px * var(--pw,2.5)); color: #88551f; margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .abMsRow { gap: calc(7px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)) calc(8px * var(--pw,2.5));
  border: 1px dashed #9db9ca; border-radius: calc(6px * var(--pw,2.5)); margin-bottom: calc(4px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .abMsRow.reach { border: 1px solid #e9a04f; background: #fff8e5; color: #945d24; }
#homeUi .abMsLv { font-size: calc(13px * var(--pw,2.5)); }
#homeUi .abMsRow span:last-child { font-size: calc(12px * var(--pw,2.5)); }
#homeUi .abCost { background: #e7eff5; border-color: #bdced8; border-radius: calc(7px * var(--pw,2.5)); padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); gap: calc(7px * var(--pw,2.5)); }
#homeUi .abCost > span { font-size: calc(12px * var(--pw,2.5)); color: #945d24; }
#homeUi .abCost .btn { min-width: calc(92px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5)); }

/* --- 每日签到（青瓷浅色变体） --- */
#homeUi .signinEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .besEntry { border-radius: calc(7px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(13px * var(--pw,2.5)); padding: 0 calc(10px * var(--pw,2.5)); }
#homeUi .besGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .besCell { padding: calc(8px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); cursor: pointer; }
#homeUi .besCell.lock { opacity: .55; filter: grayscale(.8); }
#homeUi .besPic { width: calc(56px * var(--pw,2.5)); height: calc(56px * var(--pw,2.5)); }
#homeUi .besCell.lock .besPic { filter: brightness(0) opacity(.75); }
#homeUi .besNm { font-size: calc(12px * var(--pw,2.5)); font-weight: 700; color: #46647a; }
#homeUi .besSub { font-size: calc(11px * var(--pw,2.5)); color: #945d24; }
#homeUi .besElite { display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); margin-top: calc(10px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); color: #527085; }
#homeUi .besElite b { color: #e9a04f; }
#homeUi .besDetail { display: flex; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); }
#homeUi .besDetail.lock { opacity: .7; }
#homeUi .besDetailPic { flex: none; width: calc(90px * var(--pw,2.5)); height: calc(110px * var(--pw,2.5)); }
#homeUi .besDetail.lock .besDetailPic { background: radial-gradient(circle at 50% 60%, #d7e2e8, #b3c4ce); border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .besDetailInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); text-align: left; }
#homeUi .besDetailName { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .besDetailName b { font-size: calc(15px * var(--pw,2.5)); color: #945d24; }
#homeUi .besStars { font-size: calc(12px * var(--pw,2.5)); color: #e9a04f; }
#homeUi .besBeh { font-size: calc(12px * var(--pw,2.5)); color: #527085; font-weight: 700; }
#homeUi .besDesc { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; line-height: 1.6; }
#homeUi .besStats { margin-top: calc(4px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .besStatRow { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .besStatRow span { color: #8fa9ba; }
#homeUi .besStatRow b { color: #945d24; }

/* --- 试炼之塔（青瓷浅色变体） --- */
#homeUi .trialList { max-height: calc(300px * var(--pw,2.5)); overflow-y: auto; display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); }
#homeUi .trialSect { display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .trialSect.lock { opacity: .55; }
#homeUi .trialSectName { font-size: calc(11px * var(--pw,2.5)); color: #527085; }
#homeUi .trialSect.lock .trialSectName { color: #8fa9ba; }
#homeUi .trialGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(5px * var(--pw,2.5)); }
#homeUi .trialCell { position: relative; padding: calc(6px * var(--pw,2.5)) 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(1px * var(--pw,2.5)); }
#homeUi .trialCell b { font-size: calc(13px * var(--pw,2.5)); color: #46647a; }
#homeUi .trialCell span { font-size: calc(9px * var(--pw,2.5)); }
#homeUi .trialCell i { position: absolute; top: calc(1px * var(--pw,2.5)); right: calc(2px * var(--pw,2.5)); font-style: normal; font-size: calc(8px * var(--pw,2.5)); }
#homeUi .trialCell.done { border-color: #7fae86; }
#homeUi .trialCell.done b { color: #3f7a4a; }
#homeUi .trialCell.now { border-color: #e9a04f; cursor: pointer; }
#homeUi .trialCell.now b { color: #945d24; }
#homeUi .trialCell.sel { border-color: #e9a04f; box-shadow: 0 0 8px rgba(233,160,79,.55); }
#homeUi .trialCell.lock { opacity: .5; }
#homeUi .trialCell.mile { border-top: calc(2px * var(--pw,2.5)) solid #e9a04f; }
#homeUi .trialDetail { margin-top: calc(8px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); text-align: left; }
#homeUi .trialName { font-size: calc(14px * var(--pw,2.5)); font-weight: 700; color: #945d24; display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .trialName span { font-size: calc(10px * var(--pw,2.5)); color: #527085; font-weight: 400; }
#homeUi .trialStat { display: flex; gap: calc(12px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; flex-wrap: wrap; }
#homeUi .trialStat b { color: #46647a; }
#homeUi .trialMobs { display: flex; gap: calc(8px * var(--pw,2.5)); flex-wrap: wrap; align-items: flex-end; }
#homeUi .trialMob { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .trialMobPic { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); }
#homeUi .trialReward { display: flex; flex-direction: column; gap: calc(2px * var(--pw,2.5)); }
#homeUi .trialRewardHead { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .trialRewardRow { display: flex; gap: calc(5px * var(--pw,2.5)); align-items: center; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .trialRewardRow b { color: #945d24; }
#homeUi .trialRewardNote { font-size: calc(11px * var(--pw,2.5)); color: #527085; }
#homeUi .trialGo { width: 100%; margin-top: calc(8px * var(--pw,2.5)); }

/* --- 英雄招募 + 升星（青瓷浅色变体） --- */
#homeUi .hpick.recruitEntry .rcIc, #homeUi .hpick.talentEntry2 .rcIc { font-size: calc(23px * var(--pw,2.5)); line-height: calc(36px * var(--pw,2.5)); background: none !important; }
#homeUi .talentEntry2 .questRed { width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5));
  top: calc(-2px * var(--pw,2.5)); right: calc(3px * var(--pw,2.5)); background: #e04848; box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .bcardRed { width: calc(10px * var(--pw,2.5)); height: calc(10px * var(--pw,2.5));
  top: calc(-3px * var(--pw,2.5)); right: calc(-3px * var(--pw,2.5)); background: #e04848; box-shadow: 0 0 5px rgba(224,72,72,.8); }
#homeUi .starBar { margin: calc(8px * var(--pw,2.5)) 0; padding: calc(9px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .starBar.max { border-color: #e9a04f; }
#homeUi .sbLine { display: flex; align-items: baseline; justify-content: space-between; }
#homeUi .sbStars { font-size: calc(16px * var(--pw,2.5)); color: #e9a04f; letter-spacing: calc(2px * var(--pw,2.5)); }
#homeUi .sbLv { font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .sbProg { display: flex; align-items: baseline; gap: calc(5px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .sbProg b { color: #945d24; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .sbAdd { font-size: calc(9px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .sbDone { color: #945d24; }
#homeUi .sbBtn { width: 100%; }

#homeUi .rcHead { display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .rcHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(11px * var(--pw,2.5)); color: #46647a; }
#homeUi .rcHeadTop i { color: #945d24; font-style: normal; font-size: calc(14px * var(--pw,2.5)); font-weight: 700; }
#homeUi .rcHeadTop span { font-size: calc(10px * var(--pw,2.5)); color: #527085; }
#homeUi .rcBar { height: calc(7px * var(--pw,2.5)); background: #dbe6ec; border-radius: calc(4px * var(--pw,2.5)); overflow: hidden; border: 1px solid #bdced8; }
#homeUi .rcBar i { display: block; height: 100%; background: linear-gradient(90deg, #e9a04f, #f3c98a); transition: width .3s; }
#homeUi .rcRate { padding: calc(8px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .rcRateRow { display: flex; justify-content: space-between; font-size: calc(11px * var(--pw,2.5)); color: #46647a; }
#homeUi .rcRateRow b { color: #6b8ba1; }
#homeUi .rcRateRow.hero span, #homeUi .rcRateRow.hero b { color: #945d24; }
#homeUi .rcRateNote { margin-top: calc(2px * var(--pw,2.5)); font-size: calc(10px * var(--pw,2.5)); color: #527085; }
#homeUi .rcShards { margin-top: calc(8px * var(--pw,2.5)); }
#homeUi .rcShardsHead { font-size: calc(10px * var(--pw,2.5)); color: #6b8ba1; margin-bottom: calc(4px * var(--pw,2.5)); }
#homeUi .rcShardGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(5px * var(--pw,2.5)); }
#homeUi .rcShard { display: flex; align-items: center; gap: calc(5px * var(--pw,2.5)); padding: calc(5px * var(--pw,2.5)); }
#homeUi .rcShard.lock { opacity: .6; filter: grayscale(.7); }
#homeUi .rcShardPic { flex: none; width: calc(26px * var(--pw,2.5)); height: calc(26px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .rcShardInfo { display: flex; flex-direction: column; gap: calc(1px * var(--pw,2.5)); min-width: 0; }
#homeUi .rcShardInfo b { font-size: calc(11px * var(--pw,2.5)); color: #46647a; }
#homeUi .rcShardInfo i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #945d24; }
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
#homeUi .rcCardNm { font-size: calc(9px * var(--pw,2.5)); color: #46647a; line-height: 1.3; }
#homeUi .rcCard.hero { border-color: #e9a04f; box-shadow: 0 0 9px rgba(233,160,79,.65); }
#homeUi .rcNew { position: absolute; top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); background: #e2534f; color: #fff;
  font-size: calc(8px * var(--pw,2.5)); font-weight: 700; padding: calc(1px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(4px * var(--pw,2.5)); }
#homeUi .rcDup { position: absolute; top: calc(2px * var(--pw,2.5)); left: 50%; transform: translateX(-50%); font-size: calc(7px * var(--pw,2.5));
  color: #945d24; white-space: nowrap; }
#homeUi .rcSum { margin-top: calc(9px * var(--pw,2.5)); text-align: center; font-size: calc(11px * var(--pw,2.5)); color: #527085; }
#homeUi .rcAgain { width: 100%; margin-top: calc(9px * var(--pw,2.5)); }
#homeUi .rcClose { width: 100%; margin-top: calc(5px * var(--pw,2.5)); }

/* --- 天赋树（青瓷浅色变体） --- */
#homeUi .talentEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .talentHead { display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .talentHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .talentHeadTop i { color: #2f7fa8; font-style: normal; font-size: calc(17px * var(--pw,2.5)); font-weight: 700; }
#homeUi .talentHeadTop span { font-size: calc(12px * var(--pw,2.5)); color: #945d24; }
#homeUi .talentBar { height: calc(7px * var(--pw,2.5)); background: #dbe8ee; border-radius: calc(4px * var(--pw,2.5)); overflow: hidden; border: 1px solid #c3d6de; }
#homeUi .talentBar i { display: block; height: 100%; background: linear-gradient(90deg, #4aa8d8, #2f7fa8); }
#homeUi .talentSrc { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; line-height: 1.5; }

#homeUi .talentBranchRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(7px * var(--pw,2.5)); }
#homeUi .talentBranch { display: flex; flex-direction: column; min-width: 0; }
#homeUi .tbTitle { text-align: center; margin-bottom: calc(5px * var(--pw,2.5)); display: flex; flex-direction: column; gap: 1px; }
#homeUi .tbTitle b { font-size: calc(13px * var(--pw,2.5)); color: #46647a; }
#homeUi .tbTitle i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .tbNodes { display: flex; flex-direction: column; align-items: center; }
#homeUi .talentNode { position: relative; width: calc(44px * var(--pw,2.5)); height: calc(44px * var(--pw,2.5)); flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  border: 1px solid #c3d6de; border-radius: calc(6px * var(--pw,2.5)); background: #f2f8fa; cursor: pointer; }
#homeUi .talentNode:not(:last-child) { margin-bottom: calc(15px * var(--pw,2.5)); }
#homeUi .talentNode:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%;
  transform: translateX(-50%); width: calc(2px * var(--pw,2.5)); height: calc(15px * var(--pw,2.5)); background: #c3d6de; }
#homeUi .talentNode.maxed:not(:last-child)::after { background: #e9a04f; }
#homeUi .talentNode.lock { opacity: .5; filter: grayscale(.6); border-color: #dbe8ee; }
#homeUi .talentNode.can { border-color: #2f7fa8; box-shadow: 0 0 7px #2f7fa877; animation: huiChest .9s ease-in-out infinite; }
#homeUi .talentNode.maxed { border-color: #e9a04f; box-shadow: 0 0 7px #e9a04f88; }
#homeUi .talentNode.sel { outline: calc(2px * var(--pw,2.5)) solid #4aa8d8; outline-offset: calc(2px * var(--pw,2.5)); }
#homeUi .tnIc { font-size: calc(19px * var(--pw,2.5)); line-height: 1; }
#homeUi .tnLv { font-size: calc(8px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .talentNode.maxed .tnLv { color: #945d24; }
#homeUi .talentNode.can .tnLv { color: #2f7fa8; }

#homeUi .talentDetail { margin-top: calc(9px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5));
  display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .tdName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(6px * var(--pw,2.5)); }
#homeUi .tdName b { font-size: calc(14px * var(--pw,2.5)); color: #945d24; }
#homeUi .tdName i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .tdDesc { font-size: calc(12px * var(--pw,2.5)); color: #46647a; line-height: 1.5; }
#homeUi .tdHint { font-size: calc(11px * var(--pw,2.5)); color: #2f7fa8; }
#homeUi .tdBtns { display: flex; gap: calc(7px * var(--pw,2.5)); margin-top: calc(2px * var(--pw,2.5)); }
#homeUi .tdBtns .btn { flex: 1; height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }

/* --- 资源副本（青瓷浅色变体） --- */
#homeUi .dungeonEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .dgHead { display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .dgHeadTop { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(13px * var(--pw,2.5)); }
#homeUi .dgHeadTop b { color: #945d24; }
#homeUi .dgHeadTop span { font-size: calc(12px * var(--pw,2.5)); color: #2f7fa8; }
#homeUi .dgSrc { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; line-height: 1.5; }

#homeUi .dgList { display: flex; flex-direction: column; gap: calc(6px * var(--pw,2.5)); }
#homeUi .dgRow { display: flex; align-items: center; gap: calc(7px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: calc(9px * var(--pw,2.5)); background: #f2f8fa; border: 1px solid #c3d6de; cursor: pointer; }
#homeUi .dgRow.on { border-color: #e9a04f; box-shadow: 0 0 6px #e9a04f55; }
#homeUi .dgInfo { flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(6px * var(--pw,2.5)); }
#homeUi .dgIc { font-size: calc(22px * var(--pw,2.5)); line-height: 1; }
#homeUi .dgMeta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
#homeUi .dgMeta b { font-size: calc(12px * var(--pw,2.5)); color: #46647a; }
#homeUi .dgMeta i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #2f7fa8; }
#homeUi .dgTiers { display: flex; gap: calc(4px * var(--pw,2.5)); flex: none; }
#homeUi .dgTier { min-width: calc(44px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5)); font-size: calc(11px * var(--pw,2.5)); }
#homeUi .dgTier:disabled { opacity: .5; }

#homeUi .dgDetail { margin-top: calc(9px * var(--pw,2.5)); padding: calc(9px * var(--pw,2.5));
  display: flex; flex-direction: column; gap: calc(5px * var(--pw,2.5)); }
#homeUi .dgName { display: flex; align-items: baseline; justify-content: space-between; gap: calc(6px * var(--pw,2.5)); }
#homeUi .dgName b { font-size: calc(14px * var(--pw,2.5)); color: #945d24; }
#homeUi .dgName i { font-style: normal; font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .dgDesc { font-size: calc(11px * var(--pw,2.5)); color: #8fa9ba; line-height: 1.5; }
#homeUi .dgYield { font-size: calc(12px * var(--pw,2.5)); color: #46647a; }
#homeUi .dgHint { font-size: calc(11px * var(--pw,2.5)); color: #2f7fa8; }
#homeUi .dgGo { width: 100%; margin-top: calc(3px * var(--pw,2.5)); height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); }

/* --- 远征派遣（青瓷浅色变体） --- */
#homeUi .expeditionEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .expHead { margin-bottom: calc(7px * var(--pw,2.5)); }
#homeUi .expHeadTop b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .expHeadTop span { font-size: calc(13px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .expSrc { font-size: calc(10px * var(--pw,2.5)); color: #7e97a8; margin-top: calc(3px * var(--pw,2.5)); }
#homeUi .expList { gap: calc(5px * var(--pw,2.5)); margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .expRow { padding: calc(7px * var(--pw,2.5)) calc(9px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  border-color: #bdced8; background: #e7eff5; }
#homeUi .expRow.on { border-color: #4a9fd6; box-shadow: 0 0 6px #4a9fd655; }
#homeUi .expRow.ready { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .expInfo { gap: calc(7px * var(--pw,2.5)); }
#homeUi .expIc { width: calc(36px * var(--pw,2.5)); height: calc(36px * var(--pw,2.5)); border-radius: calc(8px * var(--pw,2.5));
  font-size: calc(20px * var(--pw,2.5)); background: #dce8ef; border-color: #b3c8d6; }
#homeUi .expMeta { gap: calc(2px * var(--pw,2.5)); }
#homeUi .expMeta b { font-size: calc(14px * var(--pw,2.5)); color: #31536a; }
#homeUi .expMeta i { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .expRow.ready .expMeta i { color: #945d24; }
#homeUi .expDetail { padding: calc(8px * var(--pw,2.5)); gap: calc(5px * var(--pw,2.5));
  background: #e7eff5; border: 1px solid #bdced8; border-radius: calc(8px * var(--pw,2.5)); }
#homeUi .expName b { font-size: calc(15px * var(--pw,2.5)); color: #88551f; }
#homeUi .expName i { font-size: calc(11px * var(--pw,2.5)); color: #6b8ba1; }
#homeUi .expDesc { font-size: calc(12px * var(--pw,2.5)); color: #527085; }
#homeUi .expYield { font-size: calc(12px * var(--pw,2.5)); color: #31536a; }
#homeUi .expMult { font-size: calc(11px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .expHeroes { gap: calc(5px * var(--pw,2.5)); }
#homeUi .expHero { flex: 1 1 calc(30% - calc(5px * var(--pw,2.5))); min-width: calc(80px * var(--pw,2.5));
  padding: calc(6px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); border-radius: calc(7px * var(--pw,2.5));
  gap: calc(2px * var(--pw,2.5)); background: #dce8ef; border-color: #b3c8d6; color: #31536a; }
#homeUi .expHero.sel { border-color: #cc8d45; box-shadow: 0 0 6px rgba(233,160,79,.4); }
#homeUi .ehIc { width: calc(28px * var(--pw,2.5)); height: calc(28px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5));
  background: #c3d6e2; border-color: #a8bfcd; color: #88551f; }
#homeUi .ehName { font-size: calc(11px * var(--pw,2.5)); }
#homeUi .ehAttr { font-size: calc(10px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .ehBusy { font-size: calc(9px * var(--pw,2.5)); color: #c05252; }
#homeUi .expPick { font-size: calc(11px * var(--pw,2.5)); color: #1e6e9e; }
#homeUi .expTeam { font-size: calc(12px * var(--pw,2.5)); color: #31536a; }
#homeUi .expTimer { font-size: calc(14px * var(--pw,2.5)); color: #945d24; }
#homeUi .expActions { gap: calc(5px * var(--pw,2.5)); }
#homeUi .expGo { height: calc(34px * var(--pw,2.5)); font-size: calc(12px * var(--pw,2.5)); border-radius: calc(6px * var(--pw,2.5)); }

/* --- 个人主页（青瓷浅色变体） --- */
#homeUi .pAvatar { cursor: pointer; }
#homeUi .pfCard { display: flex; align-items: center; gap: calc(10px * var(--pw,2.5)); padding: calc(10px * var(--pw,2.5)); margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .pfPic { flex: none; width: calc(64px * var(--pw,2.5)); height: calc(64px * var(--pw,2.5)); border-radius: calc(12px * var(--pw,2.5)); background-color: #d4e4eb; }
#homeUi .pfCardInfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .pfName { display: flex; align-items: baseline; gap: calc(6px * var(--pw,2.5)); }
#homeUi .pfName b { font-size: calc(15px * var(--pw,2.5)); color: #46647a; }
#homeUi .pfTitle { font-size: calc(12px * var(--pw,2.5)); color: #945d24; font-weight: 700; }
#homeUi .pfPower { display: flex; align-items: baseline; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); color: #527085; }
#homeUi .pfPower b { font-size: calc(16px * var(--pw,2.5)); color: #e9a04f; }
#homeUi .pfSec { margin-bottom: calc(8px * var(--pw,2.5)); }
#homeUi .pfSecHead { margin-bottom: calc(5px * var(--pw,2.5)); }
#homeUi .pfSecHead b { font-size: calc(13px * var(--pw,2.5)); color: #527085; }
#homeUi .pfGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .pfStat { display: flex; flex-direction: column; align-items: center; gap: calc(2px * var(--pw,2.5)); padding: calc(7px * var(--pw,2.5)) calc(3px * var(--pw,2.5)); }
#homeUi .pfStat em { font-style: normal; font-size: calc(16px * var(--pw,2.5)); line-height: 1; }
#homeUi .pfStat b { font-size: calc(13px * var(--pw,2.5)); color: #945d24; }
#homeUi .pfStat span { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .pfAcc { padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); display: flex; flex-direction: column; gap: calc(4px * var(--pw,2.5)); }
#homeUi .pfAccRow { display: flex; justify-content: space-between; font-size: calc(12px * var(--pw,2.5)); }
#homeUi .pfAccRow span { color: #8fa9ba; }
#homeUi .pfAccRow b { color: #46647a; }
#homeUi .signinEntry .questRed { top: calc(-4px * var(--pw,2.5)); right: calc(-4px * var(--pw,2.5)); width: calc(9px * var(--pw,2.5)); height: calc(9px * var(--pw,2.5)); }
#homeUi .siHead { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: calc(10px * var(--pw,2.5)); }
#homeUi .siHead b { font-size: calc(15px * var(--pw,2.5)); color: #527085; }
#homeUi .siHead b i { color: #e9a04f; font-style: normal; }
#homeUi .siHead span { font-size: calc(12px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .siGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(6px * var(--pw,2.5)); }
#homeUi .siCell { padding: calc(8px * var(--pw,2.5)) calc(4px * var(--pw,2.5)); text-align: center; display: flex; flex-direction: column; align-items: center; gap: calc(3px * var(--pw,2.5)); }
#homeUi .siCell.today { border-color: #e9a04f; background: #fff8e5; box-shadow: 0 0 8px #e9a04f66; }
#homeUi .siCell.done { opacity: .55; filter: grayscale(.4); }
#homeUi .siIc { font-size: calc(22px * var(--pw,2.5)); line-height: 1; }
#homeUi .siNm { font-size: calc(12px * var(--pw,2.5)); font-weight: 700; color: #46647a; }
#homeUi .siDy { font-size: calc(11px * var(--pw,2.5)); color: #e9a04f; }
#homeUi .siRw { font-size: calc(11px * var(--pw,2.5)); color: #945d24; }
#homeUi .siFoot { display: flex; align-items: center; justify-content: space-between; gap: calc(8px * var(--pw,2.5));
  margin-top: calc(10px * var(--pw,2.5)); padding: calc(8px * var(--pw,2.5)) calc(10px * var(--pw,2.5)); }
#homeUi .siFoot.ready { border-color: #e9a04f; box-shadow: 0 0 8px #e9a04f55; }
#homeUi .siFoot.done { opacity: .65; }
#homeUi .siInfo { display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); }
#homeUi .siInfo b { font-size: calc(14px * var(--pw,2.5)); color: #46647a; }
#homeUi .siInfo span { font-size: calc(13px * var(--pw,2.5)); color: #945d24; font-weight: 700; }
#homeUi .siFoot .btn { min-width: calc(110px * var(--pw,2.5)); height: calc(38px * var(--pw,2.5)); font-size: calc(14px * var(--pw,2.5)); }

/* --- 装备词缀（青瓷浅色变体） --- */
#homeUi .bcellAffix { position: absolute; left: calc(3px * var(--pw,2.5)); top: calc(2px * var(--pw,2.5));
  font-size: calc(9px * var(--pw,2.5)); color: #c98a1e; text-shadow: none; }
#homeUi .affixMark { color: #c98a1e; font-size: calc(11px * var(--pw,2.5)); }
#homeUi .affixBox { margin: calc(-4px * var(--pw,2.5)) 0 calc(8px * var(--pw,2.5)) 0; padding: calc(6px * var(--pw,2.5)) calc(9px * var(--pw,2.5));
  border-radius: calc(7px * var(--pw,2.5)); background: #f4f9fb; border: 1px dashed #b8cbd7;
  display: flex; flex-direction: column; gap: calc(3px * var(--pw,2.5)); }
#homeUi .affixHead { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .affixRow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(5px * var(--pw,2.5));
  font-size: calc(11px * var(--pw,2.5)); }
#homeUi .affixName { font-weight: 700; }
#homeUi .affixVal { color: #46647a; }

/* --- 主城邮箱弹窗（base 深色层） --- */
#homeUi .homeMailBtn { position: relative; }
#homeUi .homeMailBtn::after { content: ''; display: none; position: absolute; top: calc(2px * var(--hs,1)); right: calc(2px * var(--hs,1));
  width: calc(10px * var(--hs,1)); height: calc(10px * var(--hs,1)); border-radius: 50%; background: #ff5252;
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
#homeUi .mMid b { font-size: calc(14px * var(--hs,1)); color: #ffe9a8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#homeUi .mMid small { font-size: calc(11px * var(--hs,1)); color: #8fa0ab; }
#homeUi .mTag { flex: none; font-size: calc(11px * var(--hs,1)); color: #8fa0ab; }
#homeUi .mTag.expiring { color: #ffb74d; font-weight: 700; }
#homeUi .mailEmptyRow { padding: calc(40px * var(--hs,1)) 0; text-align: center; color: #8fa0ab; font-size: calc(14px * var(--hs,1)); }
#homeUi .mailDetailHead h4 { margin: calc(4px * var(--hs,1)) 0 calc(2px * var(--hs,1)); font-size: calc(17px * var(--hs,1)); color: #ffe9a8; }
#homeUi .mailDetailFrom { font-size: calc(12px * var(--hs,1)); color: #8fa0ab; }
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
#homeUi .mailListRow.unread { border-color: #e0b45c; background: #fff8e5; }
#homeUi .mailListRow.claimable { border-color: #8fbf6d; }
#homeUi .mIc { width: calc(26px * var(--pw,2.5)); height: calc(26px * var(--pw,2.5)); font-size: calc(15px * var(--pw,2.5));
  border-radius: calc(6px * var(--pw,2.5)); background: #eaf3f7; border: 1px solid #d7e3ea; }
#homeUi .mMid b { font-size: calc(13px * var(--pw,2.5)); color: #4a5f6d; }
#homeUi .mailListRow.unread .mMid b { color: #945d24; }
#homeUi .mMid small { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .mTag { font-size: calc(10px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .mTag.expiring { color: #c98a1e; }
#homeUi .mailEmptyRow { color: #8fa9ba; font-size: calc(13px * var(--pw,2.5)); }
#homeUi .mailDetailHead h4 { font-size: calc(15px * var(--pw,2.5)); color: #4a5f6d; }
#homeUi .mailDetailFrom { font-size: calc(11px * var(--pw,2.5)); color: #8fa9ba; }
#homeUi .mailDetailText { font-size: calc(12px * var(--pw,2.5)); color: #46647a; }
#homeUi .mailDetailAttach { background: #f0f7ec; border: 1px dashed #a8cc8e; gap: calc(4px * var(--pw,2.5)); }
#homeUi .mailDetailItems { font-size: calc(13px * var(--pw,2.5)); color: #4e7a33; }
#homeUi .mailDetailWarn { font-size: calc(10px * var(--pw,2.5)); color: #c98a1e; }`;
