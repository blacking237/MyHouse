package com.ambercity.manager.module.meter.repo;

import com.ambercity.manager.module.meter.domain.IndexReadingEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexReadingRepository extends JpaRepository<IndexReadingEntity, Long> {
  List<IndexReadingEntity> findByMoisOrderByRoomNumeroChambreAsc(String mois);
  Optional<IndexReadingEntity> findByRoomIdAndMois(Long roomId, String mois);
  Optional<IndexReadingEntity> findByExternalId(String externalId);
}
