package com.ambercity.manager.module.commoncharge.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CommonChargeResponse(
  Long id,
  String code,
  String label,
  BigDecimal amount,
  boolean required,
  boolean active,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
