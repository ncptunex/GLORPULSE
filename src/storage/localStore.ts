import type { AstronautId, StoredAstronautData } from '../shared/types';


export const STORAGE_VERSION = 1;
const KEY_PREFIX = 'glorpulse:';
const astronautKey = (id: AstronautId) => `${KEY_PREFIX}astronaut:${id}`;

export function emptyStoredData(astronautId: AstronautId): StoredAstronautData {
  return { storageVersion: STORAGE_VERSION, astronautId, enteredReadings: [], enteredSymptoms: [] };
}

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isValid(value: unknown, astronautId: AstronautId): value is StoredAstronautData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<StoredAstronautData>;
  return (
    v.storageVersion === STORAGE_VERSION &&
    v.astronautId === astronautId &&
    Array.isArray(v.enteredReadings) &&
    Array.isArray(v.enteredSymptoms) &&
    v.enteredReadings.every((r) => r.astronautId === astronautId && r.origin === 'entered') &&
    v.enteredSymptoms.every((s) => s.astronautId === astronautId && s.origin === 'entered')
  );
}

export interface LoadResult {
  data: StoredAstronautData;
  discarded: boolean;
}

export function loadAstronautData(astronautId: AstronautId): LoadResult {
  const storage = getStorage();
  if (!storage) return { data: emptyStoredData(astronautId), discarded: false };
  let raw: string | null = null;
  try {
    raw = storage.getItem(astronautKey(astronautId));
  } catch {
    return { data: emptyStoredData(astronautId), discarded: false };
  }
  if (raw === null) return { data: emptyStoredData(astronautId), discarded: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed, astronautId)) return { data: parsed, discarded: false };
  } catch {
  }
  return { data: emptyStoredData(astronautId), discarded: true };
}

export function saveAstronautData(data: StoredAstronautData): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(astronautKey(data.astronautId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function resetAllStoredData(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
  }
}
