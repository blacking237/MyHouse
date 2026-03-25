import type { SQLiteDatabase } from 'expo-sqlite';
import { getAuthTokens, syncPull, syncPush } from './BackendApi';

type RoomRow = {
  id: number;
  numero_chambre: string;
  bloc?: string | null;
  actif: number;
  nom_prenom: string;
  numero_whatsapp: string;
  external_id?: string | null;
  updated_at?: string | null;
  date_creation: string;
};

type IndexRow = {
  id: number;
  chambre_id: number;
  mois: string;
  ancien_index_eau: number;
  nouvel_index_eau: number;
  ancien_index_elec: number;
  nouvel_index_elec: number;
  statut_presence: string;
  amende_eau: number;
  saisi_par: string;
  date_saisie: string;
  external_id?: string | null;
  updated_at?: string | null;
  room_external_id?: string | null;
};

type InvoiceRow = {
  id: number;
  chambre_id: number;
  mois: string;
  montant_ttc_eau: number;
  montant_ttc_elec: number;
  internet_fee?: number | null;
  common_charges?: number | null;
  penalty_missing_index?: number | null;
  loyer?: number | null;
  dette: number | null;
  net_a_payer: number;
  statut_envoi: string;
  calculee_le: string;
  external_id?: string | null;
  updated_at?: string | null;
  room_external_id?: string | null;
};

type PaymentRow = {
  id: number;
  facture_id: number;
  montant_paye: number;
  date_paiement: string;
  observation: string | null;
  saisi_par: string;
  method?: string | null;
  status?: string | null;
  transaction_ref?: string | null;
  external_id?: string | null;
  updated_at?: string | null;
  invoice_external_id?: string | null;
};

type ResidentRow = {
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
  date_entree?: string | null;
  date_sortie?: string | null;
  statut?: string | null;
  current_room_id?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const LAST_SYNC_KEY = 'last_sync_at';

function createExternalId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

function parseDate(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function syncOnce(db: SQLiteDatabase): Promise<void> {
  const tokens = getAuthTokens();
  if (!tokens) return;

  const lastSyncAt = (await getSetting(db, LAST_SYNC_KEY)) ?? '1970-01-01T00:00:00.000Z';
  const sinceTs = parseDate(lastSyncAt);

  const rooms = await db.getAllAsync<RoomRow>('SELECT * FROM rooms');
  const roomPayload: Array<Record<string, unknown>> = [];
  for (const room of rooms) {
    const updatedAt = room.updated_at ?? room.date_creation;
    if (parseDate(updatedAt) <= sinceTs) continue;
    let externalId = room.external_id ?? null;
    if (!externalId) {
      externalId = createExternalId('room');
      await db.runAsync('UPDATE rooms SET external_id = ?, updated_at = ? WHERE id = ?', [externalId, updatedAt, room.id]);
    }
    roomPayload.push({
      externalId,
      numeroChambre: room.numero_chambre,
      bloc: room.bloc ?? null,
      actif: room.actif === 1,
      updatedAt,
    });
  }

  const indexRows = await db.getAllAsync<IndexRow>(
    `SELECT ir.*, r.external_id AS room_external_id
     FROM index_readings ir
     JOIN rooms r ON r.id = ir.chambre_id`
  );
  const indexPayload: Array<Record<string, unknown>> = [];
  for (const row of indexRows) {
    const updatedAt = row.updated_at ?? row.date_saisie;
    if (parseDate(updatedAt) <= sinceTs) continue;
    let externalId = row.external_id ?? null;
    if (!externalId) {
      externalId = createExternalId('reading');
      await db.runAsync('UPDATE index_readings SET external_id = ?, updated_at = ? WHERE id = ?', [externalId, updatedAt, row.id]);
    }
    if (!row.room_external_id) continue;
    indexPayload.push({
      externalId,
      roomExternalId: row.room_external_id,
      mois: row.mois,
      anEau: row.ancien_index_eau,
      niEau: row.nouvel_index_eau,
      anElec: row.ancien_index_elec,
      niElec: row.nouvel_index_elec,
      statutPresence: row.statut_presence,
      amendeEau: row.amende_eau === 1,
      saisiPar: row.saisi_par,
      saisiLe: row.date_saisie,
      updatedAt,
    });
  }

  const invoiceRows = await db.getAllAsync<InvoiceRow>(
    `SELECT i.*, r.external_id AS room_external_id
     FROM invoices i
     JOIN rooms r ON r.id = i.chambre_id`
  );
  const invoicePayload: Array<Record<string, unknown>> = [];
  for (const row of invoiceRows) {
    const updatedAt = row.updated_at ?? row.calculee_le;
    if (parseDate(updatedAt) <= sinceTs) continue;
    let externalId = row.external_id ?? null;
    if (!externalId) {
      externalId = createExternalId('invoice');
      await db.runAsync('UPDATE invoices SET external_id = ?, updated_at = ? WHERE id = ?', [externalId, updatedAt, row.id]);
    }
    if (!row.room_external_id) continue;
    const totalFacture =
      row.montant_ttc_eau +
      row.montant_ttc_elec +
      (row.internet_fee ?? 0) +
      (row.common_charges ?? 0) +
      (row.penalty_missing_index ?? 0) +
      (row.loyer ?? 0);
    invoicePayload.push({
      externalId,
      roomExternalId: row.room_external_id,
      residentExternalId: null,
      mois: row.mois,
      totalFacture,
      internetFee: row.internet_fee ?? 0,
      commonCharges: row.common_charges ?? 0,
      penaltyMissingIndex: row.penalty_missing_index ?? 0,
      loyer: row.loyer ?? 0,
      dette: row.dette,
      netAPayer: row.net_a_payer,
      statutEnvoi: row.statut_envoi,
      calculeeLe: row.calculee_le,
      updatedAt,
    });
  }

  const paymentRows = await db.getAllAsync<PaymentRow>(
    `SELECT p.*, i.external_id AS invoice_external_id
     FROM payments p
     JOIN invoices i ON i.id = p.facture_id`
  );
  const paymentPayload: Array<Record<string, unknown>> = [];
  for (const row of paymentRows) {
    const updatedAt = row.updated_at ?? row.date_paiement;
    if (parseDate(updatedAt) <= sinceTs) continue;
    let externalId = row.external_id ?? null;
    if (!externalId) {
      externalId = createExternalId('payment');
      await db.runAsync('UPDATE payments SET external_id = ?, updated_at = ? WHERE id = ?', [externalId, updatedAt, row.id]);
    }
    if (!row.invoice_external_id) continue;
    paymentPayload.push({
      externalId,
      invoiceExternalId: row.invoice_external_id,
      amount: row.montant_paye,
      method: row.method ?? 'MANUAL',
      status: row.status ?? 'COMPLETED',
      transactionRef: row.transaction_ref ?? null,
      paidAt: row.date_paiement,
      updatedAt,
    });
  }

  const residentPayload = await buildResidentPayload(db, sinceTs);

  await syncPush({
    since: lastSyncAt,
    rooms: roomPayload,
    residents: residentPayload,
    indexReadings: indexPayload,
    invoices: invoicePayload,
    payments: paymentPayload,
  });

  const pulled = await syncPull(lastSyncAt);
  await applyPull(db, pulled);

  await setSetting(db, LAST_SYNC_KEY, new Date().toISOString());
}

async function buildResidentPayload(db: SQLiteDatabase, sinceTs: number): Promise<Array<Record<string, unknown>>> {
  const rows = await db.getAllAsync<ResidentRow>('SELECT * FROM residents');
  const payload: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const updatedAt = row.updated_at ?? row.created_at ?? '';
    if (parseDate(updatedAt) <= sinceTs) continue;
    let externalId = row.external_id ?? null;
    if (!externalId) {
      externalId = createExternalId('resident');
      await db.runAsync('UPDATE residents SET external_id = ?, updated_at = ? WHERE id = ?', [externalId, updatedAt, row.id]);
    }
    payload.push({
      externalId,
      cni: row.cni ?? null,
      nom: row.nom,
      prenom: row.prenom,
      genre: row.genre ?? null,
      dateNaissance: row.date_naissance ?? null,
      telephone: row.telephone ?? null,
      whatsapp: row.whatsapp ?? null,
      whatsappParents: row.whatsapp_parents ?? null,
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
      dateEntree: row.date_entree ?? null,
      dateSortie: row.date_sortie ?? null,
      statut: row.statut ?? 'ACTIF',
      updatedAt,
    });
  }
  return payload;
}

async function applyPull(db: SQLiteDatabase, payload: {
  rooms?: any[];
  residents?: any[];
  indexReadings?: any[];
  invoices?: any[];
  payments?: any[];
}): Promise<void> {
  if (payload.rooms) {
    for (const room of payload.rooms) {
      const externalId = String(room.externalId);
      const existing = await db.getFirstAsync<RoomRow>('SELECT * FROM rooms WHERE external_id = ?', [externalId]);
      if (existing) {
        const currentUpdated = parseDate(existing.updated_at ?? existing.date_creation);
        const incomingUpdated = parseDate(room.updatedAt);
        if (incomingUpdated <= currentUpdated) continue;
        await db.runAsync(
          'UPDATE rooms SET numero_chambre = ?, bloc = ?, actif = ?, updated_at = ? WHERE id = ?',
          [String(room.numeroChambre), room.bloc ?? null, room.actif ? 1 : 0, room.updatedAt, existing.id]
        );
      } else {
        await db.runAsync(
          'INSERT INTO rooms (numero_chambre, nom_prenom, numero_whatsapp, bloc, actif, external_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [String(room.numeroChambre), '', '', room.bloc ?? null, room.actif ? 1 : 0, externalId, room.updatedAt]
        );
      }
    }
  }

  if (payload.residents) {
    for (const resident of payload.residents) {
      const externalId = String(resident.externalId);
      const existing = await db.getFirstAsync<ResidentRow>('SELECT * FROM residents WHERE external_id = ?', [externalId]);
      const updatedAt = String(resident.updatedAt ?? '');
      const currentUpdated = existing ? parseDate(existing.updated_at ?? existing.created_at ?? '') : 0;
      if (existing && parseDate(updatedAt) <= currentUpdated) continue;
      if (existing) {
        await db.runAsync(
          `UPDATE residents SET
            cni = ?, nom = ?, prenom = ?, genre = ?, date_naissance = ?, telephone = ?, whatsapp = ?, whatsapp_parents = ?,
            email = ?, ecole = ?, filiere = ?, niveau = ?, niveau_etude = ?, filiere_etude = ?, contact_urgence_nom = ?,
            contact_urgence_telephone = ?, nom_pere = ?, nom_mere = ?, date_entree = ?, date_sortie = ?, statut = ?, updated_at = ?
           WHERE id = ?`,
          [
            resident.cni ?? null,
            resident.nom ?? '',
            resident.prenom ?? '',
            resident.genre ?? null,
            resident.dateNaissance ?? null,
            resident.telephone ?? null,
            resident.whatsapp ?? null,
            resident.whatsappParents ?? null,
            resident.email ?? null,
            resident.ecole ?? null,
            resident.filiere ?? null,
            resident.niveau ?? null,
            resident.niveauEtude ?? null,
            resident.filiereEtude ?? null,
            resident.contactUrgenceNom ?? null,
            resident.contactUrgenceTelephone ?? null,
            resident.nomPere ?? null,
            resident.nomMere ?? null,
            resident.dateEntree ?? null,
            resident.dateSortie ?? null,
            resident.statut ?? 'ACTIF',
            updatedAt,
            existing.id,
          ]
        );
      } else {
        await db.runAsync(
          `INSERT INTO residents (
            external_id, cni, nom, prenom, genre, date_naissance, telephone, whatsapp, whatsapp_parents,
            email, ecole, filiere, niveau, niveau_etude, filiere_etude, contact_urgence_nom, contact_urgence_telephone,
            nom_pere, nom_mere, date_entree, date_sortie, statut, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            externalId,
            resident.cni ?? null,
            resident.nom ?? '',
            resident.prenom ?? '',
            resident.genre ?? null,
            resident.dateNaissance ?? null,
            resident.telephone ?? null,
            resident.whatsapp ?? null,
            resident.whatsappParents ?? null,
            resident.email ?? null,
            resident.ecole ?? null,
            resident.filiere ?? null,
            resident.niveau ?? null,
            resident.niveauEtude ?? null,
            resident.filiereEtude ?? null,
            resident.contactUrgenceNom ?? null,
            resident.contactUrgenceTelephone ?? null,
            resident.nomPere ?? null,
            resident.nomMere ?? null,
            resident.dateEntree ?? null,
            resident.dateSortie ?? null,
            resident.statut ?? 'ACTIF',
            updatedAt,
          ]
        );
      }
    }
  }

  if (payload.indexReadings) {
    for (const reading of payload.indexReadings) {
      const room = await db.getFirstAsync<RoomRow>('SELECT * FROM rooms WHERE external_id = ?', [String(reading.roomExternalId)]);
      if (!room) continue;
      const externalId = String(reading.externalId);
      const existing = await db.getFirstAsync<IndexRow>('SELECT * FROM index_readings WHERE external_id = ?', [externalId]);
      if (existing) {
        const currentUpdated = parseDate(existing.updated_at ?? existing.date_saisie);
        const incomingUpdated = parseDate(reading.updatedAt);
        if (incomingUpdated <= currentUpdated) continue;
        await db.runAsync(
          `UPDATE index_readings SET
            chambre_id = ?, mois = ?, ancien_index_eau = ?, nouvel_index_eau = ?, ancien_index_elec = ?, nouvel_index_elec = ?,
            statut_presence = ?, amende_eau = ?, saisi_par = ?, date_saisie = ?, updated_at = ?
           WHERE id = ?`,
          [
            room.id,
            String(reading.mois),
            Number(reading.anEau),
            Number(reading.niEau),
            Number(reading.anElec),
            Number(reading.niElec),
            String(reading.statutPresence),
            reading.amendeEau ? 1 : 0,
            String(reading.saisiPar ?? ''),
            String(reading.saisiLe ?? ''),
            String(reading.updatedAt ?? ''),
            existing.id,
          ]
        );
      } else {
        await db.runAsync(
          `INSERT INTO index_readings (
            chambre_id, mois, ancien_index_eau, nouvel_index_eau, ancien_index_elec, nouvel_index_elec,
            statut_presence, amende_eau, saisi_par, date_saisie, external_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            room.id,
            String(reading.mois),
            Number(reading.anEau),
            Number(reading.niEau),
            Number(reading.anElec),
            Number(reading.niElec),
            String(reading.statutPresence),
            reading.amendeEau ? 1 : 0,
            String(reading.saisiPar ?? ''),
            String(reading.saisiLe ?? ''),
            externalId,
            String(reading.updatedAt ?? ''),
          ]
        );
      }
    }
  }

  if (payload.invoices) {
    for (const invoice of payload.invoices) {
      const room = await db.getFirstAsync<RoomRow>('SELECT * FROM rooms WHERE external_id = ?', [String(invoice.roomExternalId)]);
      if (!room) continue;
      const externalId = String(invoice.externalId);
      const existing = await db.getFirstAsync<InvoiceRow>('SELECT * FROM invoices WHERE external_id = ?', [externalId]);
      const totalFacture = Number(invoice.totalFacture ?? 0);
      const montantTtcEau = totalFacture;
      const montantTtcElec = 0;
      const updatedAt = String(invoice.updatedAt ?? '');
      if (existing) {
        const currentUpdated = parseDate(existing.updated_at ?? existing.calculee_le);
        const incomingUpdated = parseDate(updatedAt);
        if (incomingUpdated <= currentUpdated) continue;
        await db.runAsync(
          `UPDATE invoices SET
            chambre_id = ?, mois = ?, montant_ttc_eau = ?, montant_ttc_elec = ?,
            internet_fee = ?, common_charges = ?, penalty_missing_index = ?, loyer = ?,
            dette = ?, net_a_payer = ?, statut_envoi = ?, calculee_le = ?, updated_at = ?
           WHERE id = ?`,
          [
            room.id,
            String(invoice.mois),
            montantTtcEau,
            montantTtcElec,
            Number(invoice.internetFee ?? 0),
            Number(invoice.commonCharges ?? 0),
            Number(invoice.penaltyMissingIndex ?? 0),
            Number(invoice.loyer ?? 0),
            invoice.dette == null ? null : Number(invoice.dette),
            Number(invoice.netAPayer ?? totalFacture),
            String(invoice.statutEnvoi ?? 'NON_ENVOYE'),
            String(invoice.calculeeLe ?? ''),
            updatedAt,
            existing.id,
          ]
        );
      } else {
        await db.runAsync(
          `INSERT INTO invoices (
            chambre_id, mois, montant_ttc_eau, montant_ttc_elec, internet_fee, common_charges, penalty_missing_index, loyer,
            dette, net_a_payer, statut_envoi, calculee_le, external_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            room.id,
            String(invoice.mois),
            montantTtcEau,
            montantTtcElec,
            Number(invoice.internetFee ?? 0),
            Number(invoice.commonCharges ?? 0),
            Number(invoice.penaltyMissingIndex ?? 0),
            Number(invoice.loyer ?? 0),
            invoice.dette == null ? null : Number(invoice.dette),
            Number(invoice.netAPayer ?? totalFacture),
            String(invoice.statutEnvoi ?? 'NON_ENVOYE'),
            String(invoice.calculeeLe ?? ''),
            externalId,
            updatedAt,
          ]
        );
      }
    }
  }

  if (payload.payments) {
    for (const payment of payload.payments) {
      const invoice = await db.getFirstAsync<InvoiceRow>('SELECT * FROM invoices WHERE external_id = ?', [String(payment.invoiceExternalId)]);
      if (!invoice) continue;
      const externalId = String(payment.externalId);
      const existing = await db.getFirstAsync<PaymentRow>('SELECT * FROM payments WHERE external_id = ?', [externalId]);
      const updatedAt = String(payment.updatedAt ?? '');
      if (existing) {
        const currentUpdated = parseDate(existing.updated_at ?? existing.date_paiement);
        const incomingUpdated = parseDate(updatedAt);
        if (incomingUpdated <= currentUpdated) continue;
        await db.runAsync(
          `UPDATE payments SET
            facture_id = ?, montant_paye = ?, date_paiement = ?, observation = ?, saisi_par = ?,
            method = ?, status = ?, transaction_ref = ?, updated_at = ?
           WHERE id = ?`,
          [
            invoice.id,
            Number(payment.amount ?? 0),
            String(payment.paidAt ?? ''),
            null,
            'sync',
            payment.method ?? 'MANUAL',
            payment.status ?? 'COMPLETED',
            payment.transactionRef ?? null,
            updatedAt,
            existing.id,
          ]
        );
      } else {
        await db.runAsync(
          `INSERT INTO payments (
            facture_id, montant_paye, date_paiement, observation, saisi_par, method, status, transaction_ref, external_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoice.id,
            Number(payment.amount ?? 0),
            String(payment.paidAt ?? ''),
            null,
            'sync',
            payment.method ?? 'MANUAL',
            payment.status ?? 'COMPLETED',
            payment.transactionRef ?? null,
            externalId,
            updatedAt,
          ]
        );
      }
    }
  }
}
