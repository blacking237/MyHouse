package com.ambercity.manager.module.contract.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_signatures")
public class ContractSignatureEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "contract_id")
  private ContractEntity contract;

  @Column(name = "signed_by", nullable = false, length = 80)
  private String signedBy;

  @Column(name = "signed_at", nullable = false)
  private LocalDateTime signedAt;

  @Column(name = "signature_type", nullable = false, length = 30)
  private String signatureType;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public ContractEntity getContract() { return contract; }
  public void setContract(ContractEntity contract) { this.contract = contract; }
  public String getSignedBy() { return signedBy; }
  public void setSignedBy(String signedBy) { this.signedBy = signedBy; }
  public LocalDateTime getSignedAt() { return signedAt; }
  public void setSignedAt(LocalDateTime signedAt) { this.signedAt = signedAt; }
  public String getSignatureType() { return signatureType; }
  public void setSignatureType(String signatureType) { this.signatureType = signatureType; }
}
