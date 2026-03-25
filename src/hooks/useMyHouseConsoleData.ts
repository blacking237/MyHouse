import { useCallback, useEffect, useState } from 'react';
import { useDatabaseOptional, useDatabaseReady } from '../database/DatabaseContext';
import { getMonthConfig, listIndexReadings, listInvoices, listPaymentsForMonth, listResidents, listRooms, type ApiIndexReading, type ApiInvoice, type ApiMonthConfig, type ApiPaymentRecord, type ApiResident, type ApiRoom } from '../services/BackendApi';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

export type ConsoleMetrics = {
  month: string;
  rooms: ApiRoom[];
  residents: ApiResident[];
  readings: ApiIndexReading[];
  invoices: ApiInvoice[];
  payments: ApiPaymentRecord[];
  totalRooms: number;
  activeRooms: number;
  indexedRooms: number;
  invoicesCalculated: number;
  invoicesSent: number;
  paymentCount: number;
  totalPaid: number;
  totalDue: number;
  occupancyRate: number;
  monthConfig: ApiMonthConfig | null;
  monthConfigured: boolean;
  topDueInvoices: ApiInvoice[];
  recentRooms: ApiRoom[];
  portfolioRows: { room: string; status: string; createdAt: string }[];
  paymentRows: { id: number; invoiceId: number; room: string; amount: number; paidAt: string; note: string }[];
  broadcastRows: { invoiceId: number; room: string; resident: string; phone: string | null; due: number; status: ApiInvoice['statutEnvoi'] }[];
  contractRows: { room: string; resident: string; status: string; renewal: string; balance: number }[];
  maintenanceRows: { key: string; room: string; category: string; priority: string; status: string; summary: string }[];
  reportRows: { key: string; label: string; value: string; detail: string }[];
  reportFinanceRows: { key: string; label: string; value: string; detail: string }[];
  reportOperationsRows: { key: string; label: string; value: string; detail: string }[];
  reportPortfolioRows: { key: string; room: string; resident: string; balance: string; status: string }[];
};

export function useMyHouseConsoleData() {
  const db = useDatabaseOptional();
  const ready = useDatabaseReady();
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ConsoleMetrics>({
    month: getCurrentMonth(),
    rooms: [],
    residents: [],
    readings: [],
    invoices: [],
    payments: [],
    totalRooms: 0,
    activeRooms: 0,
    indexedRooms: 0,
    invoicesCalculated: 0,
    invoicesSent: 0,
    paymentCount: 0,
    totalPaid: 0,
    totalDue: 0,
    occupancyRate: 0,
    monthConfig: null,
    monthConfigured: false,
    topDueInvoices: [],
    recentRooms: [],
    portfolioRows: [],
    paymentRows: [],
    broadcastRows: [],
    contractRows: [],
    maintenanceRows: [],
    reportRows: [],
    reportFinanceRows: [],
    reportOperationsRows: [],
    reportPortfolioRows: [],
  });

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!ready) {
        return;
      }

      setLoading(true);
      try {
        const month = getCurrentMonth();
        const [rooms, readings, invoices, residents, config, paymentRows] = await Promise.all([
          listRooms(),
          listIndexReadings(month),
          listInvoices(month),
          listResidents(),
          getMonthConfig(month),
          listPaymentsForMonth(month),
        ]);

        const totalPaid = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);
        const paymentCount = paymentRows.length;
        const activeRooms = rooms.filter((room) => room.actif);
        const invoicesSent = invoices.filter((invoice) => invoice.statutEnvoi === 'ENVOYE').length;
        const totalDue = invoices.reduce((sum, invoice) => sum + invoice.netAPayer, 0);
        const occupiedRooms = invoices.filter((invoice) => invoice.totalFacture > 0).length;
        const occupancyRate = activeRooms.length > 0 ? Math.round((occupiedRooms / activeRooms.length) * 100) : 0;
        const topDueInvoices = [...invoices]
          .sort((left, right) => right.netAPayer - left.netAPayer)
          .slice(0, 5);
        const recentRooms = [...rooms]
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
        const residentByRoomId = new Map<number, ApiResident>();
        residents.forEach((resident) => {
          if (resident.currentRoomId != null) {
            residentByRoomId.set(resident.currentRoomId, resident);
          }
        });
        const readingByRoomId = new Map<number, ApiIndexReading>();
        readings.forEach((reading) => {
          readingByRoomId.set(reading.roomId, reading);
        });
        const invoiceByRoomId = new Map<number, ApiInvoice>();
        invoices.forEach((invoice) => {
          invoiceByRoomId.set(invoice.roomId, invoice);
        });
        const paymentsByInvoiceId = new Map<number, ApiPaymentRecord[]>();
        paymentRows.forEach((payment) => {
          const existing = paymentsByInvoiceId.get(payment.invoiceId) ?? [];
          existing.push(payment);
          paymentsByInvoiceId.set(payment.invoiceId, existing);
        });
        const portfolioRows = activeRooms
          .slice()
          .sort((left, right) => left.numeroChambre.localeCompare(right.numeroChambre))
          .map((room) => ({
            room: room.numeroChambre,
            status: readings.some((reading) => reading.roomId === room.id) ? 'Releve saisi' : 'En attente',
            createdAt: String(room.createdAt).slice(0, 10),
          }));
        const broadcastRows = [...invoices]
          .sort((left, right) => {
            if (left.statutEnvoi === right.statutEnvoi) {
              return right.netAPayer - left.netAPayer;
            }
            if (left.statutEnvoi === 'NON_ENVOYE') return -1;
            if (right.statutEnvoi === 'NON_ENVOYE') return 1;
            return 0;
          })
          .map((invoice) => {
            const resident = residentByRoomId.get(invoice.roomId);
            return {
              invoiceId: invoice.id,
              room: invoice.roomNumber,
              resident: [resident?.nom, resident?.prenom].filter(Boolean).join(' ').trim() || '-',
              phone: resident?.whatsapp ?? resident?.telephone ?? null,
              due: invoice.netAPayer,
              status: invoice.statutEnvoi,
            };
          });
        const contractRows = activeRooms
          .slice()
          .sort((left, right) => left.numeroChambre.localeCompare(right.numeroChambre))
          .map((room) => {
            const resident = residentByRoomId.get(room.id);
            const invoice = invoiceByRoomId.get(room.id);
            const paid = invoice
              ? (paymentsByInvoiceId.get(invoice.id) ?? []).reduce((sum, payment) => sum + payment.amount, 0)
              : 0;
            const balance = invoice ? Math.max(0, invoice.netAPayer - paid) : 0;
            const hasResident = Boolean(resident);
            const createdAt = new Date(room.createdAt);
            const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const renewal = !hasResident
              ? 'A attribuer'
              : daysSinceCreation >= 335
                ? 'Renouvellement urgent'
                : daysSinceCreation >= 300
                  ? 'A surveiller'
                  : 'Contrat actif';
            const status = !hasResident
              ? 'A completer'
              : balance > 0
                ? 'Actif avec solde'
                : 'Actif';
            return {
              room: room.numeroChambre,
              resident: resident ? `${resident.nom} ${resident.prenom}`.trim() : 'Aucun resident',
              status,
              renewal,
              balance,
            };
          });
        const maintenanceRows = activeRooms.flatMap((room) => {
          const incidents: { key: string; room: string; category: string; priority: string; status: string; summary: string }[] = [];
          const reading = readingByRoomId.get(room.id);
          const invoice = invoiceByRoomId.get(room.id);
          const resident = residentByRoomId.get(room.id);
          if (!reading) {
            incidents.push({
              key: `reading-${room.id}`,
              room: room.numeroChambre,
              category: 'Releve',
              priority: 'Haute',
              status: 'Ouvert',
              summary: 'Aucun releve du mois saisi pour cette chambre.',
            });
          }
          if (invoice?.statutEnvoi === 'ERREUR') {
            incidents.push({
              key: `billing-${room.id}`,
              room: room.numeroChambre,
              category: 'Facturation',
              priority: 'Haute',
              status: 'Action requise',
              summary: 'La derniere facture est en erreur de diffusion.',
            });
          }
          if (invoice && invoice.netAPayer > 0) {
            const paid = (paymentsByInvoiceId.get(invoice.id) ?? []).reduce((sum, payment) => sum + payment.amount, 0);
            const remaining = Math.max(0, invoice.netAPayer - paid);
            if (remaining > 0) {
              incidents.push({
                key: `payment-${room.id}`,
                room: room.numeroChambre,
                category: 'Recouvrement',
                priority: remaining >= 10000 ? 'Haute' : 'Moyenne',
                status: 'Suivi',
                summary: `Solde restant de ${Math.round(remaining).toLocaleString('fr-FR')} FCFA.`,
              });
            }
          }
          if (!resident) {
            incidents.push({
              key: `resident-${room.id}`,
              room: room.numeroChambre,
              category: 'Occupation',
              priority: 'Moyenne',
              status: 'Controle',
              summary: 'Chambre active sans resident principal lie.',
            });
          }
          return incidents;
        });
        const reportRows = [
          {
            key: 'rooms-active',
            label: 'Logements actifs',
            value: `${activeRooms.length}`,
            detail: `${rooms.length} logements totalises dans la base`,
          },
          {
            key: 'occupancy',
            label: 'Occupation',
            value: `${occupancyRate}%`,
            detail: `${contractRows.filter((row) => row.resident !== 'Aucun resident').length} chambres avec resident actif`,
          },
          {
            key: 'due',
            label: 'Net a payer',
            value: `${Math.round(totalDue).toLocaleString('fr-FR')} FCFA`,
            detail: `${Math.round(Math.max(0, totalDue - totalPaid)).toLocaleString('fr-FR')} FCFA restent a encaisser`,
          },
          {
            key: 'maintenance',
            label: 'Incidents ouverts',
            value: `${maintenanceRows.length}`,
            detail: `${maintenanceRows.filter((row) => row.priority === 'Haute').length} priorites hautes a traiter`,
          },
        ];
        const reportFinanceRows = [
          {
            key: 'billed',
            label: 'Facturation du mois',
            value: `${Math.round(totalDue).toLocaleString('fr-FR')} FCFA`,
            detail: `${invoices.length} factures editees`,
          },
          {
            key: 'collected',
            label: 'Encaissements du mois',
            value: `${Math.round(totalPaid).toLocaleString('fr-FR')} FCFA`,
            detail: `${paymentCount} paiements confirmes`,
          },
          {
            key: 'outstanding',
            label: 'Reste a encaisser',
            value: `${Math.round(Math.max(0, totalDue - totalPaid)).toLocaleString('fr-FR')} FCFA`,
            detail: `${invoices.filter((invoice) => invoice.statutEnvoi !== 'ENVOYE').length} factures encore a pousser ou relancer`,
          },
          {
            key: 'average',
            label: 'Panier moyen facture',
            value: invoices.length > 0 ? `${Math.round(totalDue / invoices.length).toLocaleString('fr-FR')} FCFA` : '0 FCFA',
            detail: 'Montant moyen facture par chambre sur le mois courant',
          },
        ];
        const reportOperationsRows = [
          {
            key: 'readings',
            label: 'Couverture releves',
            value: `${readings.length}/${activeRooms.length || rooms.length}`,
            detail: activeRooms.length > 0 ? `${Math.round((readings.length / activeRooms.length) * 100)}% des logements actifs` : 'Aucun logement actif',
          },
          {
            key: 'diffusion',
            label: 'Diffusion factures',
            value: `${invoicesSent}/${invoices.length}`,
            detail: invoices.length > 0 ? `${Math.round((invoicesSent / invoices.length) * 100)}% du portefeuille facture` : 'Aucune facture calculee',
          },
          {
            key: 'contracts',
            label: 'Contrats actifs',
            value: `${contractRows.filter((row) => row.status !== 'A completer').length}`,
            detail: `${contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length} renouvellements urgents`,
          },
          {
            key: 'incidents',
            label: 'Charge incidents',
            value: `${maintenanceRows.length}`,
            detail: `${maintenanceRows.filter((row) => row.category === 'Releve').length} releves / ${maintenanceRows.filter((row) => row.category === 'Facturation').length} facturation`,
          },
        ];
        const reportPortfolioRows = contractRows
          .slice()
          .sort((left, right) => right.balance - left.balance)
          .slice(0, 8)
          .map((row) => ({
            key: row.room,
            room: row.room,
            resident: row.resident,
            balance: `${Math.round(row.balance).toLocaleString('fr-FR')} FCFA`,
            status: row.renewal === 'Renouvellement urgent' ? 'Urgent' : row.status,
          }));

        if (!alive) {
          return;
        }

        setMetrics({
          month,
          rooms,
          residents,
          readings,
          invoices,
          payments: paymentRows,
          totalRooms: rooms.length,
          activeRooms: activeRooms.length,
          indexedRooms: readings.length,
          invoicesCalculated: invoices.length,
          invoicesSent,
          paymentCount,
          totalPaid,
          totalDue,
          occupancyRate,
          monthConfig: config,
          monthConfigured: !!config,
          topDueInvoices,
          recentRooms,
          portfolioRows,
          paymentRows: (paymentRows ?? []).map((payment: ApiPaymentRecord) => ({
            id: payment.id,
            invoiceId: payment.invoiceId,
            room: payment.roomNumber,
            amount: payment.amount,
            paidAt: payment.paidAt,
            note: payment.note,
          })),
          broadcastRows,
          contractRows,
          maintenanceRows,
          reportRows,
          reportFinanceRows,
          reportOperationsRows,
          reportPortfolioRows,
        });
      } catch (error) {
        console.error('MyHouse console data load error:', error);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [db, ready, reloadToken]);

  return { loading, metrics, reload };
}
