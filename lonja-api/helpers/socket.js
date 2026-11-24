import { Server } from 'socket.io';
import { autenticar } from '../middleware/auth.js';
import { retirarVencidos } from './apartados.js';
let io;

export function iniciarSockets(server) {
  const origen = process.env.CLIENTE_ORIGEN || 'http://localhost:3000';
  io = new Server(server, {
    cors: {origin: origen},
    maxHttpBufferSize: 16384,
    allowRequest: (req, done) => done(null, !req.headers.origin || req.headers.origin === origen),
  });
  io.on('connection', async socket => {
    if (!socket.handshake.auth?.ticket) return;
    try {
      const sesion = await autenticar(socket.handshake.auth.ticket, 'lonja-socket');
      if (!sesion || !socket.connected) return;
      const {usuario, claims} = sesion;
      socket.join('usuario:' + usuario.id);
      if (usuario.rol !== 'cliente') socket.join('personal');
      const timer = setTimeout(() => socket.disconnect(true), Math.max(0, claims.exp * 1000 - Date.now()));
      timer.unref();
      socket.once('disconnect', () => clearTimeout(timer));
    } catch (err) {
      console.error('No se pudo autorizar el socket:', err.name);
    }
  });
  const timer = setInterval(async () => {
    try {
      if (await retirarVencidos()) avisarInventario();
    } catch (err) {
      console.error('No se pudieron retirar apartados vencidos:', err.name);
    }
  }, 1000);
  timer.unref();
  server.once('close', () => clearInterval(timer));
  return io;
}
export function avisarInventario() { io?.emit('inventario:cambio'); }
export function avisarPedido(pedido) {
  io?.to('personal').to('usuario:' + pedido.usuario_id).emit('pedido:cambio', {id: pedido.id, estado: pedido.estado});
}
