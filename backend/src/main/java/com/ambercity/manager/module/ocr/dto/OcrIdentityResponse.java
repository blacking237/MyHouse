package com.ambercity.manager.module.ocr.dto;

import java.util.Map;

public record OcrIdentityResponse(
  String status,
  boolean requiresReview,
  Map<String, String> fields
) {}
