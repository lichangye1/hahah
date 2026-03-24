#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "未找到 Python，请先安装 Python 3。"
  exit 1
fi

"$PYTHON_BIN" -m http.server 8000 &
SERVER_PID=$!
sleep 1

URL="http://localhost:8000/index.html"
echo "游戏已启动：$URL"

if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

wait "$SERVER_PID"
