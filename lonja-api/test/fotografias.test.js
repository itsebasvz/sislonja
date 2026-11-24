import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarFotografia, MAX_FOTO } from '../helpers/fotografias.js';
const image = readFileSync(new URL('./fixtures/pulpo.jpg', import.meta.url));
test('acepta JPEG y normaliza la extensión sin usar el nombre del usuario como ruta', async () => {
  const foto = await validarFotografia(new File([image],'../../foto.JPEG',{type:'image/jpeg'}));
  assert.equal(foto.extension,'.jpg');assert.ok(foto.buffer.equals(image));
});
test('rechaza archivos vacíos, excesivos, formatos activos y contenido falsificado', async () => {
  for (const file of [new File([],'foto.jpg',{type:'image/jpeg'}),new File([Buffer.alloc(MAX_FOTO+1)],'grande.jpg',{type:'image/jpeg'}),new File(['<svg/>'],'foto.svg',{type:'image/svg+xml'}),new File(['texto'],'foto.jpg',{type:'image/jpeg'}),new File([image],'foto.png',{type:'image/png'})]) await assert.rejects(validarFotografia(file));
});
