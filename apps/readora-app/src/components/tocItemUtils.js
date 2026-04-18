export function normalizeTocHref(href) {
  if (!href || typeof href !== 'string') {
    return '';
  }

  return href.trim().replace(/\\/g, '/');
}

function stripHash(href) {
  return normalizeTocHref(href).split('#')[0];
}

function hasHash(href) {
  return normalizeTocHref(href).includes('#');
}

export function isTocHrefActive(itemHref, activeHref) {
  const normalizedItemHref = normalizeTocHref(itemHref);
  const normalizedActiveHref = normalizeTocHref(activeHref);

  if (!normalizedItemHref || !normalizedActiveHref) {
    return false;
  }

  if (normalizedItemHref === normalizedActiveHref) {
    return true;
  }

  if (hasHash(normalizedActiveHref)) {
    return false;
  }

  return stripHash(normalizedItemHref) === stripHash(normalizedActiveHref);
}

export function hasActiveDescendant(items, activeHref) {
  if (!items || !activeHref) {
    return false;
  }

  for (const item of items) {
    if (isTocHrefActive(item.href, activeHref)) {
      return true;
    }

    if (item.subitems && hasActiveDescendant(item.subitems, activeHref)) {
      return true;
    }
  }

  return false;
}
