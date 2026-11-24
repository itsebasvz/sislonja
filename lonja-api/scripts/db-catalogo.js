import {db,Tipo,Especie} from '../models/index.js';
import {tiposBase,especiesBase,camposLote} from '../helpers/catalogo-base.js';
try{
 const qi=db.getQueryInterface();const cols=await qi.describeTable('lote');
 for(const f of camposLote)if(!cols[f.name])await db.query(`ALTER TABLE lote ADD ${qi.quoteIdentifier(f.name)} VARCHAR(${f.max}) NOT NULL DEFAULT ''`);
 let nuevosTipos=0,nuevasEspecies=0;
 await db.transaction(async transaction=>{
  for(const t of tiposBase.slice(0,5)){const [,created]=await Tipo.findOrCreate({where:{nombre:t.nombre},transaction});if(created)nuevosTipos++;}
  for(const p of especiesBase.slice(0,14)){
   const [tipo]=await Tipo.findOrCreate({where:{nombre:p.tipo},transaction});
   const [,created]=await Especie.findOrCreate({where:{nombre:p.nombre},defaults:{id_tpo:tipo.id_tpo,imagen:p.imagen,descripcion:p.descripcion},transaction});if(created)nuevasEspecies++;
  }
 });
 console.log(`Catálogo actualizado: ${nuevosTipos} tipos y ${nuevasEspecies} especies nuevas. Los lotes, fotos y datos existentes se conservaron.`);
}finally{await db.close();}
