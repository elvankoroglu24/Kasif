import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Share
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ResearchService } from '../../database/research';
import { ContentService, ContentDetail } from '../../database/content';
import { Research, Tag, ResearchSource } from '../../database/types';

export default function ResearchDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [research, setResearch] = useState<Research | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [linkedHadiths, setLinkedHadiths] = useState<Array<{ source: ResearchSource; content: ContentDetail }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const researchId = parseInt(id as string, 10);
      const data = await ResearchService.getResearchById(researchId);
      if (data) {
        setResearch(data);
        const researchTags = await ResearchService.getResearchTags(researchId);
        setTags(researchTags);
        const researchSources = await ResearchService.getResearchSources(researchId);
        setSources(researchSources);
        const contentSources = researchSources.filter((source) => source.source_type === 'content');
        const hadithResults = await Promise.all(
          contentSources.map(async (source) => {
            const content = await ContentService.getContentDetail(source.source_id);
            return content?.type === 'hadith' ? { source, content } : null;
          }),
        );
        setLinkedHadiths(hadithResults.filter((item): item is { source: ResearchSource; content: ContentDetail } => item !== null));
      } else {
        Alert.alert('Hata', 'Araştırma bulunamadı.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading research details:', error);
      Alert.alert('Hata', 'Detaylar yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = () => {
    Alert.alert(
      'Araştırmayı Sil',
      'Bu araştırmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ResearchService.deleteResearch(parseInt(id as string, 10));
              router.replace('/research');
            } catch (error) {
              console.error('Error deleting research:', error);
              Alert.alert('Hata', 'Silme işlemi sırasında bir sorun oluştu.');
            }
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!research) return;
    try {
      await Share.share({
        title: research.title,
        message: `${research.title}\n\n${research.summary || ''}\n\n${research.body || ''}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSourcePress = (source: ResearchSource) => {
    if (source.source_type === 'content') {
      router.push(`/content/${source.source_id}`);
    }
    // Handle other source types as needed
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!research) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Araştırma Detayı',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
                <Ionicons name="share-social-outline" size={24} color="#2196F3" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push(`/research/edit/${id}`)} style={styles.headerIcon}>
                <Ionicons name="create-outline" size={24} color="#2196F3" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerIcon}>
                <Ionicons name="trash-outline" size={24} color="#f44336" />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{research.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(research.status) }]}>
              <Text style={styles.badgeText}>{getStatusLabel(research.status)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.badgeText, { color: '#2196F3' }]}>{getCategoryLabel(research.category)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#F5F5F5' }]}>
              <Text style={[styles.badgeText, { color: '#757575' }]}>{getVisibilityLabel(research.visibility)}</Text>
            </View>
          </View>
        </View>

        {research.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Özet</Text>
            <Text style={styles.summaryText}>{research.summary}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İçerik</Text>
          <Text style={styles.bodyText}>{research.body || 'İçerik bulunmuyor.'}</Text>
        </View>

        {tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Etiketler</Text>
            <View style={styles.tagContainer}>
              {tags.map((tag) => (
                <View key={tag.id} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {linkedHadiths.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bağlı Hadis{linkedHadiths.length > 1 ? `ler (${linkedHadiths.length})` : ''}</Text>
            {linkedHadiths.map(({ source, content }) => (
              <TouchableOpacity
                key={`hadith-${source.id}`}
                style={styles.linkedHadithCard}
                onPress={() => router.push(`/content/${content.id}`)}
              >
                <View style={styles.linkedHadithHeader}>
                  <Ionicons name="book-outline" size={19} color="#1976D2" />
                  <Text style={styles.linkedHadithTitle} numberOfLines={1}>
                    {content.work?.title || 'Hadis'} · No: {content.number_in_work || content.id}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color="#9E9E9E" />
                </View>
                <Text style={styles.linkedHadithText} numberOfLines={3}>
                  {getContentPreview(content)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kaynaklar</Text>
          {sources.length > 0 ? (
            sources.map((source) => (
              <TouchableOpacity 
                key={source.id} 
                style={styles.sourceItem}
                onPress={() => handleSourcePress(source)}
              >
                <Ionicons name="link-outline" size={18} color="#2196F3" />
                <Text style={styles.sourceText}>
                  {getSourceTypeLabel(source.source_type)}: ID {source.source_id}
                  {source.note ? ` - ${source.note}` : ''}
                </Text>
                {source.source_type === 'content' && (
                  <Ionicons name="chevron-forward" size={14} color="#ccc" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyInfoText}>Henüz kaynak eklenmemiş.</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Oluşturulma: {new Date(research.created_at).toLocaleString('tr-TR')}
          </Text>
          <Text style={styles.footerText}>
            Son Güncelleme: {new Date(research.updated_at).toLocaleString('tr-TR')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return '#FFA000';
    case 'completed': return '#4CAF50';
    case 'archived': return '#757575';
    default: return '#2196F3';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Taslak';
    case 'completed': return 'Tamamlandı';
    case 'archived': return 'Arşivlendi';
    default: return status;
  }
};

const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    hadith: 'Hadis',
    commentary: 'Hadis Şerhi',
    tafsir: 'Tefsir',
    fiqh: 'Fıkıh',
    aqidah: 'Akaid',
    seerah: 'Siyer',
    arabic: 'Arapça',
    general: 'Genel',
    other: 'Diğer',
  };
  return categories[category] || category;
};

const getVisibilityLabel = (visibility: string) => {
  switch (visibility) {
    case 'private': return 'Gizli';
    case 'shared': return 'Paylaşılan';
    case 'published': return 'Yayınlanan';
    default: return visibility;
  }
};

const getSourceTypeLabel = (type: string) => {
  switch (type) {
    case 'content': return 'İçerik/Hadis';
    case 'work': return 'Eser';
    case 'section': return 'Bölüm';
    case 'author': return 'Yazar';
    case 'edition': return 'Baskı';
    default: return type;
  }
};

function getContentPreview(content: ContentDetail) {
  const preferred = content.translations.find((translation) => translation.language === 'tr')
    || content.translations.find((translation) => translation.language === 'ar')
    || content.translations[0];
  return preferred?.text_content || 'Hadis metni bulunmuyor.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 16,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#2196F3',
  },
  linkedHadithCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  linkedHadithHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedHadithTitle: {
    flex: 1,
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
    marginRight: 6,
  },
  linkedHadithText: {
    color: '#455A64',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyInfoText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
