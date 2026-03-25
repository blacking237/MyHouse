package com.ambercity.manager.module.marketplace.domain;

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
@Table(name = "marketplace_transactions")
public class MarketplaceTransactionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "listing_id")
  private MarketplaceListingEntity listing;

  @Column(name = "buyer_contact", length = 120)
  private String buyerContact;

  @Column(precision = 12, scale = 2, nullable = false)
  private BigDecimal amount;

  @Column(name = "commission_rate", precision = 5, scale = 2, nullable = false)
  private BigDecimal commissionRate;

  @Column(name = "commission_amount", precision = 12, scale = 2, nullable = false)
  private BigDecimal commissionAmount;

  @Column(length = 20, nullable = false)
  private String status;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public MarketplaceListingEntity getListing() { return listing; }
  public void setListing(MarketplaceListingEntity listing) { this.listing = listing; }
  public String getBuyerContact() { return buyerContact; }
  public void setBuyerContact(String buyerContact) { this.buyerContact = buyerContact; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public BigDecimal getCommissionRate() { return commissionRate; }
  public void setCommissionRate(BigDecimal commissionRate) { this.commissionRate = commissionRate; }
  public BigDecimal getCommissionAmount() { return commissionAmount; }
  public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
