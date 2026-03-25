import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabaseOptional } from '../database/DatabaseContext';
import { useAuth } from '../database/AuthContext';
import { usePreferences } from '../database/PreferencesContext';
import {
  assignResidentRoom,
  calculateBilling,
  cancelIndexPenalty,
  createPayment,
  createResident,
  createRoom,
  exportPaymentReceiptPdf,
  getRecoveryEmail,
  listPaymentsByInvoice,
  patchResident,
  patchRoom,
  recordPayment,
  setRecoveryEmail,
  updateInvoiceDebt,
  updateInvoiceSendStatus,
  upsertIndexReading,
  upsertMonthConfig,
} from '../services/BackendApi';
import { exportComplet, exportInvoices, exportPayments, exportResidents } from '../services/ExportService';
import { sendWhatsAppBroadcastMessage } from '../services/WhatsAppService';
import { useMyHouseConsoleData } from '../hooks/useMyHouseConsoleData';

type PageKey = 'home' | 'indexes' | 'rooms' | 'invoices' | 'payments' | 'whatsappSend' | 'broadcast' | 'contracts' | 'maintenance' | 'reports' | 'settings';

type RoomForm = {
  roomId: number | null;
  residentId: number | null;
  numero: string;
  nom: string;
  whatsapp: string;
};

type PaymentForm = {
  invoiceId: number | null;
  amount: string;
  method: string;
  note: string;
};

type IndexForm = {
  anEau: string;
  niEau: string;
  anElec: string;
  niElec: string;
  presence: boolean;
  amende: boolean;
};

type MonthForm = {
  puEau: string;
  puElectricite: string;
  lcEau: string;
  lcElectricite: string;
  surplusEauTotal: string;
  surplusElecTotal: string;
  amendeEauMontant: string;
  minimumFacture: string;
  tva: string;
  delaiPaiement: string;
};

type FlashMessage = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

const LIGHT_COLORS = {
  bg: '#EEF3FB',
  card: '#FFFFFF',
  border: '#D7E1F0',
  text: '#1B2438',
  muted: '#6F7C91',
  primary: '#2C65B0',
  teal: '#16B5AE',
  darkTeal: '#10867F',
  success: '#2FB34A',
  danger: '#E6405F',
  warning: '#F39C12',
  sidebar: '#F7FAFF',
};

const DARK_COLORS = {
  bg: '#121A24',
  card: '#27303F',
  border: '#3A4655',
  text: '#F8FAFC',
  muted: '#A7B2C2',
  primary: '#214B86',
  teal: '#18B8B0',
  darkTeal: '#10867F',
  success: '#2FB34A',
  danger: '#FF5A5F',
  warning: '#F2A93B',
  sidebar: '#101720',
};

const PAGE_META: Array<{ key: PageKey; labelKey: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'home', labelKey: 'home', icon: 'home-outline' },
  { key: 'indexes', labelKey: 'indexEntry', icon: 'create-outline' },
  { key: 'rooms', labelKey: 'rooms', icon: 'business-outline' },
  { key: 'invoices', labelKey: 'invoices', icon: 'calculator-outline' },
  { key: 'payments', labelKey: 'payments', icon: 'card-outline' },
  { key: 'whatsappSend', labelKey: 'whatsappSend', icon: 'paper-plane-outline' },
  { key: 'broadcast', labelKey: 'whatsappBroadcast', icon: 'megaphone-outline' },
  { key: 'contracts', labelKey: 'contracts', icon: 'document-text-outline' },
  { key: 'maintenance', labelKey: 'maintenance', icon: 'construct-outline' },
  { key: 'reports', labelKey: 'reports', icon: 'stats-chart-outline' },
  { key: 'settings', labelKey: 'settings', icon: 'settings-outline' },
];

function translateSendStatus(status: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR', t: (key: string) => string): string {
  if (status === 'NON_ENVOYE') return t('unsentInvoices');
  if (status === 'ENVOYE') return t('sentInvoices');
  return t('invoicesInError');
}

function toMonthLabel(month: string): string {
  const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  const [year, monthNumber] = month.split('-');
  const index = Math.max(0, (Number(monthNumber) || 1) - 1);
  return `${months[index]} ${year}`;
}

function parseMoney(value: string): number {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

function splitResidentName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const nom = parts.shift() ?? '';
  const prenom = parts.join(' ') || '-';
  return { nom, prenom };
}

export default function MeterTrackDesktopScreen({ embedded = false, defaultPage = 'home' }: { embedded?: boolean; defaultPage?: PageKey }) {
  const { t, language, setLanguage, themeMode, setThemeMode } = usePreferences();
  const { logout, changePassword, activeRole } = useAuth();
  const db = useDatabaseOptional();
  const { loading, metrics, reload } = useMyHouseConsoleData();
  const palette = themeMode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(palette), [palette]);
  sharedStyles = styles;

  const [page, setPage] = useState<PageKey>(defaultPage);
  const [search, setSearch] = useState('');
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomForm>({ roomId: null, residentId: null, numero: '', nom: '', whatsapp: '' });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ invoiceId: null, amount: '', method: 'MOBILE_MONEY', note: '' });
  const [invoicePayments, setInvoicePayments] = useState<Array<{
    id: number;
    amount: number;
    method: string;
    status: string;
    transactionRef: string | null;
    observation: string | null;
    paidAt: string;
  }>>([]);
  const [debtDrafts, setDebtDrafts] = useState<Record<number, string>>({});
  const [indexForms, setIndexForms] = useState<Record<number, IndexForm>>({});
  const [recoveryEmail, setRecoveryEmailState] = useState('');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [monthForm, setMonthForm] = useState<MonthForm>({
    puEau: '',
    puElectricite: '',
    lcEau: '',
    lcElectricite: '',
    surplusEauTotal: '',
    surplusElecTotal: '',
    amendeEauMontant: '',
    minimumFacture: '',
    tva: '',
    delaiPaiement: '',
  });

  useEffect(() => {
    const drafts: Record<number, string> = {};
    metrics.invoices.forEach((invoice) => {
      drafts[invoice.id] = invoice.dette != null ? String(invoice.dette) : '';
    });
    setDebtDrafts(drafts);
  }, [metrics.invoices]);

  useEffect(() => {
    if (embedded) {
      setPage(defaultPage);
    }
  }, [defaultPage, embedded]);

  useEffect(() => {
    if (!flashMessage) return undefined;
    const timer = setTimeout(() => setFlashMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  useEffect(() => {
    const nextForms: Record<number, IndexForm> = {};
    metrics.rooms
      .filter((room) => room.actif)
      .forEach((room) => {
        const reading = metrics.readings.find((item) => item.roomId === room.id);
        nextForms[room.id] = {
          anEau: reading ? String(reading.anEau) : '0',
          niEau: reading ? String(reading.niEau) : '',
          anElec: reading ? String(reading.anElec) : '0',
          niElec: reading ? String(reading.niElec) : '',
          presence: reading ? reading.statutPresence === 'PRESENT' : true,
          amende: reading ? reading.amendeEau : false,
        };
      });
    setIndexForms(nextForms);
  }, [metrics.rooms, metrics.readings]);

  useEffect(() => {
    setMonthForm({
      puEau: metrics.monthConfig ? String(metrics.monthConfig.puEau) : '',
      puElectricite: metrics.monthConfig ? String(metrics.monthConfig.puElectricite) : '',
      lcEau: metrics.monthConfig ? String(metrics.monthConfig.lcEau) : '',
      lcElectricite: metrics.monthConfig ? String(metrics.monthConfig.lcElectricite) : '',
      surplusEauTotal: metrics.monthConfig ? String(metrics.monthConfig.surplusEauTotal) : '',
      surplusElecTotal: metrics.monthConfig ? String(metrics.monthConfig.surplusElecTotal) : '',
      amendeEauMontant: metrics.monthConfig ? String(metrics.monthConfig.amendeEauMontant) : '3000',
      minimumFacture: metrics.monthConfig ? String(metrics.monthConfig.minimumFacture) : '500',
      tva: metrics.monthConfig ? String(metrics.monthConfig.tva) : '',
      delaiPaiement: metrics.monthConfig?.delaiPaiement ?? '',
    });
  }, [metrics.monthConfig]);

  useEffect(() => {
    void (async () => {
      try {
        const result = await getRecoveryEmail();
        setRecoveryEmailState(result.recoveryEmail ?? '');
      } catch {
        setRecoveryEmailState('');
      }
    })();
  }, []);

  const residentByRoomId = useMemo(() => {
    const map = new Map<number, (typeof metrics.residents)[number]>();
    metrics.residents.forEach((resident) => {
      if (resident.currentRoomId != null && resident.statut !== 'INACTIF') {
        map.set(resident.currentRoomId, resident);
      }
    });
    return map;
  }, [metrics.residents]);

  const payedByInvoiceId = useMemo(() => {
    const map = new Map<number, number>();
    metrics.payments.forEach((payment) => {
      map.set(payment.invoiceId, (map.get(payment.invoiceId) ?? 0) + payment.amount);
    });
    return map;
  }, [metrics.payments]);

  const consumptionStats = useMemo(() => {
    const rows = metrics.invoices.map((invoice) => {
      const resident = residentByRoomId.get(invoice.roomId);
      const residentName = resident ? `${resident.nom} ${resident.prenom}`.trim() : invoice.roomNumber;
      return {
        room: invoice.roomNumber,
        resident: residentName || '-',
        water: invoice.water.conso,
        elec: invoice.electricity.conso,
        total: invoice.totalFacture,
      };
    });
    const avgWater = rows.length ? rows.reduce((sum, row) => sum + row.water, 0) / rows.length : 0;
    const avgElec = rows.length ? rows.reduce((sum, row) => sum + row.elec, 0) / rows.length : 0;
    return {
      avgWater,
      avgElec,
      topWater: [...rows].sort((a, b) => b.water - a.water).slice(0, 10),
      topElec: [...rows].sort((a, b) => b.elec - a.elec).slice(0, 10),
      topTotal: [...rows].sort((a, b) => b.total - a.total).slice(0, 10),
      anomalies: rows.filter((row) => (avgWater > 0 && row.water > avgWater * 2) || (avgElec > 0 && row.elec > avgElec * 2)),
      topWaterBills: [...rows].sort((a, b) => b.water - a.water).slice(0, 10),
      topElecBills: [...rows].sort((a, b) => b.elec - a.elec).slice(0, 10),
    };
  }, [metrics.invoices, residentByRoomId]);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return metrics.rooms;
    return metrics.rooms.filter((room) => {
      const resident = residentByRoomId.get(room.id);
      const fullName = resident ? `${resident.nom} ${resident.prenom}`.trim().toLowerCase() : '';
      return room.numeroChambre.toLowerCase().includes(query) || fullName.includes(query);
    });
  }, [metrics.rooms, residentByRoomId, search]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return metrics.invoices;
    return metrics.invoices.filter((invoice) => {
      const resident = residentByRoomId.get(invoice.roomId);
      const fullName = resident ? `${resident.nom} ${resident.prenom}`.trim().toLowerCase() : '';
      return invoice.roomNumber.toLowerCase().includes(query) || fullName.includes(query);
    });
  }, [metrics.invoices, residentByRoomId, search]);

  const openRoomModal = (roomId?: number) => {
    if (!roomId) {
      setRoomForm({ roomId: null, residentId: null, numero: '', nom: '', whatsapp: '' });
      setRoomModalVisible(true);
      return;
    }
    const room = metrics.rooms.find((item) => item.id === roomId);
    const resident = residentByRoomId.get(roomId);
    if (!room) return;
    setRoomForm({
      roomId: room.id,
      residentId: resident?.id ?? null,
      numero: room.numeroChambre,
      nom: resident ? `${resident.nom} ${resident.prenom}`.trim() : '',
      whatsapp: resident?.whatsapp ?? resident?.telephone ?? '',
    });
    setRoomModalVisible(true);
  };

  const openPaymentModal = (invoiceId: number) => {
    setPaymentForm({ invoiceId, amount: '', method: 'MOBILE_MONEY', note: '' });
    setPaymentModalVisible(true);
  };

  const notifyUser = (type: FlashMessage['type'], title: string, message: string) => {
    setFlashMessage({ type, title, message });
  };

  const saveRoom = async () => {
    const numero = roomForm.numero.trim().toUpperCase();
    const fullName = roomForm.nom.trim();
    const whatsapp = roomForm.whatsapp.trim();
    if (!numero || !fullName || !whatsapp) {
      notifyUser('error', t('error'), t('fillAllFields'));
      return;
    }
    const { nom, prenom } = splitResidentName(fullName);
    try {
      if (roomForm.roomId) {
        await patchRoom(roomForm.roomId, { numeroChambre: numero });
        if (roomForm.residentId) {
          await patchResident(roomForm.residentId, { nom, prenom, whatsapp, telephone: whatsapp });
        } else {
          const createdResident = await createResident({ nom, prenom, whatsapp, telephone: whatsapp });
          await assignResidentRoom(createdResident.id, roomForm.roomId, new Date().toISOString().slice(0, 10));
        }
      } else {
        const createdRoom = await createRoom({ numeroChambre: numero });
        const createdResident = await createResident({ nom, prenom, whatsapp, telephone: whatsapp });
        await assignResidentRoom(createdResident.id, createdRoom.id, new Date().toISOString().slice(0, 10));
      }
      setRoomModalVisible(false);
      reload();
      notifyUser('success', t('success'), `${numero} ${t('save').toLowerCase()}.`);
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const toggleRoomStatus = async (roomId: number, actif: boolean) => {
    try {
      await patchRoom(roomId, { actif: !actif });
      reload();
      notifyUser('success', t('success'), `CH ${metrics.rooms.find((room) => room.id === roomId)?.numeroChambre ?? roomId}`);
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const runCalculation = async () => {
    try {
      const result = await calculateBilling(metrics.month, true);
      if (!result.success) {
        const firstMessage = result.errors[0]?.message ?? t('cannotSaveData');
        notifyUser('error', t('error'), firstMessage);
        return;
      }
      notifyUser('success', t('success'), `${result.count} ${t('monthSuffixInvoices')} calculee(s).`);
      reload();
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('noInvoicesCalculated'));
    }
  };

  const saveDebt = async (invoiceId: number) => {
    try {
      const debt = debtDrafts[invoiceId]?.trim() ? parseMoney(debtDrafts[invoiceId]) : null;
      await updateInvoiceDebt(invoiceId, debt);
      reload();
      notifyUser('success', t('success'), t('debtLabel'));
    } catch {
      notifyUser('error', t('error'), t('cannotUpdateDebt'));
    }
  };

  const savePayment = async () => {
    if (!paymentForm.invoiceId || !paymentForm.amount.trim()) {
      notifyUser('error', t('error'), t('fillAllFields'));
      return;
    }
    try {
      const amount = parseMoney(paymentForm.amount);
      try {
        await createPayment({
          invoiceId: paymentForm.invoiceId,
          amount,
          method: paymentForm.method || 'MOBILE_MONEY',
          observation: paymentForm.note.trim() || null,
        });
      } catch {
        await recordPayment(paymentForm.invoiceId, amount, `${paymentForm.method || 'MANUAL'}${paymentForm.note.trim() ? ` | ${paymentForm.note.trim()}` : ''}`);
      }
      setPaymentModalVisible(false);
      reload();
      notifyUser('success', t('success'), t('paymentRecorded'));
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const updateIndexForm = (roomId: number, field: keyof IndexForm, value: string | boolean) => {
    setIndexForms((current) => ({
      ...current,
      [roomId]: {
        ...current[roomId],
        [field]: value,
      },
    }));
  };

  const saveIndexReading = async (roomId: number) => {
    const form = indexForms[roomId];
    const room = metrics.rooms.find((item) => item.id === roomId);
    if (!form || !room) return;

    const anEau = parseMoney(form.anEau);
    const niEau = parseMoney(form.niEau);
    const anElec = parseMoney(form.anElec);
    const niElec = parseMoney(form.niElec);

    if (niEau < anEau) {
      notifyUser('error', t('error'), `CH ${room.numeroChambre}: NI eau < AN eau`);
      return;
    }
    if (niElec < anElec) {
      notifyUser('error', t('error'), `CH ${room.numeroChambre}: NI elec < AN elec`);
      return;
    }

    try {
      await upsertIndexReading({
        roomId,
        mois: metrics.month,
        anEau,
        niEau,
        anElec,
        niElec,
        statutPresence: form.presence ? 'PRESENT' : 'ABSENT',
        amendeEau: form.amende,
        saisiPar: 'desktop-metertrack',
      });
      notifyUser('success', t('success'), `CH ${room.numeroChambre} ${t('save').toLowerCase()}.`);
      reload();
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const saveMonthConfig = async () => {
    try {
      await upsertMonthConfig(metrics.month, {
        puEau: parseMoney(monthForm.puEau),
        puElectricite: parseMoney(monthForm.puElectricite),
        lcEau: parseMoney(monthForm.lcEau),
        lcElectricite: parseMoney(monthForm.lcElectricite),
        surplusEauTotal: parseMoney(monthForm.surplusEauTotal),
        surplusElecTotal: parseMoney(monthForm.surplusElecTotal),
        amendeEauMontant: parseMoney(monthForm.amendeEauMontant),
        minimumFacture: parseMoney(monthForm.minimumFacture),
        tva: parseMoney(monthForm.tva),
        exportsValidatedByConcierge: false,
        exportsValidatedAt: null,
        exportsValidatedBy: null,
        delaiPaiement: monthForm.delaiPaiement.trim(),
      });
      setMonthModalVisible(false);
      reload();
      notifyUser('success', t('success'), t('monthParamsSaved'));
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const saveRecovery = async () => {
    try {
      await setRecoveryEmail(recoveryEmail.trim());
      notifyUser('success', t('success'), t('recoveryEmailSaved'));
    } catch {
      notifyUser('error', t('error'), t('cannotSaveData'));
    }
  };

  const savePassword = async () => {
    if (!db) {
      notifyUser('error', t('error'), 'Changement de mot de passe indisponible sur ce runtime.');
      return;
    }
    if (!oldPwd || !newPwd || !confirmPwd) {
      notifyUser('error', t('error'), t('fillAllFields'));
      return;
    }
    if (newPwd !== confirmPwd) {
      notifyUser('error', t('error'), t('passwordMismatch'));
      return;
    }
    const success = await changePassword(db, oldPwd, newPwd);
    if (!success) {
      notifyUser('error', t('error'), t('oldPasswordWrong'));
      return;
    }
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
    notifyUser('success', t('success'), t('passwordChanged'));
  };

  const triggerExport = async (kind: 'residents' | 'invoices' | 'payments' | 'complet') => {
    if (!db) {
      notifyUser('error', t('error'), 'Export indisponible sur ce runtime pour le moment.');
      return;
    }
    if (!metrics.monthConfig?.exportsValidatedByConcierge) {
      notifyUser('error', t('error'), 'Export bloque: validation Concierge obligatoire avant diffusion.');
      return;
    }
    try {
      if (kind === 'residents') await exportResidents(db, metrics.month, language);
      if (kind === 'invoices') await exportInvoices(db, metrics.month, language);
      if (kind === 'payments') await exportPayments(db, metrics.month, language);
      if (kind === 'complet') await exportComplet(db, metrics.month, language);
    } catch {
      notifyUser('error', t('error'), t('exportError'));
    }
  };

  const validateExportsByConcierge = async () => {
    if (activeRole !== 'concierge') {
      notifyUser('error', t('error'), 'Seul le Concierge peut valider les exports du mois.');
      return;
    }
    if (!metrics.monthConfig) {
      notifyUser('error', t('error'), t('monthConfigAlert'));
      return;
    }
    try {
      await upsertMonthConfig(metrics.month, {
        puEau: metrics.monthConfig.puEau,
        puElectricite: metrics.monthConfig.puElectricite,
        tva: metrics.monthConfig.tva,
        lcEau: metrics.monthConfig.lcEau,
        lcElectricite: metrics.monthConfig.lcElectricite,
        surplusEauTotal: metrics.monthConfig.surplusEauTotal,
        surplusElecTotal: metrics.monthConfig.surplusElecTotal,
        penaltyMissingIndex: metrics.monthConfig.penaltyMissingIndex ?? 0,
        indexWindowStartDay: metrics.monthConfig.indexWindowStartDay ?? 25,
        indexWindowEndDay: metrics.monthConfig.indexWindowEndDay ?? 30,
        exportsValidatedByConcierge: true,
        exportsValidatedAt: new Date().toISOString(),
        exportsValidatedBy: 'concierge',
        amendeEauMontant: metrics.monthConfig.amendeEauMontant,
        minimumFacture: metrics.monthConfig.minimumFacture,
        delaiPaiement: metrics.monthConfig.delaiPaiement,
      });
      await reload();
      notifyUser('success', t('success'), 'Exports du mois valides par le Concierge.');
    } catch (error) {
      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
    }
  };

  const openWhatsAppThread = async (phone: string | null | undefined) => {
    if (!phone) {
      notifyUser('error', t('error'), t('invalidWhatsapp'));
      return;
    }
    const sanitized = phone.replace(/[^\d+]/g, '');
    const url = `https://wa.me/${sanitized.replace(/^\+/, '')}`;
    try {
      await Linking.openURL(url);
    } catch {
      notifyUser('error', t('error'), t('cannotOpenWhatsapp'));
    }
  };

  const activeBroadcastRecipients = useMemo(
    () => metrics.residents
      .filter((resident) => resident.currentRoomId != null && resident.statut !== 'INACTIF')
      .map((resident) => resident.whatsapp ?? resident.telephone ?? '')
      .filter((phone) => phone.trim().length > 0)
      .map((phone) => ({ phone })),
    [metrics.residents],
  );

  const sendBroadcastMessage = async () => {
    const trimmed = broadcastMessage.trim();
    if (!trimmed) {
      notifyUser('error', t('error'), t('enterMessage'));
      return;
    }
    if (activeBroadcastRecipients.length === 0) {
      notifyUser('error', t('error'), t('noActiveResident'));
      return;
    }
    try {
      setBroadcastSending(true);
      const result = await sendWhatsAppBroadcastMessage(activeBroadcastRecipients, trimmed);
      notifyUser(
        'success',
        t('finished'),
        `${t('broadcastDone')}\nTotal: ${result.totalActiveRooms}\nValides: ${result.validRecipients}\nOuverts: ${result.sentCount}\nInvalides/non-ouverts: ${result.invalidCount}`,
      );
    } catch {
      notifyUser('error', t('error'), t('cannotBroadcast'));
    } finally {
      setBroadcastSending(false);
    }
  };

  useEffect(() => {
    let alive = true;
    if (!paymentModalVisible || !paymentForm.invoiceId) {
      setInvoicePayments([]);
      return undefined;
    }
    void (async () => {
      try {
        const rows = await listPaymentsByInvoice(paymentForm.invoiceId!);
        if (!alive) return;
        setInvoicePayments(rows.map((row) => ({
          id: row.id,
          amount: row.amount,
          method: row.method,
          status: row.status,
          transactionRef: row.transactionRef,
          observation: row.observation,
          paidAt: row.paidAt,
        })));
      } catch {
        if (alive) {
          setInvoicePayments([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [paymentForm.invoiceId, paymentModalVisible]);

  const downloadBlob = async (blob: Blob, filename: string) => {
    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.URL.revokeObjectURL(url);
      return;
    }
    notifyUser('info', t('finished'), filename);
  };

  const downloadReceipt = async (paymentId: number) => {
    try {
      const blob = await exportPaymentReceiptPdf(paymentId);
      await downloadBlob(blob, `payment-${paymentId}-receipt.pdf`);
      notifyUser('success', t('success'), 'Quittance PDF generee.');
    } catch {
      notifyUser('error', t('error'), t('exportError'));
    }
  };

  const renderHome = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.monthHero}>
        <Text style={styles.monthHeroTitle}>{toMonthLabel(metrics.month)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: metrics.indexedRooms === metrics.totalRooms && metrics.totalRooms > 0 ? palette.success : palette.warning }]}>
          <Text style={styles.statusBadgeText}>
            {metrics.indexedRooms === metrics.totalRooms && metrics.totalRooms > 0 ? t('dashboardComplete') : t('dashboardInProgress')}
          </Text>
        </View>
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard styles={styles} value={`${metrics.indexedRooms}/${metrics.totalRooms}`} label={t('roomsIndexed')} />
        <KpiCard styles={styles} value={`${metrics.invoicesCalculated}`} label={t('invoicesCalculatedLabel')} />
        <KpiCard styles={styles} value={`${metrics.invoicesSent}`} label={t('invoicesSentLabel')} />
        <KpiCard styles={styles} value={`${metrics.paymentCount}`} label={t('paymentsReceivedLabel')} />
        <KpiCard styles={styles} value={`${metrics.occupancyRate}%`} label={t('occupancy')} />
        <KpiCard styles={styles} value={formatMoney(metrics.totalDue)} label={t('netToRecover')} />
        <KpiCard styles={styles} value={`${metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length}`} label={t('urgentContracts')} />
        <KpiCard styles={styles} value={`${metrics.maintenanceRows.filter((row) => row.priority === 'Haute').length}`} label={t('criticalIncidents')} />
      </View>
      <BigAction styles={styles} label={t('enterIndexesBtn')} color={palette.primary} onPress={() => setPage('indexes')} />
      <BigAction styles={styles} label={t('calculateInvoicesBtn')} color={palette.teal} onPress={runCalculation} />
      <BigAction styles={styles} outline label={t('sendInvoicesWhatsappBtn')} color={palette.success} onPress={() => setPage('whatsappSend')} />
      <BigAction styles={styles} label={t('broadcastWhatsappBtn')} color={palette.darkTeal} onPress={() => setPage('broadcast')} />
      <SectionCard styles={styles} title={t('complementaryOverview')}>
        <InfoRow styles={styles} label={t('activeContracts')} value={`${metrics.contractRows.filter((row) => row.status !== 'A completer').length}`} />
        <InfoRow styles={styles} label={t('openIncidents')} value={`${metrics.maintenanceRows.length}`} />
        <InfoRow styles={styles} label={t('invoicesInError')} value={`${metrics.broadcastRows.filter((row) => row.status === 'ERREUR').length}`} />
        <InfoRow styles={styles} label={t('cumulativePayments')} value={formatMoney(metrics.totalPaid)} />
      </SectionCard>
    </ScrollView>
  );

  const renderRooms = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <SearchHeader styles={styles} colors={palette} title={t('rooms')} value={search} onChange={setSearch} />
      {filteredRooms.map((room) => {
        const resident = residentByRoomId.get(room.id);
        return (
          <View key={room.id} style={styles.roomCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.roomNumber}>CH {room.numeroChambre}</Text>
                <View style={[styles.smallBadge, { backgroundColor: room.actif ? palette.success : palette.danger }]}>
                  <Text style={styles.smallBadgeText}>{room.actif ? t('roomStatusActive') : t('roomStatusInactive')}</Text>
                </View>
              </View>
              <Text style={styles.roomResident}>{resident ? `${resident.nom} ${resident.prenom}`.trim() : '-'}</Text>
              <Text style={styles.roomPhone}>{resident?.whatsapp ?? resident?.telephone ?? ''}</Text>
            </View>
            <View style={styles.cardActionColumn}>
              <TouchableOpacity style={styles.lightButton} onPress={() => openRoomModal(room.id)}>
                <Text style={styles.lightButtonText}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.lightButton} onPress={() => toggleRoomStatus(room.id, room.actif)}>
                <Text style={styles.lightButtonText}>{room.actif ? 'Desactiver' : 'Reactiver'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={styles.fabButton} onPress={() => openRoomModal()}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderIndexes = () => {
    const activeRooms = metrics.rooms.filter((room) => room.actif);
    const savedCount = metrics.readings.length;
    const penaltyAmount = metrics.monthConfig?.penaltyMissingIndex ?? 0;
    const windowEnd = metrics.monthConfig?.indexWindowEndDay ?? 30;
    const currentDay = new Date().getDate();
    const windowExpired = currentDay > windowEnd;

    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <View style={styles.pageBanner}>
          <Text style={styles.pageBannerTitle}>{t('indexEntry')} - {metrics.month}</Text>
          <Text style={styles.pageBannerSide}>{savedCount}/{activeRooms.length} {t('entered').toLowerCase()}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: activeRooms.length > 0 ? `${(savedCount / activeRooms.length) * 100}%` : '0%' }]} />
        </View>
        {activeRooms.map((room) => {
          const resident = residentByRoomId.get(room.id);
          const form = indexForms[room.id];
          if (!form) return null;
          const reading = metrics.readings.find((entry) => entry.roomId === room.id) ?? null;
          const consoEau = (parseMoney(form.niEau) || 0) - (parseMoney(form.anEau) || 0);
          const consoElec = (parseMoney(form.niElec) || 0) - (parseMoney(form.anElec) || 0);
          const saved = !!reading;
          const late = !!reading?.lateSubmission;
          const autoPenaltyVisible = (!saved && windowExpired) || late;
          return (
            <View key={room.id} style={[styles.indexCard, saved && styles.indexCardSaved]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.roomNumber}>CH {room.numeroChambre}</Text>
                  <Text style={styles.roomResident}>{resident ? `${resident.nom} ${resident.prenom}`.trim() : '-'}</Text>
                </View>
                {saved ? <View style={[styles.smallBadge, { backgroundColor: palette.success }]}><Text style={styles.smallBadgeText}>{t('entered')}</Text></View> : null}
              </View>
              {autoPenaltyVisible ? (
                <View style={styles.alertStrip}>
                  <Text style={styles.alertStripText}>
                    {late
                      ? `Retard detecte. Penalite actuelle: ${formatMoney(penaltyAmount)}`
                      : `Periode depassee sans releve. Penalite previsionnelle: ${formatMoney(penaltyAmount)}`}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.sectionSubTitle}>{t('water')}</Text>
              <View style={styles.indexGrid}>
                <View style={styles.indexFieldWrap}>
                  <Text style={styles.fieldLabel}>{t('oldIndex')}</Text>
                  <TextInput style={styles.indexInput} value={form.anEau} onChangeText={(value) => updateIndexForm(room.id, 'anEau', value)} />
                </View>
                <View style={styles.indexFieldWrap}>
                  <Text style={styles.fieldLabel}>{t('newIndex')}</Text>
                  <TextInput style={styles.indexInput} value={form.niEau} onChangeText={(value) => updateIndexForm(room.id, 'niEau', value)} />
                </View>
                <View style={styles.indexConsoWrap}>
                  <Text style={styles.fieldLabel}>{t('consumption')}</Text>
                  <Text style={styles.indexConsoValue}>{Number.isFinite(consoEau) ? consoEau.toFixed(1) : '-'}</Text>
                </View>
              </View>
              <Text style={styles.sectionSubTitle}>{t('electricity')}</Text>
              <View style={styles.indexGrid}>
                <View style={styles.indexFieldWrap}>
                  <Text style={styles.fieldLabel}>{t('oldIndex')}</Text>
                  <TextInput style={styles.indexInput} value={form.anElec} onChangeText={(value) => updateIndexForm(room.id, 'anElec', value)} />
                </View>
                <View style={styles.indexFieldWrap}>
                  <Text style={styles.fieldLabel}>{t('newIndex')}</Text>
                  <TextInput style={styles.indexInput} value={form.niElec} onChangeText={(value) => updateIndexForm(room.id, 'niElec', value)} />
                </View>
                <View style={styles.indexConsoWrap}>
                  <Text style={styles.fieldLabel}>{t('consumption')}</Text>
                  <Text style={styles.indexConsoValue}>{Number.isFinite(consoElec) ? consoElec.toFixed(1) : '-'}</Text>
                </View>
              </View>
              <View style={styles.toggleLine}>
                <TogglePill label={t('present')} active={form.presence} onPress={() => updateIndexForm(room.id, 'presence', !form.presence)} styles={styles} palette={palette} />
                <TogglePill label={t('waterFine')} active={form.amende} onPress={() => updateIndexForm(room.id, 'amende', !form.amende)} styles={styles} palette={palette} />
              </View>
              <TouchableOpacity style={[styles.bigInlineButton, { backgroundColor: saved ? palette.success : palette.primary }]} onPress={() => saveIndexReading(room.id)}>
                <Text style={styles.bigInlineButtonText}>{saved ? t('edit') : t('validate')}</Text>
              </TouchableOpacity>
              {late && activeRole === 'concierge' && reading?.id ? (
                <TouchableOpacity
                  style={[styles.bigInlineButton, { backgroundColor: palette.warning }]}
                  onPress={async () => {
                    try {
                      await cancelIndexPenalty(reading.id);
                      notifyUser('success', t('success'), 'Penalite de retard annulee par le concierge.');
                      reload();
                    } catch (error) {
                      notifyUser('error', t('error'), error instanceof Error ? error.message : t('cannotSaveData'));
                    }
                  }}
                >
                  <Text style={styles.bigInlineButtonText}>Annuler la sanction</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderInvoices = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('invoices')} - {metrics.month}</Text>
        <Text style={styles.pageBannerSide}>{metrics.invoices.length} {t('monthSuffixInvoices')}</Text>
      </View>
      <BigAction styles={styles} label={t('launchCalculation')} color={palette.primary} onPress={runCalculation} />
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>{t('totalInvoiceLabel')} {t('rooms').toLowerCase()}</Text>
        <Text style={styles.totalValue}>{formatMoney(metrics.totalDue)}</Text>
      </View>
      {filteredInvoices.map((invoice) => {
        const resident = residentByRoomId.get(invoice.roomId);
        const extraCharges = (invoice.internetFee ?? 0) + (invoice.commonCharges ?? 0) + (invoice.loyer ?? 0);
        const missingIndexPenalty = invoice.penaltyMissingIndex ?? 0;
        return (
          <View key={invoice.id} style={styles.invoiceCard}>
            <View style={styles.row}>
              <Text style={styles.roomNumber}>CH {invoice.roomNumber}</Text>
              <Text style={styles.roomResident}>{resident ? `${resident.nom} ${resident.prenom}`.trim() : '-'}</Text>
            </View>
            <InvoiceDetail styles={styles} title={`Detail ${t('water').toLowerCase()}`} line={invoice.water} />
            <InvoiceDetail styles={styles} title={`Detail ${t('electricity').toLowerCase()}`} line={invoice.electricity} />
            {missingIndexPenalty > 0 ? (
              <View style={styles.chargeAlert}>
                <Text style={styles.chargeAlertText}>Penalite retard / index manquant: {formatMoney(missingIndexPenalty)}</Text>
              </View>
            ) : null}
            {extraCharges > 0 ? (
              <View style={styles.detailBox}>
                {invoice.internetFee ? <Text style={styles.detailText}>Internet: {formatMoney(invoice.internetFee)}</Text> : null}
                {invoice.commonCharges ? <Text style={styles.detailText}>Charges communes: {formatMoney(invoice.commonCharges)}</Text> : null}
                {invoice.loyer ? <Text style={styles.detailText}>Loyer: {formatMoney(invoice.loyer)}</Text> : null}
              </View>
            ) : null}
            <View style={styles.moneyRow}><Text style={styles.muted}>{t('totalInvoiceLabel')}</Text><Text style={styles.amountText}>{formatMoney(invoice.totalFacture)}</Text></View>
            <View style={styles.moneyRow}>
              <Text style={styles.muted}>{t('debtLabel')}</Text>
              <TextInput
                style={styles.debtInput}
                value={debtDrafts[invoice.id] ?? ''}
                onChangeText={(value) => setDebtDrafts((current) => ({ ...current, [invoice.id]: value }))}
                onBlur={() => saveDebt(invoice.id)}
              />
            </View>
            <View style={[styles.moneyRow, styles.netRow]}><Text style={styles.netLabel}>{t('netToPayLabel')}</Text><Text style={styles.netValue}>{formatMoney(invoice.netAPayer)}</Text></View>
            <Text style={styles.deadlineText}>{t('paymentDelayLabel')}: {invoice.delaiPaiement ?? '-'}</Text>
            <View style={styles.inlineActions}>
              <TouchableOpacity style={styles.primaryMiniButton} onPress={() => updateInvoiceSendStatus(invoice.id, 'ENVOYE').then(reload)}>
                <Text style={styles.primaryMiniButtonText}>{t('markSent')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryMiniButton} onPress={() => openPaymentModal(invoice.id)}>
                <Text style={styles.secondaryMiniButtonText}>{t('registerPayment')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('payments')} - {metrics.month}</Text>
      </View>
      {filteredInvoices.map((invoice) => {
        const resident = residentByRoomId.get(invoice.roomId);
        const paid = payedByInvoiceId.get(invoice.id) ?? 0;
        const rest = Math.max(0, invoice.netAPayer - paid);
        const missingIndexPenalty = invoice.penaltyMissingIndex ?? 0;
        return (
          <View key={invoice.id} style={styles.paymentCard}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.roomNumber}>CH {invoice.roomNumber}</Text>
                <Text style={styles.roomResident}>{resident ? `${resident.nom} ${resident.prenom}`.trim() : '-'}</Text>
              </View>
              <View style={[styles.smallBadge, { backgroundColor: rest > 0 ? palette.danger : palette.success }]}>
                <Text style={styles.smallBadgeText}>{rest > 0 ? t('unpaid') : t('settled')}</Text>
              </View>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>NAP: {formatMoney(invoice.netAPayer)}</Text>
              <Text style={styles.muted}>{t('payments')}: {formatMoney(paid)}</Text>
            </View>
            {missingIndexPenalty > 0 ? (
              <Text style={styles.penaltyText}>Penalite retard incluse: {formatMoney(missingIndexPenalty)}</Text>
            ) : null}
            <Text style={[styles.amountText, { color: palette.danger, marginTop: 4 }]}>Reste: {formatMoney(rest)}</Text>
            {metrics.payments
              .filter((payment) => payment.invoiceId === invoice.id)
              .slice(0, 2)
              .map((payment) => (
                <View key={payment.id} style={styles.compactPaymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compactSub}>
                      {payment.paidAt} | {payment.method ?? 'MANUAL'} | {formatMoney(payment.amount)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.secondaryMiniButton} onPress={() => downloadReceipt(payment.id)}>
                    <Text style={styles.secondaryMiniButtonText}>Quittance</Text>
                  </TouchableOpacity>
                </View>
              ))}
            <TouchableOpacity style={[styles.bigInlineButton, { backgroundColor: palette.teal }]} onPress={() => openPaymentModal(invoice.id)}>
              <Text style={styles.bigInlineButtonText}>{t('registerPayment')}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderWhatsAppSend = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('whatsappSend')}</Text>
        <Text style={styles.pageBannerSide}>{metrics.broadcastRows.length} {t('monthSuffixInvoices')}</Text>
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard styles={styles} value={`${metrics.broadcastRows.filter((row) => row.status === 'NON_ENVOYE').length}`} label={t('unsentInvoices')} />
        <KpiCard styles={styles} value={`${metrics.broadcastRows.filter((row) => row.status === 'ENVOYE').length}`} label={t('sentInvoices')} />
        <KpiCard styles={styles} value={`${metrics.broadcastRows.filter((row) => row.status === 'ERREUR').length}`} label={t('invoicesInError')} />
      </View>
      {metrics.broadcastRows.map((row) => (
        <View key={row.invoiceId} style={styles.recordCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.roomNumber}>CH {row.room}</Text>
              <Text style={styles.roomResident}>{row.resident}</Text>
              <Text style={styles.roomPhone}>{row.phone ?? t('noNumber')}</Text>
            </View>
            <View style={[styles.smallBadge, { backgroundColor: row.status === 'ENVOYE' ? palette.success : row.status === 'ERREUR' ? palette.danger : palette.warning }]}>
              <Text style={styles.smallBadgeText}>{translateSendStatus(row.status, t)}</Text>
            </View>
          </View>
          <Text style={[styles.amountText, { marginTop: 10 }]}>{formatMoney(row.due)}</Text>
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.secondaryMiniButton} onPress={() => openWhatsAppThread(row.phone)}>
              <Text style={styles.secondaryMiniButtonText}>{t('openWhatsapp')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryMiniButton} onPress={() => updateInvoiceSendStatus(row.invoiceId, 'ENVOYE').then(reload)}>
              <Text style={styles.primaryMiniButtonText}>{t('markSent')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryMiniButton, { backgroundColor: palette.danger }]} onPress={() => updateInvoiceSendStatus(row.invoiceId, 'ERREUR').then(reload)}>
              <Text style={styles.primaryMiniButtonText}>{t('markError')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderBroadcast = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('whatsappBroadcast')}</Text>
        <Text style={styles.pageBannerSide}>{activeBroadcastRecipients.length} resident(s) actif(s)</Text>
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.formLabel}>Message a diffuser (hors factures)</Text>
        <TextInput
          style={styles.broadcastInput}
          value={broadcastMessage}
          onChangeText={setBroadcastMessage}
          placeholder="Ex: Reunion copropriete samedi a 18h..."
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
          editable={!broadcastSending}
        />
        <TouchableOpacity
          style={[styles.bigInlineButton, { backgroundColor: palette.success, opacity: broadcastSending ? 0.7 : 1 }]}
          onPress={sendBroadcastMessage}
          disabled={broadcastSending}
        >
          <Text style={styles.bigInlineButtonText}>
            {broadcastSending ? `${t('whatsappBroadcast')}...` : t('whatsappBroadcast')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderContracts = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('contracts')}</Text>
        <Text style={styles.pageBannerSide}>{metrics.contractRows.length} {t('monthSuffixRooms')}</Text>
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard styles={styles} value={`${metrics.contractRows.filter((row) => row.status !== 'A completer').length}`} label={t('activeContracts')} />
        <KpiCard styles={styles} value={`${metrics.contractRows.filter((row) => row.status === 'A completer').length}`} label={t('monthConfigMissing')} />
        <KpiCard styles={styles} value={`${metrics.contractRows.filter((row) => row.renewal === 'Renouvellement urgent').length}`} label={t('urgentContracts')} />
      </View>
      {metrics.contractRows.map((row) => (
        <View key={row.room} style={styles.recordCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.roomNumber}>CH {row.room}</Text>
              <Text style={styles.roomResident}>{row.resident}</Text>
            </View>
            <View style={[styles.smallBadge, { backgroundColor: row.renewal === 'Renouvellement urgent' ? palette.danger : row.status === 'A completer' ? palette.warning : palette.success }]}>
              <Text style={styles.smallBadgeText}>{row.status}</Text>
            </View>
          </View>
          <InfoRow styles={styles} label={t('stateLabel')} value={row.renewal} />
          <InfoRow styles={styles} label={t('balanceLabel')} value={formatMoney(row.balance)} />
        </View>
      ))}
    </ScrollView>
  );

  const renderMaintenance = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('maintenance')}</Text>
        <Text style={styles.pageBannerSide}>{metrics.maintenanceRows.length} incident(s)</Text>
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard styles={styles} value={`${metrics.maintenanceRows.filter((row) => row.priority === 'Haute').length}`} label={t('highPriority')} />
        <KpiCard styles={styles} value={`${metrics.maintenanceRows.filter((row) => row.category === 'Releve').length}`} label={t('readingsLabel')} />
        <KpiCard styles={styles} value={`${metrics.maintenanceRows.filter((row) => row.category === 'Facturation').length}`} label={t('billingLabel')} />
      </View>
      {metrics.maintenanceRows.map((row) => (
        <View key={row.key} style={styles.recordCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.roomNumber}>CH {row.room}</Text>
              <Text style={styles.roomResident}>{row.category}</Text>
            </View>
            <View style={[styles.smallBadge, { backgroundColor: row.priority === 'Haute' ? palette.danger : palette.warning }]}>
              <Text style={styles.smallBadgeText}>{row.priority}</Text>
            </View>
          </View>
          <InfoRow styles={styles} label={t('stateLabel')} value={row.status} />
          <Text style={styles.summaryText}>{row.summary}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderReports = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{t('reports')}</Text>
        <Text style={styles.pageBannerSide}>{metrics.reportRows.length} KPI</Text>
      </View>
      <SectionCard styles={styles} title={t('managementLabel')}>
        {metrics.reportRows.map((row) => (
          <InfoRow styles={styles} key={row.key} label={row.label} value={row.value} />
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('financeLabel')}>
        {metrics.reportFinanceRows.map((row) => (
          <InfoRow styles={styles} key={row.key} label={row.label} value={row.value} />
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('operationsLabel')}>
        {metrics.reportOperationsRows.map((row) => (
          <InfoRow styles={styles} key={row.key} label={row.label} value={row.value} />
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('portfolioWatchLabel')}>
        {metrics.reportPortfolioRows.map((row) => (
          <View key={row.key} style={styles.compactRow}>
            <View>
              <Text style={styles.compactTitle}>CH {row.room}</Text>
              <Text style={styles.compactSub}>{row.resident}</Text>
            </View>
            <View>
              <Text style={styles.compactTitle}>{row.balance}</Text>
              <Text style={styles.compactSub}>{row.status}</Text>
            </View>
          </View>
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('unusualConsumption')}>
        <InfoRow styles={styles} label={t('avgWater')} value={`${consumptionStats.avgWater.toFixed(1)} m3`} />
        <InfoRow styles={styles} label={t('avgElectric')} value={`${consumptionStats.avgElec.toFixed(1)} kWh`} />
        {consumptionStats.anomalies.length === 0 ? (
          <Text style={styles.summaryText}>{t('noAnomaly')}</Text>
        ) : consumptionStats.anomalies.map((row) => (
          <View key={`${row.room}-anomaly`} style={styles.compactRow}>
            <View>
              <Text style={styles.compactTitle}>CH {row.room}</Text>
              <Text style={styles.compactSub}>{row.resident}</Text>
            </View>
            <View>
              <Text style={styles.compactTitle}>{row.water.toFixed(1)} m3 / {row.elec.toFixed(1)} kWh</Text>
              <Text style={styles.compactSub}>{t('unusualConsumption')}</Text>
            </View>
          </View>
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('topWaterConsumers')}>
        {consumptionStats.topWater.map((row) => (
          <View key={`${row.room}-water`} style={styles.compactRow}>
            <View>
              <Text style={styles.compactTitle}>CH {row.room}</Text>
              <Text style={styles.compactSub}>{row.resident}</Text>
            </View>
            <Text style={styles.compactTitle}>{row.water.toFixed(1)} m3</Text>
          </View>
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('topElectricConsumers')}>
        {consumptionStats.topElec.map((row) => (
          <View key={`${row.room}-elec`} style={styles.compactRow}>
            <View>
              <Text style={styles.compactTitle}>CH {row.room}</Text>
              <Text style={styles.compactSub}>{row.resident}</Text>
            </View>
            <Text style={styles.compactTitle}>{row.elec.toFixed(1)} kWh</Text>
          </View>
        ))}
      </SectionCard>
      <SectionCard styles={styles} title={t('topTotalInvoices')}>
        {consumptionStats.topTotal.map((row) => (
          <View key={`${row.room}-total`} style={styles.compactRow}>
            <View>
              <Text style={styles.compactTitle}>CH {row.room}</Text>
              <Text style={styles.compactSub}>{row.resident}</Text>
            </View>
            <Text style={styles.compactTitle}>{formatMoney(row.total)}</Text>
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <SectionCard styles={styles} title={t('monthConfig')}>
        <TouchableOpacity style={styles.bigBlueButton} onPress={() => setMonthModalVisible(true)}>
          <Text style={styles.bigBlueButtonText}>{t('openMonthConfig')}</Text>
        </TouchableOpacity>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Validation Concierge</Text>
          <Text style={styles.infoCardBody}>
            {metrics.monthConfig?.exportsValidatedByConcierge
              ? `Exports autorises. Validation enregistree${metrics.monthConfig.exportsValidatedAt ? ` le ${new Date(metrics.monthConfig.exportsValidatedAt).toLocaleDateString()}` : ''}.`
              : 'Exports bloques tant que le Concierge n a pas valide le cycle du mois.'}
          </Text>
          {activeRole === 'concierge' ? (
            <TouchableOpacity style={styles.bigTealButton} onPress={validateExportsByConcierge}>
              <Text style={styles.bigBlueButtonText}>Valider les exports du mois</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SectionCard>
      <SectionCard styles={styles} title={t('language')}>
        <View style={styles.toggleRow}>
          <ToggleChoice label={t('pickFrench')} active={language === 'fr'} onPress={() => setLanguage('fr')} />
          <ToggleChoice label={t('pickEnglish')} active={language === 'en'} onPress={() => setLanguage('en')} />
          <ToggleChoice label={t('pickSpanish')} active={language === 'es'} onPress={() => setLanguage('es')} />
        </View>
      </SectionCard>
      <SectionCard styles={styles} title={t('theme')}>
        <TouchableOpacity style={styles.bigBlueButton} onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
          <Text style={styles.bigBlueButtonText}>{themeMode === 'light' ? t('darkMode') : t('lightMode')}</Text>
        </TouchableOpacity>
      </SectionCard>
      <SectionCard styles={styles} title={`${t('exportData')} (${metrics.month})`}>
        <ExportButton label={t('exportResidentsXlsx')} onPress={() => triggerExport('residents')} />
        <ExportButton label={t('exportInvoicesXlsx')} onPress={() => triggerExport('invoices')} />
        <ExportButton label={t('exportPaymentsXlsx')} onPress={() => triggerExport('payments')} />
        <ExportButton label={t('exportCompleteXlsx')} onPress={() => triggerExport('complet')} accent />
      </SectionCard>
      <SectionCard styles={styles} title={t('changePasswordSection')}>
        <FormLabel styles={styles} label={t('recoveryEmailLabel')} />
        <TextInput style={styles.textInput} value={recoveryEmail} onChangeText={setRecoveryEmailState} />
        <TouchableOpacity style={styles.bigTealButton} onPress={saveRecovery}>
          <Text style={styles.bigBlueButtonText}>{t('saveRecoveryEmail')}</Text>
        </TouchableOpacity>
        <FormLabel styles={styles} label={t('oldPasswordLabel')} />
        <TextInput style={styles.textInput} value={oldPwd} onChangeText={setOldPwd} secureTextEntry />
        <FormLabel styles={styles} label={t('newPasswordLabel')} />
        <TextInput style={styles.textInput} value={newPwd} onChangeText={setNewPwd} secureTextEntry />
        <FormLabel styles={styles} label={t('confirmPasswordLabel')} />
        <TextInput style={styles.textInput} value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry />
        <TouchableOpacity style={styles.bigTealButton} onPress={savePassword}>
          <Text style={styles.bigBlueButtonText}>{t('changePasswordAction')}</Text>
        </TouchableOpacity>
      </SectionCard>
      <SectionCard styles={styles} title={t('about')}>
        <InfoRow styles={styles} label={t('appLabel')} value="METERTRACK" />
        <InfoRow styles={styles} label={t('versionLabel')} value="1.0.1" />
        <InfoRow styles={styles} label={t('platformLabel')} value={t('bureauWeb')} />
        <InfoRow styles={styles} label={t('productManager')} value="Njanga Martial" />
        <InfoRow styles={styles} label={t('contact')} value="+237681681515" />
        <InfoRow styles={styles} label={t('emailLabel')} value="martialtankouanjanga@gmail.com" />
      </SectionCard>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>{t('logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.shell}>
      {flashMessage ? (
        <View
          style={[
            styles.flashBanner,
            flashMessage.type === 'error'
              ? { backgroundColor: palette.danger }
              : flashMessage.type === 'success'
                ? { backgroundColor: palette.success }
                : { backgroundColor: palette.primary },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.flashTitle}>{flashMessage.title}</Text>
            <Text style={styles.flashMessage}>{flashMessage.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setFlashMessage(null)}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}
      {!embedded ? (
        <View style={styles.sidebar}>
          <Text style={styles.brandTitle}>MeterTrack</Text>
          <Text style={styles.brandSubtitle}>{t('bureauWeb')}</Text>
          {PAGE_META.map((item) => (
            <TouchableOpacity key={item.key} style={[styles.navItem, page === item.key && styles.navItemActive]} onPress={() => { setPage(item.key); setSearch(''); }}>
              <Ionicons name={item.icon} size={18} color={page === item.key ? '#FFFFFF' : palette.primary} />
              <Text style={[styles.navText, page === item.key && styles.navTextActive]}>{t(item.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <View style={styles.mainPanel}>
        {embedded ? (
          <View style={styles.embeddedNav}>
            {PAGE_META.map((item) => (
              <TouchableOpacity key={item.key} style={[styles.embeddedNavItem, page === item.key && styles.embeddedNavItemActive]} onPress={() => { setPage(item.key); setSearch(''); }}>
                <Ionicons name={item.icon} size={16} color={page === item.key ? '#FFFFFF' : palette.primary} />
                <Text style={[styles.embeddedNavText, page === item.key && styles.embeddedNavTextActive]}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{t(PAGE_META.find((item) => item.key === page)?.labelKey ?? 'home')}</Text>
          <Text style={styles.topBarMeta}>{loading ? 'Chargement...' : `${metrics.month} • ${metrics.totalRooms} chambre(s)`}</Text>
        </View>
        {page === 'home' && renderHome()}
        {page === 'indexes' && renderIndexes()}
        {page === 'rooms' && renderRooms()}
        {page === 'invoices' && renderInvoices()}
        {page === 'payments' && renderPayments()}
        {page === 'whatsappSend' && renderWhatsAppSend()}
        {page === 'broadcast' && renderBroadcast()}
        {page === 'contracts' && renderContracts()}
        {page === 'maintenance' && renderMaintenance()}
        {page === 'reports' && renderReports()}
        {page === 'settings' && renderSettings()}
      </View>
      <RoomModal styles={styles} t={t} visible={roomModalVisible} form={roomForm} onChange={setRoomForm} onClose={() => setRoomModalVisible(false)} onSave={saveRoom} />
      <PaymentModal styles={styles} t={t} visible={paymentModalVisible} form={paymentForm} history={invoicePayments} onChange={setPaymentForm} onClose={() => setPaymentModalVisible(false)} onSave={savePayment} />
      <MonthModal styles={styles} t={t} visible={monthModalVisible} form={monthForm} onChange={setMonthForm} onClose={() => setMonthModalVisible(false)} onSave={saveMonthConfig} />
    </View>
  );
}

let sharedStyles = createStyles(LIGHT_COLORS);

function KpiCard({ styles = sharedStyles, value, label }: { styles?: ReturnType<typeof createStyles>; value: string; label: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function BigAction({ styles = sharedStyles, label, color, onPress, outline }: { styles?: ReturnType<typeof createStyles>; label: string; color: string; onPress: () => void; outline?: boolean }) {
  return (
    <TouchableOpacity style={[styles.bigAction, outline ? { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color } : { backgroundColor: color }]} onPress={onPress}>
      <Text style={[styles.bigActionText, outline ? { color } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SearchHeader({ styles = sharedStyles, colors = LIGHT_COLORS, title, value, onChange }: { styles?: ReturnType<typeof createStyles>; colors?: typeof LIGHT_COLORS; title: string; value: string; onChange: (value: string) => void }) {
  return (
    <View>
      <View style={styles.pageBanner}>
        <Text style={styles.pageBannerTitle}>{title}</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder="Rechercher..."
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function TogglePill({
  label,
  active,
  onPress,
  styles = sharedStyles,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles?: ReturnType<typeof createStyles>;
  palette: typeof LIGHT_COLORS;
}) {
  return (
    <TouchableOpacity style={[styles.togglePill, active ? { backgroundColor: palette.primary, borderColor: palette.primary } : { backgroundColor: palette.bg, borderColor: palette.border }]} onPress={onPress}>
      <Text style={[styles.togglePillText, active ? { color: '#FFFFFF' } : { color: palette.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InvoiceDetail({ styles = sharedStyles, title, line }: { styles?: ReturnType<typeof createStyles>; title: string; line: { conso: number; montantHt: number; tva: number; lc: number; surplus: number; amende: number; montantTtc: number } }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailTitle}>{title}</Text>
      <Text style={styles.detailText}>Conso: {Math.round(line.conso)} | HT: {formatMoney(line.montantHt)}</Text>
      <Text style={styles.detailText}>TVA: {formatMoney(line.tva)} | LC: {formatMoney(line.lc)}</Text>
      <Text style={styles.detailText}>Surplus: {formatMoney(line.surplus)} | Amende: {formatMoney(line.amende)}</Text>
      <Text style={styles.detailTotal}>TTC: {formatMoney(line.montantTtc)}</Text>
    </View>
  );
}

function SectionCard({ styles = sharedStyles, title, children }: { styles?: ReturnType<typeof createStyles>; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleChoice({ styles = sharedStyles, label, active, onPress }: { styles?: ReturnType<typeof createStyles>; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.choiceButton, active && styles.choiceButtonActive]} onPress={onPress}>
      <Text style={[styles.choiceButtonText, active && styles.choiceButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExportButton({ styles = sharedStyles, label, onPress, accent }: { styles?: ReturnType<typeof createStyles>; label: string; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity style={[styles.exportButton, accent && styles.exportAccent]} onPress={onPress}>
      <Text style={styles.exportButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function FormLabel({ styles = sharedStyles, label }: { styles?: ReturnType<typeof createStyles>; label: string }) {
  return <Text style={styles.formLabel}>{label}</Text>;
}

function InfoRow({ styles = sharedStyles, label, value }: { styles?: ReturnType<typeof createStyles>; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function RoomModal({
  styles = sharedStyles,
  t,
  visible,
  form,
  onChange,
  onClose,
  onSave,
}: {
  styles?: ReturnType<typeof createStyles>;
  t: (key: string) => string;
  visible: boolean;
  form: RoomForm;
  onChange: React.Dispatch<React.SetStateAction<RoomForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{form.roomId ? t('editRoomTitle') : t('addRoomTitle')}</Text>
          <FormLabel styles={styles} label={t('roomNumberLabel')} />
          <TextInput style={styles.textInput} value={form.numero} onChangeText={(value) => onChange((current) => ({ ...current, numero: value }))} />
          <FormLabel styles={styles} label={t('residentNameLabel')} />
          <TextInput style={styles.textInput} value={form.nom} onChangeText={(value) => onChange((current) => ({ ...current, nom: value }))} />
          <FormLabel styles={styles} label={t('whatsappNumberLabel')} />
          <TextInput style={styles.textInput} value={form.whatsapp} onChangeText={(value) => onChange((current) => ({ ...current, whatsapp: value }))} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}><Text style={styles.modalCancelText}>{t('cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={onSave}><Text style={styles.modalSaveText}>{t('save')}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PaymentModal({
  styles = sharedStyles,
  t,
  visible,
  form,
  history,
  onChange,
  onClose,
  onSave,
}: {
  styles?: ReturnType<typeof createStyles>;
  t: (key: string) => string;
  visible: boolean;
  form: PaymentForm;
  history?: Array<{ id: number; amount: number; method: string; status: string; transactionRef: string | null; observation: string | null; paidAt: string }>;
  onChange: React.Dispatch<React.SetStateAction<PaymentForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('registerPayment')}</Text>
          <FormLabel styles={styles} label={t('amountPaidLabel')} />
          <TextInput style={styles.textInput} value={form.amount} onChangeText={(value) => onChange((current) => ({ ...current, amount: value }))} />
          <FormLabel styles={styles} label="Mode de paiement" />
          <View style={styles.toggleRow}>
            {[
              { value: 'MOBILE_MONEY', label: 'Mobile Money' },
              { value: 'VISA', label: 'Visa' },
              { value: 'WIRE_TRANSFER', label: 'Virement' },
            ].map((option) => (
              <ToggleChoice
                key={option.value}
                styles={styles}
                label={option.label}
                active={form.method === option.value}
                onPress={() => onChange((current) => ({ ...current, method: option.value }))}
              />
            ))}
          </View>
          <FormLabel styles={styles} label={t('noteOptional')} />
          <TextInput style={[styles.textInput, { height: 90 }]} multiline value={form.note} onChangeText={(value) => onChange((current) => ({ ...current, note: value }))} />
          {history && history.length > 0 ? (
            <View style={styles.paymentHistoryCard}>
              <Text style={styles.sectionTitle}>Paiements recents</Text>
              {history.slice(0, 4).map((entry) => (
                <Text key={entry.id} style={styles.detailText}>
                  #{entry.id} | {entry.paidAt.slice(0, 10)} | {entry.method} | {entry.status} | {formatMoney(entry.amount)}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}><Text style={styles.modalCancelText}>{t('cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={onSave}><Text style={styles.modalSaveText}>{t('save')}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MonthModal({
  styles = sharedStyles,
  t,
  visible,
  form,
  onChange,
  onClose,
  onSave,
}: {
  styles?: ReturnType<typeof createStyles>;
  t: (key: string) => string;
  visible: boolean;
  form: MonthForm;
  onChange: React.Dispatch<React.SetStateAction<MonthForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const input = (label: string, key: keyof MonthForm) => (
    <View>
      <FormLabel styles={styles} label={label} />
      <TextInput style={styles.textInput} value={form[key]} onChangeText={(value) => onChange((current) => ({ ...current, [key]: value }))} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('currentMonthSettings')}</Text>
            {input(t('waterUnitPriceLabel'), 'puEau')}
            {input(t('electricityUnitPriceLabel'), 'puElectricite')}
            {input(t('waterMeterRentLabel'), 'lcEau')}
            {input(t('electricityMeterRentLabel'), 'lcElectricite')}
            {input(t('totalWaterSurplusLabel'), 'surplusEauTotal')}
            {input(t('totalElectricitySurplusLabel'), 'surplusElecTotal')}
            {input(t('waterFineAmountLabel'), 'amendeEauMontant')}
            {input(t('minimumInvoiceLabel'), 'minimumFacture')}
            {input(t('vatPercentLabel'), 'tva')}
            {input(t('paymentDeadline'), 'delaiPaiement')}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={onClose}><Text style={styles.modalCancelText}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={onSave}><Text style={styles.modalSaveText}>{t('save')}</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: typeof LIGHT_COLORS) {
  return StyleSheet.create({
    shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
    flashBanner: {
      position: 'absolute',
      top: 14,
      right: 18,
      zIndex: 50,
      maxWidth: 460,
      minWidth: 280,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    flashTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    flashMessage: { color: '#FFFFFF', fontSize: 15, marginTop: 4, lineHeight: 20 },
    sidebar: { width: 244, backgroundColor: colors.sidebar, borderRightWidth: 1, borderRightColor: colors.border, padding: 20, gap: 12 },
    brandTitle: { fontSize: 34, fontWeight: '800', color: colors.primary, marginTop: 8 },
    brandSubtitle: { fontSize: 14, color: colors.muted, marginBottom: 12 },
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: colors.card },
    navItemActive: { backgroundColor: colors.primary },
    navText: { fontSize: 18, fontWeight: '700', color: colors.primary },
    navTextActive: { color: '#FFFFFF' },
    embeddedNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    embeddedNavItem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card },
    embeddedNavItemActive: { backgroundColor: colors.primary },
    embeddedNavText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    embeddedNavTextActive: { color: '#FFFFFF' },
    mainPanel: { flex: 1, padding: 20 },
    topBar: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 26, paddingVertical: 20, marginBottom: 18, borderWidth: 1, borderColor: colors.border },
    topBarTitle: { fontSize: 34, fontWeight: '800', color: colors.text },
    topBarMeta: { marginTop: 6, fontSize: 16, color: colors.muted },
    pageContent: { paddingBottom: 32, gap: 18 },
    monthHero: { backgroundColor: colors.primary, borderRadius: 20, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    monthHeroTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
    statusBadge: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    kpiCard: { width: 210, backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    kpiValue: { fontSize: 42, fontWeight: '800', color: colors.primary },
    kpiLabel: { marginTop: 8, fontSize: 17, textAlign: 'center', color: colors.muted },
    bigAction: { minHeight: 74, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    bigActionText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
    pageBanner: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pageBannerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
    pageBannerSide: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    searchInput: { height: 58, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, fontSize: 18, color: colors.text },
    progressBar: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.success },
    alertStrip: { borderRadius: 12, backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#F2A93B', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
    alertStripText: { color: '#7A5400', fontSize: 14, fontWeight: '700' },
    chargeAlert: { marginTop: 12, borderRadius: 12, backgroundColor: '#FFE5E5', borderWidth: 1, borderColor: colors.danger, paddingHorizontal: 12, paddingVertical: 10 },
    chargeAlertText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
    roomCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 16 },
    indexCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border },
    indexCardSaved: { borderLeftWidth: 4, borderLeftColor: colors.success },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roomNumber: { fontSize: 24, fontWeight: '800', color: colors.primary },
    roomResident: { fontSize: 18, color: colors.text, marginTop: 10 },
    roomPhone: { fontSize: 16, color: colors.muted, marginTop: 6 },
    sectionSubTitle: { fontSize: 22, fontWeight: '800', color: colors.teal, marginTop: 16, marginBottom: 10 },
    infoCard: { marginTop: 14, backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
    infoCardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    infoCardBody: { fontSize: 15, color: colors.muted, lineHeight: 22 },
    indexGrid: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
    indexFieldWrap: { flex: 1 },
    indexConsoWrap: { width: 90 },
    fieldLabel: { fontSize: 15, fontWeight: '700', color: colors.muted, marginBottom: 6 },
    indexInput: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 12, fontSize: 18, color: colors.text },
    indexConsoValue: { fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: 6 },
    toggleLine: { flexDirection: 'row', gap: 14, marginTop: 18 },
    togglePill: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    togglePillText: { fontSize: 18, fontWeight: '700' },
    smallBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    smallBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    cardActionColumn: { justifyContent: 'center', gap: 12 },
    lightButton: { backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, minWidth: 150, alignItems: 'center' },
    lightButtonText: { color: colors.muted, fontSize: 16, fontWeight: '700' },
    fabButton: { position: 'absolute', right: 22, bottom: 18, width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    totalBanner: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { color: '#FFFFFF', fontSize: 20 },
    totalValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
    invoiceCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border },
    detailBox: { marginTop: 14, backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
    detailTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
    detailText: { fontSize: 16, color: colors.muted, marginBottom: 4 },
    detailTotal: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
    moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
    muted: { fontSize: 18, color: colors.muted },
    amountText: { fontSize: 20, fontWeight: '800', color: colors.text },
    penaltyText: { marginTop: 8, color: colors.danger, fontSize: 15, fontWeight: '700' },
    debtInput: { width: 140, height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, backgroundColor: colors.bg, fontSize: 18, textAlign: 'right', color: colors.text },
    netRow: { borderTopWidth: 2, borderTopColor: colors.primary, paddingTop: 12 },
    netLabel: { fontSize: 24, fontWeight: '800', color: colors.primary },
    netValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
    deadlineText: { marginTop: 8, color: colors.muted, fontSize: 15, fontStyle: 'italic' },
    inlineActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    primaryMiniButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14 },
    primaryMiniButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    secondaryMiniButton: { backgroundColor: colors.teal, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14 },
    secondaryMiniButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    paymentCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border },
    recordCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border },
    bigInlineButton: { marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    bigInlineButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    sectionCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.teal, marginBottom: 14 },
    bigBlueButton: { height: 60, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    bigTealButton: { height: 56, borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    bigBlueButtonText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    toggleRow: { flexDirection: 'row', gap: 16 },
    choiceButton: { flex: 1, height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    choiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    choiceButtonText: { fontSize: 18, fontWeight: '700', color: colors.text },
    choiceButtonTextActive: { color: '#FFFFFF' },
    exportButton: { height: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    exportAccent: { backgroundColor: colors.teal },
    exportButtonText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    formLabel: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 10, marginBottom: 8 },
    textInput: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 14, fontSize: 18, color: colors.text },
    broadcastSubTitle: { fontSize: 18, color: colors.muted, marginBottom: 8 },
    broadcastInput: { minHeight: 180, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 14, fontSize: 18, color: colors.text },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLabel: { fontSize: 18, color: colors.muted },
    infoValue: { fontSize: 18, fontWeight: '700', color: colors.text },
    summaryText: { marginTop: 12, fontSize: 17, color: colors.text, lineHeight: 24 },
    compactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    compactTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    compactSub: { fontSize: 15, color: colors.muted, marginTop: 4 },
    compactPaymentRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoutButton: { height: 62, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    logoutButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,22,41,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
    modalCard: { width: '100%', maxWidth: 640, backgroundColor: colors.card, borderRadius: 24, padding: 26, borderWidth: 1, borderColor: colors.border },
    paymentHistoryCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.bg, padding: 12, gap: 6, marginTop: 4 },
    modalTitle: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 10 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 20 },
    modalCancel: { backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14 },
    modalCancelText: { color: colors.muted, fontSize: 18, fontWeight: '700' },
    modalSave: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14 },
    modalSaveText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  });
}
