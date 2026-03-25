package com.ambercity.manager.module.licence.dto;

import java.util.List;

public record LicenceVerifyResponse(
  boolean valid,
  String status,
  String mode,
  String clientName,
  List<String> modules,
  String expiresAt
) {}
