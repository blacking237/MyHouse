import type { AppRole } from '../database/AuthContext';

export type RoleMeta = {
  label: string;
  shortLabel: string;
  primary: string;
  icon: string;
};

export const ROLE_META: Record<AppRole, RoleMeta> = {
  tenant: {
    label: 'RESIDENT',
    shortLabel: 'RESIDENT',
    primary: '#1A3C5E',
    icon: 'person-outline',
  },
  concierge: {
    label: 'CONCIERGE',
    shortLabel: 'CONCIERGE',
    primary: '#0E6E56',
    icon: 'speedometer-outline',
  },
  manager: {
    label: 'GESTIONNAIRE',
    shortLabel: 'GESTIONNAIRE',
    primary: '#1A3C5E',
    icon: 'business-outline',
  },
  adminCommercial: {
    label: 'ADMIN_COMMERCIAL',
    shortLabel: 'ADMIN_COMMERCIAL',
    primary: '#534AB7',
    icon: 'golf-outline',
  },
  adminSav: {
    label: 'ADMIN_SAV',
    shortLabel: 'ADMIN_SAV',
    primary: '#0E6E56',
    icon: 'construct-outline',
  },
  adminJuridique: {
    label: 'ADMIN_JURIDIQUE',
    shortLabel: 'ADMIN_JURIDIQUE',
    primary: '#993C1D',
    icon: 'document-lock-outline',
  },
  adminCompta: {
    label: 'ADMIN_COMPTA',
    shortLabel: 'ADMIN_COMPTA',
    primary: '#185FA5',
    icon: 'calculator-outline',
  },
  superAdmin: {
    label: 'SUPER_ADMIN',
    shortLabel: 'SUPER_ADMIN',
    primary: '#1A3C5E',
    icon: 'ribbon-outline',
  },
};
