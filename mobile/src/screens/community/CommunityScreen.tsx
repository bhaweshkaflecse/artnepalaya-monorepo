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

interface HorizontalCardProps {
  icon: string;
  title: string;
  date?: string;
}

const HorizontalCard = ({ icon, title, date }: HorizontalCardProps) => (
  <View style={styles.horizontalCard}>
    <View style={styles.horizontalCardIcon}>
      <Feather name={icon as any} size={18} color="#FF3B30" />
    </View>
    <Text style={styles.horizontalCardTitle} numberOfLines={2}>{title}</Text>
    {date && <Text style={styles.horizontalCardDate}>{date}</Text>}
  </View>
);

interface BenefitItemProps {
  text: string;
}

const BenefitItem = ({ text }: BenefitItemProps) => (
  <View style={styles.benefitRow}>
    <Feather name="check-circle" size={16} color="#FF3B30" />
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

interface SellerBenefitCardProps {
  icon: string;
  title: string;
  description: string;
}

const SellerBenefitCard = ({ icon, title, description }: SellerBenefitCardProps) => (
  <View style={styles.sellerCard}>
    <View style={styles.sellerCardIcon}>
      <Feather name={icon as any} size={20} color="#FF3B30" />
    </View>
    <Text style={styles.sellerCardTitle}>{title}</Text>
    <Text style={styles.sellerCardDesc}>{description}</Text>
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
      {/* Events Section */}
      <View style={styles.sectionHeader}>
        <Feather name="calendar" size={16} color="#FF3B30" />
        <Text style={styles.sectionTitle}>Art Festivals & Gallery Openings</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        <HorizontalCard icon="map-pin" title="Kathmandu Art Festival 2025" date="Dec 15" />
        <HorizontalCard icon="map-pin" title="Patan Gallery Night" date="Jan 8" />
        <HorizontalCard icon="map-pin" title="Bhaktapur Heritage Art Walk" date="Feb 3" />
      </ScrollView>

      {/* Workshops Section */}
      <View style={styles.sectionHeader}>
        <Feather name="book-open" size={16} color="#FF3B30" />
        <Text style={styles.sectionTitle}>Workshops & Master Classes</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        <HorizontalCard icon="pen-tool" title="Thangka Painting with Karma Lama" />
        <HorizontalCard icon="monitor" title="Digital Art Fundamentals" />
        <HorizontalCard icon="droplet" title="Watercolor Landscapes - Pokhara Series" />
      </ScrollView>

      {/* Exhibitions Section */}
      <View style={styles.sectionHeader}>
        <Feather name="award" size={16} color="#FF3B30" />
        <Text style={styles.sectionTitle}>Exhibitions & Competitions</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        <HorizontalCard icon="star" title="Nepal Art Biennial 2025" />
        <HorizontalCard icon="zap" title="Young Artists Challenge" />
        <HorizontalCard icon="globe" title="Himalayan Digital Art Awards" />
      </ScrollView>

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
      {/* Benefits Checklist */}
      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>Why sell on Artnepalaya?</Text>
        <BenefitItem text="Set up your artist storefront" />
        <BenefitItem text="List paintings, prints, and digital art" />
        <BenefitItem text="Secure payments with buyer protection" />
        <BenefitItem text="Reach collectors worldwide" />
        <BenefitItem text="Priority access on launch day" />
        <BenefitItem text="Reduced commission for early sellers" />
      </View>

      {/* CTA */}
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

      {/* Seller Benefit Cards */}
      <View style={styles.sellerCardsRow}>
        <SellerBenefitCard
          icon="trending-up"
          title="Featured Placement"
          description="Early sellers get featured on the homepage"
        />
        <SellerBenefitCard
          icon="percent"
          title="Low Commission"
          description="Reduced fees for founding sellers"
        />
      </View>
      <View style={styles.sellerCardsRow}>
        <SellerBenefitCard
          icon="shield"
          title="Verified Badge"
          description="Build trust with collector verification"
        />
        <SellerBenefitCard
          icon="users"
          title="Community"
          description="Connect with collectors and artists"
        />
      </View>
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
    backgroundColor: '#0A0A0A',
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
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#AAAAAA',
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
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  horizontalScroll: {
    paddingBottom: 16,
    gap: 12,
  },
  horizontalCard: {
    width: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  horizontalCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  horizontalCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  horizontalCardDate: {
    fontSize: 11,
    color: 'gray',
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#E0E0E0',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sellerCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sellerCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sellerCardDesc: {
    fontSize: 11,
    color: 'gray',
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
  buttonIcon: {
    marginRight: 8,
  },
  waitlistButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
