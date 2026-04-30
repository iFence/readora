<template>
  <span class="update-notifier" aria-hidden="true"></span>
</template>

<script setup>
import { h, onMounted, watch } from 'vue';
import { NButton, NSpace, useNotification } from 'naive-ui';
import { navigateToSettings } from '@/services/navigationService.js';
import { useUpdateService } from '@/services/updateService.js';

const notification = useNotification();
const {
  canInstallUpdate,
  initializeUpdateService,
  runUpdateInstall,
  updateBusy,
  updateState,
} = useUpdateService();

let releaseNotification = null;

function showAvailableUpdateNotification() {
  if (!canInstallUpdate.value || releaseNotification) {
    return;
  }

  releaseNotification = notification.info({
    title: updateState.value.latestVersion
      ? `发现新版本 ${updateState.value.latestVersion}`
      : '发现新版本',
    content: '可以现在下载安装，也可以稍后在偏好设置的“关于”中处理。',
    duration: 0,
    action: () => h(NSpace, { size: 8 }, {
      default: () => [
        h(NButton, {
          size: 'small',
          secondary: true,
          disabled: updateBusy.value,
          onClick: () => {
            navigateToSettings();
          },
        }, { default: () => '查看' }),
        h(NButton, {
          size: 'small',
          type: 'primary',
          disabled: updateBusy.value,
          onClick: () => {
            runUpdateInstall();
          },
        }, { default: () => '安装' }),
      ],
    }),
    onClose: () => {
      releaseNotification = null;
    },
  });
}

onMounted(async () => {
  await initializeUpdateService({ autoCheck: true });
  showAvailableUpdateNotification();
});

watch(
  () => updateState.value.status,
  status => {
    if (status === 'available') {
      showAvailableUpdateNotification();
    }

    if (status === 'downloading' || status === 'downloaded') {
      releaseNotification?.destroy();
      releaseNotification = null;
    }
  },
);
</script>

<style scoped>
.update-notifier {
  display: none;
}
</style>
