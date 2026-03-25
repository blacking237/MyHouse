package com.ambercity.manager.module.notification.repo;

import com.ambercity.manager.module.notification.domain.NotificationEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
  List<NotificationEntity> findByStatus(String status);
}
