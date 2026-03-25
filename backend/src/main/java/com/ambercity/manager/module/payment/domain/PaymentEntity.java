package com.ambercity.manager.module.payment.domain;

import com.ambercity.manager.module.billing.domain.InvoiceEntity;
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
@Table(name = "payments")
public class PaymentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "facture_id")
  private InvoiceEntity invoice;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @Column(name = "montant_paye", nullable = false, precision = 12, scale = 2)
  private BigDecimal montantPaye;

  @Column(name = "date_paiement", nullable = false)
  private LocalDateTime datePaiement;

  @Column(name = "observation")
  private String observation;

  @Column(name = "saisi_par", length = 80)
  private String saisiPar;

  @Column(name = "method", length = 20)
  private String method;

  @Column(name = "status", length = 20)
  private String status;

  @Column(name = "transaction_ref", length = 80)
  private String transactionRef;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public InvoiceEntity getInvoice() { return invoice; }
  public void setInvoice(InvoiceEntity invoice) { this.invoice = invoice; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public BigDecimal getMontantPaye() { return montantPaye; }
  public void setMontantPaye(BigDecimal montantPaye) { this.montantPaye = montantPaye; }
  public LocalDateTime getDatePaiement() { return datePaiement; }
  public void setDatePaiement(LocalDateTime datePaiement) { this.datePaiement = datePaiement; }
  public String getObservation() { return observation; }
  public void setObservation(String observation) { this.observation = observation; }
  public String getSaisiPar() { return saisiPar; }
  public void setSaisiPar(String saisiPar) { this.saisiPar = saisiPar; }
  public String getMethod() { return method; }
  public void setMethod(String method) { this.method = method; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getTransactionRef() { return transactionRef; }
  public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public LocalDateTime getDeletedAt() { return deletedAt; }
  public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
