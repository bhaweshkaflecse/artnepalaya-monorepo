declare module '@react-navigation/bottom-tabs' {
  import React from 'react';

  interface TabScreenProps {
    name: string;
    component: React.FC<any>;
    options?: {
      tabBarIcon?: (props: { color: string; size: number; focused: boolean }) => React.ReactNode;
      tabBarLabel?: string;
      headerShown?: boolean;
    };
  }

  interface TabNavigatorProps {
    screenOptions?: any;
    children?: React.ReactNode;
  }

  export function createBottomTabNavigator<T = any>(): {
    Navigator: React.FC<TabNavigatorProps>;
    Screen: React.FC<TabScreenProps>;
  };
}
