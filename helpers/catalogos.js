import { Tipo, Especie, Comprador, Lote } from '../models/index.js';
import {camposLote} from './catalogo-base.js';
export const catalogos = {
  tipos: { model: Tipo, pk: 'id_tpo', title: 'Tipos', singular: 'tipo', subtitle: 'Organiza las familias de producto de la lonja.', admin: true,
    fields: [{ name: 'nombre', label: 'Nombre del tipo', max: 30 }], columns: ['Código', 'Nombre'] },
  especies: { model: Especie, pk: 'id_epe', title: 'Especies', singular: 'especie', femenino: true, subtitle: 'Los productos que dan vida a nuestra lonja.', admin: true,
    include: ['tipo'], fields: [{ name: 'nombre', label: 'Nombre de la especie', max: 25 }, { name: 'id_tpo', label: 'Tipo', type: 'select' }, { name: 'descripcion', label: 'Descripción del producto', max: 1000, optional: true }, { name: 'imagen', label: 'Fotografía', type: 'file' }], columns: ['Especie', 'Tipo'] },
  compradores: { model: Comprador, pk: 'codigo_cpr', title: 'Compradores', singular: 'comprador', subtitle: 'Conoce a quienes confían en nuestros productos.',
    fields: [{ name: 'nombre', label: 'Nombre', max: 80 }, { name: 'apellido_paterno', label: 'Apellido paterno', max: 80 }, { name: 'apellido_materno', label: 'Apellido materno', max: 80, optional: true }, { name: 'correo', label: 'Correo electrónico', type: 'email', max: 80 }, { name: 'direccion', label: 'Dirección', max: 200 }], columns: ['Comprador', 'Correo electrónico', 'Dirección'] },
  lotes: { model: Lote, pk: 'id_lte', title: 'Lotes', singular: 'lote', subtitle: 'De la recepción a la venta, cada lote bajo control.', include: [{ association: 'especie', include: ['tipo'] }, 'compra'],
    fields: [{ name: 'id_epe', label: 'Especie', type: 'select' }, { name: 'kilos', label: 'Peso neto total (kg)', type: 'number', step: '0.001', min: '0.001', max: '9999999.999' }, { name: 'numero_cajas', label: 'Número de cajas', type: 'number', step: '1', min: '1', max: '32767' }, { name: 'precio_kilo_salida', label: 'Precio de venta por kg (MXN)', type: 'number', step: '0.01', min: '0.01', max: '99999999.99' }, ...camposLote], columns: ['Lote / especie', 'Peso y cajas', 'Precio / kg', 'Recepción', 'Estado'] },
};
