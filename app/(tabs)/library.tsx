import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

export default function LibraryScreen() {
  const router = useRouter();
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
        <Pressable accessibilityRole="button" accessibilityLabel="Kelime Defterim’i aç" onPress={() => router.push('/vocabulary')} style={({ pressed }) => [styles.button, { backgroundColor: tokens.primary }, pressed && styles.pressed]}><Ionicons name="book-outline" size={19} color="#FFFFFF" /><Text style={styles.buttonText}>Kelime Defterim’e git</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', margin: 16, padding: 15, borderRadius: 16 }, icon: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, marginLeft: 12 }, title: { fontWeight: '800' }, subtitle: { marginTop: 3 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 }, emptyTitle: { fontWeight: '800', marginTop: 16, textAlign: 'center' }, emptyText: { lineHeight: 21, marginTop: 8, textAlign: 'center' }, button: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 20, paddingHorizontal: 18, paddingVertical: 13 }, buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] } });
