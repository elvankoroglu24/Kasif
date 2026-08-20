import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '../database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('Database initialization failed:', err);
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
