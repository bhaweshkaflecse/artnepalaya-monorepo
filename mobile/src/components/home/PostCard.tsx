import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Animated,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { Post, postService } from '../../services/post.service';
import { getPrimaryImageUrl, getVideoThumbnailUrl } from '../../utils/media';
import { ReportModal } from '../common/ReportModal';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, selectUser, logout } from '../../store/slices/authSlice';
import { toggleLike, toggleSave, removePost as removeFeedPost } from '../../store/slices/feedSlice';
import { removePost as removeUserPost } from '../../store/slices/userSlice';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isGuest = useAppSelector(selectIsGuest);
  const currentUser = useAppSelector(selectUser);
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false);
  const [isSaved, setIsSaved] = useState(post.isSavedByMe || false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const isOwnPost = currentUser && post.authorId._id === currentUser.id;

  useEffect(() => { setIsLiked(post.isLikedByMe || false); }, [post.isLikedByMe]);
  useEffect(() => { setIsSaved(post.isSavedByMe || false); }, [post.isSavedByMe]);

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
        navigation.navigate('PostDetail', { postId: post._id });
      }, 300);
    }
  };

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
        message: `Check out this artwork by ${post.authorId.username} on Artnepalaya!`,
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

      {/* Image with single-tap (PostDetail) and double-tap (like) */}
      <TouchableWithoutFeedback onPress={handleImageTap}>
        <View style={styles.imageWrapper}>
          {(() => {
            const isVideo = post.media?.[0]?.type === 'video';
            const imageUrl = isVideo && post.media[0]?.url
              ? getVideoThumbnailUrl(post.media[0].url)
              : getPrimaryImageUrl(post.media);
            return imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="image" size={48} color={darkColors.textSecondary} />
              </View>
            );
          })()}
          {/* Video play icon overlay */}
          {post.media?.[0]?.type === 'video' && (
            <View style={styles.videoOverlay}>
              <Feather name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
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
          >
            <Ionicons name="heart" size={80} color="#FFFFFF" />
          </Animated.View>
          {post.media && post.media.length > 1 && (
            <View style={styles.mediaBadge}>
              <Feather name="layers" size={12} color="#FFFFFF" />
              <Text style={styles.mediaBadgeText}>{post.media.length}</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

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

      {/* Content Transparency Badges */}
      {(((post as any).isAIGenerated === true || post.isHumanMade === false) || (post as any).isOriginalContent === true || (post as any).isNsfw === true) && (
        <View style={styles.badgesContainer}>
          {((post as any).isAIGenerated === true || post.isHumanMade === false) && (
            <View style={styles.aiBadge}>
              <Text style={styles.badgeText}>AI</Text>
            </View>
          )}
          {(post as any).isOriginalContent === true && (
            <View style={styles.originalBadge}>
              <Text style={styles.badgeText}>Original</Text>
            </View>
          )}
          {(post as any).isNsfw === true && (
            <View style={styles.nsfwBadge}>
              <Text style={styles.badgeText}>18+</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
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
  actions: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  actionBtn: {
    marginRight: 16,
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
  },
  aiBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  originalBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
});
