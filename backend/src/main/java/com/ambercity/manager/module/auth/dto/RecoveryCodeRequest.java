package com.ambercity.manager.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecoveryCodeRequest(
  @NotBlank @Size(max = 80) String username
) {}

