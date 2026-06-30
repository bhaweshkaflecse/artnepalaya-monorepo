import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { lightColors } from '../../theme/colors';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest } from '../../store/slices/authSlice';
import { userService } from '../../services/user.service';
import { setProfile } from '../../store/slices/userSlice';
import { api } from '../../services/api';

const ROLE_OPTIONS = [
  { label: 'Artist', emoji: '🎨', value: 'Artist' },
  { label: 'Gallery', emoji: '🏛️', value: 'Gallery' },
  { label: 'Business', emoji: '💼', value: 'Business' },
  { label: 'Art Lover', emoji: '❤️', value: 'Art Lover' },
];

const BLOCKED_SOCIAL_DOMAINS = [
  'facebook.com',
  'fb.com',
  'm.facebook.com',
  'm.me',
  'instagram.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'threads.net',
  'linkedin.com',
  'youtube.com',
];

function containsBlockedSocialDomain(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return BLOCKED_SOCIAL_DOMAINS.some((domain) => lower.includes(domain));
}

export const EditProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector(selectIsGuest);
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.user.profile);

  const displayUser = profile || authUser;

  const [fullName, setFullName] = useState(displayUser?.fullName || '');
  const [username, setUsername] = useState(displayUser?.username || '');
  const [bio, setBio] = useState((profile as any)?.bio || '');
  const [location, setLocation] = useState((profile as any)?.location || '');
  const [website, setWebsite] = useState((profile as any)?.website || '');
  const [whatsapp, setWhatsapp] = useState((profile as any)?.whatsapp || '');
  const [contactPhone, setContactPhone] = useState((profile as any)?.contactPhone || '');
  const [selectedRole, setSelectedRole] = useState(displayUser?.role || 'Art Lover');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    (profile as any)?.interests || []
  );
  const [artworkTypes, setArtworkTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const fetchArtworkTypes = async () => {
      try {
        const response = await api.get('/config/artwork-types');
        if (response.data?.success && Array.isArray(response.data.data)) {
          const activeTypes = response.data.data
            .filter((t: any) => t.isActive !== false)
            .map((t: any) => t.name);
          setArtworkTypes(activeTypes);
        }
      } catch (_e) {
        // Silently fail - interests section just won't show types
      }
    };
    fetchArtworkTypes();
  }, []);

  const validateContactFields = (): boolean => {
    if (containsBlockedSocialDomain(website.trim())) {
      setContactError('Social media links are currently not supported.');
      return false;
    }
    if (containsBlockedSocialDomain(whatsapp.trim())) {
      setContactError('Social media links are currently not supported.');
      return false;
    }
    setContactError('');
    return true;
  };

  const handleSave = async () => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Login to customize your profile, update your bio, upload artwork, and join the community.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth') },
        ]
      );
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required.');
      return;
    }

    if (!validateContactFields()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        location: location.trim() || null,
        website: website.trim() || null,
        whatsapp: whatsapp.trim() || null,
        contactPhone: contactPhone.trim() || null,
        interests: selectedInterests,
      };
      // Only include role if it's a valid non-admin role (Admin role cannot be changed via this form)
      const validRoles = ['Artist', 'Art Lover', 'Business', 'Gallery'];
      if (validRoles.includes(selectedRole)) {
        payload.role = selectedRole;
      }
      const updatedUser = await userService.updateProfile(payload);
      dispatch(setProfile(updatedUser));
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (_e) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={lightColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={lightColors.accent} />
          ) : (
            <Text style={styles.saveBtn}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Guest Login Banner */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <Feather name="log-in" size={18} color="#2563EB" style={styles.guestBannerIcon} />
            <Text style={styles.guestBannerText}>
              Login to customize your profile, update your bio, upload artwork, and join the community.
            </Text>
          </View>
        )}

        {/* Avatar Preview */}
        <View style={styles.avatarSection}>
          {displayUser?.avatarUrl ? (
            <Image source={{ uri: displayUser.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={36} color={lightColors.textSecondary} />
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={lightColors.textSecondary}
            maxLength={100}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={lightColors.textSecondary}
            autoCapitalize="none"
            maxLength={50}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor={lightColors.textSecondary}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/300</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country"
            placeholderTextColor={lightColors.textSecondary}
            maxLength={100}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Information</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={(text) => { setWebsite(text); setContactError(''); }}
            placeholder="https://yourwebsite.com"
            placeholderTextColor={lightColors.textSecondary}
            autoCapitalize="none"
            maxLength={200}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={whatsapp}
            onChangeText={(text) => { setWhatsapp(text); setContactError(''); }}
            placeholder="WhatsApp number or link"
            placeholderTextColor={lightColors.textSecondary}
            autoCapitalize="none"
            maxLength={200}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Contact phone number"
            placeholderTextColor={lightColors.textSecondary}
            keyboardType="phone-pad"
            maxLength={50}
          />
          {!!contactError && (
            <Text style={styles.contactErrorText}>{contactError}</Text>
          )}
          <Text style={styles.contactHelperText}>
            Only Website, WhatsApp and Phone are currently accepted.
          </Text>
        </View>

        {/* Artwork Role Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Artwork Role</Text>
          <View style={styles.rolesContainer}>
            {ROLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.roleChip,
                  selectedRole === option.value && styles.roleChipSelected,
                ]}
                onPress={() => setSelectedRole(option.value)}
              >
                <Text style={styles.roleEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.roleLabel,
                    selectedRole === option.value && styles.roleLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Art Interests */}
        {artworkTypes.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Art Interests</Text>
            <View style={styles.rolesContainer}>
              {artworkTypes.map((type) => {
                const isSelected = selectedInterests.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.roleChip,
                      isSelected && styles.roleChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedInterests((prev) =>
                        prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type]
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.roleLabel,
                        isSelected && styles.roleLabelSelected,
                      ]}
                    >
                      {type}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="check"
                        size={14}
                        color={lightColors.accent}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: lightColors.accent,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: lightColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lightColors.textPrimary,
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: lightColors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
  },
  roleChipSelected: {
    borderColor: lightColors.accent,
    backgroundColor: lightColors.accent + '15',
  },
  roleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: lightColors.textSecondary,
  },
  roleLabelSelected: {
    color: lightColors.accent,
    fontWeight: '600',
  },
  guestBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  guestBannerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  guestBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 20,
  },
  contactErrorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
  },
  contactHelperText: {
    fontSize: 12,
    color: lightColors.textSecondary,
    marginTop: 8,
  },
});
