// src/components/common/AnimatedBackground.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useAppSelector } from '../../store';

const { width, height } = Dimensions.get('window');

export const AnimatedBackground = () => {
  const { authBackgroundMedia } = useAppSelector((state) => state.app);

  const imageItems = authBackgroundMedia.filter((item) => item.type === 'image');

  const indexRef = useRef(0);
  const fadeAnim1 = useRef(new Animated.Value(1)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const [tick, setTick] = useState(0);
  const showFirstRef = useRef(true);

  useEffect(() => {
    if (imageItems.length <= 1) return;

    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % imageItems.length;

      if (showFirstRef.current) {
        Animated.parallel([
          Animated.timing(fadeAnim1, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim2, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim2, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim1, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }

      showFirstRef.current = !showFirstRef.current;
      setTick((t) => t + 1);
    }, 4000);

    return () => clearInterval(id);
  }, [imageItems.length]);

  const getImageUri = (index: number) => {
    if (imageItems.length === 0) return '';
    return imageItems[index % imageItems.length]?.url || '';
  };

  if (imageItems.length === 0) {
    return <View style={[styles.backgroundFill, { backgroundColor: '#1A1A1A' }]} />;
  }

  const currentIndex = indexRef.current;
  const showFirst = showFirstRef.current;
  const firstImageIndex = showFirst ? currentIndex : (currentIndex + imageItems.length - 1) % imageItems.length;
  const secondImageIndex = showFirst ? (currentIndex + imageItems.length - 1) % imageItems.length : currentIndex;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.Image
        source={{ uri: getImageUri(firstImageIndex) }}
        style={[styles.backgroundImage, { opacity: fadeAnim1 }]}
        resizeMode="cover"
      />
      <Animated.Image
        source={{ uri: getImageUri(secondImageIndex) }}
        style={[styles.backgroundImage, { opacity: fadeAnim2 }]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundFill: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
  },
});
