package com.ambercity.manager.module.resident;

import com.ambercity.manager.module.resident.dto.AssignRoomRequest;
import com.ambercity.manager.module.resident.dto.CreateResidentRequest;
import com.ambercity.manager.module.resident.dto.PatchResidentRequest;
import com.ambercity.manager.module.resident.dto.ResidentResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/residents")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
public class ResidentController {

  private final ResidentService residentService;

  public ResidentController(ResidentService residentService) {
    this.residentService = residentService;
  }

  @GetMapping
  public List<ResidentResponse> list() {
    return residentService.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ResidentResponse create(@Valid @RequestBody CreateResidentRequest request) {
    return residentService.create(request);
  }

  @PatchMapping("/{id}")
  public ResidentResponse patch(@PathVariable Long id, @Valid @RequestBody PatchResidentRequest request) {
    return residentService.patch(id, request);
  }

  @PostMapping("/{id}/assign-room")
  public ResidentResponse assignRoom(@PathVariable Long id, @Valid @RequestBody AssignRoomRequest request) {
    return residentService.assignRoom(id, request);
  }
}
