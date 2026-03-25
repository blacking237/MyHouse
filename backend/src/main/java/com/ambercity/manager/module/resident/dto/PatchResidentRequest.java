package com.ambercity.manager.module.resident.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record PatchResidentRequest(
  @Size(max = 50) String cni,
  @Size(max = 120) String nom,
  @Size(max = 120) String prenom,
  @Size(max = 40) String genre,
  LocalDate dateNaissance,
  @Size(max = 40) String telephone,
  @Size(max = 40) String whatsapp,
  @Size(max = 40) String whatsappParents,
  @Size(max = 160) String email,
  @Size(max = 160) String ecole,
  @Size(max = 160) String filiere,
  @Size(max = 60) String niveau,
  @Size(max = 120) String niveauEtude,
  @Size(max = 160) String filiereEtude,
  @Size(max = 160) String contactUrgenceNom,
  @Size(max = 40) String contactUrgenceTelephone,
  @Size(max = 160) String nomPere,
  @Size(max = 160) String nomMere,
  @Size(max = 10) String preferredLanguage,
  LocalDate dateEntree,
  LocalDate dateSortie,
  @Size(max = 20) String statut,
  String externalId
) {}
