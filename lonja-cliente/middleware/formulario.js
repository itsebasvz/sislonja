import { randomBytes, timingSafeEqual } from 'node:crypto';

export const cookieOptions = {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/'};
const iguales = (a,b) => typeof a === 'string' && a.length === b.length &&
  Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function verificarFormulario(req,res,next) {
  const seguro = ['GET','HEAD','OPTIONS'].includes(req.method);
  let clave = req.signedCookies.lonja_csrf;
  if (seguro && !clave) {
    clave = randomBytes(32).toString('hex');
    res.cookie('lonja_csrf', clave, {...cookieOptions, signed: true});
  }
  res.locals.csrfToken = clave || '';
  if (!seguro) {
    let token = req.get('CSRF-Token') || req.body?._csrf;
    if (Buffer.isBuffer(req.body)) {
      try {
        const form = await new Request('http://localhost/especies', {method:'POST',headers:{'Content-Type':req.get('content-type')},body:req.body}).formData();
        token = form.get('_csrf');
      } catch {
        throw Object.assign(new Error('No se pudo leer el formulario de fotografía.'),{status:400});
      }
    }
    if (!clave || !iguales(token,clave)) throw Object.assign(new Error('El formulario caducó. Vuelve a abrirlo e intenta de nuevo.'),{status:403});
  }
  next();
}
