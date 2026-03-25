package com.ambercity.manager.module.auth.repo;

import com.ambercity.manager.module.auth.domain.UserEntity;
import com.ambercity.manager.module.auth.domain.UserRole;
import com.ambercity.manager.module.auth.domain.UserStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  Optional<UserEntity> findByUsernameAndActifTrue(String username);
  Optional<UserEntity> findByUsername(String username);
  List<UserEntity> findByStatus(UserStatus status);
  List<UserEntity> findByStatusAndRoleIn(UserStatus status, Collection<UserRole> roles);
  List<UserEntity> findByStatusAndCreatedByUserId(UserStatus status, Long createdByUserId);
}
