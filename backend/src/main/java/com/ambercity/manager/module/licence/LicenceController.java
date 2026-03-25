package com.ambercity.manager.module.licence;

import com.ambercity.manager.module.licence.dto.ActivateLicenceRequest;
import com.ambercity.manager.module.licence.dto.LicenceStatusResponse;
import com.ambercity.manager.module.licence.dto.LicenceTokenRequest;
import com.ambercity.manager.module.licence.dto.LicenceTokenResponse;
import com.ambercity.manager.module.licence.dto.LicenceVerifyResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/licence")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
public class LicenceController {

  private final LicenceService licenceService;
  private final LicenceTokenService licenceTokenService;

  public LicenceController(LicenceService licenceService, LicenceTokenService licenceTokenService) {
    this.licenceService = licenceService;
    this.licenceTokenService = licenceTokenService;
  }

  @GetMapping("/status")
  public LicenceStatusResponse status() {
    return licenceService.getStatus();
  }

  @PostMapping("/activate")
  public LicenceStatusResponse activate(@Valid @RequestBody ActivateLicenceRequest request) {
    return licenceService.activate(request.jwtToken());
  }

  @PostMapping("/token/issue")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
  public LicenceTokenResponse issue(@Valid @RequestBody LicenceTokenRequest request) {
    return licenceTokenService.issue(request);
  }

  @PostMapping("/token/verify")
  public LicenceVerifyResponse verify(@Valid @RequestBody ActivateLicenceRequest request) {
    return licenceTokenService.verify(request.jwtToken());
  }
}
