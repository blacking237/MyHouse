package com.ambercity.manager.module.contract;

import com.ambercity.manager.module.contract.domain.ContractEntity;
import com.ambercity.manager.module.contract.domain.ContractSignatureEntity;
import com.ambercity.manager.module.contract.dto.ContractRequest;
import com.ambercity.manager.module.contract.dto.ContractResponse;
import com.ambercity.manager.module.contract.dto.ContractSignatureRequest;
import com.ambercity.manager.module.contract.repo.ContractRepository;
import com.ambercity.manager.module.contract.repo.ContractSignatureRepository;
import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ContractService {

  private final ContractRepository contractRepository;
  private final ContractSignatureRepository signatureRepository;
  private final RoomRepository roomRepository;
  private final ResidentRepository residentRepository;

  public ContractService(
    ContractRepository contractRepository,
    ContractSignatureRepository signatureRepository,
    RoomRepository roomRepository,
    ResidentRepository residentRepository
  ) {
    this.contractRepository = contractRepository;
    this.signatureRepository = signatureRepository;
    this.roomRepository = roomRepository;
    this.residentRepository = residentRepository;
  }

  @Transactional(readOnly = true)
  public List<ContractResponse> listAll() {
    return contractRepository.findAll().stream().map(this::toResponse).toList();
  }

  @Transactional
  public ContractResponse upsert(ContractRequest request) {
    RoomEntity room = roomRepository.findByNumeroChambreIgnoreCase(request.roomNumero())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
    ResidentEntity resident = request.residentExternalId() == null || request.residentExternalId().isBlank()
      ? null
      : residentRepository.findByExternalId(request.residentExternalId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found"));

    ContractEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? contractRepository.findByExternalId(request.externalId()).orElseGet(ContractEntity::new)
      : new ContractEntity();
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }
    entity.setRoom(room);
    entity.setResident(resident);
    entity.setStatus(request.status());
    entity.setSigningMode(request.signingMode());
    entity.setStartDate(request.startDate());
    entity.setEndDate(request.endDate());
    entity.setMonthlyRent(request.monthlyRent());
    entity.setDeposit(request.deposit());
    entity.setAutoRenewal(request.autoRenewal());
    entity.setNotes(request.notes());
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    return toResponse(contractRepository.save(entity));
  }

  @Transactional
  public ContractResponse sign(Long contractId, ContractSignatureRequest request) {
    ContractEntity contract = contractRepository.findById(contractId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contract not found"));
    ContractSignatureEntity signature = new ContractSignatureEntity();
    signature.setContract(contract);
    signature.setSignedBy(request.signedBy());
    signature.setSignatureType(request.signatureType());
    signature.setSignedAt(LocalDateTime.now());
    signatureRepository.save(signature);
    contract.setUpdatedAt(LocalDateTime.now());
    return toResponse(contractRepository.save(contract));
  }

  @Transactional
  public ContractResponse validate(Long contractId) {
    ContractEntity contract = contractRepository.findById(contractId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contract not found"));
    if (signatureRepository.findByContractIdOrderBySignedAtAsc(contract.getId()).size() < 2) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required signatures");
    }
    contract.setStatus("VALIDATED");
    contract.setValidatedAt(LocalDateTime.now());
    contract.setUpdatedAt(LocalDateTime.now());
    return toResponse(contractRepository.save(contract));
  }

  @Transactional
  public ContractResponse renew(Long contractId) {
    ContractEntity contract = contractRepository.findById(contractId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contract not found"));
    contract.setStatus("RENEWAL_PENDING");
    contract.setUpdatedAt(LocalDateTime.now());
    return toResponse(contractRepository.save(contract));
  }

  private ContractResponse toResponse(ContractEntity contract) {
    String residentName = contract.getResident() == null
      ? null
      : (contract.getResident().getNom() + " " + contract.getResident().getPrenom()).trim();
    return new ContractResponse(
      contract.getId(),
      contract.getExternalId(),
      contract.getRoom() == null ? null : contract.getRoom().getNumeroChambre(),
      contract.getResident() == null ? null : contract.getResident().getId(),
      residentName,
      contract.getStatus(),
      contract.getSigningMode(),
      contract.getStartDate(),
      contract.getEndDate(),
      contract.getMonthlyRent(),
      contract.getDeposit(),
      contract.isAutoRenewal(),
      contract.getNotes(),
      contract.getCreatedAt(),
      contract.getUpdatedAt(),
      contract.getValidatedAt(),
      signatureRepository.findByContractIdOrderBySignedAtAsc(contract.getId()).stream()
        .map(sig -> new ContractResponse.ContractSignatureResponse(sig.getSignedBy(), sig.getSignedAt(), sig.getSignatureType()))
        .toList()
    );
  }
}
