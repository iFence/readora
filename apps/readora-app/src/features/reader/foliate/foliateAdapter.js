import { Overlayer } from 'foliate-js/overlayer.js';

let foliateModulePromise = null;

export async function ensureFoliateLoaded() {
  if (!foliateModulePromise) {
    foliateModulePromise = import('foliate-js/view.js');
  }

  await foliateModulePromise;
}

export function createOverlayer() {
  return new Overlayer();
}

export function mountOverlayer(overlayer) {
  document.body.append(overlayer.element);
}

export function unmountOverlayer(overlayer) {
  overlayer?.element?.remove();
}

export function createFoliateView() {
  return document.createElement('foliate-view');
}

export function destroyFoliateView(view) {
  view?.close?.();
  view?.remove?.();
}

export function resetViewerContainer(container) {
  if (container) {
    container.innerHTML = '';
  }
}

export async function openFoliateBook(view, bookUrl) {
  await view.open(bookUrl);
  return view.book;
}

function getThemeValue(name, fallback = '') {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function resolveAnnotationColor(color) {
  switch (color) {
    case 'yellow':
      return getThemeValue('--highlight-yellow', 'rgba(242, 209, 84, 0.82)');
    case 'red':
      return getThemeValue('--highlight-red', 'rgba(220, 102, 102, 0.94)');
    case 'blue':
      return getThemeValue('--highlight-blue', 'rgba(88, 145, 226, 0.94)');
    default:
      return color;
  }
}

export function applyReaderStyles(view, options = {}) {
  const {
    forceTextColor = true,
    fontSize = 16,
    lineHeight = 1.9,
  } = options;
  const readerSurfaceColor = getThemeValue('--surface-reader', '#f6f0e3');
  const readerTextColor = getThemeValue('--text-primary', '#2d3745');
  const readerPanelColor = getThemeValue('--surface-panel', '#f6f8fb');
  const readerPanelMutedColor = getThemeValue('--surface-panel-muted', '#e7edf4');
  const readerBorderColor = getThemeValue('--border-subtle', 'rgba(45, 56, 72, 0.12)');
  const readerSecondaryTextColor = getThemeValue('--text-secondary', '#5f6c7d');
  const accentColor = getThemeValue('--accent', '#486fa8');
  const selectionBackground = getThemeValue('--selection-bg', 'rgba(72, 111, 168, 0.18)');
  const selectionTextColor = getThemeValue('--selection-text', '#2d3745');
  const textColorOverrideCss = forceTextColor ? `
    body :where(
      p, div, span, font, strong, em, b, i, u, s, small, sub, sup,
      li, dt, dd, blockquote, q, cite, code, pre, figcaption,
      article, section, main, header, footer, aside,
      h1, h2, h3, h4, h5, h6,
      td, th, caption,
      ruby, rb, rt, rtc, rp
    ) {
      color: inherit !important;
      line-height: inherit !important;
    }

    body svg text,
    body svg tspan,
    body svg textPath {
      fill: currentColor !important;
    }

    body :where(blockquote, pre, aside:not([epub|type~="endnote"], [epub|type~="footnote"], [epub|type~="note"], [epub|type~="rearnote"])) {
      background: ${readerPanelColor} !important;
      color: inherit !important;
      border: 1px solid ${readerBorderColor} !important;
      border-inline-start: 4px solid ${readerSecondaryTextColor} !important;
      border-radius: 12px !important;
      padding: 0.9em 1.1em !important;
      box-sizing: border-box;
    }

    body :where(.bgcolor, [class*="bgcolor"]) {
      background: ${readerPanelColor} !important;
      color: inherit !important;
      border: 1px solid ${readerBorderColor} !important;
      border-radius: 12px !important;
      padding: 0.9em 1.1em !important;
      box-sizing: border-box;
    }

    body :where(blockquote, pre, aside) :where(p, div, span, font, strong, em, b, i, u, s, small, sub, sup, li, dt, dd, cite, code) {
      color: inherit !important;
    }

    body :where(.bgcolor, [class*="bgcolor"]) :where(p, div, span, font, strong, em, b, i, u, s, small, sub, sup, li, dt, dd, cite, code) {
      color: inherit !important;
    }

    body code {
      background: ${readerPanelMutedColor} !important;
      border-radius: 0.35em;
      padding: 0.08em 0.32em;
    }

    body pre code {
      background: transparent !important;
      padding: 0;
    }
  ` : '';

  view.renderer.setAttribute('gap', getThemeValue('--reader-column-gap', '4%'));
  view.renderer.setAttribute('max-inline-size', getThemeValue('--reader-max-inline-size', '800px'));
  view.renderer.setStyles(`
    html {
      background-color: ${readerSurfaceColor};
      color: ${readerTextColor};
    }

    body {
      background-color: ${readerSurfaceColor};
      color: ${readerTextColor};
      max-width: ${getThemeValue('--reader-body-max-width', '840px')} !important;
      font-size: ${fontSize}px !important;
      letter-spacing: ${getThemeValue('--reader-letter-spacing', '0.02em')} !important;
      margin: 0 auto !important;
      padding:
        ${getThemeValue('--reader-page-padding-top', '36px')}
        ${getThemeValue('--reader-page-padding-inline', '40px')}
        ${getThemeValue('--reader-page-padding-bottom', '60px')} !important;
      line-height: ${lineHeight} !important;
    }

    ${textColorOverrideCss}

    a {
      color: ${accentColor} !important;
    }

    ::selection {
      background: ${selectionBackground};
      color: ${selectionTextColor};
    }
  `);
}

export function getPageMetrics(view, detail) {
  const renderer = view?.renderer ?? view;
  let current = null;
  let next = null;
  let total = null;

  if (detail?.location) {
    total = detail.location.total ?? null;
    current = detail.location.current != null ? detail.location.current + 1 : null;
    next = detail.location.next != null ? detail.location.next + 1 : null;
    if (current != null || total != null) {
      return { current, next, total };
    }
  }

  total = renderer?.pages != null
    ? Math.max(0, renderer.pages - 2)
    : null;
  current = renderer?.page != null ? renderer.page : null;

  if ((current == null || total == null) && detail?.size != null) {
    total = Math.round(1 / detail.size);
    current = Math.round(detail.fraction / detail.size) + 1;
  }

  if (current == null) {
    if (detail?.page) {
      current = detail.page.current ?? detail.page.index ?? null;
      total = detail.page.total ?? detail.page.count ?? total;
    } else if (detail?.pages) {
      current = detail.pages.current ?? null;
      total = detail.pages.total ?? total;
    } else if (detail?.position) {
      current = detail.position.page ?? null;
      total = detail.position.total ?? total;
    }
  }

  if ((current == null || total == null) && detail?.fraction != null) {
    const count = renderer?.pages != null
      ? Math.max(0, renderer.pages - 2)
      : (renderer?.pageCount ?? (typeof renderer?.getPageCount === 'function' ? renderer.getPageCount() : null));
    if (count != null) {
      total = count;
      current = Math.max(1, Math.min(count, Math.round(detail.fraction * count)));
    }
  }

  return { current, next, total };
}

export function drawAnnotation(draw, annotation) {
  const { style } = annotation;
  const color = resolveAnnotationColor(annotation.color);

  if (style === 'underline') {
    draw(Overlayer.underline, { color });
    return;
  }

  if (style === 'wavy') {
    if (Overlayer.squiggly) {
      draw(Overlayer.squiggly, { color });
    } else {
      draw(Overlayer.underline, { color });
    }
    return;
  }

  draw(Overlayer.highlight, { color });
}
