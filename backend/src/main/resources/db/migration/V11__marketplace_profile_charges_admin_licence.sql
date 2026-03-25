-- Marketplace
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(80) UNIQUE,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'FCFA',
  listing_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  address VARCHAR(200),
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  owner_user_id BIGINT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_media (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  plan VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  started_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_contact VARCHAR(120),
  amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL
);

-- Resident profile extension
ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS activity_score INT,
  ADD COLUMN IF NOT EXISTS payments_count INT,
  ADD COLUMN IF NOT EXISTS interactions_count INT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Common charges
CREATE TABLE IF NOT EXISTS common_charges (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  label VARCHAR(120) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS common_charge_assignments (
  id BIGSERIAL PRIMARY KEY,
  charge_id BIGINT NOT NULL REFERENCES common_charges(id) ON DELETE CASCADE,
  scope_type VARCHAR(20) NOT NULL,
  scope_value VARCHAR(60) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL
);

-- Admin global settings
CREATE TABLE IF NOT EXISTS global_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(120) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP NOT NULL
);

-- Licence tokens (RS256)
CREATE TABLE IF NOT EXISTS licence_tokens (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(80) UNIQUE,
  token TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  issued_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP
);
