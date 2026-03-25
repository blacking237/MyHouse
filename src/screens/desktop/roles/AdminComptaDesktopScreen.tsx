import React from 'react';
import AdminDashboardShell from '../../../components/myhouse/AdminDashboardShell';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';

export default function AdminComptaDesktopScreen() {
  const { metrics } = useMyHouseConsoleData();
  return (
    <AdminDashboardShell
      title="Admin comptabilite"
      description="Suivi des paiements, dettes et exports financiers."
      kpis={[
        { value: String(metrics.paymentCount), label: 'Paiements recus' },
        { value: String(metrics.invoicesCalculated), label: 'Factures calculees' },
        { value: `${Math.round(Math.max(0, metrics.totalDue - metrics.totalPaid)).toLocaleString('fr-FR')} FCFA`, label: 'Net a recouvrer' },
      ]}
      actions={[
        { label: 'Exports', onPress: () => {}, variant: 'primary' },
        { label: 'Charges communes', onPress: () => {}, variant: 'secondary' },
      ]}
    />
  );
}
