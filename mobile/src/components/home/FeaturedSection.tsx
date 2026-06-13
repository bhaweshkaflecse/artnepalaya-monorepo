import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { darkColors } from '../../theme/colors';
import { Post } from '../../services/post.service';
import { getPrimaryImageUrl } from '../../utils/media';
import { Feather } from '@expo/vector-icons';
import { FeaturedSkeleton } from '../common/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_SPACING = 12;

interface FeaturedProps {
  posts: Post[];
  loading?: boolean;
}

export const FeaturedSection: React.FC<FeaturedProps> = ({ posts, loading }) => {
  const navigation = useNavigation<any>();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Feather name="award" size={16} color={darkColors.accent} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Featured This Week</Text>
            <Text style={styles.subtitle}>Curated picks from our editors</Text>
          </View>
        </View>
        <FeaturedSkeleton />
      </View>
    );
  }

  if (!posts || posts.length === 0) return null;

  const renderCard = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
    >
      <Image source={{ uri: getPrimaryImageUrl(item.media) }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={styles.artist} numberOfLines={1}>
          {item.authorId.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="award" size={16} color={darkColors.accent} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Featured This Week</Text>
          <Text style={styles.subtitle}>Curated picks from our editors</Text>
        </View>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTextContainer: {
    marginLeft: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: CARD_WIDTH,
    height: 270,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: CARD_SPACING,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: darkColors.surface,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  artist: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
