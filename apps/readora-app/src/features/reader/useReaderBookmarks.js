import { computed, ref } from 'vue';

import { bookmarkRepository } from '@/services/bookmarkRepository.js';

export function useReaderBookmarks({ bookDetail, currentLocation, foliateView }) {
  const bookmarks = ref([]);

  function getBookId() {
    return bookDetail.value?.metadata?.identifier || null;
  }

  function reset() {
    bookmarks.value = [];
  }

  async function loadSaved() {
    const bookId = getBookId();
    if (!bookId) {
      bookmarks.value = [];
      return;
    }

    bookmarks.value = await bookmarkRepository.getBookmarks(bookId);
  }

  const currentBookmarkId = computed(() => {
    const currentCfi = currentLocation.value?.cfi;
    if (!currentCfi) {
      return null;
    }

    return bookmarks.value.find(bookmark => bookmark.value === currentCfi)?.id || null;
  });

  const isCurrentLocationBookmarked = computed(() => Boolean(currentBookmarkId.value));

  const bookmarkEntries = computed(() =>
    [...bookmarks.value].sort((left, right) => {
      const leftIndex = Number.isFinite(left.index) ? left.index : Number.MAX_SAFE_INTEGER;
      const rightIndex = Number.isFinite(right.index) ? right.index : Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    }),
  );

  async function toggleCurrentBookmark() {
    const bookId = getBookId();
    const currentCfi = currentLocation.value?.cfi;
    if (!bookId || !currentCfi) {
      return;
    }

    const existingBookmarkId = currentBookmarkId.value;
    if (existingBookmarkId) {
      await bookmarkRepository.deleteBookmark(existingBookmarkId);
      bookmarks.value = bookmarks.value.filter(bookmark => bookmark.id !== existingBookmarkId);
      return;
    }

    const savedBookmark = await bookmarkRepository.upsertBookmark({
      bookId,
      index: Number.isFinite(currentLocation.value?.index) ? currentLocation.value.index : null,
      value: currentCfi,
      label: currentLocation.value?.tocItem?.label || '当前位置',
    });

    bookmarks.value = bookmarks.value.filter(bookmark => bookmark.id !== savedBookmark.id);
    bookmarks.value.push(savedBookmark);
  }

  async function deleteBookmark(bookmarkId) {
    if (!bookmarkId) {
      return;
    }

    await bookmarkRepository.deleteBookmark(bookmarkId);
    bookmarks.value = bookmarks.value.filter(bookmark => bookmark.id !== bookmarkId);
  }

  async function goToBookmark(bookmarkValue) {
    if (!bookmarkValue || !foliateView.value) {
      return;
    }

    await foliateView.value.goTo(bookmarkValue);
  }

  return {
    loadSaved,
    reset,
    bookmarkEntries,
    isCurrentLocationBookmarked,
    toggleCurrentBookmark,
    deleteBookmark,
    goToBookmark,
  };
}
