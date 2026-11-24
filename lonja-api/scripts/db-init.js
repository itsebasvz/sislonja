import { Usuario, db } from '../models/index.js';
try {
  await db.authenticate();
  await db.sync();
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE = 'Administración' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8 || Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72) throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD (8 a 72 bytes) en .env.');
  if (!await Usuario.unscoped().findOne({ where: { email: ADMIN_EMAIL.toLowerCase() } })) {
    await Usuario.create({ nombre: ADMIN_NOMBRE, apellido: 'Lonja de Veracruz', email: ADMIN_EMAIL.toLowerCase(), password: ADMIN_PASSWORD, rol: 'admin', confirmar: true });
  }
  console.log('Estructura y administrador listos. No se borraron datos.');
} catch (err) { console.error(err.message); process.exitCode = 1; }
finally { await db.close(); }
