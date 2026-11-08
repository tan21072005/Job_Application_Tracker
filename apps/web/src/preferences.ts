export type Density = 'comfortable' | 'compact';

export type Preferences = {
  density: Density;
  highContrast: boolean;
  reduceMotion: boolean;
};

export const defaultPreferences: Preferences = {
  density: 'comfortable',
  highContrast: false,
  reduceMotion: false
};

const storageKey = 'jobtrack.preferences.v1';

export function readPreferences(): Preferences {
  try {
    if (typeof localStorage === 'undefined') return defaultPreferences;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      highContrast: parsed.highContrast === true,
      reduceMotion: parsed.reduceMotion === true
    };
  } catch {
    return defaultPreferences;
  }
}

export function applyPreferences(preferences: Preferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.density = preferences.density;
  root.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
  root.dataset.motion = preferences.reduceMotion ? 'reduce' : 'full';
}

export function savePreferences(preferences: Preferences): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    return;
  }
  applyPreferences(preferences);
}
