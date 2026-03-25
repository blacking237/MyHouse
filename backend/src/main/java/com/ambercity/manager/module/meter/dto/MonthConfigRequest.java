package com.ambercity.manager.module.meter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record MonthConfigRequest(
  @NotNull @DecimalMin("0.0") BigDecimal puEau,
  @NotNull @DecimalMin("0.0") BigDecimal puElectricite,
  @NotNull @DecimalMin("0.0") BigDecimal tva,
  @NotNull @DecimalMin("0.0") BigDecimal lcEau,
  @NotNull @DecimalMin("0.0") BigDecimal lcElectricite,
  @NotNull @DecimalMin("0.0") BigDecimal surplusEauTotal,
  @NotNull @DecimalMin("0.0") BigDecimal surplusElecTotal,
  @NotNull @DecimalMin("0.0") BigDecimal internetFee,
  @NotNull @DecimalMin("0.0") BigDecimal commonChargesPercent,
  @NotNull @DecimalMin("0.0") BigDecimal penaltyMissingIndex,
  Integer indexWindowStartDay,
  Integer indexWindowEndDay,
  @NotNull @DecimalMin("0.0") BigDecimal amendeEauMontant,
  @NotNull @DecimalMin("0.0") BigDecimal minimumFacture,
  @NotNull LocalDate delaiPaiement
) {}
