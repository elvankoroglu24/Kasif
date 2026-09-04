import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../database';
import { TABLES } from '../../database/schema';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

type DhikrItem = { id: number; text: string; target: number | null; groupTitle: string | null };

export default function DhikrScreen() {
  const { tokens, scaleText } = useAppPreferences();
  const [items, setItems] = useState<DhikrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await getDb().getAllAsync<{ id: number; text: string; target: number | null; group_title: string | null }>(
        `SELECT d.id, d.text, d.target, g.title AS group_title FROM ${TABLES.DHIKRS} d LEFT JOIN ${TABLES.DHIKR_GROUPS} g ON g.id = d.group_id ORDER BY g.sort_order ASC, d.sort_order ASC, d.id ASC LIMIT 100`,
      );
      setItems(rows.map((row) => ({ id: Number(row.id), text: String(row.text || ''), target: row.target == null ? null : Number(row.target), groupTitle: row.group_title ? String(row.group_title) : null })));
    } catch (caught) {
      console.error('Zikir içeriği yüklenemedi:', caught);
      setError('Yerel zikir içeriği okunamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <View style={[styles.screen, { backgroundColor: tokens.background }]}>
    <View style={[styles.header, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}><View style={[styles.icon, { backgroundColor: tokens.selected }]}><Ionicons name="repeat-outline" size={26} color={tokens.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: tokens.text, fontSize: scaleText(20) }]}>Zikir</Text><Text style={[styles.subtitle, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>Yerel zikir içerikleriniz</Text></View></View>
    {loading ? <ActivityIndicator style={styles.center} color={tokens.primary} /> : error ? <State title="Zikir okunamadı" message={error} tokens={tokens} scaleText={scaleText} /> : <FlatList data={items} keyExtractor={(item) => String(item.id)} contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={tokens.primary} />} renderItem={({ item }) => <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}><Text style={[styles.group, { color: tokens.primary, fontSize: scaleText(12) }]}>{item.groupTitle || 'Zikir'}</Text><Text style={[styles.text, { color: tokens.text, fontSize: scaleText(17) }]}>{item.text || 'Metin bulunmuyor.'}</Text>{item.target != null ? <Text style={[styles.target, { color: tokens.textMuted, fontSize: scaleText(12) }]}>Hedef: {item.target}</Text> : null}</View>} ListEmptyComponent={<State title="Zikir içeriği yok" message="Bu bölüm için içerik henüz yüklenmedi." tokens={tokens} scaleText={scaleText} />} />}
  </View>;
}

function State({ title, message, tokens, scaleText }: { title: string; message: string; tokens: ReturnType<typeof useAppPreferences>['tokens']; scaleText: (size: number) => number }) { return <View style={styles.empty}><Ionicons name="repeat-outline" size={58} color={tokens.textMuted} /><Text style={[styles.emptyTitle, { color: tokens.text, fontSize: scaleText(19) }]}>{title}</Text><Text style={[styles.emptyText, { color: tokens.textSecondary, fontSize: scaleText(14) }]}>{message}</Text></View>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', margin: 16, padding: 15, borderRadius: 16 }, icon: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, marginLeft: 12 }, title: { fontWeight: '800' }, subtitle: { marginTop: 3 }, center: { marginTop: 70 }, list: { padding: 16, paddingTop: 6, paddingBottom: 30 }, emptyList: { flexGrow: 1 }, card: { borderRadius: 15, borderWidth: 1, marginBottom: 10, padding: 16 }, group: { fontWeight: '800' }, text: { lineHeight: 28, marginTop: 9, textAlign: 'right' }, target: { marginTop: 12 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 }, emptyTitle: { fontWeight: '800', marginTop: 16, textAlign: 'center' }, emptyText: { lineHeight: 21, marginTop: 8, textAlign: 'center' } });
