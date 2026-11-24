import { Op } from 'sequelize';
import { Pedido } from '../models/index.js';
import { hoy, intervalo, folio } from './formato.js';
import { diaAnterior, resolverPeriodo } from './periodos.js';
import { centavos, decimal } from './tienda.js';
import { error } from './ventas.js';

export function periodoCompras(query = {}) {
  const tipo = query.periodo ?? 'semana';
  const referencia = query.fecha ?? hoy();
  if (!['dia', 'semana', 'mes'].includes(tipo) || typeof referencia !== 'string' || referencia > hoy()) {
    throw error('Selecciona un período y una fecha válidos.');
  }
  const {start} = intervalo(referencia);
  let desde = referencia, hasta = referencia;
  if (tipo === 'semana') {
    const lunes = (start.getUTCDay() + 6) % 7;
    desde = diaAnterior(referencia, lunes);
    hasta = diaAnterior(desde, -6);
  }
  if (tipo === 'mes') {
    desde = referencia.slice(0, 7) + '-01';
    hasta = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  }
  return {...resolverPeriodo({desde, hasta: hasta > hoy() ? hoy() : hasta}), tipo, referencia};
}

export async function reporteCompras(usuario, query) {
  const periodo = periodoCompras(query);
  const rows = await Pedido.findAll({
    where: {usuario_id: usuario.id, fecha: {[Op.gte]: periodo.start, [Op.lt]: periodo.end}},
    attributes: ['id', 'fecha', 'estado', 'entrega', 'subtotal', 'envio', 'total'],
    include: [{association: 'compras', attributes: ['id_lte', 'detalle'], include: [{association: 'lote', attributes: ['kilos'], include: [{association:'especie', attributes: ['nombre']}]}]}],
    order: [['fecha', 'DESC'], ['id', 'DESC']],
  });
  let gasto = 0n, subtotal = 0n, envio = 0n, lotes = 0, gramos = 0;
  const pedidos = rows.map(row => {
    const p = row.toJSON();
    p.kilos = p.compras.reduce((acc, c) => acc + Math.round(Number(c.detalle?.kilos || c.lote.kilos) * 1000), 0) / 1000;
    p.lotes = p.compras.map(c => `#${c.id_lte} ${c.detalle?.nombre || c.lote.especie.nombre}`);
    delete p.compras;
    if (p.estado !== 'cancelado') {
      lotes += p.lotes.length;
      gramos += Math.round(p.kilos * 1000);
      gasto += centavos(p.total);
      subtotal += centavos(p.subtotal);
      envio += centavos(p.envio);
    }
    return p;
  });
  return {periodo, pedidos, resumen: {lotes, kilos: gramos / 1000, subtotal: decimal(subtotal), envio: decimal(envio), total: decimal(gasto)}};
}

const celda = v => {
  let text = String(v ?? '');
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export function csvCompras(reporte) {
  const filas = [
    ['Folio','Fecha','Estado','Lotes','Kilos','Subtotal MXN','Envío MXN','Total MXN'],
    ...reporte.pedidos.map(p => [folio(p), new Date(p.fecha).toLocaleString('sv-SE', {timeZone:'America/Mexico_City'}), p.estado, p.lotes.join(' | '), p.kilos,
      ...(p.estado === 'cancelado' ? ['0.00','0.00','0.00'] : [p.subtotal,p.envio,p.total])]),
  ];
  return '\ufeff' + filas.map(f => f.map(celda).join(',')).join('\r\n') + '\r\n';
}
