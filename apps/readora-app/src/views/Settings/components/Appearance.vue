<template>
  <div class="appearance-settings">
    <setting-item item-name="切换主题">
      <div class="flex flex-direction-reverse gap-10 align-center">
        <n-select
          class="dropdown polished-select"
          v-model:value="currentTheme"
          @update:value="handleThemeChange"
          :options="themeList"
        />
        <folder-icon class="folder"/>
      </div>
    </setting-item>
    <setting-item item-name="主题色">
      <div class="accent-setting">
        <div class="preset-list">
          <button
            v-for="color in presetColors"
            :key="color"
            type="button"
            class="preset-swatch"
            :class="{ active: activeAccentColor === color }"
            :style="{ backgroundColor: color }"
            @click="handleAccentPresetClick(color)"
            :aria-label="`Use accent color ${color}`"
          ></button>
        </div>
        <div class="accent-actions">
          <n-color-picker
            class="color-picker"
            :value="activeAccentColor"
            :show-alpha="false"
            :modes="['hex']"
            @update:value="handleAccentColorChange"
          />
          <n-button quaternary @click="resetAccentColor" :disabled="!hasAccentOverride">
            恢复默认
          </n-button>
        </div>
      </div>
    </setting-item>
    <setting-item item-name="正文颜色">
      <div class="reader-text-color-setting">
        <div class="setting-copy">
          <div class="setting-title">强制正文跟随主题</div>
          <div class="setting-description">
            开启后，优先使用当前明暗主题的正文颜色，避免部分 EPUB 章节仍显示黑字或白字。
          </div>
        </div>
        <n-switch
          :value="forceReaderTextColor"
          @update:value="handleForceReaderTextColorChange"
        />
      </div>
    </setting-item>
  </div>
</template>

<script setup>
import { NButton, NColorPicker, NSelect, NSwitch } from "naive-ui";
import { computed, onBeforeMount } from "vue";
import FolderIcon from "@/assets/svg/FolderIcon.vue";
import SettingItem from "@/assets/svg/SettingItem.vue";
import { useThemeService } from '@/services/themeService.js';
import { useReaderSettingsService } from '@/services/readerSettingsService.js';

const presetColors = [
  '#486FA8',
  '#2F8F83',
  '#AF5F3C',
  '#8A59B5',
  '#C5566F',
  '#C28B2F',
];

const {
  currentTheme,
  resolvedAccentColor,
  availableThemes,
  refreshThemeList,
  applyTheme,
  applyAccentColor,
  resetAccentColor,
  hasAccentOverride,
} = useThemeService();
const {
  forceReaderTextColor,
  initializeReaderSettings,
  setForceReaderTextColor,
} = useReaderSettingsService();

const themeList = computed(() => availableThemes.value.map(theme => ({ value: theme, label: theme })));
const activeAccentColor = computed(() => resolvedAccentColor.value);

async function handleThemeChange(newTheme) {
  await applyTheme(newTheme);
}

async function handleAccentColorChange(color) {
  await applyAccentColor(color);
}

async function handleAccentPresetClick(color) {
  await applyAccentColor(color);
}

async function handleForceReaderTextColorChange(value) {
  await setForceReaderTextColor(value);
}

onBeforeMount(async () => {
  await Promise.all([
    refreshThemeList(),
    initializeReaderSettings(),
  ]);
});
</script>

<style scoped>
.appearance-settings {
  display: flex;
  flex-direction: column;
}

.dropdown {
  width: 154px;
}

.polished-select {
  :deep(.n-base-selection) {
    min-height: 38px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border-subtle) 88%, transparent);
    background: color-mix(in srgb, var(--surface-elevated) 88%, transparent);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }

  :deep(.n-base-selection:hover) {
    border-color: color-mix(in srgb, var(--accent) 22%, var(--border-strong));
    background: color-mix(in srgb, var(--surface-panel) 92%, transparent);
  }

  :deep(.n-base-selection.n-base-selection--focus) {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border-strong));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  }

  :deep(.n-base-selection-label) {
    padding-left: 14px;
    padding-right: 34px;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  :deep(.n-base-selection-input) {
    font-size: 0.9rem;
  }

  :deep(.n-base-selection__border),
  :deep(.n-base-selection__state-border) {
    display: none;
  }
}

.folder {
  width: 1.5rem;
  aspect-ratio: 1/1;
  cursor: pointer;
}

.folder:hover {
  background-color: var(--surface-hover);
  border-radius: 12px;
}

.accent-setting {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.preset-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.preset-swatch {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.preset-swatch:hover {
  transform: translateY(-1px) scale(1.06);
}

.preset-swatch.active {
  border-color: var(--text-primary);
}

.accent-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 42px;
}

.reader-text-color-setting {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  width: min(100%, 640px);
  margin-left: auto;
}

.setting-copy {
  text-align: right;
  min-width: 0;
}

.setting-title {
  color: var(--text-primary);
  font-weight: 600;
}

.setting-description {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
