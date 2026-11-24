import { DataTypes as D } from 'sequelize';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
const pk = (type = D.INTEGER) => ({ type, primaryKey: true, autoIncrement: true });
const str = (n) => ({ type: D.STRING(n), allowNull: false });
export const Usuario = db.define('usuario', {
  id: pk(), comprador_id: { type:D.SMALLINT, allowNull:true, unique:true }, nombre: str(80), apellido: str(80), email: { ...str(80), unique: true, validate: { isEmail: true } },
  password: str(255), rol: { type: D.ENUM('admin', 'operador', 'cliente'), allowNull: false, defaultValue: 'operador' },
  confirmar: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
  token: { type: D.STRING(64), allowNull: true, unique: true },
}, { hooks: {
  beforeSave: async (u) => { if (u.changed('password')) u.password = await bcrypt.hash(u.password, 10); },
}, defaultScope: { attributes: { exclude: ['password', 'token'] } } });
export const Tipo = db.define('tipo', { id_tpo: pk(D.SMALLINT), nombre: { ...str(30), unique: true } });
export const Especie = db.define('especie', { id_epe: pk(), nombre: { ...str(25), unique: true }, imagen: str(100), descripcion: { type: D.STRING(1000), allowNull: false, defaultValue: '' } });
export const Comprador = db.define('comprador', {
  codigo_cpr: pk(D.SMALLINT), nombre: str(80), apellido_paterno: str(80), apellido_materno: str(80),
  telefono: { type: D.STRING(20), allowNull: true }, direccion: str(200), correo: { ...str(80), unique: true, validate: { isEmail: true } },
});
export const Lote = db.define('lote', {
  presentacion: { ...str(80), defaultValue:'' }, conservacion: { ...str(40), defaultValue:'' }, calibre: { ...str(80), defaultValue:'' }, procedencia: { ...str(160), defaultValue:'' },
  id_lte: pk(), kilos: { type: D.DECIMAL(10, 3), allowNull: false, validate: { min: 0.001 } },
  numero_cajas: { type: D.SMALLINT, allowNull: false, validate: { min: 1, max: 32767 } },
  precio_kilo_salida: { type: D.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  fecha: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
});
export const Apartado = db.define('apartado', {
  id: {type: D.UUID, primaryKey: true},
  lote_id: {type: D.INTEGER, allowNull: false, unique: true},
  usuario_id: {type: D.INTEGER, allowNull: false},
  vence: {type: D.DATE(3), allowNull: false},
}, {indexes: [{fields: ['vence']}]});
export const Compra = db.define('compra', {
  id_cmp: pk(), id_lte: { type: D.INTEGER, allowNull: false }, lote_vigente_id: { type: D.INTEGER, allowNull: true, unique: true }, estado: { type: D.STRING(15), allowNull: false, defaultValue: 'activa' }, detalle: { type: D.JSON, allowNull: true, get() { const value=this.getDataValue('detalle'); return typeof value==='string' ? JSON.parse(value) : value; } },
  precio_kilo_final: { type: D.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  precio_total: { type: D.DECIMAL(14, 2), allowNull: false, validate: { min: 0.01 } },
  fecha: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
});
// Client address book; each order still stores its own snapshot in pedido.datos_entrega.
export const Direccion = db.define('direccion', {
  id: pk(), etiqueta: str(40), calle: str(120), numero: str(30), cp: str(5), colonia: str(200),
  estado_id: str(2), estado: str(60), municipio_id: str(3), municipio: str(120),
  predeterminada: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
});
export const Pedido = db.define('pedido', {
  id: pk(), clave: { ...str(64), unique: true }, usuario_id: { type: D.INTEGER, allowNull: false }, codigo_cpr: { type: D.SMALLINT, allowNull: false },
  estado: { ...str(20), defaultValue: 'pendiente' }, fecha: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
  subtotal: { type: D.DECIMAL(14,2), allowNull: false }, envio: { type: D.DECIMAL(10,2), allowNull: false }, total: { type: D.DECIMAL(14,2), allowNull: false },
  entrega: str(15), datos_entrega: { type: D.JSON, allowNull: false }, metodo: str(15), referencia: str(80), marca: { type: D.STRING(20), allowNull: true }, ultimos: { type: D.STRING(4), allowNull: true }, motivo: { type: D.STRING(300), allowNull: true },
});
Compra.addHook('beforeValidate', c => { if (c.isNewRecord && c.lote_vigente_id === undefined) c.lote_vigente_id = c.id_lte; });
const relation = (parent, child, fk, alias, inverse) => {
  parent.hasMany(child, { foreignKey: { name: fk, allowNull: false }, as: alias, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  child.belongsTo(parent, { foreignKey: { name: fk, allowNull: false }, as: inverse, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
};
relation(Tipo, Especie, 'id_tpo', 'especies', 'tipo');
relation(Especie, Lote, 'id_epe', 'lotes', 'especie');
Lote.hasOne(Apartado, {foreignKey: 'lote_id', as: 'apartado', onDelete: 'CASCADE'});
Apartado.belongsTo(Lote, {foreignKey: 'lote_id', as: 'lote', onDelete: 'CASCADE'});
Apartado.belongsTo(Usuario, {foreignKey: 'usuario_id', onDelete: 'CASCADE'});
Lote.hasOne(Compra, { foreignKey: 'lote_vigente_id', as: 'compra', onDelete: 'RESTRICT' });
Compra.belongsTo(Lote, { foreignKey: { name: 'id_lte', allowNull: false }, as: 'lote', onDelete: 'RESTRICT' });
relation(Comprador, Compra, 'codigo_cpr', 'compras', 'comprador');
Usuario.hasMany(Compra, { foreignKey: {name:'usuario_id', allowNull:true}, as:'compras', onDelete:'RESTRICT' });
Compra.belongsTo(Usuario, { foreignKey: {name:'usuario_id', allowNull:true}, as:'usuario', onDelete:'RESTRICT' });
Comprador.hasOne(Usuario, { foreignKey: { name:'comprador_id', allowNull:true }, as:'cuenta', onDelete:'RESTRICT' });
Usuario.belongsTo(Comprador, { foreignKey: { name:'comprador_id', allowNull:true }, as:'comprador', onDelete:'RESTRICT' });
Comprador.hasMany(Direccion, { foreignKey: { name: 'codigo_cpr', allowNull: false }, as: 'direcciones', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Direccion.belongsTo(Comprador, { foreignKey: { name: 'codigo_cpr', allowNull: false }, as: 'comprador', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
relation(Usuario, Pedido, 'usuario_id', 'pedidos', 'usuario');
relation(Comprador, Pedido, 'codigo_cpr', 'pedidos', 'comprador');
Pedido.hasMany(Compra, { foreignKey: {name:'pedido_id',allowNull:true}, as:'compras', onDelete:'RESTRICT' });
Compra.belongsTo(Pedido, { foreignKey: {name:'pedido_id',allowNull:true}, as:'pedido', onDelete:'RESTRICT' });
export { db };
