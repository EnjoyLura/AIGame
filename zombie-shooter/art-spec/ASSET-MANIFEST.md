# 资源槽位清单（ASSET-MANIFEST）

**契约**：key = 相对 `assets/resources/textures/` 的路径（不含扩展名）。**换图不换 key**——同名覆盖即全游戏生效。三个入口必须一致，`node tools/check-art-manifest.mjs` 负责对账：

1. 磁盘文件 `assets/resources/textures/<key>.png`；
2. 预载清单 `assets/scripts/core/AssetLib.ts` 的 `MANIFEST`；
3. 代码引用 `AssetLib.frame('<key>')` / `_tex('<key>')` 字面量。

清单里暂无文件的 key 属「预留槽位」（缺图回退占位，图到位即生效）——这正是逐张补图、随时可进的机制。风格与尺寸要求见 [STYLE-SPEC.md](./STYLE-SPEC.md)。

## A. 在库槽位（96 张图，png/jpg）

| key | 用途 | 现尺寸 | 状态 |
|---|---|---|---|
| characters/hero_rifle · hero_sniper · hero_laser · hero_radiation | 四英雄立绘 | 225~321×512~640 | 已有 |
| characters/commander / specialists | 指挥官头像 / 特遣队 | 848×1264 / 1264×848 | 已有 |
| monsters/boar · dog · bear · eagle · stoneape | 怪物单图 | 152~384 见方 | 已有 |
| monsters/boar_walk · bear_walk · eagle_walk · stoneape_walk | 行走序列（12 帧横排×256） | 2916~3156×256 | 已有 |
| icons/{rifle,sniper,laser,radiation}_{basic,skill,ultimate} | 技能三连图标 | 512×512 | 已有（风格待换肤） |
| weapons/rifle_bullet / rifle_grenade | 步枪子弹 / 榴弹 | 23×128 / 52×128 | 已有 |
| fx/mortar | 迫击炮 16 格序列 | 512×512 | 已有 |
| fx/rifle_muzzle_flash · rifle_grenade_explosion · rifle_grenade_ring | 枪口焰/爆爆/冲击环 | 198~512 | 已有 |
| scenes/vehicle_tail | 车尾（战斗下半屏） | 2160×540 | 已有 |
| scenes/road | 战斗路面底图 | 720×1280 | 已有 |
| scenes/escort | 护送页/商城场景图 | 848×1264 | 已有（本轮修复：曾被代码引用但未登记，静默占位） |
| ui/panel_card | 弹窗卡牌底板 | 768×1152 | 已有 |
| ui/panel_metal | 九宫格面板 | 512×512 | 已有 |
| ui/banner · banner_orange | 横幅/标题板 | 1440×488 / 512×512 | 已有 |
| ui/btn_gold · btn_cyan | 金/青按钮 | 384 / 256 见方 | 已有 |
| ui/chip_dark · chest | 深色芯片 / 宝箱 | 384 / 256 见方 | 已有 |
| ui/nav_mall · nav_heroes · nav_battle · nav_core · nav_base | 底部导航 5 键 | 128×128 | 已有 |
| ui/res_gold · res_diamond · res_stamina | 资源图标 3 枚 | 128×128 | 已有 |
| ui/btn_primary · card_frame · icon_frame · panel_frame | 在库备用件（代码暂未引用） | 640×199 / 730×1152 / 256×254 / 1024×466 | 备用，下一轮可取用 |

> **接线状态不在本表维护**：A 表按轮次增量记录「key ↔ 用途 ↔ 尺寸」；某件是否已上屏、宿主是哪个
> CSS class、切片参数是多少，一律看 [STYLE-SPEC.md §9 通用件契约表](./STYLE-SPEC.md)
> （与 `assets/scripts/ui/UiPlate.ts` 逐 key 相互断言）。r5/r6 批次件（panel_main/panel_sub、
> ribbon_banner、bar_title、btn_play/confirm/cancel/close/danger/video/round、ico_notice/trophy/lock、
> avatar_frame、ribbon_title、frame_bronze/silver/gold、frame_q0-q3、rank1-7）已在库，按 §9 取用。

## B. 预留槽位 = 机器可读采购单（103 项）

**唯一真源在代码**：`assets/scripts/core/AssetLib.ts` 的 `RESERVED_SLOTS`（key → 用途与宿主注记）。
登记进 `MANIFEST` 且写进 `RESERVED_SLOTS` 即为合法预留：预载阶段跳过（不白发请求）、
UI 走 glyph/CSS 回退、图落地后**必须从 `RESERVED_SLOTS` 删掉该行**，checker 会盯过时声明。

分类计数（`node tools/check-art-manifest.mjs` 报实况，本表只做导航）：

| 族 | 件数 | 归哪一类 | 对应 ART-PLAN 批次 |
|---|---|---|---|
| `ui/ico_*` | 31 | 功能入口图标族（侧栏/养成/HUD/设置/登录） | 批3 |
| `icons/status_*` | 10 | 状态与属性图标族 | 批4 |
| `ui/bar_*` | 7 | 进度条族（底槽/四色填充/端头/节点） | 批5 |
| `ui/tab_*` | 6 | 二级页签族（商城货架 / 背包分类共用） | 批1 追加 |
| `ui/btn_*` | 4 | 按钮补件（紫板 + 主页/帮助/刷新小圆钮） | 批2 |
| `ui/res_*` | 4 | 扩展资源（碎片/勋章/能量/招募券） | 批5 |
| `ui/tag_*` + `ui/lvtag` + `ui/power_badge` | 4 | 角标族（免费/折扣/HOT/等级/战力） | 批0 追加 |
| `ui/node_*` | 3 | 天赋节点三态 | 批4 |
| `ui/medal1~3` | 3 | 名次奖牌（替 🥇🥈🥉 与 `.statRank` 渐变） | 批0 追加 |
| `ui/star_on/off` | 2 | 评价星 | 批0 追加 |
| `icons/gem_*` + `icons/mat_*` | 7 | 材料与宝石图标族 | 批3 |
| `icons/vehicle_*` | 3 | 护送关卡卡载具 | 批8 |
| `scenes/bg_*` + `scenes/vehicle_tail_damaged` | 5 | 关卡主题 ×4 + 车尾受损态 | 批8 |
| `fx/*` + `ui/plate_wave`/`ui/skill_slot`/`ui/boss_crown` | 7 | 特效与战斗件 | 批9 |
| `weapons/*` + `monsters/dog_walk` | 4 | 三英雄弹道 + 丧犬走帧 | 批7 / 弹道 |
| `ui/row_card` + `ui/panel_mini` | 2 | 行卡底板 / 模块小框 | 批1 |

## C. 进版分类清单（按 UI 分类，一次一表）

> 顺序 = 建议开工顺序：先接线（零生图），再补弹道（代码已就绪），最后按族生图。

1. **导航与页签**：主导航 5 签 ✅；二级页签 6 件（英雄/装备/宝石/材料/核心/耗材）✗。
2. **功能入口图标**：✅ 已上屏 ico_mail/notice/setting + **P0 接线轮新接：ico_task（侧栏任务）、
   ico_trophy（侧栏排行 + 玩法页排行榜）、shop_scroll（图鉴 + 怪物图鉴）、shop_gift（侧栏礼包）、
   shop_chest（商城每日免费补给）**；ico_rank/shop_letter 只作 popEmpty 空态图；
   在库无归宿 ico_achieve/ico_lock（无图形位，见 STYLE-SPEC §9 退役候选表）；
   待生图：加号、签到、试炼、无尽、核心、武器、技能、升星、天赋、招募、锻造、广告▶、详情›、
   暂停、统计、撤销、补给、删除、收件、空态、音量、静音、关于、警告、滑杆、勾选、好友、日历、商店、放大镜 ✗。
3. **状态与属性图标**：盾/剑/心/骷髅/火/冰/电/毒/锁/侦查 + 天赋节点三态 ✗（批4）。
4. **内容与资源图标**：材料 3 + 宝石 4 + 扩展资源 4 + 载具 3 + 评价星 2 + 名次奖牌 3 ✗。
5. **按钮**：六色语义板 5 色已接 ✅（紫板 ✗）；小圆钮 close/round ✅、**round2 ✅（P0 接帮助 ? 钮）**、
   home/help/refresh ✗。
6. **面板与底板**：pop 底板两档 ✅、标题条/绶带 ✅、ribbon_title 📦；行卡底板、模块小框 ✗；
   旧一代板（panel_metal/panel_frame/panel_card/card_frame/icon_frame/btn_primary/chip_dark/banner*）
   在库无宿主 —— **要么登记宿主要么整族删**，不许继续「预载不引用」
   （`check-art-manifest` 的「在库件必须有归宿」断言已在盯这条）。
7. **框·徽·角标**：品质框 frame_q0-q3 ✅（接 `.popQ .qi`）；**头像框 avatar_frame ✅（P0 接 `.popRow .ic`
   名片行，走 `UiPlate.frame()` 无 fill 变体）**；顶栏 43px 位仍不接（`.pAvatar > div` 有 clip-path 多边形，
   框图被裁，需先定框与切角的关系）；段位徽章 rank1-7 与铜银金头像框 frame_bronze/silver/gold 📦 无宿主
   （当前无段位 UI、无分档数据源）；等级角标/免费/折扣/HOT/战力徽章 ✗。
8. **进度条族**：底槽 + 绿/黄/蓝/红填充 + 端头 + 关卡节点，全 CSS 待贴图 ✗（批5）。
9. **战斗内容**：三英雄弹道（sniper/laser/radiation）+ 丧犬走帧 + 车尾受损态 + 主题背景 ×4 +
   飘字底/波次牌/技能槽/boss 徽 + 金币爆/升级光/传送门 ✗（批7~9）。
10. **技能图标 ×12**：一轮版在库，STYLE-SPEC 标「待换肤」，2026-09-20 用户豁免本轮不换。
