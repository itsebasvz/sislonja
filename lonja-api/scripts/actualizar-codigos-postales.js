import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import { gzipSync,inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const fuente='https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx';
let bytes;
if(process.argv[2])bytes=await readFile(process.argv[2]);
else{
 const page=await fetch(fuente,{signal:AbortSignal.timeout(30000)});if(!page.ok)throw Error('No se pudo consultar Correos de México.');const html=await page.text();
 const form=new URLSearchParams();for(const match of html.matchAll(/<input type="hidden" name="([^"]+)"[^>]*value="([^"]*)"/g))form.set(match[1],match[2].replace(/&amp;/g,'&'));
 form.set('cboEdo','00');form.set('rblTipo','txt');form.set('btnDescarga.x','20');form.set('btnDescarga.y','15');
 const cookie=page.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const res=await fetch(fuente,{method:'POST',headers:{Cookie:cookie},body:form,signal:AbortSignal.timeout(45000)});if(!res.ok)throw Error('No se pudo descargar el catálogo postal.');bytes=Buffer.from(await res.arrayBuffer());
}
if(bytes.readUInt32LE(0)===0x04034b50){
 const method=bytes.readUInt16LE(8),flags=bytes.readUInt16LE(6),size=bytes.readUInt32LE(18),start=30+bytes.readUInt16LE(26)+bytes.readUInt16LE(28);
 if(flags&8||![0,8].includes(method)||!size)throw Error('Formato ZIP no reconocido. Descarga el TXT oficial y pásalo como argumento.');
 const zipped=bytes.subarray(start,start+size);bytes=method===8?inflateRawSync(zipped,{maxOutputLength:40000000}):zipped;
}
const text=new TextDecoder('windows-1252').decode(bytes);const lines=text.split(/\r?\n/);const header=lines.findIndex(l=>l.startsWith('d_codigo|'));if(header<0)throw Error('No es un TXT de SEPOMEX válido.');
const fields=lines[header].split('|');const estados=new Map(),codigos=Object.create(null);let asentamientos=0;
for(const line of lines.slice(header+1)){
 if(!line.trim())continue;const vals=line.split('|');const r=Object.fromEntries(fields.map((k,i)=>[k,vals[i]?.trim()||'']));
 if(!/^\d{5}$/.test(r.d_codigo)||!/^\d{2}$/.test(r.c_estado)||!r.c_mnpio||!r.d_asenta)throw Error('Fila postal incompleta; no se reemplazó el catálogo.');
 const eid=r.c_estado,mid=r.c_mnpio.padStart(3,'0');if(!estados.has(eid))estados.set(eid,{id:eid,nombre:r.d_estado,municipios:new Map()});estados.get(eid).municipios.set(mid,r.D_mnpio);
 const groups=codigos[r.d_codigo] ||= [];let group=groups.find(g=>g[0]===eid&&g[1]===mid);if(!group){group=[eid,mid,[]];groups.push(group);}if(!group[2].includes(r.d_asenta))group[2].push(r.d_asenta);asentamientos++;
}
if(estados.size!==32||Object.keys(codigos).length<25000)throw Error('El catálogo nacional está incompleto; no se reemplazó el archivo.');
const data={fuente,descargado:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),asentamientos,estados:[...estados.values()].map(e=>({...e,municipios:[...e.municipios].map(([id,nombre])=>({id,nombre})).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))})).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')),codigos};
await mkdir(new URL('../data/',import.meta.url),{recursive:true});const destino=new URL('../data/sepomex.json.gz',import.meta.url),temporal=new URL('../data/sepomex.json.gz.tmp',import.meta.url);await writeFile(temporal,gzipSync(JSON.stringify(data)));await rename(temporal,destino);
console.log(`Catálogo oficial listo: ${data.estados.length} entidades, ${data.estados.reduce((s,e)=>s+e.municipios.length,0)} municipios/alcaldías, ${Object.keys(codigos).length} CP y ${asentamientos} asentamientos. Consultas locales sin internet.`);
