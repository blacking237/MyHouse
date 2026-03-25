package com.ambercity.manager.module.exit;

import com.ambercity.manager.module.billing.domain.InvoiceEntity;
import com.ambercity.manager.module.billing.repo.InvoiceRepository;
import com.ambercity.manager.module.contract.domain.ContractEntity;
import com.ambercity.manager.module.contract.repo.ContractRepository;
import com.ambercity.manager.module.exit.domain.ExitReportEntity;
import com.ambercity.manager.module.exit.dto.ExitReportRequest;
import com.ambercity.manager.module.exit.dto.ExitReportResponse;
import com.ambercity.manager.module.exit.repo.ExitReportRepository;
import com.ambercity.manager.module.maintenance.repo.MaintenanceTicketRepository;
import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ExitReportService {

  private final ExitReportRepository repository;
  private final RoomRepository roomRepository;
  private final ResidentRepository residentRepository;
  private final ContractRepository contractRepository;
  private final InvoiceRepository invoiceRepository;
  private final MaintenanceTicketRepository maintenanceRepository;

  public ExitReportService(
    ExitReportRepository repository,
    RoomRepository roomRepository,
    ResidentRepository residentRepository,
    ContractRepository contractRepository,
    InvoiceRepository invoiceRepository,
    MaintenanceTicketRepository maintenanceRepository
  ) {
    this.repository = repository;
    this.roomRepository = roomRepository;
    this.residentRepository = residentRepository;
    this.contractRepository = contractRepository;
    this.invoiceRepository = invoiceRepository;
    this.maintenanceRepository = maintenanceRepository;
  }

  @Transactional
  public ExitReportResponse generate(ExitReportRequest request) {
    RoomEntity room = roomRepository.findByNumeroChambreIgnoreCase(request.roomNumero())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
    ResidentEntity resident = request.residentExternalId() == null || request.residentExternalId().isBlank()
      ? null
      : residentRepository.findByExternalId(request.residentExternalId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found"));
    ContractEntity contract = request.contractExternalId() == null || request.contractExternalId().isBlank()
      ? contractRepository.findByRoomIdAndStatusIn(room.getId(), java.util.List.of("ACTIVE", "VALIDATED"))
        .orElse(null)
      : contractRepository.findByExternalId(request.contractExternalId()).orElse(null);

    BigDecimal debtTotal = invoiceRepository.findByRoomId(room.getId()).stream()
      .map(InvoiceEntity::getDette)
      .filter(v -> v != null && v.compareTo(BigDecimal.ZERO) > 0)
      .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal repairCost = maintenanceRepository.findByStatusIgnoreCase("RESOLU").stream()
      .filter(t -> t.getRoom() != null && t.getRoom().getId().equals(room.getId()))
      .filter(t -> "RESIDENT".equalsIgnoreCase(t.getResponsibility()))
      .map(t -> t.getEstimatedCost() == null ? BigDecimal.ZERO : t.getEstimatedCost())
      .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal deposit = contract == null || contract.getDeposit() == null ? BigDecimal.ZERO : contract.getDeposit();
    BigDecimal commonCharges = deposit.multiply(new BigDecimal("0.25"));
    BigDecimal totalCharges = debtTotal.add(repairCost).add(commonCharges);
    BigDecimal depositUsed = totalCharges.min(deposit);
    BigDecimal balance = deposit.subtract(totalCharges);
    BigDecimal refundAmount = balance.max(BigDecimal.ZERO);

    ExitReportEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? repository.findByExternalId(request.externalId()).orElseGet(ExitReportEntity::new)
      : new ExitReportEntity();
    if (entity.getExternalId() == null) {
      entity.setExternalId(request.externalId() == null || request.externalId().isBlank()
        ? UUID.randomUUID().toString()
        : request.externalId());
    }
    entity.setRoom(room);
    entity.setResident(resident);
    entity.setContract(contract);
    entity.setDebtTotal(debtTotal);
    entity.setRepairCost(repairCost);
    entity.setDepositUsed(depositUsed);
    entity.setDepositTotal(deposit);
    entity.setCommonCharges(commonCharges);
    entity.setBalance(balance);
    entity.setNotes(request.notes());
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    ExitReportEntity saved = repository.save(entity);
    return toResponse(saved);
  }

  private ExitReportResponse toResponse(ExitReportEntity entity) {
    String residentName = entity.getResident() == null
      ? null
      : (entity.getResident().getNom() + " " + entity.getResident().getPrenom()).trim();
    return new ExitReportResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getRoom() == null ? null : entity.getRoom().getNumeroChambre(),
      entity.getResident() == null ? null : entity.getResident().getId(),
      residentName,
      entity.getDebtTotal(),
      entity.getRepairCost(),
      entity.getDepositUsed(),
      entity.getDepositTotal(),
      entity.getCommonCharges(),
      entity.getBalance(),
      entity.getBalance() == null ? BigDecimal.ZERO : entity.getBalance().max(BigDecimal.ZERO),
      entity.getNotes(),
      entity.getCreatedAt(),
      entity.getUpdatedAt()
    );
  }
}
