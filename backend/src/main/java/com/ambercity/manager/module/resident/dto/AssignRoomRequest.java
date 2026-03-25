package com.ambercity.manager.module.resident.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AssignRoomRequest(
  @NotNull Long roomId,
  @NotNull LocalDate dateDebut,
  @Size(max = 255) String motif
) {}
