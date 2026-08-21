import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ResearchService } from '../../../database/research';

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

export default function EditResearchScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [status, setStatus] = useState('draft');
  const [visibility, setVisibility] = useState('private');
  const [tags, setTags] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const researchId = parseInt(id as string, 10);
      const data = await ResearchService.getResearchById(researchId);
      if (data) {
        setTitle(data.title);
        setSummary(data.summary || '');
        setBody(data.body || '');
        setCategory(data.category);
        setStatus(data.status);
        setVisibility(data.visibility);
        
        const researchTags = await ResearchService.getResearchTags(researchId);
        setTags(researchTags.map(t => t.name).join(', '));
      } else {
        Alert.alert('Hata', 'Araştırma bulunamadı.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading research for edit:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen bir başlık girin.');
      return;
    }

    try {
      setSaving(true);
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
      const researchId = parseInt(id as string, 10);
      
      await ResearchService.updateResearch(researchId, {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        category,
        status,
        visibility,
        tags: tagList,
      });

      router.back();
    } catch (error) {
      console.error('Error updating research:', error);
      Alert.alert('Hata', 'Araştırma güncellenirken bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: 'Araştırmayı Düzenle', headerTitle: 'Düzenle' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <Text style={styles.saveButtonText}>
            {saving ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
          </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
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
