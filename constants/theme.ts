import { Dimensions } from 'react-native';

// Responsive font size: scales relative to 375pt baseline, clamped 70%-130%
const BASE_WIDTH = 375;
const screenWidth = Dimensions.get('window').width;
export const rfs = (size: number): number => {
  const scale = screenWidth / BASE_WIDTH;
  const clamped = Math.min(1.3, Math.max(0.7, scale));
  return Math.round(size * clamped);
};

// Design tokens for the app

export const colors = {
  // Primary palette - Bright cyan-mint gradient (#4CFCAD to #4CD0FC)
  primary: {
    50: '#ecfdf8',
    100: '#d1fae9',
    200: '#a7f3d5',
    300: '#6ee7bc',
    400: '#4CFCAD', // Mint green
    500: '#34d399',
    600: '#10b981', // Main primary
    700: '#059669',
    800: '#047857',
    900: '#065f46',
  },

  // Accent - Bright cyan (#4CD0FC)
  accent: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#4CD0FC', // Bright cyan
    500: '#22d3ee',
    600: '#06b6d4',
    700: '#0891b2',
    800: '#0e7490',
    900: '#155e75',
  },

  // Success (PRs, completed)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a', // Main success
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning (deload, caution)
  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308', // Main warning
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Error (failures, alerts)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Main error
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral - Light mode
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#000000',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Semantic tokens for light mode with bright accent colors
export const theme = {
  colors: {
    background: colors.neutral[0], // White
    surface: colors.neutral[50],
    surfaceElevated: colors.neutral[0],

    text: colors.neutral[900], // Near black
    textSecondary: colors.neutral[600],
    textMuted: colors.neutral[400],

    primary: colors.primary[400], // #4CFCAD mint
    primaryDark: colors.primary[600],
    accent: colors.accent[400], // #4CD0FC cyan
    primaryText: colors.neutral[900],

    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],

    border: colors.neutral[200],
    borderFocus: colors.primary[400],

    // Component specific
    inputBackground: colors.neutral[100],
    cardBackground: colors.neutral[0],
    tabBarBackground: colors.neutral[0],
    tabBarBorder: colors.neutral[200],

    // Gradient colors for special elements
    gradientStart: '#4CFCAD',
    gradientEnd: '#4CD0FC',
  },
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
} as const;

export type Theme = typeof theme;
