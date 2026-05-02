/**
 * @typedef {Object} ReadingProgress
 * @property {string=} cfi
 * @property {number=} fraction
 * @property {{ current?: number, total?: number }=} page
 * @property {{ href?: string, label?: string }=} tocItem
 */

/**
 * @typedef {Object} BookRecord
 * @property {string=} identifier
 * @property {string=} bookUrl
 * @property {string=} sourcePath
 * @property {string=} title
 * @property {string=} author
 * @property {string=} cover
 * @property {number=} openTime
 * @property {number=} totalReadingTimeMs
 * @property {ReadingProgress=} progress
 */

/**
 * @typedef {Object} AnnotationRecord
 * @property {number} index
 * @property {string} value
 * @property {string=} color
 * @property {string=} style
 * @property {string=} text
 * @property {string=} note
 */

/**
 * @typedef {Object} BookmarkRecord
 * @property {string=} id
 * @property {string=} bookId
 * @property {number=} index
 * @property {string} value
 * @property {string=} label
 */

/**
 * @typedef {Object} WebDavConfig
 * @property {string} url
 * @property {string} username
 * @property {string} password
 */

export function getBookKey(book) {
  return book?.identifier || book?.bookUrl || book?.title || null;
}

export function getAnnotationStorageKey(bookId) {
  return `annotations-${bookId}`;
}

export function normalizeReadingProgress(progress) {
  if (!progress || typeof progress !== 'object') {
    return null;
  }

  const normalized = {
    cfi: progress.cfi || null,
    fraction: Number.isFinite(progress.fraction) ? progress.fraction : null,
    page: progress.page && typeof progress.page === 'object'
      ? {
          current: Number.isFinite(progress.page.current) ? progress.page.current : null,
          total: Number.isFinite(progress.page.total) ? progress.page.total : null,
        }
      : null,
    tocItem: progress.tocItem && typeof progress.tocItem === 'object'
      ? {
          href: progress.tocItem.href || null,
          label: progress.tocItem.label || null,
        }
      : null,
  };

  if (!normalized.cfi && normalized.fraction == null && !normalized.page && !normalized.tocItem) {
    return null;
  }

  if (normalized.page && normalized.page.current == null && normalized.page.total == null) {
    normalized.page = null;
  }

  if (normalized.tocItem && !normalized.tocItem.href && !normalized.tocItem.label) {
    normalized.tocItem = null;
  }

  return normalized;
}

export function normalizeBookRecord(book = {}) {
  return {
    identifier: book.identifier || null,
    bookUrl: book.bookUrl || null,
    sourcePath: book.sourcePath || null,
    title: book.title || null,
    author: book.author || null,
    cover: book.cover || null,
    openTime: Number.isFinite(book.openTime) ? book.openTime : Date.now(),
    totalReadingTimeMs: Number.isFinite(book.totalReadingTimeMs) ? book.totalReadingTimeMs : 0,
    progress: normalizeReadingProgress(book.progress),
  };
}

export function normalizeAnnotationRecord(annotation = {}) {
  return {
    index: Number.isFinite(annotation.index) ? annotation.index : 0,
    value: annotation.value || '',
    color: annotation.color || null,
    style: annotation.style || null,
    text: annotation.text || '',
    note: annotation.note || '',
  };
}

export function normalizeBookmarkRecord(bookmark = {}) {
  return {
    id: bookmark.id || null,
    bookId: bookmark.bookId || null,
    index: Number.isFinite(bookmark.index) ? bookmark.index : null,
    value: bookmark.value || '',
    label: bookmark.label || '',
  };
}
