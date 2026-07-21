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
import * as ImagePicker from 'expo-image-picker';
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

const SUB_ROLE_OPTIONS = [
  'Painter',
  'Sculptor',
  'Photographer',
  'Digital Artist',
  'Illustrator',
  'Calligrapher',
  'Printmaker',
  'Ceramicist',
  'Textile Artist',
  'Mixed Media Artist',
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
  'snapchat.com',
  'snap.com',
];

// Pinterest is explicitly ALLOWED - artists use it as a portfolio platform
const ALLOWED_DOMAINS = ['pinterest.com'];

// Maps blocked domains to friendly platform names for error messages
const DOMAIN_PLATFORM_NAMES: Record<string, string> = {
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'm.me': 'Facebook',
  'instagram.com': 'Instagram',
  'x.com': 'X/Twitter',
  'twitter.com': 'X/Twitter',
  'tiktok.com': 'TikTok',
  'threads.net': 'Threads',
  'linkedin.com': 'LinkedIn',
  'youtube.com': 'YouTube',
  'snapchat.com': 'Snapchat',
  'snap.com': 'Snapchat',
};

/**
 * Checks if a URL/value contains a blocked social media domain using proper
 * domain boundary matching. Avoids false positives like "proxy.com" matching "x.com".
 *
 * Returns the platform name if blocked, or null if allowed.
 */
function getBlockedPlatform(value: string): string | null {
  if (!value) return null;

  let normalized = value.toLowerCase().trim();

  // Strip protocol if present
  normalized = normalized.replace(/^https?:\/\//, '');

  // Strip trailing path/query/hash for domain extraction
  const domainPart = normalized.split('/')[0].split('?')[0].split('#')[0];

  // Check if explicitly allowed first (e.g., pinterest.com)
  for (const allowed of ALLOWED_DOMAINS) {
    if (domainPart === allowed || domainPart.endsWith('.' + allowed)) {
      return null;
    }
  }

  // Check against blocked domains with proper boundary matching
  for (const blocked of BLOCKED_SOCIAL_DOMAINS) {
    // Exact domain match (e.g., "facebook.com")
    if (domainPart === blocked) {
      return DOMAIN_PLATFORM_NAMES[blocked] || blocked;
    }
    // Subdomain match (e.g., "www.facebook.com", "m.facebook.com")
    if (domainPart.endsWith('.' + blocked)) {
      return DOMAIN_PLATFORM_NAMES[blocked] || blocked;
    }
  }

  return null;
}

/**
 * Validates that a value looks like a phone number (digits, +, spaces, dashes, parentheses).
 * Returns true if valid phone number format, false if it contains URL-like patterns.
 */
function isValidPhoneNumber(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;

  // Reject if it looks like a URL
  if (/(:\/\/|www\.|\.com|\.net|\.org|\.io)/i.test(trimmed)) {
    return false;
  }

  // Allow only digits, +, -, spaces, parentheses, and dots (common phone formats)
  return /^[\d\s+\-().]+$/.test(trimmed);
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
  const [contactPhone, setContactPhone] = useState((profile as any)?.contactPhone || '');
  const [selectedRole, setSelectedRole] = useState(displayUser?.role || 'Art Lover');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    (profile as any)?.interests || []
  );
  const [selectedSubRoles, setSelectedSubRoles] = useState<string[]>(
    (profile as any)?.subRoles || []
  );
  const [artworkTypes, setArtworkTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [contactError, setContactError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

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

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingAvatar(true);

      const formData = new FormData();
      const uriParts = asset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('avatar', {
        uri: asset.uri,
        name: `avatar.${fileType}`,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
      } as any);

      const response = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success && response.data.data) {
        setLocalAvatarUri(response.data.data.avatarUrl || asset.uri);
        dispatch(setProfile(response.data.data));
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Failed to upload photo. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploadingAvatar(true);
              const response = await api.delete('/users/me/avatar');
              if (response.data?.success && response.data.data) {
                setLocalAvatarUri(null);
                dispatch(setProfile(response.data.data));
                Alert.alert('Success', 'Profile photo removed.');
              }
            } catch (error: any) {
              const message = error?.response?.data?.error?.message || 'Failed to remove photo. Please try again.';
              Alert.alert('Error', message);
            } finally {
              setIsUploadingAvatar(false);
            }
          },
        },
      ]
    );
  };

  const validateContactFields = (): boolean => {
    // Validate website - check for blocked social domains
    const websiteVal = website.trim();
    if (websiteVal) {
      const blockedPlatform = getBlockedPlatform(websiteVal);
      if (blockedPlatform) {
        setContactError(`${blockedPlatform} profile links are not supported.`);
        return false;
      }
    }

    // Validate contactPhone - must be phone number only
    const phoneVal = contactPhone.trim();
    if (phoneVal) {
      if (!isValidPhoneNumber(phoneVal)) {
        setContactError('Please enter a valid phone number.');
        return false;
      }
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
        contactPhone: contactPhone.trim() || null,
        interests: selectedInterests,
        subRoles: selectedSubRoles,
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
    } catch (error: any) {
      // Surface actual backend validation error messages
      const backendMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        null;
      if (backendMessage) {
        // Check if the error is a field-specific validation error we can show inline
        const fieldPrefix = 'body.';
        if (backendMessage.startsWith(fieldPrefix)) {
          // Extract the message after "body.fieldName: "
          const withoutPrefix = backendMessage.substring(fieldPrefix.length);
          const colonIdx = withoutPrefix.indexOf(': ');
          const displayMsg = colonIdx >= 0
            ? withoutPrefix.substring(colonIdx + 2)
            : withoutPrefix;
          setContactError(displayMsg);
        } else {
          Alert.alert('Error', backendMessage);
        }
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
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
          <View style={styles.avatarWrapper}>
            {(localAvatarUri || displayUser?.avatarUrl) ? (
              <Image source={{ uri: localAvatarUri || displayUser?.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={36} color={lightColors.textSecondary} />
              </View>
            )}
            {isUploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={handlePickAvatar}
            disabled={isUploadingAvatar}
          >
            <Feather name="camera" size={14} color={lightColors.accent} />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
          {(localAvatarUri || displayUser?.avatarUrl) && (
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={handleRemoveAvatar}
              disabled={isUploadingAvatar}
            >
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
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
            placeholder="www.myportfoliowebsite.com"
            placeholderTextColor={lightColors.textSecondary}
            autoCapitalize="none"
            maxLength={200}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={contactPhone}
            onChangeText={(text) => { setContactPhone(text); setContactError(''); }}
            placeholder="Phone number"
            placeholderTextColor={lightColors.textSecondary}
            keyboardType="phone-pad"
            maxLength={50}
          />
          {!!contactError && (
            <Text style={styles.contactErrorText}>{contactError}</Text>
          )}
          <Text style={styles.contactHelperText}>
            Only Website and Phone Number are currently supported. Social media profile links are not accepted at this time.
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

        {/* Sub Roles */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Sub Roles</Text>
          <View style={styles.rolesContainer}>
            {SUB_ROLE_OPTIONS.map((subRole) => {
              const isSelected = selectedSubRoles.includes(subRole);
              return (
                <TouchableOpacity
                  key={subRole}
                  style={[
                    styles.roleChip,
                    isSelected && styles.roleChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedSubRoles((prev) =>
                      prev.includes(subRole)
                        ? prev.filter((r) => r !== subRole)
                        : [...prev, subRole]
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.roleLabel,
                      isSelected && styles.roleLabelSelected,
                    ]}
                  >
                    {subRole}
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
  avatarWrapper: {
    position: 'relative',
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
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: lightColors.accent + '12',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.accent,
    marginLeft: 6,
  },
  removePhotoBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  removePhotoText: {
    fontSize: 13,
    color: lightColors.textSecondary,
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
    lineHeight: 17,
  },
});
