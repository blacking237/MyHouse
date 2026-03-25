package com.ambercity.manager.module.audit;

import com.ambercity.manager.module.audit.domain.ActivityLogEntity;
import com.ambercity.manager.module.audit.repo.ActivityLogRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityLogService {

  private final ActivityLogRepository repository;

  public ActivityLogService(ActivityLogRepository repository) {
    this.repository = repository;
  }

  @Transactional
  public void log(Long userId, String username, String role, String action, String context) {
    ActivityLogEntity entity = new ActivityLogEntity();
    entity.setUserId(userId);
    entity.setUsername(username);
    entity.setRole(role);
    entity.setAction(action);
    entity.setContext(context);
    entity.setCreatedAt(LocalDateTime.now());
    repository.save(entity);
  }

  @Transactional(readOnly = true)
  public List<ActivityLogEntity> latest() {
    return repository.findTop200ByOrderByCreatedAtDesc();
  }
}
