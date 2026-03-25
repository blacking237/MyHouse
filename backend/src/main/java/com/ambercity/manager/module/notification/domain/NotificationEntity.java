package com.ambercity.manager.module.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class NotificationEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @Column(nullable = false, length = 30)
  private String channel;

  @Column(length = 160)
  private String recipient;

  @Column(length = 160)
  private String subject;

  @Column
  private String payload;

  @Column(length = 20)
  private String status;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "sent_at")
  private LocalDateTime sentAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public String getChannel() { return channel; }
  public void setChannel(String channel) { this.channel = channel; }
  public String getRecipient() { return recipient; }
  public void setRecipient(String recipient) { this.recipient = recipient; }
  public String getSubject() { return subject; }
  public void setSubject(String subject) { this.subject = subject; }
  public String getPayload() { return payload; }
  public void setPayload(String payload) { this.payload = payload; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getSentAt() { return sentAt; }
  public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}
