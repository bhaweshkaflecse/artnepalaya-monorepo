import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { lightColors } from '../../theme/colors';
import { api } from '../../services/api';

type CmsPageRouteProp = RouteProp<{ CmsPage: { slug: string; title: string } }, 'CmsPage'>;

const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
};

export const CmsPageScreen = () => {
  const route = useRoute<CmsPageRouteProp>();
  const navigation = useNavigation();
  const { slug, title } = route.params;

  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState(title);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCmsPage = async () => {
      try {
        const response = await api.get(`/config/cms/${slug}`);
        const data = response.data.data;
        if (data) {
          setPageTitle(data.title || title);
          setContent(stripHtmlTags(data.content || ''));
        }
      } catch (_e) {
        setContent('Content is not available at this time.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCmsPage();
  }, [slug, title]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={lightColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {pageTitle}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightColors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          <Text style={styles.pageContent}>{content}</Text>
        </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightColors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 16,
  },
  pageContent: {
    fontSize: 15,
    color: lightColors.textPrimary,
    lineHeight: 24,
  },
});
