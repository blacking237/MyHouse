package com.ambercity.manager.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateInvoiceSendStatusRequest(
  @NotBlank
  @Pattern(regexp = "^(NON_ENVOYE|ENVOYE|ERREUR)$")
  String statutEnvoi
) {}
