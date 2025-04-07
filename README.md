# Creamplayer_Mac

一个基于Electron的音乐播放器应用，根据[Creamplayer](https://github.com/Beadd/Creamplayer)修改而来。

## 开发环境设置

1. 安装依赖：
```bash
npm install
```

2. 运行开发模式：
```bash
npm run dev
```

3. 构建生产版本：
```bash
npm run build
```

4. 打包应用：
```bash
# macOS
npm run make:mac

# Windows
npm run make:win

# Linux
npm run make:linux
```

## 项目结构

- `src/` - 源代码目录
  - `api/` - API接口
  - `components/` - Vue组件
  - `types/` - TypeScript类型定义
  - `utils/` - 工具函数
  - `locales/` - 国际化文件
- `public/` - 静态资源
- `resources/` - 应用资源
- `main.cjs` - Electron主进程
- `preload.cjs` - 预加载脚本
- `vite.config.ts` - Vite配置
- `forge.config.cjs` - Electron Forge配置

## 技术栈

- Electron
- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- DaisyUI

## 许可证

MIT

# Quick Start
[开箱即用creamplayer-win32-x64.zip](https://github.com/Beadd/Creamplayer/releases)

# FAQ
> 有些MP3设备无法检测到内嵌的歌词的话可以请勾选单独下载歌词文件的选项试试

> 如果一次加载过多的话可能会遭到网易云频率限制，可以加载一会停一会，或者明天再试

> 后续会支持QQ音乐，并用nuxt重构，和加载过多的卡顿问题

# Preview
![](https://raw.githubusercontent.com/Beadd/Creamplayer/refs/heads/main/preview.png)
