package com.ambercity.manager.module.ocr;

import com.ambercity.manager.module.auth.AuthService;
import com.ambercity.manager.module.auth.dto.CreateUserRequest;
import com.ambercity.manager.module.notification.NotificationService;
import com.ambercity.manager.module.notification.dto.NotificationRequest;
import com.ambercity.manager.module.ocr.dto.OcrIdentityRequest;
import com.ambercity.manager.module.ocr.dto.OcrIdentityResponse;
import com.ambercity.manager.module.ocr.dto.OcrRegisterRequest;
import com.ambercity.manager.module.resident.ResidentService;
import com.ambercity.manager.module.resident.dto.ResidentResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ocr")
public class OcrController {

  private final OcrService ocrService;
  private final ResidentService residentService;
  private final AuthService authService;
  private final NotificationService notificationService;

  public OcrController(
    OcrService ocrService,
    ResidentService residentService,
    AuthService authService,
    NotificationService notificationService
  ) {
    this.ocrService = ocrService;
    this.residentService = residentService;
    this.authService = authService;
    this.notificationService = notificationService;
  }

  @PostMapping("/identity")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public OcrIdentityResponse parseIdentity(@Valid @RequestBody OcrIdentityRequest request) {
    return ocrService.parseIdentity(request);
  }

  @PostMapping("/identity/register")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public Map<String, Object> registerIdentity(
    Authentication authentication,
    @Valid @RequestBody OcrRegisterRequest request
  ) {
    ResidentResponse resident = residentService.create(request.resident());
    authService.createUser(authentication, new CreateUserRequest(
      request.username(),
      request.password(),
      "RESIDENT",
      resident.externalId()
    ));
    String recipient = resident.whatsapp() != null ? resident.whatsapp() : resident.telephone();
    if (recipient != null && !recipient.isBlank()) {
      String message = "Vos acces MyHouse: " + request.username() + " / " + request.password();
      notificationService.send(new NotificationRequest("WHATSAPP", recipient, "Acces MyHouse", message, null));
    }
    return Map.of(
      "residentId", resident.id(),
      "residentExternalId", resident.externalId(),
      "username", request.username()
    );
  }
}
