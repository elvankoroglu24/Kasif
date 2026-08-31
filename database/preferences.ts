import { getDb } from './index';
import { TABLES } from './schema';

/** Cilt & Mürekkep: app preferences remain local-only in SQLite metadata. */
export type ThemePreference = 'system' | 'light' | 'dark' | 'mushaf' | 'emerald' | 'night';
export type TextScalePreference = 'small' | 'normal' | 'large' | 'xlarge';
export type ArabicScalePreference = 'small' | 'normal' | 'large';
export type DensityPreference = 'compact' | 'normal' | 'comfortable';

export interface AppPreferences {
  theme: ThemePreference;
  textScale: TextScalePreference;
  arabicScale: ArabicScalePreference;
  density: DensityPreference;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'system',
  textScale: 'normal',
  arabicScale: 'normal',
  density: 'normal',
};

const PREFERENCES_KEY = 'app_preferences_v1';
const THEMES: ThemePreference[] = ['system', 'light', 'dark', 'mushaf', 'emerald', 'night'];
const TEXT_SCALES: TextScalePreference[] = ['small', 'normal', 'large', 'xlarge'];
const ARABIC_SCALES: ArabicScalePreference[] = ['small', 'normal', 'large'];
const DENSITIES: DensityPreference[] = ['compact', 'normal', 'comfortable'];

type Row = { value: string };

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function parsePreferences(value: string | null | undefined): AppPreferences {
  if (!value) return { ...DEFAULT_APP_PREFERENCES };
  try {
    const input = JSON.parse(value) as Partial<Record<keyof AppPreferences, unknown>>;
    return {
      theme: enumValue(input.theme, THEMES, DEFAULT_APP_PREFERENCES.theme),
      textScale: enumValue(input.textScale, TEXT_SCALES, DEFAULT_APP_PREFERENCES.textScale),
      arabicScale: enumValue(input.arabicScale, ARABIC_SCALES, DEFAULT_APP_PREFERENCES.arabicScale),
      density: enumValue(input.density, DENSITIES, DEFAULT_APP_PREFERENCES.density),
    };
  } catch {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

export const PreferencesService = {
  async get(): Promise<AppPreferences> {
    const row = await getDb().getFirstAsync<Row>(
      `SELECT value FROM ${TABLES.METADATA} WHERE key = ?`,
      [PREFERENCES_KEY],
    );
    return parsePreferences(row?.value);
  },

  async save(patch: Partial<AppPreferences>): Promise<AppPreferences> {
    const next = { ...parsePreferences(JSON.stringify(await this.get())), ...patch };
    const normalized = parsePreferences(JSON.stringify(next));
    await getDb().runAsync(
      `INSERT INTO ${TABLES.METADATA} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [PREFERENCES_KEY, JSON.stringify(normalized)],
    );
    return normalized;
  },

  async resetPreferences(): Promise<AppPreferences> {
    await getDb().runAsync(`DELETE FROM ${TABLES.METADATA} WHERE key = ?`, [PREFERENCES_KEY]);
    return { ...DEFAULT_APP_PREFERENCES };
  },
};
