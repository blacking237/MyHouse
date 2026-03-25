package com.ambercity.manager.module.marketplace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MarketplaceMediaRequest(
  @NotNull Long listingId,
  @NotBlank String mediaUrl,
  @NotBlank String mediaType,
  Integer sortOrder
) {}
