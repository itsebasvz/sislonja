import test from 'node:test';
import assert from 'node:assert/strict';
import { totalVenta, intervalo } from '../helpers/formato.js';
import { resumen } from '../helpers/ventas.js';
test('cálculo decimal exacto y redondeo al centavo', () => {
  assert.equal(totalVenta('42.500', '150.00'), '6375.00');
  assert.equal(totalVenta('0.125', '10.20'), '1.28');
  assert.equal(totalVenta('36.200', '125.00'), '4525.00');
});
test('rechaza precios o pesos inválidos y valores fuera del límite', () => {
  for (const [kg,price] of [['0','10'],['1','0'],['1','-1'],['1','1.999'],['1e3','1'],['1','texto'],['9999999.999','99999999.99'],['0.001','0.01']]) assert.throws(() => totalVenta(kg,price));
});
test('reporte delimita el día comercial y rechaza fechas inexistentes', () => {
  const {start,end} = intervalo('2026-11-11');
  assert.equal(start.toISOString(), '2026-11-11T06:00:00.000Z');
  assert.equal(end.toISOString(), '2026-11-12T06:00:00.000Z');
  assert.throws(() => intervalo('2026-02-30'));
  assert.throws(() => intervalo('ayer'));
});
test('resumen suma importes decimales y contempla un día vacío', () => {
  assert.equal(resumen([{precio_total: 6375,lote:{kilos:42.5}}]).importe, 6375);
  assert.deepEqual(resumen([]), {operaciones:0,kilos:0,importe:0});
  assert.deepEqual(resumen([{precio_total:'0.10',lote:{kilos:'0.125'}},{precio_total:'0.20',lote:{kilos:'1.005'}}]), {operaciones:2,kilos:1.13,importe:0.3});
});
