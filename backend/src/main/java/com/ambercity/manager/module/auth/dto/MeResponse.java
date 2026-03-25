package com.ambercity.manager.module.auth.dto;

public record MeResponse(
  Long id,
  String username,
  String role,
  Long residentId,
  String status,
  String consentAt
) {}
