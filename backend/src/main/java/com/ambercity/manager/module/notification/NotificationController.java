package com.ambercity.manager.module.notification;

import com.ambercity.manager.module.notification.dto.NotificationRequest;
import com.ambercity.manager.module.notification.dto.NotificationResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

  private final NotificationService notificationService;

  public NotificationController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_SAV','ADMIN_COMMERCIAL','ADMIN_JURIDIQUE','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public NotificationResponse send(@Valid @RequestBody NotificationRequest request) {
    return notificationService.send(request);
  }
}
