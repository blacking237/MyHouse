package com.ambercity.manager.module.maintenance;

import com.ambercity.manager.module.maintenance.domain.MaintenanceTicketEntity;
import com.ambercity.manager.module.maintenance.dto.MaintenanceTicketRequest;
import com.ambercity.manager.module.maintenance.dto.MaintenanceTicketResponse;
import com.ambercity.manager.module.maintenance.repo.MaintenanceTicketRepository;
import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MaintenanceService {

  private final MaintenanceTicketRepository repository;
  private final RoomRepository roomRepository;
  private final ResidentRepository residentRepository;

  public MaintenanceService(
    MaintenanceTicketRepository repository,
    RoomRepository roomRepository,
    ResidentRepository residentRepository
  ) {
    this.repository = repository;
    this.roomRepository = roomRepository;
    this.residentRepository = residentRepository;
  }

  @Transactional
  public List<MaintenanceTicketResponse> listAll() {
    List<MaintenanceTicketEntity> tickets = repository.findAll();
    boolean updated = false;
    LocalDateTime now = LocalDateTime.now();
    for (MaintenanceTicketEntity ticket : tickets) {
      if (ticket.getDueAt() == null) {
        ticket.setDueAt(calculateDueAt(ticket.getCreatedAt(), ticket.getPriority()));
        updated = true;
      }
      if (shouldApplyPenalty(ticket, now)) {
        ticket.setPenaltyAppliedAt(now);
        ticket.setUpdatedAt(now);
        updated = true;
      }
    }
    if (updated) {
      repository.saveAll(tickets);
    }
    return tickets.stream().map(this::toResponse).toList();
  }

  @Transactional
  public MaintenanceTicketResponse upsert(MaintenanceTicketRequest request) {
    RoomEntity room = roomRepository.findByNumeroChambreIgnoreCase(request.roomNumero())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
    ResidentEntity resident = request.residentExternalId() == null || request.residentExternalId().isBlank()
      ? null
      : residentRepository.findByExternalId(request.residentExternalId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found"));

    MaintenanceTicketEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? repository.findByExternalId(request.externalId()).orElseGet(MaintenanceTicketEntity::new)
      : new MaintenanceTicketEntity();
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }
    entity.setRoom(room);
    entity.setResident(resident);
    entity.setCategory(request.category());
    entity.setPriority(request.priority());
    entity.setStatus(request.status());
    entity.setResponsibility(request.responsibility());
    entity.setEstimatedCost(request.estimatedCost());
    entity.setPenaltyAmount(request.penaltyAmount());
    entity.setNotes(request.notes());
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    if (entity.getDueAt() == null) {
      entity.setDueAt(calculateDueAt(entity.getCreatedAt(), entity.getPriority()));
    }
    entity.setUpdatedAt(LocalDateTime.now());
    if ("RESOLU".equalsIgnoreCase(request.status())) {
      entity.setResolvedAt(LocalDateTime.now());
    }
    if (shouldApplyPenalty(entity, LocalDateTime.now())) {
      entity.setPenaltyAppliedAt(LocalDateTime.now());
    }
    return toResponse(repository.save(entity));
  }

  @Transactional
  public MaintenanceTicketResponse applyPenalty(Long id) {
    MaintenanceTicketEntity entity = repository.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
    entity.setPenaltyAppliedAt(LocalDateTime.now());
    entity.setUpdatedAt(LocalDateTime.now());
    return toResponse(repository.save(entity));
  }

  private MaintenanceTicketResponse toResponse(MaintenanceTicketEntity entity) {
    String residentName = entity.getResident() == null
      ? null
      : (entity.getResident().getNom() + " " + entity.getResident().getPrenom()).trim();
    boolean overdue = entity.getDueAt() != null
      && entity.getResolvedAt() == null
      && entity.getDueAt().isBefore(LocalDateTime.now());
    return new MaintenanceTicketResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getRoom() == null ? null : entity.getRoom().getNumeroChambre(),
      entity.getResident() == null ? null : entity.getResident().getId(),
      residentName,
      entity.getCategory(),
      entity.getPriority(),
      entity.getStatus(),
      entity.getResponsibility(),
      entity.getEstimatedCost(),
      entity.getPenaltyAmount(),
      entity.getPenaltyAppliedAt(),
      entity.getDueAt(),
      overdue,
      entity.getNotes(),
      entity.getCreatedAt(),
      entity.getUpdatedAt(),
      entity.getResolvedAt()
    );
  }

  private LocalDateTime calculateDueAt(LocalDateTime createdAt, String priority) {
    if (createdAt == null) {
      createdAt = LocalDateTime.now();
    }
    String normalized = priority == null ? "" : priority.trim().toUpperCase();
    int days = switch (normalized) {
      case "HAUTE" -> 2;
      case "BASSE" -> 10;
      default -> 5;
    };
    return createdAt.plus(days, ChronoUnit.DAYS);
  }

  private boolean shouldApplyPenalty(MaintenanceTicketEntity entity, LocalDateTime now) {
    if (entity.getPenaltyAppliedAt() != null) return false;
    if (entity.getResolvedAt() != null) return false;
    if (entity.getDueAt() == null) return false;
    return entity.getDueAt().isBefore(now);
  }
}
