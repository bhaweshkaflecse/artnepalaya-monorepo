import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Dimensions,
  Share,
  Animated,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { Post, postService } from '../../services/post.service';
import { getPrimaryImageUrl, getVideoThumbnailUrl, getOptimizedImageUrl } from '../../utils/media';
import { ReportModal } from '../common/ReportModal';
import { ShareService } from '../../utils/urls';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, selectUser, logout } from '../../store/slices/authSlice';
import { toggleLike, toggleSave, removePost as removeFeedPost } from '../../store/slices/feedSlice';
import { removePost as removeUserPost } from '../../store/slices/userSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
}

const PostCardInner: React.FC<PostCardProps> = ({ post }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isGuest = useAppSelector(selectIsGuest);
  const currentUser = useAppSelector(selectUser);
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false);
  const [isSaved, setIsSaved] = useState(post.isSavedByMe || false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showLikedByModal, setShowLikedByModal] = useState(false);
  const [likedByUsers, setLikedByUsers] = useState<Array<{ _id: string; username: string; avatarUrl?: string; fullName?: string }>>([]);
  const [likedByLoading, setLikedByLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const mediaIndexRef = useRef(0);
  const videoRef = useRef<Video>(null);

  const isOwnPost = currentUser && post.authorId._id === currentUser.id;

  useEffect(() => { setIsLiked(post.isLikedByMe || false); }, [post.isLikedByMe]);
  useEffect(() => { setIsSaved(post.isSavedByMe || false); }, [post.isSavedByMe]);

  // Unmount video and pause on navigation blur - NEVER auto-resume on focus
  useFocusEffect(
    useCallback(() => {
      // Screen focused: do NOT resume video. User must tap play again.
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setIsPlaying(false);
        setIsVideoMounted(false);
      };
    }, [])
  );

  // Unload video on unmount to prevent OutOfMemoryError
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // Single/double-tap detection
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear tap timeout on unmount to prevent navigation on unmounted component
  React.useEffect(() => {
    return () => {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
    };
  }, []);

  // Heart animation values
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const showLoginAlert = () => {
    Alert.alert(
      'Login Required',
      'Login to like and save artwork.',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Login', onPress: () => { dispatch(logout()); } },
      ]
    );
  };

  const triggerHeartAnimation = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.delay(400),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleImageTap = () => {
    const now = Date.now();
    const delta = now - lastTap.current;
    lastTap.current = now;

    if (delta < 300) {
      // Double-tap detected - cancel the single-tap timeout
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      // Perform like action
      if (isGuest) {
        showLoginAlert();
        return;
      }
      if (!isLiked) {
        setIsLiked(true);
        dispatch(toggleLike(post._id));
        postService.likePost(post._id).catch(() => {
          setIsLiked(false);
          dispatch(toggleLike(post._id));
        });
      }
      triggerHeartAnimation();
    } else {
      // First tap - set timeout for single-tap navigation
      tapTimeout.current = setTimeout(() => {
        tapTimeout.current = null;
        navigation.navigate('PostDetail', { postId: post._id, initialMediaIndex: mediaIndexRef.current });
      }, 300);
    }
  };

  const handleMomentumScrollEnd = useCallback((e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const previousIndex = mediaIndexRef.current;
    mediaIndexRef.current = index;
    setCurrentMediaIndex(index);
    // Unmount video when scrolling away from a video slide
    if (previousIndex !== index && post.media[previousIndex]?.type === 'video') {
      setIsPlaying(false);
      setIsVideoMounted(false);
    }
  }, [post.media]);

  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  const handleVideoTap = useCallback(() => {
    if (!isVideoMounted) {
      // First tap on play overlay: mount the Video component and auto-play
      setIsVideoMounted(true);
      setIsPlaying(true);
    } else {
      // Video is already mounted (playing or paused): navigate to detail
      navigation.navigate('PostDetail', { postId: post._id, initialMediaIndex: mediaIndexRef.current });
    }
  }, [isVideoMounted, navigation, post._id]);

  const renderMediaItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const isVideo = item.type === 'video';
    const isActive = index === currentMediaIndex;

    if (isVideo && item.url) {
      // Only mount Video if user explicitly tapped play
      if (isVideoMounted && isActive) {
        const shouldPlay = isPlaying && isFocused;
        return (
          <TouchableWithoutFeedback onPress={handleVideoTap}>
            <View style={[styles.imageWrapper, { width: SCREEN_WIDTH }]}>
              <Video
                ref={videoRef}
                source={{ uri: item.url }}
                style={styles.image}
                resizeMode={ResizeMode.COVER}
                shouldPlay={shouldPlay}
                isLooping
                isMuted={false}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded && status.durationMillis) {
                    setPlaybackProgress(status.positionMillis / status.durationMillis);
                  }
                }}
              />
              {!shouldPlay && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="pause" size={48} color="rgba(255,255,255,0.85)" />
                </View>
              )}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${playbackProgress * 100}%` }]} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        );
      }

      // Default: show thumbnail with play button overlay (Video NOT mounted)
      return (
        <TouchableWithoutFeedback onPress={handleVideoTap}>
          <View style={[styles.imageWrapper, { width: SCREEN_WIDTH }]}>
            <Image
              source={{ uri: getVideoThumbnailUrl(item.url) }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.videoOverlay}>
              <Feather name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    const imageUrl = item.url ? getOptimizedImageUrl(item.url) : '';
    return (
      <TouchableWithoutFeedback onPress={handleImageTap}>
        <View style={[styles.imageWrapper, { width: SCREEN_WIDTH }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="image" size={48} color={darkColors.textSecondary} />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }, [currentMediaIndex, isFocused, isPlaying, isVideoMounted, handleImageTap, handleVideoTap]);

  const handleOpenLikedBy = async () => {
    setShowLikedByModal(true);
    setLikedByLoading(true);
    try {
      const users = await postService.getPostLikes(post._id);
      setLikedByUsers(users);
    } catch {
      setLikedByUsers([]);
    } finally {
      setLikedByLoading(false);
    }
  };

  // Compute displayed like count with optimistic update
  const getDisplayedLikeCount = (): number => {
    const serverCount = post.likesCount || 0;
    if (isLiked && !post.isLikedByMe) {
      return serverCount + 1;
    }
    if (!isLiked && post.isLikedByMe) {
      return Math.max(0, serverCount - 1);
    }
    return serverCount;
  };

  const displayedLikeCount = getDisplayedLikeCount();

  const navigateToProfile = () => {
    if (currentUser && post.authorId._id === currentUser.id) {
      navigation.navigate('MainTabs' as any, { screen: 'Profile' } as any);
    } else {
      navigation.navigate('UserProfile', { userId: post.authorId._id });
    }
  };

  const handleLike = async () => {
    if (isGuest) {
      showLoginAlert();
      return;
    }
    const newValue = !isLiked;
    setIsLiked(newValue);
    dispatch(toggleLike(post._id));
    try {
      if (newValue) {
        await postService.likePost(post._id);
      } else {
        await postService.unlikePost(post._id);
      }
    } catch {
      setIsLiked(!newValue);
      dispatch(toggleLike(post._id));
    }
  };

  const handleSave = async () => {
    if (isGuest) {
      showLoginAlert();
      return;
    }
    const newValue = !isSaved;
    setIsSaved(newValue);
    dispatch(toggleSave(post._id));
    try {
      if (newValue) {
        await postService.savePost(post._id);
      } else {
        await postService.unsavePost(post._id);
      }
    } catch {
      setIsSaved(!newValue);
      dispatch(toggleSave(post._id));
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this artwork on ArtNepalaya!\n${ShareService.generatePostUrl(post._id)}`,
      });
    } catch (error) {
      // Silently handle share cancellation
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={navigateToProfile}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {post.authorId.avatarUrl ? (
              <Image source={{ uri: post.authorId.avatarUrl }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={16} color={darkColors.textSecondary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.username}>{post.authorId.username}</Text>
              {(post.authorId as any).isVerified && (
                <Feather name="check-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (isOwnPost) {
              setShowOptionsMenu(!showOptionsMenu);
            } else {
              setShowReportModal(true);
            }
          }}
          style={styles.moreBtn}
        >
          <Feather name="more-horizontal" size={20} color={darkColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Owner Options Menu */}
      {showOptionsMenu && (
        <View style={styles.optionsMenu}>
          <TouchableOpacity
            style={styles.optionsMenuItem}
            onPress={() => {
              setShowOptionsMenu(false);
              navigation.navigate('EditPost' as never, { postId: post._id, post } as never);
            }}
          >
            <Feather name="edit-2" size={18} color="#FFFFFF" />
            <Text style={styles.optionsMenuText}>Edit Artwork</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionsMenuItem, styles.optionsMenuItemLast]}
            onPress={() => {
              setShowOptionsMenu(false);
              Alert.alert(
                'Delete Artwork?',
                'This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await postService.deletePost(post._id);
                        dispatch(removeFeedPost(post._id));
                        dispatch(removeUserPost(post._id));
                      } catch {
                        Alert.alert('Error', 'Failed to delete post.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Feather name="trash-2" size={18} color="#FF3B30" />
            <Text style={[styles.optionsMenuText, { color: '#FF3B30' }]}>Delete Artwork</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Media Carousel with single-tap (PostDetail) and double-tap (like) */}
      <View style={styles.mediaContainer}>
        <FlatList
          data={post.media}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          renderItem={renderMediaItem}
        />
        {/* Heart animation overlay */}
        <Animated.View
          style={[
            styles.heartOverlay,
            {
              transform: [{ scale: heartScale }],
              opacity: heartOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={80} color="#FFFFFF" />
        </Animated.View>
        {/* Media count badge */}
        {post.media && post.media.length > 1 && (
          <View style={styles.mediaBadge}>
            <Feather name="layers" size={12} color="#FFFFFF" />
            <Text style={styles.mediaBadgeText}>{post.media.length}</Text>
          </View>
        )}
      </View>

      {/* Pagination Dots */}
      {post.media && post.media.length > 1 && (
        <View style={styles.paginationDots}>
          {post.media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentMediaIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#FF3B30' : '#FFFFFF'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
          <Feather name="send" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleSave} style={styles.actionBtn}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isSaved ? '#FFFFFF' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Likes Count */}
      {displayedLikeCount > 0 && (
        <TouchableOpacity onPress={handleOpenLikedBy} activeOpacity={0.7}>
          <Text style={styles.likesCountText}>
            {displayedLikeCount} {displayedLikeCount === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Artwork Type */}
      {post.artworkType && post.artworkType.length > 0 && (
        <View style={styles.artworkTypeContainer}>
          {post.artworkType.map((type: string) => (
            <View key={type} style={styles.artworkTypeChip}>
              <Feather name="tag" size={10} color="#9CA3AF" />
              <Text style={styles.artworkTypeText}>{type}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Content Transparency Badges */}
      {(((post as any).isAIGenerated === true || post.isHumanMade === false) || (post as any).isOriginalContent === true || (post as any).isNsfw === true) && (
        <View style={styles.badgesContainer}>
          {((post as any).isAIGenerated === true || post.isHumanMade === false) && (
            <Text style={styles.subtleLabel}>{'\u24D8'} Contains AI-generated media</Text>
          )}
          {(post as any).isOriginalContent === true && (
            <Text style={styles.subtleLabel}>{'\u24D8'} Original artwork</Text>
          )}
          {(post as any).isNsfw === true && (
            <View style={styles.nsfwBadge}>
              <Text style={styles.badgeText}>{'\uD83D\uDD34'} 18+</Text>
            </View>
          )}
        </View>
      )}

      {/* Caption and Tags */}
      <View style={styles.content}>
        {post.caption && (
          <Text style={styles.captionText}>
            <Text style={styles.boldUsername}>{post.authorId.username} </Text>
            {post.caption}
          </Text>
        )}
        {post.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {post.tags.map((tag: string) => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post._id}
      />

      {/* Liked By Modal */}
      <Modal
        visible={showLikedByModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLikedByModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Liked By</Text>
              <TouchableOpacity onPress={() => setShowLikedByModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {likedByLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#FF3B30" />
              </View>
            ) : likedByUsers.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Feather name="heart" size={32} color={darkColors.textSecondary} />
                <Text style={styles.modalEmptyText}>No likes yet</Text>
              </View>
            ) : (
              <FlatList
                data={likedByUsers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.likerRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowLikedByModal(false);
                      if (currentUser && item._id === currentUser.id) {
                        navigation.navigate('MainTabs' as any, { screen: 'Profile' } as any);
                      } else {
                        navigation.navigate('UserProfile', { userId: item._id });
                      }
                    }}
                  >
                    <View style={styles.likerAvatar}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.likerAvatarImage} />
                      ) : (
                        <Feather name="user" size={16} color={darkColors.textSecondary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.likerUsername}>{item.username}</Text>
                      {item.fullName && (
                        <Text style={styles.likerFullName}>{item.fullName}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.likersList}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const PostCard = React.memo(PostCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginTop: 2,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: darkColors.surface,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  actionBtn: {
    marginRight: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 12,
  },
  boldUsername: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginRight: 8,
  },
  moreBtn: {
    padding: 12,
  },
  optionsMenu: {
    position: 'absolute',
    top: 48,
    right: 12,
    backgroundColor: darkColors.surface,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 180,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  optionsMenuItemLast: {
    borderBottomWidth: 0,
  },
  optionsMenuText: {
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  artworkTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 6,
  },
  artworkTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  artworkTypeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  subtleLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  nsfwBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  mediaBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    position: 'relative',
  },
  likesCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginTop: 8,
  },
  likersList: {
    paddingHorizontal: 16,
  },
  likerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  likerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  likerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  likerUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  likerFullName: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginTop: 1,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
