export const Colors = {
  // Primary palette
  primary: '#300033',
  primaryContainer: '#4a154b',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#be7db9',
  primaryFixed: '#ffd6f8',
  primaryFixedDim: '#f6afef',

  // Secondary palette
  secondary: '#88438e',
  secondaryContainer: '#fbabfe',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#7b3781',

  // Tertiary palette
  tertiary: '#141a00',
  tertiaryContainer: '#263000',
  onTertiary: '#ffffff',

  // Surface
  surface: '#f9f9ff',
  surfaceBright: '#f9f9ff',
  surfaceDim: '#cfdaf2',
  surfaceVariant: '#d8e3fb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f0f3ff',
  surfaceContainer: '#e7eeff',
  surfaceContainerHigh: '#dee8ff',
  surfaceContainerHighest: '#d8e3fb',

  // On Surface
  onSurface: '#111c2d',
  onSurfaceVariant: '#4f434c',
  onBackground: '#111c2d',
  background: '#f9f9ff',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',

  // Outline
  outline: '#80737d',
  outlineVariant: '#d2c2cd',

  // Inverse
  inverseSurface: '#263143',
  inverseOnSurface: '#ecf1ff',
  inversePrimary: '#f6afef',

  // Status colors
  statusOnline: '#4caf50',
  statusAway: '#ff9800',
  statusBusy: '#f44336',
  statusOffline: '#9e9e9e',

  // Gradients
  gradient: ['#300033', '#4a154b'],

  // Dark mode overrides
  dark: {
    surface: '#111c2d',
    surfaceContainerLow: '#1a2b45',
    surfaceContainer: '#1e2f4d',
    surfaceContainerHigh: '#263143',
    onSurface: '#ecf1ff',
    onSurfaceVariant: '#c5b8c4',
    background: '#0d1520',
    primary: '#f6afef',
    onPrimary: '#300033',
  },
};

export const Typography = {
  fontHeadline: 'Manrope-Bold',
  fontBody: 'Inter-Regular',
  fontLabel: 'Inter-Medium',
  
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const BorderRadius = {
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#300033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};
