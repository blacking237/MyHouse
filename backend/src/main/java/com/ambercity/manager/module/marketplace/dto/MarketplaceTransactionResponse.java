package com.ambercity.manager.module.marketplace.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MarketplaceTransactionResponse(
  Long id,
  Long listingId,
  String buyerContact,
  BigDecimal amount,
  BigDecimal commissionRate,
  BigDecimal commissionAmount,
  String status,
  LocalDateTime createdAt
) {}
