package com.ambercity.manager.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
  @NotBlank @Size(max = 80) String username,
  @NotBlank @Size(min = 6, max = 120) String password,
  @NotBlank @Size(max = 30) String role,
  String residentExternalId
) {}
