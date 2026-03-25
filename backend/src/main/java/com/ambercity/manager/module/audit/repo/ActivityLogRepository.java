package com.ambercity.manager.module.audit.repo;

import com.ambercity.manager.module.audit.domain.ActivityLogEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLogEntity, Long> {
  List<ActivityLogEntity> findTop200ByOrderByCreatedAtDesc();
}
