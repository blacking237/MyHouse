package com.ambercity.manager.module.room.dto;

import jakarta.validation.constraints.Size;

public record PatchRoomRequest(
  @Size(max = 50) String numeroChambre,
  @Size(max = 20) String bloc,
  Boolean actif,
  String externalId
) {}
