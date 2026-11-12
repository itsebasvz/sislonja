import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(root, '../20');
const marker = path.join(target, '.entrega-lonja');
if (existsSync(target) && readdirSync(target).length && !existsSync(marker)) throw new Error('20 contiene archivos ajenos. Revísalos antes de generar la entrega.');
mkdirSync(target, { recursive: true });
for (const name of ['app.js','index.js','package.json','package-lock.json','.env.example','README.md','config','models','controllers','routes','middleware','helpers','views','public','data','scripts','sql','test']) cpSync(path.join(root,name),path.join(target,name), {recursive:true});
mkdirSync(path.join(target,'docs'),{recursive:true}); for(const doc of ['GUIA_TECNICA.md','CATALOGO_LONJA.md','CREDITOS_FOTOGRAFIAS.md','DIRECCIONES_MEXICO.md']) cpSync(path.join(root,'docs',doc),path.join(target,'docs',doc));
writeFileSync(marker, 'Copia generada de Sistema Lonja. No incluir secretos.\n');
const archive = path.resolve(root, '../20.zip');
const excluded = name => name === '.env' || (name.startsWith('.env.') && name !== '.env.example') || ['node_modules','.git','artifacts','.entrega-lonja'].includes(name) || name.endsWith('.log');
function collect(dir) {
  return readdirSync(dir, { withFileTypes: true }).filter(e => !excluded(e.name)).flatMap(e => e.isDirectory() ? collect(path.join(dir,e.name)) : [path.relative(path.dirname(target),path.join(dir,e.name))]);
}
const entries = collect(target);
const result = spawnSync('zip', ['-q','-FS',archive,'-@'], { cwd:path.dirname(target), input:entries.join('\n')+'\n', encoding:'utf8' });
if (result.stderr) process.stderr.write(result.stderr);
if (result.status) process.exit(result.status || 1);
console.log('Entrega lista: '+archive+' (sin .env, node_modules ni Git).');
