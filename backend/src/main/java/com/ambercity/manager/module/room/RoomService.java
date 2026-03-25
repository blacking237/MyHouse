package com.ambercity.manager.module.room;

import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.dto.CreateRoomRequest;
import com.ambercity.manager.module.room.dto.PatchRoomRequest;
import com.ambercity.manager.module.room.dto.RoomResponse;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoomService {

  private final RoomRepository roomRepository;

  public RoomService(RoomRepository roomRepository) {
    this.roomRepository = roomRepository;
  }

  @Transactional(readOnly = true)
  public List<RoomResponse> findAll(Boolean actif) {
    List<RoomEntity> rows = actif == null
      ? roomRepository.findAllByOrderByNumeroChambreAsc()
      : roomRepository.findByActifOrderByNumeroChambreAsc(actif);
    return rows.stream().map(this::toResponse).toList();
  }

  @Transactional
  public RoomResponse create(CreateRoomRequest request) {
    String numero = normalizeRoomNumber(request.numeroChambre());
    if (roomRepository.existsByNumeroChambreIgnoreCase(numero)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Room number already exists");
    }

    RoomEntity entity = new RoomEntity();
    entity.setNumeroChambre(numero);
    entity.setBloc(normalizeOptional(request.bloc()));
    entity.setActif(true);
    entity.setCreatedAt(LocalDateTime.now());
    entity.setUpdatedAt(LocalDateTime.now());
    entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
      ? UUID.randomUUID().toString()
      : request.externalId());

    try {
      return toResponse(roomRepository.save(entity));
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Room number already exists");
    }
  }

  @Transactional
  public RoomResponse patch(Long id, PatchRoomRequest request) {
    RoomEntity entity = roomRepository.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

    if (request.numeroChambre() != null && !request.numeroChambre().isBlank()) {
      String numero = normalizeRoomNumber(request.numeroChambre());
      if (!numero.equalsIgnoreCase(entity.getNumeroChambre())
        && roomRepository.existsByNumeroChambreIgnoreCase(numero)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Room number already exists");
      }
      entity.setNumeroChambre(numero);
    }

    if (request.bloc() != null) {
      entity.setBloc(normalizeOptional(request.bloc()));
    }
    if (request.actif() != null) {
      entity.setActif(request.actif());
    }
    if (request.externalId() != null && !request.externalId().isBlank()) {
      entity.setExternalId(request.externalId());
    }
    entity.setUpdatedAt(LocalDateTime.now());

    try {
      return toResponse(roomRepository.save(entity));
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Room number already exists");
    }
  }

  private RoomResponse toResponse(RoomEntity entity) {
    return new RoomResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getNumeroChambre(),
      entity.getBloc(),
      entity.isActif(),
      entity.getCreatedAt(),
      entity.getUpdatedAt()
    );
  }

  private String normalizeRoomNumber(String value) {
    return value == null ? null : value.trim().toUpperCase();
  }

  private String normalizeOptional(String value) {
    if (value == null) return null;
    String v = value.trim();
    return v.isEmpty() ? null : v;
  }
}
