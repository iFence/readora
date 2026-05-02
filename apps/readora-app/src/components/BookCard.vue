<template>
  <div class="book-card flex" :class="{ 'has-edit-button': showEditButton }" @click="goRead">
    <slot>
      <img id="cover-img" :src="cover" alt="封面" />
      <div class="book-info flex flex-column text-ellipsis">
        <span class="title text-ellipsis" :title="title">{{ title }}</span>
        <span class="author text-ellipsis">{{ author }}</span>
        <div v-if="progressLabel || readingTimeLabel" class="reading-meta">
          <span v-if="progressLabel" class="progress">{{ progressLabel }}</span>
          <span v-if="readingTimeLabel" class="reading-time">{{ readingTimeLabel }}</span>
        </div>
      </div>
    </slot>
    <button
      v-if="showEditButton"
      type="button"
      class="book-card-edit"
      :aria-label="editLabel"
      @click.stop="handleEdit"
    >
      {{ editLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { navigateToReaderByUrl } from '@/services/navigationService.js';

const props = defineProps({
  title: {
    type: String
  },
  author: {
    type: String
  },
  cover: {
    type: String,
    default: ''
  },
  progress: {
    type: Object,
    default: null,
  },
  totalReadingTimeMs: {
    type: Number,
    default: 0,
  },
  url: {
    type: String
  },
  showEditButton: {
    type: Boolean,
    default: false,
  },
  editLabel: {
    type: String,
    default: 'Edit',
  }
});
const emit = defineEmits(['edit']);

const progressPercent = computed(() => {
  const { progress } = props;
  if (!progress || typeof progress !== 'object') {
    return 0;
  }

  const pageCurrent = progress.page?.current;
  const pageTotal = progress.page?.total;
  if (Number.isFinite(pageCurrent) && Number.isFinite(pageTotal) && pageTotal > 0) {
    return Math.max(0, Math.min(100, Math.round((pageCurrent / pageTotal) * 100)));
  }

  if (Number.isFinite(progress.fraction)) {
    return Math.max(0, Math.min(100, Math.round(progress.fraction * 100)));
  }

  return 0;
});

const progressLabel = computed(() => {
  if (!progressPercent.value) {
    return '';
  }

  return `${progressPercent.value}%`;
});

const readingTimeLabel = computed(() => {
  const totalMs = Number.isFinite(props.totalReadingTimeMs) ? props.totalReadingTimeMs : 0;
  if (totalMs <= 0) {
    return '';
  }
  if (totalMs < 60_000) {
    return '<1m';
  }

  const totalMinutes = Math.floor(totalMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
});

async function goRead() {
  if (!props.url) return;
  await navigateToReaderByUrl(props.url);
}

function handleEdit() {
  emit('edit');
}
</script>

<style scoped>
.book-card {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 156px;
  position: relative;
  cursor: pointer;
  aspect-ratio: 16 / 9;
  padding: 14px;
  border-radius: 18px;
  align-items: center;
  gap: 12px;
  background-color: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;

  img {
    aspect-ratio: 9 / 13;
    height: 100%;
    max-height: 128px;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.16);
    object-fit: cover;
  }

  .book-info {
    color: var(--text-primary);
    gap: 6px;
    min-width: 0;

    .title {
      font-size: clamp(0.92rem, 1.8vw, 1.08rem);
      font-weight: 600;
      line-height: 1.32;
    }

    .author {
      font-size: clamp(0.78rem, 1.25vw, 0.86rem);
      color: var(--text-secondary);
    }

    .progress {
      font-size: 0.78rem;
      color: var(--accent);
      font-weight: 500;
    }

    .reading-time {
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    .reading-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 1rem;
      white-space: nowrap;
    }
  }
}

.book-card.has-edit-button .book-info {
  padding-right: 42px;
}

.book-card-edit {
  position: absolute;
  right: 12px;
  bottom: 12px;
  min-width: 38px;
  height: 28px;
  padding: 0 9px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-panel) 92%, transparent);
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
}

.book-card-edit:hover {
  color: var(--accent);
  border-color: var(--border-strong);
  background: var(--surface-elevated);
}

.book-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

@media (max-width: 767px) {
  .book-card {
    aspect-ratio: auto;
    min-height: 0;
    padding: 12px;
    align-items: flex-start;
  }

  .book-card img {
    width: 66px;
    height: 96px;
    max-height: none;
  }

  .book-card .book-info {
    white-space: normal;
  }

  .book-card .book-info .title {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .book-card .book-info .reading-meta {
    flex-wrap: wrap;
    white-space: normal;
  }

  .book-card-edit {
    right: 10px;
    bottom: 10px;
  }
}
</style>
