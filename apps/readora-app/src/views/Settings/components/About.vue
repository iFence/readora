<template>
  <setting-item item-name="版本">
    <div>v{{ version }}</div>
  </setting-item>
  <setting-item item-name="GitHub">
    <button
      class="repo-button settings-icon-button"
      type="button"
      title="在默认浏览器中打开 GitHub 仓库"
      aria-label="在默认浏览器中打开 GitHub 仓库"
      @click="handleOpenRepository"
    >
      <git-hub-icon />
    </button>
  </setting-item>
</template>

<script setup>
import GitHubIcon from "@/assets/svg/GitHubIcon.vue";
import SettingItem from "@/assets/svg/SettingItem.vue";
import { onMounted, ref } from "vue";
import { fetchAppVersion } from '@/services/appService.js';
import { openExternalUrl } from '@/platform/tauri/systemBridge.js';

const repositoryUrl = 'https://github.com/iFence/readora';
const version = ref(null);

onMounted(async () => {
  version.value = await fetchAppVersion();
});

function handleOpenRepository() {
  openExternalUrl(repositoryUrl);
}
</script>

<style scoped>
@import "../settingsControls.css";

.repo-button {
  color: var(--text-primary);
}
</style>
