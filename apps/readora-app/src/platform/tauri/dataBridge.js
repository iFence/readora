import { invoke } from '@tauri-apps/api/core';

export function listLatestBooks(limit) {
  return invoke('get_latest_books', { limit });
}

export function getBookById(bookId) {
  return invoke('get_book_by_id', { bookId });
}

export function saveBookRecord(book) {
  return invoke('save_book_record', { book });
}

export function saveReadingProgress(bookId, progress) {
  return invoke('save_reading_progress', { bookId, progress });
}

export function clearBookshelf() {
  return invoke('clear_bookshelf');
}

export function getAnnotations(bookId) {
  return invoke('get_annotations', { bookId });
}

export function replaceAnnotations(bookId, annotations) {
  return invoke('replace_annotations', { bookId, annotations });
}

export function upsertAnnotation(bookId, annotation) {
  return invoke('upsert_annotation', { bookId, annotation });
}

export function deleteAnnotation(bookId, annotationValue) {
  return invoke('delete_annotation', { bookId, annotationValue });
}

export function getBookmarks(bookId) {
  return invoke('get_bookmarks', { bookId });
}

export function upsertBookmark(bookmark) {
  return invoke('upsert_bookmark', { bookmark });
}

export function deleteBookmark(bookmarkId) {
  return invoke('delete_bookmark', { bookmarkId });
}

export function exportSyncSnapshot(since = null) {
  return invoke('export_sync_snapshot', { since });
}

export function importSyncSnapshot(snapshot) {
  return invoke('import_sync_snapshot', { snapshot });
}

export function getLastSyncAt() {
  return invoke('get_last_sync_at');
}

export function setLastSyncAt(timestamp) {
  return invoke('set_last_sync_at', { timestamp });
}
