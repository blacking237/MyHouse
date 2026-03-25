package com.ambercity.manager.module.meter;

import com.ambercity.manager.module.meter.domain.IndexReadingEntity;
import com.ambercity.manager.module.meter.domain.MonthConfigEntity;
import com.ambercity.manager.module.meter.dto.IndexReadingRequest;
import com.ambercity.manager.module.meter.dto.IndexReadingResponse;
import com.ambercity.manager.module.meter.repo.IndexReadingRepository;
import com.ambercity.manager.module.meter.repo.MonthConfigRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IndexReadingService {

  private static final Pattern MOIS_PATTERN = Pattern.compile("^\\d{4}-\\d{2}$");

  private final IndexReadingRepository indexReadingRepository;
  private final RoomRepository roomRepository;
  private final MonthConfigRepository monthConfigRepository;

  public IndexReadingService(
    IndexReadingRepository indexReadingRepository,
    RoomRepository roomRepository,
    MonthConfigRepository monthConfigRepository
  ) {
    this.indexReadingRepository = indexReadingRepository;
    this.roomRepository = roomRepository;
    this.monthConfigRepository = monthConfigRepository;
  }

  @Transactional(readOnly = true)
  public List<IndexReadingResponse> listByMois(String mois) {
    validateMois(mois);
    return indexReadingRepository.findByMoisOrderByRoomNumeroChambreAsc(mois).stream()
      .map(this::toResponse)
      .toList();
  }

  @Transactional
  public IndexReadingResponse upsert(IndexReadingRequest request, String actorRole) {
    validateMois(request.mois());
    validateIndexes(request);

    MonthConfigEntity config = monthConfigRepository.findByMois(request.mois())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month config not found"));
    boolean isResident = "RESIDENT".equalsIgnoreCase(actorRole);
    if (!isResident) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Index entry reserved for residents");
    }
    LocalDate today = LocalDate.now();
    int startDay = config.getIndexWindowStartDay() == null ? 1 : config.getIndexWindowStartDay();
    int endDay = config.getIndexWindowEndDay() == null ? 31 : config.getIndexWindowEndDay();
    boolean withinWindow = today.getDayOfMonth() >= startDay && today.getDayOfMonth() <= endDay;
    if (isResident && !withinWindow) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Index window closed for residents");
    }

    RoomEntity room = roomRepository.findById(request.roomId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
    if (!room.isActif()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room is inactive");
    }

    IndexReadingEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? indexReadingRepository.findByExternalId(request.externalId()).orElseGet(IndexReadingEntity::new)
      : indexReadingRepository.findByRoomIdAndMois(request.roomId(), request.mois()).orElseGet(IndexReadingEntity::new);

    entity.setRoom(room);
    entity.setMois(request.mois());
    entity.setAnEau(request.anEau());
    entity.setNiEau(request.niEau());
    entity.setAnElec(request.anElec());
    entity.setNiElec(request.niElec());
    entity.setStatutPresence(request.statutPresence().trim().toUpperCase());
    entity.setAmendeEau(request.amendeEau());
    entity.setLateSubmission(!withinWindow);
    entity.setSaisiPar(request.saisiPar().trim());
    entity.setSaisiLe(LocalDateTime.now());
    entity.setUpdatedAt(LocalDateTime.now());
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }

    return toResponse(indexReadingRepository.save(entity));
  }

  private void validateIndexes(IndexReadingRequest request) {
    if (request.niEau().compareTo(request.anEau()) < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NI eau must be >= AN eau");
    }
    if (request.niElec().compareTo(request.anElec()) < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NI elec must be >= AN elec");
    }
  }

  private IndexReadingResponse toResponse(IndexReadingEntity e) {
    return new IndexReadingResponse(
      e.getId(),
      e.getExternalId(),
      e.getRoom().getId(),
      e.getRoom().getNumeroChambre(),
      e.getMois(),
      e.getAnEau(),
      e.getNiEau(),
      e.getAnElec(),
      e.getNiElec(),
      e.getStatutPresence(),
      e.isAmendeEau(),
      e.isLateSubmission(),
      e.getSaisiPar(),
      e.getSaisiLe(),
      e.getUpdatedAt()
    );
  }

  private void validateMois(String mois) {
    if (mois == null || !MOIS_PATTERN.matcher(mois).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mois format, expected YYYY-MM");
    }
  }
}
