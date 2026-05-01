const DEFAULT_MAX_ASSISTANT_CONTEXT_CHARS = 30_000;

const CHINESE_NUMBERS = new Map([
  ['一', 1],
  ['二', 2],
  ['两', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
  ['十', 10],
]);

function normalizeText(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function parseChineseNumber(value) {
  if (!value) {
    return null;
  }

  if (CHINESE_NUMBERS.has(value)) {
    return CHINESE_NUMBERS.get(value);
  }

  if (value.length === 2 && value[0] === '十' && CHINESE_NUMBERS.has(value[1])) {
    return 10 + CHINESE_NUMBERS.get(value[1]);
  }

  if (value.length === 2 && CHINESE_NUMBERS.has(value[0]) && value[1] === '十') {
    return CHINESE_NUMBERS.get(value[0]) * 10;
  }

  if (value.length === 3 && CHINESE_NUMBERS.has(value[0]) && value[1] === '十' && CHINESE_NUMBERS.has(value[2])) {
    return CHINESE_NUMBERS.get(value[0]) * 10 + CHINESE_NUMBERS.get(value[2]);
  }

  return null;
}

function parseRequestedChapterNumber(prompt) {
  const numericMatch = prompt.match(/第\s*(\d+)\s*[章节回篇]/);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  const chineseMatch = prompt.match(/第\s*([一二两三四五六七八九十]{1,3})\s*[章节回篇]/);
  if (chineseMatch) {
    return parseChineseNumber(chineseMatch[1]);
  }

  return null;
}

function asksForCurrentChapter(prompt) {
  return /本章|当前章|当前章节|这一章|这章|本节|当前节|这一节/.test(prompt);
}

function flattenToc(items = [], depth = 0, result = []) {
  for (const item of items) {
    result.push({
      ...item,
      depth,
      sectionIndex: null,
    });
    flattenToc(item.subitems ?? [], depth + 1, result);
  }

  return result;
}

async function resolveTocSections(book) {
  const flatToc = flattenToc(book?.toc ?? []);
  for (const item of flatToc) {
    if (!item.href || typeof book?.resolveHref !== 'function') {
      continue;
    }

    try {
      const resolved = await Promise.resolve(book.resolveHref(item.href));
      item.sectionIndex = resolved?.index ?? null;
    } catch {
      item.sectionIndex = null;
    }
  }

  return flatToc;
}

function getLinearSectionIndexes(book) {
  return (book?.sections ?? [])
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => section?.linear !== 'no' && typeof section?.createDocument === 'function')
    .map(({ index }) => index);
}

async function resolveChapterNumberToSectionIndex(book, chapterNumber) {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    return null;
  }

  const flatToc = await resolveTocSections(book);
  const topLevelItems = flatToc.filter(item => item.depth === 0 && item.sectionIndex != null);
  if (topLevelItems[chapterNumber - 1]?.sectionIndex != null) {
    return topLevelItems[chapterNumber - 1].sectionIndex;
  }

  const chapterLikeItems = flatToc.filter(item => (
    item.sectionIndex != null
    && /第\s*[0-9一二两三四五六七八九十]+\s*[章节回篇]|chapter\s+\d+/i.test(item.label || '')
  ));
  if (chapterLikeItems[chapterNumber - 1]?.sectionIndex != null) {
    return chapterLikeItems[chapterNumber - 1].sectionIndex;
  }

  return getLinearSectionIndexes(book)[chapterNumber - 1] ?? null;
}

async function extractSectionText(book, sectionIndex, {
  maxChars = DEFAULT_MAX_ASSISTANT_CONTEXT_CHARS,
  sectionTitle = null,
} = {}) {
  const section = book?.sections?.[sectionIndex];
  if (!section || section.linear === 'no' || typeof section.createDocument !== 'function') {
    return null;
  }

  const doc = await section.createDocument();
  const text = normalizeText(doc?.body?.textContent || doc?.documentElement?.textContent || '');
  if (!text) {
    return null;
  }

  return {
    content: text.slice(0, maxChars),
    includedSectionCount: 1,
    sectionIndex,
    sectionTitle: sectionTitle || `Section ${sectionIndex + 1}`,
    truncated: text.length > maxChars,
    maxChars,
  };
}

export async function resolveReaderAssistantContext({
  book,
  currentLocation,
  prompt,
  maxChars = DEFAULT_MAX_ASSISTANT_CONTEXT_CHARS,
}) {
  const trimmedPrompt = normalizeText(prompt);
  if (!trimmedPrompt) {
    throw new Error('请输入你想让阅读助手处理的问题。');
  }

  let sectionIndex = null;
  const requestedChapterNumber = parseRequestedChapterNumber(trimmedPrompt);
  if (requestedChapterNumber != null) {
    sectionIndex = await resolveChapterNumberToSectionIndex(book, requestedChapterNumber);
  } else if (asksForCurrentChapter(trimmedPrompt)) {
    sectionIndex = currentLocation?.section?.current ?? null;
  }

  if (sectionIndex == null) {
    throw new Error('请说明要处理的章节，例如“为本章节生成总结”或“为第二章生成总结”。');
  }

  const tocItems = await resolveTocSections(book);
  const sectionTitle = tocItems.find(item => item.sectionIndex === sectionIndex)?.label || null;
  const extracted = await extractSectionText(book, sectionIndex, { maxChars, sectionTitle });
  if (!extracted?.content) {
    throw new Error('没有在目标章节中找到可读取文本。');
  }

  return {
    ...extracted,
    prompt: trimmedPrompt,
  };
}
