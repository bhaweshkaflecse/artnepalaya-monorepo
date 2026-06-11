import React, { useState } from 'react';
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

const ROLE_OPTIONS = [
  { label: 'Artist', emoji: '🎨', value: 'Artist' },
  { label: 'Gallery', emoji: '🏛️', value: 'Gallery' },
  { label: 'Business', emoji: '💼', value: 'Business' },
  { label: 'Art Lover', emoji: '❤️', value: 'Art Lover' },
];

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
  const [selectedRole, setSelectedRole] = useState(displayUser?.role || 'Art Lover');
  const [isSaving, setIsSaving] = useState(false);

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

    setIsSaving(true);
    try {
      const updatedUser = await userService.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        role: selectedRole,
      } as any);
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
});
