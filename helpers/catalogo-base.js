// Commercial families and common names; these are editable templates, not inventory.
export const tiposBase = [
 { nombre:'Pescado', descripcion:'Peces comercializados enteros, eviscerados, en filete o en postas.' },
 { nombre:'Crustáceos', descripcion:'Camarones, jaibas, langostinos y otros crustáceos.' },
 { nombre:'Moluscos', descripcion:'Familia general; utiliza un grupo más específico cuando lo conozcas.' },
 { nombre:'Moluscos bivalvos', descripcion:'Ostiones, almejas y mejillones; registrar la presentación del lote.' },
 { nombre:'Moluscos cefalópodos', descripcion:'Pulpos y calamares.' },
 { nombre:'Moluscos gasterópodos', descripcion:'Caracoles comercializados como producto pesquero.' },
 { nombre:'Equinodermos', descripcion:'Grupo para productos como erizos; añadir solo si el negocio los comercializa.' },
];
const especie=(clave,nombre,tipo,descripcion,imagen='/img/especies/sin-foto.svg')=>({clave,nombre,tipo,descripcion,imagen});
export const especiesBase = [
 especie('huachinango','Huachinango','Pescado','Pescado comercializado por peso. La presentación y talla se especifican en cada lote.','/img/especies/huachinango.jpg'),
 especie('robalo','Robalo','Pescado','Pescado de uso comercial; especifica presentación, conservación y talla en el lote.','/img/especies/robalo.jpg'),
 especie('sierra','Sierra','Pescado','Pescado comercializado entero o en cortes, según el lote.','/img/especies/sierra.jpg'),
 especie('camaron-blanco','Camarón blanco','Crustáceos','Indicar si lleva cabeza o está pelado. Si se usa calibre comercial, especificar piezas por libra o kilogramo.','/img/especies/camaron.jpg'),
 especie('langostino','Langostino','Crustáceos','Crustáceo comercializado por peso; indicar presentación y talla.','/img/especies/mariscos.jpg'),
 especie('jurel','Jurel','Pescado','Pescado comercial; se ofrece entero, eviscerado o en cortes según el lote.', '/img/especies/jurel.jpg'),
 especie('lisa','Lisa','Pescado','Pescado comercializado por peso; consultar presentación y procedencia del lote.', '/img/especies/lisa.jpg'),
 especie('tilapia','Mojarra tilapia','Pescado','Nombre comercial de tilapias. Puede ofrecerse entera o en filete; especificar la presentación y procedencia.', '/img/especies/tilapia.jpg'),
 especie('jaiba-azul','Jaiba azul','Crustáceos','Jaiba comercializada entera o como carne. Indicar conservación y presentación.', '/img/especies/jaiba-azul.jpg'),
 especie('pulpo','Pulpo','Moluscos cefalópodos','Molusco cefalópodo. Especificar si está entero o limpio y su condición de conservación.', '/img/especies/pulpo.jpg'),
 especie('calamar','Calamar','Moluscos cefalópodos','Molusco cefalópodo comercializado entero, limpio o en anillos, según el lote.', '/img/especies/calamar.jpg'),
 especie('ostion','Ostión','Moluscos bivalvos','Molusco bivalvo. Indicar si está con concha o desconchado y registrar su procedencia.', '/img/especies/ostion.jpg'),
 especie('almeja','Almeja','Moluscos bivalvos','Nombre comercial de distintos bivalvos. Precisar variedad, presentación y procedencia en el lote.', '/img/especies/almeja.jpg'),
 especie('corvina','Corvina','Pescado','Nombre comercial de diversos peces. Registrar presentación, talla y procedencia del producto recibido.', '/img/especies/corvina.jpg'),
 especie('pargo','Pargo','Pescado','Nombre comercial de diversos peces del grupo de los pargos; precisar el producto recibido.'),
 especie('lebrancha','Lebrancha','Pescado','Pescado comercial de ambientes costeros y lagunares; indicar procedencia del lote.'),
 especie('acamaya','Acamaya','Crustáceos','Crustáceo de agua dulce. Registrar procedencia y presentación comercial.'),
 especie('camaron-cafe','Camarón café','Crustáceos','Indicar presentación y calibre con su unidad de medida, según el lote.'),
 especie('jaiba-prieta','Jaiba prieta','Crustáceos','Crustáceo comercial. Especificar presentación y conservación del lote.'),
];
export const camposLote = [
 {name:'presentacion',label:'Presentación del producto',max:80,optional:true,suggestions:['Entero','Eviscerado','Filete','Postas','Con cabeza','Sin cabeza','Pelado','Con concha','Sin concha','Limpio','Anillos'],help:'Elige una sugerencia o escribe otra presentación. No cambia el peso neto del lote.'},
 {name:'conservacion',label:'Conservación',max:40,optional:true,suggestions:['Refrigerado','Congelado','Vivo'],help:'Registra la condición real del producto recibido.'},
 {name:'calibre',label:'Talla / calibre',max:80,optional:true,help:'Ejemplos: 500–800 g por pieza; camarón 21/25 piezas por libra. Incluye siempre la unidad.'},
 {name:'procedencia',label:'Procedencia / proveedor',max:160,optional:true,help:'Zona de captura o cultivo y/o proveedor, según la información disponible.'},
];
// Fictitious lot details for demo data only; real lots keep whatever staff captures.
const c=(presentacion,conservacion,calibre,procedencia)=>({presentacion,conservacion,calibre,procedencia});
export const caracteristicasDemo = {
 'Huachinango':[c('Entero','Refrigerado','600–900 g por pieza','Alvarado, Veracruz · Cooperativa Pescadores de Alvarado'),c('Eviscerado','Refrigerado','1–1.5 kg por pieza','Antón Lizardo, Veracruz'),c('Filete','Congelado','Filetes de 150–200 g','Tuxpan, Veracruz · Mariscos del Golfo')],
 'Robalo':[c('Entero','Refrigerado','1.5–2.5 kg por pieza','Laguna de Alvarado, Veracruz'),c('Filete','Refrigerado','Filetes de 200–300 g','Tecolutla, Veracruz'),c('Postas','Congelado','Postas de 2.5 cm','Coatzacoalcos, Veracruz · Pesquera del Sur')],
 'Sierra':[c('Entero','Refrigerado','800 g–1.2 kg por pieza','Boca del Río, Veracruz'),c('Postas','Refrigerado','Postas de 2 cm','Antón Lizardo, Veracruz'),c('Filete','Congelado','Filetes de 120–180 g','Tuxpan, Veracruz')],
 'Camarón blanco':[c('Con cabeza','Congelado','21/25 piezas por libra','Laguna de Tamiahua, Veracruz'),c('Pelado','Congelado','31/35 piezas por libra','Alvarado, Veracruz · Acuícola Papaloapan'),c('Sin cabeza','Refrigerado','16/20 piezas por libra','Tampico, Tamaulipas')],
 'Langostino':[c('Entero','Vivo','80–120 g por pieza','Río Papaloapan, Tlacotalpan'),c('Entero','Refrigerado','60–90 g por pieza','Laguna de Catemaco, Veracruz'),c('Sin cabeza','Congelado','U-10 piezas por libra','Cosamaloapan, Veracruz')],
 'Jurel':[c('Entero','Refrigerado','1–2 kg por pieza','Veracruz, Veracruz · Muelle de pescadores'),c('Eviscerado','Refrigerado','1.5–3 kg por pieza','Nautla, Veracruz')],
 'Lisa':[c('Entero','Refrigerado','400–700 g por pieza','Laguna de Mandinga, Veracruz'),c('Eviscerado','Refrigerado','500–800 g por pieza','Laguna de Alvarado, Veracruz')],
 'Mojarra tilapia':[c('Entero','Refrigerado','350–450 g por pieza','Granja acuícola, Medellín de Bravo'),c('Filete','Congelado','Filetes de 100–140 g','Acuícola Los Tuxtlas, San Andrés Tuxtla')],
 'Jaiba azul':[c('Entero','Vivo','12–15 cm de caparazón','Laguna de Tamiahua, Veracruz'),c('Pulpa','Refrigerado','Pulpa en bolsas de 1 kg','Laguna de Alvarado, Veracruz')],
 'Pulpo':[c('Entero','Congelado','1–2 kg por pieza','Arrecifes de Antón Lizardo, Veracruz'),c('Limpio','Refrigerado','800 g–1.5 kg por pieza','Campeche, Campeche')],
 'Calamar':[c('Limpio','Congelado','Tubos de 15–20 cm','Golfo de México · Pesquera de Tuxpan'),c('Anillos','Congelado','Anillos de 2–3 cm','Coatzacoalcos, Veracruz')],
 'Ostión':[c('Con concha','Vivo','8–10 cm por pieza','Laguna de Tamiahua, Veracruz'),c('Sin concha','Refrigerado','Frascos de 1 L, 40–50 piezas','Laguna de Pueblo Viejo, Veracruz')],
 'Almeja':[c('Con concha','Vivo','5–7 cm por pieza','Laguna de Mandinga, Veracruz'),c('Sin concha','Congelado','Pulpa en bolsas de 500 g','Laguna de Alvarado, Veracruz')],
 'Corvina':[c('Entero','Refrigerado','1–2 kg por pieza','Coatzacoalcos, Veracruz'),c('Filete','Refrigerado','Filetes de 180–250 g','Alvarado, Veracruz')],
};
export const caracteristicasLote = (especie,i=0)=>{const lista=caracteristicasDemo[especie];return lista?lista[i%lista.length]:c('Entero','Refrigerado','Talla comercial','Veracruz, Veracruz');};
