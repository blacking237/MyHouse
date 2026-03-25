package com.ambercity.manager.module.ocr.dto;

import com.ambercity.manager.module.resident.dto.CreateResidentRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OcrRegisterRequest(
  @Valid @NotNull CreateResidentRequest resident,
  @NotBlank String username,
  @NotBlank String password
) {}
