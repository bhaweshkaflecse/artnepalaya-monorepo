import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
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
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { postService, Post } from '../../services/post.service';
import { getPrimaryImageUrl, getVideoThumbnailUrl } from '../../utils/media';
import { ReportModal } from '../../components/common/ReportModal';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, logout } from '../../store/slices/authSlice';

type PostDetailRouteProp = RouteProp<{ PostDetail: { postId: string } }, 'PostDetail'>;

export const PostDetailScreen = () => {
  const route = useRoute<PostDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { postId } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  const isGuest = useAppSelector(selectIsGuest);
  const dispatch = useAppDispatch();

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

  // Clear tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
      if (pauseFadeTimeout.current) {
        clearTimeout(pauseFadeTimeout.current);
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

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await postService.getPostById(postId);
        setPost(data);
        setIsLiked(data.isLikedByMe || false);
        setIsSaved(data.isSavedByMe || false);
      } catch (_e) {
        Alert.alert('Error', 'Failed to load post.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

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
    try {
      if (newValue) {
        await postService.likePost(post._id);
      } else {
        await postService.unlikePost(post._id);
      }
    } catch {
      setIsLiked(!newValue);
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
    try {
      if (newValue) {
        await postService.savePost(post._id);
      } else {
        await postService.unsavePost(post._id);
      }
    } catch {
      setIsSaved(!newValue);
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
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Post not found</Text>
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
        <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.menuBtn}>
          <Feather name="more-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Author info */}
        <TouchableOpacity
          style={styles.authorRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('UserProfile', { userId: post.authorId._id })}
        >
          <View style={styles.avatarContainer}>
            {post.authorId.avatarUrl ? (
              <Image source={{ uri: post.authorId.avatarUrl }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={16} color={darkColors.textSecondary} />
            )}
          </View>
          <View>
            <Text style={styles.username}>{post.authorId.username}</Text>
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Image/Video with double-tap to like */}
        {(() => {
          const isVideo = post.media?.[0]?.type === 'video';
          if (isVideo && post.media[0]?.url) {
            // Social-media style video player - tap to play/pause, no native controls
            return (
              <TouchableWithoutFeedback onPress={handleVideoTap}>
                <View style={styles.imageWrapper}>
                  <Video
                    ref={videoRef}
                    source={{ uri: post.media[0].url }}
                    style={styles.postImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={shouldPlay}
                    posterSource={{ uri: getVideoThumbnailUrl(post.media[0].url) }}
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
                  {/* Initial play icon - shown before video starts */}
                  {!shouldPlay && (
                    <View style={styles.videoOverlay} pointerEvents="none">
                      <Feather name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
                    </View>
                  )}
                  {/* Pause icon - fades out after 500ms */}
                  {shouldPlay && !isVideoPlaying && (
                    <Animated.View
                      style={[styles.videoOverlay, { opacity: pauseIconOpacity }]}
                      pointerEvents="none"
                    >
                      <Ionicons name="pause" size={48} color="rgba(255,255,255,0.85)" />
                    </Animated.View>
                  )}
                  {/* Buffering spinner */}
                  {isBuffering && shouldPlay && (
                    <View style={styles.videoOverlay} pointerEvents="none">
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                  )}
                  {/* Progress bar */}
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
          // Image: keep double-tap behavior
          const imageUrl = getPrimaryImageUrl(post.media);
          return (
            <TouchableWithoutFeedback onPress={handleImageDoubleTap}>
              <View style={styles.imageWrapper}>
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
        })()}

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
});
