package com.ambercity.manager.module.ocr.dto;

import jakarta.validation.constraints.NotBlank;

public record OcrIdentityRequest(
  @NotBlank String documentType,
  @NotBlank String frontImageBase64,
  String backImageBase64,
  String languageHint
) {}
