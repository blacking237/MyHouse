package com.ambercity.manager.module.sync;

import com.ambercity.manager.module.sync.dto.SyncPayload;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

  private final SyncService syncService;

  public SyncController(SyncService syncService) {
    this.syncService = syncService;
  }

  @PostMapping("/push")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public void push(@RequestBody SyncPayload payload) {
    syncService.push(payload);
  }

  @GetMapping("/pull")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public SyncPayload pull(@RequestParam String since) {
    return syncService.pull(since);
  }
}
