CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  resident_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  numero_chambre VARCHAR(50) NOT NULL UNIQUE,
  bloc VARCHAR(20) NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS residents (
  id BIGSERIAL PRIMARY KEY,
  cni VARCHAR(50) NULL UNIQUE,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  date_naissance DATE NULL,
  telephone VARCHAR(40) NULL,
  whatsapp VARCHAR(40) NULL,
  whatsapp_parents VARCHAR(40) NULL,
  email VARCHAR(160) NULL,
  ecole VARCHAR(160) NULL,
  filiere VARCHAR(160) NULL,
  niveau VARCHAR(60) NULL,
  nom_pere VARCHAR(160) NULL,
  nom_mere VARCHAR(160) NULL,
  photo_cni_recto TEXT NULL,
  photo_cni_verso TEXT NULL,
  date_entree DATE NULL,
  date_sortie DATE NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resident_room_history (
  id BIGSERIAL PRIMARY KEY,
  resident_id BIGINT NOT NULL,
  room_id BIGINT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NULL,
  motif VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS month_config (
  id BIGSERIAL PRIMARY KEY,
  mois VARCHAR(7) NOT NULL UNIQUE,
  pu_eau NUMERIC(12,2) NOT NULL,
  pu_electricite NUMERIC(12,2) NOT NULL,
  tva NUMERIC(8,4) NOT NULL DEFAULT 19.25,
  lc_eau NUMERIC(12,2) NOT NULL,
  lc_electricite NUMERIC(12,2) NOT NULL,
  surplus_eau_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  surplus_elec_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amende_eau_montant NUMERIC(12,2) NOT NULL DEFAULT 3000,
  minimum_facture NUMERIC(12,2) NOT NULL DEFAULT 500,
  delai_paiement DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS index_readings (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL,
  mois VARCHAR(7) NOT NULL,
  an_eau NUMERIC(12,2) NOT NULL,
  ni_eau NUMERIC(12,2) NOT NULL,
  an_elec NUMERIC(12,2) NOT NULL,
  ni_elec NUMERIC(12,2) NOT NULL,
  statut_presence VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
  amende_eau BOOLEAN NOT NULL DEFAULT FALSE,
  photo_compteur_eau TEXT NULL,
  photo_compteur_elec TEXT NULL,
  saisi_par VARCHAR(80) NOT NULL,
  saisi_le TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, mois)
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL,
  resident_id BIGINT NULL,
  mois VARCHAR(7) NOT NULL,
  total_eau_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_elec_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_facture NUMERIC(12,2) NOT NULL DEFAULT 0,
  dette NUMERIC(12,2) NULL,
  net_a_payer NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut_envoi VARCHAR(20) NOT NULL DEFAULT 'NON_ENVOYE',
  date_envoi TIMESTAMP NULL,
  calculee_le TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, mois)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  type VARCHAR(10) NOT NULL,
  conso NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  lc NUMERIC(12,2) NOT NULL DEFAULT 0,
  surplus NUMERIC(12,2) NOT NULL DEFAULT 0,
  amende NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NULL,
  resident_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  montant NUMERIC(12,2) NOT NULL,
  date_paiement DATE NOT NULL,
  mode VARCHAR(30) NOT NULL DEFAULT 'CASH',
  reference VARCHAR(120) NULL,
  observation TEXT NULL,
  saisi_par VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debts_ledger (
  id BIGSERIAL PRIMARY KEY,
  resident_id BIGINT NOT NULL,
  mois VARCHAR(7) NOT NULL,
  montant_ouverture NUMERIC(12,2) NOT NULL DEFAULT 0,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_cloture NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(resident_id, mois)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  payload_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_resident
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL;

ALTER TABLE refresh_tokens
  ADD CONSTRAINT fk_refresh_tokens_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE resident_room_history
  ADD CONSTRAINT fk_rrh_resident
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE;

ALTER TABLE resident_room_history
  ADD CONSTRAINT fk_rrh_room
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE index_readings
  ADD CONSTRAINT fk_readings_room
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_room
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_resident
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL;

ALTER TABLE invoice_lines
  ADD CONSTRAINT fk_invoice_lines_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_resident
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT;

ALTER TABLE debts_ledger
  ADD CONSTRAINT fk_debts_resident
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE;

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_user
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_mois ON invoices(mois);
CREATE INDEX IF NOT EXISTS idx_readings_mois ON index_readings(mois);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date_paiement);
CREATE INDEX IF NOT EXISTS idx_residents_statut ON residents(statut);
