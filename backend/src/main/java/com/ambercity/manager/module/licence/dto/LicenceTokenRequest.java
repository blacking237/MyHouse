package com.ambercity.manager.module.licence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record LicenceTokenRequest(
  @NotBlank String clientName,
  @NotBlank String status,
  @NotBlank String mode,
  @NotNull List<String> modules,
  String expiresAt
) {}
