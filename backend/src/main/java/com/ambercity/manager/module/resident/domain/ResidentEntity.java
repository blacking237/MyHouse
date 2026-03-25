package com.ambercity.manager.module.resident.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "residents")
public class ResidentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true, length = 50)
  private String cni;

  @Column(name = "external_id", unique = true)
  private String externalId;

  @Column(nullable = false, length = 120)
  private String nom;

  @Column(nullable = false, length = 120)
  private String prenom;

  @Column(name = "date_naissance")
  private LocalDate dateNaissance;

  @Column(length = 40)
  private String telephone;

  @Column(length = 40)
  private String whatsapp;

  @Column(name = "whatsapp_parents", length = 40)
  private String whatsappParents;

  @Column(length = 160)
  private String email;

  @Column(length = 160)
  private String ecole;

  @Column(length = 160)
  private String filiere;

  @Column(name = "niveau_etude", length = 120)
  private String niveauEtude;

  @Column(name = "filiere_etude", length = 160)
  private String filiereEtude;

  @Column(name = "contact_urgence_nom", length = 160)
  private String contactUrgenceNom;

  @Column(name = "contact_urgence_telephone", length = 40)
  private String contactUrgenceTelephone;

  @Column(length = 20)
  private String genre;

  @Column(length = 60)
  private String niveau;

  @Column(name = "nom_pere", length = 160)
  private String nomPere;

  @Column(name = "nom_mere", length = 160)
  private String nomMere;

  @Column(name = "photo_cni_recto")
  private String photoCniRecto;

  @Column(name = "photo_cni_verso")
  private String photoCniVerso;

  @Column(name = "preferred_language", length = 10)
  private String preferredLanguage;

  @Column(name = "activity_score")
  private Integer activityScore;

  @Column(name = "payments_count")
  private Integer paymentsCount;

  @Column(name = "interactions_count")
  private Integer interactionsCount;

  @Column(name = "last_active_at")
  private LocalDateTime lastActiveAt;

  @Column(name = "date_entree")
  private LocalDate dateEntree;

  @Column(name = "date_sortie")
  private LocalDate dateSortie;

  @Column(nullable = false, length = 20)
  private String statut;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getCni() {
    return cni;
  }

  public void setCni(String cni) {
    this.cni = cni;
  }

  public String getExternalId() {
    return externalId;
  }

  public void setExternalId(String externalId) {
    this.externalId = externalId;
  }

  public String getNom() {
    return nom;
  }

  public void setNom(String nom) {
    this.nom = nom;
  }

  public String getPrenom() {
    return prenom;
  }

  public void setPrenom(String prenom) {
    this.prenom = prenom;
  }

  public LocalDate getDateNaissance() {
    return dateNaissance;
  }

  public void setDateNaissance(LocalDate dateNaissance) {
    this.dateNaissance = dateNaissance;
  }

  public String getTelephone() {
    return telephone;
  }

  public void setTelephone(String telephone) {
    this.telephone = telephone;
  }

  public String getWhatsapp() {
    return whatsapp;
  }

  public void setWhatsapp(String whatsapp) {
    this.whatsapp = whatsapp;
  }

  public String getWhatsappParents() {
    return whatsappParents;
  }

  public void setWhatsappParents(String whatsappParents) {
    this.whatsappParents = whatsappParents;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getEcole() {
    return ecole;
  }

  public void setEcole(String ecole) {
    this.ecole = ecole;
  }

  public String getFiliere() {
    return filiere;
  }

  public void setFiliere(String filiere) {
    this.filiere = filiere;
  }

  public String getNiveauEtude() {
    return niveauEtude;
  }

  public void setNiveauEtude(String niveauEtude) {
    this.niveauEtude = niveauEtude;
  }

  public String getFiliereEtude() {
    return filiereEtude;
  }

  public void setFiliereEtude(String filiereEtude) {
    this.filiereEtude = filiereEtude;
  }

  public String getContactUrgenceNom() {
    return contactUrgenceNom;
  }

  public void setContactUrgenceNom(String contactUrgenceNom) {
    this.contactUrgenceNom = contactUrgenceNom;
  }

  public String getContactUrgenceTelephone() {
    return contactUrgenceTelephone;
  }

  public void setContactUrgenceTelephone(String contactUrgenceTelephone) {
    this.contactUrgenceTelephone = contactUrgenceTelephone;
  }

  public String getGenre() {
    return genre;
  }

  public void setGenre(String genre) {
    this.genre = genre;
  }

  public String getNiveau() {
    return niveau;
  }

  public void setNiveau(String niveau) {
    this.niveau = niveau;
  }

  public String getNomPere() {
    return nomPere;
  }

  public void setNomPere(String nomPere) {
    this.nomPere = nomPere;
  }

  public String getNomMere() {
    return nomMere;
  }

  public void setNomMere(String nomMere) {
    this.nomMere = nomMere;
  }

  public String getPhotoCniRecto() {
    return photoCniRecto;
  }

  public void setPhotoCniRecto(String photoCniRecto) {
    this.photoCniRecto = photoCniRecto;
  }

  public String getPhotoCniVerso() {
    return photoCniVerso;
  }

  public void setPhotoCniVerso(String photoCniVerso) {
    this.photoCniVerso = photoCniVerso;
  }

  public String getPreferredLanguage() {
    return preferredLanguage;
  }

  public void setPreferredLanguage(String preferredLanguage) {
    this.preferredLanguage = preferredLanguage;
  }

  public Integer getActivityScore() {
    return activityScore;
  }

  public void setActivityScore(Integer activityScore) {
    this.activityScore = activityScore;
  }

  public Integer getPaymentsCount() {
    return paymentsCount;
  }

  public void setPaymentsCount(Integer paymentsCount) {
    this.paymentsCount = paymentsCount;
  }

  public Integer getInteractionsCount() {
    return interactionsCount;
  }

  public void setInteractionsCount(Integer interactionsCount) {
    this.interactionsCount = interactionsCount;
  }

  public LocalDateTime getLastActiveAt() {
    return lastActiveAt;
  }

  public void setLastActiveAt(LocalDateTime lastActiveAt) {
    this.lastActiveAt = lastActiveAt;
  }

  public LocalDate getDateEntree() {
    return dateEntree;
  }

  public void setDateEntree(LocalDate dateEntree) {
    this.dateEntree = dateEntree;
  }

  public LocalDate getDateSortie() {
    return dateSortie;
  }

  public void setDateSortie(LocalDate dateSortie) {
    this.dateSortie = dateSortie;
  }

  public String getStatut() {
    return statut;
  }

  public void setStatut(String statut) {
    this.statut = statut;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public LocalDateTime getDeletedAt() {
    return deletedAt;
  }

  public void setDeletedAt(LocalDateTime deletedAt) {
    this.deletedAt = deletedAt;
  }
}
