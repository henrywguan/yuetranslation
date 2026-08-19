import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Resolve canto data dir in dev, tsx, and Vercel bundled functions. */
export function cantoDataDir(): string {
  const fromModule = join(dirname(fileURLToPath(import.meta.url)), 'data')
  if (existsSync(join(fromModule, 'phrases.json'))) return fromModule

  const fromRepo = join(process.cwd(), 'apps/api/src/canto/data')
  if (existsSync(join(fromRepo, 'phrases.json'))) return fromRepo

  return fromModule
}
