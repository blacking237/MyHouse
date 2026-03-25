package com.ambercity.manager.module.payment;

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
  public List<PaymentResponse> listByInvoice(@PathVariable("invoiceId") Long invoiceId) {
    return paymentService.listByInvoice(invoiceId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public PaymentResponse create(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
    String username = authentication == null ? "system" : authentication.getName();
    return paymentService.create(request, username);
  }

  @PostMapping("/{paymentId}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public PaymentResponse updateStatus(
    @PathVariable("paymentId") Long paymentId,
    @Valid @RequestBody PaymentStatusUpdateRequest request
  ) {
    return paymentService.updateStatus(paymentId, request);
  }
}
