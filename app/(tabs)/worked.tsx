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
import { ResearchService, WorkedHadithItem } from '../../database/research';

type FilterKey = 'all' | 'commentary' | 'notes' | 'research' | 'sources' | 'draft' | 'completed';
type SortKey = 'recent' | 'oldest' | 'source' | 'work';

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tümü', icon: 'layers-outline' },
  { key: 'commentary', label: 'Şerhlerim', icon: 'chatbox-ellipses-outline' },
  { key: 'notes', label: 'Notlarım', icon: 'create-outline' },
  { key: 'research', label: 'Araştırmalarım', icon: 'document-text-outline' },
  { key: 'sources', label: 'Kaynaklarım', icon: 'link-outline' },
  { key: 'draft', label: 'Taslak', icon: 'pencil-outline' },
  { key: 'completed', label: 'Tamamlanan', icon: 'checkmark-circle-outline' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Son çalışılan' },
  { key: 'oldest', label: 'En eski' },
  { key: 'source', label: 'Kaynak sayısına göre' },
  { key: 'work', label: 'Eser adına göre' },
];

export default function WorkedHadithsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WorkedHadithItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const loadWorkedHadiths = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ResearchService.getWorkedHadiths(
        filter === 'all' ? undefined : filter,
        sort === 'recent' ? undefined : sort,
      );
      setItems(data);
    } catch (error) {
      console.error('Çalıştığım hadisler yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, sort]);

  useFocusEffect(
    useCallback(() => {
      loadWorkedHadiths();
    }, [loadWorkedHadiths]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkedHadiths();
  };

  const renderItem = ({ item }: { item: WorkedHadithItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/content/${item.content_id}`)}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.workInfo}>
          <Ionicons name="book-outline" size={16} color="#1976D2" />
          <Text style={styles.workTitle} numberOfLines={1}>{item.work_title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
      </View>

      <Text style={styles.hadithNumber}>
        Hadis {item.number_in_work || item.content_id}
      </Text>
      <Text style={styles.snippet} numberOfLines={3}>{item.text_snippet}</Text>

      <View style={styles.indicatorRow}>
        <StatusIndicator
          active={item.has_research}
          icon="document-text-outline"
          label={`${item.research_count} araştırma`}
        />
        <StatusIndicator active={item.has_commentary} icon="chatbox-ellipses-outline" label="Şerh" />
        <StatusIndicator active={item.has_notes} icon="create-outline" label="Not" />
        <StatusIndicator active={item.has_sources} icon="link-outline" label={`${item.source_count} kaynak`} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.author} numberOfLines={1}>{item.author_name || 'Yazar bilgisi yok'}</Text>
        <Text style={styles.date}>{formatDate(item.last_worked_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.introCard}>
        <View style={styles.introIcon}>
          <Ionicons name="flask-outline" size={24} color="#1976D2" />
        </View>
        <View style={styles.introTextContainer}>
          <Text style={styles.introTitle}>Çalıştığım Hadisler</Text>
          <Text style={styles.introText}>
            Araştırma, not, şerh veya kaynak eklediğiniz hadisler burada otomatik görünür.
          </Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Ionicons
              name={item.icon}
              size={15}
              color={filter === item.key ? '#fff' : '#616161'}
            />
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>{items.length} hadis</Text>
        <View>
          <TouchableOpacity style={styles.sortButton} onPress={() => setSortOpen((open) => !open)}>
            <Ionicons name="swap-vertical-outline" size={17} color="#1976D2" />
            <Text style={styles.sortButtonText}>{SORTS.find((item) => item.key === sort)?.label}</Text>
            <Ionicons name={sortOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#1976D2" />
          </TouchableOpacity>
          {sortOpen && (
            <View style={styles.sortMenu}>
              {SORTS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.sortOption}
                  onPress={() => {
                    setSort(option.key);
                    setSortOpen(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, sort === option.key && styles.sortOptionActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

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
          ListEmptyComponent={(
            <View style={styles.emptyContainer}>
              <Ionicons name="flask-outline" size={64} color="#BDBDBD" />
              <Text style={styles.emptyTitle}>Henüz üzerinde çalıştığınız hadis yok</Text>
              <Text style={styles.emptyText}>
                Bir hadise araştırma bağladığınızda veya hadis üzerinden çalışma oluşturduğunuzda burada görünecek.
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

function StatusIndicator({ active, icon, label }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={[styles.indicator, !active && styles.indicatorInactive]}>
      <Ionicons name={icon} size={14} color={active ? '#1976D2' : '#BDBDBD'} />
      <Text style={[styles.indicatorText, !active && styles.indicatorTextInactive]}>{label}</Text>
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
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  introTextContainer: { flex: 1 },
  introTitle: { fontSize: 18, fontWeight: '700', color: '#0D47A1', marginBottom: 4 },
  introText: { fontSize: 13, lineHeight: 19, color: '#35627D' },
  filterList: { paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  filterText: { fontSize: 13, color: '#616161', marginLeft: 5 },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    zIndex: 2,
  },
  resultCount: { fontSize: 13, color: '#757575' },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  sortButtonText: { color: '#1976D2', fontSize: 12, marginHorizontal: 5 },
  sortMenu: {
    position: 'absolute',
    right: 0,
    top: 42,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  sortOption: { paddingHorizontal: 12, paddingVertical: 11 },
  sortOptionText: { color: '#424242', fontSize: 13 },
  sortOptionActive: { color: '#1976D2', fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 10, paddingBottom: 30, flexGrow: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  workTitle: { flex: 1, color: '#1976D2', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  hadithNumber: { color: '#424242', fontSize: 13, fontWeight: '700', marginTop: 10 },
  snippet: { color: '#555', fontSize: 15, lineHeight: 23, marginTop: 6 },
  indicatorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 13, gap: 6 },
  indicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4 },
  indicatorInactive: { backgroundColor: '#F5F5F5' },
  indicatorText: { color: '#1976D2', fontSize: 11, marginLeft: 4 },
  indicatorTextInactive: { color: '#9E9E9E' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 13, paddingTop: 10 },
  author: { flex: 1, color: '#757575', fontSize: 12, marginRight: 8 },
  date: { color: '#9E9E9E', fontSize: 12 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 70 },
  emptyTitle: { color: '#424242', fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  emptyText: { color: '#757575', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976D2', borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 7 },
});

/* eslint-disable react/no-unstable-nested-components */
