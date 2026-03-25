package com.ambercity.manager.shared.security;

import com.ambercity.manager.module.auth.domain.UserEntity;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  @Value("${app.security.jwt.secret:ambercity-change-this-secret-to-32-bytes-minimum}")
  private String jwtSecret;

  @Value("${app.security.jwt.access-token-seconds:900}")
  private long accessTokenSeconds;

  public String generateAccessToken(UserEntity user) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(accessTokenSeconds);

    JWTClaimsSet claims = new JWTClaimsSet.Builder()
      .subject(user.getUsername())
      .claim("uid", user.getId())
      .claim("role", user.getRole().name())
      .issueTime(Date.from(now))
      .expirationTime(Date.from(exp))
      .build();

    try {
      SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      jwt.sign(new MACSigner(jwtSecret.getBytes(StandardCharsets.UTF_8)));
      return jwt.serialize();
    } catch (JOSEException e) {
      throw new IllegalStateException("Cannot generate access token", e);
    }
  }

  public TokenPrincipal parseAndValidate(String token) {
    try {
      SignedJWT jwt = SignedJWT.parse(token);
      boolean validSignature = jwt.verify(new MACVerifier(jwtSecret.getBytes(StandardCharsets.UTF_8)));
      if (!validSignature) {
        return null;
      }
      JWTClaimsSet claims = jwt.getJWTClaimsSet();
      Date exp = claims.getExpirationTime();
      if (exp == null || exp.before(new Date())) {
        return null;
      }

      Long uid = claims.getLongClaim("uid");
      String role = claims.getStringClaim("role");
      String username = claims.getSubject();
      if (uid == null || role == null || username == null) {
        return null;
      }
      return new TokenPrincipal(uid, username, role);
    } catch (ParseException | JOSEException e) {
      return null;
    }
  }

  public long getAccessTokenSeconds() {
    return accessTokenSeconds;
  }

  public record TokenPrincipal(Long userId, String username, String role) {}
}
