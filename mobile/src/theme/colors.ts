// src/theme/colors.ts

export const darkColors = {
  background: '#000000',
  surface: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  accent: '#FF3B30',
  border: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.8)',
};

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  textPrimary: '#121212',
  textSecondary: '#6C757D',
  accent: '#FF3B30',
  border: '#E9ECEF',
  overlay: 'rgba(0,0,0,0.5)',
};

// Backward-compatible export with all properties used across existing screens
export const colors = {
  ...lightColors,

  // Aliases used in existing components
  backgroundPrimary: '#FFFFFF',
  surfaceSecondary: '#F8F9FA',
  surfacePrimary: '#FFFFFF',
  textTertiary: '#ADB5BD',
  borderLight: '#E9ECEF',
  accentLight: '#E8A39F',
  overlayDark: 'rgba(0,0,0,0.7)',

  // Original accent color
  accent: '#FF3B30',

  // Status
  error: '#DC3545',
  success: '#198754',
};
