<template>
  <section class="notes-page">
    <div class="notes-shell">
      <header class="notes-header">
        <div class="notes-header-copy">
          <span class="notes-eyebrow">{{ t('note.eyebrow') }}</span>
          <h1>{{ t('note.title') }}</h1>
          <p>{{ t('note.description') }}</p>
        </div>
        <div class="notes-header-stats">
          <article class="header-stat">
            <span>{{ t('note.stats.books') }}</span>
            <strong>{{ noteCollections.length }}</strong>
          </article>
          <article class="header-stat">
            <span>{{ t('note.stats.annotations') }}</span>
            <strong>{{ aggregateCounts.annotations }}</strong>
          </article>
          <article class="header-stat">
            <span>{{ t('note.stats.notes') }}</span>
            <strong>{{ aggregateCounts.notes + aggregateCounts.aiNotes }}</strong>
          </article>
          <article class="header-stat">
            <span>{{ t('note.stats.bookmarks') }}</span>
            <strong>{{ aggregateCounts.bookmarks }}</strong>
          </article>
        </div>
      </header>

      <div v-if="hasCollections" class="notes-workspace">
        <aside class="books-panel">
          <div class="panel-heading">
            <div>
              <h2>{{ t('note.books.title') }}</h2>
              <p>{{ t('note.books.description') }}</p>
            </div>
            <span class="panel-count">{{ noteCollections.length }}</span>
          </div>

          <div class="book-list">
            <button
              v-for="entry in noteCollections"
              :key="entry.book.identifier || entry.book.bookUrl"
              type="button"
              class="book-entry"
              :class="{ active: entry.book.identifier === selectedBookId }"
              @click="selectedBookId = entry.book.identifier"
            >
              <div class="book-entry-cover">
                <img
                  v-if="entry.book.cover"
                  :src="entry.book.cover"
                  :alt="entry.book.title || t('note.books.coverAlt')"
                >
                <span v-else>{{ getBookInitial(entry.book.title) }}</span>
              </div>

              <div class="book-entry-body">
                <strong :title="entry.book.title">{{ entry.book.title || t('note.books.untitled') }}</strong>
                <span :title="entry.book.author">{{ entry.book.author || t('note.books.unknownAuthor') }}</span>
                <div class="book-entry-meta">
                  <span>{{ formatProgress(entry.book.progress) }}</span>
                  <span>{{ entry.counts.total }}</span>
                </div>
                <div class="book-entry-counts">
                  <span>{{ entry.counts.highlights }}</span>
                  <span>{{ entry.counts.notes + entry.counts.aiNotes }}</span>
                  <span>{{ entry.counts.bookmarks }}</span>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <section class="details-panel">
          <div v-if="selectedCollection" class="details-card">
            <div class="details-header">
              <div class="details-book">
                <div class="details-cover">
                  <img
                    v-if="selectedCollection.book.cover"
                    :src="selectedCollection.book.cover"
                    :alt="selectedCollection.book.title || t('note.books.coverAlt')"
                  >
                  <span v-else>{{ getBookInitial(selectedCollection.book.title) }}</span>
                </div>

                <div class="details-copy">
                  <span class="details-kicker">{{ t('note.detail.kicker') }}</span>
                  <h2>{{ selectedCollection.book.title || t('note.books.untitled') }}</h2>
                  <p>{{ selectedCollection.book.author || t('note.books.unknownAuthor') }}</p>
                </div>
              </div>

              <button type="button" class="open-book-button" @click="openSelectedBook">
                {{ t('note.actions.openBook') }}
              </button>
            </div>

            <div class="details-toolbar">
              <div class="detail-stats">
                <div class="detail-stat-pill">
                  <span>{{ t('note.counts.highlights') }}</span>
                  <strong>{{ selectedCollection.counts.highlights }}</strong>
                </div>
                <div class="detail-stat-pill">
                  <span>{{ t('note.counts.notes') }}</span>
                  <strong>{{ selectedCollection.counts.notes }}</strong>
                </div>
                <div class="detail-stat-pill">
                  <span>{{ t('note.counts.aiNotes') }}</span>
                  <strong>{{ selectedCollection.counts.aiNotes }}</strong>
                </div>
                <div class="detail-stat-pill">
                  <span>{{ t('note.counts.bookmarks') }}</span>
                  <strong>{{ selectedCollection.counts.bookmarks }}</strong>
                </div>
              </div>

              <div class="filter-bar">
                <button
                  v-for="filter in filters"
                  :key="filter.key"
                  type="button"
                  class="filter-chip"
                  :class="{ active: activeFilter === filter.key }"
                  @click="activeFilter = filter.key"
                >
                  {{ filter.label }}
                  <span>{{ filter.count }}</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="visibleItems.length" class="note-stream">
            <article
              v-for="item in visibleItems"
              :key="item.id"
              role="button"
              tabindex="0"
              class="note-item"
              :class="`kind-${item.kind}`"
              @click="openItem(item)"
              @keydown.enter.prevent="openItem(item)"
              @keydown.space.prevent="openItem(item)"
            >
              <div class="note-item-rail"></div>
              <header class="note-item-header">
                <div class="note-item-meta">
                  <span class="note-badge" :class="`kind-${item.kind}`">{{ getItemLabel(item) }}</span>
                  <span class="note-location">{{ formatChapter(item.chapterIndex) }}</span>
                </div>
                <span v-if="item.source === 'bookmark' && item.excerpt" class="note-anchor">{{ item.excerpt }}</span>
              </header>

              <p v-if="item.excerpt && item.source !== 'bookmark'" class="note-excerpt">
                {{ item.excerpt }}
              </p>

              <div v-if="item.body" class="note-body markdown-body" v-html="renderBody(item.body)"></div>
            </article>
          </div>

          <div v-else class="empty-panel">
            <strong>{{ t('note.empty.filteredTitle') }}</strong>
            <p>{{ t('note.empty.filteredDescription') }}</p>
          </div>
        </section>
      </div>

      <div v-else class="empty-state">
        <div class="empty-state-card">
          <strong>{{ t('note.empty.title') }}</strong>
          <p>{{ t('note.empty.description') }}</p>
          <button type="button" class="open-book-button" @click="goBookshelf">
            {{ t('note.actions.goBookshelf') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { renderMarkdownToHtml } from '@/services/markdownRenderer.js';
import { navigateToBookshelf, navigateToReaderAtUrl, navigateToReaderByUrl } from '@/services/navigationService.js';
import { noteRepository } from '@/services/noteRepository.js';

const { t } = useI18n();

const noteCollections = ref([]);
const selectedBookId = ref(null);
const activeFilter = ref('all');

const aggregateCounts = computed(() =>
  noteCollections.value.reduce((summary, entry) => {
    summary.annotations += entry.counts.annotations;
    summary.highlights += entry.counts.highlights;
    summary.notes += entry.counts.notes;
    summary.aiNotes += entry.counts.aiNotes;
    summary.bookmarks += entry.counts.bookmarks;
    summary.total += entry.counts.total;
    return summary;
  }, {
    annotations: 0,
    highlights: 0,
    notes: 0,
    aiNotes: 0,
    bookmarks: 0,
    total: 0,
  }),
);

const hasCollections = computed(() => noteCollections.value.length > 0);

const selectedCollection = computed(() =>
  noteCollections.value.find(entry => entry.book.identifier === selectedBookId.value) || noteCollections.value[0] || null,
);

const filters = computed(() => {
  const counts = selectedCollection.value?.counts || {
    total: 0,
    highlights: 0,
    notes: 0,
    aiNotes: 0,
    bookmarks: 0,
  };

  return [
    { key: 'all', label: t('note.filters.all'), count: counts.total },
    { key: 'highlight', label: t('note.filters.highlights'), count: counts.highlights },
    { key: 'note', label: t('note.filters.notes'), count: counts.notes },
    { key: 'ai-note', label: t('note.filters.aiNotes'), count: counts.aiNotes },
    { key: 'bookmark', label: t('note.filters.bookmarks'), count: counts.bookmarks },
  ];
});

const visibleItems = computed(() => {
  const items = selectedCollection.value?.items || [];
  if (activeFilter.value === 'all') {
    return items;
  }

  return items.filter(item => item.kind === activeFilter.value);
});

watch(
  noteCollections,
  collections => {
    if (!collections.length) {
      selectedBookId.value = null;
      return;
    }

    const matched = collections.some(entry => entry.book.identifier === selectedBookId.value);
    if (!matched) {
      selectedBookId.value = collections[0].book.identifier;
    }
  },
  { immediate: true },
);

async function loadNotes() {
  noteCollections.value = await noteRepository.getBookNoteCollections();
}

onMounted(() => {
  void loadNotes();
});

onActivated(() => {
  void loadNotes();
});

function renderBody(markdown) {
  return renderMarkdownToHtml(markdown);
}

function formatProgress(progress) {
  const pageCurrent = progress?.page?.current;
  const pageTotal = progress?.page?.total;
  if (Number.isFinite(pageCurrent) && Number.isFinite(pageTotal) && pageTotal > 0) {
    return `${Math.round((pageCurrent / pageTotal) * 100)}%`;
  }

  if (Number.isFinite(progress?.fraction)) {
    return `${Math.round(progress.fraction * 100)}%`;
  }

  return t('note.books.noProgress');
}

function formatChapter(index) {
  return t('note.detail.chapter', { index: Number(index || 0) + 1 });
}

function getBookInitial(title) {
  const value = String(title || '').trim();
  return (value[0] || 'R').toUpperCase();
}

function getItemLabel(item) {
  if (item.kind === 'bookmark') {
    return t('note.items.bookmark');
  }

  if (item.kind === 'ai-note') {
    return t('note.items.aiNote');
  }

  if (item.kind === 'note') {
    return t('note.items.note');
  }

  if (item.style === 'underline') {
    return t('note.items.underline');
  }

  if (item.style === 'wavy') {
    return t('note.items.wavy');
  }

  return t('note.items.highlight');
}

function openSelectedBook() {
  const bookUrl = selectedCollection.value?.book?.bookUrl;
  if (!bookUrl) {
    return;
  }

  void navigateToReaderByUrl(bookUrl);
}

function openItem(item) {
  const bookUrl = selectedCollection.value?.book?.bookUrl;
  if (!bookUrl || !item) {
    return;
  }

  if (item.kind === 'bookmark' || (item.source === 'annotation' && item.kind !== 'ai-note')) {
    void navigateToReaderAtUrl(bookUrl, { location: item.value });
    return;
  }

  void navigateToReaderAtUrl(bookUrl, {
    sectionIndex: Number.isFinite(item.chapterIndex) ? item.chapterIndex : null,
  });
}

function goBookshelf() {
  void navigateToBookshelf();
}
</script>

<style scoped>
.notes-page {
  min-height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  background:
    radial-gradient(circle at top, var(--accent-soft), transparent 28%),
    var(--surface-app);
}

.notes-shell {
  width: min(1240px, calc(100% - 32px));
  height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  margin: 0 auto;
  padding: clamp(20px, 4vw, 40px) 0 calc(36px + var(--app-bottom-nav-height, 0px));
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.notes-header,
.books-panel,
.details-card,
.note-item,
.empty-state-card,
.empty-panel {
  border: 1px solid var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-sm);
}

.notes-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
  gap: 20px;
  align-items: end;
  margin-bottom: 18px;
  padding: 24px 26px;
  border-radius: 26px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-panel) 85%, white) 0%, var(--surface-panel) 100%);
}

.notes-eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
}

.notes-header-copy h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 1.02;
}

.notes-header-copy p {
  margin: 12px 0 0;
  max-width: 720px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.notes-header-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.header-stat {
  min-height: 88px;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--surface-elevated);
  border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, white);
}

.header-stat span {
  display: block;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.header-stat strong {
  display: block;
  margin-top: 12px;
  color: var(--text-primary);
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1;
}

.notes-workspace {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.books-panel {
  border-radius: 24px;
  padding: 16px;
  align-self: start;
  position: sticky;
  top: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--surface-panel);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 85%, transparent);
}

.panel-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.96rem;
}

.panel-heading p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.55;
}

.panel-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--surface-panel);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.book-entry {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 11px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, transparent);
  border-radius: 16px;
  background: var(--surface-elevated);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.book-entry:hover,
.book-entry.active {
  border-color: color-mix(in srgb, var(--accent) 22%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-soft) 48%, var(--surface-elevated));
  transform: translateY(-1px);
}

.book-entry-cover,
.details-cover {
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-panel) 78%, white);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-weight: 700;
}

.book-entry-cover {
  width: 56px;
  height: 80px;
}

.details-cover {
  width: 88px;
  height: 124px;
  flex-shrink: 0;
}

.book-entry-cover img,
.details-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-entry-body {
  min-width: 0;
}

.book-entry-body strong,
.book-entry-body span {
  display: block;
}

.book-entry-body strong {
  color: var(--text-primary);
  font-size: 0.96rem;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-entry-body span {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-entry-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.book-entry-counts {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.book-entry-counts span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-panel) 70%, white);
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.details-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.details-card {
  padding: 22px 22px 18px;
  border-radius: 24px;
  background: var(--surface-elevated);
}

.details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.details-book {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
}

.details-copy {
  min-width: 0;
}

.details-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
}

.details-copy h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1.15;
}

.details-copy p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.details-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  margin-top: 18px;
}

.open-book-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-subtle));
  border-radius: 999px;
  background: var(--surface-panel);
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.open-book-button:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent-soft) 75%, var(--surface-panel));
  transform: translateY(-1px);
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail-stat-pill {
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--surface-panel);
  border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, white);
}

.detail-stat-pill span {
  display: block;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.detail-stat-pill strong {
  display: block;
  margin-top: 8px;
  color: var(--text-primary);
  font-size: 1.15rem;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: var(--surface-panel);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
}

.filter-chip span {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.filter-chip.active {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-soft) 75%, var(--surface-panel));
  color: var(--text-primary);
}

.note-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.note-item {
  position: relative;
  padding: 16px 18px 16px 20px;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  background: var(--surface-elevated);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.note-item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border-strong));
  box-shadow: var(--shadow-md);
}

.note-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 48%, transparent);
  outline-offset: 2px;
}

.note-item-rail {
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 28%, var(--border-subtle));
}

.note-item.kind-highlight .note-item-rail {
  background: #e7c75d;
}

.note-item.kind-note .note-item-rail {
  background: #74a7ff;
}

.note-item.kind-ai-note .note-item-rail {
  background: #a47dff;
}

.note-item.kind-bookmark .note-item-rail {
  background: #64b98f;
}

.note-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.note-item-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.note-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.note-badge.kind-highlight {
  background: color-mix(in srgb, #f5d97b 22%, var(--surface-panel));
  color: #8f6500;
}

.note-badge.kind-note {
  background: color-mix(in srgb, #74a7ff 20%, var(--surface-panel));
  color: #225bb6;
}

.note-badge.kind-ai-note {
  background: color-mix(in srgb, #b58cff 18%, var(--surface-panel));
  color: #6d3dba;
}

.note-badge.kind-bookmark {
  background: color-mix(in srgb, #7cc8a2 20%, var(--surface-panel));
  color: #28784f;
}

.note-location,
.note-anchor {
  color: var(--text-muted);
  font-size: 0.84rem;
}

.note-anchor {
  max-width: 40%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-excerpt {
  margin: 12px 0 0;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 84%, white);
  border-radius: 14px;
  background: var(--surface-panel);
  color: var(--text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.note-body {
  margin-top: 12px;
  color: var(--text-secondary);
  line-height: 1.75;
}

.note-body :deep(p:first-child) {
  margin-top: 0;
}

.note-body :deep(p:last-child) {
  margin-bottom: 0;
}

.empty-state,
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-card,
.empty-panel {
  padding: 30px 24px;
  border-radius: 24px;
  text-align: center;
}

.empty-state-card strong,
.empty-panel strong {
  color: var(--text-primary);
  font-size: 1.05rem;
}

.empty-state-card p,
.empty-panel p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.empty-state-card .open-book-button {
  margin-top: 18px;
}

@media (max-width: 1080px) {
  .notes-header,
  .notes-workspace {
    grid-template-columns: 1fr;
  }

  .books-panel {
    position: static;
    height: auto;
  }
}

@media (max-width: 767px) {
  .notes-shell {
    width: min(100%, calc(100% - 24px));
    padding-bottom: calc(28px + var(--app-bottom-nav-height, 0px));
  }

  .notes-header,
  .books-panel,
  .details-card,
  .note-item,
  .empty-state-card,
  .empty-panel {
    border-radius: 22px;
  }

  .notes-stat-grid,
  .notes-header-stats,
  .detail-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .details-header,
  .details-book {
    flex-direction: column;
  }

  .note-anchor {
    max-width: 100%;
  }

  .open-book-button {
    width: 100%;
  }

  .note-item-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .book-list,
  .note-stream {
    overflow: visible;
    padding-right: 0;
  }
}
</style>
