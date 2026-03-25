package com.ambercity.manager.module.marketplace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "marketplace_listings")
public class MarketplaceListingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(precision = 12, scale = 2)
  private BigDecimal price;

  @Column(length = 10)
  private String currency;

  @Column(name = "listing_type", nullable = false, length = 40)
  private String listingType;

  @Column(nullable = false, length = 20)
  private String status;

  @Column(length = 200)
  private String address;

  @Column(precision = 10, scale = 6)
  private BigDecimal latitude;

  @Column(precision = 10, scale = 6)
  private BigDecimal longitude;

  @Column(name = "owner_user_id")
  private Long ownerUserId;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public BigDecimal getPrice() { return price; }
  public void setPrice(BigDecimal price) { this.price = price; }
  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }
  public String getListingType() { return listingType; }
  public void setListingType(String listingType) { this.listingType = listingType; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getAddress() { return address; }
  public void setAddress(String address) { this.address = address; }
  public BigDecimal getLatitude() { return latitude; }
  public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
  public BigDecimal getLongitude() { return longitude; }
  public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
  public Long getOwnerUserId() { return ownerUserId; }
  public void setOwnerUserId(Long ownerUserId) { this.ownerUserId = ownerUserId; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
