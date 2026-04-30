import {
  getStoreValue,
  setStoreValue,
  storeKeys,
} from '@/services/localStore.js';

class SettingsRepository {
  getCurrentTheme() {
    return getStoreValue(storeKeys.currentTheme);
  }

  setCurrentTheme(themeName) {
    return setStoreValue(storeKeys.currentTheme, themeName);
  }

  getCurrentAccentColor() {
    return getStoreValue(storeKeys.currentAccentColor);
  }

  setCurrentAccentColor(color) {
    return setStoreValue(storeKeys.currentAccentColor, color);
  }

  getForceReaderTextColor() {
    return getStoreValue(storeKeys.forceReaderTextColor);
  }

  setForceReaderTextColor(enabled) {
    return setStoreValue(storeKeys.forceReaderTextColor, enabled);
  }

  getReaderFontSize() {
    return getStoreValue(storeKeys.readerFontSize);
  }

  setReaderFontSize(value) {
    return setStoreValue(storeKeys.readerFontSize, value);
  }

  getReaderLineHeight() {
    return getStoreValue(storeKeys.readerLineHeight);
  }

  setReaderLineHeight(value) {
    return setStoreValue(storeKeys.readerLineHeight, value);
  }

  getCurrentLanguage() {
    return getStoreValue(storeKeys.currentLanguage);
  }

  setCurrentLanguage(language) {
    return setStoreValue(storeKeys.currentLanguage, language);
  }

  getWebDavConfig() {
    return getStoreValue(storeKeys.webdav);
  }

  setWebDavConfig(config) {
    return setStoreValue(storeKeys.webdav, config);
  }

  getShortcutBindings() {
    return getStoreValue(storeKeys.shortcuts);
  }

  setShortcutBindings(bindings) {
    return setStoreValue(storeKeys.shortcuts, bindings);
  }

  getDataMigrationVersion() {
    return getStoreValue(storeKeys.dataMigrationVersion);
  }

  setDataMigrationVersion(version) {
    return setStoreValue(storeKeys.dataMigrationVersion, version);
  }

  getSyncStatus() {
    return getStoreValue(storeKeys.syncStatus);
  }

  setSyncStatus(status) {
    return setStoreValue(storeKeys.syncStatus, status);
  }

  getPlugins() {
    return getStoreValue(storeKeys.plugins);
  }

  setPlugins(plugins) {
    return setStoreValue(storeKeys.plugins, plugins);
  }
}

export const settingsRepository = new SettingsRepository();
