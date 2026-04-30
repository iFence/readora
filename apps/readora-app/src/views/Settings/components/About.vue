<template>
  <setting-item item-name="版本">
    <div>v{{ version }}</div>
  </setting-item>
  <setting-item item-name="软件更新">
    <div class="update-control">
      <span class="update-status">{{ updateStatusText }}</span>
      <n-button
        class="settings-button settings-button--secondary"
        :loading="updateBusy && updateState.status === 'checking'"
        :disabled="updateBusy"
        @click="runUpdateCheck"
      >
        检查更新
      </n-button>
      <n-button
        v-if="canInstallUpdate"
        type="primary"
        class="settings-button settings-button--primary"
        :loading="updateBusy && updateState.status === 'downloading'"
        :disabled="updateBusy"
        @click="runUpdateInstall"
      >
        下载并安装
      </n-button>
    </div>
  </setting-item>
  <setting-item v-if="releaseNotesHtml" item-name="更新内容">
    <div class="release-notes" v-html="releaseNotesHtml"></div>
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
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed, onMounted, ref } from "vue";
import { NButton } from "naive-ui";
import { fetchAppVersion } from '@/services/appService.js';
import { useUpdateService } from '@/services/updateService.js';
import { openExternalUrl } from '@/platform/tauri/systemBridge.js';

const repositoryUrl = 'https://github.com/iFence/readora';
const version = ref(null);
const markdown = new MarkdownIt({ linkify: true, breaks: true });
const {
  canInstallUpdate,
  initializeUpdateService,
  runUpdateCheck,
  runUpdateInstall,
  updateBusy,
  updateState,
  updateStatusText,
} = useUpdateService();

const releaseNotesHtml = computed(() => {
  if (!updateState.value.body) {
    return '';
  }

  return DOMPurify.sanitize(markdown.render(updateState.value.body));
});

onMounted(async () => {
  await Promise.all([
    fetchAppVersion().then(appVersion => {
      version.value = appVersion;
    }),
    initializeUpdateService(),
  ]);
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

.update-control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.update-status {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.release-notes {
  width: min(100%, 560px);
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.6;
}

.release-notes :deep(h1),
.release-notes :deep(h2),
.release-notes :deep(h3) {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 0.96rem;
}

.release-notes :deep(ul) {
  margin: 0;
  padding-left: 1.2em;
}

.release-notes :deep(p) {
  margin: 0 0 8px;
}

@media (max-width: 767px) {
  .update-control {
    justify-content: flex-start;
  }
}
</style>
