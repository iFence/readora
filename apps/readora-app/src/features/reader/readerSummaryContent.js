const DEFAULT_MAX_SUMMARY_CHARS = 60_000;

function normalizeText(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function appendSectionText(parts, { index, text }) {
  if (!text) {
    return;
  }

  parts.push(`\n\n## Section ${index + 1}\n${text}`);
}

export async function extractBookTextForSummary(book, { maxChars = DEFAULT_MAX_SUMMARY_CHARS } = {}) {
  const sections = Array.isArray(book?.sections) ? book.sections : [];
  const parts = [];
  let currentLength = 0;
  let includedSectionCount = 0;

  for (const [index, section] of sections.entries()) {
    if (section?.linear === 'no' || typeof section?.createDocument !== 'function') {
      continue;
    }

    const doc = await section.createDocument();
    const sectionText = normalizeText(doc?.body?.textContent || doc?.documentElement?.textContent || '');
    if (!sectionText) {
      continue;
    }

    const remaining = maxChars - currentLength;
    if (remaining <= 0) {
      break;
    }

    const clippedText = sectionText.slice(0, remaining);
    appendSectionText(parts, { index, text: clippedText });
    currentLength += clippedText.length;
    includedSectionCount += 1;

    if (sectionText.length > remaining) {
      break;
    }
  }

  return {
    content: parts.join('').trim(),
    includedSectionCount,
    truncated: currentLength >= maxChars,
    maxChars,
  };
}
