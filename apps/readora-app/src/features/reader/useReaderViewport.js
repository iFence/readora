import { ref, watch } from 'vue';
import {
  applyReaderStyles,
  createFoliateView,
  destroyFoliateView,
  ensureFoliateLoaded,
  getPageMetrics,
  openFoliateBook,
} from '@/features/reader/foliate/foliateAdapter.js';
import { useViewport } from '@/composables/useViewport.js';

const paginationIndexCache = new Map();

export function useReaderViewport({ foliateView, currentLocation }) {
  const { isPhone, isCompactShell, viewportWidth, viewportHeight } = useViewport();
  const layout = ref(isPhone.value ? 'scrolled' : 'paginated');
  const sidebarWidth = ref(250);
  const isResizing = ref(false);
  const leftPageNumber = ref(null);
  const rightPageNumber = ref(null);
  const totalPages = ref(null);
  const showPageNumbers = ref(false);
  const visiblePageSlots = ref(2);
  const tocPageMap = ref({});
  let activeResizePointerId = null;
  let resizeHandleElement = null;
  let paginationIndex = null;
  let paginationBuildId = 0;
  let lastPaginationBuildOptions = null;
  let layoutRefreshTimer = null;
  let lastTocPageMapFlushAt = 0;

  function getCurrentSectionPageCount(view = foliateView.value) {
    const pageCount = view?.renderer?.pages;
    return Number.isFinite(pageCount) ? Math.max(1, pageCount - 2) : null;
  }

  function getCurrentSectionLeftPage(view = foliateView.value, slotCount = visiblePageSlots.value) {
    const spreadIndex = view?.renderer?.page;
    if (!Number.isFinite(spreadIndex) || spreadIndex < 1) {
      return null;
    }

    const slots = Number.isFinite(slotCount) && slotCount > 1 ? slotCount : 1;
    return ((spreadIndex - 1) * slots) + 1;
  }

  function getVisiblePageSlots(view = foliateView.value) {
    const slots = view?.renderer?.heads?.length;
    return Number.isFinite(slots) && slots > 0 ? slots : 2;
  }

  function syncVisiblePageSlots() {
    visiblePageSlots.value = getVisiblePageSlots();
  }

  function clearPaginationIndex() {
    paginationIndex = null;
    tocPageMap.value = {};
    paginationBuildId += 1;
  }

  function getViewportDimensions(view = foliateView.value) {
    const rect = view?.getBoundingClientRect?.() ?? null;
    return {
      width: Math.max(1, Math.round(rect?.width || view?.parentElement?.clientWidth || 1200)),
      height: Math.max(1, Math.round(rect?.height || view?.parentElement?.clientHeight || 800)),
    };
  }

  function createPaginationCacheKey({ bookUrl, readerStyleOptions, width, height, layoutMode }) {
    const style = readerStyleOptions || {};
    return JSON.stringify({
      bookUrl,
      width,
      height,
      layoutMode,
      forceTextColor: Boolean(style.forceTextColor),
      fontSize: style.fontSize ?? null,
      lineHeight: style.lineHeight ?? null,
    });
  }

  function applyPaginationIndexCacheEntry(cacheEntry) {
    paginationIndex = cacheEntry
      ? {
          total: cacheEntry.total,
          sectionStarts: [...cacheEntry.sectionStarts],
          sectionCounts: [...cacheEntry.sectionCounts],
          slotCount: cacheEntry.slotCount,
        }
      : null;
    tocPageMap.value = cacheEntry ? { ...cacheEntry.tocPageMap } : {};
  }

  function waitForLayout() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  function flushTocPageMap(nextTocPageMap, { buildId, force = false } = {}) {
    if (buildId !== paginationBuildId) {
      return;
    }

    const now = performance.now();
    if (!force && now - lastTocPageMapFlushAt < 120) {
      return;
    }

    lastTocPageMapFlushAt = now;
    tocPageMap.value = { ...nextTocPageMap };
  }

  function hasTocAnchor(book, href) {
    if (!href) {
      return false;
    }

    if (typeof book?.splitTOCHref === 'function') {
      const parts = book.splitTOCHref(href);
      return Array.isArray(parts) && parts.length > 1 && parts[1] != null && parts[1] !== '';
    }

    const [, anchor] = href.split('#');
    return anchor != null && anchor !== '';
  }

  async function buildPaginationIndex({ bookUrl, readerStyleOptions } = {}) {
    const view = foliateView.value;
    if (!bookUrl || !view || layout.value !== 'paginated') {
      clearPaginationIndex();
      return;
    }

    lastPaginationBuildOptions = { bookUrl, readerStyleOptions };
    syncVisiblePageSlots();
    const buildId = ++paginationBuildId;
    const { width, height } = getViewportDimensions(view);
    const cacheKey = createPaginationCacheKey({
      bookUrl,
      readerStyleOptions,
      width,
      height,
      layoutMode: layout.value,
    });
    const cachedEntry = paginationIndexCache.get(cacheKey);
    if (cachedEntry) {
      applyPaginationIndexCacheEntry(cachedEntry);
      return;
    }

    paginationIndex = null;
    tocPageMap.value = {};
    lastTocPageMapFlushAt = 0;

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, {
      position: 'fixed',
      left: '-20000px',
      top: '0',
      width: `${width}px`,
      height: `${height}px`,
      overflow: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
    });

    const hiddenView = createFoliateView();
    host.appendChild(hiddenView);
    document.body.appendChild(host);

    try {
      await ensureFoliateLoaded();
      const book = await openFoliateBook(hiddenView, bookUrl);
      applyReaderStyles(hiddenView, readerStyleOptions);
      hiddenView.renderer.setAttribute('flow', 'paginated');

      const sectionStarts = [];
      const sectionCounts = [];
      let total = 0;
      const flatToc = [];
      const flattenToc = items => {
        for (const item of items ?? []) {
          flatToc.push(item);
          flattenToc(item.subitems);
        }
      };
      flattenToc(book.toc ?? []);

      const tocSectionStarts = new Map();
      const anchoredTocHrefs = [];
      const nextTocPageMap = {};

      for (const item of flatToc) {
        if (!item?.href) {
          continue;
        }

        let resolvedTarget = null;
        try {
          resolvedTarget = await Promise.resolve(book.resolveHref?.(item.href));
        } catch (error) {
          console.warn(`Failed to resolve TOC target for ${item.href}`, error);
        }

        if (resolvedTarget?.index == null) {
          continue;
        }

        if (hasTocAnchor(book, item.href)) {
          anchoredTocHrefs.push(item.href);
          continue;
        }

        const sectionHrefList = tocSectionStarts.get(resolvedTarget.index) ?? [];
        sectionHrefList.push(item.href);
        tocSectionStarts.set(resolvedTarget.index, sectionHrefList);
      }

      for (let index = 0; index < book.sections.length; index += 1) {
        const section = book.sections[index];
        sectionStarts[index] = total;
        const sectionStartPage = Math.max(1, total + 1);
        const sectionHrefList = tocSectionStarts.get(index) ?? [];
        for (const href of sectionHrefList) {
          nextTocPageMap[href] = sectionStartPage;
        }
        flushTocPageMap(nextTocPageMap, { buildId });

        if (section?.linear === 'no') {
          sectionCounts[index] = 0;
          continue;
        }

        await hiddenView.goTo(index);
        await waitForLayout();

        const pageCount = getCurrentSectionPageCount(hiddenView) ?? 1;
        sectionCounts[index] = pageCount;
        total += pageCount;
      }

      const hiddenSlotCount = getVisiblePageSlots(hiddenView);
      for (const href of anchoredTocHrefs) {
        if (nextTocPageMap[href] != null) {
          continue;
        }

        try {
          await hiddenView.goTo(href);
          await waitForLayout();

          const sectionIndex = hiddenView.renderer?.getContents?.()?.[0]?.index;
          const localPage = getCurrentSectionLeftPage(hiddenView, hiddenSlotCount);
          const sectionStart = sectionIndex != null ? sectionStarts[sectionIndex] : null;

          if (sectionStart != null && localPage != null) {
            nextTocPageMap[href] = Math.max(1, sectionStart + localPage);
            flushTocPageMap(nextTocPageMap, { buildId });
          }
        } catch (error) {
          console.warn(`Failed to resolve TOC page for ${href}`, error);
        }
      }

      if (buildId !== paginationBuildId) {
        return;
      }

      const nextPaginationIndex = {
        total,
        sectionStarts,
        sectionCounts,
        slotCount: hiddenSlotCount,
      };
      paginationIndexCache.set(cacheKey, {
        ...nextPaginationIndex,
        tocPageMap: nextTocPageMap,
      });
      applyPaginationIndexCacheEntry({
        ...nextPaginationIndex,
        tocPageMap: nextTocPageMap,
      });
      flushTocPageMap(nextTocPageMap, { buildId, force: true });
    } finally {
      destroyFoliateView(hiddenView);
      host.remove();
    }
  }

  function updatePageNumbers(detail) {
    syncVisiblePageSlots();
    const { current, total } = getPageMetrics(foliateView.value, detail);
    if (current == null) {
      return;
    }

    const sectionIndex = detail?.section?.current ?? null;
    const localPage = getCurrentSectionLeftPage();
    const indexedSectionStart = sectionIndex != null ? paginationIndex?.sectionStarts?.[sectionIndex] : null;
    const indexedSectionCount = sectionIndex != null ? paginationIndex?.sectionCounts?.[sectionIndex] : null;
    const currentSectionCount = getCurrentSectionPageCount();
    const canUseIndex = indexedSectionStart != null
      && indexedSectionCount != null
      && localPage != null
      && indexedSectionCount === currentSectionCount
      && paginationIndex?.slotCount === visiblePageSlots.value;

    totalPages.value = canUseIndex
      ? paginationIndex.total
      : (total ?? null);

    leftPageNumber.value = canUseIndex
      ? Math.max(1, indexedSectionStart + localPage)
      : Math.max(1, current);

    if (visiblePageSlots.value > 1) {
      const candidate = leftPageNumber.value + 1;
      rightPageNumber.value = totalPages.value != null
        ? (candidate <= totalPages.value ? candidate : null)
        : candidate;
    } else {
      rightPageNumber.value = null;
    }
  }

  function clearPageNumbers() {
    showPageNumbers.value = false;
    leftPageNumber.value = null;
    rightPageNumber.value = null;
    totalPages.value = null;
    clearPaginationIndex();
  }

  function showPaginatedPageNumbers() {
    showPageNumbers.value = true;
    syncVisiblePageSlots();
    const count = foliateView.value?.renderer?.pages != null
      ? Math.max(0, foliateView.value.renderer.pages - 2)
      : (foliateView.value?.renderer?.pageCount ?? foliateView.value?.pageCount ?? null);
    updatePageNumbers(currentLocation.value ?? {
      location: { current: 0, next: 1, total: count },
      fraction: count ? 1 / count : 0,
    });
  }

  function syncPageNumberVisibility() {
    if (layout.value === 'paginated') {
      showPaginatedPageNumbers();
      return;
    }

    clearPageNumbers();
  }

  function startResize(event) {
    if (isCompactShell.value) {
      return;
    }

    if (event?.button != null && event.button !== 0) {
      return;
    }

    event?.preventDefault?.();
    isResizing.value = true;
    activeResizePointerId = event?.pointerId ?? null;
    resizeHandleElement = event?.currentTarget ?? null;
    resizeHandleElement?.setPointerCapture?.(activeResizePointerId);
    document.addEventListener('pointermove', resize);
    document.addEventListener('pointerup', stopResize);
    document.addEventListener('pointercancel', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function resize(event) {
    if (!isResizing.value || (activeResizePointerId != null && event.pointerId !== activeResizePointerId)) {
      return;
    }

    const newWidth = event.clientX;
    if (newWidth > 150 && newWidth < 600) {
      sidebarWidth.value = newWidth;
    }
  }

  function stopResize() {
    resizeHandleElement?.releasePointerCapture?.(activeResizePointerId);
    resizeHandleElement = null;
    activeResizePointerId = null;
    isResizing.value = false;
    document.removeEventListener('pointermove', resize);
    document.removeEventListener('pointerup', stopResize);
    document.removeEventListener('pointercancel', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (layout.value === 'paginated' && lastPaginationBuildOptions?.bookUrl) {
      void buildPaginationIndex(lastPaginationBuildOptions).then(() => {
        syncPageNumberVisibility();
      });
    }
  }

  function scheduleLayoutRefresh() {
    if (layout.value !== 'paginated' || !lastPaginationBuildOptions?.bookUrl) {
      return;
    }

    window.clearTimeout(layoutRefreshTimer);
    layoutRefreshTimer = window.setTimeout(() => {
      void buildPaginationIndex(lastPaginationBuildOptions).then(() => {
        syncPageNumberVisibility();
      });
    }, 180);
  }

  function goPre() {
    foliateView.value?.goLeft();
    if (layout.value === 'paginated') {
      requestAnimationFrame(() => updatePageNumbers(currentLocation.value || {}));
    }
  }

  function goNext() {
    foliateView.value?.goRight();
    if (layout.value === 'paginated') {
      requestAnimationFrame(() => updatePageNumbers(currentLocation.value || {}));
    }
  }

  function toggleLayout() {
    layout.value = layout.value === 'paginated' ? 'scrolled' : 'paginated';
    foliateView.value?.renderer?.setAttribute('flow', layout.value);
    if (layout.value === 'paginated' && lastPaginationBuildOptions?.bookUrl) {
      void buildPaginationIndex(lastPaginationBuildOptions).then(() => {
        syncPageNumberVisibility();
      });
      return;
    }

    if (layout.value !== 'paginated') {
      clearPaginationIndex();
    }
    syncPageNumberVisibility();
  }

  function handleKeydown(event) {
    const key = event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault?.();
      event.stopPropagation?.();
    }

    if (key === 'ArrowLeft') {
      goPre();
    } else if (key === 'ArrowRight') {
      goNext();
    }
  }

  watch(isPhone, nextIsPhone => {
    if (!nextIsPhone || layout.value === 'scrolled') {
      return;
    }

    layout.value = 'scrolled';
    foliateView.value?.renderer?.setAttribute('flow', 'scrolled');
    syncPageNumberVisibility();
  }, { immediate: true });

  watch([viewportWidth, viewportHeight], () => {
    scheduleLayoutRefresh();
  });

  return {
    layout,
    sidebarWidth,
    leftPageNumber,
    rightPageNumber,
    totalPages,
    showPageNumbers,
    visiblePageSlots,
    tocPageMap,
    isCompactViewport: isCompactShell,
    isPhone,
    updatePageNumbers,
    clearPageNumbers,
    syncPageNumberVisibility,
    buildPaginationIndex,
    startResize,
    stopResize,
    goPre,
    goNext,
    toggleLayout,
    handleKeydown,
  };
}
