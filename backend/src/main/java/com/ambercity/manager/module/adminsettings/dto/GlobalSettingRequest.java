package com.ambercity.manager.module.adminsettings.dto;

import jakarta.validation.constraints.NotBlank;

public record GlobalSettingRequest(
  @NotBlank String settingKey,
  String settingValue
) {}
