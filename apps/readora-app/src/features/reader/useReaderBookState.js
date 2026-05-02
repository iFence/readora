import { ref } from 'vue';
import { libraryRepository } from '@/services/libraryRepository.js';
import {
  createBookRecord,
  resolveBookCoverAssets,
} from '@/features/reader/readerBookRecord.js';

export function useReaderBookState(bookUrlRef, sourcePathRef = null) {
  const bookInfo = ref({});
  const bookDetail = ref(null);
  const readProgress = ref(null);
  const coverImg = ref(null);
  let coverObjectUrl = null;

  function setBookDetail(detail) {
    bookDetail.value = detail;
  }

  function resetBookState() {
    releaseCover();
    bookDetail.value = null;
    bookInfo.value = {};
    readProgress.value = null;
  }

  async function saveBookRecord() {
    const metadata = bookDetail.value?.metadata;
    if (!metadata) {
      return;
    }

    const identifier = metadata.identifier;
    const existingBook = identifier ? await libraryRepository.getBookById(identifier) : null;
    readProgress.value = existingBook?.progress || null;

    const { coverBase64, coverBlob } = await resolveBookCoverAssets(
      bookDetail.value,
      existingBook?.cover || '',
    );

    if (coverBlob) {
      releaseCover();
      coverObjectUrl = URL.createObjectURL(coverBlob);
      coverImg.value = coverObjectUrl;
    } else {
      releaseCover();
      coverImg.value = '';
    }

    bookInfo.value = createBookRecord({
      bookUrl: bookUrlRef.value,
      sourcePath: sourcePathRef?.value || existingBook?.sourcePath || null,
      metadata,
      progress: readProgress.value,
      coverBase64,
      totalReadingTimeMs: existingBook?.totalReadingTimeMs || 0,
    });

    await libraryRepository.saveBookRecord(bookInfo.value);
  }

  async function syncProgress(detail) {
    readProgress.value = detail;
    if (!bookInfo.value?.identifier) {
      return;
    }

    bookInfo.value = {
      ...bookInfo.value,
      progress: detail,
      openTime: Date.now(),
    };

    await libraryRepository.saveReadingProgress(bookInfo.value.identifier, detail);
  }

  function releaseCover() {
    if (!coverObjectUrl) {
      return;
    }

    URL.revokeObjectURL(coverObjectUrl);
    coverObjectUrl = null;
  }

  return {
    bookInfo,
    bookDetail,
    readProgress,
    coverImg,
    setBookDetail,
    resetBookState,
    saveBookRecord,
    syncProgress,
    releaseCover,
  };
}
