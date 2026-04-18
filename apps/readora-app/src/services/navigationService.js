import router from '@/router/index.js';
import { createReaderRoute } from '@/platform/tauri/windowBridge.js';

function isCurrentRoute(targetRoute) {
  const currentRoute = router.currentRoute.value;
  return (
    currentRoute.path === targetRoute.path &&
    currentRoute.query.bookUrl === targetRoute.query.bookUrl
  );
}

export async function navigateToReaderByFilePath(filePath) {
  const targetRoute = createReaderRoute(filePath);
  if (!targetRoute) {
    return;
  }

  if (isCurrentRoute(targetRoute)) {
    return;
  }

  await router.push(targetRoute);
}

export async function navigateToReaderByUrl(bookUrl) {
  if (!bookUrl) {
    return;
  }

  const targetRoute = {
    path: '/reader',
    query: { bookUrl },
  };

  if (isCurrentRoute(targetRoute)) {
    return;
  }

  await router.push(targetRoute);
}

export async function navigateToBookshelf() {
  await router.push('/bookshelf');
}

export async function navigateToSettings() {
  await router.push('/settings');
}

export function navigateBack() {
  router.back();
}
