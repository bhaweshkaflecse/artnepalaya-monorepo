// src/screens/onboarding/UserPreferenceSetup.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { safeDeleteItemAsync } from '../../utils/secureStore';
import { useAppDispatch } from '../../store';
import { clearNeedsUserOnboarding } from '../../store/slices/appSlice';
import { api } from '../../services/api';
import { lightColors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Role definitions
const ROLES = [
  {
    id: 'artist',
    label: 'Artist',
    icon: 'brush' as const,
    iconFamily: 'MaterialCommunityIcons' as const,
    subtitle: 'Showcase and sell your artwork',
  },
  {
    id: 'art_lover',
    label: 'Art Lover',
    icon: 'heart' as const,
    iconFamily: 'Feather' as const,
    subtitle: 'Discover and collect amazing pieces',
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'briefcase' as const,
    iconFamily: 'Feather' as const,
    subtitle: 'Connect with creative talent',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: 'image' as const,
    iconFamily: 'Feather' as const,
    subtitle: 'Manage your gallery online',
  },
];

// Sub-role definitions per role
const SUB_ROLES: Record<string, { id: string; label: string }[]> = {
  artist: [
    { id: 'painter', label: 'Painter' },
    { id: 'sculptor', label: 'Sculptor' },
    { id: 'digital_artist', label: 'Digital Artist' },
    { id: 'photographer', label: 'Photographer' },
    { id: 'mixed_media', label: 'Mixed Media' },
  ],
  art_lover: [
    { id: 'collector', label: 'Collector' },
    { id: 'enthusiast', label: 'Enthusiast' },
    { id: 'student', label: 'Student' },
    { id: 'critic', label: 'Critic' },
  ],
  business: [
    { id: 'gallery_owner', label: 'Gallery Owner' },
    { id: 'art_dealer', label: 'Art Dealer' },
    { id: 'frame_maker', label: 'Frame Maker' },
    { id: 'art_supply', label: 'Art Supply' },
  ],
  gallery: [
    { id: 'contemporary', label: 'Contemporary' },
    { id: 'traditional', label: 'Traditional' },
    { id: 'modern', label: 'Modern' },
    { id: 'mixed', label: 'Mixed' },
  ],
};

const MAX_INTERESTS = 5;

export const UserPreferenceSetup = () => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedSubRoles, setSelectedSubRoles] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [artworkTypes, setArtworkTypes] = useState<{ name: string; isActive: boolean }[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch artwork types when reaching step 3
  useEffect(() => {
    if (step === 3) {
      fetchArtworkTypes();
    }
  }, [step]);

  const fetchArtworkTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const response = await api.get('/config/artwork-types');
      if (response.data?.success && Array.isArray(response.data.data)) {
        const activeTypes = response.data.data
          .filter((t: any) => t.isActive)
          .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setArtworkTypes(activeTypes);
      }
    } catch (error: any) {
      console.warn('[UserPreferenceSetup] Failed to fetch artwork types:', error?.message);
      // Provide fallback types if API fails
      setArtworkTypes([
        { name: 'Painting', isActive: true },
        { name: 'Sculpture', isActive: true },
        { name: 'Photography', isActive: true },
        { name: 'Digital Art', isActive: true },
        { name: 'Mixed Media', isActive: true },
        { name: 'Illustration', isActive: true },
        { name: 'Printmaking', isActive: true },
        { name: 'Calligraphy', isActive: true },
      ]);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  const handleToggleSubRole = (subRoleId: string) => {
    setSelectedSubRoles((prev) =>
      prev.includes(subRoleId)
        ? prev.filter((id) => id !== subRoleId)
        : [...prev, subRoleId]
    );
  };

  const handleToggleInterest = (interestName: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestName)) {
        return prev.filter((name) => name !== interestName);
      }
      if (prev.length >= MAX_INTERESTS) {
        return prev;
      }
      return [...prev, interestName];
    });
  };

  const handleComplete = async () => {
    if (!selectedRole) return;

    // Map lowercase role IDs to the User model's exact enum values
    const roleMap: Record<string, string> = {
      'artist': 'Artist',
      'art_lover': 'Art Lover',
      'business': 'Business',
      'gallery': 'Gallery',
    };

    setIsSubmitting(true);
    try {
      await api.put('/users/me', {
        role: roleMap[selectedRole] || selectedRole,
        subRoles: selectedSubRoles,
        interests: selectedInterests,
      });

      // Clear the flag from SecureStore and Redux
      await safeDeleteItemAsync('needsUserOnboarding');
      dispatch(clearNeedsUserOnboarding());
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Failed to save preferences. Please try again.';
      Alert.alert('Error', message, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedRole) {
      Alert.alert('Select a Role', 'Please select your primary role to continue.');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    await safeDeleteItemAsync('needsUserOnboarding');
    dispatch(clearNeedsUserOnboarding());
  };

  const renderRoleIcon = (role: typeof ROLES[number]) => {
    if (role.iconFamily === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={role.icon as any} size={28} color={selectedRole === role.id ? '#FFFFFF' : lightColors.accent} />;
    }
    return <Feather name={role.icon as any} size={28} color={selectedRole === role.id ? '#FFFFFF' : lightColors.accent} />;
  };

  // Step 1: Role selection
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What brings you here?</Text>
      <Text style={styles.stepSubtitle}>Choose your primary role on ArtNepalaya</Text>

      <View style={styles.optionsGrid}>
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => setSelectedRole(role.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.roleIconWrap, isSelected && styles.roleIconWrapSelected]}>
                {renderRoleIcon(role)}
              </View>
              <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>
                {role.label}
              </Text>
              <Text style={[styles.roleSubtext, isSelected && styles.roleSubtextSelected]}>
                {role.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Step 2: Sub-role selection
  const renderStep2 = () => {
    const subRoles = selectedRole ? SUB_ROLES[selectedRole] || [] : [];
    const roleLabel = ROLES.find((r) => r.id === selectedRole)?.label || 'Your Role';

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Tell us more about you</Text>
        <Text style={styles.stepSubtitle}>
          Select categories that describe you as {roleLabel === 'Art Lover' ? 'an' : 'a'} {roleLabel}
        </Text>

        <View style={styles.chipContainer}>
          {subRoles.map((subRole) => {
            const isSelected = selectedSubRoles.includes(subRole.id);
            return (
              <TouchableOpacity
                key={subRole.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => handleToggleSubRole(subRole.id)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <Feather name="check" size={14} color="#FFFFFF" style={styles.chipCheckIcon} />
                )}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {subRole.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Step 3: Interests selection from API
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What interests you?</Text>
      <Text style={styles.stepSubtitle}>
        Select up to {MAX_INTERESTS} art types you are interested in ({selectedInterests.length}/{MAX_INTERESTS})
      </Text>

      {isLoadingTypes ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightColors.accent} />
          <Text style={styles.loadingText}>Loading art types...</Text>
        </View>
      ) : (
        <View style={styles.chipContainer}>
          {artworkTypes.map((type) => {
            const isSelected = selectedInterests.includes(type.name);
            const isDisabled = !isSelected && selectedInterests.length >= MAX_INTERESTS;
            return (
              <TouchableOpacity
                key={type.name}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  isDisabled && styles.chipDisabled,
                ]}
                onPress={() => handleToggleInterest(type.name)}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                {isSelected && (
                  <Feather name="check" size={14} color="#FFFFFF" style={styles.chipCheckIcon} />
                )}
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                    isDisabled && styles.chipTextDisabled,
                  ]}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with progress */}
      <View style={styles.header}>
        <Text style={styles.progressText}>Step {step} of 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color={lightColors.textPrimary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[styles.nextButton, !selectedRole && step === 1 && styles.nextButtonDisabled]}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={!selectedRole && step === 1}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, isSubmitting && styles.nextButtonDisabled]}
            onPress={handleComplete}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.completeButtonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Skip for now link */}
      <TouchableOpacity
        style={styles.skipLink}
        onPress={handleSkip}
        activeOpacity={0.6}
      >
        <Text style={styles.skipLinkText}>Skip for now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: lightColors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: lightColors.accent,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepContent: {
    flex: 1,
    paddingTop: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: lightColors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: lightColors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Role cards (Step 1)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2,
    backgroundColor: lightColors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: lightColors.border,
  },
  roleCardSelected: {
    backgroundColor: lightColors.accent,
    borderColor: lightColors.accent,
  },
  roleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleLabelSelected: {
    color: '#FFFFFF',
  },
  roleSubtext: {
    fontSize: 11,
    color: lightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  roleSubtextSelected: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Chip styles (Step 2 & 3)
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: lightColors.surface,
    borderWidth: 1.5,
    borderColor: lightColors.border,
  },
  chipSelected: {
    backgroundColor: lightColors.accent,
    borderColor: lightColors.accent,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipCheckIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextDisabled: {
    color: lightColors.textSecondary,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: lightColors.textSecondary,
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: lightColors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginLeft: 6,
  },
  backButtonPlaceholder: {
    width: 80,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightColors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightColors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  skipLinkText: {
    fontSize: 14,
    color: lightColors.textSecondary,
    textDecorationLine: 'underline',
  },
});
