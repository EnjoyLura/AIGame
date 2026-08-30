#!/usr/bin/env bash
# 构建后执行：向 index.html 注入唯一构建时间戳（配合 HUD 左下角版本戳识别设备缓存）
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
