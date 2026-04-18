export function bindReaderDocumentEvents(doc, index, { selection, viewport }) {
  const handleMouseUp = () => {
    const currentSelection = doc.getSelection();
    if (!currentSelection || currentSelection.isCollapsed) {
      return;
    }

    const text = currentSelection.toString().trim();
    if (!text) {
      return;
    }

    selection.showAnnotationToolbar(currentSelection, index);
  };

  const handleSelectionChange = () => {
    const currentSelection = doc.getSelection();
    if (!currentSelection || currentSelection.isCollapsed) {
      selection.hideAnnotationToolbar();
    }
  };

  const handleScroll = () => {
    if (selection.annotationVisible.value) {
      selection.scheduleToolbarPosition();
    }
  };

  doc.addEventListener('mouseup', handleMouseUp);
  doc.addEventListener('selectionchange', handleSelectionChange);
  doc.addEventListener('scroll', handleScroll, { passive: true });
  doc.defaultView?.addEventListener('scroll', handleScroll, { passive: true });
  doc.defaultView?.addEventListener('resize', handleScroll, { passive: true });
  doc.addEventListener('keydown', viewport.handleKeydown, true);
  doc.defaultView?.addEventListener('keydown', viewport.handleKeydown, true);

  return () => {
    doc.removeEventListener('mouseup', handleMouseUp);
    doc.removeEventListener('selectionchange', handleSelectionChange);
    doc.removeEventListener('scroll', handleScroll);
    doc.defaultView?.removeEventListener('scroll', handleScroll);
    doc.defaultView?.removeEventListener('resize', handleScroll);
    doc.removeEventListener('keydown', viewport.handleKeydown, true);
    doc.defaultView?.removeEventListener('keydown', viewport.handleKeydown, true);
  };
}
