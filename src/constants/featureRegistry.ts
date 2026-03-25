import type { AppRole } from '../database/AuthContext';

export type FeatureKey =
  | 'dashboard'
  | 'portfolio'
  | 'residents'
  | 'concierges'
  | 'contracts'
  | 'payments'
  | 'maintenance'
  | 'reports'
  | 'documents'
  | 'notifications'
  | 'exports'
  | 'metertrack'
  | 'settings'
  | 'marketplace'
  | 'commonCharges';

export type FeatureSection = {
  titleKey: string;
  features: FeatureKey[];
};

export const FEATURE_REGISTRY: Record<FeatureKey, Array<AppRole | 'admin'>> = {
  dashboard: ['admin', 'manager', 'concierge'],
  portfolio: ['admin', 'manager'],
  residents: ['admin', 'manager', 'concierge'],
  concierges: ['admin', 'manager'],
  contracts: ['admin', 'manager'],
  payments: ['admin', 'manager', 'concierge', 'adminCompta'],
  maintenance: ['admin', 'manager', 'concierge'],
  reports: ['admin', 'manager'],
  documents: ['admin', 'manager', 'concierge'],
  notifications: ['admin', 'manager', 'concierge'],
  exports: ['admin', 'manager', 'adminCompta', 'concierge'],
  metertrack: ['admin', 'manager', 'concierge'],
  settings: ['admin', 'manager'],
  marketplace: ['admin', 'manager', 'adminCommercial'],
  commonCharges: ['admin', 'manager', 'adminCompta'],
};

export const FEATURE_SECTIONS: FeatureSection[] = [
  { titleKey: 'sectionDashboard', features: ['dashboard'] },
  { titleKey: 'sectionManagement', features: ['portfolio', 'residents', 'concierges', 'contracts'] },
  { titleKey: 'sectionOperations', features: ['maintenance', 'documents', 'notifications', 'marketplace'] },
  { titleKey: 'sectionConsumption', features: ['metertrack'] },
  { titleKey: 'sectionFinance', features: ['payments', 'reports', 'exports', 'commonCharges'] },
  { titleKey: 'sectionAdministration', features: ['settings'] },
];

export function roleHasFeature(role: AppRole, feature: FeatureKey): boolean {
  const allowed = FEATURE_REGISTRY[feature] ?? [];
  if (allowed.includes(role)) return true;
  if (allowed.includes('admin')) {
    return role === 'superAdmin' || role.startsWith('admin');
  }
  return false;
}
