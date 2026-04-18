import {
  applyReaderStyles,
  openFoliateBook,
} from '@/features/reader/foliate/foliateAdapter.js';

export async function openReaderBookFlow({
  bookUrl,
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
    lastLocation: readerBook.readProgress.value?.cfi ?? null,
    showTextStart: true,
  });
  await viewport.buildPaginationIndex({
    bookUrl,
    readerStyleOptions,
  });
  viewport.syncPageNumberVisibility();
}
