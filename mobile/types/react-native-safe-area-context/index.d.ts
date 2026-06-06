declare module 'react-native-safe-area-context' {
  import React from 'react';
  
  export const SafeAreaProvider: React.FC<{ children?: React.ReactNode }>;
  export const SafeAreaView: React.FC<any>;
  export function useSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
}
