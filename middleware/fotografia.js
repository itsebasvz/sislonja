import express from 'express';
import { MAX_FOTO } from '../helpers/fotografias.js';
const raw = express.raw({ type: 'multipart/form-data', limit: MAX_FOTO + 32768 });
export function recibirFotografia(req, res, next) {
  if (!['POST','PUT'].includes(req.method) || !/^\/especies(?:\/\d+)?\/?$/.test(req.path) || !req.is('multipart/form-data')) return next();
  if (req.usuario?.rol !== 'admin') return next(Object.assign(new Error('Solo el administrador puede subir fotografías.'), { status: 403 }));
  raw(req, res, async err => {
    if (err) return next(err);
    try {
      const form = await new Request('http://localhost/especies', { method: 'POST', headers: { 'content-type': req.get('content-type') }, body: req.body }).formData();
      req.body = Object.create(null);
      let bytes = 0;
      for (const [key,value] of form) {
        if (typeof value === 'string') {
          bytes += Buffer.byteLength(value);
          if (bytes > 32768 || Object.hasOwn(req.body,key)) throw new Error('Formulario inválido.');
          req.body[key] = value;
        } else if (value.size || value.name) {
          if (key !== 'fotografia' || req.fotografia) req.fotografiaError = 'Selecciona una sola fotografía.';
          else req.fotografia = value;
        }
      }
      next();
    } catch { next(Object.assign(new Error('No se pudo leer el formulario. Selecciona la fotografía e intenta de nuevo.'), { status: 400 })); }
  });
}
