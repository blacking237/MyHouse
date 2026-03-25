import React from 'react';
import AdminDashboardShell from '../../../components/myhouse/AdminDashboardShell';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';

export default function AdminJuridiqueDesktopScreen() {
  const { metrics } = useMyHouseConsoleData();
  return (
    <AdminDashboardShell
      title="Admin juridique"
      description="Conformite contractuelle, suivi des baux et alertes juridiques."
      kpis={[
        { value: String(metrics.contractRows.length), label: 'Contrats suivis' },
        { value: String(metrics.contractRows.filter((row) => row.renewal !== 'OK').length), label: 'Renouvellements urgents' },
        { value: String(metrics.residents.length), label: 'Residents actifs' },
      ]}
      actions={[
        { label: 'Contrats', onPress: () => {}, variant: 'primary' },
        { label: 'Documents', onPress: () => {}, variant: 'secondary' },
      ]}
    />
  );
}
