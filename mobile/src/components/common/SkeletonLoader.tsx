import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { darkColors } from '../../theme/colors';

const ShimmerBlock: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: any }> = ({
  width,
  height,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeAnimation: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeAnimation: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#2A2A2A',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const PostCardSkeleton: React.FC = () => {
  return (
    <View style={skeletonStyles.postCard}>
      {/* Header */}
      <View style={skeletonStyles.postHeader}>
        <ShimmerBlock width={32} height={32} borderRadius={6} />
        <View style={skeletonStyles.headerText}>
          <ShimmerBlock width={100} height={12} />
          <ShimmerBlock width={60} height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      {/* Image area */}
      <ShimmerBlock width="100%" height={400} borderRadius={0} />
      {/* Action row */}
      <View style={skeletonStyles.actionRow}>
        <ShimmerBlock width={24} height={24} borderRadius={12} />
        <ShimmerBlock width={24} height={24} borderRadius={12} style={{ marginLeft: 16 }} />
        <View style={{ flex: 1 }} />
        <ShimmerBlock width={24} height={24} borderRadius={12} />
      </View>
      {/* Description */}
      <View style={skeletonStyles.descArea}>
        <ShimmerBlock width="80%" height={12} />
        <ShimmerBlock width="50%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

export const FeaturedSkeleton: React.FC = () => {
  return (
    <View style={skeletonStyles.featuredContainer}>
      <ShimmerBlock width={140} height={180} borderRadius={8} style={{ marginRight: 12 }} />
      <ShimmerBlock width={140} height={180} borderRadius={8} style={{ marginRight: 12 }} />
      <ShimmerBlock width={140} height={180} borderRadius={8} />
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  postCard: {
    backgroundColor: '#000000',
    paddingBottom: 16,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  headerText: {
    marginLeft: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  descArea: {
    paddingHorizontal: 12,
  },
  featuredContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
