import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { postService, Post } from '../../services/post.service';
import { getPrimaryImageUrl } from '../../utils/media';
import { ReportModal } from '../../components/common/ReportModal';

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

        {/* Image */}
        {getPrimaryImageUrl(post.media) && (
          <Image
            source={{ uri: getPrimaryImageUrl(post.media)! }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

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
