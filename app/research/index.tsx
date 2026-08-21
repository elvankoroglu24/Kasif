import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ResearchService } from '../../database/research';
import { Research, Tag } from '../../database/types';

export default function ResearchListScreen() {
  const router = useRouter();
  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);

  const loadResearches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ResearchService.getAllResearches({
        search: searchQuery,
        status: filterStatus,
        category: filterCategory,
      });
      setResearches(data);
    } catch (error) {
      console.error('Error loading researches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterStatus, filterCategory]);

  useFocusEffect(
    useCallback(() => {
      loadResearches();
    }, [loadResearches])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadResearches();
  };

  const renderItem = ({ item }: { item: Research }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/research/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.cardSummary} numberOfLines={2}>
        {item.summary || 'Özet belirtilmemiş.'}
      </Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.categoryContainer}>
          <Ionicons name="folder-outline" size={14} color="#666" />
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.updated_at).toLocaleDateString('tr-TR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Araştırmalarda ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={researches}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Henüz bir araştırma bulunmuyor.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/research/create')}
              >
                <Text style={styles.emptyButtonText}>İlk Araştırmanı Oluştur</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/research/create')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2196F3',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
