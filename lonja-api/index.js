import { createApp } from './app.js';
import { iniciarSockets } from './helpers/socket.js';
import db from './config/db.js';
const port = Number(process.env.PORT || 2900);
try {
  await db.authenticate();
  const app = createApp();
  const server = app.listen(port, '127.0.0.1', () => console.log(`Lonja API lista en http://localhost:${port}`));
  const io = iniciarSockets(server);
  const shutdown = () => io.close(async () => { await db.close(); process.exit(0); });
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
} catch (err) { console.error('No se pudo iniciar. Revisa .env y ejecuta npm run db:init.', err.message); process.exit(1); }
