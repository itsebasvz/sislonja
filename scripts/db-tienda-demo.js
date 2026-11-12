import { db, Usuario, Comprador, Especie, Lote, Pedido } from '../models/index.js';
import { confirmarPedido, cambiarEstado } from '../helpers/tienda.js';
import { caracteristicasLote } from '../helpers/catalogo-base.js';
import { buscarCodigoPostal } from '../helpers/direcciones.js';
import { guardarDireccion } from '../helpers/libreta.js';
import { Direccion } from '../models/index.js';
try{
 const [c]=await Comprador.findOrCreate({where:{correo:'cliente@lonja.local'},defaults:{nombre:'Cliente',apellido_paterno:'Demostración',apellido_materno:'',telefono:'2291234567',direccion:''}});
 const [u]=await Usuario.findOrCreate({where:{email:'cliente@lonja.local'},defaults:{nombre:'Cliente',apellido:'Demostración',password:'Cliente2026!',rol:'cliente',confirmar:true,comprador_id:c.codigo_cpr}});
 const admin=await Usuario.findOne({where:{rol:'admin'}});const especies=await Especie.findAll({order:[['id_epe','ASC']]});if(!especies.length||!admin)throw Error('Ejecuta db:init y carga el catálogo primero.');
 // One store lot per species, so every catalog product is on sale with its details filled.
 let nuevos=0;for(let i=0;i<Math.max(6,especies.length);i++){const e=especies[i%especies.length];const [,created]=await Lote.findOrCreate({where:{id_epe:e.id_epe,kilos:(7.1+i*2.125).toFixed(3),numero_cajas:2+i%3,precio_kilo_salida:(95+(i%8)*17).toFixed(2)},defaults:caracteristicasLote(e.nombre,i+1)});if(created)nuevos++;}
 for(const e of especies)if(!e.descripcion)await e.update({descripcion:`${e.nombre} en lote completo. Revisa el peso total, el número de cajas y el precio por kilo para elegir la presentación que necesita tu cocina.`});
 for(let i=1;i<=2;i++){
  const clave=`00000000-0000-4000-8000-00000000000${i}`;if(await Pedido.findOne({where:{clave}}))continue;
  const e=especies[i%especies.length];const l=await Lote.create({...caracteristicasLote(e.nombre,i+2),id_epe:e.id_epe,kilos:i===1?'3.123':'4.321',numero_cajas:1,precio_kilo_salida:'120.00'});
  const p=await confirmarPedido(u,{clave,lotes:[{id:l.id_lte,precio:'120.00'}],entrega:'recogida',metodo:'paypal',resultado:'aprobado',telefono:'2291234567',aceptar:true});
  await cambiarEstado(p.id,i===1?'preparado':'cancelado',admin,'Pedido ficticio para demostrar cancelación y devolución');
 }
 // Two fictitious saved addresses so checkout shows the address book preselected.
 if(!await Direccion.count({where:{codigo_cpr:c.codigo_cpr}}))for(const [cp,calle,numero,etiqueta] of [['91700','Av. Independencia','1250','Casa'],['94290','Blvd. Manuel Ávila Camacho','3200, local 4','Restaurante']]){const sitio=buscarCodigoPostal(cp)?.ubicaciones[0];if(sitio)await guardarDireccion(c.codigo_cpr,{cp,calle,numero,estado:sitio.estadoId,municipio:sitio.municipioId,colonia:sitio.colonias[0]},{etiqueta});}
 console.log(`${nuevos} lotes de catálogo añadidos. Pedidos de demostración listos. Cuenta: cliente@lonja.local / Cliente2026!`);
}finally{await db.close();}
