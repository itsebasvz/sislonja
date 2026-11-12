# Guía técnica · Sistema Lonja con tienda

El segundo parcial conserva Express/EJS, Sequelize/MariaDB, formularios y CRUD, correo de confirmación y JWT. Se añadió Socket.IO por solicitud explícita del usuario. La API REST de propósito general y el cliente separado quedan para el tercero. El frontend usa DESIGN.md: fotografía, blanco/gris, tarjetas redondeadas, acento violeta, sin compilación.

## Arranque y actualización

Instalación nueva: `npm ci`, configurar `.env`, `npm run db:init`, `npm run db:demo`, `npm run db:tienda:demo`, `npm run db:catalogo`, `npm run cp:actualizar`, `npm start`. Base propia en MariaDB; Docker opcional mediante `db:local`. Consultar README para configuración.

Instalación anterior: respaldar la base y detener el servidor, `npm ci`, `npm run db:tienda`, `npm run db:catalogo`, `npm run db:tienda:demo` opcional, reiniciar. La migración amplía roles/campos, crea Pedido y permite historial de reventa; no borra tablas. No usa `sync({force:true})` ni `sync({alter:true})`. DDL en MariaDB no es atómico: conservar respaldo antes de migrar. Repetir el comando continúa sobre columnas ya presentes.

## Modelo y reglas

Usuario conserva personal y añade rol cliente, vinculado a Comprador. Las credenciales siguen separadas de los datos comerciales. Un comprador histórico se vincula por correo, y el usuario debe confirmarlo antes de acceder; el registro no sobrescribe su identidad comercial.

Pedido agrupa Compra (un lote completo por fila), conserva importes y datos de entrega al comprar y registra pago simulado. Compra mantiene `id_lte` histórico y una referencia `lote_vigente_id` única y nullable que garantiza una sola venta vigente. El alias `Lote.compra` representa esa venta vigente. Cancelar anula sus compras y libera sus referencias, sin borrar la historia. El capturista es nullable para compras web; las antiguas ventas conservan su empleado.

La confirmación bloquea los lotes ordenados por id en una transacción. Recalcula precios y envío, comprueba todos los lotes y exige revisar el pedido si cambió un precio. La clave única del pedido evita duplicados y permite recuperar una confirmación cuya respuesta se perdió. El carrito local solo guarda identificadores, hasta 30 lotes, sin reservas.

Entrega nacional: los 32 estados de México, $150 MXN ficticios por pedido. Recogida: gratis al siguiente día, 8 a 14 h. La dirección local de demostración se configura en `.env`. Sin RFC, facturación, cupones ni impuestos adicionales. Pago ficticio local, sin pasarela; solo marca, últimos cuatro dígitos y referencia de prueba en base, nunca PAN ni CVV. Estados pendiente → preparado → entregado; solo admin cancela antes de entregar con motivo y devolución ficticia completa.

## HTTP y sockets

La vista general del personal está en `/admin`; `/inicio` redirige a esa ruta conservando el período. La raíz siempre muestra la tienda.

Páginas públicas: `/`, `/tienda/lotes/:id`, `/carrito`, `/registro`, `/login` (clientes; `/acceder` redirige aquí). El personal inicia sesión en `/admin` (formulario propio, `POST /admin/login`). `/finalizar` requiere cliente confirmado. `/mis-pedidos`, `/mis-pedidos/:id` y `/mis-direcciones` aíslan por propietario. `/pedidos` y `/pedidos/:id` son del personal. POST `/pedidos/:id/estado` valida transición y rol.

GET `/tienda/inventario` sirve el catálogo público para actualizar la interfaz. POST `/comprar` recibe clave, lotes/precios revisados, entrega, dirección, teléfono, método y resultado ficticio; responde con la ruta del pedido o error. GET `/compra-confirmada?clave=...` permite recuperar únicamente una compra del cliente autenticado. Son acciones internas de la app EJS, sin cliente separado.

Socket.IO usa el servidor HTTP local y sirve su cliente desde `/socket.io/socket.io.js`. Evento público `inventario:cambio` invalida el catálogo sin transmitir datos privados. Evento `pedido:cambio` va solo al personal y al propietario, en salas autenticadas con JWT/cookie. No se compran lotes mediante eventos del navegador. Se emite después del commit; al conectar/reconectar se consulta el inventario actual. Sin Redis, colas ni servidores adicionales: una instancia para la entrega.

JWT firmado HS256 con cookie httpOnly; CSRF en formularios y fetch; controles de roles consultados en base. Registro y acceso público con límite básico de intentos. Datos renderizados escapados; ningún evento público contiene datos de cliente. El servidor se enlaza a loopback para revisión local.

## Panel y reportes

Personal administra lotes, fotografías, especies, tipos y compradores; atiende pedidos y consulta ventas/reportes. Se retiraron las rutas y botones de captura, edición y eliminación manual de ventas. Se conserva el histórico. Ventas/reportes excluyen canceladas; el reporte separa productos, envío y total cobrado. Fechas según Ciudad de México. Los avisos de nuevos pedidos llegan sin recargar; el inventario de lotes se actualiza al recibir cambios.

Fotografías JPG/JPEG, PNG, WebP o GIF de hasta 5 MB, con comprobación de extensión/MIME/firma, vista previa y limpieza al reemplazar. Solo admin carga fotos. Archivos locales incluidos al empaquetar, aunque no se versionan las cargas de ejecución.

## Demostración y comprobaciones

`db:demo` añade la base histórica (7 compras en 42 días más las ventas iniciales). `db:tienda:demo` añade seis lotes, una cuenta confirmada `cliente@lonja.local / Cliente2026!` y pedidos preparado/cancelado. Es repetible. El registro público sí exige confirmación. Ethereal captura correo de prueba sin entrega a bandejas reales; cada registrante puede abrir la vista previa de su mensaje.

`npm run check`, `npm test`, `npm run test:integration`. Las integraciones crean y limpian sus propios registros, sin vaciar tablas. Incluyen concurrencia, precios de servidor, pedido completo, idempotencia, cancelación/reventa, CSRF y permisos, además de la cobertura previa de fotos, correo y calendario. La revisión de navegador comprueba Socket.IO entre sesiones, tarjeta/PayPal, registro y móvil. Playwright se usa fuera de las dependencias de entrega.

`db:export` exporta estructura y datos ficticios base sin credenciales ni pedidos de clientes; `db:tienda:demo` recrea los ejemplos de tienda. La revisión es en localhost antes de generar `20` y `20.zip` con `npm run entrega`; el paquete excluye `.env`, node_modules, Git y respaldos.

## Recursos gráficos

PayPal: https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-color.svg (archivo local sin modificar).

Visa y Mastercard: archivos de marcas del paquete gráfico público https://github.com/aaronfagan/svg-credit-card-payment-icons/tree/main/flat, almacenados sin modificar. Sus centros oficiales de referencia: https://corporate.visa.com/en/about-visa/brand.html y https://www.mastercard.com/brandcenter/us/en/download-artwork.html. Se usan para identificar el pago ficticio, sin afirmar una integración real.

Fotos originales de pescado genérico/camarón/langostino: Unsplash, identificadores `photo-1510130387422-82bed34b37e9`, `photo-1565680018434-b513d5e5fd47`, `photo-1559737558-2f5a35f4523b`. Huachinango: https://commons.wikimedia.org/wiki/File:Lutjanus_campechanus.jpg; robalo: https://commons.wikimedia.org/wiki/File:Centropomus_undecimalis.jpg; sierra: https://commons.wikimedia.org/wiki/File:Fish4436_-_Flickr_-_NOAA_Photo_Library.jpg. Archivos locales existentes conservados.

## Catálogo comercial ampliado

`db:catalogo` agrega cuatro columnas de lote (presentacion, conservacion, calibre y procedencia), con cadenas vacías como valor desconocido. La migración no atribuye datos nuevos a ventas antiguas. Añade tipos y especies de referencia con findOrCreate; no sobrescribe fotos ni clasificaciones existentes ni crea lotes. Los templates se definen en helpers/catalogo-base.js y se aplican en servidor por clave conocida, nunca mediante una ruta de imagen enviada por el navegador. La fotografía libre mantiene sus validaciones y límite de 5 MB. Las columnas adicionales se conservan en el snapshot JSON de Compra y se presentan en el detalle del pedido. Ver CATALOGO_LONJA.md para investigación, fuentes y decisiones de clasificación.
