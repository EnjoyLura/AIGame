# 项目约定（AI 协作）

## 浏览器测试：复用页签，不要越测越多

需要在 ZCode 内置浏览器里做视觉验证时（游戏 web-mobile 构建 + `ux-layout-review/*.html` 交互稿），
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

美术风格基准与资源契约在 `zombie-shooter/art-spec/`：基准图 `game_art_benchmark2.png`（现行主基准，
末日军武风）与 `game_art_benchmark.png`（casual 面板/按钮参考）、生图规范 `STYLE-SPEC.md`
（双基准/色板/prompt 模板/验收清单/§8 素材表一次成型工作流——图标类批量产出首选）、
槽位清单 `ASSET-MANIFEST.md`、参考素材 `reference/`（怪物动作参考视频 + 护送主题定调图，生图/切图工具的原始输入）。

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

### 开发工作规范

- **一轮只做一件事**：聚焦用户当前指的任务，不顺手改无关模块；用户明令本轮不动的区域
  （如某轮禁改战斗 HUD）坚决不碰。
- **先定位根因再动手**：缺陷按假设逐个排除（meta / 令牌 / 层叠覆盖 / 水平挤压…），
  收窄到具体失效路径再改；改动小面化，能只动 CSS 不动 DOM。
- **照旧例写**：双层 CSS、令牌机制、check 断言正则、构建链都有既定写法，
  新代码跟现有模式走，不发明新机制。
- 改公共文件前先想清楚波及面（如 HomeUi 三处样式共用 UiTheme token），
  动一层要确认另一层不破。

### 测试分工：缺陷修复与小需求不做浏览器截图测试

- **缺陷修复和小需求优化不需要内置浏览器截图测试**：走完「收尾验证链」即视为完成，直接交付。
- 交付时必须附**手测点**——测试由用户真机手测，要写具体页面/操作/预期
  （例：「刘海屏主城五页顶部头像与资源胶囊是否还被状态栏压住」「点资源 + / 邮箱 / 设置功能正常」），
  不能只报一句「已修复」。
- 内置浏览器仍用于交互稿评审与需要视觉对比的新布局任务（页签复用规则见文首）。

### 美术进版轮：一类一轮，我自己无头自测（2026-09-21 用户点名改法）

用户明确指示：**按 UI 类别批量推进，一轮只做一类，做完不要停、不要再交「手测点」让用户测**。

- **一轮一类**：按钮类 → 图标类 → 角标/星/节点类 → 资源与载具类 → 战斗 UI 件与弹层底板。
  每类固定四步：列清单（先跑界面普查拿实测尺寸：`node tools/audit_ui_surfaces.mjs <url>` 看哪些面还没贴图，
  图标类另跑 `node tools/audit_emoji_slots.mjs <url> 18` 列出"整个位置就是一个大号 emoji"的格子）→
  一张表一次出图（不合格格子下一批补）→
  整类接**一张契约表**（如 `UiPlate.CITY_BUTTON_PLATE`），不在十几处手工接 → 落盘接线 → 自测。
- **自测由 AI 跑，不占用户时间**：`node tools/page_shot.mjs <url> <页签> <out.png>` 取景并直接打印
  该页哪些面已贴图，Read 那张 PNG 逐面判合格（板有没有压字、有没有融进背景、选中态还认不认得出）；
  全量核对用 `node tools/audit_ui_surfaces.mjs`（六界面 + 战斗 HUD 出 JSON）+
  `node tools/sum_surfaces.mjs <json>`。贴不上或贴了更难看的位置**在契约表里显式写 `key: null` 并留实测理由**，
  不要悄悄不接、也不要为了"这一类出齐了"硬贴。
- **没有落点也要建落点**：用户拍板"即使是没有实现的功能，也要生成美术资源使用上"——
  缺功能位就顺手把功能位建出来（入口 + 一句解释性弹窗，遵守「无死键」红线），不要留图在仓库里没人用。
- 只有**真机手感类**问题（触摸热区、帧率、微信 WebView 安全区）才写进手测点，视觉对错一律自测。

### UI 约定：安全区与双层样式

- 贴屏边的 DOM UI 必须消费 `--sat`/`--sab`；CSS 一律写
  `max(var(--sat,0px), env(safe-area-inset-top,0px))` **双保险**，不能只信 JS 令牌
  （微信/部分安卓 WebView 对流内元素读 `env()` 返回 0，令牌会失效）。
- `HomeUiCore._applySafeArea()` 是双探针（流内探针 + `position:fixed;inset:0` 全屏探针取最大值），
  改动时不要退化回单探针。
- HomeUi 样式分两层：base 深色层（`--hs`，桌面口径）在前、青瓷浅色层（`--pw`，手机口径）
  在后覆盖，同特异性后者胜——改公共组件（topbar/资源胶囊等）**两层都要顾**，
  手机上实际生效的是青瓷层。
- **页面是暗场景，弹层才是浅纸**（2026-09-21 结构收敛轮定）：青瓷层原先把页面卡片写成平灰
  （`#dcdcdc`/`#ccc`/`#d3d3d3` 这一批），页面底翻成 `--c-scene-*` 暗场景后它们就是全屏最扎眼的
  没换肤孤岛。口径：`.screen` 页面级容器一律"暗槽底 + 亮字"（`--c-scene-1/2/3` + `--c-text*`/`--c-cream-*`/
  `--c-gold-hi`）；`.panel`/`.mbox` 弹层仍是浅纸、深字保留。同一个类名两处都出现时（`.mSub`、`.game-button`）
  **只给页面那一处开选择器**，别改公共那条。
- **字色翻亮要挂在 `.plated` 上**：`UiPlate.nineSlice` 只在贴图真的到位那一刻打这个类，
  缺图回退时旧配色仍然对。直接改基础色会把弹层里同一族键一起翻错。
- **特异性是这条链上最容易踩的坑**：页面级翻亮写了 `.hero-quick .btn` 却不见效，
  因为容器实际类名是 `fcol hero-quick`、而 `.fcol .btn.blue`（1 id + 3 类）压过它（1 id + 2 类）。
- **可读性审计的背板来自截屏，不来自 CSS**（2026-09-22 换的血，详见 STYLE-SPEC §7.3）：
  旧版沿祖先链找第一个不透明 `background-color`，遇到贴图/九宫格板/整页底就**照一块假想底色算比值**，
  于是"背景失效那么久、审计一直报绿"。现在是把字形擦掉截一张图、按元素矩形取均值当背板。
  口径没动（阈值、inactive 豁免），动的只是背板从哪来——**所以新旧计数不可比，别当成回归**。
  第 4 个参数 `plates` 打的是背板标准差 >28 那批"均值达标但底下是照片"的字，那才是需要人看一眼的。

### 每轮收尾验证链（顺序固定）

```sh
cd zombie-shooter
node tools/tc.js                       # 期望 TOTAL 0
node tools/check-ux-refactor.js        # 以下 check 全部 0 FAIL
node tools/check-split.js
node tools/check-mail.js
node tools/check-hud-slim.js
# 以下源码类 check 也纳入链（不在链里的检查器会悄悄变红，"全绿基线"就只覆盖了一半的检查器）
node tools/check-notice.js
node tools/check-stamina.js
node tools/check-bite.js
node tools/check-perf.js
node tools/check-popup-ux.js         # 二级浮窗红线：原先只在文首「验证入口」提过、没进链，等于每轮不跑
node tools/check-art-manifest.mjs    # 清单↔磁盘↔代码↔契约表四方对账：美术轮必跑，同样曾游离在链外
# Cocos 构建（成功标志：grep -c "build Task (web-mobile) Finished" 计数 = 1）
bash tools/postbuild.sh                # 构建戳 + 缓存击破 + _maxFontSize 补丁，构建日志用完删
grep -c "<本轮改动标识>" build/web-mobile/assets/main/index.js  # bundle 断言：确认改动真的进包
# 文字可读性审计（要在起 serve.mjs 的构建上跑）：五个页签的「不合格」计数只许降不许升
for p in home 商店 英雄 基地 行动; do node tools/contrast_audit.mjs "http://127.0.0.1:7456/index.html" $p 4.5; done
#   第 4 个参数写 plates 另出「背板标准差 >28」那批字——均值达标但底下是一张照片，
#   局部笔画可能正压在亮块上，这一批才需要人对着截图核（背板现在是截屏取的，不再是盲区）
# 以下 *-bundle check 读 build/web-mobile 产物，须在构建之后跑（同样纳入链防腐烂）
node tools/check-notice-bundle.js
node tools/check-stamina-bundle.js
node tools/check-split-bundle.js
node tools/check-ux-bundle.js
node tools/check-ux-layout-bundle.js
node tools/check-mail-bundle.js
node tools/check-perf-bundle.js        # AGENTS.md 此前从未提过这个文件，纯孤儿
git check-ignore zombie-shooter/tools/imagegen.local.json   # 期望输出该路径
```

**一个例外**：`tools/check_mortar_assets.py` 不进每轮链——它只盯迫击炮图集（512×512 RGBA、
16 格透明边、meta 未裁剪）与诊断码增删对齐，属窄口径。**但改 `fx/mortar.png` 或动诊断码的轮次必须跑它。**
（写这里是为了让它有别于"从没被人记起"，而不是继续当第三个孤儿。）

- **提交安全线**：APIKey 存放于 `zombie-shooter/tools/imagegen.local.json`，该文件与
  `gpt-image2-skill/`、`gen-output/` 均被 gitignore 严禁提交；每次 git 提交前需确认这些未入库。
- commit 后**前台 push** 并 `git log --oneline origin/main -1` 双验证（后台 commit 的 push 常不生效）。
- **单人开发，直接在 main 上提交**，不开 feat 分支（历史分支已并回 main 删除）。
- 素材与文档一律入库归位（2026-09-19 已整理）：文档进 `docs/`、参考素材进
  `zombie-shooter/art-spec/reference/`、原型产物进 `zombie-shooter/prototype/`、
  网页初稿进 `ux-redesign/`（禁读）。不要再往仓库根目录堆散文件；
  AI 原始大图落在根目录的，处理完挪进 `gen-output/`（不入库）。

### 仓库目录结构（2026-09-19 整理后）

```
AIG/
├── AGENTS.md                  # 本文件：协作约定
├── README.md                  # 仓库地图 + 常用命令
├── docs/                      # 产品文档.md、技术文档.md
├── ux-redesign/               # 初版网页设计稿（AI 禁读，仅存档）
├── ux-layout-review/          # 自绘交互稿（battle/popups html）+ 断言检查器 + 评审记录
├── zombie-shooter/            # Cocos Creator 游戏工程（唯一工程目录）
│   ├── assets/                # 游戏源码与资源（Cocos 管理，禁止手工挪动）
│   ├── art-spec/              # 美术规范 + 基准图 + reference/ 参考素材
│   ├── prototype/             # Cocos 化之前的网页原型存档（prototype.html + 预览截图）
│   ├── tools/                 # 检查器 / 生图 / 抠像 / 隧道等脚本（imagegen.local.json 不入库）
│   └── build/ temp/ library/  # 构建产物与缓存（gitignore）
├── gen-output/                # AI 生图原始输出（gitignore，403MB 级，定期可清）
└── gpt-image2-skill/          # 第三方生图 skill 克隆件（gitignore）
```

### 收尾总结格式（每轮固定输出）

1. **本轮做了什么**：根因 + 改动点（文件:行）；哪些没动、哪些保留了也要说清；
2. **验证链结果**：tc / check / 构建 / postbuild / bundle 断言 / SAFE / commit+push 哈希，
   逐项报实况，失败就报失败；
3. **自测结果**：美术/UI 轮报无头取景判定的实况（哪些面已上图、哪些位置显式跳过及原因）；
   只有真机手感类问题才列给用户的手测点（见「测试分工」与「美术进版轮」两节）。
4. **下一步**：接下来该做的 1~3 件（带优先级与判据：为什么先做这个、做完能解锁什么），
   并单列**等用户拍板的问题**（无死键：不把决策埋在正文里）；只写去向，不复述本轮已完成项。

#### 总结要写成能直接念出来的正常句子（2026-09-20 用户点名）

上面四条只管**内容**，这一节管**话怎么说**。踩过的坑是把内部术语压成电报，用户读完不知道在说什么。

- **每条都是一句完整的话**：有主语、有谓语、有宾语。不写「定档：`bar` 档 → §9 + NINE → 解锁 16 宿主」
  这种箭头串；要写「先给进度条这一类定一套切图的规矩，定完那 16 条进度条才有资格接美术」。
- **内部术语第一次出现必须落地成人话**，或者干脆别说。`档` / `定档` / `接线` / `宿主` / `棘轮` /
  `切片源` / `闸门` 这类词在总结里换成日常说法（宿主 → "要用这张图的界面位置"，定档 → "定下四个角占多少"）；
  代码坐标（`文件:行`）可以带，但不能**只用坐标当句子**。
- **「等用户拍板的问题」必须是能直接答"做 / 不做"的疑问句**，不能是名词短语并列。
  反例：「出图这轮开不开？建议一张 2K 表同时吃下条族 + tab 族 + 高优先 ico 族」。
  正例：「要不要现在就生成图片？生成一次会用到你本地存的 API key。」
- 自检一句：**把这段发给三个月后的用户，他能不能不问我就知道要决定什么**。不能就重写。
- 这条只约束写给用户看的文字；代码注释、规范文档、check 断言名照旧用术语，那里要的是精确。

### 工具坑

- Git Bash 里 inline `node -e` 写 `\u` 转义会炸：断言/校验脚本一律 Write 成文件再跑。
- check 脚本断言 FAIL 时，先核对断言正则与当前函数签名是否同步（如 `_renderSkillCards`
  签名演进导致旧正则误报），再怀疑业务代码。
- 断言写法两条硬规矩（2026-09-20 清基线时踩全）：① **不用 `[s\S]{0,N}` 定长窗口**，函数体一长大就
  假 FAIL——照 `check-ux-refactor.js`/`check-mail.js` 的 `fnBody(text, sig)` 花括号配平取函数体再断言；
  ② **读 bundle 的反向断言必须带选择器前缀**：`check-hud-slim` 查「`.xpRow` 旧层已删」裸类名会命中
  同包的主城 `.xpRow`（HomeUiCore 的合法组件），要写 `#domHud .xpRow`。
- 拆分欠账用 `check-split.js` 的 `SPLIT_DEBT` 棘轮记（目标 1800 行，当前 Core/Heroes 按实测行号设预算：
  再写胖就 FAIL，拆薄了提示收紧），别用「把目标改小」假装过关。
- **「资源读出来非空」不等于「资源上屏了」**（2026-09-21 查出，主城页面底从登记起一直空着）：
  多层 `background-image` 里，前面那层渐变会掩盖后面失效的图片层——`getComputedStyle` 读出来非空、
  普查与比值审计都过，画面只是"暗了一点"。判"有没有画出来"要看**计算值里那段 url 是否合法且能加载**，
  或者直接在取景图里认画面内容。同类雷：`UiPlate.frameUrl` 返回的已经是包好壳的 `url(...)` 整串，
  调用方再套一层就得到 `url("url(...)")`，浏览器判整条声明非法（回归断言在 `check-art-manifest` 5.9）。
- **无头取景工具里"内容宽 > 盒宽"的溢出告警，先分清是出血还是缺陷**：故意贴边出血的装饰件（如船坞
  前景碎石用负 `left` 探出屏外）被祖先 `overflow:hidden` 裁掉是对的，但普查照样报，会把真缺陷淹掉。
  能改成 0 偏移又不影响观感的，就改掉，别留"看着像报警其实没事"的噪声。
