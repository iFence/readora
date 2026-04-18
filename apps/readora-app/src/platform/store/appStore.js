import { load } from '@tauri-apps/plugin-store';

class AppStore {
  constructor() {
    this.store = null;
    this.initialized = false;
    this.initializationPromise = null;
    this.keys = {
      latestBookList: 'latestBookList',
      books: 'ALL_BOOKS',
      currentTheme: 'currentTheme',
      currentAccentColor: 'currentAccentColor',
      currentLanguage: 'currentLanguage',
      webdav: 'webdav_settings',
    };
  }

  async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeStore();
    }

    await this.initializationPromise;
  }

  async initializeStore() {
    this.store = await load('settings.json', {});
    this.initialized = true;
  }

  async getItem(key) {
    await this.ensureInitialized();
    return this.store.get(key);
  }

  async setItem(key, value) {
    await this.ensureInitialized();
    await this.store.set(key, value);
    return true;
  }
}

export const appStore = new AppStore();
