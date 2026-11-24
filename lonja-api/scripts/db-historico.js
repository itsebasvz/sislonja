import { db } from '../models/index.js';
import { cargarHistorico } from './datos-historicos.js';
try { console.log(`Histórico ficticio listo: ${await cargarHistorico()} ventas nuevas distribuidas en los últimos 42 días. No se modificaron ventas existentes.`); }
catch (err) { console.error(err.message); process.exitCode = 1; }
finally { await db.close(); }
