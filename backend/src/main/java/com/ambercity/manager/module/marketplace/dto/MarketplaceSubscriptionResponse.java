package com.ambercity.manager.module.marketplace.dto;

import java.time.LocalDateTime;

public record MarketplaceSubscriptionResponse(
  Long id,
  Long userId,
  String plan,
  String status,
  LocalDateTime startedAt,
  LocalDateTime endsAt,
  LocalDateTime createdAt
) {}
