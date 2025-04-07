#!/bin/bash

# 清理Creamplayer项目，删除不必要的文件以便分发代码
# 同时确保代码库仍然可以正常运行

echo "=== 开始清理Creamplayer项目 ==="
echo "清理前磁盘空间使用情况："
du -sh .

# 删除不需要的构建和发布目录
echo "删除构建和发布目录..."
rm -rf out
rm -rf dist
rm -rf clean-package*
rm -rf fixed-*

# 清理node_modules (可选)
# 警告：删除node_modules会导致需要重新安装依赖
# 如果要保留node_modules以确保应用可以立即运行，请注释掉下面这行
# rm -rf node_modules

# 清理临时文件和缓存
echo "删除临时文件和缓存..."
find . -name "*.log" -type f -delete
find . -name ".DS_Store" -type f -delete
find . -name "Thumbs.db" -type f -delete
find . -name "desktop.ini" -type f -delete
find . -name ".cache" -type d -exec rm -rf {} +
find . -name ".npm" -type d -exec rm -rf {} +

# 清理其他不必要的文件(自定义)
echo "删除其他不必要的文件..."
find . -name "*.zip" -type f -delete
find . -name "*.dmg" -type f -delete

# 保留一个简化的脚本版本
echo "简化脚本文件..."
rm -f clean-dist.ps1
rm -f create-source-distribution.ps1

# 显示清理后的结果
echo "清理完成！"
echo "清理后磁盘空间使用情况："
du -sh .

echo ""
echo "=== 清理完成 ==="
echo "如果删除了node_modules，请记得运行 'npm install' 来重新安装依赖"
echo "要运行应用，可以执行："
echo "  npm install (如果删除了node_modules)"
echo "  npm run dev (开发模式)"
echo "  npm run build && npm run start (生产模式)" 