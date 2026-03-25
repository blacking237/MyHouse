package com.ambercity.manager.module.auth;

import com.ambercity.manager.module.auth.domain.RefreshTokenEntity;
import com.ambercity.manager.module.auth.domain.UserEntity;
import com.ambercity.manager.module.auth.domain.UserRole;
import com.ambercity.manager.module.auth.domain.UserStatus;
import com.ambercity.manager.module.auth.dto.AccessTokenResponse;
import com.ambercity.manager.module.auth.dto.AuthResponse;
import com.ambercity.manager.module.auth.dto.ChangePasswordRequest;
import com.ambercity.manager.module.auth.dto.CreateUserRequest;
import com.ambercity.manager.module.auth.dto.LoginRequest;
import com.ambercity.manager.module.auth.dto.MeResponse;
import com.ambercity.manager.module.auth.dto.RecoveryCodeRequest;
import com.ambercity.manager.module.auth.dto.RecoveryEmailResponse;
import com.ambercity.manager.module.auth.dto.RecoverPasswordRequest;
import com.ambercity.manager.module.auth.dto.SetRecoveryEmailRequest;
import com.ambercity.manager.module.auth.dto.UserSummaryResponse;
import com.ambercity.manager.module.audit.ActivityLogService;
import com.ambercity.manager.module.notification.NotificationService;
import com.ambercity.manager.module.notification.dto.NotificationRequest;
import com.ambercity.manager.module.auth.repo.RefreshTokenRepository;
import com.ambercity.manager.module.auth.repo.UserRepository;
import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.shared.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final SecureRandomService secureRandomService;
  private final RecoveryEmailService recoveryEmailService;
  private final ResidentRepository residentRepository;
  private final NotificationService notificationService;
  private final ActivityLogService activityLogService;

  @Value("${app.security.jwt.refresh-token-seconds:2592000}")
  private long refreshTokenSeconds;

  @Value("${app.security.recovery.admin-code:MT-RECOVER-2026}")
  private String recoveryAdminCode;

  @Value("${app.security.recovery.code-ttl-minutes:15}")
  private long recoveryCodeTtlMinutes;

  public AuthService(
    UserRepository userRepository,
    RefreshTokenRepository refreshTokenRepository,
    PasswordEncoder passwordEncoder,
    JwtService jwtService,
    SecureRandomService secureRandomService,
    RecoveryEmailService recoveryEmailService,
    ResidentRepository residentRepository,
    NotificationService notificationService,
    ActivityLogService activityLogService
  ) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.secureRandomService = secureRandomService;
    this.recoveryEmailService = recoveryEmailService;
    this.residentRepository = residentRepository;
    this.notificationService = notificationService;
    this.activityLogService = activityLogService;
  }

  @Transactional
  public AuthResponse login(LoginRequest request) {
    UserEntity user = userRepository.findByUsernameAndActifTrue(request.username())
      .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

    if (user.getStatus() != UserStatus.ACTIVE) {
      throw new BadCredentialsException("Account not active");
    }

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new BadCredentialsException("Invalid credentials");
    }

    user.setLastLoginAt(LocalDateTime.now());
    userRepository.save(user);
    activityLogService.log(user.getId(), user.getUsername(), user.getRole().name(), "LOGIN", "Login success");

    String accessToken = jwtService.generateAccessToken(user);
    String refreshToken = secureRandomService.generateToken();
    saveRefreshToken(user, refreshToken);

    return new AuthResponse(
      accessToken,
      refreshToken,
      jwtService.getAccessTokenSeconds(),
      new AuthResponse.UserView(user.getId(), user.getUsername(), user.getRole().name(), user.isActif(), user.getStatus().name())
    );
  }

  @Transactional
  public AccessTokenResponse refresh(String rawRefreshToken) {
    String hash = sha256(rawRefreshToken);
    RefreshTokenEntity token = refreshTokenRepository.findByTokenHash(hash)
      .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

    if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
      throw new BadCredentialsException("Refresh token expired or revoked");
    }

    UserEntity user = token.getUser();
    if (user == null || !user.isActif()) {
      throw new BadCredentialsException("User inactive");
    }

    token.setRevokedAt(LocalDateTime.now());
    refreshTokenRepository.save(token);

    String newRefresh = secureRandomService.generateToken();
    saveRefreshToken(user, newRefresh);

    return new AccessTokenResponse(jwtService.generateAccessToken(user), jwtService.getAccessTokenSeconds());
  }

  @Transactional
  public void logout(String rawRefreshToken) {
    String hash = sha256(rawRefreshToken);
    Optional<RefreshTokenEntity> token = refreshTokenRepository.findByTokenHash(hash);
    token.ifPresent(t -> {
      t.setRevokedAt(LocalDateTime.now());
      refreshTokenRepository.save(t);
    });
  }

  public MeResponse me(Authentication authentication) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    UserEntity user = userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));
    return new MeResponse(
      user.getId(),
      user.getUsername(),
      user.getRole().name(),
      user.getResidentId(),
      user.getStatus().name(),
      user.getConsentAt() == null ? null : user.getConsentAt().toString()
    );
  }

  @Transactional
  public void changePassword(Authentication authentication, ChangePasswordRequest request) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    UserEntity user = userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));
    if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
      throw new BadCredentialsException("Old password invalid");
    }
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);
    refreshTokenRepository.deleteByUserId(user.getId());
    activityLogService.log(user.getId(), user.getUsername(), user.getRole().name(), "CHANGE_PASSWORD", "Password changed");
  }

  @Transactional
  public void recoverPassword(RecoverPasswordRequest request) {
    UserEntity user = userRepository.findByUsernameAndActifTrue(request.username())
      .orElseThrow(() -> new BadCredentialsException("User not found"));

    boolean emergencyCode = recoveryAdminCode.equals(request.recoveryCode());
    boolean otpCodeValid = false;
    if (!emergencyCode && user.getRecoveryCodeHash() != null && user.getRecoveryCodeExpiresAt() != null) {
      otpCodeValid = passwordEncoder.matches(request.recoveryCode(), user.getRecoveryCodeHash())
        && user.getRecoveryCodeExpiresAt().isAfter(LocalDateTime.now());
    }
    if (!emergencyCode && !otpCodeValid) {
      throw new BadCredentialsException("Invalid recovery code");
    }

    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    user.setRecoveryCodeHash(null);
    user.setRecoveryCodeExpiresAt(null);
    userRepository.save(user);
    refreshTokenRepository.deleteByUserId(user.getId());
    activityLogService.log(user.getId(), user.getUsername(), user.getRole().name(), "RECOVER_PASSWORD", "Password recovery");
  }

  @Transactional
  public void requestRecoveryCode(RecoveryCodeRequest request) {
    UserEntity user = userRepository.findByUsernameAndActifTrue(request.username())
      .orElseThrow(() -> new BadCredentialsException("User not found"));

    String email = user.getRecoveryEmail();
    if (email == null || email.isBlank()) {
      throw new BadCredentialsException("Recovery email not configured");
    }

    String code = String.format(Locale.ROOT, "%06d", secureRandomService.nextInt(1_000_000));
    user.setRecoveryCodeHash(passwordEncoder.encode(code));
    user.setRecoveryCodeExpiresAt(LocalDateTime.now().plusMinutes(recoveryCodeTtlMinutes));
    userRepository.save(user);
    recoveryEmailService.sendRecoveryCode(email, user.getUsername(), code);
    activityLogService.log(user.getId(), user.getUsername(), user.getRole().name(), "RECOVERY_CODE_EMAIL", "Recovery code sent via email");
  }

  @Transactional
  public void requestRecoveryCodeViaChannel(RecoveryCodeRequest request, String channel) {
    UserEntity user = userRepository.findByUsernameAndActifTrue(request.username())
      .orElseThrow(() -> new BadCredentialsException("User not found"));

    String recipient = null;
    if (user.getResidentId() != null) {
      ResidentEntity resident = residentRepository.findById(user.getResidentId())
        .orElseThrow(() -> new BadCredentialsException("Resident not found"));
      recipient = resident.getWhatsapp() != null && !resident.getWhatsapp().isBlank()
        ? resident.getWhatsapp()
        : resident.getTelephone();
    }
    if (recipient == null || recipient.isBlank()) {
      throw new BadCredentialsException("Recipient phone not available");
    }

    String code = String.format(Locale.ROOT, "%06d", secureRandomService.nextInt(1_000_000));
    user.setRecoveryCodeHash(passwordEncoder.encode(code));
    user.setRecoveryCodeExpiresAt(LocalDateTime.now().plusMinutes(recoveryCodeTtlMinutes));
    userRepository.save(user);

    notificationService.send(new NotificationRequest(
      channel,
      recipient,
      "OTP MyHouse",
      "Code de recuperation: " + code,
      null
    ));
    activityLogService.log(user.getId(), user.getUsername(), user.getRole().name(), "RECOVERY_CODE_" + channel, "Recovery code sent");
  }

  @Transactional
  public RecoveryEmailResponse setRecoveryEmail(Authentication authentication, SetRecoveryEmailRequest request) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    UserEntity user = userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));
    user.setRecoveryEmail(request.email().trim());
    userRepository.save(user);
    return new RecoveryEmailResponse(user.getRecoveryEmail());
  }

  @Transactional(readOnly = true)
  public RecoveryEmailResponse getRecoveryEmail(Authentication authentication) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    UserEntity user = userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));
    return new RecoveryEmailResponse(user.getRecoveryEmail());
  }

  @Transactional
  public UserSummaryResponse createUser(Authentication authentication, CreateUserRequest request) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    UserEntity creator = userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));

    UserRole targetRole = parseRole(request.role());
    if (!canCreate(creator.getRole(), targetRole)) {
      throw new BadCredentialsException("Not allowed to create this role");
    }
    String username = request.username().trim().toLowerCase();
    if (userRepository.findByUsername(username).isPresent()) {
      throw new BadCredentialsException("Username already exists");
    }
    UserEntity user = new UserEntity();
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRole(targetRole);
    UserStatus initialStatus = shouldAutoActivate(creator.getRole(), targetRole)
      ? UserStatus.ACTIVE
      : UserStatus.PENDING;
    user.setStatus(initialStatus);
    user.setActif(true);
    user.setCreatedAt(LocalDateTime.now());
    user.setCreatedBy(creator.getUsername());
    user.setCreatedByRole(creator.getRole().name());
    user.setCreatedByUserId(creator.getId());
    if (initialStatus == UserStatus.ACTIVE) {
      user.setValidatedAt(LocalDateTime.now());
    }
    if (request.residentExternalId() != null && !request.residentExternalId().isBlank()) {
      ResidentEntity resident = residentRepository.findByExternalId(request.residentExternalId())
        .orElseThrow(() -> new BadCredentialsException("Resident not found"));
      user.setResidentId(resident.getId());
    }
    UserEntity saved = userRepository.save(user);
    activityLogService.log(creator.getId(), creator.getUsername(), creator.getRole().name(), "CREATE_USER", "Create " + targetRole.name());
    return toSummary(saved);
  }

  @Transactional(readOnly = true)
  public List<UserSummaryResponse> listPending(Authentication authentication) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    UserEntity approver = userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));

    List<UserEntity> users = switch (approver.getRole()) {
      case SUPER_ADMIN -> userRepository.findByStatus(UserStatus.PENDING);
      case ADMIN_COMMERCIAL -> userRepository.findByStatusAndRoleIn(UserStatus.PENDING, List.of(UserRole.MANAGER));
      case MANAGER -> userRepository.findByStatusAndCreatedByUserId(UserStatus.PENDING, approver.getId());
      default -> List.of();
    };

    return users.stream().map(this::toSummary).toList();
  }

  @Transactional
  public UserSummaryResponse approveUser(Authentication authentication, Long userId) {
    UserEntity approver = requireApprover(authentication);
    UserEntity target = userRepository.findById(userId)
      .orElseThrow(() -> new BadCredentialsException("User not found"));
    if (!canApprove(approver.getRole(), target.getRole())) {
      throw new BadCredentialsException("Not allowed to approve");
    }
    target.setStatus(UserStatus.ACTIVE);
    target.setValidatedAt(LocalDateTime.now());
    target.setRejectedAt(null);
    UserEntity saved = userRepository.save(target);
    activityLogService.log(approver.getId(), approver.getUsername(), approver.getRole().name(), "APPROVE_USER", "Approve " + target.getUsername());
    return toSummary(saved);
  }

  @Transactional
  public UserSummaryResponse rejectUser(Authentication authentication, Long userId, String reason) {
    UserEntity approver = requireApprover(authentication);
    UserEntity target = userRepository.findById(userId)
      .orElseThrow(() -> new BadCredentialsException("User not found"));
    if (!canApprove(approver.getRole(), target.getRole())) {
      throw new BadCredentialsException("Not allowed to reject");
    }
    target.setStatus(UserStatus.REJECTED);
    target.setRejectedAt(LocalDateTime.now());
    target.setActif(false);
    UserEntity saved = userRepository.save(target);
    activityLogService.log(approver.getId(), approver.getUsername(), approver.getRole().name(), "REJECT_USER", reason == null ? "Rejected" : reason);
    return toSummary(saved);
  }

  @Transactional
  public void acceptConsent(Authentication authentication) {
    UserEntity user = requireApprover(authentication);
    user.setConsentAt(LocalDateTime.now());
    userRepository.save(user);
    activityLogService.log(user.getId(), user.getUsername(), user.getRole().name(), "CONSENT_ACCEPTED", "User consent accepted");
  }

  private UserRole parseRole(String raw) {
    try {
      return UserRole.valueOf(raw.trim().toUpperCase());
    } catch (Exception ex) {
      throw new BadCredentialsException("Invalid role");
    }
  }

  private boolean canCreate(UserRole creator, UserRole target) {
    return switch (creator) {
      case SUPER_ADMIN -> true;
      case ADMIN_COMMERCIAL -> target == UserRole.MANAGER;
      case ADMIN_SAV -> target == UserRole.ADMIN_SAV;
      case ADMIN_JURIDIQUE -> target == UserRole.ADMIN_JURIDIQUE;
      case ADMIN_COMPTA -> target == UserRole.ADMIN_COMPTA;
      case MANAGER -> target == UserRole.CONCIERGE || target == UserRole.RESIDENT;
      default -> false;
    };
  }

  private boolean canApprove(UserRole approver, UserRole target) {
    return switch (approver) {
      case SUPER_ADMIN -> true;
      case ADMIN_COMMERCIAL -> target == UserRole.MANAGER;
      case MANAGER -> target == UserRole.CONCIERGE || target == UserRole.RESIDENT;
      default -> false;
    };
  }

  private boolean shouldAutoActivate(UserRole creator, UserRole target) {
    return switch (creator) {
      case SUPER_ADMIN -> true;
      case MANAGER -> target == UserRole.CONCIERGE || target == UserRole.RESIDENT;
      default -> false;
    };
  }

  private UserEntity requireApprover(Authentication authentication) {
    if (authentication == null || authentication.getPrincipal() == null) {
      throw new BadCredentialsException("Unauthenticated");
    }
    JwtService.TokenPrincipal principal = (JwtService.TokenPrincipal) authentication.getPrincipal();
    return userRepository.findById(principal.userId())
      .orElseThrow(() -> new BadCredentialsException("User not found"));
  }

  private UserSummaryResponse toSummary(UserEntity saved) {
    return new UserSummaryResponse(
      saved.getId(),
      saved.getUsername(),
      saved.getRole().name(),
      saved.isActif(),
      saved.getCreatedBy(),
      saved.getStatus().name(),
      saved.getCreatedAt() == null ? null : saved.getCreatedAt().toString(),
      saved.getValidatedAt() == null ? null : saved.getValidatedAt().toString(),
      saved.getRejectedAt() == null ? null : saved.getRejectedAt().toString()
    );
  }

  private void saveRefreshToken(UserEntity user, String rawRefreshToken) {
    RefreshTokenEntity rt = new RefreshTokenEntity();
    rt.setUser(user);
    rt.setTokenHash(sha256(rawRefreshToken));
    rt.setCreatedAt(LocalDateTime.now());
    rt.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenSeconds));
    refreshTokenRepository.save(rt);
  }

  private String sha256(String input) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }

  @Service
  public static class SecureRandomService {
    public String generateToken() {
      byte[] data = new byte[48];
      new java.security.SecureRandom().nextBytes(data);
      return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    public int nextInt(int bound) {
      return new java.security.SecureRandom().nextInt(bound);
    }
  }
}
