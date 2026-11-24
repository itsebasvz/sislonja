import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
import { error } from '../helpers/ventas.js';

export const firmarToken = (usuario, audience = 'lonja-api', expiresIn = '2h') =>
  jwt.sign({id: usuario.id}, process.env.SC_JWT, {algorithm: 'HS256', audience, expiresIn});

export async function autenticar(token, audience = 'lonja-api') {
  if (!token) return null;
  let claims;
  try {
    claims = jwt.verify(token, process.env.SC_JWT, {algorithms: ['HS256'], audience});
  } catch {
    return null;
  }
  const usuario = await Usuario.findByPk(claims.id);
  return usuario?.confirmar ? {usuario, claims} : null;
}

export async function proteger(req, res, next) {
  const token = /^Bearer ([^ ]+)$/i.exec(req.get('authorization') || '')?.[1];
  const sesion = await autenticar(token);
  if (!sesion) throw error('Sesión inválida o vencida.', 401);
  req.usuario = sesion.usuario;
  req.sesion = sesion.claims;
  next();
}

function exigir(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) throw error('No tienes acceso a esta operación.', 403);
    next();
  };
}
export const admin = exigir('admin');
export const soloPersonal = exigir('admin', 'operador');
export const soloCliente = exigir('cliente');
