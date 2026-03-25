ALTER TABLE month_config
  ALTER COLUMN pu_eau TYPE NUMERIC(12,2) USING pu_eau::NUMERIC(12,2),
  ALTER COLUMN pu_electricite TYPE NUMERIC(12,2) USING pu_electricite::NUMERIC(12,2),
  ALTER COLUMN tva TYPE NUMERIC(8,4) USING tva::NUMERIC(8,4),
  ALTER COLUMN lc_eau TYPE NUMERIC(12,2) USING lc_eau::NUMERIC(12,2),
  ALTER COLUMN lc_electricite TYPE NUMERIC(12,2) USING lc_electricite::NUMERIC(12,2),
  ALTER COLUMN surplus_eau_total TYPE NUMERIC(12,2) USING surplus_eau_total::NUMERIC(12,2),
  ALTER COLUMN surplus_elec_total TYPE NUMERIC(12,2) USING surplus_elec_total::NUMERIC(12,2),
  ALTER COLUMN internet_fee TYPE NUMERIC(12,2) USING internet_fee::NUMERIC(12,2),
  ALTER COLUMN common_charges_percent TYPE NUMERIC(6,2) USING common_charges_percent::NUMERIC(6,2),
  ALTER COLUMN penalty_missing_index TYPE NUMERIC(12,2) USING penalty_missing_index::NUMERIC(12,2),
  ALTER COLUMN amende_eau_montant TYPE NUMERIC(12,2) USING amende_eau_montant::NUMERIC(12,2),
  ALTER COLUMN minimum_facture TYPE NUMERIC(12,2) USING minimum_facture::NUMERIC(12,2);

ALTER TABLE invoices
  ALTER COLUMN total_eau_ttc TYPE NUMERIC(12,2) USING total_eau_ttc::NUMERIC(12,2),
  ALTER COLUMN total_elec_ttc TYPE NUMERIC(12,2) USING total_elec_ttc::NUMERIC(12,2),
  ALTER COLUMN total_facture TYPE NUMERIC(12,2) USING total_facture::NUMERIC(12,2),
  ALTER COLUMN internet_fee TYPE NUMERIC(12,2) USING internet_fee::NUMERIC(12,2),
  ALTER COLUMN common_charges TYPE NUMERIC(12,2) USING common_charges::NUMERIC(12,2),
  ALTER COLUMN penalty_missing_index TYPE NUMERIC(12,2) USING penalty_missing_index::NUMERIC(12,2),
  ALTER COLUMN loyer TYPE NUMERIC(12,2) USING loyer::NUMERIC(12,2),
  ALTER COLUMN dette TYPE NUMERIC(12,2) USING dette::NUMERIC(12,2),
  ALTER COLUMN net_a_payer TYPE NUMERIC(12,2) USING net_a_payer::NUMERIC(12,2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'montant_paye'
  ) THEN
    ALTER TABLE payments
      ALTER COLUMN montant_paye TYPE NUMERIC(12,2) USING montant_paye::NUMERIC(12,2);
  ELSE
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS montant_paye NUMERIC(12,2);
    UPDATE payments SET montant_paye = montant WHERE montant_paye IS NULL;
  END IF;
END $$;

ALTER TABLE maintenance_tickets
  ALTER COLUMN estimated_cost TYPE NUMERIC(12,2) USING estimated_cost::NUMERIC(12,2),
  ALTER COLUMN penalty_amount TYPE NUMERIC(12,2) USING penalty_amount::NUMERIC(12,2);

ALTER TABLE main_meter_readings
  ALTER COLUMN water_index TYPE NUMERIC(12,2) USING water_index::NUMERIC(12,2),
  ALTER COLUMN electric_index TYPE NUMERIC(12,2) USING electric_index::NUMERIC(12,2);
