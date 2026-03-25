package com.ambercity.manager.module.meter.domain;

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
@Table(name = "month_config")
public class MonthConfigEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 7)
  private String mois;

  @Column(name = "pu_eau", nullable = false, precision = 12, scale = 2)
  private BigDecimal puEau;

  @Column(name = "pu_electricite", nullable = false, precision = 12, scale = 2)
  private BigDecimal puElectricite;

  @Column(nullable = false, precision = 8, scale = 4)
  private BigDecimal tva;

  @Column(name = "lc_eau", nullable = false, precision = 12, scale = 2)
  private BigDecimal lcEau;

  @Column(name = "lc_electricite", nullable = false, precision = 12, scale = 2)
  private BigDecimal lcElectricite;

  @Column(name = "surplus_eau_total", nullable = false, precision = 12, scale = 2)
  private BigDecimal surplusEauTotal;

  @Column(name = "surplus_elec_total", nullable = false, precision = 12, scale = 2)
  private BigDecimal surplusElecTotal;

  @Column(name = "internet_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal internetFee;

  @Column(name = "common_charges_percent", nullable = false, precision = 6, scale = 2)
  private BigDecimal commonChargesPercent;

  @Column(name = "penalty_missing_index", nullable = false, precision = 12, scale = 2)
  private BigDecimal penaltyMissingIndex;

  @Column(name = "index_window_start_day")
  private Integer indexWindowStartDay;

  @Column(name = "index_window_end_day")
  private Integer indexWindowEndDay;

  @Column(name = "amende_eau_montant", nullable = false, precision = 12, scale = 2)
  private BigDecimal amendeEauMontant;

  @Column(name = "minimum_facture", nullable = false, precision = 12, scale = 2)
  private BigDecimal minimumFacture;

  @Column(name = "delai_paiement", nullable = false)
  private LocalDate delaiPaiement;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getMois() { return mois; }
  public void setMois(String mois) { this.mois = mois; }
  public BigDecimal getPuEau() { return puEau; }
  public void setPuEau(BigDecimal puEau) { this.puEau = puEau; }
  public BigDecimal getPuElectricite() { return puElectricite; }
  public void setPuElectricite(BigDecimal puElectricite) { this.puElectricite = puElectricite; }
  public BigDecimal getTva() { return tva; }
  public void setTva(BigDecimal tva) { this.tva = tva; }
  public BigDecimal getLcEau() { return lcEau; }
  public void setLcEau(BigDecimal lcEau) { this.lcEau = lcEau; }
  public BigDecimal getLcElectricite() { return lcElectricite; }
  public void setLcElectricite(BigDecimal lcElectricite) { this.lcElectricite = lcElectricite; }
  public BigDecimal getSurplusEauTotal() { return surplusEauTotal; }
  public void setSurplusEauTotal(BigDecimal surplusEauTotal) { this.surplusEauTotal = surplusEauTotal; }
  public BigDecimal getSurplusElecTotal() { return surplusElecTotal; }
  public void setSurplusElecTotal(BigDecimal surplusElecTotal) { this.surplusElecTotal = surplusElecTotal; }
  public BigDecimal getInternetFee() { return internetFee; }
  public void setInternetFee(BigDecimal internetFee) { this.internetFee = internetFee; }
  public BigDecimal getCommonChargesPercent() { return commonChargesPercent; }
  public void setCommonChargesPercent(BigDecimal commonChargesPercent) { this.commonChargesPercent = commonChargesPercent; }
  public BigDecimal getPenaltyMissingIndex() { return penaltyMissingIndex; }
  public void setPenaltyMissingIndex(BigDecimal penaltyMissingIndex) { this.penaltyMissingIndex = penaltyMissingIndex; }
  public Integer getIndexWindowStartDay() { return indexWindowStartDay; }
  public void setIndexWindowStartDay(Integer indexWindowStartDay) { this.indexWindowStartDay = indexWindowStartDay; }
  public Integer getIndexWindowEndDay() { return indexWindowEndDay; }
  public void setIndexWindowEndDay(Integer indexWindowEndDay) { this.indexWindowEndDay = indexWindowEndDay; }
  public BigDecimal getAmendeEauMontant() { return amendeEauMontant; }
  public void setAmendeEauMontant(BigDecimal amendeEauMontant) { this.amendeEauMontant = amendeEauMontant; }
  public BigDecimal getMinimumFacture() { return minimumFacture; }
  public void setMinimumFacture(BigDecimal minimumFacture) { this.minimumFacture = minimumFacture; }
  public LocalDate getDelaiPaiement() { return delaiPaiement; }
  public void setDelaiPaiement(LocalDate delaiPaiement) { this.delaiPaiement = delaiPaiement; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
