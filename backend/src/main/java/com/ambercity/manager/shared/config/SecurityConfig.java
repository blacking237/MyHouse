package com.ambercity.manager.shared.config;

import com.ambercity.manager.shared.security.JwtAuthenticationFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;

  public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
    this.jwtAuthenticationFilter = jwtAuthenticationFilter;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
      .cors(cors -> cors.configurationSource(corsConfigurationSource()))
      .csrf(csrf -> csrf.disable())
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health").permitAll()
        .requestMatchers(
          "/api/v1/auth/login",
          "/api/v1/auth/refresh",
          "/api/v1/auth/recover-password",
          "/api/v1/auth/recover-password/request-code",
          "/api/v1/auth/recover-password/request-code/whatsapp",
          "/api/v1/auth/recover-password/request-code/push",
          "/api/v1/auth/logout",
          "/api/v1/auth/ping"
        ).permitAll()
        .anyRequest().authenticated()
      );
    http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    String rawOrigins = System.getenv().getOrDefault("APP_CORS_ALLOWED_ORIGINS", "*");
    List<String> allowedOrigins = Arrays.stream(rawOrigins.split(","))
      .map(String::trim)
      .filter(origin -> !origin.isEmpty())
      .toList();

    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(allowedOrigins.isEmpty() ? List.of("*") : allowedOrigins);
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setExposedHeaders(List.of("Authorization"));
    configuration.setAllowCredentials(false);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
