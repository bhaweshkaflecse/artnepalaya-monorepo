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
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { lightColors } from '../../theme/colors';
import { userService } from '../../services/user.service';
import { useAppSelector, useAppDispatch } from '../../store';
import { logout, selectIsGuest } from '../../store/slices/authSlice';

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
  const isGuest = useAppSelector(selectIsGuest);
  const dispatch = useAppDispatch();
  const [nsfwBlurEnabled, setNsfwBlurEnabled] = useState(
    (profile as any)?.nsfwBlurEnabled ?? true
  );
  const [showNsfwModal, setShowNsfwModal] = useState(false);

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
    if (!value) {
      // User is turning OFF the filter - show confirmation modal
      setShowNsfwModal(true);
      return;
    }

    // Turning ON the filter - no confirmation needed
    setNsfwBlurEnabled(true);
    if (isGuest) {
      await SecureStore.setItemAsync('nsfwBlurEnabled', 'true');
    } else {
      try {
        await userService.updateProfile({ nsfwBlurEnabled: true } as any);
      } catch (_e) {
        setNsfwBlurEnabled(false);
        Alert.alert('Error', 'Failed to update setting. Please try again.');
      }
    }
  };

  const handleConfirmNsfw = async () => {
    setShowNsfwModal(false);
    setNsfwBlurEnabled(false);
    if (isGuest) {
      await SecureStore.setItemAsync('nsfwBlurEnabled', 'false');
    } else {
      try {
        await userService.updateProfile({ nsfwBlurEnabled: false } as any);
      } catch (_e) {
        setNsfwBlurEnabled(true);
        Alert.alert('Error', 'Failed to update setting. Please try again.');
      }
    }
  };

  const handleCancelNsfw = () => {
    setShowNsfwModal(false);
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

      {/* Adult Content Confirmation Modal */}
      <Modal
        visible={showNsfwModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelNsfw}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Feather name="alert-triangle" size={28} color="#DC2626" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Adult Content Confirmation</Text>
            <Text style={styles.modalBody}>
              {'You are about to disable the 18+ content filter.\n\nBy continuing you confirm:\n\n\u2022 You are at least 18 years old\n\u2022 You agree to ArtNepalaya Terms and Privacy Policy\n\u2022 Adult content may appear in your feed'}
            </Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmNsfw}>
              <Text style={styles.modalConfirmText}>I Am 18+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCancelNsfw}>
              <Text style={styles.modalCancelText}>Keep Filter On</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalBody: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 24,
    width: '100%',
  },
  modalConfirmBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});
