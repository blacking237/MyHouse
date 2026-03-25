package com.ambercity.manager.module.resident;

import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.domain.ResidentRoomHistoryEntity;
import com.ambercity.manager.module.resident.dto.AssignRoomRequest;
import com.ambercity.manager.module.resident.dto.CreateResidentRequest;
import com.ambercity.manager.module.resident.dto.PatchResidentRequest;
import com.ambercity.manager.module.resident.dto.ResidentResponse;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.module.resident.repo.ResidentRoomHistoryRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ResidentService {

  private final ResidentRepository residentRepository;
  private final ResidentRoomHistoryRepository historyRepository;
  private final RoomRepository roomRepository;

  public ResidentService(
    ResidentRepository residentRepository,
    ResidentRoomHistoryRepository historyRepository,
    RoomRepository roomRepository
  ) {
    this.residentRepository = residentRepository;
    this.historyRepository = historyRepository;
    this.roomRepository = roomRepository;
  }

  @Transactional(readOnly = true)
  public List<ResidentResponse> list() {
    return residentRepository.findAllByOrderByNomAscPrenomAsc().stream()
      .map(this::toResponse)
      .toList();
  }

  @Transactional
  public ResidentResponse create(CreateResidentRequest request) {
    String cni = normalizeOptional(request.cni());
    if (cni != null && residentRepository.existsByCni(cni)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "CNI already exists");
    }

    ResidentEntity r = new ResidentEntity();
    r.setCni(cni);
    r.setExternalId(request.externalId() == null || request.externalId().isBlank()
      ? UUID.randomUUID().toString()
      : request.externalId());
    r.setNom(normalizeRequired(request.nom()));
    r.setPrenom(normalizeRequired(request.prenom()));
    r.setGenre(normalizeOptional(request.genre()));
    r.setDateNaissance(request.dateNaissance());
    r.setTelephone(normalizeOptional(request.telephone()));
    r.setWhatsapp(normalizeOptional(request.whatsapp()));
    r.setWhatsappParents(normalizeOptional(request.whatsappParents()));
    r.setEmail(normalizeOptional(request.email()));
    r.setEcole(normalizeOptional(request.ecole()));
    r.setFiliere(normalizeOptional(request.filiere()));
    r.setNiveau(normalizeOptional(request.niveau()));
    r.setNiveauEtude(normalizeOptional(request.niveauEtude()));
    r.setFiliereEtude(normalizeOptional(request.filiereEtude()));
    r.setContactUrgenceNom(normalizeOptional(request.contactUrgenceNom()));
    r.setContactUrgenceTelephone(normalizeOptional(request.contactUrgenceTelephone()));
    r.setNomPere(normalizeOptional(request.nomPere()));
    r.setNomMere(normalizeOptional(request.nomMere()));
    r.setPreferredLanguage(normalizeOptional(request.preferredLanguage()));
    r.setActivityScore(0);
    r.setPaymentsCount(0);
    r.setInteractionsCount(0);
    r.setDateEntree(request.dateEntree());
    r.setStatut("ACTIF");
    r.setCreatedAt(LocalDateTime.now());
    r.setUpdatedAt(LocalDateTime.now());
    return toResponse(residentRepository.save(r));
  }

  @Transactional
  public ResidentResponse patch(Long residentId, PatchResidentRequest request) {
    ResidentEntity r = residentRepository.findById(residentId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found"));

    if (request.cni() != null) {
      String cni = normalizeOptional(request.cni());
      if (cni != null && !cni.equals(r.getCni()) && residentRepository.existsByCni(cni)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "CNI already exists");
      }
      r.setCni(cni);
    }
    if (request.nom() != null && !request.nom().isBlank()) r.setNom(normalizeRequired(request.nom()));
    if (request.prenom() != null && !request.prenom().isBlank()) r.setPrenom(normalizeRequired(request.prenom()));
    if (request.genre() != null) r.setGenre(normalizeOptional(request.genre()));
    if (request.dateNaissance() != null) r.setDateNaissance(request.dateNaissance());
    if (request.telephone() != null) r.setTelephone(normalizeOptional(request.telephone()));
    if (request.whatsapp() != null) r.setWhatsapp(normalizeOptional(request.whatsapp()));
    if (request.whatsappParents() != null) r.setWhatsappParents(normalizeOptional(request.whatsappParents()));
    if (request.email() != null) r.setEmail(normalizeOptional(request.email()));
    if (request.ecole() != null) r.setEcole(normalizeOptional(request.ecole()));
    if (request.filiere() != null) r.setFiliere(normalizeOptional(request.filiere()));
    if (request.niveau() != null) r.setNiveau(normalizeOptional(request.niveau()));
    if (request.niveauEtude() != null) r.setNiveauEtude(normalizeOptional(request.niveauEtude()));
    if (request.filiereEtude() != null) r.setFiliereEtude(normalizeOptional(request.filiereEtude()));
    if (request.contactUrgenceNom() != null) r.setContactUrgenceNom(normalizeOptional(request.contactUrgenceNom()));
    if (request.contactUrgenceTelephone() != null) r.setContactUrgenceTelephone(normalizeOptional(request.contactUrgenceTelephone()));
    if (request.nomPere() != null) r.setNomPere(normalizeOptional(request.nomPere()));
    if (request.nomMere() != null) r.setNomMere(normalizeOptional(request.nomMere()));
    if (request.preferredLanguage() != null) r.setPreferredLanguage(normalizeOptional(request.preferredLanguage()));
    if (request.dateEntree() != null) r.setDateEntree(request.dateEntree());
    if (request.dateSortie() != null) r.setDateSortie(request.dateSortie());
    if (request.statut() != null && !request.statut().isBlank()) r.setStatut(request.statut().trim().toUpperCase());
    if (request.externalId() != null && !request.externalId().isBlank()) r.setExternalId(request.externalId());
    r.setUpdatedAt(LocalDateTime.now());

    return toResponse(residentRepository.save(r));
  }

  @Transactional
  public ResidentResponse assignRoom(Long residentId, AssignRoomRequest request) {
    ResidentEntity resident = residentRepository.findById(residentId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found"));
    RoomEntity room = roomRepository.findById(request.roomId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

    if (!room.isActif()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room is inactive");
    }

    historyRepository.findFirstByResidentIdAndDateFinIsNullOrderByDateDebutDesc(residentId)
      .ifPresent(current -> {
        if (request.dateDebut().isBefore(current.getDateDebut())) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dateDebut cannot be before current assignment");
        }
        current.setDateFin(request.dateDebut().minusDays(1));
        historyRepository.save(current);
      });

    ResidentRoomHistoryEntity assignment = new ResidentRoomHistoryEntity();
    assignment.setResident(resident);
    assignment.setRoom(room);
    assignment.setDateDebut(request.dateDebut());
    assignment.setMotif(normalizeOptional(request.motif()));
    assignment.setCreatedAt(LocalDateTime.now());
    historyRepository.save(assignment);

    if (resident.getDateEntree() == null) {
      resident.setDateEntree(request.dateDebut());
      residentRepository.save(resident);
    }

    return toResponse(resident);
  }

  private ResidentResponse toResponse(ResidentEntity r) {
    ResidentRoomHistoryEntity current = historyRepository
      .findFirstByResidentIdAndDateFinIsNullOrderByDateDebutDesc(r.getId())
      .orElse(null);

    return new ResidentResponse(
      r.getId(),
      r.getExternalId(),
      r.getCni(),
      r.getNom(),
      r.getPrenom(),
      r.getGenre(),
      r.getDateNaissance(),
      r.getTelephone(),
      r.getWhatsapp(),
      r.getWhatsappParents(),
      r.getEmail(),
      r.getEcole(),
      r.getFiliere(),
      r.getNiveau(),
      r.getNiveauEtude(),
      r.getFiliereEtude(),
      r.getContactUrgenceNom(),
      r.getContactUrgenceTelephone(),
      r.getNomPere(),
      r.getNomMere(),
      r.getPreferredLanguage(),
      r.getActivityScore(),
      r.getPaymentsCount(),
      r.getInteractionsCount(),
      r.getLastActiveAt(),
      r.getDateEntree(),
      r.getDateSortie(),
      r.getStatut(),
      r.getCreatedAt(),
      r.getUpdatedAt(),
      current == null ? null : current.getRoom().getId(),
      current == null ? null : current.getRoom().getNumeroChambre()
    );
  }

  private String normalizeOptional(String value) {
    if (value == null) return null;
    String v = value.trim();
    return v.isEmpty() ? null : v;
  }

  private String normalizeRequired(String value) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required field is empty");
    }
    return normalized;
  }
}
