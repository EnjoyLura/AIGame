#!/usr/bin/env bash
# 构建后执行：
# 1) 向 index.html 注入唯一构建时间戳（配合 HUD 左下角版本戳识别设备缓存）
# 2) 引擎补丁：解除系统字体 100px 栅格化上限——超过 100 物理像素的文字
#    会被按 100px 栅格再 GPU 拉大导致发糊（HUD 大标题/伤害数字重灾区）。
#    提到 320 后文字按设备真实分辨率栅格化（引擎 2048 画布上限自动兜底）。
# 用法：bash tools/postbuild.sh
set -e
TS=$(date +%m%d-%H%M)
HTML="build/web-mobile/index.html"
if grep -q "__BUILD_TIME" "$HTML"; then
  sed -i "s/window.__BUILD_TIME='[^']*'/window.__BUILD_TIME='$TS'/" "$HTML"
else
  sed -i "s|<body>|<body><script>window.__BUILD_TIME='$TS'</script>|" "$HTML"
fi
echo "build stamp: $TS"

# 缓存击穿：web-mobile 的 JS 文件名固定（无 hash），浏览器可能继续用旧缓存脚本——
# 版本戳在 index.html 里每次都更新，但真正跑的还是旧 JS（表现为“改了却没生效”）。
# 给脚本引用追加构建戳查询参数；正则同时吞掉旧参数，重复执行不叠加。
bust() {
  sed -i -E "s|($1)(\?v=[^\"]*)?\"|\1?v=$TS\"|" "$HTML"
}
bust "src/polyfills\.bundle\.js"
bust "src/system\.bundle\.js"
bust "src/import-map\.json"
sed -i -E "s|(\./index\.js)(\?v=[^']*)?'|\1?v=$TS'|" "$HTML"
echo "cache bust: bundle.js / import-map.json / index.js?v=$TS"

# 字体栅格化上限补丁（文件名带 hash，用通配匹配；已打过补丁则跳过）
for JS in build/web-mobile/cocos-js/_virtual_cc-*.js; do
  [ -f "$JS" ] || continue
  if grep -q "this._maxFontSize = 100;" "$JS"; then
    sed -i "s/this._maxFontSize = 100;/this._maxFontSize = 320;/" "$JS"
    echo "engine patch: _maxFontSize 100 -> 320 ($JS)"
  fi
done
