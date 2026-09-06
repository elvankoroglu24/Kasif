import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DhikrRecord, DhikrService } from '../../database/dhikr';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

export default function DhikrScreen() {
  const { tokens, scaleText, densitySpacing } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DhikrRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DhikrRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');

  const load = useCallback(async () => {
    try { setItems(await DhikrService.list()); }
    catch (error) { console.error('Zikir verileri yüklenemedi:', error); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openCreate = () => { setEditing(null); setTitle(''); setDescription(''); setTarget(''); setModalVisible(true); };
  const openEdit = (item: DhikrRecord) => { if (!item.isUserCreated) return; setEditing(item); setTitle(item.title); setDescription(item.turkishMeaning || ''); setTarget(item.targetCount ? String(item.targetCount) : ''); setModalVisible(true); };
  const save = async () => {
    try {
      const payload = { title, description, targetCount: Number(target) || 0 };
      if (editing) await DhikrService.update(editing.id, payload); else await DhikrService.create(payload);
      setModalVisible(false); await load();
    } catch (error) { Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'Zikir kaydedilemedi.'); }
  };
  const remove = (item: DhikrRecord) => Alert.alert('Zikri sil', 'Bu kullanıcı zikri ve sayacı silinecek.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: async () => { await DhikrService.remove(item.id); await load(); } }]);
  const adjust = async (item: DhikrRecord, delta: number) => { await DhikrService.setCount(item.id, item.currentCount + delta); await load(); };

  return <View style={[styles.screen, { backgroundColor: tokens.background }]}>
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.list, { padding: densitySpacing(16), paddingTop: insets.top + densitySpacing(16) }, items.length === 0 && styles.emptyList]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={tokens.primary} />}
      ListHeaderComponent={<View style={[styles.header, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}><View style={[styles.icon, { backgroundColor: tokens.selected }]}><Ionicons name="repeat-outline" size={26} color={tokens.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: tokens.text, fontSize: scaleText(20) }]}>Zikir</Text><Text style={[styles.subtitle, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>Kendi zikirlerinizi yerel olarak takip edin.</Text></View><Pressable onPress={openCreate} style={[styles.addButton, { backgroundColor: tokens.primary }]}><Ionicons name="add" size={22} color="#fff" /></Pressable></View>}
      renderItem={({ item }) => <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}><View style={styles.cardTop}><View style={styles.cardCopy}><Text style={[styles.group, { color: tokens.primary, fontSize: scaleText(12) }]}>{item.groupTitle || (item.isUserCreated ? 'Kişisel zikir' : 'Zikir')}</Text><Text style={[styles.text, { color: tokens.text, fontSize: scaleText(17) }]}>{item.title}</Text>{item.turkishMeaning ? <Text style={[styles.description, { color: tokens.textSecondary, fontSize: scaleText(13) }]}>{item.turkishMeaning}</Text> : null}</View>{item.isUserCreated ? <View style={styles.row}><Pressable onPress={() => openEdit(item)}><Ionicons name="create-outline" size={21} color={tokens.primary} /></Pressable><Pressable onPress={() => remove(item)}><Ionicons name="trash-outline" size={21} color={tokens.error} /></Pressable></View> : null}</View><View style={styles.counterRow}><Pressable onPress={() => void adjust(item, -1)} style={[styles.counterButton, { borderColor: tokens.border }]}><Ionicons name="remove" size={20} color={tokens.text} /></Pressable><View style={styles.counter}><Text style={[styles.count, { color: tokens.text }]}>{item.currentCount}</Text><Text style={[styles.target, { color: tokens.textMuted }]}>{item.targetCount ? `/ ${item.targetCount}` : 'sayı'}</Text></View><Pressable onPress={() => void adjust(item, 1)} style={[styles.counterButton, { backgroundColor: tokens.primary }]}><Ionicons name="add" size={20} color="#fff" /></Pressable><Pressable onPress={() => void DhikrService.reset(item.id).then(load)} style={styles.reset}><Text style={{ color: tokens.textSecondary, fontWeight: '700' }}>Sıfırla</Text></Pressable></View></View>}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="repeat-outline" size={58} color={tokens.textMuted} /><Text style={[styles.emptyTitle, { color: tokens.text, fontSize: scaleText(19) }]}>Zikir listeniz boş</Text><Text style={[styles.emptyText, { color: tokens.textSecondary, fontSize: scaleText(14) }]}>Hazır dini içerik eklenmedi. Kendi zikrinizi oluşturabilirsiniz.</Text><Pressable onPress={openCreate} style={[styles.primaryButton, { backgroundColor: tokens.primary }]}><Ionicons name="add" size={19} color="#fff" /><Text style={styles.primaryText}>Zikir ekle</Text></Pressable></View>}
    />
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}><View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: tokens.card }]}><Text style={[styles.modalTitle, { color: tokens.text }]}>{editing ? 'Zikri düzenle' : 'Zikir ekle'}</Text><TextInput value={title} onChangeText={setTitle} placeholder="Zikir adı veya metni" placeholderTextColor={tokens.textMuted} style={[styles.input, { color: tokens.text, borderColor: tokens.border }]} /><TextInput value={description} onChangeText={setDescription} placeholder="Açıklama (opsiyonel)" placeholderTextColor={tokens.textMuted} style={[styles.input, { color: tokens.text, borderColor: tokens.border }]} /><TextInput value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="Hedef sayı (opsiyonel)" placeholderTextColor={tokens.textMuted} style={[styles.input, { color: tokens.text, borderColor: tokens.border }]} /><View style={styles.modalActions}><Pressable onPress={() => setModalVisible(false)} style={[styles.secondaryButton, { borderColor: tokens.border }]}><Text style={{ color: tokens.text }}>Vazgeç</Text></Pressable><Pressable onPress={() => void save()} style={[styles.primaryButton, { backgroundColor: tokens.primary }]}><Text style={styles.primaryText}>Kaydet</Text></Pressable></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, list: { paddingBottom: 30 }, emptyList: { flexGrow: 1 }, header: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15 }, icon: { alignItems: 'center', borderRadius: 14, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, marginLeft: 12 }, title: { fontWeight: '800' }, subtitle: { lineHeight: 19, marginTop: 3 }, addButton: { alignItems: 'center', borderRadius: 12, height: 44, justifyContent: 'center', width: 44 }, card: { borderRadius: 15, borderWidth: 1, marginBottom: 10, padding: 16 }, cardTop: { flexDirection: 'row' }, cardCopy: { flex: 1 }, group: { fontWeight: '800' }, text: { fontWeight: '700', lineHeight: 25, marginTop: 8 }, description: { lineHeight: 20, marginTop: 5 }, row: { flexDirection: 'row', gap: 14 }, counterRow: { alignItems: 'center', flexDirection: 'row', marginTop: 17 }, counterButton: { alignItems: 'center', borderRadius: 10, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }, counter: { alignItems: 'center', minWidth: 72 }, count: { fontSize: 21, fontWeight: '800' }, target: { fontSize: 11 }, reset: { marginLeft: 'auto', padding: 10 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 }, emptyTitle: { fontWeight: '800', marginTop: 16, textAlign: 'center' }, emptyText: { lineHeight: 21, marginTop: 8, textAlign: 'center' }, primaryButton: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 18, minHeight: 46, paddingHorizontal: 18 }, primaryText: { color: '#fff', fontWeight: '800' }, modalBackdrop: { backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'flex-end' }, modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 }, modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 }, input: { borderRadius: 11, borderWidth: 1, marginBottom: 10, minHeight: 48, paddingHorizontal: 13 }, modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 5 }, secondaryButton: { alignItems: 'center', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 18 } });
