package com.ambercity.manager.module.marketplace.repo;

import com.ambercity.manager.module.marketplace.domain.MarketplaceListingEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListingEntity, Long> {
  Optional<MarketplaceListingEntity> findByExternalId(String externalId);
}
