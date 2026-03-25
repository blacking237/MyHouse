package com.ambercity.manager.module.commoncharge.repo;

import com.ambercity.manager.module.commoncharge.domain.CommonChargeAssignmentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommonChargeAssignmentRepository extends JpaRepository<CommonChargeAssignmentEntity, Long> {
  List<CommonChargeAssignmentEntity> findByScopeTypeIgnoreCaseAndScopeValueIgnoreCase(String scopeType, String scopeValue);
}
