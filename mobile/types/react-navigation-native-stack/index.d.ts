declare module '@react-navigation/native-stack' {
  import React from 'react';

  interface ScreenProps {
    name: string;
    component: React.FC<any>;
    options?: any;
  }

  interface NavigatorProps {
    screenOptions?: any;
    children?: React.ReactNode;
  }

  export function createNativeStackNavigator<T = any>(): {
    Navigator: React.FC<NavigatorProps>;
    Screen: React.FC<ScreenProps>;
    Group: React.FC<any>;
  };
}
