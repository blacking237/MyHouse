package com.ambercity.manager.module.developer;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/developer")
@PreAuthorize("hasAnyRole('ADMIN')")
public class DeveloperController {

  @GetMapping("/clients")
  public List<Map<String, Object>> clients() {
    return List.of(Map.of(
      "name", "Client Local",
      "status", "TRIAL",
      "contact", "+237679255748"
    ));
  }

  @GetMapping("/revenues/summary")
  public Map<String, Object> revenuesSummary() {
    return Map.of(
      "totalPayments", BigDecimal.ZERO,
      "currency", "FCFA"
    );
  }
}
