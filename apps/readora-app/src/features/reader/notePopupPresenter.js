import { renderMarkdownToHtml } from '@/services/markdownRenderer.js';

export function createNotePopupPresenter() {
  const activePopups = new Set();

  function getThemeValue(name, fallback = '') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function cleanup() {
    activePopups.forEach(close => close());
    activePopups.clear();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function resolveAnchorRect(range) {
    const rect = range.getBoundingClientRect();
    const sourceDocument = range?.startContainer?.ownerDocument || document;
    const frameElement = sourceDocument.defaultView?.frameElement;

    if (!frameElement) {
      return rect;
    }

    const frameRect = frameElement.getBoundingClientRect();
    return {
      left: frameRect.left + rect.left,
      right: frameRect.left + rect.right,
      top: frameRect.top + rect.top,
      bottom: frameRect.top + rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function positionPopup(popup, range) {
    const rect = resolveAnchorRect(range);
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const horizontalCenter = rect.left + (rect.width / 2);
    const preferredLeft = horizontalCenter - (popupRect.width / 2);
    const left = clamp(preferredLeft, 12, Math.max(12, viewportWidth - popupRect.width - 12));

    const offset = 10;
    const fitsAbove = rect.top >= popupRect.height + offset + 12;
    const top = fitsAbove
      ? rect.top - popupRect.height - offset
      : clamp(rect.bottom + offset, 12, Math.max(12, viewportHeight - popupRect.height - 12));

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function getAnnotationTypeLabel(annotation) {
    if (annotation?.style === 'underline') {
      return '直线标注';
    }

    if (annotation?.style === 'wavy') {
      return '波浪线标注';
    }

    return annotation?.note?.trim() ? '笔记标注' : '高亮标注';
  }

  function styleMarkdown(container) {
    container.querySelectorAll('h1, h2, h3, h4').forEach(node => {
      node.style.margin = '0 0 12px';
      node.style.lineHeight = '1.28';
      node.style.color = getThemeValue('--text-primary', '#2d3745');
    });

    container.querySelectorAll('p, ul, ol, blockquote, pre').forEach(node => {
      node.style.margin = '0 0 12px';
      node.style.lineHeight = '1.7';
    });

    container.querySelectorAll('ul, ol').forEach(node => {
      node.style.paddingLeft = '20px';
    });

    container.querySelectorAll('blockquote').forEach(node => {
      node.style.padding = '10px 12px';
      node.style.borderLeft = `3px solid ${getThemeValue('--accent', '#486fa8')}`;
      node.style.borderRadius = '10px';
      node.style.background = getThemeValue('--surface-panel', '#f6f8fb');
      node.style.color = getThemeValue('--text-secondary', '#5f6c7d');
    });

    container.querySelectorAll('code').forEach(node => {
      node.style.padding = '0.12em 0.35em';
      node.style.borderRadius = '6px';
      node.style.background = getThemeValue('--surface-panel-muted', '#e7edf4');
    });

    container.querySelectorAll('pre').forEach(node => {
      node.style.padding = '12px 14px';
      node.style.borderRadius = '12px';
      node.style.overflow = 'auto';
      node.style.background = '#1e2430';
      node.style.color = '#f6f8fb';
    });

    container.querySelectorAll('pre code').forEach(node => {
      node.style.padding = '0';
      node.style.background = 'transparent';
      node.style.color = 'inherit';
    });

    container.querySelectorAll('a').forEach(node => {
      node.style.color = getThemeValue('--accent', '#486fa8');
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noreferrer noopener');
    });
  }

  function show(annotation, range, actions = {}) {
    cleanup();
    const { onEdit, onDelete } = actions;

    const popup = document.createElement('div');
    popup.className = 'note-popup';
    popup.style.position = 'fixed';
    popup.style.zIndex = '10000';
    popup.style.maxWidth = '420px';
    popup.style.minWidth = '320px';
    popup.style.background = getThemeValue('--surface-elevated', '#ffffff');
    popup.style.color = getThemeValue('--text-primary', '#2d3745');
    popup.style.padding = '18px';
    popup.style.border = `1px solid ${getThemeValue('--border-subtle', 'rgba(45, 55, 69, 0.12)')}`;
    popup.style.borderRadius = '20px';
    popup.style.boxShadow = getThemeValue('--shadow-md', '0 20px 52px rgba(23, 35, 56, 0.14)');
    popup.style.visibility = 'hidden';

    const heading = document.createElement('div');
    heading.textContent = getAnnotationTypeLabel(annotation);
    heading.style.marginBottom = '10px';
    heading.style.fontSize = '12px';
    heading.style.letterSpacing = '0.08em';
    heading.style.textTransform = 'uppercase';
    heading.style.fontWeight = '600';
    heading.style.color = getThemeValue('--text-secondary', '#5f6c7d');

    const excerptText = (annotation?.text || '').trim();
    if (excerptText) {
      const excerpt = document.createElement('div');
      excerpt.textContent = excerptText;
      excerpt.style.marginBottom = annotation?.note?.trim() ? '14px' : '12px';
      excerpt.style.padding = '12px 14px';
      excerpt.style.borderRadius = '14px';
      excerpt.style.background = getThemeValue('--surface-panel', '#f6f8fb');
      excerpt.style.color = getThemeValue('--text-primary', '#2d3745');
      excerpt.style.lineHeight = '1.6';
      popup.append(heading, excerpt);
    } else {
      popup.append(heading);
    }

    const noteText = (annotation?.note || '').trim();
    if (noteText) {
      const noteBlock = document.createElement('div');
      noteBlock.innerHTML = renderMarkdownToHtml(noteText);
      noteBlock.style.marginBottom = '12px';
      noteBlock.style.padding = '14px 16px';
      noteBlock.style.borderRadius = '16px';
      noteBlock.style.background = getThemeValue('--surface-panel', '#f6f8fb');
      noteBlock.style.color = getThemeValue('--text-primary', '#2d3745');
      noteBlock.style.lineHeight = '1.6';
      styleMarkdown(noteBlock);
      popup.append(noteBlock);
    }

    const actionRow = document.createElement('div');
    actionRow.style.display = 'flex';
    actionRow.style.gap = '10px';
    actionRow.style.justifyContent = 'flex-end';

    if (typeof onEdit === 'function') {
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = '编辑';
      editButton.style.border = `1px solid ${getThemeValue('--border-subtle', 'rgba(45, 55, 69, 0.12)')}`;
      editButton.style.borderRadius = '999px';
      editButton.style.padding = '8px 14px';
      editButton.style.cursor = 'pointer';
      editButton.style.background = getThemeValue('--surface-panel', '#f6f8fb');
      editButton.style.color = getThemeValue('--text-primary', '#2d3745');
      actionRow.append(editButton);

      editButton.addEventListener('click', () => {
        onEdit();
      });
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = '删除';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '999px';
    deleteButton.style.padding = '8px 14px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.background = getThemeValue('--accent-soft', 'rgba(72, 111, 168, 0.14)');
    deleteButton.style.color = getThemeValue('--accent', '#486fa8');
    actionRow.append(deleteButton);

    popup.append(actionRow);

    document.body.appendChild(popup);
    positionPopup(popup, range);
    popup.style.visibility = 'visible';

    const sourceDocument = range?.startContainer?.ownerDocument || document;
    const frameElement = sourceDocument.defaultView?.frameElement || null;

    const closeOutside = event => {
      const target = event?.target;
      if (!target || !popup.contains(target)) {
        closePopup();
      }
    };

    const closeOnFrameInteraction = () => {
      closePopup();
    };

    const repositionPopup = () => {
      if (popup.isConnected) {
        positionPopup(popup, range);
      }
    };

    const closePopup = () => {
      popup.remove();
      document.removeEventListener('pointerdown', closeOutside, true);
      sourceDocument.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('resize', repositionPopup);
      window.removeEventListener('scroll', repositionPopup, true);
      frameElement?.removeEventListener?.('pointerdown', closeOnFrameInteraction, true);
      activePopups.delete(closePopup);
    };

    deleteButton.addEventListener('click', async () => {
      await onDelete?.();
      closePopup();
    });

    setTimeout(() => {
      document.addEventListener('pointerdown', closeOutside, true);
      if (sourceDocument !== document) {
        sourceDocument.addEventListener('pointerdown', closeOutside, true);
      }
      frameElement?.addEventListener?.('pointerdown', closeOnFrameInteraction, true);
      window.addEventListener('resize', repositionPopup);
      window.addEventListener('scroll', repositionPopup, true);
      activePopups.add(closePopup);
    }, 0);

    return closePopup;
  }

  return {
    cleanup,
    show,
  };
}
