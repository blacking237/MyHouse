package com.ambercity.manager.module.room.dto;

import java.time.LocalDateTime;

public record RoomResponse(
  Long id,
  String externalId,
  String numeroChambre,
  String bloc,
  boolean actif,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
