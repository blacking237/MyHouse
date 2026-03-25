import type { Language } from '../../../database/PreferencesContext';

export type ModuleTexts = {
  title: string;
  subtitle: string;
  inspectionMenu: string;
  comparisonMenu: string;
  profileMenu: string;
  profileDescription: string;
  roomsMenu: string;
  metertrackMenu: string;
  maintenanceMenu: string;
  mainMetersMenu: string;
  settingsMenu: string;
  listTitle: string;
  listDescription: string;
  createTitle: string;
  residentChoice: string;
  sheetType: string;
  entrySheet: string;
  exitSheet: string;
  createSheet: string;
  noSheet: string;
  entryNotCreated: string;
  entryInProgress: string;
  entryValidated: string;
  exitNotCreated: string;
  exitInProgress: string;
  exitValidated: string;
  residentInfoTab: string;
  roomTab: string;
  kitchenTab: string;
  bathroomTab: string;
  metersTab: string;
  validationTab: string;
  optionalSectionTitle: string;
  addSectionAction: string;
  addItemAction: string;
  itemLabelPlaceholder: string;
  roomSectionTitle: string;
  kitchenSectionTitle: string;
  bathroomSectionTitle: string;
  metersSectionTitle: string;
  validationSectionTitle: string;
  comparisonTitle: string;
  comparisonDescription: string;
  entryState: string;
  exitState: string;
  difference: string;
  noComparison: string;
  yes: string;
  no: string;
  observation: string;
  residentPhone: string;
  residentName: string;
  schoolOrProfession: string;
  levelOrPosition: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  roomOrHousing: string;
  inspectionDate: string;
  conciergeName: string;
  generalComment: string;
  occupantName: string;
  occupantSignature: string;
  conciergeSignature: string;
  occupantSignatureCheck: string;
  conciergeSignatureCheck: string;
  validationDateTime: string;
  saveDraft: string;
  validateSheet: string;
  archiveSheet: string;
  exportPdf: string;
  previous: string;
  next: string;
  autoSave: string;
  duplicateBlocked: string;
  draftSaved: string;
  sheetValidated: string;
  sheetArchived: string;
  requiredValidation: string;
  exportReady: string;
  addMissingOptions: string;
  electricityMeter: string;
  mechanical: string;
  electronic: string;
  meterIndex: string;
  breakerOk: string;
  waterMeter: string;
  waterPresent: string;
  waterValveOk: string;
  paintState: string;
  paintColor: string;
  paintGood: string;
  paintBad: string;
  dashboardOccupants: string;
  dashboardDrafts: string;
  dashboardValidated: string;
  dashboardExitPending: string;
  dashboardBulletOne: string;
  dashboardBulletTwo: string;
  dashboardBulletThree: string;
  selectSheetHint: string;
  summaryTitle: string;
  summaryType: string;
  summaryStatus: string;
  summaryUpdatedAt: string;
  comparisonSelector: string;
  noOccupantFound: string;
  degradationObserved: string;
  estimatedCost: string;
  complementaryObservation: string;
  profilePhoto: string;
  uploadPhoto: string;
  fullName: string;
  cniNumber: string;
  cniPhoto: string;
  uploadCni: string;
  birthDate: string;
  birthPlace: string;
  whatsappNumber: string;
  phoneNumber: string;
  sponsorName: string;
  sponsorPhone: string;
  educationLevel: string;
  educationField: string;
  cvUpload: string;
  uploadCv: string;
  saveProfile: string;
  profileSaved: string;
  fileSelected: string;
  maintenanceDescription: string;
  maintenanceRoomLabel: string;
  maintenanceIssueLabel: string;
  maintenanceResponsibilityLabel: string;
  maintenanceStatusLabel: string;
  maintenanceCostLabel: string;
  addMaintenance: string;
  fillRequiredFields: string;
  maintenanceSaved: string;
  noMaintenance: string;
  statusOpen: string;
  statusInProgress: string;
  statusResolved: string;
  responsibilityResident: string;
  responsibilityManager: string;
  responsibilityUnknown: string;
  roomsLabelShort: string;
  mainMetersDescription: string;
  meterDate: string;
  mainWaterIndex: string;
  mainElectricIndex: string;
  vendorWaterBill: string;
  vendorElectricBill: string;
  saveMainMeter: string;
  mainMetersSummary: string;
  mainMetersSummaryHint: string;
  dailyConsumption: string;
  weeklyConsumption: string;
  monthlyConsumption: string;
  yearlyConsumption: string;
  expectedBills: string;
  mainMetersTable: string;
  waterConsumption: string;
  electricConsumption: string;
  expectedWaterBill: string;
  expectedElectricBill: string;
  deltaBill: string;
  noMainMeters: string;
  noteOptional: string;
  mainMeterSaved: string;
  mainMeterUpdated: string;
  duplicateDate: string;
  editWindowClosed: string;
  updateMainMeter: string;
  monthlyRecapTitle: string;
  monthlyRecapDescription: string;
  recapLabel: string;
  recapConsumption: string;
  recapExpected: string;
  recapWater: string;
  recapElectric: string;
  recapTotal: string;
};

export const MODULE_TEXTS: Record<Language, ModuleTexts> = {
  fr: {
    title: 'Etat des lieux',
    subtitle: 'Creation, suivi, validation et comparaison des fiches d entree et de sortie pour chaque occupation.',
    inspectionMenu: 'Etat des lieux',
    comparisonMenu: 'Comparatif',
    profileMenu: 'Profil',
    profileDescription: 'Identite et informations administratives du concierge.',
    roomsMenu: 'Chambres',
    metertrackMenu: 'MeterTrack',
    maintenanceMenu: 'Maintenance',
    mainMetersMenu: 'Compteurs principaux',
    settingsMenu: 'Parametres',
    listTitle: 'Occupants et statuts',
    listDescription: 'Liste des residents / occupants et suivi de leurs fiches d entree et de sortie.',
    createTitle: 'Nouvelle fiche',
    residentChoice: 'Resident / occupant',
    sheetType: 'Type de fiche',
    entrySheet: 'Entree',
    exitSheet: 'Sortie',
    createSheet: 'Creer la fiche',
    noSheet: 'Aucune fiche selectionnee. Choisissez un occupant ou creez une nouvelle fiche.',
    entryNotCreated: 'Entree non creee',
    entryInProgress: 'Entree en cours',
    entryValidated: 'Entree validee',
    exitNotCreated: 'Sortie non creee',
    exitInProgress: 'Sortie en cours',
    exitValidated: 'Sortie validee',
    residentInfoTab: 'Informations resident',
    roomTab: 'Chambre',
    kitchenTab: 'Cuisine',
    bathroomTab: 'Douche',
    metersTab: 'Compteurs',
    validationTab: 'Validation',
    optionalSectionTitle: 'Nom de la section',
    addSectionAction: 'Ajouter l onglet',
    addItemAction: 'Ajouter un element',
    itemLabelPlaceholder: 'Libelle de l element',
    roomSectionTitle: 'Controle chambre',
    kitchenSectionTitle: 'Controle cuisine',
    bathroomSectionTitle: 'Controle douche',
    metersSectionTitle: 'Compteurs et peinture',
    validationSectionTitle: 'Recapitulatif avant validation finale',
    comparisonTitle: 'Comparatif entree / sortie',
    comparisonDescription: 'Detection des differences entre la fiche d entree et la fiche de sortie d une meme occupation.',
    entryState: 'Etat entree',
    exitState: 'Etat sortie',
    difference: 'Difference detectee',
    noComparison: 'Aucun comparatif disponible. Il faut une fiche entree et une fiche sortie.',
    yes: 'Oui',
    no: 'Non',
    observation: 'Observation',
    residentPhone: 'Telephone',
    residentName: 'Nom du resident',
    schoolOrProfession: 'Ecole frequentee / profession',
    levelOrPosition: 'Niveau / poste occupe',
    fatherName: 'Nom du pere ou tuteur',
    fatherPhone: 'Telephone du pere ou tuteur',
    motherName: 'Nom de la mere',
    motherPhone: 'Telephone de la mere',
    roomOrHousing: 'Chambre / logement',
    inspectionDate: 'Date de l etat des lieux',
    conciergeName: 'Nom du concierge connecte',
    generalComment: 'Commentaire general du concierge',
    occupantName: 'Nom de l occupant',
    occupantSignature: 'Signature occupant',
    conciergeSignature: 'Signature concierge',
    occupantSignatureCheck: 'Je confirme la signature de l occupant',
    conciergeSignatureCheck: 'Je confirme ma signature',
    validationDateTime: 'Date et heure de validation',
    saveDraft: 'Enregistrer brouillon',
    validateSheet: 'Valider la fiche',
    archiveSheet: 'Archiver la fiche',
    exportPdf: 'Imprimer / Exporter PDF',
    previous: 'Precedent',
    next: 'Suivant',
    autoSave: 'Sauvegarde auto',
    duplicateBlocked: 'Une fiche active du meme type existe deja pour cette occupation.',
    draftSaved: 'Brouillon enregistre.',
    sheetValidated: 'Fiche validee.',
    sheetArchived: 'Fiche archivee.',
    requiredValidation: 'Les signatures occupant et concierge doivent etre confirmees pour valider.',
    exportReady: 'La fiche est prete pour l impression PDF.',
    addMissingOptions: 'Ajouter des options manquantes',
    electricityMeter: 'Compteur divisionnaire d electricite',
    mechanical: 'Mecanique',
    electronic: 'Electronique',
    meterIndex: 'Index',
    breakerOk: 'Disjoncteur en bon etat',
    waterMeter: 'Compteur divisionnaire d eau',
    waterPresent: 'Compteur present',
    waterValveOk: 'Vanne d arret en bon etat',
    paintState: 'Etat peinture',
    paintColor: 'Couleur initiale de la peinture',
    paintGood: 'Bonne',
    paintBad: 'Mauvaise',
    dashboardOccupants: 'Occupations suivies',
    dashboardDrafts: 'Fiches brouillon',
    dashboardValidated: 'Fiches validees',
    dashboardExitPending: 'Sorties a preparer',
    dashboardBulletOne: 'Une seule fiche entree active et une seule fiche sortie active par occupation.',
    dashboardBulletTwo: 'Le concierge peut preparer des brouillons et revenir plus tard avant validation.',
    dashboardBulletThree: 'Les fiches valides sont ensuite exportables et comparables.',
    selectSheetHint: 'Choisissez un occupant et un type de fiche pour commencer.',
    summaryTitle: 'Recapitulatif',
    summaryType: 'Type',
    summaryStatus: 'Statut',
    summaryUpdatedAt: 'Derniere mise a jour',
    comparisonSelector: 'Choisir une occupation a comparer',
    noOccupantFound: 'Occupant non renseigne',
    degradationObserved: 'Degradation observee',
    estimatedCost: 'Cout estime',
    complementaryObservation: 'Observation complementaire',
    profilePhoto: 'Photo de profil',
    uploadPhoto: 'Uploader une photo',
    fullName: 'Nom complet',
    cniNumber: 'Numero CNI',
    cniPhoto: 'Photo CNI',
    uploadCni: 'Uploader la CNI',
    birthDate: 'Date de naissance',
    birthPlace: 'Lieu de naissance',
    whatsappNumber: 'Numero WhatsApp',
    phoneNumber: 'Numero d appel',
    sponsorName: 'Nom du parrain',
    sponsorPhone: 'Numero du parrain',
    educationLevel: 'Niveau d etude',
    educationField: 'Filiere d etude',
    cvUpload: 'CV',
    uploadCv: 'Uploader le CV',
    saveProfile: 'Enregistrer le profil',
    profileSaved: 'Profil enregistre.',
    fileSelected: 'Fichier charge',
    maintenanceDescription: 'Signalements des residents, transmission et suivi des reparations.',
    maintenanceRoomLabel: 'Chambre concernee',
    maintenanceIssueLabel: 'Signalement / panne',
    maintenanceResponsibilityLabel: 'Responsabilite',
    maintenanceStatusLabel: 'Statut',
    maintenanceCostLabel: 'Cout estime (FCFA)',
    addMaintenance: 'Ajouter le signalement',
    fillRequiredFields: 'Veuillez renseigner les champs obligatoires.',
    maintenanceSaved: 'Signalement enregistre.',
    noMaintenance: 'Aucun signalement.',
    statusOpen: 'Ouvert',
    statusInProgress: 'En cours',
    statusResolved: 'Resolue',
    responsibilityResident: 'Resident',
    responsibilityManager: 'Gestionnaire',
    responsibilityUnknown: 'Inconnu',
    roomsLabelShort: 'Chambre',
    mainMetersDescription: 'Suivi journalier des index des compteurs principaux.',
    meterDate: 'Date',
    mainWaterIndex: 'Index eau',
    mainElectricIndex: 'Index electricite',
    vendorWaterBill: 'Facture eau concessionnaire',
    vendorElectricBill: 'Facture electricite concessionnaire',
    saveMainMeter: 'Enregistrer l index',
    mainMetersSummary: 'Synthese des consommations',
    mainMetersSummaryHint: 'Consommations calculees et factures attendues.',
    dailyConsumption: 'Conso journaliere',
    weeklyConsumption: 'Conso hebdomadaire',
    monthlyConsumption: 'Conso mensuelle',
    yearlyConsumption: 'Conso annuelle',
    expectedBills: 'Facture attendue',
    mainMetersTable: 'Historique des index',
    waterConsumption: 'Conso eau',
    electricConsumption: 'Conso elec',
    expectedWaterBill: 'Facture eau attendue',
    expectedElectricBill: 'Facture elec attendue',
    deltaBill: 'Ecart facture',
    noMainMeters: 'Aucun relevé des compteurs principaux.',
    noteOptional: 'Observation (optionnel)',
    mainMeterSaved: 'Releve enregistre.',
    mainMeterUpdated: 'Releve mis a jour.',
    duplicateDate: 'Cette date existe deja. Choisissez une autre date.',
    editWindowClosed: 'Modification impossible apres 24h.',
    updateMainMeter: 'Mettre a jour',
    monthlyRecapTitle: 'Recapitulatif mensuel',
    monthlyRecapDescription: 'Total des consommations et factures attendues du mois.',
    recapLabel: 'Libelle',
    recapConsumption: 'Consommation',
    recapExpected: 'Montant attendu',
    recapWater: 'Eau',
    recapElectric: 'Electricite',
    recapTotal: 'Total',
  },
  en: {
    title: 'Inventory report',
    subtitle: 'Create, review, validate and compare move-in and move-out sheets for each occupancy.',
    inspectionMenu: 'Inventory report',
    comparisonMenu: 'Comparison',
    profileMenu: 'Profile',
    profileDescription: 'Identity and administrative information for the concierge.',
    roomsMenu: 'Rooms',
    metertrackMenu: 'MeterTrack',
    maintenanceMenu: 'Maintenance',
    mainMetersMenu: 'Main meters',
    settingsMenu: 'Settings',
    listTitle: 'Occupants and statuses',
    listDescription: 'Residents / occupants list with move-in and move-out status tracking.',
    createTitle: 'New sheet',
    residentChoice: 'Resident / occupant',
    sheetType: 'Sheet type',
    entrySheet: 'Move-in',
    exitSheet: 'Move-out',
    createSheet: 'Create sheet',
    noSheet: 'No sheet selected yet. Choose an occupant or create a new one.',
    entryNotCreated: 'Move-in not created',
    entryInProgress: 'Move-in in progress',
    entryValidated: 'Move-in validated',
    exitNotCreated: 'Move-out not created',
    exitInProgress: 'Move-out in progress',
    exitValidated: 'Move-out validated',
    residentInfoTab: 'Resident information',
    roomTab: 'Room',
    kitchenTab: 'Kitchen',
    bathroomTab: 'Bathroom',
    metersTab: 'Meters',
    validationTab: 'Validation',
    optionalSectionTitle: 'Section name',
    addSectionAction: 'Add tab',
    addItemAction: 'Add item',
    itemLabelPlaceholder: 'Item label',
    roomSectionTitle: 'Room checklist',
    kitchenSectionTitle: 'Kitchen checklist',
    bathroomSectionTitle: 'Bathroom checklist',
    metersSectionTitle: 'Meters and paint',
    validationSectionTitle: 'Final review before validation',
    comparisonTitle: 'Move-in vs move-out comparison',
    comparisonDescription: 'Detect differences between move-in and move-out sheets for the same occupancy.',
    entryState: 'Move-in state',
    exitState: 'Move-out state',
    difference: 'Difference',
    noComparison: 'No comparison available yet. You need both a move-in and a move-out sheet.',
    yes: 'Yes',
    no: 'No',
    observation: 'Observation',
    residentPhone: 'Phone',
    residentName: 'Resident name',
    schoolOrProfession: 'School / profession',
    levelOrPosition: 'Level / role',
    fatherName: 'Father or guardian name',
    fatherPhone: 'Father or guardian phone',
    motherName: 'Mother name',
    motherPhone: 'Mother phone',
    roomOrHousing: 'Room / housing',
    inspectionDate: 'Inventory date',
    conciergeName: 'Logged-in concierge',
    generalComment: 'General concierge comment',
    occupantName: 'Occupant name',
    occupantSignature: 'Occupant signature',
    conciergeSignature: 'Concierge signature',
    occupantSignatureCheck: 'I confirm the occupant signature',
    conciergeSignatureCheck: 'I confirm my signature',
    validationDateTime: 'Validation date and time',
    saveDraft: 'Enregistrer le brouillon',
    validateSheet: 'Validate sheet',
    archiveSheet: 'Archive sheet',
    exportPdf: 'Print / Export PDF',
    previous: 'Previous',
    next: 'Next',
    autoSave: 'Auto-save',
    duplicateBlocked: 'An active sheet of the same type already exists for this occupancy.',
    draftSaved: 'Draft saved.',
    sheetValidated: 'Sheet validated.',
    sheetArchived: 'Sheet archived.',
    requiredValidation: 'Occupant and concierge signatures must be confirmed to validate.',
    exportReady: 'The sheet is ready for PDF printing.',
    addMissingOptions: 'Add missing options',
    electricityMeter: 'Electricity sub-meter',
    mechanical: 'Mechanical',
    electronic: 'Electronic',
    meterIndex: 'Index',
    breakerOk: 'Breaker in good condition',
    waterMeter: 'Water sub-meter',
    waterPresent: 'Meter present',
    waterValveOk: 'Shut-off valve in good condition',
    paintState: 'Paint condition',
    paintColor: 'Initial paint color',
    paintGood: 'Good',
    paintBad: 'Poor',
    dashboardOccupants: 'Tracked occupancies',
    dashboardDrafts: 'Draft sheets',
    dashboardValidated: 'Validated sheets',
    dashboardExitPending: 'Pending move-outs',
    dashboardBulletOne: 'Only one active move-in sheet and one active move-out sheet are allowed per occupancy.',
    dashboardBulletTwo: 'The concierge can save drafts and return later before final validation.',
    dashboardBulletThree: 'Validated sheets can then be exported and compared.',
    selectSheetHint: 'Pick an occupant and a sheet type to begin.',
    summaryTitle: 'Summary',
    summaryType: 'Type',
    summaryStatus: 'Status',
    summaryUpdatedAt: 'Last updated',
    comparisonSelector: 'Choose an occupancy to compare',
    noOccupantFound: 'Occupant not set',
    degradationObserved: 'Observed damage',
    estimatedCost: 'Estimated cost',
    complementaryObservation: 'Additional note',
    profilePhoto: 'Profile photo',
    uploadPhoto: 'Upload photo',
    fullName: 'Full name',
    cniNumber: 'ID number',
    cniPhoto: 'ID photo',
    uploadCni: 'Upload ID',
    birthDate: 'Birth date',
    birthPlace: 'Birth place',
    whatsappNumber: 'WhatsApp number',
    phoneNumber: 'Phone number',
    sponsorName: 'Sponsor name',
    sponsorPhone: 'Sponsor phone',
    educationLevel: 'Education level',
    educationField: 'Field of study',
    cvUpload: 'Resume',
    uploadCv: 'Upload resume',
    saveProfile: 'Enregistrer le profil',
    profileSaved: 'Profile saved.',
    fileSelected: 'File selected',
    maintenanceDescription: 'Resident reports, transmission and repair follow-up.',
    maintenanceRoomLabel: 'Room',
    maintenanceIssueLabel: 'Issue',
    maintenanceResponsibilityLabel: 'Responsibility',
    maintenanceStatusLabel: 'Status',
    maintenanceCostLabel: 'Estimated cost (FCFA)',
    addMaintenance: 'Add report',
    fillRequiredFields: 'Please fill required fields.',
    maintenanceSaved: 'Report saved.',
    noMaintenance: 'No reports.',
    statusOpen: 'Open',
    statusInProgress: 'In progress',
    statusResolved: 'Resolved',
    responsibilityResident: 'Resident',
    responsibilityManager: 'Manager',
    responsibilityUnknown: 'Unknown',
    roomsLabelShort: 'Room',
    mainMetersDescription: 'Daily readings of the main meters.',
    meterDate: 'Date',
    mainWaterIndex: 'Water index',
    mainElectricIndex: 'Electric index',
    vendorWaterBill: 'Vendor water bill',
    vendorElectricBill: 'Vendor electric bill',
    saveMainMeter: 'Enregistrer le releve',
    mainMetersSummary: 'Consumption summary',
    mainMetersSummaryHint: 'Calculated consumption and expected bills.',
    dailyConsumption: 'Daily consumption',
    weeklyConsumption: 'Weekly consumption',
    monthlyConsumption: 'Monthly consumption',
    yearlyConsumption: 'Yearly consumption',
    expectedBills: 'Expected bill',
    mainMetersTable: 'Readings history',
    waterConsumption: 'Water consumption',
    electricConsumption: 'Electric consumption',
    expectedWaterBill: 'Expected water bill',
    expectedElectricBill: 'Expected electric bill',
    deltaBill: 'Bill delta',
    noMainMeters: 'No main meter readings yet.',
    noteOptional: 'Note (optional)',
    mainMeterSaved: 'Reading saved.',
    mainMeterUpdated: 'Reading updated.',
    duplicateDate: 'This date already exists. Pick another date.',
    editWindowClosed: 'Edits are locked after 24 hours.',
    updateMainMeter: 'Update',
    monthlyRecapTitle: 'Monthly recap',
    monthlyRecapDescription: 'Monthly totals for consumption and expected bills.',
    recapLabel: 'Label',
    recapConsumption: 'Consumption',
    recapExpected: 'Expected amount',
    recapWater: 'Water',
    recapElectric: 'Electricity',
    recapTotal: 'Total',
  },
  es: {
    title: 'Estado de entrada y salida',
    subtitle: 'Creacion, seguimiento, validacion y comparacion de fichas de entrada y salida para cada ocupacion.',
    inspectionMenu: 'Estado de entrada y salida',
    comparisonMenu: 'Comparativo',
    profileMenu: 'Perfil',
    profileDescription: 'Identidad e informacion administrativa del concierge.',
    roomsMenu: 'Habitaciones',
    metertrackMenu: 'MeterTrack',
    maintenanceMenu: 'Mantenimiento',
    mainMetersMenu: 'Contadores principales',
    settingsMenu: 'Parametros',
    listTitle: 'Ocupantes y estados',
    listDescription: 'Lista de residentes / ocupantes y seguimiento de sus fichas de entrada y salida.',
    createTitle: 'Nueva ficha',
    residentChoice: 'Residente / ocupante',
    sheetType: 'Tipo de ficha',
    entrySheet: 'Entrada',
    exitSheet: 'Salida',
    createSheet: 'Crear ficha',
    noSheet: 'Ninguna ficha seleccionada. Elija un ocupante o cree una ficha nueva.',
    entryNotCreated: 'Entrada no creada',
    entryInProgress: 'Entrada en curso',
    entryValidated: 'Entrada validada',
    exitNotCreated: 'Salida no creada',
    exitInProgress: 'Salida en curso',
    exitValidated: 'Salida validada',
    residentInfoTab: 'Informacion del residente',
    roomTab: 'Habitacion',
    kitchenTab: 'Cocina',
    bathroomTab: 'Ducha',
    metersTab: 'Contadores',
    validationTab: 'Validacion',
    optionalSectionTitle: 'Nombre de la seccion',
    addSectionAction: 'Agregar pestana',
    addItemAction: 'Agregar elemento',
    itemLabelPlaceholder: 'Etiqueta del elemento',
    roomSectionTitle: 'Control de habitacion',
    kitchenSectionTitle: 'Control de cocina',
    bathroomSectionTitle: 'Control de ducha',
    metersSectionTitle: 'Contadores y pintura',
    validationSectionTitle: 'Resumen antes de la validacion final',
    comparisonTitle: 'Comparativo entrada / salida',
    comparisonDescription: 'Deteccion de diferencias entre la ficha de entrada y la ficha de salida de una misma ocupacion.',
    entryState: 'Estado entrada',
    exitState: 'Estado salida',
    difference: 'Diferencia',
    noComparison: 'No hay comparativo disponible. Se necesita una ficha de entrada y una de salida.',
    yes: 'Si',
    no: 'No',
    observation: 'Observacion',
    residentPhone: 'Telefono',
    residentName: 'Nombre del residente',
    schoolOrProfession: 'Escuela / profesion',
    levelOrPosition: 'Nivel / puesto',
    fatherName: 'Nombre del padre o tutor',
    fatherPhone: 'Telefono del padre o tutor',
    motherName: 'Nombre de la madre',
    motherPhone: 'Telefono de la madre',
    roomOrHousing: 'Habitacion / vivienda',
    inspectionDate: 'Fecha del estado',
    conciergeName: 'Nombre del concierge conectado',
    generalComment: 'Comentario general del concierge',
    occupantName: 'Nombre del ocupante',
    occupantSignature: 'Firma del ocupante',
    conciergeSignature: 'Firma del concierge',
    occupantSignatureCheck: 'Confirmo la firma del ocupante',
    conciergeSignatureCheck: 'Confirmo mi firma',
    validationDateTime: 'Fecha y hora de validacion',
    saveDraft: 'Guardar borrador',
    validateSheet: 'Validar ficha',
    archiveSheet: 'Archivar ficha',
    exportPdf: 'Imprimir / Exportar PDF',
    previous: 'Anterior',
    next: 'Siguiente',
    autoSave: 'Guardado automatico',
    duplicateBlocked: 'Ya existe una ficha activa del mismo tipo para esta ocupacion.',
    draftSaved: 'Borrador guardado.',
    sheetValidated: 'Ficha validada.',
    sheetArchived: 'Ficha archivada.',
    requiredValidation: 'Las firmas del ocupante y del concierge deben confirmarse para validar.',
    exportReady: 'La ficha esta lista para imprimir en PDF.',
    addMissingOptions: 'Agregar opciones faltantes',
    electricityMeter: 'Contador divisionario de electricidad',
    mechanical: 'Mecanico',
    electronic: 'Electronico',
    meterIndex: 'Indice',
    breakerOk: 'Disyuntor en buen estado',
    waterMeter: 'Contador divisionario de agua',
    waterPresent: 'Contador presente',
    waterValveOk: 'Valvula de cierre en buen estado',
    paintState: 'Estado de pintura',
    paintColor: 'Color inicial de la pintura',
    paintGood: 'Buena',
    paintBad: 'Mala',
    dashboardOccupants: 'Ocupaciones seguidas',
    dashboardDrafts: 'Fichas borrador',
    dashboardValidated: 'Fichas validadas',
    dashboardExitPending: 'Salidas por preparar',
    dashboardBulletOne: 'Solo una ficha de entrada activa y una ficha de salida activa por ocupacion.',
    dashboardBulletTwo: 'El concierge puede guardar borradores y volver mas tarde antes de validar.',
    dashboardBulletThree: 'Las fichas validadas pueden exportarse y compararse.',
    selectSheetHint: 'Elija un ocupante y un tipo de ficha para empezar.',
    summaryTitle: 'Resumen',
    summaryType: 'Tipo',
    summaryStatus: 'Estado',
    summaryUpdatedAt: 'Ultima actualizacion',
    comparisonSelector: 'Elegir una ocupacion para comparar',
    noOccupantFound: 'Ocupante no informado',
    degradationObserved: 'Danio observado',
    estimatedCost: 'Costo estimado',
    complementaryObservation: 'Observacion complementaria',
    profilePhoto: 'Foto de perfil',
    uploadPhoto: 'Subir foto',
    fullName: 'Nombre completo',
    cniNumber: 'Numero de ID',
    cniPhoto: 'Foto de ID',
    uploadCni: 'Subir ID',
    birthDate: 'Fecha de nacimiento',
    birthPlace: 'Lugar de nacimiento',
    whatsappNumber: 'Numero WhatsApp',
    phoneNumber: 'Numero de llamada',
    sponsorName: 'Nombre del padrino',
    sponsorPhone: 'Numero del padrino',
    educationLevel: 'Nivel de estudio',
    educationField: 'Campo de estudio',
    cvUpload: 'CV',
    uploadCv: 'Subir CV',
    saveProfile: 'Enregistrer le profil',
    profileSaved: 'Perfil guardado.',
    fileSelected: 'Archivo seleccionado',
    maintenanceDescription: 'Reportes de residentes, transmision y seguimiento.',
    maintenanceRoomLabel: 'Habitacion',
    maintenanceIssueLabel: 'Incidencia',
    maintenanceResponsibilityLabel: 'Responsabilidad',
    maintenanceStatusLabel: 'Estado',
    maintenanceCostLabel: 'Costo estimado (FCFA)',
    addMaintenance: 'Agregar reporte',
    fillRequiredFields: 'Complete los campos obligatorios.',
    maintenanceSaved: 'Reporte guardado.',
    noMaintenance: 'Sin reportes.',
    statusOpen: 'Abierto',
    statusInProgress: 'En curso',
    statusResolved: 'Resuelto',
    responsibilityResident: 'Residente',
    responsibilityManager: 'Gestor',
    responsibilityUnknown: 'Desconocido',
    roomsLabelShort: 'Habitacion',
    mainMetersDescription: 'Lecturas diarias de los contadores principales.',
    meterDate: 'Fecha',
    mainWaterIndex: 'Indice de agua',
    mainElectricIndex: 'Indice electrico',
    vendorWaterBill: 'Factura agua concesionario',
    vendorElectricBill: 'Factura electricidad concesionario',
    saveMainMeter: 'Enregistrer le releve',
    mainMetersSummary: 'Resumen de consumo',
    mainMetersSummaryHint: 'Consumo calculado y facturas esperadas.',
    dailyConsumption: 'Consumo diario',
    weeklyConsumption: 'Consumo semanal',
    monthlyConsumption: 'Consumo mensual',
    yearlyConsumption: 'Consumo anual',
    expectedBills: 'Factura esperada',
    mainMetersTable: 'Historial de lecturas',
    waterConsumption: 'Consumo agua',
    electricConsumption: 'Consumo elec',
    expectedWaterBill: 'Factura agua esperada',
    expectedElectricBill: 'Factura elec esperada',
    deltaBill: 'Diferencia factura',
    noMainMeters: 'Sin lecturas de contadores.',
    noteOptional: 'Observacion (opcional)',
    mainMeterSaved: 'Lectura guardada.',
    mainMeterUpdated: 'Lectura actualizada.',
    duplicateDate: 'Esta fecha ya existe. Elija otra fecha.',
    editWindowClosed: 'La edicion se bloquea despues de 24 horas.',
    updateMainMeter: 'Actualizar',
    monthlyRecapTitle: 'Resumen mensual',
    monthlyRecapDescription: 'Totales mensuales de consumo y facturas esperadas.',
    recapLabel: 'Etiqueta',
    recapConsumption: 'Consumo',
    recapExpected: 'Monto esperado',
    recapWater: 'Agua',
    recapElectric: 'Electricidad',
    recapTotal: 'Total',
  },
};
