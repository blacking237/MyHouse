package com.ambercity.manager.module.adminsettings.repo;

import com.ambercity.manager.module.adminsettings.domain.GlobalSettingEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalSettingRepository extends JpaRepository<GlobalSettingEntity, Long> {
  Optional<GlobalSettingEntity> findBySettingKey(String settingKey);
}
