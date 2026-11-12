import {tiposBase,especiesBase} from '../helpers/catalogo-base.js';
import { avisarInventario } from '../helpers/socket.js';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { catalogos } from '../helpers/catalogos.js';
import { Tipo, Especie, Lote } from '../models/index.js';
import { validarFotografia, guardarFotografia, borrarFotografia } from '../helpers/fotografias.js';
export function configurar(section) { return (req, res, next) => { req.section = section; req.cfg = catalogos[section]; next(); }; }
export async function listado(req, res) {
  const { cfg, section } = req;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  const estado = ['disponible', 'vendido'].includes(req.query.estado) ? req.query.estado : '';
  const where = {};
  if (q && section !== 'lotes') where[Op.or] = (section === 'compradores' ? ['nombre', 'apellido_paterno', 'apellido_materno', 'correo'] : ['nombre']).map(name => ({ [name]: { [Op.like]: `%${q}%` } }));
  let rows = await cfg.model.findAll({ where, include: cfg.include || [], order: [[cfg.pk, 'DESC']] });
  if (section === 'lotes') {
    if (q) rows = rows.filter(l => `${l.id_lte} ${l.especie.nombre}`.toLowerCase().includes(q.toLowerCase()));
    if (estado) rows = rows.filter(l => estado === 'vendido' ? !!l.compra : !l.compra);
  }
  res.render('listado', { title: cfg.title, subtitle: cfg.subtitle, section, cfg, rows, q, estado, editable: !cfg.admin || req.usuario.rol === 'admin', tiposBase });
}
async function opciones(section) {
  if (section === 'especies') return { id_tpo: (await Tipo.findAll({ order: [['nombre', 'ASC']] })).map(t => ({ value: t.id_tpo, label: t.nombre })) };
  if (section === 'lotes') return { id_epe: (await Especie.findAll({ order: [['nombre', 'ASC']] })).map(e => ({ value: e.id_epe, label: e.nombre })) };
  return {};
}
export async function formulario(req, res, values, errors = []) {
  const { cfg, section } = req;
  const item = values || (req.params.id ? await cfg.model.findByPk(req.params.id) : {});
  if (!item) throw Object.assign(new Error('No encontramos este registro.'), { status: 404 });
  if (section === 'lotes' && req.params.id && await item.getCompra?.()) throw Object.assign(new Error('Un lote vendido no se puede modificar.'), { status: 409 });
  let sugerencias=[];
  if (!req.params.id && ['tipos','especies'].includes(section)) {
    const tipos=await Tipo.findAll();const existentes=section==='tipos'?tipos:await Especie.findAll();
    sugerencias=(section==='tipos'?tiposBase.map(t=>({...t,clave:t.nombre})):especiesBase).map(p=>({...p,tipoId:tipos.find(t=>t.nombre===p.tipo)?.id_tpo||'',existe:existentes.some(e=>e.nombre.toLocaleLowerCase()===p.nombre.toLocaleLowerCase())}));
  }
  res.status(errors.length ? 422 : 200).render('formulario', { title: `${req.params.id ? 'Editar' : cfg.femenino ? 'Nueva' : 'Nuevo'} ${cfg.singular}`, section, cfg, item, errors, options: await opciones(section), editing: !!req.params.id, sugerencias });
}
export async function guardar(req, res) {
  const { cfg, section } = req;
  for (const field of cfg.fields) {
    if (field.type === 'file') continue;
    let rule = body(field.name);
    if (field.type === 'number') {
      const decimals = field.step === '0.001' ? 3 : field.step === '1' ? 0 : 2;
      rule = rule.isString().matches(decimals ? new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`) : /^\d+$/).isFloat({ min: Number(field.min), max: Number(field.max) });
    } else if (field.type === 'select') {
      rule = rule.isInt({ min: 1 });
    } else {
      rule = rule.trim();
      if (!field.optional) rule = rule.notEmpty();
      rule = rule.isLength({ max: field.max });
      if (field.type === 'email') rule = rule.isEmail();
    }
    await rule.withMessage(`Revisa el campo ${field.label.toLowerCase()}.`).run(req);
  }
  const values = Object.fromEntries(cfg.fields.map(f => [f.name, req.body[f.name]]));
  if (section === 'compradores' && typeof values.correo === 'string') values.correo = values.correo.toLowerCase();
  const errors = validationResult(req).array().map(e => e.msg);
  if(['tipos','especies'].includes(section))values.preset=typeof req.body.preset==='string'?req.body.preset:'';
  const preset=section==='especies'&&!req.params.id?especiesBase.find(p=>p.clave===values.preset):null;
  if(section==='especies'&&values.preset&&!req.params.id&&!preset)errors.push('Selecciona una sugerencia válida o captura una especie libre.');
  if (section === 'especies' && !await Tipo.findByPk(Number(values.id_tpo) || 0)) errors.push('Selecciona un tipo existente.');
  if (section === 'lotes' && !await Especie.findByPk(Number(values.id_epe) || 0)) errors.push('Selecciona una especie existente.');
  let foto, anterior;
  if (section === 'especies') {
    anterior = req.params.id ? await Especie.findByPk(req.params.id) : null;
    if (req.params.id && !anterior) throw Object.assign(new Error('No encontramos esta especie.'), { status: 404 });
    values.imagen = anterior?.imagen || preset?.imagen || '';
    if (req.fotografiaError) errors.push(req.fotografiaError);
    if (req.fotografia) {
      try { foto = await validarFotografia(req.fotografia); } catch (err) { errors.push(err.message); }
    } else if (!anterior && !preset) errors.push('Selecciona una fotografía para la especie.');
  }
  if (errors.length) return formulario(req, res, { ...values, [cfg.pk]: req.params.id }, errors);
  let nuevaImagen;
  try {
    if (foto) { nuevaImagen = await guardarFotografia(foto); values.imagen = nuevaImagen; }
    if (req.params.id) {
      if (section === 'lotes') {
        await Lote.sequelize.transaction(async transaction => {
          const item = await Lote.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
          if (!item) throw Object.assign(new Error('No encontramos este lote.'), { status: 404 });
          if (await item.getCompra({ transaction })) throw Object.assign(new Error('Un lote vendido no se puede modificar.'), { status: 409 });
          await item.update(values, { transaction });
        });
      } else {
        const item = await cfg.model.findByPk(req.params.id);
        if (!item) throw Object.assign(new Error('No encontramos este registro.'), { status: 404 });
        await item.update(values);
      }
    } else await cfg.model.create(values);
  } catch (err) {
    if (nuevaImagen) { await borrarFotografia(nuevaImagen); values.imagen = anterior?.imagen || preset?.imagen || ''; }
    if (err.name === 'SequelizeUniqueConstraintError') return formulario(req, res, { ...values, [cfg.pk]: req.params.id }, ['Ya existe un registro con ese nombre o correo.']);
    throw err;
  }
  if (nuevaImagen && anterior?.imagen && !await Especie.count({ where: { imagen: anterior.imagen } })) await borrarFotografia(anterior.imagen);
  avisarInventario();
  res.redirect(`/${section}?aviso=guardado`);
}
export async function eliminar(req, res) {
  const item = await req.cfg.model.findByPk(req.params.id);
  if (!item) throw Object.assign(new Error('No encontramos este registro.'), { status: 404 });
  await item.destroy();
  if (req.section === 'especies' && !await Especie.count({ where: { imagen: item.imagen } })) await borrarFotografia(item.imagen);
  avisarInventario();
  res.redirect(`/${req.section}?aviso=eliminado`);
}
