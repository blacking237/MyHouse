package com.ambercity.manager.module.billing.domain;

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
@Table(name = "invoices")
public class InvoiceEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "room_id")
  private RoomEntity room;

  @ManyToOne
  @JoinColumn(name = "resident_id")
  private ResidentEntity resident;

  @Column(nullable = false, length = 7)
  private String mois;

  @Column(name = "total_eau_ttc", nullable = false, precision = 12, scale = 2)
  private BigDecimal totalEauTtc;

  @Column(name = "total_elec_ttc", nullable = false, precision = 12, scale = 2)
  private BigDecimal totalElecTtc;

  @Column(name = "total_facture", nullable = false, precision = 12, scale = 2)
  private BigDecimal totalFacture;

  @Column(name = "internet_fee", precision = 12, scale = 2)
  private BigDecimal internetFee;

  @Column(name = "common_charges", precision = 12, scale = 2)
  private BigDecimal commonCharges;

  @Column(name = "penalty_missing_index", precision = 12, scale = 2)
  private BigDecimal penaltyMissingIndex;

  @Column(precision = 12, scale = 2)
  private BigDecimal loyer;

  @Column(precision = 12, scale = 2)
  private BigDecimal dette;

  @Column(name = "net_a_payer", nullable = false, precision = 12, scale = 2)
  private BigDecimal netAPayer;

  @Column(name = "statut_envoi", nullable = false, length = 20)
  private String statutEnvoi;

  @Column(name = "date_envoi")
  private LocalDateTime dateEnvoi;

  @Column(name = "calculee_le", nullable = false)
  private LocalDateTime calculeeLe;

  @Column(name = "external_id")
  private String externalId;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public RoomEntity getRoom() { return room; }
  public void setRoom(RoomEntity room) { this.room = room; }
  public ResidentEntity getResident() { return resident; }
  public void setResident(ResidentEntity resident) { this.resident = resident; }
  public String getMois() { return mois; }
  public void setMois(String mois) { this.mois = mois; }
  public BigDecimal getTotalEauTtc() { return totalEauTtc; }
  public void setTotalEauTtc(BigDecimal totalEauTtc) { this.totalEauTtc = totalEauTtc; }
  public BigDecimal getTotalElecTtc() { return totalElecTtc; }
  public void setTotalElecTtc(BigDecimal totalElecTtc) { this.totalElecTtc = totalElecTtc; }
  public BigDecimal getTotalFacture() { return totalFacture; }
  public void setTotalFacture(BigDecimal totalFacture) { this.totalFacture = totalFacture; }
  public BigDecimal getInternetFee() { return internetFee; }
  public void setInternetFee(BigDecimal internetFee) { this.internetFee = internetFee; }
  public BigDecimal getCommonCharges() { return commonCharges; }
  public void setCommonCharges(BigDecimal commonCharges) { this.commonCharges = commonCharges; }
  public BigDecimal getPenaltyMissingIndex() { return penaltyMissingIndex; }
  public void setPenaltyMissingIndex(BigDecimal penaltyMissingIndex) { this.penaltyMissingIndex = penaltyMissingIndex; }
  public BigDecimal getLoyer() { return loyer; }
  public void setLoyer(BigDecimal loyer) { this.loyer = loyer; }
  public BigDecimal getDette() { return dette; }
  public void setDette(BigDecimal dette) { this.dette = dette; }
  public BigDecimal getNetAPayer() { return netAPayer; }
  public void setNetAPayer(BigDecimal netAPayer) { this.netAPayer = netAPayer; }
  public String getStatutEnvoi() { return statutEnvoi; }
  public void setStatutEnvoi(String statutEnvoi) { this.statutEnvoi = statutEnvoi; }
  public LocalDateTime getDateEnvoi() { return dateEnvoi; }
  public void setDateEnvoi(LocalDateTime dateEnvoi) { this.dateEnvoi = dateEnvoi; }
  public LocalDateTime getCalculeeLe() { return calculeeLe; }
  public void setCalculeeLe(LocalDateTime calculeeLe) { this.calculeeLe = calculeeLe; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public LocalDateTime getDeletedAt() { return deletedAt; }
  public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
