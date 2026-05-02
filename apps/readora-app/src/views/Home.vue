<template>
  <Suspense>
    <section class="home-page">
      <div class="home-shell">
        <header class="banner">
          <div class="banner-copy">
            <h1>Readora</h1>
            <p>{{ t('home.subtitle') }}</p>
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
            <div class="stats-card">
              <div class="heatmap-card">
                <calendar-heatmap
                  class="home-heatmap"
                  :end-date="heatmapEndDate"
                  :values="heatmapValues"
                  :max="heatmapMaxMinutes"
                  :range-color="heatmapRangeColors"
                  :locale="heatmapLocale"
                  :tooltip-formatter="formatCalendarTooltip"
                  :tooltip-unit="t('home.stats.totalTime')"
                  :no-data-text="t('home.stats.noData')"
                  :round="2"
                />
              </div>

              <p v-if="!heatmapHasActivity" class="stats-empty">
                {{ t('home.stats.emptyHint') }}
              </p>
            </div>
          </section>
        </div>
      </div>
    </section>
  </Suspense>
</template>

<script setup>
import { computed, onActivated, onMounted, ref } from "vue";
import { CalendarHeatmap } from 'vue3-calendar-heatmap';
import 'vue3-calendar-heatmap/dist/style.css';
import { useI18n } from 'vue-i18n';
import BookCard from "@/components/BookCard.vue";
import { libraryRepository } from '@/services/libraryRepository.js';
import { navigateToBookshelf } from '@/services/navigationService.js';

const { t, locale } = useI18n();
const latestBooks = ref([]);
const dailyReadingStats = ref([]);
const HEATMAP_DAYS = 366;

function formatDurationLabel(totalMs) {
  if (!Number.isFinite(totalMs) || totalMs <= 0) {
    return '0m';
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
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function buildShortLabels(formatter, startDate, length) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return formatter.format(date);
  });
}

function buildMonthLabels(formatter) {
  return Array.from({ length: 12 }, (_, index) => (
    formatter.format(new Date(2026, index, 1))
  ));
}

function formatHeatmapTooltip(dateKey, durationMs) {
  const date = parseDateKey(dateKey);
  const dayLabel = new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(date);
  if (!durationMs) {
    return [
      `<div class="heatmap-tooltip">`,
      `<strong>${dayLabel}</strong>`,
      `<span>${t('home.stats.noData')}</span>`,
      `</div>`,
    ].join('');
  }
  return [
    `<div class="heatmap-tooltip">`,
    `<strong>${dayLabel}</strong>`,
    `<span>${t('home.stats.tooltipReadFor')} ${formatDurationLabel(durationMs)}</span>`,
    `</div>`,
  ].join('');
}

function formatCalendarTooltip(value) {
  const dateKey = value?.date instanceof Date
    ? [
      value.date.getFullYear(),
      `${value.date.getMonth() + 1}`.padStart(2, '0'),
      `${value.date.getDate()}`.padStart(2, '0'),
    ].join('-')
    : String(value?.date || '');
  const durationMs = Number.isFinite(value?.count) ? value.count * 60_000 : 0;
  return formatHeatmapTooltip(dateKey, durationMs);
}

const recentHeatmapStats = computed(() =>
  dailyReadingStats.value.map(item => ({
    date: parseDateKey(item.dateKey),
    dateKey: item.dateKey,
    durationMs: item.durationMs,
  })),
);

const heatmapEndDate = computed(() => new Date());

const heatmapValues = computed(() =>
  recentHeatmapStats.value.map(day => ({
    date: day.date,
    count: Math.max(0, Math.round(day.durationMs / 60_000)),
  })),
);

const heatmapMaxMinutes = computed(() => {
  const maxMinutes = heatmapValues.value.reduce((max, day) => Math.max(max, day.count), 0);
  return Math.max(45, maxMinutes);
});

const heatmapRangeColors = computed(() => ([
  'var(--heatmap-level-0)',
  'var(--heatmap-level-1)',
  'var(--heatmap-level-2)',
  'var(--heatmap-level-3)',
  'var(--heatmap-level-4)',
  'var(--heatmap-level-5)',
]));

const heatmapLocale = computed(() => {
  const monthFormatter = new Intl.DateTimeFormat(locale.value, { month: 'short' });
  const weekdayFormatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' });
  return {
    months: buildMonthLabels(monthFormatter),
    days: buildShortLabels(weekdayFormatter, new Date(2026, 0, 4), 7),
    on: '',
    less: t('home.stats.legendLess'),
    more: t('home.stats.legendMore'),
  };
});

const heatmapHasActivity = computed(() =>
  recentHeatmapStats.value.some(day => day.durationMs > 0),
);

async function loadHomeData() {
  const [books, stats] = await Promise.all([
    libraryRepository.getLatestBooks(4),
    libraryRepository.getRecentDailyReadingStats(HEATMAP_DAYS),
  ]);
  latestBooks.value = books;
  dailyReadingStats.value = stats;
}

onMounted(async () => {
  await loadHomeData();
  window.setTimeout(() => {
    void loadHomeData();
  }, 400);
});

onActivated(() => {
  void loadHomeData();
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
  min-height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  padding: clamp(16px, 3vw, 28px) 0 calc(24px + var(--app-bottom-nav-height, 0px));
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.banner {
  display: flex;
  align-items: center;
  min-height: 124px;
  padding: clamp(18px, 3vw, 28px);
  border: 1px solid var(--border-subtle);
  border-radius: 28px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-panel) 85%, white) 0%, var(--surface-panel) 100%);
  box-shadow: var(--shadow-sm);
}

.banner-copy {
  max-width: 640px;
}

.banner h1 {
  margin: 0;
  font-size: clamp(2rem, 4.4vw, 3.3rem);
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.banner p {
  margin: 8px 0 0;
  font-size: clamp(0.9rem, 1.8vw, 1rem);
  line-height: 1.55;
  color: var(--text-secondary);
}

.home-body {
  flex: 1;
  display: grid;
  grid-template-rows: minmax(0, auto) auto;
  gap: 20px;
  padding-top: 18px;
  color: var(--text-primary);
}

.latest-book,
.latest-note {
  min-height: 0;
}

.section-link,
.section-title {
  display: inline-flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: clamp(1.2rem, 2.4vw, 1.6rem);
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
  gap: 14px;
}

.stats-card {
  --heatmap-level-0: color-mix(in srgb, var(--surface-app) 94%, var(--surface-panel));
  --heatmap-level-1: color-mix(in srgb, #9be9a8 28%, var(--surface-elevated));
  --heatmap-level-2: color-mix(in srgb, #40c463 46%, var(--surface-elevated));
  --heatmap-level-3: color-mix(in srgb, #30a14e 72%, var(--surface-elevated));
  --heatmap-level-4: color-mix(in srgb, #216e39 84%, var(--surface-elevated));
  --heatmap-level-5: color-mix(in srgb, #16542b 92%, var(--surface-elevated));
  display: grid;
  gap: 14px;
  padding: 14px;
}

.heatmap-card {
  padding: 12px;
  border-radius: 18px;
  background: var(--surface-elevated);
  border: 1px solid color-mix(in srgb, var(--border-subtle) 82%, white);
}

.home-heatmap {
  width: 100%;
}

.home-heatmap :deep(svg.vch__wrapper) {
  display: block;
}

.home-heatmap :deep(svg.vch__wrapper text.vch__month__label),
.home-heatmap :deep(svg.vch__wrapper text.vch__day__label),
.home-heatmap :deep(svg.vch__wrapper .vch__legend__wrapper text),
.home-heatmap :deep(.vch__legend) {
  fill: var(--text-secondary);
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.home-heatmap :deep(svg.vch__wrapper text.vch__month__label) {
  font-size: 0.66rem;
}

.home-heatmap :deep(svg.vch__wrapper text.vch__day__label) {
  font-size: 0.64rem;
}

.home-heatmap :deep(svg.vch__wrapper .vch__legend__wrapper text) {
  font-size: 0.68rem;
}

.home-heatmap :deep(svg.vch__wrapper rect.vch__day__square:hover) {
  stroke: color-mix(in srgb, var(--text-primary) 40%, transparent);
  stroke-width: 1.5px;
}

.home-heatmap :deep(.tippy-box) {
  background: color-mix(in srgb, var(--surface-panel) 90%, black 12%);
  color: var(--text-primary);
  border: 1px solid color-mix(in srgb, var(--border-subtle) 88%, white);
  box-shadow: var(--shadow-sm);
}

.home-heatmap :deep(.tippy-arrow),
.home-heatmap :deep(.tippy-svg-arrow) {
  color: color-mix(in srgb, var(--surface-panel) 90%, black 12%);
  fill: color-mix(in srgb, var(--surface-panel) 90%, black 12%);
}

.home-heatmap :deep(.heatmap-tooltip) {
  display: grid;
  gap: 2px;
}

.home-heatmap :deep(.heatmap-tooltip strong) {
  font-size: 0.82rem;
  font-weight: 600;
}

.home-heatmap :deep(.heatmap-tooltip span) {
  font-size: 0.76rem;
  color: color-mix(in srgb, var(--text-secondary) 92%, white 8%);
}

.stats-empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
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
