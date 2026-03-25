package com.ambercity.manager.module.exit.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExitReportResponse(
  Long id,
  String externalId,
  String roomNumero,
  Long residentId,
  String residentName,
  BigDecimal debtTotal,
  BigDecimal repairCost,
  BigDecimal depositUsed,
  BigDecimal depositTotal,
  BigDecimal commonCharges,
  BigDecimal balance,
  BigDecimal refundAmount,
  String notes,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
