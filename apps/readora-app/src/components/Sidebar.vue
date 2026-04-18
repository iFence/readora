<template>
  <div v-if="!isCompactShell" class="sidebar-container" :class="{ 'is-open': isOpen, 'is-reader': isReaderPage }">
    <button
      v-if="isReaderPage && isOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="Close sidebar"
      @click="closeSidebar"
    ></button>
    <button
      class="sidebar-trigger"
      type="button"
      :aria-expanded="isOpen"
      aria-label="Toggle sidebar"
      @click.stop="toggleSidebar"
    ></button>
    <nav class="sidebar" aria-label="Primary">
      <div class="functions">
        <router-link to="/" @click="closeSidebar">
          <HomeIcon />
        </router-link>
        <router-link to="/bookshelf" @click="closeSidebar">
          <BookshelfIcon />
        </router-link>
        <router-link to="/note" @click="closeSidebar">
          <NoteIcon />
        </router-link>
        <router-link to="/analysis" @click="closeSidebar">
          <AnalysisIcon />
        </router-link>
      </div>
      <div class="settings">
        <router-link to="/settings" @click="closeSidebar">
          <SettingIcon />
        </router-link>
      </div>
    </nav>
  </div>

  <nav v-else-if="!isReaderPage" class="bottom-nav" aria-label="Primary">
    <router-link to="/">
      <HomeIcon />
      <span>首页</span>
    </router-link>
    <router-link to="/bookshelf">
      <BookshelfIcon />
      <span>书架</span>
    </router-link>
    <router-link to="/note">
      <NoteIcon />
      <span>笔记</span>
    </router-link>
    <router-link to="/analysis">
      <AnalysisIcon />
      <span>分析</span>
    </router-link>
    <router-link to="/settings">
      <SettingIcon />
      <span>设置</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AnalysisIcon from "@/assets/svg/AnalysisIcon.vue";
import BookshelfIcon from "@/assets/svg/BookshelfIcon.vue";
import HomeIcon from "@/assets/svg/HomeIcon.vue";
import NoteIcon from "@/assets/svg/NoteIcon.vue";
import SettingIcon from "@/assets/svg/SettingIcon.vue";
import { useAppShell } from '@/services/appShellService.js';

const route = useRoute();
const pinnedOpen = ref(false);
const { isCompactShell } = useAppShell();
const isReaderPage = computed(() => route.name === 'reader');
const isOpen = computed(() => pinnedOpen.value);

function toggleSidebar() {
  pinnedOpen.value = !pinnedOpen.value;
}

function closeSidebar() {
  pinnedOpen.value = false;
}

watch(() => route.fullPath, () => {
  pinnedOpen.value = false;
});
</script>

<style scoped>
.sidebar-backdrop {
  position: fixed;
  inset: var(--app-top-offset, 26px) 0 0 0;
  z-index: 1050;
  border: none;
  background: transparent;
  padding: 0;
  cursor: default;
}

.sidebar-trigger {
  position: fixed;
  left: 0;
  top: 0;
  width: 22px;
  height: var(--app-safe-vh, 100vh);
  z-index: 1080;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: width 0.24s ease;
}

.sidebar-container.is-reader .sidebar-trigger {
  width: 12px;
}

.sidebar-trigger::after {
  content: '';
  position: absolute;
  left: 5px;
  top: calc(var(--app-top-offset, 26px) + 50%);
  transform: translateY(-50%);
  width: 6px;
  height: 92px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-muted));
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  opacity: 0.9;
  transition:
    left 0.24s ease,
    width 0.24s ease,
    background-color 0.24s ease,
    border-color 0.24s ease,
    opacity 0.24s ease;
}

.sidebar {
  height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  width: 56px;
  padding: 14px 0 18px;
  background-color: var(--surface-panel);
  border-right: 1px solid var(--border-subtle);
  top: var(--app-top-offset, 26px);
  left: -46px;
  position: fixed;
  z-index: 1070;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar-container:hover .sidebar,
.sidebar-container.is-open .sidebar {
  left: 0;
  box-shadow: var(--shadow-sm);
  z-index: 1090;
}

.sidebar-container:hover .sidebar-trigger::after,
.sidebar-container.is-open .sidebar-trigger::after {
  left: 7px;
  width: 8px;
  opacity: 1;
  background: linear-gradient(180deg, var(--accent-soft), var(--surface-panel-muted));
  border-color: var(--border-strong);
}

.sidebar-container.is-open .sidebar-trigger {
  width: 12px;
  z-index: 1060;
}

.functions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.settings {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.sidebar :deep(a),
.bottom-nav :deep(a) {
  color: var(--text-secondary);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar :deep(a) {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sidebar :deep(a *),
.sidebar :deep(svg),
.sidebar :deep(path),
.bottom-nav :deep(a *),
.bottom-nav :deep(svg),
.bottom-nav :deep(path) {
  cursor: inherit;
}

.sidebar :deep(a:hover),
.sidebar :deep(a.router-link-active) {
  background-color: var(--accent-soft);
  color: var(--accent);
}

.sidebar :deep(svg),
.bottom-nav :deep(svg) {
  color: inherit;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.bottom-nav {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: max(10px, env(safe-area-inset-bottom, 0px));
  z-index: 1100;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px);
}

.bottom-nav :deep(a) {
  min-height: 52px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.72rem;
  text-decoration: none;
}

.bottom-nav :deep(a.router-link-active) {
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
