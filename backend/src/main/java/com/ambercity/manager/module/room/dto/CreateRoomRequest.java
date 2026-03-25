package com.ambercity.manager.module.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRoomRequest(
  @NotBlank @Size(max = 50) String numeroChambre,
  @Size(max = 20) String bloc,
  String externalId
) {}
