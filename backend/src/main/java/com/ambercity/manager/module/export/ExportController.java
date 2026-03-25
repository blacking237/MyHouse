package com.ambercity.manager.module.export;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/exports")
public class ExportController {

  private final ExportService exportService;

  public ExportController(ExportService exportService) {
    this.exportService = exportService;
  }

  @GetMapping("/metertrack")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public ResponseEntity<byte[]> metertrack(@RequestParam String mois) {
    byte[] data = exportService.exportMeterTrack(mois);
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=metertrack-" + mois + ".xlsx")
      .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
      .body(data);
  }

  @GetMapping("/resident-history/{residentId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public ResponseEntity<byte[]> residentHistory(@PathVariable("residentId") Long residentId) {
    byte[] data = exportService.exportResidentHistory(residentId);
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resident-" + residentId + ".pdf")
      .contentType(MediaType.APPLICATION_PDF)
      .body(data);
  }

  @GetMapping("/payment-receipt/{paymentId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER','CONCIERGE')")
  public ResponseEntity<byte[]> paymentReceipt(@PathVariable("paymentId") Long paymentId) {
    byte[] data = exportService.exportPaymentReceipt(paymentId);
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=payment-" + paymentId + ".pdf")
      .contentType(MediaType.APPLICATION_PDF)
      .body(data);
  }

  @GetMapping("/exit-report/{reportId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
  public ResponseEntity<byte[]> exitReport(@PathVariable("reportId") Long reportId) {
    byte[] data = exportService.exportExitReport(reportId);
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=exit-report-" + reportId + ".pdf")
      .contentType(MediaType.APPLICATION_PDF)
      .body(data);
  }

  @GetMapping("/finance-summary")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_COMPTA','MANAGER')")
  public ResponseEntity<byte[]> financeSummary(@RequestParam String mois) {
    byte[] data = exportService.exportFinanceSummary(mois);
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=finance-summary-" + mois + ".xlsx")
      .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
      .body(data);
  }
}
