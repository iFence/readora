import { ref } from 'vue';

export function useReaderSelection() {
  const annotationVisible = ref(false);
  const positionX = ref(0);
  const positionY = ref(0);
  let currentSelectionRange = null;
  let currentSectionIndex = null;
  let pendingAnimationFrame = null;

  function showAnnotationToolbar(selection, index) {
    if (!selection || selection.isCollapsed) {
      return;
    }

    currentSelectionRange = selection.getRangeAt(0);
    currentSectionIndex = index;
    annotationVisible.value = true;
    updateToolbarPosition();
  }

  function hideAnnotationToolbar() {
    annotationVisible.value = false;
    currentSelectionRange = null;
    currentSectionIndex = null;
    cancelScheduledToolbarPosition();
  }

  function updateToolbarPosition() {
    if (!currentSelectionRange) {
      return;
    }

    const rect = currentSelectionRange.getBoundingClientRect();
    const iframeEl = currentSelectionRange.startContainer?.ownerDocument?.defaultView?.frameElement;
    let offsetLeft = 0;
    let offsetTop = 0;

    if (iframeEl) {
      const iframeRect = iframeEl.getBoundingClientRect();
      offsetLeft = iframeRect.left;
      offsetTop = iframeRect.top;
    }

    positionX.value = rect.left + offsetLeft;
    positionY.value = rect.bottom + offsetTop + 8;
  }

  function cancelScheduledToolbarPosition() {
    if (pendingAnimationFrame == null) {
      return;
    }

    cancelAnimationFrame(pendingAnimationFrame);
    pendingAnimationFrame = null;
  }

  function scheduleToolbarPosition() {
    if (!currentSelectionRange) {
      return;
    }

    if (pendingAnimationFrame != null) {
      return;
    }

    pendingAnimationFrame = requestAnimationFrame(() => {
      pendingAnimationFrame = null;
      updateToolbarPosition();
    });
  }

  function getSelectionContext() {
    return {
      range: currentSelectionRange,
      index: currentSectionIndex,
    };
  }

  function getSelectedText() {
    return currentSelectionRange?.toString() || '';
  }

  return {
    annotationVisible,
    positionX,
    positionY,
    showAnnotationToolbar,
    hideAnnotationToolbar,
    updateToolbarPosition,
    scheduleToolbarPosition,
    cancelScheduledToolbarPosition,
    getSelectionContext,
    getSelectedText,
  };
}
