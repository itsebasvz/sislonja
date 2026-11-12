document.querySelector('.mobile-toggle')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  document.querySelector('.sidebar').classList.toggle('is-open', open);
});
document.querySelectorAll('form[data-confirm]').forEach(form => form.addEventListener('submit', event => { if (!window.confirm(form.dataset.confirm)) event.preventDefault(); }));
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
const lote = document.querySelector('#id_lte');
const precio = document.querySelector('#precio_kilo_final');
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
if (lote && precio) {
  const preselected = new URLSearchParams(location.search).get('lote');
  if (!lote.value && preselected && [...lote.options].some(o => o.value === preselected)) lote.value = preselected;
  function update() {
    const d = lote.selectedOptions[0]?.dataset || {};
    document.querySelector('#summary-especie').textContent = d.especie || 'Tu próxima venta';
    document.querySelector('#summary-kilos').textContent = d.kilos ? new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 }).format(Number(d.kilos)) + ' kg' : '—';
    document.querySelector('#summary-cajas').textContent = d.cajas || '—';
    document.querySelector('#summary-salida').textContent = d.precio ? money(d.precio) : '—';
    document.querySelector('#summary-total').textContent = money(Number(d.kilos || 0) * Number(precio.value || 0));
  }
  lote.addEventListener('change', () => { const salida = lote.selectedOptions[0]?.dataset.precio; if (salida) precio.value = salida; update(); });
  precio.addEventListener('input', update);
  if (!precio.value && lote.value) precio.value = lote.selectedOptions[0]?.dataset.precio || '';
  update();
}

const fotoInput = document.querySelector('input[name="fotografia"]');
if (fotoInput) {
  const preview = document.querySelector('#foto-preview');
  const container = preview.parentElement;
  const initialSrc = preview.getAttribute('src');
  const error = document.querySelector('#foto-error');
  let objectUrl;
  function restore() { preview.onload = null; preview.onerror = null; const fallback=preview.dataset.fallbackSrc ?? initialSrc;if(fallback)preview.src=fallback;else preview.removeAttribute('src');container.hidden=!fallback; }
  function invalid(message) {
    fotoInput.value = ''; fotoInput.setCustomValidity(message);
    error.textContent = message; error.hidden = false; restore();
  }
  fotoInput.addEventListener('change', () => {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    fotoInput.setCustomValidity(''); error.hidden = true;
    const file = fotoInput.files[0];
    if (!file) return restore();
    if (file.size > Number(fotoInput.dataset.maxSize)) return invalid('La fotografía no debe superar 5 MB.');
    if (!file.size || !/\.(jpe?g|png|webp|gif)$/i.test(file.name) || !['image/jpeg','image/jpg','image/png','image/webp','image/gif'].includes(file.type)) return invalid('Selecciona una imagen JPG, JPEG, PNG, WebP o GIF.');
    objectUrl = URL.createObjectURL(file);
    preview.onload = () => { container.hidden = false; };
    preview.onerror = () => invalid('No se pudo abrir esta imagen. Selecciona otra fotografía.');
    preview.src = objectUrl;
  });
  fotoInput.form.addEventListener('submit', () => { if (fotoInput.validity.customError) fotoInput.reportValidity(); });
}

const datePicker = document.querySelector('[data-date-picker]');
if (datePicker) {
  const form = datePicker.querySelector('form');
  const from = form.elements.desde, until = form.elements.hasta;
  const grid = datePicker.querySelector('[data-calendar-days]');
  const caption = datePicker.querySelector('[data-calendar-month]');
  const help = datePicker.querySelector('[data-calendar-help]');
  const parse = value => new Date(value + 'T12:00:00');
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  let month = new Date(parse(until.value).getFullYear(), parse(until.value).getMonth(), 1, 12);
  let firstDay = null;
  function validate() { until.setCustomValidity(from.value > until.value ? 'La fecha final debe ser igual o posterior a la inicial.' : ''); }
  function render() {
    caption.textContent = new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(month);
    grid.replaceChildren();
    const offset = (month.getDay()+6)%7;
    const days = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    for (let i=0;i<offset;i++) { const blank=document.createElement('span'); blank.className='calendar-blank';grid.append(blank); }
    for (let day=1;day<=days;day++) {
      const value=iso(new Date(month.getFullYear(),month.getMonth(),day,12));
      const button=document.createElement('button'); button.type='button'; button.textContent=String(day);
      button.className='calendar-day'; button.dataset.date=value; button.disabled=value>from.max;
      button.setAttribute('aria-label',new Intl.DateTimeFormat('es-MX',{dateStyle:'full'}).format(parse(value)));
      if (value===from.max) button.classList.add('is-today');
      if (value>=from.value&&value<=until.value) button.classList.add('in-range');
      if (value===from.value||value===until.value) { button.classList.add('selected');button.setAttribute('aria-pressed','true'); }
      button.addEventListener('click',()=>{
        if (!firstDay) { firstDay=value;from.value=value;until.value=value;help.textContent='Día seleccionado. Puedes aplicar o elegir la fecha final.'; }
        else { from.value=[firstDay,value].sort()[0];until.value=[firstDay,value].sort()[1];firstDay=null;help.textContent='Rango seleccionado. Aplica para consultar el acumulado.'; }
        validate();render();grid.querySelector(`[data-date="${value}"]`)?.focus();
      });
      grid.append(button);
    }
    const next=new Date(month.getFullYear(),month.getMonth()+1,1,12);
    datePicker.querySelector('[data-next-month]').disabled=iso(next)>from.max;
  }
  datePicker.querySelector('[data-prev-month]').addEventListener('click',()=>{month.setMonth(month.getMonth()-1);render();});
  datePicker.querySelector('[data-next-month]').addEventListener('click',()=>{month.setMonth(month.getMonth()+1);render();});
  datePicker.querySelectorAll('[data-date-preset]').forEach(button=>button.addEventListener('click',()=>{from.value=button.dataset.desde;until.value=button.dataset.hasta;month=new Date(parse(until.value).getFullYear(),parse(until.value).getMonth(),1,12);firstDay=null;validate();render();}));
  for (const input of [from,until]) input.addEventListener('change',()=>{firstDay=null;validate();if(input.value)month=new Date(parse(input.value).getFullYear(),parse(input.value).getMonth(),1,12);render();});
  datePicker.querySelector('[data-close-period]').addEventListener('click',()=>{datePicker.open=false;datePicker.querySelector('summary').focus();});
  document.addEventListener('click',event=>{if(!event.composedPath().includes(datePicker))datePicker.open=false;});
  datePicker.addEventListener('keydown',event=>{if(event.key==='Escape'){datePicker.open=false;datePicker.querySelector('summary').focus();}});
  validate();render();
}

const catalogPreset=document.querySelector('#catalogo-preset');
if(catalogPreset){
 const applyPreset=()=>{
  const d=catalogPreset.selectedOptions[0]?.dataset||{},selected=!!catalogPreset.value;
  if(selected){document.querySelector('#nombre').value=d.nombre||'';const tipo=document.querySelector('#id_tpo');if(tipo)tipo.value=d.tipo||'';const descripcion=document.querySelector('#descripcion');if(descripcion)descripcion.value=d.descripcion||'';}
  const input=document.querySelector('input[name=fotografia]');const preview=document.querySelector('#foto-preview');
  if(input&&preview){input.required=!selected;input.setCustomValidity('');preview.dataset.fallbackSrc=selected?d.imagen||'':'';if(!input.files.length){if(preview.dataset.fallbackSrc)preview.src=preview.dataset.fallbackSrc;else preview.removeAttribute('src');preview.parentElement.hidden=!preview.dataset.fallbackSrc;}}
 };
 catalogPreset.addEventListener('change',applyPreset);
}
