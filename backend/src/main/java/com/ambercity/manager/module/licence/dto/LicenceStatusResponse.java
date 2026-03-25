package com.ambercity.manager.module.licence.dto;

import java.util.List;

public record LicenceStatusResponse(
  String statut,
  boolean valid,
  String clientName,
  String dateExpiration,
  int nbChambresMax,
  List<String> modules
) {}

