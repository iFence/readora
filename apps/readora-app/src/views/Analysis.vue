<template>
  <section class="placeholder-page">
    <div class="placeholder-card">
      {{ t('common.comingSoon') }}
    </div>
  </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.placeholder-page {
  min-height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  padding: 24px 16px calc(24px + var(--app-bottom-nav-height, 0px));
}

.placeholder-card {
  width: min(960px, 100%);
  margin: 0 auto;
  padding: 32px 24px;
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-sm);
  color: var(--text-secondary);
  text-align: center;
}
</style>
