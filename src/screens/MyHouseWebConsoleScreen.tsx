import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { type AppRole, useAuth } from '../database/AuthContext';
import { useDatabaseOptional } from '../database/DatabaseContext';
import { usePreferences, useThemeColors } from '../database/PreferencesContext';
import { useMyHouseConsoleData } from '../hooks/useMyHouseConsoleData';
import ConsoleShell from '../components/myhouse/ConsoleShell';
import KpiTile from '../components/myhouse/KpiTile';
import ActionPanel from '../components/myhouse/ActionPanel';
import SectionHeader from '../components/myhouse/SectionHeader';
import DataTableCard from '../components/myhouse/DataTableCard';
import ProgressList from '../components/myhouse/ProgressList';
import DetailModal from '../components/myhouse/DetailModal';
import { getDesktopBridge } from '../utils/desktopBridge';
import { exportComplet, exportInvoices, exportPayments, exportResidents } from '../services/ExportService';
import {
  calculateBilling,
  patchResident,
  patchRoom,
  recordPayment,
  updateInvoiceDebt,
  updateInvoiceSendStatus,
  upsertIndexReading,
  listMarketplaceListings,
  upsertMarketplaceListing,
  listCommonCharges,
  upsertCommonCharge,
  assignCommonCharge,
  type ApiMarketplaceListing,
  type ApiCommonCharge,
} from '../services/BackendApi';

type WebSection = 'overview' | 'workspace' | 'delivery';
type ManagerPage =
  | 'overview'
  | 'portfolio'
  | 'billing'
  | 'payments'
  | 'contracts'
  | 'maintenance'
  | 'reports'
  | 'documents'
  | 'marketplace'
  | 'commonCharges'
  | 'delivery';
type ConciergePage = 'overview' | 'terrain' | 'broadcast' | 'reception' | 'delivery';
type GenericPage = 'overview' | 'workspace' | 'delivery';
type PortfolioFilter = 'all' | 'pending' | 'indexed';
type BillingFilter = 'all' | 'non_envoye' | 'envoye' | 'erreur';
type PaymentFilter = 'all' | 'with_note' | 'without_note';
type ReceptionFilter = 'all' | 'active' | 'inactive';
type ContractFilter = 'all' | 'complete' | 'attention' | 'missing';
type MaintenanceFilter = 'all' | 'high' | 'open' | 'followup';
type PageDescriptor = {
  key: string;
  title: string;
  description: string;
  bullets: string[];
  actionLabel: string;
  onPress: () => void;
};
type ContractFormState = {
  startDate: string;
  endDate: string;
  monthlyRent: string;
  depositAmount: string;
  status: 'BROUILLON' | 'ACTIF' | 'A_RENOUVELER' | 'EXPIRE';
  signatureMode: 'PREAPPosee' | 'PHYSIQUE' | 'NUMERIQUE';
  autoRenew: boolean;
  notes: string;
};
type ContractRegistryEntry = ContractFormState;
type MaintenanceTicketStatus = 'OUVERT' | 'EN_COURS' | 'PLANIFIE' | 'RESOLU';
type MaintenanceTicketPriority = 'Haute' | 'Moyenne' | 'Basse';
type MaintenanceTicketFormState = {
  room: string;
  category: string;
  priority: MaintenanceTicketPriority;
  status: MaintenanceTicketStatus;
  assignee: string;
  summary: string;
  notes: string;
};
type MaintenanceTicketEntry = MaintenanceTicketFormState & {
  key: string;
  source: 'manual';
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
type DocumentFormState = Omit<DocumentEntry, 'key'>;

const CONTRACT_STORAGE_KEY = 'myhouse:manager-contracts';
const MAINTENANCE_STORAGE_KEY = 'myhouse:manager-maintenance-tickets';
const DOCUMENT_STORAGE_KEY = 'myhouse:manager-documents';

function addMonths(baseDate: Date, months: number): Date {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDateInput(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function getContractEntryFromStorage(): Record<string, ContractRegistryEntry> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(CONTRACT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, ContractRegistryEntry> : {};
  } catch {
    return {};
  }
}

function saveContractEntryToStorage(entries: Record<string, ContractRegistryEntry>): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(entries));
}

function getMaintenanceTicketsFromStorage(): MaintenanceTicketEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) as MaintenanceTicketEntry[] : [];
  } catch {
    return [];
  }
}

function saveMaintenanceTicketsToStorage(entries: MaintenanceTicketEntry[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(entries));
}

function getDocumentsFromStorage(): DocumentEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(DOCUMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as DocumentEntry[] : [];
  } catch {
    return [];
  }
}

function saveDocumentsToStorage(entries: DocumentEntry[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(entries));
}

function TabSwitch<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (next: T) => void;
  tabs: { key: T; label: string }[];
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MyHouseWebConsoleScreen() {
  const { activeRole, availableRoles, setActiveRole } = useAuth();
  const db = useDatabaseOptional();
  const { language, themeMode } = usePreferences();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { loading, metrics, reload } = useMyHouseConsoleData();
  const [managerPage, setManagerPage] = useState<ManagerPage>('overview');
  const [conciergePage, setConciergePage] = useState<ConciergePage>('overview');
  const [genericPage, setGenericPage] = useState<GenericPage>('overview');
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedPortfolioRoom, setSelectedPortfolioRoom] = useState<string | null>(null);
  const [selectedBillingRoom, setSelectedBillingRoom] = useState<string | null>(null);
  const [selectedPaymentRow, setSelectedPaymentRow] = useState<string | null>(null);
  const [selectedContractRoom, setSelectedContractRoom] = useState<string | null>(null);
  const [selectedMaintenanceKey, setSelectedMaintenanceKey] = useState<string | null>(null);
  const [selectedDocumentKey, setSelectedDocumentKey] = useState<string | null>(null);
  const [selectedBroadcastRoom, setSelectedBroadcastRoom] = useState<string | null>(null);
  const [selectedReceptionRoom, setSelectedReceptionRoom] = useState<string | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState<PortfolioFilter>('all');
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [contractFilter, setContractFilter] = useState<ContractFilter>('all');
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceFilter>('all');
  const [broadcastFilter, setBroadcastFilter] = useState<BillingFilter>('all');
  const [receptionFilter, setReceptionFilter] = useState<ReceptionFilter>('all');
  const [documentDetailVisible, setDocumentDetailVisible] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [documentRegistry, setDocumentRegistry] = useState<DocumentEntry[]>([]);
  const [documentForm, setDocumentForm] = useState<DocumentFormState>({
    room: '',
    resident: '',
    type: 'CONTRAT',
    title: '',
    status: 'BROUILLON',
    issuedOn: '',
    expiresOn: '',
    notes: '',
  });
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', note: '' });
  const [maintenanceDetailVisible, setMaintenanceDetailVisible] = useState(false);
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicketEntry[]>([]);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceTicketFormState>({
    room: '',
    category: 'Maintenance',
    priority: 'Moyenne',
    status: 'OUVERT',
    assignee: '',
    summary: '',
    notes: '',
  });
  const [contractDetailVisible, setContractDetailVisible] = useState(false);
  const [contractEditModalVisible, setContractEditModalVisible] = useState(false);
  const [contractRegistry, setContractRegistry] = useState<Record<string, ContractRegistryEntry>>({});
  const [contractForm, setContractForm] = useState<ContractFormState>({
    startDate: '',
    endDate: '',
    monthlyRent: '',
    depositAmount: '',
    status: 'BROUILLON',
    signatureMode: 'PREAPPosee',
    autoRenew: false,
    notes: '',
  });
  const [marketplaceListings, setMarketplaceListings] = useState<ApiMarketplaceListing[]>([]);
  const [marketplaceForm, setMarketplaceForm] = useState({
    title: '',
    description: '',
    price: '',
    listingType: '',
    status: 'DRAFT',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [marketplaceNotice, setMarketplaceNotice] = useState<string | null>(null);
  const [commonCharges, setCommonCharges] = useState<ApiCommonCharge[]>([]);
  const [commonChargeForm, setCommonChargeForm] = useState({
    code: '',
    label: '',
    amount: '',
    required: true,
    active: true,
  });
  const [commonChargeAssignForm, setCommonChargeAssignForm] = useState({
    chargeId: '',
    scopeType: 'BLOC',
    scopeValue: '',
    required: true,
  });
  const [commonChargeNotice, setCommonChargeNotice] = useState<string | null>(null);
  const [roomEditModalVisible, setRoomEditModalVisible] = useState(false);
  const [roomForm, setRoomForm] = useState({ numeroChambre: '', bloc: '' });
  const [residentEditModalVisible, setResidentEditModalVisible] = useState(false);
  const [residentForm, setResidentForm] = useState({ nom: '', prenom: '', whatsapp: '', telephone: '' });
  const [debtModalVisible, setDebtModalVisible] = useState(false);
  const [debtForm, setDebtForm] = useState({ dette: '' });
  const [indexModalVisible, setIndexModalVisible] = useState(false);
  const [terrainQueue, setTerrainQueue] = useState<string[]>([]);
  const [terrainQueueIndex, setTerrainQueueIndex] = useState<number>(-1);
  const [broadcastQueue, setBroadcastQueue] = useState<string[]>([]);
  const [broadcastQueueIndex, setBroadcastQueueIndex] = useState<number>(-1);
  const [receptionQueue, setReceptionQueue] = useState<string[]>([]);
  const [receptionQueueIndex, setReceptionQueueIndex] = useState<number>(-1);
  const [residentDetailVisible, setResidentDetailVisible] = useState(false);
  const [indexForm, setIndexForm] = useState({
    anEau: '',
    niEau: '',
    anElec: '',
    niElec: '',
    statutPresence: 'PRESENT' as 'PRESENT' | 'ABSENT',
    amendeEau: false,
  });
  const desktopBridge = useMemo(() => getDesktopBridge(), []);

  useEffect(() => {
    setContractRegistry(getContractEntryFromStorage());
  }, []);

  useEffect(() => {
    saveContractEntryToStorage(contractRegistry);
  }, [contractRegistry]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const listings = await listMarketplaceListings();
        if (mounted) setMarketplaceListings(listings);
      } catch (error) {
        console.warn('Marketplace load failed', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const charges = await listCommonCharges();
        if (mounted) setCommonCharges(charges);
      } catch (error) {
        console.warn('Common charges load failed', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMaintenanceTickets(getMaintenanceTicketsFromStorage());
  }, []);

  useEffect(() => {
    saveMaintenanceTicketsToStorage(maintenanceTickets);
  }, [maintenanceTickets]);

  useEffect(() => {
    setDocumentRegistry(getDocumentsFromStorage());
  }, []);

  useEffect(() => {
    saveDocumentsToStorage(documentRegistry);
  }, [documentRegistry]);

  const selectedPortfolio = metrics.portfolioRows.find((row) => row.room === selectedPortfolioRoom) ?? null;
  const selectedBillingInvoice = metrics.invoices.find((invoice) => invoice.roomNumber === selectedBillingRoom) ?? null;
  const selectedPayment = metrics.paymentRows.find((payment) => String(payment.id) === selectedPaymentRow) ?? null;
  const selectedContract = metrics.contractRows.find((row) => row.room === selectedContractRoom) ?? null;
  const maintenanceRowsMerged = useMemo(() => [
    ...maintenanceTickets,
    ...metrics.maintenanceRows.map((row) => ({ ...row, source: 'derived' as const })),
  ], [maintenanceTickets, metrics.maintenanceRows]);
  const selectedMaintenance = maintenanceRowsMerged.find((row) => row.key === selectedMaintenanceKey) ?? null;
  const selectedDocument = documentRegistry.find((entry) => entry.key === selectedDocumentKey) ?? null;
  const selectedBroadcast = metrics.broadcastRows.find((row) => row.room === selectedBroadcastRoom) ?? null;
  const selectedReception = metrics.recentRooms.find((room) => room.numeroChambre === selectedReceptionRoom) ?? null;
  const selectedPortfolioRoomEntity = metrics.rooms.find((room) => room.numeroChambre === selectedPortfolioRoom) ?? null;
  const selectedPortfolioResident = selectedPortfolioRoomEntity
    ? metrics.residents.find((resident) => resident.currentRoomId === selectedPortfolioRoomEntity.id) ?? null
    : null;
  const selectedContractRoomEntity = metrics.rooms.find((room) => room.numeroChambre === selectedContractRoom) ?? null;
  const selectedContractResident = selectedContractRoomEntity
    ? metrics.residents.find((resident) => resident.currentRoomId === selectedContractRoomEntity.id) ?? null
    : null;
  const selectedContractInvoice = selectedContractRoomEntity
    ? metrics.invoices.find((invoice) => invoice.roomId === selectedContractRoomEntity.id) ?? null
    : null;
  const selectedMaintenanceRoomEntity = selectedMaintenance
    ? metrics.rooms.find((room) => room.numeroChambre === selectedMaintenance.room) ?? null
    : null;
  const selectedMaintenanceInvoice = selectedMaintenanceRoomEntity
    ? metrics.invoices.find((invoice) => invoice.roomId === selectedMaintenanceRoomEntity.id) ?? null
    : null;
  const selectedMaintenanceResident = selectedMaintenanceRoomEntity
    ? metrics.residents.find((resident) => resident.currentRoomId === selectedMaintenanceRoomEntity.id) ?? null
    : null;
  const selectedReceptionResident = selectedReception
    ? metrics.residents.find((resident) => resident.currentRoomId === selectedReception.id) ?? null
    : null;
  const selectedContractEntry = useMemo<ContractRegistryEntry | null>(() => {
    if (!selectedContractRoomEntity) {
      return null;
    }
    const saved = contractRegistry[selectedContractRoomEntity.numeroChambre];
    if (saved) {
      return saved;
    }
    const start = formatDateInput(new Date(selectedContractRoomEntity.createdAt));
    const end = formatDateInput(addMonths(new Date(selectedContractRoomEntity.createdAt), 12));
    return {
      startDate: start,
      endDate: end,
      monthlyRent: selectedContractInvoice ? String(Math.round(selectedContractInvoice.totalFacture)) : '',
      depositAmount: selectedContractInvoice ? String(Math.round(selectedContractInvoice.netAPayer * 0.5)) : '',
      status: selectedContractResident ? 'ACTIF' : 'BROUILLON',
      signatureMode: 'PREAPPosee',
      autoRenew: true,
      notes: selectedContractResident
        ? `Contrat lie a ${selectedContractResident.nom} ${selectedContractResident.prenom}`.trim()
        : 'Contrat a completer apres affectation du resident.',
    };
  }, [contractRegistry, selectedContractInvoice, selectedContractResident, selectedContractRoomEntity]);
  const selectedBillingResident = selectedBillingInvoice
    ? metrics.residents.find((resident) => resident.currentRoomId === selectedBillingInvoice.roomId) ?? null
    : null;
  const selectedBillingPayments = selectedBillingInvoice
    ? metrics.payments.filter((payment) => payment.invoiceId === selectedBillingInvoice.id)
    : [];
  const selectedBillingPaidAmount = selectedBillingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const selectedBillingRemaining = selectedBillingInvoice
    ? Math.max(0, selectedBillingInvoice.netAPayer - selectedBillingPaidAmount)
    : 0;
  const selectedBillingPhase = selectedBillingInvoice
    ? selectedBillingRemaining <= 0
      ? 'Soldee'
      : selectedBillingInvoice.statutEnvoi === 'ENVOYE'
        ? 'En recouvrement'
        : selectedBillingInvoice.statutEnvoi === 'ERREUR'
          ? 'Diffusion en erreur'
          : 'A diffuser'
    : '-';
  const selectedBillingTimeline = useMemo(() => {
    const entries: string[] = [];
    if (!selectedBillingInvoice) {
      return entries;
    }
    entries.push(`Facture calculee - ${String(selectedBillingInvoice.calculeeLe).slice(0, 10)}`);
    entries.push(`Statut diffusion - ${selectedBillingInvoice.statutEnvoi}`);
    if ((selectedBillingInvoice.dette ?? 0) > 0) {
      entries.push(`Dette reportee - ${Math.round(selectedBillingInvoice.dette ?? 0).toLocaleString('fr-FR')} FCFA`);
    }
    selectedBillingPayments.forEach((payment) => {
      entries.push(`Paiement - ${payment.paidAt} / ${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`);
    });
    entries.push(`Solde courant - ${Math.round(selectedBillingRemaining).toLocaleString('fr-FR')} FCFA`);
    return entries;
  }, [selectedBillingInvoice, selectedBillingPayments, selectedBillingRemaining]);
  const selectedRoomEntity = selectedReception ?? selectedPortfolioRoomEntity ?? selectedContractRoomEntity ?? selectedMaintenanceRoomEntity;
  const selectedRoomReading = selectedRoomEntity
    ? metrics.readings.find((reading) => reading.roomId === selectedRoomEntity.id) ?? null
    : null;
  const selectedRoomPayments = selectedRoomEntity
    ? metrics.payments.filter((payment) => payment.roomId === selectedRoomEntity.id).slice(0, 3)
    : [];
  const activeResident = selectedPortfolioResident ?? selectedReceptionResident ?? selectedBillingResident ?? selectedContractResident ?? selectedMaintenanceResident ?? null;
  const activeResidentRoom = activeResident
    ? metrics.rooms.find((room) => room.id === activeResident.currentRoomId) ?? null
    : null;
  const activeResidentInvoices = activeResidentRoom
    ? metrics.invoices.filter((invoice) => invoice.roomId === activeResidentRoom.id)
    : [];
  const activeResidentPayments = activeResidentRoom
    ? metrics.payments.filter((payment) => payment.roomId === activeResidentRoom.id)
    : [];
  const activeResidentOutstanding = activeResidentInvoices.reduce((sum, invoice) => sum + invoice.netAPayer, 0)
    - activeResidentPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const activeResidentTimeline = useMemo(() => {
    const entries: string[] = [];
    if (!activeResident) {
      return entries;
    }
    entries.push(`Resident actif - ${`${activeResident.nom} ${activeResident.prenom}`.trim()}`);
    if (activeResidentRoom) {
      entries.push(`Chambre courante - ${activeResidentRoom.numeroChambre}`);
    }
    activeResidentInvoices.forEach((invoice) => {
      entries.push(`Facture - ${invoice.roomNumber} / ${Math.round(invoice.netAPayer).toLocaleString('fr-FR')} FCFA / ${invoice.statutEnvoi}`);
    });
    activeResidentPayments.forEach((payment) => {
      entries.push(`Paiement - ${payment.paidAt} / ${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`);
    });
    return entries;
  }, [activeResident, activeResidentInvoices, activeResidentPayments, activeResidentRoom]);
  const selectedRoomInvoice = selectedRoomEntity
    ? metrics.invoices.find((invoice) => invoice.roomId === selectedRoomEntity.id) ?? null
    : null;
  const selectedRoomOccupancy = selectedRoomEntity
    ? activeResident
      ? 'Occupee'
      : selectedRoomEntity.actif
        ? 'Disponible'
        : 'Inactive'
    : '-';
  const selectedRoomTimeline = useMemo(() => {
    const entries: string[] = [];
    if (selectedRoomEntity) {
      entries.push(`Creation chambre - ${String(selectedRoomEntity.createdAt).slice(0, 10)}`);
    }
    if (activeResident) {
      entries.push(`Resident actif - ${`${activeResident.nom} ${activeResident.prenom}`.trim()}`);
    }
    if (selectedRoomReading) {
      entries.push(`Releve du mois - eau ${selectedRoomReading.anEau}->${selectedRoomReading.niEau}, elec ${selectedRoomReading.anElec}->${selectedRoomReading.niElec}`);
    }
    if (selectedRoomInvoice) {
      entries.push(`Facture calculee - ${String(selectedRoomInvoice.calculeeLe).slice(0, 10)} / ${Math.round(selectedRoomInvoice.netAPayer).toLocaleString('fr-FR')} FCFA`);
    }
    selectedRoomPayments.forEach((payment) => {
      entries.push(`Paiement - ${payment.paidAt} / ${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`);
    });
    return entries;
  }, [activeResident, selectedRoomEntity, selectedRoomInvoice, selectedRoomPayments, selectedRoomReading]);
  const filteredPortfolioRows = useMemo(() => metrics.portfolioRows.filter((row) => {
    if (portfolioFilter === 'pending') {
      return row.status === 'En attente';
    }
    if (portfolioFilter === 'indexed') {
      return row.status === 'Releve saisi';
    }
    return true;
  }), [metrics.portfolioRows, portfolioFilter]);
  const filteredInvoices = useMemo(() => metrics.invoices
    .slice()
    .sort((left, right) => right.netAPayer - left.netAPayer)
    .filter((invoice) => {
      if (billingFilter === 'non_envoye') {
        return invoice.statutEnvoi === 'NON_ENVOYE';
      }
      if (billingFilter === 'envoye') {
        return invoice.statutEnvoi === 'ENVOYE';
      }
      if (billingFilter === 'erreur') {
        return invoice.statutEnvoi === 'ERREUR';
      }
      return true;
    }), [billingFilter, metrics.invoices]);
  const filteredPaymentRows = useMemo(() => metrics.paymentRows.filter((payment) => {
    if (paymentFilter === 'with_note') {
      return Boolean(payment.note?.trim());
    }
    if (paymentFilter === 'without_note') {
      return !payment.note?.trim();
    }
    return true;
  }), [metrics.paymentRows, paymentFilter]);
  const filteredContractRows = useMemo(() => metrics.contractRows.filter((row) => {
    if (contractFilter === 'complete') {
      return row.status === 'Actif';
    }
    if (contractFilter === 'attention') {
      return row.status === 'Actif avec solde' || row.renewal === 'A surveiller' || row.renewal === 'Renouvellement urgent';
    }
    if (contractFilter === 'missing') {
      return row.status === 'A completer';
    }
    return true;
  }), [contractFilter, metrics.contractRows]);
  const filteredMaintenanceRows = useMemo(() => maintenanceRowsMerged.filter((row) => {
    if (maintenanceFilter === 'high') {
      return row.priority === 'Haute';
    }
    if (maintenanceFilter === 'open') {
      return row.status === 'Ouvert' || row.status === 'Action requise';
    }
    if (maintenanceFilter === 'followup') {
      return row.status === 'Suivi' || row.status === 'Controle';
    }
    return true;
  }), [maintenanceFilter, maintenanceRowsMerged]);
  const filteredBroadcastRows = useMemo(() => metrics.broadcastRows.filter((invoice) => {
    if (broadcastFilter === 'non_envoye') {
      return invoice.status === 'NON_ENVOYE';
    }
    if (broadcastFilter === 'envoye') {
      return invoice.status === 'ENVOYE';
    }
    if (broadcastFilter === 'erreur') {
      return invoice.status === 'ERREUR';
    }
    return true;
  }), [broadcastFilter, metrics.broadcastRows]);
  const filteredReceptionRooms = useMemo(() => metrics.recentRooms.filter((room) => {
    if (receptionFilter === 'active') {
      return room.actif;
    }
    if (receptionFilter === 'inactive') {
      return !room.actif;
    }
    return true;
  }), [metrics.recentRooms, receptionFilter]);
  const nextPendingPortfolioRow = useMemo(
    () => filteredPortfolioRows.find((row) => row.status === 'En attente') ?? filteredPortfolioRows[0] ?? null,
    [filteredPortfolioRows],
  );
  const nextBroadcastPendingRow = useMemo(
    () => filteredBroadcastRows.find((row) => row.status === 'NON_ENVOYE') ?? filteredBroadcastRows[0] ?? null,
    [filteredBroadcastRows],
  );
  const nextBroadcastErrorRow = useMemo(
    () => filteredBroadcastRows.find((row) => row.status === 'ERREUR') ?? null,
    [filteredBroadcastRows],
  );
  const nextReceptionRoom = useMemo(
    () => filteredReceptionRooms[0] ?? null,
    [filteredReceptionRooms],
  );
  const receptionChecklist = useMemo(() => {
    if (!selectedReception) {
      return [];
    }
    return [
      {
        label: 'Resident principal',
        state: selectedReceptionResident ? 'OK' : 'MANQUANT',
      },
      {
        label: 'Bloc renseigne',
        state: selectedReception.bloc ? 'OK' : 'MANQUANT',
      },
      {
        label: 'Releve du mois',
        state: selectedRoomReading ? 'OK' : 'A_SAISIR',
      },
      {
        label: 'Chambre active',
        state: selectedReception.actif ? 'OK' : 'INACTIVE',
      },
    ];
  }, [selectedReception, selectedReceptionResident, selectedRoomReading]);
  const activeTerrainQueueRoom = terrainQueueIndex >= 0 ? terrainQueue[terrainQueueIndex] ?? null : null;
  const remainingTerrainQueueCount = terrainQueueIndex >= 0 ? Math.max(0, terrainQueue.length - terrainQueueIndex - 1) : 0;
  const activeBroadcastQueueRoom = broadcastQueueIndex >= 0 ? broadcastQueue[broadcastQueueIndex] ?? null : null;
  const remainingBroadcastQueueCount = broadcastQueueIndex >= 0 ? Math.max(0, broadcastQueue.length - broadcastQueueIndex - 1) : 0;
  const activeReceptionQueueRoom = receptionQueueIndex >= 0 ? receptionQueue[receptionQueueIndex] ?? null : null;
  const remainingReceptionQueueCount = receptionQueueIndex >= 0 ? Math.max(0, receptionQueue.length - receptionQueueIndex - 1) : 0;
  const managerAlerts = useMemo(() => {
    const alerts: { key: string; title: string; detail: string; actionLabel: string; onPress: () => void }[] = [];
    const missingReadings = metrics.portfolioRows.filter((row) => row.status === 'En attente').length;
    const unsentInvoices = metrics.invoices.filter((invoice) => invoice.statutEnvoi !== 'ENVOYE').length;
    const urgentRenewals = metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length;
    const openIncidents = maintenanceRowsMerged.filter((row) => row.priority === 'Haute' || row.status === 'Ouvert' || row.status === 'Action requise').length;
    const outstanding = Math.max(0, metrics.totalDue - metrics.totalPaid);

    if (missingReadings > 0) {
      alerts.push({
        key: 'missing-readings',
        title: 'Releves en attente',
        detail: `${missingReadings} chambres actives n ont pas encore de releve pour le mois courant.`,
        actionLabel: 'Ouvrir logements',
        onPress: () => setManagerPage('portfolio'),
      });
    }
    if (unsentInvoices > 0) {
      alerts.push({
        key: 'unsent-invoices',
        title: 'Factures non diffusees',
        detail: `${unsentInvoices} factures restent a diffuser ou corriger.`,
        actionLabel: 'Ouvrir facturation',
        onPress: () => setManagerPage('billing'),
      });
    }
    if (outstanding > 0) {
      alerts.push({
        key: 'outstanding-balance',
        title: 'Recouvrement a suivre',
        detail: `${Math.round(outstanding).toLocaleString('fr-FR')} FCFA restent a encaisser sur le mois.`,
        actionLabel: 'Ouvrir paiements',
        onPress: () => setManagerPage('payments'),
      });
    }
    if (urgentRenewals > 0) {
      alerts.push({
        key: 'urgent-renewals',
        title: 'Renouvellements urgents',
        detail: `${urgentRenewals} contrats approchent de leur seuil de renouvellement.`,
        actionLabel: 'Ouvrir contrats',
        onPress: () => setManagerPage('contracts'),
      });
    }
    if (openIncidents > 0) {
      alerts.push({
        key: 'open-incidents',
        title: 'Incidents prioritaires',
        detail: `${openIncidents} tickets ou incidents demandent une action gestionnaire.`,
        actionLabel: 'Ouvrir maintenance',
        onPress: () => setManagerPage('maintenance'),
      });
    }

    return alerts.slice(0, 4);
  }, [maintenanceRowsMerged, metrics.contractRows, metrics.invoices, metrics.paymentCount, metrics.portfolioRows, metrics.totalDue, metrics.totalPaid]);
  const managerFocusRows = useMemo(() => [
    {
      key: 'focus-portfolio',
      label: 'Couverture releves',
      value: `${metrics.indexedRooms}/${metrics.activeRooms || metrics.totalRooms}`,
      detail: metrics.activeRooms > 0
        ? `${Math.round((metrics.indexedRooms / metrics.activeRooms) * 100)}% des logements actifs couverts`
        : 'Aucun logement actif',
    },
    {
      key: 'focus-billing',
      label: 'Diffusion du mois',
      value: `${metrics.invoicesSent}/${metrics.invoicesCalculated}`,
      detail: metrics.invoicesCalculated > 0
        ? `${Math.round((metrics.invoicesSent / metrics.invoicesCalculated) * 100)}% des factures diffusees`
        : 'Aucune facture calculee',
    },
    {
      key: 'focus-contracts',
      label: 'Contrats a risque',
      value: `${metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent' || row.status === 'A completer').length}`,
      detail: `${metrics.contractRows.filter((row) => row.status === 'A completer').length} a completer / ${metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length} urgents`,
    },
    {
      key: 'focus-maintenance',
      label: 'Incidents ouverts',
      value: `${maintenanceRowsMerged.length}`,
      detail: `${maintenanceRowsMerged.filter((row) => row.priority === 'Haute').length} priorites hautes`,
    },
  ], [maintenanceRowsMerged, metrics.activeRooms, metrics.contractRows, metrics.indexedRooms, metrics.invoicesCalculated, metrics.invoicesSent, metrics.totalRooms]);
  const conciergeAlerts = useMemo(() => {
    const alerts: { key: string; title: string; detail: string; actionLabel: string; onPress: () => void }[] = [];
    const missingReadings = metrics.portfolioRows.filter((row) => row.status === 'En attente').length;
    const unsentInvoices = metrics.broadcastRows.filter((row) => row.status === 'NON_ENVOYE').length;
    const failedInvoices = metrics.broadcastRows.filter((row) => row.status === 'ERREUR').length;
    const newRooms = metrics.recentRooms.slice(0, 5).length;

    if (missingReadings > 0) {
      alerts.push({
        key: 'concierge-readings',
        title: 'Tournee releves a finir',
        detail: `${missingReadings} chambres attendent encore une saisie terrain.`,
        actionLabel: 'Ouvrir terrain',
        onPress: () => setConciergePage('terrain'),
      });
    }
    if (unsentInvoices > 0) {
      alerts.push({
        key: 'concierge-broadcast',
        title: 'Factures a diffuser',
        detail: `${unsentInvoices} factures sont pretes mais non envoyees.`,
        actionLabel: 'Ouvrir diffusion',
        onPress: () => setConciergePage('broadcast'),
      });
    }
    if (failedInvoices > 0) {
      alerts.push({
        key: 'concierge-errors',
        title: 'Erreurs de diffusion',
        detail: `${failedInvoices} factures ont besoin d une reprise ou d une verification contact.`,
        actionLabel: 'Verifier diffusion',
        onPress: () => setConciergePage('broadcast'),
      });
    }
    if (newRooms > 0) {
      alerts.push({
        key: 'concierge-reception',
        title: 'Reception a verifier',
        detail: `${newRooms} chambres recentes sont visibles au front desk.`,
        actionLabel: 'Ouvrir reception',
        onPress: () => setConciergePage('reception'),
      });
    }

    return alerts.slice(0, 4);
  }, [metrics.broadcastRows, metrics.portfolioRows, metrics.recentRooms]);
  const conciergeFocusRows = useMemo(() => [
    {
      key: 'concierge-focus-readings',
      label: 'Couverture terrain',
      value: `${metrics.indexedRooms}/${metrics.activeRooms || metrics.totalRooms}`,
      detail: metrics.activeRooms > 0
        ? `${Math.round((metrics.indexedRooms / metrics.activeRooms) * 100)}% des logements actifs couverts`
        : 'Aucun logement actif',
    },
    {
      key: 'concierge-focus-broadcast',
      label: 'Factures envoyees',
      value: `${metrics.invoicesSent}/${metrics.invoicesCalculated}`,
      detail: metrics.invoicesCalculated > 0
        ? `${Math.round((metrics.invoicesSent / metrics.invoicesCalculated) * 100)}% de diffusion accomplie`
        : 'Aucune facture calculee',
    },
    {
      key: 'concierge-focus-errors',
      label: 'Envois en erreur',
      value: `${metrics.broadcastRows.filter((row) => row.status === 'ERREUR').length}`,
      detail: `${metrics.broadcastRows.filter((row) => row.status === 'NON_ENVOYE').length} encore en attente`,
    },
    {
      key: 'concierge-focus-reception',
      label: 'Reception recente',
      value: `${metrics.recentRooms.length}`,
      detail: `${metrics.recentRooms.filter((room) => room.actif).length} chambres actives visibles`,
    },
  ], [metrics.activeRooms, metrics.broadcastRows, metrics.indexedRooms, metrics.invoicesCalculated, metrics.invoicesSent, metrics.recentRooms, metrics.totalRooms]);

  const runExport = async (
    key: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      setExportingKey(key);
      await action();
      Alert.alert('MyHouse', successMessage);
    } catch (error) {
      console.error(`Export ${key} failed`, error);
      Alert.alert('MyHouse', 'Impossible de generer cet export pour le moment.');
    } finally {
      setExportingKey((current) => (current === key ? null : current));
    }
  };

  const overview = useMemo(() => {
    if (activeRole === 'manager') {
      return {
        title: 'Dashboard gestionnaire',
        subtitle: 'Pilotage des logements, de la facturation, des paiements et de l exploitation.',
        kpis: [
          { value: `${metrics.activeRooms}`, label: 'Logements actifs', hint: `${metrics.totalRooms} logements en base.` },
          { value: `${metrics.occupancyRate}%`, label: 'Occupation estimee', hint: `${metrics.indexedRooms} releves saisis.` },
          { value: `${Math.round(metrics.totalDue).toLocaleString('fr-FR')} FCFA`, label: 'Net a payer', hint: `${metrics.invoicesCalculated} factures calculees.` },
          { value: `${Math.round(metrics.totalPaid).toLocaleString('fr-FR')} FCFA`, label: 'Encaissements', hint: `${metrics.paymentCount} paiements enregistres.` },
        ],
        priorities: [
          { title: 'Saisie des releves', owner: 'Operations', status: metrics.monthConfigured ? 'Actif' : 'Config', progress: metrics.activeRooms > 0 ? Math.round((metrics.indexedRooms / metrics.activeRooms) * 100) : 0 },
          { title: 'Diffusion des factures', owner: 'Recouvrement', status: metrics.invoicesSent > 0 ? 'En cours' : 'Pret', progress: metrics.invoicesCalculated > 0 ? Math.round((metrics.invoicesSent / metrics.invoicesCalculated) * 100) : 0 },
          { title: 'Encaissement du mois', owner: 'Finance', status: metrics.totalPaid > 0 ? 'Actif' : 'Demarrage', progress: metrics.totalDue > 0 ? Math.min(100, Math.round((metrics.totalPaid / metrics.totalDue) * 100)) : 0 },
        ],
        tableTitle: 'Plus fortes expositions',
        tableDescription: 'Top des factures a surveiller sur le mois courant.',
        tableColumns: [
          { key: 'room', label: 'Chambre' },
          { key: 'due', label: 'Net a payer', align: 'right' as const },
          { key: 'status', label: 'Envoi' },
        ],
        tableRows: metrics.topDueInvoices.map((invoice) => ({
          room: invoice.roomNumber,
          due: `${Math.round(invoice.netAPayer).toLocaleString('fr-FR')} FCFA`,
          status: invoice.statutEnvoi,
        })),
      };
    }

    if (activeRole === 'concierge') {
      return {
        title: 'Poste concierge',
        subtitle: 'Suivi terrain, diffusion des factures et reception operationnelle.',
        kpis: [
          { value: `${metrics.indexedRooms}/${metrics.activeRooms || metrics.totalRooms}`, label: 'Releves saisis', hint: 'Progression terrain du mois courant.' },
          { value: `${metrics.invoicesSent}`, label: 'Factures diffusees', hint: 'Suivi des envois WhatsApp.' },
          { value: `${metrics.recentRooms.length}`, label: 'Dernieres chambres', hint: 'Entrees recentes du portefeuille.' },
        ],
        priorities: [
          { title: 'Releves du mois', owner: 'Concierge', status: 'Terrain', progress: metrics.activeRooms > 0 ? Math.round((metrics.indexedRooms / metrics.activeRooms) * 100) : 0 },
          { title: 'Mises a jour chambres', owner: 'Reception', status: metrics.recentRooms.length > 0 ? 'Actif' : 'Calme', progress: metrics.recentRooms.length > 0 ? 68 : 20 },
          { title: 'Configuration mensuelle', owner: 'Backoffice', status: metrics.monthConfigured ? 'Disponible' : 'Absente', progress: metrics.monthConfigured ? 100 : 10 },
        ],
        tableTitle: 'Dernieres chambres enregistrees',
        tableDescription: 'Lecture reception et supervision terrain.',
        tableColumns: [
          { key: 'room', label: 'Chambre' },
          { key: 'active', label: 'Etat' },
          { key: 'created', label: 'Creee le' },
        ],
        tableRows: metrics.recentRooms.map((room) => ({
          room: room.numeroChambre,
          active: room.actif ? 'Active' : 'Inactive',
          created: String(room.createdAt).slice(0, 10),
        })),
      };
    }

    return {
      title: 'Workspace MyHouse',
      subtitle: 'Espace de travail specialise du role courant.',
      kpis: [
        { value: `${metrics.totalRooms}`, label: 'Actifs connus', hint: 'Portefeuille local consolidable.' },
        { value: `${metrics.invoicesCalculated}`, label: 'Factures du mois', hint: 'Volume courant visible.' },
        { value: `${Math.round(metrics.totalDue).toLocaleString('fr-FR')} FCFA`, label: 'Revenus visibles', hint: 'Net a payer observe.' },
      ],
      priorities: [
        { title: 'Portefeuille produit', owner: 'Direction', status: 'Actif', progress: metrics.totalRooms > 0 ? 82 : 10 },
        { title: 'Recette observable', owner: 'Finance', status: metrics.totalDue > 0 ? 'Visible' : 'Vide', progress: metrics.totalDue > 0 ? Math.min(100, Math.round((metrics.totalPaid / metrics.totalDue) * 100)) : 0 },
      ],
      tableTitle: 'Synthese portefeuille',
      tableDescription: 'Vue groupe issue des donnees disponibles.',
      tableColumns: [
        { key: 'metric', label: 'Indicateur' },
        { key: 'value', label: 'Valeur', align: 'right' as const },
      ],
      tableRows: [
        { metric: 'Logements actifs', value: `${metrics.activeRooms}` },
        { metric: 'Releves du mois', value: `${metrics.indexedRooms}` },
        { metric: 'Paiements enregistres', value: `${metrics.paymentCount}` },
      ],
    };
  }, [activeRole, metrics]);

  const activePage = activeRole === 'manager'
    ? managerPage
    : activeRole === 'concierge'
      ? conciergePage
      : genericPage;

  const setActivePage = (nextPage: string) => {
    if (activeRole === 'manager') {
      setManagerPage(nextPage as ManagerPage);
      return;
    }

    if (activeRole === 'concierge') {
      setConciergePage(nextPage as ConciergePage);
      return;
    }

    setGenericPage(nextPage as GenericPage);
  };

  const currentPageMeta = useMemo(() => {
    if (activeRole === 'manager') {
      if (activePage === 'portfolio') {
        return {
          title: 'Logements',
          subtitle: 'Page dediee au portefeuille, aux chambres actives et aux releves du mois.',
        };
      }
      if (activePage === 'billing') {
        return {
          title: 'Facturation',
          subtitle: 'Page dediee au cycle mensuel, aux relances et aux montants a surveiller.',
        };
      }
      if (activePage === 'payments') {
        return {
          title: 'Paiements',
          subtitle: 'Page dediee aux encaissements, aux notes et au rapprochement comptable.',
        };
      }
      if (activePage === 'contracts') {
        return {
          title: 'Contrats',
          subtitle: 'Page dediee aux residents, au suivi d occupation et aux alertes de renouvellement.',
        };
      }
      if (activePage === 'maintenance') {
        return {
          title: 'Maintenance',
          subtitle: 'Page dediee aux incidents d exploitation, aux anomalies de releves et aux suivis a traiter.',
        };
      }
      if (activePage === 'reports') {
        return {
          title: 'Rapports',
          subtitle: 'Page dediee au pilotage exportable, aux syntheses du mois et aux vues de direction.',
        };
      }
      if (activePage === 'documents') {
        return {
          title: 'Documents',
          subtitle: 'Page dediee aux contrats exportables, pieces locatives, PV et documents d exploitation.',
        };
      }
      if (activePage === 'marketplace') {
        return {
          title: 'Marketplace',
          subtitle: 'Publication d annonces, medias, abonnements et transactions immobilieres.',
        };
      }
      if (activePage === 'commonCharges') {
        return {
          title: 'Charges communes',
          subtitle: 'Configuration des charges communes par residence, bloc ou chambre.',
        };
      }
    }

    if (activeRole === 'concierge') {
      if (activePage === 'terrain') {
        return {
          title: 'Terrain',
          subtitle: 'Page dediee aux releves, a la couverture des chambres et aux tournees du mois.',
        };
      }
      if (activePage === 'broadcast') {
        return {
          title: 'Diffusion',
          subtitle: 'Page dediee aux envois, aux relances et au suivi WhatsApp.',
        };
      }
      if (activePage === 'reception') {
        return {
          title: 'Reception',
          subtitle: 'Page dediee a l accueil, aux nouvelles chambres et au controle de coherence.',
        };
      }
    }

    if (activePage === 'workspace') {
      return {
        title: 'Poste metier',
        subtitle: 'Espace specialise pour le role courant, organise en pages plutot qu en blocs satures.',
      };
    }

    if (activePage === 'delivery') {
      return {
        title: 'Surface produit',
        subtitle: 'Lecture du runtime bureau, web et mobile depuis un seul noyau MyHouse.',
      };
    }

    return {
      title: overview.title,
      subtitle: overview.subtitle,
    };
  }, [activePage, activeRole, overview.subtitle, overview.title]);

  const openExternal = async (url: string) => {
    try {
      if (desktopBridge) {
        await desktopBridge.openExternal(url);
        return;
      }

      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Open external failed', error);
      Alert.alert('MyHouse', 'Impossible d ouvrir ce lien pour le moment.');
    }
  };

  const openWhatsAppConversation = async (phone: string | null | undefined) => {
    if (!phone?.trim()) {
      Alert.alert('MyHouse', 'Aucun numero WhatsApp disponible pour cette action.');
      return;
    }
    const normalized = phone.replace(/[^\d]/g, '');
    await openExternal(`https://wa.me/${normalized}`);
  };

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      setBusyAction(key);
      await action();
      reload();
      Alert.alert('MyHouse', successMessage);
    } catch (error) {
      console.error(`Action ${key} failed`, error);
      Alert.alert('MyHouse', 'Impossible d executer cette action pour le moment.');
    } finally {
      setBusyAction((current) => (current === key ? null : current));
    }
  };

  const pageCards = useMemo<PageDescriptor[]>(() => {
    if (activeRole === 'manager') {
      return [
        {
          key: 'portfolio',
          title: 'Logements',
          description: 'Suivre les chambres, les residents actifs et les releves du mois sans surcharge visuelle.',
          bullets: [
            `${metrics.activeRooms} logements actifs`,
            `${metrics.indexedRooms} releves saisis`,
            selectedPortfolio ? `selection en cours: ${selectedPortfolio.room}` : 'aucune chambre ouverte',
          ],
          actionLabel: 'Ouvrir logements',
          onPress: () => setManagerPage('portfolio'),
        },
        {
          key: 'billing',
          title: 'Facturation',
          description: 'Traiter le cycle mensuel sur une page dediee avec les factures a surveiller et les exports.',
          bullets: [
            `${metrics.invoicesCalculated} factures calculees`,
            `${metrics.invoicesSent} diffusees`,
            `${Math.round(metrics.totalDue).toLocaleString('fr-FR')} FCFA a couvrir`,
          ],
          actionLabel: 'Ouvrir facturation',
          onPress: () => setManagerPage('billing'),
        },
        {
          key: 'payments',
          title: 'Paiements',
          description: 'Lire les encaissements recents et suivre le rapprochement sans rester sur un ecran unique.',
          bullets: [
            `${metrics.paymentCount} paiements enregistres`,
            `${Math.round(metrics.totalPaid).toLocaleString('fr-FR')} FCFA encaisses`,
            `${Math.round(Math.max(0, metrics.totalDue - metrics.totalPaid)).toLocaleString('fr-FR')} FCFA restants`,
          ],
          actionLabel: 'Ouvrir paiements',
          onPress: () => setManagerPage('payments'),
        },
        {
          key: 'contracts',
          title: 'Contrats',
          description: 'Suivre les occupants, les contrats a completer et les renouvellements a surveiller.',
          bullets: [
            `${metrics.contractRows.filter((row) => row.status !== 'A completer').length} contrats actifs`,
            `${metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length} renouvellements urgents`,
            `${metrics.contractRows.filter((row) => row.status === 'A completer').length} chambres a completer`,
          ],
          actionLabel: 'Ouvrir contrats',
          onPress: () => setManagerPage('contracts'),
        },
        {
          key: 'maintenance',
          title: 'Maintenance',
          description: 'Regrouper les incidents d exploitation, les anomalies de diffusion et les actions urgentes.',
          bullets: [
            `${metrics.maintenanceRows.length} incidents visibles`,
            `${metrics.maintenanceRows.filter((row) => row.priority === 'Haute').length} priorites hautes`,
            `${metrics.maintenanceRows.filter((row) => row.status === 'Ouvert' || row.status === 'Action requise').length} actions immediates`,
          ],
          actionLabel: 'Ouvrir maintenance',
          onPress: () => setManagerPage('maintenance'),
        },
        {
          key: 'reports',
          title: 'Rapports',
          description: 'Centraliser les syntheses du mois, les exports et la lecture directionnelle du portefeuille.',
          bullets: [
            `${metrics.reportRows.length} indicateurs consolides`,
            `${Math.round(metrics.totalPaid).toLocaleString('fr-FR')} FCFA encaisses`,
            `${Math.round(metrics.totalDue).toLocaleString('fr-FR')} FCFA factures`,
          ],
          actionLabel: 'Ouvrir rapports',
          onPress: () => setManagerPage('reports'),
        },
        {
          key: 'documents',
          title: 'Documents',
          description: 'Gerer les contrats, pieces locatives, PV et documents lies aux chambres et residents.',
          bullets: [
            `${documentRegistry.length} documents enregistres`,
            `${documentRegistry.filter((entry) => entry.status === 'A_SIGNER').length} a signer`,
            `${documentRegistry.filter((entry) => entry.type === 'CONTRAT').length} contrats documentes`,
          ],
          actionLabel: 'Ouvrir documents',
          onPress: () => setManagerPage('documents'),
        },
        {
          key: 'marketplace',
          title: 'Marketplace',
          description: 'Publication d annonces, medias et suivi des transactions.',
          bullets: [
            `${marketplaceListings.length} annonces visibles`,
            'geolocalisation OpenStreetMap',
            'commission automatique en cours',
          ],
          actionLabel: 'Ouvrir marketplace',
          onPress: () => setManagerPage('marketplace'),
        },
        {
          key: 'commonCharges',
          title: 'Charges communes',
          description: 'Gestion des charges communes par residence ou chambre.',
          bullets: [
            `${commonCharges.length} charges configurees`,
            'affectation par bloc ou chambre',
            'calcul automatique dans les factures',
          ],
          actionLabel: 'Ouvrir charges communes',
          onPress: () => setManagerPage('commonCharges'),
        },
      ];
    }

    if (activeRole === 'concierge') {
      return [
        {
          key: 'terrain',
          title: 'Terrain',
          description: 'Saisir les releves et verifier les chambres a couvrir sur une page reservee au terrain.',
          bullets: [
            `${metrics.indexedRooms}/${metrics.activeRooms || metrics.totalRooms} releves saisis`,
            metrics.monthConfigured ? 'mois configure' : 'mois a configurer',
            `${metrics.recentRooms.length} chambres recentes a verifier`,
          ],
          actionLabel: 'Ouvrir terrain',
          onPress: () => setConciergePage('terrain'),
        },
        {
          key: 'broadcast',
          title: 'Diffusion',
          description: 'Piloter les envois et les relances depuis une page dediee, sans melanger accueil et production.',
          bullets: [
            `${metrics.invoicesCalculated} factures calculees`,
            `${metrics.invoicesCalculated - metrics.invoicesSent} en attente`,
            selectedBroadcast ? `selection en cours: ${selectedBroadcast.room}` : 'aucune facture ouverte',
          ],
          actionLabel: 'Ouvrir diffusion',
          onPress: () => setConciergePage('broadcast'),
        },
        {
          key: 'reception',
          title: 'Reception',
          description: 'Verifier les nouvelles chambres, residents et saisies depuis une page de front desk.',
          bullets: [
            `${metrics.recentRooms.length} chambres recentes`,
            `${metrics.totalRooms} chambres totalisees`,
            selectedReception ? `selection en cours: ${selectedReception.numeroChambre}` : 'aucune fiche ouverte',
          ],
          actionLabel: 'Ouvrir reception',
          onPress: () => setConciergePage('reception'),
        },
      ];
    }

    return [
      {
        key: 'workspace',
        title: 'Poste metier',
        description: 'Continuer la specialisation du role courant avec des pages plus nettes et moins saturees.',
        bullets: [
          'structure bureau/web partagee',
          'donnees metier consolidables',
          'base unique mobile, web et desktop',
        ],
        actionLabel: 'Ouvrir le poste',
        onPress: () => setGenericPage('workspace'),
      },
    ];
  }, [
    activeRole,
    metrics.activeRooms,
    metrics.contractRows,
    metrics.indexedRooms,
    metrics.invoicesCalculated,
    metrics.invoicesSent,
    metrics.maintenanceRows,
    metrics.paymentCount,
    metrics.reportRows,
    metrics.recentRooms,
    metrics.monthConfigured,
    metrics.totalDue,
    metrics.totalPaid,
    metrics.totalRooms,
    documentRegistry,
    marketplaceListings,
    commonCharges,
    selectedBroadcast,
    selectedPortfolio,
    selectedReception,
  ]);

  const openPaymentModal = () => {
    if (!selectedBillingInvoice) {
      return;
    }
    setPaymentForm({ amount: '', note: '' });
    setPaymentModalVisible(true);
  };

  const openRoomEditModal = () => {
    const room = selectedReception ?? selectedPortfolioRoomEntity;
    if (!room) {
      return;
    }
    setRoomForm({
      numeroChambre: room.numeroChambre,
      bloc: room.bloc ?? '',
    });
    setRoomEditModalVisible(true);
  };

  const saveRoomFromModal = async () => {
    const room = selectedReception ?? selectedPortfolioRoomEntity;
    if (!room) {
      return;
    }
    const numeroChambre = roomForm.numeroChambre.trim();
    if (!numeroChambre) {
      Alert.alert('MyHouse', 'Le numero de chambre est obligatoire.');
      return;
    }
    await runAction(
      'edit-room',
      () => patchRoom(room.id, {
        numeroChambre,
        bloc: roomForm.bloc.trim() || null,
      }).then(() => undefined),
      `Chambre ${numeroChambre} mise a jour.`,
    );
    setRoomEditModalVisible(false);
    setSelectedPortfolioRoom(numeroChambre);
    setSelectedReceptionRoom(numeroChambre);
  };

  const openResidentEditModal = () => {
    const resident = selectedPortfolioResident ?? selectedReceptionResident ?? selectedBillingResident;
    if (!resident) {
      Alert.alert('MyHouse', 'Aucun resident lie a cette chambre.');
      return;
    }
    setResidentForm({
      nom: resident.nom,
      prenom: resident.prenom,
      whatsapp: resident.whatsapp ?? '',
      telephone: resident.telephone ?? '',
    });
    setResidentEditModalVisible(true);
  };

  const openContractEditModal = () => {
    if (!selectedContractRoomEntity || !selectedContractEntry) {
      Alert.alert('MyHouse', 'Selectionne un contrat pour continuer.');
      return;
    }
    setContractForm(selectedContractEntry);
    setContractEditModalVisible(true);
  };

  const saveContractFromModal = async () => {
    if (!selectedContractRoomEntity) {
      return;
    }
    if (!contractForm.startDate.trim() || !contractForm.endDate.trim()) {
      Alert.alert('MyHouse', 'Les dates de debut et de fin sont obligatoires.');
      return;
    }
    setContractRegistry((current) => ({
      ...current,
      [selectedContractRoomEntity.numeroChambre]: {
        ...contractForm,
        monthlyRent: contractForm.monthlyRent.trim(),
        depositAmount: contractForm.depositAmount.trim(),
        notes: contractForm.notes.trim(),
      },
    }));
    setContractEditModalVisible(false);
    Alert.alert('MyHouse', `Contrat ${selectedContractRoomEntity.numeroChambre} mis a jour.`);
  };

  const openMaintenanceCreateModal = () => {
    setMaintenanceForm({
      room: selectedMaintenance?.room ?? selectedContractRoom ?? selectedPortfolioRoom ?? selectedReceptionRoom ?? '',
      category: selectedMaintenance?.category ?? 'Maintenance',
      priority: 'Moyenne',
      status: 'OUVERT',
      assignee: '',
      summary: '',
      notes: '',
    });
    setMaintenanceModalVisible(true);
  };

  const openMaintenanceEditModal = () => {
    if (!selectedMaintenance) {
      Alert.alert('MyHouse', 'Selectionne un ticket ou un incident.');
      return;
    }
    setMaintenanceForm({
      room: selectedMaintenance.room,
      category: selectedMaintenance.category,
      priority: selectedMaintenance.priority as MaintenanceTicketPriority,
      status: selectedMaintenance.status === 'Action requise' || selectedMaintenance.status === 'Ouvert'
        ? 'OUVERT'
        : selectedMaintenance.status === 'Suivi' || selectedMaintenance.status === 'Controle'
          ? 'EN_COURS'
          : selectedMaintenance.status === 'Planifie'
            ? 'PLANIFIE'
            : 'RESOLU',
      assignee: '',
      summary: selectedMaintenance.summary,
      notes: '',
    });
    setMaintenanceModalVisible(true);
  };

  const saveMaintenanceFromModal = async () => {
    const room = maintenanceForm.room.trim();
    const summary = maintenanceForm.summary.trim();
    if (!room || !summary) {
      Alert.alert('MyHouse', 'La chambre et le resume du ticket sont obligatoires.');
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
    setMaintenanceTickets((current) => {
      const others = current.filter((entry) => entry.key !== nextEntry.key);
      return [nextEntry, ...others];
    });
    setSelectedMaintenanceKey(nextEntry.key);
    setMaintenanceModalVisible(false);
    Alert.alert('MyHouse', `Ticket maintenance ${room} enregistre.`);
  };

  const openDocumentCreateModal = () => {
    const roomNumber = selectedContractRoom
      ?? selectedPortfolioRoom
      ?? selectedReceptionRoom
      ?? selectedMaintenance?.room
      ?? '';
    const residentName = activeResident ? `${activeResident.nom} ${activeResident.prenom}`.trim() : '';
    setDocumentForm({
      room: roomNumber,
      resident: residentName,
      type: roomNumber && selectedContractEntry ? 'CONTRAT' : 'PIECE_LOCATIVE',
      title: roomNumber ? `Document ${roomNumber}` : '',
      status: 'BROUILLON',
      issuedOn: formatDateInput(new Date()),
      expiresOn: '',
      notes: '',
    });
    setDocumentModalVisible(true);
  };

  const openDocumentEditModal = () => {
    if (!selectedDocument) {
      Alert.alert('MyHouse', 'Selectionne un document.');
      return;
    }
    setDocumentForm({
      room: selectedDocument.room,
      resident: selectedDocument.resident,
      type: selectedDocument.type,
      title: selectedDocument.title,
      status: selectedDocument.status,
      issuedOn: selectedDocument.issuedOn,
      expiresOn: selectedDocument.expiresOn,
      notes: selectedDocument.notes,
    });
    setDocumentModalVisible(true);
  };

  const saveDocumentFromModal = async () => {
    if (!documentForm.room.trim() || !documentForm.title.trim()) {
      Alert.alert('MyHouse', 'La chambre et le titre du document sont obligatoires.');
      return;
    }
    const nextEntry: DocumentEntry = {
      key: selectedDocument?.key ?? `doc-${Date.now()}`,
      room: documentForm.room.trim(),
      resident: documentForm.resident.trim(),
      type: documentForm.type,
      title: documentForm.title.trim(),
      status: documentForm.status,
      issuedOn: documentForm.issuedOn.trim(),
      expiresOn: documentForm.expiresOn.trim(),
      notes: documentForm.notes.trim(),
    };
    setDocumentRegistry((current) => {
      const others = current.filter((entry) => entry.key !== nextEntry.key);
      return [nextEntry, ...others];
    });
    setSelectedDocumentKey(nextEntry.key);
    setDocumentModalVisible(false);
    Alert.alert('MyHouse', `Document ${nextEntry.title} enregistre.`);
  };

  const openResidentDetailModal = () => {
    if (!activeResident) {
      Alert.alert('MyHouse', 'Aucun resident lie a cette selection.');
      return;
    }
    setResidentDetailVisible(true);
  };

  const navigateToRoomDetail = (roomNumber: string) => {
    setSelectedPortfolioRoom(roomNumber);
    setSelectedReceptionRoom(roomNumber);
    setManagerPage('portfolio');
    setConciergePage('reception');
  };

  const navigateToInvoiceDetail = (roomNumber: string) => {
    setSelectedBillingRoom(roomNumber);
    setManagerPage('billing');
  };

  const navigateToPaymentDetail = (paymentId: number) => {
    setSelectedPaymentRow(String(paymentId));
    setManagerPage('payments');
  };

  const saveResidentFromModal = async () => {
    const resident = selectedPortfolioResident ?? selectedReceptionResident ?? selectedBillingResident;
    if (!resident) {
      return;
    }
    if (!residentForm.nom.trim()) {
      Alert.alert('MyHouse', 'Le nom du resident est obligatoire.');
      return;
    }
    await runAction(
      'edit-resident',
      () => patchResident(resident.id, {
        nom: residentForm.nom.trim(),
        prenom: residentForm.prenom.trim(),
        whatsapp: residentForm.whatsapp.trim() || null,
        telephone: residentForm.telephone.trim() || null,
      }).then(() => undefined),
      'Resident mis a jour.',
    );
    setResidentEditModalVisible(false);
  };

  const openDebtModal = () => {
    if (!selectedBillingInvoice) {
      return;
    }
    setDebtForm({ dette: String(selectedBillingInvoice.dette ?? 0) });
    setDebtModalVisible(true);
  };

  const openIndexModal = () => {
    const room = selectedRoomEntity;
    if (!room) {
      return;
    }
    setIndexForm({
      anEau: String(selectedRoomReading?.anEau ?? 0),
      niEau: String(selectedRoomReading?.niEau ?? 0),
      anElec: String(selectedRoomReading?.anElec ?? 0),
      niElec: String(selectedRoomReading?.niElec ?? 0),
      statutPresence: selectedRoomReading?.statutPresence ?? 'PRESENT',
      amendeEau: selectedRoomReading?.amendeEau ?? false,
    });
    setIndexModalVisible(true);
  };

  const startTerrainQueue = () => {
    const queue = filteredPortfolioRows
      .filter((row) => row.status === 'En attente')
      .map((row) => row.room);
    if (queue.length === 0) {
      Alert.alert('MyHouse', 'Aucune chambre en attente dans cette vue terrain.');
      return;
    }
    setTerrainQueue(queue);
    setTerrainQueueIndex(0);
    setSelectedPortfolioRoom(queue[0]);
    setSelectedReceptionRoom(null);
    setTimeout(() => {
      setSelectedPortfolioRoom(queue[0]);
      openIndexModal();
    }, 0);
  };

  const moveToNextTerrainQueueRoom = () => {
    if (terrainQueueIndex < 0) {
      return;
    }
    const nextIndex = terrainQueueIndex + 1;
    if (nextIndex >= terrainQueue.length) {
      setTerrainQueue([]);
      setTerrainQueueIndex(-1);
      setSelectedPortfolioRoom(null);
      Alert.alert('MyHouse', 'La tournee terrain est terminee.');
      return;
    }
    const nextRoom = terrainQueue[nextIndex];
    setTerrainQueueIndex(nextIndex);
    setSelectedPortfolioRoom(nextRoom);
    setTimeout(() => {
      setSelectedPortfolioRoom(nextRoom);
      openIndexModal();
    }, 0);
  };

  const startBroadcastQueue = () => {
    const queue = filteredBroadcastRows
      .filter((row) => row.status !== 'ENVOYE')
      .map((row) => row.room);
    if (queue.length === 0) {
      Alert.alert('MyHouse', 'Aucune facture a traiter dans cette vue.');
      return;
    }
    setBroadcastQueue(queue);
    setBroadcastQueueIndex(0);
    setSelectedBroadcastRoom(queue[0]);
  };

  const moveToNextBroadcastQueueRoom = () => {
    if (broadcastQueueIndex < 0) {
      return;
    }
    const nextIndex = broadcastQueueIndex + 1;
    if (nextIndex >= broadcastQueue.length) {
      setBroadcastQueue([]);
      setBroadcastQueueIndex(-1);
      setSelectedBroadcastRoom(null);
      Alert.alert('MyHouse', 'La file de diffusion est terminee.');
      return;
    }
    const nextRoom = broadcastQueue[nextIndex];
    setBroadcastQueueIndex(nextIndex);
    setSelectedBroadcastRoom(nextRoom);
  };

  const startReceptionQueue = () => {
    const queue = filteredReceptionRooms.map((room) => room.numeroChambre);
    if (queue.length === 0) {
      Alert.alert('MyHouse', 'Aucune chambre a verifier dans cette vue reception.');
      return;
    }
    setReceptionQueue(queue);
    setReceptionQueueIndex(0);
    setSelectedReceptionRoom(queue[0]);
  };

  const moveToNextReceptionQueueRoom = () => {
    if (receptionQueueIndex < 0) {
      return;
    }
    const nextIndex = receptionQueueIndex + 1;
    if (nextIndex >= receptionQueue.length) {
      setReceptionQueue([]);
      setReceptionQueueIndex(-1);
      setSelectedReceptionRoom(null);
      Alert.alert('MyHouse', 'La file reception est terminee.');
      return;
    }
    const nextRoom = receptionQueue[nextIndex];
    setReceptionQueueIndex(nextIndex);
    setSelectedReceptionRoom(nextRoom);
  };

  const saveDebtFromModal = async () => {
    if (!selectedBillingInvoice) {
      return;
    }
    const trimmed = debtForm.dette.trim();
    const dette = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && (!Number.isFinite(dette) || (dette ?? 0) < 0)) {
      Alert.alert('MyHouse', 'Saisis une dette valide.');
      return;
    }
    await runAction(
      'update-debt',
      () => updateInvoiceDebt(selectedBillingInvoice.id, dette).then(() => undefined),
      `Dette mise a jour pour ${selectedBillingInvoice.roomNumber}.`,
    );
    setDebtModalVisible(false);
  };

  const saveIndexFromModal = async (advanceToNext = false) => {
    const room = selectedRoomEntity;
    if (!room) {
      return;
    }
    const anEau = Number(indexForm.anEau);
    const niEau = Number(indexForm.niEau);
    const anElec = Number(indexForm.anElec);
    const niElec = Number(indexForm.niElec);
    if ([anEau, niEau, anElec, niElec].some((value) => !Number.isFinite(value) || value < 0)) {
      Alert.alert('MyHouse', 'Saisis des index valides.');
      return;
    }
    await runAction(
      'save-index-reading',
      () => upsertIndexReading({
        roomId: room.id,
        mois: metrics.month,
        anEau,
        niEau,
        anElec,
        niElec,
        statutPresence: indexForm.statutPresence,
        amendeEau: indexForm.amendeEau,
        saisiPar: 'desktop',
      }).then(() => undefined),
      `Releve enregistre pour ${room.numeroChambre}.`,
    );
    setIndexModalVisible(false);
    if (advanceToNext && terrainQueueIndex >= 0) {
      moveToNextTerrainQueueRoom();
      return;
    }
  };

  const savePaymentFromModal = async () => {
    if (!selectedBillingInvoice) {
      return;
    }
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('MyHouse', 'Saisis un montant valide.');
      return;
    }
    await runAction(
      'record-payment',
      () => recordPayment(selectedBillingInvoice.id, amount, paymentForm.note).then(() => undefined),
      `Paiement enregistre pour ${selectedBillingInvoice.roomNumber}.`,
    );
    setPaymentModalVisible(false);
  };

  return (
    <ConsoleShell
      activeRole={activeRole}
      availableRoles={availableRoles}
      onSelectRole={(role) => { void setActiveRole(role); }}
      title={currentPageMeta.title}
      subtitle={`${currentPageMeta.subtitle} Theme ${themeMode === 'dark' ? 'dark premium' : 'light business'}.`}
    >
      {activePage === 'overview' ? (
        <>
          <View style={styles.section}>
            <SectionHeader eyebrow="Cockpit" title="Tableau de bord" description={`Une lecture bureau plus claire, avec acces par pages dediees.${loading ? ' Chargement des donnees...' : ''}`} />
            <View style={styles.kpiGrid}>
              {overview.kpis.map((kpi) => (
                <KpiTile key={kpi.label} value={kpi.value} label={kpi.label} hint={kpi.hint} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Pages" title="Espace de travail" description="Chaque sujet important s ouvre maintenant dans sa propre page, sans barre de navigation persistante." />
            <View style={styles.dualGrid}>
              {pageCards.map((pageCard) => (
                <ActionPanel
                  key={pageCard.key}
                  title={pageCard.title}
                  description={pageCard.description}
                  bullets={pageCard.bullets}
                  actions={[{ label: pageCard.actionLabel, onPress: pageCard.onPress }]}
                />
              ))}
            </View>
          </View>

          {activeRole === 'manager' ? (
            <View style={styles.section}>
              <SectionHeader eyebrow="Urgences" title="A traiter maintenant" description="Le gestionnaire voit ici les alertes qui demandent une action concrete aujourd hui." />
              <View style={styles.dualGrid}>
                {managerAlerts.length > 0 ? managerAlerts.map((alert) => (
                  <ActionPanel
                    key={alert.key}
                    title={alert.title}
                    description={alert.detail}
                    bullets={[
                      'alerte calculee a partir des donnees du mois',
                      `mois de travail ${metrics.month}`,
                    ]}
                    actions={[{ label: alert.actionLabel, onPress: alert.onPress }]}
                  />
                )) : (
                  <ActionPanel
                    title="Aucune alerte bloquante"
                    description="Le portefeuille ne montre pas d urgence immediate dans les donnees visibles."
                    bullets={[
                      'aucun releve critique en attente',
                      'aucune diffusion urgente visible',
                      'les incidents prioritaires sont contenus',
                    ]}
                  />
                )}
              </View>
            </View>
          ) : null}

          {activeRole === 'concierge' ? (
            <View style={styles.section}>
              <SectionHeader eyebrow="Urgences" title="A traiter maintenant" description="Le concierge voit ici les actions terrain, diffusion et reception qui demandent une intervention rapide." />
              <View style={styles.dualGrid}>
                {conciergeAlerts.length > 0 ? conciergeAlerts.map((alert) => (
                  <ActionPanel
                    key={alert.key}
                    title={alert.title}
                    description={alert.detail}
                    bullets={[
                      'alerte issue du mois courant',
                      `mois de travail ${metrics.month}`,
                    ]}
                    actions={[{ label: alert.actionLabel, onPress: alert.onPress }]}
                  />
                )) : (
                  <ActionPanel
                    title="Flux concierge stabilise"
                    description="Aucune alerte terrain ou diffusion ne ressort des donnees visibles."
                    bullets={[
                      'tournees a jour',
                      'diffusion sans blocage visible',
                      'reception sous controle',
                    ]}
                  />
                )}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader eyebrow="Operations" title="Priorites et flux critiques" description="Le poste de travail reste lisible, mais les details lourds vivent sur des pages separees." />
            <View style={styles.dualGrid}>
              <ProgressList title="Priorites de la semaine" description="Travaux visibles par role." items={overview.priorities} />
              <DataTableCard title={overview.tableTitle} description={overview.tableDescription} columns={overview.tableColumns} rows={overview.tableRows} />
            </View>
          </View>

          {activeRole === 'manager' ? (
            <View style={styles.section}>
              <SectionHeader eyebrow="Pilotage" title="Focus du jour" description="Resume rapide des axes gestionnaire a surveiller avant d entrer dans les pages detaillees." />
              <View style={styles.dualGrid}>
                <DataTableCard
                  title="Tableau de pilotage"
                  description="Lecture courte du portefeuille, du recouvrement et des incidents."
                  columns={[
                    { key: 'label', label: 'Axe' },
                    { key: 'value', label: 'Valeur', align: 'right' },
                    { key: 'detail', label: 'Lecture' },
                  ]}
                  rows={managerFocusRows}
                  getRowKey={(row) => row.key}
                />
                <ActionPanel
                  title="Actions du jour"
                  description="Raccourcis pratiques pour debloquer les points critiques sans chercher dans toute l application."
                  bullets={[
                    'ouvrir la page qui correspond a l urgence',
                    'recalculer la facturation si besoin',
                    'tenir le portefeuille propre au fil de l eau',
                  ]}
                  actions={[
                    {
                      label: 'Logements',
                      onPress: () => setManagerPage('portfolio'),
                      variant: 'secondary',
                    },
                    {
                      label: 'Facturation',
                      onPress: () => setManagerPage('billing'),
                      variant: 'secondary',
                    },
                    {
                      label: 'Paiements',
                      onPress: () => setManagerPage('payments'),
                      variant: 'secondary',
                    },
                    {
                      label: busyAction === 'recalculate' ? 'Recalcul...' : 'Recalculer le mois',
                      onPress: () => {
                        void runAction(
                          'recalculate',
                          () => calculateBilling(metrics.month, true).then(() => undefined),
                          'Facturation relancee pour le mois courant.',
                        );
                      },
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {activeRole === 'concierge' ? (
            <View style={styles.section}>
              <SectionHeader eyebrow="Pilotage" title="Focus du jour" description="Lecture courte des priorites concierge avant de repartir sur le terrain ou la diffusion." />
              <View style={styles.dualGrid}>
                <DataTableCard
                  title="Tableau de pilotage concierge"
                  description="Vue rapide des releves, de la diffusion et de la reception."
                  columns={[
                    { key: 'label', label: 'Axe' },
                    { key: 'value', label: 'Valeur', align: 'right' },
                    { key: 'detail', label: 'Lecture' },
                  ]}
                  rows={conciergeFocusRows}
                  getRowKey={(row) => row.key}
                />
                <ActionPanel
                  title="Actions du jour"
                  description="Raccourcis utiles pour avancer sans perdre de temps dans le back-office."
                  bullets={[
                    'ouvrir rapidement la tournee terrain',
                    'traiter les envois en attente',
                    'verifier les nouvelles chambres reception',
                  ]}
                  actions={[
                    {
                      label: 'Terrain',
                      onPress: () => setConciergePage('terrain'),
                      variant: 'secondary',
                    },
                    {
                      label: 'Diffusion',
                      onPress: () => setConciergePage('broadcast'),
                      variant: 'secondary',
                    },
                    {
                      label: 'Reception',
                      onPress: () => setConciergePage('reception'),
                      variant: 'secondary',
                    },
                    {
                      label: 'WhatsApp Web',
                      onPress: () => {
                        void openExternal('https://web.whatsapp.com/');
                      },
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {activePage !== 'overview' ? (
        <View style={styles.pageIntroCard}>
          <View style={styles.pageIntroCopy}>
            <Text style={styles.pageIntroEyebrow}>Page active</Text>
            <Text style={styles.pageIntroTitle}>{currentPageMeta.title}</Text>
            <Text style={styles.pageIntroText}>
              {currentPageMeta.subtitle}
            </Text>
          </View>
          <TouchableOpacity style={styles.pageIntroButton} onPress={() => setActivePage('overview')}>
            <Text style={styles.pageIntroButtonText}>Retour au tableau de bord</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'portfolio' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Portefeuille" description="Page web dediee au suivi des logements et de la couverture de saisie." />
          <TabSwitch
            value={portfolioFilter}
            onChange={setPortfolioFilter}
            tabs={[
              { key: 'all', label: 'Tous' },
              { key: 'pending', label: 'En attente' },
              { key: 'indexed', label: 'Releves saisis' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Portefeuille logements"
              description="Etat des logements actifs et du niveau de saisie."
              columns={[{ key: 'room', label: 'Chambre' }, { key: 'status', label: 'Statut releve' }, { key: 'createdAt', label: 'Creation' }]}
              rows={filteredPortfolioRows}
              searchable
              searchPlaceholder="Rechercher une chambre ou un statut..."
              getRowKey={(row) => row.room}
              selectedRowKey={selectedPortfolioRoom}
              onRowPress={(row) => {
                setSelectedPortfolioRoom(row.room);
              }}
            />
            <ActionPanel
              title="Lecture portefeuille"
              description="Pilotage rapide des entrees, releves et couverture des donnees."
              bullets={[
                `${metrics.activeRooms} logements actifs`,
                `${metrics.indexedRooms} releves saisis`,
                metrics.monthConfigured ? 'configuration du mois disponible' : 'configuration du mois a renseigner',
                selectedPortfolio ? `selection active: ${selectedPortfolio.room} (${selectedPortfolio.status.toLowerCase()})` : 'clique une ligne pour afficher son contexte',
              ]}
              actions={[
                {
                    label: exportingKey === 'residents' ? 'Export residents...' : 'Exporter residents',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport(
                        'residents',
                        () => exportResidents(db, metrics.month, language),
                      'Export residents genere.',
                    );
                  },
                },
              ]}
            />
          </View>
          {selectedPortfolio ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Chambre ${selectedPortfolio.room}`}
                description="Lecture detaillee de la ligne selectionnee."
                bullets={[
                  `statut releve: ${selectedPortfolio.status}`,
                  `cree le ${selectedPortfolio.createdAt}`,
                  selectedRoomReading
                    ? `dernier releve eau ${selectedRoomReading.anEau} -> ${selectedRoomReading.niEau}`
                    : 'aucun releve enregistre pour le mois',
                  selectedPortfolio.status === 'En attente' ? 'priorite de saisie terrain' : 'donnees de base deja couvertes',
                ]}
                actions={[
                  {
                    label: busyAction === 'toggle-room-status' ? 'Mise a jour...' : (selectedPortfolio.status === 'En attente' ? 'Marquer active' : 'Basculer active/inactive'),
                    onPress: () => {
                      const matchingRoom = metrics.rooms.find((room) => room.numeroChambre === selectedPortfolio.room)
                        ?? null;
                      if (!matchingRoom) {
                        Alert.alert('MyHouse', 'Impossible de retrouver cette chambre.');
                        return;
                      }
                      void runAction(
                        'toggle-room-status',
                        () => patchRoom(matchingRoom.id, { actif: !matchingRoom.actif }).then(() => undefined),
                        `Chambre ${selectedPortfolio.room} mise a jour.`,
                      );
                    },
                  },
                  {
                    label: 'Editer la chambre',
                    onPress: openRoomEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedPortfolioResident ? 'Editer le resident' : 'Resident non lie',
                    onPress: openResidentEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedPortfolioResident ? 'Voir le resident' : 'Resident non lie',
                    onPress: openResidentDetailModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Saisir un releve',
                    onPress: openIndexModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Retour au tableau de bord',
                    onPress: () => setManagerPage('overview'),
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedPortfolioRoom(null),
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'billing' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Facturation" description="Page web dediee au cycle mensuel, a l exposition et aux exports." />
          <TabSwitch
            value={billingFilter}
            onChange={setBillingFilter}
            tabs={[
              { key: 'all', label: 'Toutes' },
              { key: 'non_envoye', label: 'Non envoyees' },
              { key: 'envoye', label: 'Envoyees' },
              { key: 'erreur', label: 'En erreur' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Facturation a surveiller"
              description="Portefeuille complet des factures du mois."
              columns={[{ key: 'room', label: 'Chambre' }, { key: 'due', label: 'Net a payer', align: 'right' }, { key: 'status', label: 'Envoi' }]}
              rows={filteredInvoices.map((invoice) => ({ room: invoice.roomNumber, due: `${Math.round(invoice.netAPayer).toLocaleString('fr-FR')} FCFA`, status: invoice.statutEnvoi }))}
              searchable
              searchPlaceholder="Rechercher une facture ou un statut..."
              getRowKey={(row) => row.room}
              selectedRowKey={selectedBillingRoom}
              onRowPress={(row) => {
                setSelectedBillingRoom(row.room);
              }}
            />
            <View style={styles.stackColumn}>
              <ProgressList title="Cadence de facturation" description="Progression reelle du cycle mensuel." items={[{ title: 'Configuration mensuelle', owner: 'Backoffice', status: metrics.monthConfigured ? 'Pret' : 'A faire', progress: metrics.monthConfigured ? 100 : 15 }, { title: 'Calcul des factures', owner: 'Billing', status: metrics.invoicesCalculated > 0 ? 'Actif' : 'Vide', progress: metrics.activeRooms > 0 ? Math.round((metrics.invoicesCalculated / metrics.activeRooms) * 100) : 0 }, { title: 'Diffusion', owner: 'Recouvrement', status: metrics.invoicesSent > 0 ? 'En cours' : 'En attente', progress: metrics.invoicesCalculated > 0 ? Math.round((metrics.invoicesSent / metrics.invoicesCalculated) * 100) : 0 }]} />
              <ActionPanel
                title="Exports de facturation"
                description="Ces exports sont maintenant utilisables sur mobile, web et logiciel bureau."
                bullets={['releve complet du mois', 'format XLSX partageable', `mois de travail ${metrics.month}`]}
                actions={[
                  {
                    label: busyAction === 'recalculate' ? 'Recalcul en cours...' : 'Recalculer le mois',
                    onPress: () => {
                      void runAction(
                        'recalculate',
                        () => calculateBilling(metrics.month, true).then(() => undefined),
                        'Facturation relancee pour le mois courant.',
                      );
                    },
                  },
                  {
                    label: exportingKey === 'invoices' ? 'Export factures...' : 'Exporter factures',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport(
                        'invoices',
                        () => exportInvoices(db, metrics.month, language),
                        'Export factures genere.',
                      );
                    },
                    variant: 'secondary',
                  },
                  {
                    label: exportingKey === 'complete' ? 'Export complet...' : 'Export complet',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport(
                        'complete',
                        () => exportComplet(db, metrics.month, language),
                        'Export complet genere.',
                      );
                    },
                  },
                ]}
              />
            </View>
          </View>
          {selectedBillingInvoice ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Facture ${selectedBillingInvoice.roomNumber}`}
                description="Detail rapide de la ligne selectionnee."
                bullets={[
                  `net a payer: ${Math.round(selectedBillingInvoice.netAPayer).toLocaleString('fr-FR')} FCFA`,
                  `deja encaisse: ${Math.round(selectedBillingPaidAmount).toLocaleString('fr-FR')} FCFA`,
                  `restant: ${Math.round(selectedBillingRemaining).toLocaleString('fr-FR')} FCFA`,
                  `phase: ${selectedBillingPhase}`,
                  `etat d envoi: ${selectedBillingInvoice.statutEnvoi}`,
                  `calculee le ${String(selectedBillingInvoice.calculeeLe).slice(0, 10)}`,
                ]}
                actions={[
                  {
                    label: 'Mettre a jour la dette',
                    onPress: openDebtModal,
                    variant: 'secondary',
                  },
                  {
                    label: busyAction === 'billing-mark-sent' ? 'Mise a jour...' : 'Marquer envoyee',
                    onPress: () => {
                      void runAction(
                        'billing-mark-sent',
                        () => updateInvoiceSendStatus(selectedBillingInvoice.id, 'ENVOYE').then(() => undefined),
                        `Facture ${selectedBillingInvoice.roomNumber} marquee comme envoyee.`,
                      );
                    },
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedBillingRoom(null),
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'payments' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Paiements" description="Page web dediee au suivi des encaissements et a l export comptable." />
          <TabSwitch
            value={paymentFilter}
            onChange={setPaymentFilter}
            tabs={[
              { key: 'all', label: 'Tous' },
              { key: 'with_note', label: 'Avec note' },
              { key: 'without_note', label: 'Sans note' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Derniers paiements"
              description="Vue bureau pour rapprocher rapidement les encaissements."
              columns={[{ key: 'room', label: 'Chambre' }, { key: 'amount', label: 'Montant', align: 'right' }, { key: 'paidAt', label: 'Date' }, { key: 'note', label: 'Observation' }]}
              rows={filteredPaymentRows.map((payment) => ({ id: String(payment.id), room: payment.room, amount: `${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`, paidAt: payment.paidAt, note: payment.note || '-' }))}
              searchable
              searchPlaceholder="Rechercher un paiement..."
              getRowKey={(row) => row.id}
              selectedRowKey={selectedPaymentRow}
              onRowPress={(row) => {
                setSelectedPaymentRow(row.id);
              }}
            />
            <ActionPanel
              title="Lecture paiements"
              description="Lecture des encaissements recents et du rapport recettes / net a payer."
              bullets={[`${metrics.paymentCount} paiements enregistres`, `${Math.round(metrics.totalPaid).toLocaleString('fr-FR')} FCFA encaisses`, `${Math.round(metrics.totalDue - metrics.totalPaid).toLocaleString('fr-FR')} FCFA restant a couvrir`]}
              actions={[
                {
                    label: exportingKey === 'payments' ? 'Export paiements...' : 'Exporter paiements',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport(
                        'payments',
                        () => exportPayments(db, metrics.month, language),
                      'Export paiements genere.',
                    );
                  },
                },
              ]}
            />
          </View>
          {selectedPayment ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Paiement ${selectedPayment.room}`}
                description="Lecture detaillee de l encaissement selectionne."
                bullets={[
                  `montant: ${Math.round(selectedPayment.amount).toLocaleString('fr-FR')} FCFA`,
                  `date: ${selectedPayment.paidAt}`,
                  `observation: ${selectedPayment.note || '-'}`,
                ]}
                actions={[
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedPaymentRow(null),
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'contracts' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Contrats" description="Page dediee a l occupation, aux contrats a completer et aux renouvellements a surveiller." />
          <TabSwitch
            value={contractFilter}
            onChange={setContractFilter}
            tabs={[
              { key: 'all', label: 'Tous' },
              { key: 'complete', label: 'Actifs' },
              { key: 'attention', label: 'A surveiller' },
              { key: 'missing', label: 'A completer' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Couverture contrats"
              description="Lecture resident / chambre / renouvellement pour le portefeuille actif."
              columns={[
                { key: 'room', label: 'Chambre' },
                { key: 'resident', label: 'Resident' },
                { key: 'status', label: 'Statut' },
                { key: 'renewal', label: 'Renouvellement' },
              ]}
              rows={filteredContractRows.map((row) => ({
                room: row.room,
                resident: row.resident,
                status: row.status,
                renewal: row.renewal,
              }))}
              searchable
              searchPlaceholder="Rechercher un contrat ou un resident..."
              getRowKey={(row) => row.room}
              selectedRowKey={selectedContractRoom}
              onRowPress={(row) => {
                setSelectedContractRoom(row.room);
              }}
            />
            <ActionPanel
              title="Suivi contractuel"
              description="Lecture immediate des points de friction du portefeuille locatif."
              bullets={[
                `${metrics.contractRows.filter((row) => row.status !== 'A completer').length} contrats actifs`,
                `${metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length} renouvellements urgents`,
                `${metrics.contractRows.filter((row) => row.status === 'A completer').length} chambres sans resident principal`,
                selectedContract ? `selection active: ${selectedContract.room}` : 'clique une ligne pour ouvrir la fiche contractuelle',
              ]}
              actions={[
                {
                  label: 'Retour au tableau de bord',
                  onPress: () => setManagerPage('overview'),
                  variant: 'secondary',
                },
              ]}
            />
          </View>
          {selectedContract ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Contrat ${selectedContract.room}`}
                description="Lecture croisee de l occupant, du solde et de l etat de renouvellement."
                bullets={[
                  `resident: ${selectedContract.resident}`,
                  `statut: ${selectedContract.status}`,
                  `renouvellement: ${selectedContract.renewal}`,
                  `solde courant: ${Math.round(selectedContract.balance).toLocaleString('fr-FR')} FCFA`,
                  selectedContractEntry ? `periode: ${selectedContractEntry.startDate} -> ${selectedContractEntry.endDate}` : 'periode non renseignee',
                  selectedContractEntry ? `signature: ${selectedContractEntry.signatureMode}` : 'signature non renseignee',
                  selectedContractInvoice?.delaiPaiement ? `delai paiement: ${selectedContractInvoice.delaiPaiement}` : 'delai paiement non disponible',
                ]}
                actions={[
                  {
                    label: 'Voir la fiche contrat',
                    onPress: () => setContractDetailVisible(true),
                  },
                  {
                    label: 'Editer le contrat',
                    onPress: openContractEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedContractResident ? 'Voir le resident' : 'Resident non lie',
                    onPress: openResidentDetailModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedContractResident ? 'Editer le resident' : 'Resident non lie',
                    onPress: openResidentEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Ouvrir la chambre',
                    onPress: () => navigateToRoomDetail(selectedContract.room),
                  },
                  {
                    label: 'Ouvrir la facture',
                    onPress: () => navigateToInvoiceDetail(selectedContract.room),
                    variant: 'secondary',
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedContractRoom(null),
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'maintenance' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Maintenance et incidents" description="Page dediee aux anomalies d exploitation et aux suivis de priorite." />
          <TabSwitch
            value={maintenanceFilter}
            onChange={setMaintenanceFilter}
            tabs={[
              { key: 'all', label: 'Tous' },
              { key: 'high', label: 'Priorite haute' },
              { key: 'open', label: 'Ouverts' },
              { key: 'followup', label: 'Suivi' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Incidents d exploitation"
              description="Anomalies deduites du portefeuille en attente d action gestionnaire."
              columns={[
                { key: 'room', label: 'Chambre' },
                { key: 'category', label: 'Categorie' },
                { key: 'priority', label: 'Priorite' },
                { key: 'status', label: 'Statut' },
              ]}
              rows={filteredMaintenanceRows.map((row) => ({
                key: row.key,
                room: row.room,
                category: row.category,
                priority: row.priority,
                status: row.status,
              }))}
              searchable
              searchPlaceholder="Rechercher un incident..."
              getRowKey={(row) => row.key}
              selectedRowKey={selectedMaintenanceKey}
              onRowPress={(row) => {
                setSelectedMaintenanceKey(row.key);
              }}
            />
            <ActionPanel
              title="Poste incidents"
              description="Le gestionnaire traite ici les exceptions avant qu elles ne degradent l exploitation."
              bullets={[
                `${maintenanceRowsMerged.length} incidents visibles`,
                `${maintenanceRowsMerged.filter((row) => row.priority === 'Haute').length} priorites hautes`,
                `${maintenanceRowsMerged.filter((row) => row.category === 'Releve').length} incidents releves`,
                `${maintenanceRowsMerged.filter((row) => row.category === 'Facturation').length} incidents facturation`,
              ]}
              actions={[
                {
                  label: 'Nouveau ticket',
                  onPress: openMaintenanceCreateModal,
                },
                {
                  label: busyAction === 'maintenance-refresh' ? 'Actualisation...' : 'Actualiser',
                  onPress: () => reload(),
                },
                {
                  label: 'Retour au tableau de bord',
                  onPress: () => setManagerPage('overview'),
                  variant: 'secondary',
                },
              ]}
            />
          </View>
          {selectedMaintenance ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`${selectedMaintenance.category} ${selectedMaintenance.room}`}
                description="Contexte detaille de l anomalie selectionnee."
                bullets={[
                  `priorite: ${selectedMaintenance.priority}`,
                  `statut: ${selectedMaintenance.status}`,
                  selectedMaintenance.summary,
                  selectedMaintenanceResident ? `resident lie: ${selectedMaintenanceResident.nom} ${selectedMaintenanceResident.prenom}`.trim() : 'resident non lie',
                  selectedMaintenanceInvoice ? `facture courante: ${Math.round(selectedMaintenanceInvoice.netAPayer).toLocaleString('fr-FR')} FCFA` : 'aucune facture courante',
                ]}
                actions={[
                  {
                    label: 'Voir la fiche ticket',
                    onPress: () => setMaintenanceDetailVisible(true),
                  },
                  {
                    label: 'Editer / convertir en ticket',
                    onPress: openMaintenanceEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Ouvrir la chambre',
                    onPress: () => navigateToRoomDetail(selectedMaintenance.room),
                  },
                  {
                    label: selectedMaintenance.category === 'Releve' ? 'Saisir un releve' : 'Ouvrir la facture',
                    onPress: () => {
                      if (selectedMaintenance.category === 'Releve') {
                        openIndexModal();
                        return;
                      }
                      navigateToInvoiceDetail(selectedMaintenance.room);
                    },
                    variant: 'secondary',
                  },
                  {
                    label: selectedMaintenanceResident ? 'Voir le resident' : 'Resident non lie',
                    onPress: openResidentDetailModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedMaintenanceKey(null),
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'reports' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Rapports" description="Page dediee aux syntheses exportables, a la lecture financiere et au pilotage du portefeuille." />
          <View style={styles.kpiGrid}>
            {metrics.reportRows.map((row) => (
              <KpiTile key={row.key} value={row.value} label={row.label} hint={row.detail} />
            ))}
          </View>
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Lecture financiere"
              description="Synthese mensuelle de facturation, encaissements et reste a recouvrer."
              columns={[
                { key: 'label', label: 'Indicateur' },
                { key: 'value', label: 'Valeur', align: 'right' },
                { key: 'detail', label: 'Lecture' },
              ]}
              rows={metrics.reportFinanceRows.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.value,
                detail: row.detail,
              }))}
              searchable
              searchPlaceholder="Rechercher un indicateur financier..."
              getRowKey={(row) => row.key}
            />
            <View style={styles.stackColumn}>
              <ProgressList
                title="Vue direction"
                description="Avancement des grands axes gestionnaire attendus par le cahier des charges."
                items={[
                  {
                    title: 'Occupation active',
                    owner: 'Portefeuille',
                    status: metrics.occupancyRate >= 80 ? 'Bon niveau' : 'A renforcer',
                    progress: metrics.occupancyRate,
                  },
                  {
                    title: 'Recouvrement',
                    owner: 'Finance',
                    status: metrics.totalPaid > 0 ? 'En cours' : 'A lancer',
                    progress: metrics.totalDue > 0 ? Math.min(100, Math.round((metrics.totalPaid / metrics.totalDue) * 100)) : 0,
                  },
                  {
                    title: 'Traitement incidents',
                    owner: 'Exploitation',
                    status: metrics.maintenanceRows.length === 0 ? 'Stable' : 'Charge visible',
                    progress: metrics.maintenanceRows.length === 0 ? 100 : Math.max(10, 100 - Math.min(90, metrics.maintenanceRows.length * 10)),
                  },
                  {
                    title: 'Diffusion du mois',
                    owner: 'Recouvrement',
                    status: metrics.invoicesSent === metrics.invoicesCalculated && metrics.invoicesCalculated > 0 ? 'Bouclee' : 'En cours',
                    progress: metrics.invoicesCalculated > 0 ? Math.round((metrics.invoicesSent / metrics.invoicesCalculated) * 100) : 0,
                  },
                ]}
              />
              <ActionPanel
                title="Exports direction"
                description="Les rapports gestionnaire doivent rester simples a produire et a partager."
                bullets={[
                  'export residents',
                  'export factures',
                  'export paiements',
                  'export mensuel complet',
                ]}
                actions={[
                  {
                    label: exportingKey === 'report-residents' ? 'Export residents...' : 'Exporter residents',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport('report-residents', () => exportResidents(db, metrics.month, language), 'Export residents genere.');
                    },
                    variant: 'secondary',
                  },
                  {
                    label: exportingKey === 'report-invoices' ? 'Export factures...' : 'Exporter factures',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport('report-invoices', () => exportInvoices(db, metrics.month, language), 'Export factures genere.');
                    },
                    variant: 'secondary',
                  },
                  {
                    label: exportingKey === 'report-payments' ? 'Export paiements...' : 'Exporter paiements',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport('report-payments', () => exportPayments(db, metrics.month, language), 'Export paiements genere.');
                    },
                    variant: 'secondary',
                  },
                  {
                    label: exportingKey === 'report-complete' ? 'Export complet...' : 'Exporter rapport complet',
                    onPress: () => {
                      if (!db) {
                        Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                        return;
                      }
                      void runExport('report-complete', () => exportComplet(db, metrics.month, language), 'Export complet genere.');
                    },
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Lecture exploitation"
              description="Vue operationnelle pour mesurer couverture terrain, diffusion et contrats actifs."
              columns={[
                { key: 'label', label: 'Indicateur' },
                { key: 'value', label: 'Valeur', align: 'right' },
                { key: 'detail', label: 'Lecture' },
              ]}
              rows={metrics.reportOperationsRows.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.value,
                detail: row.detail,
              }))}
              searchable
              searchPlaceholder="Rechercher un indicateur operationnel..."
              getRowKey={(row) => row.key}
            />
            <DataTableCard
              title="Portefeuille a surveiller"
              description="Chambres a plus fort risque ou solde notable pour arbitrage gestionnaire."
              columns={[
                { key: 'room', label: 'Chambre' },
                { key: 'resident', label: 'Resident' },
                { key: 'balance', label: 'Solde', align: 'right' },
                { key: 'status', label: 'Signal' },
              ]}
              rows={metrics.reportPortfolioRows}
              searchable
              searchPlaceholder="Rechercher une chambre ou un resident..."
              getRowKey={(row) => row.key}
              onRowPress={(row) => {
                setSelectedContractRoom(row.room);
                setManagerPage('contracts');
              }}
            />
          </View>
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'documents' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Documents" description="Page dediee aux contrats, pieces locatives, etats des lieux et PV relies au portefeuille." />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Registre documentaire"
              description="Documents gestionnaire enregistres localement pour le bureau/web."
              columns={[
                { key: 'room', label: 'Chambre' },
                { key: 'type', label: 'Type' },
                { key: 'title', label: 'Document' },
                { key: 'status', label: 'Statut' },
              ]}
              rows={documentRegistry.map((entry) => ({
                key: entry.key,
                room: entry.room,
                type: entry.type,
                title: entry.title,
                status: entry.status,
              }))}
              searchable
              searchPlaceholder="Rechercher un document..."
              getRowKey={(row) => row.key}
              selectedRowKey={selectedDocumentKey}
              onRowPress={(row) => setSelectedDocumentKey(row.key)}
            />
            <ActionPanel
              title="Pilotage documents"
              description="Le gestionnaire centralise ici les documents d exploitation et de location."
              bullets={[
                `${documentRegistry.length} documents enregistres`,
                `${documentRegistry.filter((entry) => entry.type === 'CONTRAT').length} contrats`,
                `${documentRegistry.filter((entry) => entry.status === 'A_SIGNER').length} documents a signer`,
                `${documentRegistry.filter((entry) => entry.status === 'ARCHIVE').length} archives`,
              ]}
              actions={[
                {
                  label: 'Nouveau document',
                  onPress: openDocumentCreateModal,
                },
                {
                  label: 'Retour au tableau de bord',
                  onPress: () => setManagerPage('overview'),
                  variant: 'secondary',
                },
              ]}
            />
          </View>
          {selectedDocument ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={selectedDocument.title}
                description="Lecture detaillee du document selectionne."
                bullets={[
                  `chambre: ${selectedDocument.room}`,
                  `resident: ${selectedDocument.resident || 'non lie'}`,
                  `type: ${selectedDocument.type}`,
                  `statut: ${selectedDocument.status}`,
                  selectedDocument.issuedOn ? `emise le: ${selectedDocument.issuedOn}` : 'date emission non renseignee',
                  selectedDocument.expiresOn ? `expire le: ${selectedDocument.expiresOn}` : 'pas de date d expiration',
                ]}
                actions={[
                  {
                    label: 'Voir la fiche document',
                    onPress: () => setDocumentDetailVisible(true),
                  },
                  {
                    label: 'Editer le document',
                    onPress: openDocumentEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Ouvrir la chambre',
                    onPress: () => navigateToRoomDetail(selectedDocument.room),
                    variant: 'secondary',
                  },
                  {
                    label: 'Ouvrir contrat',
                    onPress: () => {
                      setSelectedContractRoom(selectedDocument.room);
                      setManagerPage('contracts');
                    },
                    variant: 'secondary',
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedDocumentKey(null),
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'marketplace' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Marketplace" description="Publication d annonces, medias et transactions avec geolocalisation OpenStreetMap." />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Annonces"
              description="Dernieres annonces publiees dans MyHOUSE."
              columns={[
                { key: 'title', label: 'Annonce' },
                { key: 'type', label: 'Type' },
                { key: 'price', label: 'Prix', align: 'right' },
                { key: 'status', label: 'Statut' },
              ]}
              rows={marketplaceListings.map((listing) => ({
                title: listing.title,
                type: listing.listingType,
                price: listing.price == null ? '-' : `${Math.round(listing.price).toLocaleString('fr-FR')} FCFA`,
                status: listing.status,
              }))}
              searchable
              searchPlaceholder="Rechercher une annonce..."
              emptyText="Aucune annonce publiee."
            />
            <View style={[styles.pageIntroCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <Text style={styles.pageIntroTitle}>Nouvelle annonce</Text>
              <Text style={styles.pageIntroText}>Renseigner une annonce et sa geolocalisation.</Text>
              {marketplaceNotice ? <Text style={styles.pageIntroText}>{marketplaceNotice}</Text> : null}
              <Text style={styles.modalLabel}>Titre</Text>
              <TextInput
                value={marketplaceForm.title}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, title: value }))}
                style={styles.modalInput}
                placeholder="Studio meuble"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <Text style={styles.modalLabel}>Type</Text>
              <TextInput
                value={marketplaceForm.listingType}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, listingType: value }))}
                style={styles.modalInput}
                placeholder="LOCATION"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <Text style={styles.modalLabel}>Prix</Text>
              <TextInput
                value={marketplaceForm.price}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, price: value }))}
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="150000"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <Text style={styles.modalLabel}>Adresse</Text>
              <TextInput
                value={marketplaceForm.address}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, address: value }))}
                style={styles.modalInput}
                placeholder="Bonapriso, Douala"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <View style={styles.panelRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Latitude</Text>
                  <TextInput
                    value={marketplaceForm.latitude}
                    onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, latitude: value }))}
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="4.0511"
                    placeholderTextColor={styles.pageIntroText.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Longitude</Text>
                  <TextInput
                    value={marketplaceForm.longitude}
                    onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, longitude: value }))}
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="9.7679"
                    placeholderTextColor={styles.pageIntroText.color}
                  />
                </View>
              </View>
              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                value={marketplaceForm.description}
                onChangeText={(value) => setMarketplaceForm((current) => ({ ...current, description: value }))}
                style={[styles.modalInput, styles.modalTextarea]}
                multiline
                placeholder="Infos utiles pour les chercheurs..."
                placeholderTextColor={styles.pageIntroText.color}
              />
              <TouchableOpacity
                style={styles.pageIntroButton}
                onPress={() => {
                  void runAction(
                    'marketplace-save',
                    async () => {
                      await upsertMarketplaceListing({
                        title: marketplaceForm.title,
                        description: marketplaceForm.description,
                        price: marketplaceForm.price ? Number(marketplaceForm.price) : null,
                        listingType: marketplaceForm.listingType,
                        status: marketplaceForm.status,
                        address: marketplaceForm.address,
                        latitude: marketplaceForm.latitude ? Number(marketplaceForm.latitude) : null,
                        longitude: marketplaceForm.longitude ? Number(marketplaceForm.longitude) : null,
                      });
                      setMarketplaceForm({
                        title: '',
                        description: '',
                        price: '',
                        listingType: '',
                        status: 'DRAFT',
                        address: '',
                        latitude: '',
                        longitude: '',
                      });
                    },
                    'Annonce enregistree.',
                  );
                }}
              >
                <Text style={styles.pageIntroButtonText}>Publier l annonce</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {activeRole === 'manager' && activePage === 'commonCharges' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gestionnaire" title="Charges communes" description="Configuration des charges communes par bloc ou chambre." />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Charges"
              description="Charges communes actives."
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'label', label: 'Libelle' },
                { key: 'amount', label: 'Montant', align: 'right' },
                { key: 'state', label: 'Etat' },
              ]}
              rows={commonCharges.map((charge) => ({
                code: charge.code,
                label: charge.label,
                amount: `${Math.round(charge.amount).toLocaleString('fr-FR')} FCFA`,
                state: charge.active ? 'ACTIF' : 'INACTIF',
              }))}
              emptyText="Aucune charge configuree."
            />
            <View style={[styles.pageIntroCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <Text style={styles.pageIntroTitle}>Configurer une charge</Text>
              <Text style={styles.pageIntroText}>Ces charges seront ajoutees aux factures.</Text>
              {commonChargeNotice ? <Text style={styles.pageIntroText}>{commonChargeNotice}</Text> : null}
              <Text style={styles.modalLabel}>Code</Text>
              <TextInput
                value={commonChargeForm.code}
                onChangeText={(value) => setCommonChargeForm((current) => ({ ...current, code: value }))}
                style={styles.modalInput}
                placeholder="SECURITE"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <Text style={styles.modalLabel}>Libelle</Text>
              <TextInput
                value={commonChargeForm.label}
                onChangeText={(value) => setCommonChargeForm((current) => ({ ...current, label: value }))}
                style={styles.modalInput}
                placeholder="Securite"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <Text style={styles.modalLabel}>Montant</Text>
              <TextInput
                value={commonChargeForm.amount}
                onChangeText={(value) => setCommonChargeForm((current) => ({ ...current, amount: value }))}
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="5000"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <TouchableOpacity
                style={styles.pageIntroButton}
                onPress={() => {
                  void runAction(
                    'common-charge-save',
                    async () => {
                      await upsertCommonCharge({
                        code: commonChargeForm.code,
                        label: commonChargeForm.label,
                        amount: Number(commonChargeForm.amount) || 0,
                        required: commonChargeForm.required,
                        active: commonChargeForm.active,
                      });
                      setCommonChargeForm({ code: '', label: '', amount: '', required: true, active: true });
                    },
                    'Charge enregistree.',
                  );
                }}
              >
                <Text style={styles.pageIntroButtonText}>Enregistrer</Text>
              </TouchableOpacity>
              <Text style={[styles.pageIntroTitle, { marginTop: 12 }]}>Affecter une charge</Text>
              <TextInput
                value={commonChargeAssignForm.chargeId}
                onChangeText={(value) => setCommonChargeAssignForm((current) => ({ ...current, chargeId: value }))}
                style={styles.modalInput}
                placeholder="ID charge"
                keyboardType="numeric"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <TextInput
                value={commonChargeAssignForm.scopeType}
                onChangeText={(value) => setCommonChargeAssignForm((current) => ({ ...current, scopeType: value }))}
                style={styles.modalInput}
                placeholder="BLOC"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <TextInput
                value={commonChargeAssignForm.scopeValue}
                onChangeText={(value) => setCommonChargeAssignForm((current) => ({ ...current, scopeValue: value }))}
                style={styles.modalInput}
                placeholder="A"
                placeholderTextColor={styles.pageIntroText.color}
              />
              <TouchableOpacity
                style={styles.pageIntroButton}
                onPress={() => {
                  void runAction(
                    'common-charge-assign',
                    async () => {
                      await assignCommonCharge({
                        chargeId: Number(commonChargeAssignForm.chargeId),
                        scopeType: commonChargeAssignForm.scopeType,
                        scopeValue: commonChargeAssignForm.scopeValue,
                        required: commonChargeAssignForm.required,
                      });
                      setCommonChargeAssignForm({ chargeId: '', scopeType: 'BLOC', scopeValue: '', required: true });
                    },
                    'Affectation enregistree.',
                  );
                }}
              >
                <Text style={styles.pageIntroButtonText}>Affecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {activeRole === 'concierge' && activePage === 'terrain' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Concierge" title="Terrain" description="Page web dediee au suivi des releves et des chambres a couvrir." />
          <TabSwitch
            value={portfolioFilter}
            onChange={setPortfolioFilter}
            tabs={[
              { key: 'all', label: 'Toutes' },
              { key: 'pending', label: 'En attente' },
              { key: 'indexed', label: 'Releves saisis' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Suivi terrain"
              description="Verification des chambres actives et de l etat de saisie."
              columns={[{ key: 'room', label: 'Chambre' }, { key: 'status', label: 'Statut releve' }, { key: 'createdAt', label: 'Creation' }]}
              rows={filteredPortfolioRows}
              searchable
              searchPlaceholder="Rechercher une chambre terrain..."
              getRowKey={(row) => row.room}
              selectedRowKey={selectedPortfolioRoom}
              onRowPress={(row) => {
                setSelectedPortfolioRoom(row.room);
              }}
            />
            <ActionPanel
              title="Cadence terrain"
              description="Aide operationnelle pour les releves du mois."
              bullets={[
                `${metrics.indexedRooms}/${metrics.activeRooms || metrics.totalRooms} releves saisis`,
                metrics.monthConfigured ? 'configuration mensuelle disponible' : 'configuration mensuelle absente',
                `${metrics.recentRooms.length} chambres recentes a verifier`,
                nextPendingPortfolioRow ? `prochaine chambre prioritaire: ${nextPendingPortfolioRow.room}` : 'aucune chambre prioritaire visible',
                activeTerrainQueueRoom ? `tournee en cours: ${activeTerrainQueueRoom} (${remainingTerrainQueueCount} restantes)` : 'aucune tournee en cours',
              ]}
              actions={[
                {
                  label: exportingKey === 'concierge-residents' ? 'Export terrain...' : 'Exporter suivi terrain',
                  onPress: () => {
                    if (!db) {
                      Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                      return;
                    }
                    void runExport(
                      'concierge-residents',
                      () => exportResidents(db, metrics.month, language),
                      'Export terrain genere.',
                    );
                  },
                },
                {
                  label: busyAction === 'terrain-refresh' ? 'Actualisation...' : 'Actualiser la vue',
                  onPress: () => {
                    reload();
                  },
                  variant: 'secondary',
                },
                {
                  label: 'Saisir prochaine',
                  onPress: () => {
                    if (!nextPendingPortfolioRow) {
                      Alert.alert('MyHouse', 'Aucune chambre en attente de releve dans cette vue.');
                      return;
                    }
                    setSelectedPortfolioRoom(nextPendingPortfolioRow.room);
                    openIndexModal();
                  },
                  variant: 'secondary',
                },
                {
                  label: activeTerrainQueueRoom ? 'Reprendre tournee' : 'Demarrer tournee',
                  onPress: () => {
                    if (activeTerrainQueueRoom) {
                      setSelectedPortfolioRoom(activeTerrainQueueRoom);
                      openIndexModal();
                      return;
                    }
                    startTerrainQueue();
                  },
                },
              ]}
            />
          </View>
          {selectedPortfolio ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Terrain ${selectedPortfolio.room}`}
                description="Contexte de la chambre selectionnee pour l equipe terrain."
                bullets={[
                  `statut actuel: ${selectedPortfolio.status}`,
                  `creation: ${selectedPortfolio.createdAt}`,
                  selectedRoomReading
                    ? `index electricite ${selectedRoomReading.anElec} -> ${selectedRoomReading.niElec}`
                    : 'aucun releve saisi pour le mois',
                  selectedPortfolio.status === 'En attente' ? 'a traiter lors de la prochaine ronde' : 'verification deja effectuee',
                ]}
                actions={[
                  {
                    label: 'Saisir un releve',
                    onPress: openIndexModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Voir la chambre',
                    onPress: () => setSelectedPortfolioRoom(selectedPortfolio.room),
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedPortfolioRoom(null),
                  },
                  {
                    label: 'Editer la chambre',
                    onPress: openRoomEditModal,
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'concierge' && activePage === 'broadcast' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Concierge" title="Diffusion" description="Page web dediee a la preparation des envois et des relances." />
          <TabSwitch
            value={broadcastFilter}
            onChange={setBroadcastFilter}
            tabs={[
              { key: 'all', label: 'Toutes' },
              { key: 'non_envoye', label: 'Non envoyees' },
              { key: 'envoye', label: 'Envoyees' },
              { key: 'erreur', label: 'En erreur' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Factures a diffuser"
              description="Etat actuel des envois et montants a relancer."
              columns={[{ key: 'room', label: 'Chambre' }, { key: 'resident', label: 'Resident' }, { key: 'due', label: 'Net a payer', align: 'right' }, { key: 'status', label: 'Envoi' }]}
              rows={filteredBroadcastRows.map((invoice) => ({ room: invoice.room, resident: invoice.resident, due: `${Math.round(invoice.due).toLocaleString('fr-FR')} FCFA`, status: invoice.status }))}
              searchable
              searchPlaceholder="Rechercher une diffusion..."
              getRowKey={(row) => row.room}
              selectedRowKey={selectedBroadcastRoom}
              onRowPress={(row) => {
                setSelectedBroadcastRoom(row.room);
              }}
            />
            <ActionPanel
              title="Plan de diffusion"
              description="Base concrete pour la relance web et bureau."
              bullets={[
                `${metrics.invoicesCalculated} factures calculees`,
                `${metrics.invoicesSent} deja diffusees`,
                `${metrics.invoicesCalculated - metrics.invoicesSent} restant a envoyer`,
                nextBroadcastPendingRow ? `prochaine diffusion: ${nextBroadcastPendingRow.room}` : 'aucune facture en attente visible',
                activeBroadcastQueueRoom ? `file en cours: ${activeBroadcastQueueRoom} (${remainingBroadcastQueueCount} restantes)` : 'aucune file de diffusion en cours',
              ]}
              actions={[
                {
                  label: busyAction === 'broadcast-sent' ? 'Mise a jour...' : 'Marquer prochaine envoyee',
                  onPress: () => {
                    const nextInvoice = metrics.broadcastRows.find((invoice) => invoice.status !== 'ENVOYE');
                    if (!nextInvoice) {
                      Alert.alert('MyHouse', 'Toutes les factures visibles sont deja marquees comme envoyees.');
                      return;
                    }
                    void runAction(
                      'broadcast-sent',
                      () => updateInvoiceSendStatus(nextInvoice.invoiceId, 'ENVOYE').then(() => undefined),
                      `Facture ${nextInvoice.room} marquee comme envoyee.`,
                    );
                  },
                },
                {
                  label: busyAction === 'broadcast-error' ? 'Mise a jour...' : 'Marquer prochaine en erreur',
                  onPress: () => {
                    const nextInvoice = metrics.broadcastRows.find((invoice) => invoice.status === 'NON_ENVOYE');
                    if (!nextInvoice) {
                      Alert.alert('MyHouse', 'Aucune facture en attente a marquer en erreur.');
                      return;
                    }
                    void runAction(
                      'broadcast-error',
                      () => updateInvoiceSendStatus(nextInvoice.invoiceId, 'ERREUR').then(() => undefined),
                      `Facture ${nextInvoice.room} marquee en erreur.`,
                    );
                  },
                  variant: 'secondary',
                },
                {
                  label: exportingKey === 'concierge-invoices' ? 'Export diffusion...' : 'Exporter factures',
                  onPress: () => {
                    if (!db) {
                      Alert.alert('MyHouse', 'Les exports XLSX locaux ne sont pas encore disponibles dans ce mode bureau/web.');
                      return;
                    }
                    void runExport(
                      'concierge-invoices',
                      () => exportInvoices(db, metrics.month, language),
                      'Export diffusion genere.',
                    );
                  },
                },
                {
                  label: 'Ouvrir WhatsApp Web',
                  onPress: () => {
                    void openExternal('https://web.whatsapp.com/');
                  },
                },
                {
                  label: 'Traiter prochaine erreur',
                  onPress: () => {
                    if (!nextBroadcastErrorRow) {
                      Alert.alert('MyHouse', 'Aucune facture en erreur dans cette vue.');
                      return;
                    }
                    setSelectedBroadcastRoom(nextBroadcastErrorRow.room);
                  },
                  variant: 'secondary',
                },
                {
                  label: activeBroadcastQueueRoom ? 'Reprendre la file' : 'Demarrer la file',
                  onPress: () => {
                    if (activeBroadcastQueueRoom) {
                      setSelectedBroadcastRoom(activeBroadcastQueueRoom);
                      return;
                    }
                    startBroadcastQueue();
                  },
                },
              ]}
            />
          </View>
          {selectedBroadcast ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Diffusion ${selectedBroadcast.room}`}
                description="Actions contextuelles sur la facture selectionnee."
                bullets={[
                  `resident: ${selectedBroadcast.resident}`,
                  `net a payer: ${Math.round(selectedBroadcast.due).toLocaleString('fr-FR')} FCFA`,
                  `telephone: ${selectedBroadcast.phone || 'non renseigne'}`,
                ]}
                actions={[
                  {
                    label: busyAction === 'broadcast-selected-error' ? 'Mise a jour...' : 'Marquer en erreur',
                    onPress: () => {
                      void (async () => {
                        await runAction(
                          'broadcast-selected-error',
                          () => updateInvoiceSendStatus(selectedBroadcast.invoiceId, 'ERREUR').then(() => undefined),
                          `Facture ${selectedBroadcast.room} marquee en erreur.`,
                        );
                        if (activeBroadcastQueueRoom) {
                          moveToNextBroadcastQueueRoom();
                        }
                      })();
                    },
                    variant: 'secondary',
                  },
                  {
                    label: 'Ouvrir WhatsApp',
                    onPress: () => {
                      void openWhatsAppConversation(selectedBroadcast.phone);
                    },
                  },
                  {
                    label: busyAction === 'broadcast-selected-sent' ? 'Mise a jour...' : 'Marquer envoyee',
                    onPress: () => {
                      void (async () => {
                        await runAction(
                          'broadcast-selected-sent',
                          () => updateInvoiceSendStatus(selectedBroadcast.invoiceId, 'ENVOYE').then(() => undefined),
                          `Facture ${selectedBroadcast.room} marquee comme envoyee.`,
                        );
                        if (activeBroadcastQueueRoom) {
                          moveToNextBroadcastQueueRoom();
                        }
                      })();
                    },
                    variant: 'secondary',
                  },
                  {
                    label: activeBroadcastQueueRoom ? 'Passer a la suivante' : 'Selection suivante',
                    onPress: () => {
                      if (activeBroadcastQueueRoom) {
                        moveToNextBroadcastQueueRoom();
                        return;
                      }
                      if (nextBroadcastPendingRow) {
                        setSelectedBroadcastRoom(nextBroadcastPendingRow.room);
                      }
                    },
                    variant: 'secondary',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole === 'concierge' && activePage === 'reception' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Concierge" title="Reception" description="Page web dediee au front desk et a la validation des nouvelles entrees." />
          <TabSwitch
            value={receptionFilter}
            onChange={setReceptionFilter}
            tabs={[
              { key: 'all', label: 'Toutes' },
              { key: 'active', label: 'Actives' },
              { key: 'inactive', label: 'Inactives' },
            ]}
          />
          <View style={styles.dualGrid}>
            <DataTableCard
              title="Dernieres chambres enregistrees"
              description="Lecture reception pour verifier les nouvelles entrees."
              columns={[{ key: 'room', label: 'Chambre' }, { key: 'active', label: 'Etat' }, { key: 'created', label: 'Creee le' }]}
              rows={filteredReceptionRooms.map((room) => ({ room: room.numeroChambre, active: room.actif ? 'Active' : 'Inactive', created: String(room.createdAt).slice(0, 10) }))}
              searchable
              searchPlaceholder="Rechercher une chambre reception..."
              getRowKey={(row) => row.room}
              selectedRowKey={selectedReceptionRoom}
              onRowPress={(row) => {
                setSelectedReceptionRoom(row.room);
              }}
            />
            <ActionPanel
              title="Lecture reception"
              description="Poste utile pour accueil et validation."
              bullets={[
                `${metrics.recentRooms.length} chambres recentes affichees`,
                `${metrics.totalRooms} chambres totalisees`,
                metrics.monthConfigured ? 'parametres du mois visibles' : 'parametres du mois manquants',
                nextReceptionRoom ? `prochaine chambre a verifier: ${nextReceptionRoom.numeroChambre}` : 'aucune chambre reception visible',
                activeReceptionQueueRoom ? `file en cours: ${activeReceptionQueueRoom} (${remainingReceptionQueueCount} restantes)` : 'aucune file reception en cours',
              ]}
              actions={[
                {
                  label: 'Voir WhatsApp Web',
                  onPress: () => {
                    void openExternal('https://web.whatsapp.com/');
                  },
                },
                {
                  label: 'Ouvrir prochaine fiche',
                  onPress: () => {
                    if (!nextReceptionRoom) {
                      Alert.alert('MyHouse', 'Aucune chambre reception visible.');
                      return;
                    }
                    setSelectedReceptionRoom(nextReceptionRoom.numeroChambre);
                  },
                  variant: 'secondary',
                },
                {
                  label: activeReceptionQueueRoom ? 'Reprendre la file' : 'Demarrer la file',
                  onPress: () => {
                    if (activeReceptionQueueRoom) {
                      setSelectedReceptionRoom(activeReceptionQueueRoom);
                      return;
                    }
                    startReceptionQueue();
                  },
                },
              ]}
            />
          </View>
          {selectedReception ? (
            <View style={styles.panelRow}>
              <ActionPanel
                title={`Reception ${selectedReception.numeroChambre}`}
                description="Contexte rapide pour la chambre selectionnee."
                bullets={[
                  `etat: ${selectedReception.actif ? 'active' : 'inactive'}`,
                  `cree le ${String(selectedReception.createdAt).slice(0, 10)}`,
                  `bloc: ${selectedReception.bloc || 'non renseigne'}`,
                  selectedRoomReading ? 'releve du mois disponible' : 'releve du mois absent',
                  ...receptionChecklist.map((item) => `${item.label}: ${item.state}`),
                ]}
                actions={[
                  {
                    label: 'Editer la chambre',
                    onPress: openRoomEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedReceptionResident ? 'Editer le resident' : 'Resident non lie',
                    onPress: openResidentEditModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedReceptionResident ? 'Voir le resident' : 'Resident non lie',
                    onPress: openResidentDetailModal,
                    variant: 'secondary',
                  },
                  {
                    label: 'Saisir un releve',
                    onPress: openIndexModal,
                    variant: 'secondary',
                  },
                  {
                    label: selectedReception ? 'Basculer active/inactive' : 'Chambre non disponible',
                    onPress: () => {
                      if (!selectedReception) return;
                      void runAction(
                        'toggle-reception-inline',
                        () => patchRoom(selectedReception.id, { actif: !selectedReception.actif }).then(() => undefined),
                        `Chambre ${selectedReception.numeroChambre} mise a jour.`,
                      );
                    },
                  },
                  {
                    label: activeReceptionQueueRoom ? 'Passer a la suivante' : 'Selection suivante',
                    onPress: () => {
                      if (activeReceptionQueueRoom) {
                        moveToNextReceptionQueueRoom();
                        return;
                      }
                      if (nextReceptionRoom) {
                        setSelectedReceptionRoom(nextReceptionRoom.numeroChambre);
                      }
                    },
                    variant: 'secondary',
                  },
                  {
                    label: 'Effacer la selection',
                    onPress: () => setSelectedReceptionRoom(null),
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeRole !== 'manager' && activeRole !== 'concierge' && activePage === 'workspace' ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Metier" title="Espace specialise" description="Cette page preparera les experiences web dediees pour ce role." />
          <View style={styles.panelRow}>
            <ActionPanel title="Base web" description="Role reconnu dans la navigation web unifiee." bullets={['structure desktop-compatible', 'design system partage', 'donnees a brancher progressivement']} />
          </View>
        </View>
      ) : null}

      {activePage === 'delivery' ? (
        <>
          <View style={styles.section}>
            <SectionHeader eyebrow="Modules" title="Composants metier" description="Base des ecrans concrets a brancher progressivement." />
            <View style={styles.panelRow}>
              <ActionPanel title="Web" description="Le web couvre gestionnaires, concierge, admins et super admin." bullets={['navigation par sections', 'cockpit partage', 'surfaces metier dediees']} />
              <ActionPanel title="Desktop" description="Le logiciel bureau emballe le web console au lieu de dupliquer la logique." bullets={['meme UI', 'meme API', 'capabilities natives seulement en plus']} />
              <ActionPanel title="Mobile" description="Le mobile reste prioritaire pour terrain et residents." bullets={['locataire', 'concierge', 'gestionnaire']} />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              eyebrow="Runtime"
              title="Surface d execution"
              description="Le meme produit peut tourner en navigateur ou dans le shell bureau."
            />
            <View style={styles.panelRow}>
              <ActionPanel
                title={desktopBridge ? 'Desktop shell detecte' : 'Mode navigateur'}
                description={
                  desktopBridge
                    ? `Electron ${desktopBridge.versions.electron} sur ${desktopBridge.platform}.`
                    : 'Le web console tourne dans un navigateur classique.'
                }
                bullets={
                  desktopBridge
                    ? ['bridge natif disponible', 'ouverture de liens externe securisee', 'packaging bureau pret a renforcer']
                    : ['mode web responsive', 'base unique mobile/web/desktop', 'export web requis pour usage offline bureau']
                }
              />
            </View>
          </View>
        </>
      ) : null}

      <DetailModal
        visible={residentDetailVisible && activeResident != null}
        title={`Resident ${activeResident ? `${activeResident.nom} ${activeResident.prenom}`.trim() : ''}`}
        subtitle="Fiche resident visible depuis les postes gestionnaire et concierge."
        rows={activeResident ? [
          { label: 'Nom complet', value: `${activeResident.nom} ${activeResident.prenom}`.trim() || '-' },
          { label: 'WhatsApp', value: activeResident.whatsapp || 'non renseigne' },
          { label: 'Telephone', value: activeResident.telephone || 'non renseigne' },
          { label: 'Statut', value: activeResident.statut || 'non renseigne' },
          { label: 'Chambre courante', value: activeResidentRoom?.numeroChambre || 'non affecte' },
          { label: 'Factures liees', value: activeResidentInvoices.length > 0 ? activeResidentInvoices.map((invoice) => `${invoice.roomNumber}: ${Math.round(invoice.netAPayer).toLocaleString('fr-FR')} FCFA`).join(' | ') : 'aucune facture visible' },
          { label: 'Paiements lies', value: activeResidentPayments.length > 0 ? activeResidentPayments.map((payment) => `${payment.paidAt}: ${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`).join(' | ') : 'aucun paiement visible' },
          { label: 'Solde global visible', value: `${Math.max(0, Math.round(activeResidentOutstanding)).toLocaleString('fr-FR')} FCFA` },
          { label: 'Activite recente', value: activeResidentTimeline.length > 0 ? activeResidentTimeline.join(' | ') : 'aucune activite visible' },
        ] : []}
        actions={[
          {
            label: activeResident ? 'Editer le resident' : 'Resident non lie',
            onPress: () => {
              setResidentDetailVisible(false);
              openResidentEditModal();
            },
          },
          {
            label: activeResidentRoom ? 'Voir la chambre' : 'Chambre non affectee',
            onPress: () => {
              if (!activeResidentRoom) return;
              setResidentDetailVisible(false);
              navigateToRoomDetail(activeResidentRoom.numeroChambre);
            },
            variant: 'secondary',
          },
          {
            label: activeResidentInvoices[0] ? 'Voir la facture' : 'Aucune facture',
            onPress: () => {
              if (!activeResidentInvoices[0]) return;
              setResidentDetailVisible(false);
              navigateToInvoiceDetail(activeResidentInvoices[0].roomNumber);
            },
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setResidentDetailVisible(false),
            variant: 'secondary',
          },
        ]}
        onClose={() => setResidentDetailVisible(false)}
      />

      <DetailModal
        visible={selectedPortfolio != null && (activePage === 'portfolio' || activePage === 'terrain')}
        title={activePage === 'terrain' ? `Terrain ${selectedPortfolio?.room ?? ''}` : `Chambre ${selectedPortfolio?.room ?? ''}`}
        subtitle={activePage === 'terrain'
          ? 'Lecture terrain de la chambre selectionnee.'
          : 'Lecture portefeuille de la chambre selectionnee.'}
        rows={selectedPortfolio ? [
          { label: 'Chambre', value: selectedPortfolio.room },
          { label: 'Occupation', value: selectedRoomOccupancy },
          { label: 'Statut releve', value: selectedPortfolio.status },
          { label: 'Creation', value: selectedPortfolio.createdAt },
          { label: 'Bloc', value: selectedPortfolioRoomEntity?.bloc || 'non renseigne' },
          { label: 'Resident', value: selectedPortfolioResident ? `${selectedPortfolioResident.nom} ${selectedPortfolioResident.prenom}`.trim() : 'non lie' },
          { label: 'Facture du mois', value: selectedRoomInvoice ? `${Math.round(selectedRoomInvoice.netAPayer).toLocaleString('fr-FR')} FCFA / ${selectedRoomInvoice.statutEnvoi}` : 'aucune facture courante' },
          { label: 'Historique paiements', value: selectedRoomPayments.length > 0 ? selectedRoomPayments.map((payment) => `${payment.paidAt}: ${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`).join(' | ') : 'aucun paiement recent' },
          { label: 'Releve du mois', value: selectedRoomReading ? `Eau ${selectedRoomReading.anEau}->${selectedRoomReading.niEau} / Elec ${selectedRoomReading.anElec}->${selectedRoomReading.niElec}` : 'aucun releve saisi' },
          { label: 'Timeline', value: selectedRoomTimeline.length > 0 ? selectedRoomTimeline.join(' | ') : 'aucun evenement visible' },
          { label: 'Priorite', value: selectedPortfolio.status === 'En attente' ? 'Saisie terrain requise' : 'Couverture deja presente' },
        ] : []}
        actions={[
          ...(activePage === 'portfolio'
            ? [{
                label: 'Aller a la facturation',
                onPress: () => {
                  setManagerPage('billing');
                  setSelectedPortfolioRoom(null);
                },
              }]
            : []),
          {
            label: 'Editer la chambre',
            onPress: openRoomEditModal,
          },
          {
            label: selectedRoomInvoice ? 'Voir la facture' : 'Aucune facture',
            onPress: () => {
              if (!selectedRoomInvoice) return;
              setSelectedPortfolioRoom(null);
              navigateToInvoiceDetail(selectedRoomInvoice.roomNumber);
            },
            variant: 'secondary',
          },
          {
            label: selectedPortfolioResident ? 'Editer le resident' : 'Resident non lie',
            onPress: openResidentEditModal,
            variant: 'secondary',
          },
          {
            label: selectedPortfolioResident ? 'Voir le resident' : 'Resident non lie',
            onPress: openResidentDetailModal,
            variant: 'secondary',
          },
          {
            label: 'Saisir un releve',
            onPress: openIndexModal,
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setSelectedPortfolioRoom(null),
            variant: 'secondary',
          },
        ]}
        onClose={() => setSelectedPortfolioRoom(null)}
      />

      <DetailModal
        visible={selectedBillingInvoice != null}
        title={`Facture ${selectedBillingInvoice?.roomNumber ?? ''}`}
        subtitle="Fiche rapide de la facture selectionnee."
        rows={selectedBillingInvoice ? [
          { label: 'Chambre', value: selectedBillingInvoice.roomNumber },
          { label: 'Resident', value: selectedBillingResident ? `${selectedBillingResident.nom} ${selectedBillingResident.prenom}`.trim() : 'non lie' },
          { label: 'Phase', value: selectedBillingPhase },
          { label: 'Net a payer', value: `${Math.round(selectedBillingInvoice.netAPayer).toLocaleString('fr-FR')} FCFA` },
          { label: 'Total encaisse', value: `${Math.round(selectedBillingPaidAmount).toLocaleString('fr-FR')} FCFA` },
          { label: 'Solde restant', value: `${Math.round(selectedBillingRemaining).toLocaleString('fr-FR')} FCFA` },
          { label: 'Eau', value: `${Math.round(selectedBillingInvoice.water.montantTtc).toLocaleString('fr-FR')} FCFA / conso ${selectedBillingInvoice.water.conso}` },
          { label: 'Electricite', value: `${Math.round(selectedBillingInvoice.electricity.montantTtc).toLocaleString('fr-FR')} FCFA / conso ${selectedBillingInvoice.electricity.conso}` },
          { label: 'Statut envoi', value: selectedBillingInvoice.statutEnvoi },
          { label: 'Calculee le', value: String(selectedBillingInvoice.calculeeLe).slice(0, 10) },
          { label: 'Dette', value: `${Math.round(selectedBillingInvoice.dette ?? 0).toLocaleString('fr-FR')} FCFA` },
          { label: 'Historique paiements', value: selectedBillingPayments.length > 0 ? selectedBillingPayments.map((payment) => `${payment.paidAt}: ${Math.round(payment.amount).toLocaleString('fr-FR')} FCFA`).join(' | ') : 'aucun paiement enregistre' },
          { label: 'Timeline', value: selectedBillingTimeline.length > 0 ? selectedBillingTimeline.join(' | ') : 'aucun evenement visible' },
        ] : []}
        actions={[
          {
            label: 'Mettre a jour la dette',
            onPress: openDebtModal,
            variant: 'secondary',
          },
          {
            label: 'Enregistrer paiement',
            onPress: openPaymentModal,
          },
          {
            label: selectedBillingPayments[0] ? 'Voir un paiement' : 'Aucun paiement',
            onPress: () => {
              if (!selectedBillingPayments[0]) return;
              setSelectedBillingRoom(null);
              navigateToPaymentDetail(selectedBillingPayments[0].id);
            },
            variant: 'secondary',
          },
          {
            label: selectedBillingResident ? 'Voir le resident' : 'Resident non lie',
            onPress: openResidentDetailModal,
            variant: 'secondary',
          },
          {
            label: busyAction === 'billing-mark-sent' ? 'Mise a jour...' : 'Marquer envoyee',
            onPress: () => {
              if (!selectedBillingInvoice) return;
              void runAction(
                'billing-mark-sent',
                () => updateInvoiceSendStatus(selectedBillingInvoice.id, 'ENVOYE').then(() => undefined),
                `Facture ${selectedBillingInvoice.roomNumber} marquee comme envoyee.`,
              );
            },
          },
          {
            label: 'Fermer',
            onPress: () => setSelectedBillingRoom(null),
            variant: 'secondary',
          },
        ]}
        onClose={() => setSelectedBillingRoom(null)}
      />

      <DetailModal
        visible={contractDetailVisible && selectedContract != null}
        title={`Contrat ${selectedContract?.room ?? ''}`}
        subtitle="Fiche contractuelle bureau/web du logement selectionne."
        rows={selectedContract ? [
          { label: 'Chambre', value: selectedContract.room },
          { label: 'Resident', value: selectedContract.resident },
          { label: 'Statut contractuel', value: selectedContractEntry?.status || selectedContract.status },
          { label: 'Debut', value: selectedContractEntry?.startDate || 'non renseigne' },
          { label: 'Fin', value: selectedContractEntry?.endDate || 'non renseigne' },
          { label: 'Renouvellement', value: selectedContract.renewal },
          { label: 'Loyer mensuel', value: selectedContractEntry?.monthlyRent ? `${selectedContractEntry.monthlyRent} FCFA` : 'non renseigne' },
          { label: 'Caution', value: selectedContractEntry?.depositAmount ? `${selectedContractEntry.depositAmount} FCFA` : 'non renseignee' },
          { label: 'Signature', value: selectedContractEntry?.signatureMode || 'non renseignee' },
          { label: 'Renouvellement auto', value: selectedContractEntry?.autoRenew ? 'Oui' : 'Non' },
          { label: 'Solde courant', value: `${Math.round(selectedContract.balance).toLocaleString('fr-FR')} FCFA` },
          { label: 'Notes', value: selectedContractEntry?.notes || 'aucune note' },
        ] : []}
        actions={[
          {
            label: 'Editer le contrat',
            onPress: () => {
              setContractDetailVisible(false);
              openContractEditModal();
            },
          },
          {
            label: selectedContractResident ? 'Voir le resident' : 'Resident non lie',
            onPress: () => {
              setContractDetailVisible(false);
              openResidentDetailModal();
            },
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setContractDetailVisible(false),
            variant: 'secondary',
          },
        ]}
        onClose={() => setContractDetailVisible(false)}
      />

      <DetailModal
        visible={maintenanceDetailVisible && selectedMaintenance != null}
        title={`Ticket ${selectedMaintenance?.room ?? ''}`}
        subtitle="Fiche maintenance bureau/web pour suivi exploitation."
        rows={selectedMaintenance ? [
          { label: 'Chambre', value: selectedMaintenance.room },
          { label: 'Categorie', value: selectedMaintenance.category },
          { label: 'Priorite', value: selectedMaintenance.priority },
          { label: 'Statut', value: selectedMaintenance.status },
          { label: 'Type', value: selectedMaintenance.source === 'manual' ? 'Ticket manuel' : 'Incident deduit' },
          { label: 'Resident', value: selectedMaintenanceResident ? `${selectedMaintenanceResident.nom} ${selectedMaintenanceResident.prenom}`.trim() : 'non lie' },
          { label: 'Facture courante', value: selectedMaintenanceInvoice ? `${Math.round(selectedMaintenanceInvoice.netAPayer).toLocaleString('fr-FR')} FCFA` : 'aucune facture courante' },
          { label: 'Resume', value: selectedMaintenance.summary },
          { label: 'Assigne', value: selectedMaintenance.source === 'manual' ? (selectedMaintenance.assignee || 'non assigne') : 'non assigne' },
          { label: 'Notes', value: selectedMaintenance.source === 'manual' ? (selectedMaintenance.notes || 'aucune note') : 'incident automatique sans notes' },
        ] : []}
        actions={[
          {
            label: 'Editer le ticket',
            onPress: () => {
              setMaintenanceDetailVisible(false);
              openMaintenanceEditModal();
            },
          },
          {
            label: 'Ouvrir la chambre',
            onPress: () => {
              if (!selectedMaintenance) return;
              setMaintenanceDetailVisible(false);
              navigateToRoomDetail(selectedMaintenance.room);
            },
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setMaintenanceDetailVisible(false),
            variant: 'secondary',
          },
        ]}
        onClose={() => setMaintenanceDetailVisible(false)}
      />

      <DetailModal
        visible={documentDetailVisible && selectedDocument != null}
        title={selectedDocument?.title ?? 'Document'}
        subtitle="Fiche documentaire bureau/web pour le gestionnaire."
        rows={selectedDocument ? [
          { label: 'Titre', value: selectedDocument.title },
          { label: 'Chambre', value: selectedDocument.room },
          { label: 'Resident', value: selectedDocument.resident || 'non lie' },
          { label: 'Type', value: selectedDocument.type },
          { label: 'Statut', value: selectedDocument.status },
          { label: 'Date emission', value: selectedDocument.issuedOn || 'non renseignee' },
          { label: 'Date expiration', value: selectedDocument.expiresOn || 'non renseignee' },
          { label: 'Notes', value: selectedDocument.notes || 'aucune note' },
        ] : []}
        actions={[
          {
            label: 'Editer le document',
            onPress: () => {
              setDocumentDetailVisible(false);
              openDocumentEditModal();
            },
          },
          {
            label: 'Ouvrir la chambre',
            onPress: () => {
              if (!selectedDocument) return;
              setDocumentDetailVisible(false);
              navigateToRoomDetail(selectedDocument.room);
            },
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setDocumentDetailVisible(false),
            variant: 'secondary',
          },
        ]}
        onClose={() => setDocumentDetailVisible(false)}
      />

      <DetailModal
        visible={selectedPayment != null}
        title={`Paiement ${selectedPayment?.room ?? ''}`}
        subtitle="Fiche rapide de l encaissement selectionne."
        rows={selectedPayment ? [
          { label: 'Chambre', value: selectedPayment.room },
          { label: 'Montant', value: `${Math.round(selectedPayment.amount).toLocaleString('fr-FR')} FCFA` },
          { label: 'Date', value: selectedPayment.paidAt },
          { label: 'Observation', value: selectedPayment.note || '-' },
          { label: 'Lecture', value: 'Encaissement disponible pour rapprochement' },
        ] : []}
        actions={[
          {
            label: selectedPayment ? 'Voir la facture' : 'Aucune facture',
            onPress: () => {
              if (!selectedPayment) return;
              const linkedInvoice = metrics.invoices.find((invoice) => invoice.id === selectedPayment.invoiceId);
              if (!linkedInvoice) return;
              setSelectedPaymentRow(null);
              navigateToInvoiceDetail(linkedInvoice.roomNumber);
            },
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setSelectedPaymentRow(null),
          },
        ]}
        onClose={() => setSelectedPaymentRow(null)}
      />

      <DetailModal
        visible={selectedBroadcast != null}
        title={`Diffusion ${selectedBroadcast?.room ?? ''}`}
        subtitle="Fiche actionnable pour la facture en diffusion."
        rows={selectedBroadcast ? [
          { label: 'Chambre', value: selectedBroadcast.room },
          { label: 'Resident', value: selectedBroadcast.resident },
          { label: 'Net a payer', value: `${Math.round(selectedBroadcast.due).toLocaleString('fr-FR')} FCFA` },
          { label: 'Telephone', value: selectedBroadcast.phone || 'non renseigne' },
          { label: 'Statut', value: selectedBroadcast.status },
        ] : []}
        actions={[
          {
            label: 'Ouvrir WhatsApp',
            onPress: () => {
              void openExternal('https://web.whatsapp.com/');
            },
          },
          {
            label: busyAction === 'broadcast-selected-error' ? 'Marquage...' : 'Marquer en erreur',
            onPress: () => {
              if (!selectedBroadcast) return;
              void runAction(
                'broadcast-selected-error',
                () => updateInvoiceSendStatus(selectedBroadcast.invoiceId, 'ERREUR').then(() => undefined),
                `Facture ${selectedBroadcast.room} marquee en erreur.`,
              );
            },
            variant: 'secondary',
          },
          {
            label: busyAction === 'broadcast-selected-sent' ? 'Mise a jour...' : 'Marquer envoyee',
            onPress: () => {
              if (!selectedBroadcast) return;
              void runAction(
                'broadcast-selected-sent',
                () => updateInvoiceSendStatus(selectedBroadcast.invoiceId, 'ENVOYE').then(() => undefined),
                `Facture ${selectedBroadcast.room} marquee comme envoyee.`,
              );
            },
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setSelectedBroadcastRoom(null),
            variant: 'secondary',
          },
        ]}
        onClose={() => setSelectedBroadcastRoom(null)}
      />

      <DetailModal
        visible={selectedReception != null}
        title={`Reception ${selectedReception?.numeroChambre ?? ''}`}
        subtitle="Fiche rapide de la chambre selectionnee pour le front desk."
        rows={selectedReception ? [
          { label: 'Chambre', value: selectedReception.numeroChambre },
          { label: 'Occupation', value: selectedRoomOccupancy },
          { label: 'Etat', value: selectedReception.actif ? 'Active' : 'Inactive' },
          { label: 'Creation', value: String(selectedReception.createdAt).slice(0, 10) },
          { label: 'Bloc', value: selectedReception.bloc || 'non renseigne' },
          { label: 'Resident', value: selectedReceptionResident ? `${selectedReceptionResident.nom} ${selectedReceptionResident.prenom}`.trim() : 'non lie' },
          { label: 'Releve du mois', value: selectedRoomReading ? `Eau ${selectedRoomReading.anEau}->${selectedRoomReading.niEau} / Elec ${selectedRoomReading.anElec}->${selectedRoomReading.niElec}` : 'aucun releve saisi' },
          { label: 'Timeline', value: selectedRoomTimeline.length > 0 ? selectedRoomTimeline.join(' | ') : 'aucun evenement visible' },
        ] : []}
        actions={[
          {
            label: busyAction === 'toggle-reception-room' ? 'Mise a jour...' : (selectedReception?.actif ? 'Desactiver la chambre' : 'Activer la chambre'),
            onPress: () => {
              if (!selectedReception) return;
              void runAction(
                'toggle-reception-room',
                () => patchRoom(selectedReception.id, { actif: !selectedReception.actif }).then(() => undefined),
                `Chambre ${selectedReception.numeroChambre} mise a jour.`,
              );
            },
          },
          {
            label: 'Voir WhatsApp Web',
            onPress: () => {
              void openExternal('https://web.whatsapp.com/');
            },
          },
          {
            label: selectedReceptionResident ? 'Voir le resident' : 'Resident non lie',
            onPress: openResidentDetailModal,
            variant: 'secondary',
          },
          {
            label: 'Saisir un releve',
            onPress: openIndexModal,
            variant: 'secondary',
          },
          {
            label: 'Fermer',
            onPress: () => setSelectedReceptionRoom(null),
            variant: 'secondary',
          },
        ]}
        onClose={() => setSelectedReceptionRoom(null)}
      />

      <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enregistrer un paiement</Text>
            <Text style={styles.modalSubtitle}>
              {selectedBillingInvoice
                ? `Facture ${selectedBillingInvoice.roomNumber} - ${Math.round(selectedBillingInvoice.netAPayer).toLocaleString('fr-FR')} FCFA`
                : 'Selectionne une facture.'}
            </Text>

            <Text style={styles.modalLabel}>Montant</Text>
            <TextInput
              style={styles.modalInput}
              value={paymentForm.amount}
              onChangeText={(amount) => setPaymentForm((current) => ({ ...current, amount }))}
              placeholder="Ex: 15000"
              placeholderTextColor={colors.disabled}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Observation</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={paymentForm.note}
              onChangeText={(note) => setPaymentForm((current) => ({ ...current, note }))}
              placeholder="Note interne..."
              placeholderTextColor={colors.disabled}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void savePaymentFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={contractEditModalVisible} transparent animationType="fade" onRequestClose={() => setContractEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editer le contrat</Text>
            <Text style={styles.modalSubtitle}>
              {selectedContract ? `Fiche contractuelle de ${selectedContract.room}` : 'Selectionne un contrat.'}
            </Text>

            <View style={styles.modalGrid}>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Date de debut</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contractForm.startDate}
                  onChangeText={(startDate) => setContractForm((current) => ({ ...current, startDate }))}
                  placeholder="2026-03-01"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Date de fin</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contractForm.endDate}
                  onChangeText={(endDate) => setContractForm((current) => ({ ...current, endDate }))}
                  placeholder="2027-02-28"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Loyer mensuel</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contractForm.monthlyRent}
                  onChangeText={(monthlyRent) => setContractForm((current) => ({ ...current, monthlyRent }))}
                  placeholder="15000"
                  placeholderTextColor={colors.disabled}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Caution</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contractForm.depositAmount}
                  onChangeText={(depositAmount) => setContractForm((current) => ({ ...current, depositAmount }))}
                  placeholder="7500"
                  placeholderTextColor={colors.disabled}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Statut contractuel</Text>
            <View style={styles.inlineToggleRow}>
              {[
                { key: 'BROUILLON', label: 'Brouillon' },
                { key: 'ACTIF', label: 'Actif' },
                { key: 'A_RENOUVELER', label: 'A renouveler' },
                { key: 'EXPIRE', label: 'Expire' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.inlineToggleButton, contractForm.status === option.key && styles.inlineToggleButtonActive]}
                  onPress={() => setContractForm((current) => ({ ...current, status: option.key as ContractFormState['status'] }))}
                >
                  <Text style={[styles.inlineToggleText, contractForm.status === option.key && styles.inlineToggleTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Mode de signature</Text>
            <View style={styles.inlineToggleRow}>
              {[
                { key: 'PREAPPosee', label: 'Pre-apposee' },
                { key: 'PHYSIQUE', label: 'Physique' },
                { key: 'NUMERIQUE', label: 'Numerique' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.inlineToggleButton, contractForm.signatureMode === option.key && styles.inlineToggleButtonActive]}
                  onPress={() => setContractForm((current) => ({ ...current, signatureMode: option.key as ContractFormState['signatureMode'] }))}
                >
                  <Text style={[styles.inlineToggleText, contractForm.signatureMode === option.key && styles.inlineToggleTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setContractForm((current) => ({ ...current, autoRenew: !current.autoRenew }))}
            >
              <View style={[styles.checkboxBox, contractForm.autoRenew && styles.checkboxBoxActive]} />
              <Text style={styles.checkboxLabel}>Renouvellement automatique</Text>
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Notes contrat</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={contractForm.notes}
              onChangeText={(notes) => setContractForm((current) => ({ ...current, notes }))}
              placeholder="Clauses, observations, pieces recues..."
              placeholderTextColor={colors.disabled}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setContractEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveContractFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={maintenanceModalVisible} transparent animationType="fade" onRequestClose={() => setMaintenanceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ticket maintenance</Text>
            <Text style={styles.modalSubtitle}>Creer ou mettre a jour un ticket d exploitation pour le gestionnaire.</Text>

            <View style={styles.modalGrid}>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Chambre</Text>
                <TextInput
                  style={styles.modalInput}
                  value={maintenanceForm.room}
                  onChangeText={(room) => setMaintenanceForm((current) => ({ ...current, room }))}
                  placeholder="Ex: A01"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Categorie</Text>
                <TextInput
                  style={styles.modalInput}
                  value={maintenanceForm.category}
                  onChangeText={(category) => setMaintenanceForm((current) => ({ ...current, category }))}
                  placeholder="Maintenance, Releve, Facturation..."
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Assigne</Text>
                <TextInput
                  style={styles.modalInput}
                  value={maintenanceForm.assignee}
                  onChangeText={(assignee) => setMaintenanceForm((current) => ({ ...current, assignee }))}
                  placeholder="Nom du responsable"
                  placeholderTextColor={colors.disabled}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Priorite</Text>
            <View style={styles.inlineToggleRow}>
              {['Haute', 'Moyenne', 'Basse'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[styles.inlineToggleButton, maintenanceForm.priority === priority && styles.inlineToggleButtonActive]}
                  onPress={() => setMaintenanceForm((current) => ({ ...current, priority: priority as MaintenanceTicketPriority }))}
                >
                  <Text style={[styles.inlineToggleText, maintenanceForm.priority === priority && styles.inlineToggleTextActive]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Statut</Text>
            <View style={styles.inlineToggleRow}>
              {[
                { key: 'OUVERT', label: 'Ouvert' },
                { key: 'EN_COURS', label: 'En cours' },
                { key: 'PLANIFIE', label: 'Planifie' },
                { key: 'RESOLU', label: 'Resolu' },
              ].map((status) => (
                <TouchableOpacity
                  key={status.key}
                  style={[styles.inlineToggleButton, maintenanceForm.status === status.key && styles.inlineToggleButtonActive]}
                  onPress={() => setMaintenanceForm((current) => ({ ...current, status: status.key as MaintenanceTicketStatus }))}
                >
                  <Text style={[styles.inlineToggleText, maintenanceForm.status === status.key && styles.inlineToggleTextActive]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Resume</Text>
            <TextInput
              style={styles.modalInput}
              value={maintenanceForm.summary}
              onChangeText={(summary) => setMaintenanceForm((current) => ({ ...current, summary }))}
              placeholder="Resume court du probleme"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={maintenanceForm.notes}
              onChangeText={(notes) => setMaintenanceForm((current) => ({ ...current, notes }))}
              placeholder="Actions prevues, pieces, technicien, suivi..."
              placeholderTextColor={colors.disabled}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setMaintenanceModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveMaintenanceFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={documentModalVisible} transparent animationType="fade" onRequestClose={() => setDocumentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Document gestionnaire</Text>
            <Text style={styles.modalSubtitle}>Creer ou mettre a jour un document locatif ou d exploitation.</Text>

            <View style={styles.modalGrid}>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Chambre</Text>
                <TextInput
                  style={styles.modalInput}
                  value={documentForm.room}
                  onChangeText={(room) => setDocumentForm((current) => ({ ...current, room }))}
                  placeholder="Ex: A01"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Resident</Text>
                <TextInput
                  style={styles.modalInput}
                  value={documentForm.resident}
                  onChangeText={(resident) => setDocumentForm((current) => ({ ...current, resident }))}
                  placeholder="Nom du resident"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Titre</Text>
                <TextInput
                  style={styles.modalInput}
                  value={documentForm.title}
                  onChangeText={(title) => setDocumentForm((current) => ({ ...current, title }))}
                  placeholder="Contrat A01, Etat des lieux..."
                  placeholderTextColor={colors.disabled}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.inlineToggleRow}>
              {[
                { key: 'CONTRAT', label: 'Contrat' },
                { key: 'PIECE_LOCATIVE', label: 'Piece' },
                { key: 'ETAT_DES_LIEUX', label: 'Etat des lieux' },
                { key: 'PV', label: 'PV' },
                { key: 'AUTRE', label: 'Autre' },
              ].map((typeOption) => (
                <TouchableOpacity
                  key={typeOption.key}
                  style={[styles.inlineToggleButton, documentForm.type === typeOption.key && styles.inlineToggleButtonActive]}
                  onPress={() => setDocumentForm((current) => ({ ...current, type: typeOption.key as DocumentType }))}
                >
                  <Text style={[styles.inlineToggleText, documentForm.type === typeOption.key && styles.inlineToggleTextActive]}>
                    {typeOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Statut</Text>
            <View style={styles.inlineToggleRow}>
              {[
                { key: 'BROUILLON', label: 'Brouillon' },
                { key: 'VALIDE', label: 'Valide' },
                { key: 'A_SIGNER', label: 'A signer' },
                { key: 'ARCHIVE', label: 'Archive' },
              ].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption.key}
                  style={[styles.inlineToggleButton, documentForm.status === statusOption.key && styles.inlineToggleButtonActive]}
                  onPress={() => setDocumentForm((current) => ({ ...current, status: statusOption.key as DocumentStatus }))}
                >
                  <Text style={[styles.inlineToggleText, documentForm.status === statusOption.key && styles.inlineToggleTextActive]}>
                    {statusOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalGrid}>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Date emission</Text>
                <TextInput
                  style={styles.modalInput}
                  value={documentForm.issuedOn}
                  onChangeText={(issuedOn) => setDocumentForm((current) => ({ ...current, issuedOn }))}
                  placeholder="2026-03-15"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Date expiration</Text>
                <TextInput
                  style={styles.modalInput}
                  value={documentForm.expiresOn}
                  onChangeText={(expiresOn) => setDocumentForm((current) => ({ ...current, expiresOn }))}
                  placeholder="2027-03-15"
                  placeholderTextColor={colors.disabled}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={documentForm.notes}
              onChangeText={(notes) => setDocumentForm((current) => ({ ...current, notes }))}
              placeholder="Reference, emplacement, commentaires..."
              placeholderTextColor={colors.disabled}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDocumentModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveDocumentFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={roomEditModalVisible} transparent animationType="fade" onRequestClose={() => setRoomEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editer la chambre</Text>
            <Text style={styles.modalSubtitle}>Mets a jour le numero et le bloc sans quitter la console.</Text>

            <Text style={styles.modalLabel}>Numero de chambre</Text>
            <TextInput
              style={styles.modalInput}
              value={roomForm.numeroChambre}
              onChangeText={(numeroChambre) => setRoomForm((current) => ({ ...current, numeroChambre }))}
              placeholder="Ex: A01"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.modalLabel}>Bloc</Text>
            <TextInput
              style={styles.modalInput}
              value={roomForm.bloc}
              onChangeText={(bloc) => setRoomForm((current) => ({ ...current, bloc }))}
              placeholder="Ex: A"
              placeholderTextColor={colors.disabled}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setRoomEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveRoomFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={residentEditModalVisible} transparent animationType="fade" onRequestClose={() => setResidentEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editer le resident</Text>
            <Text style={styles.modalSubtitle}>Mets a jour l identite et les contacts du resident lie.</Text>

            <Text style={styles.modalLabel}>Nom</Text>
            <TextInput
              style={styles.modalInput}
              value={residentForm.nom}
              onChangeText={(nom) => setResidentForm((current) => ({ ...current, nom }))}
              placeholder="Nom"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.modalLabel}>Prenom</Text>
            <TextInput
              style={styles.modalInput}
              value={residentForm.prenom}
              onChangeText={(prenom) => setResidentForm((current) => ({ ...current, prenom }))}
              placeholder="Prenom"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.modalLabel}>WhatsApp</Text>
            <TextInput
              style={styles.modalInput}
              value={residentForm.whatsapp}
              onChangeText={(whatsapp) => setResidentForm((current) => ({ ...current, whatsapp }))}
              placeholder="699001122"
              placeholderTextColor={colors.disabled}
            />

            <Text style={styles.modalLabel}>Telephone</Text>
            <TextInput
              style={styles.modalInput}
              value={residentForm.telephone}
              onChangeText={(telephone) => setResidentForm((current) => ({ ...current, telephone }))}
              placeholder="699001122"
              placeholderTextColor={colors.disabled}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setResidentEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveResidentFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={debtModalVisible} transparent animationType="fade" onRequestClose={() => setDebtModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mettre a jour la dette</Text>
            <Text style={styles.modalSubtitle}>
              {selectedBillingInvoice ? `Facture ${selectedBillingInvoice.roomNumber}` : 'Selectionne une facture.'}
            </Text>

            <Text style={styles.modalLabel}>Dette reportee</Text>
            <TextInput
              style={styles.modalInput}
              value={debtForm.dette}
              onChangeText={(dette) => setDebtForm({ dette })}
              placeholder="Ex: 2500"
              placeholderTextColor={colors.disabled}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDebtModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveDebtFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={indexModalVisible} transparent animationType="fade" onRequestClose={() => setIndexModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Saisir un releve</Text>
            <Text style={styles.modalSubtitle}>
              {selectedRoomEntity
                ? `Chambre ${selectedRoomEntity.numeroChambre} - mois ${metrics.month}${activeTerrainQueueRoom ? ` - tournee (${remainingTerrainQueueCount} restantes apres celle-ci)` : ''}`
                : 'Selectionne une chambre.'}
            </Text>

            <View style={styles.modalGrid}>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Ancien index eau</Text>
                <TextInput
                  style={styles.modalInput}
                  value={indexForm.anEau}
                  onChangeText={(anEau) => setIndexForm((current) => ({ ...current, anEau }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Nouvel index eau</Text>
                <TextInput
                  style={styles.modalInput}
                  value={indexForm.niEau}
                  onChangeText={(niEau) => setIndexForm((current) => ({ ...current, niEau }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Ancien index elec</Text>
                <TextInput
                  style={styles.modalInput}
                  value={indexForm.anElec}
                  onChangeText={(anElec) => setIndexForm((current) => ({ ...current, anElec }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <View style={styles.modalGridItem}>
                <Text style={styles.modalLabel}>Nouvel index elec</Text>
                <TextInput
                  style={styles.modalInput}
                  value={indexForm.niElec}
                  onChangeText={(niElec) => setIndexForm((current) => ({ ...current, niElec }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.disabled}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Presence</Text>
            <View style={styles.inlineToggleRow}>
              <TouchableOpacity
                style={[styles.inlineToggleButton, indexForm.statutPresence === 'PRESENT' && styles.inlineToggleButtonActive]}
                onPress={() => setIndexForm((current) => ({ ...current, statutPresence: 'PRESENT' }))}
              >
                <Text style={[styles.inlineToggleText, indexForm.statutPresence === 'PRESENT' && styles.inlineToggleTextActive]}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inlineToggleButton, indexForm.statutPresence === 'ABSENT' && styles.inlineToggleButtonActive]}
                onPress={() => setIndexForm((current) => ({ ...current, statutPresence: 'ABSENT' }))}
              >
                <Text style={[styles.inlineToggleText, indexForm.statutPresence === 'ABSENT' && styles.inlineToggleTextActive]}>Absent</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIndexForm((current) => ({ ...current, amendeEau: !current.amendeEau }))}
            >
              <View style={[styles.checkboxBox, indexForm.amendeEau && styles.checkboxBoxActive]} />
              <Text style={styles.checkboxLabel}>Appliquer amende eau</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIndexModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              {activeTerrainQueueRoom ? (
                <TouchableOpacity style={styles.modalCancelButton} onPress={moveToNextTerrainQueueRoom}>
                  <Text style={styles.modalCancelText}>Passer</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveIndexFromModal(); }}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
              {activeTerrainQueueRoom ? (
                <TouchableOpacity style={styles.modalSaveButton} onPress={() => { void saveIndexFromModal(true); }}>
                  <Text style={styles.modalSaveText}>Enregistrer et suivante</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </ConsoleShell>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      gap: 14,
    },
    dualGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    panelRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    pageIntroCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    pageIntroCopy: {
      flex: 1,
      gap: 4,
    },
    pageIntroEyebrow: {
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    pageIntroTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    pageIntroText: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
    },
    pageIntroButton: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.secondary,
    },
    pageIntroButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },
    stackColumn: {
      flex: 1,
      minWidth: 320,
      gap: 14,
    },
    tabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    tabButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    tabButtonTextActive: {
      color: colors.white,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(5, 16, 28, 0.58)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 560,
      backgroundColor: colors.cardBg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      gap: 12,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    modalSubtitle: {
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 20,
    },
    modalLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 4,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    modalTextarea: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 6,
    },
    modalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    modalGridItem: {
      minWidth: 220,
      flex: 1,
    },
    modalCancelButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    modalCancelText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    modalSaveButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    modalSaveText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },
    inlineToggleRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    inlineToggleButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    inlineToggleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    inlineToggleText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    inlineToggleTextActive: {
      color: colors.white,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    checkboxBox: {
      width: 18,
      height: 18,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    checkboxBoxActive: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    checkboxLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
