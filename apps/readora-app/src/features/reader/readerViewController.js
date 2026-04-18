import {
  createFoliateView,
  createOverlayer,
  destroyFoliateView,
  ensureFoliateLoaded,
  mountOverlayer,
  resetViewerContainer,
  unmountOverlayer,
} from '@/features/reader/foliate/foliateAdapter.js';
import { bindReaderViewEvents } from '@/features/reader/readerViewBindings.js';
import { openReaderBookFlow } from '@/features/reader/readerOpenBookFlow.js';

export function createReaderViewController({
  foliateView,
  currentLocation,
  viewerRef,
  selection,
  viewport,
  annotations,
  bookmarks,
  readerBook,
  getReaderStyleOptions,
}) {
  let overlayer = null;
  let cleanupViewBindings = null;

  function cleanup() {
    cleanupViewBindings?.();
    cleanupViewBindings = null;
    destroyFoliateView(foliateView.value);
    unmountOverlayer(overlayer);
    overlayer = null;
    foliateView.value = null;
  }

  function mountFreshView() {
    overlayer = createOverlayer();
    mountOverlayer(overlayer);

    const view = createFoliateView();
    foliateView.value = view;
    cleanupViewBindings = bindReaderViewEvents(view, {
      currentLocation,
      selection,
      viewport,
      annotations,
      readerBook,
    });
    resetViewerContainer(viewerRef.value);
    viewerRef.value.appendChild(view);

    return view;
  }

  async function openBook(bookUrl) {
    if (!bookUrl || !viewerRef.value) {
      return;
    }

    await ensureFoliateLoaded();

    currentLocation.value = null;
    readerBook.resetBookState();
    annotations.reset();
    bookmarks.reset();
    cleanup();

    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const view = mountFreshView();

      try {
        await openReaderBookFlow({
          bookUrl,
          view,
          readerBook,
          annotations,
          bookmarks,
          viewport,
          readerStyleOptions: getReaderStyleOptions?.(),
        });
        return;
      } catch (error) {
        lastError = error;
        cleanup();
      }
    }

    if (lastError) {
      console.error('Failed to open reader book', lastError);
      throw lastError;
    }
  }

  return {
    cleanup,
    openBook,
  };
}
