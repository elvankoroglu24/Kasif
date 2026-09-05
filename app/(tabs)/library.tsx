import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

export default function LibraryScreen() {
  const { tokens, scaleText } = useAppPreferences();
  return (
    <View style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={[styles.icon, { backgroundColor: tokens.selected }]}><Ionicons name="library-outline" size={26} color={tokens.primary} /></View>
        <View style={styles.copy}><Text style={[styles.title, { color: tokens.text, fontSize: scaleText(20) }]}>Kitaplık</Text><Text style={[styles.subtitle, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>Kişisel okuma alanınız</Text></View>
      </View>
      <View style={styles.empty}>
        <Ionicons name="book-outline" size={60} color={tokens.textMuted} />
        <Text style={[styles.emptyTitle, { color: tokens.text, fontSize: scaleText(19) }]}>Kitaplığınız henüz boş</Text>
        <Text style={[styles.emptyText, { color: tokens.textSecondary, fontSize: scaleText(14) }]}>Bu bölüm için kişisel kitap içeriği henüz yüklenmedi.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', margin: 16, padding: 15, borderRadius: 16 }, icon: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, marginLeft: 12 }, title: { fontWeight: '800' }, subtitle: { marginTop: 3 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 }, emptyTitle: { fontWeight: '800', marginTop: 16, textAlign: 'center' }, emptyText: { lineHeight: 21, marginTop: 8, textAlign: 'center' } });
