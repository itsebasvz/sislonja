# Direcciones de México y envío nacional

## Investigación

Correos de México publica el catálogo nacional de códigos postales, por entidad o para todo el país, con CP, asentamiento, municipio y estado: https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx. La página consultada indicaba actualización del 11 de noviembre de 2026. El TXT contiene sus condiciones de uso; no se redistribuye el archivo nacional en el repositorio ni en el ZIP de entrega. El instalador debe descargar su copia desde la fuente oficial mediante el comando provisto.

COPOMEX documenta el patrón habitual de consulta por CP: una respuesta puede contener varias colonias junto con municipio y estado: https://api.copomex.com/documentacion/inicio. La implementación consulta una copia local del catálogo oficial para que la demostración no necesite token, suscripción ni internet después de instalarse. No se usa la API de COPOMEX ni se envían datos de domicilio a terceros.

No se puede inferir una única colonia cuando un CP comprende varios asentamientos. El sistema completa automáticamente los campos que determina el catálogo y solicita al cliente elegir la colonia si existe más de una.

## Instalación y actualización

Ejecutar `npm run cp:actualizar` antes de iniciar el servidor y de ejecutar las pruebas. Descarga el TXT nacional en ZIP mediante el formulario oficial, extrae y normaliza con APIs nativas de Node. También acepta un TXT o ZIP oficial como argumento local, por ejemplo `npm run cp:actualizar -- /ruta/CPdescargatxt.zip`.

Archivo de ejecución: `data/sepomex.json.gz`, ignorado por Git y excluido del empaquetado. El comando crea el directorio si falta. No hay dependencias nuevas. Registra fuente, fecha de descarga y SHA-256 del TXT; valida que existan 32 entidades y al menos 25 mil códigos antes de sustituir el archivo de forma atómica. La copia utilizada en la revisión contiene 31,862 CP, 159,488 filas de asentamientos y 2,478 municipios/alcaldías. Estos conteos pueden cambiar al actualizar.

## Flujo e interfaces

- Estado: selector de las 32 entidades. Municipio/alcaldía: lista dependiente del estado.
- Al completar cinco dígitos de CP se consulta la dirección en segundo plano. Se conserva como cadena para no perder ceros iniciales.
- Se completan estado y municipio cuando el CP los determina. Si un CP comprende varias ubicaciones, se conserva la elección compatible y se permite seleccionar el municipio correspondiente.
- Colonia/asentamiento: selección automática únicamente si hay una opción; en los demás casos se muestra la lista.
- Cambiar estado o municipio a uno incompatible limpia el CP y sus colonias. Respuestas antiguas se ignoran mediante cancelación y número de consulta.
- CP inexistente, consulta pendiente o colonia faltante impiden confirmar el envío. Se muestran estados de carga y errores junto al campo.
- Calle y número son captura libre. La consulta postal no comprueba que una calle o domicilio físico exista.

GET `/direccion/municipios/:estado` devuelve los municipios del identificador de entidad de dos dígitos. GET `/direccion/codigo-postal/:cp` devuelve las ubicaciones y colonias del CP. Son consultas auxiliares del checkout EJS. El navegador envía identificadores de estado/municipio y colonia seleccionada; el servidor vuelve a verificar la combinación y conserva nombres e identificadores en el JSON del pedido, junto con país México. No se modifica el esquema SQL; los pedidos anteriores siguen legibles.

La dirección completa aparece en el comprobante del cliente y en el panel del personal. Envío nacional con tarifa ficticia de $150 por pedido, conservando el cálculo del servidor. Recogida gratuita en la lonja. No se integra una paquetería ni se promete un plazo de transporte nacional.

## PayPal y pruebas

El selector de resultado solo permanece para la tarjeta de demostración. Con PayPal se oculta y deshabilita; después de autorizar en el diálogo local, la simulación siempre se aprueba, también en el servidor.

Pruebas: cobertura de estados, alcaldías de CDMX, CP con cero inicial, varias colonias, localidades fuera de Veracruz, rechazo de combinaciones falsas, pedido con envío nacional y aprobación de PayPal. Revisión de navegador para consultas simultáneas y respuesta atrasada, errores, autocompletado, estado/municipio manual y móvil de 390/320 px.
