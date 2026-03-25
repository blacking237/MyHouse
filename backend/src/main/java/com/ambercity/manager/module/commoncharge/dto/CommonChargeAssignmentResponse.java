package com.ambercity.manager.module.commoncharge.dto;

import java.time.LocalDateTime;

public record CommonChargeAssignmentResponse(
  Long id,
  Long chargeId,
  String chargeLabel,
  String scopeType,
  String scopeValue,
  boolean required,
  LocalDateTime createdAt
) {}
