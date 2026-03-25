package com.ambercity.manager.module.meter.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record IndexReadingResponse(
  Long id,
  String externalId,
  Long roomId,
  String roomNumber,
  String mois,
  BigDecimal anEau,
  BigDecimal niEau,
  BigDecimal anElec,
  BigDecimal niElec,
  String statutPresence,
  boolean amendeEau,
  boolean lateSubmission,
  String saisiPar,
  LocalDateTime saisiLe,
  LocalDateTime updatedAt
) {}
