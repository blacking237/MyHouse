package com.ambercity.manager.module.marketplace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MarketplaceSubscriptionRequest(
  @NotNull Long userId,
  @NotBlank String plan,
  @NotBlank String status
) {}
