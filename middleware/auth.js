import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
export const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
export async function currentUser(req, res, next) {
  res.locals.user = null;
  if (req.cookies._token) {
    try {
      const decoded = jwt.verify(req.cookies._token, process.env.SC_JWT, { algorithms: ['HS256'] });
      const user = await Usuario.findByPk(decoded.id);
      if (user?.confirmar) { req.usuario = user; res.locals.user = user; }
      else res.clearCookie('_token', cookieOptions);
    } catch (err) {
      if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) return next(err);
      res.clearCookie('_token', cookieOptions);
    }
  }
  next();
}
export function proteger(req, res, next) {
  if (!req.usuario) return res.redirect(req.path.startsWith('/mis-') ? '/login?siguiente=' + encodeURIComponent(req.originalUrl) : '/admin');
  next();
}
export function admin(req, res, next) {
  if (req.usuario?.rol !== 'admin') return res.status(403).render('mensaje', { title: 'Acceso restringido', texto: 'Esta sección está disponible para el administrador.', enlace: '/admin', etiqueta: 'Volver al inicio' });
  next();
}

export function soloPersonal(req,res,next){if(!['admin','operador'].includes(req.usuario?.rol))return res.status(403).render('mensaje',{title:'Acceso restringido',texto:'Esta sección es para el personal de Lonja.',enlace:'/',etiqueta:'Volver a la tienda'});next();}
export function soloCliente(req,res,next){if(req.usuario?.rol!=='cliente')return res.redirect('/admin');next();}
