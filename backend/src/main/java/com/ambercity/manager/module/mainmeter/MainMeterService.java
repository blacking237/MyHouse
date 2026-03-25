package com.ambercity.manager.module.mainmeter;

import com.ambercity.manager.module.mainmeter.domain.MainMeterReadingEntity;
import com.ambercity.manager.module.mainmeter.dto.MainMeterReadingRequest;
import com.ambercity.manager.module.mainmeter.dto.MainMeterReadingResponse;
import com.ambercity.manager.module.mainmeter.repo.MainMeterReadingRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MainMeterService {

  private final MainMeterReadingRepository repository;

  public MainMeterService(MainMeterReadingRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public List<MainMeterReadingResponse> listAll() {
    return repository.findAllByOrderByReadingDateDesc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public MainMeterReadingResponse upsert(MainMeterReadingRequest request) {
    LocalDate date = LocalDate.parse(request.date());
    MainMeterReadingEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? repository.findByExternalId(request.externalId()).orElseGet(MainMeterReadingEntity::new)
      : repository.findByReadingDate(date).orElseGet(MainMeterReadingEntity::new);
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }
    entity.setReadingDate(date);
    entity.setWaterIndex(request.waterIndex());
    entity.setElectricIndex(request.electricIndex());
    entity.setNote(request.note());
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    return toResponse(repository.save(entity));
  }

  @Transactional
  public void delete(Long id) {
    MainMeterReadingEntity entity = repository.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reading not found"));
    entity.setDeletedAt(LocalDateTime.now());
    entity.setUpdatedAt(LocalDateTime.now());
    repository.save(entity);
  }

  private MainMeterReadingResponse toResponse(MainMeterReadingEntity entity) {
    return new MainMeterReadingResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getReadingDate(),
      entity.getWaterIndex(),
      entity.getElectricIndex(),
      entity.getNote(),
      entity.getCreatedAt(),
      entity.getUpdatedAt()
    );
  }
}
