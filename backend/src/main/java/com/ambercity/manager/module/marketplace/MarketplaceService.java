package com.ambercity.manager.module.marketplace;

import com.ambercity.manager.module.marketplace.domain.MarketplaceListingEntity;
import com.ambercity.manager.module.marketplace.domain.MarketplaceMediaEntity;
import com.ambercity.manager.module.marketplace.domain.MarketplaceSubscriptionEntity;
import com.ambercity.manager.module.marketplace.domain.MarketplaceTransactionEntity;
import com.ambercity.manager.module.marketplace.dto.MarketplaceListingRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceListingResponse;
import com.ambercity.manager.module.marketplace.dto.MarketplaceMediaRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceMediaResponse;
import com.ambercity.manager.module.marketplace.dto.MarketplaceSubscriptionRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceSubscriptionResponse;
import com.ambercity.manager.module.marketplace.dto.MarketplaceTransactionRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceTransactionResponse;
import com.ambercity.manager.module.marketplace.repo.MarketplaceListingRepository;
import com.ambercity.manager.module.marketplace.repo.MarketplaceMediaRepository;
import com.ambercity.manager.module.marketplace.repo.MarketplaceSubscriptionRepository;
import com.ambercity.manager.module.marketplace.repo.MarketplaceTransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MarketplaceService {

  private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("5.0");

  private final MarketplaceListingRepository listingRepository;
  private final MarketplaceMediaRepository mediaRepository;
  private final MarketplaceSubscriptionRepository subscriptionRepository;
  private final MarketplaceTransactionRepository transactionRepository;

  public MarketplaceService(
    MarketplaceListingRepository listingRepository,
    MarketplaceMediaRepository mediaRepository,
    MarketplaceSubscriptionRepository subscriptionRepository,
    MarketplaceTransactionRepository transactionRepository
  ) {
    this.listingRepository = listingRepository;
    this.mediaRepository = mediaRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.transactionRepository = transactionRepository;
  }

  @Transactional(readOnly = true)
  public List<MarketplaceListingResponse> listListings(String status, String type, String query) {
    return listingRepository.findAll().stream()
      .filter(listing -> status == null || status.isBlank() || status.equalsIgnoreCase(listing.getStatus()))
      .filter(listing -> type == null || type.isBlank() || type.equalsIgnoreCase(listing.getListingType()))
      .filter(listing -> query == null || query.isBlank()
        || listing.getTitle().toLowerCase().contains(query.toLowerCase())
        || (listing.getDescription() != null && listing.getDescription().toLowerCase().contains(query.toLowerCase())))
      .map(this::toListingResponse)
      .toList();
  }

  @Transactional
  public MarketplaceListingResponse upsertListing(MarketplaceListingRequest request, Long ownerUserId) {
    MarketplaceListingEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? listingRepository.findByExternalId(request.externalId()).orElseGet(MarketplaceListingEntity::new)
      : new MarketplaceListingEntity();
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }
    entity.setTitle(request.title());
    entity.setDescription(request.description());
    entity.setPrice(request.price());
    entity.setCurrency(request.currency() == null || request.currency().isBlank() ? "FCFA" : request.currency());
    entity.setListingType(request.listingType());
    entity.setStatus(request.status());
    entity.setAddress(request.address());
    entity.setLatitude(request.latitude());
    entity.setLongitude(request.longitude());
    if (entity.getOwnerUserId() == null) {
      entity.setOwnerUserId(ownerUserId);
    }
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    return toListingResponse(listingRepository.save(entity));
  }

  @Transactional
  public MarketplaceMediaResponse addMedia(MarketplaceMediaRequest request) {
    MarketplaceListingEntity listing = listingRepository.findById(request.listingId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    MarketplaceMediaEntity media = new MarketplaceMediaEntity();
    media.setListing(listing);
    media.setMediaUrl(request.mediaUrl());
    media.setMediaType(request.mediaType());
    media.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
    media.setCreatedAt(LocalDateTime.now());
    return toMediaResponse(mediaRepository.save(media));
  }

  @Transactional
  public MarketplaceSubscriptionResponse createSubscription(MarketplaceSubscriptionRequest request) {
    MarketplaceSubscriptionEntity entity = new MarketplaceSubscriptionEntity();
    entity.setUserId(request.userId());
    entity.setPlan(request.plan());
    entity.setStatus(request.status());
    entity.setStartedAt(LocalDateTime.now());
    entity.setCreatedAt(LocalDateTime.now());
    return toSubscriptionResponse(subscriptionRepository.save(entity));
  }

  @Transactional
  public MarketplaceTransactionResponse createTransaction(MarketplaceTransactionRequest request) {
    MarketplaceListingEntity listing = listingRepository.findById(request.listingId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    MarketplaceTransactionEntity entity = new MarketplaceTransactionEntity();
    entity.setListing(listing);
    entity.setBuyerContact(request.buyerContact());
    entity.setAmount(request.amount());
    entity.setCommissionRate(DEFAULT_COMMISSION_RATE);
    entity.setCommissionAmount(calculateCommission(request.amount(), DEFAULT_COMMISSION_RATE));
    entity.setStatus(request.status());
    entity.setCreatedAt(LocalDateTime.now());
    return toTransactionResponse(transactionRepository.save(entity));
  }

  private BigDecimal calculateCommission(BigDecimal amount, BigDecimal rate) {
    if (amount == null) return BigDecimal.ZERO;
    return amount.multiply(rate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
  }

  private MarketplaceListingResponse toListingResponse(MarketplaceListingEntity entity) {
    List<MarketplaceMediaResponse> media = mediaRepository.findByListingIdOrderBySortOrderAsc(entity.getId())
      .stream()
      .map(this::toMediaResponse)
      .toList();
    return new MarketplaceListingResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getTitle(),
      entity.getDescription(),
      entity.getPrice(),
      entity.getCurrency(),
      entity.getListingType(),
      entity.getStatus(),
      entity.getAddress(),
      entity.getLatitude(),
      entity.getLongitude(),
      media,
      entity.getCreatedAt(),
      entity.getUpdatedAt()
    );
  }

  private MarketplaceMediaResponse toMediaResponse(MarketplaceMediaEntity entity) {
    return new MarketplaceMediaResponse(
      entity.getId(),
      entity.getMediaUrl(),
      entity.getMediaType(),
      entity.getSortOrder(),
      entity.getCreatedAt()
    );
  }

  private MarketplaceSubscriptionResponse toSubscriptionResponse(MarketplaceSubscriptionEntity entity) {
    return new MarketplaceSubscriptionResponse(
      entity.getId(),
      entity.getUserId(),
      entity.getPlan(),
      entity.getStatus(),
      entity.getStartedAt(),
      entity.getEndsAt(),
      entity.getCreatedAt()
    );
  }

  private MarketplaceTransactionResponse toTransactionResponse(MarketplaceTransactionEntity entity) {
    return new MarketplaceTransactionResponse(
      entity.getId(),
      entity.getListing() == null ? null : entity.getListing().getId(),
      entity.getBuyerContact(),
      entity.getAmount(),
      entity.getCommissionRate(),
      entity.getCommissionAmount(),
      entity.getStatus(),
      entity.getCreatedAt()
    );
  }
}
