package com.ambercity.manager.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
  @NotBlank @Size(min = 6, max = 120) String oldPassword,
  @NotBlank @Size(min = 6, max = 120) String newPassword
) {}

