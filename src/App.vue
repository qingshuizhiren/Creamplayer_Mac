<template>
  <div :class="$style.wrapper">
    <div class="absolute top-0 right-0 p-4">
      <languager></languager>
    </div>
    <search></search>
    <downloader></downloader>
    <loginer></loginer>
    <div class="w-full list-container">
      <list></list>
    </div>
    <loader></loader>
    <div class="bottom-spacer" style="height: 60px;"></div>
  </div>
</template>

<script setup lang="ts">
import search from "./components/search/index.vue";
import list from "./components/list/index.vue";
import loader from "./components/loader/index.vue";
import downloader from "./components/downloader/index.vue";
import languager from "./components/languager/index.vue";
import loginer from "./components/loginer/index.vue";
</script>

<style lang="postcss" module>
.wrapper {
  @apply flex flex-col justify-start items-center;
  @apply p-4 gap-4 min-h-screen;
  overflow-y: auto;
  max-height: 100vh;
  padding-bottom: 80px;
  position: relative;
}
</style>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: auto;
}

body {
  padding-bottom: 60px;
  position: relative;
}

.list-container {
  width: 100%;
  margin-bottom: 20px;
  position: relative;
  flex: 1;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(100, 100, 100, 0.7);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 100, 100, 0.9);
}
</style>
