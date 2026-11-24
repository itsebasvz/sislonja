import express from 'express';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { api, apiPublica, fotoApi } from './helpers/api.js';
import { creditosFotos } from './helpers/creditos-fotos.js';
import { resolverPeriodo } from './helpers/periodos.js';
import * as formato from './helpers/formato.js';
import { cookieOptions, verificarFormulario } from './middleware/formulario.js';

const archivo = relative => fileURLToPath(new URL(relative, import.meta.url));
const urlQuery = req => {
  const i = req.originalUrl.indexOf('?');
  return i === -1 ? '' : req.originalUrl.slice(i);
};
const rutaSegura = value => typeof value === 'string' && /^\/(?![/\\])[\w\-/?=&.]*$/.test(value) && value.length <= 200 ? value : '';
const avisos = {guardado:'Los cambios se guardaron correctamente.',eliminado:'El registro se eliminó correctamente.',
  'correo-pendiente':'La cuenta quedó guardada. Configura SMTP y reenvía la confirmación.',
  'correo-enviado':'Enviamos el correo de confirmación.',confirmado:'La cuenta ya está confirmada.'};
const titulos = {cliente:'Inicia sesión',personal:'Acceso del personal',registro:'Crea tu cuenta'};
const llamado = (req, path, opts = {}) => api(path, {token:req.token,...opts});
const mostrarAcceso = (res, modo, {status=200,errors=[],values={},siguiente='',estados=[]}={}) =>
  res.status(status).render('login',{title:titulos[modo],modo,errors,values,siguiente,estados});
const portal = modo => (req,res) => {
  if (req.usuario) return res.redirect(req.usuario.rol === 'cliente' ? rutaSegura(req.query.siguiente) || '/' : '/admin');
  mostrarAcceso(res,modo,{siguiente:rutaSegura(req.query.siguiente)});
};

function autenticarPara(rol) {
  return (req,res,next) => {
    const personal = rol === 'personal';
    if (!req.usuario) return res.redirect(personal ? '/admin' : '/login?siguiente='+encodeURIComponent(req.originalUrl));
    if (personal ? req.usuario.rol === 'cliente' : req.usuario.rol !== 'cliente') {
      throw Object.assign(new Error('No tienes acceso a esta sección.'),{status:403});
    }
    next();
  };
}

export function createApp() {
  const secreto = process.env.COOKIE_SECRET;
  if (!secreto || secreto.length < 32) throw new Error('Configura COOKIE_SECRET con al menos 32 caracteres.');
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine','ejs');
  app.set('views',archivo('./views/'));
  app.use(express.static(archivo('./public/')));
  app.get('/img/especies/subidas/:foto', async (req,res) => {
    if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp|gif)$/.test(req.params.foto)) return res.sendStatus(404);
    const foto = await fotoApi(req.path);
    res.type(foto.headers.get('content-type'));
    await pipeline(Readable.fromWeb(foto.body),res);
  });
  app.use(express.urlencoded({extended:false,limit:'32kb'}));
  app.use(express.json({limit:'32kb'}));
  app.use(methodOverride('_method',{methods:['POST']}));
  app.use(/^\/especies(?:\/\d+)?$/, express.raw({type:'multipart/form-data',limit:5*1024*1024+32768}));
  app.use(cookieParser(secreto));
  app.use((req,res,next) => {
    res.set('Cache-Control','no-store');
    Object.assign(res.locals,formato,{title:'Sistema Lonja',apiPublica,user:null,csrfToken:'',currentPath:req.path,periodo:resolverPeriodo(),aviso:avisos[req.query.aviso]||'',correoPreview:null});
    next();
  });
  app.use(verificarFormulario);
  app.use(async (req,res,next) => {
    req.token = req.cookies.lonja_token;
    if (req.token) {
      try {
        req.usuario = (await llamado(req,'/usuario/me')).usuario;
        res.locals.user = req.usuario;
        if (req.usuario.rol === 'admin') res.locals.correoPreview = req.signedCookies.correo_preview;
      } catch (err) {
        if (err.status !== 401) throw err;
        res.clearCookie('lonja_token',cookieOptions);
        req.token = null;
      }
    }
    res.locals.periodo = resolverPeriodo(req.method==='GET' && ['/admin','/ventas','/reportes'].includes(req.path) ? req.query : {});
    next();
  });

  const cliente = autenticarPara('cliente'), personal = autenticarPara('personal');
  const vista = (path, template) => async (req,res) =>
    res.render(template,await llamado(req, (typeof path === 'function' ? path(req) : path) + urlQuery(req)));
  const proxy = (path, method='GET') => async (req,res) => {
    const datos = await llamado(req,typeof path === 'function' ? path(req) : path,{
      method, ...(method==='POST' ? {body:req.body || {}} : {}),
    });
    return datos===null ? res.status(204).end() : res.json(datos);
  };
  app.get('/', async (req,res) => res.render('tienda/catalogo',{title:'Del mar a tu mesa',...await llamado(req,'/lotes')}));
  app.get('/creditos',(req,res) => res.render('tienda/creditos',{title:'Créditos de fotografía',creditosFotos}));
  app.get('/tienda/inventario',proxy('/lotes'));
  app.get('/tienda/lotes/:id/estado',proxy(req=>'/lotes/'+encodeURIComponent(req.params.id)));
  app.get('/tienda/lotes/:id',vista(req=>'/lotes/'+encodeURIComponent(req.params.id),'tienda/detalle'));
  app.get('/direccion/municipios/:estado',proxy(req=>'/postal/municipios/'+encodeURIComponent(req.params.estado)));
  app.get('/direccion/codigo-postal/:cp',proxy(req=>'/postal/codigos/'+encodeURIComponent(req.params.cp)));
  app.get('/proxy/socket-ticket',(req,res,next)=>req.token ? next() : res.sendStatus(401),proxy('/usuario/socket-ticket'));
  app.get('/acceder',(req,res)=>res.redirect('/login'+urlQuery(req)));
  app.get('/login',portal('cliente'));
  app.get('/admin',(req,res,next)=>req.usuario ? next() : portal('personal')(req,res),personal,vista('/admin','inicio'));

  async function login(req,res,modo) {
    const siguiente = rutaSegura(req.body.siguiente);
    try {
      const {token} = await api('/auth/login',{method:'POST',body:{email:req.body.email,password:req.body.password,modo}});
      res.cookie('lonja_token',token,{...cookieOptions,maxAge:7200000});
      res.redirect(303,modo==='personal'?'/admin':siguiente||'/');
    } catch (err) {
      if (err.status>=500) throw err;
      mostrarAcceso(res,modo,{status:err.status,errors:[err.message],values:{email:req.body.email},siguiente});
    }
  }
  app.post('/login',(req,res)=>login(req,res,'cliente'));
  app.post('/admin/login',(req,res)=>login(req,res,'personal'));
  app.post('/cerrar-sesion',(req,res)=>{
    const destino=req.usuario?.rol==='cliente'?'/':'/admin';
    res.clearCookie('lonja_token',cookieOptions).clearCookie('correo_preview',cookieOptions).redirect(303,destino);
  });
  const estados = async () => (await api('/postal/estados')).estados;
  app.get('/registro',async (req,res)=> mostrarAcceso(res,'registro',{estados:await estados()}));
  app.post('/registro',async (req,res)=>{
    try {
      const datos=await api('/auth/register',{method:'POST',body:req.body});
      res.cookie('cliente_pendiente',datos.pendiente,{...cookieOptions,signed:true,maxAge:86400000});
      res.status(201).render('tienda/confirmacion',{title:'Confirma tu correo',...datos});
    } catch(err) {
      if(err.status!==422) throw err;
      mostrarAcceso(res,'registro',{status:422,errors:err.data.errors,values:err.data.values,estados:await estados()});
    }
  });
  app.post('/registro/reenviar',async (req,res)=>{
    const datos=await api('/auth/confirmacion/reenviar',{method:'POST',body:{pendiente:req.signedCookies.cliente_pendiente}});
    res.render('tienda/confirmacion',{title:'Confirma tu correo',...datos});
  });
  app.get('/confirmar/:token',async (req,res)=>{
    const datos=await api('/auth/confirmacion/'+encodeURIComponent(req.params.token),{method:'POST'});
    res.clearCookie('cliente_pendiente',cookieOptions).render('mensaje',datos);
  });

  const apartado = req => '/apartados/' + encodeURIComponent(req.params.id);
  app.post('/tienda/lotes/:id/apartado',async (req,res)=>{
    const lote=encodeURIComponent(req.params.id);
    if(!req.usuario) return res.redirect(303,'/login?siguiente='+encodeURIComponent('/tienda/lotes/'+lote));
    const datos=await llamado(req,'/lotes/'+lote+'/apartado',{method:'POST',body:{}});
    res.redirect(303,'/finalizar/'+datos.id);
  });
  app.get('/finalizar/:id',cliente,async (req,res)=>{
    const datos=await llamado(req,apartado(req));
    if(datos.pedidoId) return res.redirect('/mis-pedidos/'+datos.pedidoId);
    res.render('tienda/checkout',datos);
  });
  app.delete('/proxy/apartados/:id',proxy(apartado,'DELETE'));
  app.post('/proxy/apartados/:id/pedido',proxy(req=>apartado(req)+'/pedido','POST'));
  app.get('/compra-confirmada',proxy(req=>'/mis-pedidos/confirmacion'+urlQuery(req)));

  app.get('/mis-pedidos',cliente,async (req,res)=>{
    const informe=await llamado(req,'/reportes/mis-compras'+urlQuery(req));
    res.render('tienda/pedidos',{title:'Mis pedidos',informe,rows:informe.pedidos});
  });
  app.get('/mis-pedidos/descargar',cliente,async (req,res)=>{
    const csv=await llamado(req,'/reportes/mis-compras.csv'+urlQuery(req),{response:true});
    res.set({'Content-Type':csv.headers.get('content-type'),'Content-Disposition':csv.headers.get('content-disposition')});
    res.send(Buffer.from(await csv.arrayBuffer()));
  });
  app.get('/mis-pedidos/:id',cliente,vista(req=>'/mis-pedidos/'+encodeURIComponent(req.params.id),'tienda/pedido'));
  app.get('/mis-direcciones',cliente,vista('/direcciones','tienda/direcciones'));
  app.post('/mis-direcciones',cliente,async (req,res)=>{
    try {
      await llamado(req,'/direcciones',{method:'POST',body:req.body});
      res.redirect(303,'/mis-direcciones?aviso=guardada');
    } catch(err) {
      if(err.status!==422) throw err;
      res.status(422).render('tienda/direcciones',err.data);
    }
  });
  app.post('/mis-direcciones/:id/predeterminada',cliente,async (req,res)=>{
    await llamado(req,'/direcciones/'+encodeURIComponent(req.params.id)+'/predeterminada',{method:'PUT'});
    res.redirect(303,'/mis-direcciones?aviso=predeterminada');
  });
  app.delete('/mis-direcciones/:id',cliente,async (req,res)=>{
    await llamado(req,'/direcciones/'+encodeURIComponent(req.params.id),{method:'DELETE'});
    res.redirect(303,'/mis-direcciones?aviso=eliminada');
  });

  app.get('/inicio',personal,(req,res)=>res.redirect('/admin'+urlQuery(req)));
  app.get('/ventas',personal,vista('/ventas','ventas'));
  app.get('/reportes',personal,vista('/reportes/ventas','reporte'));
  app.get('/pedidos',personal,vista('/pedidos','pedidos'));
  app.get('/pedidos/:id',personal,vista(req=>'/pedidos/'+encodeURIComponent(req.params.id),'pedido'));
  app.post('/pedidos/:id/estado',personal,async (req,res)=>{
    const id=encodeURIComponent(req.params.id);
    await llamado(req,'/pedidos/'+id+'/estado',{method:'PUT',body:req.body});
    res.redirect(303,'/pedidos/'+id);
  });

  for (const nombre of ['personal','compradores','tipos','especies','lotes']) {
    const ruta='/'+nombre, recurso=nombre==='personal'?ruta:'/catalogo'+ruta;
    const individual=req=>recurso+'/'+encodeURIComponent(req.params.id);
    app.get(ruta,personal,vista(recurso,'listado'));
    app.get(ruta+'/nuevo',personal,vista(recurso+'/nuevo','formulario'));
    app.get(ruta+'/:id/editar',personal,vista(individual,'formulario'));
    async function guardar(req,res) {
      try {
        const args=Buffer.isBuffer(req.body)?{raw:req.body,contentType:req.get('content-type')}:{body:req.body};
        const datos=await llamado(req,req.params.id?individual(req):recurso,{...args,method:req.method});
        if (datos.preview) res.cookie('correo_preview',datos.preview,{...cookieOptions,signed:true,maxAge:600000});
        res.redirect(303,ruta+'?aviso='+encodeURIComponent(datos.aviso));
      } catch(err) {
        if(err.status!==422 || !err.data?.cfg) throw err;
        res.status(422).render('formulario',err.data);
      }
    }
    app.post(ruta,personal,guardar);
    app.put(ruta+'/:id',personal,guardar);
    app.delete(ruta+'/:id',personal,async (req,res)=>{
      await llamado(req,individual(req),{method:'DELETE'});
      res.redirect(303,ruta+'?aviso=eliminado');
    });
  }
  app.post('/personal/:id/confirmacion',personal,async (req,res)=>{
    const datos=await llamado(req,'/personal/'+encodeURIComponent(req.params.id)+'/confirmacion',{method:'POST',body:{}});
    if(datos.preview)res.cookie('correo_preview',datos.preview,{...cookieOptions,signed:true,maxAge:600000});
    res.redirect(303,'/personal?aviso='+encodeURIComponent(datos.aviso));
  });

  app.use((req,res,next)=>next(Object.assign(new Error('La página que buscas no está disponible.'),{status:404})));
  app.use((err,req,res,next)=>{
    if(res.headersSent) return next(err);
    const status=err.status || 500;
    const texto=status===500?'No pudimos completar la operación.':err.message;
    if(status===500)console.error('Error Cliente:',err.name,err.message);
    if(req.path.startsWith('/proxy/') || req.path.startsWith('/direccion/') || ['/compra-confirmada','/tienda/inventario'].includes(req.path)) return res.status(status).json({error:texto});
    res.status(status).render('mensaje',{
      ...formato,apiPublica,csrfToken:'',user:null,periodo:resolverPeriodo(),currentPath:req.path,aviso:'', ...res.locals,
      title:status===404?'Página no encontrada':status===410?'Apartado vencido':'No se pudo completar',
      texto,enlace:req.usuario && req.usuario.rol!=='cliente'?'/admin':'/#catalogo',etiqueta:'Volver al inicio',
    });
  });
  return app;
}
