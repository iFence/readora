function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function resolveBookCoverAssets(bookDetail, fallbackCover = '') {
  const cover = bookDetail?.resources?.cover;
  if (!cover) {
    return {
      coverBase64: fallbackCover,
      coverBlob: null,
    };
  }

  const coverBlob = new Blob([await bookDetail.loadBlob(cover.href)], {
    type: cover.mediaType,
  });

  return {
    coverBase64: await blobToBase64(coverBlob),
    coverBlob,
  };
}

function normalizeMetadataText(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(normalizeMetadataText)
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    return normalizeMetadataText(
      value.name
      ?? value.label
      ?? value.value
      ?? value.text
      ?? '',
    );
  }

  return String(value);
}

export function createBookRecord({
  bookUrl,
  sourcePath = null,
  metadata,
  progress,
  coverBase64,
  totalReadingTimeMs = 0,
}) {
  return {
    bookUrl,
    sourcePath,
    author: normalizeMetadataText(metadata.author),
    title: normalizeMetadataText(metadata.title),
    cover: coverBase64,
    progress,
    identifier: metadata.identifier,
    openTime: Date.now(),
    totalReadingTimeMs,
  };
}
