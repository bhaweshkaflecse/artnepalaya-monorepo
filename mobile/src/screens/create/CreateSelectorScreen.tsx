import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { lightColors } from '../../theme/colors';

type SelectorNavProp = NativeStackNavigationProp<any>;

interface CardItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
}

const cards: CardItem[] = [
  {
    id: 'artwork',
    title: 'Artwork Related Post',
    description: 'Share your artwork with the art community',
    icon: 'image',
    enabled: true,
  },
  {
    id: 'community',
    title: 'Community Post',
    description: 'Share thoughts and discussions',
    icon: 'message-circle',
    enabled: false,
  },
  {
    id: 'marketplace',
    title: 'Marketplace Post',
    description: 'List artwork for sale',
    icon: 'shopping-bag',
    enabled: false,
  },
];

export const CreateSelectorScreen = () => {
  const navigation = useNavigation<SelectorNavProp>();

  const handleCardPress = (card: CardItem) => {
    if (!card.enabled) return;
    if (card.id === 'artwork') {
      navigation.navigate('CreatePost');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create</Text>
          <Text style={styles.headerSubtitle}>Choose what you'd like to share</Text>
        </View>

        {/* Cards */}
        <View style={styles.cardList}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.card,
                card.enabled && styles.cardActive,
                !card.enabled && styles.cardLocked,
              ]}
              onPress={() => handleCardPress(card)}
              activeOpacity={card.enabled ? 0.7 : 1}
              disabled={!card.enabled}
            >
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.iconContainer,
                    card.enabled && styles.iconContainerActive,
                    !card.enabled && styles.iconContainerLocked,
                  ]}
                >
                  <Feather
                    name={card.icon}
                    size={26}
                    color={card.enabled ? lightColors.accent : '#9CA3AF'}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.cardTitle,
                      !card.enabled && styles.cardTitleLocked,
                    ]}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      !card.enabled && styles.cardDescriptionLocked,
                    ]}
                  >
                    {card.description}
                  </Text>
                </View>
                {card.enabled ? (
                  <View style={styles.arrowContainer}>
                    <Feather name="chevron-right" size={20} color={lightColors.accent} />
                  </View>
                ) : (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: lightColors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: lightColors.textSecondary,
    letterSpacing: 0.1,
  },
  cardList: {
    gap: 18,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: lightColors.border,
    paddingVertical: 22,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardActive: {
    borderLeftWidth: 3,
    borderLeftColor: lightColors.accent,
    borderColor: lightColors.border,
  },
  cardLocked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerActive: {
    backgroundColor: lightColors.accent + '12',
  },
  iconContainerLocked: {
    backgroundColor: '#F3F4F6',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardTitleLocked: {
    color: '#6B7280',
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: lightColors.textSecondary,
    lineHeight: 20,
  },
  cardDescriptionLocked: {
    color: '#9CA3AF',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: lightColors.accent + '0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: lightColors.accent + '30',
    backgroundColor: lightColors.accent + '08',
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: lightColors.accent,
    letterSpacing: 0.3,
  },
});
