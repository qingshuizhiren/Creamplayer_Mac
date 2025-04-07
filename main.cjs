const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron/main");
const { exec } = require("child_process");
const { join } = require("path");
const path = require("path");
const fs = require("fs");
const { session } = require("electron");

let loginWindow;
// 默认下载路径
let downloadPath = path.join(app.getPath("downloads"), "creamplayer");

// Function to execute Python scripts
async function runScript(binPath, args, onSuccess, onError) {
  // 检测操作系统类型，针对不同平台选择不同的命令
  let command = '';
  
  // 处理路径中的特殊字符和空格
  const escapedDownloadPath = downloadPath.replace(/"/g, '\\"');
  
  // 添加更多调试信息
  console.log("应用打包状态:", app.isPackaged ? "已打包" : "开发模式");
  console.log("资源路径:", process.resourcesPath);
  console.log("应用路径:", app.getAppPath());
  console.log("当前工作目录:", process.cwd());
  
  if (process.platform === "darwin" || process.platform === "linux") {
    // macOS 或 Linux：使用打包好的可执行文件而不是Python
    // 使用app.getAppPath()获取应用根目录的绝对路径
    const appPath = app.isPackaged 
      ? path.dirname(app.getAppPath())
      : app.getAppPath();
    
    // 获取可执行文件的绝对路径 - 修正路径结构
    let executablePath = app.isPackaged
      ? path.join(process.resourcesPath, "resources", "dist", "musicdownloader")
      : path.join(appPath, "resources", "dist", "musicdownloader");
    
    console.log("可执行文件路径:", executablePath);
    console.log("应用路径:", appPath);
    
    // 列出可能的目录内容来帮助调试
    if (app.isPackaged) {
      try {
        const resourcesDir = path.join(process.resourcesPath);
        console.log("资源目录内容:", fs.readdirSync(resourcesDir));
        
        // 尝试列出下一级目录
        const appResourcesDir = path.join(process.resourcesPath, "resources");
        if (fs.existsSync(appResourcesDir)) {
          console.log("app/resources目录内容:", fs.readdirSync(appResourcesDir));
          
          // 尝试列出dist目录
          const distDir = path.join(appResourcesDir, "dist");
          if (fs.existsSync(distDir)) {
            console.log("dist目录内容:", fs.readdirSync(distDir));
          } else {
            console.log("dist目录不存在!");
          }
        } else {
          console.log("resources目录不存在!");
        }
      } catch (err) {
        console.error("列出目录内容错误:", err);
      }
    }
    
    // 验证可执行文件是否存在
    if (!fs.existsSync(executablePath)) {
      console.error("错误: 可执行文件不存在:", executablePath);
      // 尝试查找其他可能位置
      const alternativePaths = [
        path.join(process.resourcesPath, "app", "resources", "dist", "musicdownloader"),
        path.join(process.resourcesPath, "dist", "musicdownloader"),
        path.join(app.getAppPath(), "resources", "dist", "musicdownloader"),
      ];
      
      console.log("尝试查找可执行文件的其他位置...");
      let foundPath = null;
      for (const altPath of alternativePaths) {
        console.log("检查路径:", altPath);
        if (fs.existsSync(altPath)) {
          console.log("找到可执行文件:", altPath);
          foundPath = altPath;
          break;
        }
      }
      
      if (foundPath) {
        console.log("使用找到的路径:", foundPath);
        // 使用找到的路径
        executablePath = foundPath;
      } else {
        if (onError) {
          onError(new Error(`可执行文件不存在: ${executablePath}`), "File not found");
        }
        return;
      }
    }
    
    // 设置可执行权限（对于macOS和Linux）- 使用更可靠的方法
    try {
      fs.chmodSync(executablePath, 0o755); // rwxr-xr-x
      console.log("设置文件权限为755");
      
      // 额外使用命令行方式设置权限
      const { execSync } = require('child_process');
      execSync(`chmod +x "${executablePath}"`, { encoding: 'utf8' });
      console.log("通过命令行设置可执行权限");
    } catch (err) {
      console.warn("设置可执行权限失败:", err);
    }
    
    // 添加下载路径参数
    command = `"${executablePath}"${args} --download-dir="${escapedDownloadPath}"`;
  } else {
    // Windows：使用打包好的Windows可执行文件 - 同样修正路径
    let exePath = app.isPackaged
      ? path.join(process.resourcesPath, "resources", "dist", "musicdownloader.exe")
      : path.join(app.getAppPath(), "resources", "dist", "musicdownloader.exe");
    
    // 验证可执行文件是否存在
    if (!fs.existsSync(exePath)) {
      console.error("错误: 可执行文件不存在:", exePath);
      // 尝试查找其他可能位置
      const alternativePaths = [
        path.join(process.resourcesPath, "app", "resources", "dist", "musicdownloader.exe"),
        path.join(process.resourcesPath, "dist", "musicdownloader.exe"),
        path.join(app.getAppPath(), "resources", "dist", "musicdownloader.exe"),
      ];
      
      console.log("尝试查找可执行文件的其他位置...");
      let foundPath = null;
      for (const altPath of alternativePaths) {
        console.log("检查路径:", altPath);
        if (fs.existsSync(altPath)) {
          console.log("找到可执行文件:", altPath);
          foundPath = altPath;
          break;
        }
      }
      
      if (foundPath) {
        console.log("使用找到的路径:", foundPath);
        // 使用找到的路径
        exePath = foundPath;
      } else {
        if (onError) {
          onError(new Error(`可执行文件不存在: ${exePath}`), "File not found");
        }
        return;
      }
    }
      
    command = `"${exePath}"${args} --download-dir="${escapedDownloadPath}"`;
  }

  console.log("执行命令:", command);

  // 准备环境变量对象
  const env = { ...process.env };
  
  const options = {
    env,
    maxBuffer: 1024 * 1024 * 10, // 增加允许的最大输出缓冲区为10MB
  };

  exec(command, options, (error, stdout, stderr) => {
    if (error) {
      console.error("执行脚本时出错:", error.message);
      console.error("错误代码:", error.code);
      console.error("错误堆栈:", error.stack);
      console.error("错误输出:", stderr);
      
      // 显示更用户友好的错误信息
      let errorMessage = "下载过程中出现错误。";
      
      if (error.code === 'ENOENT') {
        errorMessage = "找不到Python或必要的可执行文件。请确保您的系统安装了Python 3.x。";
      } else if (stderr.includes("ModuleNotFoundError")) {
        errorMessage = "缺少必要的Python依赖。请运行 'pip install requests eyed3 mutagen'。";
      } else if (stderr.includes("Permission denied")) {
        errorMessage = "权限被拒绝。请检查下载目录的访问权限。";
      }
      
      dialog.showErrorBox("下载错误", errorMessage);
      
      if (onError) onError(error, stderr);
      return;
    }

    console.log("命令执行完成:", command);
    console.log("脚本输出:", stdout);

    if (stdout.includes("successfully")) {
      console.log("脚本执行成功");
      if (onSuccess) onSuccess(stdout);
    } else {
      console.error("未预期的脚本输出");
      console.error("完整输出:", stdout);
      
      dialog.showErrorBox("下载未完成", "下载过程可能未正确完成。请检查网络连接并重试。");
      
      if (onError) onError(new Error("未预期的脚本输出"), stdout);
    }
  });
}

function setTitle(win) {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  let greeting = "";

  if (currentHour >= 0 && currentHour < 12) {
    greeting = "Creamplayer - Good Morning";
  } else if (currentHour >= 12 && currentHour < 19) {
    greeting = "Creamplayer - Good Afternoon";
  } else {
    greeting = "Creamplayer - Good Evening";
  }

  win.webContents.on("did-finish-load", () => {
    win.webContents.executeJavaScript(`document.title = "${greeting}"`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
    },
    title: "Creamplayer",
    autoHideMenuBar: true,
  });
  setTitle(win);

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.maximize();
    win.webContents.openDevTools();
  } else {
    win.loadFile("./dist/index.html");
  }
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });

  loginWindow.loadURL("https://music.163.com/login");

  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}

ipcMain.handle("netease-login", async () => {
  if (loginWindow) {
    loginWindow.focus();
  } else {
    createLoginWindow();
  }
});

ipcMain.handle("get-netease-login", async () => {
  try {
    const cookies = await loginWindow.webContents.session.cookies.get({
      url: "https://music.163.com",
    });
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    return cookieString;
  } catch (error) {
    return null;
  }
});

ipcMain.handle("download", async (event, args) => {
  try {
    // 检查参数是否包含必要的信息
    if (!args || !args.includes('-u "')) {
      console.error("Missing required download URL argument");
      return false;
    }

    // 确保下载目录存在
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    return new Promise((resolve) => {
      // 模拟下载进度更新
      let progressCounter = 0;
      const progressInterval = setInterval(() => {
        progressCounter += 4; // 降低增量，使进度更新更平滑
        
        // 发送进度事件到渲染进程，范围0-100
        if (progressCounter <= 100) {
          console.log(`[main] 发送下载进度事件: ${progressCounter}%`);
          event.sender.send('download-progress', progressCounter);
        }
        
        if (progressCounter >= 100) {
          console.log(`[main] 进度达到100%，清除进度计时器`);
          clearInterval(progressInterval);
        }
      }, 300); // 减少间隔，使进度更新更频繁
      
      runScript(
        null, // 移除binPath参数，我们在runScript中已经确定了正确的路径
        args,
        (stdout) => {
          console.log("Download process completed successfully");
          
          // 确保进度达到100%
          clearInterval(progressInterval);
          console.log(`[main] 下载完成，发送最终进度事件: 100%`);
          event.sender.send('download-progress', 100);
          
          const match = stdout.match(/successfully:(.*)/);
          if (match && match[1]) {
            const result = match[1].trim();
            const decodedUrl = decodeURIComponent(result);
            resolve(decodedUrl);
          } else {
            console.log("Download completed but no success message found");
            resolve(null);
          }
        },
        (error, stderr) => {
          console.error("Download failed", error);
          console.error("Stderr:", stderr);
          
          // 停止进度更新
          console.log(`[main] 下载失败，清除进度计时器`);
          clearInterval(progressInterval);
          
          resolve(false);
        },
      );
    });
  } catch (error) {
    console.error("Unexpected error in download handler:", error);
    return false;
  }
});

ipcMain.handle("open", async (event, relativePath) => {
  // 使用当前的下载路径而不是相对路径
  const fullPath = path.join(downloadPath, relativePath);
  
  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
  } else {
    // 尝试作为绝对路径
    const absolutePath = path.resolve(relativePath);
    if (fs.existsSync(absolutePath)) {
      shell.showItemInFolder(absolutePath);
    } else {
      console.error("Path does not exist:", fullPath, "or", absolutePath);
    }
  }
});

// 添加设置下载路径的IPC处理程序
ipcMain.handle("set-download-path", async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择下载文件夹',
    buttonLabel: '选择文件夹'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    downloadPath = result.filePaths[0];
    // 创建目录(如果不存在)
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    return downloadPath;
  }
  return null;
});

// 添加获取当前下载路径的IPC处理程序
ipcMain.handle("get-download-path", () => {
  return downloadPath;
});

// 解析网易云音乐短链接，返回歌曲ID
ipcMain.handle("resolveShortUrl", async (event, shortUrl) => {
  try {
    console.log('主进程: 开始解析短链接:', shortUrl);
    
    // 使用Node.js的http/https模块来处理重定向
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    // 清理并规范化URL
    const cleanUrl = shortUrl.trim().replace(/[\n\r\s]+/g, '');
    if(!cleanUrl.match(/^https?:\/\//i)) {
      console.log('主进程: URL格式不正确，尝试添加HTTPS前缀');
      shortUrl = 'https://' + cleanUrl;
    } else {
      shortUrl = cleanUrl;
    }
    
    console.log('主进程: 规范化后的URL:', shortUrl);
    
    // 防止无限重定向
    let redirectCount = 0;
    const MAX_REDIRECTS = 10;
    
    // 尝试直接从URL中提取歌曲ID（如果URL已经包含ID）
    const directIdMatch = shortUrl.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?song\?id=(\d+)/i);
    if (directIdMatch && directIdMatch[1]) {
      const songId = directIdMatch[1];
      console.log('主进程: 直接从URL提取到歌曲ID:', songId);
      return songId;
    }
    
    // 创建一个Promise来处理异步请求
    const resolvePromise = new Promise((resolve, reject) => {
      // 解析URL获取协议
      const parsedUrl = url.parse(shortUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      console.log('主进程: 使用协议:', parsedUrl.protocol);
      
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Dest': 'document',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 20000, // 增加超时时间到20秒
        followRedirects: false // 禁用自动重定向，我们手动处理
      };
      
      console.log('主进程: 发送HTTP请求到:', shortUrl);
      
      // 用于手动处理重定向的函数
      const handleRedirect = (urlToFollow) => {
        console.log('主进程: 开始处理重定向到:', urlToFollow);
        
        // 防止无限重定向
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          console.error('主进程: 超过最大重定向次数');
          return reject(new Error('Maximum redirects exceeded'));
        }
        
        // 如果重定向URL包含网易云音乐歌曲ID，直接提取
        const songIdMatch = urlToFollow.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?song\?id=(\d+)/i);
        if (songIdMatch && songIdMatch[1]) {
          console.log('主进程: 从重定向URL直接提取到歌曲ID:', songIdMatch[1]);
          return resolve(songIdMatch[1]);
        }
        
        // 解析URL获取协议
        const redirectParsedUrl = url.parse(urlToFollow);
        const redirectProtocol = redirectParsedUrl.protocol === 'https:' ? https : http;
        
        console.log('主进程: 重定向使用协议:', redirectParsedUrl.protocol);
        
        // 发送请求到重定向URL
        const redirectReq = redirectProtocol.request(urlToFollow, options, handleResponse);
        
        redirectReq.on('error', (err) => {
          console.error('主进程: 重定向请求失败:', err);
          reject(err);
        });
        
        redirectReq.on('timeout', () => {
          console.error('主进程: 重定向请求超时');
          redirectReq.destroy();
          reject(new Error('Redirect request timeout'));
        });
        
        redirectReq.end();
      };
      
      // 处理HTTP响应
      const handleResponse = (res) => {
        console.log('主进程: 收到HTTP响应, 状态码:', res.statusCode);
        
        // 记录所有响应头，对调试有帮助
        const headersLog = {};
        for (const [key, value] of Object.entries(res.headers)) {
          headersLog[key] = value;
        }
        console.log('主进程: 响应头:', JSON.stringify(headersLog, null, 2));
        
        // 检查状态码，3xx表示重定向
        if (res.statusCode >= 300 && res.statusCode < 400) {
          const redirectUrl = res.headers.location;
          if (!redirectUrl) {
            console.error('主进程: 收到重定向响应，但缺少location头');
            return resolve(null);
          }
          
          // 确保重定向URL是绝对URL
          let absoluteRedirectUrl = redirectUrl;
          if (redirectUrl.startsWith('/')) {
            const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
            absoluteRedirectUrl = `${baseUrl}${redirectUrl}`;
            console.log('主进程: 将相对URL转换为绝对URL:', absoluteRedirectUrl);
          } else if (!redirectUrl.match(/^https?:\/\//i)) {
            // 处理可能的特殊格式URL，比如没有协议的 //music.163.com/...
            if (redirectUrl.startsWith('//')) {
              absoluteRedirectUrl = `${parsedUrl.protocol}${redirectUrl}`;
            } else {
              const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
              const basePath = parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1);
              absoluteRedirectUrl = `${baseUrl}${basePath}${redirectUrl}`;
            }
            console.log('主进程: 将特殊格式URL转换为绝对URL:', absoluteRedirectUrl);
          }
          
          console.log('主进程: 收到重定向URL:', absoluteRedirectUrl);
          
          // 递归处理重定向
          return handleRedirect(absoluteRedirectUrl);
        }
        
        // 如果不是重定向，读取内容并尝试解析
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('主进程: 响应内容长度:', data.length);
          
          // 尝试多种方式从HTML内容中提取歌曲ID
          
          // 方法1: 寻找包含完整网易云音乐歌曲链接的元素
          const allMatches = data.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?song\?id=(\d+)/gi) || [];
          console.log('主进程: 在响应内容中找到潜在的音乐链接:', allMatches);
          
          if (allMatches.length > 0) {
            // 提取第一个匹配项的ID
            const firstMatchId = allMatches[0].match(/id=(\d+)/i);
            if (firstMatchId && firstMatchId[1]) {
              console.log('主进程: 从响应内容提取歌曲ID:', firstMatchId[1]);
              return resolve(firstMatchId[1]);
            }
          }
          
          // 方法2: 尝试从meta标签或其他位置寻找song ID
          const songIdRegex = /song\?id=(\d+)/gi;
          let songMatches;
          const songIds = [];
          while ((songMatches = songIdRegex.exec(data)) !== null) {
            songIds.push(songMatches[1]);
          }
          
          if (songIds.length > 0) {
            console.log('主进程: 找到所有可能的歌曲ID:', songIds);
            return resolve(songIds[0]);  // 返回第一个找到的ID
          }
          
          // 方法3: 尝试查找包含ID的og:url或其他Meta标签
          const metaMatch = data.match(/<meta\s+(?:property|name)=["'](?:og:url|music:song)["']\s+content=["'](?:https?:\/\/)?music\.163\.com\/(?:#\/)?song\?id=(\d+)["']/i);
          if (metaMatch && metaMatch[1]) {
            console.log('主进程: 从Meta标签提取歌曲ID:', metaMatch[1]);
            return resolve(metaMatch[1]);
          }
          
          // 方法4: 尝试查找包含data-rid属性的元素
          const dataRidMatch = data.match(/data-rid=["'](\d+)["']/i);
          if (dataRidMatch && dataRidMatch[1]) {
            console.log('主进程: 从data-rid属性提取可能的歌曲ID:', dataRidMatch[1]);
            return resolve(dataRidMatch[1]);
          }
          
          // 方法5: 尝试从JSON数据中提取
          try {
            const jsonMatch = data.match(/window\.REDUX_STATE\s*=\s*({.+?})<\/script>/);
            if (jsonMatch && jsonMatch[1]) {
              const jsonData = JSON.parse(jsonMatch[1]);
              if (jsonData.Song && jsonData.Song.id) {
                console.log('主进程: 从REDUX_STATE提取歌曲ID:', jsonData.Song.id);
                return resolve(jsonData.Song.id.toString());
              }
            }
          } catch (e) {
            console.warn('主进程: 解析JSON失败:', e);
          }
          
          console.log('主进程: 无法从响应内容提取歌曲ID');
          resolve(null);
        });
      };
      
      // 发送初始请求
      const req = protocol.request(shortUrl, options, handleResponse);
      
      req.on('error', (err) => {
        console.error('主进程: 解析短链接请求失败:', err);
        reject(err);
      });
      
      req.on('timeout', () => {
        console.error('主进程: 解析短链接请求超时');
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      // 结束请求
      req.end();
    });
    
    // 等待解析完成并返回结果
    const songId = await resolvePromise;
    console.log('主进程: 最终解析结果:', songId);
    return songId;
  } catch (error) {
    console.error('主进程: 解析短链接失败:', error);
    return null;
  }
});

// Electron app lifecycle
app.whenReady().then(() => {
  // 确保下载目录存在
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  // 不再需要检查Python依赖
  // 已经打包到可执行文件中

  createWindow();

  // Allow to set cookie
  const defaultSession = session.defaultSession;
  defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const cookieValue = details.requestHeaders["flag"];
    if (cookieValue) {
      delete details.requestHeaders["flag"];
      details.requestHeaders.Cookie = cookieValue;
    }

    callback({ requestHeaders: details.requestHeaders });
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
