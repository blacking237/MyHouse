package com.ambercity.manager.module.maintenance;

import com.ambercity.manager.module.maintenance.dto.MaintenanceTicketRequest;
import com.ambercity.manager.module.maintenance.dto.MaintenanceTicketResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/maintenance")
public class MaintenanceController {

  private final MaintenanceService service;

  public MaintenanceController(MaintenanceService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_SAV','MANAGER','CONCIERGE')")
  public List<MaintenanceTicketResponse> listAll() {
    return service.listAll();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_SAV','MANAGER','CONCIERGE')")
  public MaintenanceTicketResponse upsert(@Valid @RequestBody MaintenanceTicketRequest request) {
    return service.upsert(request);
  }

  @PostMapping("/{id}/penalty")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_SAV','MANAGER')")
  public MaintenanceTicketResponse applyPenalty(@PathVariable("id") Long id) {
    return service.applyPenalty(id);
  }
}
