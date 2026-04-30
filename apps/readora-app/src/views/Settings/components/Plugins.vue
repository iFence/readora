<template>
  <div class="plugins-setting">
    <div class="setting-header">
      <h3>插件</h3>
      <p class="desc">安装和配置受控插件能力。当前版本先支持 manifest 安装与内置适配器。</p>
    </div>

    <section class="plugin-section">
      <div class="section-header">
        <div>
          <h4>可安装插件</h4>
          <p>内置插件由 Readora 提供适配器，第三方插件可通过 manifest 接入。</p>
        </div>
        <n-button class="settings-button settings-button--secondary" @click="showManifestModal = true">
          安装 manifest
        </n-button>
      </div>

      <div v-if="availablePlugins.length" class="plugin-list">
        <div v-for="plugin in availablePlugins" :key="plugin.id" class="plugin-row">
          <div class="plugin-meta">
            <div class="plugin-title">{{ plugin.name }}</div>
            <div class="plugin-description">{{ plugin.description }}</div>
            <div class="plugin-footnote">{{ plugin.id }} · {{ plugin.version }}</div>
          </div>
          <n-button
            type="primary"
            class="settings-button settings-button--primary"
            @click="installBuiltIn(plugin.id)"
          >
            安装
          </n-button>
        </div>
      </div>
      <div v-else class="empty-state">暂无新的内置插件可安装</div>
    </section>

    <section class="plugin-section">
      <div class="section-header">
        <div>
          <h4>已安装插件</h4>
          <p>插件启用后，其能力会被应用服务按 capability 调用。</p>
        </div>
      </div>

      <div v-if="installedPlugins.length" class="plugin-list">
        <div
          v-for="plugin in installedPlugins"
          :key="plugin.id"
          class="plugin-row installed"
          :class="{ selected: selectedPluginId === plugin.id }"
        >
          <button type="button" class="plugin-select" @click="selectPlugin(plugin.id)">
            <span class="plugin-title">{{ plugin.manifest.name }}</span>
            <span class="plugin-description">{{ plugin.manifest.description }}</span>
            <span class="plugin-footnote">{{ plugin.id }} · {{ plugin.manifest.version }}</span>
          </button>
          <div class="plugin-actions">
            <n-switch
              :value="plugin.enabled"
              @update:value="value => updateEnabled(plugin.id, value)"
            />
            <n-button class="settings-button settings-button--ghost" @click="removePlugin(plugin.id)">
              卸载
            </n-button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">尚未安装插件</div>
    </section>

    <section v-if="selectedPlugin" class="plugin-section config-section">
      <div class="section-header">
        <div>
          <h4>{{ selectedPlugin.manifest.name }} 配置</h4>
          <p>配置会保存在本机应用设置中。API Key 等敏感字段暂不做跨设备同步。</p>
        </div>
      </div>

      <n-form label-placement="top" class="settings-form">
        <n-form-item
          v-for="field in selectedConfigFields"
          :key="field.key"
          :label="field.label"
        >
          <n-input-number
            v-if="field.type === 'number'"
            v-model:value="draftConfig[field.key]"
            class="settings-input numeric-input"
            :step="0.1"
          />
          <n-input
            v-else
            v-model:value="draftConfig[field.key]"
            class="settings-input"
            :type="field.type === 'password' ? 'password' : 'text'"
            :show-password-on="field.type === 'password' ? 'click' : undefined"
            :placeholder="field.defaultValue ? String(field.defaultValue) : ''"
          />
        </n-form-item>
        <div class="actions">
          <n-button
            type="primary"
            class="settings-button settings-button--primary"
            @click="saveSelectedConfig"
          >
            保存配置
          </n-button>
        </div>
      </n-form>
    </section>

    <n-modal v-model:show="showManifestModal" preset="dialog" title="安装插件 manifest">
      <div class="manifest-modal">
        <n-input
          v-model:value="manifestText"
          type="textarea"
          :autosize="{ minRows: 8, maxRows: 14 }"
          class="settings-input"
          placeholder='{"id":"vendor.plugin","name":"Plugin","version":"0.1.0","type":"llm-provider","entry":{"kind":"external"}}'
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
import { computed, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSwitch,
  useMessage,
} from 'naive-ui';
import {
  installBuiltInPlugin,
  installPluginManifest,
  listPlugins,
  parsePluginManifestJson,
  savePluginConfig,
  setPluginEnabled,
  uninstallPlugin,
} from '@/services/pluginService.js';

const message = useMessage();
const availablePlugins = ref([]);
const installedPlugins = ref([]);
const selectedPluginId = ref('');
const draftConfig = reactive({});
const manifestText = ref('');
const showManifestModal = ref(false);

const selectedPlugin = computed(() => (
  installedPlugins.value.find(plugin => plugin.id === selectedPluginId.value) || null
));

const selectedConfigFields = computed(() => {
  const schema = selectedPlugin.value?.manifest.configSchema || {};
  return Object.entries(schema).map(([key, field]) => ({
    key,
    label: field.label || key,
    type: field.type || 'text',
    defaultValue: field.defaultValue,
  }));
});

function fillDraftConfig(plugin) {
  Object.keys(draftConfig).forEach(key => delete draftConfig[key]);
  const schema = plugin?.manifest.configSchema || {};
  const currentConfig = plugin?.config || {};

  Object.entries(schema).forEach(([key, field]) => {
    draftConfig[key] = currentConfig[key] ?? field.defaultValue ?? '';
  });
}

async function refreshPlugins() {
  const pluginState = await listPlugins();
  availablePlugins.value = pluginState.available;
  installedPlugins.value = pluginState.installed;

  if (!selectedPluginId.value && installedPlugins.value.length) {
    selectedPluginId.value = installedPlugins.value[0].id;
  }

  const selected = installedPlugins.value.find(plugin => plugin.id === selectedPluginId.value);
  if (selected) {
    fillDraftConfig(selected);
  } else {
    selectedPluginId.value = '';
    fillDraftConfig(null);
  }
}

function selectPlugin(pluginId) {
  selectedPluginId.value = pluginId;
  const plugin = installedPlugins.value.find(item => item.id === pluginId);
  fillDraftConfig(plugin);
}

async function installBuiltIn(pluginId) {
  try {
    await installBuiltInPlugin(pluginId);
    await refreshPlugins();
    selectPlugin(pluginId);
    message.success('插件已安装');
  } catch (error) {
    message.error(error?.message || '插件安装失败');
  }
}

async function installManifest() {
  try {
    const manifest = parsePluginManifestJson(manifestText.value);
    await installPluginManifest(manifest);
    await refreshPlugins();
    selectPlugin(manifest.id);
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
    await refreshPlugins();
  } catch (error) {
    message.error(error?.message || '更新插件状态失败');
  }
}

async function saveSelectedConfig() {
  if (!selectedPlugin.value) {
    return;
  }

  try {
    await savePluginConfig(selectedPlugin.value.id, { ...draftConfig });
    await refreshPlugins();
    message.success('插件配置已保存');
  } catch (error) {
    message.error(error?.message || '保存配置失败');
  }
}

async function removePlugin(pluginId) {
  try {
    await uninstallPlugin(pluginId);
    if (selectedPluginId.value === pluginId) {
      selectedPluginId.value = '';
    }
    await refreshPlugins();
    message.success('插件已卸载');
  } catch (error) {
    message.error(error?.message || '插件卸载失败');
  }
}

onMounted(refreshPlugins);
</script>

<style scoped>
@import "../settingsControls.css";

.plugins-setting {
  max-width: 780px;
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
.empty-state {
  color: var(--text-secondary);
}

.desc,
.section-header p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.plugin-section {
  padding: 20px 0;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 76%, transparent);
}

.plugin-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 64%, transparent);
}

.plugin-row:last-child {
  border-bottom: 0;
}

.plugin-row.installed {
  align-items: stretch;
}

.plugin-row.selected .plugin-select {
  color: var(--accent);
}

.plugin-meta,
.plugin-select {
  min-width: 0;
}

.plugin-select {
  flex: 1;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.plugin-title,
.plugin-description,
.plugin-footnote {
  display: block;
}

.plugin-title {
  font-size: 0.96rem;
  font-weight: 600;
  color: var(--text-primary);
}

.plugin-description {
  margin-top: 5px;
  font-size: 0.88rem;
  line-height: 1.45;
}

.plugin-footnote {
  margin-top: 6px;
  font-size: 0.76rem;
  color: var(--text-muted);
  word-break: break-all;
}

.plugin-actions,
.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.config-section {
  padding-bottom: 0;
}

.settings-form {
  max-width: 520px;
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

.empty-state {
  padding: 16px 0;
  font-size: 0.9rem;
}

.manifest-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 767px) {
  .section-header,
  .plugin-row,
  .plugin-row.installed {
    flex-direction: column;
    align-items: stretch;
  }

  .plugin-actions,
  .actions {
    justify-content: flex-start;
  }
}
</style>
