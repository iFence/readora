<template>
  <div class="setting-container">
    <div class="top-banner">
      <div class="preference-text">
        <span>{{ t('settings.preferences.name') }}</span>
      </div>
      <button type="button" class="close-icon" @click="backRouter">
        <close-icon />
      </button>
    </div>
    <div class="setting-body">
      <div class="setting-bar">
        <div class="sidebar">
          <ul>
            <li
              v-for="(item, index) in settings"
              :key="index"
              :class="{ active: activeIndex === index }"
              @click="activeIndex = index"
            >
              {{ item.name }}
            </li>
          </ul>
        </div>
      </div>
      <div class="setting-content">
        <component :is="currentTabComponent" />
      </div>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from 'vue-i18n';
import CloseIcon from "@/assets/svg/CloseIcon.vue";
import About from "@/views/Settings/components/About.vue";
import Appearance from "@/views/Settings/components/Appearance.vue";
import General from "@/views/Settings/components/General.vue";
import Hotkeys from "@/views/Settings/components/Hotkeys.vue";
import WebDav from "@/views/Settings/components/WebDav.vue";
import { navigateBack } from '@/services/navigationService.js';

const { t, tm } = useI18n();
const activeIndex = ref(0);
const settings = computed(() => tm('settings.preferences.children'));

function backRouter() {
  navigateBack();
}

const currentTabComponent = computed(() => {
  switch (activeIndex.value) {
    case 0:
      return General;
    case 1:
      return Appearance;
    case 2:
      return Hotkeys;
    case 3:
      return WebDav;
    case 4:
      return About;
    default:
      return General;
  }
});
</script>

<style scoped>
.setting-container {
  height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  background: var(--surface-app);
  overflow: hidden;
}

.top-banner {
  z-index: 10;
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 0 clamp(16px, 4vw, 42px);
  background-color: color-mix(in srgb, var(--surface-app) 94%, transparent);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(14px);
}

.setting-body {
  width: min(1280px, calc(100% - 32px));
  height: calc(100% - 72px);
  min-height: 0;
  margin: 0 auto;
  padding: 24px 0 calc(24px + var(--app-bottom-nav-height, 0px));
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 28px;
  box-sizing: border-box;
}

.setting-bar {
  height: 100%;
  min-height: 0;
  border-right: 1px solid var(--border-subtle);
}

.sidebar {
  padding: 4px 18px 4px 0;
}

.sidebar ul {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-bar li {
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.setting-bar li.active {
  color: var(--text-primary);
  background-color: var(--accent-soft);
}

.setting-bar li:not(.active):hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.setting-content {
  min-height: min(720px, calc(var(--app-safe-vh, 100vh) - 160px));
  padding: 4px 0 0;
  overflow-y: auto;
}

.preference-text {
  font-size: clamp(1rem, 3vh, 1.4rem);
  color: var(--text-primary);
  font-weight: 600;
}

.close-icon {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 999px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.close-icon:hover {
  background-color: var(--surface-hover);
  color: var(--accent);
}

@media (max-width: 1024px) {
  .setting-body {
    grid-template-columns: 220px minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .setting-body {
    width: min(100%, calc(100% - 24px));
    height: auto;
    grid-template-columns: 1fr;
    gap: 16px;
    padding-bottom: calc(18px + var(--app-bottom-nav-height, 0px));
  }

  .setting-bar {
    border-right: 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .sidebar {
    padding: 0 0 14px;
  }

  .sidebar ul {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .setting-bar li {
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .setting-content {
    min-height: auto;
    padding-top: 0;
  }
}
</style>
