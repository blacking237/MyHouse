import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useDatabaseOptional, useDatabaseReady } from './DatabaseContext';
import { changePasswordApi, getMe, login as loginApi, logoutApi, refreshAccessToken, setAuthTokens } from '../services/BackendApi';

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

export type AppRole =
  | 'tenant'
  | 'concierge'
  | 'manager'
  | 'adminCommercial'
  | 'adminSav'
  | 'adminJuridique'
  | 'adminCompta'
  | 'superAdmin';

const DEFAULT_ROLE: AppRole = 'manager';

const FALLBACK_ROLES: AppRole[] = [
  'manager',
  'concierge',
  'tenant',
  'adminCommercial',
  'adminSav',
  'adminJuridique',
  'adminCompta',
  'superAdmin',
];

const LOCAL_ROLE_ACCOUNTS: Array<{
  username: string;
  password: string;
  passwordHash: string;
  roles: AppRole[];
  defaultRole: AppRole;
}> = [
  {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    roles: FALLBACK_ROLES,
    defaultRole: DEFAULT_ROLE,
  },
];

type RoleAccountRecord = {
  id: number;
  username: string;
  passwordHash: string;
  role: AppRole;
  createdAt: string;
  createdBy: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  parentRole?: AppRole | null;
  parentUsername?: string | null;
  displayName?: string;
};

export type RoleAccountSummary = {
  id: number;
  username: string;
  role: AppRole;
  createdAt: string;
  createdBy: string;
  displayName: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  parentRole?: AppRole | null;
  parentUsername?: string | null;
};

type AuthContextType = {
  isAuthenticated: boolean;
  currentUsername: string;
  activeRole: AppRole;
  availableRoles: AppRole[];
  login: (db: SQLiteDatabase | null, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (db: SQLiteDatabase | null, oldPassword: string, newPassword: string) => Promise<boolean>;
  setActiveRole: (role: AppRole) => Promise<void>;
  listRoleAccounts: (db: SQLiteDatabase | null) => Promise<RoleAccountSummary[]>;
  approveRoleAccount: (db: SQLiteDatabase | null, accountId: number, approvedBy: string) => Promise<boolean>;
  rejectRoleAccount: (db: SQLiteDatabase | null, accountId: number, rejectedBy: string) => Promise<boolean>;
  createRoleAccount: (db: SQLiteDatabase | null, username: string, password: string, role: AppRole, createdBy: string) => Promise<{ ok: boolean; reason?: 'duplicate' | 'invalid' }>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  currentUsername: '',
  activeRole: DEFAULT_ROLE,
  availableRoles: FALLBACK_ROLES,
  login: async () => false,
  logout: () => {},
  changePassword: async () => false,
  setActiveRole: async () => {},
  listRoleAccounts: async () => [],
  approveRoleAccount: async () => false,
  rejectRoleAccount: async () => false,
  createRoleAccount: async () => ({ ok: false, reason: 'invalid' }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [activeRole, setActiveRoleState] = useState<AppRole>(DEFAULT_ROLE);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>(FALLBACK_ROLES);
  const db = useDatabaseOptional();
  const dbReady = useDatabaseReady();

  const canUseBrowserStorage = Platform.OS === 'web';

  const getBrowserSetting = useCallback((key: string): string | null => {
    if (!canUseBrowserStorage || typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(`myhouse:${key}`);
  }, [canUseBrowserStorage]);

  const setBrowserSetting = useCallback((key: string, value: string): void => {
    if (!canUseBrowserStorage || typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(`myhouse:${key}`, value);
  }, [canUseBrowserStorage]);

  const deleteBrowserSetting = useCallback((key: string): void => {
    if (!canUseBrowserStorage || typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(`myhouse:${key}`);
  }, [canUseBrowserStorage]);

  const getBrowserRoleAccounts = useCallback((): RoleAccountRecord[] => {
    if (!canUseBrowserStorage || typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem('myhouse:role_accounts');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RoleAccountRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [canUseBrowserStorage]);

  const setBrowserRoleAccounts = useCallback((accounts: RoleAccountRecord[]): void => {
    if (!canUseBrowserStorage || typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem('myhouse:role_accounts', JSON.stringify(accounts));
  }, [canUseBrowserStorage]);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    if (!db) return getBrowserSetting(key);
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
    return row?.value ?? null;
  }, [db, getBrowserSetting]);

  const setSetting = useCallback(async (key: string, value: string): Promise<void> => {
    if (!db) {
      setBrowserSetting(key, value);
      return;
    }
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
  }, [db, setBrowserSetting]);

  const deleteSetting = useCallback(async (key: string): Promise<void> => {
    if (!db) {
      deleteBrowserSetting(key);
      return;
    }
    await db.runAsync('DELETE FROM app_settings WHERE key = ?', [key]);
  }, [db, deleteBrowserSetting]);

  useEffect(() => {
    async function restoreSession() {
      if (!dbReady || !db) return;
      try {
        const savedAccess = await getSetting('auth_access_token');
        const savedRefresh = await getSetting('auth_refresh_token');
        if (!savedRefresh) {
          setAuthTokens(null);
          setIsAuthenticated(false);
          return;
        }
        setAuthTokens({
          accessToken: savedAccess ?? '',
          refreshToken: savedRefresh,
        });
        let ok = false;
        try {
          await getMe();
          ok = true;
        } catch {
          ok = await refreshAccessToken();
          if (ok) {
            await getMe();
          }
        }
        const savedRole = await getSetting('auth_active_role');
        const savedUsername = await getSetting('auth_username');
        if (savedRole && FALLBACK_ROLES.includes(savedRole as AppRole)) {
          setActiveRoleState(savedRole as AppRole);
        }
        if (savedUsername) {
          setCurrentUsername(savedUsername);
        }
        setIsAuthenticated(ok);
      } catch {
        setIsAuthenticated(false);
      }
    }
    void restoreSession();
  }, [db, dbReady, getSetting]);

  async function hashPassword(password: string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  }

  const LOCAL_ROLE_CREATION_SCOPE: Record<AppRole, AppRole[]> = {
    superAdmin: ['adminCommercial', 'adminSav', 'adminJuridique', 'adminCompta', 'manager', 'concierge', 'tenant'],
    adminCommercial: ['manager'],
    adminSav: [],
    adminJuridique: [],
    adminCompta: [],
    manager: ['concierge', 'tenant'],
    concierge: ['tenant'],
    tenant: [],
  };

  const normalizeRole = useCallback((roleRaw: string | null | undefined): AppRole => {
    switch ((roleRaw ?? '').trim().toUpperCase()) {
      case 'LOCATAIRE':
      case 'TENANT':
      case 'RESIDENT':
        return 'tenant';
      case 'CONCIERGE':
        return 'concierge';
      case 'GESTIONNAIRE':
      case 'MANAGER':
        return 'manager';
      case 'ADMIN_COMMERCIAL':
      case 'COMMERCIAL_ADMIN':
        return 'adminCommercial';
      case 'ADMIN_SAV':
      case 'ADMIN_UX':
      case 'ADMIN_UX_SAV':
        return 'adminSav';
      case 'ADMIN_JURIDIQUE':
        return 'adminJuridique';
      case 'ADMIN_COMPTA':
      case 'ADMIN_COMPTABILITE':
        return 'adminCompta';
      case 'SUPER_ADMIN':
        return 'superAdmin';
      default:
        return DEFAULT_ROLE;
    }
  }, []);

  const persistRole = useCallback(async (role: AppRole) => {
    setActiveRoleState(role);
    await setSetting('auth_active_role', role);
  }, [setSetting]);

  const ensureLocalDefaultAccounts = useCallback(async (db: SQLiteDatabase): Promise<void> => {
    for (const account of LOCAL_ROLE_ACCOUNTS) {
      await db.runAsync(
        `
          INSERT INTO admin (username, password_hash)
          VALUES (?, ?)
          ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
        `,
        [account.username, account.passwordHash]
      );
    }
  }, []);

  const findLocalRoleAccount = useCallback((username: string, password: string) => (
    LOCAL_ROLE_ACCOUNTS.find((account) => account.username === username && account.password === password) ?? null
  ), []);

  const getLocalRoleConfig = useCallback((username: string) => (
    LOCAL_ROLE_ACCOUNTS.find((account) => account.username === username) ?? null
  ), []);

  const normalizeAccountStatus = useCallback((statusRaw: string | null | undefined): 'PENDING' | 'ACTIVE' | 'REJECTED' => {
    switch ((statusRaw ?? '').trim().toUpperCase()) {
      case 'ACTIVE':
      case 'ACTIF':
        return 'ACTIVE';
      case 'REJECTED':
      case 'REJETE':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }, []);

  const listRoleAccounts = useCallback(async (db: SQLiteDatabase | null): Promise<RoleAccountSummary[]> => {
    if (!db) {
      return getBrowserRoleAccounts()
        .map((account) => ({
          id: account.id,
          username: account.username,
          role: account.role,
          createdAt: account.createdAt,
          createdBy: account.createdBy,
          displayName: account.displayName ?? account.username,
          status: account.status,
          approvedBy: account.approvedBy ?? null,
          approvedAt: account.approvedAt ?? null,
          rejectedAt: account.rejectedAt ?? null,
          parentRole: account.parentRole ?? null,
          parentUsername: account.parentUsername ?? null,
        }))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }

    const rows = await db.getAllAsync<{
      id: number;
      username: string;
      role: string;
      created_at: string;
      created_by: string;
      status: string | null;
      approved_by: string | null;
      approved_at: string | null;
      rejected_at: string | null;
      parent_role: string | null;
      parent_username: string | null;
      display_name: string | null;
    }>(
      `SELECT
         ra.id,
         ra.username,
         ra.role,
         ra.created_at,
         ra.created_by,
         ra.status,
         ra.approved_by,
         ra.approved_at,
         ra.rejected_at,
         ra.parent_role,
         ra.parent_username,
         up.display_name
       FROM role_accounts ra
       LEFT JOIN user_profiles up ON up.username = ra.username
       ORDER BY ra.created_at DESC`
    );
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: normalizeRole(row.role),
      createdAt: row.created_at,
      createdBy: row.created_by,
      displayName: row.display_name?.trim() || row.username,
      status: normalizeAccountStatus(row.status),
      approvedBy: row.approved_by ?? null,
      approvedAt: row.approved_at ?? null,
      rejectedAt: row.rejected_at ?? null,
      parentRole: row.parent_role ? normalizeRole(row.parent_role) : null,
      parentUsername: row.parent_username ?? null,
    }));
  }, [getBrowserRoleAccounts, normalizeAccountStatus, normalizeRole]);

  const persistUserProfile = useCallback(async (
    db: SQLiteDatabase | null,
    payload: {
      username: string;
      role: AppRole;
      displayName: string;
      createdBy: string;
      lastLoginAt?: string | null;
    },
  ): Promise<void> => {
    if (!db) {
      return;
    }
    await db.runAsync(
      `INSERT INTO user_profiles (username, role, display_name, created_by, last_login_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(username) DO UPDATE SET
         role = excluded.role,
         display_name = excluded.display_name,
         created_by = excluded.created_by,
         last_login_at = COALESCE(excluded.last_login_at, user_profiles.last_login_at),
         updated_at = datetime('now')`,
      [payload.username, payload.role, payload.displayName, payload.createdBy, payload.lastLoginAt ?? null],
    );
  }, []);

  const createRoleAccount = useCallback(async (
    db: SQLiteDatabase | null,
    username: string,
    password: string,
    role: AppRole,
    createdBy: string,
  ): Promise<{ ok: boolean; reason?: 'duplicate' | 'invalid' }> => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedCreator = createdBy.trim().toLowerCase();
    const creatorRole = currentUsername.trim().toLowerCase() === normalizedCreator
      ? activeRole
      : getLocalRoleConfig(normalizedCreator)?.defaultRole ?? DEFAULT_ROLE;
    const allowedRoles = LOCAL_ROLE_CREATION_SCOPE[creatorRole] ?? [];
    if (!normalizedUsername || password.trim().length < 6 || !allowedRoles.includes(role)) {
      return { ok: false, reason: 'invalid' };
    }

    const passwordHash = await hashPassword(password);

    if (!db) {
      const browserAccounts = getBrowserRoleAccounts();
      const collidesWithFallback = LOCAL_ROLE_ACCOUNTS.some((account) => account.username === normalizedUsername);
      const duplicate = browserAccounts.some((account) => account.username === normalizedUsername);
      if (collidesWithFallback || duplicate) {
        return { ok: false, reason: 'duplicate' };
      }
      const nextId = (browserAccounts.reduce((max, account) => Math.max(max, account.id ?? 0), 0) || 0) + 1;
      browserAccounts.push({
        id: nextId,
        username: normalizedUsername,
        passwordHash,
        role,
        createdAt: new Date().toISOString(),
        createdBy,
        status: 'PENDING',
        approvedBy: null,
        approvedAt: null,
        rejectedAt: null,
        parentRole: creatorRole,
        parentUsername: normalizedCreator,
        displayName: normalizedUsername,
      });
      setBrowserRoleAccounts(browserAccounts);
      return { ok: true };
    }

    const fallbackExists = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM admin WHERE username = ?',
      [normalizedUsername]
    );
    const roleExists = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM role_accounts WHERE username = ?',
      [normalizedUsername]
    );
    if (fallbackExists || roleExists) {
      return { ok: false, reason: 'duplicate' };
    }

    await db.runAsync(
      `INSERT INTO role_accounts (
        username, password_hash, role, created_by, parent_role, parent_username, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [normalizedUsername, passwordHash, role, createdBy, creatorRole, normalizedCreator, 'PENDING']
    );
    await persistUserProfile(db, {
      username: normalizedUsername,
      role,
      displayName: normalizedUsername,
      createdBy,
      lastLoginAt: null,
    });
    return { ok: true };
  }, [activeRole, currentUsername, getBrowserRoleAccounts, getLocalRoleConfig, hashPassword, persistUserProfile, setBrowserRoleAccounts]);

  const approveRoleAccount = useCallback(async (
    db: SQLiteDatabase | null,
    accountId: number,
    approvedBy: string,
  ): Promise<boolean> => {
    if (!db) {
      const browserAccounts = getBrowserRoleAccounts();
      const index = browserAccounts.findIndex((account) => account.id === accountId);
      if (index < 0) return false;
      browserAccounts[index] = {
        ...browserAccounts[index],
        status: 'ACTIVE',
        approvedBy,
        approvedAt: new Date().toISOString(),
        rejectedAt: null,
      };
      setBrowserRoleAccounts(browserAccounts);
      return true;
    }

    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM role_accounts WHERE id = ?',
      [accountId],
    );
    if (!existing) return false;
    await db.runAsync(
      `UPDATE role_accounts
       SET status = 'ACTIVE', approved_by = ?, approved_at = datetime('now'), rejected_at = NULL
       WHERE id = ?`,
      [approvedBy, accountId],
    );
    return true;
  }, [getBrowserRoleAccounts, setBrowserRoleAccounts]);

  const rejectRoleAccount = useCallback(async (
    db: SQLiteDatabase | null,
    accountId: number,
    rejectedBy: string,
  ): Promise<boolean> => {
    if (!db) {
      const browserAccounts = getBrowserRoleAccounts();
      const index = browserAccounts.findIndex((account) => account.id === accountId);
      if (index < 0) return false;
      browserAccounts[index] = {
        ...browserAccounts[index],
        status: 'REJECTED',
        approvedBy: rejectedBy,
        approvedAt: null,
        rejectedAt: new Date().toISOString(),
      };
      setBrowserRoleAccounts(browserAccounts);
      return true;
    }

    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM role_accounts WHERE id = ?',
      [accountId],
    );
    if (!existing) return false;
    await db.runAsync(
      `UPDATE role_accounts
       SET status = 'REJECTED', approved_by = ?, approved_at = NULL, rejected_at = datetime('now')
       WHERE id = ?`,
      [rejectedBy, accountId],
    );
    return true;
  }, [getBrowserRoleAccounts, setBrowserRoleAccounts]);

  const tryLocalLogin = useCallback(async (
    db: SQLiteDatabase | null,
    username: string,
    password: string,
  ): Promise<boolean> => {
    const normalizedUsername = username.trim().toLowerCase();
    const localBrowserAccount = findLocalRoleAccount(normalizedUsername, password);
    if (!db && localBrowserAccount) {
      await deleteSetting('auth_access_token');
      await deleteSetting('auth_refresh_token');
      setAuthTokens(null);
      await setSetting('auth_username', normalizedUsername);
      setCurrentUsername(normalizedUsername);
      setAvailableRoles(localBrowserAccount.roles);
      await persistRole(localBrowserAccount.defaultRole);
      setIsAuthenticated(true);
      return true;
    }

    const hashedPassword = await hashPassword(password);

    if (!db) {
      const browserRoleAccount = getBrowserRoleAccounts().find((account) => (
        account.username === normalizedUsername && account.passwordHash === hashedPassword && account.status === 'ACTIVE'
      ));
      if (browserRoleAccount) {
        await deleteSetting('auth_access_token');
        await deleteSetting('auth_refresh_token');
        setAuthTokens(null);
        await setSetting('auth_username', normalizedUsername);
        setCurrentUsername(normalizedUsername);
        setAvailableRoles([browserRoleAccount.role]);
        await persistRole(browserRoleAccount.role);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    }

    const localAdmin = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM admin WHERE username = ? AND password_hash = ?',
      [normalizedUsername, hashedPassword]
    );
    if (localAdmin) {
      await deleteSetting('auth_access_token');
      await deleteSetting('auth_refresh_token');
      setAuthTokens(null);
      await persistUserProfile(db, {
        username: normalizedUsername,
        role: getLocalRoleConfig(normalizedUsername)?.defaultRole ?? DEFAULT_ROLE,
        displayName: normalizedUsername,
        createdBy: 'system',
        lastLoginAt: new Date().toISOString(),
      });
      await setSetting('auth_username', normalizedUsername);
      setCurrentUsername(normalizedUsername);
      const localRoleConfig = getLocalRoleConfig(normalizedUsername);
      setAvailableRoles(localRoleConfig?.roles ?? FALLBACK_ROLES);
      await persistRole(localRoleConfig?.defaultRole ?? DEFAULT_ROLE);
      setIsAuthenticated(true);
      return true;
    }

    const roleAccount = await db.getFirstAsync<{ role: string; status: string | null }>(
      'SELECT role, status FROM role_accounts WHERE username = ? AND password_hash = ?',
      [normalizedUsername, hashedPassword]
    );
    if (roleAccount && normalizeAccountStatus(roleAccount.status) === 'ACTIVE') {
      const derivedRole = normalizeRole(roleAccount.role);
      await deleteSetting('auth_access_token');
      await deleteSetting('auth_refresh_token');
      setAuthTokens(null);
      await persistUserProfile(db, {
        username: normalizedUsername,
        role: derivedRole,
        displayName: normalizedUsername,
        createdBy: 'manager',
        lastLoginAt: new Date().toISOString(),
      });
      await setSetting('auth_username', normalizedUsername);
      setCurrentUsername(normalizedUsername);
      setAvailableRoles([derivedRole]);
      await persistRole(derivedRole);
      setIsAuthenticated(true);
      return true;
    }

    const localSeedAccount = findLocalRoleAccount(normalizedUsername, password);
    if (localSeedAccount) {
      await ensureLocalDefaultAccounts(db);
      await deleteSetting('auth_access_token');
      await deleteSetting('auth_refresh_token');
      setAuthTokens(null);
      await persistUserProfile(db, {
        username: normalizedUsername,
        role: localSeedAccount.defaultRole,
        displayName: normalizedUsername,
        createdBy: 'system',
        lastLoginAt: new Date().toISOString(),
      });
      await setSetting('auth_username', normalizedUsername);
      setCurrentUsername(normalizedUsername);
      setAvailableRoles(localSeedAccount.roles);
      await persistRole(localSeedAccount.defaultRole);
      setIsAuthenticated(true);
      return true;
    }

    return false;
  }, [
    deleteSetting,
    ensureLocalDefaultAccounts,
    findLocalRoleAccount,
    getBrowserRoleAccounts,
    getLocalRoleConfig,
    normalizeRole,
    persistRole,
    persistUserProfile,
    setSetting,
    normalizeAccountStatus,
  ]);

  const login = useCallback(async (db: SQLiteDatabase | null, username: string, password: string): Promise<boolean> => {
    try {
      const localOk = await tryLocalLogin(db, username, password);
      if (localOk) {
        return true;
      }
    } catch (localError) {
      console.error('Local login path error:', localError);
    }

    try {
      const tokens = await loginApi(username, password);
      await setSetting('auth_access_token', tokens.accessToken);
      await setSetting('auth_refresh_token', tokens.refreshToken);
      const me = await getMe();
      const derivedRole = normalizeRole(me.role);
      await setSetting('auth_username', me.username);
      setCurrentUsername(me.username);
      await persistUserProfile(db, {
        username: me.username,
        role: derivedRole,
        displayName: me.username,
        createdBy: 'backend',
        lastLoginAt: new Date().toISOString(),
      });
      setAvailableRoles(derivedRole === 'superAdmin' ? FALLBACK_ROLES : [derivedRole]);
      await persistRole(derivedRole);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, [db, normalizeRole, persistRole, persistUserProfile, setSetting, tryLocalLogin]);

  const logout = useCallback(() => {
    void logoutApi();
    void deleteSetting('auth_access_token');
    void deleteSetting('auth_refresh_token');
    void deleteSetting('auth_active_role');
    void deleteSetting('auth_username');
    setCurrentUsername('');
    setActiveRoleState(DEFAULT_ROLE);
    setAvailableRoles(FALLBACK_ROLES);
    setIsAuthenticated(false);
  }, [deleteSetting]);

  const changePassword = useCallback(async (db: SQLiteDatabase | null, oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await changePasswordApi(oldPassword, newPassword);
      await deleteSetting('auth_access_token');
      await deleteSetting('auth_refresh_token');
      setIsAuthenticated(false);
      return true;
    } catch (error) {
      try {
        if (!db) {
          if (oldPassword !== DEFAULT_ADMIN_PASSWORD) {
            console.error('Change password error:', error);
            return false;
          }
          return true;
        }

        const oldPasswordHash = await hashPassword(oldPassword);
        const localAdmin = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM admin WHERE username = ? AND password_hash = ?',
          [DEFAULT_ADMIN_USERNAME, oldPasswordHash]
        );
        if (!localAdmin) {
          console.error('Change password error:', error);
          return false;
        }

        const newPasswordHash = await hashPassword(newPassword);
        await db.runAsync(
          'UPDATE admin SET password_hash = ? WHERE id = ?',
          [newPasswordHash, localAdmin.id]
        );
        await deleteSetting('auth_access_token');
        await deleteSetting('auth_refresh_token');
        await deleteSetting('auth_active_role');
        setIsAuthenticated(false);
        return true;
      } catch (fallbackError) {
        console.error('Change password error:', error);
        console.error('Local change password fallback error:', fallbackError);
        return false;
      }
    }
  }, [deleteSetting]);

  const setActiveRole = useCallback(async (role: AppRole) => {
    if (!availableRoles.includes(role)) return;
    await persistRole(role);
  }, [availableRoles, persistRole]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUsername, activeRole, availableRoles, login, logout, changePassword, setActiveRole, listRoleAccounts, approveRoleAccount, rejectRoleAccount, createRoleAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
