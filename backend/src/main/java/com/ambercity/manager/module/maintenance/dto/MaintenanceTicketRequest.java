package com.ambercity.manager.module.maintenance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MaintenanceTicketRequest(
  @NotBlank String roomNumero,
  String residentExternalId,
  @NotBlank String category,
  @NotBlank String priority,
  @NotBlank String status,
  @NotBlank String responsibility,
  @NotNull @DecimalMin("0.0") BigDecimal estimatedCost,
  @NotNull @DecimalMin("0.0") BigDecimal penaltyAmount,
  String notes,
  String externalId
) {}
