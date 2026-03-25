package com.ambercity.manager.module.maintenance.repo;

import com.ambercity.manager.module.maintenance.domain.MaintenanceTicketEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicketEntity, Long> {
  Optional<MaintenanceTicketEntity> findByExternalId(String externalId);
  List<MaintenanceTicketEntity> findByStatusIgnoreCase(String status);
}
