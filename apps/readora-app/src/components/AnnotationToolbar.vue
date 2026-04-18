<template>
  <div
      v-show="visible"
      class="annotation-toolbar"
      :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div class="arrow"></div>
    <div class="tool-item" @click="$emit('copy')">
      <CopyIcon class="icon"/>
      <span>复制</span>
    </div>
    <div class="tool-item" @click="$emit('highlight', 'yellow')">
      <MarkerIcon class="icon"/>
      <span>马克笔</span>
    </div>
    <div class="tool-item" @click="$emit('highlight', 'wavy')">
      <WavyIcon class="icon"/>
      <span>波浪线</span>
    </div>
    <div class="tool-item" @click="$emit('highlight', 'underline')">
      <UnderlineIcon class="icon"/>
      <span>直线</span>
    </div>
    <div class="tool-item" @click="$emit('note')">
      <ThoughtIcon class="icon"/>
      <span>写想法</span>
    </div>
    <div class="tool-item" @click="$emit('search')">
      <SearchIcon class="icon"/>
      <span>查询</span>
    </div>
  </div>
</template>

<script setup>
import CopyIcon from '../assets/svg/CopyIcon.vue';
import MarkerIcon from '../assets/svg/MarkerIcon.vue';
import WavyIcon from '../assets/svg/WavyIcon.vue';
import UnderlineIcon from '../assets/svg/UnderlineIcon.vue';
import ThoughtIcon from '../assets/svg/ThoughtIcon.vue';
import SearchIcon from '../assets/svg/SearchIcon.vue';

defineProps({
  visible: Boolean,
  x: Number,
  y: Number
})
</script>

<style scoped>
.annotation-toolbar {
  position: absolute;
  background-color: var(--surface-overlay);
  color: var(--text-on-overlay);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  z-index: 1000;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-on-overlay);
  font-size: 12px;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  min-width: 52px;
}

.tool-item :where(span, svg, path) {
  cursor: inherit;
}

.tool-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.icon {
  width: 24px;
  height: 24px;
  color: inherit;
}

.arrow {
  position: absolute;
  top: -6px;
  left: 24px;
  width: 0; 
  height: 0; 
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid var(--surface-overlay);
}
</style>
