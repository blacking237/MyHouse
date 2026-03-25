package com.ambercity.manager.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BillingCalculateRequest(
  @NotBlank @Size(min = 7, max = 7) String mois,
  boolean forceRecompute
) {}
