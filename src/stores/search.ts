import { defineStore } from "pinia";
import { ref } from "vue";
import { useListStore } from "./list";
import netease from "../api/netease";
import { useLoadStore } from "./load";
import { useDownloadStore } from "./download";
import { useLoginStore } from "./login";

export const useSearchStore = defineStore("search", () => {
  const value = ref("");
  const listStore = useListStore();
  const downloadStore = useDownloadStore();
  const loadStore = useLoadStore();
  const loginStore = useLoginStore();

  // 在初始化时显示所有UI元素
  listStore.show = true;
  loginStore.show = true;
  downloadStore.show = true;
  
  const limit = 5;

  async function search() {
    listStore.rowData = [];
    
    const res: any = await netease.search(value.value, limit, 0);

    if (res.length > 0) {
      listStore.rowData = res;
      listStore.show = true;
      loginStore.show = true;
      downloadStore.show = true;
      loadStore.show = res.length === 5;
    }

    return true;
  }

  return {
    value,
    search,
  };
});
