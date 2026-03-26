package com.ambercity.manager.module.billing;

import com.ambercity.manager.module.billing.dto.BillingCalculateRequest;
import com.ambercity.manager.module.billing.dto.BillingCalculateResponse;
import com.ambercity.manager.module.billing.dto.InvoiceResponse;
import com.ambercity.manager.module.billing.dto.UpdateInvoiceDebtRequest;
import com.ambercity.manager.module.billing.dto.UpdateInvoiceSendStatusRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing")
public class BillingController {

  private final BillingService billingService;

  public BillingController(BillingService billingService) {
    this.billingService = billingService;
  }

  @PostMapping("/calculate")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public BillingCalculateResponse calculate(@Valid @RequestBody BillingCalculateRequest request) {
    return billingService.calculateAll(request.mois(), request.forceRecompute());
  }

  @GetMapping("/invoices")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE','RESIDENT')")
  public List<InvoiceResponse> listInvoices(@RequestParam String mois, Authentication authentication) {
    return billingService.listInvoices(mois, authentication);
  }

  @PatchMapping("/invoices/{invoiceId}/debt")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public InvoiceResponse updateDebt(
    @PathVariable Long invoiceId,
    @RequestBody UpdateInvoiceDebtRequest request
  ) {
    return billingService.updateDebt(invoiceId, request.dette());
  }

  @PatchMapping("/invoices/{invoiceId}/send-status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public InvoiceResponse updateSendStatus(
    @PathVariable Long invoiceId,
    @Valid @RequestBody UpdateInvoiceSendStatusRequest request
  ) {
    return billingService.updateSendStatus(invoiceId, request.statutEnvoi());
  }
}
