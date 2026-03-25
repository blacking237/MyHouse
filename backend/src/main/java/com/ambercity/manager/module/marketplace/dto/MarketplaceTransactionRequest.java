package com.ambercity.manager.module.marketplace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MarketplaceTransactionRequest(
  @NotNull Long listingId,
  @NotNull BigDecimal amount,
  String buyerContact,
  @NotBlank String status
) {}
