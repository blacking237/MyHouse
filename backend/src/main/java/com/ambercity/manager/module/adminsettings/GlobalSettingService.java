package com.ambercity.manager.module.adminsettings;

import com.ambercity.manager.module.adminsettings.domain.GlobalSettingEntity;
import com.ambercity.manager.module.adminsettings.dto.GlobalSettingRequest;
import com.ambercity.manager.module.adminsettings.dto.GlobalSettingResponse;
import com.ambercity.manager.module.adminsettings.repo.GlobalSettingRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlobalSettingService {

  private final GlobalSettingRepository repository;

  public GlobalSettingService(GlobalSettingRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public List<GlobalSettingResponse> listAll() {
    return repository.findAll().stream().map(this::toResponse).toList();
  }

  @Transactional
  public GlobalSettingResponse upsert(GlobalSettingRequest request) {
    GlobalSettingEntity entity = repository.findBySettingKey(request.settingKey())
      .orElseGet(GlobalSettingEntity::new);
    entity.setSettingKey(request.settingKey());
    entity.setSettingValue(request.settingValue());
    entity.setUpdatedAt(LocalDateTime.now());
    return toResponse(repository.save(entity));
  }

  private GlobalSettingResponse toResponse(GlobalSettingEntity entity) {
    return new GlobalSettingResponse(
      entity.getId(),
      entity.getSettingKey(),
      entity.getSettingValue(),
      entity.getUpdatedAt()
    );
  }
}
