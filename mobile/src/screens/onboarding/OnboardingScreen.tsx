// src/screens/onboarding/OnboardingScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
  SafeAreaView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch } from '../../store';
import { setOnboardingComplete } from '../../store/slices/appSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideData {
  id: string;
  key: 'welcome' | 'origin' | 'getStarted';
}

const slides: SlideData[] = [
  { id: '1', key: 'welcome' },
  { id: '2', key: 'origin' },
  { id: '3', key: 'getStarted' },
];

/**
 * Nepal Flag SVG Component
 * The only non-rectangular national flag in the world.
 * Two stacked triangular pennants in crimson red (#DC143C) with blue border (#003893)
 * and white (#FFFFFF) sun and crescent moon symbols.
 */
const NepalFlag = () => (
  <Svg width={200} height={240} viewBox="0 0 200 240">
    {/* Blue border - outer shape of the flag */}
    <Path
      d="M 10 230 L 10 10 L 160 95 L 10 95 L 10 95 L 160 95 Z"
      fill="none"
    />
    {/* Lower pennant - blue border */}
    <Polygon
      points="15,225 15,85 165,225"
      fill="#003893"
    />
    {/* Lower pennant - crimson fill (inset) */}
    <Polygon
      points="25,215 25,100 148,215"
      fill="#DC143C"
    />
    {/* Upper pennant - blue border */}
    <Polygon
      points="15,105 15,10 145,105"
      fill="#003893"
    />
    {/* Upper pennant - crimson fill (inset) */}
    <Polygon
      points="25,98 25,25 128,98"
      fill="#DC143C"
    />
    {/* Crescent moon in upper triangle - white */}
    {/* Moon outer circle */}
    <Circle cx={60} cy={60} r={18} fill="#FFFFFF" />
    {/* Moon inner circle (creates crescent) */}
    <Circle cx={60} cy={52} r={16} fill="#DC143C" />
    {/* Moon base arc - small white semi circle at bottom */}
    <Path
      d="M 45 65 Q 60 78 75 65"
      fill="#FFFFFF"
      stroke="#FFFFFF"
      strokeWidth={2}
    />
    {/* 12-pointed sun in lower triangle - white */}
    <Circle cx={70} cy={165} r={14} fill="#FFFFFF" />
    {/* Sun rays - 12 triangular points */}
    <Polygon points="70,145 67,151 73,151" fill="#FFFFFF" />
    <Polygon points="80,148 76,153 80,155" fill="#FFFFFF" />
    <Polygon points="87,155 82,157 84,162" fill="#FFFFFF" />
    <Polygon points="90,165 84,163 84,167" fill="#FFFFFF" />
    <Polygon points="87,175 84,169 82,173" fill="#FFFFFF" />
    <Polygon points="80,182 80,176 76,178" fill="#FFFFFF" />
    <Polygon points="70,185 73,179 67,179" fill="#FFFFFF" />
    <Polygon points="60,182 64,178 60,176" fill="#FFFFFF" />
    <Polygon points="53,175 56,173 58,169" fill="#FFFFFF" />
    <Polygon points="50,165 56,167 56,163" fill="#FFFFFF" />
    <Polygon points="53,155 56,162 58,157" fill="#FFFFFF" />
    <Polygon points="60,148 60,155 64,153" fill="#FFFFFF" />
  </Svg>
);

export const OnboardingScreen = () => {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Fade animations for each screen
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(30)).current;
  const slideAnim2 = useRef(new Animated.Value(30)).current;
  const slideAnim3 = useRef(new Animated.Value(30)).current;

  const fadeAnims = [fadeAnim1, fadeAnim2, fadeAnim3];
  const slideAnims = [slideAnim1, slideAnim2, slideAnim3];

  // Animate first screen on mount
  useEffect(() => {
    animateScreen(0);
  }, []);

  // Animate screen content when currentIndex changes
  useEffect(() => {
    animateScreen(currentIndex);
  }, [currentIndex]);

  const animateScreen = (index: number) => {
    // Reset animation values
    fadeAnims[index].setValue(0);
    slideAnims[index].setValue(30);

    Animated.parallel([
      Animated.timing(fadeAnims[index], {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnims[index], {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

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

  // ---- Render Slides ----
  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => {
    const fadeAnim = fadeAnims[index];
    const slideAnim = slideAnims[index];

    if (item.key === 'welcome') {
      return (
        <View style={[styles.slide, styles.darkBackground]}>
          {/* Decorative background element */}
          <View style={styles.decorativeCircle} />
          <View style={styles.decorativeCircle2} />

          <Animated.View
            style={[
              styles.slideContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>
              Made for Artists,{'\n'}Art Lovers & Creatives
            </Text>

            {/* Description */}
            <Text style={styles.heroDescription}>
              A digital platform for Nepalese arts and culture, connecting artists, art lovers, creative professionals, and businesses.
            </Text>

            {/* Decorative divider */}
            <View style={styles.dividerLine} />
          </Animated.View>
        </View>
      );
    }

    if (item.key === 'origin') {
      return (
        <View style={[styles.slide, styles.darkBackground]}>
          {/* Decorative background */}
          <View style={styles.decorativeCircleOrigin} />

          <Animated.View
            style={[
              styles.slideContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Title */}
            <Text style={styles.originTitle}>
              Made in Nepal.{'\n'}Built for the World.
            </Text>

            {/* Nepal Flag SVG */}
            <View style={styles.artworkPlaceholder}>
              <View style={styles.artworkInner}>
                <NepalFlag />
              </View>
            </View>

            {/* Subtitle */}
            <Text style={styles.originMiddleText}>
              Celebrating Nepal's Creative Heritage
            </Text>

            {/* Main Description */}
            <Text style={styles.originSubtitle}>
              Bringing Nepal's arts and culture to the digital world, creating opportunities for artists, galleries, businesses, and art lovers to connect beyond borders.
            </Text>
          </Animated.View>
        </View>
      );
    }

    // Screen 3: Get Started - platform benefits summary + CTA
    return (
      <View style={[styles.slide, styles.darkBackground]}>
        <SafeAreaView style={styles.screen3SafeArea}>
          <Animated.View
            style={[
              styles.screen3Content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Title */}
            <Text style={styles.screen3Title}>
              Your Creative{'\n'}Journey Starts Here
            </Text>

            {/* Platform benefits summary */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitEmoji}>🎨</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Showcase Your Artwork</Text>
                  <Text style={styles.benefitSubtitle}>Share your creations with a growing creative community.</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitEmoji}>🖼️</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Discover Art</Text>
                  <Text style={styles.benefitSubtitle}>Explore inspiring artwork from talented artists.</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitEmoji}>🏛️</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Explore Galleries</Text>
                  <Text style={styles.benefitSubtitle}>Browse exhibitions and curated collections.</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitEmoji}>🚀</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Grow Your Creative Business</Text>
                  <Text style={styles.benefitSubtitle}>Connect with artists, reach new audiences, and unlock creative opportunities.</Text>
                </View>
              </View>
            </View>

            {/* Get Started CTA - the ONLY interactive element */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="center"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Dot indicators */}
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
    backgroundColor: '#0A0A0A',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBackground: {
    backgroundColor: '#0A0A0A',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },

  // ---- Decorative backgrounds ----
  decorativeCircle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.1,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: 'rgba(255,59,48,0.04)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.15,
    left: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: 'rgba(45,27,78,0.08)',
  },
  decorativeCircleOrigin: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.2,
    left: -SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(45,27,78,0.06)',
  },

  // ---- Logo ----
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 28,
  },

  // ---- Screen 1: Welcome ----
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 20,
  },
  heroDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  dividerLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
    opacity: 0.8,
  },

  // ---- Screen 2: Origin Story ----
  originTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 32,
  },
  artworkPlaceholder: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
    backgroundColor: '#2D1B4E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  artworkInner: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  artworkPlaceholderText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  originSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  originMiddleText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // ---- Screen 3: Get Started ----
  screen3SafeArea: {
    flex: 1,
    width: '100%',
  },
  screen3Content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: SCREEN_HEIGHT * 0.08,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  screen3Title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 32,
  },

  // ---- Benefits ----
  benefitsContainer: {
    marginBottom: 36,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  benefitIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitEmoji: {
    fontSize: 22,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  benefitSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
  },

  // ---- CTA Button ----
  ctaButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ---- Dots ----
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: '#FF3B30',
    width: 24,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
