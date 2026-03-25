package com.ambercity.manager.module.marketplace.repo;

import com.ambercity.manager.module.marketplace.domain.MarketplaceTransactionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketplaceTransactionRepository extends JpaRepository<MarketplaceTransactionEntity, Long> {
  List<MarketplaceTransactionEntity> findByListingIdOrderByCreatedAtDesc(Long listingId);
}
