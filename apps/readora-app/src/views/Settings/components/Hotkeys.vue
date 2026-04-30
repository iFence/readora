<template>
  <setting-item v-for="item in items" :item-name="item.name" :key="item.id">
    <div class="shortcut-control">
      <n-input
        :value="recordingId === item.id ? '' : (item.shortcutName || '')"
        :placeholder="getShortcutPlaceholder(item)"
        type="text"
        readonly
        class="shortcut-input settings-input"
        :class="{ 'is-recording': recordingId === item.id, 'is-armed': armedId === item.id }"
        @click="handleInputClick(item)"
      >
        <template #suffix>
          <button
            v-if="item.shortcut && recordingId !== item.id"
            type="button"
            class="shortcut-clear settings-icon-button"
            :title="t('settings.shortcuts.clear')"
            @click.stop="clearShortcut(item.id)"
          >
            ×
          </button>
        </template>
      </n-input>
    </div>
  </setting-item>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { NInput, useMessage } from "naive-ui";
import { useI18n } from "vue-i18n";
import SettingItem from "@/assets/svg/SettingItem.vue";
import { getCurrentPlatform } from '@/platform/tauri/osBridge.js';
import {
  listShortcutBindings,
  normalizeShortcutFromKeyboardEvent,
  resumeGlobalShortcuts,
  suspendGlobalShortcuts,
  updateShortcutBinding,
} from '@/services/shortcutService.js';

const { t, tm } = useI18n();
const message = useMessage();
const bindings = ref([]);
const platformName = ref('windows');
const recordingId = ref(null);
const armedId = ref(null);
const hotkeys = computed(() => tm('settings.preferences.children')[2].items);
const items = computed(() => bindings.value.map(shortcut => ({
  ...shortcut,
  name: hotkeys.value[shortcut.id],
})));

async function refreshBindings() {
  bindings.value = await listShortcutBindings();
}

async function persistBinding(id, shortcut) {
  bindings.value = await updateShortcutBinding(id, shortcut);
}

async function startRecording(id) {
  if (recordingId.value === id) {
    return;
  }

  recordingId.value = null;
  armedId.value = null;
  await suspendGlobalShortcuts();
  recordingId.value = id;
}

async function stopRecording(shouldResume = true) {
  recordingId.value = null;
  if (shouldResume) {
    await resumeGlobalShortcuts();
  }
}

async function toggleRecording(item) {
  if (recordingId.value === item.id) {
    await stopRecording();
    return;
  }

  await startRecording(item.id);
}

function getShortcutPlaceholder(item) {
  if (recordingId.value === item.id) {
    return t('settings.shortcuts.recordingHint');
  }

  if (armedId.value === item.id || !item.shortcut) {
    return t('settings.shortcuts.recordPlaceholder');
  }

  return '';
}

async function handleInputClick(item) {
  if (recordingId.value === item.id) {
    await stopRecording();
    return;
  }

  if (armedId.value === item.id || !item.shortcut) {
    await startRecording(item.id);
  }
}

async function clearShortcut(id) {
  const wasRecording = recordingId.value === id;
  if (wasRecording) {
    await stopRecording(false);
  }

  try {
    await persistBinding(id, '');
    armedId.value = id;
    message.success(t('settings.shortcuts.cleared'));
  } catch {
    if (wasRecording) {
      await resumeGlobalShortcuts().catch(() => {});
    }
    message.error(t('settings.shortcuts.saveFailed'));
  }
}

async function handleRecordingKeydown(event) {
  if (!recordingId.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (event.key === 'Escape' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
    await stopRecording();
    return;
  }

  try {
    const shortcut = normalizeShortcutFromKeyboardEvent(event, platformName.value);
    if (!shortcut) {
      if (!isModifierOnlyEvent(event)) {
        message.warning(t('settings.shortcuts.unsupportedKey'));
      }
      return;
    }

    const targetId = recordingId.value;
    recordingId.value = null;
    armedId.value = null;
    await persistBinding(targetId, shortcut);
    message.success(t('settings.shortcuts.saved'));
  } catch (error) {
    if (error?.message === 'missing_modifier') {
      message.warning(t('settings.shortcuts.requireModifier'));
      return;
    }

    if (error?.message === 'duplicate') {
      message.error(t('settings.shortcuts.duplicate'));
      await resumeGlobalShortcuts().catch(() => {});
      return;
    }

    message.error(t('settings.shortcuts.saveFailed'));
    await resumeGlobalShortcuts().catch(() => {});
  }
}

function isModifierOnlyEvent(event) {
  return ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
}

onMounted(async () => {
  platformName.value = await getCurrentPlatform();
  await refreshBindings();
  window.addEventListener('keydown', handleRecordingKeydown, true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleRecordingKeydown, true);
  if (recordingId.value) {
    resumeGlobalShortcuts().catch(() => {});
  }
});
</script>

<style scoped>
@import "../settingsControls.css";

.shortcut-control {
  display: flex;
  align-items: center;
}

.shortcut-input {
  width: 180px;
  cursor: pointer;
}

.shortcut-input.is-recording :deep(.n-input__input-el) {
  caret-color: transparent;
}

.shortcut-clear {
  line-height: 1;
  font-size: 14px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
}
</style>
