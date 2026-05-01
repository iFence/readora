import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useReaderBookState } from '@/features/reader/useReaderBookState.js';
import { useReaderSelection } from '@/features/reader/useReaderSelection.js';
import { useReaderAnnotations } from '@/features/reader/useReaderAnnotations.js';
import { useReaderBookmarks } from '@/features/reader/useReaderBookmarks.js';
import { useReaderViewport } from '@/features/reader/useReaderViewport.js';
import { createReaderViewController } from '@/features/reader/readerViewController.js';
import { resolveReaderAssistantContext } from '@/features/reader/readerSummaryContent.js';
import { useThemeService } from '@/services/themeService.js';
import { useReaderSettingsService } from '@/services/readerSettingsService.js';
import { libraryRepository } from '@/services/libraryRepository.js';
import { applyReaderStyles } from '@/features/reader/foliate/foliateAdapter.js';
import { askBookAssistant } from '@/services/llmSummaryService.js';
import { renderMarkdownToHtml } from '@/services/markdownRenderer.js';
import {
  getAiSettings,
  isReaderAssistantPluginEnabled,
} from '@/services/aiSettingsService.js';
import {
  isPomodoroPluginEnabled,
  loadPomodoroConfig,
} from '@/services/pomodoroPluginService.js';

export function useReaderSession(bookUrlRef, viewerRef) {
  const foliateView = ref(null);
  const currentLocation = ref(null);
  const { currentTheme } = useThemeService();
  const {
    forceReaderTextColor,
    readerFontSize,
    readerLineHeight,
    initializeReaderSettings,
    setReaderFontSize,
    setReaderLineHeight,
    resetReaderTypography,
  } = useReaderSettingsService();
  const selection = useReaderSelection();
  const readerBook = useReaderBookState(bookUrlRef);
  const viewport = useReaderViewport({ foliateView, currentLocation });
  const annotations = useReaderAnnotations({ foliateView, bookDetail: readerBook.bookDetail, selection });
  const bookmarks = useReaderBookmarks({ bookDetail: readerBook.bookDetail, currentLocation, foliateView });
  const showReaderControls = ref(false);
  const isAssistantVisible = ref(false);
  const isAssistantLoading = ref(false);
  const assistantDraft = ref('');
  const assistantMessages = ref([]);
  const assistantError = ref('');
  const readingSkills = ref([]);
  const selectedReadingSkillId = ref('');
  const isPomodoroEnabled = ref(false);
  const isPomodoroPanelVisible = ref(false);
  const isPomodoroRunning = ref(false);
  const pomodoroMode = ref('focus');
  const pomodoroRemainingSeconds = ref(25 * 60);
  const pomodoroConfig = ref({
    focusMinutes: 25,
    breakMinutes: 5,
  });
  let readingSessionStartedAt = 0;
  let readingDurationFlushTimer = null;
  let pomodoroTimer = null;
  const viewController = createReaderViewController({
    foliateView,
    currentLocation,
    viewerRef,
    selection,
    viewport,
    annotations,
    bookmarks,
    readerBook,
    getReaderStyleOptions: () => ({
      forceTextColor: forceReaderTextColor.value,
      fontSize: readerFontSize.value,
      lineHeight: readerLineHeight.value,
    }),
  });

  function handleNavigate(href) {
    foliateView.value?.goTo(href);
  }

  const activeTocHref = computed(() =>
    currentLocation.value?.tocItem?.href
    || readerBook.readProgress.value?.tocItem?.href
    || null);

  function cleanup() {
    void flushReadingDuration();
    stopReadingDurationFlushLoop();
    stopPomodoroTimer();
    viewController.cleanup();
    viewport.stopResize();
    annotations.reset();
    selection.hideAnnotationToolbar();
    window.removeEventListener('keydown', viewport.handleKeydown);
    window.removeEventListener('pagehide', handlePageHide);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  function markReadingSessionStart() {
    readingSessionStartedAt = Date.now();
  }

  function startReadingDurationFlushLoop() {
    stopReadingDurationFlushLoop();
    readingDurationFlushTimer = window.setInterval(() => {
      void flushReadingDuration({ restartSession: true });
    }, 30_000);
  }

  function stopReadingDurationFlushLoop() {
    if (readingDurationFlushTimer == null) {
      return;
    }

    window.clearInterval(readingDurationFlushTimer);
    readingDurationFlushTimer = null;
  }

  function getPomodoroDurationSeconds(mode = pomodoroMode.value) {
    const minutes = mode === 'break'
      ? pomodoroConfig.value.breakMinutes
      : pomodoroConfig.value.focusMinutes;
    return Math.max(1, Number(minutes) || 1) * 60;
  }

  function stopPomodoroTimer() {
    if (pomodoroTimer == null) {
      return;
    }

    window.clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }

  function startPomodoroTimer() {
    stopPomodoroTimer();
    pomodoroTimer = window.setInterval(() => {
      if (pomodoroRemainingSeconds.value <= 1) {
        pomodoroRemainingSeconds.value = 0;
        isPomodoroRunning.value = false;
        stopPomodoroTimer();
        isPomodoroPanelVisible.value = true;
        return;
      }

      pomodoroRemainingSeconds.value -= 1;
    }, 1000);
  }

  async function refreshPomodoroPlugin() {
    isPomodoroEnabled.value = await isPomodoroPluginEnabled();
    if (!isPomodoroEnabled.value) {
      isPomodoroPanelVisible.value = false;
      isPomodoroRunning.value = false;
      stopPomodoroTimer();
      return;
    }

    const previousFocusSeconds = pomodoroConfig.value.focusMinutes * 60;
    pomodoroConfig.value = await loadPomodoroConfig();
    if (pomodoroRemainingSeconds.value <= 0 || pomodoroRemainingSeconds.value === previousFocusSeconds) {
      pomodoroRemainingSeconds.value = getPomodoroDurationSeconds(pomodoroMode.value);
    }
  }

  function togglePomodoroPanel() {
    isPomodoroPanelVisible.value = !isPomodoroPanelVisible.value;
    void refreshPomodoroPlugin();
  }

  function startPomodoro() {
    if (!isPomodoroEnabled.value) {
      return;
    }

    if (pomodoroRemainingSeconds.value <= 0) {
      pomodoroRemainingSeconds.value = getPomodoroDurationSeconds(pomodoroMode.value);
    }

    isPomodoroRunning.value = true;
    startPomodoroTimer();
  }

  function pausePomodoro() {
    isPomodoroRunning.value = false;
    stopPomodoroTimer();
  }

  function resetPomodoro(mode = pomodoroMode.value) {
    pomodoroMode.value = mode;
    isPomodoroRunning.value = false;
    stopPomodoroTimer();
    pomodoroRemainingSeconds.value = getPomodoroDurationSeconds(mode);
  }

  function switchPomodoroMode(mode) {
    resetPomodoro(mode);
  }

  async function flushReadingDuration({ restartSession = false } = {}) {
    if (!readingSessionStartedAt || !readerBook.bookInfo.value?.identifier) {
      readingSessionStartedAt = 0;
      return;
    }

    const elapsedMs = Date.now() - readingSessionStartedAt;
    readingSessionStartedAt = 0;
    if (elapsedMs < 1000) {
      return;
    }

    const currentTotal = Number.isFinite(readerBook.bookInfo.value.totalReadingTimeMs)
      ? readerBook.bookInfo.value.totalReadingTimeMs
      : 0;

    const nextBookRecord = {
      ...readerBook.bookInfo.value,
      progress: readerBook.readProgress.value,
      totalReadingTimeMs: currentTotal + elapsedMs,
      openTime: Date.now(),
    };

    readerBook.bookInfo.value = nextBookRecord;
    await libraryRepository.saveBookRecord(nextBookRecord);

    if (restartSession) {
      markReadingSessionStart();
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      void flushReadingDuration({ restartSession: true });
    }
  }

  function handlePageHide() {
    void flushReadingDuration();
  }

  function toggleReaderControls() {
    showReaderControls.value = !showReaderControls.value;
  }

  async function refreshReadingSkills() {
    if (!await isReaderAssistantPluginEnabled()) {
      readingSkills.value = [];
      selectedReadingSkillId.value = '';
      assistantError.value = '请先在插件设置中安装并启用 AI 阅读助手插件。';
      return;
    }

    const settings = await getAiSettings();
    readingSkills.value = settings.readingSkills.filter(skill => skill.enabled);
    selectedReadingSkillId.value = readingSkills.value.some(skill => skill.id === selectedReadingSkillId.value)
      ? selectedReadingSkillId.value
      : settings.activeReadingSkillId;
  }

  function openAssistant() {
    isAssistantVisible.value = true;
    void refreshReadingSkills().catch(error => {
      assistantError.value = error?.message || '读取读书 Skill 失败。';
    });
  }

  function closeAssistant() {
    if (isAssistantLoading.value) {
      return;
    }

    isAssistantVisible.value = false;
  }

  async function sendAssistantPrompt(prompt = assistantDraft.value) {
    if (!readerBook.bookDetail.value) {
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    isAssistantVisible.value = true;
    isAssistantLoading.value = true;
    assistantError.value = '';
    assistantDraft.value = '';
    assistantMessages.value = [
      ...assistantMessages.value,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmedPrompt,
        html: renderMarkdownToHtml(trimmedPrompt),
      },
    ];

    try {
      const context = await resolveReaderAssistantContext({
        book: readerBook.bookDetail.value,
        currentLocation: currentLocation.value,
        prompt: trimmedPrompt,
      });
      const response = await askBookAssistant({
        title: readerBook.bookInfo.value?.title,
        author: readerBook.bookInfo.value?.author,
        content: context.content,
        prompt: trimmedPrompt,
        contextLabel: `${context.sectionTitle} (${context.truncated ? `前 ${context.maxChars} 字` : '完整章节'})`,
        skillId: selectedReadingSkillId.value,
      });
      assistantMessages.value = [
        ...assistantMessages.value,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response,
          prompt: trimmedPrompt,
          html: renderMarkdownToHtml(response),
          meta: {
            sectionTitle: context.sectionTitle,
            sectionIndex: context.sectionIndex,
            truncated: context.truncated,
            maxChars: context.maxChars,
          },
        },
      ];
    } catch (error) {
      assistantError.value = error?.message || '阅读助手请求失败。';
    } finally {
      isAssistantLoading.value = false;
    }
  }

  async function saveAssistantMessageAsNote(messageId) {
    const message = assistantMessages.value.find(item => item.id === messageId);
    if (!message || message.role !== 'assistant') {
      return;
    }

    try {
      await annotations.saveAiNote({
        content: message.text,
        prompt: message.prompt,
        sectionIndex: message.meta?.sectionIndex,
        sectionTitle: message.meta?.sectionTitle,
      });
      assistantMessages.value = assistantMessages.value.map(item => (
        item.id === messageId
          ? { ...item, noteSaved: true }
          : item
      ));
      assistantError.value = '';
    } catch (error) {
      assistantError.value = error?.message || '保存 AI 总结为笔记失败。';
    }
  }

  async function applyReaderLayoutSettings() {
    if (!foliateView.value) {
      return;
    }

    applyReaderStyles(foliateView.value, {
      forceTextColor: forceReaderTextColor.value,
      fontSize: readerFontSize.value,
      lineHeight: readerLineHeight.value,
    });
    void viewport.buildPaginationIndex({
      bookUrl: bookUrlRef.value,
      readerStyleOptions: {
        forceTextColor: forceReaderTextColor.value,
        fontSize: readerFontSize.value,
        lineHeight: readerLineHeight.value,
      },
    }).then(() => {
      viewport.syncPageNumberVisibility();
    });
    viewport.syncPageNumberVisibility();
  }

  async function updateReaderFontSize(value) {
    await setReaderFontSize(value);
    await applyReaderLayoutSettings();
  }

  async function updateReaderLineHeight(value) {
    await setReaderLineHeight(value);
    await applyReaderLayoutSettings();
  }

  async function resetReaderTypographySettings() {
    await resetReaderTypography();
    await applyReaderLayoutSettings();
  }

  onMounted(async () => {
    await initializeReaderSettings();
    await viewController.openBook(bookUrlRef.value);
    await refreshPomodoroPlugin();
    markReadingSessionStart();
    startReadingDurationFlushLoop();
    window.addEventListener('keydown', viewport.handleKeydown);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  watch(bookUrlRef, async newUrl => {
    if (newUrl) {
      await flushReadingDuration();
      await viewController.openBook(newUrl);
      markReadingSessionStart();
    }
  });

  watch([currentTheme, forceReaderTextColor, readerFontSize, readerLineHeight], () => {
    if (foliateView.value) {
      applyReaderStyles(foliateView.value, {
        forceTextColor: forceReaderTextColor.value,
        fontSize: readerFontSize.value,
        lineHeight: readerLineHeight.value,
      });
    }
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    bookInfo: readerBook.bookInfo,
    bookDetail: readerBook.bookDetail,
    coverImg: readerBook.coverImg,
    layout: viewport.layout,
    isCompactViewport: viewport.isCompactViewport,
    isPhone: viewport.isPhone,
    sidebarWidth: viewport.sidebarWidth,
    leftPageNumber: viewport.leftPageNumber,
    rightPageNumber: viewport.rightPageNumber,
    totalPages: viewport.totalPages,
    showPageNumbers: viewport.showPageNumbers,
    visiblePageSlots: viewport.visiblePageSlots,
    tocPageMap: viewport.tocPageMap,
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
    annotationVisible: selection.annotationVisible,
    positionX: selection.positionX,
    positionY: selection.positionY,
    startResize: viewport.startResize,
    goPre: viewport.goPre,
    goNext: viewport.goNext,
    toggleLayout: viewport.toggleLayout,
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
    noteEntries: annotations.noteEntries,
    bookmarkEntries: bookmarks.bookmarkEntries,
    isCurrentLocationBookmarked: bookmarks.isCurrentLocationBookmarked,
    highlightText: annotations.highlightText,
    copyText: annotations.copyText,
    addNote: annotations.addNote,
    saveNote: annotations.saveNote,
    saveAiNote: annotations.saveAiNote,
    cancelNoteEditor: annotations.cancelNoteEditor,
    isNoteEditorVisible: annotations.isNoteEditorVisible,
    noteDraft: annotations.noteDraft,
    noteExcerpt: annotations.noteExcerpt,
    notePreviewHtml: annotations.notePreviewHtml,
    handleSearch: annotations.handleSearch,
    goToAnnotation: annotations.goToAnnotation,
    toggleCurrentBookmark: bookmarks.toggleCurrentBookmark,
    deleteBookmark: bookmarks.deleteBookmark,
    goToBookmark: bookmarks.goToBookmark,
  };
}
