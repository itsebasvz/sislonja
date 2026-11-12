import {estadosMexico} from '../helpers/direcciones.js';
import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { Usuario, Comprador, Lote, Pedido, db } from '../models/index.js';
import { inventario, producto, confirmarPedido, cambiarEstado } from '../helpers/tienda.js';
import { avisarInventario, avisarPedido } from '../helpers/socket.js';
import { correoConfirmacion } from '../helpers/correo.js';
import { cookieOptions } from '../middleware/auth.js';
import { error } from '../helpers/ventas.js';
import { folio } from '../helpers/formato.js';
import { renderAcceso } from './authController.js';
import { listarDirecciones, guardarDireccion, predeterminarDireccion, eliminarDireccion, formatoDireccion, limpiarEtiqueta, MAX_DIRECCIONES } from '../helpers/libreta.js';
import { validarDireccion } from '../helpers/direcciones.js';
export async function portada(req,res){res.render('tienda/catalogo',{title:'Del mar a tu mesa',productos:await inventario()});}
export async function detalle(req,res){const l=await Lote.findByPk(req.params.id,{include:[{association:'especie',include:['tipo']},'compra']});if(!l)throw error('No encontramos ese lote.',404);res.render('tienda/detalle',{title:l.especie.nombre,p:producto(l)});}
export async function stock(req,res){res.json({productos:await inventario()});}
export function carrito(req,res){res.render('tienda/carrito',{title:'Tu carrito'});}
export async function finalizar(req,res){
 if(!req.usuario)return res.redirect('/login?siguiente=/finalizar');if(req.usuario.rol!=='cliente')return res.redirect('/admin');
 const c=await Comprador.findByPk(req.usuario.comprador_id);const direcciones=(await listarDirecciones(req.usuario.comprador_id)).map(d=>({id:d.id,etiqueta:d.etiqueta,predeterminada:d.predeterminada,texto:formatoDireccion(d)}));
 res.render('tienda/checkout',{title:'Finalizar compra',estados:estadosMexico(),direcciones,telefono:c?.telefono||'',titular:`${req.usuario.nombre} ${req.usuario.apellido}`.trim(),recogida:process.env.DIRECCION_RECOGIDA||'Muelle de demostración, Veracruz (dirección ficticia)'});
}
const camposDireccion=['cp','estado','municipio','colonia','calle','numero','etiqueta'];
export function registro(req,res){if(req.usuario)return res.redirect(req.usuario.rol==='cliente'?'/':'/admin');renderAcceso(res,'registro',{estados:estadosMexico()});}
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
 const fallo=errs=>renderAcceso(res,'registro',{status:422,errors:errs,values:v,estados:estadosMexico()});
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
 res.cookie('cliente_pendiente',String(u.id),{...cookieOptions,signed:true,maxAge:86400000});
 let preview=null,enviado=false;try{preview=await correoConfirmacion(u,u.token);enviado=true;}catch{}
 res.render('tienda/confirmacion',{title:'Confirma tu correo',preview,enviado});
}
export async function reenviarCliente(req,res){const id=req.signedCookies.cliente_pendiente;const u=id?await Usuario.unscoped().findOne({where:{id,rol:'cliente',confirmar:false}}):null;if(!u)throw error('Regístrate para solicitar tu correo de confirmación.');let preview=null,enviado=false;try{preview=await correoConfirmacion(u,u.token);enviado=true;}catch{}res.render('tienda/confirmacion',{title:'Confirma tu correo',preview,enviado});}
export async function comprar(req,res){try{if(!req.usuario)return res.status(401).json({error:'Inicia sesión para comprar.'});const p=await confirmarPedido(req.usuario,req.body);avisarInventario();avisarPedido(p);res.json({url:`/mis-pedidos/${p.id}`,id:p.id});}catch(e){res.status(e.status||500).json({error:e.status?e.message:'No pudimos confirmar tu pedido. Puedes volver a intentar.',conflictos:e.conflictos||[]});}}
export async function pedidos(req,res){const staff=req.usuario.rol!=='cliente';const rows=await Pedido.findAll({where:staff?{}:{usuario_id:req.usuario.id},include:['comprador'],order:[['id','DESC']]});res.render(staff?'pedidos':'tienda/pedidos',{title:staff?'Pedidos':'Mis pedidos',rows});}
export async function verPedido(req,res){const staff=req.usuario.rol!=='cliente';const p=await Pedido.findOne({where:{id:req.params.id,...(staff?{}:{usuario_id:req.usuario.id})},include:[{association:'compras',include:[{association:'lote',include:['especie']}]},'comprador']});if(!p)throw error('Pedido no encontrado.',404);res.render(staff?'pedido':'tienda/pedido',{title:`Pedido ${folio(p)}`,p,confirmado:!staff&&req.query.confirmado==='1'});}
export async function estado(req,res){const p=await cambiarEstado(req.params.id,req.body.estado,req.usuario,req.body.motivo);avisarInventario();avisarPedido(p);res.redirect(`/pedidos/${p.id}`);}

export async function compraConfirmada(req,res){if(!req.usuario||req.usuario.rol!=='cliente')return res.status(401).json({url:null});const clave=typeof req.query.clave==='string'?req.query.clave:'';const p=/^[a-f0-9-]{36}$/.test(clave)?await Pedido.findOne({where:{clave,usuario_id:req.usuario.id}}):null;res.json({url:p?`/mis-pedidos/${p.id}`:null});}

export async function direcciones(req,res,{status=200,errors=[],values={}}={}){
 const rows=(await listarDirecciones(req.usuario.comprador_id)).map(d=>({id:d.id,etiqueta:d.etiqueta,predeterminada:d.predeterminada,texto:formatoDireccion(d)}));
 res.status(status).render('tienda/direcciones',{title:'Mis direcciones',rows,max:MAX_DIRECCIONES,estados:estadosMexico(),errors,values,aviso:{guardada:'Domicilio guardado.',predeterminada:'Domicilio predeterminado actualizado.',eliminada:'Domicilio eliminado.'}[req.query.aviso]||''});
}
export async function agregarDireccion(req,res){
 const v={};for(const k of camposDireccion)v[k]=typeof req.body[k]==='string'?req.body[k].trim():'';v.predeterminada=req.body.predeterminada==='si';
 try{await guardarDireccion(req.usuario.comprador_id,v,{etiqueta:v.etiqueta,predeterminada:v.predeterminada});}catch(e){if(e.status!==422)throw e;return direcciones(req,res,{status:422,errors:[e.message],values:v});}
 res.redirect('/mis-direcciones?aviso=guardada');
}
export async function marcarDireccion(req,res){await predeterminarDireccion(req.usuario.comprador_id,Number(req.params.id)||0);res.redirect('/mis-direcciones?aviso=predeterminada');}
export async function quitarDireccion(req,res){await eliminarDireccion(req.usuario.comprador_id,Number(req.params.id)||0);res.redirect('/mis-direcciones?aviso=eliminada');}
