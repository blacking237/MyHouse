package com.ambercity.manager.module.adminsettings.dto;

import java.time.LocalDateTime;

public record GlobalSettingResponse(
  Long id,
  String settingKey,
  String settingValue,
  LocalDateTime updatedAt
) {}
