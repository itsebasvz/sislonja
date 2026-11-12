# Sistema Lonja · Segundo parcial

Aplicación de Programación Web 2 para Lonja de Veracruz: tienda pública, cuentas de clientes, carrito, pedidos, pagos simulados, inventario por sockets y panel del personal. API REST y cliente separado quedan para el tercer parcial.

## Tecnologías

Node.js 20 o superior, JavaScript ES Modules, Express, EJS, Bootstrap local y CSS propio, Sequelize, MariaDB, dotenv, method-override, bcryptjs, Nodemailer, JWT, cookie-parser, express-validator y csurf, con Socket.IO como ampliación autorizada. Nodemon solo para desarrollo. No requiere compilación del frontend ni conexión a un CDN al navegar.

## Instalación en Linux

```bash
npm ci
cp .env.example .env
```

Configura `.env`: base, usuario, contraseña, host y puerto de MariaDB; `SC_JWT` con un secreto aleatorio de al menos 32 caracteres; correo y contraseña del administrador inicial. Puedes generar el secreto con:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### Base de datos

Con MariaDB ya instalado, crea una base y un usuario propios y coloca sus datos en `.env`. El nombre es configurable; por defecto es `sislonja`. El SQL siguiente es un ejemplo: sustituye la contraseña antes de ejecutarlo con una cuenta administradora de MariaDB.

```sql
CREATE DATABASE sislonja CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lonja'@'localhost' IDENTIFIED BY 'REEMPLAZAR';
GRANT ALL PRIVILEGES ON sislonja.* TO 'lonja'@'localhost';
```

Si MariaDB está instalado directamente, habitualmente se usa `BD_PORT=3306`. Para la instancia Docker opcional de este proyecto se usa `3308`.

```bash
npm run db:init
npm run db:demo
npm run db:catalogo
npm run db:tienda:demo
npm run cp:actualizar
npm start
```

`db:init` crea las tablas faltantes y el primer administrador; nunca borra datos ni cambia una contraseña existente. `db:demo` es opcional y solo admite datos comerciales vacíos. Carga 5 especies y 8 compradores, con 9 lotes iniciales, 4 ventas base y otras 7 ventas ficticias distribuidas en los últimos 42 días. Cada venta histórica tiene su propio lote. El comando no crea un operador confirmado: el administrador puede demostrar su alta y confirmación desde Personal.

Abre **http://localhost:2810** para la tienda. El panel del personal está en **/admin**, con su propio acceso: inicia sesión ahí con `ADMIN_EMAIL` y `ADMIN_PASSWORD` configurados. Los clientes entran en **/login** y crean su cuenta en **/registro** (botón *Registrar*); cada entrada rechaza las cuentas del otro tipo. Para desarrollar con reinicio automático: `npm run dev` o `npm run server`.

### MariaDB local opcional con Docker

Con Docker disponible, configura primero una contraseña de base en `.env` y ejecuta:

```bash
npm run db:local
npm run db:init
npm run db:demo
npm run db:catalogo
npm run db:tienda:demo
npm run cp:actualizar
npm start
```

Esto crea el contenedor propio `sislonja-mariadb` y el volumen `sislonja_data`, usando la imagen `mariadb:11.4`. Solo publica `127.0.0.1:3308`; no utiliza las bases de otros proyectos. Si el contenedor ya existe, lo inicia con su configuración original. Cambiar la contraseña en .env no cambia automáticamente la del volumen existente.

También se incluye `sql/estructura.sql`. Es una alternativa para crear las tablas en una base vacía; ejecuta después `npm run db:init` para crear el administrador. `sql/demostracion.sql` permite importar la misma demostración en una base comercial vacía, después del administrador. Elige el script npm o el SQL para cargar los datos, no ambos. Después ejecuta `npm run db:tienda:demo` para crear la cuenta y pedidos de tienda. El SQL de demostración no exporta las cuentas ni los pedidos de clientes.

## Confirmación por correo

Para una demostración sin Gmail ni dominio propio:

```bash
npm run mail:demo
npm start
```

El primer comando genera una cuenta SMTP de **Ethereal**, la guarda únicamente en `.env` y no imprime sus credenciales. Requiere internet. Si la app estaba abierta, reiníciala para cargar la cuenta.

1. Entra como administrador y abre Personal → Nuevo integrante.
2. Captura nombre, apellidos, correo y contraseña temporal de al menos 8 caracteres.
3. Tras guardar, usa **Abrir correo de confirmación** en Personal.
4. En el mensaje de Ethereal, abre el enlace de confirmación de la cuenta.
5. Inicia sesión con el correo y contraseña del nuevo operador.

Ethereal captura mensajes y permite verlos en navegador, **no los entrega a bandejas reales**. Para el personal, la vista previa se muestra al administrador durante diez minutos. El cliente recién registrado ve su propio enlace de vista previa en la pantalla de confirmación. Puede reenviarse desde el listado. Fuente: [documentación de Nodemailer](https://nodemailer.com/guides/testing-with-ethereal).

Para entrega real configura `CORREO_HOST`, `CORREO_PORT`, `CORREO_USER`, `CORREO_PASS` y opcionalmente `CORREO_FROM`; el puerto 465 utiliza conexión segura. `URL_BACKEND` debe coincidir con la dirección usada por quien confirma. Si falla el envío, la cuenta queda pendiente y se ofrece reenviar; no se confirma automáticamente.

## Tienda y permisos

- **Cliente:** explora sin cuenta y prepara el carrito. Para comprar se registra, confirma su correo e inicia sesión. Solo consulta sus propios pedidos.
- **Administrador:** gestiona personal, catálogos, lotes y compradores; atiende pedidos y puede cancelar pedidos pendientes o preparados.
- **Operador:** gestiona compradores y lotes, prepara y entrega pedidos y consulta reportes. No cancela pedidos ni gestiona personal.
- Se retiró la captura, edición y eliminación manual de ventas. Las ventas históricas siguen consultables.
- Precio fijo = kilos × precio de salida por kilo. Compra de lote completo, sin reservas en el carrito. Una transacción confirma todos los lotes o ninguno.
- Recogida gratis al siguiente día de 8 a 14 h, con dirección configurable mediante `DIRECCION_RECOGIDA`. Envío a toda la República Mexicana por $150 ficticios por pedido.
- Estados: pendiente → preparado → entregado. Cancelación solo por administrador antes de entregar; conserva el histórico, devuelve ficticiamente el total y libera los lotes.
- Socket.IO actualiza inventario y avisa de pedidos. Al reconectar se consulta nuevamente la disponibilidad.
- Reportes en MXN y día comercial de Ciudad de México. Excluyen compras canceladas y separan productos, envío y total cobrado.

### Datos de prueba

Después de `npm run db:tienda:demo`, usa **cliente@lonja.local / Cliente2026!** en `/login`. Esta cuenta de demostración viene confirmada y trae dos domicilios ficticios en su libreta; el registro público exige correo. El comando añade un lote a la venta por cada especie del catálogo y dos pedidos ficticios (preparado y cancelado), sin duplicarlos al repetirlo; ejecútalo después de `db:catalogo` para que aparezcan las 14 especies. Los lotes ficticios de `db:demo`, `db:historico` y `db:tienda:demo` traen presentación, conservación, talla/calibre y procedencia de ejemplo.

Tarjetas ficticias: Visa **4242 4242 4242 4242** o Mastercard **5555 5555 5555 4444**, vencimiento futuro MM/AA y CVV ficticio de tres dígitos. PayPal usa un diálogo local sin credenciales reales. El selector permite probar aprobación, rechazo y cancelación. No hay conexión con pasarelas ni cargos reales; no se persisten número completo ni CVV.

### Actualizar una instalación existente

Respaldar primero la base con `mariadb-dump`, detener la app, ejecutar `npm ci` y `npm run db:tienda`, después `npm run db:catalogo`, `npm run db:tienda:demo` opcional y `npm run cp:actualizar` antes de `npm start`. La migración es repetible y preserva los datos. `db:init` es para crear una instalación nueva; no sustituye esta migración.

## Fotografías de especies

En Especies → Nueva especie puedes seleccionar y subir una fotografía **JPG/JPEG, PNG, WebP o GIF de hasta 5 MB**. Se muestra una vista previa antes de guardar. Al editar, dejar el campo vacío conserva la foto actual; seleccionar otro archivo la reemplaza.

El servidor comprueba el tamaño, extensión, MIME y firma del archivo. Solo el administrador puede subir imágenes; los formularios mantienen CSRF. Las imágenes se guardan con nombres aleatorios en `public/img/especies/subidas`, y se limpia el archivo anterior al reemplazar o eliminar una especie si ya no está referenciado. Los archivos de ejecución no se versionan en Git; el paquete de entrega sí copia las fotografías locales presentes.

## Histórico y fechas

Pulsa la fecha y su flecha en la barra superior para abrir el calendario. Puedes elegir un día o un rango, introducir Desde/Hasta y usar Hoy, Ayer, Últimos 7 días o Últimos 30 días. Solo se admiten fechas hasta hoy; el día final se incluye completo.

El período actualiza las ventas, kilos e importe acumulado del inicio y permite continuar a Ventas y Reportes conservando las fechas. Los compradores del inicio cuentan clientes con compras en el período. Para consultas pasadas, «Lotes al cierre» representa los disponibles al final de ese período; el bloque «Disponibles ahora» sigue mostrando el inventario actual. El reporte se puede imprimir tanto por día como acumulado.

Para añadir datos ficticios al proyecto ya iniciado, sin borrar datos ni duplicar los movimientos del mismo día:

```bash
npm run db:historico
```

Crea hasta siete ventas repartidas en los 42 días anteriores, con tres compradores identificados como Demo y sus propios lotes. Las compras nuevas toman la fecha del servidor.

## Verificación

```bash
npm run check
npm test
npm run test:integration
```

Las pruebas de integración requieren la base propia del proyecto. Crean registros con identificadores de prueba y los eliminan al terminar; no vacían tablas. El correo de estas pruebas se captura mediante un receptor SMTP temporal en loopback, sin enviar a internet. Se verifican además compra simultánea, atomicidad de pedidos, reintentos, cancelación, reventa y aislamiento de clientes.

## Entrega

Primero revisar la aplicación en localhost. Tras incorporar correcciones:

```bash
npm run entrega
```

Copia el proyecto a la carpeta hermana `20` y crea `20.zip` con carpeta raíz `20`. Excluye secretos, node_modules, Git, temporales y fuentes PDF. El comando se niega a sobrescribir archivos ajenos que no formen parte de una entrega previa generada por él. Si haces correcciones posteriores, ejecútalo de nuevo para actualizar el paquete.

Después de extraer el ZIP, seguir esta instalación desde `npm ci`. No se incluye `.env` real: cada evaluador configura su base, administrador y SMTP o genera su propia cuenta Ethereal.

Más información: [guía técnica y decisiones](docs/GUIA_TECNICA.md).

## Catálogo comercial

`npm run db:catalogo` añade, sin sobrescribir datos, las familias bivalvos/cefalópodos y especies de referencia hasta completar 5 tipos y 14 especies en la demostración. Es repetible y no crea inventario. Ejecutarlo también al actualizar una instalación existente: incorpora los campos opcionales del lote.

En Tipos y Especies → Nuevo puedes elegir una plantilla editable o capturar libremente. Las sugerencias ya registradas se muestran deshabilitadas para evitar duplicarlas. Quedan sugerencias adicionales como gasterópodos, pargo, lebrancha y acamaya. Puedes añadir una categoría propia con cualquier nombre válido.

Los nuevos nombres sin fotografía usan una imagen neutral «Fotografía por añadir», que puede reemplazarse al editar. Una especie libre requiere subir foto; una plantilla puede utilizar su imagen de referencia o una fotografía propia. La descripción admite varias líneas.

Cada lote admite presentación (entero, filete, con cabeza, etc.), conservación, talla/calibre con unidad y procedencia/proveedor. Presentación y conservación ofrecen sugerencias y permiten texto libre. Estos datos son opcionales para conservar los registros anteriores, aparecen en la tienda y se guardan al comprar. Las cajas son embalaje; el precio se calcula sobre el peso neto total. No se atribuyen características desconocidas a los lotes ya existentes.

Investigación y criterios: [Catálogo de una lonja](docs/CATALOGO_LONJA.md).

## Cuenta del cliente y libreta de direcciones

El registro pide nombre, apellidos, teléfono, correo y contraseña, y opcionalmente un domicilio de entrega validado contra el catálogo postal. Cada cliente guarda hasta 10 domicilios en **/mis-direcciones** (uno predeterminado). Al finalizar una compra:

- Si tiene domicilios guardados, la entrega por envío viene seleccionada con el predeterminado; puede elegir otro o capturar uno nuevo y guardarlo en la libreta.
- El teléfono de contacto y el nombre en la tarjeta de prueba se precargan desde la cuenta.
- Cada pedido guarda una copia del domicilio usado, así que editar o eliminar la libreta no altera pedidos anteriores.

En una instalación existente, `npm run db:tienda` crea la tabla `direccion`.

## Dirección y envío nacional

El checkout permite enviar a los 32 estados. El código postal completa estado y municipio/alcaldía; si solo hay una colonia se selecciona, y si hay varias, se pide elegir una. Los estados y municipios también se pueden explorar desde sus listas. El servidor valida que CP, estado, municipio y colonia correspondan antes de confirmar el pedido. Mantiene ceros iniciales, por ejemplo `06300`.

El catálogo oficial se descarga para uso local durante la instalación con `npm run cp:actualizar` (requiere internet). Después las consultas son locales, sin cuentas, claves API ni llamadas a un proveedor externo con la dirección del cliente. Si ya descargaste el TXT o ZIP desde Correos de México: `npm run cp:actualizar -- /ruta/CPdescarga.txt` o la ruta del ZIP. El comando comprueba cobertura nacional antes de reemplazar el archivo.

El archivo local no se versiona ni se incluye en `20.zip`: quien instala descarga su propia copia con el comando anterior. Repetirlo permite renovar el catálogo. Fuente y condiciones: https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx. Investigación e implementación: [Direcciones mexicanas](docs/DIRECCIONES_MEXICO.md).

El costo de envío se mantiene en $150 MXN **ficticios** por pedido; no hay contratación ni cotización de paquetería real. PayPal no muestra el selector de resultado: su autorización ficticia siempre se considera aprobada.
