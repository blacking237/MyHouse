package com.ambercity.manager.module.billing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "invoice_lines")
public class InvoiceLineEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "invoice_id")
  private InvoiceEntity invoice;

  @Column(nullable = false, length = 10)
  private String type;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal conso;

  @Column(name = "montant_ht", nullable = false, precision = 12, scale = 2)
  private BigDecimal montantHt;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal tva;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal lc;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal surplus;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amende;

  @Column(name = "montant_ttc", nullable = false, precision = 12, scale = 2)
  private BigDecimal montantTtc;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public InvoiceEntity getInvoice() { return invoice; }
  public void setInvoice(InvoiceEntity invoice) { this.invoice = invoice; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public BigDecimal getConso() { return conso; }
  public void setConso(BigDecimal conso) { this.conso = conso; }
  public BigDecimal getMontantHt() { return montantHt; }
  public void setMontantHt(BigDecimal montantHt) { this.montantHt = montantHt; }
  public BigDecimal getTva() { return tva; }
  public void setTva(BigDecimal tva) { this.tva = tva; }
  public BigDecimal getLc() { return lc; }
  public void setLc(BigDecimal lc) { this.lc = lc; }
  public BigDecimal getSurplus() { return surplus; }
  public void setSurplus(BigDecimal surplus) { this.surplus = surplus; }
  public BigDecimal getAmende() { return amende; }
  public void setAmende(BigDecimal amende) { this.amende = amende; }
  public BigDecimal getMontantTtc() { return montantTtc; }
  public void setMontantTtc(BigDecimal montantTtc) { this.montantTtc = montantTtc; }
}
