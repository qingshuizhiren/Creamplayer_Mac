@echo off
echo === 开始清理Creamplayer项目 ===
echo 清理前磁盘空间使用情况：
dir /s /-c | findstr "个文件" | findstr "个目录"

echo.
echo 删除构建和发布目录...
if exist out rmdir /s /q out
if exist dist rmdir /s /q dist
if exist clean-package* rmdir /s /q clean-package*
if exist fixed-* rmdir /s /q fixed-*

echo.
echo 清理node_modules (可选)...
echo 警告：删除node_modules会导致需要重新安装依赖
echo 如果要保留node_modules以确保应用可以立即运行，请手动删除
echo 或取消下面命令的注释（移除REM）
REM if exist node_modules rmdir /s /q node_modules

echo.
echo 删除临时文件和缓存...
del /s /q *.log >nul 2>&1
del /s /q .DS_Store >nul 2>&1
del /s /q Thumbs.db >nul 2>&1
del /s /q desktop.ini >nul 2>&1

echo.
echo 删除其他不必要的文件...
del /s /q *.zip >nul 2>&1
del /s /q *.dmg >nul 2>&1

echo.
echo 简化脚本文件...
if exist clean-dist.ps1 del /q clean-dist.ps1
if exist create-source-distribution.ps1 del /q create-source-distribution.ps1

echo.
echo 清理完成！
echo 清理后磁盘空间使用情况：
dir /s /-c | findstr "个文件" | findstr "个目录"

echo.
echo === 清理完成 ===
echo 如果删除了node_modules，请记得运行 'npm install' 来重新安装依赖
echo 要运行应用，可以执行：
echo   npm install (如果删除了node_modules)
echo   npm run dev (开发模式)
echo   npm run build ^&^& npm run start (生产模式)

pause 