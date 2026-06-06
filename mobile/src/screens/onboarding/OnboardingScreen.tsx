// src/screens/onboarding/OnboardingScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch } from '../../store';
import { setOnboardingComplete } from '../../store/slices/appSlice';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'aperture',
    title: 'Discover Nepali Art',
    subtitle:
      'Explore a curated collection of traditional and contemporary artworks from Nepal\'s most talented artists.',
    backgroundColor: '#1B1464',
  },
  {
    id: '2',
    icon: 'users',
    title: 'Connect with Artists',
    subtitle:
      'Follow your favorite creators, engage with their work, and purchase original pieces directly.',
    backgroundColor: '#0D3B66',
  },
  {
    id: '3',
    icon: 'edit-3',
    title: 'Share Your Creations',
    subtitle:
      'Post your artwork, build your audience, and become part of Nepal\'s growing creative community.',
    backgroundColor: '#2D1B4E',
  },
];

export const OnboardingScreen = () => {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<any>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleGetStarted = async () => {
    dispatch(setOnboardingComplete());
    await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Feather name={item.icon} size={56} color="#FFFFFF" />
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      {index === slides.length - 1 ? (
        <TouchableOpacity style={styles.actionButton} onPress={handleGetStarted}>
          <Text style={styles.actionButtonText}>Get Started</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
          <Text style={styles.actionButtonText}>Next</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <SafeAreaView style={styles.skipWrapper}>
        <TouchableOpacity style={styles.skipButton} onPress={handleGetStarted}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B1464',
  },
  skipWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  actionButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 48,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
