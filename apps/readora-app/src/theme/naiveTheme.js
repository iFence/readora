import { computed } from 'vue';
import { darkTheme } from 'naive-ui';
import { useThemeService } from '@/services/themeService.js';

const DARK_THEME_NAMES = new Set(['weread-dark', 'night']);

const FALLBACK_TOKENS = {
  '--accent': '#466da9',
  '--accent-hover': '#3c5f93',
  '--accent-pressed': '#314d77',
  '--accent-soft': 'rgba(70, 109, 169, 0.14)',
  '--accent-contrast': '#ffffff',
  '--surface-app': '#edf1f5',
  '--surface-panel': '#f6f8fb',
  '--surface-elevated': '#ffffff',
  '--surface-hover': '#eef3f8',
  '--text-primary': '#2d3848',
  '--text-secondary': '#5f6c7d',
  '--text-muted': '#8290a3',
  '--border-subtle': 'rgba(45, 56, 72, 0.12)',
  '--border-strong': 'rgba(45, 56, 72, 0.2)',
  '--scrollbar-thumb': 'rgba(95, 108, 125, 0.28)',
  '--scrollbar-thumb-hover': 'rgba(95, 108, 125, 0.42)',
  '--shadow-sm': '0 8px 24px rgba(21, 32, 51, 0.08)',
  '--shadow-md': '0 18px 50px rgba(21, 32, 51, 0.14)',
};

function isDarkTheme(themeName) {
  return DARK_THEME_NAMES.has(themeName);
}

function parseThemeTokens(cssText) {
  const tokens = { ...FALLBACK_TOKENS };
  const pattern = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match = pattern.exec(cssText);

  while (match) {
    tokens[match[1]] = match[2].trim();
    match = pattern.exec(cssText);
  }

  return tokens;
}

function createThemeOverrides(tokens) {
  const token = name => tokens[name] || FALLBACK_TOKENS[name];

  return {
    common: {
      bodyColor: token('--surface-app'),
      cardColor: token('--surface-panel'),
      modalColor: token('--surface-elevated'),
      popoverColor: token('--surface-elevated'),
      tableColor: token('--surface-panel'),
      primaryColor: token('--accent'),
      primaryColorHover: token('--accent-hover'),
      primaryColorPressed: token('--accent-pressed'),
      primaryColorSuppl: token('--accent'),
      textColorBase: token('--text-primary'),
      textColor1: token('--text-primary'),
      textColor2: token('--text-secondary'),
      textColor3: token('--text-muted'),
      borderColor: token('--border-subtle'),
      dividerColor: token('--border-subtle'),
      closeIconColor: token('--text-secondary'),
      closeIconColorHover: token('--text-primary'),
      closeIconColorPressed: token('--text-primary'),
      scrollbarColor: token('--scrollbar-thumb'),
      scrollbarColorHover: token('--scrollbar-thumb-hover'),
      boxShadow1: token('--shadow-sm'),
      boxShadow2: token('--shadow-sm'),
      boxShadow3: token('--shadow-md'),
    },
    Button: {
      borderRadiusMedium: '999px',
      borderRadiusSmall: '999px',
      colorPrimary: token('--accent'),
      colorHoverPrimary: token('--accent-hover'),
      colorPressedPrimary: token('--accent-pressed'),
      colorFocusPrimary: token('--accent-hover'),
      textColorPrimary: token('--accent-contrast'),
      textColorHoverPrimary: token('--accent-contrast'),
      textColorPressedPrimary: token('--accent-contrast'),
      borderPrimary: `1px solid ${token('--accent')}`,
      borderHoverPrimary: `1px solid ${token('--accent-hover')}`,
      borderPressedPrimary: `1px solid ${token('--accent-pressed')}`,
      borderFocusPrimary: `1px solid ${token('--accent-hover')}`,
    },
    Input: {
      color: token('--surface-elevated'),
      colorFocus: token('--surface-elevated'),
      colorDisabled: token('--surface-panel'),
      textColor: token('--text-primary'),
      placeholderColor: token('--text-muted'),
      border: `1px solid ${token('--border-subtle')}`,
      borderHover: `1px solid ${token('--border-strong')}`,
      borderFocus: `1px solid ${token('--accent')}`,
      boxShadowFocus: `0 0 0 3px ${token('--accent-soft')}`,
      caretColor: token('--accent'),
    },
    Select: {
      peers: {
        InternalSelection: {
          color: token('--surface-elevated'),
          textColor: token('--text-primary'),
          placeholderColor: token('--text-muted'),
          border: `1px solid ${token('--border-subtle')}`,
          borderHover: `1px solid ${token('--border-strong')}`,
          borderFocus: `1px solid ${token('--accent')}`,
          boxShadowFocus: `0 0 0 3px ${token('--accent-soft')}`,
        },
        InternalSelectMenu: {
          color: token('--surface-elevated'),
          optionTextColor: token('--text-primary'),
          optionTextColorActive: token('--text-primary'),
          optionTextColorPending: token('--text-primary'),
          optionColorPending: token('--surface-hover'),
          optionColorActive: token('--accent-soft'),
          optionCheckColor: token('--accent'),
        },
      },
    },
    Tabs: {
      tabTextColorLine: token('--text-secondary'),
      tabTextColorActiveLine: token('--text-primary'),
      tabTextColorHoverLine: token('--text-primary'),
      barColor: token('--accent'),
      paneTextColor: token('--text-primary'),
    },
    Dialog: {
      color: token('--surface-elevated'),
      textColor: token('--text-primary'),
      titleTextColor: token('--text-primary'),
      iconColorWarning: token('--accent'),
    },
    Notification: {
      color: token('--surface-elevated'),
      titleTextColor: token('--text-primary'),
      contentTextColor: token('--text-secondary'),
    },
  };
}

export function useNaiveTheme() {
  const { currentTheme, dynamicCss } = useThemeService();

  const naiveTheme = computed(() => (isDarkTheme(currentTheme.value) ? darkTheme : null));
  const naiveThemeOverrides = computed(() => createThemeOverrides(parseThemeTokens(dynamicCss.value)));

  return {
    naiveTheme,
    naiveThemeOverrides,
  };
}
