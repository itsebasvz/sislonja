import { db, Usuario, Tipo, Especie, Comprador, Lote, Compra } from '../models/index.js';
import { cargarHistorico } from './datos-historicos.js';
import { registrarVenta } from '../helpers/ventas.js';
import { caracteristicasLote } from '../helpers/catalogo-base.js';
try {
  if (await Lote.count() || await Comprador.count() || await Compra.count()) throw new Error('La demostración solo se carga sobre datos comerciales vacíos. No se modificó nada.');
  const admin = await Usuario.findOne({ where: { rol: 'admin' } });
  if (!admin) throw new Error('Ejecuta primero npm run db:init.');
  const tipos = [];
  for (const nombre of ['Pescado', 'Crustáceos', 'Moluscos']) tipos.push((await Tipo.findOrCreate({ where: { nombre } }))[0]);
  const especies = [];
  for (const [nombre, tipo, imagen] of [['Huachinango', 0, 'huachinango'], ['Robalo', 0, 'robalo'], ['Camarón blanco', 1, 'camaron'], ['Langostino', 1, 'mariscos'], ['Sierra', 0, 'sierra']]) especies.push((await Especie.findOrCreate({ where: { nombre }, defaults: { id_tpo: tipos[tipo].id_tpo, imagen: `/img/especies/${imagen}.jpg` } }))[0]);
  const compradores = [];
  for (const [nombre, paterno, materno, correo, direccion] of [
    ['María', 'Hernández', 'López', 'maria@example.com', 'Mercado Hidalgo, Veracruz'], ['Carlos', 'Mendoza', 'Ruiz', 'carlos@example.com', 'Boca del Río, Veracruz'],
    ['Ana', 'Torres', 'Díaz', 'ana@example.com', 'Centro, Veracruz'], ['Jorge', 'Castillo', 'Pérez', 'jorge@example.com', 'Costa de Oro, Boca del Río'],
    ['Lucía', 'Ramírez', 'Soto', 'lucia@example.com', 'Restaurante El Muelle, Veracruz'],
  ]) compradores.push(await Comprador.create({ nombre, apellido_paterno: paterno, apellido_materno: materno, correo, direccion }));
  const lotes = [];
  const data = [[0,'42.500',4,'145.00'],[2,'28.000',3,'185.00'],[1,'36.200',4,'120.00'],[3,'18.500',2,'210.00'],[4,'52.000',5,'85.00'],[0,'31.750',3,'145.00'],[2,'24.000',3,'185.00'],[1,'40.000',4,'120.00'],[4,'46.500',5,'85.00']];
  for (const [i,[e,kilos,numero_cajas,precio_kilo_salida]] of data.entries()) lotes.push(await Lote.create({ id_epe: especies[e].id_epe, kilos, numero_cajas, precio_kilo_salida, ...caracteristicasLote(especies[e].nombre, i) }));
  for (let i = 0; i < 3; i++) await registrarVenta({ id_lte: lotes[i].id_lte, codigo_cpr: compradores[i].codigo_cpr, precio_kilo_final: ['150.00','190.00','125.00'][i] }, admin.id);
  const anterior = await registrarVenta({ id_lte: lotes[3].id_lte, codigo_cpr: compradores[3].codigo_cpr, precio_kilo_final: '215.00' }, admin.id);
  await anterior.update({ fecha: new Date(Date.now() - 86400000) });
  const historicas = await cargarHistorico();
  console.log(`Demostración cargada: 5 especies, 8 compradores, 9 lotes iniciales, 4 ventas base y ${historicas} ventas históricas.`);
} catch (err) { console.error(err.message); process.exitCode = 1; }
finally { await db.close(); }
