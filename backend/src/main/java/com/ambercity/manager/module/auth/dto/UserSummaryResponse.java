package com.ambercity.manager.module.auth.dto;

public record UserSummaryResponse(
  Long id,
  String username,
  String role,
  boolean actif,
  String createdBy,
  String status,
  String createdAt,
  String validatedAt,
  String rejectedAt
) {}
