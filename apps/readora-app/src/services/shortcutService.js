import { showMainWindow } from '@/platform/tauri/windowBridge.js';
import { getCurrentPlatform } from '@/platform/tauri/osBridge.js';
import {
  clearRegisteredShortcuts,
  registerShortcut,
} from '@/platform/tauri/shortcutBridge.js';
import { exitApplication } from '@/platform/tauri/systemBridge.js';
import { navigateToSettings } from '@/services/navigationService.js';
import { settingsRepository } from '@/services/settingsRepository.js';
import { pickAndOpenBook } from '@/services/windowService.js';
import { supportsGlobalShortcuts } from '@/platform/tauri/capabilities.js';

export const shortcuts = [
  { id: 'setting', default: 'CommandOrControl+Comma', shortcut: 'CommandOrControl+Comma' },
  { id: 'openBook', default: 'CommandOrControl+O', shortcut: 'CommandOrControl+O' },
  { id: 'show', default: 'CommandOrControl+H', shortcut: 'CommandOrControl+H' },
  { id: 'exit', default: 'CommandOrControl+Q', shortcut: 'CommandOrControl+Q' },
];

const shortcutActions = {
  setting: () => navigateToSettings(),
  openBook: () => pickAndOpenBook(),
  show: () => showMainWindow(),
  exit: () => exitApplication(),
};

function normalizeShortcutValue(shortcut) {
  return typeof shortcut === 'string' ? shortcut.trim() : '';
}

function normalizeShortcutKey(shortcut) {
  return normalizeShortcutValue(shortcut).toLowerCase();
}

function getEffectiveBindings(savedBindings = {}) {
  return shortcuts.map(shortcut => ({
    ...shortcut,
    shortcut: Object.prototype.hasOwnProperty.call(savedBindings, shortcut.id)
      ? normalizeShortcutValue(savedBindings[shortcut.id])
      : shortcut.default,
  }));
}

async function loadSavedShortcutBindings() {
  return (await settingsRepository.getShortcutBindings()) ?? {};
}

async function persistShortcutBindings(bindings) {
  await settingsRepository.setShortcutBindings(bindings);
}

function ensureNoDuplicateShortcuts(bindings) {
  const seen = new Map();

  for (const binding of bindings) {
    const key = normalizeShortcutKey(binding.shortcut);
    if (!key) {
      continue;
    }

    const existing = seen.get(key);
    if (existing && existing !== binding.id) {
      throw new Error('duplicate');
    }

    seen.set(key, binding.id);
  }
}

export async function setupGlobalShortcuts() {
  if (!supportsGlobalShortcuts()) {
    return;
  }

  const savedBindings = await loadSavedShortcutBindings();
  const activeBindings = getEffectiveBindings(savedBindings);
  ensureNoDuplicateShortcuts(activeBindings);

  await clearRegisteredShortcuts();

  for (const shortcut of activeBindings) {
    if (!shortcut.shortcut) {
      continue;
    }

    const action = shortcutActions[shortcut.id];
    await registerShortcut(shortcut.shortcut, () => {
      Promise.resolve(action?.()).catch(() => {});
    });
  }
}

export function formatShortcutForPlatform(shortcut, platformName) {
  if (!shortcut) {
    return '';
  }

  return shortcut
    .split('+')
    .map(part => formatShortcutPartForDisplay(part, platformName))
    .join('+');
}

export async function listShortcutBindings() {
  const savedBindings = await loadSavedShortcutBindings();
  const platformName = await getCurrentPlatform();
  const activeBindings = getEffectiveBindings(savedBindings);

  return activeBindings.map(shortcut => ({
    ...shortcut,
    shortcutName: formatShortcutForPlatform(shortcut.shortcut, platformName),
  }));
}

export function normalizeShortcutFromKeyboardEvent(event, platformName) {
  const modifiers = [];

  if (event.metaKey) {
    modifiers.push(platformName === 'macos' ? 'CommandOrControl' : 'Meta');
  }
  if (event.ctrlKey) {
    modifiers.push(platformName === 'macos' && event.metaKey ? 'Control' : 'CommandOrControl');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }

  const key = resolveShortcutKey(event);
  if (!key) {
    return null;
  }

  if (modifiers.length === 0) {
    throw new Error('missing_modifier');
  }

  return [...modifiers, key].join('+');
}

function resolveShortcutKey(event) {
  const codeMap = {
    Comma: 'Comma',
    Period: 'Period',
    Semicolon: 'Semicolon',
    Quote: 'Quote',
    Slash: 'Slash',
    Backslash: 'Backslash',
    BracketLeft: 'BracketLeft',
    BracketRight: 'BracketRight',
    Minus: 'Minus',
    Equal: 'Equal',
    Backquote: 'Backquote',
  };

  const keyMap = {
    ',': 'Comma',
    '.': 'Period',
    ';': 'Semicolon',
    '\'': 'Quote',
    '/': 'Slash',
    '\\': 'Backslash',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    '-': 'Minus',
    '=': 'Equal',
    '`': 'Backquote',
  };

  if (event.code?.startsWith('Key')) {
    return event.code.slice(3).toUpperCase();
  }

  if (event.code?.startsWith('Digit')) {
    return event.code.slice(5);
  }

  if (codeMap[event.code]) {
    return codeMap[event.code];
  }

  if (keyMap[event.key]) {
    return keyMap[event.key];
  }

  const legacyKey = resolveShortcutKeyFromLegacyCode(event);
  if (legacyKey) {
    return legacyKey;
  }

  const specialKeyMap = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    Space: 'Space',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
  };

  if (specialKeyMap[event.key]) {
    return specialKeyMap[event.key];
  }

  if (/^F\d{1,2}$/i.test(event.key)) {
    return event.key.toUpperCase();
  }

  return null;
}

function resolveShortcutKeyFromLegacyCode(event) {
  const keyCode = event.keyCode || event.which;
  if (!keyCode) {
    return null;
  }

  const legacyCodeMap = {
    8: 'Backspace',
    9: 'Tab',
    13: 'Enter',
    27: 'Escape',
    32: 'Space',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: 'Left',
    38: 'Up',
    39: 'Right',
    40: 'Down',
    45: 'Insert',
    46: 'Delete',
    186: 'Semicolon',
    187: 'Equal',
    188: 'Comma',
    189: 'Minus',
    190: 'Period',
    191: 'Slash',
    192: 'Backquote',
    219: 'BracketLeft',
    220: 'Backslash',
    221: 'BracketRight',
    222: 'Quote',
  };

  if (legacyCodeMap[keyCode]) {
    return legacyCodeMap[keyCode];
  }

  if (keyCode >= 48 && keyCode <= 57) {
    return String(keyCode - 48);
  }

  if (keyCode >= 65 && keyCode <= 90) {
    return String.fromCharCode(keyCode);
  }

  if (keyCode >= 112 && keyCode <= 123) {
    return `F${keyCode - 111}`;
  }

  return null;
}

function formatShortcutKeyForDisplay(shortcut) {
  return shortcut
    .replaceAll('Comma', ',')
    .replaceAll('Period', '.')
    .replaceAll('Semicolon', ';')
    .replaceAll('Quote', '\'')
    .replaceAll('Slash', '/')
    .replaceAll('Backslash', '\\')
    .replaceAll('BracketLeft', '[')
    .replaceAll('BracketRight', ']')
    .replaceAll('Minus', '-')
    .replaceAll('Equal', '=')
    .replaceAll('Backquote', '`');
}

function formatShortcutPartForDisplay(part, platformName) {
  const modifierDisplayMap = platformName === 'macos'
    ? {
        CommandOrControl: 'Command',
        Command: 'Command',
        Control: 'Ctrl',
        Ctrl: 'Ctrl',
        Alt: 'Option',
        Shift: 'Shift',
        Meta: 'Command',
      }
    : {
        CommandOrControl: 'Ctrl',
        Command: 'Meta',
        Control: 'Ctrl',
        Ctrl: 'Ctrl',
        Alt: 'Alt',
        Shift: 'Shift',
        Meta: 'Meta',
      };

  return modifierDisplayMap[part] ?? formatShortcutKeyForDisplay(part);
}

export async function updateShortcutBinding(id, shortcut) {
  const previousBindings = await loadSavedShortcutBindings();
  const nextBindings = {
    ...previousBindings,
    [id]: normalizeShortcutValue(shortcut),
  };
  const nextEffectiveBindings = getEffectiveBindings(nextBindings);
  ensureNoDuplicateShortcuts(nextEffectiveBindings);

  await persistShortcutBindings(nextBindings);

  try {
    await setupGlobalShortcuts();
  } catch (error) {
    await persistShortcutBindings(previousBindings);
    await setupGlobalShortcuts().catch(() => {});
    throw error;
  }

  return listShortcutBindings();
}

export async function suspendGlobalShortcuts() {
  if (!supportsGlobalShortcuts()) {
    return;
  }

  await clearRegisteredShortcuts();
}

export async function resumeGlobalShortcuts() {
  if (!supportsGlobalShortcuts()) {
    return;
  }

  await setupGlobalShortcuts();
}
