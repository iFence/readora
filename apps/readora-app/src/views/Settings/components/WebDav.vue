<template>
  <div class="webdav-setting">
    <div class="setting-header">
      <h3>WebDAV 设置</h3>
      <p class="desc">配置 WebDAV 以同步您的书籍和阅读进度</p>
    </div>
    <div class="sync-status-panel" :class="syncStatus.state">
      <div class="sync-status-title">最近同步</div>
      <div class="sync-status-line">{{ syncSummary }}</div>
      <div v-if="syncStatus.lastSuccessAt" class="sync-status-line muted">
        最近成功时间：{{ formatTime(syncStatus.lastSuccessAt) }}
      </div>
      <div v-if="syncStatus.errorMessage" class="sync-status-line error">
        {{ syncStatus.errorMessage }}
      </div>
      <div v-if="syncHint" class="sync-status-line muted">
        {{ syncHint }}
      </div>
    </div>

    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
      class="settings-form"
    >
      <n-form-item label="服务器地址" path="url">
        <n-input
          v-model:value="form.url"
          class="settings-input"
          placeholder="https://dav.example.com/dav/"
        />
      </n-form-item>
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="form.username" class="settings-input" placeholder="请输入用户名" />
      </n-form-item>
      <n-form-item label="密码" path="password">
        <n-input
          v-model:value="form.password"
          class="settings-input"
          type="password"
          show-password-on="click"
          placeholder="请输入密码"
        />
      </n-form-item>
      
      <div class="actions">
        <n-button
          class="settings-button settings-button--secondary"
          :loading="testing"
          @click="testConnection"
        >
          测试连接
        </n-button>
        <n-button
          type="primary"
          class="settings-button settings-button--primary"
          :loading="saving"
          @click="saveSettings"
        >
          保存配置
        </n-button>
      </div>
    </n-form>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue';
import { NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui';
import {
  loadWebDavConfig,
  saveWebDavConfig,
  testWebDavConnection,
} from '@/services/webdavService.js';
import { getSyncRecoveryHint, loadSyncStatus } from '@/services/syncStatusService.js';
import { subscribeToSyncCompleted } from '@/services/syncService.js';

const message = useMessage();
const formRef = ref(null);
const testing = ref(false);
const saving = ref(false);
const syncStatus = ref({
  state: 'idle',
  mode: 'unknown',
  lastSuccessAt: null,
  compacted: false,
  localChangeCount: 0,
  remoteChangeCount: 0,
  errorMessage: '',
});

const form = reactive({
  url: '',
  username: '',
  password: ''
});

const rules = {
  url: {
    required: true,
    message: '请输入 WebDAV 服务器地址',
    trigger: 'blur'
  },
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur'
  }
};
let disposeSyncSubscription = null;

onMounted(async () => {
  const settings = await loadWebDavConfig();
  if (settings) {
    form.url = settings.url || '';
    form.username = settings.username || '';
    form.password = settings.password || '';
  }
  syncStatus.value = await loadSyncStatus();
  disposeSyncSubscription = subscribeToSyncCompleted(detail => {
    if (detail?.status) {
      syncStatus.value = detail.status;
    }
  });
});

onUnmounted(() => {
  disposeSyncSubscription?.();
  disposeSyncSubscription = null;
});

function formatTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
}

const syncSummary = computed(() => {
  if (syncStatus.value.state === 'error') {
    return `同步失败 (${syncStatus.value.errorCategory || 'unknown'})`;
  }

  if (syncStatus.value.state === 'success') {
    const modeLabel = syncStatus.value.mode === 'bootstrap' ? '全量初始化' : '增量同步';
    const compactLabel = syncStatus.value.compacted ? '，本次已压缩远端快照' : '';
    return `${modeLabel}成功，本地 ${syncStatus.value.localChangeCount} 条，远端 ${syncStatus.value.remoteChangeCount} 条${compactLabel}`;
  }

  return '尚未执行同步';
});

const syncHint = computed(() => getSyncRecoveryHint(syncStatus.value));

const testConnection = async () => {
  if (!form.url) {
    message.warning('请先输入服务器地址');
    return;
  }
  
  testing.value = true;
  try {
    const connected = await testWebDavConnection({ ...form });
    if (connected) {
      message.success('连接成功');
    } else {
      message.error('连接失败');
    }
  } catch {
    message.error('连接失败，请检查地址或网络（可能是跨域问题）');
  } finally {
    testing.value = false;
  }
};

const saveSettings = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      saving.value = true;
      try {
        await saveWebDavConfig({
          url: form.url,
          username: form.username,
          password: form.password
        });
        message.success('设置已保存');
      } catch (error) {
        message.error('保存失败');
      } finally {
        saving.value = false;
      }
    } else {
      message.error('请填写完整信息');
    }
  });
};
</script>

<style scoped>
@import "../settingsControls.css";

.webdav-setting {
  max-width: 600px;
  color: var(--text-primary);
}

.setting-header {
  margin-bottom: 24px;
}

.sync-status-panel {
  margin-bottom: 20px;
  padding: 12px 0 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 76%, transparent);
}

.sync-status-panel.success {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border-subtle));
}

.sync-status-panel.error {
  border-color: color-mix(in srgb, #d96b6b 30%, var(--border-subtle));
}

.sync-status-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-status-line {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.sync-status-line.muted {
  color: var(--text-muted);
}

.sync-status-line.error {
  color: #c05a5a;
}

.setting-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.settings-form :deep(.n-form-item) {
  margin-bottom: 16px;
}

.settings-form :deep(.n-form-item-label__text) {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-form :deep(.n-form-item-feedback-wrapper) {
  min-height: 22px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  gap: 12px;
}

@media (max-width: 767px) {
  .actions {
    justify-content: stretch;
    flex-direction: column;
  }
}
</style>
