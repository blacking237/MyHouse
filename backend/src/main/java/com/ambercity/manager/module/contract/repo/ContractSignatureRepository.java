package com.ambercity.manager.module.contract.repo;

import com.ambercity.manager.module.contract.domain.ContractSignatureEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractSignatureRepository extends JpaRepository<ContractSignatureEntity, Long> {
  List<ContractSignatureEntity> findByContractIdOrderBySignedAtAsc(Long contractId);
}
