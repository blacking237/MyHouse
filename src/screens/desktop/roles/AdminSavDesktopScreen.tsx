import React from 'react';
import AdminDashboardShell from '../../../components/myhouse/AdminDashboardShell';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';

export default function AdminSavDesktopScreen() {
  const { metrics } = useMyHouseConsoleData();
  return (
    <AdminDashboardShell
      title="Admin SAV"
      description="Support, incidents et suivi des demandes utilisateurs."
      kpis={[
        { value: String(metrics.maintenanceRows.length), label: 'Incidents ouverts' },
        { value: String(metrics.activeRooms), label: 'Chambres actives' },
        { value: String(metrics.residents.length), label: 'Residents actifs' },
      ]}
      actions={[
        { label: 'Maintenance', onPress: () => {}, variant: 'primary' },
        { label: 'Notifications', onPress: () => {}, variant: 'secondary' },
      ]}
    />
  );
}
