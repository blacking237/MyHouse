package com.ambercity.manager.module.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
  Long id,
  String externalId,
  Long invoiceId,
  BigDecimal amount,
  String method,
  String status,
  String transactionRef,
  String observation,
  LocalDateTime paidAt
) {}
