package com.ambercity.manager.module.meter;

import com.ambercity.manager.module.meter.domain.MonthConfigEntity;
import com.ambercity.manager.module.meter.dto.MonthConfigRequest;
import com.ambercity.manager.module.meter.dto.MonthConfigResponse;
import com.ambercity.manager.module.meter.repo.MonthConfigRepository;
import java.time.LocalDateTime;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MeterConfigService {

  private static final Pattern MOIS_PATTERN = Pattern.compile("^\\d{4}-\\d{2}$");
  private final MonthConfigRepository repository;

  public MeterConfigService(MonthConfigRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public MonthConfigResponse getByMois(String mois) {
    validateMois(mois);
    MonthConfigEntity entity = repository.findByMois(mois)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Month config not found"));
    return toResponse(entity);
  }

  @Transactional
  public MonthConfigResponse upsert(String mois, MonthConfigRequest request) {
    validateMois(mois);
    MonthConfigEntity entity = repository.findByMois(mois).orElseGet(MonthConfigEntity::new);
    entity.setMois(mois);
    entity.setPuEau(request.puEau());
    entity.setPuElectricite(request.puElectricite());
    entity.setTva(request.tva());
    entity.setLcEau(request.lcEau());
    entity.setLcElectricite(request.lcElectricite());
    entity.setSurplusEauTotal(request.surplusEauTotal());
    entity.setSurplusElecTotal(request.surplusElecTotal());
    entity.setInternetFee(request.internetFee());
    entity.setCommonChargesPercent(request.commonChargesPercent());
    entity.setPenaltyMissingIndex(request.penaltyMissingIndex());
    entity.setIndexWindowStartDay(normalizeWindowDay(request.indexWindowStartDay(), 25));
    entity.setIndexWindowEndDay(normalizeWindowDay(request.indexWindowEndDay(), 30));
    entity.setAmendeEauMontant(request.amendeEauMontant());
    entity.setMinimumFacture(request.minimumFacture());
    entity.setDelaiPaiement(request.delaiPaiement());
    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(LocalDateTime.now());
    }
    entity.setUpdatedAt(LocalDateTime.now());
    return toResponse(repository.save(entity));
  }

  private MonthConfigResponse toResponse(MonthConfigEntity e) {
    return new MonthConfigResponse(
      e.getId(), e.getMois(), e.getPuEau(), e.getPuElectricite(), e.getTva(),
      e.getLcEau(), e.getLcElectricite(), e.getSurplusEauTotal(), e.getSurplusElecTotal(),
      e.getInternetFee(), e.getCommonChargesPercent(), e.getPenaltyMissingIndex(),
      e.getIndexWindowStartDay(), e.getIndexWindowEndDay(),
      e.getAmendeEauMontant(), e.getMinimumFacture(), e.getDelaiPaiement(),
      e.getCreatedAt(), e.getUpdatedAt()
    );
  }

  private Integer normalizeWindowDay(Integer raw, int fallback) {
    if (raw == null) {
      return fallback;
    }
    if (raw < 1) return 1;
    if (raw > 31) return 31;
    return raw;
  }

  private void validateMois(String mois) {
    if (mois == null || !MOIS_PATTERN.matcher(mois).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mois format, expected YYYY-MM");
    }
  }
}
