package com.ambercity.manager.module.commoncharge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CommonChargeRequest(
  String externalId,
  @NotBlank String code,
  @NotBlank String label,
  @NotNull BigDecimal amount,
  boolean required,
  boolean active
) {}
