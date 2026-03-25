package com.ambercity.manager.module.adminsettings;

import com.ambercity.manager.module.adminsettings.dto.GlobalSettingRequest;
import com.ambercity.manager.module.adminsettings.dto.GlobalSettingResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
public class GlobalSettingController {

  private final GlobalSettingService service;

  public GlobalSettingController(GlobalSettingService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','ADMIN_COMPTA','ADMIN_SAV','ADMIN_JURIDIQUE')")
  public List<GlobalSettingResponse> list() {
    return service.listAll();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','ADMIN_COMPTA','ADMIN_SAV','ADMIN_JURIDIQUE')")
  public GlobalSettingResponse upsert(@Valid @RequestBody GlobalSettingRequest request) {
    return service.upsert(request);
  }
}
