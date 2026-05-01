import { getBookKey } from '@/entities/models.js';
import { libraryRepository } from '@/services/libraryRepository.js';
import { exportSyncSnapshot, getLastSyncAt, importSyncSnapshot, setLastSyncAt } from '@/platform/tauri/dataBridge.js';
import { saveSyncStatus, loadSyncStatus } from '@/services/syncStatusService.js';
import {
  createConfiguredWebDavClient,
  isWebDavPluginEnabled,
  loadWebDavConfig,
} from '@/services/webdavService.js';

export const SYNC_COMPLETED_EVENT = 'readora:sync-completed';

let activeSyncPromise = null;

function normalizeSnapshot(snapshot = {}) {
  return {
    version: 1,
    exportedAt: Number.isFinite(snapshot.exportedAt) ? snapshot.exportedAt : Date.now(),
    books: Array.isArray(snapshot.books) ? snapshot.books : [],
    readingProgress: Array.isArray(snapshot.readingProgress) ? snapshot.readingProgress : [],
    annotations: Array.isArray(snapshot.annotations) ? snapshot.annotations : [],
    bookmarks: Array.isArray(snapshot.bookmarks) ? snapshot.bookmarks : [],
  };
}

function selectNewerRecord(left, right) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  const leftUpdatedAt = left.updatedAt || 0;
  const rightUpdatedAt = right.updatedAt || 0;
  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt > rightUpdatedAt ? left : right;
  }

  if (Boolean(left.deletedAt) !== Boolean(right.deletedAt)) {
    return left.deletedAt ? left : right;
  }

  return right;
}

function mergeRecordCollections(leftRecords, rightRecords, getId) {
  const merged = new Map();

  for (const record of leftRecords) {
    const id = getId(record);
    if (id) {
      merged.set(id, record);
    }
  }

  for (const record of rightRecords) {
    const id = getId(record);
    if (!id) {
      continue;
    }

    merged.set(id, selectNewerRecord(merged.get(id), record));
  }

  return Array.from(merged.values());
}

function mergeSnapshots(localSnapshot, remoteSnapshot) {
  const local = normalizeSnapshot(localSnapshot);
  const remote = normalizeSnapshot(remoteSnapshot);

  return {
    version: 1,
    exportedAt: Date.now(),
    books: mergeRecordCollections(local.books, remote.books, record => record.bookId),
    readingProgress: mergeRecordCollections(local.readingProgress, remote.readingProgress, record => record.bookId),
    annotations: mergeRecordCollections(local.annotations, remote.annotations, record => record.annotationId),
    bookmarks: mergeRecordCollections(local.bookmarks, remote.bookmarks, record => record.bookmarkId),
  };
}

function hasSnapshotRecords(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return normalized.books.length > 0
    || normalized.readingProgress.length > 0
    || normalized.annotations.length > 0
    || normalized.bookmarks.length > 0;
}

function countSnapshotRecords(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return normalized.books.length
    + normalized.readingProgress.length
    + normalized.annotations.length
    + normalized.bookmarks.length;
}

function classifySyncError(error) {
  const message = error?.message || String(error || '');
  if (/401|403|Authorization|auth/i.test(message)) {
    return 'auth';
  }
  if (/404|MKCOL|PROPFIND|PUT|GET|WebDAV/i.test(message)) {
    return 'remote';
  }
  if (/network|timeout|cancel|fetch/i.test(message)) {
    return 'network';
  }
  return 'unknown';
}

async function downloadRemoteUpdates(client, localLastSyncAt) {
  if (!Number.isFinite(localLastSyncAt) || localLastSyncAt <= 0) {
    const baseSnapshot = normalizeSnapshot(await client.downloadSnapshot());
    const changeSets = await client.downloadChangesSince(baseSnapshot.exportedAt) || [];
    return changeSets.reduce((merged, changeSet) => mergeSnapshots(merged, changeSet), baseSnapshot);
  }

  const incrementalChanges = await client.downloadChangesSince(localLastSyncAt);
  if (incrementalChanges) {
    return incrementalChanges.reduce(
      (merged, changeSet) => mergeSnapshots(merged, changeSet),
      normalizeSnapshot(),
    );
  }

  const baseSnapshot = normalizeSnapshot(await client.downloadSnapshot());
  const changeSets = await client.downloadChangesSince(baseSnapshot.exportedAt) || [];
  return changeSets.reduce((merged, changeSet) => mergeSnapshots(merged, changeSet), baseSnapshot);
}

export async function syncLibrary() {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = performLibrarySync();
  try {
    return await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}

export function dispatchSyncCompleted(detail) {
  window.dispatchEvent(new CustomEvent(SYNC_COMPLETED_EVENT, { detail }));
}

export function subscribeToSyncCompleted(listener) {
  const handler = event => {
    listener(event.detail);
  };
  window.addEventListener(SYNC_COMPLETED_EVENT, handler);
  return () => {
    window.removeEventListener(SYNC_COMPLETED_EVENT, handler);
  };
}

export async function canSyncLibraryAutomatically() {
  if (!await isWebDavPluginEnabled()) {
    return false;
  }

  const config = await loadWebDavConfig();
  return Boolean(config.url && config.username && config.password);
}

async function performLibrarySync() {
  const attemptedAt = Date.now();
  const previousStatus = await loadSyncStatus();
  const client = await createConfiguredWebDavClient();
  try {
    const localLastSyncAt = await getLastSyncAt();
    const localChanges = normalizeSnapshot(await exportSyncSnapshot(localLastSyncAt ?? null));
    const snapshotExists = await client.snapshotExists();

    let remoteUpdates = normalizeSnapshot();
    try {
      remoteUpdates = snapshotExists
        ? normalizeSnapshot(await downloadRemoteUpdates(client, localLastSyncAt ?? null))
        : normalizeSnapshot();
    } catch {}

    if (hasSnapshotRecords(remoteUpdates)) {
      await importSyncSnapshot(remoteUpdates);
    }

    let compacted = false;
    if (!snapshotExists) {
      await client.uploadSnapshot(normalizeSnapshot(await exportSyncSnapshot()));
      await client.resetChangeIndex();
      compacted = true;
    } else if (hasSnapshotRecords(localChanges)) {
      const nextIndex = await client.uploadChangeSet(localChanges);
      if (client.shouldCompactChanges(nextIndex)) {
        await client.uploadSnapshot(normalizeSnapshot(await exportSyncSnapshot()));
        await client.resetChangeIndex();
        compacted = true;
      }
    }

    const syncedAt = Math.max(
      Number.isFinite(localChanges.exportedAt) ? localChanges.exportedAt : 0,
      Number.isFinite(remoteUpdates.exportedAt) ? remoteUpdates.exportedAt : 0,
    );
    await setLastSyncAt(syncedAt || Date.now());

    const mergedBooks = (await libraryRepository.getLatestBooks()).filter(book => getBookKey(book));
    const status = await saveSyncStatus({
      state: 'success',
      mode: snapshotExists ? 'incremental' : 'bootstrap',
      compacted,
      initializedRemote: !snapshotExists,
      attemptedAt,
      completedAt: Date.now(),
      lastSuccessAt: Date.now(),
      localChangeCount: countSnapshotRecords(localChanges),
      remoteChangeCount: countSnapshotRecords(remoteUpdates),
      errorCategory: null,
      errorMessage: '',
    });

    const result = { books: mergedBooks, status };
    dispatchSyncCompleted({
      ok: true,
      books: mergedBooks,
      status,
    });
    return result;
  } catch (error) {
    const status = await saveSyncStatus({
      ...previousStatus,
      state: 'error',
      mode: 'failed',
      attemptedAt,
      completedAt: Date.now(),
      errorCategory: classifySyncError(error),
      errorMessage: error?.message || String(error),
    });
    dispatchSyncCompleted({
      ok: false,
      books: null,
      status,
      errorMessage: error?.message || String(error),
    });
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      syncStatus: status,
    });
  }
}
