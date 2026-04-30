import { appStore } from '@/platform/store/appStore.js';

export const storeKeys = {
  latestBookList: 'latestBookList',
  books: 'ALL_BOOKS',
  currentTheme: 'currentTheme',
  currentAccentColor: 'currentAccentColor',
  forceReaderTextColor: 'forceReaderTextColor',
  readerFontSize: 'readerFontSize',
  readerLineHeight: 'readerLineHeight',
  currentLanguage: 'currentLanguage',
  webdav: 'webdav_settings',
  shortcuts: 'shortcut_bindings',
  dataMigrationVersion: 'data_migration_version',
  syncStatus: 'sync_status',
  plugins: 'plugins',
};

export async function getStoreValue(key) {
  return appStore.getItem(key);
}

export async function setStoreValue(key, value) {
  await appStore.setItem(key, value);
  return true;
}
