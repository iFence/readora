import { computed, ref } from 'vue';
import {
  checkForUpdates,
  getUpdateState,
  installUpdate,
  onUpdateStatus,
} from '@/platform/tauri/updateBridge.js';

const updateState = ref({
  status: 'idle',
  currentVersion: '',
  latestVersion: null,
  body: null,
  publishedAt: null,
  downloadedBytes: null,
  contentLength: null,
  error: null,
});

let unsubscribeUpdateStatus = null;

function applyUpdateState(nextState) {
  updateState.value = {
    ...updateState.value,
    ...nextState,
  };
}

function normalizeError(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return '更新检查失败';
}

export const updateBusy = computed(() => ['checking', 'downloading'].includes(updateState.value.status));
export const canInstallUpdate = computed(() => updateState.value.status === 'available');
export const updateProgressPercent = computed(() => {
  const downloaded = Number(updateState.value.downloadedBytes ?? 0);
  const total = Number(updateState.value.contentLength ?? 0);

  if (!downloaded || !total || total <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round((downloaded / total) * 100)));
});

export const updateStatusText = computed(() => {
  switch (updateState.value.status) {
    case 'checking':
      return '正在检查更新...';
    case 'available':
      return updateState.value.latestVersion
        ? `发现新版本 ${updateState.value.latestVersion}`
        : '发现新版本';
    case 'downloading':
      return updateProgressPercent.value == null
        ? '正在下载更新...'
        : `正在下载更新 ${updateProgressPercent.value}%`;
    case 'downloaded':
      return '更新已安装。请重启应用以完成更新。';
    case 'up_to_date':
      return '当前已是最新版本';
    case 'error':
      return updateState.value.error || '更新检查失败';
    default:
      return '尚未检查更新';
  }
});

export async function initializeUpdateService({ autoCheck = false } = {}) {
  if (!unsubscribeUpdateStatus) {
    unsubscribeUpdateStatus = await onUpdateStatus(event => {
      if (event?.payload) {
        applyUpdateState(event.payload);
      }
    });
  }

  try {
    applyUpdateState(await getUpdateState());

    if (autoCheck && updateState.value.status === 'idle') {
      await runUpdateCheck();
    }
  } catch (error) {
    applyUpdateState({
      status: 'error',
      error: normalizeError(error),
    });
  }
}

export function disposeUpdateService() {
  unsubscribeUpdateStatus?.();
  unsubscribeUpdateStatus = null;
}

export async function runUpdateCheck() {
  try {
    applyUpdateState(await checkForUpdates());
  } catch (error) {
    applyUpdateState({
      status: 'error',
      error: normalizeError(error),
    });
  }

  return updateState.value;
}

export async function runUpdateInstall() {
  try {
    applyUpdateState(await installUpdate());
  } catch (error) {
    applyUpdateState({
      status: 'error',
      error: normalizeError(error),
    });
  }

  return updateState.value;
}

export function useUpdateService() {
  return {
    canInstallUpdate,
    disposeUpdateService,
    initializeUpdateService,
    runUpdateCheck,
    runUpdateInstall,
    updateBusy,
    updateProgressPercent,
    updateState,
    updateStatusText,
  };
}
