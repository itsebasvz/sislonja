import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverPeriodo, diaAnterior } from '../helpers/periodos.js';
import { hoy } from '../helpers/formato.js';
test('el rango incluye completo el día final en horario de Ciudad de México', () => {
  const p=resolverPeriodo({desde:'2001-01-01',hasta:'2001-01-03'});
  assert.equal(p.start.toISOString(),'2001-01-01T06:00:00.000Z');assert.equal(p.end.toISOString(),'2001-01-04T06:00:00.000Z');assert.equal(p.unDia,false);
});
test('acepta un solo día, conserva fecha del reporte anterior y valida errores', () => {
  assert.equal(resolverPeriodo().esHoy,true);
  assert.equal(resolverPeriodo({desde:'2001-01-01'}).hasta,'2001-01-01');
  assert.equal(resolverPeriodo({fecha:'2001-01-01'}).desde,'2001-01-01');
  assert.equal(diaAnterior('2001-01-01'),'2000-12-31');
  for(const query of [{desde:'2001-01-03',hasta:'2001-01-01'},{desde:'2001-02-30'},{hasta:'2999-01-01'},{desde:['2001-01-01']},{desde:''}]) assert.throws(()=>resolverPeriodo(query));
  const p=resolverPeriodo({desde:hoy(),hasta:hoy()});assert.equal(p.esHoy,true);
});
