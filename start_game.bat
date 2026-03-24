@echo off
setlocal
cd /d "%~dp0"

echo 正在启动本地游戏服务器...
start "PVZ-Server" cmd /k "py -m http.server 8000 || python -m http.server 8000"

timeout /t 1 >nul
start "" http://localhost:8000/index.html

echo 已打开游戏页面： http://localhost:8000/index.html
echo 如果没有自动打开，请手动复制链接到浏览器。
endlocal
