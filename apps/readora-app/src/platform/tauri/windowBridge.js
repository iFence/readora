import { listen } from '@tauri-apps/api/event';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

function getAppWindow() {
  return getCurrentWindow();
}

export function isEpubFilePath(filePath) {
  return typeof filePath === 'string' && /\.epub$/i.test(filePath);
}

export function createReaderRoute(filePath) {
  if (!isEpubFilePath(filePath)) {
    return null;
  }

  return {
    path: '/reader',
    query: {
      bookUrl: convertFileSrc(filePath),
      sourcePath: filePath,
    },
  };
}

export function listenForBookDrop(callback) {
  return getAppWindow().onDragDropEvent(event => {
    if (event.payload?.type !== 'drop') {
      return;
    }

    const filePath = event.payload?.paths?.find(isEpubFilePath);
    if (filePath) {
      callback(filePath);
    }
  });
}

export function listenForOpenFile(callback) {
  return listen('open-file', event => {
    if (isEpubFilePath(event?.payload)) {
      callback(event.payload);
    }
  });
}

export async function getStartupFilePath() {
  const startupFilePath = await invoke('get_startup_file_path');
  return isEpubFilePath(startupFilePath) ? startupFilePath : null;
}

export async function showMainWindow() {
  const appWindow = getAppWindow();
  await appWindow.unminimize();
  await appWindow.show();
  await appWindow.setFocus();
}

export function hideMainWindow() {
  return getAppWindow().hide();
}

export function bindTitlebarActions() {
  document
    .getElementById('titlebar-minimize')
    ?.addEventListener('click', () => getAppWindow().minimize());

  document
    .getElementById('titlebar-maximize')
    ?.addEventListener('click', () => getAppWindow().toggleMaximize());

  document
    .getElementById('titlebar-close')
    ?.addEventListener('click', () => hideMainWindow());
}
