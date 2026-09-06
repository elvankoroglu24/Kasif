import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../database';
import { TABLES } from '../../database/schema';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

type DiscoverItem = { id: number; numberInWork: string; workTitle: string; authorName: string; snippet: string };

export default function DiscoverScreen() {
  const router = useRouter();
  const { tokens, scaleText, densitySpacing } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await getDb().getAllAsync<{ id: number; number_in_work: string; work_title: string; author_name: string; snippet: string }>(
        `SELECT c.id, c.number_in_work, COALESCE(w.title, '') AS work_title, COALESCE(a.name, '') AS author_name,
          COALESCE(ar.text_content, fallback.text_content, '') AS snippet
         FROM ${TABLES.CONTENTS} c
         LEFT JOIN ${TABLES.SECTIONS} s ON s.id = c.section_id
         LEFT JOIN ${TABLES.WORKS} w ON w.id = s.work_id
         LEFT JOIN ${TABLES.AUTHORS} a ON a.id = w.author_id
         LEFT JOIN ${TABLES.CONTENT_TRANSLATIONS} ar ON ar.content_id = c.id AND ar.language = 'tr'
         LEFT JOIN ${TABLES.CONTENT_TRANSLATIONS} fallback ON fallback.content_id = c.id AND fallback.id = (
           SELECT MIN(ct.id) FROM ${TABLES.CONTENT_TRANSLATIONS} ct WHERE ct.content_id = c.id
         )
         ORDER BY c.id ASC LIMIT 30`,
      );
      setItems(rows.map((row) => ({ id: Number(row.id), numberInWork: String(row.number_in_work || ''), workTitle: String(row.work_title || 'Hadis kaynağı'), authorName: String(row.author_name || ''), snippet: String(row.snippet || '') })));
    } catch (caught) {
      console.error('Keşfet içerikleri yüklenemedi:', caught);
      setError('Yerel içerikler şu anda okunamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.intro, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border, marginTop: insets.top + 16 }]}>
        <View style={[styles.introIcon, { backgroundColor: tokens.selected }]}><Ionicons name="compass-outline" size={25} color={tokens.primary} /></View>
        <View style={styles.introCopy}><Text style={[styles.title, { color: tokens.text, fontSize: scaleText(19) }]}>Hadisler</Text><Text style={[styles.subtitle, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>Cihazınızdaki gerçek yerel hadis kayıtları.</Text></View>
      </View>
      {loading ? <ActivityIndicator style={styles.center} color={tokens.primary} /> : error ? <State icon="alert-circle-outline" title="İçerik okunamadı" message={error} tokens={tokens} scaleText={scaleText} onRetry={() => { setLoading(true); void load(); }} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={tokens.primary} />}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Hadis ${item.numberInWork || item.id}`} onPress={() => router.push(`/content/${item.id}`)} style={({ pressed }) => [styles.card, { backgroundColor: tokens.card, borderColor: tokens.border, padding: densitySpacing(14) }, pressed && styles.pressed]}><View style={styles.cardTop}><Text style={[styles.work, { color: tokens.primary, fontSize: scaleText(13) }]} numberOfLines={1}>{item.workTitle}</Text><Ionicons name="chevron-forward" size={18} color={tokens.textMuted} /></View><Text style={[styles.number, { color: tokens.text, fontSize: scaleText(14) }]}>Hadis {item.numberInWork || item.id}</Text><Text style={[styles.snippet, { color: tokens.textSecondary, fontSize: scaleText(14) }]} numberOfLines={3}>{item.snippet || 'Bu kayıt için metin bulunmuyor.'}</Text>{item.authorName ? <Text style={[styles.author, { color: tokens.textMuted, fontSize: scaleText(12) }]}>{item.authorName}</Text> : null}</Pressable>}
          ListEmptyComponent={<State icon="library-outline" title="Keşfedilecek içerik yok" message="Bu bölüm için içerik henüz yüklenmedi." tokens={tokens} scaleText={scaleText} />}
        />
      )}
    </View>
  );
}

function State({ icon, title, message, tokens, scaleText, onRetry }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; tokens: ReturnType<typeof useAppPreferences>['tokens']; scaleText: (size: number) => number; onRetry?: () => void }) {
  return <View style={styles.state}><Ionicons name={icon} size={52} color={tokens.textMuted} /><Text style={[styles.stateTitle, { color: tokens.text, fontSize: scaleText(18) }]}>{title}</Text><Text style={[styles.stateMessage, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>{message}</Text>{onRetry ? <Pressable onPress={onRetry} style={[styles.retry, { backgroundColor: tokens.primary }]}><Text style={styles.retryText}>Tekrar dene</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, intro: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', margin: 16, marginBottom: 4, padding: 15, borderRadius: 16 }, introIcon: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', width: 48 }, introCopy: { flex: 1, marginLeft: 12 }, title: { fontWeight: '800' }, subtitle: { lineHeight: 19, marginTop: 3 }, list: { padding: 16, paddingTop: 10, paddingBottom: 30 }, emptyList: { flexGrow: 1 }, card: { borderRadius: 15, borderWidth: 1, marginBottom: 10 }, cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, work: { flex: 1, fontWeight: '700', marginRight: 8 }, number: { fontWeight: '800', marginTop: 8 }, snippet: { lineHeight: 22, marginTop: 6 }, author: { marginTop: 9 }, center: { marginTop: 70 }, state: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 }, stateTitle: { fontWeight: '800', marginTop: 14, textAlign: 'center' }, stateMessage: { lineHeight: 20, marginTop: 7, textAlign: 'center' }, retry: { borderRadius: 11, marginTop: 17, paddingHorizontal: 18, paddingVertical: 12 }, retryText: { color: '#FFFFFF', fontWeight: '800' }, pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] } });
