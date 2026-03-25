package com.ambercity.manager.module.exit.repo;

import com.ambercity.manager.module.exit.domain.ExitReportEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExitReportRepository extends JpaRepository<ExitReportEntity, Long> {
  Optional<ExitReportEntity> findByExternalId(String externalId);
}
