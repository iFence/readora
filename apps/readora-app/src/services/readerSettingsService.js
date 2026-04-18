import { readonly, ref } from 'vue';
import { settingsRepository } from '@/services/settingsRepository.js';

const DEFAULT_FORCE_READER_TEXT_COLOR = true;
const DEFAULT_READER_FONT_SIZE = 16;
const DEFAULT_READER_LINE_HEIGHT = 1.9;
const forceReaderTextColor = ref(DEFAULT_FORCE_READER_TEXT_COLOR);
const readerFontSize = ref(DEFAULT_READER_FONT_SIZE);
const readerLineHeight = ref(DEFAULT_READER_LINE_HEIGHT);
let initialized = false;

async function initializeReaderSettings() {
  if (initialized) {
    return;
  }

  const [storedForceTextColor, storedFontSize, storedLineHeight] = await Promise.all([
    settingsRepository.getForceReaderTextColor(),
    settingsRepository.getReaderFontSize(),
    settingsRepository.getReaderLineHeight(),
  ]);

  forceReaderTextColor.value = typeof storedForceTextColor === 'boolean'
    ? storedForceTextColor
    : DEFAULT_FORCE_READER_TEXT_COLOR;
  readerFontSize.value = Number.isFinite(storedFontSize)
    ? storedFontSize
    : DEFAULT_READER_FONT_SIZE;
  readerLineHeight.value = Number.isFinite(storedLineHeight)
    ? storedLineHeight
    : DEFAULT_READER_LINE_HEIGHT;

  initialized = true;
}

async function setForceReaderTextColor(value) {
  forceReaderTextColor.value = Boolean(value);
  await settingsRepository.setForceReaderTextColor(forceReaderTextColor.value);
  initialized = true;
  return forceReaderTextColor.value;
}

async function setReaderFontSize(value) {
  const nextValue = Math.max(12, Math.min(32, Number(value) || DEFAULT_READER_FONT_SIZE));
  readerFontSize.value = nextValue;
  await settingsRepository.setReaderFontSize(nextValue);
  initialized = true;
  return readerFontSize.value;
}

async function setReaderLineHeight(value) {
  const nextValue = Math.max(1.2, Math.min(2.6, Number(value) || DEFAULT_READER_LINE_HEIGHT));
  readerLineHeight.value = Math.round(nextValue * 10) / 10;
  await settingsRepository.setReaderLineHeight(readerLineHeight.value);
  initialized = true;
  return readerLineHeight.value;
}

async function resetReaderTypography() {
  readerFontSize.value = DEFAULT_READER_FONT_SIZE;
  readerLineHeight.value = DEFAULT_READER_LINE_HEIGHT;
  await Promise.all([
    settingsRepository.setReaderFontSize(readerFontSize.value),
    settingsRepository.setReaderLineHeight(readerLineHeight.value),
  ]);
  initialized = true;
  return {
    fontSize: readerFontSize.value,
    lineHeight: readerLineHeight.value,
  };
}

export function useReaderSettingsService() {
  return {
    forceReaderTextColor: readonly(forceReaderTextColor),
    readerFontSize: readonly(readerFontSize),
    readerLineHeight: readonly(readerLineHeight),
    initializeReaderSettings,
    setForceReaderTextColor,
    setReaderFontSize,
    setReaderLineHeight,
    resetReaderTypography,
  };
}
