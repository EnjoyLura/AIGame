/**
 * UI 颜色 token：全项目 DOM 层（主城/局内/登录）唯一色值来源。
 *
 * 换肤规则（美术替换轮次）：
 *  1. 只改本文件里的色值，不改名——名是语义槽位，值是当前皮肤；
 *  2. 历史遗留的散落 hex 用 tools/tokenize_colors.py 迁移（从本文件反读映射表）；
 *  3. 引号内的 hex（canvas Color(...)、颜色数学函数入参）不走 CSS 变量，
 *     换肤时按 codemod 输出的「未迁移清单」单独同步。
 * 新组件一律写 var(--c-*)，禁止再散落新 hex。
 */
export const UI_TOKENS_CSS = `
:root {
  /* ---- 文字 ---- */
  --c-text: #dce8f7;        /* 主文字 */
  --c-text-hi: #eaf2ff;     /* 强调亮字 */
  --c-text-dim: #a3bad4;    /* 次要/弱化文字（原 #8ba3c7：那是配平涂冷底 --c-scene-* 定的，
                               整页底换成照片后，页面上最亮的落字带实测到 #554a40，旧值只有 3.35:1） */
  --c-text-soft: #bdced8;
  --c-text-mute: #b3c8d6;
  --c-text-ice: #e7eff5;
  --c-text-ice2: #edf4f8;
  --c-text-ice3: #dce8ef;
  --c-white: #ffffff;
  /* ---- 金/琥珀（资源、强调按钮） ---- */
  --c-gold-hi: #ffe9a8;
  --c-gold: #f0b13e;
  --c-gold-frame: #f5c451;
  --c-gold-bright: #ffd76a;
  --c-coin: #ffd75e;
  --c-gold-dk: #945d24;
  --c-gold-dk2: #8a6a20;
  --c-gold-dk3: #88551f;
  --c-amber: #e9a04f;
  --c-amber-hi: #ff9d45;
  --c-amber-dk: #e8892e;
  --c-amber-deep: #ffa726;
  /* ---- 青/蓝（经验、科技感强调） ---- */
  --c-cyan: #7ee0ff;
  --c-cyan-mid: #5cc8ff;
  --c-cyan-hi: #9be7ff;
  --c-cyan-soft: #80dee4;
  --c-xp: #4dd0e9;
  --c-blue-dk: #1e6e9e;
  --c-blue-mid: #2f7fa8;
  /* ---- 描边/分隔 ---- */
  --c-line: #33507a;
  --c-line-hi: #3a567f;
  --c-line-dk: #2c405f;
  --c-line-dim: #527085;
  --c-edge-1: #6b8ba1;
  --c-edge-2: #46647a;
  --c-edge-3: #31536a;
  --c-edge-4: #4a6270;
  --c-edge-5: #3d5a70;
  --c-edge-6: #5a7484;
  --c-edge-7: #536f7f;
  --c-edge-8: #6a83a8;
  --c-edge-9: #8fa9ba;
  --c-edge-10: #7e97a8;
  /* ---- 深色面板底 ---- */
  --c-deep-teal: #243e4d;
  --c-deep-teal2: #264756;
  --c-navy-1: #2a4470;
  --c-navy-2: #24365c;
  --c-navy-3: #16263f;
  --c-navy-4: #101d38;
  --c-navy-5: #101c34;
  --c-navy-6: #0d1930;
  --c-navy-7: #0d1626;
  --c-navy-8: #1b262e;
  --c-navy-9: #26343f;
  /* ---- 页面场景底（2026-09-21 结构收敛轮新增）----
     主城原先是"平灰页面 + 每个组件一块暗金属板"，两套皮肤叠在一起读成半成品。
     改成《王国保卫战》那一层的做法：**页面是暗场景，内容压在暗场景上，板只留给主 CTA**，
     所以原先为暗底写的亮字（--c-cream-* / --c-gold-hi / --c-text-*）终于回到它该在的底色上。
     取值全部落在既有深色家族里（navy-7/8/9 同档），不引入新色相。 */
  --c-scene-1: #101820;      /* 场景最深（四角压暗用） */
  --c-scene-2: #1a2530;      /* 场景主体 */
  --c-scene-3: #24313d;      /* 场景顶部提亮（ horizon 那一带） */
  --c-scene-line: #3b4a55;   /* 暗场景上的分带细线（替掉残留的 dashed） */
  --c-scene-edge: #0a0f14;   /* 场景最外沿的收边 */
  /* 大块内容垫的半透明档：商店两张主推卡、英雄页背包条这类"一整屏都是它"的面，
     用不透明暗槽会把刚生成的场景底完全盖住（实测页面看不出换了底），
     留两成透出——读起来是"UI 摆在场景里"，不透明档读起来是"UI 摆在纯色纸上" */
  --c-scene-panel: rgba(19, 29, 39, .82);
  /* ---- 状态色 ---- */
  --c-danger: #ff5252;
  --c-danger-dk: #e04848;
  --c-ok: #7bdc7b;
  --c-ok-mid: #9ccc65;
  /* ---- 中性 ---- */
  --c-cream-1: #fff8e5;
  --c-cream-2: #ffd9b0;
  --c-gray-1: #a9a9a9;
  --c-ice-1: #cfe2ea;
  --c-ice-2: #ecf1f1;
  --c-dim-1: #8fa0ab;
}`;
