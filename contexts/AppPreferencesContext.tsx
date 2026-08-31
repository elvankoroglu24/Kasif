import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import {
  AppPreferences,
  DEFAULT_APP_PREFERENCES,
  PreferencesService,
  ThemePreference,
} from '../database/preferences';

/** Cilt & Mürekkep: one calm palette vocabulary, sourced from persisted local preferences. */

export interface DesignTokens {
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  quranText: string;
  arabicText: string;
  hadithText: string;
  selected: string;
  marker: string;
  navigation: string;
  tabInactive: string;
}

const PALETTES: Record<Exclude<ThemePreference, 'system'>, DesignTokens> = {
  light: {
    background: '#F5F8F9', surface: '#FFFFFF', surfaceSecondary: '#EAF2F3', card: '#FFFFFF', text: '#16343D', textSecondary: '#52727B', textMuted: '#819399', border: '#D9E6E8', primary: '#176B87', secondary: '#52727B', accent: '#A36B19', success: '#2E7D5B', warning: '#A36B19', error: '#B45445', quranText: '#263C42', arabicText: '#263C42', hadithText: '#233A43', selected: '#D8EFF1', marker: '#176B87', navigation: '#FFFFFF', tabInactive: '#78909C',
  },
  dark: {
    background: '#10191C', surface: '#17262A', surfaceSecondary: '#21343A', card: '#1B2C30', text: '#EFF8F7', textSecondary: '#B4CACD', textMuted: '#88A4A8', border: '#365158', primary: '#78C9D3', secondary: '#B4CACD', accent: '#E0B65B', success: '#6FC79D', warning: '#E0B65B', error: '#F09783', quranText: '#F3F7E6', arabicText: '#F3F7E6', hadithText: '#E6F0EE', selected: '#264C51', marker: '#78C9D3', navigation: '#142126', tabInactive: '#88A4A8',
  },
  mushaf: {
    background: '#FBF4E7', surface: '#FFFDF8', surfaceSecondary: '#F3E8D4', card: '#FFFDF8', text: '#493B28', textSecondary: '#79664C', textMuted: '#A18D70', border: '#E6D6B9', primary: '#76613A', secondary: '#8C754C', accent: '#A36B19', success: '#5B7B5A', warning: '#A36B19', error: '#A85042', quranText: '#384338', arabicText: '#384338', hadithText: '#493B28', selected: '#F0E0BF', marker: '#9C7133', navigation: '#FFF9EF', tabInactive: '#987F5C',
  },
  emerald: {
    background: '#F2F8F4', surface: '#FFFFFF', surfaceSecondary: '#E4F0E8', card: '#FFFFFF', text: '#193D31', textSecondary: '#527264', textMuted: '#789589', border: '#D0E3D7', primary: '#176B50', secondary: '#4B7A68', accent: '#A36B19', success: '#176B50', warning: '#A36B19', error: '#B45445', quranText: '#214737', arabicText: '#214737', hadithText: '#1D4738', selected: '#D2ECDE', marker: '#176B50', navigation: '#FFFFFF', tabInactive: '#719180',
  },
  night: {
    background: '#0D121C', surface: '#161E2B', surfaceSecondary: '#202B3A', card: '#182231', text: '#E5EDF5', textSecondary: '#B6C5D5', textMuted: '#8498AE', border: '#33445A', primary: '#83A9DD', secondary: '#B6C5D5', accent: '#CDAF6B', success: '#72B893', warning: '#D2B56D', error: '#E58D84', quranText: '#E7EEDF', arabicText: '#E7EEDF', hadithText: '#E3EAF2', selected: '#243B58', marker: '#83A9DD', navigation: '#131B29', tabInactive: '#8295AB',
  },
};

function resolveTheme(theme: ThemePreference, systemScheme: ColorSchemeName): Exclude<ThemePreference, 'system'> {
  if (theme !== 'system') return theme;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

interface AppPreferencesContextValue {
  preferences: AppPreferences;
  ready: boolean;
  tokens: DesignTokens;
  resolvedTheme: Exclude<ThemePreference, 'system'>;
  updatePreferences: (patch: Partial<AppPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  scaleText: (size: number) => number;
  scaleArabic: (size: number) => number;
  densitySpacing: (size: number) => number;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void PreferencesService.get()
      .then((next) => { if (active) setPreferences(next); })
      .catch((error) => console.warn('Ayarlar okunamadı:', error))
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<AppPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try {
      const persisted = await PreferencesService.save(next);
      setPreferences(persisted);
    } catch (error) {
      setPreferences(preferences);
      throw error;
    }
  }, [preferences]);

  const resetPreferences = useCallback(async () => {
    const reset = await PreferencesService.resetPreferences();
    setPreferences(reset);
  }, []);

  const resolvedTheme = resolveTheme(preferences.theme, systemScheme);
  const tokens = PALETTES[resolvedTheme];
  const textFactor = preferences.textScale === 'small' ? 0.92 : preferences.textScale === 'large' ? 1.12 : preferences.textScale === 'xlarge' ? 1.24 : 1;
  // Reader’s physical 8/15 line geometry is protected by its own hard cap.
  const arabicFactor = preferences.arabicScale === 'small' ? 0.92 : preferences.arabicScale === 'large' ? 1.03 : 1;
  const densityFactor = preferences.density === 'comfortable' ? 1.15 : preferences.density === 'compact' ? 0.9 : 1;
  const value = useMemo<AppPreferencesContextValue>(() => ({
    preferences,
    ready,
    tokens,
    resolvedTheme,
    updatePreferences,
    resetPreferences,
    scaleText: (size) => Math.round(size * textFactor * 10) / 10,
    scaleArabic: (size) => Math.round(size * arabicFactor * 10) / 10,
    densitySpacing: (size) => Math.round(size * densityFactor * 10) / 10,
  }), [arabicFactor, densityFactor, preferences, ready, resetPreferences, resolvedTheme, textFactor, tokens, updatePreferences]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) throw new Error('useAppPreferences AppPreferencesProvider içinde kullanılmalıdır.');
  return context;
}
