import {
  bindTitlebarActions,
  getStartupFilePath,
  isEpubFilePath,
  listenForBookDrop,
  listenForOpenFile,
} from '@/platform/tauri/windowBridge.js';
import { openFileDialog } from '@/platform/tauri/dialogBridge.js';
import { navigateToReaderByFilePath } from '@/services/navigationService.js';
import { supportsFilePicker, supportsWindowLifecycle } from '@/platform/tauri/capabilities.js';

export async function navigateToBook(filePath) {
  if (!isEpubFilePath(filePath)) {
    return;
  }

  await navigateToReaderByFilePath(filePath);
}

export async function initializeWindowLifecycle() {
  if (!supportsWindowLifecycle()) {
    return;
  }

  bindTitlebarActions();

  await listenForBookDrop(filePath => {
    navigateToBook(filePath).catch(() => {});
  });

  await listenForOpenFile(filePath => {
    navigateToBook(filePath).catch(() => {});
  });

  const startupFilePath = await getStartupFilePath();
  if (startupFilePath) {
    await navigateToBook(startupFilePath);
  }
}

export async function pickBookFile() {
  if (!supportsFilePicker()) {
    return null;
  }

  const file = await openFileDialog({
    multiple: false,
    directory: false,
    filters: [{ name: 'EPUB', extensions: ['epub'] }],
  });

  return isEpubFilePath(file) ? file : null;
}

export async function pickAndOpenBook() {
  const file = await pickBookFile();
  if (file) {
    await navigateToBook(file);
  }
}
