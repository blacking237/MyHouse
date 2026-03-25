package com.ambercity.manager.module.marketplace.repo;

import com.ambercity.manager.module.marketplace.domain.MarketplaceSubscriptionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketplaceSubscriptionRepository extends JpaRepository<MarketplaceSubscriptionEntity, Long> {
  List<MarketplaceSubscriptionEntity> findByUserIdOrderByStartedAtDesc(Long userId);
}
