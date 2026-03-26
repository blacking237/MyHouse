import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { initializeDatabase } from '../database/schema';
import { calculateAllInvoices } from './InvoiceCalculationService';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080').replace(/\/$/, '');

type JsonObject = Record<string, unknown>;

let accessToken: string | null = null;
let refreshToken: string | null = null;
let localDbPromise: Promise<SQLiteDatabase> | null = null;
const isWebRuntime = Platform.OS === 'web';

function hasBrowserStorage(): boolean {
  return isWebRuntime && typeof window !== 'undefined' && !!window.localStorage;
}

function isDesktopRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as typeof window & { MyHouseDesktop?: unknown }).MyHouseDesktop);
}

export type BackendAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ApiUserSummary = {
  id: number;
  username: string;
  role: string;
  actif: boolean;
  createdBy: string | null;
  status: string;
  createdAt?: string | null;
  validatedAt?: string | null;
  rejectedAt?: string | null;
};

export type CreateUserAccountPayload = {
  username: string;
  password: string;
  role: 'CONCIERGE' | 'RESIDENT' | 'MANAGER' | 'ADMIN_COMMERCIAL' | 'ADMIN_SAV' | 'ADMIN_JURIDIQUE' | 'ADMIN_COMPTA';
  residentExternalId?: string | null;
};

export type BackendMe = {
  id: number;
  username: string;
  role: string;
  residentId?: number | null;
  status?: string;
  consentAt?: string | null;
};

export type RecoveryEmailPayload = {
  recoveryEmail: string | null;
};

export type ApiRoom = {
  id: number;
  externalId?: string;
  numeroChambre: string;
  bloc: string | null;
  actif: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type ApiResident = {
  id: number;
  externalId?: string;
  cni?: string | null;
  nom: string;
  prenom: string;
  genre?: string | null;
  dateNaissance?: string | null;
  whatsapp: string | null;
  whatsappParents?: string | null;
  telephone: string | null;
  email?: string | null;
  ecole?: string | null;
  filiere?: string | null;
  niveau?: string | null;
  niveauEtude?: string | null;
  filiereEtude?: string | null;
  contactUrgenceNom?: string | null;
  contactUrgenceTelephone?: string | null;
  nomPere?: string | null;
  nomMere?: string | null;
  preferredLanguage?: string | null;
  activityScore?: number | null;
  paymentsCount?: number | null;
  interactionsCount?: number | null;
  lastActiveAt?: string | null;
  dateEntree?: string | null;
  dateSortie?: string | null;
  updatedAt?: string | null;
  currentRoomId: number | null;
  statut: string | null;
};

export type ApiMonthConfig = {
  id: number;
  mois: string;
  puEau: number;
  puElectricite: number;
  tva: number;
  lcEau: number;
  lcElectricite: number;
  surplusEauTotal: number;
  surplusElecTotal: number;
  internetFee: number;
  commonChargesPercent: number;
  penaltyMissingIndex: number;
  indexWindowStartDay: number | null;
  indexWindowEndDay: number | null;
  exportsValidatedByConcierge: boolean;
  exportsValidatedAt: string | null;
  exportsValidatedBy: string | null;
  amendeEauMontant: number;
  minimumFacture: number;
  delaiPaiement: string;
  createdAt: string;
  updatedAt: string | undefined;
};

export type ApiIndexReading = {
  id: number;
  externalId?: string;
  roomId: number;
  roomNumber: string;
  mois: string;
  anEau: number;
  niEau: number;
  anElec: number;
  niElec: number;
  statutPresence: 'PRESENT' | 'ABSENT';
  amendeEau: boolean;
  lateSubmission?: boolean;
  saisiPar: string;
  saisiLe: string;
  updatedAt?: string;
};

export type ApiInvoiceLine = {
  conso: number;
  montantHt: number;
  tva: number;
  lc: number;
  surplus: number;
  amende: number;
  montantTtc: number;
};

export type ApiInvoice = {
  id: number;
  externalId?: string;
  roomId: number;
  roomNumber: string;
  residentId: number | null;
  mois: string;
  water: ApiInvoiceLine;
  electricity: ApiInvoiceLine;
  totalFacture: number;
  internetFee?: number;
  commonCharges?: number;
  penaltyMissingIndex?: number;
  loyer?: number;
  dette: number | null;
  netAPayer: number;
  statutEnvoi: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR';
  calculeeLe: string;
  delaiPaiement: string | null;
};

export type ApiPaymentRecord = {
  id: number;
  externalId?: string;
  invoiceId: number;
  roomId: number;
  roomNumber: string;
  residentName: string;
  amount: number;
  paidAt: string;
  note: string;
  recordedBy: string;
  method?: string;
  status?: string;
};

export type ApiContractSignature = {
  signedBy: string;
  signedAt: string;
  signatureType: string;
};

export type ApiContract = {
  id: number;
  externalId?: string;
  roomNumero: string;
  residentId: number | null;
  residentName: string;
  status: string;
  signingMode: string;
  startDate: string | null;
  endDate: string | null;
  monthlyRent: number;
  deposit: number;
  autoRenewal: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  validatedAt: string | null;
  signatures: ApiContractSignature[];
};

export type ApiMaintenanceTicket = {
  id: number;
  externalId?: string;
  roomNumero: string;
  residentId: number | null;
  residentName: string;
  category: string;
  priority: string;
  status: string;
  responsibility: string;
  estimatedCost: number;
  penaltyAmount: number;
  penaltyAppliedAt: string | null;
  dueAt?: string | null;
  overdue?: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type ApiPayment = {
  id: number;
  externalId?: string;
  invoiceId: number;
  amount: number;
  method: string;
  status: string;
  transactionRef: string | null;
  observation: string | null;
  paidAt: string;
};

export type ApiNotificationResponse = {
  id: number;
  channel: string;
  recipient: string;
  subject: string | null;
  payload: string | null;
  status: string;
  createdAt: string;
  sentAt: string | null;
};

export type ApiExitReport = {
  id: number;
  externalId?: string;
  residentId: number | null;
  roomId: number | null;
  contractId: number | null;
  roomNumero: string;
  residentName: string;
  depositAmount: number;
  debtTotal: number;
  sanctionTotal: number;
  repairCost: number;
  commonChargesAmount: number;
  depositUsed: number;
  refundAmount: number;
  status: string;
  notes: string | null;
  signedBy: string | null;
  managerSignedAt: string | null;
  residentSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiGlobalSetting = {
  id: number;
  settingKey: string;
  settingValue: string | null;
  updatedAt: string;
};

export type ApiMarketplaceMedia = {
  id: number;
  mediaUrl: string;
  mediaType: string;
  sortOrder: number | null;
  createdAt: string;
};

export type ApiMarketplaceListing = {
  id: number;
  externalId?: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  listingType: string;
  status: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  media?: ApiMarketplaceMedia[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiCommonCharge = {
  id: number;
  code: string;
  label: string;
  amount: number;
  required: boolean;
  active: boolean;
};

export type ApiCommonChargeAssignment = {
  id: number;
  chargeId: number;
  chargeLabel: string | null;
  scopeType: string;
  scopeValue: string;
  required: boolean;
};

export type CreateResidentPayload = {
  cni?: string | null;
  nom: string;
  prenom: string;
  genre?: string | null;
  dateNaissance?: string | null;
  telephone?: string | null;
  whatsapp?: string | null;
  whatsappParents?: string | null;
  email?: string | null;
  ecole?: string | null;
  filiere?: string | null;
  niveau?: string | null;
  niveauEtude?: string | null;
  filiereEtude?: string | null;
  contactUrgenceNom?: string | null;
  contactUrgenceTelephone?: string | null;
  nomPere?: string | null;
  nomMere?: string | null;
  dateEntree?: string | null;
  externalId?: string | null;
};

export type ApiOcrIdentityResponse = {
  status: string;
  requiresReview: boolean;
  fields: Record<string, string>;
};

type BillingValidationError = {
  roomId: number;
  roomNumber: string;
  message: string;
};

export type BillingCalculationResult = {
  success: boolean;
  count: number;
  errors: BillingValidationError[];
};

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: JsonObject;
  skipAuth?: boolean;
};

export type SyncPayload = {
  since?: string;
  rooms?: unknown[];
  residents?: unknown[];
  indexReadings?: unknown[];
  invoices?: unknown[];
  payments?: unknown[];
  contracts?: unknown[];
  maintenance?: unknown[];
  mainMeters?: unknown[];
  exitReports?: unknown[];
};

type LocalRoomRow = {
  id: number;
  numero_chambre: string;
  nom_prenom: string;
  numero_whatsapp: string;
  bloc?: string | null;
  actif: number;
  date_creation: string;
  external_id?: string | null;
  updated_at?: string | null;
};

type LocalMonthConfigRow = {
  id: number;
  mois: string;
  pu_eau: number;
  pu_electricite: number;
  tva: number;
  lc_eau: number;
  lc_electricite: number;
  surplus_eau_total: number;
  surplus_elec_total: number;
  amende_eau_montant?: number | null;
  minimum_facture?: number | null;
  internet_fee?: number | null;
  common_charges_percent?: number | null;
  penalty_missing_index?: number | null;
  index_window_start_day?: number | null;
  index_window_end_day?: number | null;
  exports_validated_by_concierge?: number | null;
  exports_validated_at?: string | null;
  exports_validated_by?: string | null;
  delai_paiement: string;
  date_creation: string;
  updated_at?: string | null;
};

type LocalIndexReadingRow = {
  id: number;
  chambre_id: number;
  numero_chambre: string;
  mois: string;
  ancien_index_eau: number;
  nouvel_index_eau: number;
  ancien_index_elec: number;
  nouvel_index_elec: number;
  statut_presence: 'PRESENT' | 'ABSENT';
  amende_eau: number;
  late_submission?: number | null;
  saisi_par: string;
  date_saisie: string;
  external_id?: string | null;
  updated_at?: string | null;
};

type LocalInvoiceRow = {
  id: number;
  chambre_id: number;
  numero_chambre: string;
  nom_prenom: string;
  mois: string;
  conso_eau: number;
  montant_ht_eau: number;
  tva_eau: number;
  lc_eau: number;
  surplus_eau: number;
  amende_eau: number;
  montant_ttc_eau: number;
  conso_elec: number;
  montant_ht_elec: number;
  tva_elec: number;
  lc_elec: number;
  surplus_elec: number;
  montant_ttc_elec: number;
  internet_fee?: number | null;
  common_charges?: number | null;
  penalty_missing_index?: number | null;
  loyer?: number | null;
  dette: number | null;
  net_a_payer: number;
  statut_envoi: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR';
  calculee_le: string;
  delai_paiement: string | null;
  external_id?: string | null;
  updated_at?: string | null;
};

type LocalPaymentRow = {
  id: number;
  facture_id: number;
  montant_paye: number;
  date_paiement: string;
  observation: string | null;
  saisi_par: string;
  room_id: number;
  numero_chambre: string;
  nom_prenom: string;
  method?: string | null;
  status?: string | null;
  external_id?: string | null;
  updated_at?: string | null;
};

type LocalResidentRow = {
  id: number;
  external_id?: string | null;
  cni?: string | null;
  nom: string;
  prenom: string;
  genre?: string | null;
  date_naissance?: string | null;
  telephone?: string | null;
  whatsapp?: string | null;
  whatsapp_parents?: string | null;
  email?: string | null;
  ecole?: string | null;
  filiere?: string | null;
  niveau?: string | null;
  niveau_etude?: string | null;
  filiere_etude?: string | null;
  contact_urgence_nom?: string | null;
  contact_urgence_telephone?: string | null;
  nom_pere?: string | null;
  nom_mere?: string | null;
  preferred_language?: string | null;
  activity_score?: number | null;
  payments_count?: number | null;
  interactions_count?: number | null;
  last_active_at?: string | null;
  date_entree?: string | null;
  date_sortie?: string | null;
  current_room_id?: number | null;
  statut?: string | null;
  updated_at?: string | null;
};

type LocalExitReportRow = {
  id: number;
  external_id?: string | null;
  resident_id?: number | null;
  room_id?: number | null;
  contract_id?: number | null;
  deposit_amount?: number | null;
  debt_total?: number | null;
  sanction_total?: number | null;
  repair_cost?: number | null;
  common_charges_amount?: number | null;
  deposit_used?: number | null;
  balance?: number | null;
  status?: string | null;
  notes?: string | null;
  signed_by?: string | null;
  manager_signed_at?: string | null;
  resident_signed_at?: string | null;
  created_at: string;
  updated_at: string;
  room_numero?: string | null;
  resident_nom?: string | null;
  resident_prenom?: string | null;
};

class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function parseNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createExternalId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

function isOfflineError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return [
      'network request failed',
      'failed to fetch',
      'cleartext http traffic',
      'unable to resolve host',
      'failed to connect',
      'connection refused',
      'software caused connection abort',
      'timeout',
      'timed out',
    ].some((pattern) => message.includes(pattern));
  }
  return false;
}

async function getLocalDb(): Promise<SQLiteDatabase> {
  if (isWebRuntime) {
    throw new Error('SQLite local database is not available on web runtime');
  }
  if (!localDbPromise) {
    localDbPromise = (async () => {
      const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync('myhouse.db');
      await initializeDatabase(db);
      return db;
    })();
  }
  return localDbPromise;
}

type BrowserStore = {
  recoveryEmail: string | null;
  rooms: ApiRoom[];
  residents: ApiResident[];
  monthConfig: ApiMonthConfig | null;
  indexReadings: ApiIndexReading[];
  invoices: ApiInvoice[];
  payments: ApiPaymentRecord[];
  exitReports: ApiExitReport[];
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function createBrowserDemoStore(): BrowserStore {
  const month = getCurrentMonth();
  return {
    recoveryEmail: 'support@myhouse.app',
    rooms: [
      { id: 1, numeroChambre: 'A01', bloc: 'A', actif: true, createdAt: `${month}-01T08:00:00.000Z` },
      { id: 2, numeroChambre: 'A02', bloc: 'A', actif: true, createdAt: `${month}-02T08:00:00.000Z` },
      { id: 3, numeroChambre: 'B11', bloc: 'B', actif: true, createdAt: `${month}-03T08:00:00.000Z` },
    ],
    residents: [
      { id: 1, nom: 'Adamou', prenom: 'Moussa', whatsapp: '699001122', telephone: '699001122', currentRoomId: 1, statut: 'ACTIF' },
      { id: 2, nom: 'Njoya', prenom: 'Carine', whatsapp: '677334455', telephone: '677334455', currentRoomId: 2, statut: 'ACTIF' },
      { id: 3, nom: 'Fouda', prenom: 'Marc', whatsapp: '651778899', telephone: '651778899', currentRoomId: 3, statut: 'ACTIF' },
    ],
    monthConfig: {
      id: 1,
      mois: month,
      puEau: 500,
      puElectricite: 135,
      tva: 19.25,
      lcEau: 1000,
      lcElectricite: 1000,
      surplusEauTotal: 0,
      surplusElecTotal: 0,
      internetFee: 0,
      commonChargesPercent: 0,
      penaltyMissingIndex: 0,
      indexWindowStartDay: 25,
      indexWindowEndDay: 30,
      exportsValidatedByConcierge: false,
      exportsValidatedAt: null,
      exportsValidatedBy: null,
      amendeEauMontant: 3000,
      minimumFacture: 500,
      delaiPaiement: `${month}-25`,
      createdAt: `${month}-01T00:00:00.000Z`,
      updatedAt: undefined,
    },
    indexReadings: [
      { id: 1, roomId: 1, roomNumber: 'A01', mois: month, anEau: 12, niEau: 18, anElec: 300, niElec: 360, statutPresence: 'PRESENT', amendeEau: false, saisiPar: 'desktop', saisiLe: `${month}-05T09:00:00.000Z` },
      { id: 2, roomId: 2, roomNumber: 'A02', mois: month, anEau: 21, niEau: 28, anElec: 410, niElec: 470, statutPresence: 'PRESENT', amendeEau: false, saisiPar: 'desktop', saisiLe: `${month}-05T09:30:00.000Z` },
    ],
    invoices: [
      {
        id: 1,
        roomId: 1,
        roomNumber: 'A01',
        residentId: 1,
        mois: month,
        water: { conso: 6, montantHt: 3000, tva: 578, lc: 1000, surplus: 0, amende: 0, montantTtc: 4578 },
        electricity: { conso: 60, montantHt: 8100, tva: 1559, lc: 1000, surplus: 0, amende: 0, montantTtc: 10659 },
        totalFacture: 15237,
        dette: 0,
        netAPayer: 15237,
        statutEnvoi: 'NON_ENVOYE',
        calculeeLe: `${month}-06T11:00:00.000Z`,
        delaiPaiement: `${month}-25`,
      },
      {
        id: 2,
        roomId: 2,
        roomNumber: 'A02',
        residentId: 2,
        mois: month,
        water: { conso: 7, montantHt: 3500, tva: 674, lc: 1000, surplus: 0, amende: 0, montantTtc: 5174 },
        electricity: { conso: 60, montantHt: 8100, tva: 1559, lc: 1000, surplus: 0, amende: 0, montantTtc: 10659 },
        totalFacture: 15833,
        dette: 2500,
        netAPayer: 18333,
        statutEnvoi: 'ENVOYE',
        calculeeLe: `${month}-06T11:00:00.000Z`,
        delaiPaiement: `${month}-25`,
      },
      {
        id: 3,
        roomId: 3,
        roomNumber: 'B11',
        residentId: 3,
        mois: month,
        water: { conso: 0, montantHt: 0, tva: 0, lc: 1000, surplus: 0, amende: 3000, montantTtc: 4000 },
        electricity: { conso: 0, montantHt: 0, tva: 0, lc: 1000, surplus: 0, amende: 0, montantTtc: 1000 },
        totalFacture: 5000,
        dette: null,
        netAPayer: 5000,
        statutEnvoi: 'ERREUR',
        calculeeLe: `${month}-06T11:00:00.000Z`,
        delaiPaiement: `${month}-25`,
      },
    ],
    payments: [
      {
        id: 1,
        invoiceId: 2,
        roomId: 2,
        roomNumber: 'A02',
        residentName: 'Njoya Carine',
        amount: 10000,
        paidAt: `${month}-08`,
        note: 'Versement partiel',
        recordedBy: 'desktop',
      },
    ],
    exitReports: [],
  };
}

function getBrowserStore(): BrowserStore {
  if (!hasBrowserStorage()) {
    return createBrowserDemoStore();
  }
  const raw = window.localStorage.getItem('myhouse:console-demo');
  if (!raw) {
    const seeded = createBrowserDemoStore();
    window.localStorage.setItem('myhouse:console-demo', JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw) as BrowserStore;
  } catch {
    const seeded = createBrowserDemoStore();
    window.localStorage.setItem('myhouse:console-demo', JSON.stringify(seeded));
    return seeded;
  }
}

function saveBrowserStore(store: BrowserStore): void {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem('myhouse:console-demo', JSON.stringify(store));
}

async function browserGetRecoveryEmail(): Promise<RecoveryEmailPayload> {
  return { recoveryEmail: getBrowserStore().recoveryEmail };
}

async function browserSetRecoveryEmail(email: string): Promise<RecoveryEmailPayload> {
  const store = getBrowserStore();
  store.recoveryEmail = email;
  saveBrowserStore(store);
  return { recoveryEmail: email };
}

async function browserListRooms(actif?: boolean): Promise<ApiRoom[]> {
  const rooms = getBrowserStore().rooms;
  return typeof actif === 'boolean' ? rooms.filter((room) => room.actif === actif) : rooms;
}

async function browserListResidents(): Promise<ApiResident[]> {
  return getBrowserStore().residents;
}

async function browserCreateRoom(payload: { numeroChambre: string; bloc?: string | null }): Promise<ApiRoom> {
  const store = getBrowserStore();
  const nextId = (store.rooms.reduce((max, current) => Math.max(max, current.id), 0) || 0) + 1;
  const room: ApiRoom = {
    id: nextId,
    numeroChambre: payload.numeroChambre,
    bloc: payload.bloc ?? null,
    actif: true,
    createdAt: new Date().toISOString(),
  };
  store.rooms.push(room);
  saveBrowserStore(store);
  return room;
}

async function browserCreateResident(payload: {
  nom: string;
  prenom: string;
  cni?: string | null;
  dateNaissance?: string | null;
  whatsapp?: string | null;
  telephone?: string | null;
  email?: string | null;
}): Promise<ApiResident> {
  const store = getBrowserStore();
  const nextId = (store.residents.reduce((max, current) => Math.max(max, current.id), 0) || 0) + 1;
  const resident: ApiResident = {
    id: nextId,
    externalId: createExternalId('resident'),
    cni: payload.cni ?? null,
    nom: payload.nom,
    prenom: payload.prenom,
    dateNaissance: payload.dateNaissance ?? null,
    whatsapp: payload.whatsapp ?? null,
    telephone: payload.telephone ?? null,
    email: payload.email ?? null,
    currentRoomId: null,
    statut: 'ACTIF',
  };
  store.residents.push(resident);
  saveBrowserStore(store);
  return resident;
}

async function browserAssignResidentRoom(
  residentId: number,
  roomId: number,
  _dateDebut: string,
  _motif?: string,
): Promise<ApiResident> {
  const store = getBrowserStore();
  const index = store.residents.findIndex((resident) => resident.id === residentId);
  if (index < 0) {
    throw new Error('Resident not found');
  }
  store.residents[index] = {
    ...store.residents[index],
    currentRoomId: roomId,
    statut: 'ACTIF',
  };
  saveBrowserStore(store);
  return store.residents[index];
}

async function browserGetMonthConfig(mois: string): Promise<ApiMonthConfig | null> {
  const config = getBrowserStore().monthConfig;
  return config?.mois === mois ? config : null;
}

async function browserUpsertMonthConfig(mois: string, payload: {
  puEau: number;
  puElectricite: number;
  tva: number;
  lcEau: number;
  lcElectricite: number;
  surplusEauTotal: number;
  surplusElecTotal: number;
  internetFee?: number;
  commonChargesPercent?: number;
  penaltyMissingIndex?: number;
  indexWindowStartDay?: number | null;
  indexWindowEndDay?: number | null;
  exportsValidatedByConcierge?: boolean;
  exportsValidatedAt?: string | null;
  exportsValidatedBy?: string | null;
  amendeEauMontant: number;
  minimumFacture: number;
  delaiPaiement: string;
}): Promise<ApiMonthConfig> {
  const store = getBrowserStore();
  const nextConfig: ApiMonthConfig = {
    id: store.monthConfig?.id ?? 1,
    mois,
    puEau: payload.puEau,
    puElectricite: payload.puElectricite,
    tva: payload.tva,
    lcEau: payload.lcEau,
    lcElectricite: payload.lcElectricite,
    surplusEauTotal: payload.surplusEauTotal,
    surplusElecTotal: payload.surplusElecTotal,
    internetFee: payload.internetFee ?? 0,
    commonChargesPercent: payload.commonChargesPercent ?? 0,
    penaltyMissingIndex: payload.penaltyMissingIndex ?? 0,
    indexWindowStartDay: payload.indexWindowStartDay ?? 25,
    indexWindowEndDay: payload.indexWindowEndDay ?? 30,
    exportsValidatedByConcierge: payload.exportsValidatedByConcierge ?? false,
    exportsValidatedAt: payload.exportsValidatedAt ?? null,
    exportsValidatedBy: payload.exportsValidatedBy ?? null,
    amendeEauMontant: payload.amendeEauMontant,
    minimumFacture: payload.minimumFacture,
    delaiPaiement: payload.delaiPaiement,
    createdAt: store.monthConfig?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.monthConfig = nextConfig;
  saveBrowserStore(store);
  return nextConfig;
}

async function browserListIndexReadings(mois: string): Promise<ApiIndexReading[]> {
  return getBrowserStore().indexReadings.filter((reading) => reading.mois === mois);
}

async function browserListInvoices(mois: string): Promise<ApiInvoice[]> {
  return getBrowserStore().invoices.filter((invoice) => invoice.mois === mois);
}

async function browserListPaymentsForMonth(mois: string): Promise<ApiPaymentRecord[]> {
  const store = getBrowserStore();
  const invoiceIds = new Set(store.invoices.filter((invoice) => invoice.mois === mois).map((invoice) => invoice.id));
  return store.payments.filter((payment) => invoiceIds.has(payment.invoiceId));
}

async function browserCalculateBilling(mois: string): Promise<BillingCalculationResult> {
  const store = getBrowserStore();
  const config = store.monthConfig?.mois === mois ? store.monthConfig : null;
  if (!config) {
    return {
      success: false,
      count: 0,
      errors: [{ roomId: 0, roomNumber: '-', message: 'Parametres du mois non configures.' }],
    };
  }

  const activeRooms = store.rooms.filter((room) => room.actif);
  const readings = store.indexReadings.filter((reading) => reading.mois === mois);
  const errors: BillingValidationError[] = [];

  activeRooms.forEach((room) => {
    const reading = readings.find((item) => item.roomId === room.id);
    if (!reading) {
      errors.push({
        roomId: room.id,
        roomNumber: room.numeroChambre,
        message: `Index manquant pour la chambre ${room.numeroChambre}`,
      });
      return;
    }
    if (reading.niEau < reading.anEau) {
      errors.push({
        roomId: room.id,
        roomNumber: room.numeroChambre,
        message: `Erreur index eau chambre ${room.numeroChambre}: NI (${reading.niEau}) < AN (${reading.anEau})`,
      });
    }
    if (reading.niElec < reading.anElec) {
      errors.push({
        roomId: room.id,
        roomNumber: room.numeroChambre,
        message: `Erreur index elec chambre ${room.numeroChambre}: NI (${reading.niElec}) < AN (${reading.anElec})`,
      });
    }
  });

  if (errors.length > 0) {
    return { success: false, count: 0, errors };
  }

  const roundTwo = (value: number) => Math.round(value * 100) / 100;
  const presentCount = readings.filter((reading) => reading.statutPresence === 'PRESENT').length;
  const surplusEauIndiv = presentCount > 0 ? roundTwo(config.surplusEauTotal / presentCount) : 0;
  const surplusElecIndiv = presentCount > 0 ? roundTwo(config.surplusElecTotal / presentCount) : 0;
  const now = new Date().toISOString();
  let count = 0;

  const preservedInvoices = store.invoices.filter((invoice) => invoice.mois !== mois);
  const computedInvoices: ApiInvoice[] = [];

  activeRooms.forEach((room) => {
    const reading = readings.find((item) => item.roomId === room.id);
    if (!reading) return;

    const resident = store.residents.find((item) => item.currentRoomId === room.id && item.statut !== 'INACTIF') ?? null;
    const existingInvoice = store.invoices.find((invoice) => invoice.roomId === room.id && invoice.mois === mois) ?? null;

    const consoEau = roundTwo(reading.niEau - reading.anEau);
    const montantHtEau = consoEau > 0 ? roundTwo(consoEau * config.puEau) : config.minimumFacture;
    const tvaEau = roundTwo(montantHtEau * (config.tva / 100));
    const surplusEau = reading.statutPresence === 'PRESENT' ? surplusEauIndiv : 0;
    const amendeEau = reading.amendeEau ? config.amendeEauMontant : 0;
    const montantTtcEau = roundTwo(montantHtEau + tvaEau + config.lcEau + surplusEau + amendeEau);

    const consoElec = roundTwo(reading.niElec - reading.anElec);
    const montantHtElec = consoElec > 0 ? roundTwo(consoElec * config.puElectricite) : config.minimumFacture;
    const tvaElec = roundTwo(montantHtElec * (config.tva / 100));
    const surplusElec = reading.statutPresence === 'PRESENT' ? surplusElecIndiv : 0;
    const montantTtcElec = roundTwo(montantHtElec + tvaElec + config.lcElectricite + surplusElec);

    const internetFee = config.internetFee ?? 0;
    const commonChargesPercent = config.commonChargesPercent ?? 0;
    const commonCharges = commonChargesPercent > 0
      ? roundTwo((montantTtcEau + montantTtcElec) * (commonChargesPercent / 100))
      : 0;
    const penaltyMissingIndex = reading.statutPresence === 'PRESENT' ? 0 : (config.penaltyMissingIndex ?? 0);
    const loyer = 0;
    const totalFacture = roundTwo(montantTtcEau + montantTtcElec + internetFee + commonCharges + penaltyMissingIndex + loyer);
    const dette = existingInvoice?.dette ?? null;
    const netAPayer = roundTwo(totalFacture + (dette ?? 0));

    computedInvoices.push({
      id: existingInvoice?.id ?? ((store.invoices.reduce((max, current) => Math.max(max, current.id), 0) || 0) + count + 1),
      roomId: room.id,
      roomNumber: room.numeroChambre,
      residentId: resident?.id ?? null,
      mois,
      water: {
        conso: consoEau,
        montantHt: montantHtEau,
        tva: tvaEau,
        lc: config.lcEau,
        surplus: surplusEau,
        amende: amendeEau,
        montantTtc: montantTtcEau,
      },
      electricity: {
        conso: consoElec,
        montantHt: montantHtElec,
        tva: tvaElec,
        lc: config.lcElectricite,
        surplus: surplusElec,
        amende: 0,
        montantTtc: montantTtcElec,
      },
      totalFacture,
      internetFee,
      commonCharges,
      penaltyMissingIndex,
      loyer,
      dette,
      netAPayer,
      statutEnvoi: existingInvoice?.statutEnvoi ?? 'NON_ENVOYE',
      calculeeLe: now,
      delaiPaiement: config.delaiPaiement,
    });
    count += 1;
  });

  store.invoices = [...preservedInvoices, ...computedInvoices];
  saveBrowserStore(store);
  return {
    success: true,
    count,
    errors: [],
  };
}

function computeExitDebtFromInvoices(
  invoices: ApiInvoice[],
  payments: ApiPaymentRecord[],
): { debtTotal: number; sanctionTotal: number } {
  let debtTotal = 0;
  let sanctionTotal = 0;
  invoices.forEach((invoice) => {
    const paid = payments
      .filter((payment) => payment.invoiceId === invoice.id)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = Math.max(0, invoice.netAPayer - paid);
    debtTotal += outstanding;
    const penalty = invoice.penaltyMissingIndex ?? 0;
    if (outstanding > 0 && penalty > 0) {
      sanctionTotal += Math.min(outstanding, penalty);
    }
  });
  return {
    debtTotal: roundTwo(debtTotal),
    sanctionTotal: roundTwo(sanctionTotal),
  };
}

function buildSimplePdfBlob(lines: string[]): Blob {
  const safeLines = lines.map((line) =>
    line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
  );
  const content = ['BT', '/F1 12 Tf', '50 780 Td'];
  safeLines.forEach((line, index) => {
    if (index === 0) {
      content.push(`(${line}) Tj`);
    } else {
      content.push('0 -16 Td');
      content.push(`(${line}) Tj`);
    }
  });
  content.push('ET');
  const stream = content.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

async function browserListExitReports(): Promise<ApiExitReport[]> {
  return [...getBrowserStore().exitReports].sort((a, b) => b.id - a.id);
}

async function browserUpsertExitReport(payload: {
  roomId: number | null;
  residentId?: number | null;
  contractId?: number | null;
  depositAmount: number;
  repairCost: number;
  notes?: string | null;
}): Promise<ApiExitReport> {
  const store = getBrowserStore();
  const current = store.exitReports.find((entry) => entry.contractId != null && entry.contractId === (payload.contractId ?? null))
    ?? store.exitReports.find((entry) => entry.roomId != null && entry.roomId === payload.roomId)
    ?? null;
  const room = store.rooms.find((entry) => entry.id === payload.roomId) ?? null;
  const resident = (payload.residentId != null
    ? store.residents.find((entry) => entry.id === payload.residentId)
    : store.residents.find((entry) => entry.currentRoomId === payload.roomId)) ?? null;
  const roomInvoices = store.invoices.filter((invoice) => invoice.roomId === payload.roomId);
  const roomPayments = store.payments.filter((payment) => payment.roomId === payload.roomId);
  const { debtTotal, sanctionTotal } = computeExitDebtFromInvoices(roomInvoices, roomPayments);
  const commonChargesAmount = roundTwo((payload.depositAmount || 0) * 0.25);
  const deductions = roundTwo(debtTotal + (payload.repairCost || 0) + commonChargesAmount);
  const refundAmount = roundTwo(Math.max(0, (payload.depositAmount || 0) - deductions));
  const depositUsed = roundTwo(Math.min(payload.depositAmount || 0, deductions));
  const next: ApiExitReport = {
    id: current?.id ?? ((store.exitReports.reduce((max, entry) => Math.max(max, entry.id), 0) || 0) + 1),
    externalId: current?.externalId ?? createExternalId('exit-report'),
    residentId: resident?.id ?? payload.residentId ?? null,
    roomId: room?.id ?? payload.roomId ?? null,
    contractId: payload.contractId ?? current?.contractId ?? null,
    roomNumero: room?.numeroChambre ?? current?.roomNumero ?? '',
    residentName: resident ? `${resident.nom} ${resident.prenom}`.trim() : current?.residentName ?? '',
    depositAmount: roundTwo(payload.depositAmount || 0),
    debtTotal,
    sanctionTotal,
    repairCost: roundTwo(payload.repairCost || 0),
    commonChargesAmount,
    depositUsed,
    refundAmount,
    status: current?.managerSignedAt && current?.residentSignedAt ? 'SIGNED' : current?.managerSignedAt || current?.residentSignedAt ? 'PARTIALLY_SIGNED' : 'DRAFT',
    notes: payload.notes ?? current?.notes ?? null,
    signedBy: current?.signedBy ?? null,
    managerSignedAt: current?.managerSignedAt ?? null,
    residentSignedAt: current?.residentSignedAt ?? null,
    createdAt: current?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  store.exitReports = [next, ...store.exitReports.filter((entry) => entry.id !== next.id)];
  saveBrowserStore(store);
  return next;
}

async function browserSignExitReport(
  reportId: number,
  signedBy: string,
  signatureRole: 'MANAGER' | 'RESIDENT',
): Promise<ApiExitReport> {
  const store = getBrowserStore();
  const index = store.exitReports.findIndex((entry) => entry.id === reportId);
  if (index < 0) {
    throw new Error('Exit report not found');
  }
  const current = store.exitReports[index];
  const now = nowIso();
  const next: ApiExitReport = {
    ...current,
    signedBy,
    managerSignedAt: signatureRole === 'MANAGER' ? now : current.managerSignedAt,
    residentSignedAt: signatureRole === 'RESIDENT' ? now : current.residentSignedAt,
    status: (signatureRole === 'MANAGER' ? now : current.managerSignedAt) && (signatureRole === 'RESIDENT' ? now : current.residentSignedAt)
      ? 'SIGNED'
      : 'PARTIALLY_SIGNED',
    updatedAt: now,
  };
  store.exitReports[index] = next;
  saveBrowserStore(store);
  return next;
}

async function browserUpdateInvoiceSendStatus(
  invoiceId: number,
  statutEnvoi: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR',
): Promise<ApiInvoice> {
  const store = getBrowserStore();
  const index = store.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (index < 0) {
    throw new Error('Invoice not found');
  }
  store.invoices[index] = {
    ...store.invoices[index],
    statutEnvoi,
  };
  saveBrowserStore(store);
  return store.invoices[index];
}

async function browserPatchRoom(
  id: number,
  payload: { numeroChambre?: string; bloc?: string | null; actif?: boolean },
): Promise<ApiRoom> {
  const store = getBrowserStore();
  const index = store.rooms.findIndex((room) => room.id === id);
  if (index < 0) {
    throw new Error('Room not found');
  }
  store.rooms[index] = {
    ...store.rooms[index],
    numeroChambre: payload.numeroChambre ?? store.rooms[index].numeroChambre,
    bloc: payload.bloc === undefined ? store.rooms[index].bloc : payload.bloc,
    actif: payload.actif === undefined ? store.rooms[index].actif : payload.actif,
  };
  saveBrowserStore(store);
  return store.rooms[index];
}

async function browserPatchResident(
  id: number,
  payload: {
    nom?: string;
    prenom?: string;
    whatsapp?: string | null;
    telephone?: string | null;
    preferredLanguage?: string | null;
    dateSortie?: string | null;
    statut?: string | null;
    currentRoomId?: number | null;
  },
): Promise<ApiResident> {
  const store = getBrowserStore();
  const index = store.residents.findIndex((resident) => resident.id === id);
  if (index < 0) {
    throw new Error('Resident not found');
  }
  store.residents[index] = {
    ...store.residents[index],
    nom: payload.nom ?? store.residents[index].nom,
    prenom: payload.prenom ?? store.residents[index].prenom,
    whatsapp: payload.whatsapp === undefined ? store.residents[index].whatsapp : payload.whatsapp,
    telephone: payload.telephone === undefined ? store.residents[index].telephone : payload.telephone,
    preferredLanguage: payload.preferredLanguage === undefined ? store.residents[index].preferredLanguage : payload.preferredLanguage,
    dateSortie: payload.dateSortie === undefined ? store.residents[index].dateSortie : payload.dateSortie,
    statut: payload.statut === undefined ? store.residents[index].statut : payload.statut,
    currentRoomId: payload.currentRoomId === undefined ? store.residents[index].currentRoomId : payload.currentRoomId,
  };
  saveBrowserStore(store);
  return store.residents[index];
}

async function browserUpsertIndexReading(payload: {
  roomId: number;
  mois: string;
  anEau: number;
  niEau: number;
  anElec: number;
  niElec: number;
  statutPresence: 'PRESENT' | 'ABSENT';
  amendeEau: boolean;
  saisiPar: string;
}): Promise<ApiIndexReading> {
  const store = getBrowserStore();
  const room = store.rooms.find((item) => item.id === payload.roomId);
  if (!room) {
    throw new Error('Room not found');
  }
  const config = store.monthConfig && store.monthConfig.mois === payload.mois ? store.monthConfig : null;
  const today = new Date().getDate();
  const windowStart = config?.indexWindowStartDay ?? 25;
  const windowEnd = config?.indexWindowEndDay ?? 30;
  const lateSubmission = today < windowStart || today > windowEnd;
  const index = store.indexReadings.findIndex((reading) => reading.roomId === payload.roomId && reading.mois === payload.mois);
  const nextReading: ApiIndexReading = {
    id: index >= 0
      ? store.indexReadings[index].id
      : (store.indexReadings.reduce((max, current) => Math.max(max, current.id), 0) || 0) + 1,
    roomId: payload.roomId,
    roomNumber: room.numeroChambre,
    mois: payload.mois,
    anEau: payload.anEau,
    niEau: payload.niEau,
    anElec: payload.anElec,
    niElec: payload.niElec,
    statutPresence: payload.statutPresence,
    amendeEau: payload.amendeEau,
    lateSubmission,
    saisiPar: payload.saisiPar,
    saisiLe: new Date().toISOString(),
  };
  if (index >= 0) {
    store.indexReadings[index] = nextReading;
  } else {
    store.indexReadings.unshift(nextReading);
  }
  saveBrowserStore(store);
  return nextReading;
}

async function browserCancelIndexPenalty(readingId: number): Promise<ApiIndexReading> {
  const store = getBrowserStore();
  const index = store.indexReadings.findIndex((reading) => reading.id === readingId);
  if (index < 0) {
    throw new Error('Reading not found');
  }
  store.indexReadings[index] = {
    ...store.indexReadings[index],
    lateSubmission: false,
    amendeEau: false,
    updatedAt: new Date().toISOString(),
  };
  saveBrowserStore(store);
  return store.indexReadings[index];
}

async function browserRecordPayment(
  invoiceId: number,
  amount: number,
  note?: string | null,
): Promise<ApiPaymentRecord> {
  const store = getBrowserStore();
  const invoice = store.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  const room = store.rooms.find((item) => item.id === invoice.roomId);
  const resident = store.residents.find((item) => item.currentRoomId === invoice.roomId);
  const nextId = (store.payments.reduce((max, current) => Math.max(max, current.id), 0) || 0) + 1;
  const payment: ApiPaymentRecord = {
    id: nextId,
    invoiceId,
    roomId: invoice.roomId,
    roomNumber: invoice.roomNumber,
    residentName: [resident?.nom, resident?.prenom].filter(Boolean).join(' ').trim() || '-',
    amount,
    paidAt: new Date().toISOString().split('T')[0],
    note: note ?? '',
    recordedBy: 'desktop',
  };
  store.payments.unshift(payment);
  saveBrowserStore(store);
  return payment;
}

function paymentRowToApi(row: LocalPaymentRow): ApiPaymentRecord {
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    invoiceId: row.facture_id,
    roomId: row.room_id,
    roomNumber: row.numero_chambre,
    residentName: row.nom_prenom,
    amount: row.montant_paye,
    paidAt: row.date_paiement,
    note: row.observation ?? '',
    recordedBy: row.saisi_par,
    method: row.method ?? undefined,
    status: row.status ?? undefined,
  };
}

async function withOfflineFallback<T>(online: () => Promise<T>, offline: () => Promise<T>): Promise<T> {
  try {
    return await online();
  } catch (error) {
    if (!isOfflineError(error)) {
      throw error;
    }
    return offline();
  }
}

function splitResidentName(fullname: string): { nom: string; prenom: string } {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: '', prenom: '' };
  const [nom, ...prenoms] = parts;
  return { nom, prenom: prenoms.join(' ') };
}

function roomRowToApiRoom(row: LocalRoomRow): ApiRoom {
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    numeroChambre: row.numero_chambre,
    bloc: row.bloc ?? null,
    actif: row.actif === 1,
    createdAt: row.date_creation,
    updatedAt: row.updated_at ?? undefined,
  };
}

function roomRowToApiResident(row: LocalRoomRow): ApiResident | null {
  if (!row.nom_prenom.trim() && !row.numero_whatsapp.trim()) {
    return null;
  }
  const { nom, prenom } = splitResidentName(row.nom_prenom);
  return {
    id: row.id,
    nom,
    prenom,
    whatsapp: row.numero_whatsapp || null,
    telephone: row.numero_whatsapp || null,
    currentRoomId: row.id,
    statut: row.actif === 1 ? 'ACTIF' : 'INACTIF',
  };
}

function monthConfigRowToApi(row: LocalMonthConfigRow): ApiMonthConfig {
  return {
    id: row.id,
    mois: row.mois,
    puEau: row.pu_eau,
    puElectricite: row.pu_electricite,
    tva: row.tva,
    lcEau: row.lc_eau,
    lcElectricite: row.lc_electricite,
    surplusEauTotal: row.surplus_eau_total,
    surplusElecTotal: row.surplus_elec_total,
    internetFee: row.internet_fee ?? 0,
    commonChargesPercent: row.common_charges_percent ?? 0,
    penaltyMissingIndex: row.penalty_missing_index ?? 0,
    indexWindowStartDay: row.index_window_start_day ?? null,
    indexWindowEndDay: row.index_window_end_day ?? null,
    exportsValidatedByConcierge: row.exports_validated_by_concierge === 1,
    exportsValidatedAt: row.exports_validated_at ?? null,
    exportsValidatedBy: row.exports_validated_by ?? null,
    amendeEauMontant: row.amende_eau_montant ?? 3000,
    minimumFacture: row.minimum_facture ?? 500,
    delaiPaiement: row.delai_paiement,
    createdAt: row.date_creation,
    updatedAt: row.updated_at ?? undefined,
  };
}

function indexRowToApi(row: LocalIndexReadingRow): ApiIndexReading {
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    roomId: row.chambre_id,
    roomNumber: row.numero_chambre,
    mois: row.mois,
    anEau: row.ancien_index_eau,
    niEau: row.nouvel_index_eau,
    anElec: row.ancien_index_elec,
    niElec: row.nouvel_index_elec,
    statutPresence: row.statut_presence,
    amendeEau: row.amende_eau === 1,
    lateSubmission: row.late_submission === 1,
    saisiPar: row.saisi_par,
    saisiLe: row.date_saisie,
    updatedAt: row.updated_at ?? undefined,
  };
}

function toInvoiceLine(raw: unknown): ApiInvoiceLine {
  const line = (raw ?? {}) as Record<string, unknown>;
  return {
    conso: parseNumber(line.conso),
    montantHt: parseNumber(line.montantHt),
    tva: parseNumber(line.tva),
    lc: parseNumber(line.lc),
    surplus: parseNumber(line.surplus),
    amende: parseNumber(line.amende),
    montantTtc: parseNumber(line.montantTtc),
  };
}

function invoiceRowToApi(row: LocalInvoiceRow): ApiInvoice {
  const totalFacture =
    row.montant_ttc_eau +
    row.montant_ttc_elec +
    (row.internet_fee ?? 0) +
    (row.common_charges ?? 0) +
    (row.penalty_missing_index ?? 0) +
    (row.loyer ?? 0);
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    roomId: row.chambre_id,
    roomNumber: row.numero_chambre,
    residentId: row.nom_prenom.trim() ? row.chambre_id : null,
    mois: row.mois,
    water: {
      conso: row.conso_eau,
      montantHt: row.montant_ht_eau,
      tva: row.tva_eau,
      lc: row.lc_eau,
      surplus: row.surplus_eau,
      amende: row.amende_eau,
      montantTtc: row.montant_ttc_eau,
    },
    electricity: {
      conso: row.conso_elec,
      montantHt: row.montant_ht_elec,
      tva: row.tva_elec,
      lc: row.lc_elec,
      surplus: row.surplus_elec,
      amende: 0,
      montantTtc: row.montant_ttc_elec,
    },
    totalFacture,
    internetFee: row.internet_fee ?? 0,
    commonCharges: row.common_charges ?? 0,
    penaltyMissingIndex: row.penalty_missing_index ?? 0,
    loyer: row.loyer ?? 0,
    dette: row.dette,
    netAPayer: row.net_a_payer,
    statutEnvoi: row.statut_envoi,
    calculeeLe: row.calculee_le,
    delaiPaiement: row.delai_paiement,
  };
}

function exitReportRowToApi(row: LocalExitReportRow): ApiExitReport {
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    residentId: row.resident_id ?? null,
    roomId: row.room_id ?? null,
    contractId: row.contract_id ?? null,
    roomNumero: row.room_numero ?? '',
    residentName: [row.resident_nom ?? '', row.resident_prenom ?? ''].join(' ').trim(),
    depositAmount: row.deposit_amount ?? 0,
    debtTotal: row.debt_total ?? 0,
    sanctionTotal: row.sanction_total ?? 0,
    repairCost: row.repair_cost ?? 0,
    commonChargesAmount: row.common_charges_amount ?? 0,
    depositUsed: row.deposit_used ?? 0,
    refundAmount: row.balance ?? 0,
    status: row.status ?? 'DRAFT',
    notes: row.notes ?? null,
    signedBy: row.signed_by ?? null,
    managerSignedAt: row.manager_signed_at ?? null,
    residentSignedAt: row.resident_signed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function request<T>(path: string, options: FetchOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (!options.skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !options.skipAuth && !retried && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  if (!response.ok) {
    let payload: unknown = null;
    let message = `HTTP ${response.status}`;
    try {
      payload = await response.json();
      if (payload && typeof payload === 'object') {
        const details = payload as Record<string, unknown>;
        if (typeof details.message === 'string' && details.message.trim()) {
          message = details.message;
        } else if (typeof details.error === 'string' && details.error.trim()) {
          message = details.error;
        }
      }
    } catch {
      payload = null;
      try {
        const text = await response.text();
        if (text.trim()) message = text;
      } catch {
        // Ignore parsing fallback error.
      }
    }
    throw new ApiError(response.status, message, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

async function localListRooms(actif?: boolean): Promise<ApiRoom[]> {
  const db = await getLocalDb();
  const rows = typeof actif === 'boolean'
    ? await db.getAllAsync<LocalRoomRow>('SELECT * FROM rooms WHERE actif = ? ORDER BY numero_chambre', [actif ? 1 : 0])
    : await db.getAllAsync<LocalRoomRow>('SELECT * FROM rooms ORDER BY numero_chambre');
  return rows.map(roomRowToApiRoom);
}

async function localGetRoomById(id: number): Promise<ApiRoom> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<LocalRoomRow>('SELECT * FROM rooms WHERE id = ?', [id]);
  if (!row) throw new Error('Room not found');
  return roomRowToApiRoom(row);
}

async function localCreateRoom(payload: { numeroChambre: string; bloc?: string | null }): Promise<ApiRoom> {
  const db = await getLocalDb();
  const externalId = createExternalId('room');
  const updatedAt = nowIso();
  await db.runAsync(
    'INSERT INTO rooms (numero_chambre, nom_prenom, numero_whatsapp, bloc, actif, external_id, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [payload.numeroChambre, '', '', payload.bloc ?? null, externalId, updatedAt]
  );
  const row = await db.getFirstAsync<LocalRoomRow>('SELECT * FROM rooms WHERE numero_chambre = ?', [payload.numeroChambre]);
  if (!row) throw new Error('Room creation failed');
  return roomRowToApiRoom(row);
}

async function localPatchRoom(
  id: number,
  payload: { numeroChambre?: string; bloc?: string | null; actif?: boolean },
): Promise<ApiRoom> {
  const db = await getLocalDb();
  const current = await db.getFirstAsync<LocalRoomRow>('SELECT * FROM rooms WHERE id = ?', [id]);
  if (!current) throw new Error('Room not found');

  await db.runAsync(
    'UPDATE rooms SET numero_chambre = ?, bloc = ?, actif = ?, updated_at = ? WHERE id = ?',
    [
      payload.numeroChambre ?? current.numero_chambre,
      payload.bloc ?? current.bloc ?? null,
      payload.actif == null ? current.actif : (payload.actif ? 1 : 0),
      nowIso(),
      id,
    ]
  );

  return localGetRoomById(id);
}

async function localListResidents(): Promise<ApiResident[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<LocalResidentRow>('SELECT * FROM residents ORDER BY nom, prenom');
  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      externalId: row.external_id ?? undefined,
      cni: row.cni ?? null,
      nom: row.nom,
      prenom: row.prenom,
      genre: row.genre ?? null,
      dateNaissance: row.date_naissance ?? null,
      whatsapp: row.whatsapp ?? null,
      whatsappParents: row.whatsapp_parents ?? null,
      telephone: row.telephone ?? null,
      email: row.email ?? null,
      ecole: row.ecole ?? null,
      filiere: row.filiere ?? null,
      niveau: row.niveau ?? null,
      niveauEtude: row.niveau_etude ?? null,
      filiereEtude: row.filiere_etude ?? null,
      contactUrgenceNom: row.contact_urgence_nom ?? null,
      contactUrgenceTelephone: row.contact_urgence_telephone ?? null,
      nomPere: row.nom_pere ?? null,
      nomMere: row.nom_mere ?? null,
      preferredLanguage: row.preferred_language ?? null,
      activityScore: row.activity_score ?? null,
      paymentsCount: row.payments_count ?? null,
      interactionsCount: row.interactions_count ?? null,
      lastActiveAt: row.last_active_at ?? null,
      dateEntree: row.date_entree ?? null,
      dateSortie: row.date_sortie ?? null,
      updatedAt: row.updated_at ?? null,
      currentRoomId: row.current_room_id ?? null,
      statut: row.statut ?? 'ACTIF',
    }));
  }
  const fallback = await db.getAllAsync<LocalRoomRow>(
    "SELECT * FROM rooms WHERE TRIM(nom_prenom) <> '' OR TRIM(numero_whatsapp) <> '' ORDER BY numero_chambre"
  );
  return fallback.map(roomRowToApiResident).filter((resident): resident is ApiResident => resident !== null);
}

async function localCreateResident(payload: CreateResidentPayload): Promise<ApiResident> {
  const db = await getLocalDb();
  const externalId = createExternalId('resident');
  const updatedAt = nowIso();
  await db.runAsync(
    `INSERT INTO residents (
      external_id, cni, nom, prenom, genre, date_naissance, telephone, whatsapp, whatsapp_parents,
      email, ecole, filiere, niveau, niveau_etude, filiere_etude, contact_urgence_nom,
      contact_urgence_telephone, nom_pere, nom_mere, date_entree, statut, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      externalId,
      payload.cni ?? null,
      payload.nom,
      payload.prenom,
      payload.genre ?? null,
      payload.dateNaissance ?? null,
      payload.telephone ?? null,
      payload.whatsapp ?? null,
      payload.whatsappParents ?? null,
      payload.email ?? null,
      payload.ecole ?? null,
      payload.filiere ?? null,
      payload.niveau ?? null,
      payload.niveauEtude ?? null,
      payload.filiereEtude ?? null,
      payload.contactUrgenceNom ?? null,
      payload.contactUrgenceTelephone ?? null,
      payload.nomPere ?? null,
      payload.nomMere ?? null,
      payload.dateEntree ?? null,
      'ACTIF',
      updatedAt,
    ]
  );
  const row = await db.getFirstAsync<LocalResidentRow>('SELECT * FROM residents WHERE external_id = ?', [externalId]);
  if (!row) throw new Error('Resident creation failed');
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    cni: row.cni ?? null,
    nom: row.nom,
    prenom: row.prenom,
    genre: row.genre ?? null,
    dateNaissance: row.date_naissance ?? null,
    whatsapp: row.whatsapp ?? null,
    telephone: row.telephone ?? null,
    email: row.email ?? null,
    currentRoomId: row.current_room_id ?? null,
    statut: row.statut ?? 'ACTIF',
  };
}

async function localListPaymentsByInvoice(invoiceId: number): Promise<ApiPayment[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{
    id: number;
    external_id?: string | null;
    facture_id: number;
    montant_paye: number;
    method?: string | null;
    status?: string | null;
    transaction_ref?: string | null;
    observation?: string | null;
    date_paiement: string;
  }>(
    `SELECT id, external_id, facture_id, montant_paye, method, status, transaction_ref, observation, date_paiement
     FROM payments
     WHERE facture_id = ?
     ORDER BY date_paiement DESC, id DESC`,
    [invoiceId],
  );
  return rows.map((row) => ({
    id: row.id,
    externalId: row.external_id ?? undefined,
    invoiceId: row.facture_id,
    amount: row.montant_paye,
    method: row.method ?? 'MANUAL',
    status: row.status ?? 'COMPLETED',
    transactionRef: row.transaction_ref ?? null,
    observation: row.observation ?? null,
    paidAt: row.date_paiement,
  }));
}

async function localGetContractById(contractId: number): Promise<ApiContract> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{
    id: number;
    external_id?: string | null;
    room_id?: number | null;
    resident_id?: number | null;
    status: string;
    signing_mode: string;
    start_date?: string | null;
    end_date?: string | null;
    monthly_rent?: number | null;
    deposit?: number | null;
    auto_renewal?: number | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    validated_at?: string | null;
    numero_chambre?: string | null;
    resident_nom?: string | null;
    resident_prenom?: string | null;
  }>(
    `SELECT c.*, r.numero_chambre, rs.nom AS resident_nom, rs.prenom AS resident_prenom
     FROM contracts c
     LEFT JOIN rooms r ON r.id = c.room_id
     LEFT JOIN residents rs ON rs.id = c.resident_id
     WHERE c.id = ?`,
    [contractId],
  );
  if (!row) {
    throw new Error('Contract not found');
  }
  const signatures = await db.getAllAsync<{
    signed_by: string;
    signed_at: string;
    signature_type: string;
  }>(
    `SELECT signed_by, signed_at, signature_type
     FROM contract_signatures
     WHERE contract_id = ?
     ORDER BY id ASC`,
    [contractId],
  );
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    roomNumero: row.numero_chambre ?? '',
    residentId: row.resident_id ?? null,
    residentName: [row.resident_nom ?? '', row.resident_prenom ?? ''].join(' ').trim(),
    status: row.status,
    signingMode: row.signing_mode,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    monthlyRent: row.monthly_rent ?? 0,
    deposit: row.deposit ?? 0,
    autoRenewal: (row.auto_renewal ?? 0) === 1,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    validatedAt: row.validated_at ?? null,
    signatures: signatures.map((signature) => ({
      signedBy: signature.signed_by,
      signedAt: signature.signed_at,
      signatureType: signature.signature_type,
    })),
  };
}

async function localListContracts(): Promise<ApiContract[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM contracts ORDER BY updated_at DESC, id DESC');
  const contracts: ApiContract[] = [];
  for (const row of rows) {
    contracts.push(await localGetContractById(row.id));
  }
  return contracts;
}

async function localUpsertContract(payload: {
  roomNumero: string;
  residentExternalId?: string | null;
  status: string;
  signingMode: string;
  startDate?: string | null;
  endDate?: string | null;
  monthlyRent: number;
  deposit: number;
  autoRenewal: boolean;
  notes?: string | null;
  externalId?: string | null;
}): Promise<ApiContract> {
  const db = await getLocalDb();
  const room = await db.getFirstAsync<{ id: number; numero_chambre: string }>(
    'SELECT id, numero_chambre FROM rooms WHERE numero_chambre = ?',
    [payload.roomNumero],
  );
  if (!room) {
    throw new Error('Room not found');
  }
  const resident = payload.residentExternalId
    ? await db.getFirstAsync<{ id: number }>('SELECT id FROM residents WHERE external_id = ?', [payload.residentExternalId])
    : null;
  const existing = payload.externalId
    ? await db.getFirstAsync<{ id: number }>('SELECT id FROM contracts WHERE external_id = ?', [payload.externalId])
    : await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM contracts WHERE room_id = ? ORDER BY id DESC LIMIT 1',
        [room.id],
      );
  const externalId = payload.externalId ?? createExternalId('contract');
  if (existing) {
    await db.runAsync(
      `UPDATE contracts
       SET room_id = ?, resident_id = ?, status = ?, signing_mode = ?, start_date = ?, end_date = ?,
           monthly_rent = ?, deposit = ?, auto_renewal = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        room.id,
        resident?.id ?? null,
        payload.status,
        payload.signingMode,
        payload.startDate ?? null,
        payload.endDate ?? null,
        payload.monthlyRent,
        payload.deposit,
        payload.autoRenewal ? 1 : 0,
        payload.notes ?? null,
        nowIso(),
        existing.id,
      ],
    );
    return localGetContractById(existing.id);
  }
  await db.runAsync(
    `INSERT INTO contracts (
      external_id, room_id, resident_id, status, signing_mode, start_date, end_date,
      monthly_rent, deposit, auto_renewal, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      externalId,
      room.id,
      resident?.id ?? null,
      payload.status,
      payload.signingMode,
      payload.startDate ?? null,
      payload.endDate ?? null,
      payload.monthlyRent,
      payload.deposit,
      payload.autoRenewal ? 1 : 0,
      payload.notes ?? null,
      nowIso(),
      nowIso(),
    ],
  );
  const created = await db.getFirstAsync<{ id: number }>('SELECT id FROM contracts WHERE external_id = ?', [externalId]);
  if (!created) {
    throw new Error('Contract save failed');
  }
  return localGetContractById(created.id);
}

async function localSignContract(contractId: number, signedBy: string, signatureType: string): Promise<ApiContract> {
  const db = await getLocalDb();
  await db.runAsync(
    `INSERT INTO contract_signatures (contract_id, signed_by, signed_at, signature_type)
     VALUES (?, ?, ?, ?)`,
    [contractId, signedBy, nowIso(), signatureType],
  );
  await db.runAsync(
    'UPDATE contracts SET updated_at = ? WHERE id = ?',
    [nowIso(), contractId],
  );
  return localGetContractById(contractId);
}

async function localValidateContract(contractId: number): Promise<ApiContract> {
  const db = await getLocalDb();
  await db.runAsync(
    `UPDATE contracts
     SET status = 'ACTIF', validated_at = ?, updated_at = ?
     WHERE id = ?`,
    [nowIso(), nowIso(), contractId],
  );
  return localGetContractById(contractId);
}

async function localRenewContract(contractId: number): Promise<ApiContract> {
  const db = await getLocalDb();
  const current = await localGetContractById(contractId);
  const baseDate = current.endDate ? new Date(current.endDate) : new Date();
  const nextEnd = new Date(baseDate);
  nextEnd.setMonth(nextEnd.getMonth() + 12);
  const nextEndIso = nextEnd.toISOString().slice(0, 10);
  await db.runAsync(
    `UPDATE contracts
     SET status = 'A_RENOUVELER', end_date = ?, updated_at = ?
     WHERE id = ?`,
    [nextEndIso, nowIso(), contractId],
  );
  return localGetContractById(contractId);
}

function normalizeIdentityValue(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function extractIdentityFieldsFallback(input: {
  documentType: string;
  frontImageBase64: string;
  backImageBase64?: string | null;
}): ApiOcrIdentityResponse {
  const text = normalizeIdentityValue(`${input.frontImageBase64}\n${input.backImageBase64 ?? ''}`);
  const fields: Record<string, string> = {};

  const patterns: Array<[string, RegExp[]]> = [
    ['nom', [/nom[:\s-]+([A-ZÀ-ÖØ-Þ' -]{2,})/i, /surname[:\s-]+([A-ZÀ-ÖØ-Þ' -]{2,})/i]],
    ['prenom', [/pr[eé]nom[s]?[:\s-]+([A-ZÀ-ÖØ-Þa-zà-öø-ÿ' -]{2,})/i, /given name[s]?[:\s-]+([A-ZÀ-ÖØ-Þa-zà-öø-ÿ' -]{2,})/i, /first name[s]?[:\s-]+([A-ZÀ-ÖØ-Þa-zà-öø-ÿ' -]{2,})/i]],
    ['cni', [/(?:cni|n[°o]|num[eé]ro (?:de )?(?:carte|document)|document number|passport no)[:\s-]*([A-Z0-9-]{5,})/i]],
    ['dateNaissance', [/(?:date de naissance|date naissance|birth date|n[eé] le)[:\s-]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i]],
    ['telephone', [/(?:tel|t[eé]l[eé]phone|phone|mobile|whatsapp)[:\s-]*(\+?[0-9][0-9\s-]{6,})/i]],
    ['email', [/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i]],
  ];

  patterns.forEach(([key, regexes]) => {
    for (const regex of regexes) {
      const match = regex.exec(text);
      if (match?.[1]) {
        fields[key] = normalizeIdentityValue(match[1]);
        break;
      }
    }
  });

  return {
    status: Object.keys(fields).length > 0 ? 'FALLBACK_PARSED' : 'UNPARSED',
    requiresReview: true,
    fields,
  };
}

async function localPatchResident(
  id: number,
  payload: {
    nom?: string;
    prenom?: string;
    whatsapp?: string | null;
    telephone?: string | null;
    preferredLanguage?: string | null;
    dateSortie?: string | null;
    statut?: string | null;
    currentRoomId?: number | null;
  },
): Promise<ApiResident> {
  const db = await getLocalDb();
  const resident = await db.getFirstAsync<LocalResidentRow>('SELECT * FROM residents WHERE id = ?', [id]);
  if (!resident) {
    const room = await db.getFirstAsync<LocalRoomRow>('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!room) {
      throw new Error('Resident not found');
    }
    const { nom, prenom } = splitResidentName(room.nom_prenom);
    const nextNom = payload.nom ?? nom;
    const nextPrenom = payload.prenom ?? prenom;
    const phone = payload.whatsapp ?? payload.telephone ?? room.numero_whatsapp;
    await db.runAsync(
      'UPDATE rooms SET nom_prenom = ?, numero_whatsapp = ?, updated_at = ? WHERE id = ?',
      [`${nextNom} ${nextPrenom}`.trim(), phone ?? '', nowIso(), id]
    );
    return {
      id,
      nom: nextNom,
      prenom: nextPrenom,
      whatsapp: phone ?? null,
      telephone: phone ?? null,
      currentRoomId: payload.currentRoomId === undefined ? id : payload.currentRoomId,
      statut: payload.statut ?? (room.actif === 1 ? 'ACTIF' : 'INACTIF'),
      preferredLanguage: payload.preferredLanguage ?? null,
      dateSortie: payload.dateSortie ?? null,
    };
  }

  const nextNom = payload.nom ?? resident.nom;
  const nextPrenom = payload.prenom ?? resident.prenom;
  const phone = payload.whatsapp ?? payload.telephone ?? resident.whatsapp ?? resident.telephone ?? null;

  await db.runAsync(
    'UPDATE residents SET nom = ?, prenom = ?, whatsapp = ?, telephone = ?, preferred_language = ?, date_sortie = ?, statut = ?, current_room_id = ?, updated_at = ? WHERE id = ?',
    [nextNom, nextPrenom, phone, phone, payload.preferredLanguage ?? resident.preferred_language ?? null, payload.dateSortie ?? resident.date_sortie ?? null, payload.statut ?? resident.statut ?? 'ACTIF', payload.currentRoomId === undefined ? resident.current_room_id ?? null : payload.currentRoomId, nowIso(), id]
  );

  return {
    id,
    externalId: resident.external_id ?? undefined,
    nom: nextNom,
    prenom: nextPrenom,
    whatsapp: phone,
    telephone: phone,
    preferredLanguage: payload.preferredLanguage ?? resident.preferred_language ?? null,
    dateSortie: payload.dateSortie ?? resident.date_sortie ?? null,
    currentRoomId: payload.currentRoomId === undefined ? resident.current_room_id ?? null : payload.currentRoomId,
    statut: payload.statut ?? resident.statut ?? 'ACTIF',
  };
}

async function localAssignResidentRoom(
  residentId: number,
  roomId: number,
  _dateDebut: string,
  _motif?: string,
): Promise<ApiResident> {
  const db = await getLocalDb();
  const room = await db.getFirstAsync<LocalRoomRow>('SELECT * FROM rooms WHERE id = ?', [roomId]);
  if (!room) throw new Error('Room not found');
  const resident = await db.getFirstAsync<LocalResidentRow>('SELECT * FROM residents WHERE id = ?', [residentId]);
  if (!resident) {
    throw new Error('Resident not found');
  }

  await db.runAsync(
    'UPDATE residents SET current_room_id = ?, updated_at = ? WHERE id = ?',
    [roomId, nowIso(), residentId]
  );
  await db.runAsync(
    'UPDATE rooms SET nom_prenom = ?, numero_whatsapp = ?, updated_at = ? WHERE id = ?',
    [`${resident.nom} ${resident.prenom}`.trim(), resident.whatsapp ?? resident.telephone ?? '', nowIso(), roomId]
  );

  return {
    id: resident.id,
    externalId: resident.external_id ?? undefined,
    nom: resident.nom,
    prenom: resident.prenom,
    whatsapp: resident.whatsapp ?? null,
    telephone: resident.telephone ?? null,
    currentRoomId: roomId,
    statut: resident.statut ?? (room.actif === 1 ? 'ACTIF' : 'INACTIF'),
  };
}

async function localGetMonthConfig(mois: string): Promise<ApiMonthConfig | null> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<LocalMonthConfigRow>('SELECT * FROM month_config WHERE mois = ?', [mois]);
  return row ? monthConfigRowToApi(row) : null;
}

async function localUpsertMonthConfig(
  mois: string,
  payload: {
    puEau: number;
    puElectricite: number;
    tva: number;
    lcEau: number;
    lcElectricite: number;
    surplusEauTotal: number;
    surplusElecTotal: number;
    internetFee?: number;
    commonChargesPercent?: number;
    penaltyMissingIndex?: number;
    indexWindowStartDay?: number | null;
    indexWindowEndDay?: number | null;
    exportsValidatedByConcierge?: boolean;
    exportsValidatedAt?: string | null;
    exportsValidatedBy?: string | null;
    amendeEauMontant: number;
    minimumFacture: number;
    delaiPaiement: string;
  },
): Promise<ApiMonthConfig> {
  const db = await getLocalDb();
  await db.runAsync(
    `INSERT INTO month_config (
      mois, pu_eau, pu_electricite, tva, lc_eau, lc_electricite, surplus_eau_total, surplus_elec_total,
      amende_eau_montant, minimum_facture, internet_fee, common_charges_percent, penalty_missing_index,
      index_window_start_day, index_window_end_day, exports_validated_by_concierge, exports_validated_at,
      exports_validated_by, delai_paiement, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mois) DO UPDATE SET
      pu_eau = excluded.pu_eau,
      pu_electricite = excluded.pu_electricite,
      tva = excluded.tva,
      lc_eau = excluded.lc_eau,
      lc_electricite = excluded.lc_electricite,
      surplus_eau_total = excluded.surplus_eau_total,
      surplus_elec_total = excluded.surplus_elec_total,
      amende_eau_montant = excluded.amende_eau_montant,
      minimum_facture = excluded.minimum_facture,
      internet_fee = excluded.internet_fee,
      common_charges_percent = excluded.common_charges_percent,
      penalty_missing_index = excluded.penalty_missing_index,
      index_window_start_day = excluded.index_window_start_day,
      index_window_end_day = excluded.index_window_end_day,
      exports_validated_by_concierge = excluded.exports_validated_by_concierge,
      exports_validated_at = excluded.exports_validated_at,
      exports_validated_by = excluded.exports_validated_by,
      delai_paiement = excluded.delai_paiement,
      updated_at = excluded.updated_at`,
    [
      mois,
      payload.puEau,
      payload.puElectricite,
      payload.tva,
      payload.lcEau,
      payload.lcElectricite,
      payload.surplusEauTotal,
      payload.surplusElecTotal,
      payload.amendeEauMontant,
      payload.minimumFacture,
      payload.internetFee ?? 0,
      payload.commonChargesPercent ?? 0,
      payload.penaltyMissingIndex ?? 0,
      payload.indexWindowStartDay ?? 25,
      payload.indexWindowEndDay ?? 30,
      payload.exportsValidatedByConcierge ? 1 : 0,
      payload.exportsValidatedAt ?? null,
      payload.exportsValidatedBy ?? null,
      payload.delaiPaiement,
      nowIso(),
    ]
  );
  const config = await localGetMonthConfig(mois);
  if (!config) throw new Error('Month config save failed');
  return config;
}

async function localListIndexReadings(mois: string): Promise<ApiIndexReading[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<LocalIndexReadingRow>(
    `SELECT ir.*, r.numero_chambre
     FROM index_readings ir
     JOIN rooms r ON r.id = ir.chambre_id
     WHERE ir.mois = ?
     ORDER BY r.numero_chambre`,
    [mois]
  );
  return rows.map(indexRowToApi);
}

async function localUpsertIndexReading(payload: {
  roomId: number;
  mois: string;
  anEau: number;
  niEau: number;
  anElec: number;
  niElec: number;
  statutPresence: 'PRESENT' | 'ABSENT';
  amendeEau: boolean;
  saisiPar: string;
}): Promise<ApiIndexReading> {
  const db = await getLocalDb();
  const config = await localGetMonthConfig(payload.mois);
  const today = new Date().getDate();
  const windowStart = config?.indexWindowStartDay ?? 25;
  const windowEnd = config?.indexWindowEndDay ?? 30;
  const lateSubmission = today < windowStart || today > windowEnd;
  const externalId = createExternalId('reading');
  await db.runAsync(
    `INSERT INTO index_readings (
      chambre_id, mois, ancien_index_eau, nouvel_index_eau, ancien_index_elec, nouvel_index_elec,
      statut_presence, amende_eau, late_submission, saisi_par, external_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chambre_id, mois) DO UPDATE SET
      ancien_index_eau = excluded.ancien_index_eau,
      nouvel_index_eau = excluded.nouvel_index_eau,
      ancien_index_elec = excluded.ancien_index_elec,
      nouvel_index_elec = excluded.nouvel_index_elec,
      statut_presence = excluded.statut_presence,
      amende_eau = excluded.amende_eau,
      late_submission = excluded.late_submission,
      saisi_par = excluded.saisi_par,
      date_saisie = datetime('now'),
      updated_at = excluded.updated_at`,
    [
      payload.roomId,
      payload.mois,
      payload.anEau,
      payload.niEau,
      payload.anElec,
      payload.niElec,
      payload.statutPresence,
      payload.amendeEau ? 1 : 0,
      lateSubmission ? 1 : 0,
      payload.saisiPar,
      externalId,
      nowIso(),
    ]
  );

  const row = await db.getFirstAsync<LocalIndexReadingRow>(
    `SELECT ir.*, r.numero_chambre
     FROM index_readings ir
     JOIN rooms r ON r.id = ir.chambre_id
     WHERE ir.chambre_id = ? AND ir.mois = ?`,
    [payload.roomId, payload.mois]
  );
  if (!row) throw new Error('Index save failed');
  return indexRowToApi(row);
}

async function localCancelIndexPenalty(readingId: number): Promise<ApiIndexReading> {
  const db = await getLocalDb();
  await db.runAsync(
    `UPDATE index_readings
     SET late_submission = 0, amende_eau = 0, updated_at = ?
     WHERE id = ?`,
    [nowIso(), readingId],
  );
  const row = await db.getFirstAsync<LocalIndexReadingRow>(
    `SELECT ir.*, r.numero_chambre
     FROM index_readings ir
     JOIN rooms r ON r.id = ir.chambre_id
     WHERE ir.id = ?`,
    [readingId],
  );
  if (!row) {
    throw new Error('Index reading not found');
  }
  return indexRowToApi(row);
}

async function localCalculateBilling(mois: string): Promise<BillingCalculationResult> {
  const db = await getLocalDb();
  const result = await calculateAllInvoices(db, mois);
  return {
    success: result.success,
    count: result.count,
    errors: result.errors.map((error) => ({
      roomId: error.chambre_id,
      roomNumber: error.numero_chambre,
      message: error.message,
    })),
  };
}

async function localListInvoices(mois: string): Promise<ApiInvoice[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<LocalInvoiceRow>(
    `SELECT i.*, r.numero_chambre, r.nom_prenom, mc.delai_paiement
     FROM invoices i
     JOIN rooms r ON r.id = i.chambre_id
     LEFT JOIN month_config mc ON mc.mois = i.mois
     WHERE i.mois = ?
     ORDER BY r.numero_chambre`,
    [mois]
  );
  return rows.map(invoiceRowToApi);
}

async function localGetInvoiceById(invoiceId: number): Promise<ApiInvoice> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<LocalInvoiceRow>(
    `SELECT i.*, r.numero_chambre, r.nom_prenom, mc.delai_paiement
     FROM invoices i
     JOIN rooms r ON r.id = i.chambre_id
     LEFT JOIN month_config mc ON mc.mois = i.mois
     WHERE i.id = ?`,
    [invoiceId]
  );
  if (!row) throw new Error('Invoice not found');
  return invoiceRowToApi(row);
}

async function localUpdateInvoiceDebt(invoiceId: number, dette: number | null): Promise<ApiInvoice> {
  const db = await getLocalDb();
  const current = await db.getFirstAsync<{
    montant_ttc_eau: number;
    montant_ttc_elec: number;
    internet_fee?: number | null;
    common_charges?: number | null;
    penalty_missing_index?: number | null;
    loyer?: number | null;
  }>(
    'SELECT montant_ttc_eau, montant_ttc_elec, internet_fee, common_charges, penalty_missing_index, loyer FROM invoices WHERE id = ?',
    [invoiceId]
  );
  if (!current) throw new Error('Invoice not found');
  const totalFacture =
    current.montant_ttc_eau +
    current.montant_ttc_elec +
    (current.internet_fee ?? 0) +
    (current.common_charges ?? 0) +
    (current.penalty_missing_index ?? 0) +
    (current.loyer ?? 0);
  const netAPayer = totalFacture + (dette ?? 0);
  await db.runAsync(
    'UPDATE invoices SET dette = ?, net_a_payer = ?, updated_at = ? WHERE id = ?',
    [dette, netAPayer, nowIso(), invoiceId]
  );
  return localGetInvoiceById(invoiceId);
}

async function localUpdateInvoiceSendStatus(
  invoiceId: number,
  statutEnvoi: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR',
): Promise<ApiInvoice> {
  const db = await getLocalDb();
  await db.runAsync(
    'UPDATE invoices SET statut_envoi = ?, date_envoi = ?, updated_at = ? WHERE id = ?',
    [statutEnvoi, statutEnvoi === 'ENVOYE' ? new Date().toISOString() : null, nowIso(), invoiceId]
  );
  return localGetInvoiceById(invoiceId);
}

async function localListExitReports(): Promise<ApiExitReport[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<LocalExitReportRow>(
    `SELECT er.*, r.numero_chambre AS room_numero, rs.nom AS resident_nom, rs.prenom AS resident_prenom
     FROM exit_reports er
     LEFT JOIN rooms r ON r.id = er.room_id
     LEFT JOIN residents rs ON rs.id = er.resident_id
     ORDER BY er.id DESC`
  );
  return rows.map(exitReportRowToApi);
}

async function localGetExitReportById(reportId: number): Promise<ApiExitReport> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<LocalExitReportRow>(
    `SELECT er.*, r.numero_chambre AS room_numero, rs.nom AS resident_nom, rs.prenom AS resident_prenom
     FROM exit_reports er
     LEFT JOIN rooms r ON r.id = er.room_id
     LEFT JOIN residents rs ON rs.id = er.resident_id
     WHERE er.id = ?`,
    [reportId],
  );
  if (!row) {
    throw new Error('Exit report not found');
  }
  return exitReportRowToApi(row);
}

async function localUpsertExitReport(payload: {
  roomId: number | null;
  residentId?: number | null;
  contractId?: number | null;
  depositAmount: number;
  repairCost: number;
  notes?: string | null;
}): Promise<ApiExitReport> {
  const db = await getLocalDb();
  const roomId = payload.roomId ?? null;
  const residentId = payload.residentId ?? null;
  const contractId = payload.contractId ?? null;
  const invoices = roomId == null
    ? []
    : await db.getAllAsync<{ id: number; net_a_payer: number; penalty_missing_index?: number | null }>(
        'SELECT id, net_a_payer, penalty_missing_index FROM invoices WHERE chambre_id = ?',
        [roomId],
      );
  let debtTotal = 0;
  let sanctionTotal = 0;
  for (const invoice of invoices) {
    const paidRow = await db.getFirstAsync<{ total: number | null }>(
      'SELECT SUM(montant_paye) AS total FROM payments WHERE facture_id = ?',
      [invoice.id],
    );
    const paid = paidRow?.total ?? 0;
    const outstanding = Math.max(0, (invoice.net_a_payer ?? 0) - paid);
    debtTotal += outstanding;
    const penalty = invoice.penalty_missing_index ?? 0;
    if (outstanding > 0 && penalty > 0) {
      sanctionTotal += Math.min(outstanding, penalty);
    }
  }
  const commonChargesAmount = roundTwo((payload.depositAmount || 0) * 0.25);
  const deductions = roundTwo(debtTotal + (payload.repairCost || 0) + commonChargesAmount);
  const refundAmount = roundTwo(Math.max(0, (payload.depositAmount || 0) - deductions));
  const depositUsed = roundTwo(Math.min(payload.depositAmount || 0, deductions));
  const existing = contractId != null
    ? await db.getFirstAsync<{ id: number }>('SELECT id FROM exit_reports WHERE contract_id = ?', [contractId])
    : roomId != null
      ? await db.getFirstAsync<{ id: number }>('SELECT id FROM exit_reports WHERE room_id = ? ORDER BY id DESC LIMIT 1', [roomId])
      : null;
  const externalId = existing ? undefined : createExternalId('exit-report');
  if (existing) {
    await db.runAsync(
      `UPDATE exit_reports
       SET resident_id = ?, room_id = ?, contract_id = ?, deposit_amount = ?, debt_total = ?, sanction_total = ?,
           repair_cost = ?, common_charges_amount = ?, deposit_used = ?, balance = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        residentId,
        roomId,
        contractId,
        roundTwo(payload.depositAmount || 0),
        roundTwo(debtTotal),
        roundTwo(sanctionTotal),
        roundTwo(payload.repairCost || 0),
        commonChargesAmount,
        depositUsed,
        refundAmount,
        payload.notes ?? null,
        nowIso(),
        existing.id,
      ],
    );
    return localGetExitReportById(existing.id);
  }
  await db.runAsync(
    `INSERT INTO exit_reports (
      external_id, resident_id, room_id, contract_id, deposit_amount, debt_total, sanction_total, repair_cost,
      common_charges_amount, deposit_used, balance, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      externalId ?? null,
      residentId,
      roomId,
      contractId,
      roundTwo(payload.depositAmount || 0),
      roundTwo(debtTotal),
      roundTwo(sanctionTotal),
      roundTwo(payload.repairCost || 0),
      commonChargesAmount,
      depositUsed,
      refundAmount,
      'DRAFT',
      payload.notes ?? null,
      nowIso(),
      nowIso(),
    ],
  );
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM exit_reports WHERE external_id = ?', [externalId ?? '']);
  if (!row) {
    throw new Error('Exit report save failed');
  }
  return localGetExitReportById(row.id);
}

async function localSignExitReport(
  reportId: number,
  signedBy: string,
  signatureRole: 'MANAGER' | 'RESIDENT',
): Promise<ApiExitReport> {
  const current = await localGetExitReportById(reportId);
  const managerSignedAt = signatureRole === 'MANAGER' ? nowIso() : current.managerSignedAt;
  const residentSignedAt = signatureRole === 'RESIDENT' ? nowIso() : current.residentSignedAt;
  const status = managerSignedAt && residentSignedAt ? 'SIGNED' : 'PARTIALLY_SIGNED';
  const db = await getLocalDb();
  await db.runAsync(
    `UPDATE exit_reports
     SET manager_signed_at = ?, resident_signed_at = ?, signed_by = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [managerSignedAt, residentSignedAt, signedBy, status, nowIso(), reportId],
  );
  return localGetExitReportById(reportId);
}

async function localGetRecoveryEmail(): Promise<RecoveryEmailPayload> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['recovery_email']
  );
  return { recoveryEmail: row?.value ?? null };
}

async function localSetRecoveryEmail(email: string): Promise<RecoveryEmailPayload> {
  const db = await getLocalDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['recovery_email', email]
  );
  return { recoveryEmail: email };
}

export function setAuthTokens(tokens: BackendAuthTokens | null): void {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;
}

export function getAuthTokens(): BackendAuthTokens | null {
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function login(username: string, password: string): Promise<BackendAuthTokens> {
  const result = await request<{ accessToken: string; refreshToken: string }>(
    '/api/v1/auth/login',
    { method: 'POST', body: { username, password }, skipAuth: true },
  );
  const tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
  setAuthTokens(tokens);
  return tokens;
}

export async function listPendingUsers(): Promise<ApiUserSummary[]> {
  const raws = await request<Record<string, unknown>[]>('/api/v1/auth/users/pending');
  return raws.map((raw) => ({
    id: Number(raw.id),
    username: String(raw.username ?? ''),
    role: String(raw.role ?? ''),
    actif: Boolean(raw.actif),
    createdBy: raw.createdBy == null ? null : String(raw.createdBy),
    status: String(raw.status ?? 'PENDING'),
    createdAt: raw.createdAt == null ? null : String(raw.createdAt),
    validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
    rejectedAt: raw.rejectedAt == null ? null : String(raw.rejectedAt),
  }));
}

export async function approveUserAccount(userId: number): Promise<ApiUserSummary> {
  const raw = await request<Record<string, unknown>>(`/api/v1/auth/users/${userId}/approve`, { method: 'POST' });
  return {
    id: Number(raw.id),
    username: String(raw.username ?? ''),
    role: String(raw.role ?? ''),
    actif: Boolean(raw.actif),
    createdBy: raw.createdBy == null ? null : String(raw.createdBy),
    status: String(raw.status ?? 'ACTIVE'),
    createdAt: raw.createdAt == null ? null : String(raw.createdAt),
    validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
    rejectedAt: raw.rejectedAt == null ? null : String(raw.rejectedAt),
  };
}

export async function rejectUserAccount(userId: number, reason?: string): Promise<ApiUserSummary> {
  const raw = await request<Record<string, unknown>>(`/api/v1/auth/users/${userId}/reject`, {
    method: 'POST',
    body: { reason: reason ?? null },
  });
  return {
    id: Number(raw.id),
    username: String(raw.username ?? ''),
    role: String(raw.role ?? ''),
    actif: Boolean(raw.actif),
    createdBy: raw.createdBy == null ? null : String(raw.createdBy),
    status: String(raw.status ?? 'REJECTED'),
    createdAt: raw.createdAt == null ? null : String(raw.createdAt),
    validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
    rejectedAt: raw.rejectedAt == null ? null : String(raw.rejectedAt),
  };
}

export async function createUserAccount(payload: CreateUserAccountPayload): Promise<ApiUserSummary> {
  const raw = await request<Record<string, unknown>>('/api/v1/auth/users', {
    method: 'POST',
    body: {
      username: payload.username,
      password: payload.password,
      role: payload.role,
      residentExternalId: payload.residentExternalId ?? null,
    },
  });
  return {
    id: Number(raw.id),
    username: String(raw.username ?? ''),
    role: String(raw.role ?? ''),
    actif: Boolean(raw.actif),
    createdBy: raw.createdBy == null ? null : String(raw.createdBy),
    status: String(raw.status ?? 'PENDING'),
    createdAt: raw.createdAt == null ? null : String(raw.createdAt),
    validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
    rejectedAt: raw.rejectedAt == null ? null : String(raw.rejectedAt),
  };
}

export async function recoverPassword(
  username: string,
  recoveryCode: string,
  newPassword: string,
): Promise<void> {
  await request<void>('/api/v1/auth/recover-password', {
    method: 'POST',
    body: { username, recoveryCode, newPassword },
    skipAuth: true,
  });
}

export async function requestRecoveryCode(username: string): Promise<void> {
  await request<void>('/api/v1/auth/recover-password/request-code', {
    method: 'POST',
    body: { username },
    skipAuth: true,
  });
}

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const result = await request<{ accessToken: string }>(
      '/api/v1/auth/refresh',
      { method: 'POST', body: { refreshToken }, skipAuth: true },
    );
    accessToken = result.accessToken;
    return true;
  } catch {
    setAuthTokens(null);
    return false;
  }
}

export async function logoutApi(): Promise<void> {
  if (refreshToken) {
    try {
      await request<void>('/api/v1/auth/logout', {
        method: 'DELETE',
        body: { refreshToken },
        skipAuth: true,
      });
    } catch {
      // Ignore logout network errors.
    }
  }
  setAuthTokens(null);
}

export async function getMe(): Promise<BackendMe> {
  if (isWebRuntime) {
    return request<BackendMe>('/api/v1/auth/me');
  }
  return withOfflineFallback(
    () => request<BackendMe>('/api/v1/auth/me'),
    async () => {
      const db = await getLocalDb();
      const usernameSetting = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        ['auth_username'],
      );
      const roleSetting = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        ['auth_active_role'],
      );
      const username = usernameSetting?.value?.trim() ?? '';
      const role = roleSetting?.value?.trim() ?? 'tenant';
      let residentId: number | null = null;
      if (username) {
        const resident = await db.getFirstAsync<{ id: number }>(
          `SELECT id
           FROM residents
           WHERE lower(trim(nom || '.' || prenom)) = ?
              OR lower(replace(trim(nom || prenom), ' ', '')) = ?
           LIMIT 1`,
          [username.toLowerCase(), username.replace(/\s+/g, '').toLowerCase()],
        );
        residentId = resident?.id ?? null;
      }
      return {
        id: 0,
        username,
        role,
        residentId,
        status: 'OFFLINE',
        consentAt: null,
      };
    },
  );
}

export async function getRecoveryEmail(): Promise<RecoveryEmailPayload> {
  if (isWebRuntime) {
    return browserGetRecoveryEmail();
  }
  return withOfflineFallback(
    () => request<RecoveryEmailPayload>('/api/v1/auth/recovery-email'),
    () => localGetRecoveryEmail(),
  );
}

export async function setRecoveryEmail(email: string): Promise<RecoveryEmailPayload> {
  if (isWebRuntime) {
    return browserSetRecoveryEmail(email);
  }
  return withOfflineFallback(
    () => request<RecoveryEmailPayload>('/api/v1/auth/recovery-email', {
      method: 'POST',
      body: { email },
    }),
    () => localSetRecoveryEmail(email),
  );
}

export async function changePasswordApi(oldPassword: string, newPassword: string): Promise<void> {
  await request<void>('/api/v1/auth/change-password', {
    method: 'POST',
    body: { oldPassword, newPassword },
  });
}

export async function listRooms(actif?: boolean): Promise<ApiRoom[]> {
  if (isDesktopRuntime()) {
    return browserListRooms(actif);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      () => request<ApiRoom[]>(`/api/v1/rooms${typeof actif === 'boolean' ? `?actif=${actif}` : ''}`),
      () => browserListRooms(actif),
    );
  }
  const query = typeof actif === 'boolean' ? `?actif=${actif}` : '';
  return withOfflineFallback(
    () => request<ApiRoom[]>(`/api/v1/rooms${query}`),
    () => localListRooms(actif),
  );
}

export async function createRoom(payload: { numeroChambre: string; bloc?: string | null }): Promise<ApiRoom> {
  if (isDesktopRuntime()) {
    return browserCreateRoom(payload);
  }
  return withOfflineFallback(
    () => request<ApiRoom>('/api/v1/rooms', { method: 'POST', body: payload }),
    () => (isWebRuntime ? browserCreateRoom(payload) : localCreateRoom(payload)),
  );
}

export async function patchRoom(id: number, payload: { numeroChambre?: string; bloc?: string | null; actif?: boolean }): Promise<ApiRoom> {
  if (isDesktopRuntime()) {
    return browserPatchRoom(id, payload);
  }
  return withOfflineFallback(
    () => request<ApiRoom>(`/api/v1/rooms/${id}`, { method: 'PATCH', body: payload }),
    () => (isWebRuntime ? browserPatchRoom(id, payload) : localPatchRoom(id, payload)),
  );
}

export async function listResidents(): Promise<ApiResident[]> {
  if (isDesktopRuntime()) {
    return browserListResidents();
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      () => request<ApiResident[]>('/api/v1/residents'),
      () => browserListResidents(),
    );
  }
  return withOfflineFallback(
    () => request<ApiResident[]>('/api/v1/residents'),
    () => localListResidents(),
  );
}

export async function createResident(payload: CreateResidentPayload): Promise<ApiResident> {
  if (isDesktopRuntime()) {
    return browserCreateResident(payload);
  }
  return withOfflineFallback(
    () => request<ApiResident>('/api/v1/residents', { method: 'POST', body: payload }),
    () => (isWebRuntime ? browserCreateResident(payload) : localCreateResident(payload)),
  );
}

export async function patchResident(id: number, payload: {
  nom?: string;
  prenom?: string;
  whatsapp?: string | null;
  telephone?: string | null;
  preferredLanguage?: string | null;
  dateSortie?: string | null;
  statut?: string | null;
  currentRoomId?: number | null;
}): Promise<ApiResident> {
  if (isDesktopRuntime()) {
    return browserPatchResident(id, payload);
  }
  return withOfflineFallback(
    () => request<ApiResident>(`/api/v1/residents/${id}`, { method: 'PATCH', body: payload }),
    () => (isWebRuntime ? browserPatchResident(id, payload) : localPatchResident(id, payload)),
  );
}

export async function assignResidentRoom(residentId: number, roomId: number, dateDebut: string, motif?: string): Promise<ApiResident> {
  if (isDesktopRuntime()) {
    return browserAssignResidentRoom(residentId, roomId, dateDebut, motif);
  }
  return withOfflineFallback(
    () => request<ApiResident>(`/api/v1/residents/${residentId}/assign-room`, {
      method: 'POST',
      body: { roomId, dateDebut, motif: motif ?? 'AFFECTATION_MOBILE' },
    }),
    () => (isWebRuntime ? browserAssignResidentRoom(residentId, roomId, dateDebut, motif) : localAssignResidentRoom(residentId, roomId, dateDebut, motif)),
  );
}

export async function getMonthConfig(mois: string): Promise<ApiMonthConfig | null> {
  if (isDesktopRuntime()) {
    return browserGetMonthConfig(mois);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      async () => {
        try {
          const raw = await request<Record<string, unknown>>(`/api/v1/meter/month-config/${mois}`);
          return {
            id: Number(raw.id),
            mois: String(raw.mois),
            puEau: parseNumber(raw.puEau),
            puElectricite: parseNumber(raw.puElectricite),
            tva: parseNumber(raw.tva),
            lcEau: parseNumber(raw.lcEau),
            lcElectricite: parseNumber(raw.lcElectricite),
            surplusEauTotal: parseNumber(raw.surplusEauTotal),
            surplusElecTotal: parseNumber(raw.surplusElecTotal),
            internetFee: parseNumber(raw.internetFee),
            commonChargesPercent: parseNumber(raw.commonChargesPercent),
            penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
            indexWindowStartDay: raw.indexWindowStartDay == null ? null : Number(raw.indexWindowStartDay),
            indexWindowEndDay: raw.indexWindowEndDay == null ? null : Number(raw.indexWindowEndDay),
            exportsValidatedByConcierge: Boolean(raw.exportsValidatedByConcierge),
            exportsValidatedAt: raw.exportsValidatedAt == null ? null : String(raw.exportsValidatedAt),
            exportsValidatedBy: raw.exportsValidatedBy == null ? null : String(raw.exportsValidatedBy),
            amendeEauMontant: parseNumber(raw.amendeEauMontant),
            minimumFacture: parseNumber(raw.minimumFacture),
            delaiPaiement: String(raw.delaiPaiement),
            createdAt: String(raw.createdAt),
            updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
          };
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            return null;
          }
          throw error;
        }
      },
      () => browserGetMonthConfig(mois),
    );
  }
  return withOfflineFallback(
    async () => {
      try {
        const raw = await request<Record<string, unknown>>(`/api/v1/meter/month-config/${mois}`);
        return {
          id: Number(raw.id),
          mois: String(raw.mois),
          puEau: parseNumber(raw.puEau),
          puElectricite: parseNumber(raw.puElectricite),
          tva: parseNumber(raw.tva),
          lcEau: parseNumber(raw.lcEau),
          lcElectricite: parseNumber(raw.lcElectricite),
          surplusEauTotal: parseNumber(raw.surplusEauTotal),
          surplusElecTotal: parseNumber(raw.surplusElecTotal),
          internetFee: parseNumber(raw.internetFee),
          commonChargesPercent: parseNumber(raw.commonChargesPercent),
          penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
          indexWindowStartDay: raw.indexWindowStartDay == null ? null : Number(raw.indexWindowStartDay),
          indexWindowEndDay: raw.indexWindowEndDay == null ? null : Number(raw.indexWindowEndDay),
          exportsValidatedByConcierge: Boolean(raw.exportsValidatedByConcierge),
          exportsValidatedAt: raw.exportsValidatedAt == null ? null : String(raw.exportsValidatedAt),
          exportsValidatedBy: raw.exportsValidatedBy == null ? null : String(raw.exportsValidatedBy),
          amendeEauMontant: parseNumber(raw.amendeEauMontant),
          minimumFacture: parseNumber(raw.minimumFacture),
          delaiPaiement: String(raw.delaiPaiement),
          createdAt: String(raw.createdAt),
          updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    () => localGetMonthConfig(mois),
  );
}

export async function upsertMonthConfig(mois: string, payload: {
  puEau: number;
  puElectricite: number;
  tva: number;
  lcEau: number;
  lcElectricite: number;
  surplusEauTotal: number;
  surplusElecTotal: number;
  internetFee?: number;
  commonChargesPercent?: number;
  penaltyMissingIndex?: number;
  indexWindowStartDay?: number | null;
  indexWindowEndDay?: number | null;
  exportsValidatedByConcierge?: boolean;
  exportsValidatedAt?: string | null;
  exportsValidatedBy?: string | null;
  amendeEauMontant: number;
  minimumFacture: number;
  delaiPaiement: string;
}): Promise<ApiMonthConfig> {
  if (isDesktopRuntime()) {
    return browserUpsertMonthConfig(mois, payload);
  }
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/meter/month-config/${mois}`, {
        method: 'PUT',
        body: payload,
      });
      return {
        id: Number(raw.id),
        mois: String(raw.mois),
        puEau: parseNumber(raw.puEau),
        puElectricite: parseNumber(raw.puElectricite),
        tva: parseNumber(raw.tva),
        lcEau: parseNumber(raw.lcEau),
        lcElectricite: parseNumber(raw.lcElectricite),
        surplusEauTotal: parseNumber(raw.surplusEauTotal),
        surplusElecTotal: parseNumber(raw.surplusElecTotal),
        internetFee: parseNumber(raw.internetFee),
        commonChargesPercent: parseNumber(raw.commonChargesPercent),
        penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
        indexWindowStartDay: raw.indexWindowStartDay == null ? null : Number(raw.indexWindowStartDay),
        indexWindowEndDay: raw.indexWindowEndDay == null ? null : Number(raw.indexWindowEndDay),
        exportsValidatedByConcierge: Boolean(raw.exportsValidatedByConcierge),
        exportsValidatedAt: raw.exportsValidatedAt == null ? null : String(raw.exportsValidatedAt),
        exportsValidatedBy: raw.exportsValidatedBy == null ? null : String(raw.exportsValidatedBy),
        amendeEauMontant: parseNumber(raw.amendeEauMontant),
        minimumFacture: parseNumber(raw.minimumFacture),
        delaiPaiement: String(raw.delaiPaiement),
        createdAt: String(raw.createdAt),
        updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
      };
    },
    () => (isWebRuntime ? browserUpsertMonthConfig(mois, payload) : localUpsertMonthConfig(mois, payload)),
  );
}

export async function listIndexReadings(mois: string): Promise<ApiIndexReading[]> {
  if (isDesktopRuntime()) {
    return browserListIndexReadings(mois);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      async () => {
        const raws = await request<Record<string, unknown>[]>(`/api/v1/meter/index-readings?mois=${encodeURIComponent(mois)}`);
        return raws.map((raw) => ({
          id: Number(raw.id),
          externalId: raw.externalId == null ? undefined : String(raw.externalId),
          roomId: Number(raw.roomId),
          roomNumber: String(raw.roomNumber),
          mois: String(raw.mois),
          anEau: parseNumber(raw.anEau),
          niEau: parseNumber(raw.niEau),
          anElec: parseNumber(raw.anElec),
          niElec: parseNumber(raw.niElec),
          statutPresence: String(raw.statutPresence) === 'ABSENT' ? 'ABSENT' : 'PRESENT',
          amendeEau: Boolean(raw.amendeEau),
          saisiPar: String(raw.saisiPar ?? ''),
          saisiLe: String(raw.saisiLe ?? ''),
          updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
        }));
      },
      async () => {
        const rows = await browserListIndexReadings(mois);
        return rows.map((row) => ({
          ...row,
          externalId: row.externalId,
          updatedAt: row.updatedAt,
        }));
      },
    );
  }
  return withOfflineFallback(
    async () => {
      const raws = await request<Record<string, unknown>[]>(`/api/v1/meter/index-readings?mois=${encodeURIComponent(mois)}`);
      return raws.map((raw) => ({
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomId: Number(raw.roomId),
        roomNumber: String(raw.roomNumber),
        mois: String(raw.mois),
        anEau: parseNumber(raw.anEau),
        niEau: parseNumber(raw.niEau),
        anElec: parseNumber(raw.anElec),
        niElec: parseNumber(raw.niElec),
        statutPresence: String(raw.statutPresence) === 'ABSENT' ? 'ABSENT' : 'PRESENT',
        amendeEau: Boolean(raw.amendeEau),
        lateSubmission: Boolean(raw.lateSubmission),
        saisiPar: String(raw.saisiPar ?? ''),
        saisiLe: String(raw.saisiLe ?? ''),
        updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
      }));
    },
    () => localListIndexReadings(mois),
  );
}

export async function upsertIndexReading(payload: {
  roomId: number;
  mois: string;
  anEau: number;
  niEau: number;
  anElec: number;
  niElec: number;
  statutPresence: 'PRESENT' | 'ABSENT';
  amendeEau: boolean;
  saisiPar: string;
}): Promise<ApiIndexReading> {
  if (isDesktopRuntime()) {
    return browserUpsertIndexReading(payload);
  }
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>('/api/v1/meter/index-readings', {
        method: 'POST',
        body: payload,
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomId: Number(raw.roomId),
        roomNumber: String(raw.roomNumber),
        mois: String(raw.mois),
        anEau: parseNumber(raw.anEau),
        niEau: parseNumber(raw.niEau),
        anElec: parseNumber(raw.anElec),
        niElec: parseNumber(raw.niElec),
        statutPresence: String(raw.statutPresence) === 'ABSENT' ? 'ABSENT' : 'PRESENT',
        amendeEau: Boolean(raw.amendeEau),
        lateSubmission: Boolean(raw.lateSubmission),
        saisiPar: String(raw.saisiPar ?? ''),
        saisiLe: String(raw.saisiLe ?? ''),
        updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
      };
    },
    () => (isWebRuntime ? browserUpsertIndexReading(payload) : localUpsertIndexReading(payload)),
  );
}

export async function cancelIndexPenalty(readingId: number): Promise<ApiIndexReading> {
  if (isDesktopRuntime()) {
    return browserCancelIndexPenalty(readingId);
  }
  return isWebRuntime ? browserCancelIndexPenalty(readingId) : localCancelIndexPenalty(readingId);
}

export async function calculateBilling(mois: string, forceRecompute = true): Promise<BillingCalculationResult> {
  if (isDesktopRuntime()) {
    return browserCalculateBilling(mois);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      () => request<BillingCalculationResult>('/api/v1/billing/calculate', {
        method: 'POST',
        body: { mois, forceRecompute },
      }),
      () => browserCalculateBilling(mois),
    );
  }
  return withOfflineFallback(
    () => request<BillingCalculationResult>('/api/v1/billing/calculate', {
      method: 'POST',
      body: { mois, forceRecompute },
    }),
    () => localCalculateBilling(mois),
  );
}

export async function listInvoices(mois: string): Promise<ApiInvoice[]> {
  if (isDesktopRuntime()) {
    return browserListInvoices(mois);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      async () => {
        const raws = await request<Record<string, unknown>[]>(`/api/v1/billing/invoices?mois=${encodeURIComponent(mois)}`);
        return raws.map((raw) => ({
          id: Number(raw.id),
          externalId: raw.externalId == null ? undefined : String(raw.externalId),
          roomId: Number(raw.roomId),
          roomNumber: String(raw.roomNumber),
          residentId: raw.residentId == null ? null : Number(raw.residentId),
          mois: String(raw.mois),
          water: toInvoiceLine(raw.water),
          electricity: toInvoiceLine(raw.electricity),
          totalFacture: parseNumber(raw.totalFacture),
          internetFee: parseNumber(raw.internetFee),
          commonCharges: parseNumber(raw.commonCharges),
          penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
          loyer: parseNumber(raw.loyer),
          dette: raw.dette == null ? null : parseNumber(raw.dette),
          netAPayer: parseNumber(raw.netAPayer),
          statutEnvoi: (String(raw.statutEnvoi) as ApiInvoice['statutEnvoi']) ?? 'NON_ENVOYE',
          calculeeLe: String(raw.calculeeLe ?? ''),
          delaiPaiement: raw.delaiPaiement == null ? null : String(raw.delaiPaiement),
        }));
      },
      () => browserListInvoices(mois),
    );
  }
  return withOfflineFallback(
    async () => {
      const raws = await request<Record<string, unknown>[]>(`/api/v1/billing/invoices?mois=${encodeURIComponent(mois)}`);
      return raws.map((raw) => ({
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomId: Number(raw.roomId),
        roomNumber: String(raw.roomNumber),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        mois: String(raw.mois),
        water: toInvoiceLine(raw.water),
        electricity: toInvoiceLine(raw.electricity),
        totalFacture: parseNumber(raw.totalFacture),
        internetFee: parseNumber(raw.internetFee),
        commonCharges: parseNumber(raw.commonCharges),
        penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
        loyer: parseNumber(raw.loyer),
        dette: raw.dette == null ? null : parseNumber(raw.dette),
        netAPayer: parseNumber(raw.netAPayer),
        statutEnvoi: (String(raw.statutEnvoi) as ApiInvoice['statutEnvoi']) ?? 'NON_ENVOYE',
        calculeeLe: String(raw.calculeeLe ?? ''),
        delaiPaiement: raw.delaiPaiement == null ? null : String(raw.delaiPaiement),
      }));
    },
    () => localListInvoices(mois),
  );
}

export async function updateInvoiceDebt(invoiceId: number, dette: number | null): Promise<ApiInvoice> {
  if (isDesktopRuntime()) {
    const store = getBrowserStore();
    const index = store.invoices.findIndex((invoice) => invoice.id === invoiceId);
    if (index < 0) {
      throw new Error('Invoice not found');
    }
    const current = store.invoices[index];
    const nextInvoice: ApiInvoice = {
      ...current,
      dette,
      netAPayer: current.totalFacture + (dette ?? 0),
    };
    store.invoices[index] = nextInvoice;
    saveBrowserStore(store);
    return nextInvoice;
  }
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/billing/invoices/${invoiceId}/debt`, {
        method: 'PATCH',
        body: { dette },
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomId: Number(raw.roomId),
        roomNumber: String(raw.roomNumber),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        mois: String(raw.mois),
        water: toInvoiceLine(raw.water),
        electricity: toInvoiceLine(raw.electricity),
        totalFacture: parseNumber(raw.totalFacture),
        internetFee: parseNumber(raw.internetFee),
        commonCharges: parseNumber(raw.commonCharges),
        penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
        loyer: parseNumber(raw.loyer),
        dette: raw.dette == null ? null : parseNumber(raw.dette),
        netAPayer: parseNumber(raw.netAPayer),
        statutEnvoi: (String(raw.statutEnvoi) as ApiInvoice['statutEnvoi']) ?? 'NON_ENVOYE',
        calculeeLe: String(raw.calculeeLe ?? ''),
        delaiPaiement: raw.delaiPaiement == null ? null : String(raw.delaiPaiement),
      };
    },
    () => (isWebRuntime ? Promise.reject(new Error('Invoice debt update unsupported in browser fallback')) : localUpdateInvoiceDebt(invoiceId, dette)),
  );
}

export async function updateInvoiceSendStatus(
  invoiceId: number,
  statutEnvoi: 'NON_ENVOYE' | 'ENVOYE' | 'ERREUR',
): Promise<ApiInvoice> {
  if (isDesktopRuntime()) {
    return browserUpdateInvoiceSendStatus(invoiceId, statutEnvoi);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      async () => {
        const raw = await request<Record<string, unknown>>(`/api/v1/billing/invoices/${invoiceId}/send-status`, {
          method: 'PATCH',
          body: { statutEnvoi },
        });
        return {
          id: Number(raw.id),
          externalId: raw.externalId == null ? undefined : String(raw.externalId),
          roomId: Number(raw.roomId),
          roomNumber: String(raw.roomNumber),
          residentId: raw.residentId == null ? null : Number(raw.residentId),
          mois: String(raw.mois),
          water: toInvoiceLine(raw.water),
          electricity: toInvoiceLine(raw.electricity),
          totalFacture: parseNumber(raw.totalFacture),
          internetFee: parseNumber(raw.internetFee),
          commonCharges: parseNumber(raw.commonCharges),
          penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
          loyer: parseNumber(raw.loyer),
          dette: raw.dette == null ? null : parseNumber(raw.dette),
          netAPayer: parseNumber(raw.netAPayer),
          statutEnvoi: (String(raw.statutEnvoi) as ApiInvoice['statutEnvoi']) ?? 'NON_ENVOYE',
          calculeeLe: String(raw.calculeeLe ?? ''),
          delaiPaiement: raw.delaiPaiement == null ? null : String(raw.delaiPaiement),
        };
      },
      () => browserUpdateInvoiceSendStatus(invoiceId, statutEnvoi),
    );
  }
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/billing/invoices/${invoiceId}/send-status`, {
        method: 'PATCH',
        body: { statutEnvoi },
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomId: Number(raw.roomId),
        roomNumber: String(raw.roomNumber),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        mois: String(raw.mois),
        water: toInvoiceLine(raw.water),
        electricity: toInvoiceLine(raw.electricity),
        totalFacture: parseNumber(raw.totalFacture),
        internetFee: parseNumber(raw.internetFee),
        commonCharges: parseNumber(raw.commonCharges),
        penaltyMissingIndex: parseNumber(raw.penaltyMissingIndex),
        loyer: parseNumber(raw.loyer),
        dette: raw.dette == null ? null : parseNumber(raw.dette),
        netAPayer: parseNumber(raw.netAPayer),
        statutEnvoi: (String(raw.statutEnvoi) as ApiInvoice['statutEnvoi']) ?? 'NON_ENVOYE',
        calculeeLe: String(raw.calculeeLe ?? ''),
        delaiPaiement: raw.delaiPaiement == null ? null : String(raw.delaiPaiement),
      };
    },
    () => localUpdateInvoiceSendStatus(invoiceId, statutEnvoi),
  );
}

export async function listPaymentsForMonth(mois: string): Promise<ApiPaymentRecord[]> {
  if (isDesktopRuntime()) {
    return browserListPaymentsForMonth(mois);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      async () => browserListPaymentsForMonth(mois),
      () => browserListPaymentsForMonth(mois),
    );
  }

  const db = await getLocalDb();
  const rows = await db.getAllAsync<LocalPaymentRow>(
    `SELECT
       p.id,
       p.facture_id,
       p.montant_paye,
       p.date_paiement,
       p.observation,
       p.saisi_par,
       p.method,
       p.status,
       p.external_id,
       p.updated_at,
       i.chambre_id AS room_id,
       r.numero_chambre,
       r.nom_prenom
     FROM payments p
     JOIN invoices i ON i.id = p.facture_id
     JOIN rooms r ON r.id = i.chambre_id
     WHERE i.mois = ?
     ORDER BY p.date_paiement DESC, p.id DESC`,
    [mois],
  );
  return rows.map(paymentRowToApi);
}

export async function recordPayment(
  invoiceId: number,
  amount: number,
  note?: string | null,
): Promise<ApiPaymentRecord> {
  if (isDesktopRuntime()) {
    return browserRecordPayment(invoiceId, amount, note);
  }
  if (isWebRuntime) {
    return withOfflineFallback(
      () => browserRecordPayment(invoiceId, amount, note),
      () => browserRecordPayment(invoiceId, amount, note),
    );
  }

  const db = await getLocalDb();
  const today = new Date().toISOString().split('T')[0];
  const externalId = createExternalId('payment');
  await db.runAsync(
    `INSERT INTO payments (
      facture_id, montant_paye, date_paiement, observation, saisi_par, method, status, external_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceId, amount, today, note ?? null, 'desktop', 'MANUAL', 'COMPLETED', externalId, nowIso()],
  );
  const row = await db.getFirstAsync<LocalPaymentRow>(
    `SELECT
       p.id,
       p.facture_id,
       p.montant_paye,
       p.date_paiement,
       p.observation,
       p.saisi_par,
       p.method,
       p.status,
       p.external_id,
       p.updated_at,
       i.chambre_id AS room_id,
       r.numero_chambre,
       r.nom_prenom
     FROM payments p
     JOIN invoices i ON i.id = p.facture_id
     JOIN rooms r ON r.id = i.chambre_id
     WHERE p.facture_id = ?
     ORDER BY p.id DESC
     LIMIT 1`,
    [invoiceId],
  );
  if (!row) {
    throw new Error('Payment not found after insert');
  }
  return paymentRowToApi(row);
}

export async function createPayment(payload: {
  invoiceId: number;
  paymentType?: 'ELECTRICITE' | 'LOYER' | 'PENALITE';
  amount: number;
  method: string;
  observation?: string | null;
  externalId?: string;
}): Promise<ApiPayment> {
  return withOfflineFallback(
    () => request<ApiPayment>(
      payload.paymentType === 'LOYER'
        ? '/api/v1/payments/loyer'
        : payload.paymentType === 'PENALITE'
          ? '/api/v1/payments/penalite'
          : payload.paymentType === 'ELECTRICITE'
            ? '/api/v1/payments/electricite'
            : '/api/v1/payments',
      {
      method: 'POST',
      body: {
        invoiceId: payload.invoiceId,
        amount: payload.amount,
        method: payload.method,
        observation: payload.observation ?? null,
        externalId: payload.externalId,
      },
    }),
    async () => {
      const payment = isWebRuntime
        ? await browserRecordPayment(payload.invoiceId, payload.amount, payload.observation ?? null)
        : await recordPayment(payload.invoiceId, payload.amount, payload.observation ?? null);
      return {
        id: payment.id,
        externalId: payment.externalId,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        method: payment.method ?? payload.method,
        status: payment.status ?? 'COMPLETED',
        transactionRef: null,
        observation: payment.note ?? null,
        paidAt: payment.paidAt,
      };
    },
  );
}

export async function listPaymentsByInvoice(invoiceId: number): Promise<ApiPayment[]> {
  return withOfflineFallback(
    () => request<ApiPayment[]>(`/api/v1/payments/invoice/${invoiceId}`),
    async () => {
      if (isWebRuntime) {
        const payments = getBrowserStore().payments
          .filter((payment) => payment.invoiceId === invoiceId)
          .sort((left, right) => String(right.paidAt).localeCompare(String(left.paidAt)));
        return payments.map((payment) => ({
          id: payment.id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          method: payment.method ?? 'MANUAL',
          status: payment.status ?? 'COMPLETED',
          transactionRef: null,
          observation: payment.note ?? null,
          paidAt: payment.paidAt,
        }));
      }
      return localListPaymentsByInvoice(invoiceId);
    },
  );
}

export async function listContracts(): Promise<ApiContract[]> {
  return withOfflineFallback(
    async () => {
      const raws = await request<Record<string, unknown>[]>('/api/v1/contracts');
      return raws.map((raw) => ({
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        residentName: String(raw.residentName ?? ''),
        status: String(raw.status ?? ''),
        signingMode: String(raw.signingMode ?? ''),
        startDate: raw.startDate == null ? null : String(raw.startDate),
        endDate: raw.endDate == null ? null : String(raw.endDate),
        monthlyRent: parseNumber(raw.monthlyRent),
        deposit: parseNumber(raw.deposit),
        autoRenewal: Boolean(raw.autoRenewal),
        notes: raw.notes == null ? null : String(raw.notes),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
        validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
        signatures: Array.isArray(raw.signatures)
          ? (raw.signatures as Record<string, unknown>[]).map((sig) => ({
              signedBy: String(sig.signedBy ?? ''),
              signedAt: String(sig.signedAt ?? ''),
              signatureType: String(sig.signatureType ?? ''),
            }))
          : [],
      }));
    },
    () => localListContracts(),
  );
}

export async function upsertContract(payload: {
  roomNumero: string;
  residentExternalId?: string | null;
  status: string;
  signingMode: string;
  startDate?: string | null;
  endDate?: string | null;
  monthlyRent: number;
  deposit: number;
  autoRenewal: boolean;
  notes?: string | null;
  externalId?: string | null;
}): Promise<ApiContract> {
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>('/api/v1/contracts', {
        method: 'POST',
        body: payload as JsonObject,
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        residentName: String(raw.residentName ?? ''),
        status: String(raw.status ?? ''),
        signingMode: String(raw.signingMode ?? ''),
        startDate: raw.startDate == null ? null : String(raw.startDate),
        endDate: raw.endDate == null ? null : String(raw.endDate),
        monthlyRent: parseNumber(raw.monthlyRent),
        deposit: parseNumber(raw.deposit),
        autoRenewal: Boolean(raw.autoRenewal),
        notes: raw.notes == null ? null : String(raw.notes),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
        validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
        signatures: Array.isArray(raw.signatures)
          ? (raw.signatures as Record<string, unknown>[]).map((sig) => ({
              signedBy: String(sig.signedBy ?? ''),
              signedAt: String(sig.signedAt ?? ''),
              signatureType: String(sig.signatureType ?? ''),
            }))
          : [],
      };
    },
    () => localUpsertContract(payload),
  );
}

export async function signContract(contractId: number, signedBy: string, signatureType: string): Promise<ApiContract> {
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/contracts/${contractId}/sign`, {
        method: 'POST',
        body: { signedBy, signatureType },
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        residentName: String(raw.residentName ?? ''),
        status: String(raw.status ?? ''),
        signingMode: String(raw.signingMode ?? ''),
        startDate: raw.startDate == null ? null : String(raw.startDate),
        endDate: raw.endDate == null ? null : String(raw.endDate),
        monthlyRent: parseNumber(raw.monthlyRent),
        deposit: parseNumber(raw.deposit),
        autoRenewal: Boolean(raw.autoRenewal),
        notes: raw.notes == null ? null : String(raw.notes),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
        validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
        signatures: Array.isArray(raw.signatures)
          ? (raw.signatures as Record<string, unknown>[]).map((sig) => ({
              signedBy: String(sig.signedBy ?? ''),
              signedAt: String(sig.signedAt ?? ''),
              signatureType: String(sig.signatureType ?? ''),
            }))
          : [],
      };
    },
    () => localSignContract(contractId, signedBy, signatureType),
  );
}

export async function validateContract(contractId: number): Promise<ApiContract> {
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/contracts/${contractId}/validate`, { method: 'POST' });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        residentName: String(raw.residentName ?? ''),
        status: String(raw.status ?? ''),
        signingMode: String(raw.signingMode ?? ''),
        startDate: raw.startDate == null ? null : String(raw.startDate),
        endDate: raw.endDate == null ? null : String(raw.endDate),
        monthlyRent: parseNumber(raw.monthlyRent),
        deposit: parseNumber(raw.deposit),
        autoRenewal: Boolean(raw.autoRenewal),
        notes: raw.notes == null ? null : String(raw.notes),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
        validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
        signatures: Array.isArray(raw.signatures)
          ? (raw.signatures as Record<string, unknown>[]).map((sig) => ({
              signedBy: String(sig.signedBy ?? ''),
              signedAt: String(sig.signedAt ?? ''),
              signatureType: String(sig.signatureType ?? ''),
            }))
          : [],
      };
    },
    () => localValidateContract(contractId),
  );
}

export async function renewContract(contractId: number): Promise<ApiContract> {
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/contracts/${contractId}/renew`, { method: 'POST' });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        residentName: String(raw.residentName ?? ''),
        status: String(raw.status ?? ''),
        signingMode: String(raw.signingMode ?? ''),
        startDate: raw.startDate == null ? null : String(raw.startDate),
        endDate: raw.endDate == null ? null : String(raw.endDate),
        monthlyRent: parseNumber(raw.monthlyRent),
        deposit: parseNumber(raw.deposit),
        autoRenewal: Boolean(raw.autoRenewal),
        notes: raw.notes == null ? null : String(raw.notes),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
        validatedAt: raw.validatedAt == null ? null : String(raw.validatedAt),
        signatures: Array.isArray(raw.signatures)
          ? (raw.signatures as Record<string, unknown>[]).map((sig) => ({
              signedBy: String(sig.signedBy ?? ''),
              signedAt: String(sig.signedAt ?? ''),
              signatureType: String(sig.signatureType ?? ''),
            }))
          : [],
      };
    },
    () => localRenewContract(contractId),
  );
}

export async function listMaintenanceTickets(): Promise<ApiMaintenanceTicket[]> {
  const raws = await request<Record<string, unknown>[]>('/api/v1/maintenance');
  return raws.map((raw) => ({
    id: Number(raw.id),
    externalId: raw.externalId == null ? undefined : String(raw.externalId),
    roomNumero: String(raw.roomNumero ?? ''),
    residentId: raw.residentId == null ? null : Number(raw.residentId),
    residentName: String(raw.residentName ?? ''),
    category: String(raw.category ?? ''),
    priority: String(raw.priority ?? ''),
    status: String(raw.status ?? ''),
    responsibility: String(raw.responsibility ?? ''),
    estimatedCost: parseNumber(raw.estimatedCost),
    penaltyAmount: parseNumber(raw.penaltyAmount),
    penaltyAppliedAt: raw.penaltyAppliedAt == null ? null : String(raw.penaltyAppliedAt),
    dueAt: raw.dueAt == null ? null : String(raw.dueAt),
    overdue: Boolean(raw.overdue),
    notes: raw.notes == null ? null : String(raw.notes),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    resolvedAt: raw.resolvedAt == null ? null : String(raw.resolvedAt),
  }));
}

export async function listExitReports(): Promise<ApiExitReport[]> {
  if (isDesktopRuntime()) {
    return browserListExitReports();
  }
  return withOfflineFallback(
    async () => {
      const raws = await request<Record<string, unknown>[]>('/api/v1/exit-reports');
      return raws.map((raw) => ({
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        roomId: raw.roomId == null ? null : Number(raw.roomId),
        contractId: raw.contractId == null ? null : Number(raw.contractId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentName: String(raw.residentName ?? ''),
        depositAmount: parseNumber(raw.depositAmount),
        debtTotal: parseNumber(raw.debtTotal),
        sanctionTotal: parseNumber(raw.sanctionTotal),
        repairCost: parseNumber(raw.repairCost),
        commonChargesAmount: parseNumber(raw.commonChargesAmount),
        depositUsed: parseNumber(raw.depositUsed),
        refundAmount: parseNumber(raw.refundAmount),
        status: String(raw.status ?? 'DRAFT'),
        notes: raw.notes == null ? null : String(raw.notes),
        signedBy: raw.signedBy == null ? null : String(raw.signedBy),
        managerSignedAt: raw.managerSignedAt == null ? null : String(raw.managerSignedAt),
        residentSignedAt: raw.residentSignedAt == null ? null : String(raw.residentSignedAt),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
      }));
    },
    () => (isWebRuntime ? browserListExitReports() : localListExitReports()),
  );
}

export async function upsertExitReport(payload: {
  roomId: number | null;
  residentId?: number | null;
  contractId?: number | null;
  depositAmount: number;
  repairCost: number;
  notes?: string | null;
}): Promise<ApiExitReport> {
  if (isDesktopRuntime()) {
    return browserUpsertExitReport(payload);
  }
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>('/api/v1/exit-reports', {
        method: 'POST',
        body: payload as JsonObject,
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        roomId: raw.roomId == null ? null : Number(raw.roomId),
        contractId: raw.contractId == null ? null : Number(raw.contractId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentName: String(raw.residentName ?? ''),
        depositAmount: parseNumber(raw.depositAmount),
        debtTotal: parseNumber(raw.debtTotal),
        sanctionTotal: parseNumber(raw.sanctionTotal),
        repairCost: parseNumber(raw.repairCost),
        commonChargesAmount: parseNumber(raw.commonChargesAmount),
        depositUsed: parseNumber(raw.depositUsed),
        refundAmount: parseNumber(raw.refundAmount),
        status: String(raw.status ?? 'DRAFT'),
        notes: raw.notes == null ? null : String(raw.notes),
        signedBy: raw.signedBy == null ? null : String(raw.signedBy),
        managerSignedAt: raw.managerSignedAt == null ? null : String(raw.managerSignedAt),
        residentSignedAt: raw.residentSignedAt == null ? null : String(raw.residentSignedAt),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
      };
    },
    () => (isWebRuntime ? browserUpsertExitReport(payload) : localUpsertExitReport(payload)),
  );
}

export async function signExitReport(
  reportId: number,
  signedBy: string,
  signatureRole: 'MANAGER' | 'RESIDENT',
): Promise<ApiExitReport> {
  if (isDesktopRuntime()) {
    return browserSignExitReport(reportId, signedBy, signatureRole);
  }
  return withOfflineFallback(
    async () => {
      const raw = await request<Record<string, unknown>>(`/api/v1/exit-reports/${reportId}/sign`, {
        method: 'POST',
        body: { signedBy, signatureRole },
      });
      return {
        id: Number(raw.id),
        externalId: raw.externalId == null ? undefined : String(raw.externalId),
        residentId: raw.residentId == null ? null : Number(raw.residentId),
        roomId: raw.roomId == null ? null : Number(raw.roomId),
        contractId: raw.contractId == null ? null : Number(raw.contractId),
        roomNumero: String(raw.roomNumero ?? ''),
        residentName: String(raw.residentName ?? ''),
        depositAmount: parseNumber(raw.depositAmount),
        debtTotal: parseNumber(raw.debtTotal),
        sanctionTotal: parseNumber(raw.sanctionTotal),
        repairCost: parseNumber(raw.repairCost),
        commonChargesAmount: parseNumber(raw.commonChargesAmount),
        depositUsed: parseNumber(raw.depositUsed),
        refundAmount: parseNumber(raw.refundAmount),
        status: String(raw.status ?? 'DRAFT'),
        notes: raw.notes == null ? null : String(raw.notes),
        signedBy: raw.signedBy == null ? null : String(raw.signedBy),
        managerSignedAt: raw.managerSignedAt == null ? null : String(raw.managerSignedAt),
        residentSignedAt: raw.residentSignedAt == null ? null : String(raw.residentSignedAt),
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
      };
    },
    () => (isWebRuntime ? browserSignExitReport(reportId, signedBy, signatureRole) : localSignExitReport(reportId, signedBy, signatureRole)),
  );
}

export async function upsertMaintenanceTicket(payload: {
  roomNumero: string;
  residentExternalId?: string | null;
  category: string;
  priority: string;
  status: string;
  responsibility: string;
  estimatedCost: number;
  penaltyAmount: number;
  notes?: string | null;
  externalId?: string | null;
}): Promise<ApiMaintenanceTicket> {
  const raw = await request<Record<string, unknown>>('/api/v1/maintenance', {
    method: 'POST',
    body: payload as JsonObject,
  });
  return {
    id: Number(raw.id),
    externalId: raw.externalId == null ? undefined : String(raw.externalId),
    roomNumero: String(raw.roomNumero ?? ''),
    residentId: raw.residentId == null ? null : Number(raw.residentId),
    residentName: String(raw.residentName ?? ''),
    category: String(raw.category ?? ''),
    priority: String(raw.priority ?? ''),
    status: String(raw.status ?? ''),
    responsibility: String(raw.responsibility ?? ''),
    estimatedCost: parseNumber(raw.estimatedCost),
    penaltyAmount: parseNumber(raw.penaltyAmount),
    penaltyAppliedAt: raw.penaltyAppliedAt == null ? null : String(raw.penaltyAppliedAt),
    dueAt: raw.dueAt == null ? null : String(raw.dueAt),
    overdue: Boolean(raw.overdue),
    notes: raw.notes == null ? null : String(raw.notes),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    resolvedAt: raw.resolvedAt == null ? null : String(raw.resolvedAt),
  };
}

export async function applyMaintenancePenalty(ticketId: number): Promise<ApiMaintenanceTicket> {
  const raw = await request<Record<string, unknown>>(`/api/v1/maintenance/${ticketId}/penalty`, { method: 'POST' });
  return {
    id: Number(raw.id),
    externalId: raw.externalId == null ? undefined : String(raw.externalId),
    roomNumero: String(raw.roomNumero ?? ''),
    residentId: raw.residentId == null ? null : Number(raw.residentId),
    residentName: String(raw.residentName ?? ''),
    category: String(raw.category ?? ''),
    priority: String(raw.priority ?? ''),
    status: String(raw.status ?? ''),
    responsibility: String(raw.responsibility ?? ''),
    estimatedCost: parseNumber(raw.estimatedCost),
    penaltyAmount: parseNumber(raw.penaltyAmount),
    penaltyAppliedAt: raw.penaltyAppliedAt == null ? null : String(raw.penaltyAppliedAt),
    dueAt: raw.dueAt == null ? null : String(raw.dueAt),
    overdue: Boolean(raw.overdue),
    notes: raw.notes == null ? null : String(raw.notes),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    resolvedAt: raw.resolvedAt == null ? null : String(raw.resolvedAt),
  };
}

export async function sendNotification(payload: {
  channel: string;
  recipient: string;
  subject?: string | null;
  message?: string | null;
  externalId?: string | null;
}): Promise<ApiNotificationResponse> {
  const raw = await request<Record<string, unknown>>('/api/v1/notifications', {
    method: 'POST',
    body: {
      channel: payload.channel,
      recipient: payload.recipient,
      subject: payload.subject ?? null,
      payload: payload.message ?? null,
      externalId: payload.externalId ?? null,
    },
  });
  return {
    id: Number(raw.id),
    channel: String(raw.channel ?? ''),
    recipient: String(raw.recipient ?? ''),
    subject: raw.subject == null ? null : String(raw.subject),
    payload: raw.payload == null ? null : String(raw.payload),
    status: String(raw.status ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    sentAt: raw.sentAt == null ? null : String(raw.sentAt),
  };
}

export async function ocrParseIdentity(payload: {
  documentType: string;
  frontImageBase64: string;
  backImageBase64?: string | null;
  languageHint?: string | null;
}): Promise<ApiOcrIdentityResponse> {
  return withOfflineFallback(
    () => request<ApiOcrIdentityResponse>('/api/v1/ocr/identity', {
      method: 'POST',
      body: {
        documentType: payload.documentType,
        frontImageBase64: payload.frontImageBase64,
        backImageBase64: payload.backImageBase64 ?? null,
        languageHint: payload.languageHint ?? null,
      },
    }),
    async () => extractIdentityFieldsFallback(payload),
  );
}

export async function ocrRegisterIdentity(payload: {
  resident: CreateResidentPayload;
  username: string;
  password: string;
}): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/api/v1/ocr/identity/register', {
    method: 'POST',
    body: payload as JsonObject,
  });
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function syncPull(since: string): Promise<SyncPayload> {
  return request<SyncPayload>(`/api/v1/sync/pull?since=${encodeURIComponent(since)}`);
}

export async function syncPush(payload: SyncPayload): Promise<void> {
  await request<void>('/api/v1/sync/push', { method: 'POST', body: payload as JsonObject });
}

export async function exportMeterTrackExcel(mois: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/exports/metertrack?mois=${encodeURIComponent(mois)}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.blob();
}

export async function exportResidentHistoryPdf(residentId: number): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/exports/resident-history/${residentId}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.blob();
}

export async function exportPaymentReceiptPdf(paymentId: number): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/exports/payment-receipt/${paymentId}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.blob();
}

export async function exportExitReportPdf(reportId: number): Promise<Blob> {
  if (isDesktopRuntime()) {
    const report = (await browserListExitReports()).find((entry) => entry.id === reportId) ?? null;
    if (!report) {
      throw new Error('Exit report not found');
    }
    return buildSimplePdfBlob([
      'PV DE SORTIE MYHOUSE',
      `Rapport: ${report.id}`,
      `Chambre: ${report.roomNumero || '-'}`,
      `Resident: ${report.residentName || '-'}`,
      `Caution: ${Math.round(report.depositAmount)} FCFA`,
      `Dettes globales: ${Math.round(report.debtTotal)} FCFA`,
      `Sanctions impayees: ${Math.round(report.sanctionTotal)} FCFA`,
      `Reparations: ${Math.round(report.repairCost)} FCFA`,
      `Charges communes (25%): ${Math.round(report.commonChargesAmount)} FCFA`,
      `Caution mobilisee: ${Math.round(report.depositUsed)} FCFA`,
      `Remboursement caution: ${Math.round(report.refundAmount)} FCFA`,
      `Statut: ${report.status}`,
      `Signature gestionnaire: ${report.managerSignedAt ?? 'non signee'}`,
      `Signature resident: ${report.residentSignedAt ?? 'non signee'}`,
      `Notes: ${report.notes ?? '-'}`,
    ]);
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/exports/exit-report/${reportId}`, {
      headers: buildHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    return response.blob();
  } catch (error) {
    if (!isOfflineError(error)) {
      throw error;
    }
    const report = isWebRuntime
      ? (await browserListExitReports()).find((entry) => entry.id === reportId) ?? null
      : await localGetExitReportById(reportId);
    if (!report) {
      throw new Error('Exit report not found');
    }
    return buildSimplePdfBlob([
      'PV DE SORTIE MYHOUSE',
      `Rapport: ${report.id}`,
      `Chambre: ${report.roomNumero || '-'}`,
      `Resident: ${report.residentName || '-'}`,
      `Caution: ${Math.round(report.depositAmount)} FCFA`,
      `Dettes globales: ${Math.round(report.debtTotal)} FCFA`,
      `Sanctions impayees: ${Math.round(report.sanctionTotal)} FCFA`,
      `Reparations: ${Math.round(report.repairCost)} FCFA`,
      `Charges communes (25%): ${Math.round(report.commonChargesAmount)} FCFA`,
      `Caution mobilisee: ${Math.round(report.depositUsed)} FCFA`,
      `Remboursement caution: ${Math.round(report.refundAmount)} FCFA`,
      `Statut: ${report.status}`,
      `Signature gestionnaire: ${report.managerSignedAt ?? 'non signee'}`,
      `Signature resident: ${report.residentSignedAt ?? 'non signee'}`,
      `Notes: ${report.notes ?? '-'}`,
    ]);
  }
}

export async function exportFinanceSummaryExcel(mois: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/exports/finance-summary?mois=${encodeURIComponent(mois)}`, {
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.blob();
}

export async function listGlobalSettings(): Promise<ApiGlobalSetting[]> {
  const raws = await request<Record<string, unknown>[]>('/api/v1/settings');
  return raws.map((raw) => ({
    id: Number(raw.id),
    settingKey: String(raw.settingKey ?? ''),
    settingValue: raw.settingValue == null ? null : String(raw.settingValue),
    updatedAt: String(raw.updatedAt ?? ''),
  }));
}

export async function upsertGlobalSetting(settingKey: string, settingValue: string | null): Promise<ApiGlobalSetting> {
  const raw = await request<Record<string, unknown>>('/api/v1/settings', {
    method: 'POST',
    body: { settingKey, settingValue } as JsonObject,
  });
  return {
    id: Number(raw.id),
    settingKey: String(raw.settingKey ?? ''),
    settingValue: raw.settingValue == null ? null : String(raw.settingValue),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

export async function listMarketplaceListings(params?: {
  status?: string;
  type?: string;
  query?: string;
}): Promise<ApiMarketplaceListing[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.type) search.set('type', params.type);
  if (params?.query) search.set('query', params.query);
  const raw = await request<Record<string, unknown>[]>(`/api/v1/marketplace/listings?${search.toString()}`);
  return raw.map((item) => ({
    id: Number(item.id),
    externalId: item.externalId == null ? undefined : String(item.externalId),
    title: String(item.title ?? ''),
    description: item.description == null ? null : String(item.description),
    price: item.price == null ? null : parseNumber(item.price),
    currency: item.currency == null ? null : String(item.currency),
    listingType: String(item.listingType ?? ''),
    status: String(item.status ?? ''),
    address: item.address == null ? null : String(item.address),
    latitude: item.latitude == null ? null : parseNumber(item.latitude),
    longitude: item.longitude == null ? null : parseNumber(item.longitude),
    media: Array.isArray(item.media)
      ? (item.media as Record<string, unknown>[]).map((media) => ({
          id: Number(media.id),
          mediaUrl: String(media.mediaUrl ?? ''),
          mediaType: String(media.mediaType ?? ''),
          sortOrder: media.sortOrder == null ? null : Number(media.sortOrder),
          createdAt: String(media.createdAt ?? ''),
        }))
      : [],
    createdAt: item.createdAt == null ? null : String(item.createdAt),
    updatedAt: item.updatedAt == null ? null : String(item.updatedAt),
  }));
}

export async function upsertMarketplaceListing(payload: {
  externalId?: string | null;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  listingType: string;
  status: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<ApiMarketplaceListing> {
  const raw = await request<Record<string, unknown>>('/api/v1/marketplace/listings', {
    method: 'POST',
    body: payload as JsonObject,
  });
  return {
    id: Number(raw.id),
    externalId: raw.externalId == null ? undefined : String(raw.externalId),
    title: String(raw.title ?? ''),
    description: raw.description == null ? null : String(raw.description),
    price: raw.price == null ? null : parseNumber(raw.price),
    currency: raw.currency == null ? null : String(raw.currency),
    listingType: String(raw.listingType ?? ''),
    status: String(raw.status ?? ''),
    address: raw.address == null ? null : String(raw.address),
    latitude: raw.latitude == null ? null : parseNumber(raw.latitude),
    longitude: raw.longitude == null ? null : parseNumber(raw.longitude),
    media: Array.isArray(raw.media)
      ? (raw.media as Record<string, unknown>[]).map((media) => ({
          id: Number(media.id),
          mediaUrl: String(media.mediaUrl ?? ''),
          mediaType: String(media.mediaType ?? ''),
          sortOrder: media.sortOrder == null ? null : Number(media.sortOrder),
          createdAt: String(media.createdAt ?? ''),
        }))
      : [],
    createdAt: raw.createdAt == null ? null : String(raw.createdAt),
    updatedAt: raw.updatedAt == null ? null : String(raw.updatedAt),
  };
}

export async function addMarketplaceMedia(payload: {
  listingId: number;
  mediaUrl: string;
  mediaType: string;
  sortOrder?: number | null;
}): Promise<ApiMarketplaceMedia> {
  const raw = await request<Record<string, unknown>>('/api/v1/marketplace/media', {
    method: 'POST',
    body: payload as JsonObject,
  });
  return {
    id: Number(raw.id),
    mediaUrl: String(raw.mediaUrl ?? ''),
    mediaType: String(raw.mediaType ?? ''),
    sortOrder: raw.sortOrder == null ? null : Number(raw.sortOrder),
    createdAt: String(raw.createdAt ?? ''),
  };
}

export async function createMarketplaceSubscription(payload: {
  userId: number;
  plan: string;
  status: string;
}): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/api/v1/marketplace/subscriptions', {
    method: 'POST',
    body: payload as JsonObject,
  });
}

export async function createMarketplaceTransaction(payload: {
  listingId: number;
  amount: number;
  buyerContact?: string | null;
  status: string;
}): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/api/v1/marketplace/transactions', {
    method: 'POST',
    body: payload as JsonObject,
  });
}

export async function listCommonCharges(): Promise<ApiCommonCharge[]> {
  const raws = await request<Record<string, unknown>[]>('/api/v1/common-charges');
  return raws.map((raw) => ({
    id: Number(raw.id),
    code: String(raw.code ?? ''),
    label: String(raw.label ?? ''),
    amount: parseNumber(raw.amount),
    required: Boolean(raw.required),
    active: Boolean(raw.active),
  }));
}

export async function upsertCommonCharge(payload: {
  code: string;
  label: string;
  amount: number;
  required: boolean;
  active: boolean;
}): Promise<ApiCommonCharge> {
  const raw = await request<Record<string, unknown>>('/api/v1/common-charges', {
    method: 'POST',
    body: payload as JsonObject,
  });
  return {
    id: Number(raw.id),
    code: String(raw.code ?? ''),
    label: String(raw.label ?? ''),
    amount: parseNumber(raw.amount),
    required: Boolean(raw.required),
    active: Boolean(raw.active),
  };
}

export async function assignCommonCharge(payload: {
  chargeId: number;
  scopeType: string;
  scopeValue: string;
  required: boolean;
}): Promise<ApiCommonChargeAssignment> {
  const raw = await request<Record<string, unknown>>('/api/v1/common-charges/assign', {
    method: 'POST',
    body: payload as JsonObject,
  });
  return {
    id: Number(raw.id),
    chargeId: Number(raw.chargeId ?? 0),
    chargeLabel: raw.chargeLabel == null ? null : String(raw.chargeLabel),
    scopeType: String(raw.scopeType ?? ''),
    scopeValue: String(raw.scopeValue ?? ''),
    required: Boolean(raw.required),
  };
}
