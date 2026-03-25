package com.ambercity.manager.module.resident.repo;

import com.ambercity.manager.module.resident.domain.ResidentRoomHistoryEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResidentRoomHistoryRepository extends JpaRepository<ResidentRoomHistoryEntity, Long> {
  Optional<ResidentRoomHistoryEntity> findFirstByResidentIdAndDateFinIsNullOrderByDateDebutDesc(Long residentId);
  Optional<ResidentRoomHistoryEntity> findFirstByRoomIdAndDateFinIsNullOrderByDateDebutDesc(Long roomId);
}
