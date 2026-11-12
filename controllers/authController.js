import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Usuario } from '../models/index.js';
import { cookieOptions } from '../middleware/auth.js';
import { correoConfirmacion } from '../helpers/correo.js';
// Two separate portals share one credential check: /login for clients, /admin for staff.
const titulos = { personal: 'Acceso del personal', cliente: 'Inicia sesión', registro: 'Crea tu cuenta' };
export const destinoSeguro = v => typeof v === 'string' && /^\/(?![/\\])[\w\-/?=&.]*$/.test(v) && v.length <= 200 ? v : '';
export function renderAcceso(res, modo, { status = 200, errors = [], values = {}, siguiente = '', estados = [] } = {}) {
  return res.status(status).render('login', { title: titulos[modo], modo, errors, values, siguiente, estados });
}
export const loginForm = modo => (req, res) => {
  if (req.usuario) return res.redirect(req.usuario.rol === 'cliente' ? '/' : '/admin');
  renderAcceso(res, modo, { siguiente: destinoSeguro(req.query.siguiente) });
};
export async function login(req, res) {
  const modo = req.path === '/login' ? 'cliente' : 'personal';
  const siguiente = destinoSeguro(req.body.siguiente);
  await body('email').trim().isEmail().withMessage('Ingresa un correo válido.').run(req);
  await body('password').isString().notEmpty().withMessage('Ingresa tu contraseña.').run(req);
  const usuario = validationResult(req).isEmpty() ? await Usuario.unscoped().findOne({ where: { email: String(req.body.email).toLowerCase() } }) : null;
  const ok = usuario && await bcrypt.compare(req.body.password, usuario.password);
  const esCliente = usuario?.rol === 'cliente';
  let mensaje = null;
  if (!ok) mensaje = 'Revisa tu correo y contraseña.';
  else if (modo === 'cliente' && !esCliente) mensaje = 'Esta entrada es para clientes. El personal accede desde /admin.';
  else if (modo === 'personal' && esCliente) mensaje = 'Esta entrada es solo para el personal. Inicia sesión desde la tienda.';
  else if (!usuario.confirmar) mensaje = 'Confirma tu correo antes de iniciar sesión.';
  if (mensaje) return renderAcceso(res, modo, { status: 401, errors: [mensaje], values: { email: req.body.email || '' }, siguiente });
  const token = jwt.sign({ id: usuario.id }, process.env.SC_JWT, { expiresIn: '2h', algorithm: 'HS256' });
  res.cookie('_token', token, { ...cookieOptions, maxAge: 2 * 60 * 60 * 1000 }).redirect(esCliente ? (siguiente || '/') : '/admin');
}
export function logout(req, res) { const destino = req.usuario?.rol === 'cliente' ? '/' : '/admin'; res.clearCookie('correo_preview', cookieOptions); res.clearCookie('_token', cookieOptions).redirect(destino); }
export async function confirmar(req, res) {
  const token = String(req.params.token);
  const usuario = /^[a-f0-9]{64}$/.test(token) ? await Usuario.unscoped().findOne({ where: { token, confirmar: false } }) : null;
  if (!usuario) return res.status(400).render('mensaje', { title: 'Enlace no disponible', texto: 'El enlace de confirmación no es válido o ya fue utilizado. Solicita uno nuevo al administrador.', enlace: '/login', etiqueta: 'Ir al acceso' });
  await usuario.update({ confirmar: true, token: null });
  res.render('mensaje', { title: 'Tu cuenta está lista', texto: 'Confirmamos tu correo. Ya puedes acceder a Sistema Lonja con tus credenciales.', enlace: usuario.rol === 'cliente' ? '/login' : '/admin', etiqueta: 'Iniciar sesión' });
}
export const personalFields = [
  { name: 'nombre', label: 'Nombre', max: 80 }, { name: 'apellido', label: 'Apellidos', max: 80 },
  { name: 'email', label: 'Correo electrónico', type: 'email', max: 80 },
  { name: 'password', label: 'Contraseña', type: 'password', minLength: 8, help: 'Mínimo 8 caracteres. Al editar, deja vacío para conservarla.' },
];
export async function personal(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  let rows = await Usuario.findAll({ where: { rol: ['admin','operador'] }, order: [['id', 'DESC']] });
  if (q) rows = rows.filter(u => `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  res.render('listado', { title: 'Personal', subtitle: 'Un equipo conectado, una operación más sencilla.', section: 'personal', rows, q, estado: '', editable: true, cfg: { pk: 'id', singular: 'integrante', columns: ['Integrante', 'Correo electrónico', 'Rol', 'Estado'] } });
}
export async function personalForm(req, res, values, errors = []) {
  const item = values || (req.params.id ? await Usuario.findByPk(req.params.id) : {});
  if (!item || (item.rol && item.rol === 'cliente')) throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
  return res.status(errors.length ? 422 : 200).render('formulario', { title: req.params.id ? 'Editar integrante' : 'Nuevo integrante', section: 'personal', cfg: { singular: 'integrante', fields: personalFields }, item, errors, options: {}, editing: !!req.params.id });
}
export async function guardarPersonal(req, res) {
  for (const field of personalFields) {
    if (field.name === 'password') {
      const rule = body('password');
      if (req.params.id && req.body.password === '') continue;
      await rule.isString().isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres.').custom(v => Buffer.byteLength(v, 'utf8') <= 72).withMessage('La contraseña es demasiado larga.').run(req);
    } else {
      let rule = body(field.name).trim().notEmpty().isLength({ max: field.max });
      if (field.type === 'email') rule = rule.isEmail();
      await rule.withMessage(`Revisa el campo ${field.label.toLowerCase()}.`).run(req);
    }
  }
  const values = { nombre: req.body.nombre, apellido: req.body.apellido, email: typeof req.body.email === 'string' ? req.body.email.toLowerCase() : '' };
  const errors = validationResult(req).array().map(e => e.msg);
  if (errors.length) return personalForm(req, res, { ...values, id: req.params.id }, errors);
  let usuario;
  try {
    if (req.params.id) {
      usuario = await Usuario.unscoped().findByPk(req.params.id);
      if (!usuario || usuario.rol === 'cliente') throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
      if (usuario.email !== values.email) {
        if (usuario.id === req.usuario.id) return personalForm(req, res, { ...values, id: req.params.id }, ['No cambies el correo de tu propia cuenta administradora.']);
        values.confirmar = false; values.token = randomBytes(32).toString('hex');
      }
      if (req.body.password) values.password = req.body.password;
      await usuario.update(values);
    } else usuario = await Usuario.create({ ...values, password: req.body.password, rol: 'operador', confirmar: false, token: randomBytes(32).toString('hex') });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return personalForm(req, res, { ...values, id: req.params.id }, ['Ese correo ya está registrado.']);
    throw err;
  }
  if (!usuario.confirmar) {
    try { const preview = await correoConfirmacion(usuario, usuario.token); if (preview) res.cookie('correo_preview', preview, { ...cookieOptions, signed: true, maxAge: 600000 }); }
    catch { return res.redirect('/personal?aviso=correo-pendiente'); }
  }
  res.redirect('/personal?aviso=guardado');
}
export async function reenviar(req, res) {
  const u = await Usuario.unscoped().findByPk(req.params.id);
  if (!u || u.rol === 'cliente') throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
  if (u.confirmar) return res.redirect('/personal?aviso=confirmado');
  if (!u.token) await u.update({ token: randomBytes(32).toString('hex') });
  try { const preview = await correoConfirmacion(u, u.token); if (preview) res.cookie('correo_preview', preview, { ...cookieOptions, signed: true, maxAge: 600000 }); res.redirect('/personal?aviso=correo-enviado'); }
  catch { res.redirect('/personal?aviso=correo-pendiente'); }
}
export async function eliminarPersonal(req, res) {
  const u = await Usuario.findByPk(req.params.id);
  if (!u || u.rol === 'cliente') throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
  if (u.rol === 'admin' || u.id === req.usuario.id) throw Object.assign(new Error('La cuenta administradora no se puede eliminar.'), { status: 409 });
  await u.destroy(); res.redirect('/personal?aviso=eliminado');
}
