<template>
  <component :is="'style'" v-if="dynamicCss" v-html="dynamicCss"></component>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <div class="container" :class="{ 'compact-shell': isCompactShell }">
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <RouterView />
            <UpdateNotifier />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
      <Sidebar />
    </div>
  </n-config-provider>
</template>

<script setup>
import { onBeforeMount } from 'vue';
import { NConfigProvider, NDialogProvider, NNotificationProvider, NMessageProvider } from 'naive-ui';
import Sidebar from "@/components/Sidebar.vue";
import UpdateNotifier from "@/components/UpdateNotifier.vue";
import i18n from '@/i18n.js';
import { initializeLogging } from '@/services/loggingService.js';
import { initializeAppShell, useAppShell } from '@/services/appShellService.js';
import { settingsRepository } from '@/services/settingsRepository.js';
import { useThemeService } from '@/services/themeService.js';
import { useNaiveTheme } from '@/theme/naiveTheme.js';

initializeLogging();

const { dynamicCss, initializeTheme } = useThemeService();
const { naiveTheme, naiveThemeOverrides } = useNaiveTheme();
const { isCompactShell } = useAppShell();

onBeforeMount(async () => {
  initializeAppShell();

  const storedLanguage = await settingsRepository.getCurrentLanguage();
  if (storedLanguage) {
    i18n.global.locale.value = storedLanguage;
  }

  await initializeTheme();
});
</script>

<style scoped>
.container {
  position: relative;
  min-height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
}

.container.compact-shell {
  padding-bottom: var(--app-bottom-nav-height, 0px);
}
</style>
