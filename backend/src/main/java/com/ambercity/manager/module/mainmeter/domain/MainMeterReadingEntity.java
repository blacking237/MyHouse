package com.ambercity.manager.module.mainmeter.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "main_meter_readings")
public class MainMeterReadingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @Column(name = "reading_date", nullable = false)
  private LocalDate readingDate;

  @Column(name = "water_index", nullable = false, precision = 12, scale = 2)
  private BigDecimal waterIndex;

  @Column(name = "electric_index", nullable = false, precision = 12, scale = 2)
  private BigDecimal electricIndex;

  @Column
  private String note;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public LocalDate getReadingDate() { return readingDate; }
  public void setReadingDate(LocalDate readingDate) { this.readingDate = readingDate; }
  public BigDecimal getWaterIndex() { return waterIndex; }
  public void setWaterIndex(BigDecimal waterIndex) { this.waterIndex = waterIndex; }
  public BigDecimal getElectricIndex() { return electricIndex; }
  public void setElectricIndex(BigDecimal electricIndex) { this.electricIndex = electricIndex; }
  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public LocalDateTime getDeletedAt() { return deletedAt; }
  public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
