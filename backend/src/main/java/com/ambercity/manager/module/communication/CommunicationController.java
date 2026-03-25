package com.ambercity.manager.module.communication;

import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/communication")
@PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
public class CommunicationController {

  @GetMapping("/feedbacks")
  public List<Map<String, Object>> feedbacks() {
    return List.of();
  }

  @GetMapping("/notifications")
  public List<Map<String, Object>> notifications() {
    return List.of();
  }
}

