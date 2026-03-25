package com.ambercity.manager.module.commoncharge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "common_charges")
public class CommonChargeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true, length = 40, nullable = false)
  private String code;

  @Column(length = 120, nullable = false)
  private String label;

  @Column(precision = 12, scale = 2, nullable = false)
  private BigDecimal amount;

  @Column(nullable = false)
  private boolean required;

  @Column(nullable = false)
  private boolean active;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public String getLabel() { return label; }
  public void setLabel(String label) { this.label = label; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public boolean isRequired() { return required; }
  public void setRequired(boolean required) { this.required = required; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
