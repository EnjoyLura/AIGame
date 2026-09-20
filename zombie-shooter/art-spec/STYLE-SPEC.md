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
| 列表行卡底板 | 商城货卡 `.good.panel`（`HomeUiMall.ts:304` 普通货卡 + `:496` 广告卡两处）｜战斗 HUD 邮件行 `.mailRow.panel`（`DomHud.ts:570`） | `ui/panel/row_card` | 卡片最小高 115px×--pu；HUD 那层 `--pu` 就是 `--s` | `nineSlice(el,'card')` | `card` = slice `24 fill` / width 12px×--pu | 1 | ✅ r16 表出图（两件焊死在一起，`--dilate 2` 才切得开）。**稀有度色标在内层 `.gIc` 的边框上、不在卡片本身**，所以贴板只吃掉卡片自己的中性边，不抢品质色。同批的 `panel_mini` **没落盘**：宿主 `.mbox` 带 `frame` 类、有 ::before/::after 装饰伪元素，板贴上去跟它们打架，先留采购单等口径定下来。`skillCard.panel` 也带 `frame`，同样跳过 |
| 弹层底板 S | `.pop.S` | `ui/panel/panel_sub` | 同上 | border-image | `panel` | 1 | ✅ 已接 |
| 大按钮（CTA/登录 START） | `.popBtn` / `.lgStart` | 见下方按钮语义行 | 板框 10px | border-image | `plate` = slice `16 fill` / 10px×--pu（登录 `platePw` 按 --pw） | 1（态由 CSS 派生，见 §10） | ✅ 已接 |
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
| 主城按钮族（按类别整族铺，不再一处处手工接） | 主 CTA `.game-button`（开始护送 / 十连 / 单抽 / 立即查看 / 难度小键）｜侧栏与入口 `.hot`（招募 / 工坊 / 合成 / 每日免费 / 限时特惠 / 值班卡 / 里程碑 / 编队，约 10 处）｜编队行 `.hpick`（4 行）｜商城购买小键 `.btn.gBuy`｜难度段 `.diffSeg`（三档）｜编队号位 `.squadEntry`（四格） | 主 CTA 复用 `PLATE`：`.major` → `ui/button/btn_play`、普通 → `ui/button/btn_cancel`、带 `.purple` → `ui/button/btn_purple`；新增三档 `ui/button/btn_side`（侧栏）、`ui/button/btn_row`（编队行）、`ui/button/btn_small`（小键）；派生态走同族两条选择器指到不同语义板（`.diffSeg.on` → 金、`.diffSeg` → 蓝；`.squadEntry.on` → `btn_confirm`、其余 → `btn_cancel`），不为每个态出二态图（§10） | 普查实测：主 CTA 203×47 与 307×72、`.hot` 61×50~169×83、`.hpick` 127×47、`.gBuy` 151×37、`.diffSeg` 103×42、`.squadEntry` 40×39（均 ×层缩放） | `nineSlice`，切片一律 `btn` 档 = `24 fill`，显示宽度两档：`btn` 12px（≥47px 高的面）/ `btnSm` 7px（37~42px 高的面与 40px 方格） | `btn` / `btnSm` | 1（禁用态同板 + CSS filter，见 §10） | ✅ r24 一张 4列2行表出齐 8 块板（同族异色、中央全部平整无镂空——上一轮「留出空位」被读成「挖洞」的措辞已改）。**根因**：全工程原来只有 1 个手工铺板调用点（解锁大键），`.game-button` 这一族最大的 CTA 从来没做过板，所以界面看着"美术没进版"。现由 `UiPlate.CITY_BUTTON_PLATE`（选择器 → key + 档，顺序即优先级，`key: null` = 显式跳过）在 `_switchPage` 尾部整族扫一遍，扫描用的选择器直接由本表拼出，加一档不用再改代码。紫色档 `btn_purple` 的 `PLATE.purple` 映射原来零调用点，本轮由礼包 CTA「立即查看」挂上 `.purple` 才真正用上。**三处实测跳过**：① `.game-button.sm`（里程碑「领取」46×22）比板厚四倍还小，贴上去整块糊掉；② 英雄养成五入 `.btn.blue.hot`（61×61）板只盖住中段一条——那五键的图标行高 + 文案比盒高还长，⚡ 与「技能」两行露在板外，**要先改 CSS（加高或压行高）再接图**；③ 章节翻页 `.arrow` 压在关卡实景照片上，照片本身是深色金属调，板子上去等于把箭头融进背景 |
| 进度条（底槽 / 填充） | **实测宿主 7 条**：HUD 四条 `.xpBar`（25px，底槽+蓝填充）、`.vehTrack`（20px，只贴底槽）、`.bossTrack`（28px，底槽+红填充）、`.statBar`（20px，只贴底槽）；主城三条同轮加粗后接入——`.expbar` 顶栏指挥官经验（10px，底槽+蓝）、`.popRow .pbar` 弹层行进度（12px，底槽+绿）、`.popAct .bar` 弹层活跃/保底（12px，底槽+黄，两处调用点）；抽卡保底条 `.offer-copy .rcBar` **退回 6px 不贴**（加粗会挤动那张主推卡，6px 也配不出内腔）。另 `.qBar/.biBar/.talentBar/.prosBar/.actBar/.starBar` 六条是**死样式**（全工程无一处建 DOM），`.popBar`/`.bagBar` 名不符（弹层底栏与背包容器，不是进度条） | `ui/progress/bar_track` `ui/progress/bar_fill_blue` `ui/progress/bar_fill_red` `ui/progress/bar_fill_green` `ui/progress/bar_fill_yellow`（五件全部落盘接线） | 底槽条高 12~28px；填充件横向拉伸、宽度仍由 JS 写 % | 底槽 HUD 四条 `nineSlice(el,'bar')`、主城四条 `nineSlice(el,'barThin')`，填充一律 `strip`；两条不贴图的理由：`.vehicleFill` 的色是 `.warn/.danger` 三态由 CSS 类切（内联贴图会吃掉三态，**2026-09-20 拍板不换**），`.statBarFill` 的色由 JS 按英雄身份色内联写（`DomHud.ts:894`） | `bar` / `barThin`（✅ 2026-09-20 按 `tools/measure_nine.py` 实测改档：切片同为 `10 17 10 17 fill`，显示宽度随宿主条高折算——20~28px 用 4px 与 7px、10~16px 用 2px 与 4px，均 ×--pu） | 1 | ✅ 底槽八条 + 四色填充全部接线；HUD 层补 `--pu: var(--s,1)` 令牌（同 D10b 的口径），否则板厚不随 HUD 缩放。⚠ 经验条原色是青 `#4dd0e9`，同轮拍板**沿用蓝**：族内四色只是出图侧的归类，落到具体宿主要让位于「换图不换观感」 |
| 二级页签图标 | **实测 7 个位置、5 个键**：商城 `.shopTabs` 四签（英雄/装备/宝石/材料）+ 背包 `.bagTabs` 四签（装备/宝石/材料/道具），其中装备/宝石/材料三签两处共用同一件。规范原先写的第三个宿主 `.chTabs`（章节页签）是**死样式**——护送页早已改成「章节头 + 场景内侧左右翻页箭头」（`HomeUiStage.ts:68` 的注释就写着「替代原五章页签」），全工程无一处建这个 DOM | `ui/ico/tab_hero` `ui/ico/tab_equip` `ui/ico/tab_gem` `ui/ico/tab_mat` `ui/ico/tab_potion`（五件落盘接线） | 图标 20px×--hs ｜ 20px×--pw。两套页签都并进了 34~56 高的 `.flat-tabs` 条带、文字只有 12 号，图标取 20 才能与文字并排且不撑高行（原先粗写的「20~34px」是照 `.hot .ic` 抄的，那个位置有 56 高） | `icon`（contain；尺寸一律归 CSS 两层） | — | 1（选中态走 CSS，见 §10） | ✅ r13 一张表出齐 6 格，棋盘底目检 6/6 无抠穿、无绿边、无邻居碎件并入，5 件落盘。⚠ **`tab_core` 图合格但没有这个页签**：背包第四签的真名是「道具」（`item` 分类 = 非装备/宝石/材料的消耗品，贴图沿用 `tab_potion`，医疗包读得出「耗材」），武器核心只是养成弹窗里的一行、不是页签，硬套 `tab_` 键等于给同一个位置挂两套语义 —— 键留在采购单，切片件归档在 `art-spec/reference/stock/ico/tab_core.png` 不落盘（2026-09-20 拍板「核心页签功能我后面做」：`MANIFEST` 与本表那行都不删，界面建好当天拷回 `assets/resources/textures/ui/ico/` 再删 `RESERVED_SLOTS` 一行即生效） |
| 功能图标·第一批 12 件 | 侧栏 `.side-tools .hot .ic`（签到/试炼/无尽）｜英雄页 `.hero-quick .btn .ic`（核心/武器/升星/天赋）+ `.hero-tools .hot .ic`（招募/工坊，两处：页头与背包行）｜顶栏 `.res .add`（加号）｜确认弹窗 `.popIcBig`（删除/警告） | `ui/ico/ico_signin` `ui/ico/ico_trial` `ui/ico/ico_endless` `ui/ico/ico_core` `ui/ico/ico_weapon` `ui/ico/ico_starup` `ui/ico/ico_talent` `ui/ico/ico_recruit` `ui/ico/ico_forge` `ui/ico/ico_add` `ui/ico/ico_del` `ui/ico/ico_warn` | 侧栏与英雄页 23~26px、顶栏加号 14px、弹窗大图标 62px（各 ×层缩放） | `icon`（contain；尺寸一律归 CSS 两层） | — | 1 | ✅ 图标第一批落盘接线（2026-09-20）。⚠ 英雄页「技能」键按「除技能外不换」保留 emoji，但已一并包进 `.ic` span 以对齐字号。**2026-09-21 追撤 `ui/ico/ico_skill` 键**：技能这一族用户明令不换图，那这个键永远不会有人填，留在 MANIFEST 里就是一条永远缺文件的空槽（预载白发请求、对账永久挂账），已从 `MANIFEST` 与 `RESERVED_SLOTS` 双双删除 |
| 功能图标·第二批 4 件 | 商城主推「看广告」键 `.offer-buttons .hot.rcAd .ic`（播放三角）｜设置弹窗音量行 `.popAttr .ai`（滑杆）｜战斗 HUD 左上两键 `.hudBtn.pauseBtn .ic` `.hudBtn.statsBtn .ic` | `ui/ico/ico_ad` `ui/ico/ico_slider` `ui/ico/ico_pause` `ui/ico/ico_stats` | rcAd 23px、`.ai` 34px、HUD 键内 56px（均 ×层缩放） | `icon`（HUD 两键的图挂**内层 `.ic`**：`.hudBtn` 的底是 CSS 渐变板面，图直接压在按钮上会连板面一起换掉） | — | 1 | ✅ 图标第二批落盘接线（2026-09-20）。⚠ HUD 两键首版接成「一次性取 URL」（照本文件邮件行旧例），实测**根本没上图**——DomHud 在场景加载时就建整棵 DOM，那会儿预载还没回来，返回 null 就永久留 glyph；现改走 `DomHud._tex` 挂起队列、`update(dt)` 里排空，见 ART-PLAN D20 |
| 功能图标·第三批 3 件 | 主城设置弹窗音效行 `.popAttr .ai`（按静音态在 喇叭/喇叭叉 之间换图）｜战斗页设置浮窗三个小节头 `.bSetHead .ic`（音效 / 关于 / 危险操作，第三处复用第一批的 `ico_warn`） | `ui/ico/ico_sound` `ui/ico/ico_mute` `ui/ico/ico_info` | `.ai` 34px、`.bSetHead .ic` 30px（×--s） | `icon` | — | 1 | ✅ 拆行接线轮（2026-09-20）。两条新机制：`PopAttrOpts.iconTex`（glyph 先占位、图到位由 `icon()` 摘掉，缺图不空槽）与 `DomHud._iconIc(el, glyph, key?)` + `mkHead(icon, text, tex?)`；`.bSetHead` 改 flex 让图标与标题同行居中。音效行随 `_popRebuild` 在静音/开启两态间换 key，这是「状态换图」而不是「状态显隐」，所以不受 §9 小状态符禁令约束 |
| 功能图标·空态与检索 3 件 | `_popEmpty` 的**默认件**（15 个调用点里不传 icon 的那些，本轮把「背包中该部位没有其他件」一条改走默认）｜背包头行检索框 `.uiSearch i`（`HomeUiMall._searchBox`）｜行动页页脚第四快捷 `.hot`（👥好友） | `ui/ico/ico_empty` `ui/ico/ico_search` `ui/ico/ico_friend`（三件落盘接线） | `.ei` 弹层空态位、`.uiSearch i` 14px、页脚 `.ic` 34px（×层缩放） | `icon`（contain；尺寸一律归 CSS 两层） | — | 1 | ✅ r23 一张 4列1行表出齐 4 格，目检 4/4 合格、三件落盘。**这一轮按用户新令改口径**：原来判「没有功能位就不出图」，现在改成「**没有落点就把落点建出来**」——search 是本轮新建的背包按名字检索（四个页签共用，整页重建后把焦点放回输入框末尾），friend 是本轮新建的行动页页脚入口（社交系统还没做，但弹窗有说明、有「去看排行榜」的出路，不是静默死键）。`ico_empty` 的默认值同时改了：原来传贴图 key 时 glyph 直接置空，预载没回来那一刻是个空槽，现改成先摆占位字形、图到位由 `icon()` 摘掉（同 `_popAttr.iconTex` 口径） |
| 功能图标·撤销 1 件 | 无（本轮判据见状态列） | `ui/ico/ico_undo` | 同上口径 | `icon` | — | 1 | ✗ 图合格但**不落盘**（切片件在 `art-spec/reference/stock/ico/ico_undo.png`，键留采购单）：全工程没有一个可撤销的动作——现有的 `↩`/`←` 是弹层二级页的**返回**键（`HomeUiCore._popBar`），语义不是撤销，给它上图会把「返回上级 / 返回上一页」两档压成同一个符号；而凭空造一个点下去无事发生的「撤销」键又破了「无死键」红线。**下一个真正可撤销的操作做出来时这一件即接上**（首选方案：天赋误点后的「撤销上一次加点」，它只需要记住上一条加点记录，不必动持久化） |
| 状态与属性图标 8 件 | 战斗 HUD 波次 chip 底下的**本波精英词缀徽标行** `.afRow .afIc`（`DomHud._refreshAffixes`，0.4s 刷一次）｜装备详情与重铸弹窗的词缀行 `_popAttr`（两处调用点，`iconTex: UiPlate.STATUS_TEX[id]`） | `icons/status_shield` `icons/status_sword` `icons/status_heart` `icons/status_skull` `icons/status_fire` `icons/status_bolt` `icons/status_lock` `icons/status_search`（八件落盘接线，查 `UiPlate.STATUS_TEX`） | HUD 徽标 26px×--s、弹层图标列 34px×层缩放 | `icon`（contain） | — | 1 | ✅ r21 一张 5列2行表出齐 10 格，棋盘底目检 10/10 无抠穿。**无头取景已目击上图**：第 4 波场上出现「狂暴」精英时，波次 chip 底下那枚火焰徽 `bg=Y`、emoji 被 `icon()` 摘成空串（截图 `gen-output/smoke_step2p/06b-affix-badges.png`）。**一张表吃两套词缀**：精英词缀（迅捷/坚甲/治疗/分裂/狂暴）与装备词缀（狂暴/精准/迅捷/鹰眼/穿甲/铁壁）共用 `STATUS_TEX`，两边 id 不撞（后者带 `af_` 前缀）。⚠ **`status_ice` / `status_poison` 不落盘**：图合格，但战斗里没有冰冻/中毒这类持续伤害机制（无 DoT 系统），挂上去就是永远不亮灯的死槽——切片件与 `tab_core` 同样归档在 `art-spec/reference/stock/ico/`，键留采购单。⚠ 出图时「锁定」那格模型画成了**分划板**（准星）而不是挂锁：将错就错——它正好对上装备词缀「精准」，而真正的「锁」在本作里是随文小符号（🔒 跟在文案里），按判据①本就不该出图。⚠ 装备词缀那一处宿主**机制已验、具体格子未在取景里走到**（要背包里有一件带词缀的装备才看得到，无头烟测的存档背包是空的）；走的是 `_popAttr.iconTex` 这条第三批就跑通的老路 |
| 材料与宝石 7 件 | 背包格 `.bcell i`（`HomeUiHeroes.ts:822`，格 124px、图标框 72px×--hs；背包条里 110px 格配 64px 框）｜商城货卡 `.gIc`（`HomeUiMall.ts:311` 的 `mkGood({icTex})`，框 120px×--hs ｜ 92px×--pw） | `icons/mat_stone` `icons/mat_alloy` `icons/mat_core` `icons/gem_fire` `icons/gem_wind` `icons/gem_ice` `icons/gem_thunder`（七件全部落盘接线，查 `UiPlate.MISC_TEX`） | 图标 64~120px×层缩放（尺寸归 CSS） | `icon`（contain） | — | 1 | ✅ r19 一张 4列2行表出齐（模型多画了第 8 格琥珀雷宝石，不在采购单上，丢弃）。**这七件必须 `--tol 95` 切**：绿宝石的亮绿漩涡在默认 tol=60 下满足「g-r>60 且 g-b>60」，会被当背景抠穿——棋盘底目检才发现，源表上看不出。`mat_blueprint`（图纸）没出图，查 `MISC_TEX` 查不到就走 emoji，**不要改成 `'icons/'+id` 拼 key**：拼出来的串对账不认，会把已落盘的图判成无归宿 |

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
| `plate`（已定） | 弹层 CTA、`.btn.big`、登录 START | 高 ≥40px@1x | `16 fill` / 10px×--pu |
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

### 进度条与页签的出图口径（批5 / 批1 追加，出图前只需读这段）

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
| 章节载具 3 件 | **护送页章节头左端那一枚**（`HomeUiStage` 章节头 `.chVeh`，`CHAPTER_THEMES[].veh` 字形 → `UiPlate.VEHICLE_TEX` 对 key，逐章换图） | `icons/vehicle_truck` `icons/vehicle_ship` `icons/vehicle_hauler`（三件全部落盘接线） | 深色层 76px×--hs；青瓷层 28px×--pw（章头条只有 45px 高，h1 23 + small 13 已占 36） | `icon()` 整颗替换：emoji 先占位、图到位摘字 | — | 1（一章一件，不是同一件的多种态） | ✅ r26 一张 4列1行表（第 4 格是英雄碎片）。**为什么不贴场景里那块 `.veh`**：浅色（手机）主题把 `.stage-scene > .veh` 连同 road/dash/mobs 一起 `display:none`（护送页手机版改用 escort.png 实景照片），贴上去在真机上永远看不见——这一枚反而是手机上唯一看得见载具的位置。字形对 key 而不是章节序号对 key：章节→载具的映射只有 `CHAPTER_THEMES` 一处真源，再抄一份序号表就有两处 |
| 资源·英雄碎片 1 件 | **升星弹窗的碎片说明行**（`HomeUiHeroes` 升星弹窗 `_popAttr({ icon: '🔩', iconTex: 'ui/res/res_frag' })`） | `ui/res/res_frag` | `.popAttr .ai` 34px×--pu（沿用该槽既有尺寸，不新开档） | `icon()` 摘字，缺图回退 🔩 | — | 1 | ✅ 同 r26 表第 4 格。顶栏那三个胶囊位（`.reswrap` 写死 `1fr 1fr 1.15fr`）**不给碎片**：碎片是四英雄各自的库存（`shard_rifle/sniper/laser/radiation`），不是可加总的单一货币，摆一个总数进顶栏等于骗人。**同批另三件（`res_medal`/`res_energy`/`res_ticket`）整批不出图**：本作资源表只有 gold/diamond/stamina + shard_*，勋章没有成就/军团玩法，能量与体力同位重复，招募券的「每日免费一次」是额度不是库存——挂上顶栏就是三个恒为 0 的假数字，按「无死键」红线不排产 |
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
| ✅ **有活宿主，可出图可进版** | 10 | `ui/panel/row_card`（`.good.panel` `HomeUiMall.ts:303` + `.mailRow.panel` `DomHud.ts:570`）、`ui/panel/panel_mini`（`.mbox` `HomeUiCore.ts:394/435`）、`ui/plate_wave`（`.chip.waveChip` `DomHud.ts:1019`，最小宽 122px、上面叠「波次 3/10」文字）、`ui/badge/power_badge`（`.powerBadge` `HomeUiHeroes.ts:569`，高 27px、叠「战力 12,345」）、`ui/lvtag`（`.lvtag` `HomeUiCore.ts:1303`，实测仅 ≈21×13px）、`ui/tag_hot`（`.gHot` `HomeUiMall.ts:306`，叠「HOT」）、`icons/mat_stone/alloy/core` + `icons/gem_fire/wind/ice/thunder`（背包 `.bcell` `HomeUiHeroes.ts:823` 与商城 `.gIc` `HomeUiMall.ts:311`，格子 110~124px——**但这两处现在只写 emoji、没有贴图槽，要先加 `iconTex` 才能进版**） | 建 DOM 的代码在，尺寸够。**已翻案（Step2/材料宝石批）**：`.bcell`/`.gIc` 两处各加了贴图槽，七件已上屏 |
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
