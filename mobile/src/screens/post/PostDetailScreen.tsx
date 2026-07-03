import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { postService, Post } from '../../services/post.service';
import { getPrimaryImageUrl, getVideoThumbnailUrl } from '../../utils/media';
import { ReportModal } from '../../components/common/ReportModal';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, selectUser, logout } from '../../store/slices/authSlice';
import { toggleLike, toggleSave, removePost as removeFeedPost } from '../../store/slices/feedSlice';
import { removePost as removeUserPost } from '../../store/slices/userSlice';

type PostDetailRouteProp = RouteProp<{ PostDetail: { postId: string; initialMediaIndex?: number } }, 'PostDetail'>;

const { width: screenWidth } = Dimensions.get('window');

export const PostDetailScreen = () => {
  const route = useRoute<PostDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { postId, initialMediaIndex = 0 } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);

  const isGuest = useAppSelector(selectIsGuest);
  const currentUser = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  const isOwnPost = post && currentUser && post.authorId._id === currentUser.id;

  // Navigation guard to prevent double-goBack race condition
  const hasNavigatedBack = useRef<boolean>(false);
  const goBackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Video player state
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const videoRef = useRef<Video>(null);

  // Pause icon animation
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;
  const pauseFadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPauseIcon = useCallback(() => {
    pauseIconOpacity.setValue(1);
    if (pauseFadeTimeout.current) {
      clearTimeout(pauseFadeTimeout.current);
    }
    pauseFadeTimeout.current = setTimeout(() => {
      Animated.timing(pauseIconOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 500);
  }, [pauseIconOpacity]);

  // Video tap handler
  const handleVideoTap = useCallback(async () => {
    if (!shouldPlay) {
      // Initial state: start video
      setShouldPlay(true);
      return;
    }
    if (isVideoPlaying) {
      // Currently playing: pause
      await videoRef.current?.pauseAsync();
      showPauseIcon();
    } else {
      // Currently paused: resume
      await videoRef.current?.playAsync();
    }
  }, [shouldPlay, isVideoPlaying, showPauseIcon]);

  // Double-tap detection
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
      if (pauseFadeTimeout.current) {
        clearTimeout(pauseFadeTimeout.current);
      }
      if (goBackTimeout.current) {
        clearTimeout(goBackTimeout.current);
      }
    };
  }, []);

  // Heart animation values
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

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

  const handleImageDoubleTap = () => {
    const now = Date.now();
    const delta = now - lastTap.current;
    lastTap.current = now;

    if (delta < 300) {
      // Double-tap detected - cancel single-tap timeout
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      // Perform like action
      if (!isLiked) {
        setIsLiked(true);
        if (post) {
          postService.likePost(post._id).catch(() => setIsLiked(false));
        }
      }
      triggerHeartAnimation();
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchPost = async () => {
        try {
          const data = await postService.getPostById(postId);
          setPost(data);
          setIsLiked(data.isLikedByMe || false);
          setIsSaved(data.isSavedByMe || false);
        } catch (error: any) {
          if (error?.response?.status === 404) {
            dispatch(removeFeedPost(postId));
            dispatch(removeUserPost(postId));
            Alert.alert('Unavailable', 'This post is no longer available.');
            goBackTimeout.current = setTimeout(() => {
              if (!hasNavigatedBack.current) {
                hasNavigatedBack.current = true;
                navigation.goBack();
              }
            }, 1500);
          } else if (error?.response?.status === 403) {
            Alert.alert('Restricted', 'This content is marked as mature and is not available with your current settings.');
            goBackTimeout.current = setTimeout(() => {
              if (!hasNavigatedBack.current) {
                hasNavigatedBack.current = true;
                navigation.goBack();
              }
            }, 1500);
          } else {
            Alert.alert('Error', 'Failed to load post.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      setIsLoading(true);
      fetchPost();
    }, [postId])
  );

  const handleLike = async () => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Login to like artwork.',
        [{ text: 'Maybe Later', style: 'cancel' }, { text: 'Login', onPress: () => dispatch(logout()) }]
      );
      return;
    }
    if (!post) return;
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
      Alert.alert(
        'Login Required',
        'Login to save artwork.',
        [{ text: 'Maybe Later', style: 'cancel' }, { text: 'Login', onPress: () => dispatch(logout()) }]
      );
      return;
    }
    if (!post) return;
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
    if (!post) return;
    try {
      await Share.share({
        message: `Check out this artwork by ${post.authorId.username} on Artnepalaya!`,
      });
    } catch (_e) {
      // Share cancelled
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkColors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <Feather name="alert-circle" size={48} color={darkColors.textSecondary} />
          <Text style={[styles.errorText, { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#FFFFFF' }]}>Content Unavailable</Text>
          <Text style={[styles.errorText, { marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }]}>
            This post may have been removed or is restricted based on your content settings.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: '#FF3B30', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => {
              if (!hasNavigatedBack.current) {
                hasNavigatedBack.current = true;
                if (goBackTimeout.current) {
                  clearTimeout(goBackTimeout.current);
                  goBackTimeout.current = null;
                }
                navigation.goBack();
              }
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity
          onPress={() => {
            if (isOwnPost) {
              setShowOptionsMenu(!showOptionsMenu);
            } else {
              setShowReportModal(true);
            }
          }}
          style={styles.menuBtn}
        >
          <Feather name="more-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Owner Options Menu */}
      {showOptionsMenu && (
        <View style={styles.optionsMenu}>
          <TouchableOpacity
            style={styles.optionsMenuItem}
            onPress={() => {
              setShowOptionsMenu(false);
              navigation.navigate('EditPost' as never, { postId: post!._id, post } as never);
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
                        await postService.deletePost(post!._id);
                        dispatch(removeFeedPost(post!._id));
                        dispatch(removeUserPost(post!._id));
                        navigation.goBack();
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

      <ScrollView style={styles.scrollView} onScrollBeginDrag={() => setShowOptionsMenu(false)}>
        {/* Author info */}
        <TouchableOpacity
          style={styles.authorRow}
          activeOpacity={0.7}
          onPress={() => {
            if (currentUser && post.authorId._id === currentUser.id) {
              navigation.navigate('MainTabs' as any, { screen: 'Profile' } as any);
            } else {
              navigation.navigate('UserProfile', { userId: post.authorId._id });
            }
          }}
        >
          <View style={styles.avatarContainer}>
            {post.authorId.avatarUrl ? (
              <Image source={{ uri: post.authorId.avatarUrl }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={16} color={darkColors.textSecondary} />
            )}
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.username}>{post.authorId.username}</Text>
              {(post.authorId as any).isVerified && <Feather name="check-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />}
            </View>
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Media Carousel */}
        <View>
          <FlatList
            data={post.media}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={screenWidth}
            decelerationRate="fast"
            initialScrollIndex={initialMediaIndex}
            getItemLayout={(_data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentIndex(index);
            }}
            renderItem={({ item }) => {
              if (item.type === 'video' && item.url) {
                return (
                  <TouchableWithoutFeedback onPress={handleVideoTap}>
                    <View style={[styles.imageWrapper, { width: screenWidth }]}>
                      <Video
                        ref={videoRef}
                        source={{ uri: item.url }}
                        style={styles.postImage}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={shouldPlay}
                        posterSource={{ uri: getVideoThumbnailUrl(item.url) }}
                        usePoster
                        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                          if (status.isLoaded) {
                            setIsVideoPlaying(status.isPlaying);
                            setIsBuffering(status.isBuffering);
                            if (status.durationMillis && status.durationMillis > 0) {
                              setDurationMs(status.durationMillis);
                              setPlaybackProgress(
                                status.positionMillis / status.durationMillis
                              );
                            }
                          }
                        }}
                      />
                      {!shouldPlay && (
                        <View style={styles.videoOverlay} pointerEvents="none">
                          <Feather name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
                        </View>
                      )}
                      {shouldPlay && !isVideoPlaying && (
                        <Animated.View
                          style={[styles.videoOverlay, { opacity: pauseIconOpacity }]}
                          pointerEvents="none"
                        >
                          <Ionicons name="pause" size={48} color="rgba(255,255,255,0.85)" />
                        </Animated.View>
                      )}
                      {isBuffering && shouldPlay && (
                        <View style={styles.videoOverlay} pointerEvents="none">
                          <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                      )}
                      {shouldPlay && (
                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${playbackProgress * 100}%` },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableWithoutFeedback>
                );
              }
              // Image item
              const imageUrl = item.url;
              return (
                <TouchableWithoutFeedback onPress={handleImageDoubleTap}>
                  <View style={[styles.imageWrapper, { width: screenWidth }]}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Feather name="image" size={48} color={darkColors.textSecondary} />
                      </View>
                    )}
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
                  </View>
                </TouchableWithoutFeedback>
              );
            }}
          />
          {/* Pagination Dots */}
          {post.media.length > 1 && (
            <View style={styles.paginationDots}>
              {post.media.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={26}
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
              size={26}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

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

        {/* Caption */}
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>
              <Text style={styles.boldUsername}>{post.authorId.username} </Text>
              {post.caption}
            </Text>
          </View>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag: string) => (
              <Text
                key={tag}
                style={styles.tag}
              >
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post._id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: darkColors.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  postImage: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: darkColors.surface,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: darkColors.surface,
    position: 'relative',
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
    marginRight: 16,
  },
  captionContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  boldUsername: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  tag: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginRight: 8,
    marginBottom: 4,
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
  optionsMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
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
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
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
});
