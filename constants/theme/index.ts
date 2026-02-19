export const Colors = {
  // Brand - Northern Cardinal Palette
  primary: '#D4202C', // Cardinal Red
  secondary: '#111827', // Deep Mask Black
  accent: '#F97316', // Bill Orange-Red

  // Backgrounds
  background: '#f8f7f4', // Warm off-white
  surface: '#ffffff',
  surfaceLight: '#f2f1ed',
  premium: '#2c3e50', // Dark premium banner

  // Glass
  glass: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(0, 0, 0, 0.05)',

  // Text
  text: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',

  // States
  white: '#ffffff',
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#10b981',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  h1: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '500' as const, letterSpacing: 0.5 },
  label: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1 },
};
