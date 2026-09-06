import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../database';
import { TABLES } from '../../database/schema';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

type DashboardStats = { hadiths: number; vocabulary: number; favorites: number; worked: number; researches: number; dhikrs: number };
const EMPTY_STATS: DashboardStats = { hadiths: 0, vocabulary: 0, favorites: 0, worked: 0, researches: 0, dhikrs: 0 };

type Card = { label: string; description: string; icon: keyof typeof Ionicons.glyphMap; route: string; color: string };

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, scaleText, densitySpacing } = useAppPreferences();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadStats = useCallback(async () => {
    try {
      const db = getDb();
      const [hadiths, vocabulary, favorites, worked, researches, dhikrs] = await Promise.all([
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.CONTENTS} WHERE type = 'hadith'`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.PERSONAL_VOCABULARY_WORDS}`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.FAVORITES}`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(DISTINCT source_id) AS count FROM ${TABLES.RESEARCH_SOURCES} WHERE source_type = 'content'`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.RESEARCHES}`),
        db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.DHIKRS} WHERE is_active = 1`),
      ]);
      setStats({ hadiths: Number(hadiths?.count ?? 0), vocabulary: Number(vocabulary?.count ?? 0), favorites: Number(favorites?.count ?? 0), worked: Number(worked?.count ?? 0), researches: Number(researches?.count ?? 0), dhikrs: Number(dhikrs?.count ?? 0) });
    } catch (error) { console.error('Ana sayfa istatistikleri yüklenemedi:', error); setStats(EMPTY_STATS); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  const primaryCards: Card[] = [
    { label: 'Hadisler', description: 'Yerel hadis koleksiyonu', icon: 'book-outline', route: '/discover', color: tokens.primary },
    { label: 'Kitaplık', description: 'Kişisel TXT kitapların', icon: 'library-outline', route: '/library', color: tokens.secondary },
    { label: 'Zikir', description: 'Kendi sayacını oluştur', icon: 'repeat-outline', route: '/dhikr', color: tokens.accent },
    { label: 'Kelime Defteri', description: 'Arapça kelimelerini çalış', icon: 'language-outline', route: '/vocabulary', color: tokens.primary },
    { label: 'Araştırmalarım', description: 'Notlarını ve kaynaklarını yönet', icon: 'flask-outline', route: '/research', color: tokens.success },
    { label: 'Favoriler', description: 'Kaydettiğin hadisler', icon: 'star-outline', route: '/favorites', color: tokens.accent },
  ];
  const quickCards: Card[] = [
    { label: 'Çalışılan hadisler', description: '', icon: 'analytics-outline', route: '/worked', color: tokens.secondary },
    { label: 'Arama', description: '', icon: 'search-outline', route: '/search', color: tokens.primary },
    { label: 'Ayarlar', description: '', icon: 'settings-outline', route: '/settings', color: tokens.textSecondary },
  ];
  const navigate = (route: string) => router.push(route as never);

  return <ScrollView style={[styles.screen, { backgroundColor: tokens.background }]} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, densitySpacing(14)), paddingBottom: insets.bottom + densitySpacing(28) }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadStats(); }} tintColor={tokens.primary} />}>
    <View style={styles.heading}><Text style={[styles.eyebrow, { color: tokens.primary, fontSize: scaleText(12) }]}>KASİF</Text><Text style={[styles.title, { color: tokens.text, fontSize: scaleText(28) }]}>Bilgi yolculuğunuz</Text><Text style={[styles.subtitle, { color: tokens.textSecondary, fontSize: scaleText(14) }]}>Hadislerinizi, araştırmalarınızı ve kişisel çalışma alanınızı tek yerde tutun.</Text></View>
    <Text style={[styles.sectionTitle, { color: tokens.text, fontSize: scaleText(19) }]}>Bölümler</Text>
    <View style={styles.primaryGrid}>{primaryCards.map((card) => <Pressable key={card.route} onPress={() => navigate(card.route)} accessibilityRole="button" accessibilityLabel={card.label} style={({ pressed }) => [styles.primaryCard, { backgroundColor: tokens.card, borderColor: tokens.border }, pressed && styles.pressed]}><View style={[styles.cardIcon, { backgroundColor: `${card.color}18` }]}><Ionicons name={card.icon} size={23} color={card.color} /></View><Text style={[styles.cardLabel, { color: tokens.text, fontSize: scaleText(15) }]}>{card.label}</Text><Text style={[styles.cardDescription, { color: tokens.textMuted, fontSize: scaleText(11) }]} numberOfLines={2}>{card.description}</Text></Pressable>)}</View>
    <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: tokens.text, fontSize: scaleText(19) }]}>Hızlı erişim</Text><Ionicons name="arrow-forward" size={18} color={tokens.textMuted} /></View>
    <View style={[styles.quickRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}>{quickCards.map((card) => <Pressable key={card.route} onPress={() => navigate(card.route)} accessibilityRole="button" accessibilityLabel={card.label} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}><Ionicons name={card.icon} size={21} color={card.color} /><Text style={[styles.quickLabel, { color: tokens.text, fontSize: scaleText(11) }]} numberOfLines={2}>{card.label}</Text></Pressable>)}</View>
    <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: tokens.text, fontSize: scaleText(19) }]}>Yerel kütüphane</Text><Text style={[styles.secondaryHint, { color: tokens.textMuted, fontSize: scaleText(11) }]}>Gerçek kayıtlar</Text></View>
    {loading ? <ActivityIndicator color={tokens.primary} style={styles.loader} /> : <View style={styles.statsGrid}>{[['Hadis', stats.hadiths], ['Kelime', stats.vocabulary], ['Favori', stats.favorites], ['Çalışılan', stats.worked], ['Araştırma', stats.researches], ['Zikir', stats.dhikrs]].map(([label, value]) => <View key={String(label)} style={[styles.stat, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}><Text style={[styles.statValue, { color: tokens.text, fontSize: scaleText(20) }]}>{value}</Text><Text style={[styles.statLabel, { color: tokens.textMuted, fontSize: scaleText(11) }]}>{label}</Text></View>)}</View>}
  </ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { paddingHorizontal: 16 }, heading: { marginBottom: 24 }, eyebrow: { fontWeight: '900', letterSpacing: 1.5 }, title: { fontWeight: '900', marginTop: 4 }, subtitle: { lineHeight: 21, marginTop: 8, maxWidth: 390 }, sectionTitle: { fontWeight: '800' }, primaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }, primaryCard: { borderRadius: 16, borderWidth: 1, minHeight: 126, padding: 14, width: '48%' }, cardIcon: { alignItems: 'center', borderRadius: 12, height: 42, justifyContent: 'center', marginBottom: 10, width: 42 }, cardLabel: { fontWeight: '800' }, cardDescription: { lineHeight: 16, marginTop: 4 }, sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 25 }, quickRow: { borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 7 }, quickCard: { alignItems: 'center', flex: 1, minHeight: 70, justifyContent: 'center', paddingHorizontal: 5 }, quickLabel: { fontWeight: '800', marginTop: 7, textAlign: 'center' }, secondaryHint: { fontWeight: '700' }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, stat: { borderRadius: 12, borderWidth: 1, minHeight: 62, padding: 10, width: '31.8%' }, statValue: { fontWeight: '900' }, statLabel: { marginTop: 3 }, loader: { marginVertical: 22 }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] } });
