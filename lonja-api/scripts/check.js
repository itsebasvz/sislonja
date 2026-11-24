import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === '.git' ? [] : e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []); }
for (const f of files('.')) if (spawnSync(process.execPath, ['--check', f], { stdio: 'inherit' }).status) process.exit(1);
console.log('Sintaxis JavaScript verificada.');
