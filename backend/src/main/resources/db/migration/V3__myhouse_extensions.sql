-- MyHouse extensions: roles, sync fields, contracts, maintenance, notifications, exit reports, main meters.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS niveau_etude TEXT,
  ADD COLUMN IF NOT EXISTS filiere_etude TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_nom TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_telephone TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE month_config
  ADD COLUMN IF NOT EXISTS internet_fee REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS common_charges_percent REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_missing_index REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE index_readings
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS internet_fee REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS common_charges REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_missing_index REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyer REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'CASH',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS recovery_email TEXT,
  ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS recovery_code_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS resident_id BIGINT;

CREATE TABLE IF NOT EXISTS contracts (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  room_id BIGINT,
  resident_id BIGINT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  signing_mode TEXT NOT NULL DEFAULT 'PHYSICAL',
  start_date DATE,
  end_date DATE,
  monthly_rent REAL DEFAULT 0,
  deposit REAL DEFAULT 0,
  auto_renewal BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMP,
  CONSTRAINT fk_contract_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_contract_resident FOREIGN KEY (resident_id) REFERENCES residents(id)
);

CREATE TABLE IF NOT EXISTS contract_signatures (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL,
  signed_by TEXT NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  signature_type TEXT NOT NULL DEFAULT 'CHECKBOX',
  CONSTRAINT fk_contract_signature FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  room_id BIGINT,
  resident_id BIGINT,
  category TEXT,
  priority TEXT DEFAULT 'Moyenne',
  status TEXT DEFAULT 'OUVERT',
  responsibility TEXT DEFAULT 'INCONNU',
  estimated_cost REAL DEFAULT 0,
  penalty_amount REAL DEFAULT 0,
  penalty_applied_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  CONSTRAINT fk_maintenance_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_maintenance_resident FOREIGN KEY (resident_id) REFERENCES residents(id)
);

CREATE TABLE IF NOT EXISTS main_meter_readings (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  reading_date DATE NOT NULL,
  water_index REAL NOT NULL,
  electric_index REAL NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  channel TEXT NOT NULL,
  recipient TEXT,
  subject TEXT,
  payload TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exit_reports (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  resident_id BIGINT,
  room_id BIGINT,
  contract_id BIGINT,
  debt_total REAL DEFAULT 0,
  repair_cost REAL DEFAULT 0,
  deposit_used REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_exit_resident FOREIGN KEY (resident_id) REFERENCES residents(id),
  CONSTRAINT fk_exit_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_exit_contract FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

UPDATE rooms SET updated_at = COALESCE(updated_at, created_at) WHERE updated_at IS NULL;
UPDATE residents SET updated_at = COALESCE(updated_at, created_at) WHERE updated_at IS NULL;
UPDATE month_config SET updated_at = COALESCE(updated_at, created_at) WHERE updated_at IS NULL;
UPDATE index_readings SET updated_at = COALESCE(updated_at, saisi_le) WHERE updated_at IS NULL;
UPDATE invoices SET updated_at = COALESCE(updated_at, calculee_le) WHERE updated_at IS NULL;
UPDATE payments SET updated_at = COALESCE(updated_at, date_paiement) WHERE updated_at IS NULL;
