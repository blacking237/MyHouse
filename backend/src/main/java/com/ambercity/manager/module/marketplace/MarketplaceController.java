package com.ambercity.manager.module.marketplace;

import com.ambercity.manager.module.marketplace.dto.MarketplaceListingRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceListingResponse;
import com.ambercity.manager.module.marketplace.dto.MarketplaceMediaRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceMediaResponse;
import com.ambercity.manager.module.marketplace.dto.MarketplaceSubscriptionRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceSubscriptionResponse;
import com.ambercity.manager.module.marketplace.dto.MarketplaceTransactionRequest;
import com.ambercity.manager.module.marketplace.dto.MarketplaceTransactionResponse;
import com.ambercity.manager.shared.security.JwtService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/marketplace")
public class MarketplaceController {

  private final MarketplaceService service;

  public MarketplaceController(MarketplaceService service) {
    this.service = service;
  }

  @GetMapping("/listings")
  @PreAuthorize("isAuthenticated()")
  public List<MarketplaceListingResponse> listListings(
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String type,
    @RequestParam(required = false) String query
  ) {
    return service.listListings(status, type, query);
  }

  @PostMapping("/listings")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public MarketplaceListingResponse upsertListing(
    Authentication authentication,
    @Valid @RequestBody MarketplaceListingRequest request
  ) {
    Long ownerUserId = null;
    if (authentication != null && authentication.getPrincipal() instanceof JwtService.TokenPrincipal principal) {
      ownerUserId = principal.userId();
    }
    return service.upsertListing(request, ownerUserId);
  }

  @PostMapping("/media")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public MarketplaceMediaResponse addMedia(@Valid @RequestBody MarketplaceMediaRequest request) {
    return service.addMedia(request);
  }

  @PostMapping("/subscriptions")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public MarketplaceSubscriptionResponse createSubscription(@Valid @RequestBody MarketplaceSubscriptionRequest request) {
    return service.createSubscription(request);
  }

  @PostMapping("/transactions")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','MANAGER')")
  public MarketplaceTransactionResponse createTransaction(@Valid @RequestBody MarketplaceTransactionRequest request) {
    return service.createTransaction(request);
  }
}
