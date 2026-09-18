# 美术风格基准与生图规范（STYLE-SPEC）

基准图：[game_art_benchmark.png](./game_art_benchmark.png)（2048×2048，AI 生成的全套 UI style guide，图内自带说明「上列图仅为美术风格参考，实际以项目具体要求为准」）。

**用途**：每一轮美术资源生成的唯一风格依据。生图时把 §2 风格后缀 + §4 对应分类模板 + §5 尺寸要求拼成 prompt；出图后按 §6 验收清单比对基准图。本文件与代码的对接方式见 §7。

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

```
casual mobile game asset, cartoon style, thick soft outlines, chunky rounded shapes,
soft cel shading, vibrant saturated colors, warm cream and wood palette,
clean vector-like rendering, centered composition, isolated on transparent background,
no text, no watermark, game UI sprite sheet quality
```

负面词：`photorealistic, 3d render, dark gritty, horror, thin lines, sketch, watermark, text, ui frame around icon, drop shadow on background`

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
8. 与基准图同类件并排比对，第一眼像一族（同饱和度、同对比度）。

## 7. 代码对接（换肤怎么落地）

| 层 | 位置 | 换肤动作 |
|---|---|---|
| 图片资产 | `assets/resources/textures/<key>.png` | **换图不换 key**：同名覆盖即全游戏生效；新槽位先在 AssetLib MANIFEST 登记 |
| DOM 颜色 | `assets/scripts/ui/UiTheme.ts` | 只改 `--c-*` 值，不改名；历史散落 hex 跑 `tools/tokenize_colors.py` 迁移 |
| 画布颜色 | `GameConfig.ts` 的 `Palette`、`HeroSystem` 的 `lootDropColor` 等 | 值整体换新（这些不走 CSS 变量） |
| 一致性校验 | `node tools/check-art-manifest.mjs` | 清单↔磁盘↔代码引用三方对账，换完必跑 |

**替换工作流**：生图（§3+§4+§5）→ 验收（§6）→ 覆盖/落盘到 `textures/<key>.png` → 新 key 登记 AssetLib MANIFEST → 构建 → `check-art-manifest` + 浏览器烟测 → 提交。
