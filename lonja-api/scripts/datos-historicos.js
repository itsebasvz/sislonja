import { db, Usuario, Especie, Comprador, Lote, Compra } from '../models/index.js';
import { hoy, totalVenta, intervalo } from '../helpers/formato.js';
import { diaAnterior } from '../helpers/periodos.js';
import { caracteristicasLote } from '../helpers/catalogo-base.js';
export async function cargarHistorico() {
  const usuario = await Usuario.findOne({ where: { rol: 'admin' } });
  const especies = await Especie.findAll({ order: [['id_epe','ASC']], limit: 5 });
  if (!usuario || !especies.length) throw new Error('Ejecuta db:init y carga primero los catálogos de demostración.');
  let creadas = 0;
  await db.transaction(async transaction => {
    const clientes = [];
    for (const [index,nombre,apellido,direccion] of [[1,'Demo Mercado','Hidalgo','Mercado Hidalgo, Veracruz · Cliente ficticio'],[2,'Demo Mariscos','El Muelle','Boca del Río · Cliente ficticio'],[3,'Demo Cocina','La Costa','Veracruz · Cliente ficticio']]) {
      clientes.push((await Comprador.findOrCreate({ where: { correo: `historico.demo.${index}@example.com` }, defaults: { nombre, apellido_paterno: apellido, apellido_materno: '', direccion }, transaction }))[0]);
    }
    let existentes=await Compra.count({where:{codigo_cpr:clientes.map(c=>c.codigo_cpr),pedido_id:null},transaction});
    if (existentes >= 7) return;
    for (const offset of [1,2,3,7,14,28,42]) {
      if(existentes >= 7) break;
      const dia = diaAnterior(hoy(),offset);
      const dayNumber = Math.floor(intervalo(dia).start.getTime()/86400000);
      for (let turno = 0; turno < 1; turno++) {
        const fecha = new Date(`${dia}T${turno ? '15:15' : '08:30'}:00-06:00`);
        const cliente = clientes[(dayNumber+turno)%clientes.length];
        if (await Compra.findOne({ where: { codigo_cpr: cliente.codigo_cpr, fecha }, transaction })) continue;
        const especie = especies[(dayNumber+turno)%especies.length];
        const kilos = (18 + (dayNumber%13)*2.5 + turno*7.25).toFixed(3);
        const precio = (90 + (dayNumber%9)*12.5 + turno*8).toFixed(2);
        const lote = await Lote.create({ id_epe: especie.id_epe, kilos, numero_cajas: Math.ceil(Number(kilos)/10), precio_kilo_salida: precio, ...caracteristicasLote(especie.nombre, offset), fecha: new Date(fecha.getTime()-2*60*60*1000) }, { transaction });
        await Compra.create({ id_lte: lote.id_lte, codigo_cpr: cliente.codigo_cpr, usuario_id: usuario.id, precio_kilo_final: precio, precio_total: totalVenta(kilos,precio), fecha }, { transaction });
        creadas++; existentes++;
      }
    }
  });
  return creadas;
}
