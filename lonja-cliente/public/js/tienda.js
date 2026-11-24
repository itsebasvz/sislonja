(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const peso = new Intl.NumberFormat('es-MX', {maximumFractionDigits:3});
  const moneda = new Intl.NumberFormat('es-MX', {style:'currency',currency:'MXN'});
  const escapar = value => String(value ?? '').replace(/[&<>"']/g, car => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[car]);
  const csrf = $('meta[name="csrf-token"]')?.content;
  let timer;
  function aviso(texto) {
    const toast = $('.shop-toast');
    if (!toast) return;
    toast.textContent = texto;
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  const grid = $('[data-catalog-grid]');
  const detalle = $('[data-detail]');
  let productos = JSON.parse($('#initial-stock')?.textContent || '[]');
  let categoria = '', busqueda = '', orden = 'nuevo';
  const comparar = {
    peso: (a,b) => Number(a.kilos) - Number(b.kilos),
    cajas: (a,b) => b.cajas - a.cajas,
    menor: (a,b) => Number(a.total) - Number(b.total),
    mayor: (a,b) => Number(b.total) - Number(a.total),
  };
  function tarjeta(p) {
    const url = '/tienda/lotes/' + p.id;
    const etiquetas = [p.presentacion,p.conservacion].filter(Boolean);
    return `<article class="lot-card" data-lot="${p.id}">
      <a class="lot-image" href="${url}" aria-label="Ver ${escapar(p.nombre)}, lote ${p.id}">
        <img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}" loading="lazy"><span class="lot-label">Lote #${p.id}</span>
      </a>
      <div class="lot-copy"><span class="shop-kicker">${escapar(p.tipo)}</span><a href="${url}"><h3>${escapar(p.nombre)}</h3></a>
        ${etiquetas.length ? `<div class="lot-commercial">${etiquetas.map(v => `<span>${escapar(v)}</span>`).join('')}</div>`:''}
        <dl class="lot-specs" aria-label="Presentación del lote"><div><dt>Peso total</dt><dd>${peso.format(p.kilos)}<span>kg</span></dd></div><div><dt>Embalaje</dt><dd>${p.cajas}<span>${p.cajas===1?'caja':'cajas'}</span></dd></div></dl>
        <div class="lot-price"><span class="lot-total-label">Total del lote</span><strong>${moneda.format(p.total)}<span>MXN</span></strong><div class="lot-unit-price"><span>Precio por kg</span><span>${moneda.format(p.precio)}</span></div></div>
        <form class="lot-buy" action="${url}/apartado" method="post"><input type="hidden" name="_csrf" value="${escapar(csrf)}">
          <button class="shop-btn shop-btn-outline" ${p.disponible?'':'disabled'}>${p.disponible?'Comprar ↗':'Apartado'}</button>
        </form>
      </div></article>`;
  }
  function renderCatalogo() {
    if (!grid) return;
    const rows = productos.filter(p => (!categoria || p.tipo===categoria) && p.nombre.toLocaleLowerCase().includes(busqueda));
    if (comparar[orden]) rows.sort(comparar[orden]);
    grid.innerHTML = rows.map(tarjeta).join('');
    const disponibles = rows.filter(p=>p.disponible).length;
    $('[data-result-count]').textContent = `${disponibles} lotes disponibles`;
    $('[data-catalog-empty]').hidden = Boolean(rows.length);
    $('.hero-number').textContent = productos.filter(p=>p.disponible).length;
  }
  let actualizando = false, pendiente = false;
  async function actualizar() {
    if (!grid && !detalle) return;
    if (actualizando) {pendiente = true;return;}
    actualizando = true;
    try {
      const ruta = grid ? '/tienda/inventario' : '/tienda/lotes/' + detalle.dataset.detail + '/estado';
      const res = await fetch(ruta);
      if (res.status===404 && detalle) {
        $('[data-detail-status]').textContent='Lote retirado';
        $('[data-detail-buy]').disabled=true;
        return;
      }
      if (!res.ok) throw new Error();
      const datos = await res.json();
      if (grid) {
        productos = datos.productos;
        renderCatalogo();
      } else {
        const p = datos.p;
        const comprar = $('[data-detail-buy]');
        comprar.disabled = !p.disponible && !p.apartadoPropio;
        comprar.textContent = p.apartadoPropio ? 'Reanudar compra' : p.disponible ? 'Comprar' : p.estado==='apartado' ? 'Apartado' : 'Vendido';
        $('[data-detail-status]').textContent = p.disponible ? 'Disponible para comprar' : p.estado==='apartado' ? 'Lote apartado' : 'Vendido';
        $('[data-detail-total]').textContent = moneda.format(p.total);
        $('[data-detail-price]').textContent = moneda.format(p.precio)+' por kg · MXN';
        $('[data-detail-weight]').textContent = peso.format(p.kilos)+' kg';
        $('[data-detail-boxes]').textContent = p.cajas + (p.cajas===1?' caja':' cajas');
      }
    } catch {
      aviso('No pudimos actualizar la disponibilidad del lote.');
    } finally {
      actualizando = false;
      if (pendiente) {pendiente=false;actualizar();}
    }
  }

  $$('[data-category]').forEach(boton => boton.addEventListener('click', () => {
    categoria = boton.dataset.category;
    $$('[data-category]').forEach(b => b.classList.toggle('selected', b === boton));
    renderCatalogo();
  }));
  const buscar = event => {
    event.preventDefault();
    busqueda = $('[data-search] input').value.trim().toLocaleLowerCase();
    renderCatalogo();
  };
  $('[data-search]')?.addEventListener('submit',buscar);
  $('[data-search] input')?.addEventListener('input',buscar);
  $('[data-sort]')?.addEventListener('change', event => {
    orden = event.target.value;
    renderCatalogo();
  });
  document.addEventListener('submit', event => {
    const boton = event.target.matches('.lot-buy') && $('button',event.target);
    if (boton) boton.disabled = true;
  });

  function configurarPago(form, banner) {
    const id = banner.dataset.apartado;
    const ruta = '/proxy/apartados/' + encodeURIComponent(id);
    const reloj = $('[data-reloj]');
    const cancelar = $('[data-cancelar-apartado]');
    const confirmar = $('[data-submit-order]');
    const error = $('[data-checkout-error]');
    const dialogo = $('.paypal-dialog');
    const headers = {'Content-Type':'application/json','CSRF-Token':csrf};
    let paypal = false, esperando = false, vencido = false;
    const fin = performance.now() + Date.parse(banner.dataset.vence) - Number(banner.dataset.ahora);
    function fallo(mensaje) {
      error.textContent = mensaje;
      error.hidden = false;
      error.scrollIntoView({block:'center'});
    }
    function vencer() {
      vencido = true;
      confirmar.disabled = true;
      banner.classList.add('is-expired');
      $('[data-apartado-estado]').textContent = 'El apartado venció. El lote volvió al catálogo.';
      cancelar.textContent = 'Volver a los lotes';
    }
    function cuentaRegresiva() {
      const restante = Math.max(0, Math.ceil((fin-performance.now())/1000));
      reloj.textContent = String(Math.floor(restante/60)).padStart(2,'0') + ':' + String(restante%60).padStart(2,'0');
      if (!restante) vencer();
      else setTimeout(cuentaRegresiva, 250);
    }
    cuentaRegresiva();

    function actualizarOpciones() {
      const envio = form.entrega.value==='envio';
      const guardadas = $('[data-saved-addresses]');
      guardadas.hidden = !envio || guardadas.dataset.count==='0';
      const direccion = form.querySelector('[name=direccion_id]:checked, input[type=hidden][name=direccion_id]');
      $('[data-address]').hidden = !envio || direccion?.value!=='nueva';
      window.lonjaDireccion?.sincronizar();
      $('.pickup-note').hidden = envio;
      const tarjeta = form.metodo.value==='tarjeta';
      $('[data-card-fields]').hidden = !tarjeta;
      $$('[data-card-fields] input').forEach(i => {i.disabled=!tarjeta;i.required=tarjeta;});
      $('[data-paypal-fields]').hidden = tarjeta;
      paypal = false;
      $('[data-paypal-status]').textContent = '';
      form.aceptar.checked = false;
      const envioCosto = envio ? 150 : 0;
      const total = moneda.format(Number(banner.dataset.subtotal)+envioCosto);
      $('[data-shipping]').textContent = envio ? moneda.format(envioCosto) : 'Gratis';
      $('[data-order-total]').textContent = total;
      $('[data-paypal-total]').textContent = total;
    }
    $$('[name=entrega],[name=metodo],[name=direccion_id]').forEach(i=>i.addEventListener('change',actualizarOpciones));
    actualizarOpciones();
    $('[data-paypal-open]').onclick = () => dialogo.showModal();
    $('[data-paypal-close]').onclick = () => dialogo.close();
    $('[data-paypal-authorize]').onclick = () => {
      paypal=true;
      dialogo.close();
      $('[data-paypal-status]').textContent='Autorización de prueba lista';
    };
    cancelar.addEventListener('click', async () => {
      if (esperando) return;
      if (vencido) {location.href='/#catalogo';return;}
      cancelar.disabled=true;
      try {
        const res=await fetch(ruta,{method:'DELETE',headers});
        if(!res.ok)throw new Error();
        location.href='/#catalogo';
      } catch {
        cancelar.disabled=false;
        fallo('No pudimos liberar el apartado. Intenta nuevamente.');
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (esperando || vencido) return;
      error.hidden = true;
      const metodo = form.metodo.value;
      let marca = null, ultimos = null, resultado = 'aprobado';
      if (metodo === 'tarjeta') {
        const numero = $('[data-card-number]').value.replace(/\s/g,'');
        if (!['4242424242424242','5555555555554444','4000000000000002'].includes(numero)) return fallo('Usa una de las tarjetas de prueba indicadas.');
        const exp = /^((?:0[1-9]|1[0-2]))\/(\d{2})$/.exec($('[data-card-exp]').value);
        if (!exp || new Date(2000+Number(exp[2]),Number(exp[1]),1)<=new Date()) return fallo('Ingresa un vencimiento futuro.');
        if (!/^\d{3}$/.test($('[data-card-cvv]').value)||!$('[data-card-name]').value.trim()) return fallo('Completa el nombre y CVV ficticios.');
        marca = numero.startsWith('4')?'Visa':'Mastercard';
        ultimos = numero.slice(-4);
        if (numero==='4000000000000002') resultado='rechazado';
      } else if (!paypal) return fallo('Autoriza primero el pago ficticio con PayPal.');
      const direccion=Object.fromEntries(['calle','numero','colonia','cp','estado','municipio'].map(k=>[k,form.elements[k].value]));
      const body={
        precio:banner.dataset.precio, entrega:form.entrega.value, direccion,
        direccion_id:form.elements.direccion_id.value || 'nueva', guardar_direccion:form.guardar_direccion.checked,
        etiqueta:form.etiqueta.value, telefono:form.telefono.value, metodo, marca, ultimos, resultado, aceptar:form.aceptar.checked,
      };
      esperando = true;
      confirmar.disabled = true;
      cancelar.disabled = true;
      confirmar.textContent = 'Confirmando…';
      try {
        const res = await fetch(ruta+'/pedido',{method:'POST',headers,body:JSON.stringify(body)});
        const datos = await res.json();
        if (res.status===401) {location.href='/login?siguiente='+encodeURIComponent(location.pathname);return;}
        if (res.status===410) vencer();
        if (!res.ok) return fallo(datos.error);
        location.href='/mis-pedidos/'+datos.id+'?confirmado=1';
      } catch {
        fallo('No recibimos la confirmación. Recarga el checkout para recuperar tu pedido o intentarlo de nuevo.');
      } finally {
        esperando=false;
        confirmar.disabled=vencido;
        cancelar.disabled=false;
        confirmar.textContent='Confirmar compra de prueba ↗';
      }
    });
  }

  const checkout = $('#checkout-form');
  if (checkout) configurarPago(checkout,$('[data-apartado]'));
  const socket = window.lonjaSocket;
  if (socket) {
    socket.on('connect',() => {
      $('[data-connection]').textContent='Inventario conectado en tiempo real';
      actualizar();
    });
    socket.on('disconnect',() => {$('[data-connection]').textContent='Reconectando…';});
    socket.on('inventario:cambio',actualizar);
    socket.on('pedido:cambio',p => {
      aviso(`Tu pedido #${p.id} tiene una actualización.`);
      if (location.pathname==='/mis-pedidos/'+p.id) location.reload();
    });
  } else {
    $('[data-connection]').textContent='Consulta la disponibilidad al comprar';
  }
  document.addEventListener('click',async event => {
    const boton=event.target.closest('[data-copy]');
    if(!boton)return;
    try {
      await navigator.clipboard.writeText(boton.dataset.copy);
      boton.textContent='Copiado';
    } catch {
      aviso('Selecciona el folio para copiarlo.');
    }
  });
  $$('form[data-confirm]').forEach(form=>form.addEventListener('submit',event=>{
    if(!confirm(form.dataset.confirm))event.preventDefault();
  }));
})();
