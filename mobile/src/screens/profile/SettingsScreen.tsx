import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { lightColors } from '../../theme/colors';
import { userService } from '../../services/user.service';
import { useAppSelector, useAppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';

type SettingsNavProp = NativeStackNavigationProp<{
  CmsPage: { slug: string; title: string };
}>;

const CMS_PAGES = [
  { title: 'Privacy Policy', slug: 'privacy-policy' },
  { title: 'About Us', slug: 'about-us' },
  { title: 'Terms & Conditions', slug: 'terms-conditions' },
  { title: 'Community Guidelines', slug: 'community-guidelines' },
];

export const SettingsScreen = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const profile = useAppSelector((state) => state.user.profile);
  const dispatch = useAppDispatch();
  const [nsfwBlurEnabled, setNsfwBlurEnabled] = useState(
    (profile as any)?.nsfwBlurEnabled ?? true
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            dispatch(logout());
          },
        },
      ]
    );
  };

  const handleNsfwToggle = async (value: boolean) => {
    const previousValue = nsfwBlurEnabled;
    setNsfwBlurEnabled(value);
    try {
      await userService.updateProfile({ nsfwBlurEnabled: value } as any);
    } catch (_e) {
      setNsfwBlurEnabled(previousValue);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={lightColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Content Preferences */}
        <Text style={styles.sectionTitle}>Content Preferences</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Blur 18+ Content</Text>
            <Text style={styles.settingDesc}>
              Blur potentially sensitive or mature content in your feed
            </Text>
          </View>
          <Switch
            value={nsfwBlurEnabled}
            onValueChange={handleNsfwToggle}
            trackColor={{ false: lightColors.border, true: lightColors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        {CMS_PAGES.map((page) => (
          <TouchableOpacity
            key={page.slug}
            style={styles.linkRow}
            onPress={() => navigation.navigate('CmsPage' as any, { slug: page.slug, title: page.title })}
          >
            <Text style={styles.linkText}>{page.title}</Text>
            <Feather name="chevron-right" size={18} color={lightColors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: lightColors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  settingDesc: {
    fontSize: 13,
    color: lightColors.textSecondary,
    marginTop: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  linkText: {
    fontSize: 15,
    color: lightColors.textPrimary,
  },
  logoutSection: {
    marginTop: 40,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 10,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
