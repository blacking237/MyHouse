package com.ambercity.manager.module.auth.dto;

public record AuthResponse(
  String accessToken,
  String refreshToken,
  long expiresIn,
  UserView user
) {
  public record UserView(
    Long id,
    String username,
    String role,
    boolean actif,
    String status
  ) {}
}
