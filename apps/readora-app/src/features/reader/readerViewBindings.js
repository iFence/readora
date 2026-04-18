import { bindReaderDocumentEvents } from '@/features/reader/readerDocumentBindings.js';

export function bindReaderViewEvents(
  view,
  { currentLocation, selection, viewport, annotations, readerBook },
) {
  const documentCleanups = new Set();
  let detachRendererScroll = null;

  const handleRendererScroll = () => {
    if (selection.annotationVisible.value) {
      selection.scheduleToolbarPosition();
    }
  };

  const bindRendererScroll = () => {
    const renderer = view.renderer;
    if (!renderer || detachRendererScroll) {
      return;
    }

    renderer.addEventListener('scroll', handleRendererScroll, { passive: true });
    detachRendererScroll = () => {
      renderer.removeEventListener('scroll', handleRendererScroll);
      detachRendererScroll = null;
    };
  };

  const handleRelocate = async event => {
    currentLocation.value = event.detail;
    await readerBook.syncProgress(event.detail);

    if (selection.annotationVisible.value) {
      const { range } = selection.getSelectionContext();
      if (range) {
        selection.updateToolbarPosition();
      } else {
        selection.hideAnnotationToolbar();
      }
    }

    if (viewport.layout.value === 'paginated') {
      viewport.updatePageNumbers(event.detail);
    }
  };

  const handleLoad = ({ detail: { doc, index } }) => {
    bindRendererScroll();
    documentCleanups.add(
      bindReaderDocumentEvents(doc, index, { selection, viewport }),
    );
  };

  view.addEventListener('relocate', handleRelocate);
  view.addEventListener('load', handleLoad);
  view.addEventListener('create-overlay', annotations.handleCreateOverlay);
  view.addEventListener('draw-annotation', annotations.handleDrawAnnotation);
  view.addEventListener('show-annotation', annotations.handleShowAnnotation);
  bindRendererScroll();

  return () => {
    documentCleanups.forEach(cleanup => cleanup());
    documentCleanups.clear();
    detachRendererScroll?.();
    selection.cancelScheduledToolbarPosition();
    view.removeEventListener('relocate', handleRelocate);
    view.removeEventListener('load', handleLoad);
    view.removeEventListener('create-overlay', annotations.handleCreateOverlay);
    view.removeEventListener('draw-annotation', annotations.handleDrawAnnotation);
    view.removeEventListener('show-annotation', annotations.handleShowAnnotation);
  };
}
