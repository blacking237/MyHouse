package com.ambercity.manager.module.contract.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ContractResponse(
  Long id,
  String externalId,
  String roomNumero,
  Long residentId,
  String residentName,
  String status,
  String signingMode,
  LocalDate startDate,
  LocalDate endDate,
  BigDecimal monthlyRent,
  BigDecimal deposit,
  boolean autoRenewal,
  String notes,
  LocalDateTime createdAt,
  LocalDateTime updatedAt,
  LocalDateTime validatedAt,
  List<ContractSignatureResponse> signatures
) {
  public record ContractSignatureResponse(
    String signedBy,
    LocalDateTime signedAt,
    String signatureType
  ) {}
}
