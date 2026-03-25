import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import type { InspectionSheet } from './types';

const INSPECTION_REGISTRY_KEY = 'concierge_inventory_registry_v1';
const canUseBrowserStorage = Platform.OS === 'web';

export async function loadInspectionSheets(db: SQLiteDatabase | null): Promise<InspectionSheet[]> {
  if (!db) {
    if (!canUseBrowserStorage || typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(`myhouse:${INSPECTION_REGISTRY_KEY}`);
      return raw ? normalizeSheets(JSON.parse(raw) as InspectionSheet[]) : [];
    } catch {
      return [];
    }
  }

  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [INSPECTION_REGISTRY_KEY],
  );
  if (!row?.value) {
    return [];
  }
  try {
    return normalizeSheets(JSON.parse(row.value) as InspectionSheet[]);
  } catch {
    return [];
  }
}

export async function saveInspectionSheets(db: SQLiteDatabase | null, sheets: InspectionSheet[]): Promise<void> {
  const payload = JSON.stringify(sheets);
  if (!db) {
    if (canUseBrowserStorage && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`myhouse:${INSPECTION_REGISTRY_KEY}`, payload);
    }
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [INSPECTION_REGISTRY_KEY, payload],
  );
}

function normalizeSheets(sheets: InspectionSheet[]): InspectionSheet[] {
  return sheets.map((sheet) => ({
    ...sheet,
    validation: {
      ...sheet.validation,
      occupantSigned: sheet.validation.occupantSigned ?? false,
      conciergeSigned: sheet.validation.conciergeSigned ?? false,
      occupantName: sheet.validation.occupantName ?? sheet.residentInfo.fullName ?? '',
      conciergeName: sheet.validation.conciergeName ?? sheet.conciergeName ?? '',
    },
  }));
}
