<template>
  <div class="plugins-setting">
    <div class="setting-header">
      <h3>插件</h3>
      <p class="desc">安装、启用和配置 Readora 插件。AI 阅读助手是内置插件之一，后续独立插件也会出现在这里。</p>
    </div>

    <section class="plugin-section">
      <div class="section-header">
        <div>
          <h4>插件列表</h4>
          <p>点击插件查看详情、启用状态和配置项。</p>
        </div>
        <n-button class="settings-button settings-button--secondary" @click="showManifestModal = true">
          安装 manifest
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
              {{ plugin.installed ? (plugin.enabled ? '已启用' : '已停用') : '未安装' }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">暂无插件</div>
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
          <div class="plugin-detail-sidebar-title">插件</div>
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
              {{ plugin.installed ? (plugin.enabled ? '已启用' : '已停用') : '未安装' }}
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
                    {{ selectedPluginEntry.installed ? (selectedPluginEntry.enabled ? '已启用' : '已停用') : '未安装' }}
                  </span>
                </div>
                <p>{{ selectedPluginManifest.description }}</p>
              </div>
            </div>
            <div class="plugin-info-grid">
              <div>
                <span>版本</span>
                <strong>{{ selectedPluginManifest.version || '-' }}</strong>
              </div>
              <div>
                <span>作者</span>
                <strong>{{ selectedPluginManifest.author || '-' }}</strong>
              </div>
              <div>
                <span>类型</span>
                <strong>{{ selectedPluginManifest.type || '-' }}</strong>
              </div>
              <div>
                <span>ID</span>
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
                安装
              </n-button>
              <n-switch
                v-else
                :value="selectedPluginEntry.enabled"
                @update:value="value => updateEnabled(selectedPluginEntry.id, value)"
              />
              <n-button class="settings-button settings-button--secondary" disabled>
                更新
              </n-button>
              <n-button
                v-if="selectedPluginEntry.installed"
                class="settings-button settings-button--ghost"
                @click="removeSelectedPlugin"
              >
                卸载
              </n-button>
            </div>
          </section>

          <section class="plugin-config-panel">
            <div>
              <h4>配置</h4>
              <p>
                {{
                  selectedPluginEntry.installed
                    ? (selectedPluginEntry.enabled ? '插件已启用。' : '插件未启用，配置会保存但运行时不会被调用。')
                    : '安装插件后可以配置。'
                }}
              </p>
            </div>

            <template v-if="!selectedPluginEntry.installed">
              <div class="empty-state">该插件尚未安装。</div>
            </template>

            <template v-else-if="isReaderAssistantPluginSelected">
              <n-tabs type="line" animated class="ai-config-tabs">
                <n-tab-pane name="models" tab="模型配置">
                  <div class="ai-section-header">
                    <div>
                      <span class="ai-section-kicker">Model</span>
                      <h4>模型配置</h4>
                      <p>阅读助手始终调用当前模型。Mimo 只是预设之一，也可以配置任意兼容 API。</p>
                    </div>
                    <n-button class="settings-button settings-button--secondary" @click="createModelProvider">
                      新增模型
                    </n-button>
                  </div>

                  <div class="ai-config-layout">
                    <aside class="ai-entity-pane">
                      <div class="ai-pane-title">模型列表</div>
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
                            <span class="entity-description">{{ provider.model || '未填写模型名称' }}</span>
                          </span>
                          <span class="entity-badges">
                            <span class="entity-badge">{{ provider.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI' }}</span>
                            <span v-if="activeModelProviderId === provider.id" class="entity-badge active">当前</span>
                            <span v-if="!provider.enabled" class="entity-badge muted">停用</span>
                          </span>
                        </button>
                      </div>
                      <div v-else class="empty-state compact-empty">尚未配置模型。</div>
                    </aside>

                    <div class="ai-editor-pane">
                      <div class="ai-editor-title">
                        <div>
                          <h5>{{ modelDraft.name || '模型详情' }}</h5>
                          <p>{{ modelDraft.model || '选择或新增一个模型后进行配置。' }}</p>
                        </div>
                      </div>

                      <n-form v-if="modelDraft.id" label-placement="top" class="settings-form model-form">
                        <div class="form-grid">
                          <n-form-item label="名称">
                            <n-input v-model:value="modelDraft.name" class="settings-input" placeholder="例如 OpenAI / Claude / Mimo" />
                          </n-form-item>
                          <n-form-item label="协议">
                            <n-select
                              v-model:value="modelDraft.protocol"
                              class="settings-select"
                              :options="protocolOptions"
                              @update:value="applyModelPreset"
                            />
                          </n-form-item>
                        </div>

                        <div class="form-grid">
                          <n-form-item label="预设">
                            <n-select
                              v-model:value="modelDraft.accessMode"
                              class="settings-select"
                              :options="accessModeOptions"
                              @update:value="applyModelPreset"
                            />
                          </n-form-item>
                          <n-form-item label="鉴权头">
                            <n-select v-model:value="modelDraft.authHeader" class="settings-select" :options="authHeaderOptions" />
                          </n-form-item>
                        </div>

                        <n-form-item label="Base URL / API Endpoint">
                          <n-input v-model:value="modelDraft.baseUrl" class="settings-input" placeholder="https://api.openai.com/v1" />
                        </n-form-item>

                        <div class="form-grid">
                          <n-form-item label="模型名称">
                            <n-input v-model:value="modelDraft.model" class="settings-input" placeholder="gpt-4o-mini / claude-3-5-sonnet-latest" />
                          </n-form-item>
                          <n-form-item label="Temperature">
                            <n-input-number v-model:value="modelDraft.temperature" class="settings-input numeric-input" :step="0.1" />
                          </n-form-item>
                        </div>

                        <n-form-item label="API Key">
                          <n-input
                            v-model:value="modelDraft.apiKey"
                            class="settings-input"
                            type="password"
                            show-password-on="click"
                            placeholder="仅保存在本机插件配置中"
                          />
                        </n-form-item>

                        <div class="actions ai-form-actions">
                          <span class="inline-switch">
                            <n-switch v-model:value="modelDraft.enabled" />
                            <span class="switch-label">启用</span>
                          </span>
                          <n-button
                            class="settings-button settings-button--secondary"
                            :disabled="!modelDraft.enabled || activeModelProviderId === modelDraft.id"
                            @click="activateSelectedModel"
                          >
                            设为当前模型
                          </n-button>
                          <n-button type="primary" class="settings-button settings-button--primary" @click="saveSelectedModel">
                            保存模型
                          </n-button>
                          <n-button class="settings-button settings-button--ghost" @click="removeSelectedModel">
                            删除
                          </n-button>
                        </div>
                      </n-form>
                    </div>
                  </div>
                </n-tab-pane>

                <n-tab-pane name="skills" tab="读书 Skill">
                  <div class="ai-section-header">
                    <div>
                      <span class="ai-section-kicker">Skill</span>
                      <h4>读书 Skill</h4>
                      <p>Skill 决定阅读助手的回答方式。问答时可以从已启用的 Skill 中选择。</p>
                    </div>
                    <n-button class="settings-button settings-button--secondary" @click="createReadingSkill">
                      新增 Skill
                    </n-button>
                  </div>

                  <div class="ai-config-layout skill-layout">
                    <aside class="ai-entity-pane">
                      <div class="ai-pane-title">Skill 列表</div>
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
                            <span class="entity-description">{{ skill.description || '未填写描述' }}</span>
                          </span>
                          <span class="entity-badges">
                            <span v-if="activeReadingSkillId === skill.id" class="entity-badge active">默认</span>
                            <span v-if="!skill.enabled" class="entity-badge muted">停用</span>
                          </span>
                        </button>
                      </div>
                      <div v-else class="empty-state compact-empty">尚未配置 Skill。</div>
                    </aside>

                    <div class="ai-editor-pane">
                      <div class="ai-editor-title">
                        <div>
                          <h5>{{ skillDraft.name || 'Skill 详情' }}</h5>
                          <p>{{ skillDraft.description || '定义阅读助手的回答方式、语言和结构。' }}</p>
                        </div>
                      </div>

                      <n-form v-if="skillDraft.id" label-placement="top" class="settings-form">
                        <div class="form-grid">
                          <n-form-item label="名称">
                            <n-input v-model:value="skillDraft.name" class="settings-input" placeholder="例如 深度总结 / 观点提炼" />
                          </n-form-item>
                          <n-form-item label="描述">
                            <n-input v-model:value="skillDraft.description" class="settings-input" placeholder="在问答选择器中用于识别用途" />
                          </n-form-item>
                        </div>

                        <n-form-item label="提示词指令">
                          <n-input
                            v-model:value="skillDraft.systemPrompt"
                            type="textarea"
                            class="settings-input"
                            :autosize="{ minRows: 7, maxRows: 14 }"
                            placeholder="定义这个 Skill 的回答方式、语言、结构和约束"
                          />
                        </n-form-item>

                        <div class="actions ai-form-actions">
                          <span class="inline-switch">
                            <n-switch v-model:value="skillDraft.enabled" />
                            <span class="switch-label">启用</span>
                          </span>
                          <n-button
                            class="settings-button settings-button--secondary"
                            :disabled="!skillDraft.enabled || activeReadingSkillId === skillDraft.id"
                            @click="activateSelectedSkill"
                          >
                            设为默认 Skill
                          </n-button>
                          <n-button type="primary" class="settings-button settings-button--primary" @click="saveSelectedSkill">
                            保存 Skill
                          </n-button>
                          <n-button class="settings-button settings-button--ghost" @click="removeSelectedSkill">
                            删除
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
                ref="webDavFormRef"
                :model="webDavForm"
                :rules="webDavRules"
                label-placement="left"
                label-width="100"
                require-mark-placement="right-hanging"
                class="settings-form webdav-form"
              >
                <n-form-item label="服务器地址" path="url">
                  <n-input
                    v-model:value="webDavForm.url"
                    class="settings-input"
                    placeholder="https://dav.example.com/dav/"
                  />
                </n-form-item>
                <n-form-item label="用户名" path="username">
                  <n-input v-model:value="webDavForm.username" class="settings-input" placeholder="请输入用户名" />
                </n-form-item>
                <n-form-item label="密码" path="password">
                  <n-input
                    v-model:value="webDavForm.password"
                    class="settings-input"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入密码"
                  />
                </n-form-item>

                <div class="actions">
                  <n-button
                    class="settings-button settings-button--secondary"
                    :loading="webDavTesting"
                    @click="testWebDav"
                  >
                    测试连接
                  </n-button>
                  <n-button
                    type="primary"
                    class="settings-button settings-button--primary"
                    :loading="webDavSaving"
                    @click="saveWebDav"
                  >
                    保存配置
                  </n-button>
                </div>
              </n-form>
            </template>

            <template v-else-if="isPomodoroPluginSelected">
              <n-form label-placement="top" class="settings-form pomodoro-form">
                <div class="form-grid">
                  <n-form-item label="专注阅读时长（分钟）">
                    <n-input-number
                      v-model:value="pomodoroDraft.focusMinutes"
                      class="settings-input numeric-input"
                      :min="1"
                      :max="180"
                      :step="1"
                    />
                  </n-form-item>
                  <n-form-item label="休息时长（分钟）">
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
                    保存配置
                  </n-button>
                </div>
              </n-form>
            </template>

            <div v-else class="empty-state">该插件暂未提供内置配置面板。</div>
          </section>
        </main>
      </div>
    </n-modal>

    <n-modal v-model:show="showManifestModal" preset="dialog" title="安装插件 manifest">
      <div class="manifest-modal">
        <n-input
          v-model:value="manifestText"
          type="textarea"
          :autosize="{ minRows: 8, maxRows: 14 }"
          class="settings-input"
          placeholder='{"id":"vendor.plugin","name":"Plugin","version":"0.1.0","type":"reader-tool","entry":{"kind":"external"}}'
        />
        <div class="actions">
          <n-button class="settings-button settings-button--ghost" @click="showManifestModal = false">
            取消
          </n-button>
          <n-button type="primary" class="settings-button settings-button--primary" @click="installManifest">
            安装
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
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

const protocolOptions = [
  { label: 'OpenAI compatible', value: 'openai' },
  { label: 'Anthropic compatible', value: 'anthropic' },
];
const accessModeOptions = [
  { label: 'Custom', value: 'custom' },
  { label: 'Mimo Pay As You Go', value: 'mimo-payg' },
  { label: 'Mimo Token Plan', value: 'mimo-token-plan' },
];
const authHeaderOptions = [
  { label: 'Authorization: Bearer', value: 'authorization' },
  { label: 'api-key', value: 'api-key' },
  { label: 'x-api-key', value: 'x-api-key' },
];

const selectedPlugin = computed(() => (
  installedPlugins.value.find(plugin => plugin.id === selectedPluginId.value) || null
));
const pluginEntries = computed(() => {
  const installedEntries = installedPlugins.value.map(plugin => ({
    id: plugin.id,
    manifest: plugin.manifest,
    installed: true,
    enabled: plugin.enabled,
  }));
  const installedIds = new Set(installedEntries.map(plugin => plugin.id));
  const availableEntries = availablePlugins.value
    .filter(plugin => !installedIds.has(plugin.id))
    .map(plugin => ({
      id: plugin.id,
      manifest: plugin,
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
    message: '请输入 WebDav 服务器地址',
    trigger: 'blur',
  },
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur',
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur',
  },
};
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

function getMimoEndpoint(accessMode, protocol) {
  if (accessMode === 'mimo-payg') {
    return protocol === 'anthropic'
      ? 'https://api.xiaomimimo.com/anthropic'
      : 'https://api.xiaomimimo.com/v1';
  }

  if (accessMode === 'mimo-token-plan') {
    return protocol === 'anthropic'
      ? 'https://token-plan-cn.xiaomimimo.com/anthropic'
      : 'https://token-plan-cn.xiaomimimo.com/v1';
  }

  return '';
}

function createEmptyModelProvider() {
  return {
    id: createId('readora.model'),
    name: '',
    protocol: 'openai',
    accessMode: 'custom',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    authHeader: 'authorization',
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

function applyModelPreset() {
  const endpoint = getMimoEndpoint(modelDraft.accessMode, modelDraft.protocol);
  if (endpoint) {
    modelDraft.baseUrl = endpoint;
    modelDraft.authHeader = modelDraft.protocol === 'anthropic' ? 'x-api-key' : 'api-key';
  } else if (modelDraft.protocol === 'anthropic' && modelDraft.authHeader === 'authorization') {
    modelDraft.authHeader = 'x-api-key';
  } else if (modelDraft.protocol === 'openai' && modelDraft.authHeader === 'x-api-key') {
    modelDraft.authHeader = 'authorization';
  }
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
    message.success('插件已安装');
  } catch (error) {
    message.error(error?.message || '插件安装失败');
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
    message.success('插件已安装');
  } catch (error) {
    message.error(error?.message || 'manifest 格式无效');
  }
}

async function updateEnabled(pluginId, enabled) {
  try {
    await setPluginEnabled(pluginId, enabled);
    await refreshAll();
  } catch (error) {
    message.error(error?.message || '更新插件状态失败');
  }
}

async function removePlugin(pluginId) {
  try {
    await uninstallPlugin(pluginId);
    if (selectedPluginId.value === pluginId) {
      selectedPluginId.value = '';
    }
    await refreshAll();
    message.success('插件已卸载');
  } catch (error) {
    message.error(error?.message || '插件卸载失败');
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
      throw new Error('请填写名称和模型名称。');
    }

    const targetId = modelDraft.id;
    await saveModelProvider({ ...modelDraft });
    await refreshAiSettings();
    selectModelProvider(targetId);
    message.success('模型配置已保存');
  } catch (error) {
    message.error(error?.message || '保存模型配置失败');
  }
}

async function activateSelectedModel() {
  try {
    const targetId = modelDraft.id;
    await saveModelProvider({ ...modelDraft });
    await setActiveModelProvider(targetId);
    await refreshAiSettings();
    selectModelProvider(targetId);
    message.success('已设为当前模型');
  } catch (error) {
    message.error(error?.message || '设置当前模型失败');
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
    message.success('模型配置已删除');
  } catch (error) {
    message.error(error?.message || '删除模型配置失败');
  }
}

async function saveSelectedSkill() {
  try {
    if (!skillDraft.name?.trim() || !skillDraft.systemPrompt?.trim()) {
      throw new Error('请填写 Skill 名称和提示词指令。');
    }

    const targetId = skillDraft.id;
    await saveReadingSkill({ ...skillDraft });
    await refreshAiSettings();
    selectReadingSkill(targetId);
    message.success('读书 Skill 已保存');
  } catch (error) {
    message.error(error?.message || '保存读书 Skill 失败');
  }
}

async function activateSelectedSkill() {
  try {
    const targetId = skillDraft.id;
    await saveReadingSkill({ ...skillDraft });
    await setActiveReadingSkill(targetId);
    await refreshAiSettings();
    selectReadingSkill(targetId);
    message.success('已设为默认 Skill');
  } catch (error) {
    message.error(error?.message || '设置默认 Skill 失败');
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
    message.success('读书 Skill 已删除');
  } catch (error) {
    message.error(error?.message || '删除读书 Skill 失败');
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
    message.warning('请先输入服务器地址');
    return;
  }

  webDavTesting.value = true;
  try {
    const connected = await testWebDavConnection({ ...webDavForm });
    if (connected) {
      message.success('连接成功');
    } else {
      message.error('连接失败');
    }
  } catch {
    message.error('连接失败，请检查地址或网络');
  } finally {
    webDavTesting.value = false;
  }
}

async function saveWebDav() {
  webDavFormRef.value?.validate(async errors => {
    if (errors) {
      message.error('请填写完整信息');
      return;
    }

    webDavSaving.value = true;
    try {
      await saveWebDavConfig({ ...webDavForm });
      message.success('WebDav 插件配置已保存');
    } catch {
      message.error('保存失败');
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
    message.success('番茄钟插件配置已保存');
  } catch (error) {
    message.error(error?.message || '保存番茄钟配置失败');
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

.plugin-info-grid span,
.plugin-config-panel > div > p {
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

.plugin-config-panel > div > h4 {
  margin: 0 0 6px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
}

.plugin-config-panel > div > p {
  margin: 0 0 16px;
  line-height: 1.5;
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
