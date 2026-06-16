/**
 * Loads .env.local (then .env) into process.env for standalone scripts, the way
 * `next dev` does automatically but `tsx` does not.
 *
 * IMPORT THIS FIRST — before anything that reads env at module-load time (e.g.
 * src/Lib/Env.ts parses process.env on import). Already-set variables win, so an
 * explicit `FOO=bar pnpm <script>` still overrides the file.
 */
import { existsSync, readFileSync } from 'node:fs';

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || key in process.env) continue; // explicit env wins
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');
