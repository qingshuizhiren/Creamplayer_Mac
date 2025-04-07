import type { Song } from "../types/song";

function checkFileName(name: string) {
  const invalidRegex = /[\\/:*?<>|]/g;
  return name.replace(invalidRegex, "-");
}

// 从分享文本中提取网易云音乐链接
function extractMusicLink(shareText: string): string {
  if (!shareText) {
    console.warn('提取音乐链接: 输入为空');
    return '';
  }
  
  console.log('提取音乐链接: 输入内容长度:', shareText.length);
  console.log('提取音乐链接: 输入内容预览:', shareText.substring(0, Math.min(100, shareText.length)));
  
  // 先清理输入文本，去除多余空格和换行符
  const cleanedText = shareText.trim();
  
  // 如果输入已经是有效的http链接，直接返回
  if (cleanedText.startsWith('http://') || cleanedText.startsWith('https://')) {
    // 检查是否是短链接，如果是短链接，保持原样返回
    if (cleanedText.includes('163cn.tv') || cleanedText.match(/music\.163\.com\/[a-zA-Z0-9]+/i)) {
      console.log('提取音乐链接: 检测到网易云短链接，保持原样返回:', cleanedText);
      return cleanedText;
    }
    
    // 检查是否是标准歌曲链接
    if (cleanedText.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?song\?id=\d+/i)) {
      console.log('提取音乐链接: 检测到标准歌曲链接:', cleanedText);
      return cleanedText;
    }
    
    console.log('提取音乐链接: 输入是有效链接:', cleanedText);
    return cleanedText;
  }

  // 尝试匹配分享文本中的短链接（多种格式）
  const shortUrlMatchers = [
    /(https?:\/\/163cn\.tv\/[a-zA-Z0-9]+)/i,
    /(https?:\/\/music\.163\.com\/[a-zA-Z0-9]+)/i,
    /(https?:\/\/y\.music\.163\.com\/[a-zA-Z0-9]+)/i
  ];
  
  for (const regex of shortUrlMatchers) {
    const match = cleanedText.match(regex);
    if (match && match[1]) {
      console.log('提取音乐链接: 从分享文本中提取到网易云短链接:', match[1]);
      return match[1];
    }
  }

  // 尝试匹配分享文本中的标准链接
  const standardUrlMatchers = [
    /(https?:\/\/music\.163\.com[^\s)]+song\?id=\d+[^\s)]*)/i,
    /(https?:\/\/music\.163\.com[^\s)]+playlist\?id=\d+[^\s)]*)/i,
    /(https?:\/\/music\.163\.com[^\s)]+album\?id=\d+[^\s)]*)/i,
    /(https?:\/\/music\.163\.com[^\s)]+)/i
  ];
  
  for (const regex of standardUrlMatchers) {
    const match = cleanedText.match(regex);
    if (match && match[1]) {
      console.log('提取音乐链接: 从分享文本中提取到标准链接:', match[1]);
      return match[1];
    }
  }
  
  // 尝试匹配直接包含ID的情况
  const idMatchers = [
    /song\?id=(\d+)/i,
    /playlist\?id=(\d+)/i,
    /album\?id=(\d+)/i
  ];
  
  for (const regex of idMatchers) {
    const match = cleanedText.match(regex);
    if (match) {
      const fullUrl = `https://music.163.com/#/${match[0]}`;
      console.log('提取音乐链接: 直接从文本中提取到ID并构建完整链接:', fullUrl);
      return fullUrl;
    }
  }
  
  // 如果没找到链接，返回原文本
  console.log('提取音乐链接: 未找到链接，返回原文本');
  return cleanedText;
}

export const electron = {
  // @saveLyric: Save lyrics to a separate file
  download: async (song: Song, saveLyric: boolean = false, progressCallback?: (progress: number) => void) => {
    console.log('API download: 开始下载', song.name);
    
    // 检查并处理歌曲URL
    if (!song.url) {
      console.error('缺少歌曲URL');
      return false;
    }

    // 处理可能的分享文本格式
    song.url = extractMusicLink(song.url);
    console.log('处理后的下载URL:', song.url);
    
    // 再次检查处理后的URL是否有效
    if (!song.url.startsWith('http')) {
      console.error('处理后的URL仍然无效:', song.url);
      return false;
    }

    // 检查封面URL
    if (!song.cover || !song.cover.startsWith('http')) {
      console.warn('无效或缺失的封面URL:', song.cover);
    }

    // 检查歌词URL
    if (!song.lyrics || !song.lyrics.startsWith('http')) {
      console.warn('无效或缺失的歌词URL:', song.lyrics);
    }

    // 正确转义和处理参数
    const name = encodeURIComponent(checkFileName(song.name));
    const artist = encodeURIComponent(checkFileName(song.artist));
    const album = encodeURIComponent(checkFileName(song.album));
    
    // 不要对URL进行encodeURIComponent，避免双重编码
    const songUrl = song.url;
    const coverUrl = song.cover || '';
    const lyricsUrl = song.lyrics || '';
    
    // 发布时间，确保正确格式
    const publishTime = song.publishTime ? song.publishTime : '';

    // 使用双引号包裹值，避免shell解析问题
    // prettier-ignore
    let args = 
        ` -s "${songUrl}"` +
        ` -f "${name} - ${artist}"` +
        ` -u "${songUrl}"` +  
        ` -c "${coverUrl}"` +
        ` -l "${lyricsUrl}"` +
        ` -i ${song.id}` +
        ` -t "${name}"` +
        ` -ar "${artist}"` +
        ` -al "${album}"` +
        ` -p "${publishTime}"`;

    if (saveLyric) {
      args += " -sl";
    }

    console.log('发送下载请求:', song.name);
    console.log('歌曲URL:', songUrl);
    console.log('封面URL:', coverUrl);
    console.log('歌词URL:', lyricsUrl);
    
    // 设置下载进度监听
    if (progressCallback) {
      console.log('API download: 设置进度监听器');
      
      // 注册进度更新事件
      const progressListener = (progress) => {
        // 将进度值从0-100映射为15-95，保留空间给初始阶段和元数据设置
        const adjustedProgress = Math.floor(15 + (progress * 0.8));
        console.log(`API download: 收到进度事件 ${progress}%, 调整为 ${adjustedProgress}%`);
        progressCallback(adjustedProgress);
      };
      
      // 添加下载进度监听
      console.log('API download: 注册 onDownloadProgress 回调');
      window.electron.onDownloadProgress(progressListener);
      
      // 下载开始，进度提升到15%
      console.log('API download: 下载开始 - 15%');
      progressCallback(15);
    }
    
    try {
      console.log('API download: 调用 electron.invoke("download", args)');
      const res = await window.electron.invoke("download", args);
      console.log('API download: electron.invoke 完成，结果:', res);
      
      // 下载完成，进度100%
      if (progressCallback) {
        console.log('API download: 下载完成 - 100%');
        progressCallback(100);
        // 移除监听器
        console.log('API download: 移除进度监听器');
        window.electron.removeDownloadProgress();
      }
      
      return res;
    } catch (error) {
      console.error('下载失败:', error);
      if (progressCallback) {
        // 移除监听器
        console.log('API download: 下载失败，移除进度监听器');
        window.electron.removeDownloadProgress();
      }
      return false;
    }
  },

  open(path: string) {
    window.electron.invoke("open", path);
  },

  // 获取下载路径
  getDownloadPath: async () => {
    return window.electron.getDownloadPath();
  },

  // 设置下载路径
  setDownloadPath: async () => {
    return window.electron.setDownloadPath();
  }
};
