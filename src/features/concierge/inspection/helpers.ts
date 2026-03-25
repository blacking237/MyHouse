import type {
  InspectionChecklistItem,
  InspectionCounterSection,
  InspectionExtraSection,
  InspectionOccupantOption,
  InspectionSheet,
  InspectionSheetType,
  InspectionTabKey,
} from './types';
import type { ModuleTexts } from './moduleTexts';

const ROOM_ITEMS = [
  'Poignee de porte en bon etat',
  'Porte',
  'Serrure',
  'Poignee',
  'Lit',
  'Matelas',
  'Table',
  'Chaise',
  'Placard avec battant',
  'Prise de courant',
  'Prise cable TV',
  'Ampoule',
  'Grille anti-moustique sur fenetre',
  'Fenetre avec narco complet',
];

const KITCHEN_ITEMS = [
  'Meuble de rangement mural accroche au mur',
  'Meuble de rangement sous l evier / levier de cuisine',
  'Robinet de puisage en bon etat de fonctionnement',
  'Bonde levier cuisine en bon etat',
];

const BATHROOM_ITEMS = [
  'Poignee porte de douche',
  'WC en bon etat de fonctionnement',
  'Mecanisme WC en bon etat de fonctionnement',
  'WC presentant des fissures',
  'Colonne de douche en bon etat',
  'Robinet de douche en bon etat',
  'Robinet de puisage en bon etat',
  'Lave-mains',
  'Robinet de lave-mains en bon etat',
  'Miroir',
  'Ampoule',
  'Siphon de sol',
  'Fenetre avec narco complet',
  'Porte avec cles',
  'Porte avec poignee',
];

export function buildOccupationId(roomId: number | null, residentId: number | null): string {
  return `occupation-${roomId ?? 'room'}-${residentId ?? 'resident'}`;
}

export function createInspectionSheet(
  occupant: InspectionOccupantOption,
  typeEtatLieux: InspectionSheetType,
  conciergeName: string,
): InspectionSheet {
  const now = new Date().toISOString();
  return {
    id: `inspection-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    residentId: occupant.residentId,
    occupationId: occupant.occupationId,
    logementId: occupant.logementId,
    roomId: occupant.roomId,
    typeEtatLieux,
    dateEtatLieux: now.slice(0, 10),
    conciergeId: conciergeName,
    conciergeName,
    statut: 'BROUILLON',
    residentInfo: {
      fullName: occupant.residentName,
      phone: occupant.phone,
      schoolOrProfession: '',
      levelOrPosition: '',
      fatherOrGuardianName: '',
      fatherOrGuardianPhone: '',
      motherName: '',
      motherPhone: '',
      roomLabel: occupant.roomLabel,
      inspectionDate: now.slice(0, 10),
      sheetType: typeEtatLieux,
      conciergeName,
    },
    chambreItems: ROOM_ITEMS.map((label, index) => createChecklistItem(`room-${index}`, label)),
    cuisineItems: KITCHEN_ITEMS.map((label, index) => createChecklistItem(`kitchen-${index}`, label)),
    doucheItems: BATHROOM_ITEMS.map((label, index) => createChecklistItem(`bath-${index}`, label)),
    compteurs: emptyCounterSection(),
    validation: {
      generalComment: '',
      occupantName: occupant.residentName,
      conciergeName,
      occupantSigned: false,
      conciergeSigned: false,
      validatedAt: null,
    },
    extraSections: [],
    observations: '',
    createdAt: now,
    updatedAt: now,
    validatedAt: null,
    archivedAt: null,
  };
}

export function createChecklistItem(key: string, label: string): InspectionChecklistItem {
  return {
    key,
    label,
    answer: null,
    observation: '',
    degradationObserved: '',
    estimatedCost: '',
    complementaryObservation: '',
  };
}

export function emptyCounterSection(): InspectionCounterSection {
  return {
    electricityMeterType: '',
    electricityMeterIndex: '',
    electricityBreakerOk: null,
    waterMeterPresent: null,
    waterMeterIndex: '',
    waterValveOk: null,
    paintState: '',
    paintColor: '',
  };
}

export function getLatestSheet(sheets: InspectionSheet[], occupationId: string, typeEtatLieux: InspectionSheetType): InspectionSheet | null {
  return sortSheets(sheets.filter((sheet) => sheet.occupationId === occupationId && sheet.typeEtatLieux === typeEtatLieux))[0] ?? null;
}

export function getLatestActiveSheet(sheets: InspectionSheet[], occupationId: string, typeEtatLieux: InspectionSheetType): InspectionSheet | null {
  return sortSheets(sheets.filter((sheet) => sheet.occupationId === occupationId && sheet.typeEtatLieux === typeEtatLieux && sheet.statut !== 'ARCHIVEE'))[0] ?? null;
}

export function sortSheets(sheets: InspectionSheet[]): InspectionSheet[] {
  return [...sheets].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function cloneSheet(sheet: InspectionSheet): InspectionSheet {
  return JSON.parse(JSON.stringify(sheet)) as InspectionSheet;
}

export function buildTabs(draft: InspectionSheet | null, texts: ModuleTexts): Array<{ key: InspectionTabKey; label: string }> {
  const baseTabs: Array<{ key: InspectionTabKey; label: string }> = [
    { key: 'resident', label: texts.residentInfoTab },
    { key: 'room', label: texts.roomTab },
    { key: 'kitchen', label: texts.kitchenTab },
    { key: 'bathroom', label: texts.bathroomTab },
    { key: 'meters', label: texts.metersTab },
  ];
  const extraTabs = (draft?.extraSections ?? []).map((section) => ({
    key: `extra:${section.key}` as InspectionTabKey,
    label: section.title,
  }));
  return [...baseTabs, ...extraTabs, { key: 'validation', label: texts.validationTab }];
}

export function moveTab(
  tabs: Array<{ key: InspectionTabKey; label: string }>,
  activeKey: InspectionTabKey,
  direction: -1 | 1,
): InspectionTabKey {
  const index = tabs.findIndex((tab) => tab.key === activeKey);
  if (index < 0) {
    return tabs[0]?.key ?? 'resident';
  }
  const next = index + direction;
  if (next < 0 || next >= tabs.length) {
    return activeKey;
  }
  return tabs[next].key;
}

export function compareSheets(entry: InspectionSheet, exit: InspectionSheet): Array<Record<string, string>> {
  return [
    ...compareChecklistGroup('Chambre', entry.chambreItems, exit.chambreItems),
    ...compareChecklistGroup('Cuisine', entry.cuisineItems, exit.cuisineItems),
    ...compareChecklistGroup('Douche', entry.doucheItems, exit.doucheItems),
    ...entry.extraSections.flatMap((section) => {
      const exitSection = exit.extraSections.find((item) => item.key === section.key);
      return compareChecklistGroup(section.title, section.items, exitSection?.items ?? []);
    }),
    compareValueRow('Compteur elec - type', entry.compteurs.electricityMeterType || '-', exit.compteurs.electricityMeterType || '-'),
    compareValueRow('Compteur elec - index', entry.compteurs.electricityMeterIndex || '-', exit.compteurs.electricityMeterIndex || '-'),
    compareValueRow('Disjoncteur', entry.compteurs.electricityBreakerOk || '-', exit.compteurs.electricityBreakerOk || '-'),
    compareValueRow('Compteur eau present', entry.compteurs.waterMeterPresent || '-', exit.compteurs.waterMeterPresent || '-'),
    compareValueRow('Compteur eau - index', entry.compteurs.waterMeterIndex || '-', exit.compteurs.waterMeterIndex || '-'),
    compareValueRow('Vanne d arret', entry.compteurs.waterValveOk || '-', exit.compteurs.waterValveOk || '-'),
    compareValueRow('Etat peinture', entry.compteurs.paintState || '-', exit.compteurs.paintState || '-'),
    compareValueRow('Couleur peinture', entry.compteurs.paintColor || '-', exit.compteurs.paintColor || '-'),
  ];
}

export function formatChecklistState(item: InspectionChecklistItem): string {
  const base = item.answer === 'YES' ? 'Oui' : item.answer === 'NO' ? 'Non' : '-';
  return item.observation ? `${base} / ${item.observation}` : base;
}

export function renderInspectionPrintHtml(sheet: InspectionSheet, texts: ModuleTexts): string {
  const renderGroup = (title: string, items: InspectionChecklistItem[]) => `
    <section>
      <h3>${title}</h3>
      <table>
        <thead><tr><th>Element</th><th>Etat</th><th>Observation</th></tr></thead>
        <tbody>${items.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(formatChecklistState(item))}</td><td>${escapeHtml(item.observation || '-')}</td></tr>`).join('')}</tbody>
      </table>
    </section>`;
  return `
    <html>
      <head>
        <title>Etat des lieux - ${escapeHtml(sheet.residentInfo.roomLabel)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #132235; }
          h1, h2, h3 { margin: 0 0 12px; }
          .meta { margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
          th, td { border: 1px solid #d5dce4; padding: 8px; text-align: left; }
          th { background: #f6f8fb; }
        </style>
      </head>
      <body>
        <h1>${texts.title} - ${sheet.typeEtatLieux === 'ENTREE' ? texts.entrySheet : texts.exitSheet}</h1>
        <div class="meta">
          <div><strong>Resident:</strong> ${escapeHtml(sheet.residentInfo.fullName)}</div>
          <div><strong>Logement:</strong> ${escapeHtml(sheet.residentInfo.roomLabel)}</div>
          <div><strong>Date:</strong> ${escapeHtml(sheet.dateEtatLieux)}</div>
          <div><strong>Concierge:</strong> ${escapeHtml(sheet.conciergeName)}</div>
        </div>
        ${renderGroup(texts.roomSectionTitle, sheet.chambreItems)}
        ${renderGroup(texts.kitchenSectionTitle, sheet.cuisineItems)}
        ${renderGroup(texts.bathroomSectionTitle, sheet.doucheItems)}
      </body>
    </html>`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }
  try {
    return new Date(value).toLocaleString('fr-FR');
  } catch {
    return value;
  }
}

function compareChecklistGroup(prefix: string, entryItems: InspectionChecklistItem[], exitItems: InspectionChecklistItem[]) {
  return entryItems.map((entryItem) => {
    const exitItem = exitItems.find((item) => item.label === entryItem.label || item.key === entryItem.key);
    const entryState = formatChecklistState(entryItem);
    const exitState = exitItem ? formatChecklistState(exitItem) : '-';
    const extras = [exitItem?.degradationObserved, exitItem?.estimatedCost ? `cout ${exitItem.estimatedCost}` : '', exitItem?.complementaryObservation]
      .filter(Boolean)
      .join(' / ');
    return compareValueRow(`${prefix} - ${entryItem.label}`, entryState, exitState, extras);
  });
}

function compareValueRow(element: string, entry: string, exit: string, extras = ''): Record<string, string> {
  return {
    element,
    entry,
    exit,
    difference: entry === exit ? 'Aucune difference' : extras ? `Difference detectee - ${extras}` : 'Difference detectee',
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
