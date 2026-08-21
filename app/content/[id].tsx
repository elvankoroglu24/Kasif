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
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ContentService, ContentDetail } from '../../database/content';

export default function ContentDetailScreen() {
  const { id, type } = useLocalSearchParams();
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const detail = await ContentService.getContentDetail(parseInt(id as string, 10));
      if (detail) {
        setContent(detail);
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

  const handleAddToResearch = () => {
    // Placeholder for Task 7/8 functionality
    Alert.alert('Bilgi', 'Bu özellik bir sonraki aşamada eklenecektir. İçeriği araştırmalarınıza kaynak olarak bağlayabileceksiniz.');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!content) return null;

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
            <Text style={styles.sectionTitle}>{content.section.title}</Text>
          )}
        </View>

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
          <TouchableOpacity style={styles.actionButton} onPress={handleAddToResearch}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Araştırmaya Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
            <Ionicons name="star-outline" size={20} color="#2196F3" />
            <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Favori</Text>
          </TouchableOpacity>
        </View>

        {/* Commentaries */}
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
        </View>
      </ScrollView>
    </View>
  );
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
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  commentarySection: {
    padding: 20,
    backgroundColor: '#fafafa',
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
