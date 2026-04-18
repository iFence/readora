import { settingsRepository } from '@/services/settingsRepository.js';

function normalizeSyncStatus(status = {}) {
  return {
    state: status.state || 'idle',
    mode: status.mode || 'unknown',
    compacted: Boolean(status.compacted),
    initializedRemote: Boolean(status.initializedRemote),
    attemptedAt: Number.isFinite(status.attemptedAt) ? status.attemptedAt : null,
    completedAt: Number.isFinite(status.completedAt) ? status.completedAt : null,
    lastSuccessAt: Number.isFinite(status.lastSuccessAt) ? status.lastSuccessAt : null,
    localChangeCount: Number.isFinite(status.localChangeCount) ? status.localChangeCount : 0,
    remoteChangeCount: Number.isFinite(status.remoteChangeCount) ? status.remoteChangeCount : 0,
    errorCategory: status.errorCategory || null,
    errorMessage: status.errorMessage || '',
  };
}

export async function loadSyncStatus() {
  return normalizeSyncStatus(await settingsRepository.getSyncStatus());
}

export async function saveSyncStatus(status) {
  const normalized = normalizeSyncStatus(status);
  await settingsRepository.setSyncStatus(normalized);
  return normalized;
}

export function getSyncRecoveryHint(status = {}) {
  switch (status.errorCategory) {
    case 'auth':
      return '请检查 WebDAV 用户名和密码，必要时重新保存配置后再同步。';
    case 'remote':
      return '请检查远端目录权限和 WebDAV 路径；如果远端文件被手动修改，建议重新执行一次全量初始化同步。';
    case 'network':
      return '请检查网络连接、代理或服务器可达性，然后重试同步。';
    default:
      return status.state === 'error'
        ? '请先测试 WebDAV 连接；如果问题持续，建议检查远端文件是否损坏并重新初始化同步。'
        : '';
  }
}
