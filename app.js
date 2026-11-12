import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import csrf from 'csurf';
import router from './routes/index.js';
import { currentUser } from './middleware/auth.js';
import { recibirFotografia } from './middleware/fotografia.js';
import { resolverPeriodo } from './helpers/periodos.js';
import * as formato from './helpers/formato.js';
export const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp() {
  if (!process.env.SC_JWT || process.env.SC_JWT.length < 32) throw new Error('Configura SC_JWT con al menos 32 caracteres.');
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs'); app.set('views', path.join(root, 'views'));
  app.use(express.static(path.join(root, 'public')));
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(cookieParser(process.env.SC_JWT));
  app.use(methodOverride('_method', { methods: ['POST'] }));
  app.use(currentUser);
  app.use(recibirFotografia);
  app.use(csrf({ cookie: { key: '_csrf', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const avisos = { guardado: 'Los cambios se guardaron correctamente.', eliminado: 'El registro se eliminó correctamente.', 'venta-eliminada': 'La venta se eliminó. El lote está disponible de nuevo.', 'correo-pendiente': 'La cuenta quedó guardada, pero no se pudo enviar el correo. Configura SMTP y usa «Reenviar confirmación».', 'correo-enviado': 'Enviamos el correo de confirmación.', confirmado: 'La cuenta ya está confirmada.' };
    res.locals.periodo = resolverPeriodo(['/admin','/ventas','/reportes'].includes(req.path) && req.method === 'GET' ? req.query : {});
    Object.assign(res.locals, formato, { csrfToken: req.csrfToken(), currentPath: req.path, aviso: avisos[req.query.aviso] || '', correoPreview: req.usuario?.rol === 'admin' && /^https:\/\/ethereal\.email\/message\//.test(req.signedCookies.correo_preview || '') ? req.signedCookies.correo_preview : null, title: 'Sistema Lonja' });
    next();
  });
  app.use(router);
  app.use((req, res) => res.status(404).render('mensaje', { title: 'Página no encontrada', texto: 'La página que buscas no está disponible.', enlace: req.usuario && req.usuario.rol !== 'cliente' ? '/admin' : '/', etiqueta: 'Volver al inicio' }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    let status = err.status || 500;
    let texto = status < 500 ? err.message : 'No pudimos completar la operación. Intenta de nuevo.';
    if (err.type === 'entity.too.large') { status = 413; texto = 'La fotografía supera el límite de 5 MB. Selecciona una imagen más pequeña y vuelve al formulario.'; }
    if (err.code === 'EBADCSRFTOKEN') { status = 403; texto = 'El formulario ha caducado. Vuelve a abrir la página e intenta de nuevo.'; }
    if (err.name === 'SequelizeForeignKeyConstraintError') { status = 409; texto = 'Este registro está relacionado con otras operaciones y no se puede eliminar o modificar.'; }
    if (err.name === 'SequelizeValidationError') { status = 422; texto = 'Revisa los datos ingresados. Hay un valor fuera del rango permitido.'; }
    if (status >= 500) console.error('Error interno:', err.name, err.message);
    res.locals.periodo ??= resolverPeriodo();
    res.locals.user ??= null; res.locals.currentPath ??= req.path; res.locals.aviso ??= ''; res.locals.csrfToken ??= ''; Object.assign(res.locals, formato);
    res.status(status).render('mensaje', { title: status === 404 ? 'Registro no encontrado' : 'No se pudo completar', texto, enlace: req.usuario && req.usuario.rol !== 'cliente' ? '/admin' : '/', etiqueta: 'Volver al inicio' });
  });
  return app;
}
