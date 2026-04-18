import { sendHttpRequest } from '@/platform/tauri/httpBridge.js';

const SYNC_DIRECTORY_NAME = 'readora';
const SYNC_FILE_NAME = 'readora_books.json';
const SYNC_SNAPSHOT_FILE_NAME = 'readora_data_v1.json';
const SYNC_CHANGES_DIRECTORY_NAME = 'changes';
const SYNC_CHANGE_INDEX_FILE_NAME = 'readora_changes_index_v1.json';
const MAX_REMOTE_CHANGE_FILES = 20;

class WebDavClient {
  constructor(config) {
    this.config = config || null;

    if (!this.config?.url) {
      throw new Error('WebDAV not configured');
    }
  }

  getHeaders() {
    const auth = btoa(`${this.config.username}:${this.config.password}`);
    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  getBaseUrl() {
    return this.config.url.replace(/\/+$/, '');
  }

  getLegacyBooksFileUrl() {
    return `${this.getBaseUrl()}/${SYNC_FILE_NAME}`;
  }

  getSyncDirectoryUrl() {
    return `${this.getBaseUrl()}/${SYNC_DIRECTORY_NAME}`;
  }

  getBooksFileUrl() {
    return `${this.getSyncDirectoryUrl()}/${SYNC_FILE_NAME}`;
  }

  getSnapshotFileUrl() {
    return `${this.getSyncDirectoryUrl()}/${SYNC_SNAPSHOT_FILE_NAME}`;
  }

  getChangesDirectoryUrl() {
    return `${this.getSyncDirectoryUrl()}/${SYNC_CHANGES_DIRECTORY_NAME}`;
  }

  getChangeIndexFileUrl() {
    return `${this.getSyncDirectoryUrl()}/${SYNC_CHANGE_INDEX_FILE_NAME}`;
  }

  getChangeFileUrl(fileName) {
    return `${this.getChangesDirectoryUrl()}/${fileName}`;
  }

  async ensureDirectory(directoryUrl) {
    const headers = {
      ...this.getHeaders(),
      Depth: '0',
    };

    const probeResponse = await sendHttpRequest(directoryUrl, {
      method: 'PROPFIND',
      headers,
    });

    if (probeResponse.ok || probeResponse.status === 207) {
      return directoryUrl;
    }

    if (probeResponse.status !== 404) {
      throw new Error(`Failed to access sync directory: ${probeResponse.status} ${probeResponse.statusText}`);
    }

    const createResponse = await sendHttpRequest(directoryUrl, {
      method: 'MKCOL',
      headers: this.getHeaders(),
    });

    if (![200, 201, 204, 301, 405].includes(createResponse.status)) {
      throw new Error(`Failed to create sync directory: ${createResponse.status} ${createResponse.statusText}`);
    }

    return directoryUrl;
  }

  async ensureSyncDirectory() {
    return this.ensureDirectory(this.getSyncDirectoryUrl());
  }

  async testConnection(config) {
    if (config) {
      this.config = config;
    }

    const response = await sendHttpRequest(this.config.url, {
      method: 'PROPFIND',
      headers: {
        ...this.getHeaders(),
        Depth: '0',
      },
    });

    return response.ok || response.status === 207;
  }

  async downloadBooks() {
    const fileUrls = [
      this.getBooksFileUrl(),
      this.getLegacyBooksFileUrl(),
    ];

    for (const fileUrl of fileUrls) {
      const response = await sendHttpRequest(fileUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return response.json();
      }

      if (response.status !== 404) {
        throw new Error(`Failed to download books: ${response.status} ${response.statusText}`);
      }
    }

    return [];
  }

  async uploadBooks(books) {
    await this.ensureSyncDirectory();
    const fileUrl = this.getBooksFileUrl();
    const response = await sendHttpRequest(fileUrl, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(books),
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`Failed to upload books: ${response.status} ${response.statusText}`);
    }
  }

  async downloadSnapshot() {
    const snapshotResponse = await sendHttpRequest(this.getSnapshotFileUrl(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (snapshotResponse.ok) {
      return snapshotResponse.json();
    }

    if (snapshotResponse.status !== 404) {
      throw new Error(`Failed to download sync snapshot: ${snapshotResponse.status} ${snapshotResponse.statusText}`);
    }

    const legacyBooks = await this.downloadBooks();
    return {
      version: 1,
      exportedAt: Date.now(),
      books: legacyBooks.map(book => ({
        bookId: book.identifier || book.bookUrl || book.title,
        identifier: book.identifier || null,
        bookUrl: book.bookUrl || null,
        title: book.title || null,
        author: book.author || null,
        cover: book.cover || null,
        openTime: book.openTime || Date.now(),
        isArchived: false,
        updatedAt: book.openTime || Date.now(),
        deletedAt: null,
      })).filter(book => book.bookId),
      readingProgress: legacyBooks
        .filter(book => (book.identifier || book.bookUrl || book.title) && book.progress)
        .map(book => ({
          bookId: book.identifier || book.bookUrl || book.title,
          progress: book.progress,
          updatedAt: book.openTime || Date.now(),
          deletedAt: null,
        })),
      annotations: [],
      bookmarks: [],
    };
  }

  async snapshotExists() {
    const response = await sendHttpRequest(this.getSnapshotFileUrl(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (response.ok) {
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    throw new Error(`Failed to probe sync snapshot: ${response.status} ${response.statusText}`);
  }

  async uploadSnapshot(snapshot) {
    await this.ensureSyncDirectory();
    const response = await sendHttpRequest(this.getSnapshotFileUrl(), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(snapshot),
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`Failed to upload sync snapshot: ${response.status} ${response.statusText}`);
    }
  }

  async downloadChangeIndex() {
    const response = await sendHttpRequest(this.getChangeIndexFileUrl(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (response.ok) {
      const payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    }

    if (response.status === 404) {
      return null;
    }

    throw new Error(`Failed to download sync change index: ${response.status} ${response.statusText}`);
  }

  async uploadChangeIndex(index) {
    await this.ensureSyncDirectory();
    const response = await sendHttpRequest(this.getChangeIndexFileUrl(), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(index),
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`Failed to upload sync change index: ${response.status} ${response.statusText}`);
    }
  }

  async downloadChangesSince(since) {
    const index = await this.downloadChangeIndex();
    if (!index) {
      return null;
    }

    const relevantEntries = index
      .filter(entry => Number.isFinite(entry?.exportedAt) && entry.exportedAt > since && entry?.name)
      .sort((left, right) => left.exportedAt - right.exportedAt);

    const changes = [];
    for (const entry of relevantEntries) {
      const response = await sendHttpRequest(this.getChangeFileUrl(entry.name), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        changes.push(await response.json());
        continue;
      }

      if (response.status !== 404) {
        throw new Error(`Failed to download sync change file: ${response.status} ${response.statusText}`);
      }
    }

    return changes;
  }

  async uploadChangeSet(changeSet) {
    await this.ensureSyncDirectory();
    await this.ensureDirectory(this.getChangesDirectoryUrl());

    const fileName = `change-${changeSet.exportedAt}.json`;
    const response = await sendHttpRequest(this.getChangeFileUrl(fileName), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(changeSet),
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`Failed to upload sync change set: ${response.status} ${response.statusText}`);
    }

    const currentIndex = (await this.downloadChangeIndex()) || [];
    const nextIndex = currentIndex
      .filter(entry => entry?.name !== fileName)
      .concat([{ name: fileName, exportedAt: changeSet.exportedAt }])
      .sort((left, right) => left.exportedAt - right.exportedAt);

    await this.uploadChangeIndex(nextIndex);
    return nextIndex;
  }

  async resetChangeIndex() {
    await this.uploadChangeIndex([]);
  }

  shouldCompactChanges(index) {
    return Array.isArray(index) && index.length >= MAX_REMOTE_CHANGE_FILES;
  }
}

export { WebDavClient };
