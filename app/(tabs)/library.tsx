import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PersonalBook, PersonalBooksService } from '../../database/personalBooks';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

export default function LibraryScreen() {
  const router = useRouter();
  const { tokens, scaleText } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<PersonalBook[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setBooks(await PersonalBooksService.list()); }
    catch (error) { console.error('Kitaplık yüklenemedi:', error); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const addBook = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    try { await PersonalBooksService.importTxt({ uri: file.uri, name: file.name, size: file.size }); await load(); }
    catch (error) { Alert.alert('Kitap eklenemedi', error instanceof Error ? error.message : 'TXT dosyası işlenemedi.'); }
  };

  const removeBook = (book: PersonalBook) => Alert.alert('Kitabı kaldır', `${book.title} yerel cihazdan kaldırılacak.`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Kaldır', style: 'destructive', onPress: async () => { await PersonalBooksService.remove(book); await load(); } }]);

  return <View style={[styles.screen, { backgroundColor: tokens.background }]}><FlatList data={books} keyExtractor={(item) => String(item.id)} contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }, books.length === 0 && styles.emptyList]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={tokens.primary} />} ListHeaderComponent={<View style={[styles.header, { backgroundColor: tokens.surface, borderColor: tokens.border }]}><View style={[styles.icon, { backgroundColor: tokens.selected }]}><Ionicons name="library-outline" size={26} color={tokens.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: tokens.text, fontSize: scaleText(20) }]}>Kitaplık</Text><Text style={[styles.subtitle, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>Cihazınızdaki TXT kitaplarını offline okuyun.</Text></View><Pressable onPress={() => void addBook()} style={[styles.addButton, { backgroundColor: tokens.primary }]}><Ionicons name="add" size={22} color="#fff" /></Pressable></View>} renderItem={({ item }) => <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}><Pressable onPress={() => router.push(`/books/${item.id}`)} style={styles.bookPress}><View style={[styles.bookIcon, { backgroundColor: tokens.selected }]}><Ionicons name="document-text-outline" size={25} color={tokens.primary} /></View><View style={styles.bookCopy}><Text style={[styles.bookTitle, { color: tokens.text, fontSize: scaleText(16) }]} numberOfLines={2}>{item.title}</Text><Text style={[styles.meta, { color: tokens.textMuted, fontSize: scaleText(12) }]}>{item.originalFileName} · %{Math.round(item.progressPercent)}</Text></View></Pressable><Pressable onPress={() => removeBook(item)} hitSlop={10}><Ionicons name="trash-outline" size={21} color={tokens.error} /></Pressable></View>} ListEmptyComponent={<View style={styles.empty}><Ionicons name="library-outline" size={60} color={tokens.textMuted} /><Text style={[styles.emptyTitle, { color: tokens.text, fontSize: scaleText(19) }]}>Kitaplığınız boş</Text><Text style={[styles.emptyText, { color: tokens.textSecondary, fontSize: scaleText(14) }]}>Şimdilik yalnız TXT dosyaları destekleniyor. PDF ve EPUB için bu sürümde sahte destek sunulmuyor.</Text><Pressable onPress={() => void addBook()} style={[styles.primaryButton, { backgroundColor: tokens.primary }]}><Ionicons name="add" size={19} color="#fff" /><Text style={styles.primaryText}>TXT kitap ekle</Text></Pressable></View>} /></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, list: { padding: 16, paddingBottom: 30 }, emptyList: { flexGrow: 1 }, header: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15 }, icon: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, marginLeft: 12 }, title: { fontWeight: '800' }, subtitle: { lineHeight: 19, marginTop: 3 }, addButton: { alignItems: 'center', borderRadius: 12, height: 44, justifyContent: 'center', width: 44 }, card: { alignItems: 'center', borderRadius: 15, borderWidth: 1, flexDirection: 'row', marginBottom: 10, padding: 13 }, bookPress: { alignItems: 'center', flex: 1, flexDirection: 'row' }, bookIcon: { alignItems: 'center', borderRadius: 12, height: 48, justifyContent: 'center', width: 48 }, bookCopy: { flex: 1, marginLeft: 12 }, bookTitle: { fontWeight: '800' }, meta: { marginTop: 6 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 }, emptyTitle: { fontWeight: '800', marginTop: 16, textAlign: 'center' }, emptyText: { lineHeight: 21, marginTop: 8, textAlign: 'center' }, primaryButton: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 18, minHeight: 46, paddingHorizontal: 18 }, primaryText: { color: '#fff', fontWeight: '800' } });
