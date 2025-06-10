const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

// Tabelas por sorteio
db.prepare(`CREATE TABLE IF NOT EXISTS sorteios (
  id TEXT PRIMARY KEY,
  nome TEXT,
  canal_entrada TEXT,
  canal_registro TEXT,
  canal_resultado TEXT,
  faixa_min INTEGER,
  faixa_max INTEGER,
  valor_numero INTEGER,
  premio_total INTEGER DEFAULT 0
);`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS entradas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sorteio_id TEXT,
  user_id TEXT,
  user_tag TEXT,
  numeros TEXT,
  data TEXT
);`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS mensagens_bot (
  sorteio_id TEXT PRIMARY KEY,
  mensagem_id TEXT
);`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS mensagens_registro (
  sorteio_id TEXT PRIMARY KEY,
  mensagem_id TEXT
);`).run();

module.exports = db;
