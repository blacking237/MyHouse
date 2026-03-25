package com.ambercity.manager.module.resident.repo;

import com.ambercity.manager.module.resident.domain.ResidentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResidentRepository extends JpaRepository<ResidentEntity, Long> {
  Optional<ResidentEntity> findByCni(String cni);
  Optional<ResidentEntity> findByExternalId(String externalId);
  boolean existsByCni(String cni);
  List<ResidentEntity> findAllByOrderByNomAscPrenomAsc();
}
