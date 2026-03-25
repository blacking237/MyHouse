import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from './schema';
import { syncOnce } from '../services/SyncService';

type DatabaseContextType = {
  db: SQLiteDatabase | null;
  isReady: boolean;
  error: string | null;
  retrySetup: () => void;
};

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  error: null,
  retrySetup: () => {},
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;

    async function setup() {
      try {
        setIsReady(false);
        setError(null);
        if (Platform.OS === 'web') {
          setDb(null);
          setIsReady(true);
          return;
        }

        const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
        const database = await SQLite.openDatabaseAsync('myhouse.db');
        await initializeDatabase(database);
        if (!alive) {
          await database.closeAsync().catch(() => undefined);
          return;
        }
        setDb(database);
        setIsReady(true);
      } catch (error) {
        console.error('Database initialization error:', error);
        if (!alive) {
          return;
        }
        setDb(null);
        setIsReady(false);
        setError(error instanceof Error ? error.message : 'Unknown database initialization error');
      }
    }
    void setup();

    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!db || !isReady) return undefined;
    let active = true;

    const runSync = async () => {
      try {
        await syncOnce(db);
      } catch (error) {
        if (active) {
          console.warn('Sync error:', error);
        }
      }
    };

    void runSync();
    const interval = setInterval(runSync, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [db, isReady]);

  const retrySetup = () => {
    setAttempt((current) => current + 1);
  };

  return (
    <DatabaseContext.Provider value={{ db, isReady, error, retrySetup }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): SQLiteDatabase {
  const { db } = useContext(DatabaseContext);
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function useDatabaseReady(): boolean {
  const { isReady } = useContext(DatabaseContext);
  return isReady;
}

export function useDatabaseOptional(): SQLiteDatabase | null {
  const { db } = useContext(DatabaseContext);
  return db;
}

export function useDatabaseError(): string | null {
  const { error } = useContext(DatabaseContext);
  return error;
}

export function useRetryDatabaseSetup(): () => void {
  const { retrySetup } = useContext(DatabaseContext);
  return retrySetup;
}
