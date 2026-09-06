import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView 
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchService } from '../../database/search';
import { SearchResult } from '../../database/types';

const FILTERS = [
  { label: 'Tümü', value: 'all' },
  { label: 'Hadis', value: 'hadith' },
  { label: 'Şerh', value: 'commentary' },
  { label: 'Araştırmalarım', value: 'research' },
  { label: 'Diğer', value: 'other' },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Debounce logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    try {
      setLoading(true);
      const data = await SearchService.unifiedSearch(searchTerm);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'research') return item.type === 'research';
    if (activeFilter === 'commentary') return item.type === 'commentary';
    if (activeFilter === 'hadith') return item.type === 'content'; // Simplified mapping
    return true;
  });

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'content': return 'document-text-outline';
      case 'commentary': return 'chatbubble-ellipses-outline';
      case 'research': return 'library-outline';
      default: return 'help-circle-outline';
    }
  };

  const getResultLabel = (type: string) => {
    switch (type) {
      case 'content': return 'İçerik';
      case 'commentary': return 'Şerh';
      case 'research': return 'Araştırma';
      default: return type;
    }
  };

  const handleResultPress = (item: SearchResult) => {
    if (item.type === 'research') {
      router.push(`/research/${item.id}`);
    } else {
      router.push(`/content/${item.id}?type=${item.type}`);
    }
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultItem} 
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultHeader}>
        <View style={styles.typeBadge}>
          <Ionicons name={getResultIcon(item.type)} size={14} color="#2196F3" />
          <Text style={styles.typeText}>{getResultLabel(item.type)}</Text>
        </View>
        {item.work_title && (
          <Text style={styles.workTitle} numberOfLines={1}>{item.work_title}</Text>
        )}
      </View>
      
      {item.title && <Text style={styles.resultTitle}>{item.title}</Text>}
      
      <Text style={styles.snippet} numberOfLines={3}>
        {item.snippet.replace(/<b>/g, '').replace(/<\/b>/g, '')}
      </Text>
      
      {item.author_name && (
        <Text style={styles.authorName}>— {item.author_name}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Kasif'te ara..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                activeFilter === filter.value && styles.filterChipActive
              ]}
              onPress={() => setActiveFilter(filter.value)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter.value && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={query ? "search-outline" : "chatbubbles-outline"} 
                size={64} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {query 
                  ? "Aradığınız kriterlere uygun sonuç bulunamadı." 
                  : "Aramak istediğiniz kelimeyi yazın."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  resultItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typeText: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: 'bold',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  workTitle: {
    fontSize: 12,
    color: '#757575',
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  snippet: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  authorName: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});
