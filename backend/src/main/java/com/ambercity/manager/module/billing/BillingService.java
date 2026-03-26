package com.ambercity.manager.module.billing;

import com.ambercity.manager.module.auth.domain.UserEntity;
import com.ambercity.manager.module.auth.repo.UserRepository;
import com.ambercity.manager.module.billing.domain.InvoiceEntity;
import com.ambercity.manager.module.billing.domain.InvoiceLineEntity;
import com.ambercity.manager.module.billing.dto.BillingCalculateResponse;
import com.ambercity.manager.module.billing.dto.InvoiceResponse;
import com.ambercity.manager.module.commoncharge.CommonChargeService;
import com.ambercity.manager.module.billing.repo.InvoiceLineRepository;
import com.ambercity.manager.module.billing.repo.InvoiceRepository;
import com.ambercity.manager.module.contract.domain.ContractEntity;
import com.ambercity.manager.module.contract.repo.ContractRepository;
import com.ambercity.manager.module.meter.domain.IndexReadingEntity;
import com.ambercity.manager.module.meter.domain.MonthConfigEntity;
import com.ambercity.manager.module.meter.repo.IndexReadingRepository;
import com.ambercity.manager.module.meter.repo.MonthConfigRepository;
import com.ambercity.manager.module.resident.domain.ResidentRoomHistoryEntity;
import com.ambercity.manager.module.resident.repo.ResidentRoomHistoryRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import com.ambercity.manager.shared.security.JwtService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {

  private static final Pattern MOIS_PATTERN = Pattern.compile("^\\d{4}-\\d{2}$");
  private static final BigDecimal HUNDRED = new BigDecimal("100");
  private static final String PRESENT = "PRESENT";
  private static final String TYPE_EAU = "EAU";
  private static final String TYPE_ELEC = "ELEC";

  private final MonthConfigRepository monthConfigRepository;
  private final IndexReadingRepository indexReadingRepository;
  private final RoomRepository roomRepository;
  private final ResidentRoomHistoryRepository historyRepository;
  private final InvoiceRepository invoiceRepository;
  private final InvoiceLineRepository invoiceLineRepository;
  private final ContractRepository contractRepository;
  private final CommonChargeService commonChargeService;
  private final UserRepository userRepository;

  public BillingService(
    MonthConfigRepository monthConfigRepository,
    IndexReadingRepository indexReadingRepository,
    RoomRepository roomRepository,
    ResidentRoomHistoryRepository historyRepository,
    InvoiceRepository invoiceRepository,
    InvoiceLineRepository invoiceLineRepository,
    ContractRepository contractRepository,
    CommonChargeService commonChargeService,
    UserRepository userRepository
  ) {
    this.monthConfigRepository = monthConfigRepository;
    this.indexReadingRepository = indexReadingRepository;
    this.roomRepository = roomRepository;
    this.historyRepository = historyRepository;
    this.invoiceRepository = invoiceRepository;
    this.invoiceLineRepository = invoiceLineRepository;
    this.contractRepository = contractRepository;
    this.commonChargeService = commonChargeService;
    this.userRepository = userRepository;
  }

  @Transactional
  public BillingCalculateResponse calculateAll(String mois, boolean forceRecompute) {
    validateMois(mois);
    MonthConfigEntity config = monthConfigRepository.findByMois(mois)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month config not found"));

    List<RoomEntity> activeRooms = roomRepository.findByActifOrderByNumeroChambreAsc(true);
    Map<Long, IndexReadingEntity> readingsByRoom = indexReadingRepository.findByMoisOrderByRoomNumeroChambreAsc(mois)
      .stream()
      .collect(Collectors.toMap(r -> r.getRoom().getId(), Function.identity(), (a, b) -> a));

    List<BillingCalculateResponse.ValidationError> errors = validateReadings(activeRooms, readingsByRoom);
    if (!errors.isEmpty()) {
      return new BillingCalculateResponse(false, 0, errors);
    }

    long nbPresent = readingsByRoom.values().stream()
      .filter(r -> PRESENT.equalsIgnoreCase(r.getStatutPresence()))
      .count();
    BigDecimal surplusEauIndiv = nbPresent > 0
      ? round2(config.getSurplusEauTotal().divide(BigDecimal.valueOf(nbPresent), 6, RoundingMode.HALF_UP))
      : BigDecimal.ZERO;
    BigDecimal surplusElecIndiv = nbPresent > 0
      ? round2(config.getSurplusElecTotal().divide(BigDecimal.valueOf(nbPresent), 6, RoundingMode.HALF_UP))
      : BigDecimal.ZERO;

    int count = 0;
    for (RoomEntity room : activeRooms) {
      IndexReadingEntity reading = readingsByRoom.get(room.getId());
      if (reading == null) {
        continue;
      }

      BigDecimal consoEau = round2(reading.getNiEau().subtract(reading.getAnEau()));
      BigDecimal mhtEau = consoEau.compareTo(BigDecimal.ZERO) > 0
        ? round2(consoEau.multiply(config.getPuEau()))
        : round2(config.getMinimumFacture());
      BigDecimal tvaEau = round2(mhtEau.multiply(config.getTva()).divide(HUNDRED, 6, RoundingMode.HALF_UP));
      BigDecimal sEau = PRESENT.equalsIgnoreCase(reading.getStatutPresence()) ? surplusEauIndiv : BigDecimal.ZERO;
      BigDecimal aEau = reading.isAmendeEau() ? round2(config.getAmendeEauMontant()) : BigDecimal.ZERO;
      BigDecimal ttcEau = round2(mhtEau.add(tvaEau).add(config.getLcEau()).add(sEau).add(aEau));

      BigDecimal consoElec = round2(reading.getNiElec().subtract(reading.getAnElec()));
      BigDecimal mhtElec = consoElec.compareTo(BigDecimal.ZERO) > 0
        ? round2(consoElec.multiply(config.getPuElectricite()))
        : round2(config.getMinimumFacture());
      BigDecimal tvaElec = round2(mhtElec.multiply(config.getTva()).divide(HUNDRED, 6, RoundingMode.HALF_UP));
      BigDecimal sElec = PRESENT.equalsIgnoreCase(reading.getStatutPresence()) ? surplusElecIndiv : BigDecimal.ZERO;
      BigDecimal ttcElec = round2(mhtElec.add(tvaElec).add(config.getLcElectricite()).add(sElec));

      BigDecimal internetFee = config.getInternetFee() == null ? BigDecimal.ZERO : config.getInternetFee();
      BigDecimal commonCharges = config.getCommonChargesPercent() == null ? BigDecimal.ZERO
        : round2(ttcEau.add(ttcElec).multiply(config.getCommonChargesPercent()).divide(HUNDRED, 6, RoundingMode.HALF_UP));
      BigDecimal commonChargesAddon = commonChargeService.computeChargesForRoom(room);
      commonCharges = round2(commonCharges.add(commonChargesAddon));
      BigDecimal penaltyMissingIndex = PRESENT.equalsIgnoreCase(reading.getStatutPresence()) && !reading.isLateSubmission()
        ? BigDecimal.ZERO
        : round2(config.getPenaltyMissingIndex() == null ? BigDecimal.ZERO : config.getPenaltyMissingIndex());

      ContractEntity contract = contractRepository.findByRoomIdAndStatusIn(room.getId(), List.of("ACTIVE", "VALIDATED"))
        .orElse(null);
      BigDecimal loyer = contract == null || contract.getMonthlyRent() == null ? BigDecimal.ZERO : contract.getMonthlyRent();

      BigDecimal total = round2(ttcEau.add(ttcElec).add(internetFee).add(commonCharges).add(penaltyMissingIndex).add(loyer));

      ResidentRoomHistoryEntity assignment = historyRepository
        .findFirstByRoomIdAndDateFinIsNullOrderByDateDebutDesc(room.getId())
        .orElse(null);

      InvoiceEntity invoice = invoiceRepository.findByRoomIdAndMois(room.getId(), mois).orElseGet(InvoiceEntity::new);
      BigDecimal oldDette = invoice.getDette() == null ? BigDecimal.ZERO : invoice.getDette();
      if (invoice.getId() != null && !forceRecompute) {
        oldDette = invoice.getDette() == null ? BigDecimal.ZERO : invoice.getDette();
      }

      invoice.setRoom(room);
      invoice.setResident(assignment == null ? null : assignment.getResident());
      invoice.setMois(mois);
      invoice.setTotalEauTtc(ttcEau);
      invoice.setTotalElecTtc(ttcElec);
      invoice.setTotalFacture(total);
      invoice.setInternetFee(internetFee);
      invoice.setCommonCharges(commonCharges);
      invoice.setPenaltyMissingIndex(penaltyMissingIndex);
      invoice.setLoyer(loyer);
      if (invoice.getExternalId() == null || invoice.getExternalId().isBlank()) {
        invoice.setExternalId(UUID.randomUUID().toString());
      }
      invoice.setDette(oldDette.compareTo(BigDecimal.ZERO) == 0 ? null : oldDette);
      invoice.setNetAPayer(round2(total.add(oldDette)));
      if (invoice.getStatutEnvoi() == null) {
        invoice.setStatutEnvoi("NON_ENVOYE");
      }
      invoice.setCalculeeLe(LocalDateTime.now());
      invoice.setUpdatedAt(LocalDateTime.now());
      InvoiceEntity saved = invoiceRepository.save(invoice);

      invoiceLineRepository.deleteByInvoiceId(saved.getId());
      invoiceLineRepository.save(buildLine(saved, TYPE_EAU, consoEau, mhtEau, tvaEau, config.getLcEau(), sEau, aEau, ttcEau));
      invoiceLineRepository.save(buildLine(saved, TYPE_ELEC, consoElec, mhtElec, tvaElec, config.getLcElectricite(), sElec, BigDecimal.ZERO, ttcElec));
      count++;
    }

    return new BillingCalculateResponse(true, count, List.of());
  }

  @Transactional(readOnly = true)
  public List<InvoiceResponse> listInvoices(String mois, Authentication authentication) {
    validateMois(mois);
    MonthConfigEntity config = monthConfigRepository.findByMois(mois).orElse(null);
    return resolveInvoicesForActor(mois, authentication).stream()
      .map(i -> {
        List<InvoiceLineEntity> lines = invoiceLineRepository.findByInvoiceIdOrderByIdAsc(i.getId());
        InvoiceLineEntity water = lines.stream().filter(l -> TYPE_EAU.equals(l.getType())).findFirst().orElse(null);
        InvoiceLineEntity elec = lines.stream().filter(l -> TYPE_ELEC.equals(l.getType())).findFirst().orElse(null);
        return new InvoiceResponse(
          i.getId(),
          i.getExternalId(),
          i.getRoom().getId(),
          i.getRoom().getNumeroChambre(),
          i.getResident() == null ? null : i.getResident().getId(),
          i.getMois(),
          toLine(water),
          toLine(elec),
          nz(i.getTotalFacture()),
          nz(i.getInternetFee()),
          nz(i.getCommonCharges()),
          nz(i.getPenaltyMissingIndex()),
          nz(i.getLoyer()),
          i.getDette(),
          nz(i.getNetAPayer()),
          i.getStatutEnvoi(),
          i.getCalculeeLe(),
          config == null ? null : config.getDelaiPaiement()
        );
      })
      .toList();
  }

  private List<InvoiceEntity> resolveInvoicesForActor(String mois, Authentication authentication) {
    if (authentication != null && authentication.getAuthorities().stream().anyMatch(auth -> "ROLE_RESIDENT".equals(auth.getAuthority()))) {
      JwtService.TokenPrincipal principal = authentication.getPrincipal() instanceof JwtService.TokenPrincipal tokenPrincipal
        ? tokenPrincipal
        : null;
      if (principal == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
      }
      UserEntity user = userRepository.findByUsernameAndActifTrue(principal.username())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
      if (user.getResidentId() == null) {
        return List.of();
      }
      return invoiceRepository.findByMoisAndResidentIdOrderByRoomNumeroChambreAsc(mois, user.getResidentId());
    }
    return invoiceRepository.findByMoisOrderByRoomNumeroChambreAsc(mois);
  }

  @Transactional
  public InvoiceResponse updateDebt(Long invoiceId, BigDecimal dette) {
    InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
    BigDecimal total = nz(invoice.getTotalFacture());
    BigDecimal safeDette = dette == null ? BigDecimal.ZERO : round2(dette);
    invoice.setDette(safeDette.compareTo(BigDecimal.ZERO) == 0 ? null : safeDette);
    invoice.setNetAPayer(round2(total.add(safeDette)));
    InvoiceEntity saved = invoiceRepository.save(invoice);
    return mapInvoice(saved);
  }

  @Transactional
  public InvoiceResponse updateSendStatus(Long invoiceId, String statutEnvoi) {
    InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
    invoice.setStatutEnvoi(statutEnvoi);
    invoice.setDateEnvoi("ENVOYE".equals(statutEnvoi) ? LocalDateTime.now() : null);
    InvoiceEntity saved = invoiceRepository.save(invoice);
    return mapInvoice(saved);
  }

  private List<BillingCalculateResponse.ValidationError> validateReadings(
    List<RoomEntity> activeRooms,
    Map<Long, IndexReadingEntity> readingsByRoom
  ) {
    List<BillingCalculateResponse.ValidationError> errors = new ArrayList<>();
    for (RoomEntity room : activeRooms) {
      IndexReadingEntity reading = readingsByRoom.get(room.getId());
      if (reading == null) {
        errors.add(new BillingCalculateResponse.ValidationError(room.getId(), room.getNumeroChambre(), "Missing index reading"));
        continue;
      }
      if (reading.getNiEau().compareTo(reading.getAnEau()) < 0) {
        errors.add(new BillingCalculateResponse.ValidationError(room.getId(), room.getNumeroChambre(), "NI eau < AN eau"));
      }
      if (reading.getNiElec().compareTo(reading.getAnElec()) < 0) {
        errors.add(new BillingCalculateResponse.ValidationError(room.getId(), room.getNumeroChambre(), "NI elec < AN elec"));
      }
    }
    return errors;
  }

  private InvoiceLineEntity buildLine(
    InvoiceEntity invoice,
    String type,
    BigDecimal conso,
    BigDecimal ht,
    BigDecimal tva,
    BigDecimal lc,
    BigDecimal surplus,
    BigDecimal amende,
    BigDecimal ttc
  ) {
    InvoiceLineEntity line = new InvoiceLineEntity();
    line.setInvoice(invoice);
    line.setType(type);
    line.setConso(round2(conso));
    line.setMontantHt(round2(ht));
    line.setTva(round2(tva));
    line.setLc(round2(lc));
    line.setSurplus(round2(surplus));
    line.setAmende(round2(amende));
    line.setMontantTtc(round2(ttc));
    return line;
  }

  private InvoiceResponse.Line toLine(InvoiceLineEntity line) {
    if (line == null) {
      return new InvoiceResponse.Line(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }
    return new InvoiceResponse.Line(
      nz(line.getConso()),
      nz(line.getMontantHt()),
      nz(line.getTva()),
      nz(line.getLc()),
      nz(line.getSurplus()),
      nz(line.getAmende()),
      nz(line.getMontantTtc())
    );
  }

  private InvoiceResponse mapInvoice(InvoiceEntity invoice) {
    List<InvoiceLineEntity> lines = invoiceLineRepository.findByInvoiceIdOrderByIdAsc(invoice.getId());
    InvoiceLineEntity water = lines.stream().filter(l -> TYPE_EAU.equals(l.getType())).findFirst().orElse(null);
    InvoiceLineEntity elec = lines.stream().filter(l -> TYPE_ELEC.equals(l.getType())).findFirst().orElse(null);
    MonthConfigEntity config = monthConfigRepository.findByMois(invoice.getMois()).orElse(null);
    return new InvoiceResponse(
      invoice.getId(),
      invoice.getExternalId(),
      invoice.getRoom().getId(),
      invoice.getRoom().getNumeroChambre(),
      invoice.getResident() == null ? null : invoice.getResident().getId(),
      invoice.getMois(),
      toLine(water),
      toLine(elec),
      nz(invoice.getTotalFacture()),
      nz(invoice.getInternetFee()),
      nz(invoice.getCommonCharges()),
      nz(invoice.getPenaltyMissingIndex()),
      nz(invoice.getLoyer()),
      invoice.getDette(),
      nz(invoice.getNetAPayer()),
      invoice.getStatutEnvoi(),
      invoice.getCalculeeLe(),
      config == null ? null : config.getDelaiPaiement()
    );
  }

  private BigDecimal round2(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal nz(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private void validateMois(String mois) {
    if (mois == null || !MOIS_PATTERN.matcher(mois).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mois format, expected YYYY-MM");
    }
  }
}
