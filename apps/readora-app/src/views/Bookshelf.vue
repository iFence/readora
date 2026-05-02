<template>
  <div class="bookshelf-page">
    <div class="bookshelf-container">
      <n-tabs class="bookshelf-tabs" type="line" animated>
        <template #suffix>
          <n-button quaternary circle @click="handleSync" :loading="syncing" :title="t('bookshelf.actions.syncTitle')">
            <template #icon>
              <n-icon>
                <sync-icon />
              </n-icon>
            </template>
          </n-button>
        </template>
        <n-tab-pane name="bookshelf" :tab="t('bookshelf.tabs.bookshelf')" class="bookshelf-tab-pane">
          <div class="sync-status-card" :class="syncStatus.state">
            <div class="sync-status-head">
              <strong>{{ t('bookshelf.sync.title') }}</strong>
              <span v-if="syncStatus.lastSuccessAt" class="sync-status-time">
                {{ t('bookshelf.sync.lastSuccess') }}{{ formatTime(syncStatus.lastSuccessAt) }}
              </span>
            </div>
            <div class="sync-status-body">
              <span>{{ syncSummary }}</span>
              <span v-if="syncStatus.errorMessage" class="sync-status-error">{{ syncStatus.errorMessage }}</span>
            </div>
            <div v-if="syncHint" class="sync-status-hint">{{ syncHint }}</div>
          </div>
          <div class="bookshelf-wrapper">
            <div class="bookshelf">
              <book-card
                v-for="book in latestBooks"
                :key="book.identifier || book.bookUrl"
                :cover="book.cover"
                :title="book.title"
                :author="book.author"
                :progress="book.progress"
                :total-reading-time-ms="book.totalReadingTimeMs"
                :url="book.bookUrl"
              />
              <book-card
                v-if="canImportBook"
                class="justify-center add-book-card"
                @click="addBook"
              >
                <div class="add-card-content">
                  <div class="add-icon flex justify-center">
                    <add-icon style="color: var(--text-color)" />
                  </div>
                  <div class="add-card-copy">
                    <strong>{{ t('bookshelf.actions.importBook') }}</strong>
                    <span>{{ t('bookshelf.actions.importHint') }}</span>
                  </div>
                </div>
              </book-card>
            </div>
          </div>
        </n-tab-pane>
        <n-tab-pane name="lists" :tab="t('bookshelf.tabs.lists')">
          {{ t('common.comingSoon') }}
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from 'vue-i18n';
import { NTabs, NTabPane, NButton, NIcon, useMessage } from 'naive-ui';
import AddIcon from "@/assets/svg/AddIcon.vue";
import SyncIcon from "@/assets/svg/SyncIcon.vue";
import BookCard from "@/components/BookCard.vue";
import { supportsFilePicker } from '@/platform/tauri/capabilities.js';
import { libraryRepository } from '@/services/libraryRepository.js';
import { getSyncRecoveryHint, loadSyncStatus } from '@/services/syncStatusService.js';
import { subscribeToSyncCompleted, syncLibrary } from '@/services/syncService.js';
import { pickAndOpenBook } from '@/services/windowService.js';

const { t } = useI18n();
const message = useMessage();
const latestBooks = ref([]);
const syncing = ref(false);
const canImportBook = supportsFilePicker();
const syncStatus = ref({
  state: 'idle',
  mode: 'unknown',
  lastSuccessAt: null,
  localChangeCount: 0,
  remoteChangeCount: 0,
  compacted: false,
  initializedRemote: false,
  errorMessage: '',
});

function formatTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
}

const syncSummary = computed(() => {
  if (syncStatus.value.state === 'error') {
    return t('bookshelf.sync.failed', {
      category: syncStatus.value.errorCategory || 'unknown',
    });
  }

  if (syncStatus.value.state === 'success') {
    return t('bookshelf.sync.success', {
      mode: syncStatus.value.mode === 'bootstrap'
        ? t('bookshelf.sync.bootstrap')
        : t('bookshelf.sync.incremental'),
      local: syncStatus.value.localChangeCount,
      remote: syncStatus.value.remoteChangeCount,
      compacted: syncStatus.value.compacted ? t('bookshelf.sync.compacted') : '',
    });
  }

  return t('bookshelf.sync.idle');
});

const syncHint = computed(() => getSyncRecoveryHint(syncStatus.value));
let disposeSyncSubscription = null;

async function loadLatestBooks() {
  latestBooks.value = await libraryRepository.getLatestBooks();
}

onMounted(async () => {
  await loadLatestBooks();
  syncStatus.value = await loadSyncStatus();
  disposeSyncSubscription = subscribeToSyncCompleted(detail => {
    if (detail?.books) {
      latestBooks.value = detail.books;
    } else {
      void loadLatestBooks();
    }
    if (detail?.status) {
      syncStatus.value = detail.status;
    }
  });
  window.setTimeout(() => {
    void loadLatestBooks();
  }, 400);
});

onActivated(() => {
  void loadLatestBooks();
});

onUnmounted(() => {
  disposeSyncSubscription?.();
  disposeSyncSubscription = null;
});

async function handleSync() {
  syncing.value = true;
  try {
    const { books, status } = await syncLibrary();
    latestBooks.value = books;
    syncStatus.value = status;
    message.success(
      status.mode === 'bootstrap'
        ? t('bookshelf.messages.syncBootstrapSuccess')
        : t('bookshelf.messages.syncSuccess')
    );
  } catch (error) {
    syncStatus.value = error?.syncStatus || await loadSyncStatus();
    message.error(t('bookshelf.messages.syncFailed', { reason: error.message }));
  } finally {
    syncing.value = false;
  }
}

function addBook() {
  pickAndOpenBook().catch(() => {});
}
</script>

<style scoped>
.bookshelf-page {
  height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  background: var(--surface-app);
  overflow: hidden;
}

.bookshelf-container {
  width: min(1200px, calc(100% - 32px));
  height: 100%;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 40px) 0 calc(32px + var(--app-bottom-nav-height, 0px));
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}

.add-card-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.add-card-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-primary);
}

.add-card-copy span {
  color: var(--text-secondary);
  line-height: 1.5;
}

.add-icon {
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--accent-soft);
  flex-shrink: 0;
}

.add-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.bookshelf-wrapper {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  padding-top: 8px;
  padding-right: 4px;
  padding-bottom: 8px;
}

.bookshelf-wrapper::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.bookshelf {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: max-content;
  gap: 16px;
  width: 100%;
  min-height: 0;
}

.sync-status-card {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-panel);
}

.sync-status-card.success {
  border-color: color-mix(in srgb, var(--accent) 20%, var(--border-subtle));
}

.sync-status-card.error {
  border-color: color-mix(in srgb, #d96b6b 40%, var(--border-subtle));
}

.sync-status-head,
.sync-status-body {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.sync-status-body {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.sync-status-time {
  color: var(--text-muted);
  font-size: 0.84rem;
}

.sync-status-error {
  color: #c05a5a;
}

.sync-status-hint {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

:deep(.bookshelf-tabs.n-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

:deep(.bookshelf-tabs .n-tabs-nav) {
  margin-bottom: 20px;
  padding: 8px 20px 0;
  background-color: var(--surface-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 24px 24px 0 0;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

:deep(.bookshelf-tabs .n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
}

:deep(.bookshelf-tabs .n-tabs-content) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 24px;
  background-color: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-top: none;
  border-radius: 0 0 28px 28px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

:deep(.bookshelf-tab-pane.n-tab-pane) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

@media (max-width: 1180px) {
  .bookshelf {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .bookshelf {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sync-status-head,
  .sync-status-body {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .bookshelf-container {
    width: min(100%, calc(100% - 24px));
    padding-bottom: calc(28px + var(--app-bottom-nav-height, 0px));
  }

  :deep(.bookshelf-tabs .n-tabs-nav) {
    margin-bottom: 14px;
    padding: 8px 14px 0;
    border-radius: 20px 20px 0 0;
  }

  :deep(.bookshelf-tabs .n-tabs-content) {
    padding: 16px;
    border-radius: 0 0 22px 22px;
  }

  .bookshelf {
    grid-template-columns: 1fr;
  }

  .add-card-content {
    align-items: flex-start;
  }
}
</style>
