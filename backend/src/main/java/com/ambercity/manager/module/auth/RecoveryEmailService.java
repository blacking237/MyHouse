package com.ambercity.manager.module.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class RecoveryEmailService {

  private static final Logger log = LoggerFactory.getLogger(RecoveryEmailService.class);

  private final JavaMailSender mailSender;
  private final String fromAddress;
  private final boolean enabled;

  public RecoveryEmailService(
    JavaMailSender mailSender,
    @Value("${app.security.recovery.mail-from:no-reply@myhouse.local}") String fromAddress,
    @Value("${app.security.recovery.mail-enabled:false}") boolean enabled
  ) {
    this.mailSender = mailSender;
    this.fromAddress = fromAddress;
    this.enabled = enabled;
  }

  public void sendRecoveryCode(String toEmail, String username, String code) {
    if (!enabled) {
      log.warn("Recovery mail disabled. Username={}, email={}, code={}", username, toEmail, code);
      return;
    }
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(toEmail);
    message.setSubject("MyHouse - Code de recuperation");
    message.setText(
      "Bonjour,\n\n"
      + "Votre code de recuperation MyHouse est: " + code + "\n"
      + "Ce code expire dans 15 minutes.\n\n"
      + "Si vous n'avez pas demande cette operation, ignorez ce message.\n"
    );
    mailSender.send(message);
  }
}
