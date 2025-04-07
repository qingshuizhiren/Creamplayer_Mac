<template>
  <div class="list-container" style="margin-bottom: 80px; width: 100%;">
    <ag-grid-vue
      v-show="listStore.show"
      data-ag-theme-mode="dark-blue"
      :rowData="listStore.rowData"
      :columnDefs="colDefs"
      domLayout="normal"
      style="height: 400px; width: 100%;"
      class="ag-grid-fixed"
      :gridOptions="gridOptions"
    >
    </ag-grid-vue>
    <!-- 添加一个额外的底部间距元素 -->
    <div style="height: 80px;"></div>
  </div>
</template>

<script setup lang="ts">
import { AgGridVue } from "ag-grid-vue3";
import { useListStore } from "../../stores/list";
import { computed, onMounted, ref, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import type { GridApi, GridOptions } from 'ag-grid-community'; // 使用type-only导入

const { t } = useI18n();
const listStore = useListStore();

// 引用gridApi用于事件监听器
let gridApi = ref<GridApi | null>(null);

// 定义gridOptions以便更好地控制表格行为 - 使用正确的类型
const gridOptions = ref<GridOptions>({
  suppressScrollOnNewData: false,
  rowHeight: 40,
  headerHeight: 40,
  // 禁用自动高度特性，使用固定高度代替
  enableCellTextSelection: true,
  suppressHorizontalScroll: false,
  // 确保表格正确渲染和响应布局变化
  onGridReady: (params) => {
    // 保存gridApi引用
    gridApi.value = params.api;
    
    // 初始化时调整大小以确保正确渲染
    setTimeout(() => {
      params.api.sizeColumnsToFit();
      // 强制刷新以确保正确渲染
      params.api.refreshCells({ force: true });
    }, 200);

    // 每当数据更新时重新调整大小
    params.api.addEventListener('modelUpdated', () => {
      setTimeout(() => {
        params.api.sizeColumnsToFit();
        // 强制刷新
        params.api.refreshCells({ force: true });
      }, 200);
    });
  }
});

// 在组件挂载后确保表格适当显示
onMounted(() => {
  // 使用nextTick确保DOM完全渲染后再执行操作
  nextTick(() => {
    setTimeout(() => {
      if (gridApi.value) {
        gridApi.value.sizeColumnsToFit();
        // 强制刷新表格
        gridApi.value.refreshCells({ force: true });
      }
    }, 300);
  });
  
  // 添加resize事件监听器以在窗口大小变化时重新计算表格大小
  window.addEventListener('resize', () => {
    const api = gridApi.value;
    if (api) {
      api.sizeColumnsToFit();
    }
  });
});

const downloaded = (button: any, rowIndex: number) => {
  button.classList.remove("btn-disabled");
  button.classList.add("btn-success");
  button.innerHTML = t("list.open_folder");
  button.onclick = () => {
    console.log(rowIndex);
    listStore.open(rowIndex);
  };
};

const downloading = (button: any) => {
  button.classList.add("btn-disabled");
  button.innerHTML = t("list.downloading");
};

const vip = (button: any) => {
  button.classList.remove("btn-disabled");
  button.classList.add("btn-error");
  button.innerHTML = t("list.vip_retry");
};

const download = (params: any) => {
  const rowIndex = params.node.rowIndex;
  const cell = document.createElement("div");
  cell.style.display = "flex";
  cell.style.flexDirection = "column";
  cell.style.gap = "4px";

  // 创建包含按钮和进度条的容器
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("relative"); // 使用相对定位作为容器
  buttonContainer.style.width = "100%";
  buttonContainer.style.position = "relative";
  buttonContainer.style.height = "32px"; // 固定高度

  const button = document.createElement("button");
  button.classList.add("btn", "btn-secondary", "btn-sm");
  button.style.width = "100%";
  button.style.height = "32px"; // 固定高度
  button.style.position = "relative";
  button.style.zIndex = "2";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";

  // 创建进度条，设置为绝对定位以便与按钮重叠
  const progressBar = document.createElement("div");
  progressBar.classList.add("absolute", "left-0", "bottom-0", "bg-primary", "rounded");
  progressBar.style.height = "100%";
  progressBar.style.width = "0%";
  progressBar.style.opacity = "0.3"; // 半透明效果
  progressBar.style.zIndex = "1";
  progressBar.style.transition = "width 0.3s";
  progressBar.style.display = "none"; // 默认隐藏

  // 更新进度的函数，确保进度条显示
  const updateProgress = (progress: number) => {
    console.log(`更新进度: ${progress}%`); // 添加日志
    // 任何进度大于0都显示进度条，确保初始阶段也有视觉反馈
    if (progress > 0) {
      progressBar.style.display = "block";
      // 确保进度值至少为1%以保证可见性
      const visibleProgress = Math.max(1, progress);
      progressBar.style.width = `${visibleProgress}%`;
    }
  };

  // 如果已有进度，显示进度条
  if (params.data.progress && params.data.progress > 0 && params.data.progress < 100) {
    console.log(`初始进度: ${params.data.progress}%`); // 添加日志
    updateProgress(params.data.progress);
  }

  button.onclick = async () => {
    console.log("点击下载按钮"); // 添加日志
    progressBar.style.display = "block";
    updateProgress(1); // 初始进度1%，确保用户看到有进度条
    await listStore.download(rowIndex, updateProgress);
  };

  if (params.data.state === "downloading") {
    downloading(button);
    // 显示当前进度
    if (params.data.progress && params.data.progress > 0 && params.data.progress < 100) {
      console.log(`初始化正在下载状态: ${params.data.progress}%`); // 添加日志
      updateProgress(params.data.progress);
    } else {
      console.log("初始化正在下载状态: 默认1%"); // 添加日志
      updateProgress(1); // 默认显示小进度表示正在开始
    }
  } else if (params.data.state === "downloaded") {
    downloaded(button, rowIndex);
    // 下载完成，进度100%
    console.log("初始化已下载状态: 100%"); // 添加日志
    updateProgress(100);
  } else if (params.data.state === "vip") {
    vip(button);
    progressBar.style.display = "none";
  } else {
    button.textContent = t("list.download");
    progressBar.style.display = "none";
  }

  // 先添加进度条，然后添加按钮，确保按钮在上层
  buttonContainer.appendChild(progressBar);
  buttonContainer.appendChild(button);
  cell.appendChild(buttonContainer);
  
  return cell;
};

const colDefs = computed(() => [
  { headerName: t("list.state"), width: 150, cellRenderer: download },
  { headerName: t("list.song_name"), field: "name", width: 200 },
  { headerName: t("list.cover"), field: "cover", width: 150 },
  { headerName: t("list.artist"), field: "artist", width: 150 },
  { headerName: t("list.album"), field: "album", width: 150 },
  { headerName: t("list.id"), field: "id", width: 150 },
  { headerName: t("list.publish_time"), field: "publishTime", width: 200 },
]);
</script>

<style>
.ag-center-cols-viewport {
  overflow: visible !important;
  min-height: 300px !important;
}

/* 确保网格底部有足够的空白 */
.ag-root-wrapper {
  margin-bottom: 30px;
  min-height: 400px !important;
  position: relative;
}

/* 确保滚动条区域有足够空间 */
.ag-body-viewport {
  overflow-y: auto !important;
  overflow-x: auto !important;
}

/* AG-Grid固定高度样式 */
.ag-grid-fixed {
  height: 400px !important;
  min-height: 400px !important;
  width: 100% !important;
}

/* 修复可能的边界问题 */
.ag-theme-dark-blue {
  --ag-grid-size: 4px;
  --ag-border-radius: 4px;
  --ag-row-height: 40px;
  --ag-header-height: 40px;
  --ag-header-foreground-color: white;
  --ag-header-background-color: rgba(33, 33, 33, 0.8);
}

/* 优化滚动条样式 */
::-webkit-scrollbar {
  width: 10px !important;
  height: 10px !important;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2) !important;
  border-radius: 5px !important;
}

::-webkit-scrollbar-thumb {
  background: rgba(120, 120, 120, 0.8) !important;
  border-radius: 5px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(120, 120, 120, 1) !important;
}

/* 添加一些全局样式来确保表格正确显示 */
.list-container {
  display: flex;
  flex-direction: column;
  padding-bottom: 60px;
  position: relative;
  margin-bottom: 80px !important;
}
</style>
