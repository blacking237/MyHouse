package com.ambercity.manager.module.room.repo;

import com.ambercity.manager.module.room.domain.RoomEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<RoomEntity, Long> {
  boolean existsByNumeroChambreIgnoreCase(String numeroChambre);
  Optional<RoomEntity> findByNumeroChambreIgnoreCase(String numeroChambre);
  Optional<RoomEntity> findByExternalId(String externalId);
  List<RoomEntity> findByActifOrderByNumeroChambreAsc(boolean actif);
  List<RoomEntity> findAllByOrderByNumeroChambreAsc();
}
