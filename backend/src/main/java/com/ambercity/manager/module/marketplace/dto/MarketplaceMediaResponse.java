package com.ambercity.manager.module.marketplace.dto;

import java.time.LocalDateTime;

public record MarketplaceMediaResponse(
  Long id,
  String mediaUrl,
  String mediaType,
  Integer sortOrder,
  LocalDateTime createdAt
) {}
