export const COLORS = {
  // Backgrounds
  bg: '#0d0f14',
  bgCard: '#13161e',
  bgElevated: '#1a1e28',
  bgDeep: '#222736',

  // Borders
  border: '#2a2f3e',
  borderLight: '#363c50',

  // Primary & Functional Accents
  primary: '#6c8ff7',
  primaryDim: '#3a4f9e',
  primaryLight: '#8ea9ff',

  // Incomes / Success / Settled
  success: '#3ecf8e',
  successDim: '#1a5e40',
  successBg: 'rgba(62, 207, 142, 0.12)',

  // Expenses / Danger / Pending
  danger: '#f06b6b',
  dangerDim: '#5c2323',
  dangerBg: 'rgba(240, 107, 107, 0.12)',

  // Warnings / Partial
  warning: '#f5b942',
  warningDim: '#5c420e',
  warningBg: 'rgba(245, 185, 66, 0.12)',

  // Allocations / Linked
  accent: '#b57bee',
  accentDim: '#4a2e7a',
  accentBg: 'rgba(181, 123, 238, 0.12)',

  // Blue / Unused
  info: '#4ba3e3',
  infoDim: '#1d486c',
  infoBg: 'rgba(75, 163, 227, 0.12)',

  // Typography
  textPrimary: '#e8eaf2',
  textMuted: '#9ba3bc',
  textSubtle: '#5c6480',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const FONT = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  mono: 'monospace', // Or JetBrains Mono if linked
};

export const PRESET_CATEGORIES = [
  'Food & Dining',
  'Travel',
  'Accommodation',
  'Fuel',
  'Rent',
  'Medical',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Office',
  'Education',
  'Salary',
  'Freelance',
  'Other',
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online' },
  { value: 'unspecified', label: 'Not specified' },
];

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  font: FONT,
  categories: PRESET_CATEGORIES,
  paymentMethods: PAYMENT_METHOD_OPTIONS,
};

export default theme;
