# 美术风格基准与生图规范（STYLE-SPEC）

基准图两份：

| 基准图 | prompt（越短越好） | 风格 | 适用 |
|---|---|---|---|
| [game_art_benchmark2.png](./game_art_benchmark2.png)（**现行主基准**） | 「一张末日题材欧美卡通风格的微信小游戏UI美术基准图」 | 末日军武：橄榄绿/钢灰/琥珀，粗犷金属感 | 图标/页签/资源类 |
| [game_art_benchmark.png](./game_art_benchmark.png) | 「一张欧美卡通风格的微信小游戏UI美术基准图」 | casual 奶油底+深木框 | 面板/按钮类件参考 |

**用途**：每一轮美术资源生成的唯一风格依据。**图标类批量产出首选 §8 素材表一次成型**（单件补图才用 §2+§3+§4 拼 prompt）；出图后按 §6 验收清单比对基准图。本文件与代码的对接方式见 §7。

---

## 1. 风格定位（一句话）

**休闲合成/经营向的高饱和卡通**：粗描边、大圆角、厚体积感、软明暗过渡；UI 件全部「奶油底 + 深木框」，按钮带厚底边模拟按压立体；图标带浅色外发光或底托。参照物：Merge Fantasy / Royal Match 一类 casual 界面。

## 2. 色板（从基准图采样）

### 主色板 8 色

| 色值 | 名称 | 用途 |
|---|---|---|
| `#f2a63f` | 主橙 | 主 CTA、强调（PLAY） |
| `#8bad3a` | 黄绿 | 确认/成功（CONFIRM） |
| `#51a7dd` | 天蓝 | 次级/取消（CANCEL）、信息 |
| `#9563df` | 紫 | 稀有度/魔法系 |
| `#fa7695` | 粉 | 活动限定、生命/恢复 |
| `#e3d0b9` | 奶油 | 面板底色 |
| `#6d717a` | 中灰 | 次级文字、禁用感 |
| `#36343a` | 深灰黑 | 文字描边、深底 |

### 组件色（采样自基准图对应部件）

| 色值 | 部件 |
|---|---|
| `#fdcc30 → #fab61b → #b45a02` | 金黄按钮/金币：亮面 → 中间 → 深色底边 |
| `#94bd0d → #6b9b06` | 绿色确认按钮（亮面 → 底边） |
| `#3d91d5 → #2c75c1` | 蓝色绶带/取消按钮 |
| `#e55842 → #cb3f29` | 红色警示/关闭 X |
| `#f8deae` | 面板奶油底 |
| `#e8b76c → #9d7954` | 面板木框（亮 → 暗） |
| `#efe8dc` | 米白高光文字/内衬 |

> 深色科技感皮肤（当前游戏内的 navy/金）换肤时按 `zombie-shooter/assets/scripts/ui/UiTheme.ts` 的 token 分组整体换值；上表是新皮肤的取值参考，不是逐像素标准。

## 3. 通用生图风格后缀（每条 prompt 都带）

> **2026-09-19 二轮修订**：一轮出图「AI 味」根因确诊 = 装饰性容器/徽章框 + 强镜面高光 + 木纹铆钉等纹理过密 + 火花光斑堆饰 + 多主体堆叠。硬规则并入后缀与负面词，后续每轮生图强制执行。
>
> **2026-09-19 三轮修订**：二轮按硬规则逐张生图仍不满意；用户实测结论——**提示词越少、一次性整表生成的效果越好**（单次生成内风格自洽度、整体质量都高于逐张生图再拼）。图标类一律改走 §8 素材表一次成型，§3 风格后缀与负面词降级为「单件补图/修图时用」。

```
casual mobile game asset, cartoon style, chunky plump rounded silhouette,
soft cel shading with 2-3 tone gradients, matte hand-painted finish, subtle darker outline,
single centered object filling most of the frame, clean instantly readable silhouette, minimal surface detail,
limited warm palette, isolated on plain solid pure green background (#00FF00), no text, no watermark
```

负面词：`photorealistic, 3d render, strong specular gloss, wood grain texture, ornate metal frame, shield or badge container, emblem composition, multiple stacked objects, sparkles, stars, glow effects, dark gritty, thin lines, sketch, watermark, text`

配套硬规则：

- **图标一律无装饰外框**（2026-09-20 六轮拍板，从"顶栏资源类"扩到全部功能图标）：金属圆环、盾形底板、
  徽章边框、铆钉圈都算框，一律禁止——这些位置实际只显示 44~56px，套框会把主体挤到看不清。
  **但"框"只指装饰**：静音的禁止斜杠、警告三角、信息圆牌这类**本身就是该图标含义**的形状要保留，
  不要为了去框把符号削成没有辨识度的孤立图形。
- **页签/功能图标单主体**：是否加底托由 CSS 决定，精灵图本身不带托、不带背板。
- **主体数量**：资源堆叠 ≤3 件；图标 1 件。
- 绿幕出图 + `tools/chroma_key.py`（tol=60 + despill）抠像，不用透明底请求。

## 4. 分类模板（拼在风格后缀前）

| 分类 | 模板（…处填 slot 描述） | 备注 |
|---|---|---|
| 功能图标 | `icon of …, single item, slightly tilted 3/4 view, subtle golden rim light` | 商城/道具/功能入口 |
| 资源图标 | `resource icon: …, stack of items, top-down slight angle` | 金币/钻石/体力（成对出亮暗两版不必要，亮版即可） |
| 按钮 | `rounded rect game button labeled area, … color scheme, thick darker bottom edge, glossy top highlight` | **图内不要画文字**，文字由代码叠；按 §2 组件色出金/绿/蓝/红四系 |
| 九宫格面板 | `wooden framed cream panel, corner ornaments, flat center area suitable for 9-slice, …` | 交付 512×512（panel_main/sub 同规格）；**四角装饰必须等宽且只占外圈 12%（≈61px）**，中段留平色可拉伸——代码按 `UiPlate.NINE.panel`（slice `12% fill` / 显示 16px）切，四角不等宽 = 切坏 |
| 横幅/绶带 | `wooden banner board with ribbon, …` | 标题底板，长条形 |
| 角色立绘 | `chibi cartoon character, …, full body, facing right, 3/4 view` | 武器感、职业特征明显 |
| 怪物 | `cartoon monster …, side view walking pose, …` / 走帧：另出横排 12 帧行走序列（见 §5） | |
| 特效 | `spell effect: …, glow, particles,` | 透明底、单帧或横向序列帧 |
| 场景背景 | `game background: …, no characters, painterly cartoon, wide shot` | 竖屏 1080×1920 或按槽位 |
| 徽章/段位 | `achievement badge: shield/medal …, metal finish` | 金/银/铜/紫四档成套出 |

## 5. 尺寸与格式规范

- **格式**：PNG 透明底（场景背景可 JPG）；非幂次尺寸要能被 2 整除。
- **安全边距**：图标/按钮四周留 ≥6% 空白，避免裁边；主体重心居中。
- **逐类尺寸**（与现有槽位对齐，见 ASSET-MANIFEST.md）：
  - 小图标/资源/导航：128×128
  - 功能图标/按钮（单态）：256×256（按钮可 384×384）
  - 面板九宫格：512×512（panel_metal 同规格）
  - 卡牌框/立绘类：730×1152 上下
  - 怪物单图：384×384；行走序列帧：横排 N×256（N 帧，现有为 12 帧 2916~3156×256）
  - 特效序列：512×512 横排 16 格（mortar 同规格）或单帧 256~512
  - 武器子弹：竖长条 23~52×128
- **命名**：全小写下划线，`<分类>/<类别>/<语义>`（如 `ui/button/btn_confirm_green`；类别层可省，
  非 UI 族就是 `<分类>/<语义>`，如 `monsters/boar_walk`），key 即相对 `assets/resources/textures/` 的路径。
  2026-09-21 起 `ui/` 下的件一律按类别归位到子目录（button/panel/banner/nav/res/ico/frame/shop，
  另 progress/badge 两类当前仅有预留 key、无在库图），
  `ui/` 顶层不再放散图；切片落盘前先查 `AssetLib.ts` 里该 key 登记的是哪一级。

## 6. 验收清单（生图指标，出图逐条过）

1. 色板命中：主色落在 §2 色板 ±10% 明度范围内；
2. 描边一致：粗细与基准图同类件相当，无细线/无描边两种混入；
3. 形状语言：大圆角、厚底边（按钮）、木框奶油底（面板）齐全；
4. 明暗：单光源左上，软过渡，无硬噪点；
5. 透明底干净：无白边/黑边/投影残留（场景背景除外）；
6. 无文字、无水印；按钮类不带字（字代码叠）。
   **例外（2026-09-20 拍板）**：通用约定符号不算文字——信息图标中心的字母 `i`、警告三角里的 `!`
   属于形状本体，保留；按钮/面板/标题类仍然不许带字。
7. 尺寸/比例符合 §5，主体居中不出血；
8. 与基准图同类件并排比对，第一眼像一族（同饱和度、同对比度）；
9. 无「AI 味」：无装饰框/徽章容器、无强镜面高光、无火花光斑特效、无照片级纹理，细节密度与基准图同类件一致。

## 7. 代码对接（换肤怎么落地）

| 层 | 位置 | 换肤动作 |
|---|---|---|
| 图片资产 | `assets/resources/textures/<key>.png` | **换图不换 key**：同名覆盖即全游戏生效；新槽位先在 AssetLib MANIFEST 登记 |
| DOM 颜色 | `assets/scripts/ui/UiTheme.ts` | 只改 `--c-*` 值，不改名；历史散落 hex 跑 `tools/tokenize_colors.py` 迁移 |
| 画布颜色 | `GameConfig.ts` 的 `Palette`、`HeroSystem` 的 `lootDropColor` 等 | 值整体换新（这些不走 CSS 变量） |
| 一致性校验 | `node tools/check-art-manifest.mjs` | 清单↔磁盘↔代码引用三方对账，换完必跑 |

**替换工作流**：生图（§3+§4+§5）→ 验收（§6）→ 覆盖/落盘到 `textures/<key>.png` → 新 key 登记 AssetLib MANIFEST → 构建 → `check-art-manifest` + 浏览器烟测 → 提交。
**图标类批量产出**改走 §8 素材表一次成型（三轮起首选）。

### 7.1 换肤的第二条轴：页面是暗场景，弹层才是浅纸（2026-09-21）

上面那张表只管"改哪个文件"，管不了"改成什么色"。踩过的坑是：`HomeUiStyle.ts` 的青瓷层（`--pw`）
是浅色休闲皮的 1:1 翻译，**没有媒体查询、永远覆盖在深色基准层之上**，所以手机上真正生效的是它——
往页面上贴暗金属板之前，页面底还是一张 `#e6eef3` 平灰纸。现在的口径固定成三条：

1. **`.screen` 页面级容器 = 暗场景**：底用 `--c-scene-1/2/3`（凹暗格 / 通栏带 / 提亮顶），
   分隔线用 `--c-scene-line`，收边用 `--c-scene-edge`；字一律亮档（`--c-text*` 正文、
   `--c-cream-1/2` 板上的标签、`--c-gold-hi` 标题与强调）。**平灰 `#ccc`/`#dcdcdc`/`#d3d3d3` 这一批
   不是设计色，是原型没换肤的占位灰**，见到就换掉。
2. **`.panel` / `.mbox` 弹层 = 浅纸**：保持深字。同一个类名两处都会出现的（`.mSub`、`.game-button`、
   `.rcBar`）**只给页面那一处开新选择器**，不许直接改公共那条——那会把所有弹层一起翻错。
3. **贴在板上的字翻亮要挂 `.plated`**：`UiPlate.nineSlice` 只在贴图真的落上那一刻打这个类，
   缺图回退时旧的浅底配色仍然对。

**改完必量的两件事**（`node tools/contrast_audit.mjs <url> <页签> 4.5 [plates]`）：
不带 `plates` 报 WCAG 比值不合格清单（阈值 4.5:1，禁用/半透明态单列不计入）；
带 `plates` 把"压在贴图或九宫格板上、背板色算不出来"那一批按**字色**分组列出来——
这一批是比值审计的盲区，特异性踩坑（`.fcol .btn.blue` 1 id+3 类压过 `.hero-quick .btn` 1 id+2 类，
六枚标签一直停在深墨蓝）就是从这里抓出来的。

### 7.2 整页底贴在 `#homeUi`，不贴在 `.viewport`（2026-09-21 三十二轮）

**踩过的坑有两层，第二层才是要命的那层。**

第一层是**贴错节点**。底图原先贴在 `.viewport` 上，而顶栏与刘海安全区带是 `.viewport` 的**兄弟节点**——
于是屏幕最上方永远留着一条与世隔绝的平色带，用户圈出那条 36px 的 navy 带问"顶部组件怎么办"，
问的就是这个。改法：底图改贴 `#homeUi`（它才是 safeBand + topbar + viewport + tabbar 的公共父节点），
并把移动档的 `.safeBand` / `.topbar` / `.viewport` 三层底色撤成 `transparent`。一张图从状态栏铺到底导。
顺带撤掉的还有 `.topbar` 那道 1px 下划线（世界和界面之间不该有一条网页式横线）、
以及 `.stage-scene` 那层涂色与它的青色渐隐 `::after`（画面已经交给整页底，中间再盖一道渐变
等于在照片上糊一块脏色）。**桌面档反过来要给 `.safeBand` 补上和顶栏同色的底**——那边 `.viewport`
仍是不透明的，不补就会在顶栏上方露出一条照片边、读成贴图错位。

第二层是**底图从来没画出来过**。`UiPlate.frameUrl` 返回的已经是包好壳的 `url(...)` 整串，
而这一处调用写成了再套一层 `url("…")`，得到 `url` 里嵌 `url`，浏览器判**整条** background-image 非法。
于是只剩前面那层遮罩渐变在画——画面看着"只是暗了一点"，`backgroundImage` 读出来也照样非空，
普查与审计都过，从登记那天起一直到这一轮都没人发现。全工程另外 19 处 `_tex` 回调都是直接赋值，
所以别处全好、偏偏背景是空的。

判据两条，都进了断言：

- **`_tex` 给什么就用什么，不许自己套壳**。回归断言在 `tools/check-art-manifest.mjs` 的 5.9，
  扫 `assets/scripts/ui/*.ts` 里"把回调值再包一层 url"的写法。
- **多层 background 不能只看"非空"**。一条 `linear-gradient(...), url(...)` 里渐变层会掩盖图片层失效，
  所以判"这张图到底有没有上屏"要看**计算值里那一段 url 是否合法且能加载**，
  或者直接看取景图里能不能认出画面内容。`tools/probe_pagebg.mjs` 就是为这一条写的：
  它把 `#homeUi` 的 inline / computed 背景值尾巴和顶栏那一点的命中栈一起打出来，一眼看出是谁在画。

**底图按页分**：护送页按章节换（第 1 章 `scenes/bg_road` 新出，第 2~5 章复用战斗侧
`STAGES[].backdrop` 那四张竖图），其余四页仍共用 `scenes/hub_camp`——"让几页站在同一个世界里"
这条没变，变的是护送页的中心要塞得下一座立体船坞，营地那张的中段留不出这个位置。

**新的审计盲区（记在账上）**：底图一旦铺满全屏，压在它上面的字就全都算不出背板比值了——
五页的"算不出"计数从 33/26/38/22/31 涨到 39/32/44/28/37。比值审计在这几页的覆盖力下降，
**只能靠取景目检**。把审计器改成按截图取背板像素（ART-PLAN 里挂着的 #44）从"锦上添花"
变成了这一页继续加美术的前置条件。

## 8. 素材表一次成型工作流（图标类批量产出首选）

**为什么不逐张生**：逐张出图每张风格独立漂移，即使共用风格后缀，拼起来也不像一族；
单次生成的一张多格素材表**内部风格高度自洽**，整体质量也更好（一二三轮实测对比结论）。
**规则：提示词短、要求少、一次成表**——不在 prompt 里逐格指定细节/负面词，风格交给基准图锚定。

### 流程

1. **生表**：一次生成 15~25 格的大表（2048×2048 起步——格多了也不牺牲单件分辨率），
   prompt 只给「主题风格 + 槽位名清单 + 绿幕底」。**不给任何形状/颜色/材质描述**
   （「金色勋章」「绿色手柄」这类也不要写）——设计审美交给生图模型自由发挥，
   文字只负责「第几个是什么」；风格统一靠 edit 模式把基准图2作为输入图（gpt-image-2 /v1/images/edits）。

   两条 2026-09-20 五轮 A/B 补的硬要求（违反任一条整表作废，见下方 A/B 记录）：

   - **槽位名只写"这个位置是干什么的"，一个字都不带形象**。写「图鉴」不写「图鉴卷轴」，
     写「试炼」不写「试炼高塔」，写「获取资源」不写「资源加号」。
   - **背景色点名写 `#00FF00`**，只写「纯色背景方便抠图」会被自由发挥成深灰，整表切不出来。

   四轮实际用的 prompt（留档于 gen-output/*.summary.json）：

   > 一张末日题材欧美卡通风格的微信小游戏UI图标素材图，5列3行网格整齐排列，从左到右从上到下依次是：开始按钮、确认按钮、取消按钮、关闭按钮、头像框、标题绶带、礼物图标、宝箱图标、卷轴图标、信件图标、任务图标、邮件图标、设置图标、排行榜图标、成就图标，图标之间留有间隙，纯绿色背景，按钮上不要画任何文字

   成品：`gen-output/r3_sheet_*.png`（9 格）、`gen-output/r4_icons_*.png`（15 格）（gitignore，仅本地）。
2. **切片落盘**：`python tools/slice_sheet.py <sheet.png> --slots "ui/res/res_gold:128,ui/res/res_diamond:128,ui/res/res_stamina:128,ui/nav/nav_mall:128,ui/nav/nav_heroes:128,ui/nav/nav_battle:128,ui/nav/nav_core:128,ui/nav/nav_base:128,ui/shop/chest:256"`
   ——绿幕整表 → 色键掩膜 → 连通域标记 → 卫星碎件并回主体（面积比 <30% 才并入，防误融合）→
   行主序排序 → 裁边/补安全边距/缩放 → 直接写入 `assets/resources/textures/<key>.png`（换图不换 key）。
   参数：`--expect 15` 校验格数、`--margin 6` 安全边距百分比、`--tol 60` 绿幕容差、
   `--dilate 6` 掩膜膨胀半径、`--root` 指定资源根。
3. **验收**：**源表看着好不等于切片件好**——抠绿损伤（去绿染洗出的白斑、绿主体被吃掉一块）只有落盘后才看得见，
   所以逐格判定要看切片件：`python tools/contact_sheet.py ../gen-output/r10_audit.png <若干 key.png> --cols 3`
   把整批切片拼成一张棋盘底对照图（棋盘格 = 透明），一次目检。棋盘底上能直接看出
   ① 主体有没有被抠穿（`ico_check` 的绿对勾在源表上完好、切片后条身全是白斑），
   ② 描边有没有残留绿边，③ 有没有把邻居的碎件并进来。
   再过 §6 清单（素材表版主要看 5/6/8/9 条）与基准图2并排比对。
4. **落地**：构建 → `check-art-manifest` → 浏览器烟测 → 提交。
5. **审后分流与补出循环**（一类没清零就不进下一类）：整表很少 20/20 全合格，正确处置不是重出整表——

   - 合格格子 → 切片落盘，该 key 从 `RESERVED_SLOTS` 移出、进 MANIFEST；
   - 不合格格子 → **key 原地留在 `RESERVED_SLOTS`**（预留位不预载、上屏走 emoji 回退，
     所以"还没出好"不会破任何断言，也不会出现半张图占位），只把这几个记进
     `ART-PLAN.md` 的批次审图台账；
   - 攒到 3 个以上不合格 → 用同一套提示词写法**只针对这几个再出一张小表**，
     不合格的原因（形象不符 / 细节过密 / 触装饰框硬规则）写进台账，作为下一张小表的调整依据；
   - 该类全部 key 落盘 → 才进下一类。台账就是"进版完成"的判据，不是靠感觉。

### 五轮 A/B：提示词该不该替模型设计形象（2026-09-20）

同一批 20 个功能图标、同一张基准图做风格锚，两种写法各出一表：

| | 提示词写法 | 结果 |
|---|---|---|
| AI 版 `gen-output/r7_icons_*.png` | 槽位名带形象：「图鉴卷轴、试炼高塔、资源加号、升星五角星」 | 出图就是字面物件，拘谨、密度低；背景自由发挥成草绿，抠像过不了 |
| 用户版 `gen-output/icons.png` | 只报功能名：「图鉴、试炼、获取资源、升星」 | 模型自己出了骷髅书、靶心插剑、罐头木料、三星上箭——**设计密度与风格一致性明显更高** |

结论：**生图模型的设计能力优于在提示词里替它设计**。`ART-PLAN` 共性纪律第 1 条「prompt 只报槽位名」
早就写了这条，本表把它钉死成"槽位名 = 功能名，不带形象"，因为 AI 版就是当场踩出来的反例。

代价也要写清楚：不指定形象，就会有个别格子与槽位的真实用途对不上（`ui/ico/ico_add` 是顶栏资源胶囊
右边那个小加号，模型按"获取资源"出了资源堆）。所以 A/B 换来的不是"更省事"，是**质量换审核责任**——
每表必须逐格过台账，见上面流程第 5 步。

### 坑

- **切片是行主序**（上到下、左到右）：prompt 里的格子顺序必须与之对应（写明「5列3行」「从左到右从上到下」），
  落盘前先肉眼核对切出的件与槽位一一对应；
- **相邻件粘连**：格子间隙小于 2×膨胀半径（默认 6÷4 尺度 ≈ 24px 全分辨率，两侧合计 48px）时，
  两件会在掩膜膨胀阶段焊死、合并逻辑救不回（四轮 15 件曾识别成 11 件）。
  生表时写「图标之间留有间隙」+ 用 2K 分辨率；仍粘连就 `--dilate 3` 重切；
- **反方向同样会焊：等距场景插画要 `--dilate 2`**（2026-09-21 r36 表 16 格只识别出 4 个连通域）。
  这类件不是悬空图标，脚下带一片泥地/底座，四件的泥地在原图上就挨着；默认 `--dilate 6`
  （全分辨率约 ±24px）把缝隙一填就是一整行。判据：**整表识别数远小于格数、且合并框横跨多格**
  → 是膨胀把间隙吃了，往小调 dilate（不是往大）；只有"两件本来就画在一起"才往大调后靠合并逻辑救。
- **绿幕容差方向别搞反**：`key_green` 的判据是 `g>tol 且 g-r>tol 且 g-b>tol`，**tol 越小抠得越狠**。
  所以主体自带绿色（僵尸/毒系/军绿箱）时要**调大** tol，不是调小（原文写反过，2026-09-20 实测更正）。
  但 tol 调大有天花板：五轮那张背景为草绿 (65,182,83) 的表，背景侧 `min(g-r,g-b)` 只有 97，
  而电池里的液体绿能到 125 —— **两者通道差重叠，不存在能分开的 tol 值**（tol=60 时主体绿 66.6% 被抠穿）。
  唯一的解法是让背景回到 `#00FF00`（背景侧 ≥250，与任何美术绿都拉得开），别指望调参救不纯的底。
- **深色/黑色背景 = 整表切不出来**：本风格的描边是近黑色，深灰底（约 #1a1a1a）既过不了
  `key_green` 的绿幕判据（`g>60` 直接不成立），也不能改成"按距背景色的距离抠"——那样描边会被连着吃掉。
  五轮用户版 `gen-output/icons.png` 就是因为提示词只写了「纯色背景方便抠图」，模型自由发挥成深灰，
  整表只能作废重出。**底色一律点名 `#00FF00`**，这一条不留给模型决定。
- **451 legal_error 措辞雷区**：现实头衔/合影类词会 400 拒单（「三名幸存者并肩合影」「王者/champion king 段位」均踩过）。
  改成 sprite-sheet 口径（「一行三个从左到右依次是：…」）与中性词（「supreme legend tier emblem」）重试即过；
- **宿主自带板 → 出图表头必须写「不要外框」**（2026-09-21 r35 整表作废）：给「已经有一块九宫格金属板/
  卡片底板」的位置出图标时，只写「单色剪影」不够——模型会自作主张给每枚剪影套一圈方框，
  落进界面就是框套框，正复现用户点名的「方块感太强」（§3 那条「图标一律无装饰外框」在生图表头里
  要重说一遍，写成「四周不要方框、不要边框、不要底板，只留物件本体剪影」）。
  判据：出图前先查这个宿主在 §9 有没有已接的底板件，有就在 prompt 里禁框；
- **槽位名太抽象、连续两次撞形时，第二次要把材料说死**（2026-09-21 r36/r37/r38「强化石副本」）：
  本节上面「不写材质/形象」那条是对**能望文生义**的槽位名（签到、宝箱、关闭）有效。
  「强化石」这种自造资源名模型没有对应物，两次都自由发挥成**发光紫水晶**，与同表的「晶体矿脉」撞形。
  第三次改成槽位名「砖石堆场」+ 一句「主体是砖块、石板与钢筋废料，与水晶、宝石、发光矿脉无关」才拿对。
  判据：**同一个槽位名连续两次出成同一个错东西**，就不是模型的随机性，是这个名字没有信息量，
  此时允许破例写材料，但只写这一处、并在 §9 那行记下破例理由；
- **场景插画只给大位**（2026-09-21 r37→r39 重出一版）：等距小场景（多物件 + 地面 + 阴影）在 **≥60px** 的
  插画位上读得清，落到 27~47px 就是一团深色糊影，而且**深色地面会融进暗底板**——同一排的单物件件
  （卷轴、奖杯、宝箱）反而清楚。判据写在出图之前：先量宿主 `.ic` 的实测方框，
  **<60px 的位一律按单物件出图**（prompt 里明写「单个物件、不画场景、不画地面、颜色明亮轮廓清楚」），
  ≥60px 才允许场景插画。r37 的巡逻/改装两格就是先出了场景、取景才发现糊，白走一轮；
- **三格以下的小表要写"每件不许超出自己那格"**（2026-09-21 r39 首版 3 格只识别出 2 个连通域）：
  格数少时模型会把主体画得顶满格、相邻两件的部件（沙袋与车头的撞角）直接接上，
  这时 `--dilate` 调到 1 也分不开（不是膨胀造成的粘连）。重出时在 prompt 里加一句
  「任何两件都不许接触、件与件之间留出一个图标宽度的空白」即可；
- **本地烟测换端口**：内置浏览器磁盘缓存按源（协议+域名+端口）分区，同端口看到旧图时
  换一个端口重开页签即可验证新图；线上走隧道本来就是新源，不受影响。
  另：IAB 在 ZCode 窗口后台时 rAF 被冻结、引擎静默起不来（无场景无报错）——自动化烟测直接用
  `node tools/smoke_headless.mjs <url> <outDir>`（系统 Chrome 无头 + CDP，选卡用画布坐标点击）。

## 9. 通用件契约表（组件 ↔ 槽位 ↔ 切片参数，美术与代码的唯一对账口径）

> **这一节是进版阶段的对账单**：`assets/scripts/ui/UiPlate.ts` 的常量表与本表逐 key 相互断言
> （`node tools/check-art-manifest.mjs` 会查「UiPlate 槽位未写进本节」）。改参数必须两边同步，
> 否则美术照文档出图、代码照注释切片，两边都对，拼起来是坏的。
>
> 四条接线纪律（写进 UiPlate 头注释）：① 页面里不手写 `style.borderImage*`，一律走
> `nineSlice()/icon()/strip()`；② 组件显示尺寸只归 CSS（内联尺寸会压掉主城两层样式的覆盖规则）；
> ③ 贴图到位即摘同位 glyph，缺图保留 glyph 回退；④ 按钮一律去字底板 + 代码叠字，语义查 `PLATE`，
> 禁止按中文文案正则猜板。

| 通用件 | CSS 宿主 | 槽位 key | 1x 显示 | 适配 | 切片档（UiPlate.NINE） | 态数 | 状态 |
|---|---|---|---|---|---|---|---|
| 弹层底板 M/L | `.pop`（非 S） | `ui/panel/panel_main` | 面板框 16px | border-image | `panel` = slice `12% fill` / width 16px×--pu | 1 | ✅ 已接 |
| 列表行卡底板 | 商城货卡 `.good.panel`（`HomeUiMall.ts:304` 普通货卡 + `:496` 广告卡两处）｜战斗 HUD 邮件行 `.mailRow.panel`（`DomHud.ts:570`） | `ui/panel/row_card` | 卡片最小高 115px×--pu；HUD 那层 `--pu` 就是 `--s` | `nineSlice(el,'card')` | `card` = slice `24 fill` / width 12px×--pu | 1 | ✅ r16 表出图（两件焊死在一起，`--dilate 2` 才切得开）。**稀有度色标在内层 `.gIc` 的边框上、不在卡片本身**，所以贴板只吃掉卡片自己的中性边，不抢品质色。同批的 `panel_mini` **没落盘**——当时写的理由是「跟 `.frame` 的装饰伪元素打架」，Step5 复核后**这条理由作废**：真正的理由是它的两个建点零调用（结案见本节末「模块小框底板」那行）。`skillCard.panel` 也带 `frame`，同样跳过 |
| 弹层底板 S | `.pop.S` | `ui/panel/panel_sub` | 同上 | border-image | `panel` | 1 | ✅ 已接 |
| 大按钮（CTA/登录 START） | `.popBtn` / `.lgStart` | 见下方按钮语义行 | 板框 11px | border-image | `plate` = slice `32% 22% fill` / 11px×--pu（登录 `platePw` 按 --pw）；2026-09-21 由 `16 fill`/10px 改档，理由见「板件不许留透明边」 | 1（态由 CSS 派生，见 §10） | ✅ 已接 |
| 细标题条 | `.popTop` | `ui/banner/bar_title` | 高 41px×--pu | `strip`（100% 100% 拉伸） | — | 1 | ✅ 已接 |
| 横幅绶带 | `.popBanner` | `ui/banner/ribbon_banner` | 高 45px×--pu | `strip` | — | 1 | ✅ 已接 |
| 弹窗标题绶带（备用） | — | `ui/banner/ribbon_title` | 未接 | `strip` | — | 1 | 📦 在库待接（与 ribbon_banner 二择一，暂留备用） |
| 关闭钮 | `.popClose` | `ui/button/btn_close` | 30px×--pu 方 | `icon`（contain + 摘 glyph + 隐边框） | — | 1 | ✅ 已接 |
| 返回钮 | `.popBack` | `ui/button/btn_round` | 30px×--pu 方 | `icon` + `keepGlyph`（‹ 是功能符号不是占位，压在板面上）+ 字色改写 | — | 1 | ✅ 已接 |
| 小圆钮备用件 | `.popMeta .q`（帮助 ?） | `ui/button/btn_round2` | 17px×--pu 圆 | `icon` + `keepGlyph`（? 是符号）+ 隐边框 | — | 1 | ✅ 本轮接线 |
| 行图标外框（框件族） | `.popRow .ic`（`frameTex`） | `ui/frame/avatar_frame`（名片行） | 40px×--pu 方 | **`frame`** = border-image slice `16%`（**无 fill**）/ width 5px×--pu，保背景 | `frame` | 1 | ✅ 本轮接线（顶栏 43px 位不接：`.pAvatar > div` 有 `clip-path` 多边形，框图会被裁，需先定框/切角关系） |
| 入口图标槽（侧栏/页脚键） | `.hot .ic`（`mkBtn`/`mkFoot` 的 tex 参数） | `ui/ico/ico_task` `ui/ico/ico_trophy` `ui/shop/shop_scroll` `ui/shop/shop_gift` `ui/shop/shop_chest` | 34px×--pu（侧栏覆写 56px×--hs / 24px×--pw 与字形同框） | `icon`（尺寸归 CSS，两层同 footprint） | — | 1 | ✅ 本轮接线（新入口图标直接传 key，不再加机制） |
| 底部主导航 5 签 | `.tab .ticon` | `ui/nav/nav_mall` `ui/nav/nav_heroes` `ui/nav/nav_battle` `ui/nav/nav_core` `ui/nav/nav_base` | 102px×--hs ｜ 41px×--pw | `icon`（尺寸交 CSS） | — | 1（选中态 CSS 强调，见 §10） | ✅ 已接（查 `NAV_PLATE`） |
| 顶栏资源胶囊 3 枚 | `.res > span:first-child` | `ui/res/res_gold` `ui/res/res_diamond` `ui/res/res_stamina` | 22px×--hs ｜ 20px×--pw | `icon`（尺寸交 CSS） | — | 1 | ✅ 已接（查 `RES_ICON`） |
| 详情品质头·图标框 | `.popQ .qi` | `ui/frame/frame_q0` `ui/frame/frame_q1` `ui/frame/frame_q2` `ui/frame/frame_q3` | 58px×--pu 方 | `icon`（contain + keepGlyph，框压在道具 glyph 外圈） | — | 1 | ✅ 本轮接线（CSS 白边降为缺图回退） |
| 行图标贴图槽 | `.popRow .ic`（`iconTex`） | 动态 key（立绘/怪图/礼盒…） | 40px×--pu | `icon`（cover） | — | 1 | ✅ 已接 |
| 空态图 | `.popEmpty .ei` | 动态 key（`ui/` 前缀即视为槽位） | 44px×--pu | `icon`（contain） | — | 1 | ✅ 已接 |
| 头像框 | 见下方「行图标外框（框件族）」行：`frame()` 变体已落地并接在名片行 | `ui/frame/avatar_frame` | 40px×--pu | `frame`（border-image 无 fill，不抢 iconTex 的 background） | `frame` | 1 | ✅ 本轮接线；顶栏小位待 clip-path 定案 |
| 段位徽章 ×7 | 待开：段位/成就展示位 | 已移出包 → `art-spec/reference/stock/rank/`（原 `ui/rank1`…`ui/rank7`） | 128px 见方 | `icon` | — | 1 | 📦 在库无宿主，2026-09-21 移出包（**当前无段位 UI**，见 ART-PLAN §5 决策） |
| 名次奖牌 ×3 | **实测宿主只有 1 处**：战斗 HUD 伤害统计 `#domHud .statRank.rank1/2/3`（两个建点：建行 `DomHud.ts:1249`、重排名 `:881`）。规范原先并列写的另两个都贴不了——`.popRow .tag`（排行榜弹窗前三那格）实测只有 10.5px×--hs / 26px×--pw，是塞在胶囊里的随文小符号，128px 位图缩到那儿只会糊（同上面「不该出图」判据①）；`.lbRank .medal` 是**死样式**，而且整块排行榜 CSS（`HomeUiStyle.ts:548~565`、`1880~1893`：`lbEntry/lbBox/lbMy/lbList/lbRow/lbRank/lbIc/lbName/lbScore`）全是孤儿，live 排行榜走的是通用 `_popRow` | `ui/badge/medal1` `ui/badge/medal2` `ui/badge/medal3`（三件全部落盘接线） | 56px×--s（奖牌含骷髅与双翼，`contain` 后在 540 视口视觉约 30 CSS px） | `icon`（`keepGlyph` + `hideBorder` + `color` 换墨，见「状态」列） | — | **3**（一族三件不是二态：金/银/铜各一件，第 4 名起没有奖牌） | ✅ r14 一张表 3 格、棋盘底目检 3/3 合格（**环心镂空是出图时就要求的空位，不是抠穿**——名次数字要叠在环里）。数字保留、墨色换成同档金属色（`--c-gold-bright`/`--c-text-ice`/`--c-amber`，走令牌不写 hex），字号从 34 缩到 20×--s 才塞得进环；第 4 名不贴图也不改色，仍是 CSS 深色板。缺图时三样都不改，观感回到改版前 |
| 主城按钮族（按类别整族铺，不再一处处手工接） | 主 CTA `.game-button`（开始护送 / 十连 / 单抽 / 立即查看 / 难度小键）｜侧栏与入口 `.hot`（招募 / 工坊 / 合成 / 每日免费 / 限时特惠 / 值班卡 / 里程碑 / 编队，约 10 处）｜编队行 `.hpick`（4 行）｜商城购买小键 `.btn.gBuy`｜难度段 `.diffSeg`（三档）｜编队号位 `.squadEntry`（四格） | 主 CTA 复用 `PLATE`：`.major` → `ui/button/btn_play`、普通 → `ui/button/btn_cancel`、带 `.purple` → `ui/button/btn_purple`；新增三档 `ui/button/btn_side`（侧栏）、`ui/button/btn_row`（编队行）、`ui/button/btn_small`（小键）；派生态走同族两条选择器指到不同语义板（`.diffSeg.on` → 金、`.diffSeg` → 蓝；`.squadEntry.on` → `btn_confirm`、其余 → `btn_cancel`），不为每个态出二态图（§10） | 普查实测：主 CTA 203×47 与 307×72、`.hot` 61×50~169×83、`.hpick` 127×47、`.gBuy` 151×37、`.diffSeg` 103×42、`.squadEntry` 40×39（均 ×层缩放） | `nineSlice`，切片一律 `btn` 档 = `32% 22% fill`（百分比而非像素：这一族源件尺寸从 226×256 到 540×256 差得远，像素档一档通用不了），显示宽度两档：`btn` 12px（≥47px 高的面）/ `btnSm` 8px（37~42px 高的面与 40px 方格） | `btn` / `btnSm` | 1（禁用态同板 + CSS filter，见 §10） | ✅ r24 一张 4列2行表出齐 8 块板（同族异色、中央全部平整无镂空——上一轮「留出空位」被读成「挖洞」的措辞已改）。**根因**：全工程原来只有 1 个手工铺板调用点（解锁大键），`.game-button` 这一族最大的 CTA 从来没做过板，所以界面看着"美术没进版"。现由 `UiPlate.CITY_BUTTON_PLATE`（选择器 → key + 档，顺序即优先级，`key: null` = 显式跳过）在 `_switchPage` 尾部整族扫一遍，扫描用的选择器直接由本表拼出，加一档不用再改代码。紫色档 `btn_purple` 的 `PLATE.purple` 映射原来零调用点，本轮由礼包 CTA「立即查看」挂上 `.purple` 才真正用上。**六处实测跳过**：① `.game-button.sm`（里程碑「领取」46×22）比板厚四倍还小，贴上去整块糊掉；② ~~英雄养成五入 `.btn.blue.hot`（61×61）板只盖住中段一条~~ **该跳过已于 2026-09-21 翻案**：那条观察是真的，但归因错了——板只盖中段是因为板件上下各垫了 22% 的 alpha=0 空边（见本节末「板件不许留透明边」），不是宿主太矮。裁紧改档后重测，61px 盒高减两侧 11px 边框剩 39px 平牌面，⚡ 与「技能」两行放得下，五入已接回蓝板 `ui/button/btn_cancel`；③ 章节翻页 `.arrow` 压在关卡实景照片上，照片本身是深色金属调，板子上去等于把箭头融进背景（这条与透明边无关，仍然成立）；**④⑤⑥ 2026-09-21 用户点名撤板的三处**——侧栏一列 `.side-tools .hot`（签到/任务/礼包/图鉴/排行/试炼/无尽）、护送页脚 `.battle-bottom .hot`（巡逻/掉落）、里程碑三格 `.milestones .milestone`。这三处当初保留板的理由是"撤了会露出裸 emoji 夹杂"，而大图标族进版后它们各自已经有真图，板子反而成了"图外面又套一个框"的那层多余东西（用户原话：去掉背板，只剩图标和文本）。**同一张表里加行即可，不改代码**；三条必须排在通配 `.hot` 之前，因为本表顺序即优先级、第一个命中的生效 |
| 容器底板族（r31 表 7 件，一张 3列2行出齐） | **实测宿主 21 个面**：底部主导航 `.tabbar .tab` 五格（106×93，每页都在屏，是普查里最大的一片无图面）｜二级分类页签 `.flat-tabs > button`（商城 4 签 + 背包 4 签共用，135×47）｜战斗 HUD 功能钮 `.hudBtn` 三枚（菜单 64×47、暂停与战报 53×47）｜英雄页装备六槽 `.eqGrid .slot`（82×83）｜基地页建筑卡 `.building` 八张（251×150，**这一页原先九宫格数为 0**）｜行动页模式入口卡 `.challenge-ground .entry` 两张（240×235） | 导航格 `ui/nav/tab_plate`（**整条 `.tabbar` 一块**，见右列末注；`ui/nav/tab_plate_on` 已随之下架，图在 `art-spec/reference/stock/nav/`）｜页签 `ui/tab/seg_plate`｜HUD 钮与装备槽共用 `ui/button/btn_hud` 加 `ui/panel/eq_slot`｜大卡 `ui/panel/building_card` `ui/panel/entry_card` | 按宿主分四档，见右列 | `nineSlice`，扫描走 `UiPlate.SURFACE_PLATE` 这张**新表**（不并进 `CITY_BUTTON_PLATE`）：按钮族只扫 `.viewport`，而导航格在 `.viewport` 之外的 `.tabbar` 里，容器族必须扫整个 `#homeUi`，所以本表选择器一律自带容器前缀。四档切片全用百分比（同族源件比例从 6:1 的薄条到 1.2:1 的方卡，像素档一档通用不了） | `navTab` 26% 12% 与 10px×--pu（导航格那枚图标本身就有 102 见方，板只能露出四边一圈，再厚就把图标压进包边）｜`seg` 30% 10% 与 9px（最薄的条，上下给到 30% 才包得住两头角码，左右再宽就没平牌面了）｜`sq` 26% 22% 与 12px（近方小件：HUD 钮 + 装备槽）｜`bigCard` 26% 12% 与 15px（宿主 ≥150 高的大面） | 导航格 1（**2026-09-21 由 2 改回 1**，见右列）；其余 1 | ✅ 七件全部落盘接线，`--tight` 切片、`trim_alpha.py --check` 七件透明边均 ≤6%（这批是本族第一次用紧切，方化画布那个坑见本节末「板件不许留透明边」）。⚠ HUD 三枚与装备六槽是**两块不同的板**而不是同一块：出图时模型给了两枚近方件，正好按宿主分给两处，不做复用。**⚠ 导航格已于 2026-09-21 反档**：五格各贴一块板，板与板之间必然留缝，读成"五个独立按钮浮在一条带上"——正是用户点的"方块感"。改成整条 `.tabbar` 贴一块、复用同一张图的 `navTab` 档（中间区横向拉长就是连续板面，铆钉只落在整条两端），`SURFACE_PLATE` 两行并成一行 `{ sel: '.tabbar', key: 'ui/nav/tab_plate' }`。**代价**：一块板上没有"哪一格换了板"这回事，选中态不能再靠换板表达，改由 CSS 三件事承担——凹下的深色底（`rgba(4,9,14,.42)` + inset 阴影）、顶部一枚金槽（`.tab.on::after`）、字色与图标转金。选中的那一格因此**不再是"没有图的位置"**，它只是不用自己的图 |
| 进度条（底槽 / 填充） | **实测宿主 7 条**：HUD 四条 `.xpBar`（25px，底槽+蓝填充）、`.vehTrack`（20px，只贴底槽）、`.bossTrack`（28px，底槽+红填充）、`.statBar`（20px，只贴底槽）；主城三条同轮加粗后接入——`.expbar` 顶栏指挥官经验（10px，底槽+蓝）、`.popRow .pbar` 弹层行进度（12px，底槽+绿）、`.popAct .bar` 弹层活跃/保底（12px，底槽+黄，两处调用点）；抽卡保底条 `.offer-copy .rcBar` **退回 6px 不贴**（加粗会挤动那张主推卡，6px 也配不出内腔）。另 `.qBar/.biBar/.talentBar/.prosBar/.actBar/.starBar` 六条是**死样式**（全工程无一处建 DOM），`.popBar`/`.bagBar` 名不符（弹层底栏与背包容器，不是进度条） | `ui/progress/bar_track` `ui/progress/bar_fill_blue` `ui/progress/bar_fill_red` `ui/progress/bar_fill_green` `ui/progress/bar_fill_yellow`（五件全部落盘接线） | 底槽条高 12~28px；填充件横向拉伸、宽度仍由 JS 写 % | 底槽 HUD 四条 `nineSlice(el,'bar')`、主城四条 `nineSlice(el,'barThin')`，填充一律 `strip`；两条不贴图的理由：`.vehicleFill` 的色是 `.warn/.danger` 三态由 CSS 类切（内联贴图会吃掉三态，**2026-09-20 拍板不换**），`.statBarFill` 的色由 JS 按英雄身份色内联写（`DomHud.ts:894`） | `bar` / `barThin`（✅ 2026-09-20 按 `tools/measure_nine.py` 实测改档：切片同为 `10 17 10 17 fill`，显示宽度随宿主条高折算——20~28px 用 4px 与 7px、10~16px 用 2px 与 4px，均 ×--pu） | 1 | ✅ 底槽八条 + 四色填充全部接线；HUD 层补 `--pu: var(--s,1)` 令牌（同 D10b 的口径），否则板厚不随 HUD 缩放。⚠ 经验条原色是青 `#4dd0e9`，同轮拍板**沿用蓝**：族内四色只是出图侧的归类，落到具体宿主要让位于「换图不换观感」 |
| 二级页签图标 | **实测 7 个位置、5 个键**：商城 `.shopTabs` 四签（英雄/装备/宝石/材料）+ 背包 `.bagTabs` 四签（装备/宝石/材料/道具），其中装备/宝石/材料三签两处共用同一件。规范原先写的第三个宿主 `.chTabs`（章节页签）是**死样式**——护送页早已改成「章节头 + 场景内侧左右翻页箭头」（`HomeUiStage.ts:68` 的注释就写着「替代原五章页签」），全工程无一处建这个 DOM | `ui/ico/tab_hero` `ui/ico/tab_equip` `ui/ico/tab_gem` `ui/ico/tab_mat` `ui/ico/tab_potion`（五件落盘接线） | 图标 20px×--hs ｜ 20px×--pw。两套页签都并进了 34~56 高的 `.flat-tabs` 条带、文字只有 12 号，图标取 20 才能与文字并排且不撑高行（原先粗写的「20~34px」是照 `.hot .ic` 抄的，那个位置有 56 高） | `icon`（contain；尺寸一律归 CSS 两层） | — | 1（选中态走 CSS，见 §10） | ✅ r13 一张表出齐 6 格，棋盘底目检 6/6 无抠穿、无绿边、无邻居碎件并入，5 件落盘。⚠ **`tab_core` 图合格但没有这个页签**：背包第四签的真名是「道具」（`item` 分类 = 非装备/宝石/材料的消耗品，贴图沿用 `tab_potion`，医疗包读得出「耗材」），武器核心只是养成弹窗里的一行、不是页签，硬套 `tab_` 键等于给同一个位置挂两套语义 —— 键留在采购单，切片件归档在 `art-spec/reference/stock/ico/tab_core.png` 不落盘（2026-09-20 拍板「核心页签功能我后面做」：`MANIFEST` 与本表那行都不删，界面建好当天拷回 `assets/resources/textures/ui/ico/` 再删 `RESERVED_SLOTS` 一行即生效） |
| 功能图标·第一批 12 件 | 侧栏 `.side-tools .hot .ic`（签到/试炼/无尽）｜英雄页 `.hero-quick .btn .ic`（核心/武器/升星/天赋）+ `.hero-tools .hot .ic`（招募/工坊，两处：页头与背包行）｜顶栏 `.res .add`（加号）｜确认弹窗 `.popIcBig`（删除/警告） | `ui/ico/ico_signin` `ui/ico/ico_trial` `ui/ico/ico_endless` `ui/ico/ico_core` `ui/ico/ico_weapon` `ui/ico/ico_starup` `ui/ico/ico_talent` `ui/ico/ico_recruit` `ui/ico/ico_forge` `ui/ico/ico_add` `ui/ico/ico_del` `ui/ico/ico_warn` | 侧栏与英雄页 23~26px、顶栏加号 14px、弹窗大图标 62px（各 ×层缩放） | `icon`（contain；尺寸一律归 CSS 两层） | — | 1 | ✅ 图标第一批落盘接线（2026-09-20）。⚠ 英雄页「技能」键按「除技能外不换」保留 emoji，但已一并包进 `.ic` span 以对齐字号。**2026-09-21 追撤 `ui/ico/ico_skill` 键**：技能这一族用户明令不换图，那这个键永远不会有人填，留在 MANIFEST 里就是一条永远缺文件的空槽（预载白发请求、对账永久挂账），已从 `MANIFEST` 与 `RESERVED_SLOTS` 双双删除 |
| 功能图标·第二批 4 件 | 商城主推「看广告」键 `.offer-buttons .hot.rcAd .ic`（播放三角）｜设置弹窗音量行 `.popAttr .ai`（滑杆）｜战斗 HUD 左上两键 `.hudBtn.pauseBtn .ic` `.hudBtn.statsBtn .ic` | `ui/ico/ico_ad` `ui/ico/ico_slider` `ui/ico/ico_pause` `ui/ico/ico_stats` | rcAd 23px、`.ai` 34px、HUD 键内 56px（均 ×层缩放） | `icon`（HUD 两键的图挂**内层 `.ic`**：`.hudBtn` 的底是 CSS 渐变板面，图直接压在按钮上会连板面一起换掉） | — | 1 | ✅ 图标第二批落盘接线（2026-09-20）。⚠ HUD 两键首版接成「一次性取 URL」（照本文件邮件行旧例），实测**根本没上图**——DomHud 在场景加载时就建整棵 DOM，那会儿预载还没回来，返回 null 就永久留 glyph；现改走 `DomHud._tex` 挂起队列、`update(dt)` 里排空，见 ART-PLAN D20 |
| 功能图标·第三批 3 件 | 主城设置弹窗音效行 `.popAttr .ai`（按静音态在 喇叭/喇叭叉 之间换图）｜战斗页设置浮窗三个小节头 `.bSetHead .ic`（音效 / 关于 / 危险操作，第三处复用第一批的 `ico_warn`） | `ui/ico/ico_sound` `ui/ico/ico_mute` `ui/ico/ico_info` | `.ai` 34px、`.bSetHead .ic` 30px（×--s） | `icon` | — | 1 | ✅ 拆行接线轮（2026-09-20）。两条新机制：`PopAttrOpts.iconTex`（glyph 先占位、图到位由 `icon()` 摘掉，缺图不空槽）与 `DomHud._iconIc(el, glyph, key?)` + `mkHead(icon, text, tex?)`；`.bSetHead` 改 flex 让图标与标题同行居中。音效行随 `_popRebuild` 在静音/开启两态间换 key，这是「状态换图」而不是「状态显隐」，所以不受 §9 小状态符禁令约束 |
| 功能图标·空态与检索 3 件 | `_popEmpty` 的**默认件**（15 个调用点里不传 icon 的那些，本轮把「背包中该部位没有其他件」一条改走默认）｜背包头行检索框 `.uiSearch i`（`HomeUiMall._searchBox`）｜行动页页脚第四快捷 `.hot`（👥好友） | `ui/ico/ico_empty` `ui/ico/ico_search` `ui/ico/ico_friend`（三件落盘接线） | `.ei` 弹层空态位、`.uiSearch i` 14px、页脚 `.ic` 34px（×层缩放） | `icon`（contain；尺寸一律归 CSS 两层） | — | 1 | ✅ r23 一张 4列1行表出齐 4 格，目检 4/4 合格、三件落盘。**这一轮按用户新令改口径**：原来判「没有功能位就不出图」，现在改成「**没有落点就把落点建出来**」——search 是本轮新建的背包按名字检索（四个页签共用，整页重建后把焦点放回输入框末尾），friend 是本轮新建的行动页页脚入口（社交系统还没做，但弹窗有说明、有「去看排行榜」的出路，不是静默死键）。`ico_empty` 的默认值同时改了：原来传贴图 key 时 glyph 直接置空，预载没回来那一刻是个空槽，现改成先摆占位字形、图到位由 `icon()` 摘掉（同 `_popAttr.iconTex` 口径） |
| 功能图标·撤销 1 件 | 无（本轮判据见状态列） | `ui/ico/ico_undo` | 同上口径 | `icon` | — | 1 | ✗ 图合格但**不落盘**（切片件在 `art-spec/reference/stock/ico/ico_undo.png`，键留采购单）：全工程没有一个可撤销的动作——现有的 `↩`/`←` 是弹层二级页的**返回**键（`HomeUiCore._popBar`），语义不是撤销，给它上图会把「返回上级 / 返回上一页」两档压成同一个符号；而凭空造一个点下去无事发生的「撤销」键又破了「无死键」红线。**下一个真正可撤销的操作做出来时这一件即接上**（首选方案：天赋误点后的「撤销上一次加点」，它只需要记住上一条加点记录，不必动持久化） |
| 状态与属性图标 8 件 | 战斗 HUD 波次 chip 底下的**本波精英词缀徽标行** `.afRow .afIc`（`DomHud._refreshAffixes`，0.4s 刷一次）｜装备详情与重铸弹窗的词缀行 `_popAttr`（两处调用点，`iconTex: UiPlate.STATUS_TEX[id]`） | `icons/status_shield` `icons/status_sword` `icons/status_heart` `icons/status_skull` `icons/status_fire` `icons/status_bolt` `icons/status_lock` `icons/status_search`（八件落盘接线，查 `UiPlate.STATUS_TEX`） | HUD 徽标 26px×--s、弹层图标列 34px×层缩放 | `icon`（contain） | — | 1 | ✅ r21 一张 5列2行表出齐 10 格，棋盘底目检 10/10 无抠穿。**无头取景已目击上图**：第 4 波场上出现「狂暴」精英时，波次 chip 底下那枚火焰徽 `bg=Y`、emoji 被 `icon()` 摘成空串（截图 `gen-output/smoke_step2p/06b-affix-badges.png`）。**一张表吃两套词缀**：精英词缀（迅捷/坚甲/治疗/分裂/狂暴）与装备词缀（狂暴/精准/迅捷/鹰眼/穿甲/铁壁）共用 `STATUS_TEX`，两边 id 不撞（后者带 `af_` 前缀）。⚠ **`status_ice` / `status_poison` 不落盘**：图合格，但战斗里没有冰冻/中毒这类持续伤害机制（无 DoT 系统），挂上去就是永远不亮灯的死槽——切片件与 `tab_core` 同样归档在 `art-spec/reference/stock/ico/`，键留采购单。⚠ 出图时「锁定」那格模型画成了**分划板**（准星）而不是挂锁：将错就错——它正好对上装备词缀「精准」，而真正的「锁」在本作里是随文小符号（🔒 跟在文案里），按判据①本就不该出图。⚠ 装备词缀那一处宿主**机制已验、具体格子未在取景里走到**（要背包里有一件带词缀的装备才看得到，无头烟测的存档背包是空的）；走的是 `_popAttr.iconTex` 这条第三批就跑通的老路 |
| 材料与宝石 7 件 | 背包格 `.bcell i`（`HomeUiHeroes.ts:822`，格 124px、图标框 72px×--hs；背包条里 110px 格配 64px 框）｜商城货卡 `.gIc`（`HomeUiMall.ts:311` 的 `mkGood({icTex})`，框 120px×--hs ｜ 92px×--pw） | `icons/mat_stone` `icons/mat_alloy` `icons/mat_core` `icons/gem_fire` `icons/gem_wind` `icons/gem_ice` `icons/gem_thunder`（七件全部落盘接线，查 `UiPlate.MISC_TEX`） | 图标 64~120px×层缩放（尺寸归 CSS） | `icon`（contain） | — | 1 | ✅ r19 一张 4列2行表出齐（模型多画了第 8 格琥珀雷宝石，不在采购单上，丢弃）。**这七件必须 `--tol 95` 切**：绿宝石的亮绿漩涡在默认 tol=60 下满足「g-r>60 且 g-b>60」，会被当背景抠穿——棋盘底目检才发现，源表上看不出。`mat_blueprint`（图纸）没出图，查 `MISC_TEX` 查不到就走 emoji，**不要改成 `'icons/'+id` 拼 key**：拼出来的串对账不认，会把已落盘的图判成无归宿 |
| 装备空槽底纹 6 件 | 英雄页装备六槽 `.eqGrid .slot` 的**空槽分支**：`.slotGhost` 子元素只在槽空着时建（`HomeUiCore._slotGhost`，由 `HomeUiHeroes.mkSlot` 调用）。已装备那一支仍是 `SLOT_EMOJI`——**虚/实是同一格的两种状态**，不是两套图标 | `ui/ico/ico_slot_helm` `ui/ico/ico_slot_vest` `ui/ico/ico_slot_bracer` `ui/ico/ico_slot_legs` `ui/ico/ico_slot_glove` `ui/ico/ico_slot_boot`（六件落盘接线，查 `UiPlate.SLOT_GHOST_TEX`） | 宿主 82×83px×层缩放，剪影取 60%×60%（≈50px）并压到 opacity .55 | `icon`（contain；尺寸与透明度归 CSS，JS 只挂图） | — | 1（空/满两态由**建不建这个子元素**区分，不出二态图，见 §10） | ✅ r35b 一张 3列2行表出齐 6 格。⚠ **第一版 r35 整表作废重出**：模型给每枚剪影套了一圈方框，而这一族的宿主本身已经是一块 `ui/panel/eq_slot` 金属板（上面「容器底板族」那行接的），框套框正好复现用户点名的「方块感太强」，也直接违反 §3「图标一律无装饰外框」。重出的 prompt 里显式写了「四周不要方框、不要边框、不要底板，只留物件本体剪影」才拿对——**凡是宿主自带板的图标位，出图表头就要写这一句**，光写「单色剪影」不够 |
| 基地建筑插画 8 件 | 基地页 `.building .ic`（八张建筑卡，实测图位 187×104，是主城单页最大的一片插画位；原先整页八个大号 emoji 裸排） | `ui/build/build_hq` `ui/build/build_camp` `ui/build/build_armory` `ui/build/build_lab` `ui/build/build_workshop` `ui/build/build_depot` `ui/build/build_station` `ui/build/build_radar`（八件落盘接线，查 `UiPlate.BUILDING_TEX`，键 = `BUILDINGS[].id`） | 图位 187×104（`width:85%`/`height:100%-29px`，上限 135×118 ×层缩放），源件切 256 | `icon`（contain；盒与字号归两层 CSS） | — | 1（未解锁态仍贴图，暗下来由 `.building.locked` 那层 CSS 管，不给每态出图，见 §10） | ✅ r36 一张 4列4行表 16 格里的前 8 格。**清单是量出来的不是想到的**：`tools/audit_emoji_slots.mjs`（本轮新建）把五页里「整个元素就是一个 >=18px 的 emoji 且没有贴图」的位置列全，实测 33 处，这一族占 8 处。⚠ 切片要 `--dilate 2`——这批是**等距小场景插画**，每件脚下都有一片泥地，默认 `--dilate 6`（全分辨率约 ±24px）会把同一行四件的泥地焊成一整块，识别成 4 个连通域、整表切不开。同批 `build_lab`（雷达成像仪 + 生化培养罩）与 `build_radar`（大锅 + 格构塔）都带天线盘，形状有 30% 重叠，**接受**：建筑卡下方就是中文名，靠文字消歧，不值得为这一处重出整表 |
| 玩法入口插画 11 件 | 行动页资源副本行 `.dungeon-row .hot .ic`（55×55）｜挑战场两张入口卡 `.challenge-ground .entry .ic`（205×151，全主城最大的两个插画位）｜远征行 `.expedition > .ic`（94×83）与「远征」键 `.ic`（47×47）｜护送页页脚「巡逻」「编队」`.ic`（47×47）｜商城「招募英雄」货卡 `.gIc`（61×61）｜行动页页脚「载具改装」`.ic`（27×27） | `ui/act/dungeon_gold` `ui/act/dungeon_stone` `ui/act/dungeon_alloy` `ui/act/dungeon_gem` `ui/act/trial_endless` `ui/act/escort_endless` `ui/act/expedition` `ui/act/patrol` `ui/act/squad` `ui/act/recruit_hero` `ui/act/vehicle_tuning`（十一件落盘接线，查 `UiPlate.MODE_TEX`）｜远征行那枚 🚚 复用护送章节头同一件 `icons/vehicle_truck`（同图不同位允许，同位重复才禁） | 大插画位（105px 字）切 256，55px 以下切 192 | `icon`（contain；`mkEntry`/`mkDaily` 新增 `tex` 槽，与 `mkBtn`/`mkFoot` 同一口径） | — | 1 | ✅ r36 后 8 格中的 7 格 + r37 三格 + r38 一格。**r36 第 10 格「强化石副本」当时判死**：模型画成蓝色水晶矿洞，与第 12 格「晶体矿脉」（紫水晶）在 55px 的副本行里读成同一个东西——那一排给玩家做的选择正是"打哪个副本"，撞形就是功能缺陷，比缺一个更糟，所以宁可让四条里缺一条。补出时**换了槽位名**：「强化石」这个词模型每次都读成发光水晶（r37 第一格又是紫水晶），改成「砖石堆场」并允许写一句材料（砖块/石板/钢筋）才拿对——这是 §8「prompt 里不写材质」的一条**有记录的反例**：槽位名太抽象、连续两次撞形时，第二次要把材料说死。「编队」👥 原先也判"不上图"（库里唯一的人形件 `ico_friend` 已挂在页脚「好友」上，两个语义挂同一件等于把编队与好友压成同一个符号），r37 给它出了专件之后才接上。护送页脚「掉落」🎁 接的是 `ui/shop/shop_chest`（补给箱）而不是礼盒件——那一格说的是"这趟会掉什么"，宝箱比礼盒读得对，也是零出图接线。**「巡逻」「载具改装」两格重出过一版**：r37 给的是等距小场景（吉普 + 灯柱 + 路障 / 举升机上的车队），落到 47px 与 27px 的格子里就是一团深色糊影，跟同一排的单物件件（卷轴、奖杯、人形）摆在一起反而更难看——r39 按**单物件**口径重出（哨塔 / 改装车 / 勋章），换图不换 key。判据见本节末「场景插画只给大位」 |
| 行动页日常四快捷（签到/任务/礼包**零出图**，成就补一件） | 行动页 `.action-daily .hot.dutyCard .ic`（31×31）：签到 / 任务 / 成就 / 礼包 | 签到 `ui/ico/ico_signin`、任务 `ui/ico/ico_task`、礼包 `ui/shop/shop_gift`（三件都是在库件，为侧栏同一批入口出的图，这里只是把 `mkDaily` 补上 `tex` 槽）；成就 `ui/act/achievement`（r39 新出：带绶带的圆形勋章）——**不复用 `ico_trophy`**，那件已经挂在页脚「排行榜」上，两个语义共用一个符号等于把「成就」和「排行榜」压成同一个入口 | 31×31（×层缩放） | `icon`（contain） | — | 1 | ✅ 本轮接线（普查实测这四格是"有图没接"，不是"没图"；只有成就那一格真缺图，随 r39 补上）。这一类补的是 §9 那条老判据的反面：**在库件也要逐格核宿主**，出过图 ≠ 接上了 |

> **有些槽位不该出图**（2026-09-20 第二批定，同批撤掉的 4 个键都属这几类）：
> ① **随文小状态符**留字符——`›`（详情链尾）、`✓`（登录协议勾选、网格选中角标）、`✅`（签到已领格）
> 这类符号跟着文字色和基线走，还要随布尔值显隐；128px 位图缩到 10~14px 只会更糊，
> 且贴图一旦挂上就不随 `.on`/`.sel` 状态变化（内联样式压过类规则）。
> ② **同一个键不重复出图**——日历与 `ico_signin` 是侧栏同一个签到键，商店帐篷与底部页签的
> `nav_mall` 是同一个入口，收件与顶栏邮箱的 `ico_mail` 是同一个入口，出了也是两份图抢一个位置。
> ③ **先有功能位再出图**——好友、放大镜这类，缺的是界面不是美术。
> ④ **位置已被当代在库件占着、且拍板不换的，撤键**——图鉴（`ui/shop/shop_scroll`）、
> 补给箱（`ui/shop/chest` / `shop_chest`）2026-09-20 拍板保留旧图，`ico_codex` / `ico_loot` 随批撤。
> 同一条理由也解释了为什么主城设置弹窗的小节头 `🔊` / `ℹ️` **不**拆行上图：
> `.popSec` 只有 11.5px（战斗页同内容的 `.bSetHead` 是 30px，所以那边能上），
> 拆出来也是一份糊图。

### 按钮语义 → 去字底板（`UiPlate.PLATE`，唯一映射）

| kind | 槽位 | 用在哪 | 状态 |
|---|---|---|---|
| `gold`（缺省） | `ui/button/btn_play` | 主 CTA：领取/确定/开始 | ✅ 已接 |
| `green` | `ui/button/btn_confirm` | 确认/消耗类（购买、强化） | ✅ 已接 |
| `blue` | `ui/button/btn_cancel` | 次级/取消 | ✅ 已接（主城 `.btn.blue` 待按本表接线） |
| `danger` | `ui/button/btn_danger` | 警示：重置存档、退出 | ✅ 已接 |
| `ad` | `ui/button/btn_video` | 看广告得奖励键 | ✅ 本轮显式化（旧版靠中文文案正则命中，改文案即掉板） |
| `grey` | `ui/button/btn_cancel` | 置灰次级键（沿用蓝板 + §10 派生态） | ✅ 已接 |
| `purple` | `ui/button/btn_purple` | 特殊：限时/首充/超值 | ✗ 待生图（缺图回退 CSS 底色） |

> **旧一代板已归档**（2026-09-20 拍板弃用）：`panel_metal` `panel_frame` `card_frame`
> `icon_frame` `btn_primary` `btn_gold` `btn_cyan` `chip_dark` `banner_orange` 共 9 件移出
> （另 `ui/banner/banner` `ui/panel/panel_card` 因 `LevelUpPanel` 画布取帧仍在服役而放回在库，见 ASSET-MANIFEST §E）
> `textures/` 契约位，改放 `art-spec/reference/legacy-keep/`（不进包、不登记、看中了可原样拷回）。
> **另一处归档位**：`art-spec/reference/stock/` —— 2026-09-21 分类迁移时移出的 12 件「在库但无宿主」
> 的件（段位徽章 ×7、铜银金头像框 ×3、`ico_achieve`、`ico_lock`），同样不进包、不登记。
> 两处区别：`legacy-keep/` 是**风格作废**，`stock/` 是**风格没问题、只缺要用它的界面**。
> 留下来的规矩仍然成立：**在库件必须有归宿**——要么在本表登记宿主后接上，要么列退役候选，
> 不允许「预载但不引用」这种第三态（`check-art-manifest` 的 5.6 断言在盯）。

### 薄板档：小尺寸键为什么现在不能贴常规板

**实测踩坑（2026-09-20）**：英雄页养成五入（`.hero-quick .btn`，44~56px 见方）按 `plate` 档贴蓝板后，
每边吃掉 10px 斜面，内容盒只剩 30~36px，而 emoji+文字要 40px 以上 → **文字直接压在板面上重叠**。
同一轮还暴露第二个坑：主城上下文原本没有 `--pu`，`calc(10px * var(--pu,1))` 退化成恒定 10px，
手机上本该 25px 的板厚变成 10px，板与件的比例彻底失衡（现由 `#homeUi .btn { --pu: var(--hs,1) }`
+ 青瓷层 `--pu: var(--pw,2.5)` 补齐两层）。

闸门（2026-09-20 修正）：**某件能不能贴某档，看内容盒而不是看件宽** —— 板厚必须满足
`2×板厚 ≤ 件宽 − 文字实需宽`。原先写的「件宽不足板厚四倍不许贴」是个粗代理：五入 44px / 板厚 10px
按它算刚好过关（44 > 40），实际仍压字，因为 `> span` 9px 三个汉字就要 ~28px，内容盒只剩 24px。
主城键当前只允许 `.btn.big`（整幅大键，如「前往商店解锁」）走 `CITY_PLATE`；`.hero-quick` 五入与
`.gBuy` 小胶囊保持 CSS 底色。出图时按钮板/进度条这类件要**分档给**：

| 档 | 用途 | 源件建议 | slice / 显示 |
|---|---|---|---|
| `plate`（已定） | 弹层 CTA、`.btn.big`、登录 START | 高 ≥40px@1x | `32% 22% fill` / 11px×--pu（2026-09-21 改档，依据见下「板件不许留透明边」） |
| `bar`（**已定档 → 同日按生成件改档**，依据见下） | 进度条底槽 `ui/progress/bar_track` | 512×64，上下描边各 10px、左右圆头各 17px | `10 17 10 17 fill` / 4px 与 7px×--pu |
| `barThin`（**同档切片、薄宿主专用显示宽度**） | 10~16px 的薄条（主城四条 12px） | 同一张 `bar_track` | `10 17 10 17 fill` / 2px 与 4px×--pu |
| `chip`（**未定档、不进 NINE**） | `.good .gBuy` 27px、`.gBuy` 44~56px、`.hero-quick` 五入 44px | 128×128，斜面画进 12px | 建议 `12 fill` / 6px×--pu，待样张实测 |

`UiPlate.NINE` 里没有的档 = 不许接线：先补本表一行、再加 NINE 一档、最后接宿主，顺序不许多。
`chip` 那行只是建议值，没进 NINE 也就没资格接线；批5 出样张后照下面 `bar` 的写法量一次再定。

#### `bar` 档的实测依据（2026-09-20，量 `game_art_benchmark2.png` 的进度条带）

基准图三条条体（体力/经验/关卡）在 2048 图上的几何：条高 ≈27px、外圈黑边 ≈3px（y=1877~1879 为黑，
1880 起才是填充）、顶部高光带 ≈3px、往下竖向渐变、圆角半径很小。能迁移的只有比例：
**描边 : 条高 ≈ 1 : 9**。回推到 1x 显示——条高 14px 时描边 ≈1.5px（取整 2px）；源件高 64px 时描边
≈7px（slice 取 8，留一点圆角余量）。于是 `bar = { slice: '8 fill', width: 'calc(2px * var(--pu,1))' }`。

**同日按生成件改档（r12 表落地时）**：上面那组数字是从基准图**比例**推的，前提是「圆角半径很小」。
实际出图的五条件圆头很大——`python tools/measure_nine.py <bar_track.png>` 量 512×64 的切片得
「柱高爬到满高 98% 用了 17 列」，即左右圆头各 17px、上下描边含抠像软边各 10px。
按 `8 fill` 切会把圆头划进中段横向拉长，两端糊成一条直线。故改为四边分设：
`bar = { slice: '10 17 10 17 fill', width: 'calc(4px * var(--pu,1)) calc(7px * var(--pu,1))' }`
（4/7 按宿主 20~28px 对 64px 源件折算，比例 0.39~0.44 取中）。
**教训：切片档要量「真正要用的那张切片件」，不能只量参考图的比例。**

**同一轮量出来的硬约束（原先没进规范）**：条类宿主的真实高度见 §9 进度条行——HUD 四条 20~28px 达标，
主城四条只有 3 / 6 / 7 / 8px。**条高低于 10px 时，上下两条描边就把内腔吃光了**，贴九宫格等于把一根
细线糊成一坨。所以 `bar` 档的适用前提写死在这里：**宿主条高 ≥10px（设计像素）**；过不了筛的那几条
**不许为了贴图去抬高度**（会挤动整页布局），承认它就是一根 CSS 渐变线。这条筛子排在接线之前，
别等贴完再回退。

基准图那三条条体中间嵌着字（`120/120` `68%` `3/3`），所以它只能用来定比例，**不能当切片源**；
真正上屏的 `ui/progress/bar_track` 必须另出干净件（批5）。

#### 板件不许留透明边，切片值必须大于透明边并包住铆钉（2026-09-21，弹层 CTA「字溢出板面」的真因）

现场：升星弹窗底部那颗禁用 CTA「还差 20 片」，字从木板的上下沿探出去。第一反应是「板太窄/字太长」，
但 `tools/page_shot.mjs` 的普查把三个数都量了出来：盒 165×59、内边距 30.46px、文字实需 100px——
**横向差 65px，字根本没溢出**。溢出的是**竖向**：木板只渲染出盒子高的约 55%，字压在板上下的空白里。

往源头查，两件事叠在一起才成立：

1. **`tools/slice_sheet.py` 旧版把每件方化**。`extract()` 取完内容包围盒后，按「最长边 ×(1+margin)」
   铺一张**正方形**画布再把件居中贴回去。方形图标这么干没事；横长的板件因此上下各垫一大圈 alpha=0——
   `ui/button/btn_play.png` 量出来是 384×384 的方图，真正的木板只有 **364×210**，上下各 87px 空边（23%）。
2. **切片档小于那圈空边**。`plate` 当时是 `16 fill`：16px 全落在 87px 的空边里，于是透明行被划进
   **可拉伸的中段**，中段按宿主高度铺开时木板只占中段的一部分 → 板面缩水到宿主盒高的 55%。

所以修的是两刀，缺一不可：

- **裁**：`python tools/trim_alpha.py --apply <板件...>` 按 alpha 包围盒（阈值 8，保留抠像软边）裁掉空边。
  本轮裁了 9 件（按钮族 7 + `ui/panel/panel_sub` + `ui/frame/avatar_frame`）。
  `ui/progress/bar_track` **故意没裁**——它的 `10 17 10 17` 档是按 512×64 量的，且 HUD 四条进度条已目检过，
  裁了要连着改档重验，与本轮无关；9% 的空边对一根 20~28px 的条不致命。
- **改档**：切片一律改**百分比**（`32% 22% fill`），因为按钮族那几件源件尺寸差得远
  （`btn_play` 364×210、`btn_small` 226×256 是竖的、`btn_row` 540×256），像素档不可能一档通用；
  百分比才跟得上。32%×22% 是照 `btn_play` 的铆钉位置量的：铆钉占 x≤23%、y≤32%，
  取这个数让**四枚铆钉整块留在角区**（角区不拉伸），中段只剩平整牌面。
  判据同 `chip` 那条：**不能被拉伸的东西（包边、铆钉、斜角）必须整个落在角区里**。

以后出板件的表，切片这一步**必须带 `--tight`**（`python tools/slice_sheet.py <表> --slots ... --tight`），
它跳过方化、按内容包围盒输出。检查办法：`python tools/trim_alpha.py --check <板件...>`，
任一边的透明边 >6% 就是切片档的雷。量取值用 `python tools/measure_plate.py <板件...>`，
看布局用 `python tools/ascii_alpha.py <板件...>`（把 alpha 降采样成 ASCII，铆钉占第几格一眼可见）。

#### 「这一格可以点了」的提示不许用 box-shadow（2026-09-21 撤板轮，撤了板又长回一块）

现场：用户点名把里程碑三格的金属板撤掉（`CITY_BUTTON_PLATE` 里 `key: null`），撤完无头取景里
可领取那一格后面**仍然有一块硬边深色矩形**。探针（`tools/probe_milestone.mjs`：把该矩形区内所有
会画东西的节点连同 `::before`/`::after` 一起列出来）证明该格 `background-color: rgba(0,0,0,0)`、
`border-image: none`——**没有任何板**；再在同一条扫描线上取盒内与盒外的像素，两处 RGB 完全相同。

那块"板"是 `huiChest` 脉冲给整格（163×83）描的一圈金色 `box-shadow`：光只打在盒外 11px，
盒内仍是暗场景，**一亮衬一暗就读成凹进去的面板**。把脉冲收到箱子图标上之后仍剩一小块方框，
因为图是 `background-size: contain`、不满 `.ic` 那个 53×43 的盒，而 `box-shadow` 描的永远是盒。

口径：**给贴图件做"在亮 / 可领"的提示，一律 `filter: drop-shadow()`**（它吃的是渲染后的 alpha，
光晕沿图形轮廓走），不用 `box-shadow`。本仓库的落地是 `@keyframes huiChestSil`，里程碑那一族已改；
`.actChest.ready .acIc`、`.talentNode.can` 两处仍是方框脉冲，等它们各自的宿主被撤板或放大时同口径改过去。

**顺带一条排查法**：怀疑"某处多了一块板"时，别只看 `background-image`——九宫格板走 `border-image`，
而这一类"看起来是板"的东西很多根本不是背景（`box-shadow`、`outline`、祖先的 `mask`、伪元素都算）。
把该区域内所有绘制者连同伪元素一次列出来，比反复猜层叠顺序快。

### 场景分层件：护送页中心船坞（2026-09-21 三十一轮，出图前只需读这段）

对标商业游戏主界面拿到的第一条差距是**中心没有"主角物件"**：我们那一块是一张卡车照片（布景），
人家是一座立体船坞，车是**摆在平台上的一个可换零件**（道具）。这两种读法的差别不在画质，在**结构**——
所以这一族的出图口径是"一次出四层、叠成同一个场景"，不是"找一张更大的图"。

| 层（自后往前） | key | 宿主（`.dock` 挂在 `.stage` 上，**不在 `.stage-scene` 里**） | 显示位 |
|---|---|---|---|
| 地面 | `stage/dock_floor` | `.dock .floor` | `left/right 5% · bottom 0 · height 44%` |
| 平台 | `stage/dock_bay` | `.dock .bay` | `left/right 9% · bottom 1% · height 82%` + `drop-shadow` 落地 |
| 载具 | `stage/dock_veh` | `.dock .veh` | `left/right 26% · bottom 30% · height 33%` + `drop-shadow` |
| 前景碎石 | `stage/dock_rubble` | `.dock .rub.l` / `.rub.r` | 同一件用两次，右那枚 `transform: scaleX(-1)` |

四条口径，都是这一轮踩出来的：

1. **一张表出四层，不逐张生**。这四件要叠成同一个世界，逐张生必然漂移——§8 那条"单次生成内部风格
   自洽"的结论在这里比图标族更成立。槽位名只写场景角色（维修坞平台 / 护送卡车 / 维修坞地面 /
   前景建筑碎石堆），另外**必须补一句空间关系**（"地面在最底、平台压上、卡车停在平台里、碎石在最前"），
   否则模型会按四个互不相干的道具画，光向和透视对不上。
2. **一律 `background-size: contain` + 钉在盒子下沿**。这样位置只由 `left/right/bottom/height` 四个数决定，
   永远不会把图拉变形，调构图 = 调四个百分比。用 `cover` 就得为每个宽高比重算裁切。
3. **同一件复用两次换朝向**比出两张图便宜：`.rub.r` 一个 `scaleX(-1)` 就得到左右对称的前景压角。
4. **补一层暖色主光**（`.dock::before` 的 `radial-gradient` 琥珀光）。平台、载具、照片原来各是各的色温，
   叠上去还是"四张贴图"；加一个从下往上的共同光源之后才读成"一个场景"。这条对应差距第 4 条，
   **是 CSS 活不是出图活**——先想光，再想图。

**缺图行为**：四层各是一个空 div，`_tex` 回调不触发就什么都不画，整块自动退回"一张照片"的老样子。
所以这批可以一层一层补，不需要开关。

**下一层的账**：载具现在五章共用 `stage/dock_veh` 一张。章节差异目前靠底图（第 2~5 章已改成读
`STAGES[].backdrop`，第 1 章留护送照片）。已有的 `icons/vehicle_truck|ship|hauler` 三件只有 168×128，
放到船坞里（约 200 CSS px 宽 = 400 设备像素）会糊，**不能拿来当主角件**——要按本节口径另出一张
三列表（三章一车），键走 `stage/dock_veh2` 这类后缀（§10「需要真二态的件整族出双件」同族做法）。



- **底槽 `ui/progress/bar_track`**：横向九宫格条，中间为**内凹暗槽**、两端圆头；源件 512×64。
  切片档按 `tools/measure_nine.py` 量**实际生成件**得：上下描边（含抠像软边）各 10px、左右圆头各 17px
  → `border-image-slice: 10 17 10 17 fill`，`border-image-width: 4px / 7px`（×--pu，按宿主 20~28px 折算）。
  原先照基准图量的 `8 fill` / 2px 对不上这批件——8px 只够盖住软边，圆头会被划进中段拉成长条。
  **过筛结论（2026-09-20 逐条量过，替代此前粗写的「主城 11 条 + HUD 5 条」）**：战斗 HUD 四条天然达标
  （`.xpBar`25 / `.vehTrack`20 / `.bossTrack`28 / `.statBar`20）；主城原本四条只有 3 / 6 / 7 / 8px，
  同轮拍板「单开一轮加粗到能贴图」，抬的是两层 CSS（`--hs` 基准层与 `--pw` 青瓷层）里的同一个 `height`、
  宽度与圆角不动：`.expbar` 顶栏指挥官经验 3→**10px**、`.popRow .pbar` 弹层行进度 7→**12px**、
  `.popAct .bar` 弹层活跃/保底 8→**12px**（两处调用点）；抽卡保底 `.offer-copy .rcBar` 试过 6→12px，
  真机口径下加粗会挤动那张主推卡，同轮拍板**退回 6px 且不贴图**（6px 也配不出内腔）。
  另 `.qBar`/`.biBar`/`.talentBar`/`.prosBar`/`.actBar`/`.starBar` 六条是**死样式**（没有任何代码建这个 DOM），
  `.popBar`/`.bagBar` 名不符实（弹层底部导航栏、背包容器）。
  **12px 属薄条，必须用 `barThin` 档**：`bar` 档的 4px 板边是给 20~28px 条高折算的，
  配到 12px 上只剩 4px 内腔，等于把细线糊成一坨。
- **填充 `ui/progress/bar_fill_green|yellow|blue|red`**：**纯横向可拉伸的色带件**（不带高光边、不带圆头，
  圆头交给 track 与 cap），宽度由 JS 按百分比写；四色语义 = 绿通用/活动、黄体力/活跃、蓝经验/科技、红危险/boss（2026-09-20 调：经验条原本就是青色
  `#4dd0e9`，为不改观感改挂蓝件，绿件回采购单等一个真需要绿的宿主）。
- **端头 `ui/progress/bar_cap`、节点 `ui/progress/bar_node`**：**两键已撤**（2026-09-20）——
  底槽件自带圆头端点，不需要独立 cap；关卡进度的里程碑节点另有 `ui/node_done/next/lock` 三件在用。
- **二级页签图标 `ui/ico/tab_*`**：商城 `.shopTabs`（英雄/装备/宝石/材料）与背包 `.bagTabs`（装备/宝石/材料/道具）
  各给一个图标位（`span.ticon`，20px 方 ×层缩放，`icon` 适配，尺寸写进对应层的 CSS），
  glyph 先占位、贴图到位由 `UiPlate.icon()` 摘掉，缺图仍是 emoji 占位。
  **四套页签不合并**（`.popTabs` 是弹层文字档、另三套是主城图形档，布局职责不同），
  只统一「图标位 + 选中态走 CSS」这一条口径；出图按 `ui/ico/tab_*` 一次成表。
  两条 2026-09-20 落盘时踩到的实情：① 规范里那个「章节 `.chTabs`」宿主**不存在**，样式还在但 DOM 早在
  护送页改版时换成了章节头 + 翻页箭头，所以 `tab_core` 无处可贴；② 背包第四签真名是「道具」不是「耗材/核心」，
  键沿用 `tab_potion`（图是医疗包，读得出耗材）。**页签名与贴图 key 不必同名，但台账必须写清映射**，
  否则下一轮按 key 名去找「核心页签」会白找一次。
- **状态图标族 `icons/status_*`**：**本轮判定延后**——战斗内 buff/debuff 目前是画布/文字表现
  （`ui/HUD.ts` Graphics 与飘字），没有可贴的 DOM 图形位，出图会白出。等战斗 HUD 图形化那一轮再定宿主；
  在此之前它们只是 `RESERVED_SLOTS` 里的挂名项，不排产。

| 评价星 2 件 + 天赋节点 3 件 | 星：**怪物图鉴详情**的「威胁等级」行（`HomeUiMall._starRow`，由 `HomeUiPlay` 的图鉴详情调用）——原来是一串 `'★'.repeat(n)` 文本。节点：天赋图 `_popGrid` 的 `<i>` 格（`HomeUiHeroes.ts:128` 传 `tex`），三态分别指 未解锁 → `ui/node_lock`、点满 → `ui/node_done`、可点 → `ui/node_next` | `ui/star_on` `ui/star_off` `ui/node_done` `ui/node_next` `ui/node_lock`（五件全部落盘接线） | 星 26px×--pu（弹层档，两层共用一条 `--pu`）；节点格实测 80×80 | 星 `icon`（整颗替换，glyph 摘掉）；节点 `icon({ keepGlyph: true })`（节点自己的 emoji 要留在环心） | — | 1（亮/空、三态都是**整族出多件**，不是 CSS 派生态——见 §10 最后一行） | ✅ r17b 一张 5列1行表出齐，`--dilate 2` 才拆得开（默认 6 会把相邻两星并成一件）。**无头取景已目击两处宿主**：图鉴详情五颗星 `bg=Y`、宽 36px，第 1 颗金、后 4 颗灰金属；天赋图十个节点格 `bg=Y`、80×80，emoji 仍在环心（截图 `gen-output/smoke_step3d/08-talent-nodes.png`、`09-bestiary-stars.png`）。⚠ 英雄页「升星」弹窗的星级副标（`HomeUiHeroes.ts` 里 `subtitle: '★'.repeat(st) + '☆'.repeat(...)`）**仍没接**：那是传给 `_openPop` 的**字符串**，弹层横幅内部按文本渲染，要接得先给 `PopOpts` 开一个副标贴图槽（改 Core，而 Core 只剩 1 行余量）。同页卡面副标那处（`def.role · ★★`）已在下一轮由 `_starInline` 接上 |
| 模块小框底板 1 件（**死方法里的引用不算宿主**） | `.mbox.frame` 两处（`HomeUiCore` 的 `_openSheet` / `_openResult`）——**两个方法零调用点** | `ui/panel/panel_mini` | 无（没有活宿主可量） | — | — | 1 | ⛔ 图合格（r16 表：金属包边 + 四角铆钉 + 平整内芯，切片件在 `art-spec/reference/stock/panel/`）但**不落盘**。这一条是本轮差点犯的错：`.mbox` 看着是活的 CSS 类（还有 giftBox/questBox/lbBox/setBox 一堆变体），实际全工程只有那两个方法建它，而它们是「全部二级界面已迁新弹层」那条迁移棘轮的桩子——`check-ux-refactor` 断言调用点必须为 0，`check-ux-layout-bundle` 又断言方法还在包里，删不得也用不上。**在这两处加一行 `nineSlice`，`check-art-manifest` 的「在库件必须有归宿」照样绿灯**，图却永远上不了屏。判据补一条：核宿主先核「谁调用这个建点」，不是「哪里提到这个 key / 哪里有这条 CSS」；`.mbox/mHead/mClose/mSub/mRow` 整族列入死样式清扫那一轮 |
| 章节载具 3 件 | **护送页章节头左端那一枚**（`HomeUiStage` 章节头 `.chVeh`，`CHAPTER_THEMES[].veh` 字形 → `UiPlate.VEHICLE_TEX` 对 key，逐章换图） | `icons/vehicle_truck` `icons/vehicle_ship` `icons/vehicle_hauler`（三件全部落盘接线） | 深色层 76px×--hs；青瓷层 28px×--pw（章头条只有 45px 高，h1 23 + small 13 已占 36） | `icon()` 整颗替换：emoji 先占位、图到位摘字 | — | 1（一章一件，不是同一件的多种态） | ✅ r26 一张 4列1行表（第 4 格是英雄碎片）。**为什么不贴场景里那块 `.veh`**：浅色（手机）主题把 `.stage-scene > .veh` 连同 road/dash/mobs 一起 `display:none`（护送页手机版改用 escort.png 实景照片），贴上去在真机上永远看不见——这一枚反而是手机上唯一看得见载具的位置。字形对 key 而不是章节序号对 key：章节→载具的映射只有 `CHAPTER_THEMES` 一处真源，再抄一份序号表就有两处 |
| 资源·英雄碎片 1 件 | **升星弹窗的碎片说明行**（`HomeUiHeroes` 升星弹窗 `_popAttr({ icon: '🔩', iconTex: 'ui/res/res_frag' })`） | `ui/res/res_frag` | `.popAttr .ai` 34px×--pu（沿用该槽既有尺寸，不新开档） | `icon()` 摘字，缺图回退 🔩 | — | 1 | ✅ 同 r26 表第 4 格。顶栏那三个胶囊位（`.reswrap` 写死 `1fr 1fr 1.15fr`）**不给碎片**：碎片是四英雄各自的库存（`shard_rifle/sniper/laser/radiation`），不是可加总的单一货币，摆一个总数进顶栏等于骗人。**同批另三件（`res_medal`/`res_energy`/`res_ticket`）整批不出图**：本作资源表只有 gold/diamond/stamina + shard_*，勋章没有成就/军团玩法，能量与体力同位重复，招募券的「每日免费一次」是额度不是库存——挂上顶栏就是三个恒为 0 的假数字，按「无死键」红线不排产 |
| 战斗 UI 件 3 件（读数牌底 / 技能槽底托 / 首领徽） | 读数牌：HUD 右上 `.chip.waveChip` 与 `.chip.killChip` **两枚共用**（最小宽 122px，正中叠「波次 3/10」「击杀 221」，波次那枚底下还挂本波词缀徽标行）——只给其中一块换牌会读成"没做完"。⚠ key 名带 `wave` 是登记时写窄了，实际吃两枚 chip，映射按 `tab_potion` 那条口径记在这里；底托：画布层 `AbilityBar` 每个技能图标背后一枚；首领徽：BOSS 血条上方 `.bossName` 前那枚 👑 | `ui/plate_wave` `ui/skill_slot` `ui/boss_crown`（三件全部落盘接线） | 波次牌 border-image 14px×--pu；底托 112×112 设计像素（图标 92 + 四角各露 10）；徽 30px×--s | 波次牌 `nineSlice(el,'chip')`；底托是 `Sprite`（画布件，见下）；徽 `icon()` 摘字 | `chip` = slice `18% 12%` **百分比档**（横长件用像素档会把包边划进中段拉 smear，同 D19 那条教训的另一面） | 1 | ✅ r27 一张 3列1行表出齐，`--dilate 2` 才切得开（同 r26：横长件之间只剩几十像素间隙，默认膨胀 6 把整表并成一件）。**这是「正中是一整块平整空白的牌面，不要镂空、不要挖洞」那句改写的第二次验证**——r22 那张表原话写「正中留出干净的空位」，被模型做成三个镂空洞、整表作废。⚠ 技能底托是本轮第一件**画布层**贴图：`AbilityBar` 原来全靠 `Graphics` 画底，现按内芯图标同一套「美术就绪即应用一次」探测挂 `Sprite`，缺图整节点不启用，冷却遮罩与充能环的半径口径一律没动 |
| 战斗表现件 4 件（狙击弹 / 辐射弹 / 丧犬走帧 / 车尾受损态） | 弹体：`HeroCombat` 出弹时带 `visualKey`，`Bullet._applyVisualAsset` 取图（缺图回退 `Graphics` 画的程序化弹体）；走帧：`Enemy._tryApplyArt` **优先**取序列帧、取不到才用静态立绘；受损态：`Vehicle._syncDamageArt` 在耐久 ≤25% 时与完好态互换 | `weapons/sniper_bullet` `weapons/radiation_bullet` `monsters/dog_walk` `scenes/vehicle_tail_damaged` | 弹体高度 ≈ 碰撞半径 ×3.6（宽按贴图比例、下限 0.42 倍高）；狗一帧 305×455；车尾整条 2048×512 | 弹体与狗是**画布 Sprite**（不走 `UiPlate.icon`）；车尾只换 `spriteFrame`、尺寸算法一行不动 | — | 2（车尾是 D2 早就点名"只有语义真两态才出双件"的那一例：完好 ↔ 受损） | ✅ r28（弹道，`--tol 95`——辐射弹的酸绿 bulletColor 是 `(178,255,89)`，g-r=77 会被默认容差 60 当背景抠掉，同 r19 绿宝石那个坑）+ r29（丧犬 6 帧，**品红底** `#FF00FF`，走 `slice_walk_sheet.py` 那条既有管线）+ r30（车尾受损，图生图自 `scenes/vehicle_tail.jpg`）。⚠ 生图接口不接受 4:1（上限 3:1），所以受损态出 2048×1024 再用新工具 `tools/crop_letterbox.py` 按内容外接框裁回 4:1——**两态比例必须一致，否则换图时车尾会跳一下**。⚠ 丧犬是 6 帧，`ANIM_FRAME_COUNT` 里 walk 的默认值就是 6，所以零代码改动；**将来重出 12 帧必须补 `'dog:walk': 12` 那一行**，否则会把 12 帧当 6 帧切、每帧里叠两个半角色 |
| 关卡主题背景 4 件（按章换底图） | `BattleManager._applyRoadArt`（原先硬取 `scenes/road`、逐帧重试直到取到图） | `scenes/bg_bridge`（2 跨海大桥）`scenes/bg_ruins`（3 雨夜废墟）`scenes/bg_steel`（4 炼钢厂）`scenes/bg_gorge`（5 尸潮深谷）。第 1 关「末日公路」仍走 `scenes/road`，**故意不登记**：它的地名就是那张图，登记两遍会有两处真源 | 720×1280，与 `road.jpg` 同比例同宽（`tools/land_bg.py` 负责裁对齐 + 压 JPG，四张各 180~209KB，对齐 road 的 266KB 口径） | 消费点在**关卡表**不在 UI：`StageInfo.backdrop?: string`（`battle/StageData.ts`）按关登记，`_applyRoadArt` 按 `stageInfo(_stageId).backdrop` 取图、取不到回退 road。回退这条必须留——本方法只认本关 key 的话，图缺失会让整局永远没有背景 | — | 1 | ✅ 2026-09-21 建码 + 出图 + 落盘。**这一条把旧账上"9 件"里最大的一坨清了，顺带改了键名**：旧名 `bg_forest/bg_beach/bg_snow/bg_cave` 是当初按通用地形词粗登记的，跟五关真名（末日公路/跨海大桥/雨夜废墟/炼钢厂/尸潮深谷）只有两张对得上，照旧名出图会有两张永远没人读；这四个键从来没有文件、也从来没有代码引用，改名零代价。**出图口径**：正俯视机位、道路纵向居中且占宽约六成、双黄线居中白虚线分道、**上下两端不许有横向通栏大特征**（这张图要上下镜像循环滚动），四张各自以 `scenes/road.jpg` 做图生图锁同一质感。**自测**：新工具 `tools/battle_probe.mjs` 按关写补丁档进战斗（`load()` 每字段都是 `?? 默认`，所以只写 `stageCleared/currentStage/res` 就够；体力必须一起补，写补丁档就等于老档），五关各拍一张 + 一行 `[Art] 关卡底图生效` 诊断 |
| 战斗表现件余 5 件（特效 4 / 激光束）——**当初缺的不是图，是表现代码** | 消费点 2026-09-21 逐条建起来：激光束 = `HeroCombat._drawBeamArt`（叠在 `drawBeam` 那三层程序化束之上，同 `Bullet._applyVisualAsset` 的"只加不减"口径）；金币爆开 = DomHud 通关结算第三枚芯片里的 `.clBurst`；升级光柱 = `LevelUpPanel` 排在选卡三张前面的 `Glow` 节点；暴击底纹 = `DamageNumber._syncBackdrop`（飘字节点的**前一个兄弟**）；传送门 = `BattleManager._spawnPortal` | `fx/coin_burst` `levelup_glow` `portal` `dmg_word`、`weapons/laser_beam`（五件全部落盘接线，键已移出 `RESERVED_SLOTS`） | 光束高 = 束宽 ×3（下限 16）、长 = 起点到目标的实际距离；爆开 340px×--s（`aspect-ratio: 644/378`）；光柱高 = 设计高、宽按贴图比例（133×912）；底纹高 = 字号 ×92/100；门高 = 怪半径 ×4.2 | 五件都是**画布 Sprite 或 DOM 背景图**，不走 `UiPlate.nineSlice`（都不是板件）；DOM 那件的颜色走 `--c-gold-bright` 已有 token，没新增色值 | — | 1 | ✅ **顺序按这张账本走对了：先写表现代码、再出图**（旧账上写的正是"先出图只会得到五个躺在包里没人引用的文件"）。图是 r34/r34b 两张表出的，代码同轮建。**四条踩到的坑记下来，下一批特效件直接照做**：① 画布件的层级——Cocos 的 UI 里**父节点自身的组件先画、子节点后画**，所以飘字底纹和升级光柱都不能挂在宿主节点自己身上，必须是排在前面的兄弟/子节点，挂上去会盖住字；② `UIOpacity` **不跨节点级联**，飘字那三层（父 + 底纹 + 字）各挂一个、一起淡，回池只挂一层否则一次淡出还三次；③ **亮度上限是读字决定的不是好看决定的**——光柱 opacity 封顶 150（再亮把三张卡上的技能名洗白）、门 230（门芯纯黑，满不透明会糊掉刚缩放出 0.2 的怪）；④ **不是每个落点都该放**：传送门只给侧翼切入那 30%（那是"钻出来"），顶部下压那 70% 不放（放了读成 bug）；金币爆开只给通关结算，失败面不放（掉金币时爆金币是反话）。**缺图一律逐条回退**：光束少一层贴图、爆开是一个空 `i`、光柱/底纹/门整节点不启用，程序化那套照旧在画，不会出现占位方块。自测见 `tools/battle_probe.mjs`（画布件在 DOM 里读不到，靠 `[Art]` 诊断行 + 取景） |
| 角标与徽章 5 件（判形不判在不在） | 无（宿主全在，但形状放不下） | `ui/lvtag` `ui/tag_free` `ui/tag_sale` `ui/tag_hot` `ui/badge/power_badge` | 实测：`.lvtag` 21~34×13~18px、`.good .gHot` 字号 9px（约 20×12）、`.gHot`（商城主推）60×36 的 99px 圆角胶囊、`.powerBadge` 27px 高整宽胶囊、`.gTagTop` 只有 CSS 无建点 | — | — | — | ✗ **r25 表五件全部合格（平整牌面、无镂空）但一件都不落盘**，切片件归档 `art-spec/reference/stock/badge/`、键留采购单。**踩的坑是新的**：出图前只核了「宿主在不在、尺寸够不够」，没核「宿主是什么轮廓」——出出来的五件是方形/六角/星芒的**徽章**，宿主是又扁又窄的**角标**与整宽**胶囊**，硬贴要么把徽章压成饼、要么盖住文字。**补一条判据：出图前除了量尺寸，还要写下宿主的形状（扁条/圆角胶囊/方格/整宽），徽章形只能对徽章位，角标形只能对角标位**（同 D19 的教训换了个维度） |

### 采购单宿主全量核实（2026-09-21，出图前必查这张表）

起因：用户要求「别再一族一族磨，把剩下的美术一次全出完」。动手前逐族核宿主，结论是
**`RESERVED_SLOTS` 上剩的 43 个键里，31 个根本没有宿主**——规范/采购单里那句用途说明
是当初登记时写的，从没验过建 DOM 的代码在不在。`.chTabs` 与 `.lbRank` 不是两个偶发，
是这批声明的常态。**判据：一条宿主声明必须能指到「哪一行代码创建了这个元素」，
只有一条 CSS 规则不算。**

> ⚠ 这张表是**出图前那一次的快照**（2026-09-21 上午）。之后 Step1~Step4 按类别整批进版，
> 已经翻掉其中若干条——每行末尾的「已翻案」注记就是它现在的实况，**读这张表要连着注记一起读**，
> 否则会照着一份过期判决再核一遍宿主。

| 判决 | 件数 | 键 | 依据（代码位置） |
|---|---|---|---|
| ✅ **有活宿主，可出图可进版** | 10 | `ui/panel/row_card`（`.good.panel` `HomeUiMall.ts:303` + `.mailRow.panel` `DomHud.ts:570`）、`ui/panel/panel_mini`（`.mbox` `HomeUiCore.ts:394/435`）、`ui/plate_wave`（`.chip.waveChip` `DomHud.ts:1019`，最小宽 122px、上面叠「波次 3/10」文字）、`ui/badge/power_badge`（`.powerBadge` `HomeUiHeroes.ts:569`，高 27px、叠「战力 12,345」）、`ui/lvtag`（`.lvtag` `HomeUiCore.ts:1303`，实测仅 ≈21×13px）、`ui/tag_hot`（`.gHot` `HomeUiMall.ts:306`，叠「HOT」）、`icons/mat_stone/alloy/core` + `icons/gem_fire/wind/ice/thunder`（背包 `.bcell` `HomeUiHeroes.ts:823` 与商城 `.gIc` `HomeUiMall.ts:311`，格子 110~124px——**但这两处现在只写 emoji、没有贴图槽，要先加 `iconTex` 才能进版**） | 建 DOM 的代码在，尺寸够。**已翻案（Step2/材料宝石批）**：`.bcell`/`.gIc` 两处各加了贴图槽，七件已上屏。**反向翻案（Step5）**：同一行列的 `ui/panel/panel_mini` 其实没有活宿主（两个建点零调用，见本节末「模块小框底板」行），`ui/lvtag`/`ui/tag_hot`/`ui/badge/power_badge` 三件是**形状**放不下而不是没宿主（见「角标与徽章」行）——"有活宿主"这一档当初也漏了量形与量调用点这两道 |
| ⚠ **宿主在，但要改结构才能贴** | 5 | `ui/node_done/next/lock`（真节点是 `_popGrid` 的 `<i>` 格 `HomeUiCore.ts:968`，**`_popGrid` 没有 `iconTex` 参数**；`.talentNode` 那套 CSS 是死样式）、`ui/star_on/off`（星级全是文本：`'★'.repeat()` `HomeUiHeroes.ts:560`、`HomeUiPlay.ts:948`，没有可挂图的元素）、`ui/boss_crown`（`.bossName` 是 `👑 名字` 一行文本 `DomHud.ts:206`，皇冠是随文 emoji 前缀） | 要么先拆出元素，要么按「随文小符号不出图」判死。**已翻案（Step3）**：`_popGrid` 加了 `tex` 槽、星级拆成 `_starRow`/`_starInline` 两种元素宿主，节点三件 + 星两件全部上屏；`boss_crown` 仍按随文符号判死 |
| ⛔ **无宿主：功能不存在** | 10 | `icons/status_shield/sword/heart/skull/fire/ice/bolt/poison/lock/search`（战斗内 buff 全是 Cocos `Graphics`+`Label`，`ui/HUD.ts` 与 `DomHud.ts` 里 grep `buff` 零命中）、`ui/skill_slot`（技能键是 `AbilityBar.ts` 的画布节点，92×92，不是 DOM） | 等战斗 HUD 图形化那一轮，先开图形位再出图 |
| ⛔ **无宿主：界面没有这个入口** | 8 | `ui/res/res_frag`（碎片只在英雄页以文本 `🔩 碎片 N` 出现 `HomeUiHeroes.ts:272`；顶栏 `mkRes` 只调 3 次、`.reswrap` 硬写 3 列）、`ui/res/res_medal/res_energy/res_ticket`（这三个资源 id 除 `AssetLib.ts` 外全工程不存在）、`ui/ico/ico_friend/undo/search`（无好友系统、无检索位，现有 `↩` 两处都是返回键）、`ui/ico/ico_empty`（`_popEmpty` 15 个调用点全部显式传图，默认分支不可达） | 先做功能，再谈图。**已翻案（Step2 / Step4）**：`ico_search`→背包检索框、`ico_friend`→行动页页脚入口、`ico_empty`→`_popEmpty` 默认件，三处落点是那两轮建出来的；`ui/res/res_frag` 接了升星弹窗的碎片说明行。**仍不做的**：`ico_undo`（全工程没有可撤销动作）、`res_medal`/`res_energy`/`res_ticket`（本作没有这三种资源，挂上顶栏就是三个恒为 0 的假数字）——这两类造出来就是死键，不做 |
| ⛔ **无宿主：同位重复或位置是死的** | 8 | `ui/button/btn_purple`（`PLATE.purple` 有映射 `UiPlate.ts:164`，但 `PopCta.kind` 的取值域里根本没有 `purple`，零调用点）、`btn_help`（帮助 `?` 已由 `btn_round2` 接在 `.popMeta .q` 上）、`btn_home`/`btn_refresh`（全工程没有 ↻/⌂ 这类键）、`ui/tag_free/sale`（`.gTagTop` 只在 CSS `:156/:1806`，无建点）、`icons/vehicle_truck/ship/hauler`（`StageInfo` 没有载具字段，护送页的场景是 CSS 渐变 + 伪元素山/日） | 建议撤键（撤法见上面「有些槽位不该出图」）。**已翻案（Step4）**：`icons/vehicle_truck/ship/hauler` 三件没撤、已上屏——载具信息本来就在 `CHAPTER_THEMES[].veh` 的字形里（🚚/🚢/🚛），只是护送页改版后手机上看不见任何一处载具，所以宿主开在章节头而不是场景里。`.gTagTop` 那两件仍是死样式，五件徽章按形状判不贴（见上面「角标与徽章 5 件」行） |

**新查出的死样式块**（与 `.chTabs`/`.lbRank` 同族，留给死样式清扫那一轮）：
`.mRow`、`.questRow`、`.gTagTop`、`.talentNode` 及其 `.tbNodes/.talentBranch/.talentDetail/.tnIc/.tnLv`、`.star`。

**这一轮的实际产出边界**：能真正「进版」的只有 10 件（其中 7 件还要先加贴图槽），
5 件要先改 DOM 结构，26 件是「先有界面才有图」。所以「一次全出完」这件事
**不是慢在生成，是慢在那 26 个键对应的界面还没做**。

`check-art-manifest` 的「在库件必须有归宿」断言就是冲这张表去的：每张在库图要么被代码引用，
要么在这里有一句说法（接谁的宿主、为什么还没接）。**下一轮要么接线、要么整族删，不留第三种状态。**

| key | 原意 | 为什么还没接 | 建议 |
|---|---|---|---|
| — | — | 2026-09-21 分类迁移后本表清空：原先记在这里的 12 件（铜/银/金头像框、段位徽章七档、`ico_achieve`、`ico_lock`）已按「在库无宿主 → 移出包」处理，见下 | — |

> **在库无归宿件的处置已执行**（2026-09-21 拍板「在用的留下、没在用的移出包」）：
> `ui/frame_bronze` `ui/frame_silver` `ui/frame_gold` → `art-spec/reference/stock/frame/`；
> `ui/rank1`…`ui/rank7` → `art-spec/reference/stock/rank/`；
> `ui/ico_achieve` `ui/ico_lock` → `art-spec/reference/stock/ico/`。
> 移出后不再登记 MANIFEST、不再进包，复活方法见 `art-spec/reference/stock/README.md`。
> 本表重新回到「空表」——今后再有在库件接不上宿主，就记回这张表，别让它继续占包。

## 10. 态策略（一族一件，不为每态出图）

| 态 | 做法 | 谁负责 |
|---|---|---|
| 按钮禁用 | 同板照贴 + CSS `filter: grayscale(.6) brightness(.92)` + `opacity:.5`（`.popBtn.disabled`） | CSS，美术不出灰板 |
| 页签/卡片选中 | 同件 + `transform: scale(1.1)` + 选中底色/内阴影（`.tab.on` / `.popTabs .on`） | CSS，不出 `nav_*_on` 二态图 |
| 按压反馈 | `active` 位移 1px / 亮度提升 | CSS |
| 红点、倒计时角标 | 保持 CSS 圆点（`.questRed`） | 不出图；要出图先在本表登记宿主 |
| 需要真二态的件（如载具完好/受损两态） | **整族出双件**，key 加后缀（`scenes/vehicle_tail` + `scenes/vehicle_tail_damaged`） | 美术出图 + MANIFEST 登记 |

**推论**：新增一类通用件时，先答三问再开工——① 宿主 CSS class 是哪个？② 单态还是整族双态？
③ 切片走 `panel`/`plate` 哪一档？三问答完再写进本表与 `UiPlate`，否则接线与出图必然返工。
