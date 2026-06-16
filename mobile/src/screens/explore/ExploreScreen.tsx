import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { postService, Post } from '../../services/post.service';
import { getPrimaryImageUrl, getVideoThumbnailUrl } from '../../utils/media';
import { api } from '../../services/api';

const FALLBACK_CATEGORIES = ['All', 'Painting', 'Digital Art', 'Thangka', 'Sculpture', 'Illustration', 'Photography'];

const SkeletonGridItem: React.FC<{ index: number }> = ({ index }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const height = index % 2 === 0 ? 220 : 160;

  return (
    <Animated.View
      style={[
        styles.gridItem,
        { height, opacity, backgroundColor: '#2A2A2A' },
      ]}
    />
  );
};

const ExploreSkeleton: React.FC = () => {
  return (
    <View style={styles.skeletonGrid}>
      <View style={styles.skeletonColumn}>
        <SkeletonGridItem index={0} />
        <SkeletonGridItem index={2} />
        <SkeletonGridItem index={4} />
        <SkeletonGridItem index={6} />
      </View>
      <View style={styles.skeletonColumn}>
        <SkeletonGridItem index={1} />
        <SkeletonGridItem index={3} />
        <SkeletonGridItem index={5} />
        <SkeletonGridItem index={7} />
      </View>
    </View>
  );
};

export const ExploreScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await postService.getFeed(null, 30);
      setPosts(response.data);
      setCursor(response.meta.nextCursor);
      setHasMore(response.meta.hasNextPage);
    } catch (error: any) {
      console.warn('ExploreScreen fetchData failed:', error?.message || error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursor) return;
    setIsLoadingMore(true);
    try {
      const response = await postService.getFeed(cursor, 30);
      setPosts((prev) => [...prev, ...response.data]);
      setCursor(response.meta.nextCursor);
      setHasMore(response.meta.hasNextPage);
    } catch (error: any) {
      console.warn('ExploreScreen loadMore failed:', error?.message || error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore, isLoadingMore]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch dynamic artwork types for category pills
  useEffect(() => {
    const fetchArtworkTypes = async () => {
      try {
        const response = await api.get('/config/artwork-types');
        const data = response.data.data;
        if (data && Array.isArray(data) && data.length > 0) {
          setCategories(['All', ...data.map((t: { name: string }) => t.name)]);
        }
      } catch (_e) {
        // Fallback to hardcoded values if API fails
      }
    };
    fetchArtworkTypes();
  }, []);

  // Search logging: debounce 500ms, fire when searchQuery has 3+ chars
  useEffect(() => {
    if (searchQuery.length < 3) return;
    const timer = setTimeout(() => {
      api.get('/tags', { params: { q: searchQuery } }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCursor(null);
    setHasMore(true);
    fetchData();
  }, [fetchData]);

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      activeCategory === 'All' ||
      post.tags?.some((tag: string) => {
        return tag?.toLowerCase().includes(activeCategory.toLowerCase());
      });
    const matchesSearch =
      !searchQuery ||
      post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some((tag: string) => {
        return tag?.toLowerCase().includes(searchQuery.toLowerCase());
      }) ||
      post.authorId?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderItem = ({ item, index }: { item: Post; index: number }) => {
    const firstMedia = item.media?.[0];
    const imageUrl = firstMedia?.type === 'video' ? getVideoThumbnailUrl(firstMedia.url) : getPrimaryImageUrl(item.media);
    const height = index % 2 === 0 ? 220 : 160;

    return (
      <TouchableOpacity
        style={[styles.gridItem, { height }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.gridImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={24} color={darkColors.textSecondary} />
          </View>
        )}
        {/* Artist username overlay */}
        {item.authorId?.username && (
          <View style={styles.artistOverlay}>
            <Text style={styles.artistOverlayText} numberOfLines={1}>
              @{item.authorId.username}
            </Text>
          </View>
        )}
        {/* Content transparency badge overlays */}
        {(item.isHumanMade === false || (item as any).isNsfw === true) && (
          <View style={styles.badgeOverlay}>
            {item.isHumanMade === false && (
              <View style={styles.aiBadgeSmall}>
                <Text style={styles.badgeTextSmall}>AI</Text>
              </View>
            )}
            {(item as any).isNsfw === true && (
              <View style={styles.nsfwBadgeSmall}>
                <Text style={styles.badgeTextSmall}>18+</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={20} color={darkColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artworks, tags, or artists..."
            placeholderTextColor={darkColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color={darkColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                activeCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Results Feedback */}
      {searchQuery.length > 0 && !isLoading && (
        <View style={styles.searchFeedback}>
          <Text style={styles.searchFeedbackText}>
            Showing results for '{searchQuery}' - {filteredPosts.length} artwork{filteredPosts.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <ExploreSkeleton />
      ) : filteredPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={darkColors.textSecondary} />
          <Text style={styles.emptyStateText}>No posts found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={['#FFFFFF']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: darkColors.textPrimary,
    fontSize: 15,
  },
  categoryContainer: {
    paddingBottom: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: darkColors.surface,
  },
  categoryPillActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryText: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#000000',
  },
  gridContainer: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  gridItem: {
    width: '48.5%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    flex: 1,
  },
  skeletonColumn: {
    flex: 1,
    paddingHorizontal: 2,
  },
  searchFeedback: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchFeedbackText: {
    fontSize: 13,
    color: darkColors.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: darkColors.textSecondary,
  },
  artistOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  artistOverlayText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    gap: 3,
  },
  aiBadgeSmall: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nsfwBadgeSmall: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
