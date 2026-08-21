import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FavoritesService } from '../../database/favorites';
import { FavoriteHadithItem, Section } from '../../database/types';
import { displaySectionTitle } from '../../utils/sectionTitle';

export default function FavoritesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<FavoriteHadithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await FavoritesService.getFavorites());
    } catch (error) {
      console.error('Favori hadisler yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handleRemove = async (contentId: number) => {
    try {
      await FavoritesService.removeFavorite(contentId);
      setItems((current) => current.filter((item) => item.content_id !== contentId));
    } catch (error) {
      console.error('Favori kaldırılamadı:', error);
    }
  };

  const renderItem = ({ item }: { item: FavoriteHadithItem }) => {
    const section = {
      id: 0,
      work_id: 0,
      title: item.section_title || undefined,
      metadata: item.section_metadata || undefined,
      type: 'chapter',
    } satisfies Section;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardBody}
          activeOpacity={0.75}
          onPress={() => router.push(`/content/${item.content_id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${item.work_title}, Hadis ${item.number_in_work || item.content_id}`}
        >
          <View style={styles.cardHeader}>
            <View style={styles.workInfo}>
              <Ionicons name="book-outline" size={17} color="#1976D2" />
              <Text style={styles.workTitle} numberOfLines={1}>{item.work_title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </View>
          <Text style={styles.hadithNumber}>Hadis {item.number_in_work || item.content_id}</Text>
          {!!item.section_title && (
            <Text style={styles.sectionTitle} numberOfLines={2}>{displaySectionTitle(section)}</Text>
          )}
          <Text style={styles.snippet} numberOfLines={4}>{item.text_snippet}</Text>
          <View style={styles.footer}>
            <Text style={styles.author} numberOfLines={1}>{item.author_name || 'Yazar bilgisi yok'}</Text>
            <Text style={styles.date}>{formatDate(item.favorited_at)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item.content_id)}
          accessibilityRole="button"
          accessibilityLabel="Favorilerden çıkar"
        >
          <Ionicons name="star" size={20} color="#F9A825" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.content_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListHeaderComponent={items.length > 0 ? (
            <View style={styles.introCard}>
              <Ionicons name="star" size={24} color="#F9A825" />
              <View style={styles.introTextContainer}>
                <Text style={styles.introTitle}>Favori Hadisler</Text>
                <Text style={styles.introText}>{items.length} hadis çevrimdışı erişim için kayıtlı.</Text>
              </View>
            </View>
          ) : null}
          ListEmptyComponent={(
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color="#BDBDBD" />
              <Text style={styles.emptyTitle}>Henüz favori hadisin yok</Text>
              <Text style={styles.emptyText}>
                Hadis detayındaki yıldız simgesine dokunarak hadisleri burada saklayabilirsin.
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/search')}>
                <Ionicons name="search-outline" size={19} color="#fff" />
                <Text style={styles.emptyButtonText}>Hadis Ara</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

function formatDate(value: string) {
  if (!value) return 'Tarih yok';
  const parsed = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('tr-TR');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 30, flexGrow: 1 },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  introTextContainer: { flex: 1, marginLeft: 12 },
  introTitle: { color: '#8D6E00', fontSize: 18, fontWeight: '700', marginBottom: 3 },
  introText: { color: '#856E1B', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardBody: { padding: 15, paddingRight: 52 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  workTitle: { flex: 1, color: '#1976D2', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  hadithNumber: { color: '#424242', fontSize: 13, fontWeight: '700', marginTop: 10 },
  sectionTitle: { color: '#757575', fontSize: 13, marginTop: 5 },
  snippet: { color: '#555', fontSize: 15, lineHeight: 23, marginTop: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 13,
    paddingTop: 10,
  },
  author: { flex: 1, color: '#757575', fontSize: 12, marginRight: 8 },
  date: { color: '#9E9E9E', fontSize: 12 },
  removeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDE7',
  },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 90 },
  emptyTitle: { color: '#424242', fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  emptyText: { color: '#757575', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976D2', borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 7 },
});
