# 资源槽位清单（ASSET-MANIFEST）

**契约**：key = 相对 `assets/resources/textures/` 的路径（不含扩展名）。**换图不换 key**——同名覆盖即全游戏生效。三个入口必须一致，`node tools/check-art-manifest.mjs` 负责对账：

1. 磁盘文件 `assets/resources/textures/<key>.png`；
2. 预载清单 `assets/scripts/core/AssetLib.ts` 的 `MANIFEST`；
3. 代码引用 `AssetLib.frame('<key>')` / `_tex('<key>')` 字面量。

清单里暂无文件的 key 属「预留槽位」（缺图回退占位，图到位即生效）——这正是逐张补图、随时可进的机制。风格与尺寸要求见 [STYLE-SPEC.md](./STYLE-SPEC.md)。

## A. 在库槽位（56，png/jpg）

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

## B. 预留槽位（MANIFEST 已登记、文件未到位，现走占位）

| key | 用途 | 建议尺寸 |
|---|---|---|
| weapons/sniper_bullet | 狙击弹道 | 23×128 |
| weapons/laser_beam | 激光束 | 横条 512×64 上下 |
| weapons/radiation_bullet | 辐射弹 | 23~52×128 |

## C. 下一轮采购单（基准图 → 游戏槽位，按优先级）

| 优先级 | 基准图部件 | 目标 key（新） | 用在哪 |
|---|---|---|---|
| P0 | 头像框+等级角标 | ui/avatar_frame | 主城/局内顶栏 |
| P0 | 金币/钻石/体力图标（casual 风） | 覆盖 ui/res_gold / res_diamond / res_stamina | 全局资源栏 |
| P0 | PLAY 金钮 / CONFIRM 绿钮 / CANCEL 蓝钮 | ui/btn_play · btn_confirm · btn_cancel | 主 CTA/确认/取消三系（代码叠字） |
| P0 | 木框奶油九宫格面板 | ui/panel_wood | 全弹窗底板（替代 panel_metal 语义） |
| P0 | 底部导航 5 键（cartoon 风） | 覆盖 ui/nav_* | 主城导航 |
| P1 | 蓝绶带标题板 | ui/ribbon_title | 弹窗标题 |
| P1 | 红色关闭 X | ui/btn_close | 全弹窗 |
| P1 | 商城货架图标（礼物/信件/宝箱/卷轴…） | ui/shop_gift · ui/shop_chest · … | 商城 |
| P1 | 功能图标（任务/邮件/设置/排行榜/成就） | ui/ico_task · ico_mail · ico_setting · … | 主城工具栏 |
| P2 | 徽章段位 4 档（金/银/铜/紫） | ui/badge_gold · badge_silver · badge_bronze · badge_purple | 排行/成就/段位 |
| P2 | 特效（金币爆/升级光/传送门） | fx/coin_burst · fx/levelup_glow · … | 结算/升级 |
| P2 | 场景背景 4 张（森林/海滩/雪地/洞穴） | scenes/bg_forest · bg_beach · bg_snow · bg_cave | 关卡主题轮换 |
| P2 | toggle 开关/slider | ui/toggle_on · toggle_off · slider_track | 设置页 |

> C 表是新槽位提案：定稿一个 key 就登记 AssetLib MANIFEST（文件可后到），代码引用 + 清单 + 文件三方到位后 checker 才会全绿。
