package com.ambercity.manager.module.auth;

import com.ambercity.manager.module.auth.dto.AccessTokenResponse;
import com.ambercity.manager.module.auth.dto.AuthResponse;
import com.ambercity.manager.module.auth.dto.ChangePasswordRequest;
import com.ambercity.manager.module.auth.dto.CreateUserRequest;
import com.ambercity.manager.module.auth.dto.LoginRequest;
import com.ambercity.manager.module.auth.dto.MeResponse;
import com.ambercity.manager.module.auth.dto.RecoveryCodeRequest;
import com.ambercity.manager.module.auth.dto.RecoveryEmailResponse;
import com.ambercity.manager.module.auth.dto.RecoverPasswordRequest;
import com.ambercity.manager.module.auth.dto.RefreshRequest;
import com.ambercity.manager.module.auth.dto.SetRecoveryEmailRequest;
import com.ambercity.manager.module.auth.dto.UserDecisionRequest;
import com.ambercity.manager.module.auth.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  public AccessTokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
    return authService.refresh(request.refreshToken());
  }

  @PostMapping("/change-password")
  public void changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
    authService.changePassword(authentication, request);
  }

  @PostMapping("/recover-password")
  public void recoverPassword(@Valid @RequestBody RecoverPasswordRequest request) {
    authService.recoverPassword(request);
  }

  @PostMapping("/recover-password/request-code")
  public void requestRecoveryCode(@Valid @RequestBody RecoveryCodeRequest request) {
    authService.requestRecoveryCode(request);
  }

  @PostMapping("/recover-password/request-code/whatsapp")
  public void requestRecoveryCodeWhatsapp(@Valid @RequestBody RecoveryCodeRequest request) {
    authService.requestRecoveryCodeViaChannel(request, "WHATSAPP");
  }

  @PostMapping("/recover-password/request-code/push")
  public void requestRecoveryCodePush(@Valid @RequestBody RecoveryCodeRequest request) {
    authService.requestRecoveryCodeViaChannel(request, "PUSH");
  }

  @DeleteMapping("/logout")
  public void logout(@Valid @RequestBody RefreshRequest request) {
    authService.logout(request.refreshToken());
  }

  @GetMapping("/me")
  public MeResponse me(Authentication authentication) {
    try {
      return authService.me(authentication);
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }
  }

  @GetMapping("/recovery-email")
  public RecoveryEmailResponse getRecoveryEmail(Authentication authentication) {
    return authService.getRecoveryEmail(authentication);
  }

  @PostMapping("/recovery-email")
  public RecoveryEmailResponse setRecoveryEmail(
    Authentication authentication,
    @Valid @RequestBody SetRecoveryEmailRequest request
  ) {
    return authService.setRecoveryEmail(authentication, request);
  }

  @PostMapping("/users")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','ADMIN_SAV','ADMIN_JURIDIQUE','ADMIN_COMPTA','MANAGER')")
  public UserSummaryResponse createUser(Authentication authentication, @Valid @RequestBody CreateUserRequest request) {
    return authService.createUser(authentication, request);
  }

  @GetMapping("/users/pending")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public java.util.List<UserSummaryResponse> listPending(Authentication authentication) {
    return authService.listPending(authentication);
  }

  @PostMapping("/users/{id}/approve")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public UserSummaryResponse approveUser(
    Authentication authentication,
    @PathVariable("id") Long id
  ) {
    return authService.approveUser(authentication, id);
  }

  @PostMapping("/users/{id}/reject")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public UserSummaryResponse rejectUser(
    Authentication authentication,
    @PathVariable("id") Long id,
    @RequestBody(required = false) UserDecisionRequest request
  ) {
    return authService.rejectUser(authentication, id, request == null ? null : request.reason());
  }

  @PostMapping("/consent")
  public void acceptConsent(Authentication authentication) {
    authService.acceptConsent(authentication);
  }

  @GetMapping("/ping")
  public Map<String, String> ping() {
    return Map.of("status", "ok", "module", "auth");
  }
}
