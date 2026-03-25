import React from 'react';
import { type AppRole, useAuth } from '../../database/AuthContext';
import ManagerDesktopScreen from './roles/ManagerDesktopScreen';
import ConciergeDesktopScreen from './roles/ConciergeDesktopScreen';
import TenantDesktopScreen from './roles/TenantDesktopScreen';
import AdminCommercialDesktopScreen from './roles/AdminCommercialDesktopScreen';
import AdminSavDesktopScreen from './roles/AdminSavDesktopScreen';
import AdminJuridiqueDesktopScreen from './roles/AdminJuridiqueDesktopScreen';
import AdminComptaDesktopScreen from './roles/AdminComptaDesktopScreen';
import SuperAdminDesktopScreen from './roles/SuperAdminDesktopScreen';

const ROLE_COMPONENTS: Record<AppRole, React.ComponentType> = {
  tenant: TenantDesktopScreen,
  concierge: ConciergeDesktopScreen,
  manager: ManagerDesktopScreen,
  adminCommercial: AdminCommercialDesktopScreen,
  adminSav: AdminSavDesktopScreen,
  adminJuridique: AdminJuridiqueDesktopScreen,
  adminCompta: AdminComptaDesktopScreen,
  superAdmin: SuperAdminDesktopScreen,
};

export default function DesktopRoleScreen() {
  const { activeRole } = useAuth();
  const Component = ROLE_COMPONENTS[activeRole] ?? ManagerDesktopScreen;
  return <Component />;
}
