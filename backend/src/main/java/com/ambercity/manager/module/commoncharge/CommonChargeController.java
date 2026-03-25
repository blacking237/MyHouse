package com.ambercity.manager.module.commoncharge;

import com.ambercity.manager.module.commoncharge.dto.CommonChargeAssignmentRequest;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeAssignmentResponse;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeRequest;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/common-charges")
public class CommonChargeController {

  private final CommonChargeService service;

  public CommonChargeController(CommonChargeService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public List<CommonChargeResponse> listCharges() {
    return service.listCharges();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public CommonChargeResponse upsert(@Valid @RequestBody CommonChargeRequest request) {
    return service.upsertCharge(request);
  }

  @PostMapping("/assign")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public CommonChargeAssignmentResponse assign(@Valid @RequestBody CommonChargeAssignmentRequest request) {
    return service.assign(request);
  }
}
