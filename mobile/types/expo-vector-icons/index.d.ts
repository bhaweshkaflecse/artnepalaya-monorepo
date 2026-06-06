declare module '@expo/vector-icons' {
  import React from 'react';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }

  export const Feather: React.FC<IconProps>;
  export const Ionicons: React.FC<IconProps>;
  export const MaterialIcons: React.FC<IconProps>;
  export const FontAwesome: React.FC<IconProps>;
}
