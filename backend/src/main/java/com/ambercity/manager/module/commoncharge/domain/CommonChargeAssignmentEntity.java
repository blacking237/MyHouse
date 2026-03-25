package com.ambercity.manager.module.commoncharge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "common_charge_assignments")
public class CommonChargeAssignmentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "charge_id")
  private CommonChargeEntity charge;

  @Column(name = "scope_type", length = 20, nullable = false)
  private String scopeType;

  @Column(name = "scope_value", length = 60, nullable = false)
  private String scopeValue;

  @Column(nullable = false)
  private boolean required;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public CommonChargeEntity getCharge() { return charge; }
  public void setCharge(CommonChargeEntity charge) { this.charge = charge; }
  public String getScopeType() { return scopeType; }
  public void setScopeType(String scopeType) { this.scopeType = scopeType; }
  public String getScopeValue() { return scopeValue; }
  public void setScopeValue(String scopeValue) { this.scopeValue = scopeValue; }
  public boolean isRequired() { return required; }
  public void setRequired(boolean required) { this.required = required; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
