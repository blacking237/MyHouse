package com.ambercity.manager.module.billing.dto;

import java.util.List;

public record BillingCalculateResponse(
  boolean success,
  int count,
  List<ValidationError> errors
) {
  public record ValidationError(
    Long roomId,
    String roomNumber,
    String message
  ) {}
}
