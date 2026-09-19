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

## 会话工作方式（2026-09 沉淀）

### 图片协作与缺陷定位

- 用户在对话里**附加的截图到不了模型**（已多次踩坑）。要看图：让用户把图存到
  `D:\qoder workspace\AIG\` 下并告知文件名，磁盘 Read 图片是可靠的（Downloads 里的也可读）。
- 缺陷描述若不带界面名（如「HUD 栏显示不全」），**先确认目标页面再动手**——
  主城 topbar（HomeUi）≠ 战斗 HUD（DomHud），猜错目标会改错文件、白做一轮。
- 用户明确「不用回退」的提交保留在历史里即可，后续不再纠结也不重复改动。

### UI 约定：安全区与双层样式

- 贴屏边的 DOM UI 必须消费 `--sat`/`--sab`；CSS 一律写
  `max(var(--sat,0px), env(safe-area-inset-top,0px))` **双保险**，不能只信 JS 令牌
  （微信/部分安卓 WebView 对流内元素读 `env()` 返回 0，令牌会失效）。
- `HomeUiCore._applySafeArea()` 是双探针（流内探针 + `position:fixed;inset:0` 全屏探针取最大值），
  改动时不要退化回单探针。
- HomeUi 样式分两层：base 深色层（`--hs`，桌面口径）在前、青瓷浅色层（`--pw`，手机口径）
  在后覆盖，同特异性后者胜——改公共组件（topbar/资源胶囊等）**两层都要顾**，
  手机上实际生效的是青瓷层。

### 每轮收尾验证链（顺序固定）

```sh
cd zombie-shooter
node tools/tc.js                       # 期望 TOTAL 0
node tools/check-ux-refactor.js        # 以下 check 全部 0 FAIL
node tools/check-split.js
node tools/check-mail.js
node tools/check-hud-slim.js
# Cocos 构建（成功标志：grep -c "build Task (web-mobile) Finished" 计数 = 1）
bash tools/postbuild.sh                # 构建戳 + 缓存击破 + _maxFontSize 补丁，构建日志用完删
grep -c "<本轮改动标识>" build/web-mobile/assets/main/  # bundle 断言：确认改动真的进包
git check-ignore zombie-shooter/tools/imagegen.local.json   # 期望输出该路径
```

- **提交安全线**：APIKey 存放于 `zombie-shooter/tools/imagegen.local.json`，该文件与
  `gpt-image2-skill/`、`gen-output/` 均被 gitignore 严禁提交；每次 git 提交前需确认这些未入库。
- commit 后**前台 push** 并 `git log --oneline origin/main -1` 双验证（后台 commit 的 push 常不生效）。
- 未跟踪噪音文件勿提交：`code (3).html`、`ux-redesign/`、`vibe_images/`、
  `zombie-shooter/prototype-assets/`、根目录 `*.mp4` 等。

### 工具坑

- Git Bash 里 inline `node -e` 写 `\u` 转义会炸：断言/校验脚本一律 Write 成文件再跑。
- check 脚本断言 FAIL 时，先核对断言正则与当前函数签名是否同步（如 `_renderSkillCards`
  签名演进导致旧正则误报），再怀疑业务代码。
