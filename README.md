# Sistema Lonja · Tercer parcial

Sistema de compra de lotes pesqueros para Programación Web 2. El repositorio reúne dos proyectos de Node independientes.

| Proyecto | Función | Dirección local |
| --- | --- | --- |
| [Lonja API](lonja-api/README.md) | API REST con JWT, MariaDB, apartados, pedidos y reportes | http://localhost:2900/api |
| [Lonja Cliente](lonja-cliente/README.md) | Tienda y panel en Express/EJS que consumen la API | http://localhost:3000 |

El segundo parcial se conserva en `main`, en el commit `83bb5b1`. Su entrega era una aplicación que renderizaba las pantallas y accedía directamente a MariaDB. El tercero separa el acceso a datos de la interfaz e incorpora el apartado previo al pago y la descarga del historial del comprador.

## Arranque

Usa Node.js 22 o superior. Instala y arranca primero Lonja API siguiendo su guía. Después instala y arranca Lonja Cliente. Cada proyecto tiene su propio `package-lock.json` y `.env.example`.

- Tienda en **http://localhost:3000/**
- Panel del personal en **http://localhost:3000/admin**
- Cuenta ficticia, si se cargó la demostración. `cliente@lonja.local` con contraseña `Cliente2026!`.
- Personal. Correo y contraseña definidos al inicializar Lonja API.

## Demostración

1. En la tienda, abre un lote y pulsa **Comprar**. La cuenta del comprador obtiene un apartado de diez minutos.
2. Abre el mismo lote en otro navegador. Debe mostrarse como **Apartado**. Si el comprador libera el lote o vence el plazo, vuelve a estar disponible.
3. El comprador completa la entrega y confirma el pago simulado. El pedido queda accesible desde **Mis pedidos**.
4. En **Mis pedidos**, selecciona **Día**, **Semana** o **Mes** y una fecha. Consulta las compras y descárgalas como CSV.
5. Desde el panel, consulta lotes, pedidos y reportes de ventas.

## Entrega

Desde la raíz, `npm run entrega` prepara `../20` y `../20.zip` con **Lonja API.zip** y **Lonja Cliente.zip**. El archivo del equipo contiene ambos proyectos, con su código, guías y configuración de ejemplo. La copia local de SEPOMEX se descarga en la instalación de la API.

La rama `tercer-parcial` contiene el trabajo del tercero. El video y su enlace se gestionan por separado.
