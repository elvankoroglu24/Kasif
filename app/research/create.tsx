import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ResearchService } from '../../database/research';

const CATEGORIES = [
  { label: 'Hadis', value: 'hadith' },
  { label: 'Hadis Şerhi', value: 'commentary' },
  { label: 'Tefsir', value: 'tafsir' },
  { label: 'Fıkıh', value: 'fiqh' },
  { label: 'Akaid', value: 'aqidah' },
  { label: 'Siyer', value: 'seerah' },
  { label: 'Arapça', value: 'arabic' },
  { label: 'Genel', value: 'general' },
  { label: 'Diğer', value: 'other' },
];

const STATUSES = [
  { label: 'Taslak', value: 'draft' },
  { label: 'Tamamlandı', value: 'completed' },
  { label: 'Arşivlendi', value: 'archived' },
];

const VISIBILITIES = [
  { label: 'Gizli', value: 'private' },
  { label: 'Paylaşılan', value: 'shared' },
  { label: 'Yayınlanan', value: 'published' },
];

export default function CreateResearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [status, setStatus] = useState('draft');
  const [visibility, setVisibility] = useState('private');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill from params if available
  useEffect(() => {
    if (params.prefillTitle) setTitle(params.prefillTitle as string);
    if (params.prefillCategory) setCategory(params.prefillCategory as string);
  }, [params]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen bir başlık girin.');
      return;
    }

    try {
      setSaving(true);
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
      
      const sources = [];
      if (params.sourceId && params.sourceType) {
        sources.push({
          sourceId: parseInt(params.sourceId as string, 10),
          sourceType: params.sourceType as string,
          note: 'Otomatik bağlanan kaynak'
        });
      }

      const researchId = await ResearchService.createResearch({
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        category,
        status,
        visibility,
        tags: tagList,
        sources
      });

      Alert.alert('Başarılı', 'Araştırma kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/research/${researchId}`) }
      ]);
    } catch (error) {
      console.error('Error saving research:', error);
      Alert.alert('Hata', 'Araştırma kaydedilirken bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: 'Yeni Araştırma', headerTitle: 'Yeni Araştırma' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {params.sourceId && (
          <View style={styles.sourceInfo}>
            <Ionicons name="link-outline" size={16} color="#2196F3" />
            <Text style={styles.sourceText}>Bu araştırma bir kaynağa otomatik olarak bağlanacaktır.</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Başlık *</Text>
          <TextInput
            style={styles.input}
            placeholder="Araştırma başlığı..."
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chipContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.chip,
                  category === cat.value && styles.chipActive
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={[
                  styles.chipText,
                  category === cat.value && styles.chipTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Durum</Text>
            <View style={styles.pickerContainer}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.smallChip,
                    status === s.value && styles.chipActive
                  ]}
                  onPress={() => setStatus(s.value)}
                >
                  <Text style={[
                    styles.smallChipText,
                    status === s.value && styles.chipTextActive
                  ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Görünürlük</Text>
            <View style={styles.pickerContainer}>
              {VISIBILITIES.map((v) => (
                <TouchableOpacity
                  key={v.value}
                  style={[
                    styles.smallChip,
                    visibility === v.value && styles.chipActive
                  ]}
                  onPress={() => setVisibility(v.value)}
                >
                  <Text style={[
                    styles.smallChipText,
                    visibility === v.value && styles.chipTextActive
                  ]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Özet</Text>
          <TextInput
            style={[styles.input, styles.textAreaSmall]}
            placeholder="Kısa bir özet yazın..."
            value={summary}
            onChangeText={setSummary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Araştırma Metni</Text>
          <TextInput
            style={[styles.input, styles.textAreaLarge]}
            placeholder="Araştırma içeriğini buraya yazın..."
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Etiketler (Virgülle ayırın)</Text>
          <TextInput
            style={styles.input}
            placeholder="örn: hadis, tefsir, fıkıh"
            value={tags}
            onChangeText={setTags}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Araştırmayı Kaydet</Text>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  sourceText: {
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textAreaSmall: {
    height: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 250,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    margin: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'column',
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
    alignItems: 'center',
  },
  smallChipText: {
    fontSize: 13,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
