import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { communityService } from '../../services/community.service';
import { useAppSelector } from '../../store';
import { selectIsGuest } from '../../store/slices/authSlice';

type SegmentTab = 'community' | 'marketplace';

const CommunityContent = () => {
  const navigation = useNavigation();
  const isGuest = useAppSelector(selectIsGuest);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('communityWaitlistJoined').then((val) => {
      if (val === 'true') setHasJoined(true);
    });
  }, []);

  const handleJoinWaitlist = async () => {
    if (hasJoined) return;

    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Login to receive community event notifications.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth') },
        ]
      );
      return;
    }

    setIsJoining(true);
    try {
      const result = await communityService.joinWaitlist();
      Alert.alert('Success', result.message || 'You have been added to the waitlist!');
      setHasJoined(true);
      await SecureStore.setItemAsync('communityWaitlistJoined', 'true');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Something went wrong. Please try again.';
      // If already on waitlist, treat as success
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('waitlist')) {
        setHasJoined(true);
        await SecureStore.setItemAsync('communityWaitlistJoined', 'true');
      }
      Alert.alert('Info', message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      {/* Community Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Feather name="users" size={22} color="#FF3B30" />
          <Text style={styles.infoCardTitle}>Community</Text>
        </View>
        <Text style={styles.infoCardDescription}>
          Community features are currently in development.
        </Text>
        <Text style={styles.infoCardSubheading}>Coming soon:</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Feather name="calendar" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Art festivals and gallery openings</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="book-open" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Workshops and master classes</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="award" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Exhibitions and competitions</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="message-circle" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Artist discussion forums</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="video" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Live streaming and virtual events</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, (isJoining || hasJoined) && styles.ctaButtonDisabled]}
        onPress={handleJoinWaitlist}
        disabled={isJoining || hasJoined}
        activeOpacity={0.8}
      >
        <Feather name={hasJoined ? "check" : "bell"} size={18} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.ctaButtonText}>
          {hasJoined ? "\u2713 You're on the waitlist" : isJoining ? 'Joining...' : 'Notify Me When Available'}
        </Text>
      </TouchableOpacity>
    </>
  );
};

const MarketplaceContent = () => {
  const navigation = useNavigation();
  const isGuest = useAppSelector(selectIsGuest);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('marketplaceWaitlistJoined').then((val) => {
      if (val === 'true') setHasRegistered(true);
    });
  }, []);

  const handleSellerRegistration = async () => {
    if (hasRegistered) return;

    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Login to register as a seller on the marketplace.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth') },
        ]
      );
      return;
    }

    setIsRegistering(true);
    try {
      const result = await communityService.joinWaitlist();
      Alert.alert('Success', result.message || 'You have been added to the marketplace waitlist!');
      setHasRegistered(true);
      await SecureStore.setItemAsync('marketplaceWaitlistJoined', 'true');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Something went wrong. Please try again.';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('waitlist')) {
        setHasRegistered(true);
        await SecureStore.setItemAsync('marketplaceWaitlistJoined', 'true');
      }
      Alert.alert('Info', message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <>
      {/* Marketplace Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Feather name="shopping-bag" size={22} color="#FF3B30" />
          <Text style={styles.infoCardTitle}>Marketplace</Text>
        </View>
        <Text style={styles.infoCardDescription}>
          Sell artwork directly through ArtNepalaya.
        </Text>
        <Text style={styles.infoCardSubheading}>Coming soon:</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Feather name="shopping-cart" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Set up your artist storefront</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="image" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>List paintings, prints, and digital art</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="shield" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Secure payments with buyer protection</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="globe" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Reach collectors worldwide</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather name="percent" size={14} color="#FF3B30" />
            <Text style={styles.featureItemText}>Reduced commission for early sellers</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, (isRegistering || hasRegistered) && styles.ctaButtonDisabled]}
        onPress={handleSellerRegistration}
        disabled={isRegistering || hasRegistered}
        activeOpacity={0.8}
      >
        <Feather name={hasRegistered ? "check" : "shopping-bag"} size={18} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.ctaButtonText}>
          {hasRegistered ? "\u2713 You're on the waitlist" : isRegistering ? 'Registering...' : 'Join Marketplace Waitlist'}
        </Text>
      </TouchableOpacity>
    </>
  );
};

export const CommunityScreen = () => {
  const [activeTab, setActiveTab] = useState<SegmentTab>('community');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Community Hub</Text>
          <Text style={styles.heroSubtitle}>
            Connect with Nepal's creative world
          </Text>
          <View style={styles.statChipsRow}>
            <View style={styles.statChip}>
              <Feather name="users" size={12} color="#FF3B30" />
              <Text style={styles.statChipText}>2.5K Artists</Text>
            </View>
            <View style={styles.statChip}>
              <Feather name="image" size={12} color="#FF3B30" />
              <Text style={styles.statChipText}>10K+ Artworks</Text>
            </View>
            <View style={styles.statChip}>
              <Feather name="globe" size={12} color="#FF3B30" />
              <Text style={styles.statChipText}>15 Cities</Text>
            </View>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'community' && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab('community')}
            activeOpacity={0.7}
          >
            <Feather
              name="users"
              size={16}
              color={activeTab === 'community' ? '#FFFFFF' : '#888888'}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'community' && styles.segmentTextActive,
              ]}
            >
              Community
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'marketplace' && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab('marketplace')}
            activeOpacity={0.7}
          >
            <Feather
              name="shopping-bag"
              size={16}
              color={activeTab === 'marketplace' ? '#FFFFFF' : '#888888'}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'marketplace' && styles.segmentTextActive,
              ]}
            >
              Marketplace
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'community' ? <CommunityContent /> : <MarketplaceContent />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 24,
    marginTop: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '400',
    marginBottom: 16,
  },
  statChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FF3B30',
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginLeft: 10,
  },
  infoCardDescription: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    marginBottom: 16,
  },
  infoCardSubheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 12,
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureItemText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 10,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Legacy styles kept for backward compatibility
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    marginLeft: 8,
  },
  horizontalScroll: {
    paddingBottom: 16,
    gap: 12,
  },
  horizontalCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  horizontalCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  horizontalCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  horizontalCardDate: {
    fontSize: 11,
    color: '#888888',
  },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 10,
    fontWeight: '500',
  },
  sellerCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sellerCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sellerCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sellerCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  sellerCardDesc: {
    fontSize: 11,
    color: '#888888',
    lineHeight: 16,
  },
  waitlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  waitlistButtonDisabled: {
    opacity: 0.6,
  },
  waitlistButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
