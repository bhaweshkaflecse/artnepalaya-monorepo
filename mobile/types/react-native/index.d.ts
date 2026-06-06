declare module 'react-native' {
  import React from 'react';
  
  export interface ViewStyle {
    [key: string]: any;
  }
  export interface TextStyle {
    [key: string]: any;
  }
  export interface ImageStyle {
    [key: string]: any;
  }
  
  type StyleProp<T> = T | T[] | null | undefined;

  export interface ViewToken {
    item: any;
    key: string;
    index: number | null;
    isViewable: boolean;
    section?: any;
  }

  export interface ViewabilityConfig {
    minimumViewTime?: number;
    viewAreaCoveragePercentThreshold?: number;
    itemVisiblePercentThreshold?: number;
    waitForInteraction?: boolean;
  }
  
  export const View: React.FC<any>;
  export const Text: React.FC<any>;
  export const TextInput: React.FC<any> & { prototype: any };
  export const TouchableOpacity: React.FC<any>;
  export const TouchableWithoutFeedback: React.FC<any>;
  export const FlatList: React.FC<any>;
  export const ScrollView: React.FC<any>;
  export const Image: React.FC<any>;
  export const SafeAreaView: React.FC<any>;
  export const ActivityIndicator: React.FC<any>;
  export const RefreshControl: React.FC<any>;
  export const Modal: React.FC<any>;
  export const StatusBar: React.FC<any>;
  export const Alert: { alert: (title: string, message?: string) => void };
  export const KeyboardAvoidingView: React.FC<any>;
  export const Linking: { openURL: (url: string) => Promise<void> };
  export const Platform: { OS: string; select: (obj: any) => any };
  export const Share: { share: (content: any, options?: any) => Promise<any> };
  export const Dimensions: { get: (dim: string) => { width: number; height: number } };

  export const Animated: {
    View: React.FC<any>;
    Text: React.FC<any>;
    Image: React.FC<any>;
    Value: new (value: number) => AnimatedValue;
    timing: (value: AnimatedValue, config: any) => AnimatedCompositeAnimation;
    spring: (value: AnimatedValue, config: any) => AnimatedCompositeAnimation;
    loop: (animation: AnimatedCompositeAnimation, config?: any) => AnimatedCompositeAnimation;
    sequence: (animations: AnimatedCompositeAnimation[]) => AnimatedCompositeAnimation;
    parallel: (animations: AnimatedCompositeAnimation[]) => AnimatedCompositeAnimation;
    delay: (time: number) => AnimatedCompositeAnimation;
  };

  export interface AnimatedValue {
    setValue: (value: number) => void;
    interpolate: (config: { inputRange: number[]; outputRange: any[] }) => any;
  }

  export interface AnimatedCompositeAnimation {
    start: (callback?: (result: { finished: boolean }) => void) => void;
    stop: () => void;
    reset: () => void;
  }

  export const StyleSheet: {
    create: <T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T) => T;
    absoluteFillObject: ViewStyle;
  };
}
