# 项目约定（AI 协作）

## 浏览器测试：复用页签，不要越测越多

本项目的验证都在 ZCode 内置浏览器里做（游戏 web-mobile 构建 + `ux-layout-review/*.html` 交互稿）。
**每次测试开新页签会把内置浏览器撑爆，必须复用。**

- 开测前先 `browser.tabs.list()` 看清已有页签；同源页面直接复用，改 URL 上的缓存参数即可
  （`?v=<timestamp>`），不要为了绕缓存新建页签。
- 只有当同源页签**确实不存在**时才 `tab.goto()` 到已有页签；确实需要独立并行页签才 `tabs.new()`。
- 测完主动收掉自己开的临时页签（`tab.close()`），不留死页签。
- 页签在后台时浏览器会冻结 rAF——Cocos 引擎初始化会静默卡死（无报错、主包不发请求、无场景）。
  这不是代码问题；把页签切到前台即可，不要因此重新开页签或怀疑构建。
- 截图超时不要立刻重试同一个调用；先等一会儿或用 DOM 量测替代。

## 验证入口

```sh
cd zombie-shooter
node tools/check-ux-refactor.js      # UX 重构 + 战斗局内布局断言
node tools/check-popup-ux.js         # 二级浮窗红线
node tools/tc.js                     # 全量类型/资源校验
cd ../ux-layout-review
node check-battle.mjs                # 战斗局内交互稿
node check-popups.mjs                # 二级浮窗交互稿
```

构建：`"/c/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe" --project "D:\qoder workspace\AIG\zombie-shooter" --build "platform=web-mobile;debug=true"`

## 美术规范（art-spec）

美术风格基准与资源契约在 `zombie-shooter/art-spec/`：基准图 `game_art_benchmark.png`、
生图规范 `STYLE-SPEC.md`（色板/prompt 模板/验收清单）、槽位清单 `ASSET-MANIFEST.md`。

- **换图不换 key**：图片路径即契约（`assets/resources/textures/<key>.png`），同名覆盖全游戏生效；
  新槽位先登记 `AssetLib.ts` 的 MANIFEST，文件可以后到（缺图自动回退占位）。
- **颜色只走 token**：DOM 层一律 `var(--c-*)`（`assets/scripts/ui/UiTheme.ts` 是唯一色值来源，
  主城/局内/登录三处样式共用）；禁止在新代码里散落 hex。换肤 = 改 UiTheme 值 + 换图，不动布局。
- 历史散落 hex 用 `python tools/tokenize_colors.py --apply` 迁移；引号内色值
  （canvas `Color('#…')`、颜色数学入参）不走 CSS 变量，按其输出的未迁移清单人工同步。
- 每轮美术替换收尾必跑 `node tools/check-art-manifest.mjs`（清单↔磁盘↔代码引用三方对账）。

## 设计稿约定

- `ux-redesign/` 下的旧版 HTML 设计稿**禁止读取**，交互稿一律从零设计。
- 交互稿只做布局与交互；美术样式与资源是独立任务，稿内一律灰阶占位并显式声明。
- 无死键：任何可点元素必须有响应或出路，禁用态不允许静默吞点击。
- 二级浮窗高度由内容决定（M 64vh / L 73vh / S 68vh 上限）；装不下的处理顺序是
  「先收内容密度 → 再升档 → 富列表才保留滚动」，不许抬高面板来消滚动条。
