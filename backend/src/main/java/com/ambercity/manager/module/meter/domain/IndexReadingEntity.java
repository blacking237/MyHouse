package com.ambercity.manager.module.meter.domain;

import com.ambercity.manager.module.room.domain.RoomEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "index_readings")
public class IndexReadingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "room_id")
  private RoomEntity room;

  @Column(nullable = false, length = 7)
  private String mois;

  @Column(name = "an_eau", nullable = false, precision = 12, scale = 2)
  private BigDecimal anEau;

  @Column(name = "ni_eau", nullable = false, precision = 12, scale = 2)
  private BigDecimal niEau;

  @Column(name = "an_elec", nullable = false, precision = 12, scale = 2)
  private BigDecimal anElec;

  @Column(name = "ni_elec", nullable = false, precision = 12, scale = 2)
  private BigDecimal niElec;

  @Column(name = "statut_presence", nullable = false, length = 20)
  private String statutPresence;

  @Column(name = "external_id")
  private String externalId;

  @Column(name = "amende_eau", nullable = false)
  private boolean amendeEau;

  @Column(name = "late_submission", nullable = false)
  private boolean lateSubmission;

  @Column(name = "photo_compteur_eau")
  private String photoCompteurEau;

  @Column(name = "photo_compteur_elec")
  private String photoCompteurElec;

  @Column(name = "saisi_par", nullable = false, length = 80)
  private String saisiPar;

  @Column(name = "saisi_le", nullable = false)
  private LocalDateTime saisiLe;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public RoomEntity getRoom() { return room; }
  public void setRoom(RoomEntity room) { this.room = room; }
  public String getMois() { return mois; }
  public void setMois(String mois) { this.mois = mois; }
  public BigDecimal getAnEau() { return anEau; }
  public void setAnEau(BigDecimal anEau) { this.anEau = anEau; }
  public BigDecimal getNiEau() { return niEau; }
  public void setNiEau(BigDecimal niEau) { this.niEau = niEau; }
  public BigDecimal getAnElec() { return anElec; }
  public void setAnElec(BigDecimal anElec) { this.anElec = anElec; }
  public BigDecimal getNiElec() { return niElec; }
  public void setNiElec(BigDecimal niElec) { this.niElec = niElec; }
  public String getStatutPresence() { return statutPresence; }
  public void setStatutPresence(String statutPresence) { this.statutPresence = statutPresence; }
  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }
  public boolean isAmendeEau() { return amendeEau; }
  public void setAmendeEau(boolean amendeEau) { this.amendeEau = amendeEau; }
  public boolean isLateSubmission() { return lateSubmission; }
  public void setLateSubmission(boolean lateSubmission) { this.lateSubmission = lateSubmission; }
  public String getPhotoCompteurEau() { return photoCompteurEau; }
  public void setPhotoCompteurEau(String photoCompteurEau) { this.photoCompteurEau = photoCompteurEau; }
  public String getPhotoCompteurElec() { return photoCompteurElec; }
  public void setPhotoCompteurElec(String photoCompteurElec) { this.photoCompteurElec = photoCompteurElec; }
  public String getSaisiPar() { return saisiPar; }
  public void setSaisiPar(String saisiPar) { this.saisiPar = saisiPar; }
  public LocalDateTime getSaisiLe() { return saisiLe; }
  public void setSaisiLe(LocalDateTime saisiLe) { this.saisiLe = saisiLe; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public LocalDateTime getDeletedAt() { return deletedAt; }
  public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
