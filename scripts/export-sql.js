import { Op } from 'sequelize';
import { hoy } from '../helpers/formato.js';
import { writeFileSync } from 'node:fs';
import { db, Tipo, Especie, Comprador, Lote, Compra, Pedido } from '../models/index.js';
try {
  const tables = ['tipo','especie','comprador','direccion','usuario','lote','pedido','compra'];
  let schema = '-- Sistema Lonja: importar en una base vacía seleccionada. No contiene credenciales.\nSET NAMES utf8mb4;\n';
  for (const table of tables) {
    const rows = await db.query('SHOW CREATE TABLE ' + db.getQueryInterface().quoteIdentifier(table), { type: db.QueryTypes.SELECT });
    schema += rows[0]['Create Table'].replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ') + ';\n\n';
  }
  writeFileSync('sql/estructura.sql', schema);
  const demoBuyers=await Comprador.findAll({raw:true});const idsDemo=new Set(demoBuyers.filter(row=>/^(maria|carlos|ana|jorge|lucia|historico\.demo\.[123])@example\.com$/.test(row.correo)).map(row=>row.codigo_cpr));
  let data = "-- Datos ficticios. Importar una sola vez, después de db:init, sobre tablas comerciales vacías.\nSET NAMES utf8mb4;\nSET time_zone = '-06:00';\nSET @lonja_admin = (SELECT id FROM usuario WHERE rol='admin' ORDER BY id LIMIT 1);\nSTART TRANSACTION;\n";
  for (const Model of [Tipo,Especie,Comprador,Lote,Compra]) {
    let rows = await Model.findAll({ raw: true, order: [[Model.primaryKeyAttribute, 'ASC']] });
    if(Model === Compra) rows=rows.filter(row=>!row.pedido_id&&idsDemo.has(row.codigo_cpr));
    if(Model === Lote) { const online=await Compra.findAll({where:{pedido_id:{[Op.ne]:null}},attributes:['id_lte'],raw:true}); const ids=new Set(online.map(c=>c.id_lte));rows=rows.filter(row=>!ids.has(row.id_lte)); }
    if(Model === Comprador) rows=rows.filter(row=>/^(maria|carlos|ana|jorge|lucia|historico\.demo\.[123])@example\.com$/.test(row.correo));
    for (const row of rows) {
      const values = Object.entries(row).map(([k,v]) => {
        if (k === 'usuario_id') return v === null ? 'NULL' : '@lonja_admin';
        if (k === 'fecha') {
          const local = new Date(new Date(v).getTime()-6*60*60*1000).toISOString();
          const days = Math.round((Date.parse(hoy()+'T00:00:00Z')-Date.parse(local.slice(0,10)+'T00:00:00Z'))/86400000);
          return `TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL ${days} DAY), ${db.escape(local.slice(11,19))})`;
        }
        return db.escape(v);
      });
      data += `INSERT INTO ${db.getQueryInterface().quoteIdentifier(Model.tableName)} (${Object.keys(row).map(k=>db.getQueryInterface().quoteIdentifier(k)).join(', ')}) VALUES (${values.join(', ')});\n`;
    }
  }
  data += 'COMMIT;\n'; writeFileSync('sql/demostracion.sql', data);
  console.log('SQL de estructura y demostración exportado sin datos de acceso.');
} finally { await db.close(); }
