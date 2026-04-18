import { normalizeBookmarkRecord } from '@/entities/models.js';
import {
  deleteBookmark as deleteBookmarkData,
  getBookmarks as getBookmarksData,
  upsertBookmark as upsertBookmarkData,
} from '@/platform/tauri/dataBridge.js';

class BookmarkRepository {
  async getBookmarks(bookId) {
    if (!bookId) {
      return [];
    }

    return getBookmarksData(bookId);
  }

  async upsertBookmark(bookmark) {
    return upsertBookmarkData(normalizeBookmarkRecord(bookmark));
  }

  async deleteBookmark(bookmarkId) {
    if (!bookmarkId) {
      return;
    }

    await deleteBookmarkData(bookmarkId);
  }
}

export const bookmarkRepository = new BookmarkRepository();
