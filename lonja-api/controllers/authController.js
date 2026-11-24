import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {esCorreo, texto} from '../helpers/validar.js';
import { Usuario } from '../models/index.js';
import { firmarToken } from '../middleware/auth.js';
import { correoConfirmacion } from '../helpers/correo.js';
export async function login(req, res) {
  const {email, password, modo} = req.body || {};
  const usuario = esCorreo(texto(email)) && typeof password === 'string' && Buffer.byteLength(password) <= 72
    ? await Usuario.unscoped().findOne({where: {email: texto(email).toLowerCase()}})
    : null;
  const ok = usuario && await bcrypt.compare(req.body.password, usuario.password);
  const esCliente = usuario?.rol === 'cliente';
  let mensaje = null;
  if (!ok) mensaje = 'Revisa tu correo y contraseña.';
  else if (modo === 'cliente' && !esCliente) mensaje = 'Esta entrada es para clientes. El personal accede desde /admin.';
  else if (modo === 'personal' && esCliente) mensaje = 'Esta entrada es solo para el personal. Inicia sesión desde la tienda.';
  else if (!usuario.confirmar) mensaje = 'Confirma tu correo antes de iniciar sesión.';
  if (mensaje) return res.status(401).json({error: mensaje});
  res.json({token: firmarToken(usuario), usuario: {id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: usuario.rol}});
}
export async function confirmar(req, res) {
  const token = String(req.params.token);
  const usuario = /^[a-f0-9]{64}$/.test(token) ? await Usuario.unscoped().findOne({ where: { token, confirmar: false } }) : null;
  if (!usuario) return res.status(400).json( { error:'El enlace de confirmación no es válido o ya se utilizó.', title: 'Enlace no disponible', texto: 'El enlace de confirmación no es válido o ya fue utilizado. Solicita uno nuevo al administrador.', enlace: '/login', etiqueta: 'Ir al acceso' });
  await usuario.update({ confirmar: true, token: null });
  res.json( { title: 'Tu cuenta está lista', texto: 'Confirmamos tu correo. Ya puedes acceder a Sistema Lonja con tus credenciales.', enlace: usuario.rol === 'cliente' ? '/login' : '/admin', etiqueta: 'Iniciar sesión' });
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
  res.json( { title: 'Personal', subtitle: 'Un equipo conectado, una operación más sencilla.', section: 'personal', rows, q, estado: '', editable: true, cfg: { pk: 'id', singular: 'integrante', columns: ['Integrante', 'Correo electrónico', 'Rol', 'Estado'] } });
}
export async function personalForm(req, res, values, errors = []) {
  const item = values || (req.params.id ? await Usuario.findByPk(req.params.id) : {});
  if (!item || (item.rol && item.rol === 'cliente')) throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
  return res.status(errors.length ? 422 : 200).json( { title: req.params.id ? 'Editar integrante' : 'Nuevo integrante', section: 'personal', cfg: { singular: 'integrante', fields: personalFields }, item, errors, options: {}, editing: !!req.params.id });
}
export async function guardarPersonal(req, res) {
  const data = req.body || {};
  const values = {nombre: texto(data.nombre), apellido: texto(data.apellido), email: texto(data.email).toLowerCase()};
  const errors = [];
  for (const field of personalFields.filter(field => field.name !== 'password')) {
    if (!values[field.name] || values[field.name].length > field.max || (field.type === 'email' && !esCorreo(values.email))) {
      errors.push(`Revisa el campo ${field.label.toLowerCase()}.`);
    }
  }
  if (!(req.params.id && !data.password) &&
      (typeof data.password !== 'string' || data.password.length < 8 || Buffer.byteLength(data.password) > 72)) {
    errors.push('La contraseña debe tener al menos 8 caracteres y máximo 72 bytes.');
  }
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
    try { const preview = await correoConfirmacion(usuario, usuario.token); if (preview) return res.json({aviso:'correo-enviado', preview}); }
    catch { return res.json({aviso:'correo-pendiente'}); }
  }
  res.status(req.params.id ? 200 : 201).json({aviso:'guardado'});
}
export async function reenviar(req, res) {
  const u = await Usuario.unscoped().findByPk(req.params.id);
  if (!u || u.rol === 'cliente') throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
  if (u.confirmar) return res.json({aviso:'confirmado'});
  if (!u.token) await u.update({ token: randomBytes(32).toString('hex') });
  try { const preview = await correoConfirmacion(u, u.token); if (preview) return res.json({aviso:'correo-enviado', preview}); res.json({aviso:'correo-enviado'}); }
  catch { res.json({aviso:'correo-pendiente'}); }
}
export async function eliminarPersonal(req, res) {
  const u = await Usuario.findByPk(req.params.id);
  if (!u || u.rol === 'cliente') throw Object.assign(new Error('No encontramos a esta persona.'), { status: 404 });
  if (u.rol === 'admin' || u.id === req.usuario.id) throw Object.assign(new Error('La cuenta administradora no se puede eliminar.'), { status: 409 });
  await u.destroy(); res.status(204).end();
}
