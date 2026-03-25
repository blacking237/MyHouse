package com.ambercity.manager.module.meter.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MonthConfigResponse(
  Long id,
  String mois,
  BigDecimal puEau,
  BigDecimal puElectricite,
  BigDecimal tva,
  BigDecimal lcEau,
  BigDecimal lcElectricite,
  BigDecimal surplusEauTotal,
  BigDecimal surplusElecTotal,
  BigDecimal internetFee,
  BigDecimal commonChargesPercent,
  BigDecimal penaltyMissingIndex,
  Integer indexWindowStartDay,
  Integer indexWindowEndDay,
  BigDecimal amendeEauMontant,
  BigDecimal minimumFacture,
  LocalDate delaiPaiement,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
