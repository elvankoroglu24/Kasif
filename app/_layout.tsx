import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppPreferencesProvider } from '../contexts/AppPreferencesContext';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { initDatabase } from '../database';

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  const initialize = () => {
    setDatabaseError(null);
    setDatabaseReady(false);
    initDatabase()
      .then(() => setDatabaseReady(true))
      .catch((error: unknown) => {
        console.error('Database initialization failed:', error);
        setDatabaseError(error instanceof Error ? error.message : 'Veritabanı başlatılamadı.');
      });
  };

  useEffect(() => {
    initialize();
  }, []);

  if (databaseError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Veritabanı başlatılamadı</Text>
        <Text style={styles.message}>{databaseError}</Text>
        <Pressable accessibilityRole="button" onPress={initialize} style={styles.retryButton}>
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  if (!databaseReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.message}>Kasif veritabanı hazırlanıyor…</Text>
      </View>
    );
  }

  return (
    <AppPreferencesProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AppPreferencesProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
