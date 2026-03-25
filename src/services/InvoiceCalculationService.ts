import type { SQLiteDatabase } from 'expo-sqlite';

export interface MonthConfig {
  id: number;
  mois: string;
  pu_eau: number;
  pu_electricite: number;
  tva: number;
  lc_eau: number;
  lc_electricite: number;
  surplus_eau_total: number;
  surplus_elec_total: number;
  amende_eau_montant: number;
  minimum_facture: number;
  internet_fee?: number | null;
  common_charges_percent?: number | null;
  penalty_missing_index?: number | null;
  delai_paiement: string;
}

export interface IndexReading {
  id: number;
  chambre_id: number;
  mois: string;
  ancien_index_eau: number;
  nouvel_index_eau: number;
  ancien_index_elec: number;
  nouvel_index_elec: number;
  statut_presence: 'PRESENT' | 'ABSENT';
  amende_eau: number;
}

export interface Room {
  id: number;
  numero_chambre: string;
  nom_prenom: string;
  numero_whatsapp: string;
  actif: number;
  date_creation: string;
}

export interface Invoice {
  id: number;
  external_id?: string | null;
  chambre_id: number;
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
  date_envoi: string | null;
  calculee_le: string;
}

export interface Payment {
  id: number;
  facture_id: number;
  montant_paye: number;
  date_paiement: string;
  observation: string | null;
  saisi_par: string;
}

interface ValidationError {
  chambre_id: number;
  numero_chambre: string;
  message: string;
}

function roundTwo(val: number): number {
  return Math.round(val * 100) / 100;
}

function createExternalId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function validateBeforeCalculation(
  db: SQLiteDatabase,
  mois: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Check month config exists
  const config = await db.getFirstAsync<MonthConfig>(
    'SELECT * FROM month_config WHERE mois = ?',
    [mois]
  );
  if (!config) {
    errors.push({
      chambre_id: 0,
      numero_chambre: '-',
      message: 'Parametres du mois non configures (PU, LC, surplus)',
    });
    return errors;
  }

  // Check all active rooms have index readings
  const activeRooms = await db.getAllAsync<Room>(
    'SELECT * FROM rooms WHERE actif = 1'
  );

  for (const room of activeRooms) {
    const reading = await db.getFirstAsync<IndexReading>(
      'SELECT * FROM index_readings WHERE chambre_id = ? AND mois = ?',
      [room.id, mois]
    );

    if (!reading) {
      errors.push({
        chambre_id: room.id,
        numero_chambre: room.numero_chambre,
        message: `Index manquant pour la chambre ${room.numero_chambre}`,
      });
      continue;
    }

    if (reading.nouvel_index_eau < reading.ancien_index_eau) {
      errors.push({
        chambre_id: room.id,
        numero_chambre: room.numero_chambre,
        message: `Erreur index eau chambre ${room.numero_chambre}: NI (${reading.nouvel_index_eau}) < AN (${reading.ancien_index_eau})`,
      });
    }

    if (reading.nouvel_index_elec < reading.ancien_index_elec) {
      errors.push({
        chambre_id: room.id,
        numero_chambre: room.numero_chambre,
        message: `Erreur index elec chambre ${room.numero_chambre}: NI (${reading.nouvel_index_elec}) < AN (${reading.ancien_index_elec})`,
      });
    }
  }

  return errors;
}

export async function calculateAllInvoices(
  db: SQLiteDatabase,
  mois: string
): Promise<{ success: boolean; count: number; errors: ValidationError[] }> {
  // Validate first
  const errors = await validateBeforeCalculation(db, mois);
  if (errors.length > 0) {
    return { success: false, count: 0, errors };
  }

  const config = await db.getFirstAsync<MonthConfig>(
    'SELECT * FROM month_config WHERE mois = ?',
    [mois]
  );
  if (!config) {
    return { success: false, count: 0, errors: [{ chambre_id: 0, numero_chambre: '-', message: 'Config mois manquante' }] };
  }

  const activeRooms = await db.getAllAsync<Room>(
    'SELECT * FROM rooms WHERE actif = 1'
  );

  const readings = await db.getAllAsync<IndexReading>(
    'SELECT * FROM index_readings WHERE mois = ?',
    [mois]
  );

  // Count present rooms for surplus distribution
  const nbPresent = readings.filter(r => r.statut_presence === 'PRESENT').length;
  const surplusEauIndiv = nbPresent > 0 ? roundTwo(config.surplus_eau_total / nbPresent) : 0;
  const surplusElecIndiv = nbPresent > 0 ? roundTwo(config.surplus_elec_total / nbPresent) : 0;

  let count = 0;
  const now = new Date().toISOString();

  for (const room of activeRooms) {
    const reading = readings.find(r => r.chambre_id === room.id);
    if (!reading) continue;

    // Water calculation
    const consoEau = roundTwo(reading.nouvel_index_eau - reading.ancien_index_eau);
    const minimumFacture = config.minimum_facture ?? 500;
    const amendeEauMontant = config.amende_eau_montant ?? 3000;
    const mhtEau = consoEau > 0 ? roundTwo(consoEau * config.pu_eau) : minimumFacture;
    const tvaEau = roundTwo(mhtEau * (config.tva / 100));
    const sEau = reading.statut_presence === 'PRESENT' ? surplusEauIndiv : 0;
    const aEau = reading.amende_eau ? amendeEauMontant : 0;
    const mttcEau = roundTwo(mhtEau + tvaEau + config.lc_eau + sEau + aEau);

    // Electricity calculation
    const consoElec = roundTwo(reading.nouvel_index_elec - reading.ancien_index_elec);
    const mhtElec = consoElec > 0 ? roundTwo(consoElec * config.pu_electricite) : minimumFacture;
    const tvaElec = roundTwo(mhtElec * (config.tva / 100));
    const sElec = reading.statut_presence === 'PRESENT' ? surplusElecIndiv : 0;
    const mttcElec = roundTwo(mhtElec + tvaElec + config.lc_electricite + sElec);

    const internetFee = config.internet_fee ?? 0;
    const commonChargesPercent = config.common_charges_percent ?? 0;
    const commonCharges = commonChargesPercent > 0
      ? roundTwo((mttcEau + mttcElec) * (commonChargesPercent / 100))
      : 0;
    const penaltyMissingIndex = reading.statut_presence === 'PRESENT'
      ? 0
      : roundTwo(config.penalty_missing_index ?? 0);
    const loyer = 0;

    // Total
    const total = roundTwo(mttcEau + mttcElec + internetFee + commonCharges + penaltyMissingIndex + loyer);

    // Check if invoice exists for update (preserve dette)
    const existingInvoice = await db.getFirstAsync<Invoice>(
      'SELECT * FROM invoices WHERE chambre_id = ? AND mois = ?',
      [room.id, mois]
    );

    const dette = existingInvoice?.dette ?? null;
    const nap = roundTwo(total + (dette ?? 0));

    if (existingInvoice) {
      const invoiceExternalId = existingInvoice.external_id ?? createExternalId('invoice');
      await db.runAsync(
        `UPDATE invoices SET
          conso_eau = ?, montant_ht_eau = ?, tva_eau = ?, lc_eau = ?, surplus_eau = ?, amende_eau = ?, montant_ttc_eau = ?,
          conso_elec = ?, montant_ht_elec = ?, tva_elec = ?, lc_elec = ?, surplus_elec = ?, montant_ttc_elec = ?,
          internet_fee = ?, common_charges = ?, penalty_missing_index = ?, loyer = ?,
          dette = ?, net_a_payer = ?, calculee_le = ?, external_id = ?, updated_at = ?
        WHERE id = ?`,
        [consoEau, mhtEau, tvaEau, config.lc_eau, sEau, aEau, mttcEau,
         consoElec, mhtElec, tvaElec, config.lc_electricite, sElec, mttcElec,
         internetFee, commonCharges, penaltyMissingIndex, loyer,
         dette, nap, now, invoiceExternalId, now, existingInvoice.id]
      );
    } else {
      const externalId = createExternalId('invoice');
      await db.runAsync(
        `INSERT INTO invoices (chambre_id, mois, conso_eau, montant_ht_eau, tva_eau, lc_eau, surplus_eau, amende_eau, montant_ttc_eau,
          conso_elec, montant_ht_elec, tva_elec, lc_elec, surplus_elec, montant_ttc_elec,
          internet_fee, common_charges, penalty_missing_index, loyer,
          dette, net_a_payer, calculee_le, external_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [room.id, mois, consoEau, mhtEau, tvaEau, config.lc_eau, sEau, aEau, mttcEau,
         consoElec, mhtElec, tvaElec, config.lc_electricite, sElec, mttcElec,
         internetFee, commonCharges, penaltyMissingIndex, loyer,
         dette, nap, now, externalId, now]
      );
    }
    count++;
  }

  return { success: true, count, errors: [] };
}
