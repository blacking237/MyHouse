package com.ambercity.manager.module.notification;

import com.ambercity.manager.module.notification.domain.NotificationEntity;
import com.ambercity.manager.module.notification.dto.NotificationRequest;
import com.ambercity.manager.module.notification.dto.NotificationResponse;
import com.ambercity.manager.module.notification.repo.NotificationRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

  private final NotificationRepository repository;
  private final NotificationDispatcher dispatcher;

  public NotificationService(NotificationRepository repository, NotificationDispatcher dispatcher) {
    this.repository = repository;
    this.dispatcher = dispatcher;
  }

  @Transactional
  public NotificationResponse send(NotificationRequest request) {
    NotificationEntity entity = new NotificationEntity();
    entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
      ? UUID.randomUUID().toString()
      : request.externalId());
    entity.setChannel(request.channel());
    entity.setRecipient(request.recipient());
    entity.setSubject(request.subject());
    entity.setPayload(request.payload());
    NotificationDispatcher.DispatchResult result = dispatcher.dispatch(request);
    entity.setStatus(result.status());
    entity.setCreatedAt(LocalDateTime.now());
    entity.setSentAt(result.sentAt());
    return toResponse(repository.save(entity));
  }

  private NotificationResponse toResponse(NotificationEntity entity) {
    return new NotificationResponse(
      entity.getId(),
      entity.getChannel(),
      entity.getRecipient(),
      entity.getSubject(),
      entity.getPayload(),
      entity.getStatus(),
      entity.getCreatedAt(),
      entity.getSentAt()
    );
  }
}
