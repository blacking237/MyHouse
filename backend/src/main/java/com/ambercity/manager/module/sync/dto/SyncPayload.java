package com.ambercity.manager.module.sync.dto;

import java.math.BigDecimal;
import java.util.List;

public record SyncPayload(
  String since,
  List<RoomSync> rooms,
  List<ResidentSync> residents,
  List<IndexReadingSync> indexReadings,
  List<InvoiceSync> invoices,
  List<PaymentSync> payments,
  List<ContractSync> contracts,
  List<MaintenanceSync> maintenance,
  List<MainMeterSync> mainMeters,
  List<ExitReportSync> exitReports
) {
  public record RoomSync(
    String externalId,
    String numeroChambre,
    String bloc,
    boolean actif,
    String updatedAt
  ) {}

  public record ResidentSync(
    String externalId,
    String cni,
    String nom,
    String prenom,
    String genre,
    String dateNaissance,
    String telephone,
    String whatsapp,
    String whatsappParents,
    String email,
    String ecole,
    String filiere,
    String niveau,
    String niveauEtude,
    String filiereEtude,
    String contactUrgenceNom,
    String contactUrgenceTelephone,
    String nomPere,
    String nomMere,
    String dateEntree,
    String dateSortie,
    String statut,
    String updatedAt
  ) {}

  public record IndexReadingSync(
    String externalId,
    String roomExternalId,
    String mois,
    BigDecimal anEau,
    BigDecimal niEau,
    BigDecimal anElec,
    BigDecimal niElec,
    String statutPresence,
    boolean amendeEau,
    String saisiPar,
    String saisiLe,
    String updatedAt
  ) {}

  public record InvoiceSync(
    String externalId,
    String roomExternalId,
    String residentExternalId,
    String mois,
    BigDecimal totalFacture,
    BigDecimal internetFee,
    BigDecimal commonCharges,
    BigDecimal penaltyMissingIndex,
    BigDecimal loyer,
    BigDecimal dette,
    BigDecimal netAPayer,
    String statutEnvoi,
    String calculeeLe,
    String updatedAt
  ) {}

  public record PaymentSync(
    String externalId,
    String invoiceExternalId,
    BigDecimal amount,
    String method,
    String status,
    String transactionRef,
    String paidAt,
    String updatedAt
  ) {}

  public record ContractSync(
    String externalId,
    String roomExternalId,
    String residentExternalId,
    String status,
    String signingMode,
    String startDate,
    String endDate,
    BigDecimal monthlyRent,
    BigDecimal deposit,
    boolean autoRenewal,
    String notes,
    String updatedAt
  ) {}

  public record MaintenanceSync(
    String externalId,
    String roomExternalId,
    String residentExternalId,
    String category,
    String priority,
    String status,
    String responsibility,
    BigDecimal estimatedCost,
    BigDecimal penaltyAmount,
    String notes,
    String updatedAt
  ) {}

  public record MainMeterSync(
    String externalId,
    String date,
    BigDecimal waterIndex,
    BigDecimal electricIndex,
    String note,
    String updatedAt
  ) {}

  public record ExitReportSync(
    String externalId,
    String roomExternalId,
    String residentExternalId,
    BigDecimal debtTotal,
    BigDecimal repairCost,
    BigDecimal depositUsed,
    BigDecimal balance,
    String notes,
    String updatedAt
  ) {}
}
