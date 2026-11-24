import { readFileSync,statSync } from 'node:fs';import { gunzipSync } from 'node:zlib';
let cache,version;
function catalogo(){try{const file=new URL('../data/sepomex.json.gz',import.meta.url);const m=statSync(file).mtimeMs;if(m!==version){cache=JSON.parse(gunzipSync(readFileSync(file)));version=m;}return cache;}catch{throw Object.assign(new Error('El catálogo postal no está disponible. Ejecuta npm run cp:actualizar en el servidor.'),{status:503});}}
export function estadosMexico(){return catalogo().estados.map(({id,nombre})=>({id,nombre}));}
export function municipiosEstado(id){const estado=catalogo().estados.find(e=>e.id===id);return estado?.municipios||null;}
export function buscarCodigoPostal(cp){if(typeof cp!=='string'||!/^\d{5}$/.test(cp))return null;const data=catalogo(),groups=data.codigos[cp];if(!groups)return null;return{cp,ubicaciones:groups.map(([eid,mid,colonias])=>{const e=data.estados.find(e=>e.id===eid);return{estadoId:eid,estado:e.nombre,municipioId:mid,municipio:e.municipios.find(m=>m.id===mid).nombre,colonias:[...colonias].sort((a,b)=>a.localeCompare(b,'es'))};})};}
export function validarDireccion(input){
 const fail=mensaje=>{throw Object.assign(new Error(mensaje),{status:422});};
 if(!input||typeof input!=='object')fail('Completa la dirección de entrega.');
 for(const [k,max] of [['calle',120],['numero',30],['colonia',200],['cp',5],['estado',2],['municipio',3]])if(typeof input[k]!=='string'||!input[k].trim()||input[k].length>max)fail('Completa la dirección de entrega.');
 const postal=buscarCodigoPostal(input.cp);if(!postal)fail('El código postal no existe en el catálogo. Revisa sus cinco dígitos.');
 const sitio=postal.ubicaciones.find(s=>s.estadoId===input.estado&&s.municipioId===input.municipio);if(!sitio)fail('El estado o municipio no corresponde al código postal. Consulta nuevamente tu CP.');
 if(!sitio.colonias.includes(input.colonia))fail('Selecciona una colonia correspondiente a tu código postal.');
 return{calle:input.calle.trim(),numero:input.numero.trim(),cp:postal.cp,colonia:input.colonia,estado:sitio.estado,estadoId:sitio.estadoId,municipio:sitio.municipio,municipioId:sitio.municipioId,pais:'México'};
}
