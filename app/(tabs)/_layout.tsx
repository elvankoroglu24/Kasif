import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
        }}
      />
    </Tabs>
  );
}
