# Lonja Cliente

Proyecto Express/EJS de Sistema Lonja. Incluye la tienda del comprador y el panel del personal. Renderiza las vistas y llama a Lonja API con `fetch` y el JWT de la sesión. El navegador se conecta a Socket.IO para sincronizar la disponibilidad.

## Arranque

Inicia primero Lonja API en el puerto 2900. Usa Node.js 22 o superior y ejecuta en esta carpeta.

```sh
npm ci
cp .env.example .env
```

Genera un valor aleatorio de al menos 32 caracteres para `COOKIE_SECRET`. Conserva `API_URL` y `API_PUBLIC_URL` si usas los puertos del ejemplo, o cámbialas para que coincidan con tu API. Usa `localhost` en el navegador para coincidir con `CLIENTE_ORIGEN` de la API.

```sh
npm start
```

- Abre **http://localhost:3000/** para comprar y **http://localhost:3000/admin** para acceder como personal.
- En la tienda, **Comprar** te da 10 minutos para confirmar un lote. Puedes liberar el apartado desde el formulario.
- En **Mis pedidos**, elige una fecha y consulta el día, semana o mes. El CSV corresponde al período seleccionado y contiene tus propias compras.
- Si cargaste los datos ficticios de la API, entra como `cliente@lonja.local` con `Cliente2026!`.
- Para simular un pago, usa PayPal en el diálogo local o una de las tarjetas ficticias que aparecen en pantalla.

Las imágenes del catálogo incluyen su procedencia y licencia en **Créditos de fotografía**.
