import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { borrarFotografia, MAX_FOTO } from '../helpers/fotografias.js';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { createApp } from '../app.js';
import { db, Usuario, Tipo, Especie, Lote, Comprador, Compra } from '../models/index.js';
import { registrarVenta } from '../helpers/ventas.js';
import { hoy } from '../helpers/formato.js';
const suffix = randomBytes(4).toString('hex');
const password = 'PruebaLonja2026!';
const fixture = { usuarios: [], lotes: [] };
const mails = [];
// Receptor SMTP de prueba, en loopback; no envía mensajes a internet.
const smtp = net.createServer(socket => {
  socket.setEncoding('utf8'); socket.write('220 localhost test\r\n');
  let buffer = '', data = false, message = '';
  socket.on('data', chunk => {
    buffer += chunk;
    while(buffer.includes('\r\n')) {
      const i = buffer.indexOf('\r\n'), line = buffer.slice(0,i); buffer = buffer.slice(i+2);
      if(data) { if(line === '.') { mails.push(message); data = false; message = ''; socket.write('250 accepted\r\n'); } else message += line+'\r\n'; continue; }
      if (/^EHLO/.test(line)) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
      else if(/^AUTH/.test(line)) socket.write('235 authenticated\r\n');
      else if(line === 'DATA') { data = true; socket.write('354 go ahead\r\n'); }
      else if(line === 'QUIT') { socket.end('221 bye\r\n'); }
      else socket.write('250 OK\r\n');
    }
  });
});
await new Promise(resolve => smtp.listen(0,'127.0.0.1',resolve));
process.env.CORREO_HOST = '127.0.0.1'; process.env.CORREO_PORT = String(smtp.address().port); process.env.CORREO_USER = 'sender@example.com'; process.env.CORREO_PASS = 'test-only';
const server = createApp().listen(0,'127.0.0.1');
await new Promise(resolve => server.once('listening',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
class Client {
  cookies = new Map(); token = '';
  async request(path, options={}) {
    const res = await fetch(base+path, { ...options, redirect: 'manual', headers: { ...options.headers, Cookie: [...this.cookies].map(([a,b]) => `${a}=${b}`).join('; ') } });
    for(const cookie of res.headers.getSetCookie()) { const [pair] = cookie.split(';'); const i = pair.indexOf('='); this.cookies.set(pair.slice(0,i), pair.slice(i+1)); }
    const text = await res.text();
    const token = /name="_csrf" value="([^"]+)"/.exec(text)?.[1]; if(token) this.token = token;
    return {status:res.status,text,location:res.headers.get('location')};
  }
  multipart(path, data = {}, file, token = this.token) {
    const form = new FormData(); form.set('_csrf',token);
    for (const [key,value] of Object.entries(data)) form.set(key,value);
    if (file) form.set('fotografia',new Blob([file.buffer],{type:file.type}),file.name);
    return this.request(path,{method:'POST',body:form});
  }
  get(path) { return this.request(path); }
  post(path,data={}) { return this.request(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:this.token,...data})}); }
}
const admin = new Client(), operator = new Client(), anon = new Client();
let type, species, buyer, employee;
try {
  await db.authenticate();
  const a = await Usuario.create({nombre:'Prueba',apellido:'Admin',email:`admin-${suffix}@example.com`,password,rol:'admin',confirmar:true}); fixture.usuarios.push(a.id);
  await test('acceso, CSRF y páginas de administración', async () => {
    assert.equal((await anon.get('/lotes')).location,'/admin');
    await anon.get('/admin');
    assert.equal((await anon.post('/admin/login',{email:a.email,password:'incorrecta'})).status,401);
    assert.equal((await anon.request('/admin/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'email=a@example.com&password=bad'})).status,403);
    await admin.get('/admin');
    assert.equal((await admin.post('/admin/login',{email:a.email,password})).location,'/admin');
    for(const path of ['/admin','/personal','/personal/nuevo','/compradores','/compradores/nuevo','/especies','/especies/nuevo','/tipos','/tipos/nuevo','/lotes','/lotes/nuevo','/ventas','/pedidos','/reportes']) {
      const res = await admin.get(path); assert.equal(res.status,200,`${path}: ${res.text.slice(-600)}`);
    }
  });
  await test('alta de personal envía correo, bloquea cuenta pendiente y confirma una sola vez', async () => {
    const email = `operador-${suffix}@example.com`;
    const result = await admin.post('/personal',{nombre:'Prueba',apellido:'Operador',email,password,rol:'admin',confirmar:'true'});
    assert.equal(result.location,'/personal?aviso=guardado');
    employee = await Usuario.unscoped().findOne({where:{email}}); fixture.usuarios.push(employee.id);
    assert.equal(employee.rol,'operador'); assert.equal(employee.confirmar,false); assert.notEqual(employee.password,password);
    assert.equal(mails.length,1); assert.match(mails[0],/Confirma_tu_cuenta/); assert.ok(mails[0].replace(/=\r\n/g, '').includes('/confirmar/'+employee.token));
    const hash = employee.password;
    await operator.get('/admin'); assert.equal((await operator.post('/admin/login',{email,password})).status,401);
    assert.equal((await anon.get('/confirmar/no-valido')).status,400);
    const token = employee.token;
    assert.equal((await anon.get('/confirmar/'+token)).status,200);
    assert.equal((await anon.get('/confirmar/'+token)).status,400);
    await employee.reload(); assert.equal(employee.password,hash);
    assert.equal((await operator.post('/admin/login',{email,password})).location,'/admin');
    for(const path of ['/personal','/tipos/nuevo','/especies/nuevo']) assert.equal((await operator.get(path)).status,403);
    for(const path of ['/reportes','/lotes/nuevo','/compradores/nuevo']) assert.equal((await operator.get(path)).status,200);
    assert.equal((await admin.get(`/personal/${a.id}/editar`)).status,200);
  });
  await test('CRUD validado y formularios de edición conservan su identidad', async () => {
    assert.equal((await admin.post('/tipos',{nombre:'T'+suffix})).location,'/tipos?aviso=guardado');
    type = await Tipo.findOne({where:{nombre:'T'+suffix}});
    assert.equal((await admin.multipart('/especies',{nombre:'E'+suffix,id_tpo:String(type.id_tpo)},{name:'producto.jpg',type:'image/jpeg',buffer:readFileSync('public/img/especies/huachinango.jpg')})).location,'/especies?aviso=guardado');
    species = await Especie.findOne({where:{nombre:'E'+suffix}});
    const buyerData = {nombre:'Prueba',apellido_paterno:'Test',apellido_materno:'',correo:`cliente-${suffix}@example.com`,direccion:'Dirección de prueba'};
    assert.equal((await operator.post('/compradores',buyerData)).location,'/compradores?aviso=guardado');
    buyer = await Comprador.findOne({where:{correo:buyerData.correo}});
    assert.equal((await operator.post('/compradores',buyerData)).status,422);
    const data = {id_epe:String(species.id_epe),kilos:'2.125',numero_cajas:'2',precio_kilo_salida:'12.00'};
    assert.equal((await operator.post('/lotes',{...data,kilos:'-1'})).status,422);
    assert.equal((await operator.post('/lotes',data)).location,'/lotes?aviso=guardado');
    const lote = await Lote.findOne({where:{id_epe:species.id_epe}}); fixture.lotes.push(lote.id_lte);
    const form = await operator.get(`/lotes/${lote.id_lte}/editar`); assert.equal(form.status,200); assert.match(form.text,new RegExp(`action="/lotes/${lote.id_lte}\\?_method=PUT"`));
    assert.equal((await operator.post(`/lotes/${lote.id_lte}?_method=PUT`,{...data,kilos:'2.500'})).status,302);
    assert.equal((await admin.post(`/tipos/${type.id_tpo}?_method=DELETE`)).status,409);
    assert.equal((await admin.get('/lotes/999999999/editar')).status,404);
    assert.match((await operator.get('/compradores?q='+suffix)).text,/1 registros/);
  });
  await test('fotografías: límite, formato, CSRF, reemplazo y conservación al editar', async () => {
    const image = {name:'foto.jpeg',type:'image/jpeg',buffer:readFileSync('public/img/especies/robalo.jpg')};
    const fields = {nombre:species.nombre,id_tpo:String(type.id_tpo)};
    const before = species.imagen;
    assert.ok(existsSync('public'+before));
    assert.equal((await admin.multipart(`/especies/${species.id_epe}?_method=PUT`,fields)).status,302);
    await species.reload(); assert.equal(species.imagen,before);
    assert.equal((await operator.multipart('/especies',fields,image)).status,403);
    assert.equal((await admin.multipart('/especies',fields,image,'incorrecto')).status,403);
    assert.equal((await admin.multipart(`/especies/${species.id_epe}?_method=PUT`,fields,{...image,buffer:Buffer.from('archivo falso')})).status,422);
    assert.equal((await admin.multipart('/especies',fields,{name:'foto.svg',type:'image/svg+xml',buffer:Buffer.from('<svg/>')})).status,422);
    assert.equal((await admin.multipart('/especies',fields,{...image,buffer:Buffer.alloc(MAX_FOTO+1)})).status,422);
    assert.equal((await admin.multipart('/especies',fields,{...image,buffer:Buffer.alloc(MAX_FOTO+40000)})).status,413);
    await admin.get(`/especies/${species.id_epe}/editar`);
    assert.equal((await admin.multipart(`/especies/${species.id_epe}?_method=PUT`,fields,image)).status,302);
    await species.reload(); assert.notEqual(species.imagen,before);assert.ok(!existsSync('public'+before));
    assert.equal((await admin.get(species.imagen)).status,200);
    const count = readdirSync('public/img/especies/subidas').length;
    assert.equal((await admin.multipart('/especies',fields,image)).status,422);
    assert.equal(readdirSync('public/img/especies/subidas').length,count,'no quedan archivos huérfanos al duplicar un nombre');
    const png = {name:'mini.png',type:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6eVQAAAAASUVORK5CYII=','base64')};
    assert.equal((await admin.multipart('/especies',{nombre:'U'+suffix,id_tpo:String(type.id_tpo)},png)).status,302);
    const extra = await Especie.findOne({where:{nombre:'U'+suffix}});
    assert.ok(existsSync('public'+extra.imagen));
    assert.equal((await admin.post(`/especies/${extra.id_epe}?_method=DELETE`)).status,302);
    assert.equal(existsSync('public'+extra.imagen),false);
  });
  await test('captura manual retirada y lotes históricos protegidos', async () => {
    assert.equal((await operator.get('/ventas/nueva')).status,404);
    assert.equal((await operator.post('/ventas',{})).status,404);
    const compra=await registrarVenta({id_lte:fixture.lotes[0],codigo_cpr:buyer.codigo_cpr,precio_kilo_final:'10.20'},employee.id);
    assert.equal(compra.precio_total,'25.50');
    assert.equal((await operator.get(`/lotes/${fixture.lotes[0]}/editar`)).status,409);
    assert.equal((await admin.post(`/ventas/${compra.id_cmp}?_method=DELETE`)).status,404);
    await compra.destroy();
  });
  await test('dos solicitudes simultáneas solo venden una vez el mismo lote', async () => {
    const data = {id_lte:fixture.lotes[0],codigo_cpr:buyer.codigo_cpr,precio_kilo_final:'15.00'};
    const results = await Promise.allSettled([registrarVenta(data,employee.id),registrarVenta(data,employee.id)]);
    assert.equal(results.filter(r=>r.status === 'fulfilled').length,1);
    assert.equal(await Compra.count({where:{id_lte:fixture.lotes[0]}}),1);
  });
  await test('histórico por día y rango: límites inclusivos y totales acumulados', async () => {
    for (const [fecha,precio] of [['2001-01-01T00:00:00-06:00','10.00'],['2001-01-03T23:59:59-06:00','20.00'],['2001-01-04T00:00:00-06:00','40.00']]) {
      const lote = await Lote.create({id_epe:species.id_epe,kilos:'1.000',numero_cajas:1,precio_kilo_salida:'10.00',fecha:new Date('2000-12-31T12:00:00-06:00')});
      fixture.lotes.push(lote.id_lte);
      const compra = await registrarVenta({id_lte:lote.id_lte,codigo_cpr:buyer.codigo_cpr,precio_kilo_final:precio},employee.id);
      await compra.update({fecha:new Date(fecha)});
    }
    const range = await admin.get('/reportes?desde=2001-01-01&hasta=2001-01-03');
    assert.equal(range.status,200); assert.match(range.text,/Reporte acumulado/);assert.match(range.text,/\$30\.00/);assert.doesNotMatch(range.text,/\$40\.00/);
    const single = await admin.get('/reportes?desde=2001-01-03&hasta=2001-01-03');assert.equal(single.status,200);assert.match(single.text,/\$20\.00/);assert.doesNotMatch(single.text,/\$10\.00/);
    const dashboard = await admin.get('/admin?desde=2001-01-01&hasta=2001-01-03');assert.equal(dashboard.status,200);assert.match(dashboard.text,/Ventas del período/);assert.match(dashboard.text,/\$30\.00/);
    const list = await admin.get('/ventas?desde=2001-01-01&hasta=2001-01-03');assert.equal(list.status,200);assert.match(list.text,/2 ventas/);
    assert.equal((await admin.get('/admin?desde=2001-01-03&hasta=2001-01-01')).status,422);
    assert.equal((await admin.get('/admin?desde=2999-01-01')).status,422);
  });
  await test('reporte diario, día vacío, caducidad y cierre de sesión', async () => {
    const report = await operator.get('/reportes?fecha='+hoy()); assert.equal(report.status,200); assert.match(report.text,/Prueba Test/); assert.match(report.text,/37\.50/);
    assert.match((await operator.get('/reportes?fecha=2000-01-01')).text,/Un día sin movimientos/);
    assert.equal((await operator.get('/reportes?fecha=2026-02-30')).status,422);
    const expired = new Client(); expired.cookies.set('_token',jwt.sign({id:employee.id},process.env.SC_JWT,{expiresIn:-1}));
    assert.match((await expired.get('/admin')).text,/ACCESO DEL PERSONAL/);
    await operator.get('/admin'); assert.equal((await operator.post('/cerrar-sesion')).location,'/admin');
    assert.match((await operator.get('/admin')).text,/ACCESO DEL PERSONAL/);
  });
} finally {
  if(fixture.lotes.length) { await Compra.destroy({where:{id_lte:fixture.lotes}}); await Lote.destroy({where:{id_lte:fixture.lotes}}); }
  if(species) { await borrarFotografia(species.imagen); await species.destroy(); } if(type) await type.destroy(); if(buyer) await buyer.destroy();
  if(fixture.usuarios.length) await Usuario.destroy({where:{id:fixture.usuarios}});
  await new Promise(resolve=>server.close(resolve)); await new Promise(resolve=>smtp.close(resolve)); await db.close();
}
