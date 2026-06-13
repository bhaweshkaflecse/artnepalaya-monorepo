import React, { useState, useRef } from 'react';
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
import { getPrimaryImageUrl } from '../../utils/media';
import { ReportModal } from '../common/ReportModal';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, logout } from '../../store/slices/authSlice';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isGuest = useAppSelector(selectIsGuest);
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false);
  const [isSaved, setIsSaved] = useState(post.isSavedByMe || false);
  const [showReportModal, setShowReportModal] = useState(false);

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
      'Guest accounts cannot like or save artworks. Create an account or sign in to unlock community features.',
      [
        { text: 'Continue Browsing', style: 'cancel' },
        { text: 'Sign In', onPress: () => { dispatch(logout()); } },
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
        postService.likePost(post._id).catch(() => setIsLiked(false));
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
    navigation.navigate('UserProfile', { userId: post.authorId._id });
  };

  const handleLike = async () => {
    if (isGuest) {
      showLoginAlert();
      return;
    }
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
      showLoginAlert();
      return;
    }
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
            <Text style={styles.username}>{post.authorId.username}</Text>
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.moreBtn}>
          <Feather name="more-horizontal" size={20} color={darkColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Image with single-tap (PostDetail) and double-tap (like) */}
      <TouchableWithoutFeedback onPress={handleImageTap}>
        <View style={styles.imageWrapper}>
          {getPrimaryImageUrl(post.media) ? (
            <Image
              source={{ uri: getPrimaryImageUrl(post.media) }}
              style={styles.image}
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
          >
            <Ionicons name="heart" size={80} color="#FFFFFF" />
          </Animated.View>
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
    padding: 4,
  },
});
