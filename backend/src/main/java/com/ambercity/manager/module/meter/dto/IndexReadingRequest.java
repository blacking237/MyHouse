package com.ambercity.manager.module.meter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record IndexReadingRequest(
  @NotNull Long roomId,
  @NotBlank @Size(min = 7, max = 7) String mois,
  @NotNull @DecimalMin("0.0") BigDecimal anEau,
  @NotNull @DecimalMin("0.0") BigDecimal niEau,
  @NotNull @DecimalMin("0.0") BigDecimal anElec,
  @NotNull @DecimalMin("0.0") BigDecimal niElec,
  @NotBlank @Size(max = 20) String statutPresence,
  boolean amendeEau,
  @NotBlank @Size(max = 80) String saisiPar,
  String externalId
) {}
