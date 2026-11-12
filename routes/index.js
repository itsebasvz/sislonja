import {buscarCodigoPostal,municipiosEstado} from '../helpers/direcciones.js';
import { limitarAcceso } from '../middleware/limite.js';
import {creditosFotos} from '../helpers/creditos-fotos.js';
import { Router } from 'express';
import { proteger, admin } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as cat from '../controllers/catalogoController.js';
import * as venta from '../controllers/ventaController.js';
import * as tienda from '../controllers/tiendaController.js';
import { soloPersonal, soloCliente } from '../middleware/auth.js';
import { catalogos } from '../helpers/catalogos.js';
const router = Router();
router.get('/', tienda.portada);
router.get('/creditos', (req,res)=>res.render('tienda/creditos',{title:'Créditos de fotografía',creditosFotos}));
router.get('/tienda/inventario', tienda.stock);
router.get('/tienda/lotes/:id', tienda.detalle);
router.get('/carrito', tienda.carrito);
router.get('/direccion/municipios/:estado',(req,res)=>{const municipios=/^\d{2}$/.test(req.params.estado)?municipiosEstado(req.params.estado):null;if(!municipios)return res.status(404).json({error:'Estado no encontrado.'});res.json({municipios});});
router.get('/direccion/codigo-postal/:cp',(req,res)=>{const datos=buscarCodigoPostal(req.params.cp);if(!datos)return res.status(404).json({error:'Código postal no encontrado. Revisa los cinco dígitos.'});res.json(datos);});
router.get('/registro', tienda.registro);
router.post('/registro', limitarAcceso, tienda.registrar);
// Former client entry; kept so old links and bookmarks still land on the client login.
router.get('/acceder', (req,res)=>res.redirect(301, '/login' + (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '')));
router.post('/acceder', (req,res)=>res.redirect(308, '/login'));
router.post('/registro/reenviar', limitarAcceso, tienda.reenviarCliente);
router.get('/finalizar', tienda.finalizar);
router.get('/compra-confirmada', tienda.compraConfirmada);
router.post('/comprar', tienda.comprar);
router.get('/login', auth.loginForm('cliente'));
router.post('/login', limitarAcceso, auth.login);
router.get('/admin', (req,res,next)=>req.usuario ? next() : auth.loginForm('personal')(req,res));
router.post('/admin/login', auth.login);
router.get('/confirmar/:token', auth.confirmar);
router.use(proteger);
router.post('/cerrar-sesion', auth.logout);
router.get('/mis-pedidos', soloCliente, tienda.pedidos);
router.get('/mis-pedidos/:id', soloCliente, tienda.verPedido);
router.get('/mis-direcciones', soloCliente, (req,res)=>tienda.direcciones(req,res));
router.post('/mis-direcciones', soloCliente, tienda.agregarDireccion);
router.post('/mis-direcciones/:id/predeterminada', soloCliente, tienda.marcarDireccion);
router.delete('/mis-direcciones/:id', soloCliente, tienda.quitarDireccion);
router.use(soloPersonal);
router.get('/pedidos', tienda.pedidos);
router.get('/pedidos/:id', tienda.verPedido);
router.post('/pedidos/:id/estado', tienda.estado);
router.get('/inicio', (req,res) => res.redirect(308, '/admin' + req.originalUrl.slice('/inicio'.length)));
router.get('/admin', venta.inicio);
router.get('/personal', admin, auth.personal);
router.get('/personal/nuevo', admin, (req, res) => auth.personalForm(req, res));
router.post('/personal', admin, auth.guardarPersonal);
router.get('/personal/:id/editar', admin, (req, res) => auth.personalForm(req, res));
router.put('/personal/:id', admin, auth.guardarPersonal);
router.post('/personal/:id/confirmacion', admin, auth.reenviar);
router.delete('/personal/:id', admin, auth.eliminarPersonal);
for (const [name, cfg] of Object.entries(catalogos)) {
  const r = Router();
  r.use(cat.configurar(name));
  r.get('/', cat.listado);
  if (cfg.admin) r.use(admin);
  r.get('/nuevo', (req, res) => cat.formulario(req, res));
  r.post('/', cat.guardar);
  r.get('/:id/editar', (req, res) => cat.formulario(req, res));
  r.put('/:id', cat.guardar);
  r.delete('/:id', cat.eliminar);
  router.use(`/${name}`, r);
}
router.get('/ventas', venta.listado);





router.get('/reportes', venta.reporte);
export default router;
