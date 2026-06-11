import React, { useState } from 'react';
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
import { communityService } from '../../services/community.service';
import { useAppSelector } from '../../store';
import { selectIsGuest } from '../../store/slices/authSlice';

type SegmentTab = 'community' | 'marketplace';

interface SectionCardProps {
  icon: string;
  title: string;
  description: string;
  items: string[];
}

const SectionCard = ({ icon, title, description, items }: SectionCardProps) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.iconContainer}>
        <Feather name={icon as any} size={22} color="#FF3B30" />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <Text style={styles.cardDescription}>{description}</Text>
    <View style={styles.itemList}>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemDot} />
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

const CommunityContent = () => {
  const navigation = useNavigation();
  const isGuest = useAppSelector(selectIsGuest);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinWaitlist = async () => {
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
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <SectionCard
        icon="calendar"
        title="Art Festivals & Gallery Openings"
        description="Discover upcoming local events celebrating Nepal's vibrant art scene, from traditional exhibitions to contemporary showcases."
        items={[
          'Kathmandu Art Festival 2025 - Dec 15',
          'Patan Gallery Night - Jan 8',
          'Bhaktapur Heritage Art Walk - Feb 3',
        ]}
      />

      <SectionCard
        icon="book-open"
        title="Workshops & Master Classes"
        description="Learn from master artists blending traditional Nepali techniques with modern digital tools in hands-on sessions."
        items={[
          'Thangka Painting with Karma Lama',
          'Digital Art Fundamentals',
          'Watercolor Landscapes - Pokhara Series',
        ]}
      />

      <SectionCard
        icon="award"
        title="Exhibitions & Competitions"
        description="Showcase your talent on a national stage and connect with galleries, collectors, and fellow artists."
        items={[
          'Nepal Art Biennial 2025',
          'Young Artists Challenge',
          'Himalayan Digital Art Awards',
        ]}
      />

      <TouchableOpacity
        style={[styles.waitlistButton, isJoining && styles.waitlistButtonDisabled]}
        onPress={handleJoinWaitlist}
        disabled={isJoining}
        activeOpacity={0.8}
      >
        <Feather name="bell" size={18} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.waitlistButtonText}>
          {isJoining ? 'Joining...' : 'Notify Me When Available'}
        </Text>
      </TouchableOpacity>
    </>
  );
};

const MarketplaceContent = () => {
  const navigation = useNavigation();
  const isGuest = useAppSelector(selectIsGuest);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSellerRegistration = async () => {
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
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <>
      <View style={styles.comingSoonContainer}>
        <View style={styles.comingSoonIconWrapper}>
          <Feather name="shopping-bag" size={48} color="#FF3B30" />
        </View>
        <Text style={styles.comingSoonTitle}>Marketplace Coming Soon</Text>
        <Text style={styles.comingSoonDescription}>
          Buy and sell original Nepali artwork directly from artists. Our marketplace
          will connect collectors with creators across Nepal.
        </Text>
      </View>

      <SectionCard
        icon="user-check"
        title="Seller Registration"
        description="Register as a verified seller to list your artwork when the marketplace launches. Early sellers get featured placement."
        items={[
          'Set up your artist storefront',
          'List paintings, prints, and digital art',
          'Secure payments with buyer protection',
          'Reach collectors worldwide',
        ]}
      />

      <SectionCard
        icon="clock"
        title="Marketplace Waitlist"
        description="Join the waitlist to be the first to know when buying and selling goes live. Early members receive exclusive benefits."
        items={[
          'Priority access on launch day',
          'Reduced commission for early sellers',
          'Exclusive collector badges',
          'Early notification of new listings',
        ]}
      />

      <TouchableOpacity
        style={[styles.waitlistButton, isRegistering && styles.waitlistButtonDisabled]}
        onPress={handleSellerRegistration}
        disabled={isRegistering}
        activeOpacity={0.8}
      >
        <Feather name="shopping-bag" size={18} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.waitlistButtonText}>
          {isRegistering ? 'Registering...' : 'Join Marketplace Waitlist'}
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>
            Connect with Nepal's creative world
          </Text>
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
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#AAAAAA',
    fontWeight: '400',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 21,
    marginBottom: 16,
  },
  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 10,
  },
  itemText: {
    fontSize: 14,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  comingSoonIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  comingSoonDescription: {
    fontSize: 15,
    color: '#BBBBBB',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
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
  buttonIcon: {
    marginRight: 8,
  },
  waitlistButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
