#!/bin/bash
# 一键把 build/web-mobile 暴露到公网（手机不同 WiFi 可玩）
# 用法: bash tools/tunnel.sh   （需先构建；temp/cloudflared.exe 已下载则复用）
set -e
cd "$(dirname "$0")/.."

# 1) 本地静态服务（no-store 头，换图即时生效；已监听 8113 则跳过）
if ! netstat -ano | grep -q ":8113.*LISTENING"; then
  echo "启动本地服务 :8113 ..."
  (node tools/serve.mjs build/web-mobile 8113 127.0.0.1 >/dev/null 2>&1 &)
  sleep 2
fi

# 2) cloudflared 就绪（首次自动下载）
CF=temp/cloudflared.exe
if [ ! -f "$CF" ]; then
  echo "下载 cloudflared ..."
  curl -L --connect-timeout 20 -o "$CF" \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
fi

# 3) 快速隧道（免注册；URL 每次重启会变， CTRL+C 结束即关闭外网入口）
echo "建立公网隧道 ..."
"$CF" tunnel --url http://127.0.0.1:8113 --no-autoupdate 2>&1 | tee temp/tunnel.log | grep --line-buffered -oE "https://[a-z0-9-]+\.trycloudflare\.com" | while read -r u; do
  echo ""
  echo "=========================================="
  echo "  手机浏览器打开:  $u"
  echo "=========================================="
done
