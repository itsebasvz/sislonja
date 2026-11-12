import {validarDireccion} from './direcciones.js';
import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { db, Lote, Compra, Pedido, Comprador } from '../models/index.js';
import { totalVenta } from './formato.js';
import { error } from './ventas.js';
import { direccionDePedido, guardarDireccion, limpiarEtiqueta } from './libreta.js';
export const centavos = v => { const [a,b='']=String(v).split('.'); return BigInt(a)*100n+BigInt(b.padEnd(2,'0')); };
export const decimal = v => `${v/100n}.${String(v%100n).padStart(2,'0')}`;
export function producto(l) { return { id:l.id_lte, presentacion:l.presentacion, conservacion:l.conservacion, calibre:l.calibre, procedencia:l.procedencia, nombre:l.especie.nombre, tipo:l.especie.tipo.nombre, tipoId:l.especie.id_tpo, imagen:l.especie.imagen, descripcion:l.especie.descripcion, kilos:String(l.kilos), cajas:l.numero_cajas, precio:String(l.precio_kilo_salida), total:totalVenta(l.kilos,l.precio_kilo_salida), fecha:l.fecha, disponible:!l.compra }; }
export async function inventario() { return (await Lote.findAll({include:[{association:'especie',include:['tipo']},'compra'],order:[['id_lte','DESC']]})).filter(l=>!l.compra).map(producto); }
export async function confirmarPedido(user, input) {
 if(user.rol!=='cliente' || !user.comprador_id) throw error('Inicia sesión con una cuenta de cliente.',403);
 if(!/^[a-f0-9-]{36}$/.test(input.clave||'')) throw error('Vuelve a abrir la revisión del pedido.');
 const ids=Array.isArray(input.lotes)?input.lotes.map(x=>Number(x.id)):[];
 if(!ids.length || ids.length>30 || new Set(ids).size!==ids.length || ids.some(x=>!Number.isSafeInteger(x)||x<1)) throw error('Revisa los lotes del carrito.');
 const old=await Pedido.findOne({where:{clave:input.clave}});
 if(old) {if(String(old.usuario_id)!==String(user.id)) throw error('Clave de pedido no válida.',409); return old;}
 if(input.aceptar!==true)throw error('Confirma que revisaste los datos del pedido.');
 if(typeof input.telefono!=='string'||!/^[+\d ()-]{10,20}$/.test(input.telefono)||input.telefono.replace(/\D/g,'').length<10)throw error('Indica un teléfono de contacto válido.');
 if(!['recogida','envio'].includes(input.entrega)) throw error('Selecciona una modalidad de entrega.');
 if(!['tarjeta','paypal'].includes(input.metodo)) throw error('Selecciona una forma de pago.');
 if(input.metodo!=='paypal' && input.resultado!=='aprobado') throw error(input.resultado==='rechazado'?'El pago de prueba fue rechazado. Prueba otra forma de pago.':'El pago fue cancelado. Tu carrito sigue disponible.');
 if(input.metodo==='tarjeta' && (!['Visa','Mastercard'].includes(input.marca)||!/^\d{4}$/.test(input.ultimos||''))) throw error('Completa la tarjeta de prueba.');
 const guardada=input.entrega==='envio'&&input.direccion_id!=null&&input.direccion_id!=='nueva';
 if(guardada&&!/^\d{1,9}$/.test(String(input.direccion_id)))throw error('Selecciona un domicilio de tu libreta.');
 const guardar=input.entrega==='envio'&&!guardada&&input.guardar_direccion===true;
 let direccion=input.entrega==='envio'&&!guardada?validarDireccion(input.direccion):{};
 if(guardar)limpiarEtiqueta(input.etiqueta);
 try {return await db.transaction(async transaction=>{
  const cliente=await Comprador.findByPk(user.comprador_id,{transaction});
  if(guardada)direccion=await direccionDePedido(user.comprador_id,Number(input.direccion_id),transaction);
  const lotes=await Lote.findAll({where:{id_lte:{[Op.in]:ids}},include:['especie'],order:[['id_lte','ASC']],transaction,lock:transaction.LOCK.UPDATE});
  const vendidos=await Compra.findAll({where:{lote_vigente_id:{[Op.in]:ids}},transaction});
  const conflictos=ids.filter(id=>!lotes.some(l=>l.id_lte===id)||vendidos.some(c=>c.lote_vigente_id===id));
  if(conflictos.length)throw Object.assign(error('Uno o más lotes ya no están disponibles. Revisa tu carrito.',409),{conflictos});
  if(lotes.some(l=>String(input.lotes.find(i=>Number(i.id)===l.id_lte)?.precio)!==String(l.precio_kilo_salida)))throw error('El precio cambió. Revisa el nuevo total antes de confirmar.',409);
  let suma=0n;for(const l of lotes)suma+=centavos(totalVenta(l.kilos,l.precio_kilo_salida));
  if(suma+(input.entrega==='envio'?15000n:0n)>99999999999999n)throw error('El importe del pedido supera el límite permitido.');
  const envio=input.entrega==='envio'?15000n:0n;
  const pedido=await Pedido.create({clave:input.clave,usuario_id:user.id,codigo_cpr:cliente.codigo_cpr,subtotal:decimal(suma),envio:decimal(envio),total:decimal(suma+envio),entrega:input.entrega,datos_entrega:{nombre:`${user.nombre} ${user.apellido}`.trim(),correo:user.email,telefono:input.telefono,...direccion,recogida:process.env.DIRECCION_RECOGIDA||'Muelle de demostración, Veracruz (dirección ficticia)',horario:'Siguiente día, de 8:00 a 14:00 h'},metodo:input.metodo,referencia:'DEMO-'+randomUUID(),marca:input.metodo==='tarjeta'?input.marca:null,ultimos:input.metodo==='tarjeta'?input.ultimos:null},{transaction});
  if(guardar)await guardarDireccion(user.comprador_id,input.direccion,{etiqueta:input.etiqueta,omitirSiLleno:true},transaction);
  for(const l of lotes)await Compra.create({pedido_id:pedido.id,id_lte:l.id_lte,lote_vigente_id:l.id_lte,codigo_cpr:cliente.codigo_cpr,usuario_id:null,precio_kilo_final:l.precio_kilo_salida,precio_total:totalVenta(l.kilos,l.precio_kilo_salida),detalle:{nombre:l.especie.nombre,imagen:l.especie.imagen,kilos:String(l.kilos),cajas:l.numero_cajas,presentacion:l.presentacion,conservacion:l.conservacion,calibre:l.calibre,procedencia:l.procedencia}},{transaction});
  return pedido.reload({transaction});
 });}catch(e){if(e.name==='SequelizeUniqueConstraintError'){const p=await Pedido.findOne({where:{clave:input.clave,usuario_id:user.id}});if(p)return p;throw error('Un lote acaba de venderse. Revisa el carrito.',409);}throw e;}
}
export async function cambiarEstado(id,estado,user,motivo) {
 return db.transaction(async transaction=>{
 const p=await Pedido.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});if(!p)throw error('Pedido no encontrado.',404);
 if(p.estado===estado)return p;
 if(estado==='cancelado') {
  if(user.rol!=='admin')throw error('Solo el administrador puede cancelar.',403);
  if(!['pendiente','preparado'].includes(p.estado))throw error('Este pedido ya no se puede cancelar.',409);
  if(typeof motivo!=='string'||motivo.trim().length<5||motivo.length>300)throw error('Indica un motivo de 5 a 300 caracteres.');
  const compras=await Compra.findAll({where:{pedido_id:p.id},transaction});
  await Lote.findAll({where:{id_lte:{[Op.in]:compras.map(c=>c.id_lte)}},order:[['id_lte','ASC']],transaction,lock:transaction.LOCK.UPDATE});
  await Compra.update({estado:'cancelada',lote_vigente_id:null},{where:{pedido_id:p.id},transaction});p.motivo=motivo.trim();
 } else if(!((p.estado==='pendiente'&&estado==='preparado')||(p.estado==='preparado'&&estado==='entregado')))throw error('El cambio de estado no es válido.',409);
 await p.update({estado,motivo:p.motivo},{transaction});return p;
 });
}
