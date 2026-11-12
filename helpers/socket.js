import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
let io;
export function iniciarSockets(server) {
 io=new Server(server,{maxHttpBufferSize:16384,allowRequest:(req,cb)=>cb(null,!req.headers.origin||req.headers.origin===`${req.socket.encrypted?'https':'http'}://${req.headers.host}`)});
 io.on('connection',async socket=>{
  try {const match=(socket.request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('_token='));if(!match)return;
   const d=jwt.verify(decodeURIComponent(match.slice(7)),process.env.SC_JWT,{algorithms:['HS256']});const u=await Usuario.findByPk(d.id);
   if(u?.confirmar){socket.join(`usuario:${u.id}`);if(['admin','operador'].includes(u.rol))socket.join('personal');const ms=d.exp*1000-Date.now();const timer=setTimeout(()=>socket.disconnect(true),Math.max(0,ms));timer.unref();socket.on('disconnect',()=>clearTimeout(timer));}
  }catch{}
 });return io;
}
export function avisarInventario(){io?.emit('inventario:cambio');}
export function avisarPedido(p){io?.to('personal').to(`usuario:${p.usuario_id}`).emit('pedido:cambio',{id:p.id,estado:p.estado});}
