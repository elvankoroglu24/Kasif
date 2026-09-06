import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PersonalBooksService } from '../../database/personalBooks';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

type Paragraph = { order_index: number; text_content: string };

export default function BookReaderScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tokens, scaleText } = useAppPreferences();
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [loading, setLoading] = useState(true);

  const bookId = id ? Number.parseInt(id, 10) : NaN;
  const load = useCallback(async () => {
    if (!Number.isSafeInteger(bookId) || bookId <= 0) return;
    try {
      setParagraphs(await PersonalBooksService.getParagraphs(bookId));
    } catch (error) {
      console.error('Kitap metni yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <View style={[styles.center, { backgroundColor: tokens.background }]}><ActivityIndicator color={tokens.primary} /></View>;

  return (
    <View style={[styles.screen, { backgroundColor: tokens.background }]}>
      <Stack.Screen options={{ title: 'Kitap okuma' }} />
      <FlatList<Paragraph>
        data={paragraphs}
        keyExtractor={(item) => String(item.order_index)}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => <Text style={[styles.paragraph, { color: tokens.text, fontSize: scaleText(17) }]}>{item.text_content}</Text>}
        ListEmptyComponent={<View style={styles.center}><Text style={{ color: tokens.textSecondary }}>Bu kitapta okunabilir metin bulunamadı.</Text></View>}
        onViewableItemsChanged={({ viewableItems }) => {
          const item = viewableItems[0]?.item as Paragraph | undefined;
          if (item && Number.isSafeInteger(bookId)) void PersonalBooksService.updateProgress(bookId, item.order_index, paragraphs.length);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }, content: { padding: 18, paddingBottom: 38 }, paragraph: { lineHeight: 29, marginBottom: 20 } });
