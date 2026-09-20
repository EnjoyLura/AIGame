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

- **顶栏资源类图标无框**：单主体出图（基准图顶栏的金币/钻石/闪电皆无框）；重装饰金属框一律禁止。
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
- **命名**：全小写下划线，`<分类>/<语义>`（如 `ui/btn_confirm_green`），key 即相对 `assets/resources/textures/` 的路径。

## 6. 验收清单（生图指标，出图逐条过）

1. 色板命中：主色落在 §2 色板 ±10% 明度范围内；
2. 描边一致：粗细与基准图同类件相当，无细线/无描边两种混入；
3. 形状语言：大圆角、厚底边（按钮）、木框奶油底（面板）齐全；
4. 明暗：单光源左上，软过渡，无硬噪点；
5. 透明底干净：无白边/黑边/投影残留（场景背景除外）；
6. 无文字、无水印；按钮类不带字（字代码叠）；
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
   四轮实际用的 prompt（留档于 gen-output/*.summary.json）：

   > 一张末日题材欧美卡通风格的微信小游戏UI图标素材图，5列3行网格整齐排列，从左到右从上到下依次是：开始按钮、确认按钮、取消按钮、关闭按钮、头像框、标题绶带、礼物图标、宝箱图标、卷轴图标、信件图标、任务图标、邮件图标、设置图标、排行榜图标、成就图标，图标之间留有间隙，纯绿色背景，按钮上不要画任何文字

   成品：`gen-output/r3_sheet_*.png`（9 格）、`gen-output/r4_icons_*.png`（15 格）（gitignore，仅本地）。
2. **切片落盘**：`python tools/slice_sheet.py <sheet.png> --slots "ui/res_gold:128,ui/res_diamond:128,ui/res_stamina:128,ui/nav_mall:128,ui/nav_heroes:128,ui/nav_battle:128,ui/nav_core:128,ui/nav_base:128,ui/chest:256"`
   ——绿幕整表 → 色键掩膜 → 连通域标记 → 卫星碎件并回主体（面积比 <30% 才并入，防误融合）→
   行主序排序 → 裁边/补安全边距/缩放 → 直接写入 `assets/resources/textures/<key>.png`（换图不换 key）。
   参数：`--expect 15` 校验格数、`--margin 6` 安全边距百分比、`--tol 60` 绿幕容差、
   `--dilate 6` 掩膜膨胀半径、`--root` 指定资源根。
3. **验收**：切片件与基准图2并排比对，过 §6 清单（素材表版主要看 5/6/8/9 条）。
4. **落地**：构建 → `check-art-manifest` → 浏览器烟测 → 提交。

### 坑

- **切片是行主序**（上到下、左到右）：prompt 里的格子顺序必须与之对应（写明「5列3行」「从左到右从上到下」），
  落盘前先肉眼核对切出的件与槽位一一对应；
- **相邻件粘连**：格子间隙小于 2×膨胀半径（默认 6÷4 尺度 ≈ 24px 全分辨率，两侧合计 48px）时，
  两件会在掩膜膨胀阶段焊死、合并逻辑救不回（四轮 15 件曾识别成 11 件）。
  生表时写「图标之间留有间隙」+ 用 2K 分辨率；仍粘连就 `--dilate 3` 重切；
- **绿幕容差**：默认 `--tol 60`；主体本身带绿色系（僵尸/毒系）时降 tol 或换底色（如纯蓝幕）再切；
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
| 弹层底板 M/L | `.pop`（非 S） | `ui/panel_main` | 面板框 16px | border-image | `panel` = slice `12% fill` / width 16px×--pu | 1 | ✅ 已接 |
| 弹层底板 S | `.pop.S` | `ui/panel_sub` | 同上 | border-image | `panel` | 1 | ✅ 已接 |
| 大按钮（CTA/登录 START） | `.popBtn` / `.lgStart` | 见下方按钮语义行 | 板框 10px | border-image | `plate` = slice `16 fill` / 10px×--pu（登录 `platePw` 按 --pw） | 1（态由 CSS 派生，见 §10） | ✅ 已接 |
| 细标题条 | `.popTop` | `ui/bar_title` | 高 41px×--pu | `strip`（100% 100% 拉伸） | — | 1 | ✅ 已接 |
| 横幅绶带 | `.popBanner` | `ui/ribbon_banner` | 高 45px×--pu | `strip` | — | 1 | ✅ 已接 |
| 弹窗标题绶带（备用） | — | `ui/ribbon_title` | 未接 | `strip` | — | 1 | 📦 在库待接（与 ribbon_banner 二择一，暂留备用） |
| 关闭钮 | `.popClose` | `ui/btn_close` | 30px×--pu 方 | `icon`（contain + 摘 glyph + 隐边框） | — | 1 | ✅ 已接 |
| 返回钮 | `.popBack` | `ui/btn_round` | 30px×--pu 方 | `icon` + `keepGlyph`（‹ 是功能符号不是占位，压在板面上）+ 字色改写 | — | 1 | ✅ 已接 |
| 小圆钮备用件 | `.popMeta .q`（帮助 ?） | `ui/btn_round2` | 17px×--pu 圆 | `icon` + `keepGlyph`（? 是符号）+ 隐边框 | — | 1 | ✅ 本轮接线 |
| 行图标外框（框件族） | `.popRow .ic`（`frameTex`） | `ui/avatar_frame`（名片行） | 40px×--pu 方 | **`frame`** = border-image slice `16%`（**无 fill**）/ width 5px×--pu，保背景 | `frame` | 1 | ✅ 本轮接线（顶栏 43px 位不接：`.pAvatar > div` 有 `clip-path` 多边形，框图会被裁，需先定框/切角关系） |
| 入口图标槽（侧栏/页脚键） | `.hot .ic`（`mkBtn`/`mkFoot` 的 tex 参数） | `ui/ico_task` `ui/ico_trophy` `ui/shop_scroll` `ui/shop_gift` `ui/shop_chest` | 34px×--pu（侧栏覆写 56px×--hs / 24px×--pw 与字形同框） | `icon`（尺寸归 CSS，两层同 footprint） | — | 1 | ✅ 本轮接线（新入口图标直接传 key，不再加机制） |
| 底部主导航 5 签 | `.tab .ticon` | `ui/nav_mall` `ui/nav_heroes` `ui/nav_battle` `ui/nav_core` `ui/nav_base` | 102px×--hs ｜ 41px×--pw | `icon`（尺寸交 CSS） | — | 1（选中态 CSS 强调，见 §10） | ✅ 已接（查 `NAV_PLATE`） |
| 顶栏资源胶囊 3 枚 | `.res > span:first-child` | `ui/res_gold` `ui/res_diamond` `ui/res_stamina` | 22px×--hs ｜ 20px×--pw | `icon`（尺寸交 CSS） | — | 1 | ✅ 已接（查 `RES_ICON`） |
| 详情品质头·图标框 | `.popQ .qi` | `ui/frame_q0` `ui/frame_q1` `ui/frame_q2` `ui/frame_q3` | 58px×--pu 方 | `icon`（contain + keepGlyph，框压在道具 glyph 外圈） | — | 1 | ✅ 本轮接线（CSS 白边降为缺图回退） |
| 行图标贴图槽 | `.popRow .ic`（`iconTex`） | 动态 key（立绘/怪图/礼盒…） | 40px×--pu | `icon`（cover） | — | 1 | ✅ 已接 |
| 空态图 | `.popEmpty .ei` | 动态 key（`ui/` 前缀即视为槽位） | 44px×--pu | `icon`（contain） | — | 1 | ✅ 已接 |
| 头像框 | 见下方「行图标外框（框件族）」行：`frame()` 变体已落地并接在名片行 | `ui/avatar_frame` | 40px×--pu | `frame`（border-image 无 fill，不抢 iconTex 的 background） | `frame` | 1 | ✅ 本轮接线；顶栏小位待 clip-path 定案 |
| 段位徽章 ×7 | 待开：段位/成就展示位 | `ui/rank1`…`ui/rank7` | 128px 见方 | `icon` | — | 1 | 📦 在库待接（**当前无段位 UI**，见 ART-PLAN §5 决策） |
| 名次奖牌 ×3 | 排行榜 `.popRow .tag` / HUD `.statRank` | `ui/medal1` `ui/medal2` `ui/medal3` | 32~56px | `icon` | — | 1 | ✗ 待生图（现在分别是 🥇🥈🥉 emoji 与 CSS 渐变块） |

### 按钮语义 → 去字底板（`UiPlate.PLATE`，唯一映射）

| kind | 槽位 | 用在哪 | 状态 |
|---|---|---|---|
| `gold`（缺省） | `ui/btn_play` | 主 CTA：领取/确定/开始 | ✅ 已接 |
| `green` | `ui/btn_confirm` | 确认/消耗类（购买、强化） | ✅ 已接 |
| `blue` | `ui/btn_cancel` | 次级/取消 | ✅ 已接（主城 `.btn.blue` 待按本表接线） |
| `danger` | `ui/btn_danger` | 警示：重置存档、退出 | ✅ 已接 |
| `ad` | `ui/btn_video` | 看广告得奖励键 | ✅ 本轮显式化（旧版靠中文文案正则命中，改文案即掉板） |
| `grey` | `ui/btn_cancel` | 置灰次级键（沿用蓝板 + §10 派生态） | ✅ 已接 |
| `purple` | `ui/btn_purple` | 特殊：限时/首充/超值 | ✗ 待生图（缺图回退 CSS 底色） |

> 旧一代板 `ui/btn_gold` `ui/btn_cyan` `ui/panel_metal` `ui/panel_frame` `ui/panel_card` `ui/card_frame`
> `ui/icon_frame` `ui/btn_primary` `ui/chip_dark` `ui/banner` `ui/banner_orange` 全在库、无宿主：
> **本表未列即视为备用件**，要么在本表登记宿主后再接，要么整族删除，不允许继续「预载但不引用」。

### 在库无归宿件（退役候选 / 待接，等拍板）

`check-art-manifest` 的「在库件必须有归宿」断言就是冲这张表去的：每张在库图要么被代码引用，
要么在这里有一句说法（接谁的宿主、为什么还没接）。**下一轮要么接线、要么整族删，不留第三种状态。**

| key | 原意 | 为什么还没接 | 建议 |
|---|---|---|---|
| `ui/frame_bronze` `ui/frame_silver` `ui/frame_gold` | 铜/银/金三档头像框 | 分档需要段位或段位化等级数据源，现在只有单档 `ui/avatar_frame` 有宿主 | 待段位功能开；否则退役 |
| `ui/rank1` `ui/rank2` `ui/rank3` `ui/rank4` `ui/rank5` `ui/rank6` `ui/rank7` | 段位徽章七档（青铜→王者） | 游戏里没有段位字段与展示位（D4）；排行榜前三是「名次」另族 `ui/medal1~3` | 待段位玩法开；否则退役 |
| `ui/ico_achieve` | 成就入口图标 | 主城无成就入口（成就只在活动/任务里以行卡出现） | 开成就页再接，否则退役 |
| `ui/ico_lock` | 锁定态图标 | 现有 🔒 全是文案内嵌 emoji（如「🔒 需先将前置节点点满」），没有独立图形位；节点三态属预留族 `ui/node_done/next/lock` | 随批4 节点图形化一起接 |

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
