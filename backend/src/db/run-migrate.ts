import { pool } from './pool.js'
import { runMigrations } from './migrate.js'

async function main(): Promise<void> {
  await runMigrations()
  console.log('Migrations complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
