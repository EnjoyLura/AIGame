# AIG —— 《王国守望》（暂定名）游戏仓库

剑与魔法据点防守题材竖屏自动战斗微信小游戏（对标《王国保卫战》）。单人开发，直接在 `main` 上提交。

## 目录地图

| 路径 | 内容 |
| --- | --- |
| `docs/` | 产品文档、技术文档 |
| `zombie-shooter/` | Cocos Creator 3.8.8 游戏工程（唯一工程目录），详见其内 `README.md` |
| `zombie-shooter/art-spec/` | 美术风格基准、生图规范、资源槽位清单、参考素材（`reference/`） |
| `zombie-shooter/prototype/` | Cocos 化之前的网页原型存档 |
| `ux-layout-review/` | 自绘 UX 交互稿（battle / popups）+ 断言检查器 + 评审记录 |
| `ux-redesign/` | 初版网页设计稿存档（开发时禁止读取，仅作对照） |

不入库（gitignore）：`gen-output/`（AI 生图原始输出）、`gpt-image2-skill/`（生图 skill 克隆件）、
`zombie-shooter/tools/imagegen.local.json`（生图 APIKey，严禁提交）、构建产物 `build/ library/ temp/`。

## 常用命令

```sh
# 构建 web-mobile（成功标志：日志出现 build Task (web-mobile) Finished）
"/c/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe" \
  --project "D:\qoder workspace\AIG\zombie-shooter" --build "platform=web-mobile;debug=true"

# 本地预览构建产物（零依赖静态服务器）
node zombie-shooter/tools/serve.mjs zombie-shooter/build/web-mobile 8113

# 手机外网可玩（免注册 Cloudflare 快速隧道，打印临时公网地址）
bash zombie-shooter/tools/tunnel.sh

# 收尾验证链（全部 0 FAIL 视为通过）
cd zombie-shooter
node tools/tc.js && node tools/check-ux-refactor.js && node tools/check-popup-ux.js \
  && node tools/check-art-manifest.mjs
node ../ux-layout-review/check-battle.mjs && node ../ux-layout-review/check-popups.mjs
```

## 美术资源替换

换图不换 key：`zombie-shooter/assets/resources/textures/<key>.png` 同名覆盖即全游戏生效，
槽位与代码引用对账跑 `node zombie-shooter/tools/check-art-manifest.mjs`。
规范、prompt 模板与验收清单见 `zombie-shooter/art-spec/STYLE-SPEC.md`。

协作约定（AI 工作方式、验证链、样式红线）见 `AGENTS.md`。
