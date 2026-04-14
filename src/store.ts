import type { UserProfile } from './types';

const STORAGE_KEY = 'scentmate_profile';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  createdAt: new Date().toISOString(),
  perfumeIds: [],
  dateAdded: {},
  notePreferences: [],
  accordPreferences: [],
};

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PROFILE, createdAt: new Date().toISOString() };
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function updateProfileName(name: string): UserProfile {
  const profile = loadProfile();
  profile.name = name;
  saveProfile(profile);
  return profile;
}

export function addPerfume(id: string): UserProfile {
  const profile = loadProfile();
  if (!profile.perfumeIds.includes(id)) {
    profile.perfumeIds.push(id);
    profile.dateAdded[id] = new Date().toISOString();
    saveProfile(profile);
  }
  return profile;
}

export function removePerfume(id: string): UserProfile {
  const profile = loadProfile();
  profile.perfumeIds = profile.perfumeIds.filter(pid => pid !== id);
  delete profile.dateAdded[id];
  saveProfile(profile);
  return profile;
}

export function isInCollection(id: string): boolean {
  return loadProfile().perfumeIds.includes(id);
}

export function exportProfile(): string {
  return JSON.stringify(loadProfile(), null, 2);
}

export function importProfile(json: string): UserProfile | null {
  try {
    const data = JSON.parse(json);
    if (data && Array.isArray(data.perfumeIds)) {
      const profile = { ...DEFAULT_PROFILE, ...data };
      saveProfile(profile);
      return profile;
    }
  } catch { /* ignore */ }
  return null;
}
