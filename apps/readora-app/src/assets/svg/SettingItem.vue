<template>
  <div class="setting-item flex justify-space-between">
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
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.setting-name {
  font-size: 1.1rem;
  color: var(--text-primary);
}

.setting-item-control {
  color: var(--text-secondary);
}
</style>
