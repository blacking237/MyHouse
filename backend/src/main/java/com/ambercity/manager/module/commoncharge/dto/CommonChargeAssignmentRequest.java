package com.ambercity.manager.module.commoncharge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CommonChargeAssignmentRequest(
  @NotNull Long chargeId,
  @NotBlank String scopeType,
  @NotBlank String scopeValue,
  boolean required
) {}
