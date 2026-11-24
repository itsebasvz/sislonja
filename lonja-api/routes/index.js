import { Router } from 'express';
import { limitarAcceso } from '../middleware/limite.js';
import { proteger, admin, soloCliente, soloPersonal, firmarToken, autenticar } from '../middleware/auth.js';
import { recibirFotografia } from '../middleware/fotografia.js';
import * as auth from '../controllers/authController.js';
import * as cat from '../controllers/catalogoController.js';
import * as venta from '../controllers/ventaController.js';
import * as tienda from '../controllers/tiendaController.js';
import { catalogos } from '../helpers/catalogos.js';
import { estadosMexico, municipiosEstado, buscarCodigoPostal } from '../helpers/direcciones.js';
import { csvCompras, reporteCompras } from '../helpers/reportes-cliente.js';
import { esId, esUuid } from '../helpers/validar.js';
import { error } from '../helpers/ventas.js';

const router = Router();
router.param('id', (req,res,next,id) => esId(id) ? next() : next(error('Identificador no válido.',400)));
router.param('apartadoId', (req,res,next,id) => esUuid(id) ? next() : next(error('Identificador de apartado no válido.',400)));
router.get('/', (_req, res) => res.json({mensaje: 'Lonja API', recursos: ['auth','lotes','apartados','pedidos','reportes']}));
router.post('/auth/login', limitarAcceso, auth.login);
router.post('/auth/register', limitarAcceso, tienda.registrar);
router.post('/auth/confirmacion/reenviar', limitarAcceso, tienda.reenviarCliente);
router.post('/auth/confirmacion/:token', auth.confirmar);
router.get('/lotes', tienda.stock);
router.get('/lotes/:id', async (req,res) => {
  const token = /^Bearer ([^ ]+)$/i.exec(req.get('authorization')||'')?.[1];
  req.usuario=(await autenticar(token))?.usuario;
  return tienda.detalle(req,res);
});
router.get('/postal/estados', (req,res) => res.json({estados:estadosMexico()}));
router.get('/postal/municipios/:estado', (req,res) => {
  const municipios = municipiosEstado(req.params.estado);
  if (!municipios) throw error('Estado no encontrado.',404);
  res.json({municipios});
});
router.get('/postal/codigos/:cp', (req,res) => {
  const datos = buscarCodigoPostal(req.params.cp);
  if (!datos) throw error('Código postal no encontrado. Revisa los cinco dígitos.',404);
  res.json(datos);
});

router.use(proteger);
router.get('/usuario/me', (req,res) => res.json({usuario:req.usuario}));
router.get('/usuario/socket-ticket', (req,res) => {
  const segundos = Math.max(1, req.sesion.exp - Math.floor(Date.now() / 1000));
  res.json({ticket:firmarToken(req.usuario,'lonja-socket',segundos)});
});
router.post('/lotes/:id/apartado', soloCliente, tienda.iniciarApartado);
router.get('/apartados/:apartadoId', soloCliente, tienda.finalizar);
router.delete('/apartados/:apartadoId', soloCliente, tienda.cancelarApartado);
router.post('/apartados/:apartadoId/pedido', soloCliente, tienda.comprar);
router.get('/mis-pedidos', soloCliente, tienda.pedidos);
router.get('/mis-pedidos/confirmacion', soloCliente, tienda.compraConfirmada);
router.get('/mis-pedidos/:id', soloCliente, tienda.verPedido);
router.get('/direcciones', soloCliente, tienda.direcciones);
router.post('/direcciones', soloCliente, tienda.agregarDireccion);
router.put('/direcciones/:id/predeterminada', soloCliente, tienda.marcarDireccion);
router.delete('/direcciones/:id', soloCliente, tienda.quitarDireccion);
router.get('/reportes/mis-compras', soloCliente, async (req,res) => {
  res.json(await reporteCompras(req.usuario, req.query));
});
router.get('/reportes/mis-compras.csv', soloCliente, async (req,res) => {
  const reporte = await reporteCompras(req.usuario, req.query);
  res.attachment(`compras-${reporte.periodo.tipo}-${reporte.periodo.referencia}.csv`).type('text/csv').send(csvCompras(reporte));
});
router.use(soloPersonal);
router.get('/admin', venta.inicio);
router.get('/ventas', venta.listado);
router.get('/reportes/ventas', venta.reporte);
router.get('/pedidos', tienda.pedidos);
router.get('/pedidos/:id', tienda.verPedido);
router.put('/pedidos/:id/estado', tienda.estado);
router.get('/personal', admin, auth.personal);
router.get('/personal/nuevo', admin, (req,res) => auth.personalForm(req,res));
router.get('/personal/:id', admin, (req,res) => auth.personalForm(req,res));
router.post('/personal', admin, auth.guardarPersonal);
router.put('/personal/:id', admin, auth.guardarPersonal);
router.post('/personal/:id/confirmacion', admin, auth.reenviar);
router.delete('/personal/:id', admin, auth.eliminarPersonal);
for (const [nombre,cfg] of Object.entries(catalogos)) {
  const base = '/catalogo/' + nombre;
  const configurar = cat.configurar(nombre);
  const guardar = cfg.admin ? [admin] : [];
  router.get(base, configurar, cat.listado);
  router.get(base + '/nuevo', ...guardar, configurar, (req,res) => cat.formulario(req,res));
  router.get(base + '/:id', ...guardar, configurar, (req,res) => cat.formulario(req,res));
  router.post(base, ...guardar, configurar, recibirFotografia, cat.guardar);
  router.put(base + '/:id', ...guardar, configurar, recibirFotografia, cat.guardar);
  router.delete(base + '/:id', ...guardar, configurar, cat.eliminar);
}
export default router;
