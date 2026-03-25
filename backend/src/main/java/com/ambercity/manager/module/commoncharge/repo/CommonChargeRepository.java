package com.ambercity.manager.module.commoncharge.repo;

import com.ambercity.manager.module.commoncharge.domain.CommonChargeEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommonChargeRepository extends JpaRepository<CommonChargeEntity, Long> {
  Optional<CommonChargeEntity> findByCode(String code);
}
