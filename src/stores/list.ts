import { defineStore } from "pinia";
import { ref } from "vue";
import type { Song } from "../types/song";
import { useDownloadStore } from "./download";
import { electron } from "../api/download";

export const useListStore = defineStore("list", () => {
  const show = ref(false);
  const rowData = ref<Song[]>([]);

  async function download(index: number, progressCallback?: (progress: number) => void) {
    const downloadStore = useDownloadStore();
    
    console.log(`开始下载 index=${index}`);
    
    // 初始化进度
    rowData.value[index].progress = 0;
    rowData.value[index].state = "downloading";
    
    // 创建进度更新函数
    const updateProgress = (progress: number) => {
      console.log(`ListStore 进度更新: ${progress}%`);
      rowData.value[index].progress = progress;
      if (progressCallback) {
        console.log(`调用组件的 progressCallback: ${progress}%`);
        progressCallback(progress);
      }
    };
    
    // 模拟下载准备阶段
    updateProgress(2);
    
    console.log("开始调用 downloadStore.download");
    const res = await downloadStore.download(rowData.value[index], updateProgress);
    console.log(`下载完成，结果: ${res ? '成功' : '失败'}`);

    if (res) {
      rowData.value[index].path = res;
      rowData.value[index].state = "downloaded";
      rowData.value[index].progress = 100;
      if (progressCallback) progressCallback(100);
      return true;
    } else {
      rowData.value[index].state = "vip";
      if (progressCallback) progressCallback(0);
      return false;
    }
  }

  function open(index: number) {
    const res = electron.open(rowData.value[index].path || "");
    return res;
  }

  async function downloadAll(maxConcurrent: number = 3) {
    let completedDownloads = 0;
    const totalSongs = rowData.value.length;

    for (let i = 0; i < totalSongs; i += maxConcurrent) {
      const batch = rowData.value
        .slice(i, i + maxConcurrent)
        .map((_, index) => {
          return download(i + index);
        });

      const results = await Promise.all(batch);

      completedDownloads += results.filter((result) => result).length;
    }

    console.log(`Completed ${completedDownloads} downloads.`);
    return completedDownloads;
  }

  return {
    show,
    download,
    open,
    downloadAll,
    rowData,
  };
});
