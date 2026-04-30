<template>
  <setting-item :item-name="t('settings.general.language')">
    <n-select class="language-select settings-select"
              :options="languages"
              v-model:value="currentLocale"
              @update-value="changeLanguage"/>
  </setting-item>
  <setting-item :item-name="t('settings.general.clearBookshelf')">
    <n-button type="primary" class="settings-button settings-button--primary" @click="clearBookshelf">
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

const {t, locale} = useI18n();
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
@import "../settingsControls.css";

.language-select {
  width: 132px;
}
</style>
