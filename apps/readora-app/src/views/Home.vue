<template>
  <Suspense>
    <section class="home-page">
      <div class="home-shell">
        <header class="banner">
          <div class="banner-copy">
            <span class="eyebrow">Cross-platform reading</span>
            <h1>Readora</h1>
            <p>在桌面、平板和手机上保持一致的阅读节奏，同时为后续移动端能力接入预留空间。</p>
          </div>
        </header>

        <div class="home-body">
          <section class="latest-book">
            <button type="button" class="section-link" @click="goBookshelf">{{ t('home.read') }}</button>
            <div class="book-grid">
              <book-card
                v-for="book in latestBooks"
                :key="book.bookUrl"
                :title="book.title"
                :author="book.author"
                :cover="book.cover"
                :progress="book.progress"
                :total-reading-time-ms="book.totalReadingTimeMs"
                :url="book.bookUrl"
              />
            </div>
          </section>

          <section class="latest-note">
            <span class="section-title">{{ t('home.note') }}</span>
            <div class="empty-card">笔记与分析页面将在移动端共用同一套紧凑布局。</div>
          </section>
        </div>
      </div>
    </section>
  </Suspense>
</template>

<script setup>
import { onActivated, onMounted, ref } from "vue";
import { useI18n } from 'vue-i18n';
import BookCard from "@/components/BookCard.vue";
import { libraryRepository } from '@/services/libraryRepository.js';
import { navigateToBookshelf } from '@/services/navigationService.js';

const { t } = useI18n();
const latestBooks = ref([]);

async function loadLatestBooks() {
  latestBooks.value = await libraryRepository.getLatestBooks(4);
}

onMounted(async () => {
  await loadLatestBooks();
  window.setTimeout(() => {
    void loadLatestBooks();
  }, 400);
});

onActivated(() => {
  void loadLatestBooks();
});

function goBookshelf() {
  navigateToBookshelf();
}
</script>

<style scoped>
.home-page {
  min-height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  background:
    radial-gradient(circle at top, var(--accent-soft), transparent 28%),
    var(--surface-app);
}

.home-shell {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: clamp(20px, 4vw, 40px) 0 calc(40px + var(--app-bottom-nav-height, 0px));
}

.banner {
  display: flex;
  align-items: center;
  min-height: 220px;
  padding: clamp(28px, 5vw, 64px);
  border: 1px solid var(--border-subtle);
  border-radius: 28px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-panel) 85%, white) 0%, var(--surface-panel) 100%);
  box-shadow: var(--shadow-sm);
}

.banner-copy {
  max-width: 640px;
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.banner h1 {
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 4.8rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.banner p {
  margin: 18px 0 0;
  font-size: clamp(0.98rem, 2.2vw, 1.1rem);
  line-height: 1.7;
  color: var(--text-secondary);
}

.home-body {
  padding-top: 24px;
  color: var(--text-primary);
}

.section-link,
.section-title {
  display: inline-flex;
  align-items: center;
  margin-bottom: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 600;
}

.section-link {
  cursor: pointer;
  transition: color 0.2s ease;
}

.section-link:hover {
  color: var(--accent);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.latest-note {
  margin-top: 28px;
}

.empty-card {
  min-height: 120px;
  padding: 22px;
  border: 1px dashed var(--border-subtle);
  border-radius: 22px;
  background: color-mix(in srgb, var(--surface-panel) 88%, transparent);
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .book-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .home-shell {
    width: min(100%, calc(100% - 24px));
    padding-bottom: calc(28px + var(--app-bottom-nav-height, 0px));
  }

  .banner {
    min-height: auto;
    border-radius: 24px;
  }

  .book-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
