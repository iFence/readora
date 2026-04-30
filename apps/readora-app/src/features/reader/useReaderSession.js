import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useReaderBookState } from '@/features/reader/useReaderBookState.js';
import { useReaderSelection } from '@/features/reader/useReaderSelection.js';
import { useReaderAnnotations } from '@/features/reader/useReaderAnnotations.js';
import { useReaderBookmarks } from '@/features/reader/useReaderBookmarks.js';
import { useReaderViewport } from '@/features/reader/useReaderViewport.js';
import { createReaderViewController } from '@/features/reader/readerViewController.js';
import { extractBookTextForSummary } from '@/features/reader/readerSummaryContent.js';
import { useThemeService } from '@/services/themeService.js';
import { useReaderSettingsService } from '@/services/readerSettingsService.js';
import { libraryRepository } from '@/services/libraryRepository.js';
import { applyReaderStyles } from '@/features/reader/foliate/foliateAdapter.js';
import { summarizeBookContent } from '@/services/llmSummaryService.js';
import { renderMarkdownToHtml } from '@/services/markdownRenderer.js';

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
  const isSummaryVisible = ref(false);
  const isSummaryLoading = ref(false);
  const summaryHtml = ref('');
  const summaryError = ref('');
  const summaryMeta = ref(null);
  let readingSessionStartedAt = 0;
  let readingDurationFlushTimer = null;
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

  function closeSummary() {
    if (isSummaryLoading.value) {
      return;
    }

    isSummaryVisible.value = false;
  }

  async function generateBookSummary() {
    if (!readerBook.bookDetail.value) {
      return;
    }

    isSummaryVisible.value = true;
    isSummaryLoading.value = true;
    summaryError.value = '';
    summaryHtml.value = '';
    summaryMeta.value = null;

    try {
      const extracted = await extractBookTextForSummary(readerBook.bookDetail.value);
      if (!extracted.content) {
        throw new Error('No readable text was found in this book.');
      }

      summaryMeta.value = {
        includedSectionCount: extracted.includedSectionCount,
        truncated: extracted.truncated,
        maxChars: extracted.maxChars,
      };

      const summary = await summarizeBookContent({
        title: readerBook.bookInfo.value?.title,
        author: readerBook.bookInfo.value?.author,
        content: extracted.content,
      });
      summaryHtml.value = renderMarkdownToHtml(summary);
    } catch (error) {
      summaryError.value = error?.message || 'Failed to summarize this book.';
    } finally {
      isSummaryLoading.value = false;
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
    isSummaryVisible,
    isSummaryLoading,
    summaryHtml,
    summaryError,
    summaryMeta,
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
    closeSummary,
    generateBookSummary,
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
