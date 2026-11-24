import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import rutas from './routes/index.js';
import { resolverPeriodo } from './helpers/periodos.js';

export function createApp() {
  if (!process.env.SC_JWT || process.env.SC_JWT.length < 32) throw new Error('Configura SC_JWT con al menos 32 caracteres.');
  const app = express();
  app.disable('x-powered-by');
  app.use('/img/especies/subidas', express.static(fileURLToPath(new URL('./public/img/especies/subidas/', import.meta.url)), {dotfiles:'ignore'}));
  app.use(express.json({limit:'32kb'}));
  app.get('/', (req,res) => res.json({mensaje:'Lonja API',api:'/api'}));
  app.use('/api', (req,res,next) => {
    res.set('Cache-Control','no-store');
    res.locals.periodo = resolverPeriodo(req.method==='GET' && ['/admin','/ventas','/reportes/ventas'].includes(req.path) ? req.query : {});
    next();
  }, rutas);
  app.use((req,res) => res.status(404).json({error:'Ruta no encontrada.'}));
  app.use((err,req,res,next) => {
    if (res.headersSent) return next(err);
    let status = err.status || 500;
    let mensaje = err.message;
    if (err.name==='SequelizeForeignKeyConstraintError') {status=409;mensaje='El registro está relacionado con otras operaciones.';}
    if (err.name==='SequelizeUniqueConstraintError') {status=409;mensaje='Ya existe un registro con esos datos.';}
    if (err.name==='SequelizeValidationError') {status=422;mensaje='Revisa los datos ingresados.';}
    if (err.type==='entity.too.large') mensaje='El tamaño del formulario o de la fotografía supera el límite.';
    if (status>=500) console.error('Error API:',err.name,err.message);
    res.status(status).json({error:status===500?'No pudimos completar la operación.':mensaje, ...(err.conflictos ? {conflictos:err.conflictos} : {})});
  });
  return app;
}
