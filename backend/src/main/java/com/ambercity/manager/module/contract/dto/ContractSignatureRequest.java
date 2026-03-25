package com.ambercity.manager.module.contract.dto;

import jakarta.validation.constraints.NotBlank;

public record ContractSignatureRequest(
  @NotBlank String signedBy,
  @NotBlank String signatureType
) {}
