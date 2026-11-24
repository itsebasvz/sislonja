import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { Apartado, Compra, Lote, db } from '../models/index.js';
import { error } from './ventas.js';

export const DURACION_APARTADO = 10 * 60 * 1000;
export const estaVigente = (apartado, ahora = Date.now()) =>
  apartado && new Date(apartado.vence).getTime() > ahora;
export const estadoLote = lote =>
  lote.compra ? 'vendido' : estaVigente(lote.apartado) ? 'apartado' : 'disponible';
export const incluirApartado = { association: 'apartado', attributes: ['vence'] };

export async function bloquearLote(id, transaction) {
  const lote = await Lote.findByPk(id, {transaction, lock: transaction.LOCK.UPDATE});
  if (!lote) throw error('No encontramos ese lote.', 404);
  return lote;
}

async function apartadoDelLote(id, transaction) {
  return Apartado.findOne({where: {lote_id: id}, transaction, lock: transaction.LOCK.UPDATE});
}
export async function consultarApartado(id, usuario, transaction) {
  const apartado = await Apartado.findOne({
    where: {id, usuario_id: usuario.id}, transaction,
    ...(transaction ? {lock: transaction.LOCK.UPDATE} : {}),
  });
  if (!apartado || !estaVigente(apartado)) throw error('El apartado ya no está disponible. Vuelve al lote para intentarlo de nuevo.', 410);
  return apartado;
}

export async function apartarLote(id, usuario) {
  return db.transaction(async transaction => {
    await bloquearLote(id, transaction);
    const venta = await Compra.findOne({where: {lote_vigente_id: id}, transaction});
    if (venta) throw error('Este lote ya se vendió.', 409);
    const anterior = await apartadoDelLote(id, transaction);
    if (estaVigente(anterior)) {
      if (Number(anterior.usuario_id) !== Number(usuario.id)) throw error('Otro comprador tiene apartado este lote.', 409);
      return {apartado: anterior, nuevo: false};
    }
    if (anterior) await anterior.destroy({transaction});
    const apartado = await Apartado.create({
      id: randomUUID(), lote_id: id, usuario_id: usuario.id,
      vence: new Date(Date.now() + DURACION_APARTADO),
    }, {transaction});
    return {apartado, nuevo: true};
  });
}

export async function liberarApartado(id, usuario) {
  return db.transaction(async transaction => {
    const apartado = await Apartado.findOne({where: {id, usuario_id: usuario.id}, transaction});
    if (!apartado) return false;
    await bloquearLote(apartado.lote_id, transaction);
    return Boolean(await Apartado.destroy({where: {id, usuario_id: usuario.id}, transaction}));
  });
}

export async function verificarEditable(id, transaction) {
  if (await Compra.findOne({where: {lote_vigente_id: id}, transaction})) throw error('El lote vendido está protegido.', 409);
  if (estaVigente(await apartadoDelLote(id, transaction))) throw error('No se puede modificar un lote con apartado vigente.', 409);
}

export async function retirarVencidos() {
  return Apartado.destroy({where: {vence: {[Op.lte]: new Date()}}});
}
