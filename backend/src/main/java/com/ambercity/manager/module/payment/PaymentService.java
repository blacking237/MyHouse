package com.ambercity.manager.module.payment;

import com.ambercity.manager.module.billing.domain.InvoiceEntity;
import com.ambercity.manager.module.billing.repo.InvoiceRepository;
import com.ambercity.manager.module.payment.domain.PaymentEntity;
import com.ambercity.manager.module.payment.dto.PaymentRequest;
import com.ambercity.manager.module.payment.dto.PaymentResponse;
import com.ambercity.manager.module.payment.dto.PaymentStatusUpdateRequest;
import com.ambercity.manager.module.payment.repo.PaymentRepository;
import com.ambercity.manager.module.notification.NotificationService;
import com.ambercity.manager.module.notification.dto.NotificationRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {

  private final PaymentRepository paymentRepository;
  private final InvoiceRepository invoiceRepository;
  private final NotificationService notificationService;

  @Value("${app.payment.flutterwave.enabled:false}")
  private boolean flutterwaveEnabled;

  public PaymentService(
    PaymentRepository paymentRepository,
    InvoiceRepository invoiceRepository,
    NotificationService notificationService
  ) {
    this.paymentRepository = paymentRepository;
    this.invoiceRepository = invoiceRepository;
    this.notificationService = notificationService;
  }

  @Transactional(readOnly = true)
  public List<PaymentResponse> listByInvoice(Long invoiceId) {
    return paymentRepository.findByInvoiceId(invoiceId).stream().map(this::toResponse).toList();
  }

  @Transactional
  public PaymentResponse create(PaymentRequest request, String username) {
    InvoiceEntity invoice = invoiceRepository.findById(request.invoiceId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

    PaymentEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? paymentRepository.findByExternalId(request.externalId()).orElseGet(PaymentEntity::new)
      : new PaymentEntity();
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }
    entity.setInvoice(invoice);
    entity.setMontantPaye(request.amount());
    entity.setMethod(request.method());
    entity.setObservation(request.observation());
    entity.setSaisiPar(username);
    entity.setDatePaiement(LocalDateTime.now());
    entity.setUpdatedAt(LocalDateTime.now());
    entity.setStatus(flutterwaveEnabled ? "PENDING" : "CONFIRMED");
    entity.setTransactionRef("LOCAL-" + UUID.randomUUID());
    PaymentEntity saved = paymentRepository.save(entity);
    if (isSettled(saved.getStatus())) {
      refreshInvoiceDebt(invoice);
      notifyPayment(saved);
    }
    return toResponse(saved);
  }

  @Transactional
  public PaymentResponse updateStatus(Long paymentId, PaymentStatusUpdateRequest request) {
    PaymentEntity entity = paymentRepository.findById(paymentId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    entity.setStatus(request.status());
    if (request.transactionRef() != null && !request.transactionRef().isBlank()) {
      entity.setTransactionRef(request.transactionRef());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    PaymentEntity saved = paymentRepository.save(entity);
    if (isSettled(saved.getStatus())) {
      refreshInvoiceDebt(saved.getInvoice());
      notifyPayment(saved);
    }
    return toResponse(saved);
  }

  private void refreshInvoiceDebt(InvoiceEntity invoice) {
    if (invoice == null) {
      return;
    }
    BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
      .filter(payment -> isSettled(payment.getStatus()))
      .map(PaymentEntity::getMontantPaye)
      .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal net = invoice.getNetAPayer() == null ? BigDecimal.ZERO : invoice.getNetAPayer();
    BigDecimal remaining = net.subtract(totalPaid);
    if (remaining.signum() < 0) {
      remaining = BigDecimal.ZERO;
    }
    invoice.setDette(remaining);
    invoice.setUpdatedAt(LocalDateTime.now());
    invoiceRepository.save(invoice);
  }

  private boolean isSettled(String status) {
    if (status == null) return false;
    String normalized = status.trim().toUpperCase();
    return "CONFIRMED".equals(normalized) || "COMPLETED".equals(normalized) || "SUCCESS".equals(normalized);
  }

  private void notifyPayment(PaymentEntity payment) {
    if (payment == null || payment.getInvoice() == null) return;
    String recipient = null;
    if (payment.getInvoice().getResident() != null) {
      recipient = payment.getInvoice().getResident().getWhatsapp();
      if (recipient == null || recipient.isBlank()) {
        recipient = payment.getInvoice().getResident().getTelephone();
      }
    }
    if (recipient == null || recipient.isBlank()) return;
    String message = "Paiement confirme pour la facture " + payment.getInvoice().getId()
      + " - montant " + payment.getMontantPaye();
    notificationService.send(new NotificationRequest(
      "WHATSAPP",
      recipient,
      "Paiement MyHouse",
      message,
      null
    ));
  }

  private PaymentResponse toResponse(PaymentEntity entity) {
    return new PaymentResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getInvoice() == null ? null : entity.getInvoice().getId(),
      entity.getMontantPaye(),
      entity.getMethod(),
      entity.getStatus(),
      entity.getTransactionRef(),
      entity.getObservation(),
      entity.getDatePaiement()
    );
  }
}
