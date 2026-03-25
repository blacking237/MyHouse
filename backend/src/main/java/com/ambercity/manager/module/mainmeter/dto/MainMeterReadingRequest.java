package com.ambercity.manager.module.mainmeter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MainMeterReadingRequest(
  @NotBlank String date,
  @NotNull BigDecimal waterIndex,
  @NotNull BigDecimal electricIndex,
  String note,
  String externalId
) {}
