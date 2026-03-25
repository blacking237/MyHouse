import React from 'react';
import AdminDashboardShell from '../../../components/myhouse/AdminDashboardShell';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';

export default function SuperAdminDesktopScreen() {
  const { metrics } = useMyHouseConsoleData();
  return (
    <AdminDashboardShell
      title="Super Admin"
      description="Parametrage global, licences et supervision multi-roles."
      kpis={[
        { value: String(metrics.activeRooms), label: 'Chambres actives' },
        { value: String(metrics.residents.length), label: 'Residents actifs' },
        { value: String(metrics.invoicesCalculated), label: 'Factures calculees' },
      ]}
      actions={[
        { label: 'Parametres globaux', onPress: () => {}, variant: 'primary' },
        { label: 'Licences', onPress: () => {}, variant: 'secondary' },
      ]}
    />
  );
}
