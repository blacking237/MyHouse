package com.ambercity.manager.module.finance;

import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
public class FinanceController {

  @GetMapping("/payments")
  public List<Map<String, Object>> payments(@RequestParam String mois) {
    return List.of();
  }
}
