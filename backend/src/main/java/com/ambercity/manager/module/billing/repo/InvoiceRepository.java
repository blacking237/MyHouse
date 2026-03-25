package com.ambercity.manager.module.billing.repo;

import com.ambercity.manager.module.billing.domain.InvoiceEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, Long> {
  Optional<InvoiceEntity> findByRoomIdAndMois(Long roomId, String mois);
  List<InvoiceEntity> findByRoomId(Long roomId);
  List<InvoiceEntity> findByMoisOrderByRoomNumeroChambreAsc(String mois);
  Optional<InvoiceEntity> findByExternalId(String externalId);
}
