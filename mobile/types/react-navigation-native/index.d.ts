declare module '@react-navigation/native' {
  import React from 'react';
  
  export const NavigationContainer: React.FC<{ children?: React.ReactNode }>;
  export function useNavigation(): any;
  export function useRoute(): any;
}
