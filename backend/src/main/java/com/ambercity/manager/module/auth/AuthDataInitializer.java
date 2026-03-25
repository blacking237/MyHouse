package com.ambercity.manager.module.auth;

import com.ambercity.manager.module.auth.domain.UserEntity;
import com.ambercity.manager.module.auth.domain.UserRole;
import com.ambercity.manager.module.auth.domain.UserStatus;
import com.ambercity.manager.module.auth.repo.UserRepository;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AuthDataInitializer implements CommandLineRunner {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final boolean resetDefaultAdminOnStartup;

  public AuthDataInitializer(
    UserRepository userRepository,
    PasswordEncoder passwordEncoder,
    @Value("${app.security.bootstrap.reset-default-admin-on-startup:true}") boolean resetDefaultAdminOnStartup
  ) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.resetDefaultAdminOnStartup = resetDefaultAdminOnStartup;
  }

  @Override
  public void run(String... args) {
    UserEntity admin = userRepository.findByUsername("admin").orElseGet(() -> {
      UserEntity u = new UserEntity();
      u.setUsername("admin");
      u.setRole(UserRole.SUPER_ADMIN);
      u.setStatus(UserStatus.ACTIVE);
      u.setCreatedAt(LocalDateTime.now());
      u.setCreatedBy("system");
      return u;
    });

    if (admin.getId() == null || resetDefaultAdminOnStartup) {
      admin.setPasswordHash(passwordEncoder.encode("admin123"));
      admin.setActif(true);
      admin.setStatus(UserStatus.ACTIVE);
      userRepository.save(admin);
    }

    userRepository.findByUsername("manager").orElseGet(() -> {
      UserEntity u = new UserEntity();
      u.setUsername("manager");
      u.setRole(UserRole.MANAGER);
      u.setStatus(UserStatus.ACTIVE);
      u.setCreatedAt(LocalDateTime.now());
      u.setCreatedBy("admin");
      u.setPasswordHash(passwordEncoder.encode("manager123"));
      u.setActif(true);
      return userRepository.save(u);
    });
  }
}
