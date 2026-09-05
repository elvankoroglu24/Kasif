import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../database';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

type DashboardStats = { contents: number; researches: number; favorites: number; vocabulary: number };
const EMPTY_STATS: DashboardStats = { contents: 0, researches: 0, favorites: 0, vocabulary: 0 };

export default function HomeScreen() {
  const router = useRouter();
  const { tokens, scaleText } = useAppPreferences();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const db = getDb();
      const [contents, researches, favorites, vocabulary] = await Promise.all([
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM contents WHERE type = 'hadith'"),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM researches'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM favorites'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM personal_vocabulary_words'),
      ]);
      setStats({
        contents: Number(contents?.count ?? 0),
        researches: Number(researches?.count ?? 0),
        favorites: Number(favorites?.count ?? 0),
        vocabulary: Number(vocabulary?.count ?? 0),
      });
    } catch (error) {
      console.error('Ana sayfa istatistikleri yüklenemedi:', error);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  const actions = [
    { label: 'Keşfet', icon: 'compass-outline' as const, route: '/discover', color: tokens.primary },
    { label: 'Kitaplık', icon: 'library-outline' as const, route: '/library', color: tokens.secondary },
    { label: 'Zikir', icon: 'repeat-outline' as const, route: '/dhikr', color: tokens.accent },
    { label: 'Araştırmalarım', icon: 'flask-outline' as const, route: '/research', color: tokens.success },
    { label: 'Kelime Defterim', icon: 'book-outline' as const, route: '/vocabulary', color: tokens.primary },
    { label: 'Favoriler', icon: 'star-outline' as const, route: '/favorites', color: tokens.accent },
    { label: 'Çalışılan hadisler', icon: 'analytics-outline' as const, route: '/worked', color: tokens.secondary },
    { label: 'Arama', icon: 'search-outline' as const, route: '/search', color: tokens.primary },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: tokens.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadStats(); }} tintColor={tokens.primary} />}
    >
      <View style={[styles.hero, { backgroundColor: tokens.primary }]}>
        <View style={styles.heroIcon}><Ionicons name="compass-outline" size={30} color="#FFFFFF" /></View>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { fontSize: scaleText(11) }]}>KASİF</Text>
          <Text style={[styles.title, { fontSize: scaleText(25) }]}>Bilgi yolculuğunu sürdür</Text>
          <Text style={[styles.heroText, { fontSize: scaleText(13) }]}>Yerel kütüphanen, araştırmaların ve çalışma araçların tek yerde.</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tokens.text, fontSize: scaleText(18) }]}>Kütüphane özeti</Text>
      {loading ? <ActivityIndicator style={styles.loader} color={tokens.primary} /> : (
        <View style={styles.statsGrid}>
          <Stat label="Hadis" value={stats.contents} tokens={tokens} />
          <Stat label="Araştırma" value={stats.researches} tokens={tokens} />
          <Stat label="Favori" value={stats.favorites} tokens={tokens} />
          <Stat label="Kelime" value={stats.vocabulary} tokens={tokens} />
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: tokens.text, fontSize: scaleText(18) }]}>Hızlı erişim</Text>
      <View style={styles.actionsGrid}>
        {actions.map((action) => (
          <Pressable key={action.route} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => router.push(action.route as never)} style={({ pressed }) => [styles.action, { backgroundColor: tokens.card, borderColor: tokens.border }, pressed && styles.pressed]}>
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}><Ionicons name={action.icon} size={22} color={action.color} /></View>
            <Text style={[styles.actionLabel, { color: tokens.text, fontSize: scaleText(12) }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, tokens }: { label: string; value: number; tokens: ReturnType<typeof useAppPreferences>['tokens'] }) {
  return <View style={[styles.stat, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}><Text style={[styles.statValue, { color: tokens.text }]}>{value}</Text><Text style={[styles.statLabel, { color: tokens.textMuted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 20, flexDirection: 'row', padding: 19, marginBottom: 22 },
  heroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, height: 58, justifyContent: 'center', width: 58 },
  heroCopy: { flex: 1, marginLeft: 14 },
  eyebrow: { color: '#D5EFF0', fontWeight: '800', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontWeight: '800', marginTop: 3 },
  heroText: { color: '#E8F4F5', lineHeight: 19, marginTop: 5 },
  sectionTitle: { fontWeight: '800', marginBottom: 10, marginTop: 2 },
  loader: { marginVertical: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 22 },
  stat: { borderRadius: 13, borderWidth: 1, minHeight: 74, padding: 12, width: '48%' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  action: { alignItems: 'center', borderRadius: 15, borderWidth: 1, minHeight: 104, padding: 13, width: '48%' },
  actionIcon: { alignItems: 'center', borderRadius: 13, height: 44, justifyContent: 'center', marginBottom: 9, width: 44 },
  actionLabel: { fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
