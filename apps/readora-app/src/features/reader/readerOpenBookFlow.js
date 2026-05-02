import {
  applyReaderStyles,
  openFoliateBook,
} from '@/features/reader/foliate/foliateAdapter.js';

export async function openReaderBookFlow({
  bookUrl,
  initialLocation = null,
  initialSectionIndex = null,
  view,
  readerBook,
  annotations,
  bookmarks,
  viewport,
  readerStyleOptions,
}) {
  readerBook.setBookDetail(await openFoliateBook(view, bookUrl));
  await annotations.loadSaved();
  await bookmarks.loadSaved();
  await readerBook.saveBookRecord();
  applyReaderStyles(view, readerStyleOptions);
  await view.init({
    lastLocation: initialLocation || readerBook.readProgress.value?.cfi || null,
    showTextStart: true,
  });
  if (!initialLocation && Number.isFinite(initialSectionIndex)) {
    await view.goTo(initialSectionIndex);
  }
  void viewport.buildPaginationIndex({
    bookUrl,
    readerStyleOptions,
  }).then(() => {
    viewport.syncPageNumberVisibility();
  });
  viewport.syncPageNumberVisibility();
}
