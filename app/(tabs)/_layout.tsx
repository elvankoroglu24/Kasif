import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppPreferences();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingBottom: 7 + insets.bottom,
          paddingTop: 5,
          backgroundColor: tokens.navigation,
          borderTopColor: tokens.border,
        },
        headerStyle: { backgroundColor: tokens.navigation },
        headerTitleStyle: { color: tokens.text, fontWeight: '700' },
        headerTintColor: tokens.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Keşfet',
          headerTitle: 'Keşfet',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Kitaplık',
          headerTitle: 'Kitaplık',
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dhikr"
        options={{
          title: 'Zikir',
          headerTitle: 'Zikir',
          tabBarIcon: ({ color, size }) => <Ionicons name="repeat-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="research" options={{ href: null, title: 'Araştırmalarım', headerTitle: 'Araştırmalarım' }} />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: 'Kelime Defterim',
          headerTitle: 'Kelime Defterim',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />

      {/* Mevcut feature route’ları korunur; ana tab bar’da ayrı sekme olarak gösterilmez. */}
      <Tabs.Screen name="search/index" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="worked" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
