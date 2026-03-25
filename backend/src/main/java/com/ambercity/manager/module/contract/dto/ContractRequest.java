package com.ambercity.manager.module.contract.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractRequest(
  @NotBlank String roomNumero,
  String residentExternalId,
  @NotBlank String status,
  @NotBlank String signingMode,
  LocalDate startDate,
  LocalDate endDate,
  @NotNull @DecimalMin("0.0") BigDecimal monthlyRent,
  @NotNull @DecimalMin("0.0") BigDecimal deposit,
  boolean autoRenewal,
  String notes,
  String externalId
) {}
