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
import { communityService } from '../../services/community.service';

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
        <Feather name={icon} size={22} color="#FF3B30" />
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

export const CommunityScreen = () => {
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinWaitlist = async () => {
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
    marginBottom: 24,
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
    color: '#999999',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
    color: '#999999',
    lineHeight: 20,
    marginBottom: 14,
  },
  itemList: {
    gap: 8,
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
