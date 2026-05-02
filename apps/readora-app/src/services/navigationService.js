import router from '@/router/index.js';
import { createReaderRoute } from '@/platform/tauri/windowBridge.js';

function isCurrentRoute(targetRoute) {
  const currentRoute = router.currentRoute.value;
  return (
    currentRoute.path === targetRoute.path &&
    currentRoute.query.bookUrl === targetRoute.query.bookUrl &&
    (currentRoute.query.sourcePath || '') === (targetRoute.query.sourcePath || '') &&
    (currentRoute.query.location || '') === (targetRoute.query.location || '') &&
    String(currentRoute.query.sectionIndex || '') === String(targetRoute.query.sectionIndex || '')
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
  return navigateToReaderAtUrl(bookUrl);
}

export async function navigateToReaderAtUrl(bookUrl, options = {}) {
  if (!bookUrl) {
    return;
  }

  const targetRoute = {
    path: '/reader',
    query: {
      bookUrl,
      ...(options.sourcePath ? { sourcePath: options.sourcePath } : {}),
      ...(options.location ? { location: options.location } : {}),
      ...(Number.isFinite(options.sectionIndex) ? { sectionIndex: String(options.sectionIndex) } : {}),
    },
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

export async function navigateToNotes() {
  await router.push('/note');
}

export function navigateBack() {
  router.back();
}
