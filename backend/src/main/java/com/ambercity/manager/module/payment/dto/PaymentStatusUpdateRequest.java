package com.ambercity.manager.module.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentStatusUpdateRequest(
  @NotBlank String status,
  String transactionRef
) {}
