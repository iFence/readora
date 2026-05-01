<template>
  <div class="plugins-setting">
    <div class="setting-header">
      <h3>{{ t('settings.plugins.title') }}</h3>
      <p class="desc">{{ t('settings.plugins.description') }}</p>
    </div>

    <section class="plugin-section">
      <div class="section-header">
        <div>
          <h4>{{ t('settings.plugins.listTitle') }}</h4>
          <p>{{ t('settings.plugins.listDescription') }}</p>
        </div>
        <n-button class="settings-button settings-button--secondary" @click="showManifestModal = true">
          {{ t('settings.plugins.installManifest') }}
        </n-button>
      </div>

      <div v-if="pluginEntries.length" class="plugin-list">
        <div
          v-for="plugin in pluginEntries"
          :key="plugin.id"
          class="plugin-row"
          :class="{ selected: selectedPluginId === plugin.id }"
          @click="openPluginDetail(plugin.id)"
        >
          <button type="button" class="plugin-select">
            <span class="plugin-title">{{ plugin.manifest.name }}</span>
            <span class="plugin-description">{{ plugin.manifest.description }}</span>
            <span class="plugin-footnote">{{ plugin.id }} · {{ plugin.manifest.version }}</span>
          </button>
          <div class="plugin-actions">
            <span class="plugin-state" :class="{ enabled: plugin.installed && plugin.enabled }">
              {{ getPluginStatusLabel(plugin.installed, plugin.enabled) }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ t('settings.plugins.empty') }}</div>
    </section>

    <n-modal
      v-model:show="showPluginDetailModal"
      preset="card"
      class="plugin-detail-modal"
      :style="pluginDetailModalStyle"
      :bordered="false"
      :segmented="false"
      :title="null"
    >
      <div class="plugin-detail-shell">
        <aside class="plugin-detail-sidebar">
          <div class="plugin-detail-sidebar-title">{{ t('settings.plugins.sidebarTitle') }}</div>
          <button
            v-for="plugin in pluginEntries"
            :key="plugin.id"
            type="button"
            class="plugin-detail-list-item"
            :class="{ selected: selectedPluginId === plugin.id }"
            @click="selectPlugin(plugin.id)"
          >
            <span class="plugin-detail-list-name">{{ plugin.manifest.name }}</span>
            <span class="plugin-detail-list-status">
              {{ getPluginStatusLabel(plugin.installed, plugin.enabled) }}
            </span>
          </button>
        </aside>

        <main v-if="selectedPluginEntry" class="plugin-detail-main">
          <section class="plugin-info-panel">
            <div class="plugin-info-main">
              <div>
                <div class="plugin-title-row">
                  <h3>{{ selectedPluginManifest.name }}</h3>
                  <span class="plugin-status-badge inline" :class="{ enabled: selectedPluginEntry.enabled }">
                    {{ getPluginStatusLabel(selectedPluginEntry.installed, selectedPluginEntry.enabled) }}
                  </span>
                </div>
                <p>{{ selectedPluginManifest.description }}</p>
              </div>
            </div>
            <div class="plugin-info-grid">
              <div>
                <span>{{ t('settings.plugins.infoVersion') }}</span>
                <strong>{{ selectedPluginManifest.version || '-' }}</strong>
              </div>
              <div>
                <span>{{ t('settings.plugins.infoAuthor') }}</span>
                <strong>{{ selectedPluginManifest.author || '-' }}</strong>
              </div>
              <div>
                <span>{{ t('settings.plugins.infoType') }}</span>
                <strong>{{ selectedPluginManifest.type || '-' }}</strong>
              </div>
              <div>
                <span>{{ t('settings.plugins.infoId') }}</span>
                <strong>{{ selectedPluginEntry.id }}</strong>
              </div>
            </div>

            <div class="plugin-info-actions">
              <n-button
                v-if="!selectedPluginEntry.installed"
                type="primary"
                class="settings-button settings-button--primary"
                @click="installSelectedPlugin"
              >
                {{ t('settings.plugins.install') }}
              </n-button>
              <n-switch
                v-else
                :value="selectedPluginEntry.enabled"
                @update:value="value => updateEnabled(selectedPluginEntry.id, value)"
              />
              <n-button class="settings-button settings-button--secondary" disabled>
                {{ t('settings.plugins.update') }}
              </n-button>
              <n-button
                v-if="selectedPluginEntry.installed"
                class="settings-button settings-button--ghost"
                @click="removeSelectedPlugin"
              >
                {{ t('settings.plugins.uninstall') }}
              </n-button>
            </div>
          </section>

          <section class="plugin-config-panel">
            <template v-if="!selectedPluginEntry.installed">
              <div class="empty-state">{{ t('settings.plugins.notInstalled') }}</div>
            </template>

            <template v-else-if="isReaderAssistantPluginSelected">
              <n-tabs type="line" animated class="ai-config-tabs">
                <n-tab-pane name="models" :tab="t('settings.plugins.ai.modelTab')">
                  <div class="ai-section-header">
                    <div>
                      <span class="ai-section-kicker">{{ t('settings.plugins.ai.modelKicker') }}</span>
                      <h4>{{ t('settings.plugins.ai.modelTitle') }}</h4>
                      <p>{{ t('settings.plugins.ai.modelDescription') }}</p>
                    </div>
                    <n-button class="settings-button settings-button--secondary" @click="createModelProvider">
                      {{ t('settings.plugins.ai.addModel') }}
                    </n-button>
                  </div>

                  <div class="ai-config-layout">
                    <aside class="ai-entity-pane">
                      <div class="ai-pane-title">{{ t('settings.plugins.ai.modelList') }}</div>
                      <div v-if="modelProviders.length" class="entity-list compact-list">
                        <button
                          v-for="provider in modelProviders"
                          :key="provider.id"
                          type="button"
                          class="entity-row"
                          :class="{ selected: selectedModelProviderId === provider.id }"
                          @click="selectModelProvider(provider.id)"
                        >
                          <span class="entity-main">
                            <span class="entity-title">{{ provider.name }}</span>
                            <span class="entity-description">{{ provider.model || t('settings.plugins.ai.fieldModel') }}</span>
                          </span>
                          <span class="entity-badges">
                            <span class="entity-badge">{{ provider.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI' }}</span>
                            <span v-if="activeModelProviderId === provider.id" class="entity-badge active">{{ t('settings.plugins.ai.badgeCurrent') }}</span>
                            <span v-if="!provider.enabled" class="entity-badge muted">{{ t('settings.plugins.ai.badgeDisabled') }}</span>
                          </span>
                        </button>
                      </div>
                      <div v-else class="empty-state compact-empty">{{ t('settings.plugins.ai.noModels') }}</div>
                    </aside>

                    <div class="ai-editor-pane">
                      <div class="ai-editor-title">
                        <div>
                          <h5>{{ modelDraft.name || t('settings.plugins.ai.modelDetail') }}</h5>
                          <p>{{ modelDraft.model || t('settings.plugins.ai.modelDetailHint') }}</p>
                        </div>
                      </div>

                      <n-form v-if="modelDraft.id" label-placement="top" class="settings-form model-form">
                        <div class="form-grid">
                          <n-form-item :label="t('settings.plugins.ai.fieldName')">
                            <n-input v-model:value="modelDraft.name" class="settings-input" :placeholder="t('settings.plugins.ai.fieldNamePlaceholder')" />
                          </n-form-item>
                          <n-form-item>
                            <template #label>
                              <span class="field-label-with-tip">
                                {{ t('settings.plugins.ai.fieldProtocol') }}
                                <n-tooltip trigger="hover">
                                  <template #trigger>
                                    <span class="field-tip-trigger">?</span>
                                  </template>
                                  {{ t('settings.plugins.ai.protocolTip') }}
                                </n-tooltip>
                              </span>
                            </template>
                            <n-select
                              v-model:value="modelDraft.protocol"
                              class="settings-select"
                              :options="protocolOptions"
                            />
                          </n-form-item>
                        </div>

                        <n-form-item>
                          <template #label>
                            <span class="field-label-with-tip">
                              {{ t('settings.plugins.ai.fieldEndpoint') }}
                              <n-tooltip trigger="hover">
                                <template #trigger>
                                  <span class="field-tip-trigger">?</span>
                                </template>
                                {{ t('settings.plugins.ai.endpointTip') }}
                              </n-tooltip>
                            </span>
                          </template>
                          <n-input v-model:value="modelDraft.baseUrl" class="settings-input" :placeholder="t('settings.plugins.ai.fieldEndpointPlaceholder')" />
                        </n-form-item>

                        <div class="form-grid">
                          <n-form-item :label="t('settings.plugins.ai.fieldModel')">
                            <n-input v-model:value="modelDraft.model" class="settings-input" :placeholder="t('settings.plugins.ai.fieldModelPlaceholder')" />
                          </n-form-item>
                          <n-form-item>
                            <template #label>
                              <span class="field-label-with-tip">
                                {{ t('settings.plugins.ai.fieldTemperature') }}
                                <n-tooltip trigger="hover">
                                  <template #trigger>
                                    <span class="field-tip-trigger">?</span>
                                  </template>
                                  {{ t('settings.plugins.ai.temperatureTip') }}
                                </n-tooltip>
                              </span>
                            </template>
                            <n-input-number v-model:value="modelDraft.temperature" class="settings-input numeric-input" :step="0.1" />
                          </n-form-item>
                        </div>

                        <n-form-item :label="t('settings.plugins.ai.fieldApiKey')">
                          <n-input
                            v-model:value="modelDraft.apiKey"
                            class="settings-input"
                            type="password"
                            show-password-on="click"
                            :placeholder="t('settings.plugins.ai.fieldApiKeyPlaceholder')"
                          />
                        </n-form-item>

                        <div class="actions ai-form-actions">
                          <span class="inline-switch">
                            <n-switch v-model:value="modelDraft.enabled" />
                            <span class="switch-label">{{ t('settings.plugins.statusEnabled') }}</span>
                          </span>
                          <n-button
                            class="settings-button settings-button--secondary"
                            :disabled="!modelDraft.enabled || activeModelProviderId === modelDraft.id"
                            @click="activateSelectedModel"
                          >
                            {{ t('settings.plugins.ai.activateModel') }}
                          </n-button>
                          <n-button type="primary" class="settings-button settings-button--primary" @click="saveSelectedModel">
                            {{ t('settings.plugins.ai.saveModel') }}
                          </n-button>
                          <n-button class="settings-button settings-button--ghost" @click="removeSelectedModel">
                            {{ t('settings.plugins.ai.deleteModel') }}
                          </n-button>
                        </div>
                      </n-form>
                    </div>
                  </div>
                </n-tab-pane>

                <n-tab-pane name="skills" :tab="t('settings.plugins.ai.skillTab')">
                  <div class="ai-section-header">
                    <div>
                      <span class="ai-section-kicker">{{ t('settings.plugins.ai.skillKicker') }}</span>
                      <h4>{{ t('settings.plugins.ai.skillTitle') }}</h4>
                      <p>{{ t('settings.plugins.ai.skillDescription') }}</p>
                    </div>
                    <n-button class="settings-button settings-button--secondary" @click="createReadingSkill">
                      {{ t('settings.plugins.ai.addSkill') }}
                    </n-button>
                  </div>

                  <div class="ai-config-layout skill-layout">
                    <aside class="ai-entity-pane">
                      <div class="ai-pane-title">{{ t('settings.plugins.ai.skillList') }}</div>
                      <div v-if="readingSkills.length" class="entity-list compact-list">
                        <button
                          v-for="skill in readingSkills"
                          :key="skill.id"
                          type="button"
                          class="entity-row"
                          :class="{ selected: selectedReadingSkillId === skill.id }"
                          @click="selectReadingSkill(skill.id)"
                        >
                          <span class="entity-main">
                            <span class="entity-title">{{ skill.name }}</span>
                            <span class="entity-description">{{ skill.description || t('settings.plugins.ai.fieldSkillDescription') }}</span>
                          </span>
                          <span class="entity-badges">
                            <span v-if="activeReadingSkillId === skill.id" class="entity-badge active">{{ t('settings.plugins.ai.badgeDefault') }}</span>
                            <span v-if="!skill.enabled" class="entity-badge muted">{{ t('settings.plugins.ai.badgeDisabled') }}</span>
                          </span>
                        </button>
                      </div>
                      <div v-else class="empty-state compact-empty">{{ t('settings.plugins.ai.noSkills') }}</div>
                    </aside>

                    <div class="ai-editor-pane">
                      <div class="ai-editor-title">
                        <div>
                          <h5>{{ skillDraft.name || t('settings.plugins.ai.skillDetail') }}</h5>
                          <p>{{ skillDraft.description || t('settings.plugins.ai.skillDetailHint') }}</p>
                        </div>
                      </div>

                      <n-form v-if="skillDraft.id" label-placement="top" class="settings-form">
                        <div class="form-grid">
                          <n-form-item :label="t('settings.plugins.ai.fieldName')">
                            <n-input v-model:value="skillDraft.name" class="settings-input" :placeholder="t('settings.plugins.ai.fieldSkillNamePlaceholder')" />
                          </n-form-item>
                          <n-form-item :label="t('settings.plugins.ai.fieldSkillDescription')">
                            <n-input v-model:value="skillDraft.description" class="settings-input" :placeholder="t('settings.plugins.ai.fieldSkillDescriptionPlaceholder')" />
                          </n-form-item>
                        </div>

                        <n-form-item :label="t('settings.plugins.ai.fieldSkillPrompt')">
                          <n-input
                            v-model:value="skillDraft.systemPrompt"
                            type="textarea"
                            class="settings-input"
                            :autosize="{ minRows: 7, maxRows: 14 }"
                            :placeholder="t('settings.plugins.ai.fieldSkillPromptPlaceholder')"
                          />
                        </n-form-item>

                        <div class="actions ai-form-actions">
                          <span class="inline-switch">
                            <n-switch v-model:value="skillDraft.enabled" />
                            <span class="switch-label">{{ t('settings.plugins.statusEnabled') }}</span>
                          </span>
                          <n-button
                            class="settings-button settings-button--secondary"
                            :disabled="!skillDraft.enabled || activeReadingSkillId === skillDraft.id"
                            @click="activateSelectedSkill"
                          >
                            {{ t('settings.plugins.ai.activateSkill') }}
                          </n-button>
                          <n-button type="primary" class="settings-button settings-button--primary" @click="saveSelectedSkill">
                            {{ t('settings.plugins.ai.saveSkill') }}
                          </n-button>
                          <n-button class="settings-button settings-button--ghost" @click="removeSelectedSkill">
                            {{ t('settings.plugins.ai.deleteSkill') }}
                          </n-button>
                        </div>
                      </n-form>
                    </div>
                  </div>
                </n-tab-pane>
              </n-tabs>
            </template>

            <template v-else-if="isWebDavPluginSelected">
              <div class="sync-status-panel" :class="syncStatus.state">
                <div class="sync-status-title">{{ t('settings.plugins.webdav.lastSync') }}</div>
                <div class="sync-status-line">{{ syncSummary }}</div>
                <div v-if="syncStatus.lastSuccessAt" class="sync-status-line muted">
                  {{ t('settings.plugins.webdav.lastSuccess') }}{{ formatTime(syncStatus.lastSuccessAt) }}
                </div>
                <div v-if="syncStatus.errorMessage" class="sync-status-line error">
                  {{ syncStatus.errorMessage }}
                </div>
                <div v-if="syncHint" class="sync-status-line muted">
                  {{ syncHint }}
                </div>
              </div>

              <n-form
                ref="webDavFormRef"
                :model="webDavForm"
                :rules="webDavRules"
                label-placement="left"
                label-width="100"
                require-mark-placement="right-hanging"
                class="settings-form webdav-form"
              >
                <n-form-item :label="t('settings.plugins.webdav.serverUrl')" path="url">
                  <n-input
                    v-model:value="webDavForm.url"
                    class="settings-input"
                    :placeholder="t('settings.plugins.webdav.serverPlaceholder')"
                  />
                </n-form-item>
                <n-form-item :label="t('settings.plugins.webdav.username')" path="username">
                  <n-input v-model:value="webDavForm.username" class="settings-input" :placeholder="t('settings.plugins.webdav.usernamePlaceholder')" />
                </n-form-item>
                <n-form-item :label="t('settings.plugins.webdav.password')" path="password">
                  <n-input
                    v-model:value="webDavForm.password"
                    class="settings-input"
                    type="password"
                    show-password-on="click"
                    :placeholder="t('settings.plugins.webdav.passwordPlaceholder')"
                  />
                </n-form-item>

                <div class="actions">
                  <n-button
                    class="settings-button settings-button--secondary"
                    :loading="webDavTesting"
                    @click="testWebDav"
                  >
                    {{ t('settings.plugins.webdav.testConnection') }}
                  </n-button>
                  <n-button
                    type="primary"
                    class="settings-button settings-button--primary"
                    :loading="webDavSaving"
                    @click="saveWebDav"
                  >
                    {{ t('settings.plugins.webdav.saveConfig') }}
                  </n-button>
                </div>
              </n-form>
            </template>

            <template v-else-if="isPomodoroPluginSelected">
              <n-form label-placement="top" class="settings-form pomodoro-form">
                <div class="form-grid">
                  <n-form-item :label="t('settings.plugins.pomodoro.focusMinutes')">
                    <n-input-number
                      v-model:value="pomodoroDraft.focusMinutes"
                      class="settings-input numeric-input"
                      :min="1"
                      :max="180"
                      :step="1"
                    />
                  </n-form-item>
                  <n-form-item :label="t('settings.plugins.pomodoro.breakMinutes')">
                    <n-input-number
                      v-model:value="pomodoroDraft.breakMinutes"
                      class="settings-input numeric-input"
                      :min="1"
                      :max="60"
                      :step="1"
                    />
                  </n-form-item>
                </div>
                <div class="actions">
                  <n-button
                    type="primary"
                    class="settings-button settings-button--primary"
                    @click="savePomodoro"
                  >
                    {{ t('settings.plugins.pomodoro.saveConfig') }}
                  </n-button>
                </div>
              </n-form>
            </template>

            <div v-else class="empty-state">{{ t('settings.plugins.noBuiltInConfig') }}</div>
          </section>
        </main>
      </div>
    </n-modal>

    <n-modal v-model:show="showManifestModal" preset="dialog" :title="t('settings.plugins.manifestTitle')">
      <div class="manifest-modal">
        <n-input
          v-model:value="manifestText"
          type="textarea"
          :autosize="{ minRows: 8, maxRows: 14 }"
          class="settings-input"
          :placeholder="t('settings.plugins.manifestPlaceholder')"
        />
        <div class="actions">
          <n-button class="settings-button settings-button--ghost" @click="showManifestModal = false">
            {{ t('settings.plugins.actions.cancel') }}
          </n-button>
          <n-button type="primary" class="settings-button settings-button--primary" @click="installManifest">
            {{ t('settings.plugins.install') }}
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  NTabPane,
  NTabs,
  NTooltip,
  useMessage,
} from 'naive-ui';
import {
  installBuiltInPlugin,
  installPluginManifest,
  listPlugins,
  parsePluginManifestJson,
  setPluginEnabled,
  uninstallPlugin,
} from '@/services/pluginService.js';
import {
  deleteModelProvider,
  deleteReadingSkill,
  getAiSettings,
  READER_ASSISTANT_PLUGIN_ID,
  saveModelProvider,
  saveReadingSkill,
  setActiveModelProvider,
  setActiveReadingSkill,
} from '@/services/aiSettingsService.js';
import {
  loadWebDavConfig,
  saveWebDavConfig,
  testWebDavConnection,
  WEB_DAV_SYNC_PLUGIN_ID,
} from '@/services/webdavService.js';
import {
  loadPomodoroConfig,
  POMODORO_PLUGIN_ID,
  savePomodoroConfig,
} from '@/services/pomodoroPluginService.js';
import { getSyncRecoveryHint, loadSyncStatus } from '@/services/syncStatusService.js';
import { subscribeToSyncCompleted } from '@/services/syncService.js';

const message = useMessage();
const { t } = useI18n();
const availablePlugins = ref([]);
const installedPlugins = ref([]);
const selectedPluginId = ref('');
const manifestText = ref('');
const showManifestModal = ref(false);
const showPluginDetailModal = ref(false);
const modelProviders = ref([]);
const readingSkills = ref([]);
const activeModelProviderId = ref('');
const activeReadingSkillId = ref('');
const selectedModelProviderId = ref('');
const selectedReadingSkillId = ref('');
const modelDraft = reactive({});
const skillDraft = reactive({});
const webDavFormRef = ref(null);
const webDavTesting = ref(false);
const webDavSaving = ref(false);
const webDavForm = reactive({
  url: '',
  username: '',
  password: '',
});
const pomodoroDraft = reactive({
  focusMinutes: 25,
  breakMinutes: 5,
});
const syncStatus = ref({
  state: 'idle',
  mode: 'unknown',
  lastSuccessAt: null,
  compacted: false,
  localChangeCount: 0,
  remoteChangeCount: 0,
  errorMessage: '',
});
let disposeSyncSubscription = null;

const protocolOptions = computed(() => ([
  { label: t('settings.plugins.ai.protocolOpenAI'), value: 'openai' },
  { label: t('settings.plugins.ai.protocolAnthropic'), value: 'anthropic' },
]));

const selectedPlugin = computed(() => (
  installedPlugins.value.find(plugin => plugin.id === selectedPluginId.value) || null
));
function getPluginStatusLabel(installed, enabled) {
  if (!installed) {
    return t('settings.plugins.statusNotInstalled');
  }
  return enabled ? t('settings.plugins.statusEnabled') : t('settings.plugins.statusDisabled');
}
function localizePluginManifest(plugin) {
  if (!plugin) {
    return plugin;
  }
  if (plugin.id === READER_ASSISTANT_PLUGIN_ID) {
    return {
      ...plugin,
      name: t('settings.plugins.builtIn.readerAssistantName'),
      description: t('settings.plugins.builtIn.readerAssistantDescription'),
    };
  }
  if (plugin.id === WEB_DAV_SYNC_PLUGIN_ID) {
    return {
      ...plugin,
      name: t('settings.plugins.builtIn.webdavName'),
      description: t('settings.plugins.builtIn.webdavDescription'),
    };
  }
  if (plugin.id === POMODORO_PLUGIN_ID) {
    return {
      ...plugin,
      name: t('settings.plugins.builtIn.pomodoroName'),
      description: t('settings.plugins.builtIn.pomodoroDescription'),
    };
  }
  return plugin;
}
const pluginEntries = computed(() => {
  const installedEntries = installedPlugins.value.map(plugin => ({
    id: plugin.id,
    manifest: localizePluginManifest(plugin.manifest),
    installed: true,
    enabled: plugin.enabled,
  }));
  const installedIds = new Set(installedEntries.map(plugin => plugin.id));
  const availableEntries = availablePlugins.value
    .filter(plugin => !installedIds.has(plugin.id))
    .map(plugin => ({
      id: plugin.id,
      manifest: localizePluginManifest(plugin),
      installed: false,
      enabled: false,
    }));

  return [...installedEntries, ...availableEntries];
});
const selectedPluginEntry = computed(() => (
  pluginEntries.value.find(plugin => plugin.id === selectedPluginId.value) || null
));
const selectedPluginManifest = computed(() => selectedPluginEntry.value?.manifest || {});
const pluginDetailModalStyle = {
  width: '80vw',
  maxWidth: '1120px',
  minWidth: '760px',
};
const isReaderAssistantPluginSelected = computed(() => selectedPlugin.value?.id === READER_ASSISTANT_PLUGIN_ID);
const isWebDavPluginSelected = computed(() => selectedPlugin.value?.id === WEB_DAV_SYNC_PLUGIN_ID);
const isPomodoroPluginSelected = computed(() => selectedPlugin.value?.id === POMODORO_PLUGIN_ID);
const webDavRules = {
  url: {
    required: true,
    message: t('settings.plugins.webdav.serverUrl'),
    trigger: 'blur',
  },
  username: {
    required: true,
    message: t('settings.plugins.webdav.username'),
    trigger: 'blur',
  },
  password: {
    required: true,
    message: t('settings.plugins.webdav.password'),
    trigger: 'blur',
  },
};
const syncSummary = computed(() => {
  if (syncStatus.value.state === 'error') {
    return `${t('settings.plugins.webdav.syncFailed')} (${syncStatus.value.errorCategory || 'unknown'})`;
  }

  if (syncStatus.value.state === 'success') {
    const modeLabel = syncStatus.value.mode === 'bootstrap'
      ? t('settings.plugins.webdav.syncBootstrap')
      : t('settings.plugins.webdav.syncIncremental');
    const compactLabel = syncStatus.value.compacted ? t('settings.plugins.webdav.syncCompacted') : '';
    return t('settings.plugins.webdav.syncSuccess', {
      mode: modeLabel,
      local: syncStatus.value.localChangeCount,
      remote: syncStatus.value.remoteChangeCount,
      compacted: compactLabel,
    });
  }

  return t('settings.plugins.webdav.neverSynced');
});
const syncHint = computed(() => getSyncRecoveryHint(syncStatus.value));

function createId(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}.${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

function resetReactive(target, value) {
  Object.keys(target).forEach(key => delete target[key]);
  Object.assign(target, value);
}

function createEmptyModelProvider() {
  return {
    id: createId('readora.model'),
    name: '',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    enabled: true,
  };
}

function createEmptyReadingSkill() {
  return {
    id: createId('readora.skill'),
    name: '',
    description: '',
    systemPrompt: 'You are a reading assistant for an EPUB reader. Answer based only on the supplied book context. Return concise, structured Chinese unless the user asks for another language.',
    enabled: true,
  };
}

async function refreshPlugins() {
  const pluginState = await listPlugins();
  availablePlugins.value = pluginState.available;
  installedPlugins.value = pluginState.installed;

  if (!selectedPluginId.value && pluginEntries.value.length) {
    selectedPluginId.value = pluginEntries.value[0].id;
  }

  if (!pluginEntries.value.some(plugin => plugin.id === selectedPluginId.value)) {
    selectedPluginId.value = pluginEntries.value[0]?.id || '';
  }
}

async function refreshAiSettings() {
  if (!isReaderAssistantPluginSelected.value) {
    resetReactive(modelDraft, {});
    resetReactive(skillDraft, {});
    return;
  }

  const settings = await getAiSettings();
  modelProviders.value = settings.modelProviders;
  readingSkills.value = settings.readingSkills;
  activeModelProviderId.value = settings.activeModelProviderId;
  activeReadingSkillId.value = settings.activeReadingSkillId;

  if (!selectedModelProviderId.value && modelProviders.value.length) {
    selectedModelProviderId.value = activeModelProviderId.value || modelProviders.value[0].id;
  }
  if (!selectedReadingSkillId.value && readingSkills.value.length) {
    selectedReadingSkillId.value = activeReadingSkillId.value || readingSkills.value[0].id;
  }

  const selectedModel = modelProviders.value.find(provider => provider.id === selectedModelProviderId.value);
  const selectedSkill = readingSkills.value.find(skill => skill.id === selectedReadingSkillId.value);
  resetReactive(modelDraft, selectedModel || {});
  resetReactive(skillDraft, selectedSkill || {});
}

async function refreshWebDavSettings() {
  if (!isWebDavPluginSelected.value) {
    return;
  }

  const config = await loadWebDavConfig();
  webDavForm.url = config.url || '';
  webDavForm.username = config.username || '';
  webDavForm.password = config.password || '';
  syncStatus.value = await loadSyncStatus();
}

async function refreshPomodoroSettings() {
  if (!isPomodoroPluginSelected.value) {
    return;
  }

  const config = await loadPomodoroConfig();
  pomodoroDraft.focusMinutes = config.focusMinutes;
  pomodoroDraft.breakMinutes = config.breakMinutes;
}

async function refreshAll() {
  await refreshPlugins();
  await refreshAiSettings();
  await refreshWebDavSettings();
  await refreshPomodoroSettings();
}

async function selectPlugin(pluginId) {
  selectedPluginId.value = pluginId;
  selectedModelProviderId.value = '';
  selectedReadingSkillId.value = '';
  await refreshAiSettings();
  await refreshWebDavSettings();
  await refreshPomodoroSettings();
}

async function openPluginDetail(pluginId) {
  await selectPlugin(pluginId);
  showPluginDetailModal.value = true;
}

async function installBuiltIn(pluginId) {
  try {
    await installBuiltInPlugin(pluginId);
    await setPluginEnabled(pluginId, true);
    await refreshPlugins();
    await selectPlugin(pluginId);
    message.success(t('settings.plugins.messages.pluginInstalled'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.pluginInstallFailed'));
  }
}

async function installSelectedPlugin() {
  if (!selectedPluginEntry.value) {
    return;
  }

  await installBuiltIn(selectedPluginEntry.value.id);
}

async function installManifest() {
  try {
    const manifest = parsePluginManifestJson(manifestText.value);
    await installPluginManifest(manifest);
    await refreshPlugins();
    await selectPlugin(manifest.id);
    showManifestModal.value = false;
    manifestText.value = '';
    message.success(t('settings.plugins.messages.pluginInstalled'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.manifestInvalid'));
  }
}

async function updateEnabled(pluginId, enabled) {
  try {
    await setPluginEnabled(pluginId, enabled);
    await refreshAll();
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.pluginStateFailed'));
  }
}

async function removePlugin(pluginId) {
  try {
    await uninstallPlugin(pluginId);
    if (selectedPluginId.value === pluginId) {
      selectedPluginId.value = '';
    }
    await refreshAll();
    message.success(t('settings.plugins.messages.pluginRemoved'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.pluginRemoveFailed'));
  }
}

async function removeSelectedPlugin() {
  if (!selectedPluginEntry.value?.installed) {
    return;
  }

  await removePlugin(selectedPluginEntry.value.id);
}

function selectModelProvider(providerId) {
  selectedModelProviderId.value = providerId;
  const provider = modelProviders.value.find(item => item.id === providerId);
  resetReactive(modelDraft, provider || {});
}

function selectReadingSkill(skillId) {
  selectedReadingSkillId.value = skillId;
  const skill = readingSkills.value.find(item => item.id === skillId);
  resetReactive(skillDraft, skill || {});
}

function createModelProvider() {
  resetReactive(modelDraft, createEmptyModelProvider());
  selectedModelProviderId.value = modelDraft.id;
}

function createReadingSkill() {
  resetReactive(skillDraft, createEmptyReadingSkill());
  selectedReadingSkillId.value = skillDraft.id;
}

async function saveSelectedModel() {
  try {
    if (!modelDraft.name?.trim() || !modelDraft.model?.trim()) {
      throw new Error(t('settings.plugins.messages.modelRequired'));
    }

    const targetId = modelDraft.id;
    await saveModelProvider({ ...modelDraft });
    await refreshAiSettings();
    selectModelProvider(targetId);
    message.success(t('settings.plugins.messages.modelSaved'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.modelSaveFailed'));
  }
}

async function activateSelectedModel() {
  try {
    const targetId = modelDraft.id;
    await saveModelProvider({ ...modelDraft });
    await setActiveModelProvider(targetId);
    await refreshAiSettings();
    selectModelProvider(targetId);
    message.success(t('settings.plugins.messages.modelActivated'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.modelActivateFailed'));
  }
}

async function removeSelectedModel() {
  if (!modelDraft.id) {
    return;
  }

  try {
    await deleteModelProvider(modelDraft.id);
    selectedModelProviderId.value = '';
    await refreshAiSettings();
    message.success(t('settings.plugins.messages.modelDeleted'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.modelDeleteFailed'));
  }
}

async function saveSelectedSkill() {
  try {
    if (!skillDraft.name?.trim() || !skillDraft.systemPrompt?.trim()) {
      throw new Error(t('settings.plugins.messages.skillRequired'));
    }

    const targetId = skillDraft.id;
    await saveReadingSkill({ ...skillDraft });
    await refreshAiSettings();
    selectReadingSkill(targetId);
    message.success(t('settings.plugins.messages.skillSaved'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.skillSaveFailed'));
  }
}

async function activateSelectedSkill() {
  try {
    const targetId = skillDraft.id;
    await saveReadingSkill({ ...skillDraft });
    await setActiveReadingSkill(targetId);
    await refreshAiSettings();
    selectReadingSkill(targetId);
    message.success(t('settings.plugins.messages.skillActivated'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.skillActivateFailed'));
  }
}

async function removeSelectedSkill() {
  if (!skillDraft.id) {
    return;
  }

  try {
    await deleteReadingSkill(skillDraft.id);
    selectedReadingSkillId.value = '';
    await refreshAiSettings();
    message.success(t('settings.plugins.messages.skillDeleted'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.skillDeleteFailed'));
  }
}

function formatTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
}

async function testWebDav() {
  if (!webDavForm.url) {
    message.warning(t('settings.plugins.messages.webdavNeedUrl'));
    return;
  }

  webDavTesting.value = true;
  try {
    const connected = await testWebDavConnection({ ...webDavForm });
    if (connected) {
      message.success(t('settings.plugins.messages.webdavConnectSuccess'));
    } else {
      message.error(t('settings.plugins.messages.webdavConnectFailed'));
    }
  } catch {
    message.error(t('settings.plugins.messages.webdavConnectFailed'));
  } finally {
    webDavTesting.value = false;
  }
}

async function saveWebDav() {
  webDavFormRef.value?.validate(async errors => {
    if (errors) {
      message.error(t('settings.plugins.messages.webdavNeedFullInfo'));
      return;
    }

    webDavSaving.value = true;
    try {
      await saveWebDavConfig({ ...webDavForm });
      message.success(t('settings.plugins.messages.webdavSaved'));
    } catch {
      message.error(t('settings.plugins.messages.saveFailed'));
    } finally {
      webDavSaving.value = false;
    }
  });
}

async function savePomodoro() {
  try {
    const config = await savePomodoroConfig({ ...pomodoroDraft });
    pomodoroDraft.focusMinutes = config.focusMinutes;
    pomodoroDraft.breakMinutes = config.breakMinutes;
    message.success(t('settings.plugins.messages.pomodoroSaved'));
  } catch (error) {
    message.error(error?.message || t('settings.plugins.messages.pomodoroSaveFailed'));
  }
}

onMounted(async () => {
  await refreshAll();
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
</script>

<style scoped>
@import "../settingsControls.css";

.plugins-setting {
  max-width: 860px;
  color: var(--text-primary);
}

.setting-header {
  margin-bottom: 24px;
}

.setting-header h3,
.plugin-section h4 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-weight: 600;
}

.setting-header h3 {
  font-size: 18px;
}

.plugin-section h4 {
  font-size: 15px;
}

.desc,
.section-header p,
.plugin-description,
.plugin-footnote,
.entity-description,
.empty-state {
  color: var(--text-secondary);
}

.desc,
.section-header p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.plugin-section,
.settings-subsection {
  padding: 20px 0;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 76%, transparent);
}

.plugin-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.settings-subsection {
  padding-bottom: 0;
}

.ai-config-tabs {
  margin-top: -4px;
}

.ai-config-tabs :deep(.n-tabs-nav) {
  margin-bottom: 18px;
}

.ai-config-tabs :deep(.n-tab-pane) {
  padding-top: 0;
}

.ai-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.ai-section-kicker,
.ai-pane-title {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.ai-section-header h4 {
  margin: 0 0 6px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
}

.ai-section-header p,
.ai-editor-title p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.86rem;
  line-height: 1.5;
}

.ai-config-layout {
  display: grid;
  grid-template-columns: minmax(168px, 196px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.ai-entity-pane {
  min-width: 0;
  padding-top: 2px;
}

.compact-list {
  gap: 4px;
  margin-bottom: 0;
}

.compact-list .entity-row {
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
}

.compact-list .entity-badges {
  max-width: 96px;
  flex-wrap: wrap;
  gap: 6px;
}

.compact-list .entity-badge {
  min-height: 21px;
  padding: 0 7px;
  font-size: 0.7rem;
}

.compact-empty {
  padding: 8px 0;
}

.ai-editor-pane {
  min-width: 0;
  padding-left: 18px;
  border-left: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
}

.ai-editor-title {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 58%, transparent);
}

.ai-editor-title h5 {
  margin: 0 0 5px;
  color: var(--text-primary);
  font-size: 0.96rem;
  font-weight: 700;
}

.ai-form-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 58%, transparent);
}

.field-label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.field-tip-trigger {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface-panel);
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1;
  cursor: help;
}

.inline-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 4px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-header.compact {
  margin-bottom: 10px;
}

.plugin-list,
.entity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entity-list {
  margin-bottom: 18px;
}

.plugin-row,
.entity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 64%, transparent);
  background: transparent;
  color: var(--text-primary);
  text-align: left;
}

.plugin-row {
  cursor: pointer;
}

.plugin-row:last-child,
.entity-row:last-child {
  border-bottom: 0;
}

.plugin-row.installed {
  align-items: stretch;
}

.plugin-row.selected .plugin-select,
.entity-row.selected .entity-title {
  color: var(--accent);
}

.plugin-meta,
.plugin-select,
.entity-main {
  min-width: 0;
}

.plugin-select,
.entity-row {
  cursor: pointer;
}

.plugin-select {
  flex: 1;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
}

.plugin-title,
.plugin-description,
.plugin-footnote,
.entity-title,
.entity-description {
  display: block;
}

.plugin-title,
.entity-title {
  font-size: 0.96rem;
  font-weight: 600;
  color: var(--text-primary);
}

.plugin-description,
.entity-description {
  margin-top: 5px;
  font-size: 0.88rem;
  line-height: 1.45;
}

.entity-description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-footnote {
  margin-top: 6px;
  font-size: 0.76rem;
  color: var(--text-muted);
  word-break: break-all;
}

.plugin-actions,
.actions,
.entity-badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.plugin-state,
.plugin-status-badge {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--surface-panel);
  color: var(--text-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

.plugin-state.enabled,
.plugin-status-badge.enabled {
  background: var(--accent-soft);
  color: var(--accent);
}

.plugin-status-badge.inline {
  min-height: 21px;
  padding: 0 7px;
  font-size: 0.7rem;
}

.plugin-detail-modal {
  width: 80vw;
  max-width: 1120px;
  min-width: 760px;
}

.plugin-detail-modal :deep(.n-card__content) {
  padding: 0;
}

.plugin-detail-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 80vh;
  max-height: 820px;
  min-height: 460px;
  overflow: hidden;
  color: var(--text-primary);
  background: var(--surface);
}

.plugin-detail-sidebar {
  min-width: 0;
  padding: 16px 12px;
  overflow-y: auto;
  border-right: 1px solid color-mix(in srgb, var(--border-subtle) 78%, transparent);
  background: color-mix(in srgb, var(--surface-panel) 54%, transparent);
}

.plugin-detail-sidebar-title {
  margin: 0 8px 10px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.plugin-detail-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0;
  padding: 10px 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.plugin-detail-list-item:hover,
.plugin-detail-list-item.selected {
  background: color-mix(in srgb, var(--accent-soft) 62%, transparent);
}

.plugin-detail-list-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-detail-list-status {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 0.74rem;
}

.plugin-detail-main {
  min-width: 0;
  overflow-y: auto;
  padding: 20px 20px 26px;
}

.plugin-info-panel {
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 76%, transparent);
}

.plugin-info-main {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.plugin-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.plugin-info-main h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.06rem;
  font-weight: 700;
}

.plugin-info-main p {
  max-width: 660px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.42;
}

.plugin-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
  margin-top: 10px;
}

.plugin-info-grid div {
  min-width: 0;
  padding: 6px 0;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 58%, transparent);
}

.plugin-info-grid span {
  display: block;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.plugin-info-grid strong {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.81rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-info-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.plugin-config-panel {
  padding-top: 22px;
}

.entity-badge {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--surface-panel);
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.entity-badge.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.entity-badge.muted {
  color: var(--text-muted);
}

.settings-form {
  max-width: 720px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.settings-form :deep(.n-form-item) {
  margin-bottom: 14px;
}

.settings-form :deep(.n-form-item-label__text) {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
}

.numeric-input {
  width: 180px;
}

.switch-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.empty-state {
  padding: 16px 0;
  font-size: 0.9rem;
}

.manifest-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.webdav-form {
  max-width: 600px;
}

.pomodoro-form {
  max-width: 520px;
}

@media (max-width: 767px) {
  .section-header,
  .plugin-row,
  .plugin-row.installed,
  .entity-row,
  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .plugin-actions,
  .actions,
  .entity-badges {
    justify-content: flex-start;
  }

  .plugin-detail-modal {
    width: calc(100vw - 40px);
    min-width: 0;
  }

  .plugin-detail-shell {
    grid-template-columns: 1fr;
    height: min(80vh, 720px);
  }

  .plugin-detail-sidebar {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 78%, transparent);
  }

  .plugin-detail-main {
    padding: 20px 18px 28px;
  }

  .plugin-info-main,
  .plugin-info-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .plugin-info-grid {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .ai-section-header,
  .ai-config-layout,
  .ai-editor-title {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .ai-config-layout {
    gap: 16px;
  }

  .ai-editor-pane {
    padding-left: 0;
    border-left: 0;
  }

  .compact-list .entity-badges {
    max-width: none;
  }
}
</style>
