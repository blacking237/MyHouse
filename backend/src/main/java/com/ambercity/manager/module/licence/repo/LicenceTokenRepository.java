package com.ambercity.manager.module.licence.repo;

import com.ambercity.manager.module.licence.domain.LicenceTokenEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LicenceTokenRepository extends JpaRepository<LicenceTokenEntity, Long> {
  Optional<LicenceTokenEntity> findByExternalId(String externalId);
}
