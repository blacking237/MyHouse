import React from 'react';
import AdminDashboardShell from '../../../components/myhouse/AdminDashboardShell';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';

export default function AdminCommercialDesktopScreen() {
  const { metrics } = useMyHouseConsoleData();
  return (
    <AdminDashboardShell
      title="Admin commercial"
      description="Pilotage des leads, offres marketplace et portefeuille commercial."
      kpis={[
        { value: String(metrics.activeRooms), label: 'Chambres actives' },
        { value: String(metrics.residents.length), label: 'Residents actifs' },
        { value: String(metrics.contractRows.length), label: 'Contrats suivis' },
      ]}
      actions={[
        { label: 'Marketplace', onPress: () => {}, variant: 'primary' },
        { label: 'Portefeuille', onPress: () => {}, variant: 'secondary' },
      ]}
    />
  );
}
