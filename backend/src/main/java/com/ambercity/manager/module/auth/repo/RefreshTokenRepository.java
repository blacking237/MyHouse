package com.ambercity.manager.module.auth.repo;

import com.ambercity.manager.module.auth.domain.RefreshTokenEntity;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, Long> {
  Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);
  long deleteByExpiresAtBeforeOrRevokedAtIsNotNull(LocalDateTime expiresAt);
  long deleteByUserId(Long userId);
}
