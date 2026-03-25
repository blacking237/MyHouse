import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { usePreferences, useThemeColors, type Language, type ThemeMode } from '../../../database/PreferencesContext';
import { useDatabaseOptional } from '../../../database/DatabaseContext';
import { useAuth, type AppRole, type RoleAccountSummary } from '../../../database/AuthContext';
import { FEATURE_SECTIONS, roleHasFeature, type FeatureKey } from '../../../constants/featureRegistry';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';
import {
  applyMaintenancePenalty,
  createPayment,
  createResident,
  listMarketplaceListings,
  upsertMarketplaceListing,
  listCommonCharges,
  upsertCommonCharge,
  assignCommonCharge,
  exportExitReportPdf,
  exportFinanceSummaryExcel,
  exportMeterTrackExcel,
  exportPaymentReceiptPdf,
  exportResidentHistoryPdf,
  listContracts,
  listExitReports,
  listMaintenanceTickets,
  listPaymentsByInvoice,
  patchResident,
  assignResidentRoom,
  listPendingUsers,
  approveUserAccount,
  createUserAccount,
  rejectUserAccount,
  recordPayment,
  renewContract,
  sendNotification,
  signContract,
  signExitReport,
  upsertContract,
  upsertExitReport,
  upsertMaintenanceTicket,
  validateContract,
  ocrParseIdentity,
  type ApiContract,
  type ApiExitReport,
  type ApiMaintenanceTicket,
  type ApiMarketplaceListing,
  type ApiCommonCharge,
  type ApiNotificationResponse,
  type ApiPayment,
  type ApiUserSummary,
} from '../../../services/BackendApi';
import ActionPanel from '../../../components/myhouse/ActionPanel';
import DataTableCard from '../../../components/myhouse/DataTableCard';
import KpiTile from '../../../components/myhouse/KpiTile';
import SectionHeader from '../../../components/myhouse/SectionHeader';

type ManagerPage =
  | 'dashboard'
  | 'portfolio'
  | 'residents'
  | 'concierges'
  | 'contracts'
  | 'maintenance'
  | 'payments'
  | 'notifications'
  | 'exports'
  | 'reports'
  | 'documents'
  | 'metertrackReadOnly'
  | 'settings'
  | 'marketplace'
  | 'commonCharges';
type ContractRegistryEntry = {
  room: string;
  resident: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
  status: string;
  signingMode: string;
  autoRenewal: boolean;
  notes: string;
};
type ContractForm = ContractRegistryEntry;
type MaintenanceTicketStatus = 'OUVERT' | 'EN_COURS' | 'PLANIFIE' | 'RESOLU';
type MaintenanceTicketPriority = 'Haute' | 'Moyenne' | 'Basse';
type MaintenanceTicketEntry = {
  key: string;
  source: 'manual';
  room: string;
  category: string;
  priority: MaintenanceTicketPriority;
  status: MaintenanceTicketStatus;
  assignee: string;
  summary: string;
  notes: string;
};
type MaintenanceForm = Omit<MaintenanceTicketEntry, 'key' | 'source'>;
type ContractApiForm = {
  roomNumero: string;
  residentExternalId: string;
  status: string;
  signingMode: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  deposit: string;
  autoRenewal: boolean;
  notes: string;
  externalId?: string | null;
};
type MaintenanceApiForm = {
  roomNumero: string;
  residentExternalId: string;
  category: string;
  priority: string;
  status: string;
  responsibility: string;
  estimatedCost: string;
  penaltyAmount: string;
  notes: string;
  externalId?: string | null;
};
type PaymentForm = {
  invoiceId: number | null;
  amount: string;
  method: string;
  note: string;
};
type NotificationForm = {
  channel: string;
  recipient: string;
  subject: string;
  message: string;
};
type DocumentType = 'CONTRAT' | 'PIECE_LOCATIVE' | 'ETAT_DES_LIEUX' | 'PV' | 'AUTRE';
type DocumentStatus = 'BROUILLON' | 'VALIDE' | 'A_SIGNER' | 'ARCHIVE';
type DocumentEntry = {
  key: string;
  room: string;
  resident: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  issuedOn: string;
  expiresOn: string;
  notes: string;
};
type DocumentForm = Omit<DocumentEntry, 'key'>;
type ExitReportForm = {
  roomId: string;
  residentId: string;
  contractId: string;
  depositAmount: string;
  repairCost: string;
  notes: string;
};
type OcrOnboardingForm = {
  documentType: 'CNI' | 'PASSPORT';
  frontImageBase64: string;
  backImageBase64: string;
  roomId: string;
  username: string;
  password: string;
  monthlyRent: string;
  deposit: string;
};
type MarketplaceForm = {
  title: string;
  description: string;
  price: string;
  currency: string;
  listingType: string;
  status: string;
  address: string;
  latitude: string;
  longitude: string;
};
type CommonChargeForm = {
  code: string;
  label: string;
  amount: string;
  required: boolean;
  active: boolean;
};
type CommonChargeAssignForm = {
  chargeId: string;
  scopeType: string;
  scopeValue: string;
  required: boolean;
};
const CONTRACT_REGISTRY_KEY = 'manager_contract_registry';
const MAINTENANCE_TICKETS_KEY = 'manager_maintenance_tickets';
const DOCUMENT_REGISTRY_KEY = 'manager_documents_registry';

const MANAGER_FEATURE_MAP: Record<FeatureKey, { page: ManagerPage; icon: React.ComponentProps<typeof Ionicons>['name']; labelKey: string }> = {
  dashboard: { page: 'dashboard', icon: 'grid-outline', labelKey: 'dashboardLabel' },
  portfolio: { page: 'portfolio', icon: 'business-outline', labelKey: 'portfolioLabel' },
  residents: { page: 'residents', icon: 'people-outline', labelKey: 'residentsLabel' },
  concierges: { page: 'concierges', icon: 'person-add-outline', labelKey: 'conciergeAccounts' },
  contracts: { page: 'contracts', icon: 'document-text-outline', labelKey: 'contracts' },
  payments: { page: 'payments', icon: 'cash-outline', labelKey: 'payments' },
  maintenance: { page: 'maintenance', icon: 'construct-outline', labelKey: 'maintenance' },
  notifications: { page: 'notifications', icon: 'megaphone-outline', labelKey: 'notifications' },
  exports: { page: 'exports', icon: 'download-outline', labelKey: 'exports' },
  reports: { page: 'reports', icon: 'stats-chart-outline', labelKey: 'reports' },
  documents: { page: 'documents', icon: 'folder-open-outline', labelKey: 'documents' },
  metertrack: { page: 'metertrackReadOnly', icon: 'calculator-outline', labelKey: 'managerMeterTrackReadOnly' },
  settings: { page: 'settings', icon: 'settings-outline', labelKey: 'settings' },
  marketplace: { page: 'marketplace', icon: 'storefront-outline', labelKey: 'marketplace' },
  commonCharges: { page: 'commonCharges', icon: 'wallet-outline', labelKey: 'commonCharges' },
};

export default function ManagerDesktopScreen() {
  const { t, language, themeMode, setLanguage, setThemeMode } = usePreferences();
  const db = useDatabaseOptional();
  const { createRoleAccount, listRoleAccounts, approveRoleAccount, rejectRoleAccount, logout, activeRole, currentUsername } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { loading, metrics } = useMyHouseConsoleData();
  const [page, setPage] = useState<ManagerPage>('dashboard');
  const [roleAccounts, setRoleAccounts] = useState<RoleAccountSummary[]>([]);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountRole, setAccountRole] = useState<AppRole>('concierge');
  const [accountNotice, setAccountNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contractRegistry, setContractRegistry] = useState<Record<string, ContractRegistryEntry>>({});
  const [selectedPortfolioRoom, setSelectedPortfolioRoom] = useState<string | null>(null);
  const [selectedContractRoom, setSelectedContractRoom] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState<ContractForm>(emptyContractForm());
  const [contractNotice, setContractNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicketEntry[]>([]);
  const [selectedMaintenanceKey, setSelectedMaintenanceKey] = useState<string | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(emptyMaintenanceForm());
  const [maintenanceNotice, setMaintenanceNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [documentRegistry, setDocumentRegistry] = useState<DocumentEntry[]>([]);
  const [selectedDocumentKey, setSelectedDocumentKey] = useState<string | null>(null);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocumentForm());
  const [documentNotice, setDocumentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exitReports, setExitReports] = useState<ApiExitReport[]>([]);
  const [selectedExitReportId, setSelectedExitReportId] = useState<number | null>(null);
  const [exitReportForm, setExitReportForm] = useState<ExitReportForm>(emptyExitReportForm());
  const [exitReportNotice, setExitReportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ocrOnboardingForm, setOcrOnboardingForm] = useState<OcrOnboardingForm>(emptyOcrOnboardingForm());
  const [ocrExtractedFields, setOcrExtractedFields] = useState<Record<string, string>>({});
  const [ocrOnboardingNotice, setOcrOnboardingNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [marketplaceListings, setMarketplaceListings] = useState<ApiMarketplaceListing[]>([]);
  const [marketplaceForm, setMarketplaceForm] = useState<MarketplaceForm>(emptyMarketplaceForm());
  const [marketplaceNotice, setMarketplaceNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [commonCharges, setCommonCharges] = useState<ApiCommonCharge[]>([]);
  const [commonChargeForm, setCommonChargeForm] = useState<CommonChargeForm>(emptyCommonChargeForm());
  const [commonChargeAssignForm, setCommonChargeAssignForm] = useState<CommonChargeAssignForm>(emptyCommonChargeAssignForm());
  const [commonChargeNotice, setCommonChargeNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contractsApi, setContractsApi] = useState<ApiContract[]>([]);
  const [selectedContractApiId, setSelectedContractApiId] = useState<number | null>(null);
  const [contractApiForm, setContractApiForm] = useState<ContractApiForm>(emptyContractApiForm());
  const [contractApiNotice, setContractApiNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [maintenanceApiTickets, setMaintenanceApiTickets] = useState<ApiMaintenanceTicket[]>([]);
  const [selectedMaintenanceApiId, setSelectedMaintenanceApiId] = useState<number | null>(null);
  const [maintenanceApiForm, setMaintenanceApiForm] = useState<MaintenanceApiForm>(emptyMaintenanceApiForm());
  const [maintenanceApiNotice, setMaintenanceApiNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm());
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<ApiPayment[]>([]);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>(emptyNotificationForm());
  const [notificationLog, setNotificationLog] = useState<ApiNotificationResponse[]>([]);
  const [notificationNotice, setNotificationNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingAccounts, setPendingAccounts] = useState<Array<
    | { source: 'api'; id: number; username: string; role: string; createdBy: string | null }
    | { source: 'local'; id: number; username: string; role: AppRole; createdBy: string | null }
  >>([]);
  const [pendingNotice, setPendingNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportMonth, setExportMonth] = useState(metrics.month);
  const [exportResidentId, setExportResidentId] = useState('');
  const [exportPaymentId, setExportPaymentId] = useState('');
  const [exportExitReportId, setExportExitReportId] = useState('');

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const accounts = await listRoleAccounts(db);
      if (alive) {
        setRoleAccounts(accounts.filter((account) => account.role === 'concierge' || account.role === 'tenant'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, listRoleAccounts]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await getContractRegistry(db);
      if (alive) {
        setContractRegistry(entries);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await getMaintenanceTickets(db);
      if (alive) {
        setMaintenanceTickets(entries);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await getDocumentsRegistry(db);
      if (alive) {
        setDocumentRegistry(entries);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const entries = await listMarketplaceListings();
        if (alive) {
          setMarketplaceListings(entries);
        }
      } catch (error) {
        console.warn('Marketplace load failed', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const entries = await listCommonCharges();
        if (alive) {
          setCommonCharges(entries);
        }
      } catch (error) {
        console.warn('Common charges load failed', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const entries = await listContracts();
        if (alive) {
          setContractsApi(entries);
        }
      } catch (error) {
        console.warn('Contracts load failed', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    setExportMonth((current) => current || metrics.month);
  }, [metrics.month]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const entries = await listMaintenanceTickets();
        if (alive) {
          setMaintenanceApiTickets(entries);
        }
      } catch (error) {
        console.warn('Maintenance load failed', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const entries = await listExitReports();
        if (alive) {
          setExitReports(entries);
        }
      } catch (error) {
        console.warn('Exit reports load failed', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadPendingAccounts = React.useCallback(async () => {
    const localPending = (await listRoleAccounts(db))
      .filter((entry) => (
        (entry.role === 'concierge' || entry.role === 'tenant') &&
        entry.status === 'PENDING'
      ))
      .map((entry) => ({
        source: 'local' as const,
        id: entry.id,
        username: entry.username,
        role: entry.role,
        createdBy: entry.createdBy ?? null,
      }));

    try {
      const entries = await listPendingUsers();
      const apiPending = entries
        .filter((entry) => entry.role === 'CONCIERGE' || entry.role === 'RESIDENT')
        .map((entry) => ({
          source: 'api' as const,
          id: entry.id,
          username: entry.username,
          role: entry.role,
          createdBy: entry.createdBy ?? null,
        }));
      setPendingAccounts([...localPending, ...apiPending]);
    } catch (error) {
      setPendingAccounts(localPending);
    }
  }, [db, listRoleAccounts]);

  React.useEffect(() => {
    void loadPendingAccounts();
  }, [loadPendingAccounts]);

  const residentDirectoryRows = useMemo(
    () =>
      metrics.residents
        .filter((resident) => resident.statut !== 'INACTIF')
        .map((resident) => ({
          resident: `${resident.nom} ${resident.prenom}`.trim(),
          room: resident.currentRoomId != null
            ? metrics.rooms.find((room) => room.id === resident.currentRoomId)?.numeroChambre ?? '-'
            : '-',
          phone: resident.whatsapp ?? resident.telephone ?? '-',
          status: resident.statut ?? '-',
        }))
        .sort((left, right) => left.room.localeCompare(right.room)),
    [metrics.residents, metrics.rooms],
  );

  const invoiceRows = useMemo(
    () =>
      metrics.invoices.map((invoice) => {
        const room = metrics.rooms.find((entry) => entry.id === invoice.roomId);
        const resident = metrics.residents.find((entry) => entry.id === invoice.residentId);
        return {
          id: String(invoice.id),
          room: room?.numeroChambre ?? invoice.roomId?.toString() ?? '-',
          resident: resident ? `${resident.nom} ${resident.prenom}`.trim() : '-',
          total: formatMoney(invoice.totalFacture),
          net: formatMoney(invoice.netAPayer),
          status: invoice.statutEnvoi ?? '-',
        };
      }),
    [metrics.invoices, metrics.residents, metrics.rooms],
  );

  const selectedInvoice = useMemo(
    () => metrics.invoices.find((invoice) => invoice.id === paymentForm.invoiceId) ?? null,
    [metrics.invoices, paymentForm.invoiceId],
  );

  const handleCreateConcierge = React.useCallback(async () => {
    try {
      await createUserAccount({
        username: accountUsername.trim().toLowerCase(),
        password: accountPassword,
        role: accountRole === 'tenant' ? 'RESIDENT' : 'CONCIERGE',
      });
    } catch (apiError) {
      const result = await createRoleAccount(db, accountUsername, accountPassword, accountRole, currentUsername || 'manager');
      if (!result.ok) {
        setAccountNotice({
          type: 'error',
          message: result.reason === 'duplicate' ? t('accountExists') : t('fillAllFields'),
        });
        return;
      }
    }
    const accounts = await listRoleAccounts(db);
    setRoleAccounts(accounts.filter((account) => account.role === 'concierge' || account.role === 'tenant'));
    await loadPendingAccounts();
    setAccountUsername('');
    setAccountPassword('');
    setAccountRole('concierge');
    setAccountNotice({ type: 'success', message: t('accountCreated') });
  }, [accountPassword, accountRole, accountUsername, createRoleAccount, currentUsername, db, listRoleAccounts, loadPendingAccounts, t]);

  const contractRows = useMemo(
    () =>
      metrics.contractRows.map((row) => {
        const stored = contractRegistry[row.room];
        return {
          room: row.room,
          resident: stored?.resident || row.resident,
          status: stored?.status || row.status,
          renewal: row.renewal,
          balance: formatMoney(row.balance),
          signingMode: stored?.signingMode || '-',
          startDate: stored?.startDate || '-',
          endDate: stored?.endDate || '-',
        };
      }),
    [contractRegistry, metrics.contractRows],
  );

  const selectedPortfolioSnapshot = useMemo(() => {
    if (!selectedPortfolioRoom) {
      return null;
    }
    const room = metrics.rooms.find((entry) => entry.numeroChambre === selectedPortfolioRoom) ?? null;
    const resident = room
      ? metrics.residents.find((entry) => entry.currentRoomId === room.id && entry.statut !== 'INACTIF') ?? null
      : null;
    const reading = room ? metrics.readings.find((entry) => entry.roomId === room.id) ?? null : null;
    const invoice = room ? metrics.invoices.find((entry) => entry.roomId === room.id) ?? null : null;
    const contract = contractRegistry[selectedPortfolioRoom] ?? null;
    const roomMaintenance = metrics.maintenanceRows.filter((entry) => entry.room === selectedPortfolioRoom);
    const paidAmount = invoice
      ? metrics.payments.filter((payment) => payment.invoiceId === invoice.id).reduce((sum, payment) => sum + payment.amount, 0)
      : 0;
    return { room, resident, reading, invoice, contract, roomMaintenance, paidAmount };
  }, [contractRegistry, metrics.invoices, metrics.maintenanceRows, metrics.payments, metrics.readings, metrics.residents, metrics.rooms, selectedPortfolioRoom]);

  const maintenanceRows = useMemo(
    () => [
      ...maintenanceTickets.map((ticket) => ({
        key: ticket.key,
        room: ticket.room,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        summary: ticket.summary,
        source: 'manual' as const,
        assignee: ticket.assignee,
        notes: ticket.notes,
      })),
      ...metrics.maintenanceRows.map((row) => ({
        ...row,
        source: 'auto' as const,
        assignee: '',
        notes: '',
      })),
    ],
    [maintenanceTickets, metrics.maintenanceRows],
  );

  const selectedMaintenance = maintenanceRows.find((row) => row.key === selectedMaintenanceKey) ?? null;
  const maintenanceApiRows = useMemo(
    () =>
      maintenanceApiTickets.map((ticket) => ({
        id: String(ticket.id),
        room: ticket.roomNumero,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        responsibility: ticket.responsibility,
        estimatedCost: formatMoney(ticket.estimatedCost),
        penaltyAmount: formatMoney(ticket.penaltyAmount),
      })),
    [maintenanceApiTickets],
  );
  const selectedMaintenanceApi = maintenanceApiTickets.find((ticket) => ticket.id === selectedMaintenanceApiId) ?? null;
  const selectedDocument = documentRegistry.find((row) => row.key === selectedDocumentKey) ?? null;
  const exitReportRows = useMemo(
    () => exitReports.map((report) => ({
      id: String(report.id),
      room: report.roomNumero || '-',
      resident: report.residentName || '-',
      refund: formatMoney(report.refundAmount),
      status: report.status,
    })),
    [exitReports],
  );
  const selectedExitReport = exitReports.find((report) => report.id === selectedExitReportId) ?? null;

  const selectedContract = selectedContractRoom ? contractRegistry[selectedContractRoom] ?? null : null;
  const selectedContractApi = contractsApi.find((entry) => entry.id === selectedContractApiId) ?? null;

  const languageOptions: Array<{ value: Language; label: string }> = [
    { value: 'fr', label: t('pickFrench') },
    { value: 'en', label: t('pickEnglish') },
    { value: 'es', label: t('pickSpanish') },
  ];

  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'light', label: t('lightMode') },
    { value: 'dark', label: t('darkMode') },
  ];

  const openContractEditor = React.useCallback((room: string) => {
    const baseRow = metrics.contractRows.find((entry) => entry.room === room);
    const stored = contractRegistry[room];
    setSelectedContractRoom(room);
    setContractForm({
      room,
      resident: stored?.resident || baseRow?.resident || '',
      startDate: stored?.startDate || '',
      endDate: stored?.endDate || '',
      monthlyRent: stored?.monthlyRent || '',
      deposit: stored?.deposit || '',
      status: stored?.status || t('contractStatusDraft'),
      signingMode: stored?.signingMode || t('contractSigningPhysical'),
      autoRenewal: stored?.autoRenewal ?? false,
      notes: stored?.notes || '',
    });
    setContractNotice(null);
  }, [contractRegistry, metrics.contractRows, t]);

  const handleSaveContract = React.useCallback(async () => {
    if (!selectedContractRoom) {
      setContractNotice({ type: 'error', message: t('selectRoomContractHint') });
      return;
    }
    const nextRegistry = {
      ...contractRegistry,
      [selectedContractRoom]: {
        ...contractForm,
        room: selectedContractRoom,
      },
    };
    await saveContractRegistry(db, nextRegistry);
    setContractRegistry(nextRegistry);
    setContractNotice({ type: 'success', message: t('contractSaved') });
  }, [contractForm, contractRegistry, db, selectedContractRoom, t]);

  const openContractApiEditor = React.useCallback((contract?: ApiContract | null) => {
    if (!contract) {
      setSelectedContractApiId(null);
      setContractApiForm(emptyContractApiForm());
      setContractApiNotice(null);
      return;
    }
    setSelectedContractApiId(contract.id);
    setContractApiForm({
      roomNumero: contract.roomNumero,
      residentExternalId: '',
      status: contract.status,
      signingMode: contract.signingMode,
      startDate: contract.startDate ?? '',
      endDate: contract.endDate ?? '',
      monthlyRent: String(contract.monthlyRent ?? 0),
      deposit: String(contract.deposit ?? 0),
      autoRenewal: contract.autoRenewal,
      notes: contract.notes ?? '',
      externalId: contract.externalId ?? null,
    });
    setContractApiNotice(null);
  }, []);

  const handleSaveContractApi = React.useCallback(async () => {
    if (!contractApiForm.roomNumero.trim()) {
      setContractApiNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const updated = await upsertContract({
        roomNumero: contractApiForm.roomNumero.trim(),
        residentExternalId: contractApiForm.residentExternalId.trim() || null,
        status: contractApiForm.status.trim() || t('contractStatusDraft'),
        signingMode: contractApiForm.signingMode.trim() || t('contractSigningPhysical'),
        startDate: contractApiForm.startDate.trim() || null,
        endDate: contractApiForm.endDate.trim() || null,
        monthlyRent: Number(contractApiForm.monthlyRent) || 0,
        deposit: Number(contractApiForm.deposit) || 0,
        autoRenewal: contractApiForm.autoRenewal,
        notes: contractApiForm.notes.trim() || null,
        externalId: contractApiForm.externalId ?? null,
      });
      const next = [updated, ...contractsApi.filter((entry) => entry.id !== updated.id)];
      setContractsApi(next);
      setSelectedContractApiId(updated.id);
      setContractApiNotice({ type: 'success', message: t('contractSaved') });
      await pushBusinessNotification(
        'EMAIL',
        updated.residentName || updated.roomNumero,
        'Contrat MyHouse initialise',
        `Le contrat de la chambre ${updated.roomNumero} est enregistre avec le statut ${updated.status}.`,
      );
    } catch (error) {
      setContractApiNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [contractApiForm, contractsApi, pushBusinessNotification, t]);

  const handleSignContractApi = React.useCallback(async () => {
    if (!selectedContractApiId) return;
    try {
      const updated = await signContract(selectedContractApiId, t('managerRole'), 'GESTIONNAIRE');
      const next = [updated, ...contractsApi.filter((entry) => entry.id !== updated.id)];
      setContractsApi(next);
      setContractApiNotice({ type: 'success', message: t('success') });
      await pushBusinessNotification(
        'PUSH',
        updated.residentName || updated.roomNumero,
        'Contrat signe',
        `Le gestionnaire a signe le contrat de la chambre ${updated.roomNumero}.`,
      );
    } catch (error) {
      setContractApiNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [contractsApi, pushBusinessNotification, selectedContractApiId, t]);

  const handleValidateContractApi = React.useCallback(async () => {
    if (!selectedContractApiId) return;
    try {
      const updated = await validateContract(selectedContractApiId);
      const next = [updated, ...contractsApi.filter((entry) => entry.id !== updated.id)];
      setContractsApi(next);
      setContractApiNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setContractApiNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [contractsApi, selectedContractApiId, t]);

  const handleRenewContractApi = React.useCallback(async () => {
    if (!selectedContractApiId) return;
    try {
      const updated = await renewContract(selectedContractApiId);
      const next = [updated, ...contractsApi.filter((entry) => entry.id !== updated.id)];
      setContractsApi(next);
      setContractApiNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setContractApiNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [contractsApi, selectedContractApiId, t]);

  const openMaintenanceEditor = React.useCallback((key?: string) => {
    const selected = key ? maintenanceRows.find((row) => row.key === key) ?? null : null;
    setSelectedMaintenanceKey(selected?.key ?? null);
    setMaintenanceForm({
      room: selected?.room ?? selectedPortfolioRoom ?? selectedContractRoom ?? '',
      category: selected?.category ?? 'Maintenance',
      priority: (selected?.priority as MaintenanceTicketPriority | undefined) ?? 'Moyenne',
      status: selected?.source === 'manual'
        ? (selected.status as MaintenanceTicketStatus)
        : selected?.status === 'Action requise' || selected?.status === 'Ouvert'
          ? 'OUVERT'
          : selected?.status === 'Suivi' || selected?.status === 'Controle'
            ? 'EN_COURS'
            : selected?.status === 'Planifie'
              ? 'PLANIFIE'
              : 'RESOLU',
      assignee: selected?.assignee ?? '',
      summary: selected?.summary ?? '',
      notes: selected?.notes ?? '',
    });
    setMaintenanceNotice(null);
  }, [maintenanceRows, selectedContractRoom, selectedPortfolioRoom]);

  const handleSaveMaintenance = React.useCallback(async () => {
    const room = maintenanceForm.room.trim();
    const summary = maintenanceForm.summary.trim();
    if (!room || !summary) {
      setMaintenanceNotice({ type: 'error', message: t('maintenanceRoomRequired') });
      return;
    }
    const nextEntry: MaintenanceTicketEntry = {
      key: selectedMaintenance?.source === 'manual' ? selectedMaintenance.key : `manual-${Date.now()}`,
      source: 'manual',
      room,
      category: maintenanceForm.category.trim() || 'Maintenance',
      priority: maintenanceForm.priority,
      status: maintenanceForm.status,
      assignee: maintenanceForm.assignee.trim(),
      summary,
      notes: maintenanceForm.notes.trim(),
    };
    const nextEntries = [nextEntry, ...maintenanceTickets.filter((entry) => entry.key !== nextEntry.key)];
    await saveMaintenanceTickets(db, nextEntries);
    setMaintenanceTickets(nextEntries);
    setSelectedMaintenanceKey(nextEntry.key);
    setMaintenanceNotice({ type: 'success', message: t('maintenanceSaved') });
  }, [db, maintenanceForm, maintenanceTickets, selectedMaintenance, t]);

  const openMaintenanceApiEditor = React.useCallback((ticket?: ApiMaintenanceTicket | null) => {
    if (!ticket) {
      setSelectedMaintenanceApiId(null);
      setMaintenanceApiForm(emptyMaintenanceApiForm());
      setMaintenanceApiNotice(null);
      return;
    }
    setSelectedMaintenanceApiId(ticket.id);
    setMaintenanceApiForm({
      roomNumero: ticket.roomNumero,
      residentExternalId: '',
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      responsibility: ticket.responsibility,
      estimatedCost: String(ticket.estimatedCost ?? 0),
      penaltyAmount: String(ticket.penaltyAmount ?? 0),
      notes: ticket.notes ?? '',
      externalId: ticket.externalId ?? null,
    });
    setMaintenanceApiNotice(null);
  }, []);

  const handleSaveMaintenanceApi = React.useCallback(async () => {
    if (!maintenanceApiForm.roomNumero.trim() || !maintenanceApiForm.category.trim()) {
      setMaintenanceApiNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const updated = await upsertMaintenanceTicket({
        roomNumero: maintenanceApiForm.roomNumero.trim(),
        residentExternalId: maintenanceApiForm.residentExternalId.trim() || null,
        category: maintenanceApiForm.category.trim(),
        priority: maintenanceApiForm.priority.trim() || 'Moyenne',
        status: maintenanceApiForm.status.trim() || 'OUVERT',
        responsibility: maintenanceApiForm.responsibility.trim() || 'gestionnaire',
        estimatedCost: Number(maintenanceApiForm.estimatedCost) || 0,
        penaltyAmount: Number(maintenanceApiForm.penaltyAmount) || 0,
        notes: maintenanceApiForm.notes.trim() || null,
        externalId: maintenanceApiForm.externalId ?? null,
      });
      const next = [updated, ...maintenanceApiTickets.filter((entry) => entry.id !== updated.id)];
      setMaintenanceApiTickets(next);
      setSelectedMaintenanceApiId(updated.id);
      setMaintenanceApiNotice({ type: 'success', message: t('maintenanceSaved') });
    } catch (error) {
      setMaintenanceApiNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [maintenanceApiForm, maintenanceApiTickets, t]);

  const handleApplyPenalty = React.useCallback(async () => {
    if (!selectedMaintenanceApiId) return;
    try {
      const updated = await applyMaintenancePenalty(selectedMaintenanceApiId);
      const next = [updated, ...maintenanceApiTickets.filter((entry) => entry.id !== updated.id)];
      setMaintenanceApiTickets(next);
      setMaintenanceApiNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setMaintenanceApiNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [maintenanceApiTickets, selectedMaintenanceApiId, t]);

  const handleRecordPayment = React.useCallback(async () => {
    if (!paymentForm.invoiceId || !paymentForm.amount.trim()) {
      setPaymentNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentNotice({ type: 'error', message: t('invalidAmount') });
      return;
    }
    try {
      await createPayment({
        invoiceId: paymentForm.invoiceId,
        amount,
        method: paymentForm.method || 'MANUAL',
        observation: paymentForm.note.trim() || null,
      });
      setPaymentNotice({ type: 'success', message: t('paymentRecorded') });
      setPaymentForm((current) => ({ ...current, amount: '', note: '' }));
      await pushBusinessNotification(
        'PUSH',
        String(paymentForm.invoiceId),
        'Paiement enregistre',
        `Un paiement de ${formatMoney(amount)} a ete enregistre pour la facture ${paymentForm.invoiceId}.`,
      );
    } catch (error) {
      try {
        await recordPayment(paymentForm.invoiceId, amount, paymentForm.note);
        setPaymentNotice({ type: 'success', message: t('paymentRecorded') });
        setPaymentForm((current) => ({ ...current, amount: '', note: '' }));
        await pushBusinessNotification(
          'PUSH',
          String(paymentForm.invoiceId),
          'Paiement enregistre',
          `Un paiement de ${formatMoney(amount)} a ete enregistre pour la facture ${paymentForm.invoiceId}.`,
        );
      } catch {
        setPaymentNotice({ type: 'error', message: t('cannotSaveData') });
      }
    }
  }, [paymentForm, pushBusinessNotification, t]);

  React.useEffect(() => {
    let alive = true;
    if (!paymentForm.invoiceId) {
      setInvoicePayments([]);
      return undefined;
    }
    void (async () => {
      try {
        const rows = await listPaymentsByInvoice(paymentForm.invoiceId!);
        if (alive) {
          setInvoicePayments(rows);
        }
      } catch {
        if (alive) {
          setInvoicePayments([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [paymentForm.invoiceId]);

  const handleSendNotification = React.useCallback(async () => {
    if (!notificationForm.channel.trim() || !notificationForm.recipient.trim() || !notificationForm.message.trim()) {
      setNotificationNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const response = await sendNotification({
        channel: notificationForm.channel.trim(),
        recipient: notificationForm.recipient.trim(),
        subject: notificationForm.subject.trim() || null,
        message: notificationForm.message.trim(),
      });
      setNotificationLog((current) => [response, ...current].slice(0, 20));
      setNotificationNotice({ type: 'success', message: t('success') });
      setNotificationForm(emptyNotificationForm());
    } catch (error) {
      setNotificationNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [notificationForm, t]);

  const handleApprovePending = React.useCallback(async (userId: number) => {
    try {
      const localHandled = await approveRoleAccount(db, userId, currentUsername || 'manager');
      if (!localHandled) {
        await approveUserAccount(userId);
      }
      setPendingNotice({ type: 'success', message: t('accountApproved') });
      const accounts = await listRoleAccounts(db);
      setRoleAccounts(accounts.filter((account) => account.role === 'concierge' || account.role === 'tenant'));
      await loadPendingAccounts();
    } catch {
      setPendingNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [approveRoleAccount, currentUsername, db, listRoleAccounts, loadPendingAccounts, t]);

  const handleRejectPending = React.useCallback(async (userId: number) => {
    try {
      const localHandled = await rejectRoleAccount(db, userId, currentUsername || 'manager');
      if (!localHandled) {
        await rejectUserAccount(userId);
      }
      setPendingNotice({ type: 'success', message: t('accountRejected') });
      const accounts = await listRoleAccounts(db);
      setRoleAccounts(accounts.filter((account) => account.role === 'concierge' || account.role === 'tenant'));
      await loadPendingAccounts();
    } catch {
      setPendingNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [currentUsername, db, listRoleAccounts, loadPendingAccounts, rejectRoleAccount, t]);

  const handleDownloadBlob = React.useCallback((blob: Blob, filename: string) => {
    if (typeof window === 'undefined') return;
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleExportMeterTrack = React.useCallback(async () => {
    if (!metrics.monthConfig?.exportsValidatedByConcierge) {
      setExportNotice({ type: 'error', message: 'Export bloque: validation Concierge obligatoire avant diffusion.' });
      return;
    }
    try {
      const blob = await exportMeterTrackExcel(exportMonth || metrics.month);
      handleDownloadBlob(blob, `metertrack-${exportMonth || metrics.month}.xlsx`);
      setExportNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setExportNotice({ type: 'error', message: t('exportError') });
    }
  }, [exportMonth, handleDownloadBlob, metrics.month, metrics.monthConfig?.exportsValidatedByConcierge, t]);

  const handleExportFinanceSummary = React.useCallback(async () => {
    if (!metrics.monthConfig?.exportsValidatedByConcierge) {
      setExportNotice({ type: 'error', message: 'Export bloque: validation Concierge obligatoire avant diffusion.' });
      return;
    }
    try {
      const blob = await exportFinanceSummaryExcel(exportMonth || metrics.month);
      handleDownloadBlob(blob, `finance-summary-${exportMonth || metrics.month}.xlsx`);
      setExportNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setExportNotice({ type: 'error', message: t('exportError') });
    }
  }, [exportMonth, handleDownloadBlob, metrics.month, metrics.monthConfig?.exportsValidatedByConcierge, t]);

  const handleSaveMarketplace = React.useCallback(async () => {
    if (!marketplaceForm.title.trim() || !marketplaceForm.listingType.trim()) {
      setMarketplaceNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const created = await upsertMarketplaceListing({
        title: marketplaceForm.title.trim(),
        description: marketplaceForm.description.trim() || null,
        price: marketplaceForm.price.trim() ? Number(marketplaceForm.price) : null,
        currency: marketplaceForm.currency.trim() || 'FCFA',
        listingType: marketplaceForm.listingType.trim(),
        status: marketplaceForm.status.trim() || 'DRAFT',
        address: marketplaceForm.address.trim() || null,
        latitude: marketplaceForm.latitude.trim() ? Number(marketplaceForm.latitude) : null,
        longitude: marketplaceForm.longitude.trim() ? Number(marketplaceForm.longitude) : null,
      });
      setMarketplaceListings((current) => [created, ...current]);
      setMarketplaceForm(emptyMarketplaceForm());
      setMarketplaceNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setMarketplaceNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [marketplaceForm, t]);

  const handleSaveCommonCharge = React.useCallback(async () => {
    if (!commonChargeForm.code.trim() || !commonChargeForm.label.trim()) {
      setCommonChargeNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const created = await upsertCommonCharge({
        code: commonChargeForm.code.trim(),
        label: commonChargeForm.label.trim(),
        amount: Number(commonChargeForm.amount) || 0,
        required: commonChargeForm.required,
        active: commonChargeForm.active,
      });
      setCommonCharges((current) => [created, ...current]);
      setCommonChargeForm(emptyCommonChargeForm());
      setCommonChargeNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setCommonChargeNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [commonChargeForm, t]);

  const handleAssignCommonCharge = React.useCallback(async () => {
    const chargeId = Number(commonChargeAssignForm.chargeId);
    if (!Number.isFinite(chargeId) || chargeId <= 0 || !commonChargeAssignForm.scopeValue.trim()) {
      setCommonChargeNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      await assignCommonCharge({
        chargeId,
        scopeType: commonChargeAssignForm.scopeType.trim() || 'BLOC',
        scopeValue: commonChargeAssignForm.scopeValue.trim(),
        required: commonChargeAssignForm.required,
      });
      setCommonChargeAssignForm(emptyCommonChargeAssignForm());
      setCommonChargeNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setCommonChargeNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [commonChargeAssignForm, t]);

  const handleExportResidentHistory = React.useCallback(async () => {
    const residentId = Number(exportResidentId);
    if (!Number.isFinite(residentId) || residentId <= 0) {
      setExportNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const blob = await exportResidentHistoryPdf(residentId);
      handleDownloadBlob(blob, `resident-${residentId}-history.pdf`);
      setExportNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setExportNotice({ type: 'error', message: t('exportError') });
    }
  }, [exportResidentId, handleDownloadBlob, t]);

  const handleExportPaymentReceipt = React.useCallback(async () => {
    const paymentId = Number(exportPaymentId);
    if (!Number.isFinite(paymentId) || paymentId <= 0) {
      setExportNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const blob = await exportPaymentReceiptPdf(paymentId);
      handleDownloadBlob(blob, `payment-${paymentId}-receipt.pdf`);
      setExportNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setExportNotice({ type: 'error', message: t('exportError') });
    }
  }, [exportPaymentId, handleDownloadBlob, t]);

  const handleExportExitReport = React.useCallback(async () => {
    const reportId = Number(exportExitReportId);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      setExportNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    try {
      const blob = await exportExitReportPdf(reportId);
      handleDownloadBlob(blob, `exit-report-${reportId}.pdf`);
      setExportNotice({ type: 'success', message: t('success') });
    } catch (error) {
      setExportNotice({ type: 'error', message: t('exportError') });
    }
  }, [exportExitReportId, handleDownloadBlob, t]);

  const openDocumentEditor = React.useCallback((key?: string) => {
    const selected = key ? documentRegistry.find((row) => row.key === key) ?? null : null;
    const residentName = selectedPortfolioSnapshot?.resident ? `${selectedPortfolioSnapshot.resident.nom} ${selectedPortfolioSnapshot.resident.prenom}`.trim() : '';
    setSelectedDocumentKey(selected?.key ?? null);
    setDocumentForm({
      room: selected?.room ?? selectedPortfolioRoom ?? selectedContractRoom ?? '',
      resident: selected?.resident ?? residentName,
      type: selected?.type ?? 'CONTRAT',
      title: selected?.title ?? '',
      status: selected?.status ?? 'BROUILLON',
      issuedOn: selected?.issuedOn ?? '',
      expiresOn: selected?.expiresOn ?? '',
      notes: selected?.notes ?? '',
    });
    setDocumentNotice(null);
  }, [documentRegistry, selectedContractRoom, selectedPortfolioRoom, selectedPortfolioSnapshot]);

  const handleSaveDocument = React.useCallback(async () => {
    const room = documentForm.room.trim();
    const title = documentForm.title.trim();
    if (!room || !title) {
      setDocumentNotice({ type: 'error', message: t('fillAllFields') });
      return;
    }
    const nextEntry: DocumentEntry = {
      key: selectedDocument?.key ?? `doc-${Date.now()}`,
      room,
      resident: documentForm.resident.trim(),
      type: documentForm.type,
      title,
      status: documentForm.status,
      issuedOn: documentForm.issuedOn.trim(),
      expiresOn: documentForm.expiresOn.trim(),
      notes: documentForm.notes.trim(),
    };
    const nextEntries = [nextEntry, ...documentRegistry.filter((entry) => entry.key !== nextEntry.key)];
    await saveDocumentsRegistry(db, nextEntries);
    setDocumentRegistry(nextEntries);
    setSelectedDocumentKey(nextEntry.key);
    setDocumentNotice({ type: 'success', message: t('documentSaved') });
  }, [db, documentForm, documentRegistry, selectedDocument, t]);

  async function pushBusinessNotification(
    channel: string,
    recipient: string,
    subject: string,
    message: string,
  ) {
    if (!recipient.trim() || !message.trim()) {
      return;
    }
    try {
      const response = await sendNotification({
        channel,
        recipient,
        subject,
        message,
      });
      setNotificationLog((current) => [response, ...current].slice(0, 30));
    } catch {
      // Keep business flows resilient when notification delivery is unavailable.
    }
  }

  const openExitReportEditor = React.useCallback((report?: ApiExitReport | null) => {
    if (!report) {
      const fallbackRoom = metrics.rooms.find((room) => room.numeroChambre === selectedContractApi?.roomNumero)
        ?? metrics.rooms.find((room) => room.numeroChambre === selectedPortfolioRoom)
        ?? null;
      setSelectedExitReportId(null);
      setExitReportForm({
        roomId: fallbackRoom ? String(fallbackRoom.id) : '',
        residentId: selectedContractApi?.residentId != null ? String(selectedContractApi.residentId) : '',
        contractId: selectedContractApi?.id != null ? String(selectedContractApi.id) : '',
        depositAmount: selectedContractApi ? String(selectedContractApi.deposit ?? 0) : '',
        repairCost: '',
        notes: '',
      });
      setExitReportNotice(null);
      return;
    }
    setSelectedExitReportId(report.id);
    setExitReportForm({
      roomId: report.roomId != null ? String(report.roomId) : '',
      residentId: report.residentId != null ? String(report.residentId) : '',
      contractId: report.contractId != null ? String(report.contractId) : '',
      depositAmount: String(report.depositAmount ?? 0),
      repairCost: String(report.repairCost ?? 0),
      notes: report.notes ?? '',
    });
    setExitReportNotice(null);
  }, [metrics.rooms, selectedContractApi, selectedPortfolioRoom]);

  const handleSaveExitReport = React.useCallback(async () => {
    const roomId = Number(exitReportForm.roomId);
    if (!Number.isFinite(roomId) || roomId <= 0) {
      setExitReportNotice({ type: 'error', message: 'La chambre est obligatoire pour generer un PV de sortie.' });
      return;
    }
    try {
      const saved = await upsertExitReport({
        roomId,
        residentId: Number.isFinite(Number(exitReportForm.residentId)) && Number(exitReportForm.residentId) > 0 ? Number(exitReportForm.residentId) : null,
        contractId: Number.isFinite(Number(exitReportForm.contractId)) && Number(exitReportForm.contractId) > 0 ? Number(exitReportForm.contractId) : null,
        depositAmount: Number(exitReportForm.depositAmount) || 0,
        repairCost: Number(exitReportForm.repairCost) || 0,
        notes: exitReportForm.notes.trim() || null,
      });
      const next = [saved, ...exitReports.filter((entry) => entry.id !== saved.id)];
      setExitReports(next);
      setSelectedExitReportId(saved.id);
      setExportExitReportId(String(saved.id));
      setExitReportNotice({ type: 'success', message: 'PV de sortie calcule et enregistre.' });
      await pushBusinessNotification(
        'EMAIL',
        saved.residentName || saved.roomNumero,
        'PV de sortie prepare',
        `Un PV de sortie a ete prepare pour la chambre ${saved.roomNumero}. Remboursement estime: ${formatMoney(saved.refundAmount)}.`,
      );
    } catch {
      setExitReportNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [exitReportForm, exitReports, pushBusinessNotification, t]);

  const handleSignExitReport = React.useCallback(async (signatureRole: 'MANAGER' | 'RESIDENT') => {
    if (!selectedExitReportId) {
      setExitReportNotice({ type: 'error', message: 'Selectionnez un PV de sortie.' });
      return;
    }
    try {
      const signed = await signExitReport(selectedExitReportId, currentUsername || 'manager', signatureRole);
      const next = [signed, ...exitReports.filter((entry) => entry.id !== signed.id)];
      setExitReports(next);
      setSelectedExitReportId(signed.id);
      setExportExitReportId(String(signed.id));
      setExitReportNotice({ type: 'success', message: signatureRole === 'MANAGER' ? 'Signature gestionnaire enregistree.' : 'Signature resident enregistree.' });
      await pushBusinessNotification(
        'PUSH',
        signed.residentName || signed.roomNumero,
        signatureRole === 'MANAGER' ? 'PV signe par le gestionnaire' : 'PV signe par le resident',
        `Le PV de sortie de la chambre ${signed.roomNumero} est maintenant au statut ${signed.status}.`,
      );
    } catch {
      setExitReportNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [currentUsername, exitReports, pushBusinessNotification, selectedExitReportId, t]);

  const handleFinalizeExitReport = React.useCallback(async () => {
    if (!selectedExitReport) {
      setExitReportNotice({ type: 'error', message: 'Selectionnez un PV de sortie.' });
      return;
    }
    if (!selectedExitReport.managerSignedAt || !selectedExitReport.residentSignedAt) {
      setExitReportNotice({ type: 'error', message: 'Le PV doit etre signe par le gestionnaire et le resident.' });
      return;
    }
    try {
      const exitDate = new Date().toISOString().slice(0, 10);
      if (selectedExitReport.residentId != null) {
        await patchResident(selectedExitReport.residentId, {
          statut: 'INACTIF',
          dateSortie: exitDate,
          currentRoomId: null,
        });
      }
      const linkedContract = selectedExitReport.contractId != null
        ? contractsApi.find((entry) => entry.id === selectedExitReport.contractId) ?? null
        : contractsApi.find((entry) => entry.roomNumero === selectedExitReport.roomNumero && entry.residentId === selectedExitReport.residentId) ?? null;
      if (linkedContract) {
        const updatedContract = await upsertContract({
          roomNumero: linkedContract.roomNumero,
          residentExternalId: null,
          status: 'EXPIRE',
          signingMode: linkedContract.signingMode,
          startDate: linkedContract.startDate,
          endDate: exitDate,
          monthlyRent: linkedContract.monthlyRent,
          deposit: linkedContract.deposit,
          autoRenewal: false,
          notes: [linkedContract.notes ?? '', `Sortie finalisee via PV ${selectedExitReport.id} le ${exitDate}.`].filter(Boolean).join(' | '),
          externalId: linkedContract.externalId ?? null,
        });
        setContractsApi((current) => [updatedContract, ...current.filter((entry) => entry.id !== updatedContract.id)]);
      }
      const archivedDocument: DocumentEntry = {
        key: `exit-report-${selectedExitReport.id}`,
        room: selectedExitReport.roomNumero,
        resident: selectedExitReport.residentName,
        type: 'PV',
        title: `PV de sortie ${selectedExitReport.roomNumero}`,
        status: 'ARCHIVE',
        issuedOn: new Date().toISOString().slice(0, 10),
        expiresOn: '',
        notes: `Remboursement caution: ${formatMoney(selectedExitReport.refundAmount)} | Dettes: ${formatMoney(selectedExitReport.debtTotal)} | Reparations: ${formatMoney(selectedExitReport.repairCost)}`,
      };
      const nextDocuments = [archivedDocument, ...documentRegistry.filter((entry) => entry.key !== archivedDocument.key)];
      await saveDocumentsRegistry(db, nextDocuments);
      setDocumentRegistry(nextDocuments);
      setDocumentNotice({ type: 'success', message: 'PV de sortie archive dans le registre documentaire.' });
      setExitReportNotice({ type: 'success', message: 'Sortie finalisee: resident desactive, contrat cloture et PV archive.' });
      await pushBusinessNotification(
        'EMAIL',
        selectedExitReport.residentName || selectedExitReport.roomNumero,
        'Sortie finalisee',
        `La sortie de la chambre ${selectedExitReport.roomNumero} est finalisee et le dossier a ete archive dans MyHouse.`,
      );
    } catch {
      setExitReportNotice({ type: 'error', message: t('cannotSaveData') });
    }
  }, [contractsApi, db, documentRegistry, pushBusinessNotification, selectedExitReport, t]);

  const handleParseIdentityOcr = React.useCallback(async () => {
    if (!ocrOnboardingForm.frontImageBase64.trim()) {
      setOcrOnboardingNotice({ type: 'error', message: 'Le scan recto ou contenu OCR est obligatoire.' });
      return;
    }
    try {
      const response = await ocrParseIdentity({
        documentType: ocrOnboardingForm.documentType,
        frontImageBase64: ocrOnboardingForm.frontImageBase64.trim(),
        backImageBase64: ocrOnboardingForm.backImageBase64.trim() || null,
        languageHint: language,
      });
      setOcrExtractedFields(response.fields ?? {});
      setOcrOnboardingNotice({ type: 'success', message: response.requiresReview ? 'OCR termine avec verification requise.' : 'OCR termine. Identite pre-remplie.' });
    } catch {
      setOcrOnboardingNotice({ type: 'error', message: 'Analyse OCR indisponible pour le moment.' });
    }
  }, [language, ocrOnboardingForm]);

  const handleCreateResidentFromOcr = React.useCallback(async () => {
    const nom = (ocrExtractedFields.nom || ocrExtractedFields.lastName || '').trim();
    const prenom = (ocrExtractedFields.prenom || ocrExtractedFields.firstName || '').trim();
    const roomId = Number(ocrOnboardingForm.roomId);
    if (!nom || !prenom || !ocrOnboardingForm.username.trim() || !ocrOnboardingForm.password.trim()) {
      setOcrOnboardingNotice({ type: 'error', message: 'OCR incomplet: nom, prenom, identifiant et mot de passe sont requis.' });
      return;
    }
    if (!Number.isFinite(roomId) || roomId <= 0) {
      setOcrOnboardingNotice({ type: 'error', message: 'Choisissez une chambre valide pour finaliser l onboarding.' });
      return;
    }
    try {
      const resident = await createResident({
        cni: (ocrExtractedFields.cni || ocrExtractedFields.documentNumber || '').trim() || null,
        nom,
        prenom,
        dateNaissance: (ocrExtractedFields.dateNaissance || ocrExtractedFields.birthDate || '').trim() || null,
        telephone: (ocrExtractedFields.telephone || ocrExtractedFields.phone || '').trim() || null,
        whatsapp: (ocrExtractedFields.whatsapp || ocrExtractedFields.phone || '').trim() || null,
        email: (ocrExtractedFields.email || '').trim() || null,
      });
      await assignResidentRoom(resident.id, roomId, new Date().toISOString().slice(0, 10), 'OCR_ONBOARDING');
      const accountResult = await createRoleAccount(
        db,
        ocrOnboardingForm.username.trim(),
        ocrOnboardingForm.password.trim(),
        'tenant',
        currentUsername || 'manager',
      );
      if (!accountResult.ok && accountResult.reason !== 'duplicate') {
        throw new Error('ACCOUNT_CREATION_FAILED');
      }
      const room = metrics.rooms.find((entry) => entry.id === roomId) ?? null;
      if (room) {
        try {
          const contract = await upsertContract({
            roomNumero: room.numeroChambre,
            residentExternalId: resident.externalId ?? null,
            status: 'A_SIGNER',
            signingMode: 'NUMERIQUE',
            startDate: new Date().toISOString().slice(0, 10),
            endDate: null,
            monthlyRent: Number(ocrOnboardingForm.monthlyRent) || 0,
            deposit: Number(ocrOnboardingForm.deposit) || 0,
            autoRenewal: true,
            notes: `Contrat initialise depuis OCR ${ocrOnboardingForm.documentType}.`,
            externalId: null,
          });
          const signedContract = await signContract(contract.id, currentUsername || 'manager', 'GESTIONNAIRE');
          setContractsApi((current) => [signedContract, ...current.filter((entry) => entry.id !== signedContract.id)]);
        } catch {
          // Keep resident onboarding usable offline even if contract API is unavailable.
        }
      }
      setOcrOnboardingNotice({
        type: 'success',
        message: accountResult.reason === 'duplicate'
          ? 'Resident cree et affecte. Le compte locataire existait deja; le contrat initial a ete tente.'
          : 'Resident, compte locataire et contrat initial ont ete crees depuis l OCR.',
      });
      await pushBusinessNotification(
        'WHATSAPP',
        resident.whatsapp ?? resident.telephone ?? ocrOnboardingForm.username.trim(),
        'Bienvenue MyHouse',
        `Bienvenue ${resident.nom} ${resident.prenom}. Votre compte resident et votre contrat initial sont prets dans MyHouse.`,
      );
      setOcrOnboardingForm(emptyOcrOnboardingForm());
      setOcrExtractedFields({});
    } catch (error) {
      setOcrOnboardingNotice({
        type: 'error',
        message: error instanceof Error && error.message === 'ACCOUNT_CREATION_FAILED'
          ? 'Resident cree mais le compte locataire n a pas pu etre prepare. Verifiez l identifiant et le mot de passe.'
          : t('cannotSaveData'),
      });
    }
  }, [createRoleAccount, currentUsername, db, metrics.rooms, ocrExtractedFields, ocrOnboardingForm, pushBusinessNotification, t]);

  return (
    <View style={styles.screen}>
      <View style={styles.sidebar}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandEyebrow}>MyHouse</Text>
          <Text style={styles.brandTitle}>{t('managerRole')}</Text>
          <Text style={styles.brandDescription}>{t('managerPanelDescription')}</Text>
        </View>

        <View style={styles.menu}>
          {FEATURE_SECTIONS.map((section) => {
            const items = section.features
              .filter((feature) => roleHasFeature(activeRole, feature))
              .map((feature) => MANAGER_FEATURE_MAP[feature])
              .filter(Boolean);
            if (!items.length) return null;
            return (
              <View key={section.titleKey} style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t(section.titleKey)}</Text>
                {items.map((item) => {
                  const active = page === item.page;
                  return (
                    <TouchableOpacity
                      key={item.page}
                      style={[styles.menuItem, active && styles.menuItemActive]}
                      onPress={() => setPage(item.page)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={active ? colors.white : colors.primary}
                      />
                      <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{t(item.labelKey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SectionHeader
          eyebrow={t('managerRole')}
          title={t('managerPanelTitle')}
          description={t('managerPanelDescription')}
        />

        {loading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : null}

        {!loading && page === 'dashboard' ? (
          <>
            <View style={styles.kpiGrid}>
              <KpiTile value={`${metrics.occupancyRate}%`} label={t('occupancy')} hint={t('managerKpiOccupancyHint')} />
              <KpiTile value={formatMoney(metrics.totalDue - metrics.totalPaid)} label={t('netToRecover')} hint={t('managerKpiRecoveryHint')} />
              <KpiTile value={`${metrics.contractRows.filter((row) => row.status === 'A completer' || row.renewal === 'Renouvellement urgent').length}`} label={t('urgentContracts')} hint={t('managerKpiContractsHint')} />
              <KpiTile value={`${metrics.maintenanceRows.filter((row) => row.priority === 'Haute').length}`} label={t('criticalIncidents')} hint={t('managerKpiIncidentsHint')} />
            </View>

            <View style={styles.panelRow}>
              <ActionPanel
                title={t('managerQuickActions')}
                description={t('managerModuleDescription')}
                bullets={[
                  `${t('activeResidentsLabel')}: ${metrics.residents.filter((resident) => resident.statut !== 'INACTIF').length}`,
                  `${t('configuredMonthLabel')}: ${metrics.month} - ${metrics.monthConfigured ? t('readyLabel') : t('missingLabel')}`,
                  `${t('paymentsReceivedLabel')}: ${metrics.paymentCount}`,
                ]}
                actions={[
                  { label: t('portfolioLabel'), onPress: () => setPage('portfolio'), variant: 'secondary' },
                  { label: t('conciergeAccounts'), onPress: () => setPage('concierges'), variant: 'secondary' },
                  { label: t('contracts'), onPress: () => setPage('contracts'), variant: 'secondary' },
                  { label: t('maintenance'), onPress: () => setPage('maintenance'), variant: 'secondary' },
                  { label: t('documents'), onPress: () => setPage('documents'), variant: 'secondary' },
                  { label: t('managerMeterTrackReadOnly'), onPress: () => setPage('metertrackReadOnly') },
                ]}
              />
              <ActionPanel
                title={t('reports')}
                description={t('reportsDesc')}
                bullets={metrics.reportRows.slice(0, 4).map((row) => `${row.label}: ${row.value}`)}
                actions={[
                  { label: t('reports'), onPress: () => setPage('reports') },
                  { label: t('residentsLabel'), onPress: () => setPage('residents'), variant: 'secondary' },
                ]}
              />
            </View>

            <View style={styles.tableStack}>
              <DataTableCard
                title={t('portfolioLabel')}
                description={t('portfolioDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'createdAt', label: 'Date' },
                ]}
                rows={metrics.portfolioRows.slice(0, 8)}
                searchable
                searchPlaceholder={`${t('portfolioLabel')}...`}
                emptyText={t('noRoomFound')}
              />
              <DataTableCard
                title={t('residentDirectory')}
                description={t('residentDirectoryDesc')}
                columns={[
                  { key: 'resident', label: t('residentsLabel') },
                  { key: 'room', label: t('rooms') },
                  { key: 'phone', label: t('contact') },
                  { key: 'status', label: t('stateLabel') },
                ]}
                rows={residentDirectoryRows.slice(0, 8)}
                searchable
                searchPlaceholder={`${t('residentsLabel')}...`}
                emptyText={t('noActiveResident')}
              />
            </View>
          </>
        ) : null}

        {!loading && page === 'portfolio' ? (
          <View style={styles.panelRow}>
            <DataTableCard
              title={t('portfolioLabel')}
              description={t('portfolioDesc')}
              columns={[
                { key: 'room', label: t('rooms') },
                { key: 'status', label: t('stateLabel') },
                { key: 'createdAt', label: 'Date' },
              ]}
              rows={metrics.portfolioRows}
              searchable
              searchPlaceholder={`${t('portfolioLabel')}...`}
              emptyText={t('noRoomFound')}
              getRowKey={(row) => row.room}
              selectedRowKey={selectedPortfolioRoom}
              onRowPress={(row) => setSelectedPortfolioRoom(row.room)}
            />
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('portfolioRoomSheet')}</Text>
              <Text style={styles.formDescription}>
                {selectedPortfolioRoom
                  ? `${selectedPortfolioRoom} - ${selectedPortfolioSnapshot?.resident ? `${selectedPortfolioSnapshot.resident.nom} ${selectedPortfolioSnapshot.resident.prenom}`.trim() : t('noResidentLinked')}`
                  : t('portfolioRoomSheetDesc')}
              </Text>
              <View style={styles.snapshotGrid}>
                <SnapshotRow label={t('roomNumberLabel')} value={selectedPortfolioRoom ?? '-'} styles={styles} />
                <SnapshotRow
                  label={t('activeResidentLabel')}
                  value={selectedPortfolioSnapshot?.resident ? `${selectedPortfolioSnapshot.resident.nom} ${selectedPortfolioSnapshot.resident.prenom}`.trim() : t('noResidentLinked')}
                  styles={styles}
                />
                <SnapshotRow
                  label={t('whatsappNumberLabel')}
                  value={selectedPortfolioSnapshot?.resident?.whatsapp ?? selectedPortfolioSnapshot?.resident?.telephone ?? '-'}
                  styles={styles}
                />
                <SnapshotRow
                  label={t('roomCreatedLabel')}
                  value={selectedPortfolioSnapshot?.room ? String(selectedPortfolioSnapshot.room.createdAt).slice(0, 10) : '-'}
                  styles={styles}
                />
                <SnapshotRow
                  label={t('readingStatusLabel')}
                  value={selectedPortfolioSnapshot?.reading ? t('entered') : metrics.portfolioRows.find((row) => row.room === selectedPortfolioRoom)?.status ?? '-'}
                  styles={styles}
                />
                <SnapshotRow
                  label={t('billingStatusLabel')}
                  value={selectedPortfolioSnapshot?.invoice ? t('invoicesCalculatedLabel') : t('noInvoicesCalculated')}
                  styles={styles}
                />
                <SnapshotRow
                  label={t('paymentStatusLabel')}
                  value={selectedPortfolioSnapshot?.invoice ? `${formatMoney(selectedPortfolioSnapshot.paidAmount)} / ${formatMoney(selectedPortfolioSnapshot.invoice.netAPayer)}` : '-'}
                  styles={styles}
                />
                <SnapshotRow
                  label={t('contracts')}
                  value={selectedPortfolioSnapshot?.contract?.status ?? t('contractStatusDraft')}
                  styles={styles}
                />
              </View>
              <ActionPanel
                title={t('managerQuickActions')}
                description={t('portfolioRoomSheetDesc')}
                bullets={[
                  `${t('contracts')}: ${selectedPortfolioSnapshot?.contract?.signingMode ?? '-'}`,
                  `${t('maintenance')}: ${selectedPortfolioSnapshot ? selectedPortfolioSnapshot.roomMaintenance.length : 0}`,
                  `${t('netToRecover')}: ${selectedPortfolioSnapshot?.invoice ? formatMoney(Math.max(0, selectedPortfolioSnapshot.invoice.netAPayer - selectedPortfolioSnapshot.paidAmount)) : formatMoney(0)}`,
                ]}
                actions={[
                  { label: t('contracts'), onPress: () => { if (selectedPortfolioRoom) { openContractEditor(selectedPortfolioRoom); setPage('contracts'); } }, variant: 'secondary' },
                  { label: t('maintenance'), onPress: () => setPage('maintenance'), variant: 'secondary' },
                  { label: t('managerMeterTrackReadOnly'), onPress: () => setPage('metertrackReadOnly') },
                ]}
              />
            </View>
          </View>
        ) : null}

        {!loading && page === 'residents' ? (
          <View style={styles.panelRow}>
            <DataTableCard
              title={t('residentDirectory')}
              description={t('residentDirectoryDesc')}
              columns={[
                { key: 'resident', label: t('residentsLabel') },
                { key: 'room', label: t('rooms') },
                { key: 'phone', label: t('contact') },
                { key: 'status', label: t('stateLabel') },
              ]}
              rows={residentDirectoryRows}
              searchable
              searchPlaceholder={`${t('residentsLabel')}...`}
              emptyText={t('noActiveResident')}
            />
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Onboarding OCR identite</Text>
              <Text style={styles.formDescription}>Scan identite, creation du resident, compte locataire, affectation chambre et contrat a signer.</Text>
              {ocrOnboardingNotice ? (
                <View style={[styles.noticeBanner, ocrOnboardingNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{ocrOnboardingNotice.message}</Text>
                </View>
              ) : null}
              <View style={styles.inlineOptions}>
                <TouchableOpacity
                  style={[styles.filterChip, ocrOnboardingForm.documentType === 'CNI' && styles.filterChipActive]}
                  onPress={() => setOcrOnboardingForm((current) => ({ ...current, documentType: 'CNI' }))}
                >
                  <Text style={[styles.filterChipText, ocrOnboardingForm.documentType === 'CNI' && styles.filterChipTextActive]}>CNI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, ocrOnboardingForm.documentType === 'PASSPORT' && styles.filterChipActive]}
                  onPress={() => setOcrOnboardingForm((current) => ({ ...current, documentType: 'PASSPORT' }))}
                >
                  <Text style={[styles.filterChipText, ocrOnboardingForm.documentType === 'PASSPORT' && styles.filterChipTextActive]}>Passeport</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>Scan recto / base64</Text>
              <TextInput
                value={ocrOnboardingForm.frontImageBase64}
                onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, frontImageBase64: value }))}
                style={[styles.fieldInput, styles.textareaInput]}
                multiline
                placeholder="Collez ici la base64 ou le contenu OCR du recto."
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>Scan verso / base64</Text>
              <TextInput
                value={ocrOnboardingForm.backImageBase64}
                onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, backImageBase64: value }))}
                style={[styles.fieldInput, styles.textareaInput]}
                multiline
                placeholder="Optionnel"
                placeholderTextColor={colors.textLight}
              />
              <View style={styles.formButtonRow}>
                <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={handleParseIdentityOcr}>
                  <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Analyser OCR</Text>
                </TouchableOpacity>
              </View>
              {Object.keys(ocrExtractedFields).length > 0 ? (
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>Champs extraits</Text>
                  {Object.entries(ocrExtractedFields).slice(0, 6).map(([key, value]) => (
                    <Text key={key} style={styles.detailLine}>{key}: {value}</Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.formSplit}>
                <View style={styles.formSplitCol}>
                  <Text style={styles.fieldLabel}>ID chambre</Text>
                  <TextInput
                    value={ocrOnboardingForm.roomId}
                    onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, roomId: value }))}
                    style={styles.fieldInput}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={styles.formSplitCol}>
                  <Text style={styles.fieldLabel}>{t('conciergeUsernameLabel')}</Text>
                  <TextInput
                    value={ocrOnboardingForm.username}
                    onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, username: value }))}
                    style={styles.fieldInput}
                    placeholder="resident.ocr"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
              <View style={styles.formSplit}>
                <View style={styles.formSplitCol}>
                  <Text style={styles.fieldLabel}>{t('temporaryPasswordLabel')}</Text>
                  <TextInput
                    value={ocrOnboardingForm.password}
                    onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, password: value }))}
                    style={styles.fieldInput}
                    placeholder="mot de passe provisoire"
                    secureTextEntry
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={styles.formSplitCol}>
                  <Text style={styles.fieldLabel}>{t('depositLabel')}</Text>
                  <TextInput
                    value={ocrOnboardingForm.deposit}
                    onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, deposit: value }))}
                    style={styles.fieldInput}
                    placeholder="150000"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>{t('monthlyRentLabel')}</Text>
              <TextInput
                value={ocrOnboardingForm.monthlyRent}
                onChangeText={(value) => setOcrOnboardingForm((current) => ({ ...current, monthlyRent: value }))}
                style={styles.fieldInput}
                placeholder="75000"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateResidentFromOcr}>
                <Text style={styles.primaryButtonText}>Creer resident + compte + contrat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loading && page === 'concierges' ? (
          <>
            <View style={styles.panelRow}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('createConciergeAccount')}</Text>
                <Text style={styles.formDescription}>{t('conciergeAccountsDesc')}</Text>
                {accountNotice ? (
                  <View style={[styles.noticeBanner, accountNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{accountNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>{t('currentRole')}</Text>
                <View style={styles.inlineOptions}>
                  <TouchableOpacity
                    style={[styles.filterChip, accountRole === 'concierge' && styles.filterChipActive]}
                    onPress={() => setAccountRole('concierge')}
                  >
                    <Text style={[styles.filterChipText, accountRole === 'concierge' && styles.filterChipTextActive]}>
                      {t('conciergeRole')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, accountRole === 'tenant' && styles.filterChipActive]}
                    onPress={() => setAccountRole('tenant')}
                  >
                    <Text style={[styles.filterChipText, accountRole === 'tenant' && styles.filterChipTextActive]}>
                      {t('tenantRole')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>{t('conciergeUsernameLabel')}</Text>
                <TextInput
                  value={accountUsername}
                  onChangeText={setAccountUsername}
                  style={styles.fieldInput}
                  placeholder={accountRole === 'tenant' ? 'resident.test' : 'concierge.terrain'}
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                />
                <Text style={styles.fieldLabel}>{t('temporaryPasswordLabel')}</Text>
                <TextInput
                  value={accountPassword}
                  onChangeText={setAccountPassword}
                  style={styles.fieldInput}
                  placeholder="minimum 6 caracteres"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleCreateConcierge}>
                  <Text style={styles.primaryButtonText}>
                    {accountRole === 'tenant' ? t('tenantRole') : t('createConciergeAccount')}
                  </Text>
                </TouchableOpacity>
              </View>

              <DataTableCard
                title={`${t('conciergeAccounts')} & ${t('tenantRole')}`}
                description={t('pendingApprovalsDesc')}
                columns={[
                  { key: 'username', label: t('username') },
                  { key: 'displayName', label: t('residentNameLabel') },
                  { key: 'role', label: t('currentRole') },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'createdBy', label: t('createdByLabel') },
                  { key: 'createdAt', label: 'Date' },
                ]}
                rows={roleAccounts.map((account) => ({
                  username: account.username,
                  displayName: account.displayName,
                  role: account.role === 'tenant' ? t('tenantRole') : t('conciergeRole'),
                  status: account.status,
                  createdBy: account.createdBy,
                  createdAt: String(account.createdAt).slice(0, 10),
                }))}
                searchable
                searchPlaceholder={`${t('conciergeAccounts')}...`}
                emptyText={t('pendingApprovalsEmpty')}
              />
            </View>

            <View style={styles.panelRow}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('pendingApprovalsTitle')}</Text>
                <Text style={styles.formDescription}>{t('pendingApprovalsDesc')}</Text>
                {pendingNotice ? (
                  <View style={[styles.noticeBanner, pendingNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{pendingNotice.message}</Text>
                  </View>
                ) : null}
                {pendingAccounts.length === 0 ? (
                  <Text style={styles.formDescription}>{t('pendingApprovalsEmpty')}</Text>
                ) : (
                  pendingAccounts.map((account) => (
                    <View key={account.id} style={styles.pendingRow}>
                      <View style={styles.pendingMeta}>
                        <Text style={styles.fieldLabel}>{account.username}</Text>
                        <Text style={styles.formDescription}>{account.role} · {account.createdBy ?? '-'}</Text>
                      </View>
                      <View style={styles.pendingActions}>
                        <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => handleRejectPending(account.id)}>
                          <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{t('reject')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryButton} onPress={() => handleApprovePending(account.id)}>
                          <Text style={styles.primaryButtonText}>{t('approve')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        ) : null}

        {!loading && page === 'contracts' ? (
          <>
            <View style={styles.panelRow}>
              <DataTableCard
                title={`${t('contracts')} (API)`}
                description={t('contractsDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'resident', label: t('residentsLabel') },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'signing', label: t('signingModeLabel') },
                  { key: 'updated', label: 'MAJ' },
                ]}
                rows={contractsApi.map((contract) => ({
                  room: contract.roomNumero,
                  resident: contract.residentName || '-',
                  status: contract.status,
                  signing: contract.signingMode,
                  updated: String(contract.updatedAt ?? '').slice(0, 10),
                }))}
                searchable
                searchPlaceholder={`${t('contracts')}...`}
                emptyText={t('contracts')}
                getRowKey={(row) => row.room}
                selectedRowKey={selectedContractApiId != null ? contractsApi.find((entry) => entry.id === selectedContractApiId)?.roomNumero ?? null : null}
                onRowPress={(_, index) => openContractApiEditor(contractsApi[index] ?? null)}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('contractEditorTitle')}</Text>
                <Text style={styles.formDescription}>
                  {selectedContractApiId ? `${contractApiForm.roomNumero} - ${contractsApi.find((entry) => entry.id === selectedContractApiId)?.residentName ?? ''}` : t('selectRoomContractHint')}
                </Text>
                {contractApiNotice ? (
                  <View style={[styles.noticeBanner, contractApiNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{contractApiNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>{t('roomNumberLabel')}</Text>
                <TextInput
                  value={contractApiForm.roomNumero}
                  onChangeText={(value) => setContractApiForm((current) => ({ ...current, roomNumero: value }))}
                  style={styles.fieldInput}
                  placeholder="A01"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.fieldLabel}>{t('residentNameLabel')}</Text>
                <TextInput
                  value={contractApiForm.residentExternalId}
                  onChangeText={(value) => setContractApiForm((current) => ({ ...current, residentExternalId: value }))}
                  style={styles.fieldInput}
                  placeholder="Resident externalId (optionnel)"
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('contractStartLabel')}</Text>
                    <TextInput
                      value={contractApiForm.startDate}
                      onChangeText={(value) => setContractApiForm((current) => ({ ...current, startDate: value }))}
                      style={styles.fieldInput}
                      placeholder="2026-03-01"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('contractEndLabel')}</Text>
                    <TextInput
                      value={contractApiForm.endDate}
                      onChangeText={(value) => setContractApiForm((current) => ({ ...current, endDate: value }))}
                      style={styles.fieldInput}
                      placeholder="2027-02-28"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('monthlyRentLabel')}</Text>
                    <TextInput
                      value={contractApiForm.monthlyRent}
                      onChangeText={(value) => setContractApiForm((current) => ({ ...current, monthlyRent: value }))}
                      style={styles.fieldInput}
                      placeholder="25000"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('depositLabel')}</Text>
                    <TextInput
                      value={contractApiForm.deposit}
                      onChangeText={(value) => setContractApiForm((current) => ({ ...current, deposit: value }))}
                      style={styles.fieldInput}
                      placeholder="25000"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('contractStatusLabel')}</Text>
                    <TextInput
                      value={contractApiForm.status}
                      onChangeText={(value) => setContractApiForm((current) => ({ ...current, status: value }))}
                      style={styles.fieldInput}
                      placeholder={t('contractStatusDraft')}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('signingModeLabel')}</Text>
                    <TextInput
                      value={contractApiForm.signingMode}
                      onChangeText={(value) => setContractApiForm((current) => ({ ...current, signingMode: value }))}
                      style={styles.fieldInput}
                      placeholder={t('contractSigningPhysical')}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleRow, contractApiForm.autoRenewal && styles.toggleRowActive]}
                  onPress={() => setContractApiForm((current) => ({ ...current, autoRenewal: !current.autoRenewal }))}
                >
                  <Text style={styles.toggleLabel}>{t('autoRenewalLabel')}</Text>
                  <Text style={styles.toggleValue}>{contractApiForm.autoRenewal ? t('confirm') : t('cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.fieldLabel}>{t('notesLabel')}</Text>
                <TextInput
                  value={contractApiForm.notes}
                  onChangeText={(value) => setContractApiForm((current) => ({ ...current, notes: value }))}
                  style={[styles.fieldInput, styles.textareaInput]}
                  multiline
                  placeholder={t('notesLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => openContractApiEditor(null)}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSaveContractApi}>
                    <Text style={styles.primaryButtonText}>{t('saveContract')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={handleSignContractApi} disabled={!selectedContractApiId}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Signer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={handleValidateContractApi} disabled={!selectedContractApiId}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{t('validate')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={handleRenewContractApi} disabled={!selectedContractApiId}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Renouveler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.panelRow}>
              <DataTableCard
                title={t('contracts')}
                description={t('contractsDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'resident', label: t('residentsLabel') },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'renewal', label: 'Renouvellement' },
                  { key: 'balance', label: t('balanceLabel'), align: 'right' },
                ]}
                rows={contractRows}
                searchable
                searchPlaceholder={`${t('contracts')}...`}
                emptyText={t('contracts')}
                getRowKey={(row) => row.room}
                selectedRowKey={selectedContractRoom}
                onRowPress={(row) => openContractEditor(row.room)}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('contractEditorTitle')}</Text>
                <Text style={styles.formDescription}>
                  {selectedContractRoom ? `${selectedContractRoom} - ${selectedContract?.resident || contractForm.resident || '-'}` : t('selectRoomContractHint')}
                </Text>
                {contractNotice ? (
                  <View style={[styles.noticeBanner, contractNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{contractNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>{t('roomNumberLabel')}</Text>
                <TextInput value={selectedContractRoom ?? ''} editable={false} style={[styles.fieldInput, styles.fieldReadonly]} />
                <Text style={styles.fieldLabel}>{t('residentNameLabel')}</Text>
                <TextInput
                  value={contractForm.resident}
                  onChangeText={(value) => setContractForm((current) => ({ ...current, resident: value }))}
                  style={styles.fieldInput}
                  placeholder={t('residentNameLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('contractStartLabel')}</Text>
                    <TextInput
                      value={contractForm.startDate}
                      onChangeText={(value) => setContractForm((current) => ({ ...current, startDate: value }))}
                      style={styles.fieldInput}
                      placeholder="2026-03-01"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('contractEndLabel')}</Text>
                    <TextInput
                      value={contractForm.endDate}
                      onChangeText={(value) => setContractForm((current) => ({ ...current, endDate: value }))}
                      style={styles.fieldInput}
                      placeholder="2027-02-28"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('monthlyRentLabel')}</Text>
                    <TextInput
                      value={contractForm.monthlyRent}
                      onChangeText={(value) => setContractForm((current) => ({ ...current, monthlyRent: value }))}
                      style={styles.fieldInput}
                      placeholder="25000"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('depositLabel')}</Text>
                    <TextInput
                      value={contractForm.deposit}
                      onChangeText={(value) => setContractForm((current) => ({ ...current, deposit: value }))}
                      style={styles.fieldInput}
                      placeholder="25000"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('contractStatusLabel')}</Text>
                    <TextInput
                      value={contractForm.status}
                      onChangeText={(value) => setContractForm((current) => ({ ...current, status: value }))}
                      style={styles.fieldInput}
                      placeholder={t('contractStatusDraft')}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('signingModeLabel')}</Text>
                    <TextInput
                      value={contractForm.signingMode}
                      onChangeText={(value) => setContractForm((current) => ({ ...current, signingMode: value }))}
                      style={styles.fieldInput}
                      placeholder={t('contractSigningPhysical')}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleRow, contractForm.autoRenewal && styles.toggleRowActive]}
                  onPress={() => setContractForm((current) => ({ ...current, autoRenewal: !current.autoRenewal }))}
                >
                  <Text style={styles.toggleLabel}>{t('autoRenewalLabel')}</Text>
                  <Text style={styles.toggleValue}>{contractForm.autoRenewal ? t('confirm') : t('cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.fieldLabel}>{t('notesLabel')}</Text>
                <TextInput
                  value={contractForm.notes}
                  onChangeText={(value) => setContractForm((current) => ({ ...current, notes: value }))}
                  style={[styles.fieldInput, styles.textareaInput]}
                  multiline
                  placeholder={t('notesLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleSaveContract}>
                  <Text style={styles.primaryButtonText}>{t('saveContract')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {!loading && page === 'maintenance' ? (
          <>
            <View style={styles.panelRow}>
              <DataTableCard
                title={t('maintenance')}
                description={t('maintenanceDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'category', label: 'Categorie' },
                  { key: 'priority', label: 'Priorite' },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'summary', label: 'Resume' },
                ]}
                rows={maintenanceRows.map((row) => ({
                  room: row.room,
                  category: row.category,
                  priority: row.priority,
                  status: row.status,
                  summary: row.summary,
                }))}
                searchable
                searchPlaceholder={`${t('maintenance')}...`}
                emptyText={t('openIncidents')}
                getRowKey={(_, index) => maintenanceRows[index]?.key ?? `row-${index}`}
                selectedRowKey={selectedMaintenanceKey}
                onRowPress={(_, index) => openMaintenanceEditor(maintenanceRows[index]?.key)}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('maintenanceTicketTitle')}</Text>
                <Text style={styles.formDescription}>{selectedMaintenance ? `${selectedMaintenance.room} - ${selectedMaintenance.summary}` : t('maintenanceDesc')}</Text>
                {maintenanceNotice ? (
                  <View style={[styles.noticeBanner, maintenanceNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{maintenanceNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>{t('maintenanceRoomLabel')}</Text>
                <TextInput
                  value={maintenanceForm.room}
                  onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, room: value }))}
                  style={styles.fieldInput}
                  placeholder="A01"
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenanceCategoryLabel')}</Text>
                    <TextInput
                      value={maintenanceForm.category}
                      onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, category: value }))}
                      style={styles.fieldInput}
                      placeholder="Maintenance"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenancePriorityLabel')}</Text>
                    <TextInput
                      value={maintenanceForm.priority}
                      onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, priority: value as MaintenanceTicketPriority }))}
                      style={styles.fieldInput}
                      placeholder="Moyenne"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenanceStatusLabel')}</Text>
                    <TextInput
                      value={maintenanceForm.status}
                      onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, status: value as MaintenanceTicketStatus }))}
                      style={styles.fieldInput}
                      placeholder="OUVERT"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenanceAssigneeLabel')}</Text>
                    <TextInput
                      value={maintenanceForm.assignee}
                      onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, assignee: value }))}
                      style={styles.fieldInput}
                      placeholder="Chef site"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>{t('maintenanceSummaryLabel')}</Text>
                <TextInput
                  value={maintenanceForm.summary}
                  onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, summary: value }))}
                  style={styles.fieldInput}
                  placeholder={t('maintenanceSummaryLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.fieldLabel}>{t('maintenanceNotesLabel')}</Text>
                <TextInput
                  value={maintenanceForm.notes}
                  onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, notes: value }))}
                  style={[styles.fieldInput, styles.textareaInput]}
                  multiline
                  placeholder={t('maintenanceNotesLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => openMaintenanceEditor()}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{t('createMaintenanceTicket')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMaintenance}>
                    <Text style={styles.primaryButtonText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.panelRow}>
              <DataTableCard
                title={t('maintenanceApiTitle')}
                description={t('maintenanceApiDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'category', label: 'Categorie' },
                  { key: 'priority', label: 'Priorite' },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'responsibility', label: 'Responsable' },
                ]}
                rows={maintenanceApiRows}
                searchable
                searchPlaceholder={`${t('maintenance')}...`}
                emptyText={t('openIncidents')}
                getRowKey={(_, index) => maintenanceApiRows[index]?.id?.toString() ?? `api-${index}`}
                selectedRowKey={selectedMaintenanceApiId?.toString()}
                onRowPress={(row) => {
                  const ticket = maintenanceApiTickets.find((entry) => entry.id === Number(row.id)) ?? null;
                  openMaintenanceApiEditor(ticket);
                }}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('maintenanceApiTitle')}</Text>
                <Text style={styles.formDescription}>
                  {selectedMaintenanceApi ? `${selectedMaintenanceApi.roomNumero} - ${selectedMaintenanceApi.category}` : t('maintenanceApiDesc')}
                </Text>
                {maintenanceApiNotice ? (
                  <View style={[styles.noticeBanner, maintenanceApiNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{maintenanceApiNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>{t('maintenanceRoomLabel')}</Text>
                <TextInput
                  value={maintenanceApiForm.roomNumero}
                  onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, roomNumero: value }))}
                  style={styles.fieldInput}
                  placeholder="A01"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.fieldLabel}>{t('residentExternalIdLabel')}</Text>
                <TextInput
                  value={maintenanceApiForm.residentExternalId}
                  onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, residentExternalId: value }))}
                  style={styles.fieldInput}
                  placeholder="resident-123"
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenanceCategoryLabel')}</Text>
                    <TextInput
                      value={maintenanceApiForm.category}
                      onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, category: value }))}
                      style={styles.fieldInput}
                      placeholder="Maintenance"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenancePriorityLabel')}</Text>
                    <TextInput
                      value={maintenanceApiForm.priority}
                      onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, priority: value }))}
                      style={styles.fieldInput}
                      placeholder="Moyenne"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenanceStatusLabel')}</Text>
                    <TextInput
                      value={maintenanceApiForm.status}
                      onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, status: value }))}
                      style={styles.fieldInput}
                      placeholder="OUVERT"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('maintenanceResponsibilityLabel')}</Text>
                    <TextInput
                      value={maintenanceApiForm.responsibility}
                      onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, responsibility: value }))}
                      style={styles.fieldInput}
                      placeholder="gestionnaire"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('estimatedCostLabel')}</Text>
                    <TextInput
                      value={maintenanceApiForm.estimatedCost}
                      onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, estimatedCost: value }))}
                      style={styles.fieldInput}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('penaltyAmountLabel')}</Text>
                    <TextInput
                      value={maintenanceApiForm.penaltyAmount}
                      onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, penaltyAmount: value }))}
                      style={styles.fieldInput}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>{t('maintenanceNotesLabel')}</Text>
                <TextInput
                  value={maintenanceApiForm.notes}
                  onChangeText={(value) => setMaintenanceApiForm((current) => ({ ...current, notes: value }))}
                  style={[styles.fieldInput, styles.textareaInput]}
                  multiline
                  placeholder={t('maintenanceNotesLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => openMaintenanceApiEditor()}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{t('createMaintenanceTicket')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMaintenanceApi}>
                    <Text style={styles.primaryButtonText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.warning }]} onPress={handleApplyPenalty}>
                  <Text style={styles.primaryButtonText}>{t('applyPenalty')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {!loading && page === 'payments' ? (
          <View style={styles.panelRow}>
            <DataTableCard
              title={t('paymentTitle')}
              description={t('paymentsDesc')}
              columns={[
                { key: 'room', label: t('rooms') },
                { key: 'resident', label: t('residentsLabel') },
                { key: 'total', label: t('totalInvoiceLabel'), align: 'right' },
                { key: 'net', label: t('netToPayLabel'), align: 'right' },
                { key: 'status', label: t('stateLabel') },
              ]}
              rows={invoiceRows}
              searchable
              searchPlaceholder={`${t('paymentTitle')}...`}
              emptyText={t('noInvoicesFirst')}
              getRowKey={(row) => row.id ?? Math.random().toString(16)}
              selectedRowKey={paymentForm.invoiceId?.toString()}
              onRowPress={(row) => setPaymentForm((current) => ({ ...current, invoiceId: Number(row.id) || null }))}
            />
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('paymentFormTitle')}</Text>
              <Text style={styles.formDescription}>{selectedInvoice ? `${t('invoiceIdLabel')}: ${selectedInvoice.id}` : t('paymentsDesc')}</Text>
              {paymentNotice ? (
                <View style={[styles.noticeBanner, paymentNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{paymentNotice.message}</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>{t('invoiceIdLabel')}</Text>
              <TextInput
                value={paymentForm.invoiceId ? paymentForm.invoiceId.toString() : ''}
                editable={false}
                style={[styles.fieldInput, styles.fieldReadonly]}
                placeholder={t('invoiceIdLabel')}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('amountPaidLabel')}</Text>
              <TextInput
                value={paymentForm.amount}
                onChangeText={(value) => setPaymentForm((current) => ({ ...current, amount: value }))}
                style={styles.fieldInput}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('paymentMethodLabel')}</Text>
              <TextInput
                value={paymentForm.method}
                onChangeText={(value) => setPaymentForm((current) => ({ ...current, method: value }))}
                style={styles.fieldInput}
                placeholder="MANUAL"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('noteOptional')}</Text>
              <TextInput
                value={paymentForm.note}
                onChangeText={(value) => setPaymentForm((current) => ({ ...current, note: value }))}
                style={[styles.fieldInput, styles.textareaInput]}
                multiline
                placeholder={t('noteOptional')}
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleRecordPayment}>
                <Text style={styles.primaryButtonText}>{t('registerPayment')}</Text>
              </TouchableOpacity>
            </View>
            <DataTableCard
              title={t('paymentHistoryTitle')}
              description={t('paymentsDesc')}
              columns={[
                { key: 'paidAt', label: 'Date' },
                { key: 'amount', label: t('amountPaidLabel'), align: 'right' },
                { key: 'method', label: t('paymentMethodLabel') },
                { key: 'status', label: t('stateLabel') },
              ]}
              rows={invoicePayments.map((payment) => ({
                paidAt: payment.paidAt?.split('T')[0] ?? payment.paidAt,
                amount: formatMoney(payment.amount),
                method: payment.method,
                status: payment.status,
              }))}
              emptyText={t('paymentsDesc')}
            />
          </View>
        ) : null}

        {!loading && page === 'notifications' ? (
          <View style={styles.panelRow}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('notifications')}</Text>
              <Text style={styles.formDescription}>{t('notificationsDesc')}</Text>
              {notificationNotice ? (
                <View style={[styles.noticeBanner, notificationNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{notificationNotice.message}</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>{t('notificationChannelLabel')}</Text>
              <View style={styles.formButtonRow}>
                {['WHATSAPP', 'EMAIL', 'PUSH'].map((channel) => {
                  const active = notificationForm.channel === channel;
                  return (
                    <TouchableOpacity
                      key={channel}
                      style={[styles.primaryButton, styles.secondaryButton, active && styles.menuItemActive]}
                      onPress={() => setNotificationForm((current) => ({ ...current, channel }))}
                    >
                      <Text style={[styles.secondaryButtonText, active && styles.menuLabelActive]}>{channel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.fieldLabel}>{t('notificationRecipientLabel')}</Text>
              <TextInput
                value={notificationForm.recipient}
                onChangeText={(value) => setNotificationForm((current) => ({ ...current, recipient: value }))}
                style={styles.fieldInput}
                placeholder="+2376xxxxxxx"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('notificationSubjectLabel')}</Text>
              <TextInput
                value={notificationForm.subject}
                onChangeText={(value) => setNotificationForm((current) => ({ ...current, subject: value }))}
                style={styles.fieldInput}
                placeholder={t('notificationSubjectLabel')}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('notificationMessageLabel')}</Text>
              <TextInput
                value={notificationForm.message}
                onChangeText={(value) => setNotificationForm((current) => ({ ...current, message: value }))}
                style={[styles.fieldInput, styles.textareaInput]}
                multiline
                placeholder={t('notificationMessageLabel')}
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSendNotification}>
                <Text style={styles.primaryButtonText}>{t('notificationSendAction')}</Text>
              </TouchableOpacity>
            </View>
            <DataTableCard
              title={t('notificationHistoryTitle')}
              description={t('notificationsDesc')}
              columns={[
                { key: 'channel', label: t('notificationChannelLabel') },
                { key: 'recipient', label: t('notificationRecipientLabel') },
                { key: 'status', label: t('stateLabel') },
                { key: 'sentAt', label: 'Date' },
              ]}
              rows={notificationLog.map((entry) => ({
                channel: entry.channel,
                recipient: entry.recipient,
                status: entry.status,
                sentAt: entry.sentAt?.split('T')[0] ?? entry.createdAt?.split('T')[0],
              }))}
              emptyText={t('notificationsDesc')}
            />
          </View>
        ) : null}

        {!loading && page === 'exports' ? (
          <View style={styles.panelRow}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('exports')}</Text>
              <Text style={styles.formDescription}>{t('exportsDesc')}</Text>
              {exportNotice ? (
                <View style={[styles.noticeBanner, exportNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{exportNotice.message}</Text>
                </View>
              ) : null}
              <View style={[styles.noticeBanner, metrics.monthConfig?.exportsValidatedByConcierge ? styles.noticeSuccess : styles.noticeError]}>
                <Text style={styles.noticeText}>
                  {metrics.monthConfig?.exportsValidatedByConcierge
                    ? 'Validation Concierge enregistree. Les exports du mois sont autorises.'
                    : 'Validation Concierge absente. Les exports restent bloques jusqu a validation.'}
                </Text>
              </View>
              <Text style={styles.fieldLabel}>{t('exportMonthLabel')}</Text>
              <TextInput
                value={exportMonth}
                onChangeText={setExportMonth}
                style={styles.fieldInput}
                placeholder={metrics.month}
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleExportMeterTrack}>
                <Text style={styles.primaryButtonText}>{t('exportMeterTrackXlsx')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleExportFinanceSummary}>
                <Text style={styles.primaryButtonText}>{t('exportFinanceSummaryXlsx')}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>{t('exportResidentIdLabel')}</Text>
              <TextInput
                value={exportResidentId}
                onChangeText={setExportResidentId}
                style={styles.fieldInput}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleExportResidentHistory}>
                <Text style={styles.primaryButtonText}>{t('exportResidentHistoryPdf')}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>{t('exportPaymentIdLabel')}</Text>
              <TextInput
                value={exportPaymentId}
                onChangeText={setExportPaymentId}
                style={styles.fieldInput}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleExportPaymentReceipt}>
                <Text style={styles.primaryButtonText}>{t('exportPaymentReceiptPdf')}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>{t('exportExitReportIdLabel')}</Text>
              <TextInput
                value={exportExitReportId}
                onChangeText={setExportExitReportId}
                style={styles.fieldInput}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleExportExitReport}>
                <Text style={styles.primaryButtonText}>{t('exportExitReportPdf')}</Text>
              </TouchableOpacity>
            </View>
            <ActionPanel
              title={t('exportsTipsTitle')}
              description={t('exportsDesc')}
              bullets={[
                t('exportsTipMeterTrack'),
                t('exportsTipResident'),
                t('exportsTipPayment'),
                t('exportsTipExit'),
              ]}
            />
          </View>
        ) : null}

        {!loading && page === 'reports' ? (
          <>
            <View style={styles.panelRow}>
              <DataTableCard
                title={t('managementLabel')}
                description={t('reportsDesc')}
                columns={[
                  { key: 'label', label: 'Indicateur' },
                  { key: 'value', label: 'Valeur', align: 'right' },
                  { key: 'detail', label: 'Detail' },
                ]}
                rows={metrics.reportRows}
                emptyText={t('reports')}
              />
              <DataTableCard
                title={t('financeLabel')}
                description={t('reportsDesc')}
                columns={[
                  { key: 'label', label: 'Indicateur' },
                  { key: 'value', label: 'Valeur', align: 'right' },
                  { key: 'detail', label: 'Detail' },
                ]}
                rows={metrics.reportFinanceRows}
                emptyText={t('reports')}
              />
            </View>
            <View style={styles.panelRow}>
              <DataTableCard
                title={t('operationsLabel')}
                description={t('reportsDesc')}
                columns={[
                  { key: 'label', label: 'Indicateur' },
                  { key: 'value', label: 'Valeur', align: 'right' },
                  { key: 'detail', label: 'Detail' },
                ]}
                rows={metrics.reportOperationsRows}
                emptyText={t('reports')}
              />
              <DataTableCard
                title={t('portfolioWatchLabel')}
                description={t('reportsDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'resident', label: t('residentsLabel') },
                  { key: 'balance', label: t('balanceLabel'), align: 'right' },
                  { key: 'status', label: t('stateLabel') },
                ]}
                rows={metrics.reportPortfolioRows}
                emptyText={t('reports')}
              />
            </View>
          </>
        ) : null}

        {!loading && page === 'documents' ? (
          <>
            <View style={styles.panelRow}>
              <DataTableCard
                title={t('documentRegistryTitle')}
                description={t('documentsDesc')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'type', label: t('documentTypeLabel') },
                  { key: 'title', label: t('documentTitleLabel') },
                  { key: 'status', label: t('documentStatusLabel') },
                ]}
                rows={documentRegistry.map((entry) => ({
                  room: entry.room,
                  type: entry.type,
                  title: entry.title,
                  status: entry.status,
                }))}
                searchable
                searchPlaceholder={`${t('documents')}...`}
                emptyText={t('documentsDesc')}
                getRowKey={(_, index) => documentRegistry[index]?.key ?? `doc-${index}`}
                selectedRowKey={selectedDocumentKey}
                onRowPress={(_, index) => openDocumentEditor(documentRegistry[index]?.key)}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('documents')}</Text>
                <Text style={styles.formDescription}>{selectedDocument ? `${selectedDocument.room} - ${selectedDocument.title}` : t('documentsDesc')}</Text>
                {documentNotice ? (
                  <View style={[styles.noticeBanner, documentNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{documentNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>{t('roomNumberLabel')}</Text>
                <TextInput
                  value={documentForm.room}
                  onChangeText={(value) => setDocumentForm((current) => ({ ...current, room: value }))}
                  style={styles.fieldInput}
                  placeholder="A01"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.fieldLabel}>{t('residentNameLabel')}</Text>
                <TextInput
                  value={documentForm.resident}
                  onChangeText={(value) => setDocumentForm((current) => ({ ...current, resident: value }))}
                  style={styles.fieldInput}
                  placeholder={t('residentNameLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('documentTypeLabel')}</Text>
                    <TextInput
                      value={documentForm.type}
                      onChangeText={(value) => setDocumentForm((current) => ({ ...current, type: value as DocumentType }))}
                      style={styles.fieldInput}
                      placeholder="CONTRAT"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('documentStatusLabel')}</Text>
                    <TextInput
                      value={documentForm.status}
                      onChangeText={(value) => setDocumentForm((current) => ({ ...current, status: value as DocumentStatus }))}
                      style={styles.fieldInput}
                      placeholder="BROUILLON"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>{t('documentTitleLabel')}</Text>
                <TextInput
                  value={documentForm.title}
                  onChangeText={(value) => setDocumentForm((current) => ({ ...current, title: value }))}
                  style={styles.fieldInput}
                  placeholder={t('documentTitleLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('issuedOnLabel')}</Text>
                    <TextInput
                      value={documentForm.issuedOn}
                      onChangeText={(value) => setDocumentForm((current) => ({ ...current, issuedOn: value }))}
                      style={styles.fieldInput}
                      placeholder="2026-03-16"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('expiresOnLabel')}</Text>
                    <TextInput
                      value={documentForm.expiresOn}
                      onChangeText={(value) => setDocumentForm((current) => ({ ...current, expiresOn: value }))}
                      style={styles.fieldInput}
                      placeholder="2027-03-16"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>{t('notesLabel')}</Text>
                <TextInput
                  value={documentForm.notes}
                  onChangeText={(value) => setDocumentForm((current) => ({ ...current, notes: value }))}
                  style={[styles.fieldInput, styles.textareaInput]}
                  multiline
                  placeholder={t('notesLabel')}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => openDocumentEditor()}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{t('documents')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSaveDocument}>
                    <Text style={styles.primaryButtonText}>{t('saveDocument')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.panelRow}>
              <DataTableCard
                title="PV de sortie"
                description="Calcul automatique de la caution, deductions, remboursement et signatures."
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'resident', label: t('residentsLabel') },
                  { key: 'refund', label: 'Remboursement', align: 'right' },
                  { key: 'status', label: t('stateLabel') },
                ]}
                rows={exitReportRows}
                emptyText="Aucun PV de sortie genere."
                getRowKey={(_, index) => exitReports[index]?.id != null ? String(exitReports[index]?.id) : `exit-${index}`}
                selectedRowKey={selectedExitReportId != null ? String(selectedExitReportId) : undefined}
                onRowPress={(_, index) => openExitReportEditor(exitReports[index] ?? null)}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>PV de sortie</Text>
                <Text style={styles.formDescription}>
                  {selectedExitReport
                    ? `${selectedExitReport.roomNumero} - remboursement ${formatMoney(selectedExitReport.refundAmount)}`
                    : 'Calcule la caution remboursable selon les dettes, reparations et charges communes (25%).'}
                </Text>
                {exitReportNotice ? (
                  <View style={[styles.noticeBanner, exitReportNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                    <Text style={styles.noticeText}>{exitReportNotice.message}</Text>
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>ID chambre</Text>
                <TextInput
                  value={exitReportForm.roomId}
                  onChangeText={(value) => setExitReportForm((current) => ({ ...current, roomId: value }))}
                  style={styles.fieldInput}
                  placeholder="1"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>ID resident</Text>
                    <TextInput
                      value={exitReportForm.residentId}
                      onChangeText={(value) => setExitReportForm((current) => ({ ...current, residentId: value }))}
                      style={styles.fieldInput}
                      placeholder="1"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>ID contrat</Text>
                    <TextInput
                      value={exitReportForm.contractId}
                      onChangeText={(value) => setExitReportForm((current) => ({ ...current, contractId: value }))}
                      style={styles.fieldInput}
                      placeholder="1"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <View style={styles.formSplit}>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>{t('depositLabel')}</Text>
                    <TextInput
                      value={exitReportForm.depositAmount}
                      onChangeText={(value) => setExitReportForm((current) => ({ ...current, depositAmount: value }))}
                      style={styles.fieldInput}
                      placeholder="150000"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.formSplitCol}>
                    <Text style={styles.fieldLabel}>Reparations (FCFA)</Text>
                    <TextInput
                      value={exitReportForm.repairCost}
                      onChangeText={(value) => setExitReportForm((current) => ({ ...current, repairCost: value }))}
                      style={styles.fieldInput}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>{t('notesLabel')}</Text>
                <TextInput
                  value={exitReportForm.notes}
                  onChangeText={(value) => setExitReportForm((current) => ({ ...current, notes: value }))}
                  style={[styles.fieldInput, styles.textareaInput]}
                  multiline
                  placeholder="Observations de sortie, reserve, etat du logement..."
                  placeholderTextColor={colors.textLight}
                />
                {selectedExitReport ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>Synthese calcul</Text>
                    <Text style={styles.detailLine}>Caution: {formatMoney(selectedExitReport.depositAmount)}</Text>
                    <Text style={styles.detailLine}>Dettes globales: {formatMoney(selectedExitReport.debtTotal)}</Text>
                    <Text style={styles.detailLine}>Sanctions impayees: {formatMoney(selectedExitReport.sanctionTotal)}</Text>
                    <Text style={styles.detailLine}>Reparations: {formatMoney(selectedExitReport.repairCost)}</Text>
                    <Text style={styles.detailLine}>Charges communes (25%): {formatMoney(selectedExitReport.commonChargesAmount)}</Text>
                    <Text style={styles.detailLine}>Caution mobilisee: {formatMoney(selectedExitReport.depositUsed)}</Text>
                    <Text style={styles.detailTotal}>Remboursement caution: {formatMoney(selectedExitReport.refundAmount)}</Text>
                    <Text style={styles.detailLine}>Signature gestionnaire: {selectedExitReport.managerSignedAt ?? 'non signee'}</Text>
                    <Text style={styles.detailLine}>Signature resident: {selectedExitReport.residentSignedAt ?? 'non signee'}</Text>
                  </View>
                ) : null}
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => openExitReportEditor(null)}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Nouveau PV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSaveExitReport}>
                    <Text style={styles.primaryButtonText}>Calculer le PV</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => handleSignExitReport('MANAGER')}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Signer gestionnaire</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => handleSignExitReport('RESIDENT')}>
                    <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Signer resident</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={handleFinalizeExitReport}>
                  <Text style={styles.primaryButtonText}>Finaliser la sortie</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {!loading && page === 'marketplace' ? (
          <View style={styles.panelRow}>
            <DataTableCard
              title={t('marketplace')}
              description={t('marketplaceDesc')}
              columns={[
                { key: 'title', label: t('documentTitleLabel') },
                { key: 'type', label: t('documentTypeLabel') },
                { key: 'price', label: t('amountLabel') },
                { key: 'status', label: t('stateLabel') },
              ]}
              rows={marketplaceListings.map((listing) => ({
                title: listing.title,
                type: listing.listingType,
                price: listing.price == null ? '-' : formatMoney(listing.price),
                status: listing.status,
              }))}
              searchable
              searchPlaceholder={`${t('marketplace')}...`}
              emptyText={t('marketplaceDesc')}
            />
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('marketplace')}</Text>
              <Text style={styles.formDescription}>{t('marketplaceDesc')}</Text>
              {marketplaceNotice ? (
                <View style={[styles.noticeBanner, marketplaceNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{marketplaceNotice.message}</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>{t('documentTitleLabel')}</Text>
              <TextInput
                value={marketplaceForm.title}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, title: value }))}
                style={styles.fieldInput}
                placeholder="Studio meuble"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('documentTypeLabel')}</Text>
              <TextInput
                value={marketplaceForm.listingType}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, listingType: value }))}
                style={styles.fieldInput}
                placeholder="LOCATION"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('amountLabel')}</Text>
              <TextInput
                value={marketplaceForm.price}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, price: value }))}
                style={styles.fieldInput}
                placeholder="150000"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('addressLabel')}</Text>
              <TextInput
                value={marketplaceForm.address}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, address: value }))}
                style={styles.fieldInput}
                placeholder="Bonapriso, Douala"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>Lat / Lng (OpenStreetMap)</Text>
              <View style={styles.formSplit}>
                <View style={styles.formSplitCol}>
                  <TextInput
                    value={marketplaceForm.latitude}
                    onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, latitude: value }))}
                    style={styles.fieldInput}
                    placeholder="4.0511"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={styles.formSplitCol}>
                  <TextInput
                    value={marketplaceForm.longitude}
                    onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, longitude: value }))}
                    style={styles.fieldInput}
                    placeholder="9.7679"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>{t('notesLabel')}</Text>
              <TextInput
                value={marketplaceForm.description}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, description: value }))}
                style={[styles.fieldInput, styles.textareaInput]}
                multiline
                placeholder={t('notesLabel')}
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMarketplace}>
                <Text style={styles.primaryButtonText}>{t('saveDocument')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loading && page === 'commonCharges' ? (
          <View style={styles.panelRow}>
            <DataTableCard
              title={t('commonCharges')}
              description={t('commonChargesDesc')}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'label', label: t('documentTitleLabel') },
                { key: 'amount', label: t('amountLabel') },
                { key: 'state', label: t('stateLabel') },
              ]}
              rows={commonCharges.map((charge) => ({
                code: charge.code,
                label: charge.label,
                amount: formatMoney(charge.amount),
                state: charge.active ? 'ACTIF' : 'INACTIF',
              }))}
              emptyText={t('commonChargesDesc')}
            />
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('commonCharges')}</Text>
              <Text style={styles.formDescription}>{t('commonChargesDesc')}</Text>
              {commonChargeNotice ? (
                <View style={[styles.noticeBanner, commonChargeNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                  <Text style={styles.noticeText}>{commonChargeNotice.message}</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>Code</Text>
              <TextInput
                value={commonChargeForm.code}
                onChangeText={(value) => setCommonChargeForm((current) => ({ ...current, code: value }))}
                style={styles.fieldInput}
                placeholder="SECURITE"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('documentTitleLabel')}</Text>
              <TextInput
                value={commonChargeForm.label}
                onChangeText={(value) => setCommonChargeForm((current) => ({ ...current, label: value }))}
                style={styles.fieldInput}
                placeholder="Securite"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>{t('amountLabel')}</Text>
              <TextInput
                value={commonChargeForm.amount}
                onChangeText={(value) => setCommonChargeForm((current) => ({ ...current, amount: value }))}
                style={styles.fieldInput}
                placeholder="5000"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveCommonCharge}>
                <Text style={styles.primaryButtonText}>{t('saveDocument')}</Text>
              </TouchableOpacity>

              <Text style={[styles.formTitle, { marginTop: 14 }]}>{t('assignLabel')}</Text>
              <Text style={styles.fieldLabel}>Charge ID</Text>
              <TextInput
                value={commonChargeAssignForm.chargeId}
                onChangeText={(value) => setCommonChargeAssignForm((current) => ({ ...current, chargeId: value }))}
                style={styles.fieldInput}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>Scope</Text>
              <TextInput
                value={commonChargeAssignForm.scopeType}
                onChangeText={(value) => setCommonChargeAssignForm((current) => ({ ...current, scopeType: value }))}
                style={styles.fieldInput}
                placeholder="BLOC"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>Valeur</Text>
              <TextInput
                value={commonChargeAssignForm.scopeValue}
                onChangeText={(value) => setCommonChargeAssignForm((current) => ({ ...current, scopeValue: value }))}
                style={styles.fieldInput}
                placeholder="A"
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleAssignCommonCharge}>
                <Text style={styles.primaryButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loading && page === 'metertrackReadOnly' ? (
          <>
            <SectionHeader
              eyebrow={`${t('managerRole')} - ${t('readOnlyAccessLabel')}`}
              title={t('managerMeterTrackReadOnly')}
              description={t('managerReadOnlyDescription')}
            />
            <View style={styles.kpiGrid}>
              <KpiTile value={`${metrics.indexedRooms}/${metrics.activeRooms}`} label={t('roomsIndexed')} hint={t('managerReadOnlyDescription')} />
              <KpiTile value={`${metrics.invoicesCalculated}`} label={t('invoicesCalculatedLabel')} hint={t('managerModuleDescription')} />
              <KpiTile value={`${metrics.invoicesSent}`} label={t('invoicesSentLabel')} hint={t('managerModuleDescription')} />
              <KpiTile value={`${metrics.paymentCount}`} label={t('paymentsReceivedLabel')} hint={t('managerModuleDescription')} />
            </View>
            <View style={styles.panelRow}>
              <DataTableCard
                title={t('indexEntry')}
                description={t('managerReadOnlyDescription')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'status', label: t('stateLabel') },
                  { key: 'createdAt', label: 'Date' },
                ]}
                rows={metrics.portfolioRows}
                searchable
                searchPlaceholder={`${t('indexEntry')}...`}
                emptyText={t('noRoomFound')}
              />
              <DataTableCard
                title={t('whatsappSend')}
                description={t('managerReadOnlyDescription')}
                columns={[
                  { key: 'room', label: t('rooms') },
                  { key: 'resident', label: t('residentsLabel') },
                  { key: 'due', label: t('netToPayLabel'), align: 'right' },
                  { key: 'status', label: t('stateLabel') },
                ]}
                rows={metrics.broadcastRows.map((row) => ({
                  room: row.room,
                  resident: row.resident,
                  due: formatMoney(row.due),
                  status: row.status,
                }))}
                searchable
                searchPlaceholder={`${t('whatsappSend')}...`}
                emptyText={t('whatsappNone')}
              />
            </View>
          </>
        ) : null}

        {!loading && page === 'settings' ? (
          <View style={styles.panelRow}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('settings')}</Text>
              <Text style={styles.formDescription}>
                Parametres de travail du gestionnaire, preferences d affichage et rappel des permissions du role.
              </Text>

              <Text style={styles.fieldLabel}>{t('language')}</Text>
              <View style={styles.formButtonRow}>
                {languageOptions.map((option) => {
                  const active = language === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.primaryButton, styles.secondaryButton, active && styles.menuItemActive]}
                      onPress={() => { void setLanguage(option.value); }}
                    >
                      <Text style={[styles.secondaryButtonText, active && styles.menuLabelActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>{t('theme')}</Text>
              <View style={styles.formButtonRow}>
                {themeOptions.map((option) => {
                  const active = themeMode === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.primaryButton, styles.secondaryButton, active && styles.menuItemActive]}
                      onPress={() => { void setThemeMode(option.value); }}
                    >
                      <Text style={[styles.secondaryButtonText, active && styles.menuLabelActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>{t('currentRole')}</Text>
              <TextInput value={t('managerRole')} editable={false} style={[styles.fieldInput, styles.fieldReadonly]} />

              <Text style={styles.fieldLabel}>{t('managerMeterTrackReadOnly')}</Text>
              <TextInput value={t('managerReadOnlyDescription')} editable={false} multiline style={[styles.fieldInput, styles.fieldReadonly, styles.textareaInput]} />

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.error }]} onPress={logout}>
                <Text style={styles.primaryButtonText}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>

            <ActionPanel
              title={t('managerQuickActions')}
              description={t('managerPanelDescription')}
              bullets={[
                'Le gestionnaire supervise le portefeuille et cree les comptes concierge.',
                'Le module MeterTrack reste accessible en lecture seule.',
                'Les preferences langue et theme s appliquent a tout le back-office.',
              ]}
              actions={[
                { label: t('managerMeterTrackReadOnly'), onPress: () => setPage('metertrackReadOnly') },
                { label: t('conciergeAccounts'), onPress: () => setPage('concierges'), variant: 'secondary' },
              ]}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatMoney(value: number): string {
  return `${Math.round(Math.max(0, value)).toLocaleString('fr-FR')} FCFA`;
}

function emptyContractForm(): ContractForm {
  return {
    room: '',
    resident: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    status: '',
    signingMode: '',
    autoRenewal: false,
    notes: '',
  };
}

function emptyMaintenanceForm(): MaintenanceForm {
  return {
    room: '',
    category: 'Maintenance',
    priority: 'Moyenne',
    status: 'OUVERT',
    assignee: '',
    summary: '',
    notes: '',
  };
}

function emptyDocumentForm(): DocumentForm {
  return {
    room: '',
    resident: '',
    type: 'CONTRAT',
    title: '',
    status: 'BROUILLON',
    issuedOn: '',
    expiresOn: '',
    notes: '',
  };
}

function emptyExitReportForm(): ExitReportForm {
  return {
    roomId: '',
    residentId: '',
    contractId: '',
    depositAmount: '',
    repairCost: '',
    notes: '',
  };
}

function emptyOcrOnboardingForm(): OcrOnboardingForm {
  return {
    documentType: 'CNI',
    frontImageBase64: '',
    backImageBase64: '',
    roomId: '',
    username: '',
    password: '',
    monthlyRent: '',
    deposit: '',
  };
}

function emptyMarketplaceForm(): MarketplaceForm {
  return {
    title: '',
    description: '',
    price: '',
    currency: 'FCFA',
    listingType: '',
    status: 'DRAFT',
    address: '',
    latitude: '',
    longitude: '',
  };
}

function emptyCommonChargeForm(): CommonChargeForm {
  return {
    code: '',
    label: '',
    amount: '',
    required: true,
    active: true,
  };
}

function emptyCommonChargeAssignForm(): CommonChargeAssignForm {
  return {
    chargeId: '',
    scopeType: 'BLOC',
    scopeValue: '',
    required: true,
  };
}

function emptyContractApiForm(): ContractApiForm {
  return {
    roomNumero: '',
    residentExternalId: '',
    status: '',
    signingMode: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    autoRenewal: false,
    notes: '',
    externalId: null,
  };
}

function emptyMaintenanceApiForm(): MaintenanceApiForm {
  return {
    roomNumero: '',
    residentExternalId: '',
    category: '',
    priority: '',
    status: '',
    responsibility: '',
    estimatedCost: '',
    penaltyAmount: '',
    notes: '',
    externalId: null,
  };
}

function emptyPaymentForm(): PaymentForm {
  return {
    invoiceId: null,
    amount: '',
    method: '',
    note: '',
  };
}

function emptyNotificationForm(): NotificationForm {
  return {
    channel: 'WHATSAPP',
    recipient: '',
    subject: '',
    message: '',
  };
}

async function getContractRegistry(db: ReturnType<typeof useDatabaseOptional>): Promise<Record<string, ContractRegistryEntry>> {
  if (!db) {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(`myhouse:${CONTRACT_REGISTRY_KEY}`);
      return raw ? JSON.parse(raw) as Record<string, ContractRegistryEntry> : {};
    } catch {
      return {};
    }
  }
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [CONTRACT_REGISTRY_KEY]);
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as Record<string, ContractRegistryEntry>;
  } catch {
    return {};
  }
}

async function saveContractRegistry(db: ReturnType<typeof useDatabaseOptional>, entries: Record<string, ContractRegistryEntry>): Promise<void> {
  const payload = JSON.stringify(entries);
  if (!db) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`myhouse:${CONTRACT_REGISTRY_KEY}`, payload);
    }
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [CONTRACT_REGISTRY_KEY, payload]);
}

async function getMaintenanceTickets(db: ReturnType<typeof useDatabaseOptional>): Promise<MaintenanceTicketEntry[]> {
  if (!db) {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(`myhouse:${MAINTENANCE_TICKETS_KEY}`);
      return raw ? JSON.parse(raw) as MaintenanceTicketEntry[] : [];
    } catch {
      return [];
    }
  }
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [MAINTENANCE_TICKETS_KEY]);
  if (!row?.value) return [];
  try {
    return JSON.parse(row.value) as MaintenanceTicketEntry[];
  } catch {
    return [];
  }
}

async function saveMaintenanceTickets(db: ReturnType<typeof useDatabaseOptional>, entries: MaintenanceTicketEntry[]): Promise<void> {
  const payload = JSON.stringify(entries);
  if (!db) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`myhouse:${MAINTENANCE_TICKETS_KEY}`, payload);
    }
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [MAINTENANCE_TICKETS_KEY, payload]);
}

async function getDocumentsRegistry(db: ReturnType<typeof useDatabaseOptional>): Promise<DocumentEntry[]> {
  if (!db) {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(`myhouse:${DOCUMENT_REGISTRY_KEY}`);
      return raw ? JSON.parse(raw) as DocumentEntry[] : [];
    } catch {
      return [];
    }
  }
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [DOCUMENT_REGISTRY_KEY]);
  if (!row?.value) return [];
  try {
    return JSON.parse(row.value) as DocumentEntry[];
  } catch {
    return [];
  }
}

async function saveDocumentsRegistry(db: ReturnType<typeof useDatabaseOptional>, entries: DocumentEntry[]): Promise<void> {
  const payload = JSON.stringify(entries);
  if (!db) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`myhouse:${DOCUMENT_REGISTRY_KEY}`, payload);
    }
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [DOCUMENT_REGISTRY_KEY, payload]);
}

function SnapshotRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.snapshotCard}>
      <Text style={styles.snapshotLabel}>{label}</Text>
      <Text style={styles.snapshotValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
    },
    sidebar: {
      width: 260,
      backgroundColor: colors.tabBg,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 24,
      gap: 22,
    },
    brandBlock: {
      gap: 8,
    },
    brandEyebrow: {
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    brandTitle: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
    },
    brandDescription: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
    },
    menu: {
      gap: 10,
    },
    menuSection: {
      gap: 10,
    },
    menuSectionTitle: {
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: colors.cardBg,
    },
    menuItemActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    menuLabel: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    menuLabelActive: {
      color: colors.white,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 24,
      gap: 18,
    },
    loadingCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    panelRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    tableStack: {
      gap: 16,
    },
    snapshotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    snapshotCard: {
      minWidth: 180,
      flexGrow: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    snapshotLabel: {
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    snapshotValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    formCard: {
      flex: 1,
      minWidth: 360,
      backgroundColor: colors.cardBg,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    formTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    formDescription: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    inlineOptions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    filterChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    filterChipTextActive: {
      color: colors.white,
    },
    fieldInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 14,
    },
    fieldReadonly: {
      opacity: 0.78,
    },
    formSplit: {
      flexDirection: 'row',
      gap: 12,
    },
    formSplitCol: {
      flex: 1,
      gap: 6,
    },
    toggleRow: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleRowActive: {
      borderColor: colors.primary,
    },
    toggleLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    toggleValue: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    textareaInput: {
      minHeight: 96,
      textAlignVertical: 'top' as any,
    },
    detailCard: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.inputBg,
      padding: 14,
      gap: 6,
    },
    detailTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    detailLine: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    detailTotal: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 4,
    },
    formButtonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    primaryButton: {
      marginTop: 8,
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButton: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '800',
    },
    secondaryButtonText: {
      color: colors.text,
    },
    noticeBanner: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noticeSuccess: {
      backgroundColor: colors.success,
    },
    noticeError: {
      backgroundColor: colors.error,
    },
    noticeText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '700',
    },
    pendingRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginTop: 10,
      backgroundColor: colors.inputBg,
    },
    pendingMeta: {
      gap: 4,
    },
    pendingActions: {
      flexDirection: 'row',
      gap: 10,
    },
  });
}
