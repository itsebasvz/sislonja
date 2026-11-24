// Card entry helpers for the test checkout: grouping, MM/AA mask, brand detection and live preview.
// Final validation still happens on submit in tienda.js; this only guides the user while typing.
(() => {
  const box = document.querySelector('[data-card-fields]'); if (!box) return;
  const num = box.querySelector('[data-card-number]'), exp = box.querySelector('[data-card-exp]');
  const cvv = box.querySelector('[data-card-cvv]'), nombre = box.querySelector('[data-card-name]');
  const brandImg = box.querySelector('[data-card-brand]'), preview = box.querySelector('[data-card-preview]');
  const PRUEBA = ['4242424242424242', '5555555555554444', '4000000000000002'];
  const LOGOS = { Visa: '/img/pagos/visa.svg', Mastercard: '/img/pagos/mastercard.svg' };
  const marca = d => /^4/.test(d) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : '';
  const digitos = v => v.replace(/\D/g, '');

  function aviso(input, texto) {
    const nota = document.getElementById(input.getAttribute('aria-describedby'));
    input.classList.toggle('is-invalid', !!texto); input.setAttribute('aria-invalid', String(!!texto));
    if (nota) { nota.textContent = texto || ''; nota.hidden = !texto; }
  }
  // Reformat while keeping the caret after the same number of digits the user had typed.
  function reformatear(input, valor) {
    const caret = input.selectionStart ?? input.value.length;
    const antes = digitos(input.value.slice(0, caret)).length;
    input.value = valor;
    let pos = 0, vistos = 0;
    while (pos < valor.length && vistos < antes) { if (/\d/.test(valor[pos])) vistos++; pos++; }
    if (document.activeElement === input) input.setSelectionRange(pos, pos);
  }
  function pintar() {
    const d = digitos(num.value), m = marca(d);
    brandImg.hidden = !m; if (m) { brandImg.src = LOGOS[m]; brandImg.alt = m; }
    const prevBrand = preview.querySelector('[data-preview-brand]');
    prevBrand.hidden = !m; if (m) prevBrand.src = LOGOS[m];
    preview.querySelector('[data-preview-number]').textContent = (d + '•'.repeat(16 - d.length)).replace(/(.{4})(?=.)/g, '$1 ');
    preview.querySelector('[data-preview-name]').textContent = nombre.value.trim() || 'Nombre del titular';
    preview.querySelector('[data-preview-exp]').textContent = exp.value || 'MM/AA';
    preview.dataset.brand = m.toLowerCase();
  }
  function revisarNumero(final) {
    const d = digitos(num.value);
    if (d.length === 16 && !PRUEBA.includes(d)) return aviso(num, 'Usa una de las tarjetas de prueba de abajo.');
    if (final && d.length && d.length < 16) return aviso(num, 'El número debe tener 16 dígitos.');
    aviso(num, '');
  }
  function revisarVencimiento(final) {
    const d = digitos(exp.value);
    if (d.length >= 2 && (+d.slice(0, 2) < 1 || +d.slice(0, 2) > 12)) return aviso(exp, 'El mes va de 01 a 12.');
    if (d.length === 4) {
      const mes = +d.slice(0, 2), anio = 2000 + +d.slice(2);
      if (new Date(anio, mes, 1) <= new Date()) return aviso(exp, 'Esa fecha ya venció.');
    } else if (final && d.length) return aviso(exp, 'Completa mes y año (MM/AA).');
    aviso(exp, '');
  }

  num.addEventListener('input', () => {
    reformatear(num, digitos(num.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '));
    revisarNumero(false); pintar();
    if (digitos(num.value).length === 16 && !num.classList.contains('is-invalid')) exp.focus();
  });
  num.addEventListener('blur', () => revisarNumero(true));

  exp.addEventListener('input', e => {
    const borrando = e.inputType?.startsWith('delete');
    let d = digitos(exp.value).slice(0, 4);
    if (/^\d\/$/.test(exp.value) || (d.length === 1 && +d > 1)) d = '0' + d; // "3" or "3/" → "03/"
    exp.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d.length === 2 && !borrando ? `${d}/` : d;
    revisarVencimiento(false); pintar();
    if (d.length === 4 && !exp.classList.contains('is-invalid')) cvv.focus();
  });
  exp.addEventListener('blur', () => revisarVencimiento(true));

  cvv.addEventListener('input', () => { cvv.value = digitos(cvv.value).slice(0, 3); aviso(cvv, ''); });
  cvv.addEventListener('blur', () => aviso(cvv, cvv.value && cvv.value.length < 3 ? 'El CVV tiene 3 dígitos.' : ''));
  nombre.addEventListener('input', pintar);

  box.addEventListener('click', e => {
    const b = e.target.closest('[data-fill-card]'); if (!b) return;
    num.value = b.dataset.fillCard.replace(/(\d{4})(?=\d)/g, '$1 ');
    revisarNumero(false); pintar(); exp.focus();
  });
  pintar();
})();
