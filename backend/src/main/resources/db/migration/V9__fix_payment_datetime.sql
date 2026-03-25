ALTER TABLE payments
  ALTER COLUMN date_paiement TYPE TIMESTAMP USING date_paiement::TIMESTAMP;
