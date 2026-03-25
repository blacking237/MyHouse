package com.ambercity.manager.module.mainmeter;

import com.ambercity.manager.module.mainmeter.dto.MainMeterReadingRequest;
import com.ambercity.manager.module.mainmeter.dto.MainMeterReadingResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/main-meters")
public class MainMeterController {

  private final MainMeterService service;

  public MainMeterController(MainMeterService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public List<MainMeterReadingResponse> listAll() {
    return service.listAll();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public MainMeterReadingResponse upsert(@Valid @RequestBody MainMeterReadingRequest request) {
    return service.upsert(request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
  public void delete(@PathVariable("id") Long id) {
    service.delete(id);
  }
}
