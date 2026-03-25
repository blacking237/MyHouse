import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import ActionPanel from '../../../components/myhouse/ActionPanel';
import DataTableCard from '../../../components/myhouse/DataTableCard';
import KpiTile from '../../../components/myhouse/KpiTile';
import SectionHeader from '../../../components/myhouse/SectionHeader';
import { useAuth } from '../../../database/AuthContext';
import { useDatabaseOptional } from '../../../database/DatabaseContext';
import { usePreferences, useThemeColors } from '../../../database/PreferencesContext';
import { useMyHouseConsoleData } from '../../../hooks/useMyHouseConsoleData';
import MeterTrackDesktopScreen from '../../../screens/MeterTrackDesktopScreen';
import { buildOccupationId, buildTabs, cloneSheet, compareSheets, createChecklistItem, createInspectionSheet, formatDateTime, getLatestActiveSheet, getLatestSheet, moveTab, renderInspectionPrintHtml, slugify, sortSheets } from './helpers';
import { MODULE_TEXTS, type ModuleTexts } from './moduleTexts';
import { loadInspectionSheets, saveInspectionSheets } from './storage';
import type { InspectionChecklistItem, InspectionCounterSection, InspectionOccupantOption, InspectionSheet, InspectionSheetSummary, InspectionTabKey, InspectionYesNo } from './types';

type ConciergePage = 'dashboard' | 'inspection' | 'comparison' | 'rooms' | 'metertrack' | 'maintenance' | 'mainMeters' | 'settings' | 'profile';
type Notice = { type: 'success' | 'error' | 'info'; message: string };
type ConciergeProfile = {
  profilePhoto: string;
  fullName: string;
  cniNumber: string;
  cniPhoto: string;
  birthDate: string;
  birthPlace: string;
  whatsappNumber: string;
  phoneNumber: string;
  sponsorName: string;
  sponsorPhone: string;
  educationLevel: string;
  educationField: string;
  cvFileName: string;
  cvFileDataUrl: string;
};

const PROFILE_STORAGE_KEY = 'concierge_profile';
const MAINTENANCE_STORAGE_KEY = 'concierge_maintenance_tickets';
const MAIN_METERS_STORAGE_KEY = 'main_meters_registry';

type MaintenanceStatus = 'OUVERT' | 'EN_COURS' | 'RESOLU';
type MaintenanceResponsibility = 'RESIDENT' | 'GESTIONNAIRE' | 'INCONNU';
type ConciergeMaintenanceTicket = {
  id: string;
  roomLabel: string;
  residentName: string;
  issue: string;
  status: MaintenanceStatus;
  responsibility: MaintenanceResponsibility;
  estimatedCost: string;
  createdAt: string;
  updatedAt: string;
};

type MainMeterEntry = {
  id: string;
  date: string;
  waterIndex: string;
  electricIndex: string;
  vendorWaterBill: string;
  vendorElectricBill: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

function emptyConciergeProfile(): ConciergeProfile {
  return {
    profilePhoto: '',
    fullName: '',
    cniNumber: '',
    cniPhoto: '',
    birthDate: '',
    birthPlace: '',
    whatsappNumber: '',
    phoneNumber: '',
    sponsorName: '',
    sponsorPhone: '',
    educationLevel: '',
    educationField: '',
    cvFileName: '',
    cvFileDataUrl: '',
  };
}

const MENU_ITEMS: Array<{ key: ConciergePage; icon: React.ComponentProps<typeof Ionicons>['name']; labelKey: keyof ModuleTexts }> = [
  { key: 'dashboard', icon: 'grid-outline', labelKey: 'title' },
  { key: 'inspection', icon: 'document-text-outline', labelKey: 'inspectionMenu' },
  { key: 'comparison', icon: 'git-compare-outline', labelKey: 'comparisonMenu' },
  { key: 'rooms', icon: 'business-outline', labelKey: 'roomsMenu' },
  { key: 'metertrack', icon: 'calculator-outline', labelKey: 'metertrackMenu' },
  { key: 'maintenance', icon: 'construct-outline', labelKey: 'maintenanceMenu' },
  { key: 'mainMeters', icon: 'speedometer-outline', labelKey: 'mainMetersMenu' },
  { key: 'settings', icon: 'settings-outline', labelKey: 'settingsMenu' },
  { key: 'profile', icon: 'person-circle-outline', labelKey: 'profileMenu' },
];

const MENU_SECTIONS: Array<{ title: string; items: ConciergePage[] }> = [
  { title: 'TABLEAU DE BORD', items: ['dashboard'] },
  { title: 'GESTION LOCATIVE', items: ['rooms', 'metertrack'] },
  { title: 'EXPLOITATION', items: ['inspection', 'comparison', 'maintenance', 'mainMeters'] },
  { title: 'ADMINISTRATION', items: ['settings', 'profile'] },
];

export default function ConciergeInventoryModule() {
  const { language } = usePreferences();
  const texts = useMemo(() => MODULE_TEXTS[language], [language]);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const db = useDatabaseOptional();
  const { currentUsername } = useAuth();
  const { loading, metrics } = useMyHouseConsoleData();

  const [page, setPage] = useState<ConciergePage>('inspection');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sheets, setSheets] = useState<InspectionSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InspectionSheet | null>(null);
  const [activeTab, setActiveTab] = useState<InspectionTabKey>('resident');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [createOccupationId, setCreateOccupationId] = useState('');
  const [createSheetType, setCreateSheetType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [comparisonOccupationId, setComparisonOccupationId] = useState('');
  const [profile, setProfile] = useState<ConciergeProfile>(emptyConciergeProfile());
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);
  const [maintenanceTickets, setMaintenanceTickets] = useState<ConciergeMaintenanceTicket[]>([]);
  const [maintenanceForm, setMaintenanceForm] = useState<Omit<ConciergeMaintenanceTicket, 'id' | 'createdAt' | 'updatedAt'>>({
    roomLabel: '',
    residentName: '',
    issue: '',
    status: 'OUVERT',
    responsibility: 'INCONNU',
    estimatedCost: '',
  });
  const [mainMeterEntries, setMainMeterEntries] = useState<MainMeterEntry[]>([]);
  const [selectedMainMeterId, setSelectedMainMeterId] = useState<string | null>(null);
  const [mainMeterForm, setMainMeterForm] = useState<MainMeterEntry>({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    waterIndex: '',
    electricIndex: '',
    vendorWaterBill: '',
    vendorElectricBill: '',
    note: '',
    createdAt: '',
    updatedAt: '',
  });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const nextSheets = await loadInspectionSheets(db);
      if (!alive) return;
      const ordered = sortSheets(nextSheets);
      setSheets(ordered);
      setSelectedSheetId((current) => current ?? ordered[0]?.id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await loadConciergeProfile(db);
      if (!alive) return;
      setProfile(stored ?? emptyConciergeProfile());
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await loadMaintenanceTickets(db);
      if (!alive) return;
      setMaintenanceTickets(stored);
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await loadMainMeterEntries(db);
      if (!alive) return;
      setMainMeterEntries(stored);
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  const lastSelectedSheetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedSheetId) {
      setDraft(null);
      return;
    }
    const selected = sheets.find((sheet) => sheet.id === selectedSheetId) ?? null;
    setDraft(selected ? cloneSheet(selected) : null);
    if (lastSelectedSheetRef.current !== selectedSheetId) {
      setActiveTab('resident');
      lastSelectedSheetRef.current = selectedSheetId;
    }
  }, [selectedSheetId, sheets]);

  useEffect(() => {
    if (!autoSaveEnabled || !draft || draft.statut !== 'BROUILLON') {
      return undefined;
    }
    const timeout = setTimeout(() => {
      void persistSheet(draft, true);
    }, 700);
    return () => clearTimeout(timeout);
  }, [autoSaveEnabled, draft]);

  const occupantOptions = useMemo<InspectionOccupantOption[]>(() => {
    const residentByRoomId = new Map<number, typeof metrics.residents[number]>();
    metrics.residents.forEach((resident) => {
      if (resident.currentRoomId != null && resident.statut !== 'INACTIF') {
        residentByRoomId.set(resident.currentRoomId, resident);
      }
    });
    return metrics.rooms
      .filter((room) => room.actif)
      .map((room) => {
        const resident = residentByRoomId.get(room.id);
        return {
          occupationId: buildOccupationId(room.id, resident?.id ?? null),
          residentId: resident?.id ?? null,
          logementId: room.id,
          roomId: room.id,
          residentName: resident ? `${resident.nom} ${resident.prenom}`.trim() : texts.noOccupantFound,
          phone: resident?.whatsapp ?? resident?.telephone ?? '-',
          roomLabel: room.numeroChambre,
        };
      })
      .sort((left, right) => left.roomLabel.localeCompare(right.roomLabel));
  }, [metrics.residents, metrics.rooms, texts.noOccupantFound]);

  const sheetSummaries = useMemo<InspectionSheetSummary[]>(() => {
    return occupantOptions.map((occupant) => {
      const entry = getLatestActiveSheet(sheets, occupant.occupationId, 'ENTREE');
      const exit = getLatestActiveSheet(sheets, occupant.occupationId, 'SORTIE');
      const active = [entry, exit].find((sheet) => sheet?.statut === 'BROUILLON') ?? entry ?? exit ?? null;
      return {
        id: occupant.occupationId,
        occupationId: occupant.occupationId,
        residentName: occupant.residentName,
        roomLabel: occupant.roomLabel,
        phone: occupant.phone,
        entryStatus: entry ? (entry.statut === 'VALIDEE' ? texts.entryValidated : texts.entryInProgress) : texts.entryNotCreated,
        exitStatus: exit ? (exit.statut === 'VALIDEE' ? texts.exitValidated : texts.exitInProgress) : texts.exitNotCreated,
        activeDraftId: active?.id ?? null,
      };
    });
  }, [occupantOptions, sheets, texts.entryInProgress, texts.entryNotCreated, texts.entryValidated, texts.exitInProgress, texts.exitNotCreated, texts.exitValidated]);

  const comparisonOptions = useMemo(
    () => occupantOptions.filter((occupant) => getLatestSheet(sheets, occupant.occupationId, 'ENTREE') && getLatestSheet(sheets, occupant.occupationId, 'SORTIE')),
    [occupantOptions, sheets],
  );

  useEffect(() => {
    if (!createOccupationId && occupantOptions[0]) setCreateOccupationId(occupantOptions[0].occupationId);
    if (!comparisonOccupationId && comparisonOptions[0]) setComparisonOccupationId(comparisonOptions[0].occupationId);
  }, [comparisonOccupationId, comparisonOptions, createOccupationId, occupantOptions]);

  const activeTabs = useMemo(() => buildTabs(draft, texts), [draft, texts]);
  const comparisonRows = useMemo(() => {
    if (!comparisonOccupationId) return [];
    const entry = getLatestSheet(sheets, comparisonOccupationId, 'ENTREE');
    const exit = getLatestSheet(sheets, comparisonOccupationId, 'SORTIE');
    if (!entry || !exit) return [];
    return compareSheets(entry, exit);
  }, [comparisonOccupationId, sheets]);

  const mainMeterRows = useMemo(() => {
    const sortedAsc = [...mainMeterEntries].sort((left, right) => left.date.localeCompare(right.date));
    const puEau = metrics.monthConfig ? Number(metrics.monthConfig.puEau) : 0;
    const puElec = metrics.monthConfig ? Number(metrics.monthConfig.puElectricite) : 0;
    const tva = metrics.monthConfig ? Number(metrics.monthConfig.tva) : 0;
    return sortedAsc.map((entry, index) => {
      const prev = sortedAsc[index - 1];
      const waterConso = prev ? parseNumber(entry.waterIndex) - parseNumber(prev.waterIndex) : 0;
      const elecConso = prev ? parseNumber(entry.electricIndex) - parseNumber(prev.electricIndex) : 0;
      const waterHt = waterConso * puEau;
      const elecHt = elecConso * puElec;
      const waterTva = waterHt * (tva / 100);
      const elecTva = elecHt * (tva / 100);
      const expectedWater = waterHt + waterTva;
      const expectedElec = elecHt + elecTva;
      return {
        ...entry,
        waterConso,
        elecConso,
        waterHt,
        elecHt,
        waterTva,
        elecTva,
        expectedWater,
        expectedElec,
      };
    }).reverse();
  }, [mainMeterEntries, metrics.monthConfig]);

  const mainMeterSummary = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthPrefix = metrics.month;
    let weeklyWater = 0;
    let weeklyElec = 0;
    let monthlyWater = 0;
    let monthlyElec = 0;
    let yearlyWater = 0;
    let yearlyElec = 0;
    mainMeterRows.forEach((row) => {
      const date = new Date(row.date);
      if (!Number.isNaN(date.getTime())) {
        if (date >= weekAgo) {
          weeklyWater += row.waterConso;
          weeklyElec += row.elecConso;
        }
        if (row.date.startsWith(monthPrefix)) {
          monthlyWater += row.waterConso;
          monthlyElec += row.elecConso;
        }
        if (date.getFullYear() === now.getFullYear()) {
          yearlyWater += row.waterConso;
          yearlyElec += row.elecConso;
        }
      }
    });
    const puEau = metrics.monthConfig ? Number(metrics.monthConfig.puEau) : 0;
    const puElec = metrics.monthConfig ? Number(metrics.monthConfig.puElectricite) : 0;
    const tva = metrics.monthConfig ? Number(metrics.monthConfig.tva) : 0;
    const lastDaily = mainMeterRows[0] ?? null;
    return {
      weeklyWater,
      weeklyElec,
      monthlyWater,
      monthlyElec,
      yearlyWater,
      yearlyElec,
      dailyWater: lastDaily ? lastDaily.waterConso : 0,
      dailyElec: lastDaily ? lastDaily.elecConso : 0,
      expectedWater: monthlyWater * puEau * (1 + tva / 100),
      expectedElec: monthlyElec * puElec * (1 + tva / 100),
    };
  }, [mainMeterRows, metrics.month, metrics.monthConfig]);

  const mainMeterMonthlyRecap = useMemo(() => {
    const monthPrefix = metrics.month;
    let waterConso = 0;
    let elecConso = 0;
    let expectedWater = 0;
    let expectedElec = 0;
    mainMeterRows.forEach((row) => {
      if (!row.date.startsWith(monthPrefix)) return;
      waterConso += row.waterConso;
      elecConso += row.elecConso;
      expectedWater += row.expectedWater;
      expectedElec += row.expectedElec;
    });
    return {
      waterConso,
      elecConso,
      expectedWater,
      expectedElec,
      totalExpected: expectedWater + expectedElec,
    };
  }, [mainMeterRows, metrics.month]);

  const dashboardDraftCount = sheets.filter((sheet) => sheet.statut === 'BROUILLON').length;
  const dashboardValidatedCount = sheets.filter((sheet) => sheet.statut === 'VALIDEE').length;
  const dashboardExitPending = sheetSummaries.filter((summary) => summary.exitStatus === texts.exitNotCreated || summary.exitStatus === texts.exitInProgress).length;
  const formatFcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

  async function persistSheet(sheet: InspectionSheet, silent = false) {
    const nextSheet = { ...sheet, updatedAt: new Date().toISOString() };
    const nextSheets = sortSheets([nextSheet, ...sheets.filter((item) => item.id !== nextSheet.id)]);
    await saveInspectionSheets(db, nextSheets);
    setSheets(nextSheets);
    if (!silent) {
      setNotice({ type: 'success', message: texts.draftSaved });
    }
  }

  function updateDraft(mutator: (current: InspectionSheet) => InspectionSheet) {
    setDraft((current) => (current ? mutator({ ...current, updatedAt: new Date().toISOString() }) : current));
  }

function createOrOpenSelectedSheet() {
    const occupant = occupantOptions.find((item) => item.occupationId === createOccupationId);
    if (!occupant) {
      setNotice({ type: 'error', message: texts.selectSheetHint });
      return;
    }
    const existing = getLatestActiveSheet(sheets, occupant.occupationId, createSheetType);
    if (existing) {
      setSelectedSheetId(existing.id);
      setNotice({ type: 'info', message: texts.duplicateBlocked });
      return;
    }
    const next = createInspectionSheet(occupant, createSheetType, currentUsername || 'concierge');
    void persistSheet(next, true).then(() => {
      setSelectedSheetId(next.id);
      setDraft(next);
      setActiveTab('resident');
      setNotice({ type: 'success', message: texts.draftSaved });
    });
  }

  function handleSelectSummary(summary: InspectionSheetSummary) {
    if (summary.activeDraftId) {
      setSelectedSheetId(summary.activeDraftId);
      setPage('inspection');
      return;
    }
    setCreateOccupationId(summary.occupationId);
    setCreateSheetType(summary.entryStatus === texts.entryNotCreated ? 'ENTREE' : 'SORTIE');
    setPage('inspection');
    setNotice({ type: 'info', message: texts.selectSheetHint });
  }

  function handleValidate() {
    if (!draft) return;
    if (!draft.validation.occupantSigned || !draft.validation.conciergeSigned) {
      setNotice({ type: 'error', message: texts.requiredValidation });
      return;
    }
    const validatedAt = new Date().toISOString();
    const next: InspectionSheet = {
      ...draft,
      statut: 'VALIDEE',
      validation: {
        ...draft.validation,
        occupantName: draft.residentInfo.fullName || draft.validation.occupantName,
        conciergeName: draft.conciergeName || draft.validation.conciergeName,
        validatedAt,
      },
      validatedAt,
      updatedAt: validatedAt,
    };
    void persistSheet(next, true).then(() => {
      setSelectedSheetId(next.id);
      setDraft(next);
      setNotice({ type: 'success', message: texts.sheetValidated });
    });
  }

  function handleArchive() {
    if (!draft) return;
    const archivedAt = new Date().toISOString();
    const next: InspectionSheet = { ...draft, statut: 'ARCHIVEE', archivedAt, updatedAt: archivedAt };
    void persistSheet(next, true).then(() => {
      setSelectedSheetId(next.id);
      setDraft(next);
      setNotice({ type: 'info', message: texts.sheetArchived });
    });
  }

  function handleExport() {
    if (!draft || typeof window === 'undefined') {
      setNotice({ type: 'info', message: texts.exportReady });
      return;
    }
    const popup = window.open('', '_blank', 'width=1024,height=768');
    if (!popup) {
      setNotice({ type: 'error', message: texts.exportReady });
      return;
    }
    popup.document.write(renderInspectionPrintHtml(draft, texts));
    popup.document.close();
    popup.focus();
    popup.print();
    setNotice({ type: 'success', message: texts.exportReady });
  }

  function handleAddSection() {
    if (!draft || !newSectionTitle.trim()) return;
    const sectionKey = slugify(newSectionTitle);
    if (!sectionKey || draft.extraSections.some((section) => section.key === sectionKey)) {
      setNotice({ type: 'error', message: texts.duplicateBlocked });
      return;
    }
    updateDraft((current) => ({
      ...current,
      extraSections: [...current.extraSections, { key: sectionKey, title: newSectionTitle.trim(), items: [createChecklistItem(`custom-${Date.now()}`, `${texts.optionalSectionTitle} 1`)] }],
    }));
    setActiveTab(`extra:${sectionKey}`);
    setNewSectionTitle('');
  }

  function handleAddExtraItem(sectionKey: string) {
    updateDraft((current) => ({
      ...current,
      extraSections: current.extraSections.map((section) => section.key === sectionKey
        ? { ...section, items: [...section.items, createChecklistItem(`custom-${Date.now()}-${section.items.length}`, `${texts.optionalSectionTitle} ${section.items.length + 1}`)] }
        : section),
    }));
  }

  function updateProfile<K extends keyof ConciergeProfile>(field: K, value: ConciergeProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveProfile() {
    await saveConciergeProfile(db, profile);
    setProfileNotice({ type: 'success', message: texts.profileSaved });
  }

  async function handleAddMaintenanceTicket() {
    if (!maintenanceForm.roomLabel.trim() || !maintenanceForm.issue.trim()) {
      setNotice({ type: 'error', message: texts.fillRequiredFields });
      return;
    }
    const now = new Date().toISOString();
    const next: ConciergeMaintenanceTicket = {
      id: `maint-${Date.now()}`,
      roomLabel: maintenanceForm.roomLabel.trim(),
      residentName: maintenanceForm.residentName.trim(),
      issue: maintenanceForm.issue.trim(),
      status: maintenanceForm.status,
      responsibility: maintenanceForm.responsibility,
      estimatedCost: maintenanceForm.estimatedCost.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const nextEntries = [next, ...maintenanceTickets];
    setMaintenanceTickets(nextEntries);
    await saveMaintenanceTickets(db, nextEntries);
    setMaintenanceForm({
      roomLabel: '',
      residentName: '',
      issue: '',
      status: 'OUVERT',
      responsibility: 'INCONNU',
      estimatedCost: '',
    });
    setNotice({ type: 'success', message: texts.maintenanceSaved });
  }

  async function handleAddMainMeterEntry() {
    if (!mainMeterForm.date || !mainMeterForm.waterIndex.trim() || !mainMeterForm.electricIndex.trim()) {
      setNotice({ type: 'error', message: texts.fillRequiredFields });
      return;
    }
    const duplicate = mainMeterEntries.find((entry) => entry.date === mainMeterForm.date && entry.id !== mainMeterForm.id);
    if (duplicate) {
      setNotice({ type: 'error', message: texts.duplicateDate });
      return;
    }
    const now = new Date().toISOString();

    if (selectedMainMeterId) {
      const current = mainMeterEntries.find((entry) => entry.id === selectedMainMeterId);
      if (!current || !canEditEntry(current)) {
        setNotice({ type: 'error', message: texts.editWindowClosed });
        return;
      }
      const next: MainMeterEntry = {
        ...current,
        date: mainMeterForm.date,
        waterIndex: mainMeterForm.waterIndex,
        electricIndex: mainMeterForm.electricIndex,
        vendorWaterBill: '',
        vendorElectricBill: '',
        note: mainMeterForm.note,
        updatedAt: now,
      };
      const nextEntries = sortMainMeters([next, ...mainMeterEntries.filter((entry) => entry.id !== next.id)]);
      setMainMeterEntries(nextEntries);
      await saveMainMeterEntries(db, nextEntries);
      setSelectedMainMeterId(null);
      setNotice({ type: 'success', message: texts.mainMeterUpdated });
      return;
    }

    const next: MainMeterEntry = {
      ...mainMeterForm,
      id: `main-meter-${Date.now()}`,
      vendorWaterBill: '',
      vendorElectricBill: '',
      createdAt: now,
      updatedAt: now,
    };
    const nextEntries = sortMainMeters([next, ...mainMeterEntries]);
    setMainMeterEntries(nextEntries);
    await saveMainMeterEntries(db, nextEntries);
    setNotice({ type: 'success', message: texts.mainMeterSaved });
  }

  const embeddedPage = page === 'rooms'
    ? 'rooms'
    : page === 'metertrack'
      ? 'home'
      : page === 'settings'
        ? 'settings'
        : null;

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.brandBlock}>
        <Text style={styles.brandEyebrow}>MyHouse</Text>
        <Text style={styles.brandTitle}>Concierge</Text>
        <Text style={styles.brandDescription}>{texts.subtitle}</Text>
      </View>
      <View style={styles.menu}>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            {section.items.map((key) => {
              const item = MENU_ITEMS.find((entry) => entry.key === key);
              if (!item) return null;
              const active = page === item.key;
              return (
                <TouchableOpacity key={item.key} style={[styles.menuItem, active && styles.menuItemActive]} onPress={() => setPage(item.key)}>
                  <Ionicons name={item.icon} size={18} color={active ? colors.white : colors.primary} />
                  <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{texts[item.labelKey]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <ActionPanel
        title={texts.inspectionMenu}
        description={texts.listDescription}
        bullets={[
          `${texts.dashboardOccupants}: ${occupantOptions.length}`,
          `${texts.dashboardDrafts}: ${dashboardDraftCount}`,
          `${texts.dashboardValidated}: ${dashboardValidatedCount}`,
        ]}
        actions={[
          { label: texts.createSheet, onPress: () => setPage('inspection') },
          { label: texts.comparisonMenu, onPress: () => setPage('comparison'), variant: 'secondary' },
        ]}
      />
    </View>
  );

  if (embeddedPage) {
    return (
      <View style={styles.screen}>
        {sidebar}
        <View style={styles.embeddedPanel}>
          <MeterTrackDesktopScreen embedded defaultPage={embeddedPage} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {sidebar}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SectionHeader eyebrow="Concierge" title={texts.title} description={texts.subtitle} />

        {notice ? (
          <View style={[styles.noticeBanner, notice.type === 'success' ? styles.noticeSuccess : notice.type === 'error' ? styles.noticeError : styles.noticeInfo]}>
            <Text style={styles.noticeText}>{notice.message}</Text>
            <TouchableOpacity onPress={() => setNotice(null)}>
              <Text style={styles.noticeClose}>×</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? <View style={styles.loadingCard}><Text style={styles.loadingText}>Chargement...</Text></View> : null}

        {!loading && page === 'dashboard' ? (
          <>
            <View style={styles.kpiGrid}>
              <KpiTile value={`${occupantOptions.length}`} label={texts.dashboardOccupants} hint={texts.dashboardBulletOne} />
              <KpiTile value={`${dashboardDraftCount}`} label={texts.dashboardDrafts} hint={texts.dashboardBulletTwo} />
              <KpiTile value={`${dashboardValidatedCount}`} label={texts.dashboardValidated} hint={texts.dashboardBulletThree} />
              <KpiTile value={`${dashboardExitPending}`} label={texts.dashboardExitPending} hint={texts.comparisonDescription} />
            </View>
            <View style={styles.panelRow}>
              <ActionPanel
                title={texts.createTitle}
                description={texts.listDescription}
                bullets={[texts.dashboardBulletOne, texts.dashboardBulletTwo, texts.dashboardBulletThree]}
                actions={[
                  { label: texts.createSheet, onPress: () => setPage('inspection') },
                  { label: texts.comparisonMenu, onPress: () => setPage('comparison'), variant: 'secondary' },
                ]}
              />
              <DataTableCard
                title={texts.listTitle}
                description={texts.listDescription}
                columns={[
                  { key: 'resident', label: 'Resident' },
                  { key: 'room', label: 'Logement' },
                  { key: 'entry', label: texts.entrySheet },
                  { key: 'exit', label: texts.exitSheet },
                ]}
                rows={sheetSummaries.map((summary) => ({ resident: summary.residentName, room: summary.roomLabel, entry: summary.entryStatus, exit: summary.exitStatus }))}
                searchable
                searchPlaceholder={`${texts.listTitle}...`}
                emptyText={texts.noSheet}
                getRowKey={(_, index) => sheetSummaries[index]?.occupationId ?? `summary-${index}`}
                onRowPress={(_, index) => {
                  const summary = sheetSummaries[index];
                  if (summary) handleSelectSummary(summary);
                }}
              />
            </View>
          </>
        ) : null}

        {!loading && page === 'inspection' ? (
          <>
            <View style={styles.panelRow}>
              <DataTableCard
                title={texts.listTitle}
                description={texts.listDescription}
                columns={[
                  { key: 'resident', label: 'Resident' },
                  { key: 'room', label: 'Logement' },
                  { key: 'entry', label: texts.entrySheet },
                  { key: 'exit', label: texts.exitSheet },
                ]}
                rows={sheetSummaries.map((summary) => ({ resident: summary.residentName, room: summary.roomLabel, entry: summary.entryStatus, exit: summary.exitStatus }))}
                searchable
                searchPlaceholder={`${texts.listTitle}...`}
                emptyText={texts.noSheet}
                getRowKey={(_, index) => sheetSummaries[index]?.occupationId ?? `summary-${index}`}
                onRowPress={(_, index) => {
                  const summary = sheetSummaries[index];
                  if (summary) handleSelectSummary(summary);
                }}
              />
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{texts.createTitle}</Text>
                <Text style={styles.formDescription}>{texts.selectSheetHint}</Text>
                <Text style={styles.fieldLabel}>{texts.residentChoice}</Text>
                <View style={styles.choiceWrap}>
                  {occupantOptions.map((option) => (
                    <TouchableOpacity key={option.occupationId} style={[styles.choiceChip, createOccupationId === option.occupationId && styles.choiceChipActive]} onPress={() => setCreateOccupationId(option.occupationId)}>
                      <Text style={[styles.choiceChipText, createOccupationId === option.occupationId && styles.choiceChipTextActive]}>{option.roomLabel} - {option.residentName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>{texts.sheetType}</Text>
                <View style={styles.toggleGroup}>
                  <ExclusiveButton active={createSheetType === 'ENTREE'} label={texts.entrySheet} styles={styles} onPress={() => setCreateSheetType('ENTREE')} />
                  <ExclusiveButton active={createSheetType === 'SORTIE'} label={texts.exitSheet} styles={styles} onPress={() => setCreateSheetType('SORTIE')} />
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={createOrOpenSelectedSheet}>
                  <Text style={styles.primaryButtonText}>{texts.createSheet}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {draft ? (
              <>
                <View style={styles.editorHeader}>
                  <View>
                    <Text style={styles.editorTitle}>{draft.residentInfo.fullName || texts.noOccupantFound}</Text>
                    <Text style={styles.editorSubtitle}>{draft.residentInfo.roomLabel} • {draft.typeEtatLieux === 'ENTREE' ? texts.entrySheet : texts.exitSheet}</Text>
                  </View>
                  <View style={styles.editorMeta}>
                    <Text style={styles.editorMetaText}>{texts.summaryStatus}: {draft.statut}</Text>
                    <Text style={styles.editorMetaText}>{texts.summaryUpdatedAt}: {formatDateTime(draft.updatedAt)}</Text>
                  </View>
                </View>
                <View style={styles.topActionRow}>
                  <TouchableOpacity style={[styles.smallActionButton, autoSaveEnabled && styles.smallActionButtonActive]} onPress={() => setAutoSaveEnabled((current) => !current)}>
                    <Text style={[styles.smallActionButtonText, autoSaveEnabled && styles.smallActionButtonTextActive]}>{texts.autoSave}</Text>
                  </TouchableOpacity>
                  <TextInput value={newSectionTitle} onChangeText={setNewSectionTitle} style={[styles.fieldInput, styles.inlineInput]} placeholder={texts.optionalSectionTitle} placeholderTextColor={colors.textLight} />
                  <TouchableOpacity style={styles.primaryButtonCompact} onPress={handleAddSection}>
                    <Text style={styles.primaryButtonText}>{texts.addSectionAction}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                  {activeTabs.map((tab) => (
                    <TouchableOpacity key={tab.key} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]} onPress={() => setActiveTab(tab.key)}>
                      <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.editorCard}>
                  {renderActiveTab({ draft, activeTab, styles, texts, colors, sheets, updateDraft, handleAddExtraItem })}
                  <View style={styles.bottomNavRow}>
                    <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton, styles.navButton]} onPress={() => setActiveTab(moveTab(activeTabs, activeTab, -1))}>
                      <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{texts.previous}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, styles.navButton]} onPress={() => draft && void persistSheet({ ...draft, statut: 'BROUILLON' })}>
                      <Text style={styles.primaryButtonText}>{texts.saveDraft}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, styles.navButton]} onPress={handleValidate}>
                      <Text style={styles.primaryButtonText}>{texts.validateSheet}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, styles.navButton]} onPress={handleExport}>
                      <Text style={styles.primaryButtonText}>{texts.exportPdf}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton, styles.navButton]} onPress={() => setActiveTab(moveTab(activeTabs, activeTab, 1))}>
                      <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>{texts.next}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bottomUtilityRow}>
                    <TouchableOpacity style={[styles.primaryButton, styles.archiveButton]} onPress={handleArchive}>
                      <Text style={styles.primaryButtonText}>{texts.archiveSheet}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {!loading && page === 'maintenance' ? (
          <View style={styles.panelRow}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{texts.maintenanceMenu}</Text>
              <Text style={styles.formDescription}>{texts.maintenanceDescription}</Text>
              <Text style={styles.fieldLabel}>{texts.maintenanceRoomLabel}</Text>
              <TextInput value={maintenanceForm.roomLabel} onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, roomLabel: value }))} style={styles.fieldInput} placeholder={texts.maintenanceRoomLabel} placeholderTextColor={colors.textLight} />
              <Text style={styles.fieldLabel}>{texts.residentName}</Text>
              <TextInput value={maintenanceForm.residentName} onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, residentName: value }))} style={styles.fieldInput} placeholder={texts.residentName} placeholderTextColor={colors.textLight} />
              <Text style={styles.fieldLabel}>{texts.maintenanceIssueLabel}</Text>
              <TextInput value={maintenanceForm.issue} onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, issue: value }))} style={[styles.fieldInput, styles.textareaInput]} multiline placeholder={texts.maintenanceIssueLabel} placeholderTextColor={colors.textLight} />
              <Text style={styles.fieldLabel}>{texts.maintenanceStatusLabel}</Text>
              <View style={styles.toggleGroup}>
                <ExclusiveButton active={maintenanceForm.status === 'OUVERT'} label={texts.statusOpen} styles={styles} onPress={() => setMaintenanceForm((current) => ({ ...current, status: 'OUVERT' }))} />
                <ExclusiveButton active={maintenanceForm.status === 'EN_COURS'} label={texts.statusInProgress} styles={styles} onPress={() => setMaintenanceForm((current) => ({ ...current, status: 'EN_COURS' }))} />
                <ExclusiveButton active={maintenanceForm.status === 'RESOLU'} label={texts.statusResolved} styles={styles} onPress={() => setMaintenanceForm((current) => ({ ...current, status: 'RESOLU' }))} />
              </View>
              <Text style={styles.fieldLabel}>{texts.maintenanceResponsibilityLabel}</Text>
              <View style={styles.toggleGroup}>
                <ExclusiveButton active={maintenanceForm.responsibility === 'RESIDENT'} label={texts.responsibilityResident} styles={styles} onPress={() => setMaintenanceForm((current) => ({ ...current, responsibility: 'RESIDENT' }))} />
                <ExclusiveButton active={maintenanceForm.responsibility === 'GESTIONNAIRE'} label={texts.responsibilityManager} styles={styles} onPress={() => setMaintenanceForm((current) => ({ ...current, responsibility: 'GESTIONNAIRE' }))} />
                <ExclusiveButton active={maintenanceForm.responsibility === 'INCONNU'} label={texts.responsibilityUnknown} styles={styles} onPress={() => setMaintenanceForm((current) => ({ ...current, responsibility: 'INCONNU' }))} />
              </View>
              <Text style={styles.fieldLabel}>{texts.maintenanceCostLabel}</Text>
              <TextInput value={maintenanceForm.estimatedCost} onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, estimatedCost: value }))} style={styles.fieldInput} placeholder="0 FCFA" placeholderTextColor={colors.textLight} />
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddMaintenanceTicket}>
                <Text style={styles.primaryButtonText}>{texts.addMaintenance}</Text>
              </TouchableOpacity>
            </View>
            <DataTableCard
              title={texts.maintenanceMenu}
              description={texts.maintenanceDescription}
              columns={[
                { key: 'room', label: texts.roomsLabelShort },
                { key: 'resident', label: texts.residentName },
                { key: 'issue', label: texts.maintenanceIssueLabel },
                { key: 'status', label: texts.maintenanceStatusLabel },
                { key: 'responsibility', label: texts.maintenanceResponsibilityLabel },
                { key: 'cost', label: texts.maintenanceCostLabel, align: 'right' },
              ]}
              rows={maintenanceTickets.map((ticket) => ({
                room: ticket.roomLabel,
                resident: ticket.residentName || '-',
                issue: ticket.issue,
                status: ticket.status,
                responsibility: ticket.responsibility,
                cost: ticket.estimatedCost || '-',
              }))}
              searchable
              searchPlaceholder={`${texts.maintenanceMenu}...`}
              emptyText={texts.noMaintenance}
            />
          </View>
        ) : null}

        {!loading && page === 'mainMeters' ? (
          <View style={styles.panelRow}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{texts.mainMetersMenu}</Text>
              <Text style={styles.formDescription}>{texts.mainMetersDescription}</Text>
              <Text style={styles.fieldLabel}>{texts.meterDate}</Text>
              <TextInput value={mainMeterForm.date} onChangeText={(value) => setMainMeterForm((current) => ({ ...current, date: value }))} style={styles.fieldInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textLight} />
              <Text style={styles.fieldLabel}>{texts.mainWaterIndex}</Text>
              <TextInput value={mainMeterForm.waterIndex} onChangeText={(value) => setMainMeterForm((current) => ({ ...current, waterIndex: value }))} style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.textLight} />
              <Text style={styles.fieldLabel}>{texts.mainElectricIndex}</Text>
              <TextInput value={mainMeterForm.electricIndex} onChangeText={(value) => setMainMeterForm((current) => ({ ...current, electricIndex: value }))} style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.textLight} />
              <Text style={styles.fieldLabel}>{texts.noteOptional}</Text>
              <TextInput value={mainMeterForm.note} onChangeText={(value) => setMainMeterForm((current) => ({ ...current, note: value }))} style={[styles.fieldInput, styles.textareaInput]} multiline placeholder={texts.noteOptional} placeholderTextColor={colors.textLight} />
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddMainMeterEntry}>
                <Text style={styles.primaryButtonText}>{selectedMainMeterId ? texts.updateMainMeter : texts.saveMainMeter}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{texts.mainMetersSummary}</Text>
              <Text style={styles.formDescription}>{texts.mainMetersSummaryHint}</Text>
              <View style={styles.formGrid}>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.dailyConsumption}</Text>
                  <Text style={styles.sectionTitle}>{`${mainMeterSummary.dailyWater.toFixed(1)} m3`}</Text>
                  <Text style={styles.formDescription}>{`${mainMeterSummary.dailyElec.toFixed(1)} kWh`}</Text>
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.weeklyConsumption}</Text>
                  <Text style={styles.sectionTitle}>{`${mainMeterSummary.weeklyWater.toFixed(1)} m3`}</Text>
                  <Text style={styles.formDescription}>{`${mainMeterSummary.weeklyElec.toFixed(1)} kWh`}</Text>
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.monthlyConsumption}</Text>
                  <Text style={styles.sectionTitle}>{`${mainMeterSummary.monthlyWater.toFixed(1)} m3`}</Text>
                  <Text style={styles.formDescription}>{`${mainMeterSummary.monthlyElec.toFixed(1)} kWh`}</Text>
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.yearlyConsumption}</Text>
                  <Text style={styles.sectionTitle}>{`${mainMeterSummary.yearlyWater.toFixed(1)} m3`}</Text>
                  <Text style={styles.formDescription}>{`${mainMeterSummary.yearlyElec.toFixed(1)} kWh`}</Text>
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.expectedBills}</Text>
                  <Text style={styles.sectionTitle}>{formatFcfa(mainMeterSummary.expectedWater)}</Text>
                  <Text style={styles.formDescription}>{formatFcfa(mainMeterSummary.expectedElec)}</Text>
                </View>
              </View>
            </View>
            <DataTableCard
              title={texts.monthlyRecapTitle}
              description={texts.monthlyRecapDescription}
              columns={[
                { key: 'label', label: texts.recapLabel },
                { key: 'consumption', label: texts.recapConsumption },
                { key: 'amount', label: texts.recapExpected, align: 'right' },
              ]}
              rows={[
                {
                  label: texts.recapWater,
                  consumption: `${mainMeterMonthlyRecap.waterConso.toFixed(1)} m3`,
                  amount: formatFcfa(mainMeterMonthlyRecap.expectedWater),
                },
                {
                  label: texts.recapElectric,
                  consumption: `${mainMeterMonthlyRecap.elecConso.toFixed(1)} kWh`,
                  amount: formatFcfa(mainMeterMonthlyRecap.expectedElec),
                },
                {
                  label: texts.recapTotal,
                  consumption: '-',
                  amount: formatFcfa(mainMeterMonthlyRecap.totalExpected),
                },
              ]}
              searchable={false}
              emptyText={texts.noMainMeters}
            />
            <DataTableCard
              title={texts.mainMetersMenu}
              description={texts.mainMetersTable}
              columns={[
                { key: 'date', label: texts.meterDate },
                { key: 'waterIndex', label: texts.mainWaterIndex },
                { key: 'electricIndex', label: texts.mainElectricIndex },
                { key: 'waterConso', label: texts.waterConsumption },
                { key: 'elecConso', label: texts.electricConsumption },
                { key: 'expectedWater', label: texts.expectedWaterBill },
                { key: 'expectedElec', label: texts.expectedElectricBill },
              ]}
              rows={mainMeterRows.map((row) => ({
                date: row.date,
                waterIndex: row.waterIndex,
                electricIndex: row.electricIndex,
                waterConso: row.waterConso.toFixed(1),
                elecConso: row.elecConso.toFixed(1),
                expectedWater: formatFcfa(row.expectedWater),
                expectedElec: formatFcfa(row.expectedElec),
              }))}
              searchable
              searchPlaceholder={`${texts.mainMetersMenu}...`}
              emptyText={texts.noMainMeters}
              onRowPress={(_, index) => {
                const row = mainMeterRows[index];
                if (!row) return;
                setSelectedMainMeterId(row.id);
                setMainMeterForm({
                  id: row.id,
                  date: row.date,
                  waterIndex: row.waterIndex,
                  electricIndex: row.electricIndex,
                  vendorWaterBill: '',
                  vendorElectricBill: '',
                  note: row.note,
                  createdAt: row.createdAt,
                  updatedAt: row.updatedAt,
                });
              }}
            />
          </View>
        ) : null}

        {!loading && page === 'profile' ? (
          <View style={styles.panelRow}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{texts.profileMenu}</Text>
              <Text style={styles.formDescription}>{texts.profileDescription}</Text>
              {profileNotice ? (
                <View style={[styles.noticeBanner, profileNotice.type === 'success' ? styles.noticeSuccess : profileNotice.type === 'error' ? styles.noticeError : styles.noticeInfo]}>
                  <Text style={styles.noticeText}>{profileNotice.message}</Text>
                  <TouchableOpacity onPress={() => setProfileNotice(null)}>
                    <Text style={styles.noticeClose}>x</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.formGrid}>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.profilePhoto}</Text>
                  <FilePicker
                    value={profile.profilePhoto ? texts.fileSelected : ''}
                    placeholder={texts.uploadPhoto}
                    styles={styles}
                    onChange={(_, dataUrl) => updateProfile('profilePhoto', dataUrl ?? '')}
                  />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.fullName}</Text>
                  <TextInput value={profile.fullName} onChangeText={(value) => updateProfile('fullName', value)} style={styles.fieldInput} placeholder={texts.fullName} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.cniNumber}</Text>
                  <TextInput value={profile.cniNumber} onChangeText={(value) => updateProfile('cniNumber', value)} style={styles.fieldInput} placeholder={texts.cniNumber} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.cniPhoto}</Text>
                  <FilePicker
                    value={profile.cniPhoto ? texts.fileSelected : ''}
                    placeholder={texts.uploadCni}
                    styles={styles}
                    onChange={(_, dataUrl) => updateProfile('cniPhoto', dataUrl ?? '')}
                  />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.birthDate}</Text>
                  <TextInput value={profile.birthDate} onChangeText={(value) => updateProfile('birthDate', value)} style={styles.fieldInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.birthPlace}</Text>
                  <TextInput value={profile.birthPlace} onChangeText={(value) => updateProfile('birthPlace', value)} style={styles.fieldInput} placeholder={texts.birthPlace} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.whatsappNumber}</Text>
                  <TextInput value={profile.whatsappNumber} onChangeText={(value) => updateProfile('whatsappNumber', value)} style={styles.fieldInput} placeholder={texts.whatsappNumber} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.phoneNumber}</Text>
                  <TextInput value={profile.phoneNumber} onChangeText={(value) => updateProfile('phoneNumber', value)} style={styles.fieldInput} placeholder={texts.phoneNumber} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.sponsorName}</Text>
                  <TextInput value={profile.sponsorName} onChangeText={(value) => updateProfile('sponsorName', value)} style={styles.fieldInput} placeholder={texts.sponsorName} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.sponsorPhone}</Text>
                  <TextInput value={profile.sponsorPhone} onChangeText={(value) => updateProfile('sponsorPhone', value)} style={styles.fieldInput} placeholder={texts.sponsorPhone} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.educationLevel}</Text>
                  <TextInput value={profile.educationLevel} onChangeText={(value) => updateProfile('educationLevel', value)} style={styles.fieldInput} placeholder={texts.educationLevel} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.educationField}</Text>
                  <TextInput value={profile.educationField} onChangeText={(value) => updateProfile('educationField', value)} style={styles.fieldInput} placeholder={texts.educationField} placeholderTextColor={colors.textLight} />
                </View>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>{texts.cvUpload}</Text>
                  <FilePicker
                    value={profile.cvFileName}
                    placeholder={texts.uploadCv}
                    accept="application/pdf"
                    styles={styles}
                    onChange={(value, dataUrl) => {
                      updateProfile('cvFileName', value);
                      updateProfile('cvFileDataUrl', dataUrl ?? '');
                    }}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProfile}>
                <Text style={styles.primaryButtonText}>{texts.saveProfile}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loading && page === 'comparison' ? (
          <>
            <SectionHeader eyebrow={texts.comparisonMenu} title={texts.comparisonTitle} description={texts.comparisonDescription} />
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{texts.comparisonSelector}</Text>
              <View style={styles.choiceWrap}>
                {comparisonOptions.map((option) => (
                  <TouchableOpacity key={option.occupationId} style={[styles.choiceChip, comparisonOccupationId === option.occupationId && styles.choiceChipActive]} onPress={() => setComparisonOccupationId(option.occupationId)}>
                    <Text style={[styles.choiceChipText, comparisonOccupationId === option.occupationId && styles.choiceChipTextActive]}>{option.roomLabel} - {option.residentName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <DataTableCard
              title={texts.comparisonTitle}
              description={texts.comparisonDescription}
              columns={[
                { key: 'element', label: 'Element' },
                { key: 'entry', label: texts.entryState },
                { key: 'exit', label: texts.exitState },
                { key: 'difference', label: texts.difference },
              ]}
              rows={comparisonRows}
              searchable
              searchPlaceholder={`${texts.comparisonTitle}...`}
              emptyText={texts.noComparison}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    screen: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
    sidebar: { width: 280, paddingHorizontal: 18, paddingVertical: 24, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.tabBg, gap: 20 },
    brandBlock: { gap: 8 },
    brandEyebrow: { color: colors.secondary, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    brandTitle: { color: colors.text, fontSize: 28, fontWeight: '900' },
    brandDescription: { color: colors.textLight, fontSize: 13, lineHeight: 20 },
    menu: { gap: 10 },
    menuSection: { gap: 10 },
    menuSectionTitle: {
      color: colors.textLight,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.cardBg },
    menuItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    menuLabel: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    menuLabelActive: { color: colors.white },
    content: { flex: 1 },
    embeddedPanel: { flex: 1 },
    contentContainer: { padding: 24, gap: 18 },
    noticeBanner: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noticeSuccess: { backgroundColor: colors.success },
    noticeError: { backgroundColor: colors.error },
    noticeInfo: { backgroundColor: colors.primary },
    noticeText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '700' },
    noticeClose: { color: colors.white, fontSize: 24, fontWeight: '800', marginLeft: 16, lineHeight: 24 },
    loadingCard: { backgroundColor: colors.cardBg, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: colors.border },
    loadingText: { color: colors.text, fontSize: 15, fontWeight: '700' },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    panelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    formCard: { flex: 1, minWidth: 380, backgroundColor: colors.cardBg, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 12 },
    formTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
    formDescription: { color: colors.textLight, fontSize: 13, lineHeight: 20 },
    fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
    fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.inputBg, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 14 },
    filePickerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    filePickerButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.secondary },
    filePickerButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
    inlineInput: { flex: 1, minWidth: 220 },
    readonlyInput: { opacity: 0.72 },
    textareaInput: { minHeight: 96, textAlignVertical: 'top' as any },
    choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    choiceChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.inputBg },
    choiceChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    choiceChipText: { color: colors.text, fontSize: 13, fontWeight: '700' },
    choiceChipTextActive: { color: colors.white },
    editorHeader: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    editorTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
    editorSubtitle: { color: colors.textLight, fontSize: 14, marginTop: 6 },
    editorMeta: { gap: 4, alignItems: 'flex-end' },
    editorMetaText: { color: colors.textLight, fontSize: 12, fontWeight: '700' },
    topActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
    smallActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    smallActionButtonActive: { borderColor: colors.secondary, backgroundColor: colors.secondary },
    smallActionButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
    smallActionButtonTextActive: { color: colors.white },
    primaryButtonCompact: { backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    tabsRow: { gap: 10 },
    tabButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.cardBg },
    tabButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
    tabButtonTextActive: { color: colors.white },
    editorCard: { backgroundColor: colors.cardBg, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 18 },
    sectionStack: { gap: 16 },
    sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    formGridCol: { flex: 1, minWidth: 260, gap: 8 },
    checklistCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.inputBg, padding: 14, gap: 12 },
    itemLabelInput: { fontWeight: '700' },
    checklistAnswerRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    degradationGrid: { gap: 10 },
    toggleGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    toggleButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardBg, paddingHorizontal: 14, paddingVertical: 11 },
    toggleButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toggleButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
    toggleButtonTextActive: { color: colors.white },
    subSectionCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg, borderRadius: 16, padding: 16, gap: 12 },
    subSectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
    extraSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    bottomNavRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    bottomUtilityRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    navButton: { minWidth: 140, flexGrow: 1 },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
    archiveButton: { backgroundColor: colors.warning, minWidth: 180 },
    secondaryButton: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
    secondaryButtonText: { color: colors.text },
  });
}

async function loadConciergeProfile(db: SQLiteDatabase | null): Promise<ConciergeProfile | null> {
  if (!db) {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(`myhouse:${PROFILE_STORAGE_KEY}`);
      return raw ? (JSON.parse(raw) as ConciergeProfile) : null;
    } catch {
      return null;
    }
  }
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [PROFILE_STORAGE_KEY]);
  return row?.value ? (JSON.parse(row.value) as ConciergeProfile) : null;
}

async function saveConciergeProfile(db: SQLiteDatabase | null, profile: ConciergeProfile): Promise<void> {
  if (!db) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`myhouse:${PROFILE_STORAGE_KEY}`, JSON.stringify(profile));
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [PROFILE_STORAGE_KEY, JSON.stringify(profile)]);
}

async function loadMaintenanceTickets(db: SQLiteDatabase | null): Promise<ConciergeMaintenanceTicket[]> {
  if (!db) {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(`myhouse:${MAINTENANCE_STORAGE_KEY}`);
      return raw ? (JSON.parse(raw) as ConciergeMaintenanceTicket[]) : [];
    } catch {
      return [];
    }
  }
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [MAINTENANCE_STORAGE_KEY]);
  return row?.value ? (JSON.parse(row.value) as ConciergeMaintenanceTicket[]) : [];
}

async function saveMaintenanceTickets(db: SQLiteDatabase | null, tickets: ConciergeMaintenanceTicket[]): Promise<void> {
  const payload = JSON.stringify(tickets);
  if (!db) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`myhouse:${MAINTENANCE_STORAGE_KEY}`, payload);
    }
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [MAINTENANCE_STORAGE_KEY, payload]);
}

async function loadMainMeterEntries(db: SQLiteDatabase | null): Promise<MainMeterEntry[]> {
  if (!db) {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(`myhouse:${MAIN_METERS_STORAGE_KEY}`);
      return raw ? normalizeMainMeterEntries(JSON.parse(raw) as MainMeterEntry[]) : [];
    } catch {
      return [];
    }
  }
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [MAIN_METERS_STORAGE_KEY]);
  return row?.value ? normalizeMainMeterEntries(JSON.parse(row.value) as MainMeterEntry[]) : [];
}

async function saveMainMeterEntries(db: SQLiteDatabase | null, entries: MainMeterEntry[]): Promise<void> {
  const payload = JSON.stringify(entries);
  if (!db) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`myhouse:${MAIN_METERS_STORAGE_KEY}`, payload);
    }
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [MAIN_METERS_STORAGE_KEY, payload]);
}

function sortMainMeters(entries: MainMeterEntry[]): MainMeterEntry[] {
  return [...entries].sort((left, right) => right.date.localeCompare(left.date));
}

function parseNumber(value: string): number {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMainMeterEntries(entries: MainMeterEntry[]): MainMeterEntry[] {
  return entries.map((entry) => {
    const fallbackTime = `${entry.date || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
    return {
      ...entry,
      createdAt: entry.createdAt || fallbackTime,
      updatedAt: entry.updatedAt || entry.createdAt || fallbackTime,
    };
  });
}

function isEndOfMonth(dateValue: string): boolean {
  const parts = dateValue.split('-').map((val) => Number(val));
  if (parts.length < 3 || parts.some((val) => Number.isNaN(val))) return false;
  const [year, month, day] = parts;
  const lastDay = new Date(year, month, 0).getDate();
  return day >= lastDay - 2;
}

function canEditEntry(entry: MainMeterEntry): boolean {
  if (!entry.createdAt) return true;
  const createdAt = new Date(entry.createdAt).getTime();
  if (Number.isNaN(createdAt)) return true;
  const now = Date.now();
  return now - createdAt <= 24 * 60 * 60 * 1000;
}

function FilePicker({
  value,
  placeholder,
  accept,
  onChange,
  styles,
}: {
  value: string;
  placeholder: string;
  accept?: string;
  onChange: (value: string, dataUrl?: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = value;

  function handlePick() {
    if (typeof document === 'undefined') return;
    inputRef.current?.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      onChange('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      onChange(file.name, result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.filePickerRow}>
        <TextInput value={displayValue} editable={false} style={styles.fieldInput} placeholder={placeholder} />
        <TouchableOpacity style={styles.filePickerButton} onPress={handlePick}>
          <Text style={styles.filePickerButtonText}>Uploader</Text>
        </TouchableOpacity>
      </View>
      {typeof document !== 'undefined' ? (
        // @ts-ignore - web only input
        <input ref={inputRef} type="file" accept={accept ?? '*/*'} style={{ display: 'none' }} onChange={handleChange} />
      ) : null}
    </View>
  );
}

function renderActiveTab({
  draft,
  activeTab,
  styles,
  texts,
  colors,
  sheets,
  updateDraft,
  handleAddExtraItem,
}: {
  draft: InspectionSheet;
  activeTab: InspectionTabKey;
  styles: ReturnType<typeof createStyles>;
  texts: ModuleTexts;
  colors: ReturnType<typeof useThemeColors>;
  sheets: InspectionSheet[];
  updateDraft: (mutator: (current: InspectionSheet) => InspectionSheet) => void;
  handleAddExtraItem: (sectionKey: string) => void;
}) {
  if (activeTab === 'resident') {
    return (
      <ResidentTab
        draft={draft}
        texts={texts}
        styles={styles}
        colors={colors}
        onChange={(field, value) => updateDraft((current) => ({
          ...current,
          dateEtatLieux: field === 'inspectionDate' ? value : current.dateEtatLieux,
          residentInfo: { ...current.residentInfo, [field]: value },
        }))}
      />
    );
  }
  if (activeTab === 'room') {
    return (
      <ChecklistTab
        title={texts.roomSectionTitle}
        items={draft.chambreItems}
        texts={texts}
        styles={styles}
        isExit={draft.typeEtatLieux === 'SORTIE'}
        onUpdate={(itemKey, updater) => updateDraft((current) => ({
          ...current,
          chambreItems: current.chambreItems.map((item) => item.key === itemKey ? updater(item) : item),
        }))}
      />
    );
  }
  if (activeTab === 'kitchen') {
    return (
      <ChecklistTab
        title={texts.kitchenSectionTitle}
        items={draft.cuisineItems}
        texts={texts}
        styles={styles}
        isExit={draft.typeEtatLieux === 'SORTIE'}
        onUpdate={(itemKey, updater) => updateDraft((current) => ({
          ...current,
          cuisineItems: current.cuisineItems.map((item) => item.key === itemKey ? updater(item) : item),
        }))}
      />
    );
  }
  if (activeTab === 'bathroom') {
    return (
      <ChecklistTab
        title={texts.bathroomSectionTitle}
        items={draft.doucheItems}
        texts={texts}
        styles={styles}
        isExit={draft.typeEtatLieux === 'SORTIE'}
        onUpdate={(itemKey, updater) => updateDraft((current) => ({
          ...current,
          doucheItems: current.doucheItems.map((item) => item.key === itemKey ? updater(item) : item),
        }))}
      />
    );
  }
  if (activeTab === 'meters') {
    return (
      <MetersTab
        counters={draft.compteurs}
        texts={texts}
        styles={styles}
        onChange={(field, value) => updateDraft((current) => ({
          ...current,
          compteurs: { ...current.compteurs, [field]: value },
        }))}
      />
    );
  }
  if (activeTab.startsWith('extra:')) {
    return (
      <ExtraTab
        section={draft.extraSections.find((section) => `extra:${section.key}` === activeTab) ?? null}
        texts={texts}
        styles={styles}
        isExit={draft.typeEtatLieux === 'SORTIE'}
        onAddItem={handleAddExtraItem}
        onUpdate={(sectionKey, itemKey, updater) => updateDraft((current) => ({
          ...current,
          extraSections: current.extraSections.map((section) => section.key === sectionKey
            ? { ...section, items: section.items.map((item) => item.key === itemKey ? updater(item) : item) }
            : section),
        }))}
      />
    );
  }
  return (
    <ValidationTab
      draft={draft}
      texts={texts}
      styles={styles}
      entrySheet={getLatestSheet(sheets, draft.occupationId, 'ENTREE')}
      exitSheet={getLatestSheet(sheets, draft.occupationId, 'SORTIE')}
      onChange={(field, value) => updateDraft((current) => ({
        ...current,
        validation: { ...current.validation, [field]: value },
        observations: field === 'generalComment' ? String(value) : current.observations,
      }))}
    />
  );
}

function ResidentTab({
  draft, texts, styles, colors, onChange,
}: {
  draft: InspectionSheet;
  texts: ModuleTexts;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useThemeColors>;
  onChange: (field: keyof InspectionSheet['residentInfo'], value: string) => void;
}) {
  const fields: Array<{ key: keyof InspectionSheet['residentInfo']; label: string; placeholder?: string }> = [
    { key: 'fullName', label: 'Nom et prenoms' },
    { key: 'phone', label: texts.residentPhone },
    { key: 'schoolOrProfession', label: texts.schoolOrProfession },
    { key: 'levelOrPosition', label: texts.levelOrPosition },
    { key: 'fatherOrGuardianName', label: texts.fatherName },
    { key: 'fatherOrGuardianPhone', label: texts.fatherPhone },
    { key: 'motherName', label: texts.motherName },
    { key: 'motherPhone', label: texts.motherPhone },
    { key: 'roomLabel', label: texts.roomOrHousing },
    { key: 'inspectionDate', label: texts.inspectionDate, placeholder: '2026-03-16' },
    { key: 'conciergeName', label: texts.conciergeName },
  ];
  return (
    <View style={styles.sectionStack}>
      <Text style={styles.sectionTitle}>{texts.residentInfoTab}</Text>
      <View style={styles.formGrid}>
        {fields.map((field) => (
          <View key={field.key} style={styles.formGridCol}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
              value={draft.residentInfo[field.key] as string}
              onChangeText={(value) => onChange(field.key, value)}
              style={styles.fieldInput}
              placeholder={field.placeholder ?? field.label}
              placeholderTextColor={colors.textLight}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function ChecklistTab({
  title, items, texts, styles, isExit, onUpdate,
}: {
  title: string;
  items: InspectionChecklistItem[];
  texts: ModuleTexts;
  styles: ReturnType<typeof createStyles>;
  isExit: boolean;
  onUpdate: (itemKey: string, updater: (item: InspectionChecklistItem) => InspectionChecklistItem) => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <ChecklistItemCard key={item.key} item={item} texts={texts} styles={styles} isExit={isExit} onUpdate={(updater) => onUpdate(item.key, updater)} />
      ))}
    </View>
  );
}

function ExtraTab({
  section, texts, styles, isExit, onAddItem, onUpdate,
}: {
  section: InspectionSheet['extraSections'][number] | null;
  texts: ModuleTexts;
  styles: ReturnType<typeof createStyles>;
  isExit: boolean;
  onAddItem: (sectionKey: string) => void;
  onUpdate: (sectionKey: string, itemKey: string, updater: (item: InspectionChecklistItem) => InspectionChecklistItem) => void;
}) {
  if (!section) return null;
  return (
    <View style={styles.sectionStack}>
      <View style={styles.extraSectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <TouchableOpacity style={styles.primaryButtonCompact} onPress={() => onAddItem(section.key)}>
          <Text style={styles.primaryButtonText}>{texts.addItemAction}</Text>
        </TouchableOpacity>
      </View>
      {section.items.map((item) => (
        <ChecklistItemCard key={item.key} item={item} texts={texts} styles={styles} isExit={isExit} onUpdate={(updater) => onUpdate(section.key, item.key, updater)} />
      ))}
    </View>
  );
}

function ChecklistItemCard({
  item, texts, styles, isExit, onUpdate,
}: {
  item: InspectionChecklistItem;
  texts: ModuleTexts;
  styles: ReturnType<typeof createStyles>;
  isExit: boolean;
  onUpdate: (updater: (item: InspectionChecklistItem) => InspectionChecklistItem) => void;
}) {
  return (
    <View style={styles.checklistCard}>
      <TextInput value={item.label} onChangeText={(value) => onUpdate((current) => ({ ...current, label: value }))} style={[styles.fieldInput, styles.itemLabelInput]} placeholder={texts.itemLabelPlaceholder} placeholderTextColor="#94A3B8" />
      <View style={styles.checklistAnswerRow}>
        <ExclusiveButton active={item.answer === 'YES'} label={texts.yes} styles={styles} onPress={() => onUpdate((current) => ({ ...current, answer: 'YES' }))} />
        <ExclusiveButton active={item.answer === 'NO'} label={texts.no} styles={styles} onPress={() => onUpdate((current) => ({ ...current, answer: 'NO' }))} />
      </View>
      <TextInput value={item.observation} onChangeText={(value) => onUpdate((current) => ({ ...current, observation: value }))} style={styles.fieldInput} placeholder={texts.observation} placeholderTextColor="#94A3B8" />
      {isExit && item.answer === 'NO' ? (
        <View style={styles.degradationGrid}>
          <TextInput value={item.degradationObserved ?? ''} onChangeText={(value) => onUpdate((current) => ({ ...current, degradationObserved: value }))} style={styles.fieldInput} placeholder={texts.degradationObserved} placeholderTextColor="#94A3B8" />
          <TextInput value={item.estimatedCost ?? ''} onChangeText={(value) => onUpdate((current) => ({ ...current, estimatedCost: value }))} style={styles.fieldInput} placeholder={texts.estimatedCost} placeholderTextColor="#94A3B8" />
          <TextInput value={item.complementaryObservation ?? ''} onChangeText={(value) => onUpdate((current) => ({ ...current, complementaryObservation: value }))} style={styles.fieldInput} placeholder={texts.complementaryObservation} placeholderTextColor="#94A3B8" />
        </View>
      ) : null}
    </View>
  );
}

function MetersTab({
  counters, texts, styles, onChange,
}: {
  counters: InspectionCounterSection;
  texts: ModuleTexts;
  styles: ReturnType<typeof createStyles>;
  onChange: (field: keyof InspectionCounterSection, value: string | InspectionYesNo) => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <Text style={styles.sectionTitle}>{texts.metersSectionTitle}</Text>
      <View style={styles.subSectionCard}>
        <Text style={styles.subSectionTitle}>{texts.electricityMeter}</Text>
        <View style={styles.toggleGroup}>
          <ExclusiveButton active={counters.electricityMeterType === 'MECANIQUE'} label={texts.mechanical} styles={styles} onPress={() => onChange('electricityMeterType', 'MECANIQUE')} />
          <ExclusiveButton active={counters.electricityMeterType === 'ELECTRONIQUE'} label={texts.electronic} styles={styles} onPress={() => onChange('electricityMeterType', 'ELECTRONIQUE')} />
        </View>
        <TextInput value={counters.electricityMeterIndex} onChangeText={(value) => onChange('electricityMeterIndex', value)} style={styles.fieldInput} placeholder={texts.meterIndex} placeholderTextColor="#94A3B8" />
        <View style={styles.toggleGroup}>
          <ExclusiveButton active={counters.electricityBreakerOk === 'YES'} label={`${texts.breakerOk} - ${texts.yes}`} styles={styles} onPress={() => onChange('electricityBreakerOk', 'YES')} />
          <ExclusiveButton active={counters.electricityBreakerOk === 'NO'} label={`${texts.breakerOk} - ${texts.no}`} styles={styles} onPress={() => onChange('electricityBreakerOk', 'NO')} />
        </View>
      </View>
      <View style={styles.subSectionCard}>
        <Text style={styles.subSectionTitle}>{texts.waterMeter}</Text>
        <View style={styles.toggleGroup}>
          <ExclusiveButton active={counters.waterMeterPresent === 'YES'} label={`${texts.waterPresent} - ${texts.yes}`} styles={styles} onPress={() => onChange('waterMeterPresent', 'YES')} />
          <ExclusiveButton active={counters.waterMeterPresent === 'NO'} label={`${texts.waterPresent} - ${texts.no}`} styles={styles} onPress={() => onChange('waterMeterPresent', 'NO')} />
        </View>
        <TextInput value={counters.waterMeterIndex} onChangeText={(value) => onChange('waterMeterIndex', value)} style={styles.fieldInput} placeholder={texts.meterIndex} placeholderTextColor="#94A3B8" />
        <View style={styles.toggleGroup}>
          <ExclusiveButton active={counters.waterValveOk === 'YES'} label={`${texts.waterValveOk} - ${texts.yes}`} styles={styles} onPress={() => onChange('waterValveOk', 'YES')} />
          <ExclusiveButton active={counters.waterValveOk === 'NO'} label={`${texts.waterValveOk} - ${texts.no}`} styles={styles} onPress={() => onChange('waterValveOk', 'NO')} />
        </View>
      </View>
      <View style={styles.subSectionCard}>
        <Text style={styles.subSectionTitle}>{texts.paintState}</Text>
        <View style={styles.toggleGroup}>
          <ExclusiveButton active={counters.paintState === 'BONNE'} label={texts.paintGood} styles={styles} onPress={() => onChange('paintState', 'BONNE')} />
          <ExclusiveButton active={counters.paintState === 'MAUVAISE'} label={texts.paintBad} styles={styles} onPress={() => onChange('paintState', 'MAUVAISE')} />
        </View>
        <TextInput value={counters.paintColor} onChangeText={(value) => onChange('paintColor', value)} style={styles.fieldInput} placeholder={texts.paintColor} placeholderTextColor="#94A3B8" />
      </View>
    </View>
  );
}

function ValidationTab({
  draft, texts, styles, entrySheet, exitSheet, onChange,
}: {
  draft: InspectionSheet;
  texts: ModuleTexts;
  styles: ReturnType<typeof createStyles>;
  entrySheet: InspectionSheet | null;
  exitSheet: InspectionSheet | null;
  onChange: (field: 'generalComment' | 'occupantSigned' | 'conciergeSigned', value: string | boolean) => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <Text style={styles.sectionTitle}>{texts.validationSectionTitle}</Text>
      <ActionPanel
        title={texts.summaryTitle}
        description={texts.validationSectionTitle}
        bullets={[
          `${texts.summaryType}: ${draft.typeEtatLieux === 'ENTREE' ? texts.entrySheet : texts.exitSheet}`,
          `${texts.summaryStatus}: ${draft.statut}`,
          `${texts.roomOrHousing}: ${draft.residentInfo.roomLabel}`,
          `${texts.conciergeName}: ${draft.validation.conciergeName || draft.conciergeName}`,
          `${texts.summaryUpdatedAt}: ${formatDateTime(draft.updatedAt)}`,
          `${texts.entrySheet}: ${entrySheet ? entrySheet.statut : texts.entryNotCreated}`,
          `${texts.exitSheet}: ${exitSheet ? exitSheet.statut : texts.exitNotCreated}`,
        ]}
      />
      <View style={styles.formGrid}>
        <View style={styles.formGridCol}>
          <Text style={styles.fieldLabel}>{texts.generalComment}</Text>
          <TextInput value={draft.validation.generalComment} onChangeText={(value) => onChange('generalComment', value)} style={[styles.fieldInput, styles.textareaInput]} multiline placeholder={texts.generalComment} placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.formGridCol}>
          <Text style={styles.fieldLabel}>{texts.occupantName}</Text>
          <TextInput value={draft.residentInfo.fullName || draft.validation.occupantName} editable={false} style={[styles.fieldInput, styles.readonlyInput]} />
        </View>
        <View style={styles.formGridCol}>
          <Text style={styles.fieldLabel}>{texts.conciergeName}</Text>
          <TextInput value={draft.conciergeName || draft.validation.conciergeName} editable={false} style={[styles.fieldInput, styles.readonlyInput]} />
        </View>
        <View style={styles.formGridCol}>
          <Text style={styles.fieldLabel}>{texts.occupantSignature}</Text>
          <View style={styles.toggleGroup}>
            <ExclusiveButton active={draft.validation.occupantSigned} label={texts.occupantSignatureCheck} styles={styles} onPress={() => onChange('occupantSigned', !draft.validation.occupantSigned)} />
          </View>
        </View>
        <View style={styles.formGridCol}>
          <Text style={styles.fieldLabel}>{texts.conciergeSignature}</Text>
          <View style={styles.toggleGroup}>
            <ExclusiveButton active={draft.validation.conciergeSigned} label={texts.conciergeSignatureCheck} styles={styles} onPress={() => onChange('conciergeSigned', !draft.validation.conciergeSigned)} />
          </View>
        </View>
        <View style={styles.formGridCol}>
          <Text style={styles.fieldLabel}>{texts.validationDateTime}</Text>
          <TextInput value={draft.validation.validatedAt ? formatDateTime(draft.validation.validatedAt) : '-'} editable={false} style={[styles.fieldInput, styles.readonlyInput]} />
        </View>
      </View>
    </View>
  );
}

function ExclusiveButton({
  active, label, styles, onPress,
}: {
  active: boolean;
  label: string;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.toggleButton, active && styles.toggleButtonActive]} onPress={onPress}>
      <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
