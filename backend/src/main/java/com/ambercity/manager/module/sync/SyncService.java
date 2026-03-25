package com.ambercity.manager.module.sync;

import com.ambercity.manager.module.billing.domain.InvoiceEntity;
import com.ambercity.manager.module.billing.repo.InvoiceRepository;
import com.ambercity.manager.module.contract.domain.ContractEntity;
import com.ambercity.manager.module.contract.repo.ContractRepository;
import com.ambercity.manager.module.exit.domain.ExitReportEntity;
import com.ambercity.manager.module.exit.repo.ExitReportRepository;
import com.ambercity.manager.module.mainmeter.domain.MainMeterReadingEntity;
import com.ambercity.manager.module.mainmeter.repo.MainMeterReadingRepository;
import com.ambercity.manager.module.maintenance.domain.MaintenanceTicketEntity;
import com.ambercity.manager.module.maintenance.repo.MaintenanceTicketRepository;
import com.ambercity.manager.module.meter.domain.IndexReadingEntity;
import com.ambercity.manager.module.meter.repo.IndexReadingRepository;
import com.ambercity.manager.module.payment.domain.PaymentEntity;
import com.ambercity.manager.module.payment.repo.PaymentRepository;
import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import com.ambercity.manager.module.room.domain.RoomEntity;
import com.ambercity.manager.module.room.repo.RoomRepository;
import com.ambercity.manager.module.sync.dto.SyncPayload;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SyncService {

  private final RoomRepository roomRepository;
  private final ResidentRepository residentRepository;
  private final IndexReadingRepository indexReadingRepository;
  private final InvoiceRepository invoiceRepository;
  private final PaymentRepository paymentRepository;
  private final ContractRepository contractRepository;
  private final MaintenanceTicketRepository maintenanceRepository;
  private final MainMeterReadingRepository mainMeterRepository;
  private final ExitReportRepository exitReportRepository;

  public SyncService(
    RoomRepository roomRepository,
    ResidentRepository residentRepository,
    IndexReadingRepository indexReadingRepository,
    InvoiceRepository invoiceRepository,
    PaymentRepository paymentRepository,
    ContractRepository contractRepository,
    MaintenanceTicketRepository maintenanceRepository,
    MainMeterReadingRepository mainMeterRepository,
    ExitReportRepository exitReportRepository
  ) {
    this.roomRepository = roomRepository;
    this.residentRepository = residentRepository;
    this.indexReadingRepository = indexReadingRepository;
    this.invoiceRepository = invoiceRepository;
    this.paymentRepository = paymentRepository;
    this.contractRepository = contractRepository;
    this.maintenanceRepository = maintenanceRepository;
    this.mainMeterRepository = mainMeterRepository;
    this.exitReportRepository = exitReportRepository;
  }

  @Transactional
  public void push(SyncPayload payload) {
    if (payload.rooms() != null) {
      payload.rooms().forEach(this::mergeRoom);
    }
    if (payload.residents() != null) {
      payload.residents().forEach(this::mergeResident);
    }
    if (payload.indexReadings() != null) {
      payload.indexReadings().forEach(this::mergeIndexReading);
    }
    if (payload.invoices() != null) {
      payload.invoices().forEach(this::mergeInvoice);
    }
    if (payload.payments() != null) {
      payload.payments().forEach(this::mergePayment);
    }
    if (payload.contracts() != null) {
      payload.contracts().forEach(this::mergeContract);
    }
    if (payload.maintenance() != null) {
      payload.maintenance().forEach(this::mergeMaintenance);
    }
    if (payload.mainMeters() != null) {
      payload.mainMeters().forEach(this::mergeMainMeter);
    }
    if (payload.exitReports() != null) {
      payload.exitReports().forEach(this::mergeExitReport);
    }
  }

  @Transactional(readOnly = true)
  public SyncPayload pull(String since) {
    LocalDateTime sinceTs = parseDateTime(since);
    List<RoomEntity> rooms = roomRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<ResidentEntity> residents = residentRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<IndexReadingEntity> readings = indexReadingRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<InvoiceEntity> invoices = invoiceRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<PaymentEntity> payments = paymentRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<ContractEntity> contracts = contractRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<MaintenanceTicketEntity> maintenance = maintenanceRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<MainMeterReadingEntity> mainMeters = mainMeterRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();
    List<ExitReportEntity> exitReports = exitReportRepository.findAll().stream()
      .filter(r -> r.getUpdatedAt() != null && r.getUpdatedAt().isAfter(sinceTs))
      .toList();

    return new SyncPayload(
      LocalDateTime.now().toString(),
      rooms.stream().map(r -> new SyncPayload.RoomSync(
        ensureExternalId(r.getExternalId()),
        r.getNumeroChambre(),
        r.getBloc(),
        r.isActif(),
        toString(r.getUpdatedAt())
      )).toList(),
      residents.stream().map(r -> new SyncPayload.ResidentSync(
        ensureExternalId(r.getExternalId()),
        r.getCni(),
        r.getNom(),
        r.getPrenom(),
        r.getGenre(),
        toString(r.getDateNaissance()),
        r.getTelephone(),
        r.getWhatsapp(),
        r.getWhatsappParents(),
        r.getEmail(),
        r.getEcole(),
        r.getFiliere(),
        r.getNiveau(),
        r.getNiveauEtude(),
        r.getFiliereEtude(),
        r.getContactUrgenceNom(),
        r.getContactUrgenceTelephone(),
        r.getNomPere(),
        r.getNomMere(),
        toString(r.getDateEntree()),
        toString(r.getDateSortie()),
        r.getStatut(),
        toString(r.getUpdatedAt())
      )).toList(),
      readings.stream().map(r -> new SyncPayload.IndexReadingSync(
        ensureExternalId(r.getExternalId()),
        ensureExternalId(r.getRoom() == null ? null : r.getRoom().getExternalId()),
        r.getMois(),
        r.getAnEau(),
        r.getNiEau(),
        r.getAnElec(),
        r.getNiElec(),
        r.getStatutPresence(),
        r.isAmendeEau(),
        r.getSaisiPar(),
        toString(r.getSaisiLe()),
        toString(r.getUpdatedAt())
      )).toList(),
      invoices.stream().map(r -> new SyncPayload.InvoiceSync(
        ensureExternalId(r.getExternalId()),
        ensureExternalId(r.getRoom() == null ? null : r.getRoom().getExternalId()),
        ensureExternalId(r.getResident() == null ? null : r.getResident().getExternalId()),
        r.getMois(),
        r.getTotalFacture(),
        r.getInternetFee(),
        r.getCommonCharges(),
        r.getPenaltyMissingIndex(),
        r.getLoyer(),
        r.getDette(),
        r.getNetAPayer(),
        r.getStatutEnvoi(),
        toString(r.getCalculeeLe()),
        toString(r.getUpdatedAt())
      )).toList(),
      payments.stream().map(p -> new SyncPayload.PaymentSync(
        ensureExternalId(p.getExternalId()),
        ensureExternalId(p.getInvoice() == null ? null : p.getInvoice().getExternalId()),
        p.getMontantPaye(),
        p.getMethod(),
        p.getStatus(),
        p.getTransactionRef(),
        toString(p.getDatePaiement()),
        toString(p.getUpdatedAt())
      )).toList(),
      contracts.stream().map(c -> new SyncPayload.ContractSync(
        ensureExternalId(c.getExternalId()),
        ensureExternalId(c.getRoom() == null ? null : c.getRoom().getExternalId()),
        ensureExternalId(c.getResident() == null ? null : c.getResident().getExternalId()),
        c.getStatus(),
        c.getSigningMode(),
        toString(c.getStartDate()),
        toString(c.getEndDate()),
        c.getMonthlyRent(),
        c.getDeposit(),
        c.isAutoRenewal(),
        c.getNotes(),
        toString(c.getUpdatedAt())
      )).toList(),
      maintenance.stream().map(m -> new SyncPayload.MaintenanceSync(
        ensureExternalId(m.getExternalId()),
        ensureExternalId(m.getRoom() == null ? null : m.getRoom().getExternalId()),
        ensureExternalId(m.getResident() == null ? null : m.getResident().getExternalId()),
        m.getCategory(),
        m.getPriority(),
        m.getStatus(),
        m.getResponsibility(),
        m.getEstimatedCost(),
        m.getPenaltyAmount(),
        m.getNotes(),
        toString(m.getUpdatedAt())
      )).toList(),
      mainMeters.stream().map(m -> new SyncPayload.MainMeterSync(
        ensureExternalId(m.getExternalId()),
        toString(m.getReadingDate()),
        m.getWaterIndex(),
        m.getElectricIndex(),
        m.getNote(),
        toString(m.getUpdatedAt())
      )).toList(),
      exitReports.stream().map(e -> new SyncPayload.ExitReportSync(
        ensureExternalId(e.getExternalId()),
        ensureExternalId(e.getRoom() == null ? null : e.getRoom().getExternalId()),
        ensureExternalId(e.getResident() == null ? null : e.getResident().getExternalId()),
        e.getDebtTotal(),
        e.getRepairCost(),
        e.getDepositUsed(),
        e.getBalance(),
        e.getNotes(),
        toString(e.getUpdatedAt())
      )).toList()
    );
  }

  private void mergeRoom(SyncPayload.RoomSync item) {
    RoomEntity entity = roomRepository.findByExternalId(item.externalId()).orElseGet(RoomEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setNumeroChambre(item.numeroChambre());
      entity.setBloc(item.bloc());
      entity.setActif(item.actif());
      if (entity.getCreatedAt() == null) {
        entity.setCreatedAt(LocalDateTime.now());
      }
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      roomRepository.save(entity);
    }
  }

  private void mergeResident(SyncPayload.ResidentSync item) {
    ResidentEntity entity = residentRepository.findByExternalId(item.externalId()).orElseGet(ResidentEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setCni(item.cni());
      entity.setNom(item.nom());
      entity.setPrenom(item.prenom());
      entity.setGenre(item.genre());
      entity.setDateNaissance(parseDate(item.dateNaissance()));
      entity.setTelephone(item.telephone());
      entity.setWhatsapp(item.whatsapp());
      entity.setWhatsappParents(item.whatsappParents());
      entity.setEmail(item.email());
      entity.setEcole(item.ecole());
      entity.setFiliere(item.filiere());
      entity.setNiveau(item.niveau());
      entity.setNiveauEtude(item.niveauEtude());
      entity.setFiliereEtude(item.filiereEtude());
      entity.setContactUrgenceNom(item.contactUrgenceNom());
      entity.setContactUrgenceTelephone(item.contactUrgenceTelephone());
      entity.setNomPere(item.nomPere());
      entity.setNomMere(item.nomMere());
      entity.setDateEntree(parseDate(item.dateEntree()));
      entity.setDateSortie(parseDate(item.dateSortie()));
      entity.setStatut(item.statut());
      if (entity.getCreatedAt() == null) {
        entity.setCreatedAt(LocalDateTime.now());
      }
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      residentRepository.save(entity);
    }
  }

  private void mergeIndexReading(SyncPayload.IndexReadingSync item) {
    if (item.roomExternalId() == null) return;
    RoomEntity room = roomRepository.findByExternalId(item.roomExternalId()).orElse(null);
    if (room == null) return;
    IndexReadingEntity entity = indexReadingRepository.findByExternalId(item.externalId()).orElseGet(IndexReadingEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setRoom(room);
      entity.setMois(item.mois());
      entity.setAnEau(item.anEau());
      entity.setNiEau(item.niEau());
      entity.setAnElec(item.anElec());
      entity.setNiElec(item.niElec());
      entity.setStatutPresence(item.statutPresence());
      entity.setAmendeEau(item.amendeEau());
      entity.setSaisiPar(item.saisiPar());
      entity.setSaisiLe(parseDateTime(item.saisiLe()));
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      indexReadingRepository.save(entity);
    }
  }

  private void mergeInvoice(SyncPayload.InvoiceSync item) {
    if (item.roomExternalId() == null) return;
    RoomEntity room = roomRepository.findByExternalId(item.roomExternalId()).orElse(null);
    if (room == null) return;
    ResidentEntity resident = item.residentExternalId() == null ? null : residentRepository.findByExternalId(item.residentExternalId()).orElse(null);
    InvoiceEntity entity = invoiceRepository.findByExternalId(item.externalId()).orElseGet(InvoiceEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setRoom(room);
      entity.setResident(resident);
      entity.setMois(item.mois());
      entity.setTotalFacture(item.totalFacture());
      entity.setInternetFee(item.internetFee());
      entity.setCommonCharges(item.commonCharges());
      entity.setPenaltyMissingIndex(item.penaltyMissingIndex());
      entity.setLoyer(item.loyer());
      entity.setDette(item.dette());
      entity.setNetAPayer(item.netAPayer());
      entity.setStatutEnvoi(item.statutEnvoi());
      entity.setCalculeeLe(parseDateTime(item.calculeeLe()));
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      invoiceRepository.save(entity);
    }
  }

  private void mergePayment(SyncPayload.PaymentSync item) {
    if (item.invoiceExternalId() == null) return;
    InvoiceEntity invoice = invoiceRepository.findByExternalId(item.invoiceExternalId()).orElse(null);
    if (invoice == null) return;
    PaymentEntity entity = paymentRepository.findByExternalId(item.externalId()).orElseGet(PaymentEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setInvoice(invoice);
      entity.setMontantPaye(item.amount());
      entity.setMethod(item.method());
      entity.setStatus(item.status());
      entity.setTransactionRef(item.transactionRef());
      entity.setDatePaiement(parseDateTime(item.paidAt()));
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      paymentRepository.save(entity);
    }
  }

  private void mergeContract(SyncPayload.ContractSync item) {
    if (item.roomExternalId() == null) return;
    RoomEntity room = roomRepository.findByExternalId(item.roomExternalId()).orElse(null);
    if (room == null) return;
    ResidentEntity resident = item.residentExternalId() == null ? null : residentRepository.findByExternalId(item.residentExternalId()).orElse(null);
    ContractEntity entity = contractRepository.findByExternalId(item.externalId()).orElseGet(ContractEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setRoom(room);
      entity.setResident(resident);
      entity.setStatus(item.status());
      entity.setSigningMode(item.signingMode());
      entity.setStartDate(parseDate(item.startDate()));
      entity.setEndDate(parseDate(item.endDate()));
      entity.setMonthlyRent(item.monthlyRent());
      entity.setDeposit(item.deposit());
      entity.setAutoRenewal(item.autoRenewal());
      entity.setNotes(item.notes());
      if (entity.getCreatedAt() == null) {
        entity.setCreatedAt(LocalDateTime.now());
      }
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      contractRepository.save(entity);
    }
  }

  private void mergeMaintenance(SyncPayload.MaintenanceSync item) {
    if (item.roomExternalId() == null) return;
    RoomEntity room = roomRepository.findByExternalId(item.roomExternalId()).orElse(null);
    if (room == null) return;
    ResidentEntity resident = item.residentExternalId() == null ? null : residentRepository.findByExternalId(item.residentExternalId()).orElse(null);
    MaintenanceTicketEntity entity = maintenanceRepository.findByExternalId(item.externalId()).orElseGet(MaintenanceTicketEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setRoom(room);
      entity.setResident(resident);
      entity.setCategory(item.category());
      entity.setPriority(item.priority());
      entity.setStatus(item.status());
      entity.setResponsibility(item.responsibility());
      entity.setEstimatedCost(item.estimatedCost());
      entity.setPenaltyAmount(item.penaltyAmount());
      entity.setNotes(item.notes());
      if (entity.getCreatedAt() == null) {
        entity.setCreatedAt(LocalDateTime.now());
      }
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      maintenanceRepository.save(entity);
    }
  }

  private void mergeMainMeter(SyncPayload.MainMeterSync item) {
    MainMeterReadingEntity entity = mainMeterRepository.findByExternalId(item.externalId()).orElseGet(MainMeterReadingEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      entity.setReadingDate(parseDate(item.date()));
      entity.setWaterIndex(item.waterIndex());
      entity.setElectricIndex(item.electricIndex());
      entity.setNote(item.note());
      if (entity.getCreatedAt() == null) {
        entity.setCreatedAt(LocalDateTime.now());
      }
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      mainMeterRepository.save(entity);
    }
  }

  private void mergeExitReport(SyncPayload.ExitReportSync item) {
    ExitReportEntity entity = exitReportRepository.findByExternalId(item.externalId()).orElseGet(ExitReportEntity::new);
    if (isNewer(entity.getUpdatedAt(), item.updatedAt())) {
      entity.setExternalId(item.externalId());
      if (item.roomExternalId() != null) {
        entity.setRoom(roomRepository.findByExternalId(item.roomExternalId()).orElse(null));
      }
      if (item.residentExternalId() != null) {
        entity.setResident(residentRepository.findByExternalId(item.residentExternalId()).orElse(null));
      }
      entity.setDebtTotal(item.debtTotal());
      entity.setRepairCost(item.repairCost());
      entity.setDepositUsed(item.depositUsed());
      entity.setBalance(item.balance());
      entity.setNotes(item.notes());
      if (entity.getCreatedAt() == null) {
        entity.setCreatedAt(LocalDateTime.now());
      }
      entity.setUpdatedAt(parseDateTime(item.updatedAt()));
      exitReportRepository.save(entity);
    }
  }

  private boolean isNewer(LocalDateTime current, String incoming) {
    LocalDateTime inc = parseDateTime(incoming);
    if (inc == null) return false;
    if (current == null) return true;
    return inc.isAfter(current);
  }

  private LocalDateTime parseDateTime(String value) {
    if (value == null || value.isBlank()) return LocalDateTime.MIN;
    try {
      return LocalDateTime.parse(value);
    } catch (Exception ex) {
      return LocalDateTime.MIN;
    }
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return LocalDate.parse(value);
    } catch (Exception ex) {
      return null;
    }
  }

  private String ensureExternalId(String externalId) {
    return externalId == null || externalId.isBlank() ? UUID.randomUUID().toString() : externalId;
  }

  private String toString(Object value) {
    return value == null ? null : value.toString();
  }
}
