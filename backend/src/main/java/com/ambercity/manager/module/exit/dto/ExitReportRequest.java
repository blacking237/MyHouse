package com.ambercity.manager.module.exit.dto;

import jakarta.validation.constraints.NotBlank;

public record ExitReportRequest(
  @NotBlank String roomNumero,
  String residentExternalId,
  String contractExternalId,
  String notes,
  String externalId
) {}
