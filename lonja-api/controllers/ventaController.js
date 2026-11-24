import {estadoLote, incluirApartado} from '../helpers/apartados.js';
import { Compra, Lote } from '../models/index.js';
import { detalleVenta, ventasPeriodo, resumen, cobrosPeriodo } from '../helpers/ventas.js';
import { nombreComprador } from '../helpers/formato.js';
export async function listado(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  let rows = res.locals.periodo.aplicado ? await ventasPeriodo(res.locals.periodo) : await Compra.findAll({ where: {estado:'activa'}, include: detalleVenta, order: [['fecha', 'DESC'], ['id_cmp', 'DESC']] });
  if (q) rows = rows.filter(c => `${c.id_cmp} ${nombreComprador(c.comprador)} ${c.lote.especie.nombre}`.toLowerCase().includes(q.toLowerCase()));
  res.json( { title: 'Ventas', subtitle: 'Cada operación, clara y en un solo lugar.', rows, q });
}
export async function reporte(req, res) {
  const periodo = res.locals.periodo;
  const rows = await ventasPeriodo(periodo);
  res.json( { title: periodo.unDia ? 'Reporte diario' : 'Reporte acumulado', rows, dia: periodo.desde, resumen: resumen(rows), cobros:await cobrosPeriodo(periodo,resumen(rows).importe) });
}
export async function inicio(req, res) {
  const periodo = res.locals.periodo;
  const rows = await ventasPeriodo(periodo);
  const todos = await Lote.findAll({ include: ['especie', 'compra', incluirApartado], order: [['id_lte', 'DESC']] });
  const disponiblesAhora = todos.filter(l => estadoLote(l)==='disponible');
  const disponibles = periodo.esHoy ? disponiblesAhora.length : todos.filter(l => new Date(l.fecha) < periodo.end && (!l.compra || new Date(l.compra.fecha) >= periodo.end)).length;
  const compradores = new Set(rows.map(c => c.codigo_cpr)).size;
  res.json( { title: 'Vista general', resumen: resumen(rows), disponibles, compradores, recientes: rows.slice(0, 5), lotes: disponiblesAhora.slice(0, 3) });
}
