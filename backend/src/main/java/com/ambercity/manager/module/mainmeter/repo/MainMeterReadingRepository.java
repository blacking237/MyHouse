package com.ambercity.manager.module.mainmeter.repo;

import com.ambercity.manager.module.mainmeter.domain.MainMeterReadingEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MainMeterReadingRepository extends JpaRepository<MainMeterReadingEntity, Long> {
  Optional<MainMeterReadingEntity> findByExternalId(String externalId);
  Optional<MainMeterReadingEntity> findByReadingDate(LocalDate readingDate);
  List<MainMeterReadingEntity> findAllByOrderByReadingDateDesc();
}
