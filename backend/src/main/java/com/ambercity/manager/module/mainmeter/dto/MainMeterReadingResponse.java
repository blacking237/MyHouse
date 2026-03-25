package com.ambercity.manager.module.mainmeter.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MainMeterReadingResponse(
  Long id,
  String externalId,
  LocalDate date,
  BigDecimal waterIndex,
  BigDecimal electricIndex,
  String note,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
