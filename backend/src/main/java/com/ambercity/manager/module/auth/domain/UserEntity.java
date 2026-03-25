package com.ambercity.manager.module.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class UserEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 80)
  private String username;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private UserRole role;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private UserStatus status = UserStatus.PENDING;

  @Column(nullable = false)
  private boolean actif = true;

  @Column(name = "resident_id")
  private Long residentId;

  @Column(name = "created_by", length = 80)
  private String createdBy;

  @Column(name = "created_by_role", length = 20)
  private String createdByRole;

  @Column(name = "created_by_user_id")
  private Long createdByUserId;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "validated_at")
  private LocalDateTime validatedAt;

  @Column(name = "rejected_at")
  private LocalDateTime rejectedAt;

  @Column(name = "consent_at")
  private LocalDateTime consentAt;

  @Column(name = "last_login_at")
  private LocalDateTime lastLoginAt;

  @Column(name = "recovery_email", length = 160)
  private String recoveryEmail;

  @Column(name = "recovery_code_hash", length = 255)
  private String recoveryCodeHash;

  @Column(name = "recovery_code_expires_at")
  private LocalDateTime recoveryCodeExpiresAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public UserRole getRole() {
    return role;
  }

  public void setRole(UserRole role) {
    this.role = role;
  }

  public UserStatus getStatus() {
    return status;
  }

  public void setStatus(UserStatus status) {
    this.status = status;
  }

  public boolean isActif() {
    return actif;
  }

  public void setActif(boolean actif) {
    this.actif = actif;
  }

  public Long getResidentId() {
    return residentId;
  }

  public void setResidentId(Long residentId) {
    this.residentId = residentId;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public String getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(String createdBy) {
    this.createdBy = createdBy;
  }

  public String getCreatedByRole() {
    return createdByRole;
  }

  public void setCreatedByRole(String createdByRole) {
    this.createdByRole = createdByRole;
  }

  public Long getCreatedByUserId() {
    return createdByUserId;
  }

  public void setCreatedByUserId(Long createdByUserId) {
    this.createdByUserId = createdByUserId;
  }

  public LocalDateTime getValidatedAt() {
    return validatedAt;
  }

  public void setValidatedAt(LocalDateTime validatedAt) {
    this.validatedAt = validatedAt;
  }

  public LocalDateTime getRejectedAt() {
    return rejectedAt;
  }

  public void setRejectedAt(LocalDateTime rejectedAt) {
    this.rejectedAt = rejectedAt;
  }

  public LocalDateTime getConsentAt() {
    return consentAt;
  }

  public void setConsentAt(LocalDateTime consentAt) {
    this.consentAt = consentAt;
  }

  public LocalDateTime getLastLoginAt() {
    return lastLoginAt;
  }

  public void setLastLoginAt(LocalDateTime lastLoginAt) {
    this.lastLoginAt = lastLoginAt;
  }

  public String getRecoveryEmail() {
    return recoveryEmail;
  }

  public void setRecoveryEmail(String recoveryEmail) {
    this.recoveryEmail = recoveryEmail;
  }

  public String getRecoveryCodeHash() {
    return recoveryCodeHash;
  }

  public void setRecoveryCodeHash(String recoveryCodeHash) {
    this.recoveryCodeHash = recoveryCodeHash;
  }

  public LocalDateTime getRecoveryCodeExpiresAt() {
    return recoveryCodeExpiresAt;
  }

  public void setRecoveryCodeExpiresAt(LocalDateTime recoveryCodeExpiresAt) {
    this.recoveryCodeExpiresAt = recoveryCodeExpiresAt;
  }
}
