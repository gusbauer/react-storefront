import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Ruta absoluta basada en la ubicación de este archivo.
const currentDir = dirname(fileURLToPath(import.meta.url));

const dataDir = join(currentDir, "..", "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "gstore.db");

// Crear o abrir la base de datos.
const db = new Database(dbPath);

// Activar claves foráneas y modo WAL.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// Crear las tablas si todavía no existen.
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
    redsys_response TEXT,
    authorisation_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),

    FOREIGN KEY (order_id)
      REFERENCES orders(order_id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status
    ON orders(status);

  CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON order_items(order_id);
`);

export default db;
