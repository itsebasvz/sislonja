import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
export const MAX_FOTO = 5 * 1024 * 1024;
const directory = fileURLToPath(new URL('../public/img/especies/subidas/', import.meta.url));
const formatos = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
export async function validarFotografia(file) {
  if (!file || !file.size) throw new Error('Selecciona una fotografía para la especie.');
  if (file.size > MAX_FOTO) throw new Error('La fotografía no debe superar 5 MB.');
  const ext = path.extname(file.name).toLowerCase();
  const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (!formatos[ext] || formatos[ext] !== mime) throw new Error('Selecciona una imagen JPG, JPEG, PNG, WebP o GIF.');
  const buffer = Buffer.from(await file.arrayBuffer());
  const valid = mime === 'image/jpeg' ? buffer.length >= 4 && buffer.subarray(0,3).equals(Buffer.from([255,216,255])) && buffer.subarray(-2).equals(Buffer.from([255,217]))
    : mime === 'image/png' ? buffer.length >= 33 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii',12,16) === 'IHDR' && buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(20) > 0
    : mime === 'image/webp' ? buffer.length >= 20 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP' && buffer.readUInt32LE(4) + 8 === buffer.length
    : buffer.length >= 14 && ['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6)) && buffer.readUInt16LE(6) > 0 && buffer.readUInt16LE(8) > 0;
  if (!valid) throw new Error('El contenido del archivo no corresponde a una imagen válida del formato indicado.');
  return { buffer, extension: ext === '.jpeg' ? '.jpg' : ext };
}
export async function guardarFotografia(foto) {
  await mkdir(directory, { recursive: true });
  const filename = randomUUID() + foto.extension;
  await writeFile(path.join(directory, filename), foto.buffer, { flag: 'wx' });
  return '/img/especies/subidas/' + filename;
}
export async function borrarFotografia(url) {
  if (!/^\/img\/especies\/subidas\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(url || '')) return;
  try { await unlink(path.join(directory, path.basename(url))); }
  catch (err) { if (err.code !== 'ENOENT') console.error('No se pudo limpiar una fotografía:', err.code); }
}
