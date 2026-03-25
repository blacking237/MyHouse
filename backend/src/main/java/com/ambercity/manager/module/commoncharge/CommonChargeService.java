package com.ambercity.manager.module.commoncharge;

import com.ambercity.manager.module.commoncharge.domain.CommonChargeAssignmentEntity;
import com.ambercity.manager.module.commoncharge.domain.CommonChargeEntity;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeAssignmentRequest;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeAssignmentResponse;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeRequest;
import com.ambercity.manager.module.commoncharge.dto.CommonChargeResponse;
import com.ambercity.manager.module.commoncharge.repo.CommonChargeAssignmentRepository;
import com.ambercity.manager.module.commoncharge.repo.CommonChargeRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CommonChargeService {

  private final CommonChargeRepository chargeRepository;
  private final CommonChargeAssignmentRepository assignmentRepository;

  public CommonChargeService(
    CommonChargeRepository chargeRepository,
    CommonChargeAssignmentRepository assignmentRepository
  ) {
    this.chargeRepository = chargeRepository;
    this.assignmentRepository = assignmentRepository;
  }

  @Transactional(readOnly = true)
  public List<CommonChargeResponse> listCharges() {
    return chargeRepository.findAll().stream().map(this::toChargeResponse).toList();
  }

  @Transactional
  public CommonChargeResponse upsertCharge(CommonChargeRequest request) {
    CommonChargeEntity entity = request.externalId() != null && !request.externalId().isBlank()
      ? chargeRepository.findByCode(request.code()).orElseGet(CommonChargeEntity::new)
      : chargeRepository.findByCode(request.code()).orElseGet(CommonChargeEntity::new);
    if (entity.getCode() == null) {
      entity.setCode(request.code());
    }
    entity.setLabel(request.label());
    entity.setAmount(request.amount());
    entity.setRequired(request.required());
    entity.setActive(request.active());
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    return toChargeResponse(chargeRepository.save(entity));
  }

  @Transactional
  public CommonChargeAssignmentResponse assign(CommonChargeAssignmentRequest request) {
    CommonChargeEntity charge = chargeRepository.findById(request.chargeId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Charge not found"));
    CommonChargeAssignmentEntity entity = new CommonChargeAssignmentEntity();
    entity.setCharge(charge);
    entity.setScopeType(request.scopeType());
    entity.setScopeValue(request.scopeValue());
    entity.setRequired(request.required());
    entity.setCreatedAt(LocalDateTime.now());
    return toAssignmentResponse(assignmentRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public BigDecimal computeChargesForRoom(RoomEntity room) {
    if (room == null) return BigDecimal.ZERO;
    BigDecimal total = BigDecimal.ZERO;
    List<CommonChargeAssignmentEntity> byRoom = assignmentRepository
      .findByScopeTypeIgnoreCaseAndScopeValueIgnoreCase("ROOM", room.getNumeroChambre());
    List<CommonChargeAssignmentEntity> byBloc = room.getBloc() == null
      ? List.of()
      : assignmentRepository.findByScopeTypeIgnoreCaseAndScopeValueIgnoreCase("BLOC", room.getBloc());

    total = total.add(sumAssignments(byRoom));
    total = total.add(sumAssignments(byBloc));
    return total;
  }

  private BigDecimal sumAssignments(List<CommonChargeAssignmentEntity> assignments) {
    return assignments.stream()
      .map(CommonChargeAssignmentEntity::getCharge)
      .filter(charge -> charge != null && charge.isActive())
      .map(CommonChargeEntity::getAmount)
      .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private CommonChargeResponse toChargeResponse(CommonChargeEntity entity) {
    return new CommonChargeResponse(
      entity.getId(),
      entity.getCode(),
      entity.getLabel(),
      entity.getAmount(),
      entity.isRequired(),
      entity.isActive(),
      entity.getCreatedAt(),
      entity.getUpdatedAt()
    );
  }

  private CommonChargeAssignmentResponse toAssignmentResponse(CommonChargeAssignmentEntity entity) {
    return new CommonChargeAssignmentResponse(
      entity.getId(),
      entity.getCharge() == null ? null : entity.getCharge().getId(),
      entity.getCharge() == null ? null : entity.getCharge().getLabel(),
      entity.getScopeType(),
      entity.getScopeValue(),
      entity.isRequired(),
      entity.getCreatedAt()
    );
  }
}
