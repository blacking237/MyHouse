DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'facture_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN facture_id BIGINT;
  END IF;
END $$;

UPDATE payments SET facture_id = invoice_id WHERE facture_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'montant_paye'
  ) THEN
    ALTER TABLE payments ADD COLUMN montant_paye NUMERIC(12,2);
  END IF;
END $$;

UPDATE payments SET montant_paye = montant WHERE montant_paye IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'mode'
  ) THEN
    UPDATE payments SET method = mode WHERE method IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_facture'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT fk_payments_facture FOREIGN KEY (facture_id) REFERENCES invoices(id);
  END IF;
END $$;

ALTER TABLE payments
  ALTER COLUMN facture_id SET NOT NULL;
