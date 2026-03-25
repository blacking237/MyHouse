package com.ambercity.manager.module.billing.repo;

import com.ambercity.manager.module.billing.domain.InvoiceLineEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLineEntity, Long> {
  List<InvoiceLineEntity> findByInvoiceIdOrderByIdAsc(Long invoiceId);
  void deleteByInvoiceId(Long invoiceId);
}
