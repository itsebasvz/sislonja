import {estadosMexico} from '../helpers/direcciones.js';
import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { Usuario, Comprador, Lote, Pedido, Apartado, db } from '../models/index.js';
import { inventario, producto, confirmarPedido, cambiarEstado } from '../helpers/tienda.js';
import { avisarInventario, avisarPedido } from '../helpers/socket.js';
import { correoConfirmacion } from '../helpers/correo.js';
import jwt from 'jsonwebtoken';
import { apartarLote, consultarApartado, incluirApartado, liberarApartado } from '../helpers/apartados.js';
import { esUuid } from '../helpers/validar.js';
import { error } from '../helpers/ventas.js';
import { folio } from '../helpers/formato.js';

import { listarDirecciones, guardarDireccion, predeterminarDireccion, eliminarDireccion, formatoDireccion, limpiarEtiqueta, MAX_DIRECCIONES } from '../helpers/libreta.js';
import { validarDireccion } from '../helpers/direcciones.js';
export async function detalle(req,res){
 const lote=await Lote.findByPk(req.params.id,{include:[{association:'especie',include:['tipo']},'compra',incluirApartado]});
 if(!lote)throw error('No encontramos ese lote.',404);
 const p=producto(lote);
 const propio = p.estado==='apartado' && req.usuario?.rol==='cliente' &&
   await Apartado.count({where:{lote_id:lote.id_lte,usuario_id:req.usuario.id,vence:{[Op.gt]:new Date()}}});
 res.json({title:lote.especie.nombre,p:{...p,apartadoPropio:Boolean(propio)}});
}
export async function stock(req,res){res.json({productos:await inventario()});}

export async function iniciarApartado(req,res){
 const {apartado,nuevo}=await apartarLote(req.params.id,req.usuario);
 if(nuevo)avisarInventario();
 res.status(nuevo?201:200).json({id:apartado.id,vence:apartado.vence});
}
export async function cancelarApartado(req,res){
 if(await liberarApartado(req.params.apartadoId,req.usuario))avisarInventario();
 res.status(204).end();
}
export async function finalizar(req,res){
 const previo=await Pedido.findOne({where:{clave:req.params.apartadoId,usuario_id:req.usuario.id},attributes:['id']});
 if(previo)return res.json({pedidoId:previo.id});
 const apartado=await consultarApartado(req.params.apartadoId,req.usuario);
 const lote=await Lote.findByPk(apartado.lote_id,{include:[{association:'especie',include:['tipo']}]});
 if(!lote)throw error('No encontramos ese lote.',404);
 const c=await Comprador.findByPk(req.usuario.comprador_id);
 const direcciones=(await listarDirecciones(req.usuario.comprador_id)).map(d=>({id:d.id,etiqueta:d.etiqueta,predeterminada:d.predeterminada,texto:formatoDireccion(d)}));
 res.json({title:'Finalizar compra',apartado:{id:apartado.id,vence:apartado.vence},ahora:Date.now(),producto:producto(lote),estados:estadosMexico(),direcciones,telefono:c?.telefono||'',titular:`${req.usuario.nombre} ${req.usuario.apellido}`.trim(),recogida:process.env.DIRECCION_RECOGIDA||'Muelle de demostración, Veracruz (dirección ficticia)'});
}
const camposDireccion=['cp','estado','municipio','colonia','calle','numero','etiqueta'];

export async function registrar(req,res){
 const v={};const errors=[];for(const k of ['nombre','apellido_paterno','apellido_materno','email','telefono',...camposDireccion])v[k]=typeof req.body[k]==='string'?req.body[k].trim():'';
 v.agregar_direccion=req.body.agregar_direccion==='si';
 if((v.apellido_paterno+' '+v.apellido_materno).trim().length>80)errors.push('Los apellidos combinados deben tener hasta 80 caracteres.');
 if(!v.nombre||!v.apellido_paterno||[v.nombre,v.apellido_paterno,v.apellido_materno].some(x=>x.length>80))errors.push('Indica nombre y apellidos (máximo 80 caracteres por campo).');
 v.email=v.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)||v.email.length>80)errors.push('Ingresa un correo válido.');
 if(!/^[+\d ()-]{10,20}$/.test(v.telefono)||v.telefono.replace(/\D/g,'').length<10||v.telefono.replace(/\D/g,'').length>15)errors.push('Ingresa un teléfono de 10 a 15 dígitos.');
 const pw=req.body.password;if(typeof pw!=='string'||pw.length<8||Buffer.byteLength(pw)>72||pw!==req.body.password2)errors.push('Las contraseñas deben coincidir y tener entre 8 caracteres y 72 bytes.');
 if(v.agregar_direccion){try{validarDireccion(v);limpiarEtiqueta(v.etiqueta);}catch(e){if(!e.status)throw e;errors.push(e.message);}}
 if(req.body.aceptar!=='si')errors.push('Acepta las condiciones de compra de demostración.');
 const fallo=errors=>res.status(422).json({error:errors[0],errors,values:v});
 if(errors.length)return fallo(errors);
 let u;
 try{u=await db.transaction(async transaction=>{
 if(await Usuario.findOne({where:{email:v.email},transaction}))throw error('Ese correo ya tiene cuenta. Inicia sesión.');
 let comprador=await Comprador.findOne({where:{correo:v.email},transaction,lock:transaction.LOCK.UPDATE});
 // Existing commercial identity is linked only; its details stay untouched until email confirmation.
 const nuevo=!comprador;
 if(nuevo)comprador=await Comprador.create({nombre:v.nombre,apellido_paterno:v.apellido_paterno,apellido_materno:v.apellido_materno,correo:v.email,telefono:v.telefono,direccion:''},{transaction});
 if(v.agregar_direccion&&nuevo)await guardarDireccion(comprador.codigo_cpr,v,{etiqueta:v.etiqueta,predeterminada:true},transaction);
 return Usuario.create({nombre:v.nombre,apellido:[v.apellido_paterno,v.apellido_materno].filter(Boolean).join(' '),email:v.email,password:pw,rol:'cliente',confirmar:false,token:randomBytes(32).toString('hex'),comprador_id:comprador.codigo_cpr},{transaction});
 });}catch(e){if(e.status===422||e.name==='SequelizeUniqueConstraintError')return fallo([e.status?e.message:'Ese correo ya tiene una cuenta.']);throw e;}
 const pendiente = jwt.sign({id:u.id},process.env.SC_JWT,{algorithm:'HS256',audience:'lonja-correo',expiresIn:'24h'});
 const correo=await enviarConfirmacion(u);
 res.status(201).json({...correo,pendiente});
}
async function enviarConfirmacion(usuario){
 try{return {preview:await correoConfirmacion(usuario,usuario.token),enviado:true};}
 catch{return {preview:null,enviado:false};}
}
export async function reenviarCliente(req,res){
 let id;
 try{id=jwt.verify(req.body.pendiente,process.env.SC_JWT,{algorithms:['HS256'],audience:'lonja-correo'}).id;}
 catch{throw error('Regístrate para solicitar tu correo de confirmación.');}
 const usuario=await Usuario.unscoped().findOne({where:{id,rol:'cliente',confirmar:false}});
 if(!usuario)throw error('La cuenta ya está confirmada o no está disponible.');
 res.json(await enviarConfirmacion(usuario));
}
export async function comprar(req,res){
 const id=req.params.apartadoId;
 const previo=await Pedido.findOne({where:{clave:id,usuario_id:req.usuario.id},attributes:['id']});
 if(previo)return res.json({id:previo.id});
 let apartado;
 try {
   apartado=await consultarApartado(id,req.usuario);
 } catch(err) {
   const confirmado=err.status===410 && await Pedido.findOne({where:{clave:id,usuario_id:req.usuario.id},attributes:['id']});
   if(confirmado)return res.json({id:confirmado.id});
   throw err;
 }
 const venta=await confirmarPedido(req.usuario,{...req.body,clave:id,lotes:[{id:apartado.lote_id,precio:req.body?.precio}]},id);
 avisarInventario();
 avisarPedido(venta);
 res.status(201).json({id:venta.id});
}
export async function pedidos(req,res){const staff=req.usuario.rol!=='cliente';const rows=await Pedido.findAll({where:staff?{}:{usuario_id:req.usuario.id},include:['comprador'],order:[['id','DESC']]});res.json({title:staff?'Pedidos':'Mis pedidos',rows});}
export async function verPedido(req,res){const staff=req.usuario.rol!=='cliente';const p=await Pedido.findOne({where:{id:req.params.id,...(staff?{}:{usuario_id:req.usuario.id})},include:[{association:'compras',include:[{association:'lote',include:['especie']}]},'comprador']});if(!p)throw error('Pedido no encontrado.',404);res.json({title:`Pedido ${folio(p)}`,p,confirmado:!staff&&req.query.confirmado==='1'});}
export async function estado(req,res){const p=await cambiarEstado(req.params.id,req.body.estado,req.usuario,req.body.motivo);avisarInventario();avisarPedido(p);res.json({id:p.id,estado:p.estado});}

export async function compraConfirmada(req,res){if(!req.usuario||req.usuario.rol!=='cliente')return res.status(401).json({url:null});const clave=typeof req.query.clave==='string'?req.query.clave:'';const p=esUuid(clave)?await Pedido.findOne({where:{clave,usuario_id:req.usuario.id}}):null;res.json({id:p?.id ?? null});}

export async function direcciones(req,res,{status=200,errors=[],values={}}={}){
 const rows=(await listarDirecciones(req.usuario.comprador_id)).map(d=>({id:d.id,etiqueta:d.etiqueta,predeterminada:d.predeterminada,texto:formatoDireccion(d)}));
 res.status(status).json({title:'Mis direcciones',rows,max:MAX_DIRECCIONES,estados:estadosMexico(),errors,values,aviso:{guardada:'Domicilio guardado.',predeterminada:'Domicilio predeterminado actualizado.',eliminada:'Domicilio eliminado.'}[req.query.aviso]||''});
}
export async function agregarDireccion(req,res){
 const v={};for(const k of camposDireccion)v[k]=typeof req.body[k]==='string'?req.body[k].trim():'';v.predeterminada=req.body.predeterminada==='si';
 try{await guardarDireccion(req.usuario.comprador_id,v,{etiqueta:v.etiqueta,predeterminada:v.predeterminada});}catch(e){if(e.status!==422)throw e;return direcciones(req,res,{status:422,errors:[e.message],values:v});}
 res.status(201).json({aviso:'guardada'});
}
export async function marcarDireccion(req,res){await predeterminarDireccion(req.usuario.comprador_id,Number(req.params.id)||0);res.json({aviso:'predeterminada'});}
export async function quitarDireccion(req,res){await eliminarDireccion(req.usuario.comprador_id,Number(req.params.id)||0);res.status(204).end();}
