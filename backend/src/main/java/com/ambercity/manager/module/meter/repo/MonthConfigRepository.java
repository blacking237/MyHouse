package com.ambercity.manager.module.meter.repo;

import com.ambercity.manager.module.meter.domain.MonthConfigEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonthConfigRepository extends JpaRepository<MonthConfigEntity, Long> {
  Optional<MonthConfigEntity> findByMois(String mois);
}
