import { message } from '@tauri-apps/plugin-dialog';

import { openExternalUrl } from '@/platform/tauri/systemBridge.js';

async function showActionError(text) {
  try {
    await message(text, { title: 'readora', kind: 'error' });
  } catch {}
}

export async function copyTextToClipboard(text) {
  if (!navigator?.clipboard?.writeText) {
    await showActionError('当前环境不支持复制。');
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    await showActionError('复制失败。');
    return false;
  }
}

export async function searchTextOnWeb(text) {
  const query = text.trim();
  if (!query) {
    return false;
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  try {
    await openExternalUrl(url);
    return true;
  } catch {
    await showActionError('打开浏览器失败。');
    return false;
  }
}
