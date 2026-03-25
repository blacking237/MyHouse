package com.ambercity.manager.module.licence;

import com.ambercity.manager.module.licence.dto.LicenceStatusResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LicenceService {

  private static final int TRIAL_DAYS = 7;
  private static final int DEFAULT_ROOMS_MAX = 500;
  private static final List<String> DEFAULT_MODULES = List.of(
    "ACCUEIL",
    "RESIDENTS",
    "CHAMBRES",
    "COMPTEURS",
    "FACTURES",
    "FINANCE",
    "COMMUNICATION",
    "CONCIERGE",
    "DEV_PORTAL",
    "LICENCE"
  );

  private final ObjectMapper objectMapper;
  private final Path statePath;

  public LicenceService(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
    this.statePath = Path.of("backend", "licence-state.json");
  }

  public synchronized LicenceStatusResponse getStatus() {
    LicenceState state = loadOrInit();
    LocalDate today = LocalDate.now();
    if (state.activated && state.expiresOn != null && !state.expiresOn.isBefore(today)) {
      return toResponse("ACTIVE", true, state.clientName, state.expiresOn, state.nbChambresMax, state.modules);
    }

    LocalDate trialEnd = state.trialStart.plusDays(TRIAL_DAYS);
    if (!today.isAfter(trialEnd)) {
      return toResponse("TRIAL", true, "Mode essai", trialEnd, DEFAULT_ROOMS_MAX, DEFAULT_MODULES);
    }

    return toResponse("EXPIRED", false, state.clientName, trialEnd, 0, List.of());
  }

  public synchronized LicenceStatusResponse activate(String token) {
    LicenceState state = loadOrInit();
    state.activated = true;
    state.clientName = parseClientName(token);
    state.expiresOn = LocalDate.now().plusYears(1);
    state.nbChambresMax = DEFAULT_ROOMS_MAX;
    state.modules = DEFAULT_MODULES;
    save(state);
    return getStatus();
  }

  private LicenceStatusResponse toResponse(
    String statut,
    boolean valid,
    String clientName,
    LocalDate expiration,
    int nbChambresMax,
    List<String> modules
  ) {
    return new LicenceStatusResponse(
      statut,
      valid,
      clientName == null || clientName.isBlank() ? "-" : clientName,
      expiration == null ? null : expiration.toString(),
      nbChambresMax,
      modules
    );
  }

  private String parseClientName(String token) {
    if (token == null || token.isBlank()) {
      return "Client Amber City";
    }
    if (token.contains("|")) {
      String[] parts = token.split("\\|", 2);
      if (parts.length == 2 && !parts[1].isBlank()) {
        return parts[1].trim();
      }
    }
    return "Client Amber City";
  }

  private LicenceState loadOrInit() {
    try {
      if (Files.exists(statePath)) {
        return objectMapper.readValue(statePath.toFile(), LicenceState.class);
      }
      LicenceState state = new LicenceState();
      state.trialStart = LocalDate.now();
      state.nbChambresMax = DEFAULT_ROOMS_MAX;
      state.modules = DEFAULT_MODULES;
      save(state);
      return state;
    } catch (IOException e) {
      throw new IllegalStateException("Impossible de charger l'etat de licence", e);
    }
  }

  private void save(LicenceState state) {
    try {
      Path parent = statePath.getParent();
      if (parent != null && !Files.exists(parent)) {
        Files.createDirectories(parent);
      }
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(statePath.toFile(), state);
    } catch (IOException e) {
      throw new IllegalStateException("Impossible de sauvegarder l'etat de licence", e);
    }
  }

  public static class LicenceState {
    public LocalDate trialStart = LocalDate.now();
    public boolean activated = false;
    public String clientName = "Mode essai";
    public LocalDate expiresOn;
    public int nbChambresMax = DEFAULT_ROOMS_MAX;
    public List<String> modules = DEFAULT_MODULES;
  }
}

