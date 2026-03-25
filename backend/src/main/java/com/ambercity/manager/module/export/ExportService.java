package com.ambercity.manager.module.export;

import com.ambercity.manager.module.billing.domain.InvoiceEntity;
import com.ambercity.manager.module.billing.repo.InvoiceRepository;
import com.ambercity.manager.module.exit.domain.ExitReportEntity;
import com.ambercity.manager.module.exit.repo.ExitReportRepository;
import com.ambercity.manager.module.meter.domain.IndexReadingEntity;
import com.ambercity.manager.module.meter.repo.IndexReadingRepository;
import com.ambercity.manager.module.payment.domain.PaymentEntity;
import com.ambercity.manager.module.payment.repo.PaymentRepository;
import com.ambercity.manager.module.resident.domain.ResidentEntity;
import com.ambercity.manager.module.resident.repo.ResidentRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ExportService {

  private final IndexReadingRepository indexReadingRepository;
  private final InvoiceRepository invoiceRepository;
  private final PaymentRepository paymentRepository;
  private final ResidentRepository residentRepository;
  private final ExitReportRepository exitReportRepository;

  public ExportService(
    IndexReadingRepository indexReadingRepository,
    InvoiceRepository invoiceRepository,
    PaymentRepository paymentRepository,
    ResidentRepository residentRepository,
    ExitReportRepository exitReportRepository
  ) {
    this.indexReadingRepository = indexReadingRepository;
    this.invoiceRepository = invoiceRepository;
    this.paymentRepository = paymentRepository;
    this.residentRepository = residentRepository;
    this.exitReportRepository = exitReportRepository;
  }

  @Transactional(readOnly = true)
  public byte[] exportMeterTrack(String mois) {
    List<IndexReadingEntity> readings = indexReadingRepository.findByMoisOrderByRoomNumeroChambreAsc(mois);
    List<InvoiceEntity> invoices = invoiceRepository.findByMoisOrderByRoomNumeroChambreAsc(mois);
    List<PaymentEntity> payments = invoices.stream()
      .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
      .toList();

    try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet s1 = workbook.createSheet("IndexReadings");
      Row h1 = s1.createRow(0);
      h1.createCell(0).setCellValue("Chambre");
      h1.createCell(1).setCellValue("Mois");
      h1.createCell(2).setCellValue("AN Eau");
      h1.createCell(3).setCellValue("NI Eau");
      h1.createCell(4).setCellValue("AN Elec");
      h1.createCell(5).setCellValue("NI Elec");
      int r = 1;
      for (IndexReadingEntity e : readings) {
        Row row = s1.createRow(r++);
        row.createCell(0).setCellValue(e.getRoom().getNumeroChambre());
        row.createCell(1).setCellValue(e.getMois());
        row.createCell(2).setCellValue(nz(e.getAnEau()));
        row.createCell(3).setCellValue(nz(e.getNiEau()));
        row.createCell(4).setCellValue(nz(e.getAnElec()));
        row.createCell(5).setCellValue(nz(e.getNiElec()));
      }

      Sheet s2 = workbook.createSheet("Invoices");
      Row h2 = s2.createRow(0);
      h2.createCell(0).setCellValue("Chambre");
      h2.createCell(1).setCellValue("Total");
      h2.createCell(2).setCellValue("Net a payer");
      h2.createCell(3).setCellValue("Statut envoi");
      r = 1;
      for (InvoiceEntity inv : invoices) {
        Row row = s2.createRow(r++);
        row.createCell(0).setCellValue(inv.getRoom().getNumeroChambre());
        row.createCell(1).setCellValue(nz(inv.getTotalFacture()));
        row.createCell(2).setCellValue(nz(inv.getNetAPayer()));
        row.createCell(3).setCellValue(inv.getStatutEnvoi());
      }

      Sheet s3 = workbook.createSheet("Payments");
      Row h3 = s3.createRow(0);
      h3.createCell(0).setCellValue("Facture");
      h3.createCell(1).setCellValue("Montant");
      h3.createCell(2).setCellValue("Mode");
      h3.createCell(3).setCellValue("Statut");
      r = 1;
      for (PaymentEntity p : payments) {
        Row row = s3.createRow(r++);
        row.createCell(0).setCellValue(p.getInvoice().getId());
        row.createCell(1).setCellValue(nz(p.getMontantPaye()));
        row.createCell(2).setCellValue(p.getMethod());
        row.createCell(3).setCellValue(p.getStatus());
      }

      workbook.write(out);
      return out.toByteArray();
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed");
    }
  }

  @Transactional(readOnly = true)
  public byte[] exportResidentHistory(Long residentId) {
    ResidentEntity resident = residentRepository.findById(residentId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found"));
    return buildSimplePdf("Historique resident", List.of(
      "Resident: " + resident.getNom() + " " + resident.getPrenom(),
      "Telephone: " + resident.getTelephone(),
      "WhatsApp: " + resident.getWhatsapp(),
      "Email: " + resident.getEmail()
    ));
  }

  @Transactional(readOnly = true)
  public byte[] exportPaymentReceipt(Long paymentId) {
    PaymentEntity payment = paymentRepository.findById(paymentId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    return buildSimplePdf("Recu de paiement", List.of(
      "Facture: " + payment.getInvoice().getId(),
      "Montant: " + payment.getMontantPaye(),
      "Mode: " + payment.getMethod(),
      "Statut: " + payment.getStatus(),
      "Date: " + payment.getDatePaiement()
    ));
  }

  @Transactional(readOnly = true)
  public byte[] exportExitReport(Long reportId) {
    ExitReportEntity report = exitReportRepository.findById(reportId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exit report not found"));
    return buildSimplePdf("PV de sortie", List.of(
      "Chambre: " + (report.getRoom() == null ? "" : report.getRoom().getNumeroChambre()),
      "Dette: " + report.getDebtTotal(),
      "Reparations: " + report.getRepairCost(),
      "Charges communes (25% caution): " + report.getCommonCharges(),
      "Caution: " + report.getDepositTotal(),
      "Depot utilise: " + report.getDepositUsed(),
      "Solde: " + report.getBalance(),
      "Date: " + report.getUpdatedAt()
    ));
  }

  @Transactional(readOnly = true)
  public byte[] exportFinanceSummary(String mois) {
    List<InvoiceEntity> invoices = invoiceRepository.findByMoisOrderByRoomNumeroChambreAsc(mois);
    List<PaymentEntity> payments = invoices.stream()
      .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
      .toList();

    BigDecimal totalInvoiced = invoices.stream()
      .map(InvoiceEntity::getNetAPayer)
      .filter(v -> v != null)
      .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal totalPaid = payments.stream()
      .filter(p -> isSettled(p.getStatus()))
      .map(PaymentEntity::getMontantPaye)
      .filter(v -> v != null)
      .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal totalDebt = invoices.stream()
      .map(InvoiceEntity::getDette)
      .filter(v -> v != null)
      .reduce(BigDecimal.ZERO, BigDecimal::add);

    try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet summary = workbook.createSheet("FinanceSummary");
      Row h = summary.createRow(0);
      h.createCell(0).setCellValue("Mois");
      h.createCell(1).setCellValue("Total factures");
      h.createCell(2).setCellValue("Total paye");
      h.createCell(3).setCellValue("Total dette");
      Row row = summary.createRow(1);
      row.createCell(0).setCellValue(mois);
      row.createCell(1).setCellValue(nz(totalInvoiced));
      row.createCell(2).setCellValue(nz(totalPaid));
      row.createCell(3).setCellValue(nz(totalDebt));

      Sheet s1 = workbook.createSheet("Invoices");
      Row hi = s1.createRow(0);
      hi.createCell(0).setCellValue("Chambre");
      hi.createCell(1).setCellValue("Net a payer");
      hi.createCell(2).setCellValue("Dette");
      hi.createCell(3).setCellValue("Statut envoi");
      int r = 1;
      for (InvoiceEntity inv : invoices) {
        Row ir = s1.createRow(r++);
        ir.createCell(0).setCellValue(inv.getRoom().getNumeroChambre());
        ir.createCell(1).setCellValue(nz(inv.getNetAPayer()));
        ir.createCell(2).setCellValue(nz(inv.getDette()));
        ir.createCell(3).setCellValue(inv.getStatutEnvoi());
      }

      Sheet s2 = workbook.createSheet("Payments");
      Row hp = s2.createRow(0);
      hp.createCell(0).setCellValue("Facture");
      hp.createCell(1).setCellValue("Montant");
      hp.createCell(2).setCellValue("Mode");
      hp.createCell(3).setCellValue("Statut");
      r = 1;
      for (PaymentEntity p : payments) {
        Row pr = s2.createRow(r++);
        pr.createCell(0).setCellValue(p.getInvoice().getId());
        pr.createCell(1).setCellValue(nz(p.getMontantPaye()));
        pr.createCell(2).setCellValue(p.getMethod());
        pr.createCell(3).setCellValue(p.getStatus());
      }

      workbook.write(out);
      return out.toByteArray();
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed");
    }
  }

  private byte[] buildSimplePdf(String title, List<String> lines) {
    try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      PDPage page = new PDPage(PDRectangle.A4);
      doc.addPage(page);
      try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
        content.setFont(PDType1Font.HELVETICA_BOLD, 16);
        content.beginText();
        content.newLineAtOffset(50, 780);
        content.showText(title);
        content.endText();

        content.setFont(PDType1Font.HELVETICA, 11);
        float y = 750;
        for (String line : lines) {
          content.beginText();
          content.newLineAtOffset(50, y);
          content.showText(line);
          content.endText();
          y -= 18;
        }
        content.beginText();
        content.newLineAtOffset(50, y - 10);
        content.showText("Genere le " + LocalDateTime.now());
        content.endText();
      }
      doc.save(out);
      return out.toByteArray();
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF export failed");
    }
  }

  private double nz(BigDecimal value) {
    return value == null ? 0 : value.doubleValue();
  }

  private boolean isSettled(String status) {
    if (status == null) return false;
    String normalized = status.trim().toUpperCase();
    return "CONFIRMED".equals(normalized) || "COMPLETED".equals(normalized) || "SUCCESS".equals(normalized);
  }
}
