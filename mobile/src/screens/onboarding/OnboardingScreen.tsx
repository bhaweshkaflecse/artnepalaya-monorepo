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
import { safeSetItemAsync } from '../../utils/secureStore';
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
 * Nepal Flag Image Component
 * Renders the official Flag_of_Nepal.png asset with responsive dimensions.
 * To update the flag, replace the PNG at mobile/assets/icons/Flag_of_Nepal.png.
 */
const NepalFlag = () => {
  const flagWidth = Math.min(140, SCREEN_WIDTH * 0.35);
  const flagHeight = flagWidth * 1.2; // Maintain proportional aspect ratio
  return (
    <Image
      source={require('../../../assets/icons/Flag_of_Nepal.png')}
      style={{ width: flagWidth, height: flagHeight }}
      resizeMode="contain"
    />
  );
};

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
    await safeSetItemAsync('hasCompletedOnboarding', 'true');
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

          <SafeAreaView style={styles.slideSafeArea}>
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
          </SafeAreaView>
        </View>
      );
    }

    if (item.key === 'origin') {
      return (
        <View style={[styles.slide, styles.darkBackground]}>
          {/* Decorative background */}
          <View style={styles.decorativeCircleOrigin} />

          <SafeAreaView style={styles.slideSafeArea}>
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

              {/* Nepal Flag */}
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
          </SafeAreaView>
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
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
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
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  darkBackground: {
    backgroundColor: '#0A0A0A',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Math.min(36, SCREEN_WIDTH * 0.08),
    width: '100%',
  },
  slideSafeArea: {
    flex: 1,
    width: '100%',
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
    marginBottom: Math.min(28, SCREEN_HEIGHT * 0.03),
    alignItems: 'center',
  },
  logo: {
    width: Math.min(90, SCREEN_WIDTH * 0.22),
    height: Math.min(90, SCREEN_WIDTH * 0.22),
    borderRadius: Math.min(22, SCREEN_WIDTH * 0.055),
  },

  // ---- Screen 1: Welcome ----
  heroTitle: {
    fontSize: Math.min(30, SCREEN_WIDTH * 0.078),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: Math.min(38, SCREEN_WIDTH * 0.098),
    marginBottom: Math.min(18, SCREEN_HEIGHT * 0.02),
  },
  heroDescription: {
    fontSize: Math.min(15, SCREEN_WIDTH * 0.039),
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: Math.min(22, SCREEN_WIDTH * 0.057),
    marginBottom: Math.min(24, SCREEN_HEIGHT * 0.028),
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
    fontSize: Math.min(28, SCREEN_WIDTH * 0.072),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: Math.min(36, SCREEN_WIDTH * 0.092),
    marginBottom: Math.min(24, SCREEN_HEIGHT * 0.025),
  },
  artworkPlaceholder: {
    width: Math.min(SCREEN_WIDTH * 0.6, 240),
    height: Math.min(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.3),
    borderRadius: 16,
    backgroundColor: '#2D1B4E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.min(20, SCREEN_HEIGHT * 0.022),
    overflow: 'hidden',
  },
  artworkInner: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  artworkPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  originSubtitle: {
    fontSize: Math.min(14, SCREEN_WIDTH * 0.036),
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: Math.min(20, SCREEN_WIDTH * 0.052),
    paddingHorizontal: 12,
  },
  originMiddleText: {
    fontSize: Math.min(16, SCREEN_WIDTH * 0.042),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: Math.min(12, SCREEN_HEIGHT * 0.014),
    letterSpacing: 0.3,
  },

  // ---- Screen 3: Get Started ----
  screen3SafeArea: {
    flex: 1,
    width: '100%',
  },
  screen3Content: {
    flex: 1,
    paddingHorizontal: Math.min(28, SCREEN_WIDTH * 0.065),
    paddingTop: Math.min(SCREEN_HEIGHT * 0.07, 56),
    paddingBottom: Math.min(24, SCREEN_HEIGHT * 0.03),
    justifyContent: 'center',
  },
  screen3Title: {
    fontSize: Math.min(26, SCREEN_WIDTH * 0.068),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: Math.min(34, SCREEN_WIDTH * 0.088),
    marginBottom: Math.min(24, SCREEN_HEIGHT * 0.025),
  },

  // ---- Benefits ----
  benefitsContainer: {
    marginBottom: Math.min(28, SCREEN_HEIGHT * 0.03),
    flexShrink: 1,
    overflow: 'hidden',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Math.min(12, SCREEN_HEIGHT * 0.013),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  benefitIconContainer: {
    width: Math.min(40, SCREEN_WIDTH * 0.1),
    height: Math.min(40, SCREEN_WIDTH * 0.1),
    borderRadius: 10,
    backgroundColor: 'rgba(255,59,48,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Math.min(12, SCREEN_WIDTH * 0.03),
  },
  benefitEmoji: {
    fontSize: Math.min(20, SCREEN_WIDTH * 0.05),
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: Math.min(15, SCREEN_WIDTH * 0.039),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  benefitSubtitle: {
    fontSize: Math.min(12, SCREEN_WIDTH * 0.031),
    color: 'rgba(255,255,255,0.55)',
    lineHeight: Math.min(16, SCREEN_WIDTH * 0.042),
  },

  // ---- CTA Button ----
  ctaButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: Math.min(16, SCREEN_HEIGHT * 0.02),
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
    fontSize: Math.min(16, SCREEN_WIDTH * 0.042),
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ---- Dots ----
  dotsContainer: {
    position: 'absolute',
    bottom: Math.min(52, SCREEN_HEIGHT * 0.065),
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
