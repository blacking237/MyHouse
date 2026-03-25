package com.ambercity.manager.module.auth.dto;

public record AccessTokenResponse(
  String accessToken,
  long expiresIn
) {}
