declare module 'react-native-svg' {
  import React from 'react';

  export interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    style?: any;
    color?: string;
    [key: string]: any;
  }

  export const Svg: React.FC<SvgProps>;
  export const Circle: React.FC<any>;
  export const Ellipse: React.FC<any>;
  export const G: React.FC<any>;
  export const Line: React.FC<any>;
  export const Path: React.FC<any>;
  export const Polygon: React.FC<any>;
  export const Polyline: React.FC<any>;
  export const Rect: React.FC<any>;
  export const Text: React.FC<any>;
  export const TSpan: React.FC<any>;
  export const Defs: React.FC<any>;
  export const LinearGradient: React.FC<any>;
  export const RadialGradient: React.FC<any>;
  export const Stop: React.FC<any>;
  export const ClipPath: React.FC<any>;
  export const Mask: React.FC<any>;
  export const Use: React.FC<any>;
  export const Symbol: React.FC<any>;

  export default Svg;
}
