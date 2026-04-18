<!-- src/components/TocItem.vue -->
<template>
  <li :class="['toc-item', `level-${level}`]">
    <div class="item-content" :class="{ 'active-link': isTocHrefActive(item.href, activeId) }">
      <div
          class="icon-wrapper"
          @click.stop="toggleExpand"
      >
        <ChevronRightIcon
            v-if="hasChildren"
            class="arrow-icon"
            :class="{ expanded }"
        />
      </div>
      <a href="#" @click.prevent="handleClick" class="item-link">{{ item.label }}</a>
      <span v-if="pageNumber != null" class="item-page">{{ pageNumber }}</span>
    </div>
    <ul v-show="hasChildren && expanded" class="subitems">
      <toc-item
          v-for="child in item.subitems"
          :key="child.id"
          :item="child"
          :level="level + 1"
          :active-id="activeId"
          :page-map="pageMap"
          @click="$emit('click', $event)"
      />
    </ul>
  </li>
</template>

<script setup>
import {computed, ref, watch} from 'vue';
import ChevronRightIcon from '../assets/svg/ChevronRightIcon.vue';
import { hasActiveDescendant, isTocHrefActive } from '@/components/tocItemUtils.js';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  activeId: {
    type: String,
    default: null
  },
  pageMap: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['click']);

const hasChildren = computed(() =>
    props.item.subitems && props.item.subitems.length > 0
);

const pageNumber = computed(() => {
  const page = props.pageMap?.[props.item.href];
  return Number.isFinite(page) ? page : null;
});

const expanded = ref(false);

const toggleExpand = () => {
  if (hasChildren.value) {
    expanded.value = !expanded.value;
  }
};

watch(() => props.activeId, (newId) => {
  if (hasChildren.value && hasActiveDescendant(props.item.subitems, newId)) {
    expanded.value = true;
  }
}, { immediate: true });

const handleClick = () => {
  emit('click', props.item.href);
};
</script>

<style scoped>
.toc-item {
  /* padding handled in item-content now */
  padding: 0;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.4rem 0.5rem 0.4rem 0.15rem;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.item-content :where(div, span, a, svg, path) {
  cursor: inherit;
}

.item-content:hover {
  background-color: var(--surface-hover);
}

.item-content:hover .item-link {
  color: var(--accent);
}

.active-link {
  background-color: var(--accent-soft) !important;
}

.active-link .item-link {
  color: var(--accent);
}

.icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.arrow-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
  color: var(--text-secondary);
}

.arrow-icon.expanded {
  transform: rotate(90deg);
}

.item-link {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 0.5rem;
}

.item-page {
  flex-shrink: 0;
  min-width: 2.5rem;
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.active-link .item-page {
  color: var(--accent);
}

.subitems {
  list-style: none;
  padding-left: 1.5rem;
  margin: 0;
}
.toc-item.level-1, .toc-item.level-2, .toc-item.level-3, .toc-item.level-4 {
  padding-left: 0;
}
</style>
