package com.ambercity.manager.module.maintenance.domain;

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
import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_tickets")
public class MaintenanceTicketEntity {

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

  @Column(length = 120)
  private String category;

  @Column(length = 20)
  private String priority;

  @Column(length = 20)
  private String status;

  @Column(length = 20)
  private String responsibility;

  @Column(name = "estimated_cost", precision = 12, scale = 2)
  private BigDecimal estimatedCost;

  @Column(name = "penalty_amount", precision = 12, scale = 2)
  private BigDecimal penaltyAmount;

  @Column(name = "penalty_applied_at")
  private LocalDateTime penaltyAppliedAt;

  @Column(name = "due_at")
  private LocalDateTime dueAt;

  @Column
  private String notes;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Column(name = "resolved_at")
  private LocalDateTime resolvedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public RoomEntity getRoom() { return room; }
  public void setRoom(RoomEntity room) { this.room = room; }
  public ResidentEntity getResident() { return resident; }
  public void setResident(ResidentEntity resident) { this.resident = resident; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public String getPriority() { return priority; }
  public void setPriority(String priority) { this.priority = priority; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getResponsibility() { return responsibility; }
  public void setResponsibility(String responsibility) { this.responsibility = responsibility; }
  public BigDecimal getEstimatedCost() { return estimatedCost; }
  public void setEstimatedCost(BigDecimal estimatedCost) { this.estimatedCost = estimatedCost; }
  public BigDecimal getPenaltyAmount() { return penaltyAmount; }
  public void setPenaltyAmount(BigDecimal penaltyAmount) { this.penaltyAmount = penaltyAmount; }
  public LocalDateTime getPenaltyAppliedAt() { return penaltyAppliedAt; }
  public void setPenaltyAppliedAt(LocalDateTime penaltyAppliedAt) { this.penaltyAppliedAt = penaltyAppliedAt; }
  public LocalDateTime getDueAt() { return dueAt; }
  public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public LocalDateTime getResolvedAt() { return resolvedAt; }
  public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}
