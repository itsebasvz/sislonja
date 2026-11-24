import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes} from 'node:crypto';
import {createApp} from '../app.js';
import {Apartado, Compra, Comprador, Direccion, Especie, Lote, Pedido, Usuario, db} from '../models/index.js';
import {hoy} from '../helpers/formato.js';
import {iniciarSockets} from '../helpers/socket.js';

const clave = randomBytes(4).toString('hex');
const lotes = [], usuarios = [], compradores = [];
const server = createApp().listen(0,'127.0.0.1');
const io = iniciarSockets(server);
await new Promise(resolve=>server.once('listening',resolve));
const root='http://127.0.0.1:'+server.address().port+'/api';
async function request(path,{token,method='GET',body}={}){
  const res=await fetch(root+path,{
    method, headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
  });
  const text=await res.text();
  return {status:res.status,data:res.headers.get('content-type')?.includes('json')?JSON.parse(text):text,headers:res.headers};
}
async function cuenta(nombre,rol='cliente') {
  const email=`p3-${clave}-${nombre}@example.com`,password='PruebaP3Lonja!';
  let comprador;
  if(rol==='cliente'){
    comprador=await Comprador.create({nombre,apellido_paterno:'Prueba',apellido_materno:'',direccion:'',correo:email,telefono:'2291234567'});
    compradores.push(comprador.codigo_cpr);
  }
  const user=await Usuario.create({nombre,apellido:'Prueba',email,password,rol,confirmar:true,comprador_id:comprador?.codigo_cpr});
  usuarios.push(user.id);
  const login=await request('/auth/login',{method:'POST',body:{email,password,modo:rol==='cliente'?'cliente':'personal'}});
  assert.equal(login.status,200,JSON.stringify(login.data));
  assert(!Object.hasOwn(login.data.usuario,'password'));
  return login.data.token;
}
async function lote(){
  const e=await Especie.findOne();
  const row=await Lote.create({id_epe:e.id_epe,kilos:'2.500',numero_cajas:1,precio_kilo_salida:'10.00',presentacion:'Filete',conservacion:'Congelado',calibre:'200–300 g por pieza',procedencia:'Proveedor ficticio QA'});
  lotes.push(row.id_lte);
  return row.id_lte;
}
const apartar=(id,token)=>request('/lotes/'+id+'/apartado',{token,method:'POST',body:{}});
const pagar=(id,token,body={})=>request('/apartados/'+id+'/pedido',{token,method:'POST',body:{
  precio:'10.00',entrega:'recogida',telefono:'2291234567',metodo:'paypal',aceptar:true,...body,
}});

try {
  const a=await cuenta('Ana'), b=await cuenta('Bruno'), staff=await cuenta('Personal','admin');
  await test('JWT protege perfil, administración y reportes',async()=>{
    assert.equal((await request('/usuario/me')).status,401);
    assert.equal((await request('/usuario/me',{token:'invalido'})).status,401);
    assert.equal((await request('/admin',{token:a})).status,403);
    assert.equal((await request('/reportes/ventas',{token:staff})).status,200);
    const ticket=(await request('/usuario/socket-ticket',{token:a})).data.ticket;
    assert.equal((await request('/usuario/me',{token:ticket})).status,401);
  });
  await test('dos compradores disputan el mismo lote y el ganador reanuda sin extender su plazo',async()=>{
    const id=await lote();
    const resultados=await Promise.all([apartar(id,a),apartar(id,b)]);
    assert.deepEqual(resultados.map(r=>r.status).sort(),[201,409]);
    const indice=resultados.findIndex(r=>r.status===201),dueño=[a,b][indice],otro=[b,a][indice];
    const apartado=resultados[indice].data;
    assert(Math.abs(Date.parse(apartado.vence)-Date.now()-600000)<5000);
    assert.deepEqual((await apartar(id,dueño)).data,apartado);
    assert.equal((await request('/apartados/'+apartado.id,{token:otro})).status,410);
    assert.equal((await pagar(apartado.id,otro)).status,410);
    assert.equal((await request('/lotes/'+id,{token:otro})).data.p.apartadoPropio,false);
    assert.equal((await request('/lotes/'+id,{token:dueño})).data.p.apartadoPropio,true);
    assert.equal((await request('/catalogo/lotes/'+id,{token:staff,method:'DELETE'})).status,409);
    assert.equal((await request('/apartados/'+apartado.id,{token:otro,method:'DELETE'})).status,204);
    assert.equal((await request('/lotes/'+id)).data.p.estado,'apartado');
    await request('/apartados/'+apartado.id,{token:dueño,method:'DELETE'});
    assert.equal((await request('/lotes/'+id)).data.p.estado,'disponible');
    assert.equal((await apartar(id,otro)).status,201);
  });
  await test('un apartado vencido no puede cobrarse ni desplazar un apartado posterior',async()=>{
    const id=await lote();
    const anterior=(await apartar(id,a)).data;
    await Apartado.update({vence:new Date(Date.now()-1000)},{where:{id:anterior.id}});
    assert.equal((await pagar(anterior.id,a)).status,410);
    const nuevo=await apartar(id,b);
    assert.equal(nuevo.status,201);
    assert.notEqual(nuevo.data.id,anterior.id);
    assert.equal((await pagar(anterior.id,a)).status,410);
    assert.equal((await request('/lotes/'+id,{token:b})).data.p.apartadoPropio,true);
  });
  await test('un cobro en espera del bloqueo falla si el apartado vence antes de obtenerlo',async()=>{
    const id=await lote(),apartado=(await apartar(id,a)).data;
    let pago;
    await Apartado.update({vence:new Date(Date.now()+650)},{where:{id:apartado.id}});
    await db.transaction(async transaction=>{
      await Lote.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
      pago=pagar(apartado.id,a);
      await new Promise(resolve=>setTimeout(resolve,800));
    });
    assert.equal((await pago).status,410);
    assert.equal(await Compra.count({where:{lote_vigente_id:id}}),0);
    assert.equal((await apartar(id,b)).status,201);
  });
  await test('un cobro simultáneo confirma un pedido y el CSV solo incluye al dueño',async()=>{
    const id=await lote(),apartado=(await apartar(id,a)).data;
    assert.equal((await pagar(apartado.id,a,{precio:'0.01'})).status,409);
    const resultados=await Promise.all([pagar(apartado.id,a),pagar(apartado.id,a)]);
    assert(resultados.every(r=>[200,201].includes(r.status)),JSON.stringify(resultados));
    const pedidoId=resultados[0].data.id;
    assert.equal(resultados[1].data.id,pedidoId);
    assert.equal(await Compra.count({where:{lote_vigente_id:id}}),1);
    assert.equal(await Apartado.count({where:{lote_id:id}}),0);
    assert.equal((await request('/lotes/'+id)).data.p.estado,'vendido');
    assert.equal((await request('/mis-pedidos/'+pedidoId,{token:b})).status,404);
    for(const periodo of ['dia','semana','mes']){
      const query='?periodo='+periodo+'&fecha='+hoy();
      const informe=await request('/reportes/mis-compras'+query,{token:a});
      assert.equal(informe.data.resumen.total,'25.00');
      const csv=await request('/reportes/mis-compras.csv'+query,{token:a});
      assert.equal(csv.status,200);
      assert.match(csv.headers.get('content-disposition'),/attachment.*\.csv/);
      assert.match(csv.data,/25\.00/);
      assert.doesNotMatch((await request('/reportes/mis-compras.csv'+query,{token:b})).data,/25\.00/);
    }
    await request('/pedidos/'+pedidoId+'/estado',{token:staff,method:'PUT',body:{estado:'cancelado',motivo:'Cancelación de prueba'}});
    assert.equal((await request('/reportes/mis-compras',{token:a})).data.resumen.total,'0.00');
    assert.equal((await request('/lotes/'+id)).data.p.estado,'disponible');
  });
} finally {
  if(lotes.length) {
    await Apartado.destroy({where:{lote_id:lotes}});
    await Compra.destroy({where:{id_lte:lotes}});
  }
  if(usuarios.length) await Pedido.destroy({where:{usuario_id:usuarios}});
  if(lotes.length) await Lote.destroy({where:{id_lte:lotes}});
  if(usuarios.length) await Usuario.destroy({where:{id:usuarios}});
  if(compradores.length) {
    await Direccion.destroy({where:{codigo_cpr:compradores}});
    await Comprador.destroy({where:{codigo_cpr:compradores}});
  }
  await new Promise(resolve=>io.close(resolve));
  await db.close();
}
