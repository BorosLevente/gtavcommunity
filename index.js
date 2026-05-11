// db/index.js — PostgreSQL kapcsolat és táblák inicializálása
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = {
  query: (text, params) => pool.query(text, params),
};

export async function initDB() {
  console.log('🗄️  Adatbázis inicializálása...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id         SERIAL PRIMARY KEY,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'Support',
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      last_login BIGINT
    );

    CREATE TABLE IF NOT EXISTS applications (
      id              SERIAL PRIMARY KEY,
      username        TEXT NOT NULL,
      age             INT,
      position        TEXT NOT NULL,
      member_since    TEXT,
      motivation      TEXT,
      audition_status TEXT,
      submitted_at    BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    );

    CREATE TABLE IF NOT EXISTS logs (
      id         SERIAL PRIMARY KEY,
      type       TEXT NOT NULL DEFAULT 'action',
      username   TEXT,
      text       TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Alapértelmezett admin fiók, ha még nincs egy se
  const { rows } = await pool.query('SELECT COUNT(*) FROM accounts');
  if (parseInt(rows[0].count) === 0) {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash('admin123', 10);
    await pool.query(
      'INSERT INTO accounts (username, password, role) VALUES ($1, $2, $3)',
      ['admin', hash, 'Tulajdonos']
    );
    console.log('✅ Alapértelmezett admin fiók létrehozva: admin / admin123');
  }

  console.log('✅ Adatbázis kész');
}
