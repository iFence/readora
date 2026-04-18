<!-- src/components/EpubToc.vue -->
<template>
  <div ref="tocRoot" class="epub-toc text-ellipsis">
    <div v-if="loading" class="loading">加载目录中...</div>
    <div v-else-if="error" class="error">加载失败: {{ error.message }}</div>
    <ul v-else class="toc-list">
      <toc-item
          v-for="item in toc"
          :key="item.id"
          :item="item"
          :level="0"
          :active-id="activeHref"
          :page-map="pageMap"
          @click="handleItemClick"
      />
    </ul>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, nextTick, ref, watch } from 'vue';
import TocItem from './TocItem.vue';

const props = defineProps({
  toc: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Error,
    default: null
  },
  title: {
    type: String,
    default: '目录'
  },
  activeHref: {
    type: String,
    default: null
  },
  pageMap: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['navigate']);
const tocRoot = ref(null);

const handleItemClick = (href) => {
  emit('navigate', href);
};

function keepActiveItemInView() {
  const container = tocRoot.value;
  const activeItem = container?.querySelector('.active-link');
  if (!container || !activeItem) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const activeRect = activeItem.getBoundingClientRect();
  const isAboveViewport = activeRect.top < containerRect.top;
  const isBelowViewport = activeRect.bottom > containerRect.bottom;

  if (isAboveViewport || isBelowViewport) {
    const targetScrollTop = Math.max(
      0,
      activeItem.offsetTop - (container.clientHeight / 2) + (activeItem.offsetHeight / 2),
    );

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }
}

watch(() => props.activeHref, async newHref => {
  if (!newHref) {
    return;
  }

  await nextTick();
  keepActiveItemInView();
}, { immediate: true });
</script>

<style scoped>
.epub-toc {
  height: 100%;
  overflow-y: auto;
  background-color: transparent;
  color: var(--text-primary);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.epub-toc::-webkit-scrollbar {
  display: none;
}

.loading, .error {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
}

.toc-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
</style>
