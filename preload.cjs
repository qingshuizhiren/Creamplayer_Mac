window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require("electron");

// 存储进度更新回调
let progressCallback = null;

// 监听下载进度事件
ipcRenderer.on('download-progress', (_event, progress) => {
  console.log(`[preload] 收到下载进度事件: ${progress}%`);
  if (progressCallback) {
    console.log(`[preload] 调用进度回调函数: ${progress}%`);
    progressCallback(progress);
  } else {
    console.log(`[preload] 没有注册进度回调，忽略事件`);
  }
});

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, args) => {
    const validChannels = ["download", "open", "netease-login", "get-netease-login", "set-download-path", "get-download-path", "resolveShortUrl"];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
  },
  setDownloadPath: () => ipcRenderer.invoke("set-download-path"),
  getDownloadPath: () => ipcRenderer.invoke("get-download-path"),
  // 添加下载进度监听器
  onDownloadProgress: (callback) => {
    console.log(`[preload] 注册下载进度回调函数`);
    progressCallback = callback;
  },
  // 移除下载进度监听器
  removeDownloadProgress: () => {
    console.log(`[preload] 移除下载进度回调函数`);
    progressCallback = null;
  }
});
