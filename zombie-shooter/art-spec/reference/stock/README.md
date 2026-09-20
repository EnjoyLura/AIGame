# 在库无宿主件（移出包，不进包、不登记）

2026-09-21 美术资源分类迁移这一轮拍板：**在用的图按类别留在 `assets/resources/textures/` 里，
没在用的图移出工程资源目录**。原因是 `resources/` 下的每个文件都会整个打进包，
一张没有任何界面引用的图 = 白占包体，还让人误以为它在使用中。

这里放的是**风格没问题、只缺要用它的界面**的那批件。
跟隔壁 `../legacy-keep/` 的区别就在这一句：`legacy-keep/` 是**旧一代美术风格作废**，
`stock/` 是**当代风格、待宿主**。

## 清单（原 key 一律是 `ui/<名>`，png 与 .png.meta 成对存放，uuid 保留）

| 子目录 | 件数 | 成员（原 key） | 为什么没宿主 |
|---|---|---|---|
| `rank/` | 7 | `ui/rank1` ~ `ui/rank7`（段位徽章七档：青铜→王者） | 游戏里没有段位字段与展示位（ART-PLAN 决策 D4） |
| `frame/` | 3 | `ui/frame_bronze` `ui/frame_silver` `ui/frame_gold`（铜/银/金头像框） | 分档需要段位或段位化等级数据源；现在只有单档 `ui/frame/avatar_frame` 有宿主 |
| `ico/` | 3 | `ui/ico_achieve`（成就入口）`ui/ico_lock`（锁定态）`ui/ico/tab_core`（核心页签） | 主城无成就入口（成就只在活动/任务里以行卡出现）；🔒 现有表现全是文案内嵌 emoji，没有独立图形位；tab_core 是**唯一一件「key 还留在采购单」的**——2026-09-20 拍板「核心页签功能我后面做」，所以 `AssetLib` 的 `MANIFEST` 与 `RESERVED_SLOTS` 两行都不删，图先存这儿，界面建好当天拷回即生效 |

## 想复活某一张

1. 把它（**连 `.png.meta` 一起**，保住原 uuid）拷回 `assets/resources/textures/` 下
   按现行类别归好的位置：段位徽章 → `ui/badge/`，铜银金头像框 → `ui/frame/`，
   功能图标 → `ui/ico/`。
2. 在 `assets/scripts/core/AssetLib.ts` 的 `MANIFEST` 里登记该行 key（`tab_core` 已在册，跳过这步，
   只需删掉 `RESERVED_SLOTS` 里那一行）。
3. 给它在 `art-spec/STYLE-SPEC.md` §9 通用件契约表登记宿主（CSS class + 切片档），
   或在「在库无归宿件」表里写一句说法——`tools/check-art-manifest.mjs` 的
   「在库件必须有归宿」断言在盯，光登记不接宿主过不了对账。
4. 跑 `node tools/check-art-manifest.mjs`，全绿即生效。

**换图不换 key** 的规矩反过来同样成立：路径本身就是契约。

## 这些件不在对账范围内

`art-spec/` 不是 Cocos 的资源目录，所以本目录下的图**不进构建包**、
`tools/check-art-manifest.mjs` 也**不扫**（该检查只认 `assets/resources/textures/` 下的文件），
因此不会报磁盘孤儿。本目录也不登记进 `MANIFEST` / `RESERVED_SLOTS`。
