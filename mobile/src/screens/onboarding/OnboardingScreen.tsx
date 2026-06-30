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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch, useAppSelector } from '../../store';
import { setOnboardingComplete } from '../../store/slices/appSlice';
import { selectIsGuest } from '../../store/slices/authSlice';
import { api } from '../../services/api';
import { userService } from '../../services/user.service';

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
  {
    id: '4',
    icon: 'heart',
    title: 'Choose Your Interests',
    subtitle:
      'Select the art styles you love. We\'ll personalize your experience based on your preferences.',
    backgroundColor: '#1A3A2A',
  },
];

export const OnboardingScreen = () => {
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector(selectIsGuest);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [artworkTypes, setArtworkTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const flatListRef = useRef<any>(null);

  useEffect(() => {
    const fetchArtworkTypes = async () => {
      setLoadingTypes(true);
      try {
        const response = await api.get('/config/artwork-types');
        if (response.data?.success && Array.isArray(response.data.data)) {
          const activeTypes = response.data.data
            .filter((t: any) => t.isActive !== false)
            .map((t: any) => t.name);
          setArtworkTypes(activeTypes);
        }
      } catch (_e) {
        // Silently fail - the user can still skip
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchArtworkTypes();
  }, []);

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

  const handleComplete = async () => {
    if (selectedInterests.length > 0 && !isGuest) {
      setSavingInterests(true);
      try {
        await userService.updateProfile({ interests: selectedInterests });
      } catch (_e) {
        // Silently fail - preferences are optional, proceed with onboarding
      } finally {
        setSavingInterests(false);
      }
    }
    await handleGetStarted();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const toggleInterest = (type: string) => {
    setSelectedInterests((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    // 4th slide: Preference selection
    if (item.id === '4') {
      return (
        <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Feather name="heart" size={56} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>

          {/* Artwork type chips */}
          <View style={styles.chipsOuterContainer}>
            {loadingTypes ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : artworkTypes.length > 0 ? (
              <ScrollView
                style={styles.chipsScrollView}
                contentContainerStyle={styles.chipsContainer}
                showsVerticalScrollIndicator={false}
              >
                {artworkTypes.map((type) => {
                  const isSelected = selectedInterests.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      onPress={() => toggleInterest(type)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                      {isSelected && (
                        <Feather name="check" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.noTypesText}>No artwork types available</Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.prefButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, savingInterests && { opacity: 0.7 }]}
              onPress={handleComplete}
              disabled={savingInterests}
            >
              {savingInterests ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {selectedInterests.length > 0 ? 'Complete' : 'Complete'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipActionButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.skipActionText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Intro slides (1-3): existing behavior
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Feather name={item.icon as any} size={56} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        {index === 2 ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
            <Text style={styles.actionButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
            <Text style={styles.actionButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
    marginBottom: 24,
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
  // Preference slide styles
  chipsOuterContainer: {
    width: '100%',
    maxHeight: 180,
    marginBottom: 24,
    alignItems: 'center',
  },
  chipsScrollView: {
    maxHeight: 180,
    width: '100%',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255,59,48,0.3)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noTypesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  prefButtonsContainer: {
    alignItems: 'center',
    gap: 12,
  },
  skipActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  skipActionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
});
