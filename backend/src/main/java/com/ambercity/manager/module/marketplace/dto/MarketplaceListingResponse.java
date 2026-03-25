package com.ambercity.manager.module.marketplace.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record MarketplaceListingResponse(
  Long id,
  String externalId,
  String title,
  String description,
  BigDecimal price,
  String currency,
  String listingType,
  String status,
  String address,
  BigDecimal latitude,
  BigDecimal longitude,
  List<MarketplaceMediaResponse> media,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
