package com.ambercity.manager.module.notification;

import com.ambercity.manager.module.notification.dto.NotificationRequest;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class NotificationDispatcher {

  @Value("${app.notifications.whatsapp.enabled:false}")
  private boolean whatsappEnabled;

  @Value("${app.notifications.sendgrid.enabled:false}")
  private boolean sendgridEnabled;

  @Value("${app.notifications.expo.enabled:false}")
  private boolean expoEnabled;

  public DispatchResult dispatch(NotificationRequest request) {
    String channel = request.channel() == null ? "" : request.channel().trim().toUpperCase();
    boolean enabled = switch (channel) {
      case "WHATSAPP" -> whatsappEnabled;
      case "EMAIL", "SENDGRID" -> sendgridEnabled;
      case "PUSH", "EXPO" -> expoEnabled;
      default -> false;
    };
    if (!enabled) {
      return new DispatchResult("QUEUED", null);
    }
    return new DispatchResult("SENT", LocalDateTime.now());
  }

  public record DispatchResult(String status, LocalDateTime sentAt) {}
}
