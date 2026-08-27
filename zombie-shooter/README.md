# 《末日航线》工程（立项名 doomsday-route）

> 本项目已立项为**《末日航线》**——末日护送题材竖屏自动战斗微信小游戏，产品设定见《../产品文档.md》，
> 技术选型见《../技术文档.md》。工程目录暂用 `zombie-shooter/`，可随时整体改名。

Cocos Creator **3.8.8** 竖屏 2D 基础版骨架。打开即可运行：运输载具防守、四英雄自动索敌
（步枪/狙击/激光/辐射枪四种普攻行为）、四方向刷怪、经验掉落自动拾取、升级三选一强化、
波次推进与游戏结束重开。占位美术由代码绘制。

## 一、如何打开运行

1. 打开 **Cocos Dashboard** → 项目 → 导入本目录（`zombie-shooter` 文件夹）。
2. 首次打开会自动生成 `library/`、`temp/`、所有 `.meta` 文件，等右下角资源数据库构建完成。
3. 双击打开 `assets/scenes/game.scene`，点击顶部 **预览（Play）** 按钮在浏览器中运行。
4. `tsconfig.json` 在编辑器首次打开前于 VS Code 中会报"找不到 temp/tsconfig.cocos.json"，
   属正常现象，用编辑器打开一次工程后自动生成。

> 若 `game.scene` 打开异常：在编辑器中新建场景（2D）→ 保存为 `assets/scenes/game.scene` 覆盖即可。
> 场景里只有 Canvas/Camera，业务节点全部由代码动态创建，重建场景零成本。

## 二、已实现的核心循环（M1 基础版）

- **运输载具防守**：车尾横贯屏幕底部（只露尾部），四英雄分散站在车尾；怪物主要从
  屏幕上方追着车尾跑、少量从两侧伏击，追到即啃咬耐久，归零=护送失败；
  路面持续后滚营造载具前进感（`ROAD_SCROLL_SPEED` 调滚动速度）
- **四英雄上阵**：步枪手（单发瞄准）/ 狙击手（高伤长射程）/ 激光手（锁定持续光束伤害）/
  辐射枪手（快速穿透弹），各自独立索敌开火，数值全部在 `HeroDef.ts`
- **波次刷怪**（10 波配置表驱动，第 6 波起概率刷精英怪，打完进入无尽模式）
- **经验升级**：击杀掉落经验晶体 → 自动飞向载具拾取 → 升级暂停弹出**三选一强化卡**
  （攻击/射频/射程 × 随机英雄），点选后恢复战斗
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
│  │  │  ├─ BattleManager.ts   战斗总控：部署/刷怪/碰撞/经验/升级/胜负
│  │  │  ├─ HeroDef.ts         英雄定义表（四类武器行为+数值）
│  │  │  ├─ Hero.ts            英雄：按 weapon 分派普攻行为（含激光光束）
│  │  │  ├─ Vehicle.ts         运输载具：耐久载体
│  │  │  ├─ WaveData.ts        波次配置表（后续接 Excel 导表）
│  │  │  ├─ UpgradeCard.ts     三选一卡片定义
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

## 五、下一步开发路线

| 阶段 | 内容 |
|---|---|
| ① 玩法扩充 | 技能升级三选一、多种怪物（快/远程/Boss）、金币掉落 |
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

## 八、命令行构建与浏览器验证工作流（无需打开编辑器）

```bash
# 1. 构建 web 版（约 10~25 秒）
"C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" \
  --project "<工程绝对路径>" --build "platform=web-mobile;debug=true"

# 2. 本地静态预览（tools/serve.mjs，零依赖）
node tools/serve.mjs "<工程>/build/web-mobile" 7456
# 打开 http://127.0.0.1:7456

# 3. 验证清单（可用浏览器控制台/AI 自动读取 cc.director 状态）
#    场景名 = game；BattleRoot 存在；波次推进；击杀增长；network 无 404
```

截图/录屏黑屏是 WebGL `preserveDrawingBuffer=false` 所致（游戏本身正常）：
把 `build/web-mobile/cocos-js/_virtual_cc-*.js` 里的 `preserveDrawingBuffer: false`
临时替换为 `true` 再刷新即可（仅本地验证用，勿提交）。
