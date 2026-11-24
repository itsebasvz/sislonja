import { Op } from 'sequelize';
import { db, Compra, Lote, Comprador, Pedido } from '../models/index.js';
import { totalVenta } from './formato.js';
import { resolverPeriodo } from './periodos.js';
export const detalleVenta = [ { association: 'lote', include: [{ association: 'especie', include: ['tipo'] }] }, 'comprador', 'usuario' ];
export const error = (texto, status = 422) => Object.assign(new Error(texto), { status });
export async function registrarVenta({ id_lte, codigo_cpr, precio_kilo_final }, usuario_id) {
  if (!/^\d+$/.test(String(id_lte)) || !/^\d+$/.test(String(codigo_cpr))) throw error('Selecciona un lote y un comprador válidos.');
  return db.transaction(async transaction => {
    const lote = await Lote.findByPk(id_lte, { transaction, lock: transaction.LOCK.UPDATE });
    if (!lote) throw error('El lote seleccionado ya no existe.');
    if (await Compra.findOne({ where: { id_lte }, transaction })) throw error('Este lote ya se vendió. Selecciona otro lote.', 409);
    if (!await Comprador.findByPk(codigo_cpr, { transaction })) throw error('El comprador seleccionado ya no existe.');
    const precio_total = totalVenta(lote.kilos, precio_kilo_final);
    return Compra.create({ id_lte, codigo_cpr, precio_kilo_final, precio_total, usuario_id }, { transaction });
  });
}
export async function ventasPeriodo(periodo) {
  return Compra.findAll({ where: { estado:'activa', fecha: { [Op.gte]: periodo.start, [Op.lt]: periodo.end } }, include: detalleVenta, order: [['fecha', 'DESC'], ['id_cmp', 'DESC']] });
}
export async function ventasDia(dia) { return ventasPeriodo(resolverPeriodo({ fecha: dia })); }
export function resumen(rows) {
  let centavos = 0n, gramos = 0n;
  for (const c of rows) {
    const [pesos, decimales = ''] = String(c.precio_total).split('.');
    centavos += BigInt(pesos) * 100n + BigInt(decimales.padEnd(2, '0'));
    const [a,b = ''] = String(c.lote.kilos).split('.');
    gramos += BigInt(a) * 1000n + BigInt(b.padEnd(3, '0'));
  }
  return { operaciones: rows.length, kilos: Number(gramos) / 1000, importe: Number(centavos) / 100 };
}

export async function cobrosPeriodo(periodo, productos) { const rows=await Pedido.findAll({where:{estado:{[Op.ne]:'cancelado'},fecha:{[Op.gte]:periodo.start,[Op.lt]:periodo.end}}}); const envio=rows.reduce((s,p)=>s+Math.round(Number(p.envio)*100),0)/100;return {productos,envio,total:productos+envio}; }
