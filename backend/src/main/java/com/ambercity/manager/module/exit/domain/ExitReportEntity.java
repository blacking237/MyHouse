package com.ambercity.manager.module.exit.domain;

import com.ambercity.manager.module.contract.domain.ContractEntity;
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
@Table(name = "exit_reports")
public class ExitReportEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @ManyToOne
  @JoinColumn(name = "resident_id")
  private ResidentEntity resident;

  @ManyToOne
  @JoinColumn(name = "room_id")
  private RoomEntity room;

  @ManyToOne
  @JoinColumn(name = "contract_id")
  private ContractEntity contract;

  @Column(name = "debt_total", precision = 12, scale = 2)
  private BigDecimal debtTotal;

  @Column(name = "repair_cost", precision = 12, scale = 2)
  private BigDecimal repairCost;

  @Column(name = "deposit_used", precision = 12, scale = 2)
  private BigDecimal depositUsed;

  @Column(name = "deposit_total", precision = 12, scale = 2)
  private BigDecimal depositTotal;

  @Column(name = "common_charges", precision = 12, scale = 2)
  private BigDecimal commonCharges;

  @Column(precision = 12, scale = 2)
  private BigDecimal balance;

  @Column
  private String notes;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public ResidentEntity getResident() { return resident; }
  public void setResident(ResidentEntity resident) { this.resident = resident; }
  public RoomEntity getRoom() { return room; }
  public void setRoom(RoomEntity room) { this.room = room; }
  public ContractEntity getContract() { return contract; }
  public void setContract(ContractEntity contract) { this.contract = contract; }
  public BigDecimal getDebtTotal() { return debtTotal; }
  public void setDebtTotal(BigDecimal debtTotal) { this.debtTotal = debtTotal; }
  public BigDecimal getRepairCost() { return repairCost; }
  public void setRepairCost(BigDecimal repairCost) { this.repairCost = repairCost; }
  public BigDecimal getDepositUsed() { return depositUsed; }
  public void setDepositUsed(BigDecimal depositUsed) { this.depositUsed = depositUsed; }
  public BigDecimal getDepositTotal() { return depositTotal; }
  public void setDepositTotal(BigDecimal depositTotal) { this.depositTotal = depositTotal; }
  public BigDecimal getCommonCharges() { return commonCharges; }
  public void setCommonCharges(BigDecimal commonCharges) { this.commonCharges = commonCharges; }
  public BigDecimal getBalance() { return balance; }
  public void setBalance(BigDecimal balance) { this.balance = balance; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
