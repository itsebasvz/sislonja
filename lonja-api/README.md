# Lonja API

API REST de Sistema Lonja para Node.js 22 y MariaDB. Utiliza Express, Sequelize, dotenv, bcryptjs, JWT, Nodemailer y Socket.IO. Nodemon está disponible para desarrollo.

## Configuración

Ejecuta en esta carpeta.

```sh
npm ci
cp .env.example .env
```

En `.env`, configura el acceso a MariaDB, genera un secreto aleatorio de al menos 32 caracteres para `SC_JWT` y elige las credenciales de la cuenta inicial del personal. `CLIENTE_ORIGEN` y `URL_BACKEND` deben apuntar al Cliente, por defecto `http://localhost:3000`. Los correos de registro requieren SMTP. Para hacer una demostración con un buzón de prueba, ejecuta `npm run mail:demo` y accede al enlace de vista previa que muestra la aplicación.

Para una base vacía, crea una base `sislonja_p3` de MariaDB y concede al usuario configurado los permisos sobre esa base. Si usas Docker, `npm run db:local` crea o arranca una instancia del proyecto en `127.0.0.1:3309`. Ejecuta después:

```sh
npm run db:init
npm run cp:actualizar
npm run db:demo
npm run db:catalogo
npm run db:tienda:demo
npm start
```

`db:demo`, `db:catalogo` y `db:tienda:demo` cargan el catálogo, operaciones y cuentas ficticias. La cuenta cliente es `cliente@lonja.local` con contraseña `Cliente2026!`. El catálogo oficial de Correos de México se descarga con `cp:actualizar` y se consulta localmente. Si ya tienes una copia oficial, puedes pasar el TXT o ZIP como argumento.

`sql/estructura.sql` y `sql/demostracion.sql` son una alternativa para preparar una base vacía. Importa la estructura, ejecuta `db:init` para crear al administrador, importa los datos y ejecuta `db:tienda:demo` tras descargar SEPOMEX. Los pedidos y las cuentas de demostración se crean con ese último comando.

Para llevar una instalación del segundo parcial al tercero, respalda la base anterior e importa el respaldo en una base separada. Configura esa copia en `.env` y ejecuta `db:init`. La inicialización añade la tabla `apartado` y conserva las filas y columnas existentes. Si tu copia es anterior a las últimas migraciones del segundo parcial, ejecuta primero `db:tienda` y `db:catalogo`. Copia también las fotos subidas a `public/img/especies/subidas/` si existen.

## Recursos

| Ruta | Operación |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/usuario/me` | Acceso, registro y perfil |
| `GET /api/lotes`, `GET /api/lotes/:id` | Catálogo y estado del lote |
| `POST /api/lotes/:id/apartado` | Apartar o reanudar |
| `GET /api/apartados/:id`, `DELETE /api/apartados/:id`, `POST /api/apartados/:id/pedido` | Consultar, liberar o confirmar |
| `GET /api/mis-pedidos`, `GET /api/mis-pedidos/:id` | Historial y pedido del comprador |
| `GET /api/reportes/mis-compras[.csv]?periodo=dia&fecha=AAAA-MM-DD` | Resumen JSON o descarga personal en CSV. Semana y mes usan `semana` y `mes` |
| `/api/catalogo/:recurso`, `/api/personal`, `/api/pedidos`, `GET /api/reportes/ventas` | Operaciones del personal |

Las rutas protegidas admiten `Authorization: Bearer <token>`. La API responde con `401` si la sesión es inválida, `403` si falta permiso, `409` si el lote está ocupado o vendido y `410` si el apartado ya venció. El cliente vuelve a los lotes al cancelar o vencer.

La base establece un apartado por lote durante diez minutos. Tomar, cancelar y confirmar un apartado usan el bloqueo del lote. El identificador del apartado se reutiliza como clave de pedido para recuperar una confirmación tras un reintento. Los pagos son simulados y el envío nacional de prueba cuesta $150 MXN. Los reportes usan Ciudad de México y excluyen los pedidos cancelados del gasto.

`npm test` ejecuta pruebas unitarias. `npm run test:integration` usa la base configurada, crea registros temporales y cubre autenticación, concurrencia, caducidad, confirmación y CSV. Ejecuta antes `db:init`, `db:catalogo` y `cp:actualizar`.
