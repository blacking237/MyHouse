import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  const defaultAdminUsername = 'admin';
  const defaultAdminPasswordHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  const defaultConciergeUsername = 'concierge';
  const defaultConciergePasswordHash = 'c6139fd84d76b1100c5a3cefc7a211680f377b672d512be91a31ae2c958721c3';

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS role_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'manager',
      parent_role TEXT DEFAULT NULL,
      parent_username TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      approved_by TEXT DEFAULT NULL,
      approved_at TEXT DEFAULT NULL,
      rejected_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT NULL,
      email TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIF',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_chambre TEXT NOT NULL UNIQUE,
      nom_prenom TEXT NOT NULL,
      numero_whatsapp TEXT NOT NULL,
      bloc TEXT DEFAULT NULL,
      actif INTEGER NOT NULL DEFAULT 1,
      date_creation TEXT NOT NULL DEFAULT (datetime('now')),
      external_id TEXT UNIQUE,
      updated_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS month_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mois TEXT NOT NULL UNIQUE,
      pu_eau REAL NOT NULL,
      pu_electricite REAL NOT NULL,
      tva REAL NOT NULL DEFAULT 19.25,
      lc_eau REAL NOT NULL,
      lc_electricite REAL NOT NULL,
      surplus_eau_total REAL NOT NULL DEFAULT 0,
      surplus_elec_total REAL NOT NULL DEFAULT 0,
      amende_eau_montant REAL NOT NULL DEFAULT 3000,
      minimum_facture REAL NOT NULL DEFAULT 500,
      internet_fee REAL DEFAULT 0,
      common_charges_percent REAL DEFAULT 0,
      penalty_missing_index REAL DEFAULT 0,
      index_window_start_day INTEGER DEFAULT 25,
      index_window_end_day INTEGER DEFAULT 30,
      exports_validated_by_concierge INTEGER DEFAULT 0,
      exports_validated_at TEXT,
      exports_validated_by TEXT,
      delai_paiement TEXT NOT NULL,
      date_creation TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS index_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chambre_id INTEGER NOT NULL,
      mois TEXT NOT NULL,
      ancien_index_eau REAL NOT NULL,
      nouvel_index_eau REAL NOT NULL,
      ancien_index_elec REAL NOT NULL,
      nouvel_index_elec REAL NOT NULL,
      statut_presence TEXT NOT NULL DEFAULT 'PRESENT',
      amende_eau INTEGER NOT NULL DEFAULT 0,
      late_submission INTEGER NOT NULL DEFAULT 0,
      date_saisie TEXT NOT NULL DEFAULT (datetime('now')),
      saisi_par TEXT NOT NULL DEFAULT 'admin',
      external_id TEXT UNIQUE,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (chambre_id) REFERENCES rooms(id),
      UNIQUE(chambre_id, mois)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chambre_id INTEGER NOT NULL,
      mois TEXT NOT NULL,
      conso_eau REAL DEFAULT 0,
      montant_ht_eau REAL DEFAULT 0,
      tva_eau REAL DEFAULT 0,
      lc_eau REAL DEFAULT 0,
      surplus_eau REAL DEFAULT 0,
      amende_eau REAL DEFAULT 0,
      montant_ttc_eau REAL DEFAULT 0,
      conso_elec REAL DEFAULT 0,
      montant_ht_elec REAL DEFAULT 0,
      tva_elec REAL DEFAULT 0,
      lc_elec REAL DEFAULT 0,
      surplus_elec REAL DEFAULT 0,
      montant_ttc_elec REAL DEFAULT 0,
      internet_fee REAL DEFAULT 0,
      common_charges REAL DEFAULT 0,
      penalty_missing_index REAL DEFAULT 0,
      loyer REAL DEFAULT 0,
      dette REAL DEFAULT NULL,
      net_a_payer REAL DEFAULT 0,
      statut_envoi TEXT NOT NULL DEFAULT 'NON_ENVOYE',
      date_envoi TEXT DEFAULT NULL,
      calculee_le TEXT NOT NULL DEFAULT (datetime('now')),
      external_id TEXT UNIQUE,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (chambre_id) REFERENCES rooms(id),
      UNIQUE(chambre_id, mois)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facture_id INTEGER NOT NULL,
      montant_paye REAL NOT NULL,
      date_paiement TEXT NOT NULL,
      observation TEXT DEFAULT NULL,
      saisi_par TEXT NOT NULL DEFAULT 'admin',
      method TEXT DEFAULT NULL,
      status TEXT DEFAULT NULL,
      transaction_ref TEXT DEFAULT NULL,
      external_id TEXT UNIQUE,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (facture_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      cni TEXT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      genre TEXT,
      date_naissance TEXT,
      telephone TEXT,
      whatsapp TEXT,
      whatsapp_parents TEXT,
      email TEXT,
      ecole TEXT,
      filiere TEXT,
      niveau TEXT,
      niveau_etude TEXT,
      filiere_etude TEXT,
      contact_urgence_nom TEXT,
      contact_urgence_telephone TEXT,
      nom_pere TEXT,
      nom_mere TEXT,
      date_entree TEXT,
      date_sortie TEXT,
      statut TEXT NOT NULL DEFAULT 'ACTIF',
      current_room_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (current_room_id) REFERENCES rooms(id)
    );
  `);

  // Non-destructive schema extensions for sync + advanced modules.
  await tryExec(db, `ALTER TABLE rooms ADD COLUMN external_id TEXT`);
  await tryExec(db, `ALTER TABLE rooms ADD COLUMN updated_at TEXT`);
  await tryExec(db, `ALTER TABLE rooms ADD COLUMN deleted_at TEXT`);
  await tryExec(db, `ALTER TABLE rooms ADD COLUMN bloc TEXT`);

  await tryExec(db, `ALTER TABLE month_config ADD COLUMN internet_fee REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN common_charges_percent REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN penalty_missing_index REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN index_window_start_day INTEGER DEFAULT 25`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN index_window_end_day INTEGER DEFAULT 30`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN exports_validated_by_concierge INTEGER DEFAULT 0`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN exports_validated_at TEXT`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN exports_validated_by TEXT`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN updated_at TEXT`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN amende_eau_montant REAL DEFAULT 3000`);
  await tryExec(db, `ALTER TABLE month_config ADD COLUMN minimum_facture REAL DEFAULT 500`);

  await tryExec(db, `ALTER TABLE residents ADD COLUMN external_id TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN genre TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN cni TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN date_naissance TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN whatsapp_parents TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN email TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN ecole TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN filiere TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN niveau TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN niveau_etude TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN filiere_etude TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN contact_urgence_nom TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN contact_urgence_telephone TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN nom_pere TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN nom_mere TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN preferred_language TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN activity_score INTEGER`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN payments_count INTEGER`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN interactions_count INTEGER`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN last_active_at TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN date_entree TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN date_sortie TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN statut TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN current_room_id INTEGER`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN updated_at TEXT`);
  await tryExec(db, `ALTER TABLE residents ADD COLUMN deleted_at TEXT`);

  await tryExec(db, `ALTER TABLE role_accounts ADD COLUMN parent_role TEXT`);
  await tryExec(db, `ALTER TABLE role_accounts ADD COLUMN parent_username TEXT`);
  await tryExec(db, `ALTER TABLE role_accounts ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'`);
  await tryExec(db, `ALTER TABLE role_accounts ADD COLUMN approved_by TEXT`);
  await tryExec(db, `ALTER TABLE role_accounts ADD COLUMN approved_at TEXT`);
  await tryExec(db, `ALTER TABLE role_accounts ADD COLUMN rejected_at TEXT`);

  await tryExec(db, `ALTER TABLE index_readings ADD COLUMN external_id TEXT`);
  await tryExec(db, `ALTER TABLE index_readings ADD COLUMN updated_at TEXT`);
  await tryExec(db, `ALTER TABLE index_readings ADD COLUMN deleted_at TEXT`);
  await tryExec(db, `ALTER TABLE index_readings ADD COLUMN late_submission INTEGER DEFAULT 0`);

  await tryExec(db, `ALTER TABLE invoices ADD COLUMN external_id TEXT`);
  await tryExec(db, `ALTER TABLE invoices ADD COLUMN internet_fee REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE invoices ADD COLUMN common_charges REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE invoices ADD COLUMN penalty_missing_index REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE invoices ADD COLUMN loyer REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE invoices ADD COLUMN updated_at TEXT`);
  await tryExec(db, `ALTER TABLE invoices ADD COLUMN deleted_at TEXT`);

  await tryExec(db, `ALTER TABLE payments ADD COLUMN external_id TEXT`);
  await tryExec(db, `ALTER TABLE payments ADD COLUMN method TEXT`);
  await tryExec(db, `ALTER TABLE payments ADD COLUMN status TEXT`);
  await tryExec(db, `ALTER TABLE payments ADD COLUMN transaction_ref TEXT`);
  await tryExec(db, `ALTER TABLE payments ADD COLUMN updated_at TEXT`);
  await tryExec(db, `ALTER TABLE payments ADD COLUMN deleted_at TEXT`);
  await tryExec(db, `ALTER TABLE contracts ADD COLUMN validated_at TEXT`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN deposit_amount REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN sanction_total REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN common_charges_amount REAL DEFAULT 0`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN status TEXT DEFAULT 'DRAFT'`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN manager_signed_at TEXT`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN resident_signed_at TEXT`);
  await tryExec(db, `ALTER TABLE exit_reports ADD COLUMN signed_by TEXT`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      room_id INTEGER,
      resident_id INTEGER,
      status TEXT NOT NULL,
      signing_mode TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      monthly_rent REAL DEFAULT 0,
      deposit REAL DEFAULT 0,
      auto_renewal INTEGER DEFAULT 0,
      notes TEXT,
      validated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contract_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      signed_by TEXT NOT NULL,
      signed_at TEXT NOT NULL DEFAULT (datetime('now')),
      signature_type TEXT NOT NULL,
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      room_id INTEGER,
      resident_id INTEGER,
      category TEXT,
      priority TEXT,
      status TEXT,
      responsibility TEXT,
      estimated_cost REAL DEFAULT 0,
      penalty_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS main_meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      reading_date TEXT NOT NULL,
      water_index REAL NOT NULL,
      electric_index REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exit_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      resident_id INTEGER,
      room_id INTEGER,
      contract_id INTEGER,
      deposit_amount REAL DEFAULT 0,
      debt_total REAL DEFAULT 0,
      sanction_total REAL DEFAULT 0,
      repair_cost REAL DEFAULT 0,
      common_charges_amount REAL DEFAULT 0,
      deposit_used REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT',
      manager_signed_at TEXT,
      resident_signed_at TEXT,
      signed_by TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed the offline admin once; subsequent local password changes must be preserved.
  await db.runAsync(
    'INSERT OR IGNORE INTO admin (username, password_hash) VALUES (?, ?)',
    [defaultAdminUsername, defaultAdminPasswordHash]
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO user_profiles (username, role, display_name, created_by)
     VALUES (?, ?, ?, ?)`,
    [defaultAdminUsername, 'manager', 'Administrateur principal', 'system']
  );
  await db.runAsync(
    'DELETE FROM admin WHERE username = ? AND password_hash = ?',
    [defaultConciergeUsername, defaultConciergePasswordHash]
  );

  await db.runAsync(
    'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
    ['language', 'fr']
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
    ['theme_mode', 'light']
  );
}

async function tryExec(db: SQLiteDatabase, sql: string): Promise<void> {
  try {
    await db.execAsync(sql);
  } catch {
    // Non-destructive schema migration: ignore if column already exists.
  }
}
