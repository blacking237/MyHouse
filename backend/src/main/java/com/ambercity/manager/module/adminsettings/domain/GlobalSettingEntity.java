package com.ambercity.manager.module.adminsettings.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "global_settings")
public class GlobalSettingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "setting_key", unique = true, length = 120, nullable = false)
  private String settingKey;

  @Column(name = "setting_value", columnDefinition = "TEXT")
  private String settingValue;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getSettingKey() { return settingKey; }
  public void setSettingKey(String settingKey) { this.settingKey = settingKey; }
  public String getSettingValue() { return settingValue; }
  public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
