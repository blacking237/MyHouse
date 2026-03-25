package com.ambercity.manager.module.licence.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "licence_tokens")
public class LicenceTokenEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String token;

  @Column(length = 20, nullable = false)
  private String status;

  @Column(length = 20, nullable = false)
  private String mode;

  @Column(name = "issued_at", nullable = false)
  private LocalDateTime issuedAt;

  @Column(name = "expires_at")
  private LocalDateTime expiresAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public String getToken() { return token; }
  public void setToken(String token) { this.token = token; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getMode() { return mode; }
  public void setMode(String mode) { this.mode = mode; }
  public LocalDateTime getIssuedAt() { return issuedAt; }
  public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
  public LocalDateTime getExpiresAt() { return expiresAt; }
  public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}
