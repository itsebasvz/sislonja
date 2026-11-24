import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, lstatSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const workspace = path.dirname(root);
const temporal = mkdtempSync(path.join(workspace,'.entrega-p3-'));
const finalDir = path.join(workspace,'20');
const finalZip = finalDir + '.zip';
const proyectos = [
  {carpeta:'lonja-api', nombre:'Lonja API', archivos:['app.js','index.js','package.json','package-lock.json','README.md','.env.example','config','controllers','helpers','middleware','models','public','routes','scripts','sql','test']},
  {carpeta:'lonja-cliente', nombre:'Lonja Cliente', archivos:['app.js','index.js','package.json','package-lock.json','README.md','.env.example','helpers','middleware','public','views']},
];
function ejecutar(programa,args,cwd) {
  const resultado=spawnSync(programa,args,{cwd,stdio:'inherit'});
  if(resultado.error || resultado.status!==0)throw new Error('Falló la verificación de '+programa+'.');
}
try {
  const salida=path.join(temporal,'20');
  mkdirSync(salida);
  for(const proyecto of proyectos) {
    const destino=path.join(temporal,proyecto.nombre);
    mkdirSync(destino);
    for(const nombre of proyecto.archivos) {
      cpSync(path.join(root,proyecto.carpeta,nombre),path.join(destino,nombre),{
        recursive:true,
        filter:archivo=>{
          const nombre=path.basename(archivo);
          return !(nombre.startsWith('.env') && nombre!=='.env.example') &&
            !['.git','node_modules','data','.DS_Store'].includes(nombre) &&
            !nombre.endsWith('.log') && !nombre.endsWith('.tmp') &&
            !lstatSync(archivo).isSymbolicLink();
        },
      });
    }
    if(proyecto.carpeta==='lonja-cliente'){
      const docs=path.join(destino,'docs');
      mkdirSync(docs);
      cpSync(path.join(root,'docs','CREDITOS_FOTOGRAFIAS.md'),path.join(docs,'CREDITOS_FOTOGRAFIAS.md'));
    }
    const zip=path.join(salida,proyecto.nombre+'.zip');
    ejecutar('zip',['-qr',zip,proyecto.nombre],temporal);
    ejecutar('unzip',['-tq',zip],temporal);
  }
  const entregable=path.join(temporal,'20.zip');
  ejecutar('zip',['-q',entregable,...proyectos.map(p=>p.nombre+'.zip')],salida);
  ejecutar('unzip',['-tq',entregable],temporal);
  writeFileSync(path.join(salida,'.entrega-lonja'),'Tercer parcial · Equipo 20\n');
  const anteriorDir=path.join(temporal,'anterior-20'),anteriorZip=path.join(temporal,'anterior-20.zip');
  let reemplazado=false;
  try {
    if(existsSync(finalDir))renameSync(finalDir,anteriorDir);
    if(existsSync(finalZip))renameSync(finalZip,anteriorZip);
    renameSync(salida,finalDir);
    reemplazado=true;
    renameSync(entregable,finalZip);
  } catch(err) {
    if(reemplazado)renameSync(finalDir,salida);
    if(existsSync(anteriorDir))renameSync(anteriorDir,finalDir);
    if(existsSync(anteriorZip))renameSync(anteriorZip,finalZip);
    throw err;
  }
  console.log('Entrega lista en '+finalZip);
} finally {
  rmSync(temporal,{recursive:true,force:true});
}
