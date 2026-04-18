import { getBookKey, normalizeAnnotationRecord, normalizeBookRecord } from '@/entities/models.js';
import {
  replaceAnnotations,
  saveBookRecord as saveBookRecordData,
} from '@/platform/tauri/dataBridge.js';
import { getStoreValue, setStoreValue, storeKeys } from '@/services/localStore.js';
import { settingsRepository } from '@/services/settingsRepository.js';

const DATA_MIGRATION_VERSION = 1;

let migrationPromise = null;

async function migrateLegacyData() {
  const currentVersion = await settingsRepository.getDataMigrationVersion();
  if ((currentVersion || 0) >= DATA_MIGRATION_VERSION) {
    return;
  }

  const [legacyLatestBooks, legacyBooksMap] = await Promise.all([
    getStoreValue(storeKeys.latestBookList),
    getStoreValue(storeKeys.books),
  ]);

  const mergedBooks = new Map();
  for (const book of Object.values(legacyBooksMap || {})) {
    const key = getBookKey(book);
    if (key) {
      mergedBooks.set(key, normalizeBookRecord(book));
    }
  }

  for (const book of legacyLatestBooks || []) {
    const key = getBookKey(book);
    if (key) {
      mergedBooks.set(key, normalizeBookRecord(book));
    }
  }

  for (const book of mergedBooks.values()) {
    await saveBookRecordData(book);

    const bookId = book.identifier || book.bookUrl || book.title;
    if (!bookId) {
      continue;
    }

    const legacyAnnotations = await getStoreValue(`annotations-${bookId}`) || [];
    if (legacyAnnotations.length > 0) {
      await replaceAnnotations(bookId, legacyAnnotations.map(normalizeAnnotationRecord));
      await setStoreValue(`annotations-${bookId}`, []);
    }
  }

  await Promise.all([
    setStoreValue(storeKeys.latestBookList, []),
    setStoreValue(storeKeys.books, {}),
    settingsRepository.setDataMigrationVersion(DATA_MIGRATION_VERSION),
  ]);
}

export async function ensureDataMigrated() {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyData();
  }

  await migrationPromise;
}
