<template>
  <div class="flex flex-col space-y-2 w-full p-2 border border-base-300 rounded-lg">
    <div class="text-sm font-semibold">{{ $t('downloader.downloadPath') }}</div>
    <div class="flex items-center space-x-2">
      <input
        type="text"
        class="input input-bordered w-full text-sm"
        readonly
        :value="downloadPath || '加载中...'"
      />
      <button @click="selectDownloadPath" class="btn btn-primary btn-sm">
        {{ $t('downloader.select') }}
      </button>
    </div>
    <div v-if="errorMessage" class="text-xs text-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { electron } from '../../api/download';

// 我们仍然需要引入useI18n以便在模板中使用$t函数
useI18n();

const downloadPath = ref('');
const errorMessage = ref('');

onMounted(async () => {
  console.log('DownloadPathSetting component mounted');
  await getCurrentDownloadPath();
});

async function getCurrentDownloadPath() {
  try {
    console.log('Fetching current download path...');
    const path = await electron.getDownloadPath();
    console.log('Current download path:', path);
    downloadPath.value = path;
  } catch (error) {
    console.error("Failed to get download path:", error);
    errorMessage.value = `获取下载路径失败: ${error}`;
  }
}

async function selectDownloadPath() {
  try {
    console.log('Opening folder selector...');
    const path = await electron.setDownloadPath();
    console.log('Selected path:', path);
    if (path) {
      downloadPath.value = path;
      errorMessage.value = '';
    }
  } catch (error) {
    console.error("Failed to set download path:", error);
    errorMessage.value = `设置下载路径失败: ${error}`;
  }
}
</script> 