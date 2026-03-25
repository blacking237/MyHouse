package com.ambercity.manager.module.licence.dto;

import java.time.LocalDateTime;

public record LicenceTokenResponse(
  Long id,
  String externalId,
  String token,
  String status,
  String mode,
  LocalDateTime issuedAt,
  LocalDateTime expiresAt
) {}
