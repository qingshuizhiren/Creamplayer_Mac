import { defineStore } from "pinia";
import { ref } from "vue";
import netease from "../api/netease";
import type { Song } from "../types/song";
import { useLoginStore } from "./login";
import { electron } from "../api/download";

export const useDownloadStore = defineStore("download", () => {
  const show = ref(true);
  const saveLyric = ref(false);
  const quality = ref(320000); // lossless
  const process = ref(2);
  const anonymous = ref(true); // Use anonymous downloading of non-lossless songs

  async function download(song: Song, progressCallback?: (progress: number) => void) {
    console.log('DownloadStore: 开始下载');
    
    // 如果提供了回调，开始时回报告5%进度（API请求阶段）
    if (progressCallback) {
      console.log('DownloadStore: API请求阶段 - 5%');
      progressCallback(5);
    }
    
    const loginStore = useLoginStore();
    song = await netease.download(
      song,
      loginStore.neteaseCookie,
      quality.value,
      anonymous.value,
    );
    
    // API请求完成，进度提升到10%
    if (progressCallback) {
      console.log('DownloadStore: API请求完成 - 10%');
      progressCallback(10);
    }

    console.log('DownloadStore: 开始调用electron.download');
    const result = await electron.download(song, saveLyric.value, progressCallback);
    console.log(`DownloadStore: 下载完成，结果: ${result ? '成功' : '失败'}`);

    return result;
  }

  return { show, saveLyric, download, process, quality, anonymous };
}, {
  persist: true,
});
