<template>
  <setting-item :item-name="t('settings.general.language')">
    <n-select class="language-select"
              :options="languages"
              v-model:value="currentLocale"
              @update-value="changeLanguage"/>
  </setting-item>
  <setting-item :item-name="t('settings.general.clearBookshelf')">
    <n-button type="primary" @click="clearBookshelf">
      {{ t('settings.general.confirm') }}
    </n-button>
  </setting-item>
</template>

<script setup>

import SettingItem from "@/assets/svg/SettingItem.vue";
import {NButton, NSelect, useDialog, useMessage} from "naive-ui";
import {useI18n} from 'vue-i18n';
import {onMounted, ref} from "vue";
import { libraryRepository } from '@/services/libraryRepository.js';
import { settingsRepository } from '@/services/settingsRepository.js';

const {t, locale, messages} = useI18n();
let languages = [{label: "简体中文", value: "zh"}, {label: "English", value: "en"}]
const currentLocale = ref(navigator.language.slice(0, 2))
const dialog = useDialog();
const message = useMessage();

function clearBookshelf() {
  dialog.warning({
    title: t('settings.general.warning'),
    content: t('settings.general.confirmClear'),
    positiveText: t('settings.general.confirm'),
    negativeText: t('settings.general.cancel'),
    draggable: true,
    onPositiveClick: () => {
      message.success(t('settings.general.cleared'))
      libraryRepository.clearLatestBooks()
    },
    onNegativeClick: () => {
      message.error(t('settings.general.cancelled'))
    }
  })
}

async function changeLanguage(lang){
  locale.value = lang
  await settingsRepository.setCurrentLanguage(lang)
}

onMounted(async () => {
  currentLocale.value = await settingsRepository.getCurrentLanguage() || navigator.language.slice(0, 2)
  locale.value = currentLocale.value
})
</script>

<style scoped>
.language-select {
  width: 118px;
}

.language-select :deep(.n-base-selection) {
  min-height: 38px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 88%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.language-select :deep(.n-base-selection:hover) {
  border-color: color-mix(in srgb, var(--accent) 22%, var(--border-strong));
  background: color-mix(in srgb, var(--surface-panel) 92%, transparent);
}

.language-select :deep(.n-base-selection.n-base-selection--focus) {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border-strong));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
}

.language-select :deep(.n-base-selection-label) {
  padding-left: 14px;
  padding-right: 34px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.language-select :deep(.n-base-selection__border),
.language-select :deep(.n-base-selection__state-border) {
  display: none;
}
</style>
