<template>
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-name">
        {{ itemName }}
      </div>
    </div>
    <div class="setting-item-control">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>

defineProps({
  itemName: String,

})
</script>

<style scoped>
.setting-item {
  width: 100%;
  min-height: 64px;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 76%, transparent);
}

.setting-item:first-child {
  padding-top: 0;
}

.setting-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.setting-name {
  font-size: 0.96rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-primary);
}

.setting-item-control {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  flex: 1;
}

.setting-item-info {
  min-width: 0;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .setting-item {
    min-height: 0;
    padding: 14px 0;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .setting-item-control {
    justify-content: flex-start;
  }
}
</style>
