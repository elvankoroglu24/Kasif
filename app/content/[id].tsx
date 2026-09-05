import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Share,
  Clipboard,
  Platform,
  FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ContentService, ContentDetail } from '../../database/content';
import { ResearchService } from '../../database/research';
import { FavoritesService } from '../../database/favorites';
import { Research } from '../../database/types';
import { displaySectionTitle } from '../../utils/sectionTitle';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [linkedResearches, setLinkedResearches] = useState<Research[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const contentId = Number.parseInt(id, 10);
      if (!Number.isSafeInteger(contentId) || contentId <= 0) {
        throw new Error('Geçersiz içerik kimliği.');
      }

      const detail = await ContentService.getContentDetail(contentId);
      if (detail) {
        setContent(detail);

        // Optional user-owned data must not prevent the hadith itself from opening.
        try {
          setIsFavorite(await FavoritesService.isFavorite(contentId));
        } catch (error) {
          console.warn('Favori durumu okunamadı:', error);
          setIsFavorite(false);
        }

        try {
          const researches = await ResearchService.getResearchesBySource('content', contentId);
          setLinkedResearches(researches);
        } catch (error) {
          console.warn('Bağlı araştırmalar okunamadı:', error);
          setLinkedResearches([]);
        }
      } else {
        Alert.alert('Hata', 'İçerik bulunamadı.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('Hata', 'İçerik yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShare = async () => {
    if (!content) return;
    const text = content.translations.map(t => `${t.language.toUpperCase()}: ${t.text_content}`).join('\n\n');
    const source = content.work ? `\n\nKaynak: ${content.work.title}${content.work.author_name ? ` - ${content.work.author_name}` : ''}` : '';
    
    try {
      await Share.share({
        message: `${text}${source}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    const text = content.translations.map(t => t.text_content).join('\n\n');
    const source = content.work ? `\n\nKaynak: ${content.work.title}` : '';
    Clipboard.setString(`${text}${source}`);
    Alert.alert('Başarılı', 'Metin panoya kopyalandı.');
  };

  const handleToggleFavorite = async () => {
    if (!content) return;

    try {
      const nextValue = await FavoritesService.toggleFavorite(content.id);
      setIsFavorite(nextValue);
      Alert.alert(
        'Favoriler',
        nextValue ? 'Hadis favorilere eklendi.' : 'Hadis favorilerden çıkarıldı.',
      );
    } catch (error) {
      console.error('Favori güncellenemedi:', error);
      Alert.alert('Hata', 'Favori durumu güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleAddResearch = () => {
    if (!content) return;
    
    let prefillTitle = '';
    if (content.type === 'hadith') {
      const metadata = content.metadata ? JSON.parse(content.metadata) : {};
      const hadithNo = metadata.hadith_number || content.number_in_work || content.id;
      prefillTitle = `${content.work?.title || 'Hadis'} No: ${hadithNo}`;
    }

    router.push({
      pathname: '/research/create',
      params: { 
        sourceId: content.id,
        sourceType: 'content',
        prefillTitle: prefillTitle,
        prefillCategory: content.type === 'hadith' ? 'hadith' : 'general'
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!content) return null;

  const metadata = parseMetadata(content.metadata);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: getTitleByType(content.type),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
                <Ionicons name="share-social-outline" size={24} color="#2196F3" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCopy} style={styles.headerIcon}>
                <Ionicons name="copy-outline" size={24} color="#2196F3" />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Source Header */}
        <View style={styles.sourceHeader}>
          {content.work && (
            <View style={styles.workInfo}>
              <Text style={styles.workTitle}>{content.work.title}</Text>
              {content.work.author_name && (
                <Text style={styles.authorName}>{content.work.author_name}</Text>
              )}
            </View>
          )}
          {content.section && (
            <Text style={styles.sectionTitle}>{displaySectionTitle(content.section)}</Text>
          )}
        </View>

        {/* Hadith Metadata (if applicable) */}
        {content.type === 'hadith' && (
          <View style={styles.metadataBox}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Hadis No:</Text>
              <Text style={styles.metadataValue}>{metadata.hadith_number || content.number_in_work}</Text>
            </View>
            {metadata.grade && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Derece:</Text>
                <Text style={[styles.metadataValue, styles.gradeText]}>{metadata.grade}</Text>
              </View>
            )}
            {metadata.reference && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Referans:</Text>
                <Text style={styles.metadataValue}>{metadata.reference}</Text>
              </View>
            )}
          </View>
        )}

        {/* Translations (Arabic first if available) */}
        {content.translations.sort((a, b) => a.language === 'ar' ? -1 : 1).map((trans) => (
          <View key={trans.id} style={styles.textSection}>
            <View style={styles.langHeader}>
              <Text style={styles.langLabel}>{trans.language.toUpperCase()}</Text>
            </View>
            <Text style={[
              styles.mainText, 
              trans.language === 'ar' ? styles.arabicText : styles.turkishText
            ]}>
              {trans.text_content}
            </Text>
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddResearch}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Bu Hadis Üzerinde Çalışıyorum</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction, isFavorite && styles.favoriteActive]}
            onPress={handleToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={isFavorite ? '#F9A825' : '#2196F3'}
            />
            <Text style={[styles.actionButtonText, { color: isFavorite ? '#F57F17' : '#2196F3' }]}>
              {isFavorite ? 'Favorilerden çıkar' : 'Favori'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* My Researches Section */}
        <View style={styles.researchSection}>
          <Text style={styles.sectionHeading}>Çalışmalarım ({linkedResearches.length})</Text>
          {linkedResearches.length > 0 ? (
            linkedResearches.map((research) => (
              <TouchableOpacity 
                key={research.id} 
                style={styles.researchCard}
                onPress={() => router.push(`/research/${research.id}`)}
              >
                <View style={styles.researchCardHeader}>
                  <Text style={styles.researchCardTitle} numberOfLines={1}>{research.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(research.status) }]}>
                    <Text style={styles.statusText}>{research.status}</Text>
                  </View>
                </View>
                {research.summary && <Text style={styles.researchCardSummary} numberOfLines={2}>{research.summary}</Text>}
                <Text style={styles.researchCardDate}>{new Date(research.updated_at).toLocaleDateString('tr-TR')}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Bu hadis hakkında henüz bir araştırmanız bulunmuyor.</Text>
            </View>
          )}
        </View>

        {/* Commentaries (Existing ones) */}
        {content.commentaries.length > 0 && (
          <View style={styles.commentarySection}>
            <Text style={styles.sectionHeading}>Şerhler</Text>
            {content.commentaries.map((comm) => (
              <View key={comm.id} style={styles.commentaryCard}>
                <View style={styles.commentaryHeader}>
                  <Text style={styles.commentaryAuthor}>{comm.author_name || 'Bilinmeyen Şarih'}</Text>
                  {comm.work_title && <Text style={styles.commentaryWork}>{comm.work_title}</Text>}
                </View>
                {comm.title && <Text style={styles.commentaryTitle}>{comm.title}</Text>}
                <Text style={styles.commentaryText}>{comm.text_content}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>İçerik No: {content.number_in_work || content.id}</Text>
          <Text style={styles.footerText}>Tür: {getLabelByType(content.type)}</Text>
          {metadata.source_dataset && (
            <Text style={styles.footerText}>Kaynak Veri: {metadata.source_dataset} ({metadata.license})</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function parseMetadata(metadata?: string | null): Record<string, any> {
  if (!metadata) return {};
  try {
    const parsed: unknown = JSON.parse(metadata);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : {};
  } catch {
    return {};
  }
}

function getTitleByType(type: string) {
  switch (type) {
    case 'hadith': return 'Hadis Detayı';
    case 'ayah': return 'Ayet Detayı';
    case 'dhikr': return 'Zikir Detayı';
    case 'wird': return 'Evrad Detayı';
    default: return 'İçerik Detayı';
  }
}

function getLabelByType(type: string) {
  switch (type) {
    case 'hadith': return 'Hadis';
    case 'ayah': return 'Ayet';
    case 'dhikr': return 'Zikir';
    case 'wird': return 'Evrad';
    case 'tafsir': return 'Tefsir';
    case 'fiqh': return 'Fıkıh';
    default: return type;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft': return '#FFA000';
    case 'completed': return '#4CAF50';
    case 'archived': return '#9E9E9E';
    default: return '#2196F3';
  }
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
  scrollContent: {
    paddingBottom: 40,
  },
  sourceHeader: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  workInfo: {
    marginBottom: 4,
  },
  workTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  authorName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  metadataBox: {
    padding: 15,
    margin: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    width: 80,
  },
  metadataValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  gradeText: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  textSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  langHeader: {
    marginBottom: 10,
  },
  langLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainText: {
    color: '#333',
  },
  arabicText: {
    fontSize: 28,
    lineHeight: 48,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
  },
  turkishText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'left',
  },
  actionRow: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  secondaryAction: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    marginRight: 0,
    marginLeft: 10,
  },
  favoriteActive: {
    borderColor: '#F9A825',
    backgroundColor: '#FFFDE7',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  researchSection: {
    padding: 20,
    backgroundColor: '#fff',
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  researchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  researchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  researchCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  researchCardSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  researchCardDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  emptyBox: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  commentarySection: {
    padding: 20,
    backgroundColor: '#fafafa',
  },
  commentaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  commentaryHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  commentaryAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  commentaryWork: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  commentaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 8,
  },
  commentaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
