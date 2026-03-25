package com.ambercity.manager.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SetRecoveryEmailRequest(
  @NotBlank @Email @Size(max = 160) String email
) {}

