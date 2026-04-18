import { computed, ref } from 'vue';
import { readerRepository } from '@/services/readerRepository.js';
import { drawAnnotation } from '@/features/reader/foliate/foliateAdapter.js';
import { createAnnotationStore } from '@/features/reader/annotationStore.js';
import { createNotePopupPresenter } from '@/features/reader/notePopupPresenter.js';
import {
  copyTextToClipboard,
  searchTextOnWeb,
} from '@/features/reader/readerBrowserActions.js';
import { renderMarkdownToHtml } from '@/services/markdownRenderer.js';

export function useReaderAnnotations({ foliateView, bookDetail, selection }) {
  const annotations = createAnnotationStore();
  const notePopupPresenter = createNotePopupPresenter();
  const isNoteEditorVisible = ref(false);
  const noteDraft = ref('');
  const noteExcerpt = ref('');
  const notePreviewHtml = computed(() => renderMarkdownToHtml(noteDraft.value));
  let pendingNoteContext = null;
  let activePopupClose = null;

  function getAnnotationTypeLabel(entry) {
    if (entry.style === 'underline') {
      return '下划线';
    }

    if (entry.style === 'wavy') {
      return '波浪线';
    }

    return entry.note?.trim() ? '笔记' : '高亮';
  }

  const noteEntries = computed(() => {
    const items = [];

    for (const [index, entries] of annotations.annotations.value.entries()) {
      for (const entry of entries) {
        items.push({
          index,
          value: entry.value,
          text: entry.text?.trim() || '',
          note: entry.note?.trim() || '',
          label: getAnnotationTypeLabel(entry),
          color: entry.color || 'yellow',
          style: entry.style || 'highlight',
        });
      }
    }

    return items.sort((a, b) => a.index - b.index);
  });

  function getBookId() {
    return bookDetail.value?.metadata?.identifier || null;
  }

  function reset() {
    notePopupPresenter.cleanup();
    annotations.clear();
    pendingNoteContext = null;
    activePopupClose = null;
    noteDraft.value = '';
    noteExcerpt.value = '';
    isNoteEditorVisible.value = false;
  }

  async function loadSaved() {
    const bookId = getBookId();
    if (!bookId || !foliateView.value) {
      return;
    }

    const savedAnnotations = await readerRepository.getAnnotations(bookId);
    annotations.hydrate(savedAnnotations);

    for (const item of savedAnnotations) {
      await foliateView.value.addAnnotation(annotations.getByValue(item.value));
    }
  }

  async function persist() {
    const bookId = getBookId();
    if (!bookId) {
      return;
    }

    await readerRepository.saveAnnotations(bookId, annotations.serialize());
  }

  async function deleteAnnotation(annotation) {
    const bookId = getBookId();
    if (foliateView.value) {
      await foliateView.value.deleteAnnotation(annotation);
    }

    annotations.remove(annotation);
    if (bookId && annotation?.value) {
      await readerRepository.deleteAnnotation(bookId, annotation.value);
    }
  }

  function findAnnotationIndex(annotationValue) {
    for (const [index, entries] of annotations.annotations.value.entries()) {
      if (entries.some(entry => entry.value === annotationValue)) {
        return index;
      }
    }

    return null;
  }

  async function highlightText(styleOrColor = 'yellow') {
    const { range, index } = selection.getSelectionContext();
    if (!foliateView.value || !range || index == null) {
      return;
    }

    const selectedText = selection.getSelectedText().trim();

    const cfi = foliateView.value.getCFI(index, range);
    if (!cfi) {
      return;
    }

    let color = 'yellow';
    let style = 'highlight';

    if (styleOrColor === 'wavy') {
      style = 'wavy';
      color = 'red';
    } else if (styleOrColor === 'underline') {
      style = 'underline';
      color = 'blue';
    } else {
      color = styleOrColor;
    }

    const annotation = { value: cfi, color, style, text: selectedText, note: '' };
    await foliateView.value.addAnnotation(annotation);
    annotations.set(index, annotation);
    const bookId = getBookId();
    if (bookId) {
      await readerRepository.upsertAnnotation(bookId, { index, ...annotation });
    }
    selection.hideAnnotationToolbar();
  }

  function addNote() {
    const { range, index } = selection.getSelectionContext();
    if (!foliateView.value || !range || index == null) {
      return;
    }

    const selectedText = selection.getSelectedText().trim();
    const cfi = foliateView.value.getCFI(index, range);
    if (!cfi) {
      return;
    }

    pendingNoteContext = {
      mode: 'create',
      index,
      cfi,
      selectedText,
    };
    noteDraft.value = '';
    noteExcerpt.value = selectedText;
    isNoteEditorVisible.value = true;
    selection.hideAnnotationToolbar();
  }

  function editNote(annotation) {
    if (!annotation) {
      return;
    }

    const index = findAnnotationIndex(annotation.value);
    if (index == null) {
      return;
    }

    pendingNoteContext = {
      mode: 'edit',
      index,
      cfi: annotation.value,
      selectedText: annotation.text?.trim() || '',
      existingAnnotation: annotation,
    };
    noteDraft.value = annotation.note || '';
    noteExcerpt.value = annotation.text?.trim() || '';
    isNoteEditorVisible.value = true;
    activePopupClose?.();
  }

  function cancelNoteEditor() {
    pendingNoteContext = null;
    noteDraft.value = '';
    noteExcerpt.value = '';
    isNoteEditorVisible.value = false;
  }

  async function saveNote() {
    const note = noteDraft.value.trim();
    if (!note || !pendingNoteContext || !foliateView.value) {
      cancelNoteEditor();
      return;
    }

    const annotation = {
      value: pendingNoteContext.cfi,
      color: 'yellow',
      style: 'highlight',
      text: pendingNoteContext.selectedText,
      note,
    };

    if (pendingNoteContext.mode === 'edit' && pendingNoteContext.existingAnnotation) {
      await foliateView.value.deleteAnnotation(pendingNoteContext.existingAnnotation);
      annotations.remove(pendingNoteContext.existingAnnotation);
    }

    await foliateView.value.addAnnotation(annotation);
    annotations.set(pendingNoteContext.index, annotation);
    const bookId = getBookId();
    if (bookId) {
      await readerRepository.upsertAnnotation(bookId, { index: pendingNoteContext.index, ...annotation });
    }
    cancelNoteEditor();
  }

  async function copyText() {
    const text = selection.getSelectedText();
    if (!text) {
      return;
    }

    if (await copyTextToClipboard(text)) {
      selection.hideAnnotationToolbar();
    }
  }

  async function handleSearch() {
    const text = selection.getSelectedText();
    if (text) {
      await searchTextOnWeb(text);
    }

    selection.hideAnnotationToolbar();
  }

  async function goToAnnotation(annotationValue) {
    if (!annotationValue || !foliateView.value) {
      return;
    }

    await foliateView.value.goTo(annotationValue);
  }

  async function handleCreateOverlay(event) {
    const index = event.detail?.index;
    if (index == null || !foliateView.value) {
      return;
    }

    const entries = annotations.getByIndex(index);
    for (const entry of entries) {
      await foliateView.value.addAnnotation(entry);
    }
  }

  function handleDrawAnnotation(event) {
    drawAnnotation(event.detail.draw, event.detail.annotation);
  }

  function handleShowAnnotation(event) {
    const { value, range } = event.detail;
    const annotation = annotations.getByValue(value);
    if (annotation) {
      activePopupClose = notePopupPresenter.show(annotation, range, {
        onEdit: () => {
          editNote(annotation);
        },
        onDelete: async () => {
          activePopupClose = null;
          await deleteAnnotation(annotation);
        },
      });
    }
  }

  return {
    loadSaved,
    reset,
    highlightText,
    addNote,
    editNote,
    saveNote,
    cancelNoteEditor,
    isNoteEditorVisible,
    noteDraft,
    noteExcerpt,
    notePreviewHtml,
    copyText,
    handleSearch,
    noteEntries,
    goToAnnotation,
    handleCreateOverlay,
    handleDrawAnnotation,
    handleShowAnnotation,
  };
}
