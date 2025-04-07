import axios from "axios";
import { format } from "date-fns";
import type { Song } from "../types/song";

const apiClient = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "/api"
      : "http://music.163.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 从网易云短链接中提取ID（通常是形如 http://163cn.tv/ABCDEF 的格式）
function extractShortId(url: string): string | null {
  const match = url.match(/163cn\.tv\/([a-zA-Z0-9]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// 使用网易云音乐短链接直接搜索歌曲
// @ts-ignore: 保留此函数以备将来使用
async function searchByShortLink(shortUrl: string): Promise<string | null> {
  try {
    const shortId = extractShortId(shortUrl);
    if (!shortId) {
      console.error('无法从短链接提取ID:', shortUrl);
      return null;
    }
    console.log('从短链接提取到ID:', shortId);
    
    // 使用这个ID作为关键词进行搜索
    // 这是一种回退策略，因为这个ID通常很独特，可以唯一标识一首歌曲
    const searchRes = await search(shortId, 1, 0);
    if (searchRes && 
        searchRes.result && 
        searchRes.result.songs && 
        searchRes.result.songs.length > 0) {
      const songId = searchRes.result.songs[0].id;
      console.log('通过短链接ID搜索找到歌曲:', songId);
      return songId.toString();
    }
    
    console.log('搜索短链接ID未找到匹配歌曲');
    return null;
  } catch (error) {
    console.error('处理短链接失败:', error);
    return null;
  }
}

// 从完整分享文本中提取全面的歌曲信息
function extractCompleteShareInfo(text: string): { songName?: string, artist?: string, album?: string } {
  const info: { songName?: string, artist?: string, album?: string } = {};
  
  // 匹配常见的网易云音乐分享文本格式
  
  // 格式1: "分享xxx的单曲《歌名》: http://163cn.tv/xxxx"
  const pattern1 = /分享(.+?)的单曲《(.+?)》/;
  const match1 = text.match(pattern1);
  if (match1) {
    info.artist = match1[1].trim();
    info.songName = match1[2].trim();
    return info;
  }
  
  // 格式2: "我在网易云音乐听《歌名》，好听极了！来一起听吧。 (@网易云音乐) http://163cn.tv/xxxx"
  const pattern2 = /我在网易云音乐听《(.+?)》/;
  const match2 = text.match(pattern2);
  if (match2) {
    info.songName = match2[1].trim();
    return info;
  }
  
  // 格式3: "xxx的单曲《歌名》 - 来自@网易云音乐 http://163cn.tv/xxxx"
  const pattern3 = /(.+?)的单曲《(.+?)》\s*-\s*来自@网易云音乐/;
  const match3 = text.match(pattern3);
  if (match3) {
    info.artist = match3[1].trim();
    info.songName = match3[2].trim();
    return info;
  }
  
  // 尝试提取更多可能的格式...
  return info;
}

// 从分享文本中提取网易云音乐短链接
function extractShortUrl(shareText: string): string | null {
  // 优化正则表达式，更准确地匹配网易云音乐短链接
  const shortUrlMatch = shareText.match(/(https?:\/\/163cn\.tv\/[a-zA-Z0-9]+)/i);
  if (shortUrlMatch && shortUrlMatch[1]) {
    console.log('从分享文本中提取到短链接:', shortUrlMatch[1]);
    return shortUrlMatch[1];
  }
  
  // 尝试匹配其他可能的域名格式
  const alternativeDomains = [
    /(https?:\/\/music\.163\.com\/[a-zA-Z0-9]+)/i,  // 可能的短链域名
    /(https?:\/\/y\.music\.163\.com\/[a-zA-Z0-9]+)/i  // 另一种可能的短链域名
  ];
  
  for (const regex of alternativeDomains) {
    const match = shareText.match(regex);
    if (match && match[1]) {
      console.log('从分享文本中提取到备用短链接:', match[1]);
      return match[1];
    }
  }
  
  return null;
}

// 从文本中提取网易云音乐歌曲ID
function extractSongId(text: string): string | null {
  const match = text.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?song\?id=(\d+)/i);
  if (match && match[1]) {
    console.log('从链接中提取到歌曲ID:', match[1]);
    return match[1];
  }
  return null;
}

// 从文本中提取网易云音乐歌单ID
function extractPlaylistId(text: string): string | null {
  const match = text.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?playlist\?id=(\d+)/i);
  if (match && match[1]) {
    console.log('从链接中提取到歌单ID:', match[1]);
    return match[1];
  }
  return null;
}

async function detail(id: string) {
  try {
    const res = await apiClient.get(
      "/song/detail/?id=" + id + "&ids=%5B" + id + "%5D",
    );
    return res.data;
  } catch (err: any) {
    console.error("API Error Response:", err.response.data);
    throw err;
  }
}

async function search(q: string, limit: number, offset: number) {
  try {
    const res = await apiClient.get(
      "/cloudsearch/pc?type=1&s=" + q + "&limit=" + limit + "&offset=" + offset,
    );
    return res.data;
  } catch (err: any) {
    console.error("API Error Response:", err.response.data);
    throw err;
  }
}

async function url(
  id: string,
  cookie: string = "",
  quality: number = 2147483647,
  anonymous: boolean = true,
) {
  if (quality === 0) {
    quality = 2147483647;
  }

  let res: any;
  async function normal() {
    res = await apiClient.get(
      "/song/enhance/player/url?ids=[" + id + "]&br=" + quality,
    );
  }
  async function vip() {
    res = await apiClient.get(
      `/song/enhance/player/url?ids=[${id}]&br=` + quality,
      {
        headers: {
          flag: cookie,
        },
      },
    );
  }

  if (cookie === "") {
    await normal();
  } else {
    if (quality === 2147483647) {
      await vip();
    } else {
      if (anonymous) {
        await normal();
        if (res.data.data[0].url === null) {
          await vip();
        }
      } else {
        await vip();
      }
    }
  }

  return res.data.data[0].url;
}

function lyric(id: string) {
  return "http://music.163.com/api/song/lyric?os=pc&id=" + id + "&lv=-1&tv=1";
}

async function playlist(id: string) {
  try {
    const res = await apiClient.get("/v6/playlist/detail/?id=" + id);
    return res.data;
  } catch (err: any) {
    console.error("API Error Response:", err.response.data);
    throw err;
  }
}

// 检查文本是否包含任何类型的链接
function containsLinks(text: string): boolean {
  // 检查是否包含http链接
  const hasHttpLink = /https?:\/\//.test(text);
  
  // 检查是否包含网易云音乐链接
  const hasNeteaseSongLink = /music\.163\.com.*song\?id=/.test(text);
  const hasNeteasePlaylistLink = /music\.163\.com.*playlist\?id=/.test(text);
  const hasNeteaseShortLink = /163cn\.tv\//.test(text);
  
  return hasHttpLink || hasNeteaseSongLink || hasNeteasePlaylistLink || hasNeteaseShortLink;
}

// 从完整分享文本中提取歌曲信息
function extractSongInfoFromShareText(text: string): { song?: string, artist?: string } {
  const info: { song?: string, artist?: string } = {};
  
  // 匹配格式: "分享xxx的单曲《歌名》:"
  const songMatch = text.match(/分享(.+?)的单曲《(.+?)》/);
  if (songMatch) {
    info.artist = songMatch[1];
    info.song = songMatch[2];
  }
  
  return info;
}

// 从输入文本中提取可能的分享链接、歌曲ID或关键词
async function parseInput(input: string): Promise<{ type: 'id' | 'playlist' | 'search', value: string, isLink: boolean, meta?: any }> {
  console.log('开始解析输入:', input);
  
  // 提取可能的歌曲信息（歌名、歌手）
  const songInfo = extractSongInfoFromShareText(input);
  
  // 首先检查分享文本中是否包含网易云短链接
  const shortUrl = extractShortUrl(input);
  if (shortUrl) {
    const songId = await resolveShortUrl(shortUrl);
    if (songId) {
      console.log('成功解析短链接为歌曲ID:', songId);
      return { type: 'id', value: songId, isLink: true, meta: songInfo };
    }
    
    // 如果短链接解析失败但有歌曲信息，使用歌曲信息精确搜索
    if (songInfo.song) {
      console.log('短链接解析失败，使用分享文本中的歌曲信息搜索:', songInfo);
      const searchQuery = songInfo.artist ? 
        `${songInfo.song} ${songInfo.artist}` : 
        songInfo.song;
      
      return { 
        type: 'search', 
        value: searchQuery, 
        isLink: true, // 仍标记为链接相关请求，以限制结果为单首歌曲
        meta: { exactMatch: true, songInfo } 
      };
    }
  }
  
  // 检查是否是网易云音乐歌曲链接
  const songId = extractSongId(input);
  if (songId) {
    console.log('识别为网易云歌曲链接:', songId);
    return { type: 'id', value: songId, isLink: true };
  }
  
  // 检查是否是网易云音乐歌单链接
  const playlistId = extractPlaylistId(input);
  if (playlistId) {
    console.log('识别为网易云歌单链接:', playlistId);
    return { type: 'playlist', value: playlistId, isLink: true };
  }
  
  // 检查文本中是否包含任何类型的链接但解析失败
  const hasLinks = containsLinks(input);
  
  // 如果有歌曲信息但链接解析失败
  if (hasLinks && songInfo.song) {
    console.log('链接解析失败，使用分享文本中的歌曲信息搜索:', songInfo);
    const searchQuery = songInfo.artist ? 
      `${songInfo.song} ${songInfo.artist}` : 
      songInfo.song;
    
    return { 
      type: 'search', 
      value: searchQuery, 
      isLink: true, // 仍标记为链接相关请求，以限制结果
      meta: { exactMatch: true, songInfo } 
    };
  }
  
  // 当输入文本包含链接但上述解析都失败时，返回空搜索以避免错误结果
  if (hasLinks) {
    console.log('输入包含无法识别的链接，避免搜索错误内容');
    return { type: 'search', value: '', isLink: true };
  }
  
  // 其他情况当作搜索词处理
  console.log('输入不包含链接，作为搜索词处理:', input);
  return { type: 'search', value: input, isLink: false };
}

// 通过ID获取单首歌曲
async function getSongById(id: string): Promise<Song | null> {
  try {
    const value = await detail(id);
    if (!value || !value.songs || !value.songs[0]) {
      console.log('未找到ID对应的歌曲:', id);
      return null;
    }
    
    const song = {
      id: value.songs[0].id,
      name: value.songs[0].name,
      artist: value.songs[0].artists
        .map((item: any) => item.name)
        .join("/"),
      album: value.songs[0].album.name,
      cover: value.songs[0].album.picUrl,
      publishTime: format(
        new Date(value.songs[0].album.publishTime),
        "yyyy-MM-dd HH:mm:ss",
      ),
    };
    return song;
  } catch (err) {
    console.error(`获取歌曲详情失败:`, err);
    return null;
  }
}

// 尝试使用多种方法解析网易云短链接
async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  // 优化短链接检查
  if (!shortUrl.match(/163cn\.tv|music\.163\.com/i)) {
    console.log('输入URL不是网易云短链接:', shortUrl);
    return null;
  }
  
  console.log('尝试解析短链接:', shortUrl);
  
  try {
    // 方法1: 使用Electron的主进程进行短链接解析
    try {
      console.log('尝试通过Electron主进程解析短链接...');
      
      // 确保shortUrl是一个完整的URL
      const urlToResolve = shortUrl.startsWith('http') ? shortUrl : `https://${shortUrl}`;
      console.log('规范化URL为:', urlToResolve);
      
      const songId = await window.electron.invoke("resolveShortUrl", urlToResolve);
      if (songId) {
        console.log('通过Electron主进程成功解析短链接:', songId);
        return songId;
      } else {
        console.warn('Electron主进程未能解析短链接');
      }
    } catch (error) {
      console.warn('通过Electron主进程解析短链接失败:', error);
    }
    
    // 方法2: 从链接本身尝试直接提取歌曲ID (有些短链可能直接包含ID)
    const directIdMatch = shortUrl.match(/(?:song|music|s)[\\/=:](\d{5,12})/i);
    if (directIdMatch && directIdMatch[1]) {
      const potentialId = directIdMatch[1];
      console.log('从链接中直接提取到可能的歌曲ID:', potentialId);
      
      // 验证这个ID是否有效
      try {
        const songDetails = await detail(potentialId);
        if (songDetails && songDetails.songs && songDetails.songs[0]) {
          console.log('直接提取的ID有效，歌曲名:', songDetails.songs[0].name);
          return potentialId;
        }
      } catch (error) {
        console.warn('直接提取的ID无效或获取详情失败');
      }
    }
    
    // 方法3: 尝试通过浏览器的fetch API解析重定向
    try {
      console.log('尝试通过fetch API解析短链接...');
      
      // 强制使用https协议
      const urlToFetch = shortUrl.replace(/^http:/, 'https:');
      
      // 使用更现代的浏览器UA和完整的请求头
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Dest': 'document',
        'Upgrade-Insecure-Requests': '1'
      };
      
      // 设置请求最长时间为8秒
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await fetch(urlToFetch, {
          method: 'GET',
          headers,
          redirect: 'follow',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 检查是否成功获取响应
        if (response.ok) {
          const finalUrl = response.url;
          console.log('重定向后的URL:', finalUrl);
          
          // 从最终URL提取歌曲ID
          const match = finalUrl.match(/music\.163\.com(?:\/#|\/|\/#\/|\/)?song\?id=(\d+)/i);
          if (match && match[1]) {
            console.log('从重定向URL中提取到歌曲ID:', match[1]);
            return match[1];
          }
          
          // 如果URL中没有ID，尝试从响应内容中提取
          try {
            const html = await response.text();
            
            // 寻找所有可能的歌曲ID
            const songIdMatches = html.match(/song\?id=(\d{5,12})/g);
            if (songIdMatches && songIdMatches.length > 0) {
              const firstIdMatch = songIdMatches[0].match(/(\d{5,12})/);
              if (firstIdMatch && firstIdMatch[1]) {
                console.log('从响应内容中提取到歌曲ID:', firstIdMatch[1]);
                return firstIdMatch[1];
              }
            }
          } catch (error) {
            console.warn('解析响应内容失败:', error);
          }
        } else {
          console.warn('fetch请求失败，状态码:', response.status);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn('fetch请求执行失败:', error);
      }
    } catch (error) {
      console.warn('通过fetch API解析短链接过程中发生错误:', error);
    }
    
    // 方法4: 从分享文本中提取歌曲名和歌手信息进行精确搜索
    const shareInfo = extractCompleteShareInfo(shortUrl);
    if (shareInfo.songName && shareInfo.artist) {
      console.log('从分享文本提取到完整歌曲信息:', shareInfo);
      
      // 使用歌曲名和歌手名进行精确搜索
      const searchQuery = `${shareInfo.songName} ${shareInfo.artist}`;
      try {
        console.log('使用提取的信息进行精确搜索:', searchQuery);
        const res = await search(searchQuery, 5, 0);
        
        if (res && res.result && res.result.songs && res.result.songs.length > 0) {
          // 尝试找到完全匹配的歌曲
          const exactMatch = res.result.songs.find(song => 
            song.name === shareInfo.songName && 
            song.ar.some(artist => artist.name === shareInfo.artist)
          );
          
          if (exactMatch) {
            console.log('找到完全匹配的歌曲:', exactMatch.id);
            return exactMatch.id.toString();
          }
          
          // 如果没有完全匹配，返回第一个结果
          console.log('未找到完全匹配，使用第一个结果:', res.result.songs[0].id);
          return res.result.songs[0].id.toString();
        }
      } catch (err) {
        console.error('精确搜索失败:', err);
      }
    }
    
    // 方法5: 如果所有方法都失败，尝试直接使用短链接内容进行搜索
    try {
      // 使用短链接中可能的歌曲名关键词进行搜索
      const shortUrlId = extractShortId(shortUrl);
      if (shortUrlId) {
        console.log('将短链ID用作搜索关键词:', shortUrlId);
        const searchRes = await search(shortUrlId, 1, 0);
        if (searchRes && 
            searchRes.result && 
            searchRes.result.songs && 
            searchRes.result.songs.length > 0) {
          const songId = searchRes.result.songs[0].id;
          console.log('通过短链ID搜索找到歌曲:', songId);
          return songId.toString();
        }
      }
    } catch (error) {
      console.warn('最终搜索方法失败:', error);
    }
    
    console.log('所有短链接解析方法均失败');
    return null;
  } catch (error) {
    console.error('短链接解析完全失败:', error);
    return null;
  }
}

export default {
  // 添加测试短链接解析的函数
  async testResolveShortUrl(shortUrl: string): Promise<{songId: string | null, redirectUrl: string | null, success: boolean, info?: any}> {
    console.log('开始测试短链接解析:', shortUrl);
    
    try {
      // 确保输入是短链接
      if (!shortUrl.includes('163cn.tv')) {
        console.error('输入不是网易云短链接');
        return { songId: null, redirectUrl: null, success: false, info: '输入不是网易云短链接' };
      }
      
      // 记录开始时间，用于计算解析耗时
      const startTime = Date.now();
      
      // 首先尝试通过主进程解析
      console.log('尝试通过Electron主进程解析短链接...');
      try {
        const songId = await window.electron.invoke("resolveShortUrl", shortUrl);
        if (songId) {
          const endTime = Date.now();
          console.log(`短链接解析成功! 歌曲ID: ${songId}, 耗时: ${endTime - startTime}ms`);
          
          // 尝试获取歌曲详情来验证ID是否有效
          try {
            const songDetail = await detail(songId);
            if (songDetail && songDetail.songs && songDetail.songs[0]) {
              const song = songDetail.songs[0];
              return { 
                songId, 
                redirectUrl: `https://music.163.com/#/song?id=${songId}`,
                success: true,
                info: {
                  name: song.name,
                  artist: song.artists.map((a: any) => a.name).join('/'),
                  album: song.album.name,
                  duration: song.duration,
                  timeUsed: endTime - startTime
                }
              };
            }
          } catch (err) {
            console.error('获取歌曲详情失败:', err);
          }
          
          return { 
            songId, 
            redirectUrl: `https://music.163.com/#/song?id=${songId}`, 
            success: true,
            info: { timeUsed: endTime - startTime }
          };
        }
      } catch (error) {
        console.error('通过Electron主进程解析短链接失败:', error);
      }
      
      // 尝试其他解析方法
      const songId = await resolveShortUrl(shortUrl);
      if (songId) {
        const endTime = Date.now();
        console.log(`短链接解析成功! 歌曲ID: ${songId}, 耗时: ${endTime - startTime}ms`);
        
        // 尝试获取歌曲详情
        try {
          const songDetail = await detail(songId);
          if (songDetail && songDetail.songs && songDetail.songs[0]) {
            const song = songDetail.songs[0];
            return { 
              songId, 
              redirectUrl: `https://music.163.com/#/song?id=${songId}`,
              success: true,
              info: {
                name: song.name,
                artist: song.artists.map((a: any) => a.name).join('/'),
                album: song.album.name,
                duration: song.duration,
                timeUsed: endTime - startTime,
                method: '备用解析方法'
              }
            };
          }
        } catch (err) {
          console.error('获取歌曲详情失败:', err);
        }
        
        return { 
          songId, 
          redirectUrl: `https://music.163.com/#/song?id=${songId}`, 
          success: true,
          info: { timeUsed: endTime - startTime, method: '备用解析方法' }
        };
      }
      
      // 所有方法都失败
      return { songId: null, redirectUrl: null, success: false, info: '所有解析方法均失败' };
    } catch (error) {
      console.error('测试短链接解析过程中发生错误:', error);
      return { songId: null, redirectUrl: null, success: false, info: String(error) };
    }
  },
  
  async search(value: string, limit: number, offset: number) {
    // 解析输入，处理各种可能的格式
    const parsedInput = await parseInput(value);
    console.log('解析输入结果:', parsedInput);
    
    // 如果输入包含链接或是链接相关的搜索
    if (parsedInput.isLink) {
      if (parsedInput.type === 'id') {
        // 直接获取单首歌曲
        const song = await getSongById(parsedInput.value);
        return song ? [song] : [];
      } 
      else if (parsedInput.type === 'playlist') {
        // 处理歌单
        try {
          const res = await playlist(parsedInput.value);
          const allId = res.playlist.trackIds.map((track: any) => track.id);
          const ids = allId.slice(offset, offset + limit);
          
          const songs: Array<Song> = [];
          await Promise.all(
            ids.map(async (id: string) => {
              const song = await getSongById(id);
              if (song) songs.push(song);
            })
          );
          return songs;
        } catch (err) {
          console.error('获取歌单失败:', err);
          return [];
        }
      }
      else if (parsedInput.type === 'search' && parsedInput.meta?.exactMatch) {
        // 使用分享文本中提取的歌曲信息执行精确搜索
        try {
          console.log('执行精确搜索:', parsedInput.value);
          const res = await search(parsedInput.value, 1, 0); // 只获取最匹配的一首歌
          if (!res.result || !res.result.songs || !res.result.songs.length) {
            console.log('精确搜索无结果');
            return [];
          }
          
          // 只返回第一个结果
          const songData = res.result.songs[0];
          const song = {
            id: songData.id,
            name: songData.name,
            artist: songData.ar.map((item: any) => item.name).join("/"),
            album: songData.al.name,
            cover: songData.al.picUrl,
            publishTime: format(
              new Date(songData.publishTime || Date.now()),
              "yyyy-MM-dd HH:mm:ss",
            ),
          };
          return [song];
        } catch (err) {
          console.error('精确搜索失败:', err);
          return [];
        }
      }
      else {
        // 链接无法识别，返回空结果
        console.log('链接无法识别，返回空结果');
        return [];
      }
    } 
    else {
      // 纯搜索模式 - 没有链接的情况
      if (!parsedInput.value.trim()) {
        console.log('搜索词为空，返回空结果');
        return [];
      }
      
      try {
        console.log('执行搜索:', parsedInput.value);
        const res = await search(parsedInput.value, limit, offset);
        if (!res.result || !res.result.songs || !res.result.songs.length) {
          console.log('搜索无结果');
          return [];
        }
        
        const songs: Array<Song> = [];
        await Promise.all(
          res.result.songs.map(async (songData: any) => {
            try {
              const song = {
                id: songData.id,
                name: songData.name,
                artist: songData.ar.map((item: any) => item.name).join("/"),
                album: songData.al.name,
                cover: songData.al.picUrl,
                publishTime: format(
                  new Date(songData.publishTime || Date.now()),
                  "yyyy-MM-dd HH:mm:ss",
                ),
              };
              songs.push(song);
            } catch (err) {
              console.error('处理搜索结果失败:', err);
            }
          })
        );
        return songs;
      } catch (err) {
        console.error('执行搜索失败:', err);
        return [];
      }
    }
  },

  async download(
    song: Song,
    cookie?: string,
    quality?: number,
    anonymous?: boolean,
  ) {
    song.url = await url(song.id, cookie, quality, anonymous);
    song.lyrics = lyric(song.id);
    return song;
  },
};
