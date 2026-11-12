# Catálogo comercial de una lonja

## Investigación y adaptación

Una lonja organiza la venta por lotes identificados: especie, peso neto, cajas, precio y características comerciales. En España se usa habitualmente la subasta, aunque también existen acuerdos directos. El estudio de cadena de valor de sardina de MAPA describe pesaje y preparación de lotes para primera venta: https://www.mapa.gob.es/dam/mapa/contenido/estadisticas/temas/observatorio-de-precios-origen---destino-en-alimentacion/estudios/sardina_cpv.pdf. Mercapesca, como operador de subastas, muestra especie, calibre, presentación, cajas, kilos y precio: https://www.mercapesca.com/index.php?itemID=6. Estas referencias describen operación comercial; no se presentan como requisitos legales para Veracruz.

Para el proyecto se conserva la modalidad ya acordada: compra directa de lotes completos, precio fijo por kg, cobro sobre peso neto y disponibilidad controlada en MariaDB. No se añade un motor de subastas ni venta fraccionada.

Profeco distingue comercialmente pescado entero, filete y mariscos, y compara precios por kilogramo. Esto respalda separar la especie de la presentación: https://www.gob.mx/profeco/documentos/especial-de-precios-de-pescados-y-mariscos?state=published. Una tilapia no cambia de especie porque se venda en filete; un producto congelado no constituye una familia biológica diferente.

CONAPESCA menciona huachinango, pargo, jurel, pulpo, ostión, camarón, corvina, jaiba, lisa, robalo, sierra y tilapia entre productos aprovechados: https://www.gob.mx/conapesca/articulos/productos-acuicolas-y-de-mar-proveen-los-mismos-nutrientes. El informe estatal de Veracruz identifica mojarra y ostión entre sus productos pesqueros: https://www.veracruz.gob.mx/quintoinformedegobierno/wp-content/uploads/sites/33/2023/11/5toInforme_TomoIV.pdf. Se usan nombres comerciales de referencia; no se inventan nombres científicos para términos que pueden agrupar varias especies.

## Catálogo aplicado

Familias iniciales conservadas: Pescado, Crustáceos y Moluscos. Se añaden Moluscos bivalvos y Moluscos cefalópodos como opciones más específicas. Moluscos permanece como clasificación general compatible con registros anteriores. Gasterópodos y equinodermos quedan como plantillas opcionales, sin generar existencias ni afirmar que sean productos locales del negocio.

Especies iniciales conservadas: Huachinango, Robalo, Sierra, Camarón blanco y Langostino. Añadidas: Jurel, Lisa, Mojarra tilapia, Jaiba azul, Pulpo, Calamar, Ostión y Almeja, además de Corvina: 14 nombres en total. Se ofrecen otras plantillas editables para Pargo, Lebrancha, Acamaya, Camarón café y Jaiba prieta.

El administrador puede crear otros tipos o especies libremente. Las plantillas autocompletan datos editables, conservan identificadores de base consultados al abrir el formulario y evitan ofrecer como alta una opción ya registrada. Las especies sin foto real muestran un recurso neutral de fotografía pendiente; no se les asignan imágenes de otra especie.

## Ficha del lote

- Presentación: entero, eviscerado, filete, postas, pelado, con/sin cabeza, con/sin concha, limpio o texto propio.
- Conservación: refrigerado, congelado, vivo o descripción propia de la condición recibida.
- Talla/calibre: texto con unidad, por ejemplo gramos por pieza o conteo de camarón por libra. El sistema no convierte automáticamente escalas comerciales ni deduce talla a partir del peso total.
- Procedencia/proveedor: información declarada por el personal a partir del producto recibido.

Los datos son opcionales para registros anteriores, visibles al comprador y guardados con la compra para conservar su descripción histórica. No constituyen certificación sanitaria ni se infieren a partir de una fotografía. Los formularios permiten describir la mercancía; no sustituyen controles de recepción del negocio.

La ampliación no modifica existencias ni ventas. La base de demostración mantiene el equilibrio de disponibles/vendidos alcanzado en la revisión anterior.
