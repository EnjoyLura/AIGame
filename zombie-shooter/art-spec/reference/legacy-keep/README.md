# 旧版 UI 素材归档（不在契约位，不进包）

2026-09-20 拍板：这批是 **UI 规范与生图规范固化之前**（一代 3fa0ca3 / 二代 fcf10a2、399b573、cb39780）
零散产出的板类件，风格互相不统一，**不再作为当前采用代使用**。移到这里而不是删除：
以后若觉得某张比新版好，把它按原名拷回 `assets/resources/textures/ui/<key>.png`
（连 `.meta` 一起拷，保留原 uuid），再在 `AssetLib.ts` 的 MANIFEST 登记该行，
构建后即全游戏生效——**换图不换 key** 的规矩反过来同样成立。

| 文件 | 原 key | 当年用途 |
|---|---|---|
| `panel_metal.png` | `ui/panel_metal` | 九宫格面板（现由 `ui/panel_main` / `ui/panel_sub` 两档替） |
| `panel_frame.png` | `ui/panel_frame` | 弹窗外框（同上） |
| `card_frame.png` | `ui/card_frame` | 卡牌框 |
| `icon_frame.png` | `ui/icon_frame` | 图标框 |
| `btn_primary.png` | `ui/btn_primary` | 长条主按钮（现由 `ui/btn_play` 替） |
| `btn_gold.png` | `ui/btn_gold` | 金色按钮（同上） |
| `btn_cyan.png` | `ui/btn_cyan` | 青色按钮（现由 `ui/btn_cancel` 替） |
| `banner_orange.png` | `ui/banner_orange` | 橙色标题板（现由 `ui/ribbon_banner` / `ui/bar_title` 替） |
| `chip_dark.png` | `ui/chip_dark` | 深色芯片/标签底 |

**未归档的两件**：`ui/banner` 与 `ui/panel_card` 看着像同代弃件，但战斗内升级面
`ui/LevelUpPanel.ts` 用 `AssetLib.frame('ui/banner' / 'ui/panel_card')` 直接取画布帧，
移出契约位后被 `check-art-manifest` 的「代码引用未登记」当场拦下 → 已放回在库。
要把它们换成现行 `ribbon_banner`/`panel_main` 族，得单开一轮战斗面改动（含真机手测）。

对照现行契约看 `art-spec/STYLE-SPEC.md` §9；槽位总账在 `assets/scripts/core/AssetLib.ts`
（`MANIFEST` = 在库，`RESERVED_SLOTS` = 采购单）。归档件**不登记**在这两处，
`tools/check-art-manifest.mjs` 也不管它们（只扫 `assets/resources/textures/` 下）。
