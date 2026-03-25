export type InspectionSheetType = 'ENTREE' | 'SORTIE';

export type InspectionSheetStatus = 'BROUILLON' | 'VALIDEE' | 'ARCHIVEE';

export type InspectionYesNo = 'YES' | 'NO' | null;

export type InspectionTabKey =
  | 'resident'
  | 'room'
  | 'kitchen'
  | 'bathroom'
  | 'meters'
  | 'validation'
  | `extra:${string}`;

export type InspectionResidentInfo = {
  fullName: string;
  phone: string;
  schoolOrProfession: string;
  levelOrPosition: string;
  fatherOrGuardianName: string;
  fatherOrGuardianPhone: string;
  motherName: string;
  motherPhone: string;
  roomLabel: string;
  inspectionDate: string;
  sheetType: InspectionSheetType;
  conciergeName: string;
};

export type InspectionChecklistItem = {
  key: string;
  label: string;
  answer: InspectionYesNo;
  observation: string;
  degradationObserved?: string;
  estimatedCost?: string;
  complementaryObservation?: string;
};

export type InspectionCounterSection = {
  electricityMeterType: 'MECANIQUE' | 'ELECTRONIQUE' | '';
  electricityMeterIndex: string;
  electricityBreakerOk: InspectionYesNo;
  waterMeterPresent: InspectionYesNo;
  waterMeterIndex: string;
  waterValveOk: InspectionYesNo;
  paintState: 'BONNE' | 'MAUVAISE' | '';
  paintColor: string;
};

export type InspectionValidationSection = {
  generalComment: string;
  occupantName: string;
  conciergeName: string;
  occupantSigned: boolean;
  conciergeSigned: boolean;
  validatedAt: string | null;
};

export type InspectionExtraSection = {
  key: string;
  title: string;
  items: InspectionChecklistItem[];
};

export type InspectionSheet = {
  id: string;
  residentId: number | null;
  occupationId: string;
  logementId: number | null;
  roomId: number | null;
  typeEtatLieux: InspectionSheetType;
  dateEtatLieux: string;
  conciergeId: string;
  conciergeName: string;
  statut: InspectionSheetStatus;
  residentInfo: InspectionResidentInfo;
  chambreItems: InspectionChecklistItem[];
  cuisineItems: InspectionChecklistItem[];
  doucheItems: InspectionChecklistItem[];
  compteurs: InspectionCounterSection;
  validation: InspectionValidationSection;
  extraSections: InspectionExtraSection[];
  observations: string;
  createdAt: string;
  updatedAt: string;
  validatedAt: string | null;
  archivedAt: string | null;
};

export type InspectionOccupantOption = {
  occupationId: string;
  residentId: number | null;
  logementId: number | null;
  roomId: number | null;
  residentName: string;
  phone: string;
  roomLabel: string;
};

export type InspectionSheetSummary = {
  id: string;
  occupationId: string;
  residentName: string;
  roomLabel: string;
  phone: string;
  entryStatus: string;
  exitStatus: string;
  activeDraftId: string | null;
};
