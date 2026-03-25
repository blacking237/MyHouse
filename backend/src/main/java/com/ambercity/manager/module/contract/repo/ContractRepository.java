package com.ambercity.manager.module.contract.repo;

import com.ambercity.manager.module.contract.domain.ContractEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractRepository extends JpaRepository<ContractEntity, Long> {
  Optional<ContractEntity> findByRoomIdAndStatusIn(Long roomId, List<String> statuses);
  Optional<ContractEntity> findByExternalId(String externalId);
}
