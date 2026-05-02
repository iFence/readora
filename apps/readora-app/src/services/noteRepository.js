import { bookmarkRepository } from '@/services/bookmarkRepository.js';
import { getBookKey } from '@/entities/models.js';
import { isSyntheticAnnotation } from '@/features/reader/annotationStore.js';
import { libraryRepository } from '@/services/libraryRepository.js';
import { readerRepository } from '@/services/readerRepository.js';

function createEmptyCounts() {
  return {
    annotations: 0,
    highlights: 0,
    notes: 0,
    aiNotes: 0,
    bookmarks: 0,
    total: 0,
  };
}

function getAnnotationKind(annotation) {
  if (isSyntheticAnnotation(annotation) || annotation?.style === 'ai-note') {
    return 'ai-note';
  }

  if (String(annotation?.note || '').trim()) {
    return 'note';
  }

  return 'highlight';
}

function toAnnotationItem(book, annotation) {
  const kind = getAnnotationKind(annotation);
  return {
    id: `annotation:${getBookKey(book)}:${annotation.value}`,
    source: 'annotation',
    kind,
    style: annotation.style || 'highlight',
    color: annotation.color || 'yellow',
    chapterIndex: Number.isFinite(annotation.index) ? annotation.index : 0,
    excerpt: String(annotation.text || '').trim(),
    body: String(annotation.note || '').trim(),
    value: annotation.value,
  };
}

function toBookmarkItem(book, bookmark) {
  return {
    id: `bookmark:${getBookKey(book)}:${bookmark.id || bookmark.value}`,
    source: 'bookmark',
    kind: 'bookmark',
    style: 'bookmark',
    color: null,
    chapterIndex: Number.isFinite(bookmark.index) ? bookmark.index : Number.MAX_SAFE_INTEGER,
    excerpt: String(bookmark.label || '').trim(),
    body: '',
    value: bookmark.value,
    bookmarkId: bookmark.id || null,
  };
}

function accumulateCounts(items) {
  const counts = createEmptyCounts();

  for (const item of items) {
    if (item.source === 'annotation') {
      counts.annotations += 1;
    }

    if (item.kind === 'highlight') {
      counts.highlights += 1;
    } else if (item.kind === 'note') {
      counts.notes += 1;
    } else if (item.kind === 'ai-note') {
      counts.aiNotes += 1;
    } else if (item.kind === 'bookmark') {
      counts.bookmarks += 1;
    }
  }

  counts.total = counts.annotations + counts.bookmarks;
  return counts;
}

function compareItems(left, right) {
  const leftIndex = Number.isFinite(left.chapterIndex) ? left.chapterIndex : Number.MAX_SAFE_INTEGER;
  const rightIndex = Number.isFinite(right.chapterIndex) ? right.chapterIndex : Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  const weight = {
    note: 0,
    'ai-note': 1,
    highlight: 2,
    bookmark: 3,
  };

  return (weight[left.kind] ?? 99) - (weight[right.kind] ?? 99);
}

class NoteRepository {
  async getBookNoteCollections() {
    const books = await libraryRepository.getLatestBooks();
    const groups = await Promise.all(
      books.map(async book => {
        const bookId = book?.identifier;
        if (!bookId) {
          return null;
        }

        const [annotations, bookmarks] = await Promise.all([
          readerRepository.getAnnotations(bookId),
          bookmarkRepository.getBookmarks(bookId),
        ]);

        const items = [
          ...annotations.map(annotation => toAnnotationItem(book, annotation)),
          ...bookmarks.map(bookmark => toBookmarkItem(book, bookmark)),
        ].sort(compareItems);

        if (!items.length) {
          return null;
        }

        return {
          book,
          counts: accumulateCounts(items),
          items,
        };
      }),
    );

    return groups.filter(Boolean);
  }
}

export const noteRepository = new NoteRepository();
