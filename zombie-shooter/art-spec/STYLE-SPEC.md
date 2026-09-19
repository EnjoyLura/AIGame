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
| 九宫格面板 | `wooden framed cream panel, corner ornaments, flat center area suitable for 9-slice, …` | 交付 96×96 以上、四角 24px 等宽的九宫格-safe 构图 |
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

1. **生表**：一次生成 3×3（或 2×N）素材表，prompt 只给「格子清单 + 主题风格 + 绿幕底」，示例：

   > 一张3x3的图标素材表：金币堆、钻石、闪电体力、商店、英雄勋章、军用卡车、游戏手柄、基地炮塔、宝箱。末日题材欧美卡通风格，粗描边，纯绿色背景 (#00FF00)

   三轮成品见 `gen-output/r3_sheet_20260919_213051.png`（gitignore，仅本地）。
2. **切片落盘**：`python tools/slice_sheet.py <sheet.png> --slots "ui/res_gold:128,ui/res_diamond:128,ui/res_stamina:128,ui/nav_mall:128,ui/nav_heroes:128,ui/nav_battle:128,ui/nav_core:128,ui/nav_base:128,ui/chest:256"`
   ——绿幕整表 → 色键掩膜 → 连通域标记 → 卫星碎件并回主体（面积比 <30% 才并入，防误融合）→
   行主序排序 → 裁边/补安全边距/缩放 → 直接写入 `assets/resources/textures/<key>.png`（换图不换 key）。
   参数：`--expect 9` 校验格数、`--margin 6` 安全边距百分比、`--tol 60` 绿幕容差、`--root` 资源根。
3. **验收**：切片件与基准图2并排比对，过 §6 清单（素材表版主要看 5/6/8/9 条）。
4. **落地**：构建 → `check-art-manifest` → 浏览器烟测 → 提交。

### 坑

- **切片是行主序**（上到下、左到右）：prompt 里的格子顺序必须与之对应，落盘前先肉眼核对切出的 9 件与槽位一一对应；
- **相邻主体挨太近会被桥接合并**（三轮勋章+卡车曾并成一格；已加面积比规则修复），
  生表时格与格之间保留明显绿底间隔更稳；
- **绿幕容差**：默认 `--tol 60`；主体本身带绿色系（僵尸/毒系）时降 tol 或换底色（如纯蓝幕）再切；
- **本地烟测换端口**：内置浏览器磁盘缓存按源（协议+域名+端口）分区，同端口看到旧图时
  换一个端口重开页签即可验证新图；线上走隧道本来就是新源，不受影响。
