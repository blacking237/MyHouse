package com.ambercity.manager.module.contract.domain;

import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.room.domain.RoomEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts")
public class ContractEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @ManyToOne
  @JoinColumn(name = "room_id")
  private RoomEntity room;

  @ManyToOne
  @JoinColumn(name = "resident_id")
  private ResidentEntity resident;

  @Column(nullable = false, length = 30)
  private String status;

  @Column(name = "signing_mode", nullable = false, length = 20)
  private String signingMode;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(name = "monthly_rent", precision = 12, scale = 2)
  private BigDecimal monthlyRent;

  @Column(precision = 12, scale = 2)
  private BigDecimal deposit;

  @Column(name = "auto_renewal")
  private boolean autoRenewal;

  @Column
  private String notes;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Column(name = "validated_at")
  private LocalDateTime validatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public RoomEntity getRoom() { return room; }
  public void setRoom(RoomEntity room) { this.room = room; }
  public ResidentEntity getResident() { return resident; }
  public void setResident(ResidentEntity resident) { this.resident = resident; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getSigningMode() { return signingMode; }
  public void setSigningMode(String signingMode) { this.signingMode = signingMode; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public BigDecimal getMonthlyRent() { return monthlyRent; }
  public void setMonthlyRent(BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }
  public BigDecimal getDeposit() { return deposit; }
  public void setDeposit(BigDecimal deposit) { this.deposit = deposit; }
  public boolean isAutoRenewal() { return autoRenewal; }
  public void setAutoRenewal(boolean autoRenewal) { this.autoRenewal = autoRenewal; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public LocalDateTime getValidatedAt() { return validatedAt; }
  public void setValidatedAt(LocalDateTime validatedAt) { this.validatedAt = validatedAt; }
}
