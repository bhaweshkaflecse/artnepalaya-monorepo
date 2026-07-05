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
import { userService, SearchUserResult } from '../../services/user.service';
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
  const [userResults, setUserResults] = useState<SearchUserResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Search logging: debounce 2000ms, fire when searchQuery has 2+ chars
  useEffect(() => {
    if (searchQuery.length < 2) return;
    const timer = setTimeout(() => {
      api.get('/tags', { params: { q: searchQuery } }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // User search: debounce 500ms, fire when searchQuery has 2+ chars
  useEffect(() => {
    if (userSearchTimerRef.current) {
      clearTimeout(userSearchTimerRef.current);
    }
    if (searchQuery.length < 2) {
      setUserResults([]);
      setIsSearchingUsers(false);
      return;
    }
    setIsSearchingUsers(true);
    userSearchTimerRef.current = setTimeout(async () => {
      try {
        const results = await userService.searchUsers(searchQuery, 20);
        setUserResults(results);
      } catch {
        setUserResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 500);
    return () => {
      if (userSearchTimerRef.current) {
        clearTimeout(userSearchTimerRef.current);
      }
    };
  }, [searchQuery]);

  const addToRecentSearches = useCallback((query: string) => {
    if (query.length < 2) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      return [query, ...filtered].slice(0, 5);
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.length >= 2) {
      addToRecentSearches(searchQuery);
    }
  }, [searchQuery, addToRecentSearches]);

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
              <Text style={styles.subtleLabelOverlay}>AI</Text>
            )}
            {(item as any).isNsfw === true && (
              <View style={styles.nsfwBadgeSmall}>
                <Text style={styles.badgeTextSmall}>18+</Text>
              </View>
            )}
          </View>
        )}
        {item.media && item.media.length > 1 && (
          <View style={styles.mediaBadge}>
            <Feather name="layers" size={10} color="#FFFFFF" />
            <Text style={styles.mediaBadgeText}>{item.media.length}</Text>
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
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
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

      {/* Recent Searches */}
      {isSearchFocused && searchQuery.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentSearchesContainer}>
          <View style={styles.recentSearchesHeader}>
            <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.recentSearchesClear}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((query, index) => (
            <TouchableOpacity
              key={`${query}-${index}`}
              style={styles.recentSearchItem}
              onPress={() => {
                setSearchQuery(query);
                addToRecentSearches(query);
              }}
            >
              <Feather name="clock" size={14} color={darkColors.textSecondary} />
              <Text style={styles.recentSearchItemText}>{query}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search Results Feedback */}
      {searchQuery.length > 0 && !isLoading && (
        <View style={styles.searchFeedback}>
          <Text style={styles.searchFeedbackText}>
            Showing results for '{searchQuery}' - {filteredPosts.length} artwork{filteredPosts.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* User Search Results */}
      {searchQuery.length >= 2 && userResults.length > 0 && (
        <View style={styles.userResultsContainer}>
          <Text style={styles.userResultsTitle}>Users</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userResultsScroll}>
            {userResults.map((user) => (
              <TouchableOpacity
                key={user._id}
                style={styles.userResultItem}
                onPress={() => navigation.navigate('UserProfile', { userId: user._id })}
              >
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.userResultAvatar} />
                ) : (
                  <View style={[styles.userResultAvatar, styles.userResultAvatarPlaceholder]}>
                    <Feather name="user" size={16} color={darkColors.textSecondary} />
                  </View>
                )}
                <Text style={styles.userResultName} numberOfLines={1}>@{user.username}</Text>
                {user.isVerified && (
                  <Feather name="check-circle" size={10} color="#3B82F6" style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  subtleLabelOverlay: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
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
  mediaBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  userResultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  userResultsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: darkColors.textSecondary,
    marginBottom: 8,
  },
  userResultsScroll: {
    gap: 12,
  },
  userResultItem: {
    alignItems: 'center',
    width: 72,
  },
  userResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userResultAvatarPlaceholder: {
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userResultName: {
    fontSize: 11,
    color: darkColors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  recentSearchesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentSearchesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: darkColors.textSecondary,
  },
  recentSearchesClear: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF3B30',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  recentSearchItemText: {
    fontSize: 14,
    color: darkColors.textPrimary,
  },
});
