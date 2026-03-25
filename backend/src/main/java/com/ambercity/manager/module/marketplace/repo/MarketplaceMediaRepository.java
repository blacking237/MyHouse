package com.ambercity.manager.module.marketplace.repo;

import com.ambercity.manager.module.marketplace.domain.MarketplaceMediaEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketplaceMediaRepository extends JpaRepository<MarketplaceMediaEntity, Long> {
  List<MarketplaceMediaEntity> findByListingIdOrderBySortOrderAsc(Long listingId);
}
