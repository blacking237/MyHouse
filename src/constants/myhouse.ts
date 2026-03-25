import type { AppRole } from '../database/AuthContext';

export type RoleMeta = {
  label: string;
  shortLabel: string;
  primary: string;
  icon: string;
};

export const ROLE_META: Record<AppRole, RoleMeta> = {
  tenant: {
    label: 'Locataire',
    shortLabel: 'Locataire',
    primary: '#1A3C5E',
    icon: 'person-outline',
  },
  concierge: {
    label: 'Concierge',
    shortLabel: 'Concierge',
    primary: '#0E6E56',
    icon: 'speedometer-outline',
  },
  manager: {
    label: 'Gestionnaire',
    shortLabel: 'Gestionnaire',
    primary: '#1A3C5E',
    icon: 'business-outline',
  },
  adminCommercial: {
    label: 'Admin commercial',
    shortLabel: 'Commercial',
    primary: '#534AB7',
    icon: 'golf-outline',
  },
  adminSav: {
    label: 'Admin UX / SAV',
    shortLabel: 'SAV',
    primary: '#0E6E56',
    icon: 'construct-outline',
  },
  adminJuridique: {
    label: 'Admin juridique',
    shortLabel: 'Juridique',
    primary: '#993C1D',
    icon: 'document-lock-outline',
  },
  adminCompta: {
    label: 'Admin comptabilite',
    shortLabel: 'Compta',
    primary: '#185FA5',
    icon: 'calculator-outline',
  },
  superAdmin: {
    label: 'Super Admin',
    shortLabel: 'Super Admin',
    primary: '#1A3C5E',
    icon: 'ribbon-outline',
  },
};
