package com.ambercity.manager.module.marketplace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MarketplaceListingRequest(
  String externalId,
  @NotBlank String title,
  String description,
  BigDecimal price,
  String currency,
  @NotBlank String listingType,
  @NotBlank String status,
  String address,
  BigDecimal latitude,
  BigDecimal longitude
) {}
