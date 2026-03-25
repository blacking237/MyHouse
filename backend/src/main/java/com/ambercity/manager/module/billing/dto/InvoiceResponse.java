package com.ambercity.manager.module.billing.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InvoiceResponse(
  Long id,
  String externalId,
  Long roomId,
  String roomNumber,
  Long residentId,
  String mois,
  Line water,
  Line electricity,
  BigDecimal totalFacture,
  BigDecimal internetFee,
  BigDecimal commonCharges,
  BigDecimal penaltyMissingIndex,
  BigDecimal loyer,
  BigDecimal dette,
  BigDecimal netAPayer,
  String statutEnvoi,
  LocalDateTime calculeeLe,
  LocalDate delaiPaiement
) {
  public record Line(
    BigDecimal conso,
    BigDecimal montantHt,
    BigDecimal tva,
    BigDecimal lc,
    BigDecimal surplus,
    BigDecimal amende,
    BigDecimal montantTtc
  ) {}
}
