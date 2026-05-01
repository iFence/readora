<template>
  <div class="book-container" :class="{ 'compact-reader': isCompactReader }">
    <button
      v-if="isCompactReader && isSidebarDrawerOpen"
      type="button"
      class="reader-overlay"
      aria-label="Close reader sidebar"
      @click="closeSidebarDrawer"
    ></button>

    <header v-if="isCompactReader" class="compact-reader-header">
      <button type="button" class="compact-header-button" @click="goBack">返回</button>
      <div class="compact-reader-title" :title="bookInfo.title">{{ bookInfo.title || '阅读器' }}</div>
      <button type="button" class="compact-header-button" @click="toggleSidebarDrawer">目录</button>
    </header>

    <aside
      class="left_area"
      :class="{ compact: isCompactReader, open: !isCompactReader || isSidebarDrawerOpen }"
      :style="sidebarPanelStyle"
    >
      <div class="book-detail flex">
        <div class="cover flex-shrink-0 flex">
          <img id="cover-image" v-if="coverImg" :src="coverImg" :alt="bookInfo.title" />
          <div class="text-detail">
            <div class="title" :title="bookInfo.title">{{ bookInfo.title }}</div>
            <div class="author">{{ bookInfo.author }}</div>
          </div>
        </div>
      </div>
      <div class="hr-wrap">
        <hr />
      </div>
      <div class="sidebar-panel-content flex flex-column">
        <div v-if="activeSidebarTab === 'menu'" class="toc-container flex flex-column">
          <epub-toc
            v-if="bookDetail?.toc"
            :toc="bookDetail.toc"
            :page-map="tocPageMap"
            :active-href="activeTocHref"
            @navigate="handleNavigateAndClose"
          />
        </div>
        <div v-else-if="activeSidebarTab === 'notes'" class="notes-container">
          <button
            v-for="note in noteEntries"
            :key="note.value"
            type="button"
            class="note-card"
            @click="goToAnnotationAndClose(note.value)"
          >
            <div class="note-card-header">
              <div class="note-card-index">章节 {{ note.index + 1 }}</div>
              <div class="note-card-type">{{ note.label }}</div>
            </div>
            <div v-if="note.text" class="note-card-text">{{ note.text }}</div>
            <div v-if="note.note" class="note-card-note">{{ note.note }}</div>
            <div v-if="!note.text && !note.note" class="note-card-meta">旧标注暂未保存摘录内容</div>
          </button>
          <div v-if="noteEntries.length === 0" class="sidebar-empty-state">
            暂无标注
          </div>
        </div>
        <div v-else class="bookmarks-container">
          <div
            v-for="bookmark in bookmarkEntries"
            :key="bookmark.id || bookmark.value"
            class="note-card bookmark-card"
          >
            <div class="note-card-header">
              <div class="note-card-index">章节 {{ (bookmark.index ?? 0) + 1 }}</div>
              <div class="note-card-type">书签</div>
            </div>
            <button type="button" class="bookmark-link" @click="goToBookmarkAndClose(bookmark.value)">
              {{ bookmark.label || '当前位置' }}
            </button>
            <button
              type="button"
              class="bookmark-delete"
              @click.stop="deleteBookmark(bookmark.id)"
            >
              删除
            </button>
          </div>
          <div v-if="bookmarkEntries.length === 0" class="sidebar-empty-state">
            暂无书签
          </div>
        </div>
      </div>
      <div class="sidebar-tabs" role="tablist" aria-label="Reader sidebar tabs">
        <button
          type="button"
          class="sidebar-tab"
          :class="{ active: activeSidebarTab === 'menu' }"
          @click="activeSidebarTab = 'menu'"
        >
          菜单
        </button>
        <button
          type="button"
          class="sidebar-tab"
          :class="{ active: activeSidebarTab === 'notes' }"
          @click="activeSidebarTab = 'notes'"
        >
          笔记
        </button>
        <button
          type="button"
          class="sidebar-tab"
          :class="{ active: activeSidebarTab === 'bookmarks' }"
          @click="activeSidebarTab = 'bookmarks'"
        >
          书签
        </button>
      </div>
    </aside>

    <div v-if="!isCompactReader" class="resizer" @pointerdown="startResize"></div>

    <div class="content-area" :class="layout === 'paginated' ? 'paginated-content-area' : 'scrolled-content-area'">
      <div
        v-if="showReaderControls"
        ref="readerControlsPanel"
        class="reader-controls-panel"
        :class="{ compact: isCompactReader }"
      >
        <div class="reader-controls-title">阅读设置</div>
        <label class="reader-control">
          <span>字体大小</span>
          <input
            type="range"
            min="12"
            max="32"
            step="1"
            :value="readerFontSize"
            @input="updateReaderFontSize(Number($event.target.value))"
          />
          <strong>{{ readerFontSize }}px</strong>
        </label>
        <label class="reader-control">
          <span>行间距</span>
          <input
            type="range"
            min="1.2"
            max="2.6"
            step="0.1"
            :value="readerLineHeight"
            @input="updateReaderLineHeight(Number($event.target.value))"
          />
          <strong>{{ readerLineHeight.toFixed(1) }}</strong>
        </label>
        <button type="button" class="reader-controls-reset" @click="resetReaderTypographySettings">
          重置默认
        </button>
      </div>

      <div ref="viewer" class="read-panel"></div>
      <div v-if="layout === 'paginated' && showPageNumbers" class="page-number left" :class="{ compact: isCompactReader }">
        {{ leftPageNumber }}<span v-if="totalPages"> / {{ totalPages }}</span>
      </div>
      <div
        v-if="layout === 'paginated' && showPageNumbers && !isCompactReader && visiblePageSlots > 1 && rightPageNumber != null"
        class="page-number right"
      >
        {{ rightPageNumber }}<span v-if="totalPages"> / {{ totalPages }}</span>
      </div>

      <div
        v-if="isPomodoroEnabled && isPomodoroPanelVisible"
        class="pomodoro-panel"
        :class="{ compact: isCompactReader }"
      >
        <div class="pomodoro-header">
          <div>
            <p class="pomodoro-eyebrow">Pomodoro</p>
            <h3>{{ pomodoroMode === 'focus' ? '专注阅读' : '休息时间' }}</h3>
          </div>
          <button type="button" class="pomodoro-close" @click="togglePomodoroPanel">关闭</button>
        </div>
        <div class="pomodoro-time">{{ pomodoroTimeLabel }}</div>
        <div class="pomodoro-mode-switch">
          <button
            type="button"
            :class="{ active: pomodoroMode === 'focus' }"
            @click="switchPomodoroMode('focus')"
          >
            专注 {{ pomodoroConfig.focusMinutes }}m
          </button>
          <button
            type="button"
            :class="{ active: pomodoroMode === 'break' }"
            @click="switchPomodoroMode('break')"
          >
            休息 {{ pomodoroConfig.breakMinutes }}m
          </button>
        </div>
        <div class="pomodoro-actions">
          <button v-if="!isPomodoroRunning" type="button" @click="startPomodoro">
            {{ pomodoroRemainingSeconds > 0 ? '开始' : '重新开始' }}
          </button>
          <button v-else type="button" @click="pausePomodoro">暂停</button>
          <button type="button" @click="resetPomodoro()">重置</button>
        </div>
        <div v-if="pomodoroRemainingSeconds === 0" class="pomodoro-done">
          {{ pomodoroMode === 'focus' ? '本轮专注已完成，可以切换到休息。' : '休息结束，可以开始下一轮阅读。' }}
        </div>
      </div>
    </div>

    <div class="toolbar" :class="{ compact: isCompactReader }">
      <button type="button" class="tool-icon" @click="goPre">
        <previous-chapter />
      </button>
      <button v-if="isCompactReader" type="button" class="tool-icon" @click="toggleSidebarDrawer">
        目录
      </button>
      <button type="button" class="tool-icon" @click="goNext">
        <next-chapter />
      </button>
      <button type="button" class="tool-icon" @click="toggleLayout">
        <double-column-icon v-if="layout === 'paginated'" />
        <one-column-icon v-else />
      </button>
      <button
        type="button"
        class="tool-icon bookmark-toggle"
        :class="{ active: isCurrentLocationBookmarked }"
        @click="toggleCurrentBookmark"
      >
        书签
      </button>
      <button
        ref="readerControlsToggle"
        type="button"
        class="tool-icon"
        @click="toggleReaderControls"
      >
        <a-icon />
      </button>
      <button
        type="button"
        class="tool-icon"
        :disabled="isAssistantLoading"
        title="阅读助手"
        @click="openAssistant"
      >
        <thought-icon />
      </button>
      <button
        v-if="isPomodoroEnabled"
        type="button"
        class="tool-icon pomodoro-toggle"
        :class="{ active: isPomodoroRunning }"
        title="阅读番茄钟"
        @click="togglePomodoroPanel"
      >
        {{ pomodoroShortLabel }}
      </button>
    </div>

    <annotation-toolbar
      :visible="annotationVisible"
      :x="positionX"
      :y="positionY"
      @highlight="highlightText"
      @copy="copyText"
      @note="addNote"
      @search="handleSearch"
    />
    <annotation-popup
      :visible="isNoteEditorVisible"
      :draft="noteDraft"
      :excerpt="noteExcerpt"
      :rendered-html="notePreviewHtml"
      @update:draft="noteDraft = $event"
      @cancel="cancelNoteEditor"
      @save="saveNote"
    />

    <n-modal
      :show="isAssistantVisible"
      preset="card"
      class="assistant-modal"
      :mask-closable="!isAssistantLoading"
      :closable="false"
      @update:show="value => { if (!value) closeAssistant(); }"
    >
      <section class="assistant-panel">
        <header class="assistant-header">
          <div>
            <p class="assistant-eyebrow">Reading Assistant</p>
            <h2>{{ bookInfo.title || '阅读助手' }}</h2>
          </div>
          <div class="assistant-header-actions">
            <n-select
              v-model:value="selectedReadingSkillId"
              class="assistant-skill-select"
              :options="readingSkillOptions"
              :disabled="isAssistantLoading"
              placeholder="选择读书 Skill"
            />
            <n-button
              class="assistant-close"
              secondary
              :disabled="isAssistantLoading"
              @click="closeAssistant"
            >
              关闭
            </n-button>
          </div>
        </header>

        <div class="assistant-messages">
          <div v-if="assistantMessages.length === 0" class="assistant-empty">
            <button type="button" @click="sendAssistantPrompt('为本章节生成总结')">
              为本章节生成总结
            </button>
            <button type="button" @click="sendAssistantPrompt('为第二章生成总结')">
              为第二章生成总结
            </button>
            <button type="button" @click="sendAssistantPrompt('提炼本章节的核心观点和金句')">
              提炼本章节的核心观点和金句
            </button>
          </div>

          <article
            v-for="message in assistantMessages"
            :key="message.id"
            class="assistant-message"
            :class="message.role"
          >
            <div class="assistant-message-role">
              {{ message.role === 'user' ? '你' : '助手' }}
            </div>
            <div class="assistant-message-content markdown-preview" v-html="message.html"></div>
            <div v-if="message.meta" class="assistant-message-meta">
              {{ message.meta.sectionTitle }}<span v-if="message.meta.truncated">，基于前 {{ message.meta.maxChars }} 字</span>
            </div>
            <div v-if="message.role === 'assistant'" class="assistant-message-actions">
              <n-button
                size="small"
                secondary
                :disabled="message.noteSaved"
                @click="saveAssistantMessageAsNote(message.id)"
              >
                {{ message.noteSaved ? '已保存为笔记' : '保存为笔记' }}
              </n-button>
            </div>
          </article>

          <div v-if="isAssistantLoading" class="assistant-loading">
            <n-spin size="small" />
            <span>正在读取章节并请求模型...</span>
          </div>
          <div v-if="assistantError" class="assistant-error">
            {{ assistantError }}
          </div>
        </div>

        <div class="assistant-composer">
          <n-input
            v-model:value="assistantDraft"
            type="textarea"
            class="assistant-input"
            :autosize="{ minRows: 2, maxRows: 5 }"
            placeholder="例如：为本章节生成总结 / 为第二章生成总结 / 提炼本章节的核心观点"
            :disabled="isAssistantLoading"
            @keydown="handleAssistantKeydown"
          />
          <n-button
            type="primary"
            class="assistant-send"
            :loading="isAssistantLoading"
            :disabled="!assistantDraft.trim() || isAssistantLoading"
            @click="sendAssistantPrompt()"
          >
            发送
          </n-button>
        </div>
      </section>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue';
import { NButton, NInput, NModal, NSelect, NSpin } from 'naive-ui';
import AIcon from "@/assets/svg/AIcon.vue";
import DoubleColumnIcon from "@/assets/svg/DoubleColumnIcon.vue";
import NextChapter from "@/assets/svg/NextChapter.vue";
import OneColumnIcon from "@/assets/svg/OneColumnIcon.vue";
import PreviousChapter from "@/assets/svg/PreviousChapter.vue";
import ThoughtIcon from "@/assets/svg/ThoughtIcon.vue";
import AnnotationPopup from "@/components/AnnotationPopup.vue";
import AnnotationToolbar from "@/components/AnnotationToolbar.vue";
import EpubToc from "@/components/EpubToc.vue";
import { useReaderSession } from '@/features/reader/useReaderSession.js';
import { navigateBack } from '@/services/navigationService.js';

const props = defineProps({
  bookUrl: {
    type: String,
    required: true
  },
});

const viewer = ref(null);
const readerControlsPanel = ref(null);
const readerControlsToggle = ref(null);
const activeSidebarTab = ref('menu');
const isSidebarDrawerOpen = ref(false);
const {
  bookInfo,
  bookDetail,
  coverImg,
  layout,
  isCompactViewport,
  sidebarWidth,
  leftPageNumber,
  rightPageNumber,
  totalPages,
  showPageNumbers,
  visiblePageSlots,
  tocPageMap,
  showReaderControls,
  isAssistantVisible,
  isAssistantLoading,
  assistantDraft,
  assistantMessages,
  assistantError,
  readingSkills,
  selectedReadingSkillId,
  isPomodoroEnabled,
  isPomodoroPanelVisible,
  isPomodoroRunning,
  pomodoroMode,
  pomodoroRemainingSeconds,
  pomodoroConfig,
  readerFontSize,
  readerLineHeight,
  annotationVisible,
  positionX,
  positionY,
  startResize,
  goPre,
  goNext,
  toggleLayout,
  toggleReaderControls,
  openAssistant,
  closeAssistant,
  sendAssistantPrompt,
  saveAssistantMessageAsNote,
  togglePomodoroPanel,
  startPomodoro,
  pausePomodoro,
  resetPomodoro,
  switchPomodoroMode,
  updateReaderFontSize,
  updateReaderLineHeight,
  resetReaderTypographySettings,
  handleNavigate,
  activeTocHref,
  noteEntries,
  bookmarkEntries,
  isCurrentLocationBookmarked,
  highlightText,
  copyText,
  addNote,
  saveNote,
  cancelNoteEditor,
  isNoteEditorVisible,
  noteDraft,
  noteExcerpt,
  notePreviewHtml,
  handleSearch,
  goToAnnotation,
  toggleCurrentBookmark,
  deleteBookmark,
  goToBookmark,
} = useReaderSession(toRef(props, 'bookUrl'), viewer);

const isCompactReader = computed(() => isCompactViewport.value);
const sidebarPanelStyle = computed(() => (
  isCompactReader.value ? undefined : { width: `${sidebarWidth.value}px` }
));
const readingSkillOptions = computed(() => readingSkills.value.map(skill => ({
  label: skill.name,
  value: skill.id,
})));
const pomodoroTimeLabel = computed(() => {
  const totalSeconds = Math.max(0, Number(pomodoroRemainingSeconds.value) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});
const pomodoroShortLabel = computed(() => {
  const totalSeconds = Math.max(0, Number(pomodoroRemainingSeconds.value) || 0);
  if (totalSeconds >= 3600) {
    return `${Math.ceil(totalSeconds / 60)}m`;
  }

  return pomodoroTimeLabel.value;
});

function toggleSidebarDrawer() {
  if (!isCompactReader.value) {
    return;
  }

  isSidebarDrawerOpen.value = !isSidebarDrawerOpen.value;
}

function closeSidebarDrawer() {
  isSidebarDrawerOpen.value = false;
}

function handleNavigateAndClose(href) {
  handleNavigate(href);
  if (isCompactReader.value) {
    closeSidebarDrawer();
  }
}

function goToAnnotationAndClose(value) {
  goToAnnotation(value);
  if (isCompactReader.value) {
    closeSidebarDrawer();
  }
}

function goToBookmarkAndClose(value) {
  goToBookmark(value);
  if (isCompactReader.value) {
    closeSidebarDrawer();
  }
}

function goBack() {
  navigateBack();
}

function closeReaderControlsOnOutsidePointer(event) {
  if (!showReaderControls.value) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (readerControlsPanel.value?.contains(target) || readerControlsToggle.value?.contains(target)) {
    return;
  }

  showReaderControls.value = false;
}

function handleAssistantKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    sendAssistantPrompt();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', closeReaderControlsOnOutsidePointer);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', closeReaderControlsOnOutsidePointer);
});
</script>

<style>
.book-container {
  width: 100%;
  height: calc(var(--app-safe-vh, 100vh) - var(--app-top-offset, 0px));
  display: flex;
  background: var(--surface-app);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

.book-container.compact-reader {
  flex-direction: column;
}

.reader-overlay {
  position: absolute;
  inset: 0;
  z-index: 14;
  border: none;
  background: rgba(25, 32, 43, 0.24);
}

.compact-reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--reader-divider);
  background: color-mix(in srgb, var(--surface-elevated) 94%, transparent);
  backdrop-filter: blur(12px);
  z-index: 12;
}

.compact-reader-title {
  flex: 1;
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-header-button {
  min-width: 52px;
  height: 36px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--surface-panel);
  color: var(--text-primary);
}

.resizer {
  position: relative;
  width: 1px;
  cursor: col-resize;
  background-color: transparent;
  flex-shrink: 0;
  touch-action: none;
}

.resizer::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 12px;
  transform: translateX(-50%);
}

.resizer:hover::after,
.resizer:active::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background-color: var(--accent);
}

.content-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  position: relative;
  background-color: var(--surface-app);
}

.reader-controls-panel {
  position: absolute;
  left: 18px;
  top: 18px;
  z-index: 16;
  width: 220px;
  padding: 16px 16px 14px;
  border-radius: 18px;
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
}

.reader-controls-panel.compact {
  left: 50%;
  top: auto;
  bottom: 88px;
  width: min(320px, calc(100% - 24px));
  transform: translateX(-50%);
}

.reader-controls-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.reader-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-secondary);
}

.reader-control + .reader-control {
  margin-top: 14px;
}

.reader-control span {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.reader-control strong {
  font-size: 0.82rem;
  color: var(--text-primary);
}

.reader-control input[type="range"] {
  width: 100%;
}

.reader-controls-reset {
  margin-top: 16px;
  width: 100%;
  height: 34px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--surface-panel);
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.reader-controls-reset:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.left_area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-reader-sidebar);
  border-right: 1px solid var(--reader-divider);
  height: 100%;
  min-height: 0;
}

.left_area.compact {
  position: absolute;
  inset: 56px auto 0 0;
  width: min(360px, calc(100% - 56px));
  z-index: 15;
  transform: translateX(-100%);
  transition: transform 0.24s ease;
  box-shadow: var(--shadow-md);
}

.left_area.compact.open {
  transform: translateX(0);
}

.epub-view iframe {
  width: 100%;
  height: 100%;
  border: none;
  padding-bottom: 10px !important;
}

.sidebar-panel-content {
  flex: 1;
  min-height: 0;
}

.toc-container,
.notes-container,
.bookmarks-container {
  width: 100%;
  background: transparent;
  height: 100%;
  overflow-y: auto;
  padding: 0 12px 18px;
}

.toc-container {
  padding-bottom: 0;
}

.toc-container ul {
  list-style: none;
  padding: 0;
}

.toc-container li {
  padding: 5px 0;
  cursor: pointer;
}

.toc-container li:hover {
  color: var(--primary-color);
}

.notes-container,
.bookmarks-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-card {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: var(--surface-panel);
  color: var(--text-primary);
  text-align: left;
  padding: 12px 14px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.note-card :where(div, span) {
  cursor: inherit;
}

.note-card:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.note-card-index {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.note-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.note-card-type {
  flex-shrink: 0;
  font-size: 0.72rem;
  line-height: 1;
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.note-card-text {
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--text-primary);
  word-break: break-word;
}

.note-card-note {
  margin-top: 8px;
  font-size: 0.83rem;
  line-height: 1.5;
  color: var(--text-secondary);
  word-break: break-word;
}

.note-card-meta {
  font-size: 0.83rem;
  color: var(--text-secondary);
}

.sidebar-empty-state {
  margin-top: 8px;
  padding: 18px 14px;
  border: 1px dashed var(--border-subtle);
  border-radius: 14px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-panel) 82%, transparent);
  text-align: center;
}

.sidebar-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 12px;
  border-top: 1px solid var(--reader-divider);
  margin: 0 12px 0;
}

.sidebar-tab {
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  font-size: 0.84rem;
}

.sidebar-tab:hover {
  background: color-mix(in srgb, var(--surface-hover) 92%, transparent);
}

.sidebar-tab.active {
  background: var(--surface-elevated);
  color: var(--accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, var(--border-subtle));
}

.book-detail {
  width: 100%;
  min-height: 124px;
  padding: 18px 18px 10px;
  align-items: center;
  gap: 15px;
}

.cover {
  width: 100%;
  min-height: 92px;
  gap: 15px;
  align-items: center;
  min-width: 0;
}

#cover-image {
  width: 72px;
  border-radius: 5px;
  object-fit: cover;
  aspect-ratio: 9/13;
  box-shadow: var(--shadow-sm);
}

.text-detail {
  width: 58%;
  min-width: 0;
}

.title {
  display: block;
  width: 100%;
  min-width: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.read-panel {
  flex: 1;
  overflow: auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  background: var(--surface-reader);
}

.hr-wrap {
  padding: 0 18px 12px;
}

hr {
  border: none;
  border-top: 1px solid var(--reader-divider);
  margin: 0;
  width: 100%;
  height: 1px;
}

.toolbar {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  padding: 10px 0;
  gap: 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-elevated) 84%, transparent);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.toolbar.compact {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: max(12px, env(safe-area-inset-bottom, 0px));
  top: auto;
  transform: none;
  width: auto;
  flex-direction: row;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 22px;
}

.tool-icon {
  appearance: none;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background-color: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 50%;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.tool-icon svg {
  width: 46%;
  color: inherit;
}

.toolbar.compact .tool-icon {
  border-radius: 14px;
  width: 44px;
}

.bookmark-toggle {
  width: 44px;
  height: 44px;
  padding: 0;
  font-size: 0.68rem;
  line-height: 1;
}

.pomodoro-toggle {
  padding: 0;
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tool-icon:hover {
  color: var(--accent);
  border-color: var(--border-strong);
  box-shadow: var(--reader-toolbar-shadow);
}

.tool-icon:disabled {
  cursor: wait;
  opacity: 0.62;
}

.tool-icon.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-soft) 72%, var(--surface-elevated));
}

.bookmark-card {
  position: relative;
}

.bookmark-delete {
  margin-top: 10px;
  width: 100%;
  height: 30px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--surface-elevated);
  color: var(--text-secondary);
  cursor: pointer;
}

.bookmark-link {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--text-primary);
  cursor: pointer;
}

.bookmark-link:hover {
  color: var(--accent);
}

.bookmark-delete:hover {
  color: var(--accent);
  border-color: var(--border-strong);
}

.page-number {
  position: absolute;
  bottom: 12px;
  font-size: 12px;
  color: var(--reader-page-number);
  pointer-events: none;
  z-index: 9;
}

.page-number.left {
  left: 16px;
}

.page-number.right {
  right: 16px;
}

.page-number.compact {
  left: 50%;
  bottom: 72px;
  transform: translateX(-50%);
}

.pomodoro-panel {
  position: absolute;
  right: 86px;
  top: 50%;
  z-index: 17;
  width: 260px;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-elevated) 94%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
  transform: translateY(-50%);
}

.pomodoro-panel.compact {
  left: 50%;
  right: auto;
  top: auto;
  bottom: 88px;
  width: min(320px, calc(100% - 24px));
  transform: translateX(-50%);
}

.pomodoro-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pomodoro-eyebrow {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pomodoro-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.pomodoro-close {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.pomodoro-time {
  margin: 18px 0 14px;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  font-size: 2.2rem;
  font-weight: 700;
  text-align: center;
}

.pomodoro-mode-switch,
.pomodoro-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pomodoro-mode-switch button,
.pomodoro-actions button {
  min-height: 34px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--surface-panel);
  color: var(--text-primary);
  cursor: pointer;
}

.pomodoro-mode-switch button.active {
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border-subtle));
  background: var(--accent-soft);
  color: var(--accent);
}

.pomodoro-actions {
  margin-top: 10px;
}

.pomodoro-done {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.5;
}

.assistant-modal {
  width: min(860px, 82vw);
}

.assistant-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: min(720px, 78vh);
  color: var(--text-primary);
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.assistant-eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.assistant-header h2 {
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.2;
}

.assistant-close {
  flex-shrink: 0;
}

.assistant-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.assistant-skill-select {
  width: min(260px, 34vw);
}

.assistant-messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px dashed var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-panel) 82%, transparent);
}

.assistant-empty {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.assistant-empty button {
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--surface-elevated);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  line-height: 1.35;
}

.assistant-empty button:hover {
  color: var(--accent);
  border-color: var(--border-strong);
}

.assistant-message {
  width: min(100%, 720px);
  padding: 12px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: var(--surface-panel);
}

.assistant-message.user {
  align-self: flex-end;
  background: color-mix(in srgb, var(--accent-soft) 52%, var(--surface-panel));
}

.assistant-message.assistant {
  align-self: flex-start;
  background: var(--surface-elevated);
}

.assistant-message-role {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.assistant-message-content {
  color: var(--text-primary);
}

.assistant-message-meta {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.assistant-message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.assistant-loading,
.assistant-error {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.assistant-error {
  color: #c05a5a;
}

.assistant-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.assistant-input :deep(.n-input-wrapper) {
  border-radius: 14px;
}

.assistant-send {
  min-width: 76px;
  min-height: 42px;
}

.markdown-preview * {
  max-width: 100%;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4 {
  margin: 0 0 14px;
  line-height: 1.25;
  color: var(--text-primary);
}

.markdown-preview p,
.markdown-preview ul,
.markdown-preview ol,
.markdown-preview blockquote,
.markdown-preview pre {
  margin: 0 0 14px;
  line-height: 1.75;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 22px;
}

.markdown-preview blockquote {
  padding: 12px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  background: var(--surface-elevated);
  color: var(--text-secondary);
}

.markdown-preview code {
  padding: 0.15em 0.38em;
  border-radius: 8px;
  background: var(--surface-panel-muted);
  font-size: 0.92em;
}

.markdown-preview pre {
  padding: 14px 16px;
  border-radius: 14px;
  background: #1e2430;
  color: #f6f8fb;
  overflow: auto;
}

.markdown-preview pre code {
  padding: 0;
  background: transparent;
  color: inherit;
}

.markdown-preview a {
  color: var(--accent);
  text-decoration: none;
}

.markdown-preview a:hover {
  text-decoration: underline;
}

@media (max-width: 767px) {
  .book-detail {
    min-height: 100px;
  }

  .text-detail {
    width: auto;
  }

  .toolbar.compact {
    gap: 8px;
  }

  .assistant-modal {
    width: min(96vw, 860px);
  }

  .assistant-header {
    flex-direction: column;
  }

  .assistant-header-actions {
    width: 100%;
    align-items: stretch;
  }

  .assistant-skill-select {
    flex: 1;
    width: auto;
  }

  .assistant-empty,
  .assistant-composer {
    grid-template-columns: 1fr;
  }
}
</style>
