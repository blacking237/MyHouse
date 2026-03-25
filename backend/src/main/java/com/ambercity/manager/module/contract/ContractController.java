package com.ambercity.manager.module.contract;

import com.ambercity.manager.module.contract.dto.ContractRequest;
import com.ambercity.manager.module.contract.dto.ContractResponse;
import com.ambercity.manager.module.contract.dto.ContractSignatureRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contracts")
public class ContractController {

  private final ContractService contractService;

  public ContractController(ContractService contractService) {
    this.contractService = contractService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMMERCIAL','ADMIN_JURIDIQUE','MANAGER','CONCIERGE')")
  public List<ContractResponse> listAll() {
    return contractService.listAll();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_JURIDIQUE','MANAGER')")
  public ContractResponse upsert(@Valid @RequestBody ContractRequest request) {
    return contractService.upsert(request);
  }

  @PostMapping("/{id}/sign")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE','RESIDENT')")
  public ContractResponse sign(@PathVariable("id") Long id, @Valid @RequestBody ContractSignatureRequest request) {
    return contractService.sign(id, request);
  }

  @PostMapping("/{id}/validate")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public ContractResponse validate(@PathVariable("id") Long id) {
    return contractService.validate(id);
  }

  @PostMapping("/{id}/renew")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
  public ContractResponse renew(@PathVariable("id") Long id) {
    return contractService.renew(id);
  }
}
