package com.ambercity.manager.module.payment.repo;

import com.ambercity.manager.module.payment.domain.PaymentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {
  List<PaymentEntity> findByInvoiceId(Long invoiceId);
  Optional<PaymentEntity> findByExternalId(String externalId);
}
