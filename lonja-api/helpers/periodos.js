import { hoy, intervalo, fecha } from './formato.js';
export function diaAnterior(dia, dias = 1) {
  return new Date(intervalo(dia).start.getTime() - dias * 86400000).toISOString().slice(0,10);
}
export function resolverPeriodo(query = {}) {
  const actual = hoy();
  const aplicado = ['desde','hasta','fecha'].some(key => Object.hasOwn(query,key));
  for (const key of ['desde','hasta','fecha']) if (Object.hasOwn(query,key) && (typeof query[key] !== 'string' || !query[key])) throw Object.assign(new Error('Selecciona fechas válidas para el período.'), { status: 422 });
  const desde = query.desde || query.fecha || query.hasta || actual;
  const hasta = query.hasta || query.fecha || query.desde || actual;
  const start = intervalo(desde).start, end = intervalo(hasta).end;
  if (desde > hasta) throw Object.assign(new Error('La fecha inicial no puede ser posterior a la fecha final.'), { status: 422 });
  if (hasta > actual) throw Object.assign(new Error('El histórico solo admite fechas hasta hoy.'), { status: 422 });
  const unDia = desde === hasta;
  const etiqueta = unDia ? fecha(start) : `${fecha(start)} — ${fecha(intervalo(hasta).start)}`;
  const qs = '?'+new URLSearchParams({desde,hasta});
  return { desde, hasta, start, end, unDia, esHoy: unDia && desde === actual, aplicado, etiqueta, query: qs, actual,
    atajos: [{nombre:'Hoy',desde:actual,hasta:actual},{nombre:'Ayer',desde:diaAnterior(actual),hasta:diaAnterior(actual)},
      {nombre:'Últimos 7 días',desde:diaAnterior(actual,6),hasta:actual},{nombre:'Últimos 30 días',desde:diaAnterior(actual,29),hasta:actual}],
  };
}
