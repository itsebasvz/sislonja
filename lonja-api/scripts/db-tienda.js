import { db, Pedido, Direccion } from '../models/index.js';
try {
 await db.authenticate(); const qi=db.getQueryInterface();
 await db.query("ALTER TABLE usuario MODIFY rol ENUM('admin','operador','cliente') NOT NULL DEFAULT 'operador'");
 for(const f of ['nombre','apellido_paterno','apellido_materno']) await db.query(`ALTER TABLE comprador MODIFY ${f} VARCHAR(80) NOT NULL`);
 let cols=await qi.describeTable('comprador'); if(!cols.telefono) await db.query('ALTER TABLE comprador ADD telefono VARCHAR(20) NULL');
 cols=await qi.describeTable('especie'); if(!cols.descripcion) await db.query("ALTER TABLE especie ADD descripcion VARCHAR(1000) NOT NULL DEFAULT ''");
 cols=await qi.describeTable('usuario'); if(!cols.comprador_id) await db.query('ALTER TABLE usuario ADD comprador_id SMALLINT NULL UNIQUE, ADD CONSTRAINT usuario_comprador_fk FOREIGN KEY (comprador_id) REFERENCES comprador(codigo_cpr)');
 await Pedido.sync(); cols=await qi.describeTable('compra');
 if(!cols.lote_vigente_id) {
  await db.query('ALTER TABLE compra ADD lote_vigente_id INTEGER NULL UNIQUE, ADD CONSTRAINT compra_vigente_fk FOREIGN KEY (lote_vigente_id) REFERENCES lote(id_lte)');
  await db.query('UPDATE compra SET lote_vigente_id=id_lte');
 }
 // Keep a nonunique index before removing the old unique FK index.
 const indexes=await qi.showIndex('compra');
 if(!indexes.some(i=>i.name==='compra_lote_historia')) await qi.addIndex('compra',['id_lte'],{name:'compra_lote_historia'});
 for(const i of indexes) if(i.unique && i.fields.length===1 && i.fields[0].attribute==='id_lte') await qi.removeIndex('compra',i.name);
 if(!cols.estado) await db.query("ALTER TABLE compra ADD estado VARCHAR(15) NOT NULL DEFAULT 'activa'");
 if(!cols.detalle) await db.query('ALTER TABLE compra ADD detalle LONGTEXT NULL');
 if(!cols.pedido_id) await db.query('ALTER TABLE compra ADD pedido_id INTEGER NULL, ADD CONSTRAINT compra_pedido_fk FOREIGN KEY (pedido_id) REFERENCES pedido(id)');
 await db.query('ALTER TABLE compra MODIFY usuario_id INTEGER NULL');
 await Direccion.sync();
 console.log('Migración tienda lista. Datos históricos conservados.');
} finally { await db.close(); }
