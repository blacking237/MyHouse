package com.ambercity.manager.module.licence.dto;

import jakarta.validation.constraints.NotBlank;

public record ActivateLicenceRequest(
  @NotBlank(message = "Le token est obligatoire")
  String jwtToken
) {}

