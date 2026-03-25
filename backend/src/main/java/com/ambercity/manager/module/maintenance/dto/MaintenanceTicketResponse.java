package com.ambercity.manager.module.maintenance.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MaintenanceTicketResponse(
  Long id,
  String externalId,
  String roomNumero,
  Long residentId,
  String residentName,
  String category,
  String priority,
  String status,
  String responsibility,
  BigDecimal estimatedCost,
  BigDecimal penaltyAmount,
  LocalDateTime penaltyAppliedAt,
  LocalDateTime dueAt,
  boolean overdue,
  String notes,
  LocalDateTime createdAt,
  LocalDateTime updatedAt,
  LocalDateTime resolvedAt
) {}
