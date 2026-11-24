import { db, Comprador, Direccion } from '../models/index.js';
import { validarDireccion } from './direcciones.js';
import { error } from './ventas.js';
export const MAX_DIRECCIONES = 10;
export const formatoDireccion = d => `${d.calle} ${d.numero}, ${d.colonia}, C.P. ${d.cp}, ${d.municipio}, ${d.estado}`;
export const listarDirecciones = codigo_cpr => Direccion.findAll({ where: { codigo_cpr }, order: [['predeterminada', 'DESC'], ['id', 'DESC']] });
export function limpiarEtiqueta(valor) {
  const etiqueta = typeof valor === 'string' ? valor.trim() : '';
  if (etiqueta.length > 40) throw error('El nombre del domicilio debe tener hasta 40 caracteres.');
  return etiqueta || 'Mi domicilio';
}
// The buyer's legacy single address column mirrors the default entry so staff screens keep working.
async function reflejarPredeterminada(codigo_cpr, transaction) {
  const d = await Direccion.findOne({ where: { codigo_cpr, predeterminada: true }, transaction });
  await Comprador.update({ direccion: d ? formatoDireccion(d).slice(0, 200) : '' }, { where: { codigo_cpr }, transaction });
}
export async function guardarDireccion(codigo_cpr, input, { etiqueta, predeterminada = false, omitirSiLleno = false } = {}, transaction) {
  const run = async transaction => {
    const datos = validarDireccion(input);
    const nombre = limpiarEtiqueta(etiqueta);
    await Comprador.findByPk(codigo_cpr, { transaction, lock: transaction.LOCK.UPDATE });
    const total = await Direccion.count({ where: { codigo_cpr }, transaction });
    if (total >= MAX_DIRECCIONES && omitirSiLleno) return null;
    if (total >= MAX_DIRECCIONES) throw error(`Tu libreta ya tiene ${MAX_DIRECCIONES} domicilios. Elimina uno para agregar otro.`);
    const principal = predeterminada || total === 0;
    if (principal) await Direccion.update({ predeterminada: false }, { where: { codigo_cpr }, transaction });
    const d = await Direccion.create({ codigo_cpr, etiqueta: nombre, calle: datos.calle, numero: datos.numero, cp: datos.cp, colonia: datos.colonia, estado_id: datos.estadoId, estado: datos.estado, municipio_id: datos.municipioId, municipio: datos.municipio, predeterminada: principal }, { transaction });
    if (principal) await reflejarPredeterminada(codigo_cpr, transaction);
    return d;
  };
  return transaction ? run(transaction) : db.transaction(run);
}
export function predeterminarDireccion(codigo_cpr, id) {
  return db.transaction(async transaction => {
    const d = await Direccion.findOne({ where: { id, codigo_cpr }, transaction, lock: transaction.LOCK.UPDATE });
    if (!d) throw error('No encontramos ese domicilio.', 404);
    await Direccion.update({ predeterminada: false }, { where: { codigo_cpr }, transaction });
    await d.update({ predeterminada: true }, { transaction });
    await reflejarPredeterminada(codigo_cpr, transaction);
  });
}
export function eliminarDireccion(codigo_cpr, id) {
  return db.transaction(async transaction => {
    const d = await Direccion.findOne({ where: { id, codigo_cpr }, transaction, lock: transaction.LOCK.UPDATE });
    if (!d) throw error('No encontramos ese domicilio.', 404);
    await d.destroy({ transaction });
    if (d.predeterminada) {
      const siguiente = await Direccion.findOne({ where: { codigo_cpr }, order: [['id', 'DESC']], transaction });
      if (siguiente) await siguiente.update({ predeterminada: true }, { transaction });
      await reflejarPredeterminada(codigo_cpr, transaction);
    }
  });
}
// Saved entries are revalidated against the postal catalog before each order.
export async function direccionDePedido(codigo_cpr, id, transaction) {
  const d = await Direccion.findOne({ where: { id, codigo_cpr }, transaction });
  if (!d) throw error('Ese domicilio ya no está en tu libreta. Elige otro.');
  return validarDireccion({ calle: d.calle, numero: d.numero, cp: d.cp, colonia: d.colonia, estado: d.estado_id, municipio: d.municipio_id });
}
