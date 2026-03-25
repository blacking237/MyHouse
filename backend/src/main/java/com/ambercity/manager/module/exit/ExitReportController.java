package com.ambercity.manager.module.exit;

import com.ambercity.manager.module.exit.dto.ExitReportRequest;
import com.ambercity.manager.module.exit.dto.ExitReportResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/exit-reports")
public class ExitReportController {

  private final ExitReportService service;

  public ExitReportController(ExitReportService service) {
    this.service = service;
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public ExitReportResponse generate(@Valid @RequestBody ExitReportRequest request) {
    return service.generate(request);
  }
}
