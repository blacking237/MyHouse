package com.ambercity.manager.module.notification.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
  Long id,
  String channel,
  String recipient,
  String subject,
  String payload,
  String status,
  LocalDateTime createdAt,
  LocalDateTime sentAt
) {}
