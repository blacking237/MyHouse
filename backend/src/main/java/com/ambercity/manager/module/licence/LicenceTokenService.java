package com.ambercity.manager.module.licence;

import com.ambercity.manager.module.licence.domain.LicenceTokenEntity;
import com.ambercity.manager.module.licence.dto.LicenceTokenRequest;
import com.ambercity.manager.module.licence.dto.LicenceTokenResponse;
import com.ambercity.manager.module.licence.dto.LicenceVerifyResponse;
import com.ambercity.manager.module.licence.repo.LicenceTokenRepository;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LicenceTokenService {

  private final LicenceTokenRepository repository;

  @Value("${app.licence.rsa-private:}")
  private String rsaPrivateKey;

  @Value("${app.licence.rsa-public:}")
  private String rsaPublicKey;

  public LicenceTokenService(LicenceTokenRepository repository) {
    this.repository = repository;
  }

  @Transactional
  public LicenceTokenResponse issue(LicenceTokenRequest request) {
    String token = buildToken(request);
    LicenceTokenEntity entity = new LicenceTokenEntity();
    entity.setExternalId(UUID.randomUUID().toString());
    entity.setToken(token);
    entity.setStatus(request.status());
    entity.setMode(request.mode());
    entity.setIssuedAt(LocalDateTime.now());
    entity.setExpiresAt(parseDate(request.expiresAt()));
    return toResponse(repository.save(entity));
  }

  @Transactional(readOnly = true)
  public LicenceVerifyResponse verify(String token) {
    if (token == null || token.isBlank()) {
      return new LicenceVerifyResponse(false, "INVALID", "BLOCKED", "-", List.of(), null);
    }
    try {
      SignedJWT jwt = SignedJWT.parse(token);
      boolean valid = verifySignature(jwt);
      if (!valid) {
        return new LicenceVerifyResponse(false, "INVALID", "BLOCKED", "-", List.of(), null);
      }
      JWTClaimsSet claims = jwt.getJWTClaimsSet();
      String status = claims.getStringClaim("status");
      String mode = claims.getStringClaim("mode");
      String clientName = claims.getStringClaim("client");
      List<String> modules = claims.getStringListClaim("modules");
      String expiresAt = claims.getExpirationTime() == null ? null : claims.getExpirationTime().toInstant().toString();
      boolean active = claims.getExpirationTime() == null
        || claims.getExpirationTime().toInstant().isAfter(java.time.Instant.now());
      return new LicenceVerifyResponse(active, status, mode, clientName, modules == null ? List.of() : modules, expiresAt);
    } catch (Exception ex) {
      return new LicenceVerifyResponse(false, "INVALID", "BLOCKED", "-", List.of(), null);
    }
  }

  private String buildToken(LicenceTokenRequest request) {
    try {
      if (rsaPrivateKey == null || rsaPrivateKey.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSA private key missing");
      }
      JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
        .claim("client", request.clientName())
        .claim("status", request.status())
        .claim("mode", request.mode())
        .claim("modules", request.modules())
        .issueTime(java.util.Date.from(java.time.Instant.now()));
      LocalDateTime expiresAt = parseDate(request.expiresAt());
      if (expiresAt != null) {
        claims.expirationTime(java.util.Date.from(expiresAt.toInstant(ZoneOffset.UTC)));
      }
      SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims.build());
      RSAPrivateKey privateKey = loadPrivateKey();
      jwt.sign(new RSASSASigner(privateKey));
      return jwt.serialize();
    } catch (JOSEException ex) {
      throw new IllegalStateException("Unable to sign licence token", ex);
    }
  }

  private boolean verifySignature(SignedJWT jwt) throws Exception {
    if (rsaPublicKey == null || rsaPublicKey.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RSA public key missing");
    }
    RSAPublicKey publicKey = loadPublicKey();
    return jwt.verify(new RSASSAVerifier(publicKey));
  }

  private RSAPrivateKey loadPrivateKey() {
    try {
      byte[] keyBytes = Base64.getDecoder().decode(rsaPrivateKey);
      PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
      return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(spec);
    } catch (Exception ex) {
      throw new IllegalStateException("Invalid RSA private key", ex);
    }
  }

  private RSAPublicKey loadPublicKey() throws Exception {
    byte[] keyBytes = Base64.getDecoder().decode(rsaPublicKey);
    X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
    return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
  }

  private LocalDateTime parseDate(String raw) {
    if (raw == null || raw.isBlank()) return null;
    return LocalDateTime.parse(raw);
  }

  private LicenceTokenResponse toResponse(LicenceTokenEntity entity) {
    return new LicenceTokenResponse(
      entity.getId(),
      entity.getExternalId(),
      entity.getToken(),
      entity.getStatus(),
      entity.getMode(),
      entity.getIssuedAt(),
      entity.getExpiresAt()
    );
  }
}
