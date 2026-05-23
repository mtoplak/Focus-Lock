import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pool } from './pool.js'

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations')

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function getAppliedMigrationNames(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY name',
  )
  return new Set(result.rows.map((row) => row.name))
}

async function applyMigration(name: string, sql: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    await client.query('COMMIT')
    console.log(`Applied migration: ${name}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable()

  let entries: string[]
  try {
    entries = await readdir(MIGRATIONS_DIR)
  } catch {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`)
  }

  const files = entries.filter((name) => name.endsWith('.sql')).sort()
  const applied = await getAppliedMigrationNames()

  for (const file of files) {
    if (applied.has(file)) {
      continue
    }

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    await applyMigration(file, sql)
  }
}
