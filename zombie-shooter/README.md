# 《末日航线》工程（立项名 doomsday-route）

> 本项目已立项为**《末日航线》**——末日护送题材竖屏自动战斗微信小游戏，产品设定见《../产品文档.md》，
> 技术选型见《../技术文档.md》。工程目录暂用 `zombie-shooter/`，可随时整体改名。

Cocos Creator **3.8.8** 竖屏 2D 骨架。打开即可运行：运输载具防守、四英雄自动索敌
（步枪/狙击/激光/辐射枪四种普攻行为）+ 每英雄**技能/大招**（升级卡解锁后自动施放）、
四方向刷怪、经验掉落自动拾取、升级三选一强化、波次推进与游戏结束重开。占位美术由代码绘制。

## 一、如何打开运行

1. 打开 **Cocos Dashboard** → 项目 → 导入本目录（`zombie-shooter` 文件夹）。
2. 首次打开会自动生成 `library/`、`temp/`、所有 `.meta` 文件，等右下角资源数据库构建完成。
3. 双击打开 `assets/scenes/game.scene`，点击顶部 **预览（Play）** 按钮在浏览器中运行。
4. `tsconfig.json` 在编辑器首次打开前于 VS Code 中会报"找不到 temp/tsconfig.cocos.json"，
   属正常现象，用编辑器打开一次工程后自动生成。

> 若 `game.scene` 打开异常：在编辑器中新建场景（2D）→ 保存为 `assets/scenes/game.scene` 覆盖即可。
> 场景里只有 Canvas/Camera，业务节点全部由代码动态创建，重建场景零成本。

## 二、已实现的核心循环（M1 基础版）

- **运输载具防守**：车尾横贯屏幕底部（只露尾部），四英雄分散站在车尾；怪物**全部垂直下压**
  （像雪一样直落，车尾横贯全宽直行必达）：主要从屏幕上方出现，少量从道路两侧中段切入
  （带入场缩放提示），疯鹰从侧翼上半区入场后同样直落；追到即啃咬耐久，归零=护送失败；
  路面持续后滚营造载具前进感（`ROAD_SCROLL_SPEED` 调滚动速度）
- **四英雄上阵**：步枪手（单发瞄准）/ 狙击手（高伤长射程）/ 激光手（锁定持续光束伤害）/
  辐射枪手（快速穿透弹），各自独立索敌开火，数值全部在 `HeroDef.ts`
- **技能/大招框架**（M2）：每名英雄在 `HeroDef.ts` 配置 skill/ultimate 两个能力
  （4 种通用行为：projectile 弹幕 / multi 多目标直伤 / beam 持续光束 / area 范围爆炸），
  初始锁定，升级三选一里抽到「解锁·XXX」后自动施放，重复抽到升到 3 级（每级伤害 +30%）；
  普攻/技能/大招伤害统一走 `BattleManager.applyDamage`（暴击/飘字/死亡/掉落收口）
- **波次刷怪**（10 波混编配置表驱动：爬行者/疯狗群/獠牙野猪/双足熊/疯鹰五种行为，
  第 4 波起概率刷精英怪，打完进入无尽模式）：
  疯狗=低血高速成群直线快跑、野猪=贴近蓄力定身后高速冲刺（蓄力是集火窗口）、
  双足熊=高血肉盾、疯鹰=两侧翼斜线俯冲；波次表与怪型参数全在 `WaveData.ts`
- **经验升级**：击杀掉落经验晶体 → 自动飞向载具拾取 → 升级暂停弹出**三选一强化卡**
  （攻击/射频/射程 × 随机英雄），点选后恢复战斗
- **技能/大招图标栏**（`AbilityBar.ts`）：1、2 号位英雄图标在屏幕左列、3、4 号位在右列
  （每英雄普攻/技能/大招从上到下）；技能图标=扇形冷却遮罩顺时针扫过；
  大招=**击杀充能**（击杀来源=英雄自身，充 10 杀），像储水一样从图标底部往上灌，
  充能中浅色、充满点亮+外圈呼吸光效，水满后自动施放；右下角数字=强化等级；
  点按图标弹出数值浮窗（伤害/冷却/弹数/穿透/范围 + 下一级提示），长按 0.45 秒显示战场范围圈
  （area 大招叠加爆炸半径圈）
- **圆形碰撞结算** + 屏幕外怪物不可索敌/击中的可见性门槛
- **伤害飘字**（暴击放大变色）、载具耐久条、经验条、波次提示
- **本地存档**（最高波次、累计击杀，`sys.localStorage`，微信端自动兼容）

## 三、目录结构

```
zombie-shooter/
├─ assets/
│  ├─ scenes/game.scene        启动场景（纯引擎节点，无自定义组件引用）
│  ├─ scripts/
│  │  ├─ config/GameConfig.ts  全局常量：设计分辨率 720×1280、战斗参数、事件名、占位色板
│  │  ├─ core/
│  │  │  ├─ Boot.ts            启动引导：场景加载后动态挂载 BattleRoot
│  │  │  ├─ EventCenter.ts     全局事件中心（跨系统通信唯一通道）
│  │  │  ├─ NodePool.ts        通用节点对象池
│  │  │  ├─ createUINode.ts    动态节点必须走这里（UI_2D 层，防黑屏）
│  │  │  └─ GameManager.ts     运行时数据（经验/等级）+ 本地存档
│  │  ├─ battle/
│  │  │  ├─ BattleManager.ts   战斗总控：部署/刷怪/碰撞/统一伤害结算/经验/升级/胜负
│  │  │  ├─ HeroDef.ts         英雄定义表（普攻数值 + 每英雄 skill/ultimate 能力配置）
│  │  │  ├─ Hero.ts            英雄组件：持有属性与 HeroCombatController，含升级入口
│  │  │  ├─ HeroCombat.ts      能力运行时：普攻行为类 + 技能/大招（冷却/施放/光束分层/等级）
│  │  │  ├─ UpgradeCard.ts     三选一卡片（纯数据 heroId+upgradeId，不持有英雄组件）
│  │  │  ├─ Vehicle.ts         运输载具：耐久载体
│  │  │  ├─ WaveData.ts        波次配置表（后续接 Excel 导表）
│  │  │  ├─ Bullet.ts / Enemy.ts / DamageNumber.ts / XpGem.ts
│  │  └─ ui/
│  │     ├─ HUD.ts             战斗 HUD（经验条/载具条/波次/结算）
│  │     └─ LevelUpPanel.ts    升级三选一面板
│  ├─ textures/{ui,characters,scenes,effects}   美术资源占位目录
│  ├─ spines/  audios/  prefabs/  resources/
├─ settings/v2/packages/engine.json   官方 2D 精简模块配置（Spine 已开启、3D 已关闭）
└─ package.json                       creator 3.8.8
```

## 四、架构约定（给后续 AI 迭代定的规矩）

1. **场景零耦合**：场景文件不引用任何自定义脚本，一切从 `Boot.ts` 动态挂载开始。
   重构代码不需要动场景，永远不会出现"脚本 uuid 丢失"问题。
2. **对象池强制**：一切高频创建的节点（子弹/怪/飘字/掉落）必须走 `NodePool`。
3. **事件解耦**：跨系统通信只走 `eventCenter`，事件名统一加进 `GameEvent`。
4. **数值集中**：手感参数在 `GameConfig.ts`，怪物波次在 `WaveData.ts`，禁止散落硬编码。
5. **占位美术**：当前视觉全部是 `Graphics` 矢量占位（普通怪=绿圆、精英怪=红三角、
   主角=蓝圆滑板）；替换正式资源时删除各文件里的 `_drawPlaceholder/_draw` 即可，
   逻辑代码不受影响。
6. **技能系统扩展规矩**：新能力只改 `HeroDef.ts` 配置（AbilityDef：冷却/倍率/行为/目标数），
   通用行为只有 projectile/multi/beam/area 四种，确实不够再在 `HeroCombat.ts` 加行为分支；
   能力里**禁止**直接操作敌人数组、对象池和 killEnemy——索敌走 `findTarget(s)`、
   伤害一律走 `applyDamage/applyAreaDamage`。
8. **池化目标必须持句柄**：缓存敌人引用一律用 `EnemyHandle{enemy, spawnId}`（Enemy 每次出场
   spawnId 递增），校验走 `isEnemyHandleValid`，防止回池复用后旧引用打到"新怪"身上。
   技能/大招是升级卡驱动：卡片纯数据（heroId+upgradeId），选卡后由 BattleManager 找英雄
   调 `applyUpgrade`；选卡暂停期间所有能力冷却/光束冻结，重开时英雄整体重建、技能回到锁定。
9. **怪物扩展规矩**：新增怪型=在 `WaveData.ts` 加 MonsterInfo（behavior+参数），确需新行为
   再在 `Enemy.ts` 加分支；行为状态全部在 `init` 重置（池化复用防串状态）；入场位置在
   `BattleManager._spawnEnemy` 按 behavior 分派；波次混编靠 `WaveInfo.monsters` 数组。
10. **美术接入管线**（缺图自动回退占位，可逐张补图）：
   - AI 产图后跑 `python tools/process_art.py <输入.png> assets/resources/textures/<分类>/<名>.png`
     （抠白底+裁剪+缩放，Python+PIL，参数：最大边长、容差）；
   - 把路径加进 `core/AssetLib.ts` 的 MANIFEST；
   - 实体侧按 key 取图（参考 `Enemy._tryApplyArt`），没图回退 Graphics 占位、不影响运行。
- **全自动生图**：`gpt-image2-skill/`（克隆件不入库）+ `tools/gen_image.py` 包装脚本，
  网关与密钥在 `tools/imagegen.local.json`（**不入库，严禁提交**）。
  生成：`python tools/gen_image.py --prompt "英文提示词" --basename xxx`（默认 2K）
  **提示词背景一律用纯绿幕**（如 `isolated on plain solid pure green background (#00FF00)`），
  处理时用 `allgreen` 模式抠底——绿幕与图标颜色差距大，不会误伤白色/浅色内容（白底抠图会吃掉内部白色）；
  图标类入库前可再做 alpha 腐蚀 1~2px 去掉边缘光晕
  （输出到 `../gen-output/`）→ `process_art.py` 抠底（环形/框类加 `allwhite` 参数）→
  放入 `assets/resources/textures/` → AssetLib 清单登记。

## 五、下一步开发路线

| 阶段 | 内容 |
|---|---|
| ① 玩法扩充 | 技能效果差异化与手感调优、多种怪物（快/远程/Boss）、金币掉落、超能力者英雄 |
| ② 画面升级 | Spine 角色替换占位图形、场景底图、序列帧特效、AudioSource 音效 |
| ③ UI 系统 | 主城界面、弹窗管理器、图集化（TexturePacker / Cocos 自动图集） |
| ④ 服务端对接 | 登录 `wx.login` → 自有服务器 `code2session` → token；存档云同步（HTTP 上报） |
| ⑤ 微信构建 | 构建发布 → 微信小游戏 → 填 AppID → `build/wechatgame` 用微信开发者工具打开 |

## 六、微信小游戏注意事项（提前记住）

- 主包 ≤ 4MB：Spine/音效/场景图全部放**远程资源或分包**，`resources/` 里只留首屏必需。
- 服务器域名必须**已备案 + HTTPS**，并在微信公众平台配置 request 合法域名。
- 每次改完代码在**真机预览**跑一遍：drawcall < 100、内存不持续增长。

## 七、踩坑记录（已修复，AI 迭代必读）

1. **动态创建的节点必须设 UI_2D 层**：`new Node()` 默认在 DEFAULT 层，而 2D 相机
   可见掩码只含 UI_2D/UI_3D → 节点完全不可渲染（黑屏）且**无任何报错**。
   代码创建节点一律走 `core/createUINode.ts`，禁止直接 `new Node()`。
2. **import 来源写错 = 构建直接失败**：真实报错在 `temp/builder/log/web-mobile*.log`
   末尾（主日志只有 "buildScriptCommand failed"），会精确指出文件和行号。
3. 项目路径含空格（如 `qoder workspace`）**不影响**构建，已实测；构建失败先怀疑脚本编译错误。
4. 浏览器里旧标签页刷新偶发卡在 Cocos 启动页（无报错），**开新页面**即可恢复，不是游戏 bug。
5. 占位平衡性：单发普攻 0.7s/发、攻击 80，前期约 2 发击杀一只；
   怪物血量/速度/伤害调 `WaveData.ts`，主角攻速/攻击/射程调 `GameConfig.ts`。
6. **怪物必须在屏幕内才能被索敌和击杀**：索敌（findTarget）与碰撞结算都会跳过
   "中心未越过屏幕顶"的怪物，出生点也控制在屏幕外一点点——不要删这两处可见性判定。
7. **2D 渲染三条铁律（踩过的暗坑，全部无报错）**：
   - 同一节点先后挂 Graphics + Sprite 两个渲染组件，后挂的 Sprite 渲染数据会损坏
     → 整体不可见，增删兄弟节点触发重建时才偶现。占位 Graphics 与立绘 Sprite
     必须分节点（见 Enemy 的 Body/Art 结构）。
   - 中间层级节点缺 UITransform 会断掉子树的 UI 世界矩阵 → 子孙 Sprite 整体不渲染。
     挂渲染节点的链路上每层都要有 UITransform（Enemy 根节点在 onLoad 显式补）。
   - 动态合图开启时 `spriteFrame.width/height` 返回整张图集尺寸（如 2048×2048），
     算宽高比必须用 `spriteFrame.rect.width/height`。

## 八、命令行构建与浏览器验证工作流（无需打开编辑器）

```bash
# 1. 构建 web 版（约 10~25 秒）
"C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" \
  --project "<工程绝对路径>" --build "platform=web-mobile;debug=true"

# 2. 本地静态预览（tools/serve.mjs，零依赖）
node tools/serve.mjs "<工程>/build/web-mobile" 7456
# 打开 http://127.0.0.1:7456

# 3. GM 调试面板（浏览器预览自动出现，屏幕右侧「GM≡」可收起）
#    常规：升级 / 技能全解锁 / 冷却清零 / 清屏 / 下一波 / 车回满 / 车打空(失败)
#    刷怪：小怪 / 狗群 / 野猪 / 双足熊 / 疯鹰（不占波次进度，单测怪型行为）
#    号位开关：输入 1~4（上阵顺序 1步枪 2狙击 3激光 4辐射）→ 点「技能无冷却」「无限大招」
#    切换单个英雄的对应模式（0.1s 施放间隔地板），再次点同号位即关闭；开关跨重开保留
#    微信端无 DOM 自动不生效，无需打包前删除；入口方法在 BattleManager.gm*

# 3. 验证清单（可用浏览器控制台/AI 自动读取 cc.director 状态）
#    场景名 = game；BattleRoot 存在；波次推进；击杀增长；network 无 404
```

截图/录屏黑屏是 WebGL `preserveDrawingBuffer=false` 所致（游戏本身正常）：
把 `build/web-mobile/cocos-js/_virtual_cc-*.js` 里的 `preserveDrawingBuffer: false`
临时替换为 `true` 再刷新即可（仅本地验证用，勿提交）。
