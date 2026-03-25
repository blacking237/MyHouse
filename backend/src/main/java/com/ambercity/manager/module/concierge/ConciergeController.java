package com.ambercity.manager.module.concierge;

import com.ambercity.manager.module.billing.repo.InvoiceRepository;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/concierge")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
public class ConciergeController {

  private final RoomRepository roomRepository;
  private final ResidentRepository residentRepository;
  private final InvoiceRepository invoiceRepository;

  public ConciergeController(
    RoomRepository roomRepository,
    ResidentRepository residentRepository,
    InvoiceRepository invoiceRepository
  ) {
    this.roomRepository = roomRepository;
    this.residentRepository = residentRepository;
    this.invoiceRepository = invoiceRepository;
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    return Map.of(
      "rooms", roomRepository.count(),
      "residents", residentRepository.count(),
      "invoices", invoiceRepository.count()
    );
  }
}
