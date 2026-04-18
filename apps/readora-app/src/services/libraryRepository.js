import { getBookKey, normalizeBookRecord, normalizeReadingProgress } from '@/entities/models.js';
import {
  clearBookshelf as clearBookshelfData,
  getBookById as getBookByIdData,
  listLatestBooks,
  saveBookRecord as saveBookRecordData,
  saveReadingProgress as saveReadingProgressData,
} from '@/platform/tauri/dataBridge.js';
import {
  getStoreValue,
  storeKeys,
} from '@/services/localStore.js';
import { ensureDataMigrated } from '@/services/dataMigrationService.js';

class LibraryRepository {
  async getLatestBooks(limit) {
    await ensureDataMigrated();
    const books = await listLatestBooks(typeof limit === 'number' ? limit : null);
    if (typeof limit === 'number') {
      return books.slice(0, limit);
    }
    return books;
  }

  async replaceLatestBooks(books) {
    await clearBookshelfData();

    for (const book of books) {
      await saveBookRecordData(normalizeBookRecord(book));
    }

    return this.getLatestBooks();
  }

  clearLatestBooks() {
    return clearBookshelfData();
  }

  async getAllBooks() {
    await ensureDataMigrated();
    const books = await this.getLatestBooks();
    return Object.fromEntries(books.map(book => [getBookKey(book), book]).filter(([key]) => key));
  }

  async getBookById(identifier) {
    await ensureDataMigrated();
    const book = await getBookByIdData(identifier);
    if (book) {
      return book;
    }

    const legacyBooks = await getStoreValue(storeKeys.books) || {};
    const legacyBook = legacyBooks[identifier] || null;
    if (!legacyBook) {
      return null;
    }

    const normalizedBook = normalizeBookRecord(legacyBook);
    await saveBookRecordData(normalizedBook);
    return normalizedBook;
  }

  async cacheLatestBook(book) {
    const savedBook = await saveBookRecordData(normalizeBookRecord(book));
    return this.getLatestBooks().then(books => {
      const key = getBookKey(savedBook);
      const orderedBooks = books.filter(item => getBookKey(item) !== key);
      orderedBooks.unshift(savedBook);
      return orderedBooks.slice(0, 100);
    });
  }

  async cacheBook(book) {
    return saveBookRecordData(normalizeBookRecord(book));
  }

  async saveBookRecord(book) {
    await ensureDataMigrated();
    return saveBookRecordData(normalizeBookRecord(book));
  }

  async saveReadingProgress(bookId, progress) {
    await ensureDataMigrated();
    const normalizedProgress = normalizeReadingProgress(progress);
    if (!bookId || !normalizedProgress) {
      return;
    }

    await saveReadingProgressData(bookId, normalizedProgress);
  }
}

export const libraryRepository = new LibraryRepository();
