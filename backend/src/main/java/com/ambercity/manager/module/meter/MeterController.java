package com.ambercity.manager.module.meter;

import com.ambercity.manager.module.meter.dto.IndexReadingRequest;
import com.ambercity.manager.module.meter.dto.IndexReadingResponse;
import com.ambercity.manager.module.meter.dto.MonthConfigRequest;
import com.ambercity.manager.module.meter.dto.MonthConfigResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meter")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE','RESIDENT')")
public class MeterController {

  private final MeterConfigService meterConfigService;
  private final IndexReadingService indexReadingService;

  public MeterController(MeterConfigService meterConfigService, IndexReadingService indexReadingService) {
    this.meterConfigService = meterConfigService;
    this.indexReadingService = indexReadingService;
  }

  @GetMapping("/month-config/{mois}")
  public MonthConfigResponse getMonthConfig(@PathVariable String mois) {
    return meterConfigService.getByMois(mois);
  }

  @PutMapping("/month-config/{mois}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public MonthConfigResponse upsertMonthConfig(
    @PathVariable String mois,
    @Valid @RequestBody MonthConfigRequest request
  ) {
    return meterConfigService.upsert(mois, request);
  }

  @GetMapping("/index-readings")
  public List<IndexReadingResponse> listReadings(@RequestParam String mois) {
    return indexReadingService.listByMois(mois);
  }

  @PostMapping("/index-readings")
  public IndexReadingResponse upsertReading(Authentication authentication, @Valid @RequestBody IndexReadingRequest request) {
    String role = "UNKNOWN";
    if (authentication != null && authentication.getAuthorities() != null) {
      role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("UNKNOWN");
      role = role.replace("ROLE_", "").trim();
    }
    return indexReadingService.upsert(request, role);
  }
}
