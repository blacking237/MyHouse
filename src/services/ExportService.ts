import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import type { Language } from '../database/PreferencesContext';
import type { Room, Invoice, IndexReading, Payment } from './InvoiceCalculationService';

interface InvoiceWithRoom extends Invoice {
  numero_chambre: string;
  nom_prenom: string;
  numero_whatsapp: string;
  ancien_index_eau: number | null;
  nouvel_index_eau: number | null;
  ancien_index_elec: number | null;
  nouvel_index_elec: number | null;
  pu_eau: number | null;
  pu_electricite: number | null;
  delai_paiement: string | null;
  total_paye: number;
  reste_a_payer: number;
}

interface PaymentWithDetails extends Payment {
  numero_chambre: string;
  nom_prenom: string;
}

const TXT = {
  fr: {
    residentsSheet: 'Residents',
    paymentsSheet: 'Paiements',
    waterSheet: 'WATER',
    lightSheet: 'LIGHT',
    recapSheet: 'RECAP',
    debtsSheet: 'DEBTS',
    room: 'ROOM',
    name: 'NAME',
    whatsapp: 'WHATSAPP',
    presence: 'PRESENCE',
    oldIndex: 'OLD INDEX',
    newIndex: 'NEW INDEX',
    conso: 'CONSO',
    pu: 'PU',
    ht: 'HORS TAX',
    tva: 'TVA',
    lc: 'L.C',
    surplus: 'SURPLUS',
    fine: 'AMENDE',
    bill: 'FACTURE',
    elec: 'ELECT',
    water: 'EAU',
    total: 'BILL',
    debt: 'DEBT',
    paid: 'PAID',
    rest: 'RESTE',
    observation: 'OBSERVATION',
    paidAmount: 'MONTANT PAYE',
    paymentDate: 'DATE PAIEMENT',
    enteredBy: 'SAISI PAR',
    monthlyInvoiceTitle: 'RECAPITULATIF FACTURES',
    waterTitle: 'EAU',
    lightTitle: 'ELECTRICITE',
    debtsTitle: 'SUIVI DES DETTES PENDANTES',
    delay: 'DELAI',
    totalRow: 'TOTAL',
    pendingDetails: 'details disponibles si besoin',
    na: 'vide',
  },
  en: {
    residentsSheet: 'Residents',
    paymentsSheet: 'Payments',
    waterSheet: 'WATER',
    lightSheet: 'LIGHT',
    recapSheet: 'RECAP',
    debtsSheet: 'DEBTS',
    room: 'ROOM',
    name: 'NAME',
    whatsapp: 'WHATSAPP',
    presence: 'PRESENCE',
    oldIndex: 'OLD INDEX',
    newIndex: 'NEW INDEX',
    conso: 'USAGE',
    pu: 'UNIT PRICE',
    ht: 'PRE-TAX',
    tva: 'VAT',
    lc: 'METER RENT',
    surplus: 'SURPLUS',
    fine: 'FINE',
    bill: 'BILL',
    elec: 'ELECT',
    water: 'WATER',
    total: 'TOTAL',
    debt: 'DEBT',
    paid: 'PAID',
    rest: 'BALANCE',
    observation: 'NOTE',
    paidAmount: 'PAID AMOUNT',
    paymentDate: 'PAYMENT DATE',
    enteredBy: 'RECORDED BY',
    monthlyInvoiceTitle: 'MONTHLY INVOICE SUMMARY',
    waterTitle: 'WATER',
    lightTitle: 'ELECTRICITY',
    debtsTitle: 'PENDING DEBTS TRACKER',
    delay: 'DEADLINE',
    totalRow: 'TOTAL',
    pendingDetails: 'details available on request',
    na: 'n/a',
  },
  es: {
    residentsSheet: 'Residentes',
    paymentsSheet: 'Pagos',
    waterSheet: 'WATER',
    lightSheet: 'LIGHT',
    recapSheet: 'RECAP',
    debtsSheet: 'DEBTS',
    room: 'ROOM',
    name: 'NAME',
    whatsapp: 'WHATSAPP',
    presence: 'PRESENCE',
    oldIndex: 'OLD INDEX',
    newIndex: 'NEW INDEX',
    conso: 'CONSUMO',
    pu: 'PRECIO UNIT',
    ht: 'BASE',
    tva: 'IVA',
    lc: 'ALQ. CONTADOR',
    surplus: 'EXCEDENTE',
    fine: 'MULTA',
    bill: 'FACTURA',
    elec: 'ELEC',
    water: 'AGUA',
    total: 'TOTAL',
    debt: 'DEUDA',
    paid: 'PAGADO',
    rest: 'SALDO',
    observation: 'OBSERVACION',
    paidAmount: 'MONTO PAGADO',
    paymentDate: 'FECHA DE PAGO',
    enteredBy: 'REGISTRADO POR',
    monthlyInvoiceTitle: 'RESUMEN MENSUAL DE FACTURAS',
    waterTitle: 'AGUA',
    lightTitle: 'ELECTRICIDAD',
    debtsTitle: 'SEGUIMIENTO DE DEUDAS',
    delay: 'PLAZO',
    totalRow: 'TOTAL',
    pendingDetails: 'detalles disponibles si es necesario',
    na: 'n/d',
  },
} as const;

function label(lang: Language, key: keyof typeof TXT.fr): string {
  return TXT[lang][key];
}

function monthLabel(mois: string, lang: Language): string {
  const fr = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months = lang === 'fr' ? fr : en;
  const [year, month] = mois.split('-');
  const idx = Math.max(0, Math.min(11, (parseInt(month, 10) || 1) - 1));
  return `${months[idx]} ${year}`;
}

function money(val: number | null | undefined): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return Math.round(val);
}

function sheetFromRows(rows: (string | number)[][], colWidths: number[], titleMergeTo: number): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: titleMergeTo } });
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: 1, c: titleMergeTo } }) };
  return ws;
}

function applySimpleStyles(
  ws: XLSX.WorkSheet,
  headerCols: number,
  totalRow: number,
  accentHex: string
): void {
  const styleTitle = {
    font: { bold: true, sz: 13, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: accentHex } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleHeader = {
    font: { bold: true, color: { rgb: 'FF0B1E39' } },
    fill: { fgColor: { rgb: 'FFE9EEF8' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleTotal = {
    font: { bold: true, color: { rgb: 'FF0B1E39' } },
    fill: { fgColor: { rgb: 'FFFDE9A9' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })] as XLSX.CellObject & { s?: unknown };
  if (titleCell) titleCell.s = styleTitle;

  for (let c = 0; c <= headerCols; c++) {
    const hAddr = XLSX.utils.encode_cell({ r: 1, c });
    const hCell = ws[hAddr] as XLSX.CellObject & { s?: unknown };
    if (hCell) hCell.s = styleHeader;

    const tAddr = XLSX.utils.encode_cell({ r: totalRow, c });
    const tCell = ws[tAddr] as XLSX.CellObject & { s?: unknown };
    if (tCell) tCell.s = styleTotal;
  }
}

async function fetchMonthRows(db: SQLiteDatabase, mois: string): Promise<InvoiceWithRoom[]> {
  return db.getAllAsync<InvoiceWithRoom>(
    `SELECT i.*, r.numero_chambre, r.nom_prenom, r.numero_whatsapp,
            ir.ancien_index_eau, ir.nouvel_index_eau, ir.ancien_index_elec, ir.nouvel_index_elec,
            mc.pu_eau, mc.pu_electricite, mc.delai_paiement,
            COALESCE(ps.total_paye, 0) AS total_paye,
            (i.net_a_payer - COALESCE(ps.total_paye, 0)) AS reste_a_payer
     FROM invoices i
     JOIN rooms r ON i.chambre_id = r.id
     LEFT JOIN index_readings ir ON ir.chambre_id = i.chambre_id AND ir.mois = i.mois
     LEFT JOIN month_config mc ON mc.mois = i.mois
     LEFT JOIN (
       SELECT p.facture_id, SUM(p.montant_paye) AS total_paye
       FROM payments p
       GROUP BY p.facture_id
     ) ps ON ps.facture_id = i.id
     WHERE i.mois = ?
     ORDER BY r.numero_chambre`,
    [mois]
  );
}

function buildWaterSheet(rows: InvoiceWithRoom[], mois: string, lang: Language): XLSX.WorkSheet {
  const t = (k: keyof typeof TXT.fr) => label(lang, k);
  const title = `${t('waterTitle')} ${monthLabel(mois, lang).toUpperCase()}`;
  const aoa: (string | number)[][] = [
    [title],
    [t('room'), t('name'), t('oldIndex'), t('newIndex'), t('conso'), t('pu'), t('ht'), t('tva'), t('lc'), t('surplus'), t('fine'), t('bill')],
  ];

  let totalConso = 0;
  let totalHt = 0;
  let totalTva = 0;
  let totalLc = 0;
  let totalSurplus = 0;
  let totalFine = 0;
  let totalBill = 0;

  rows.forEach(r => {
    totalConso += money(r.conso_eau);
    totalHt += money(r.montant_ht_eau);
    totalTva += money(r.tva_eau);
    totalLc += money(r.lc_eau);
    totalSurplus += money(r.surplus_eau);
    totalFine += money(r.amende_eau);
    totalBill += money(r.montant_ttc_eau);
    aoa.push([
      r.numero_chambre,
      r.nom_prenom,
      money(r.ancien_index_eau),
      money(r.nouvel_index_eau),
      money(r.conso_eau),
      money(r.pu_eau),
      money(r.montant_ht_eau),
      money(r.tva_eau),
      money(r.lc_eau),
      money(r.surplus_eau),
      money(r.amende_eau),
      money(r.montant_ttc_eau),
    ]);
  });

  aoa.push([t('totalRow'), '', '', '', totalConso, '', totalHt, totalTva, totalLc, totalSurplus, totalFine, totalBill]);
  const ws = sheetFromRows(aoa, [7, 24, 10, 10, 8, 8, 10, 10, 10, 10, 10, 11], 11);
  applySimpleStyles(ws, 11, aoa.length - 1, 'FF2B6CB0');
  return ws;
}

function buildLightSheet(rows: InvoiceWithRoom[], mois: string, lang: Language): XLSX.WorkSheet {
  const t = (k: keyof typeof TXT.fr) => label(lang, k);
  const title = `${t('lightTitle')} ${monthLabel(mois, lang).toUpperCase()}`;
  const aoa: (string | number)[][] = [
    [title],
    [t('room'), t('name'), t('oldIndex'), t('newIndex'), t('conso'), t('pu'), t('ht'), t('tva'), t('lc'), t('surplus'), t('bill')],
  ];

  let totalConso = 0;
  let totalHt = 0;
  let totalTva = 0;
  let totalLc = 0;
  let totalSurplus = 0;
  let totalBill = 0;

  rows.forEach(r => {
    totalConso += money(r.conso_elec);
    totalHt += money(r.montant_ht_elec);
    totalTva += money(r.tva_elec);
    totalLc += money(r.lc_elec);
    totalSurplus += money(r.surplus_elec);
    totalBill += money(r.montant_ttc_elec);
    aoa.push([
      r.numero_chambre,
      r.nom_prenom,
      money(r.ancien_index_elec),
      money(r.nouvel_index_elec),
      money(r.conso_elec),
      money(r.pu_electricite),
      money(r.montant_ht_elec),
      money(r.tva_elec),
      money(r.lc_elec),
      money(r.surplus_elec),
      money(r.montant_ttc_elec),
    ]);
  });

  aoa.push([t('totalRow'), '', '', '', totalConso, '', totalHt, totalTva, totalLc, totalSurplus, totalBill]);
  const ws = sheetFromRows(aoa, [7, 24, 10, 10, 8, 10, 10, 10, 10, 10, 11], 10);
  applySimpleStyles(ws, 10, aoa.length - 1, 'FF1E8E3E');
  return ws;
}

function buildRecapSheet(rows: InvoiceWithRoom[], mois: string, lang: Language): XLSX.WorkSheet {
  const t = (k: keyof typeof TXT.fr) => label(lang, k);
  const title = `${t('monthlyInvoiceTitle')} ${monthLabel(mois, lang).toUpperCase()}`;
  const aoa: (string | number)[][] = [
    [title],
    [t('room'), t('name'), t('elec'), t('water'), t('total'), t('debt'), t('paid'), t('rest'), t('observation'), t('delay')],
  ];

  let totalElec = 0;
  let totalWater = 0;
  let totalBill = 0;
  let totalDebt = 0;
  let totalPaid = 0;
  let totalRest = 0;

  rows.forEach(r => {
    const total = money(r.montant_ttc_eau) + money(r.montant_ttc_elec);
    const debt = money(r.dette);
    const paid = money(r.total_paye);
    const rest = money(r.reste_a_payer);
    totalElec += money(r.montant_ttc_elec);
    totalWater += money(r.montant_ttc_eau);
    totalBill += total;
    totalDebt += debt;
    totalPaid += paid;
    totalRest += rest;
    aoa.push([
      r.numero_chambre,
      r.nom_prenom,
      money(r.montant_ttc_elec),
      money(r.montant_ttc_eau),
      total,
      debt,
      paid,
      rest,
      rest > 0 ? t('pendingDetails') : t('na'),
      r.delai_paiement ?? '',
    ]);
  });

  aoa.push([t('totalRow'), '', totalElec, totalWater, totalBill, totalDebt, totalPaid, totalRest, '', '']);
  const ws = sheetFromRows(aoa, [7, 24, 10, 10, 10, 10, 10, 10, 24, 16], 9);
  applySimpleStyles(ws, 9, aoa.length - 1, 'FF2B6CB0');
  return ws;
}

async function buildDebtsSheet(db: SQLiteDatabase, lang: Language): Promise<XLSX.WorkSheet> {
  const t = (k: keyof typeof TXT.fr) => label(lang, k);
  const monthsRes = await db.getAllAsync<{ mois: string }>(
    'SELECT DISTINCT mois FROM invoices ORDER BY mois DESC LIMIT 12'
  );
  const months = monthsRes.map(m => m.mois).reverse();

  const rows = await db.getAllAsync<{
    numero_chambre: string;
    nom_prenom: string;
    mois: string;
    net_a_payer: number;
    total_paye: number;
  }>(
    `SELECT r.numero_chambre, r.nom_prenom, i.mois, i.net_a_payer, COALESCE(SUM(p.montant_paye), 0) AS total_paye
     FROM invoices i
     JOIN rooms r ON r.id = i.chambre_id
     LEFT JOIN payments p ON p.facture_id = i.id
     GROUP BY i.id
     ORDER BY r.numero_chambre, i.mois`
  );

  const roomMap = new Map<string, { room: string; name: string; byMonth: Record<string, number> }>();
  rows.forEach(r => {
    const key = r.numero_chambre;
    if (!roomMap.has(key)) {
      roomMap.set(key, { room: r.numero_chambre, name: r.nom_prenom, byMonth: {} });
    }
    const rest = money(r.net_a_payer) - money(r.total_paye);
    roomMap.get(key)!.byMonth[r.mois] = rest;
  });

  const aoa: (string | number)[][] = [
    [t('debtsTitle')],
    [t('room'), t('name'), ...months, t('total')],
  ];

  const monthTotals: Record<string, number> = {};
  months.forEach(m => { monthTotals[m] = 0; });
  let global = 0;

  Array.from(roomMap.values()).forEach(r => {
    const row: (string | number)[] = [r.room, r.name];
    let total = 0;
    months.forEach(m => {
      const v = money(r.byMonth[m] ?? 0);
      row.push(v);
      total += v;
      monthTotals[m] += v;
    });
    row.push(total);
    global += total;
    aoa.push(row);
  });

  aoa.push([t('totalRow'), '', ...months.map(m => monthTotals[m]), global]);
  const ws = sheetFromRows(aoa, [7, 24, ...months.map(() => 10), 12], months.length + 2);
  applySimpleStyles(ws, months.length + 2, aoa.length - 1, 'FF6B7280');
  return ws;
}

async function shareWorkbook(wb: XLSX.WorkBook, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    const output = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    return;
  }

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filePath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(filePath);
}

export async function exportResidents(db: SQLiteDatabase, mois: string, lang: Language = 'fr'): Promise<void> {
  const readings = await db.getAllAsync<IndexReading & { numero_chambre: string; nom_prenom: string; numero_whatsapp: string }>(
    `SELECT ir.*, r.numero_chambre, r.nom_prenom, r.numero_whatsapp
     FROM index_readings ir
     JOIN rooms r ON ir.chambre_id = r.id
     WHERE ir.mois = ?
     ORDER BY r.numero_chambre`,
    [mois]
  );
  const rooms = await db.getAllAsync<Room>('SELECT * FROM rooms WHERE actif = 1 ORDER BY numero_chambre');
  const t = (k: keyof typeof TXT.fr) => label(lang, k);

  const aoa: (string | number)[][] = [
    [`${t('residentsSheet').toUpperCase()} - ${monthLabel(mois, lang).toUpperCase()}`],
    [t('room'), t('name'), t('whatsapp'), t('presence')],
  ];

  rooms.forEach(room => {
    const reading = readings.find(r => r.chambre_id === room.id);
    aoa.push([
      room.numero_chambre,
      room.nom_prenom,
      room.numero_whatsapp,
      reading?.statut_presence ?? label(lang, 'na'),
    ]);
  });
  aoa.push([t('totalRow'), rooms.length, '', '']);

  const ws = sheetFromRows(aoa, [8, 30, 18, 14], 3);
  applySimpleStyles(ws, 3, aoa.length - 1, 'FF2B6CB0');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('residentsSheet'));
  await shareWorkbook(wb, `residents_${mois}.xlsx`);
}

export async function exportInvoices(db: SQLiteDatabase, mois: string, lang: Language = 'fr'): Promise<void> {
  const rows = await fetchMonthRows(db, mois);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildWaterSheet(rows, mois, lang), label(lang, 'waterSheet'));
  XLSX.utils.book_append_sheet(wb, buildLightSheet(rows, mois, lang), label(lang, 'lightSheet'));
  XLSX.utils.book_append_sheet(wb, buildRecapSheet(rows, mois, lang), label(lang, 'recapSheet'));
  await shareWorkbook(wb, `factures_${mois}.xlsx`);
}

export async function exportPayments(db: SQLiteDatabase, mois: string, lang: Language = 'fr'): Promise<void> {
  const payments = await db.getAllAsync<PaymentWithDetails>(
    `SELECT p.*, r.numero_chambre, r.nom_prenom
     FROM payments p
     JOIN invoices i ON p.facture_id = i.id
     JOIN rooms r ON i.chambre_id = r.id
     WHERE i.mois = ?
     ORDER BY r.numero_chambre`,
    [mois]
  );
  const t = (k: keyof typeof TXT.fr) => label(lang, k);
  const aoa: (string | number)[][] = [
    [`${t('paymentsSheet').toUpperCase()} - ${monthLabel(mois, lang).toUpperCase()}`],
    [t('room'), t('name'), t('paymentDate'), t('paidAmount'), t('observation'), t('enteredBy')],
  ];
  let total = 0;
  payments.forEach(pay => {
    total += money(pay.montant_paye);
    aoa.push([
      pay.numero_chambre,
      pay.nom_prenom,
      pay.date_paiement,
      money(pay.montant_paye),
      pay.observation ?? '',
      pay.saisi_par,
    ]);
  });
  aoa.push([t('totalRow'), '', '', total, '', '']);

  const ws = sheetFromRows(aoa, [8, 28, 18, 12, 24, 14], 5);
  applySimpleStyles(ws, 5, aoa.length - 1, 'FF1E8E3E');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('paymentsSheet'));
  await shareWorkbook(wb, `paiements_${mois}.xlsx`);
}

export async function exportComplet(db: SQLiteDatabase, mois: string, lang: Language = 'fr'): Promise<void> {
  const rows = await fetchMonthRows(db, mois);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildWaterSheet(rows, mois, lang), label(lang, 'waterSheet'));
  XLSX.utils.book_append_sheet(wb, buildLightSheet(rows, mois, lang), label(lang, 'lightSheet'));
  XLSX.utils.book_append_sheet(wb, buildRecapSheet(rows, mois, lang), label(lang, 'recapSheet'));
  XLSX.utils.book_append_sheet(wb, await buildDebtsSheet(db, lang), label(lang, 'debtsSheet'));
  await shareWorkbook(wb, `export_complet_${mois}.xlsx`);
}
