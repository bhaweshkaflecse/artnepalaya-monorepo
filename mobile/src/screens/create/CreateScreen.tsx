import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { lightColors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest } from '../../store/slices/authSlice';
import { prependPost as prependFeedPost } from '../../store/slices/feedSlice';
import { prependPost as prependMyPost } from '../../store/slices/userSlice';

const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FALLBACK_ARTWORK_TYPES = [
  'Painting',
  'Digital Art',
  'Photography',
  'Sculpture',
  'Mixed Media',
  'Other',
];

export const CreateScreen = () => {
  const navigation = useNavigation();
  const isGuest = useAppSelector(selectIsGuest);
  const dispatch = useAppDispatch();
  const [mediaItems, setMediaItems] = useState<Array<{ uri: string; type: 'image' | 'video'; fileSize?: number }>>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [artworkType, setArtworkType] = useState<string[]>([]);
  const [artworkTypes, setArtworkTypes] = useState<string[]>(FALLBACK_ARTWORK_TYPES);
  const [customArtworkType, setCustomArtworkType] = useState('');
  const [isNsfw, setIsNsfw] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [isOriginalContent, setIsOriginalContent] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const publishScaleAnim = useRef(new Animated.Value(1)).current;
  const progressSlideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isPublishing) {
      Animated.timing(progressSlideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progressSlideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isPublishing]);

  useEffect(() => {
    const fetchArtworkTypes = async () => {
      try {
        const response = await api.get('/config/artwork-types');
        const data = response.data.data;
        if (data && Array.isArray(data) && data.length > 0) {
          setArtworkTypes(data.map((t: { name: string }) => t.name));
        }
      } catch (_e) {
        // Fallback to hardcoded values if API fails
      }
    };
    fetchArtworkTypes();
  }, []);

  const pickImage = async () => {
    // Guest mode restriction - prevent media picking entirely
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Guest users cannot upload media. Please login or create an account to share your artwork.',
        [
          { text: 'Continue Browsing', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth') },
        ]
      );
      return;
    }

    const currentImages = mediaItems.filter((m) => m.type === 'image').length;
    const currentVideos = mediaItems.filter((m) => m.type === 'video').length;

    if (currentImages >= MAX_IMAGES && currentVideos >= MAX_VIDEOS) {
      Alert.alert('Limit Reached', `You have reached the maximum media limit.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 6 - mediaItems.length),
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newItems: Array<{ uri: string; type: 'image' | 'video'; fileSize?: number }> = [];
        const oversizedFiles: string[] = [];

        for (const asset of result.assets) {
          const isVideo = asset.type === 'video';
          const filename = asset.uri.split('/').pop() || (isVideo ? 'video.mp4' : 'image.jpg');

          if (isVideo) {
            if (currentVideos + newItems.filter(i => i.type === 'video').length >= MAX_VIDEOS) {
              Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_VIDEOS} video per post.`);
              continue;
            }
            // Check file size (50MB limit for videos)
            if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
              oversizedFiles.push(`${filename} (video exceeds 50MB)`);
              continue;
            }
          } else {
            if (currentImages + newItems.filter(i => i.type === 'image').length >= MAX_IMAGES) {
              Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_IMAGES} images per post.`);
              continue;
            }
            // Check file size (10MB limit for images)
            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
              oversizedFiles.push(`${filename} (image exceeds 10MB)`);
              continue;
            }
          }

          newItems.push({
            uri: asset.uri,
            type: isVideo ? 'video' : 'image',
            fileSize: asset.fileSize || undefined,
          });
        }

        if (oversizedFiles.length > 0) {
          Alert.alert(
            'File Size Exceeded',
            `The following files are too large and were skipped:\n\n${oversizedFiles.join('\n')}\n\nImages must be under 10MB and videos under 50MB.`
          );
        }

        if (newItems.length > 0) {
          setMediaItems((prev) => [...prev, ...newItems]);
        }
      }
    } catch (_e) {
      // Image picker not available
    }
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activePreviewIndex >= updated.length) {
        setActivePreviewIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const toggleArtworkType = (type: string) => {
    setArtworkType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetForm = () => {
    setMediaItems([]);
    setDescription('');
    setTags('');
    setArtworkType([]);
    setCustomArtworkType('');
    setIsNsfw(false);
    setIsAIGenerated(false);
    setIsOriginalContent(false);
  };

  const handlePublish = async () => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Guest users cannot publish artwork. Please login to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth') },
        ]
      );
      return;
    }

    if (mediaItems.length === 0) {
      Alert.alert('Error', 'Please select an artwork to upload.');
      return;
    }

    const imageCount = mediaItems.filter((m) => m.type === 'image').length;
    const videoCount = mediaItems.filter((m) => m.type === 'video').length;

    if (imageCount > MAX_IMAGES) {
      Alert.alert('Limit Exceeded', `Maximum ${MAX_IMAGES} images allowed per post.`);
      return;
    }
    if (videoCount > MAX_VIDEOS) {
      Alert.alert('Limit Exceeded', `Maximum ${MAX_VIDEOS} video allowed per post.`);
      return;
    }

    // Total media size validation (100MB limit)
    const totalSize = mediaItems.reduce((sum, item) => sum + (item.fileSize || 0), 0);
    if (totalSize > 100 * 1024 * 1024) {
      Alert.alert(
        'Size Limit Exceeded',
        'Media size exceeds 100MB. Please compress your video or choose smaller files.'
      );
      return;
    }

    setIsPublishing(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append all media files
      for (const item of mediaItems) {
        const filename = item.uri.split('/').pop() || (item.type === 'video' ? 'video.mp4' : 'artwork.jpg');
        const match = /\.(\w+)$/.exec(filename);
        const type = item.type === 'video'
          ? (match ? `video/${match[1]}` : 'video/mp4')
          : (match ? `image/${match[1]}` : 'image/jpeg');

        // File size guard for images (10MB) and videos (50MB)
        if (item.type === 'image' && item.fileSize && item.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', `"${filename}" exceeds the 10MB image limit.`);
          setIsPublishing(false);
          return;
        }
        if (item.type === 'video' && item.fileSize && item.fileSize > 50 * 1024 * 1024) {
          Alert.alert('File Too Large', `"${filename}" exceeds the 50MB video limit.`);
          setIsPublishing(false);
          return;
        }

        const mediaAsset = {
          uri: item.uri,
          name: filename,
          type,
        };

        formData.append('media', mediaAsset as any);
      }

      if (description) {
        formData.append('caption', description);
      }

      if (tags) {
        const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
        tagsArray.forEach((tag) => {
          formData.append('tags[]', tag);
        });
      }

      if (artworkType.length > 0) {
        const typesToSend = [...artworkType];
        if (artworkType.includes('Other') && customArtworkType.trim()) {
          typesToSend.push(customArtworkType.trim());
        }
        formData.append('artworkType', JSON.stringify(typesToSend.filter((t) => t !== 'Other')));
      }

      formData.append('isHumanMade', (!isAIGenerated).toString());
      formData.append('isAIGenerated', isAIGenerated.toString());
      formData.append('isOriginalContent', isOriginalContent.toString());

      if (isNsfw) {
        formData.append('isNsfw', 'true');
      }

      const response = await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      Alert.alert('Success', 'Artwork published successfully!');
      resetForm();
      const newPost = response.data.data;
      if (newPost) {
        dispatch(prependFeedPost(newPost));
        dispatch(prependMyPost(newPost));
      }
    } catch (e: any) {
      console.log('[PUBLISH] ERROR STATUS:', e?.response?.status);
      console.log('[PUBLISH] ERROR DATA:', JSON.stringify(e?.response?.data));
      console.log('[PUBLISH] ERROR MESSAGE:', e?.message);
      console.log('[PUBLISH] ERROR CODE:', e?.code);

      let userMessage = 'Failed to publish artwork. Please try again.';

      if (e?.message === 'Network Error' || e?.code === 'ERR_NETWORK') {
        userMessage = 'No internet connection. Please check your network and try again.';
      } else if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')) {
        userMessage = 'Upload timed out. Please try again with smaller files or a better connection.';
      } else if (e?.response?.status === 401) {
        userMessage = 'Your session has expired. Please log in again.';
      } else if (e?.response?.status === 400) {
        const apiMessage = e?.response?.data?.error?.message;
        userMessage = apiMessage || 'Invalid post data. Please check your content and try again.';
      } else if (e?.response?.status === 413) {
        userMessage = 'Files are too large. Please reduce file sizes and try again.';
      } else if (e?.response?.status >= 500) {
        userMessage = 'ArtNepalaya servers are temporarily unavailable. Please try again later.';
      }

      Alert.alert('Publish Failed', userMessage);
    } finally {
      setIsPublishing(false);
      setUploadProgress(0);
    }
  };

  const canPublish = mediaItems.length > 0 && !isPublishing;

  const handlePublishPress = () => {
    // Call handlePublish immediately to prevent double-tap race
    handlePublish();
    // Animate the button visually (non-blocking)
    Animated.sequence([
      Animated.timing(publishScaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(publishScaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const goToPrevMedia = () => {
    if (activePreviewIndex > 0) {
      setActivePreviewIndex(activePreviewIndex - 1);
    }
  };

  const goToNextMedia = () => {
    if (activePreviewIndex < mediaItems.length - 1) {
      setActivePreviewIndex(activePreviewIndex + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* PUBLISH HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={lightColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Artwork</Text>
        <Animated.View style={{ transform: [{ scale: publishScaleAnim }] }}>
          <TouchableOpacity
            onPress={handlePublishPress}
            disabled={!canPublish}
            style={[
              styles.publishPill,
              !canPublish && styles.publishPillDisabled,
            ]}
          >
            {isPublishing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.publishPillText, !canPublish && styles.publishPillTextDisabled]}>
                Publish
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* GUEST INFO CARD */}
        {isGuest && (
          <View style={styles.guestInfoCard}>
            <Feather name="info" size={20} color="#2563EB" style={styles.guestInfoIcon} />
            <View style={styles.guestInfoContent}>
              <Text style={styles.guestInfoText}>
                Create and showcase your artwork to the ArtNepalaya community.
              </Text>
              <Text style={styles.guestInfoSubtext}>
                Login or create an account to publish artwork.
              </Text>
            </View>
          </View>
        )}

        {/* PUBLISH STATUS BANNER */}
        <Animated.View style={[
          styles.statusBanner,
          mediaItems.length > 0 ? styles.statusBannerReady : styles.statusBannerWarning,
          { opacity: fadeAnim },
        ]}>
          <View style={styles.statusBannerLeft}>
            <Feather
              name={mediaItems.length > 0 ? 'check-circle' : 'alert-circle'}
              size={18}
              color={mediaItems.length > 0 ? '#16A34A' : '#D97706'}
            />
            <Text style={[
              styles.statusBannerText,
              { color: mediaItems.length > 0 ? '#16A34A' : '#D97706' },
            ]}>
              {mediaItems.length > 0 ? 'Ready to publish' : 'Minimum 1 artwork required'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {mediaItems.filter((m) => m.type === 'image').length}/{MAX_IMAGES} img | {mediaItems.filter((m) => m.type === 'video').length}/{MAX_VIDEOS} vid
            </Text>
          </View>
        </Animated.View>

        {/* LARGE HERO PREVIEW */}
        <Animated.View style={[styles.heroContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.heroTouchable}
            onPress={mediaItems.length === 0 ? pickImage : undefined}
            activeOpacity={mediaItems.length === 0 ? 0.7 : 1}
          >
            {mediaItems.length > 0 ? (
              <View style={styles.heroPreview}>
                <Image
                  source={{ uri: mediaItems[activePreviewIndex]?.uri || mediaItems[0].uri }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                {/* Cover badge on first item */}
                {activePreviewIndex === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                {/* Video badge */}
                {mediaItems[activePreviewIndex]?.type === 'video' && (
                  <View style={styles.videoBadge}>
                    <Feather name="play-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.videoBadgeText}>Video</Text>
                  </View>
                )}
                {/* Position indicator */}
                <View style={styles.positionIndicator}>
                  <Text style={styles.positionText}>
                    {activePreviewIndex + 1}/{mediaItems.length}
                  </Text>
                </View>
                {/* Navigation arrows */}
                {activePreviewIndex > 0 && (
                  <TouchableOpacity style={[styles.navArrow, styles.navArrowLeft]} onPress={goToPrevMedia}>
                    <Feather name="chevron-left" size={20} color={lightColors.textPrimary} />
                  </TouchableOpacity>
                )}
                {activePreviewIndex < mediaItems.length - 1 && (
                  <TouchableOpacity style={[styles.navArrow, styles.navArrowRight]} onPress={goToNextMedia}>
                    <Feather name="chevron-right" size={20} color={lightColors.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.heroPlaceholder}>
                <View style={styles.heroPlaceholderIcon}>
                  <Feather name="upload-cloud" size={40} color={lightColors.textSecondary} />
                </View>
                <Text style={styles.heroPlaceholderTitle}>Tap to select artwork</Text>
                <Text style={styles.heroPlaceholderSubtitle}>
                  Choose images or video from your gallery
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* PAGINATION DOTS */}
        {mediaItems.length > 1 && (
          <View style={styles.paginationDots}>
            {mediaItems.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.dot,
                  activePreviewIndex === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}

        {/* THUMBNAIL STRIP */}
        {mediaItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStrip}
          >
            {mediaItems.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={styles.thumbnailWrapper}>
                <TouchableOpacity
                  onPress={() => setActivePreviewIndex(index)}
                  style={[
                    styles.thumbnailItem,
                    activePreviewIndex === index && styles.thumbnailItemActive,
                  ]}
                >
                  <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
                  {item.type === 'video' && (
                    <View style={styles.thumbnailVideoIcon}>
                      <Feather name="play" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeMediaItem(index)}
                  style={styles.thumbnailRemoveBtn}
                >
                  <Feather name="x" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {/* Add Media card */}
            <TouchableOpacity style={styles.thumbnailAddBtn} onPress={pickImage}>
              <Feather name="plus" size={20} color={lightColors.textSecondary} />
              <Text style={styles.thumbnailAddText}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* UPLOAD LIMITS */}
        <View style={styles.limitsContainer}>
          <Text style={styles.limitsText}>
            Up to 5 images + 1 video | JPG, PNG, WEBP, MP4 | Max 10MB/image, 50MB/video
          </Text>
        </View>

        {/* DESCRIPTION FIELD */}
        <Animated.View style={[styles.fieldContainer, { opacity: fadeAnim }]}>
          <Text style={styles.fieldLabel}>Description</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your artwork..."
              placeholderTextColor={lightColors.textSecondary}
              multiline
              maxLength={2000}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>
              {description.length}/2000
            </Text>
          </View>
        </Animated.View>

        {/* KEYWORDS/TAGS FIELD */}
        <Animated.View style={[styles.fieldContainer, { opacity: fadeAnim }]}>
          <Text style={styles.fieldLabel}>Keywords / Tags</Text>
          <TextInput
            style={styles.tagInput}
            placeholder="landscape, oil painting, Nepal"
            placeholderTextColor={lightColors.textSecondary}
            value={tags}
            onChangeText={setTags}
          />
          <Text style={styles.helperText}>Separate with commas (e.g., landscape, oil painting, Nepal)</Text>
        </Animated.View>

        {/* ARTWORK TYPES */}
        <Animated.View style={[styles.fieldContainer, { opacity: fadeAnim }]}>
          <Text style={styles.fieldLabel}>Artwork Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {artworkTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  artworkType.includes(type) && styles.chipActive,
                ]}
                onPress={() => toggleArtworkType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    artworkType.includes(type) && styles.chipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom Artwork Type Input */}
          {artworkType.includes('Other') && (
            <TextInput
              style={styles.customTypeInput}
              placeholder="Specify your artwork type..."
              placeholderTextColor={lightColors.textSecondary}
              value={customArtworkType}
              onChangeText={setCustomArtworkType}
              maxLength={50}
            />
          )}
        </Animated.View>

        {/* COMPLIANCE SECTION */}
        <Animated.View style={[styles.complianceCard, { opacity: fadeAnim }]}>
          <Text style={styles.complianceTitleText}>Content Declaration</Text>

          {/* AI Generated */}
          <TouchableOpacity
            onPress={() => setIsAIGenerated(!isAIGenerated)}
            style={styles.complianceRow}
          >
            <Ionicons
              name={isAIGenerated ? 'checkbox' : 'square-outline'}
              size={24}
              color={isAIGenerated ? lightColors.accent : lightColors.textSecondary}
            />
            <View style={styles.complianceTextWrap}>
              <Text style={styles.complianceLabel}>This artwork was created with AI tools</Text>
              <Text style={styles.complianceHelper}>AI-assisted or AI-generated content</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('AI Content Disclosure', 'AI-assisted content includes artwork created or enhanced using artificial intelligence tools such as Midjourney, DALL-E, Stable Diffusion, etc.')}>
              <Feather name="info" size={14} color={lightColors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Original Content */}
          <TouchableOpacity
            onPress={() => setIsOriginalContent(!isOriginalContent)}
            style={styles.complianceRow}
          >
            <Ionicons
              name={isOriginalContent ? 'checkbox' : 'square-outline'}
              size={24}
              color={isOriginalContent ? lightColors.accent : lightColors.textSecondary}
            />
            <View style={styles.complianceTextWrap}>
              <Text style={styles.complianceLabel}>I confirm this artwork is NOT AI-generated</Text>
              <Text style={styles.complianceHelper}>Original creative work declaration</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Original Content', 'By checking this, you declare that this artwork is your own original creation and does not infringe on any copyright.')}>
              <Feather name="info" size={14} color={lightColors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* NSFW */}
          <TouchableOpacity
            onPress={() => setIsNsfw(!isNsfw)}
            style={[styles.complianceRow, { borderBottomWidth: 0 }]}
          >
            <Ionicons
              name={isNsfw ? 'checkbox' : 'square-outline'}
              size={24}
              color={isNsfw ? lightColors.accent : lightColors.textSecondary}
            />
            <View style={styles.complianceTextWrap}>
              <Text style={styles.complianceLabel}>18+ / Mature Content</Text>
              <Text style={styles.complianceHelper}>Contains sensitive content not suitable for all audiences</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Mature Content', 'Mark content as mature if it contains nudity, violence, or other content not suitable for audiences under 18.')}>
              <Feather name="info" size={14} color={lightColors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>

        {/* Guest Warning Card */}
        {isGuest && (
          <View style={styles.guestWarningCard}>
            <Feather name="alert-circle" size={18} color="#DC2626" style={styles.guestWarningIcon} />
            <Text style={styles.guestWarningText}>
              Guest users cannot publish artwork. Please login to continue.
            </Text>
          </View>
        )}

        {/* Bottom spacer for floating progress */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FLOATING UPLOAD PROGRESS */}
      {isPublishing && (
        <Animated.View
          style={[
            styles.floatingProgress,
            { transform: [{ translateY: progressSlideAnim }] },
          ]}
        >
          <View style={styles.floatingProgressInner}>
            <View style={styles.floatingProgressHeader}>
              <Feather name="upload-cloud" size={22} color={lightColors.accent} />
              <Text style={styles.floatingProgressTitle}>Uploading artwork...</Text>
              <Text style={styles.floatingProgressPercent}>{uploadProgress}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: lightColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: lightColors.textPrimary,
    letterSpacing: -0.3,
  },
  publishPill: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  publishPillDisabled: {
    backgroundColor: '#E5E5E5',
  },
  publishPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  publishPillTextDisabled: {
    color: '#999999',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerReady: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusBannerWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: lightColors.textSecondary,
  },
  heroContainer: {
    marginBottom: 12,
  },
  heroTouchable: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  heroPreview: {
    flex: 1,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  heroPlaceholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: lightColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: 6,
  },
  heroPlaceholderSubtitle: {
    fontSize: 13,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  positionIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  positionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: '#FF3B30',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
  },
  thumbnailStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailItemActive: {
    borderColor: '#FF3B30',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailVideoIcon: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  thumbnailAddBtn: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: lightColors.surface,
  },
  thumbnailAddText: {
    fontSize: 10,
    color: lightColors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  limitsContainer: {
    backgroundColor: lightColors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  limitsText: {
    fontSize: 12,
    color: lightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: 8,
  },
  textAreaContainer: {
    backgroundColor: lightColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: 14,
    minHeight: 120,
  },
  textArea: {
    fontSize: 15,
    color: lightColors.textPrimary,
    lineHeight: 22,
    minHeight: 90,
  },
  charCounter: {
    fontSize: 11,
    color: lightColors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },
  tagInput: {
    backgroundColor: lightColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: lightColors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: lightColors.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
  },
  chipActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
  },
  chipText: {
    fontSize: 13,
    color: lightColors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customTypeInput: {
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: lightColors.textPrimary,
    backgroundColor: lightColors.surface,
    marginTop: 12,
  },
  complianceCard: {
    backgroundColor: lightColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: 12,
    marginBottom: 16,
  },
  complianceTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 14,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
    gap: 12,
  },
  complianceTextWrap: {
    flex: 1,
  },
  complianceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.textPrimary,
    lineHeight: 18,
  },
  complianceHelper: {
    fontSize: 11,
    color: lightColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  guestInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  guestInfoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  guestInfoContent: {
    flex: 1,
  },
  guestInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
    lineHeight: 20,
  },
  guestInfoSubtext: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 4,
    lineHeight: 18,
  },
  guestWarningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  guestWarningIcon: {
    marginRight: 10,
  },
  guestWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18,
  },
  floatingProgress: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  floatingProgressInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  floatingProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  floatingProgressTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  floatingProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: lightColors.accent,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: lightColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 3,
  },
});
