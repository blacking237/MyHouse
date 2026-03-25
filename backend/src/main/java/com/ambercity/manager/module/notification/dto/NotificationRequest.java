package com.ambercity.manager.module.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record NotificationRequest(
  @NotBlank String channel,
  @NotBlank String recipient,
  String subject,
  String payload,
  String externalId
) {}
