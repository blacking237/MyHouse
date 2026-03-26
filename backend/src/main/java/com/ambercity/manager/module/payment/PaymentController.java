package com.ambercity.manager.module.payment;

import com.ambercity.manager.shared.security.JwtService;
import com.ambercity.manager.module.payment.dto.PaymentRequest;
import com.ambercity.manager.module.payment.dto.PaymentResponse;
import com.ambercity.manager.module.payment.dto.PaymentStatusUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @GetMapping("/invoice/{invoiceId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE','RESIDENT')")
  public List<PaymentResponse> listByInvoice(@PathVariable("invoiceId") Long invoiceId, Authentication authentication) {
    return paymentService.listByInvoice(invoiceId, authentication);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public PaymentResponse create(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
    String username = resolveUsername(authentication);
    return paymentService.create(request, username);
  }

  @PostMapping("/electricite")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public PaymentResponse createElectricity(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
    String username = resolveUsername(authentication);
    return paymentService.create(request, username, "ELECTRICITE");
  }

  @PostMapping("/loyer")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public PaymentResponse createRent(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
    String username = resolveUsername(authentication);
    return paymentService.create(request, username, "LOYER");
  }

  @PostMapping("/penalite")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public PaymentResponse createPenalty(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
    String username = resolveUsername(authentication);
    return paymentService.create(request, username, "PENALITE");
  }

  @PostMapping("/{paymentId}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public PaymentResponse updateStatus(
    @PathVariable("paymentId") Long paymentId,
    @Valid @RequestBody PaymentStatusUpdateRequest request
  ) {
    return paymentService.updateStatus(paymentId, request);
  }

  private String resolveUsername(Authentication authentication) {
    if (authentication == null || authentication.getPrincipal() == null) {
      return "system";
    }
    Object principal = authentication.getPrincipal();
    if (principal instanceof JwtService.TokenPrincipal tokenPrincipal) {
      return tokenPrincipal.username();
    }
    return authentication.getName();
  }
}
