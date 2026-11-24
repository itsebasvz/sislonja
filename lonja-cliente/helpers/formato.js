export const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
export const kilos = (n) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 }).format(Number(n || 0));
export const fecha = (v) => new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v));
export const hora = (v) => new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }).format(new Date(v));
export const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function intervalo(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw Object.assign(new Error('Selecciona una fecha válida.'), { status: 422 });
  const start = new Date(`${dia}T00:00:00-06:00`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== dia) throw Object.assign(new Error('La fecha no existe.'), { status: 422 });
  return { start, end: new Date(start.getTime() + 86400000) };
}
export const nombreComprador = (p) => [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ');
export function totalVenta(kilos, precio) {
  const scaled = (v, places) => {
    const s = String(v);
    if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(s)) throw Object.assign(new Error('Cantidad o precio inválido.'), { status: 422 });
    const [a,b = ''] = s.split('.');
    return BigInt(a) * 10n ** BigInt(places) + BigInt(b.padEnd(places, '0'));
  };
  const kg = scaled(kilos, 3), cents = scaled(precio, 2);
  if (kg <= 0n || cents <= 0n || kg > 9999999999n || cents > 9999999999n) throw Object.assign(new Error('Cantidad o precio fuera de rango.'), { status: 422 });
  const total = (kg * cents + 500n) / 1000n;
  if (total < 1n || total > 99999999999999n) throw Object.assign(new Error('El total está fuera de rango.'), { status: 422 });
  return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`;
}
// Human-friendly tracking code derived from the order date (Mexico City) and id, e.g. LV-261112-00021.
export function folio(p) {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date(p.fecha)).replace(/-/g, '');
  return `LV-${dia}-${String(p.id).padStart(5, '0')}`;
}
